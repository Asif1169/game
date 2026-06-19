'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { submitScoreContract, getFeeContract, shortAddr } from '@/lib/contract';

const USERNAME_RE = /^[a-zA-Z0-9]+$/;

interface GameOverProps {
  score: number;
  submitted: boolean;
  onSubmitted: () => void;
  onRestart: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; txHash: string };

export function GameOver({ score, submitted, onSubmitted, onRestart }: GameOverProps) {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [fee, setFee] = useState<string>('0.0001');

  useEffect(() => {
    getFeeContract().then(setFee).catch(() => setFee('0.0001'));
  }, []);

  const trimmed = username.trim();
  const usernameValid = trimmed.length >= 1 && trimmed.length <= 20 && USERNAME_RE.test(trimmed);

  const basescan = (tx: string) => `https://basescan.org/tx/${tx}`;

  const handleSubmit = async () => {
    if (submitted) return;
    if (!isConnected || !address) {
      setStatus({ kind: 'error', message: 'Connect your wallet first.' });
      return;
    }
    if (!usernameValid) {
      setStatus({ kind: 'error', message: 'Username: 1–20 alphanumeric chars.' });
      return;
    }

    setStatus({ kind: 'sending' });
    try {
      const txHash = await submitScoreContract(username.trim(), score, fee);

      setStatus({ kind: 'success', txHash });
      onSubmitted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed.';
      setStatus({
        kind: 'error',
        message: /reject|denied|cancel/i.test(msg) ? 'Transaction cancelled.' : msg,
      });
    }
  };

  return (
    <div className="w-full max-w-[340px] rounded-xl bg-base-bg/90 p-5 text-center ring-1 ring-white/10">
      <p className="text-sm uppercase tracking-widest opacity-70">Game Over</p>
      <p className="mt-1 text-5xl font-bold text-base-blue">{score}</p>
      <p className="text-xs opacity-60">pipes cleared</p>

      {!submitted && status.kind !== 'success' && (
        <div className="mt-4 space-y-3 text-left">
          {isConnected ? (
            <p className="text-center text-xs opacity-70">
              Connected: <span className="font-mono">{shortAddr(address)}</span>
            </p>
          ) : (
            <div className="flex justify-center">
              <Wallet>
                <ConnectWallet />
              </Wallet>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs opacity-70">Username</span>
            <input
              type="text"
              value={username}
              maxLength={20}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status.kind === 'error') setStatus({ kind: 'idle' });
              }}
              placeholder="1–20 alphanumeric"
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-base-blue"
            />
            {trimmed.length > 0 && !usernameValid && (
              <span className="mt-1 block text-xs text-red-400">
                Letters/numbers only, max 20.
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isConnected || !usernameValid || status.kind === 'sending'}
            className="w-full rounded-lg bg-base-blue px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.kind === 'sending' ? 'Waiting for wallet…' : `Submit Score (${fee} ETH)`}
          </button>

          {status.kind === 'error' && (
            <p className="text-center text-xs text-red-400">{status.message}</p>
          )}
        </div>
      )}

      {status.kind === 'success' && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="font-semibold text-green-400">Score submitted!</p>
          <a
            href={basescan(status.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-base-blue underline underline-offset-2"
          >
            View on Basescan ↗
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
      >
        Play Again
      </button>
    </div>
  );
}