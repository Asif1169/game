import { NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';

const SCORES_FILE = path.join(process.cwd(), 'scores.txt');
const MAX_ROWS = 50;

interface StoredScore {
  wallet: string;
  username: string;
  score: number;
  ts: string;
}

async function readScores(): Promise<StoredScore[]> {
  let raw: string;
  try {
    raw = await fs.readFile(SCORES_FILE, 'utf8');
  } catch (err) {
    // Missing file = empty leaderboard (auto-created on first submit-score).
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

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

  // Sort by score desc, then by earliest timestamp on ties (stable for ties).
  rows.sort((a, b) => (b.score - a.score) || (a.ts < b.ts ? -1 : 1));
  return rows;
}

export async function GET() {
  try {
    const rows = await readScores();
    const top = rows.slice(0, MAX_ROWS).map((r) => ({
      wallet: r.wallet,
      username: r.username,
      score: r.score,
      ts: r.ts,
    }));
    return NextResponse.json(top, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[leaderboard] read failed:', err);
    return NextResponse.json(
      { error: 'Could not read leaderboard.' },
      { status: 500 },
    );
  }
}
