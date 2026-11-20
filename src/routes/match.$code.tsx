import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerId } from "@/lib/game/player-id";
import { GameScreen } from "@/components/game/game-screen";
import { Button } from "@/components/ui/button";
import { TournamentStore } from "@/lib/tournament/store";
import {
  Users,
  Copy,
  Check,
  Play,
  LogOut,
  ArrowLeft,
  Trophy,
  Coins,
  RotateCcw,
  Sparkles,
} from "lucide-react";

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
      { title: "Flipster 1v1 Arena — Live Ninja Duel" },
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
  const [copied, setCopied] = useState(false);
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

  // Realtime subscription
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

  // Ignore stray taps for a moment after result screen appears
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

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (missing) {
    return (
      <Shell>
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-white/[0.12] to-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl text-center text-white">
          <p className="font-mono text-sm text-slate-400">Match room "{code}" was not found or expired.</p>
          <Button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 h-12 rounded-xl bg-amber-400 font-display text-sm font-black tracking-wider text-slate-950 shadow-md hover:bg-amber-300 active:scale-95"
          >
            RETURN TO LOBBY
          </Button>
        </div>
      </Shell>
    );
  }

  if (!match || !me || !them) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center p-8 text-center text-white">
          <div className="size-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
            CONNECTING TO ARENA…
          </p>
        </div>
      </Shell>
    );
  }

  // Finished Results Screen
  if (match.status === "finished") {
    const myScore = me.score;
    const theirScore = them.score;
    const isWin = myScore > theirScore;
    const isDraw = myScore === theirScore;
    const resultTitle = isDraw ? "DRAW DUEL" : isWin ? "VICTORY!" : "DEFEAT";

    return (
      <Shell>
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-900/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center text-white">
          {/* Top Glint */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">
            ROOM {match.code} · RESULT
          </p>

          <div className="my-4">
            <h1
              className={`font-display text-5xl font-black tracking-wider drop-shadow-lg ${
                isWin ? "text-amber-400" : isDraw ? "text-slate-300" : "text-rose-400"
              }`}
            >
              {resultTitle}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur-md">
              <Coins className="size-3.5" />
              <span>{isWin ? "+100 COINS WON" : isDraw ? "0 COINS (DRAW)" : "-50 COINS"}</span>
            </div>
          </div>

          {/* 3D Score Comparison Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className={`rounded-2xl border p-4 backdrop-blur-md ${isWin ? "border-amber-400/50 bg-amber-400/10 shadow-lg shadow-amber-500/20" : "border-white/10 bg-white/5"}`}>
              <div className="font-mono text-[10px] uppercase text-slate-400">YOU ({TournamentStore.getProfile().username})</div>
              <div className="mt-1 font-display text-3xl font-black text-white tabular-nums">
                {myScore} M
              </div>
            </div>

            <div className={`rounded-2xl border p-4 backdrop-blur-md ${!isWin && !isDraw ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
              <div className="font-mono text-[10px] uppercase text-slate-400">RIVAL ({isP1 ? match.p2_name || "Player 2" : match.p1_name || "Player 1"})</div>
              <div className="mt-1 font-display text-3xl font-black text-white tabular-nums">
                {theirScore} M
              </div>
            </div>
          </div>

          <div
            className={`mt-8 flex flex-col gap-3 transition-opacity ${
              resultLocked ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <Button
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
              className="h-12 w-full rounded-xl bg-amber-400 font-display text-sm font-black tracking-wider text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95"
            >
              <RotateCcw className="mr-2 size-4" /> PLAY REMATCH
            </Button>
            <Button
              variant="outline"
              disabled={resultLocked}
              onClick={() => navigate({ to: "/" })}
              className="h-12 w-full rounded-xl border border-white/20 bg-white/10 font-display text-xs font-black tracking-wider text-white hover:bg-white/20"
            >
              <LogOut className="mr-2 size-4" /> EXIT TO LOBBY
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // Pre-game Waiting Room
  if (!running) {
    return (
      <Shell>
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-white/[0.12] to-white/[0.04] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/60 text-center text-white">
          {/* Subtle top glare */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />

          {/* Top header navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" /> LEAVE ROOM
            </button>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE DUO ARENA
            </span>
          </div>

          {/* Room Code Badge */}
          <div className="mt-5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              ROOM CODE
            </span>
            <div className="mt-1 flex items-center justify-center gap-3">
              <h1 className="font-display text-5xl sm:text-6xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                {match.code}
              </h1>
              <button
                onClick={handleCopyLink}
                className="flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-amber-300 active:scale-95 transition-all shadow-sm"
                title="Copy Room Link"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </button>
            </div>
            {copied && (
              <p className="mt-1 font-mono text-[11px] font-bold text-emerald-400 animate-in fade-in">
                Room invite link copied!
              </p>
            )}
          </div>

          {countdown !== null && countdown > 0 ? (
            <div className="my-10 animate-in zoom-in-75 duration-200">
              <div className="relative mx-auto flex size-36 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-400/40 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/80 animate-spin" />
                <span className="font-display text-7xl font-black text-amber-400 tabular-nums drop-shadow-[0_0_25px_#f59e0b]">
                  {countdown}
                </span>
              </div>
              <p className="mt-4 font-display text-sm font-black tracking-widest text-white uppercase">
                GET READY TO RUN!
              </p>
            </div>
          ) : (
            <>
              {/* 3D Duel Player Slots */}
              <div className="mt-6 space-y-3 text-left">
                {/* Player 1 Card */}
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-md shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-display text-base font-black text-slate-950 shadow-md">
                      {(match.p1_name || "P1").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-display text-sm font-black text-white">
                        {match.p1_name || "Player 1"}
                        {isP1 && <span className="ml-1.5 font-mono text-[10px] text-amber-300 font-bold">(YOU)</span>}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">Host Runner</div>
                    </div>
                  </div>
                  <div>
                    {match.p1_ready ? (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                        <Check className="size-3 text-emerald-400" /> READY
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                        JOINED
                      </span>
                    )}
                  </div>
                </div>

                {/* Player 2 Card */}
                {match.p2_id ? (
                  <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-md shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-display text-base font-black text-slate-950 shadow-md">
                        {(match.p2_name || "P2").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-display text-sm font-black text-white">
                          {match.p2_name || "Player 2"}
                          {isP2 && <span className="ml-1.5 font-mono text-[10px] text-cyan-300 font-bold">(YOU)</span>}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">Challenger</div>
                      </div>
                    </div>
                    <div>
                      {match.p2_ready ? (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                          <Check className="size-3 text-emerald-400" /> READY
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                          JOINED
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Dynamic Radar Waiting Challenger Slot */
                  <div className="relative overflow-hidden rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/[0.03] p-4 text-center">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Radar Pulse animation */}
                        <div className="relative flex size-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10">
                          <span className="absolute inset-0 rounded-xl border border-amber-400/50 animate-ping opacity-75" />
                          <Users className="size-5 text-amber-400 animate-pulse" />
                        </div>
                        <div className="text-left">
                          <div className="font-display text-sm font-black text-amber-300">
                            Waiting for Rival...
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            Scanning room or invite a friend
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCopyLink}
                        className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400/25 active:scale-95 transition-all shadow-sm"
                      >
                        SHARE LINK
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                {isSpectator ? (
                  <p className="font-mono text-xs text-slate-400">
                    Room is currently full — you are watching as spectator.
                  </p>
                ) : (
                  <button
                    onClick={setReady}
                    disabled={me.ready}
                    className={`h-14 w-full rounded-2xl font-display text-sm font-black tracking-widest uppercase transition-all shadow-xl ${
                      me.ready
                        ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/20 cursor-default"
                        : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 shadow-emerald-500/30 hover:brightness-110 active:scale-95"
                    }`}
                  >
                    {me.ready ? "✓ READY — WAITING FOR RIVAL" : "I'M READY TO RUN"}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/solo" })}
                    className="h-11 rounded-xl border border-white/20 bg-white/10 font-display text-xs font-black tracking-wider text-white hover:bg-white/20 active:scale-95"
                  >
                    <Play className="mr-1.5 size-3.5 fill-white" /> SOLO PRACTICE
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/" })}
                    className="h-11 rounded-xl border border-white/15 bg-white/5 font-display text-xs font-black tracking-wider text-slate-300 hover:bg-white/15 active:scale-95"
                  >
                    <LogOut className="mr-1.5 size-3.5" /> EXIT ARENA
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#090d18] px-4 py-8 text-white overflow-hidden selection:bg-transparent">
      {/* 3D Ambient Glowing Mesh Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 size-[420px] rounded-full bg-gradient-to-br from-amber-500/25 to-orange-600/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 size-[450px] rounded-full bg-gradient-to-br from-indigo-600/25 via-cyan-500/15 to-purple-600/10 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 size-[400px] rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
