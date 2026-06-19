import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // wagmi/connectors barrel re-exports every connector (MetaMask, WalletConnect,
  // Porto, etc.). We only use Coinbase Wallet at runtime, but the barrel still
  // statically imports:
  //   - @metamask/sdk  -> @react-native-async-storage/async-storage  (RN-only, not installed)
  //   - @walletconnect/ethereum-provider -> pino -> pino-pretty        (dev-only, not installed)
  // Aliasing these unused sub-deps to `false` lets the bundler stub them out
  // without affecting the connectors we actually use.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage$': false,
      'pino-pretty$': false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;