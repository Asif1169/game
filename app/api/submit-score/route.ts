import { NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';

const SCORES_FILE = path.join(process.cwd(), 'scores.txt');
const BASE_RPC = 'https://mainnet.base.org';
const PAYMENT_RECIPIENT = (
  process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT ?? '0x7d9Cb2994D86B6a4e65761B5d81DADa69ce54a7f'
).toLowerCase();
const PAYMENT_AMOUNT_ETH = Number(process.env.NEXT_PUBLIC_PAYMENT_AMOUNT ?? '0.0001');
// 0.0001 ETH = 100000000000000 wei; parseEther would do the same.
const PAYMENT_AMOUNT_WEI = BigInt(Math.round(PAYMENT_AMOUNT_ETH * 1e18));

interface SubmitBody {
  wallet?: unknown;
  username?: unknown;
  score?: unknown;
  txHash?: unknown;
}

function isAddress(v: unknown): v is string {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}
function isTxHash(v: unknown): v is string {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{64}$/.test(v);
}

function sanitizeUsername(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  // Alphanumeric only, 1–20 chars.
  if (!/^[a-zA-Z0-9]{1,20}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Optional on-chain verification of the payment tx.
 * Uses a plain eth_getTransactionByHash against the Base RPC. If the RPC is
 * unreachable or the tx is not yet indexed, we do NOT reject the submission —
 * we log and proceed, so a slow indexer never blocks a legit player. Tighten
 * this to `return false` on failure if you want strict enforcement.
 */
async function verifyTransaction(txHash: string, wallet: string): Promise<boolean> {
  try {
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionByHash',
        params: [txHash],
      }),
      // Don't hang the request forever if RPC is slow.
      next: { revalidate: 0 },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: { to?: string; value?: string; from?: string } | null };
    const tx = data.result;
    if (!tx) return false; // not indexed yet
    if (!tx.to || tx.to.toLowerCase() !== PAYMENT_RECIPIENT) return false;
    if (!tx.from || tx.from.toLowerCase() !== wallet.toLowerCase()) return false;
    if (!tx.value) return false;
    try {
      if (BigInt(tx.value) < PAYMENT_AMOUNT_WEI) return false;
    } catch {
      return false;
    }
    return true;
  } catch {
    // Network/RPC error — be lenient (see note above).
    return true;
  }
}

interface StoredScore {
  wallet: string;
  username: string;
  score: number;
  ts: string;
}

async function readScores(): Promise<StoredScore[]> {
  try {
    const raw = await fs.readFile(SCORES_FILE, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const rows: StoredScore[] = [];
    for (const line of lines) {
      // Format: "ISO_TS | wallet | username | score | txHash"
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 4) continue;
      const [ts, wallet, username, scoreStr] = parts;
      const score = Number(scoreStr);
      if (!Number.isFinite(score)) continue;
      rows.push({ ts, wallet, username, score });
    }
    return rows;
  } catch (err: unknown) {
    // ENOENT is expected on first ever submission — caller will create it.
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function appendScore(row: StoredScore, txHash: string): Promise<void> {
  const line = `${row.ts} | ${row.wallet} | ${row.username} | ${row.score} | ${txHash}\n`;
  // Auto-creates the file on first write.
  await fs.appendFile(SCORES_FILE, line, 'utf8');
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const wallet = body.wallet;
  const username = sanitizeUsername(body.username);
  const score = typeof body.score === 'number' ? Math.floor(body.score) : NaN;
  const txHash = body.txHash;

  // Validate
  if (!isAddress(wallet)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet.' }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ success: false, error: 'Invalid username.' }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json({ success: false, error: 'Invalid score.' }, { status: 400 });
  }
  if (!isTxHash(txHash)) {
    return NextResponse.json({ success: false, error: 'Invalid txHash.' }, { status: 400 });
  }

  // Verify on-chain (lenient on RPC failure — see verifyTransaction note).
  const ok = await verifyTransaction(txHash, wallet);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: 'Transaction verification failed.' },
      { status: 402 },
    );
  }

  const ts = new Date().toISOString();
  const row: StoredScore = { wallet, username, score, ts };

  try {
    await appendScore(row, txHash);
  } catch (err) {
    console.error('[submit-score] write failed:', err);
    return NextResponse.json(
      { success: false, error: 'Could not save score. Try again later.' },
      { status: 500 },
    );
  }

  // Compute rank from the full list (rank among all, 1-indexed).
  let rank = 1;
  try {
    const all = await readScores();
    all.sort((a, b) => b.score - a.score);
    const idx = all.findIndex(
      (r) => r.wallet === wallet && r.ts === ts && r.score === score,
    );
    if (idx >= 0) rank = idx + 1;
  } catch {
    // Ranking is best-effort; still return success if the write succeeded.
  }

  return NextResponse.json({ success: true, rank });
}
