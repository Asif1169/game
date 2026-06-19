'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameOver } from './GameOver';
import { WalletButton } from './WalletButton';
import { Leaderboard } from './Leaderboard';

// ---------------------------------------------------------------------------
// Logical play field. All physics run in these coordinates; the canvas
// backing store is scaled to devicePixelRatio for crispness and the element
// is sized responsively via CSS — so physics stay identical on every screen.
// ---------------------------------------------------------------------------
const W = 400;
const H = 600;

// Bird
const BIRD_X = 90;
const BIRD_R = 14;
const GRAVITY = 1500; // px / s^2
const FLAP_V = -430; // px / s  (upward impulse)

// Pipes
const PIPE_W = 62;
const GAP = 150; // shrinks slightly over time (see difficulty())
const PIPE_SPEED_BASE = 150; // px / s
const PIPE_INTERVAL = 1.55; // seconds between spawns

// Difficulty: every 5 pipes cleared, speed up + gap narrows (floored).
const SPEED_STEP = 18;
const GAP_SHRINK = 4;

type GamePhase = 'IDLE' | 'PLAYING' | 'DEAD';

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

function difficulty(score: number) {
  const tier = Math.floor(score / 5);
  return {
    speed: PIPE_SPEED_BASE + tier * SPEED_STEP,
    gap: Math.max(120, GAP - tier * GAP_SHRINK),
  };
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Mutable game state held in refs so the RAF loop never re-renders React.
  const phaseRef = useRef<GamePhase>('IDLE');
  const birdYRef = useRef(H / 2);
  const birdVRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const spawnTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  // React state only for HUD / overlays (updated at low frequency).
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const goDead = useCallback(() => {
    phaseRef.current = 'DEAD';
    setPhase('DEAD');
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current === 'DEAD') return; // dead state handled by the overlay UI
    if (phaseRef.current === 'IDLE') {
      phaseRef.current = 'PLAYING';
      setPhase('PLAYING');
    }
    birdVRef.current = FLAP_V;
  }, []);

  const resetGame = useCallback(() => {
    birdYRef.current = H / 2;
    birdVRef.current = 0;
    pipesRef.current = [];
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    lastTsRef.current = null;
    phaseRef.current = 'IDLE';
    setScore(0);
    setSubmitted(false);
    setPhase('IDLE');
  }, []);

  // ---- The entire engine lives in one mount effect (no re-subscribes). ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // -- Canvas sizing: fixed logical resolution, DPR-scaled backing store,
    //    responsive CSS box that preserves the 2:3 aspect ratio. --
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      const cssW = Math.min(W, parent ? parent.clientWidth : W);
      const cssH = (cssW * H) / W;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      // Draw in 400x600 logical coords, rendered at dpr backing resolution.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // -- Input --
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        flap();
      }
    };
    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      flap();
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onPointer);

    // -- Collision helper --
    const hitsPipe = (birdY: number, pipe: Pipe, gap: number) => {
      const left = pipe.x;
      const right = pipe.x + PIPE_W;
      if (BIRD_X + BIRD_R < left || BIRD_X - BIRD_R > right) return false;
      const top = pipe.gapY - gap / 2;
      const bottom = pipe.gapY + gap / 2;
      return birdY - BIRD_R < top || birdY + BIRD_R > bottom;
    };

    const spawnPipe = (gap: number) => {
      const gapY = rand(gap / 2 + 40, H - gap / 2 - 40);
      pipesRef.current.push({ x: W + PIPE_W, gapY, passed: false });
    };

    // -- Draw --
    const draw = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#70C5CE');
      grad.addColorStop(1, '#DFF6FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const { gap } = difficulty(scoreRef.current);

      // Pipes
      ctx.fillStyle = '#0052FF';
      ctx.strokeStyle = '#0038A8';
      ctx.lineWidth = 2;
      for (const p of pipesRef.current) {
        const topH = p.gapY - gap / 2;
        const botY = p.gapY + gap / 2;
        ctx.fillRect(p.x, 0, PIPE_W, topH);
        ctx.strokeRect(p.x, 0, PIPE_W, topH);
        ctx.fillRect(p.x - 4, topH - 18, PIPE_W + 8, 18);
        ctx.strokeRect(p.x - 4, topH - 18, PIPE_W + 8, 18);
        ctx.fillRect(p.x, botY, PIPE_W, H - botY);
        ctx.strokeRect(p.x, botY, PIPE_W, H - botY);
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 18);
        ctx.strokeRect(p.x - 4, botY, PIPE_W + 8, 18);
      }

      // Bird — rotates slightly with vertical velocity
      const by = birdYRef.current;
      const rot = Math.max(-0.4, Math.min(1.0, birdVRef.current / 600));
      ctx.save();
      ctx.translate(BIRD_X, by);
      ctx.rotate(rot);
      // Cream body
      ctx.fillStyle = '#F5F0E8';
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D4C4A8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Orange belly
      ctx.fillStyle = '#E88D2A';
      ctx.beginPath();
      ctx.ellipse(-3, 3, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // White eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(7, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // Orange beak
      ctx.fillStyle = '#E88D2A';
      ctx.beginPath();
      ctx.moveTo(BIRD_R - 2, -2);
      ctx.lineTo(BIRD_R + 8, 0);
      ctx.lineTo(BIRD_R - 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Ground strip
      ctx.fillStyle = '#DED895';
      ctx.fillRect(0, H - 14, W, 14);
      ctx.fillStyle = '#9C7C3A';
      ctx.fillRect(0, H - 14, W, 3);

      // Score HUD
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 4;
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const txt = String(scoreRef.current);
      ctx.strokeText(txt, W / 2, 20);
      ctx.fillText(txt, W / 2, 20);
    };

    // -- Loop --
    const loop = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      lastTsRef.current = now;
      const dt = Math.min(0.033, (now - last) / 1000); // clamp big frame gaps

      const p = phaseRef.current;

      if (p === 'PLAYING') {
        birdVRef.current += GRAVITY * dt;
        birdYRef.current += birdVRef.current * dt;

        const { speed, gap } = difficulty(scoreRef.current);
        spawnTimerRef.current += dt;
        if (spawnTimerRef.current >= PIPE_INTERVAL) {
          spawnTimerRef.current = 0;
          spawnPipe(gap);
        }
        for (const pipe of pipesRef.current) {
          pipe.x -= speed * dt;
          if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
        pipesRef.current = pipesRef.current.filter((pp) => pp.x + PIPE_W > -4);

        const by = birdYRef.current;
        if (
          by - BIRD_R < 0 ||
          by + BIRD_R > H ||
          pipesRef.current.some((pp) => hitsPipe(by, pp, gap))
        ) {
          goDead();
        }
      } else if (p === 'IDLE') {
        // Gentle hover so the idle screen feels alive
        birdYRef.current = H / 2 + Math.sin(now / 300) * 8;
      }

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [flap, goDead]);

  const startIdle = () => {
    if (phase === 'DEAD' || phase === 'PLAYING') return;
    // First tap/click handled by flap(); this is just a clickable hint layer.
    flap();
  };

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-4 py-6 bg-base-bg">
      <header className="w-full max-w-[400px] flex items-center justify-between z-10">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-base-blue">Flappy</span> Base
        </h1>
        <WalletButton />
      </header>

      <div className="relative flex-1 w-full max-w-[400px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[calc(100vh-200px)] rounded-xl shadow-2xl ring-1 ring-white/10"
          aria-label="Flappy Base game"
        />

        {/* Idle overlay: tap to start */}
        {phase === 'IDLE' && (
          <button
            type="button"
            onClick={startIdle}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/30 text-center"
          >
            <span className="text-3xl font-bold drop-shadow">Tap to Flap</span>
            <span className="text-sm opacity-80">Spacebar / click / tap</span>
          </button>
        )}

        {/* Game over overlay */}
        {phase === 'DEAD' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 p-3 w-full h-full">
            <GameOver
              score={score}
              submitted={submitted}
              onSubmitted={() => setSubmitted(true)}
              onRestart={resetGame}
            />
          </div>
        )}
      </div>

      <div className="w-full max-w-[400px] z-10">
        <Leaderboard key={submitted ? 'refresh' : 'init'} />
      </div>

      <footer className="text-xs opacity-60 z-10">
        Submit your score on-chain to the leaderboard.
      </footer>
    </main>
  );
}
