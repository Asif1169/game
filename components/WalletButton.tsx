'use client';

import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
// OnchainKit theme is loaded once globally via app/globals.css.

/**
 * Compact wallet entry point for the header.
 * Uses OnchainKit's Wallet component, which handles connect/disconnect,
 * network switching, and the Base App embedded wallet automatically.
 */
export function WalletButton() {
  return (
    <Wallet>
      <ConnectWallet />
    </Wallet>
  );
}
