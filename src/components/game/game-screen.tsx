import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game/engine";
import { Button } from "@/components/ui/button";
import { Pause, Play, Shield, ChevronsRight, Smartphone } from "lucide-react";

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
}: {
  seed: number;
  myScore: number;
  theirScore: number;
  myAlive: boolean;
  theirAlive: boolean;
  spectator: boolean;
  solo?: boolean;
  onScore: (score: number) => void;
  onDeath: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [localScore, setLocalScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [paused, setPaused] = useState(false);
  const [portraitMobile, setPortraitMobile] = useState(false);
  const [powers, setPowers] = useState({ shield: 0, speed: 0 });
  const callbacks = useRef({ onScore, onDeath });
  callbacks.current = { onScore, onDeath };

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
    if (!canvas || spectator) return;
    let lastSent = 0;
    const engine = new GameEngine({
      canvas,
      seed,
      onUpdate: ({ score, powers: activePowers }) => {
        setLocalScore(score);
        setPowers(activePowers);
        const now = performance.now();
        if (now - lastSent > 400) {
          lastSent = now;
          callbacks.current.onScore(score);
        }
      },
      onDeath: (score) => {
        setDead(true);
        setLocalScore(score);
        callbacks.current.onDeath(score);
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
  }, [seed, spectator]);

  useEffect(() => {
    engineRef.current?.setPaused(paused || portraitMobile);
  }, [paused, portraitMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, []);

  return (
    <main
      className="relative h-[100dvh] w-full touch-none select-none overflow-hidden bg-background"
    >
      <canvas ref={canvasRef} aria-label="Flipster game: left side flips, right side jumps" className="block h-full w-full" onPointerDown={(event) => {
        event.preventDefault();
        if (dead || paused || portraitMobile) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX - rect.left < rect.width / 2) engineRef.current?.flip();
        else engineRef.current?.jump();
      }} />

      {portraitMobile && (
        <div role="status" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-background text-center text-foreground">
          <Smartphone className="size-12 rotate-90" aria-hidden="true" />
          <p className="font-display text-2xl font-bold tracking-[0.12em]">ROTATE DEVICE</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)] font-mono">
        {solo ? <span /> : <ScoreBlock label="YOU" value={dead ? myScore || localScore : localScore} dim={dead} />}
        <ScoreBlock label={solo ? "METRES" : "RIVAL"} value={solo ? localScore : theirScore} align="right" dim={!solo && !theirAlive} />
      </div>
      {solo && !dead && <Button variant="ghost" size="icon" aria-label={paused ? "Resume game" : "Pause game"} className="absolute left-4 top-[calc(env(safe-area-inset-top)+14px)] size-12 text-game-ninja hover:bg-game-eye/25 [&_svg]:size-8" onClick={() => {
        engineRef.current?.setPaused(!paused); setPaused(!paused);
      }}>{paused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}</Button>}
      <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center gap-5 text-game-ninja">
        {powers.shield > 0 && <div className="flex items-center gap-1.5 font-mono text-sm" aria-label="Shield active"><Shield className="size-5" /><span>{Math.ceil(powers.shield)}s</span></div>}
        {powers.speed > 0 && <div className="flex items-center gap-1.5 font-mono text-sm" aria-label="Speed-up active"><ChevronsRight className="size-5" /><span>{Math.ceil(powers.speed)}s</span></div>}
      </div>
      {paused && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50"><p className="font-display text-4xl font-bold text-game-ninja">PAUSED</p></div>}

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

      {!dead && myAlive && !spectator && (
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-7 pb-[calc(env(safe-area-inset-bottom)+32px)]">
          <Button aria-label="Flip gravity" title="Flip" disabled={dead} onPointerDown={(event) => { event.preventDefault(); engineRef.current?.flip(); }} onClick={(event) => { if (event.detail === 0) engineRef.current?.flip(); }} className="game-control-button">
            <span className="game-control-face"><svg className="game-control-symbol" viewBox="0 0 40 48" fill="currentColor" aria-hidden="true"><path d="M4 15 13 5l9 10h-6v25h-6V15zM24 8h6v25h6L27 43l-9-10h6z" /><path d="M19 8h2v33h-2z" /></svg></span>
          </Button>
          <Button aria-label="Jump" title="Jump" disabled={dead} onPointerDown={(event) => { event.preventDefault(); engineRef.current?.jump(); }} onClick={(event) => { if (event.detail === 0) engineRef.current?.jump(); }} className="game-control-button">
            <span className="game-control-face"><svg className="game-control-symbol" viewBox="0 0 40 48" fill="currentColor" aria-hidden="true"><path d="m20 4 13 15h-9v25h-8V19H7z" /></svg></span>
          </Button>
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

