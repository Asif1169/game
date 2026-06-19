'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

// Wagmi config — Base mainnet only.
// Standard web app stack: wagmi + viem + Coinbase Wallet connector.
// Works in the Base App's in-app browser and standalone.
// The Base App identifies this app via the `base:app_id` metadata tag
// in app/page.tsx (registered on Base.dev).

function createWagmiConfig() {
  const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';
  return createConfig({
    chains: [base],
    connectors: [
      coinbaseWallet({
        appName: 'Flappy Base',
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

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
