'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { type ReactNode, useState, useEffect } from 'react';

// Wagmi config — Base mainnet only.
// - Coinbase Wallet: works inside Base App/Farcaster and standalone.
// - WalletConnect: QR/multi-wallet fallback (needs a cloud.walletconnect.com id).
// MiniKit auto-detects when running inside Base App/Farcaster and uses the
// right transport. NOTE: the CDP projectId belongs on the MiniKitProvider
// below, NOT on the connectors.

function createWagmiConfig() {
  const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';
  const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '';
  return createConfig({
    chains: [base],
    connectors: [
      coinbaseWallet({
        appName: 'Flappy Base',
        appChainIds: [base.id],
      }),
      // Only register the WalletConnect connector if a project id is configured;
      // walletConnect() throws if projectId is empty.
      ...(WC_PROJECT_ID
        ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })]
        : []),
    ],
    multiInjectedProviderDiscovery: false,
    transports: {
      [base.id]: http('https://mainnet.base.org'),
    },
  });
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient must be created once per browser session.
  const [queryClient] = useState(makeQueryClient);
  // Wagmi config must keep a stable reference — re-creating it on every
  // render makes the inner AutoConnect connector call setState during render
  // (React 19 + Strict Mode warning).
  const [config] = useState(() => createWagmiConfig());
  const [cdpProjectId] = useState(() => process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '');

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          enabled={!!cdpProjectId}
          projectId={cdpProjectId}
          notificationProxyUrl="/api/notification"
        >
          {children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
