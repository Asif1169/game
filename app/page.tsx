'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useEffect } from 'react';
import { FlappyGame } from '@/components/FlappyGame';

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();

  // Mandatory: without this the Farcaster/Base App splash screen never disappears.
  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  return <FlappyGame />;
}
