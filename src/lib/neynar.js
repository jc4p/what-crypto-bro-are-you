const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster/user/bulk';
const NEYNAR_CASTS_API_URL = 'https://api.neynar.com/v2/farcaster/feed/user/casts';

if (!NEYNAR_API_KEY) {
  console.warn("NEYNAR_API_KEY environment variable is not set. Neynar API calls will fail.");
}

/**
 * Fetches user data from the Neynar API for a given FID.
 * @param {number} fid - The Farcaster ID of the user.
 * @returns {Promise<object | null>} The user data object or null if an error occurs.
 */
export async function getUserDataFromNeynar(fid) {
  if (!NEYNAR_API_KEY) {
    console.error("Cannot fetch from Neynar: NEYNAR_API_KEY is not set.");
    return null;
  }
  if (!fid || typeof fid !== 'number') {
    console.error("Invalid FID provided to getUserDataFromNeynar:", fid);
    return null;
  }

  const url = `${NEYNAR_API_URL}?fids=${fid}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Neynar API request failed with status ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json();

    // The API returns an array of users, even for a single FID
    if (data.users && data.users.length > 0) {
        // Return the first user object
        return data.users[0];
    } else {
        console.warn(`No user data found for FID ${fid} in Neynar response.`);
        return null;
    }

  } catch (error) {
    console.error('Error fetching user data from Neynar:', error);
    return null;
  }
}

/**
 * Fetches the text of recent casts for a given FID, handling pagination.
 * @param {number} fid - The Farcaster ID of the user.
 * @param {number} pages - How many pages of results to fetch.
 * @param {number} limit - How many casts per page.
 * @returns {Promise<string[]>} An array of cast texts, or empty array if an error occurs.
 */
export async function getRecentCastTexts(fid, pages = 3, limit = 150) {
  if (!NEYNAR_API_KEY) {
    console.error("Cannot fetch casts from Neynar: NEYNAR_API_KEY is not set.");
    return [];
  }
  if (!fid || typeof fid !== 'number') {
    console.error("Invalid FID provided to getRecentCastTexts:", fid);
    return [];
  }

  let allCastTexts = [];
  let cursor = null;
  const includeReplies = false; // As requested

  console.log(`Fetching ${pages} pages of casts for FID ${fid}, limit ${limit}...`);

  for (let i = 0; i < pages; i++) {
    const params = new URLSearchParams({
      fids: fid.toString(), // Changed param name based on v2 docs (assuming it's `fids` like user bulk, but using `fid` as per user provided curl)
      limit: limit.toString(),
      include_replies: includeReplies.toString(),
    });
    // Let's retry using `fid` as the param name as per the user's curl example for casts
    params.set('fid', fid.toString());
    params.delete('fids'); // Remove the other one

    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = `${NEYNAR_CASTS_API_URL}?${params.toString()}`;
    console.log(`Fetching page ${i + 1}: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
          'x-neynar-experimental': 'false' // As requested
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Neynar Casts API request failed (page ${i + 1}) with status ${response.status}: ${errorBody}`);
        break; // Stop fetching if one page fails
      }

      const data = await response.json();

      if (data.casts && data.casts.length > 0) {
        const texts = data.casts.map(cast => cast.text).filter(Boolean); // Get text, remove empty strings
        allCastTexts = allCastTexts.concat(texts);
        console.log(`Page ${i + 1}: Fetched ${texts.length} cast texts.`);
      } else {
        console.log(`Page ${i + 1}: No casts found.`);
      }

      // Get cursor for next page
      cursor = data.next?.cursor;
      if (!cursor) {
        console.log(`Page ${i + 1}: No next cursor found, stopping pagination.`);
        break; // No more pages
      }

    } catch (error) {
      console.error(`Error fetching casts (page ${i + 1}) from Neynar:`, error);
      break; // Stop fetching on error
    }
  }

  console.log(`Finished fetching casts. Total texts: ${allCastTexts.length}`);
  return allCastTexts;
} 