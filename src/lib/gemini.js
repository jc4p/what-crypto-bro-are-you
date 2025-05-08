import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// Define the schema for the Crypto Bro analysis
const cryptoBroSchema = {
  type: SchemaType.OBJECT,
  properties: {
    primaryBorough: {
      type: SchemaType.STRING,
      description: "The NYC borough that best represents the user's crypto persona based on their traits.",
      enum: ["Manhattan", "Brooklyn"],
    },
    boroughAffinity: {
      type: SchemaType.OBJECT,
      description: "An estimated percentage affinity for each crypto persona (0-100). These represent affinity and do not need to sum to 100.",
      properties: {
        Manhattan: { type: SchemaType.NUMBER, description: "Percentage affinity for Manhattan Crypto Businessperson (polished, finance-adjacent, transactional)." },
        Brooklyn: { type: SchemaType.NUMBER, description: "Percentage affinity for Brooklyn Crypto Businessperson (artistic, anarchist-leaning, culture-driven)." },
      },
      required: ["Manhattan", "Brooklyn"],
    },
    summary: {
        type: SchemaType.STRING,
        description: "A brief (2-3 sentence) summary explaining the primary borough choice and key traits observed, written directly to the user (e.g., 'You seem most like a Manhattan crypto bro because...').",
        maxLength: 350,
    },
    evidence: {
      type: SchemaType.ARRAY,
      description: "Exactly 2-3 pieces of evidence supporting the borough analysis. Each piece should link a characteristic to specific examples from their content.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          characteristic: {
            type: SchemaType.STRING,
            description: "The primary characteristic observed (e.g., 'Goals', 'Language', 'Vibe').",
            maxLength: 50,
          },
          quotes: {
            type: SchemaType.ARRAY,
            description: "1-2 short, direct quotes (max 15 words each) from the user's casts/bio demonstrating this characteristic.",
            items: {
              type: SchemaType.STRING,
              description: "A short, direct quote (max 15 words).",
              maxLength: 90, // ~15 words
            },
            minItems: 1,
            maxItems: 2,
          },
          explanation: {
            type: SchemaType.STRING,
            description: "One sentence explaining how these quotes demonstrate the specified characteristic in relation to the borough persona, written directly to the user.",
            maxLength: 200,
          },
        },
        required: ["characteristic", "quotes", "explanation"],
      },
      minItems: 2,
      maxItems: 3,
    },
    rationaleForOther: {
        type: SchemaType.STRING,
        description: "A brief explanation (1-2 sentences) for why the user doesn't primarily belong to the *other* borough persona, written directly to the user.",
        maxLength: 200,
    },
  },
  required: ["primaryBorough", "boroughAffinity", "summary", "evidence", "rationaleForOther"],
};

/**
 * Analyzes a user's bio and casts to determine their NYC Crypto Bro persona.
 * @param {string | null} bio - The user's Farcaster bio.
 * @param {string[]} casts - An array of the user's recent cast texts.
 * @returns {Promise<object | null>} The analysis result matching cryptoBroSchema or null if an error occurs.
 */
export async function analyzeCryptoBroType(bio, casts) {
  if (!GEMINI_API_KEY) {
    console.error("Cannot analyze: GEMINI_API_KEY is not set.");
    return null;
  }
  if (!casts || casts.length === 0) {
    console.warn("No casts provided for analysis.");
    if (!bio) return null;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.6,
      topK: 30,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: cryptoBroSchema,
    },
  });

  const prompt = `Analyze this Farcaster user\\'s bio and recent casts to determine their NYC Crypto Bro persona: Manhattan or Brooklyn.

**Personas:**

**1. Manhattan Crypto Businessperson**
*   **Vibe:** Polished, finance-adjacent, transactional.
*   **Goals:** Profit, VC raises, regulatory strategy, institutional adoption.
*   **Uniform:** Blazer over a crypto tee, Allbirds or designer sneakers, maybe a Rolex.
*   **Hangouts:** Soho House, Equinox, Wall Street events, Midtown pitch meetings.
*   **Language:** "Scaling," "Series A," "regulatory clarity," "exit strategy."
*   **Influences:** TradFi (traditional finance), management consulting, Y Combinator.
*   **Analogy:** Crypto MBA.

**2. Brooklyn Crypto Businessperson**
*   **Vibe:** Artistic, anarchist-leaning, culture-driven.
*   **Goals:** Decentralization, creative autonomy, protocol purity, vibes.
*   **Uniform:** Vintage hoodie, thrifted tee, wide-leg pants, obscure sneakers.
*   **Hangouts:** DAO meetups in Bushwick, art gallery shows, warehouse events.
*   **Language:** "On-chain identity," "regen," "community coordination," "ZK vibes."
*   **Influences:** Ethereum researchers, Burning Man, co-ops, Solarpunk aesthetics.
*   **Analogy:** Crypto DJ/Philosopher.

**Input Data:**
Bio: ${bio || 'No bio provided.'}
Recent Casts (max ${casts.length > 500 ? 500 : casts.length}):
${casts.slice(0, 500).join('\\n---\\n')} ${casts.length > 500 ? '\\n[... additional casts truncated]' : ''}

**Analysis Instructions:**
1.  **Affinity:** Estimate affinity for BOTH personas (0-100%). These do not need to sum to 100.
2.  **Primary Borough:** Determine the single BEST fit (Manhattan or Brooklyn).
3.  **Summary (Directly to User):** Write a 2-3 sentence summary, addressing the user directly ("You... Your..."). Explain why they fit their primary borough, referencing 1-2 key characteristics from their content.
4.  **Evidence (2-3 items):** For each item, provide:
    *   characteristic: The specific persona characteristic observed (e.g., "Goals," "Language," "Vibe").
    *   quotes: 1-2 short, direct quotes (max 15 words each) from their bio/casts.
    *   explanation: 1 sentence explaining how the quotes link to the characteristic and persona, addressing the user.
5.  **Rationale for Other (Directly to User):** Provide a 1-2 sentence explanation for why they don\\'t *primarily* fit the *other* borough, focusing on contrasting traits.

**IMPORTANT FORMATTING & STYLE:**
*   Adhere STRICTLY to the JSON schema.
*   Write summary, explanations, and rationale directly TO the user (use "You"/"Your").
*   Be concise and specific. Base analysis only on provided text.
*   DO NOT use any of the specific analogies I gave you directly in your response.

Please provide the analysis in the specified JSON format.`;

  console.log("Sending crypto bro analysis request to Gemini...");

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    console.log("Received Gemini response text for crypto bro analysis.");

    try {
        const parsedResponse = JSON.parse(responseText);
        console.log("Successfully parsed Gemini response for crypto bro.");

        if (!parsedResponse.primaryBorough || !parsedResponse.boroughAffinity || !parsedResponse.summary || !parsedResponse.evidence || parsedResponse.evidence.length < 2 || parsedResponse.evidence.length > 3 || !parsedResponse.rationaleForOther) {
            console.error("Parsed Gemini response is missing required fields or has incorrect evidence count.", parsedResponse);
            throw new Error("Invalid structure in Gemini response for crypto bro analysis.");
        }
        // No filtering needed for rationaleForOther as it's a single field for the non-primary borough
        return parsedResponse;
    } catch (error) {
        console.error('Error calling Gemini API (crypto bro):', error);
        return null;
    }
  } catch (error) {
    console.error('Error calling Gemini API (crypto bro):', error);
    return null;
  }
} 