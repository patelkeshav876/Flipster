import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, ScoreBlock } from "@/components/game/game-screen";
import { Button } from "@/components/ui/button";
import { RotateCcw, LogOut } from "lucide-react";

export const Route = createFileRoute("/solo")({
  head: () => ({
    meta: [
      { title: "Flipster Solo — Endless Ninja Run" },
      { name: "description", content: "Play Flipster solo. Jump over spikes, flip underneath obstacles, and chase your highest score." },
      { property: "og:title", content: "Flipster Solo — Endless Ninja Run" },
      { property: "og:description", content: "One ninja, an endless course, and your next high score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SoloPage,
});

function SoloPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<{ seed: number; attempt: number } | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    setRun({ seed: Math.floor(Math.random() * 2 ** 31), attempt: 0 });
  }, []);

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setLocked(false), 1200);
    return () => clearTimeout(timer);
  }, [finished]);

  if (!run) return <main className="min-h-[100dvh] bg-background" />;

  return (
    <>
      <GameScreen
        key={run.attempt}
        seed={run.seed}
        myScore={score}
        theirScore={0}
        myAlive={!finished}
        theirAlive={false}
        spectator={false}
        solo
        onScore={setScore}
        onDeath={(finalScore) => { setScore(finalScore); setFinished(true); }}
      />
      {finished && (
        <div role="dialog" aria-label="Solo result" className="fixed inset-0 flex flex-col items-center justify-center bg-background/85 px-6 text-foreground">
          <p className="font-mono text-xs text-muted-foreground">SOLO RUN</p>
          <h1 className="mt-3 font-display text-5xl">GAME OVER</h1>
          <div className="mt-8"><ScoreBlock label="SCORE" value={score} /></div>
          <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
            <Button disabled={locked} className="h-14" onClick={() => {
              setScore(0);
              setFinished(false);
              setLocked(true);
              setRun({ seed: Math.floor(Math.random() * 2 ** 31), attempt: run.attempt + 1 });
            }}><RotateCcw /> PLAY AGAIN</Button>
            <Button disabled={locked} variant="outline" className="h-12" onClick={() => navigate({ to: "/" })}><LogOut /> EXIT</Button>
          </div>
        </div>
      )}
    </>
  );
}