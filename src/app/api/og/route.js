import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params from query string
    const house = searchParams.get('house') || 'Your House';
    const displayName = searchParams.get('displayName') || 'Anonymous User';
    const pfpUrl = searchParams.get('pfpUrl');
    // const fid = searchParams.get('fid'); // Not directly used in image text but good for context

    // Basic validation for pfpUrl
    let validPfpUrl = null;
    if (pfpUrl) {
      try {
        const pfpUrlObj = new URL(pfpUrl);
        if (pfpUrlObj.protocol === 'http:' || pfpUrlObj.protocol === 'https:') {
          validPfpUrl = pfpUrl;
        }
      } catch (e) {
        // console.warn('Invalid pfpUrl provided:', pfpUrl); // Reduce logging
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            fontFamily: '"Arial", sans-serif',
            fontSize: 32,
            color: 'black',
            padding: '20px',
            border: '20px solid #4A90E2'
          }}
        >
          {/* Wrapper for conditional image/placeholder */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            {validPfpUrl ? (
              <img
                src={validPfpUrl}
                alt="User PFP"
                width={100}
                height={100}
                style={{
                  borderRadius: '50%',
                  border: '4px solid #4A90E2'
                }}
              />
            ) : (
              <div 
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  backgroundColor: '#ccc', 
                  border: '4px solid #4A90E2' 
                }}
              />
            )}
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '15px',
            fontSize: '40px',
            fontWeight: 'bold',
            color: '#333'
          }}>{displayName}</div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '50px',
            fontWeight: 'bold',
            color: '#D95F24',
            marginBottom: '20px'
          }}>
            I'm a {house}!
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '28px',
            color: '#555',
            marginTop: 'auto'
          }}>
            Find out your type now!
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
      },
    );
  } catch (e) {
    console.error('Error generating image:', e.message);
    if (e.cause) {
      console.error('Cause:', e.cause);
    }
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
} 