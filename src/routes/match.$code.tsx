import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerId } from "@/lib/game/player-id";
import { GameScreen, ScoreBlock } from "@/components/game/game-screen";
import { Button } from "@/components/ui/button";
import { TournamentStore } from "@/lib/tournament/store";

type Match = {
  id: string;
  code: string;
  seed: number;
  status: string;
  p1_id: string;
  p1_name?: string;
  p1_score: number;
  p1_alive: boolean;
  p1_ready: boolean;
  p2_id: string | null;
  p2_name?: string;
  p2_score: number;
  p2_alive: boolean;
  p2_ready: boolean;
  start_at: string | null;
};

export const Route = createFileRoute("/match/$code")({
  head: () => ({
    meta: [
      { title: "Flipster Match — Race Your Friend" },
      {
        name: "description",
        content:
          "Live Flipster match room. Both ninjas run the same course while scores update in real time.",
      },
      { property: "og:title", content: "Flipster Match" },
      {
        property: "og:description",
        content: "Live two-player ninja run with real-time scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [missing, setMissing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resultLocked, setResultLocked] = useState(true);
  const recordedRef = useRef<string | null>(null);

  const isP1 = !!match && match.p1_id === playerId;
  const isP2 = !!match && match.p2_id === playerId;
  const isSpectator = !!match && !isP1 && !isP2;

  const me = match
    ? isP1
      ? { score: match.p1_score, alive: match.p1_alive, ready: match.p1_ready }
      : { score: match.p2_score, alive: match.p2_alive, ready: match.p2_ready }
    : null;
  const them = match
    ? isP1
      ? { score: match.p2_score, alive: match.p2_alive, ready: match.p2_ready }
      : { score: match.p1_score, alive: match.p1_alive, ready: match.p1_ready }
    : null;

  // Record completed match to history
  useEffect(() => {
    if (match?.status !== "finished" || !me || !them || recordedRef.current === match.id) return;
    recordedRef.current = match.id;
    const myScore = me.score;
    const theirScore = them.score;
    const outcome = myScore === theirScore ? "draw" : myScore > theirScore ? "win" : "lose";
    TournamentStore.recordMatch({
      opponent: isP1 ? (match.p2_name || "Player 2") : (match.p1_name || "Player 1"),
      myScore,
      opponentScore: theirScore,
      result: outcome,
      coinsDelta: outcome === "win" ? 100 : outcome === "lose" ? -50 : 0,
      date: "Just now",
      game: "Flipster 1v1",
    });
  }, [match?.status, match?.id, me, them, isP1, match?.p1_name, match?.p2_name]);

  useEffect(() => {
    setPlayerId(getPlayerId());
  }, []);

  // Load + join
  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setMissing(true);
        return;
      }
      let row = data as Match;
      if (row.p1_id !== playerId && !row.p2_id) {
        const myName = TournamentStore.getProfile().username;
        const { data: updated } = await supabase
          .from("matches")
          .update({ p2_id: playerId, p2_name: myName })
          .eq("id", row.id)
          .is("p2_id", null)
          .select("*")
          .maybeSingle();
        if (updated) row = updated as Match;
      }
      setMatch(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, playerId]);

  // Realtime
  useEffect(() => {
    if (!match?.id) return;
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => setMatch(payload.new as Match),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [match?.id]);

  const patch = useCallback(
    async (values: Partial<Match>) => {
      if (!match) return;
      await supabase.from("matches").update(values).eq("id", match.id);
    },
    [match],
  );

  const setReady = async () => {
    if (!match || isSpectator) return;
    await patch(isP1 ? { p1_ready: true } : { p2_ready: true });
  };

  // Both ready -> start countdown (p1 sets start_at)
  useEffect(() => {
    if (!match || !isP1) return;
    if (match.status === "waiting" && match.p1_ready && match.p2_ready && match.p2_id) {
      void patch({
        status: "countdown",
        start_at: new Date(Date.now() + 3500).toISOString(),
        p1_score: 0,
        p2_score: 0,
        p1_alive: true,
        p2_alive: true,
      });
    }
  }, [match, isP1, patch]);

  // Countdown ticker
  useEffect(() => {
    if (!match?.start_at || match.status === "finished") {
      setCountdown(null);
      return;
    }
    const target = new Date(match.start_at).getTime();
    const tick = () => {
      const left = Math.ceil((target - Date.now()) / 1000);
      setCountdown(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [match?.start_at, match?.status]);

  const running =
    (match?.status === "countdown" || match?.status === "running") && countdown === 0;

  // Ignore stray taps for a moment after the result screen appears
  useEffect(() => {
    if (match?.status !== "finished") {
      setResultLocked(true);
      return;
    }
    const id = setTimeout(() => setResultLocked(false), 1200);
    return () => clearTimeout(id);
  }, [match?.status]);

  // Finish when both dead
  useEffect(() => {
    if (!match || !isP1) return;
    if (match.status !== "countdown" && match.status !== "running") return;
    if (!match.p1_alive && !match.p2_alive) {
      void patch({ status: "finished" });
    }
  }, [match, isP1, patch]);

  if (missing) {
    return (
      <Shell>
        <p className="font-mono text-sm text-muted-foreground">Match {code} not found.</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-6 border-2 border-foreground px-6 py-3 font-display tracking-[0.2em]"
        >
          BACK
        </button>
      </Shell>
    );
  }

  if (!match || !me || !them) {
    return (
      <Shell>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Loading…
        </p>
      </Shell>
    );
  }

  if (match.status === "finished") {
    const myScore = me.score;
    const theirScore = them.score;
    const result = myScore === theirScore ? "DRAW" : myScore > theirScore ? "YOU WIN" : "YOU LOSE";
    return (
      <Shell>
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          Match {match.code}
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[0.15em]">{result}</h1>
        <div className="mt-10 flex w-full max-w-xs justify-between font-mono">
          <ScoreBlock label="YOU" value={myScore} />
          <ScoreBlock label="RIVAL" value={theirScore} align="right" />
        </div>
        <div
          className={`mt-12 flex w-full max-w-xs flex-col gap-3 transition-opacity ${resultLocked ? "pointer-events-none opacity-40" : ""}`}
        >
          <button
            disabled={resultLocked}
            onClick={() =>
              patch({
                status: "waiting",
                p1_ready: false,
                p2_ready: false,
                p1_score: 0,
                p2_score: 0,
                p1_alive: true,
                p2_alive: true,
                start_at: null,
                seed: Math.floor(Math.random() * 2 ** 31),
              })
            }
            className="border-2 border-foreground bg-foreground px-6 py-4 font-display tracking-[0.2em] text-background"
          >
            REMATCH
          </button>
          <button
            disabled={resultLocked}
            onClick={() => navigate({ to: "/" })}
            className="border-2 border-border px-6 py-4 font-display tracking-[0.2em] text-muted-foreground"
          >
            EXIT
          </button>
        </div>
      </Shell>
    );
  }

  if (!running) {
    return (
      <Shell>
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          Room code
        </p>
        <h1 className="mt-2 font-display text-6xl tracking-[0.35em]">{match.code}</h1>

        {countdown !== null && countdown > 0 ? (
          <p className="mt-14 font-display text-8xl tabular-nums">{countdown}</p>
        ) : (
          <>
            <div className="mt-12 w-full max-w-xs space-y-3 font-mono text-sm">
              <PlayerRow label="Player 1" joined ready={match.p1_ready} you={isP1} />
              <PlayerRow
                label="Player 2"
                joined={!!match.p2_id}
                ready={match.p2_ready}
                you={isP2}
              />
            </div>

            {isSpectator ? (
              <p className="mt-10 font-mono text-xs text-muted-foreground">
                This room is full — watching only.
              </p>
            ) : (
              <button
                onClick={setReady}
                disabled={me.ready}
                className="mt-10 w-full max-w-xs border-2 border-foreground bg-foreground px-6 py-4 font-display tracking-[0.2em] text-background disabled:bg-transparent disabled:text-muted-foreground"
              >
                {me.ready ? "WAITING FOR RIVAL" : "I'M READY"}
              </button>
            )}
            <Button variant="outline" onClick={() => navigate({ to: "/solo" })} className="mt-4 w-full max-w-xs">PLAY SOLO</Button>
            <p className="mt-6 font-mono text-[11px] text-muted-foreground">
              Share the code so your friend can join from their phone.
            </p>
          </>
        )}
      </Shell>
    );
  }

  return (
    <GameScreen
      key={`${match.id}-${match.seed}`}
      seed={Number(match.seed)}
      myScore={me.score}
      theirScore={them.score}
      myAlive={me.alive}
      theirAlive={them.alive}
      spectator={isSpectator}
      onScore={(score) => patch(isP1 ? { p1_score: score } : { p2_score: score })}
      onDeath={(score) =>
        patch(
          isP1
            ? { p1_score: score, p1_alive: false }
            : { p2_score: score, p2_alive: false },
        )
      }
    />
  );
}

function PlayerRow({
  label,
  joined,
  ready,
  you,
}: {
  label: string;
  joined: boolean;
  ready: boolean;
  you: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-2 border-border px-4 py-3">
      <span className="text-foreground">
        {label}
        {you && <span className="text-muted-foreground"> (you)</span>}
      </span>
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {!joined ? "waiting" : ready ? "ready" : "joined"}
      </span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      {children}
    </main>
  );
}
