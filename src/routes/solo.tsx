import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen } from "@/components/game/game-screen";
import { Button } from "@/components/ui/button";
import { RotateCcw, LogOut, Trophy } from "lucide-react";
import { TournamentStore } from "@/lib/tournament/store";

export const Route = createFileRoute("/solo")({
  validateSearch: (search: Record<string, unknown>) => ({
    tournamentId: typeof search.tournamentId === "string" ? search.tournamentId : undefined,
  }),
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
  const search = Route.useSearch();
  const tournamentId = search.tournamentId;
  const [run, setRun] = useState<{ seed: number; attempt: number } | null>(null);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ distance: 0, stars: 0 });
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(true);
  const [tourneySubmitted, setTourneySubmitted] = useState(false);

  useEffect(() => {
    setRun({ seed: Math.floor(Math.random() * 2 ** 31), attempt: 0 });
  }, []);

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setLocked(false), 900);
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
        onExit={() => navigate({ to: "/" })}
        onDeath={(finalScore, finalStats) => {
          setScore(finalScore);
          if (finalStats) setStats(finalStats);
          if (tournamentId && !tourneySubmitted) {
            TournamentStore.submitTournamentScore(tournamentId, finalScore);
            setTourneySubmitted(true);
          }
          setFinished(true);
        }}
      />
      {finished && (
        <div role="dialog" aria-label="Solo result" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 px-6 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Authentic Flipster Game Over card matching reference */}
          <div className="relative w-full max-w-sm rounded-[22px] border-[5px] border-[#1e3a5f] bg-[#d5e4ec] p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            {/* Title */}
            <h2 className="font-display text-4xl font-black tracking-[0.08em] text-[#1e3a5f] drop-shadow-[0_2px_0_rgba(255,255,255,0.8)]">
              GAME OVER
            </h2>

            {/* Score block */}
            <div className="my-5 flex flex-col items-center gap-1.5 font-display text-base font-bold text-[#1e3a5f]">
              <p className="tracking-wide">
                DISTANCE : {stats.distance || Math.floor(score * 0.8)} M
              </p>
              <p className="tracking-wide">
                STAR BONUS : {stats.stars * 10}
              </p>
              <p className="mt-1 text-2xl font-black tracking-wider text-[#1e3a5f]">
                TOTAL : {score}
              </p>
            </div>

            {tournamentId && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 font-mono text-xs font-bold text-amber-700">
                <Trophy className="size-4" /> Score Submitted to Tournament!
              </div>
            )}

            {/* LIFE LOST footer */}
            <h3 className="font-display text-4xl font-black tracking-[0.1em] text-[#dc2626] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
              LIFE LOST
            </h3>
          </div>

          {/* Action buttons directly below card */}
          <div className="mt-6 flex w-full max-w-sm gap-3">
            <Button
              disabled={locked}
              className="h-13 flex-1 rounded-xl border-2 border-[#1e3a5f] bg-[#1e3a5f] font-display text-base font-bold tracking-widest text-white shadow-lg transition-transform active:scale-95 hover:bg-[#2a4f7a]"
              onClick={() => {
                setScore(0);
                setStats({ distance: 0, stars: 0 });
                setFinished(false);
                setLocked(true);
                setTourneySubmitted(false);
                setRun({ seed: Math.floor(Math.random() * 2 ** 31), attempt: run.attempt + 1 });
              }}
            >
              <RotateCcw className="mr-2 size-5" /> PLAY AGAIN
            </Button>
            <Button
              disabled={locked}
              variant="outline"
              className="h-13 flex-1 rounded-xl border-2 border-[#1e3a5f] bg-white/80 font-display text-base font-bold tracking-widest text-[#1e3a5f] shadow-lg backdrop-blur hover:bg-white"
              onClick={() => navigate({ to: "/" })}
            >
              <LogOut className="mr-2 size-5" /> EXIT
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
