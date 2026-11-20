import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/lib/game/engine";
import { Button } from "@/components/ui/button";
import { Pause, Play, Shield, ChevronsRight, Smartphone, ArrowLeft, LogOut } from "lucide-react";

export function GameScreen({
  seed,
  myScore,
  theirScore,
  myAlive,
  theirAlive,
  spectator,
  solo = false,
  onScore,
  onDeath,
  onExit,
}: {
  seed: number;
  myScore: number;
  theirScore: number;
  myAlive: boolean;
  theirAlive: boolean;
  spectator: boolean;
  solo?: boolean;
  onScore: (score: number) => void;
  onDeath: (score: number, stats?: { distance: number; stars: number }) => void;
  onExit?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [localScore, setLocalScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [dead, setDead] = useState(false);
  const [paused, setPaused] = useState(false);
  const [portraitMobile, setPortraitMobile] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [powers, setPowers] = useState<{ shield: number; speed: number; stars?: number }>({ shield: 0, speed: 0, stars: 0 });
  const callbacks = useRef({ onScore, onDeath });
  callbacks.current = { onScore, onDeath };

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    const isPhone = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    const updateOrientation = () => {
      setPortraitMobile(isPhone() && window.innerHeight > window.innerWidth);
    };
    updateOrientation();

    const requestLandscape = async () => {
      if (!isPhone()) return;
      try {
        await telegram?.requestFullscreen?.();
      } catch {
        // Fullscreen requires client support and may be denied without a user gesture.
      }
      try {
        const orientation = window.screen.orientation;
        if (orientation?.type.startsWith("landscape")) {
          telegram?.lockOrientation?.();
        } else if (orientation?.lock) {
          await orientation.lock("landscape");
          telegram?.lockOrientation?.();
        }
      } catch {
        // Keep the rotate-device prompt as the fallback on unsupported clients.
      }
    };

    void requestLandscape();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
      try {
        window.screen.orientation?.unlock();
        telegram?.unlockOrientation?.();
      } catch {
        // Orientation unlock is best-effort when leaving the game.
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || spectator || countdown > 0) return;
    let lastSent = 0;
    const engine = new GameEngine({
      canvas,
      seed,
      onUpdate: ({ score, powers: activePowers, distance: dist }) => {
        setLocalScore(score);
        setDistance(dist);
        setPowers(activePowers);
        const now = performance.now();
        if (now - lastSent > 400) {
          lastSent = now;
          callbacks.current.onScore(score);
        }
      },
      onDeath: (score, stats) => {
        setDead(true);
        setLocalScore(score);
        callbacks.current.onDeath(score, stats);
      },
    });
    engineRef.current = engine;
    engine.start();
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, spectator, countdown]);

  useEffect(() => {
    engineRef.current?.setPaused(paused || portraitMobile);
  }, [paused, portraitMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (countdown > 0) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) engineRef.current?.jump();
      } else if (e.code === "ArrowDown" || e.code === "KeyF") {
        e.preventDefault();
        if (!e.repeat) engineRef.current?.flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [countdown]);

  const handleFlip = useCallback(() => {
    if (countdown > 0) return;
    engineRef.current?.flip();
  }, [countdown]);

  const handleJump = useCallback(() => {
    if (countdown > 0) return;
    engineRef.current?.jump();
  }, [countdown]);

  return (
    <main
      className="relative h-[100dvh] w-full touch-none select-none overflow-hidden bg-background"
    >
      <canvas ref={canvasRef} aria-label="Flipster game: left side flips, right side jumps" className="block h-full w-full" onPointerDown={(event) => {
        event.preventDefault();
        if (dead || paused || portraitMobile || countdown > 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX - rect.left < rect.width / 2) handleFlip();
        else handleJump();
      }} />

      {/* Countdown overlay */}
      {countdown > 0 && !portraitMobile && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3">
            <p className="font-mono text-sm text-muted-foreground tracking-widest">GET READY</p>
            <p className="font-display text-8xl font-black text-foreground animate-pulse">{countdown}</p>
          </div>
        </div>
      )}

      {portraitMobile && (
        <div role="status" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-background text-center text-foreground">
          <Smartphone className="size-12 rotate-90" aria-hidden="true" />
          <p className="font-display text-2xl font-bold tracking-[0.12em]">ROTATE DEVICE</p>
        </div>
      )}

      {/* Top HUD with generous clearance avoiding Telegram header & phone notches */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),38px)]">
        {/* Left side: Back + Pause buttons in unified floating frosted pill */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={() => {
              if (onExit) onExit();
              else window.location.href = "/";
            }}
            aria-label="Exit game"
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono font-bold text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>EXIT</span>
          </button>
          {solo && !dead && countdown <= 0 && (
            <>
              <span className="h-4 w-px bg-white/25" />
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setPaused(!paused);
                  setPaused(!paused);
                }}
                aria-label={paused ? "Resume" : "Pause"}
                className="flex items-center justify-center p-1 text-white/90 hover:text-white transition-colors"
              >
                {paused ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
              </button>
            </>
          )}
        </div>

        {/* Right side: Distance + Star Coins in unified floating frosted pill */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 backdrop-blur-md border border-white/20 shadow-lg font-mono">
          {/* Distance meter (matching Image 2 bold '722 M') */}
          <div className="flex items-baseline gap-1 font-display font-black tracking-wider text-white">
            <span className="text-lg tabular-nums">{Math.floor(distance)}</span>
            <span className="text-xs text-white/80">M</span>
          </div>

          <span className="h-4 w-px bg-white/25" />

          {/* Star counter */}
          <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
            <svg className="size-4 fill-amber-400 drop-shadow-[0_0_6px_#f59e0b]" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="tabular-nums">{powers.stars ?? 0}</span>
          </div>

          {!solo && (
            <>
              <span className="h-4 w-px bg-white/25" />
              <div className="text-xs text-cyan-300">
                RIVAL: <span className="font-bold text-white tabular-nums">{theirScore}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center gap-5 text-game-ninja">
        {powers.shield > 0 && <div className="flex items-center gap-1.5 font-mono text-sm" aria-label="Shield active"><Shield className="size-5" /><span>{Math.ceil(powers.shield)}s</span></div>}
        {powers.speed > 0 && <div className="flex items-center gap-1.5 font-mono text-sm" aria-label="Speed-up active"><ChevronsRight className="size-5" /><span>{Math.ceil(powers.speed)}s</span></div>}
      </div>

      {paused && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 px-6 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs rounded-2xl border-4 border-[#1e3a5f] bg-[#d5e4ec] p-6 text-center shadow-2xl">
            <h2 className="font-display text-3xl font-black text-[#1e3a5f]">PAUSED</h2>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                onClick={() => {
                  engineRef.current?.setPaused(false);
                  setPaused(false);
                }}
                className="h-11 w-full rounded-xl bg-[#1e3a5f] font-display text-sm font-bold tracking-wider text-white hover:bg-[#2a4f7a]"
              >
                <Play className="mr-2 size-4 fill-current" /> RESUME
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (onExit) onExit();
                  else window.location.href = "/";
                }}
                className="h-11 w-full rounded-xl border-2 border-[#1e3a5f] bg-white/80 font-display text-sm font-bold tracking-wider text-[#1e3a5f] hover:bg-white"
              >
                <LogOut className="mr-2 size-4" /> EXIT TO HOME
              </Button>
            </div>
          </div>
        </div>
      )}

      {dead && !solo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 px-6 text-center">
          <p className="font-display text-4xl tracking-[0.2em] text-foreground">DOWN</p>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Score {localScore} · {theirAlive ? "rival still running…" : "waiting…"}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Rival score {theirScore}
          </p>
        </div>
      )}

      {/* Touch control buttons — elevated with clean margin above bottom border lines */}
      {!dead && myAlive && !spectator && countdown <= 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-between px-8 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <Button aria-label="Flip gravity" title="Flip" disabled={dead} onPointerDown={(event) => { event.preventDefault(); handleFlip(); }} onClick={(event) => { if (event.detail === 0) handleFlip(); }} className="game-control-button">
              <span className="game-control-face">
                <svg className="game-control-symbol" viewBox="0 0 40 48" fill="currentColor" aria-hidden="true">
                  <path d="M5 18 L13 7 L21 18 H16 V38 H10 V18 Z" />
                  <path d="M24 10 H30 V30 H35 L27 41 L19 30 H24 Z" />
                </svg>
              </span>
            </Button>
            <span className="font-display text-xs font-black tracking-widest text-game-control-highlight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">FLIP</span>
          </div>
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <Button aria-label="Jump" title="Jump" disabled={dead} onPointerDown={(event) => { event.preventDefault(); handleJump(); }} onClick={(event) => { if (event.detail === 0) handleJump(); }} className="game-control-button">
              <span className="game-control-face">
                <svg className="game-control-symbol" viewBox="0 0 40 48" fill="currentColor" aria-hidden="true">
                  <path d="m20 5 13 15h-8v23h-10V20H7z" />
                </svg>
              </span>
            </Button>
            <span className="font-display text-xs font-black tracking-widest text-game-control-highlight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">JUMP</span>
          </div>
        </div>
      )}
    </main>
  );
}

export function ScoreBlock({
  label,
  value,
  align = "left",
  dim = false,
}: {
  label: string;
  value: number;
  align?: "left" | "right";
  dim?: boolean;
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p
        className={`font-display text-3xl tabular-nums ${dim ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
