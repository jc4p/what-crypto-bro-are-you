import styles from "./page.module.css";
import { HomeComponent } from '@/components/HomeComponent';

export async function generateMetadata({ searchParams }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const frameType = (await searchParams).type;

  let imageUrlToUse = "https://cover-art.kasra.codes/bro_rectangle.png";

  if (frameType === 'manhattan') {
    imageUrlToUse = 'https://cover-art.kasra.codes/bro_rect_manhattan.png';
  } else if (frameType === 'brooklyn') {
    imageUrlToUse = 'https://cover-art.kasra.codes/bro_rect_brooklyn.png';
  }

  return {
    title: 'Which Crypto Bro Are You?',
    description: 'Find out which crypto bro you are!',
    other: {
      'fc:frame': JSON.stringify({
        version: "next", 
        imageUrl: imageUrlToUse, // Dynamically set image URL based on type
        button: {
          title: "Find out now!", 
          action: {
            type: "launch_frame", 
            name: "Which Crypto Bro Are You?",
            url: appUrl, 
            splashImageUrl: "https://cover-art.kasra.codes/bro_square.png",
            splashBackgroundColor: "#ffffff"
          }
        }
      })
    }
  }
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HomeComponent />
      </main>
    </div>
  );
}
