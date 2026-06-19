'use client';

import { useEffect, useState } from 'react';
import { getScoresContract, getScoresCountContract, shortAddr } from '@/lib/contract';

interface ScoreRow {
  player: string;
  username: string;
  score: bigint;
  timestamp: bigint;
}

export function Leaderboard() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const count = await getScoresCountContract();
        const total = Number(count);
        const limit = Math.min(50, total);
        const offset = total > limit ? total - limit : 0;

        const data = await getScoresContract(offset, limit);

        if (!cancelled) {
          const sorted = [...data].sort((a, b) => Number(b.score - a.score));
          setRows(sorted);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Could not load leaderboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">
          Leaderboard
        </h2>
        <span className="text-xs opacity-50">Top 50</span>
      </div>

      {loading ? (
        <p className="py-4 text-center text-xs opacity-50">Loading…</p>
      ) : error ? (
        <p className="py-4 text-center text-xs text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs opacity-50">
          No scores yet — be the first to submit!
        </p>
      ) : (
        <ol className="space-y-1 text-sm">
          {rows.map((row, i) => (
            <li
              key={`${row.player}-${row.timestamp}`}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 odd:bg-white/5"
            >
              <span className="flex w-6 shrink-0 font-mono text-xs opacity-60">
                {i + 1}
              </span>
              <span className="flex-1 truncate font-semibold">{row.username}</span>
              <span className="shrink-0 font-mono text-xs opacity-50">
                {shortAddr(row.player)}
              </span>
              <span className="w-10 shrink-0 text-right font-bold text-base-blue">
                {row.score.toString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}