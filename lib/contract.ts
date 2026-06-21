import { createPublicClient, http, parseEther, formatEther, type Address, type WalletClient } from 'viem';
import { base } from 'viem/chains';
import abi from '@/contracts/ScoreSubmission.json';

// Use a reliable RPC. Public mainnet.base.org is often rate-limited and
// returns "Failed to fetch" errors. We fall back to a stable alternative.
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://base-mainnet.public.blastapi.io';

const CONTRACT_ADDRESS_VALUE = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '') as Address;

export const CONTRACT_ADDRESS = CONTRACT_ADDRESS_VALUE;
export const SCORE_ABI = abi;

export const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    retryCount: 2,
    retryDelay: 300,
    timeout: 8000,
  }),
});

export interface ScoreEntry {
  player: `0x${string}`;
  username: string;
  score: bigint;
  timestamp: bigint;
}

function assertContractAddress() {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x') {
    throw new Error('Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }
}

/**
 * Submit a score to the contract. The wallet client MUST be the one returned
 * by wagmi's `useWalletClient()` hook — it carries the connected wallet
 * provider. Using a fresh `createWalletClient` here won't work because it
 * has no connection to the user's actual wallet.
 *
 * The `fee` argument MUST be exactly the contract's `submissionFee` value
 * (call `getFeeContract()` to read it). The contract enforces
 * `require(msg.value == submissionFee, "Incorrect fee")` so any mismatch
 * reverts the transaction.
 */
export async function submitScoreContract(
  username: string,
  score: number,
  fee: string,
  account: Address,
  walletClient: WalletClient,
) {
  assertContractAddress();
  if (!walletClient) throw new Error('No wallet client');

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'submitScore',
    args: [username, BigInt(score)],
    value: parseEther(fee),
    account,
    chain: base,
  });

  return hash;
}

// Silent error helper — logs as warn, not error, and doesn't re-throw
function silentWarn(context: string, err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${context}]`, err instanceof Error ? err.message : err);
  }
}

export async function getScoresContract(offset = 0, limit = 50): Promise<ScoreEntry[]> {
  if (!CONTRACT_ADDRESS) return [];
  try {
    const data: unknown = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SCORE_ABI,
      functionName: 'getScores',
      args: [BigInt(offset), BigInt(limit)],
    });
    return data as ScoreEntry[];
  } catch (err) {
    silentWarn('scores', err);
    return [];
  }
}

export async function getScoresCountContract(): Promise<bigint> {
  if (!CONTRACT_ADDRESS) return 0n;
  try {
    const data: unknown = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SCORE_ABI,
      functionName: 'getScoresCount',
    });
    return data as bigint;
  } catch (err) {
    silentWarn('scoresCount', err);
    return 0n;
  }
}

export async function getFeeContract(): Promise<string> {
  if (!CONTRACT_ADDRESS) return '0.0001';
  try {
    const fee: unknown = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SCORE_ABI,
      functionName: 'getFee',
    });
    return formatEther(fee as bigint);
  } catch (err) {
    silentWarn('fee', err);
    return '0.0001';
  }
}

export async function getMaxFeeContract(): Promise<string> {
  if (!CONTRACT_ADDRESS) return '0.001';
  try {
    const fee: unknown = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SCORE_ABI,
      functionName: 'getMaxFee',
    });
    return formatEther(fee as bigint);
  } catch (err) {
    silentWarn('maxFee', err);
    return '0.001';
  }
}

export function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}