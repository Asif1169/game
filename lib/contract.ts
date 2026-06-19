import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address } from 'viem';
import { base } from 'viem/chains';
import abi from '@/contracts/ScoreSubmission.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
export const SCORE_ABI = abi;

export const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export interface ScoreEntry {
  player: `0x${string}`;
  username: string;
  score: bigint;
  timestamp: bigint;
}

export function getWalletClient() {
  if (typeof window === 'undefined') return null;
  return createWalletClient({
    chain: base,
    transport: http(RPC_URL),
  });
}

export async function submitScoreContract(
  username: string,
  score: number,
  fee: string
) {
  const walletClient = getWalletClient();
  if (!walletClient) throw new Error('No wallet client');

  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('No account');

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'submitScore',
    args: [username, BigInt(score)],
    value: parseEther(fee),
    account,
  });

  return hash;
}

export async function getScoresContract(offset = 0, limit = 50): Promise<ScoreEntry[]> {
  const data = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'getScores',
    args: [BigInt(offset), BigInt(limit)],
  });
  return data as ScoreEntry[];
}

export async function getScoresCountContract() {
  return await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'getScoresCount',
  });
}

export async function getFeeContract() {
  const fee = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'getFee',
  });
  return formatEther(fee as bigint);
}

export async function getMaxFeeContract() {
  const fee = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_ABI,
    functionName: 'getMaxFee',
  });
  return formatEther(fee as bigint);
}

export function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}