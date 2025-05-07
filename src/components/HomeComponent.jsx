'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './HomeComponent.module.css';
import { shareCastIntent } from '@/lib/frame';

// Helper function to get borough styles and images
const getBoroughDetails = (boroughName) => {
  const lowerCaseBorough = boroughName?.toLowerCase();
  switch (lowerCaseBorough) {
    case 'manhattan': 
      return {
        style: styles.manhattan,
        imageUrl: 'https://fc-swag-images.kasra.codes/crypto_nyc.jpg',
        altText: 'Manhattan crypto persona image',
      };
    case 'brooklyn': 
      return {
        style: styles.brooklyn,
        imageUrl: 'https://fc-swag-images.kasra.codes/crypto_brooklyn.jpg',
        altText: 'Brooklyn crypto persona image',
      };
    default: 
      return {
        style: '',
        imageUrl: '',
        altText: 'Default crypto persona image',
      };
  }
};

export function HomeComponent() {
  const [userData, setUserData] = useState(null);
  const [cryptoBroData, setCryptoBroData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fid, setFid] = useState(null);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.userFid) {
      setFid(window.userFid);
      setIsLoading(false); 
      return; 
    }
    let attempts = 0;
    const maxAttempts = 30; 
    const intervalMs = 200;
    const intervalId = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.userFid) {
        setFid(window.userFid);
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        setError("Could not detect Farcaster frame context. Ensure you're viewing this in a frame.");
        setIsLoading(false);
        clearInterval(intervalId);
      }
    }, intervalMs);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!fid) {
        return;
    }
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setCryptoBroData(null); 
    setShareStatus('');
    fetch(`/api/user?fid=${fid}`)
      .then(async res => {
        if (!res.ok) {
          let errorMsg = `API request failed with status ${res.status}`;
          try { const errorData = await res.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then(data => {
        if (!data.analysis) throw new Error("Missing Crypto Bro analysis.");
        setUserData({ username: data.username, pfp_url: data.pfp_url, display_name: data.display_name });
        setCryptoBroData(data.analysis);
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("Error fetching analysis data:", err);
        setError(err.message || "Failed to fetch crypto bro analysis data.");
        setIsLoading(false); 
      });
  }, [fid]);

  const handleShareClick = useCallback(async () => {
    if (!cryptoBroData || !fid || !userData) {
      setShareStatus('Error: Missing data');
      setTimeout(() => setShareStatus(''), 3000);
      return;
    }

    setShareStatus('Sharing...');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const typeParam = cryptoBroData.primaryBorough.toLowerCase();
      const shareablePageUrl = `${baseUrl}?type=${typeParam}`;

      const castText = `I'm a ${cryptoBroData.primaryBorough} crypto bro! Which one are you?`;
      
      await shareCastIntent(castText, shareablePageUrl);
      
      setShareStatus('Shared!');

    } catch (err) {
      console.error('Error in handleShareClick:', err);
      setShareStatus(`Share failed: ${err.message.substring(0, 50)}...`);
    } finally {
      setTimeout(() => setShareStatus(''), 5000); 
    }
  }, [cryptoBroData, userData, fid]);

  const primaryBorough = cryptoBroData?.primaryBorough;
  const boroughDetails = getBoroughDetails(primaryBorough);
  const boroughStyle = boroughDetails.style;
  const personaImageUrl = boroughDetails.imageUrl;
  const personaImageAltText = boroughDetails.altText;

  if (!fid || isLoading) {
        return (
            <div className={`${styles.container} ${styles.loadingContainer}`}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>{!fid ? "Waiting for frame context..." : "Analyzing your crypto aura..."}</p>
            </div>
        );
  }

  if (error) {
        return (
            <div className={styles.container}>
                 <h2 className={styles.errorTitle}>Analysis Overload!</h2>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        {userData && userData.pfp_url && (
            <div className={styles.pfpContainerSmall}>
              <Image
                src={userData.pfp_url}
                alt={`${userData.display_name || userData.username || 'User'}\'s profile picture`}
                width={50}
                height={50}
                className={`${styles.pfpImageSmall} ${boroughStyle}`}
                priority
                unoptimized={true}
              />
            </div>
        )}
         <h1 className={styles.titleSmall}>
            Analysis complete for <span className={styles.userNameHighlight}>{userData?.display_name || userData?.username || `FID ${fid}` }</span>!
        </h1>
      </div>

      {cryptoBroData && (
        <div className={styles.shareContainer}>
          <button 
            className={styles.shareButtonAction}
            onClick={handleShareClick} 
            disabled={!!shareStatus && shareStatus !== 'Share Result' && shareStatus !== ''}
            aria-label="Share Result"
          >
            <span role="img" aria-label="share icon" style={{ marginRight: '8px' }}>🔗</span>
            {shareStatus || 'Share Result'}
          </button>
        </div>
      )}

      {cryptoBroData && (
          <div className={styles.resultsContainer}>
            {personaImageUrl && (
              <div className={styles.personaImageContainer}>
                <Image 
                  src={personaImageUrl} 
                  alt={personaImageAltText} 
                  fill
                  className={styles.personaImage}
                  priority
                  unoptimized={true}
                />
              </div>
            )}
            <h2 className={styles.resultTitle}>
              You're a... <br />
              <span className={`${styles.highlight} ${boroughStyle}`}>{primaryBorough} Crypto Bro!</span>
            </h2>
            {cryptoBroData.summary && <p className={styles.summary}>{cryptoBroData.summary}</p>}
            
            <div className={styles.detailsGrid}>
                {cryptoBroData.evidence && cryptoBroData.evidence.length > 0 && (
                  <div className={styles.evidenceContainer}>
                    <h3>Key Characteristics & Evidence</h3>
                    {cryptoBroData.evidence.map((item, index) => (
                      <div key={index} className={styles.evidenceItem}>
                        <h4 className={styles.traitTitle}>{item.characteristic}</h4>
                        <blockquote>
                          {item.quotes.map((quote, qIndex) => (
                            <p key={qIndex}>"{quote}"</p>
                          ))}
                        </blockquote>
                        <p className={styles.explanation}>{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
                {cryptoBroData.boroughAffinity && (
                  <div className={styles.percentagesContainer}>
                    <h3>Borough Affinity</h3>
                    <ul>
                      {Object.entries(cryptoBroData.boroughAffinity)
                        .sort(([, a], [, b]) => b - a)
                        .map(([borough, percentage]) => (
                          <li key={borough} className={getBoroughDetails(borough).style}>
                             {borough}: {Math.round(percentage)}%
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

             {cryptoBroData.rationaleForOther && (
                <div className={styles.whyNotContainer}>
                    <h3>Why Not the Other Borough?</h3>
                    <div className={styles.whyNotItem}>
                        <p>{cryptoBroData.rationaleForOther}</p>
                    </div>
                </div>
             )}
          </div>
      )}
    </div>
  );
} 