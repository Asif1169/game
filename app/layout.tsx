import type { Metadata, Viewport } from 'next';
import { Lilita_One } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  variable: '--font-lilita-one',
  display: 'swap',
  weight: '400',
});

const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://game-green-xi.vercel.app';

export const metadata: Metadata = {
  title: 'Flappy Base',
  description: 'A classic Flappy Bird clone on Base. Tap to flap through pipes, submit your high score on-chain, and compete on the global leaderboard.',
  applicationName: 'Flappy Base',
  openGraph: {
    title: 'Flappy Base',
    description: 'A classic Flappy Bird clone on Base. Submit your high score on-chain.',
    url: APP_URL,
    siteName: 'Flappy Base',
    images: [
      {
        url: `${APP_URL}/hero.png`,
        width: 1200,
        height: 630,
        alt: 'Flappy Base',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flappy Base',
    description: 'A classic Flappy Bird clone on Base. Submit your high score on-chain.',
    images: [`${APP_URL}/hero.png`],
  },
  // Farcaster / Base App mini-app embed metadata
  other: {
    'base:app_id': '6a344a1ec14c8a65a9c38948',
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/hero.png`,
      button: {
        title: 'Play Flappy Base',
        action: {
          type: 'launch_miniapp',
          name: 'Flappy Base',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: '#6BBFED',
        },
      },
    }),
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/hero.png`,
      button: {
        title: 'Play Flappy Base',
        action: {
          type: 'launch_frame',
          name: 'Flappy Base',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: '#6BBFED',
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6BBFED',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lilitaOne.variable}>
      <body className="font-sans min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
