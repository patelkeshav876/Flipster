import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Users,
  Trophy,
  History,
  User,
  Settings,
  Coins,
  ArrowRight,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Gift,
  PlusCircle,
  Trash2,
  ShieldAlert,
  Gamepad2,
  Bell,
  ChevronRight,
  Medal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerId, makeCode } from "@/lib/game/player-id";
import {
  TournamentStore,
  type Tournament,
  type MatchRecord,
  type UserProfile,
} from "@/lib/tournament/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flipster Gaming Arena — Play, Compete & Win Tournaments" },
      {
        name: "description",
        content:
          "Play Flipster solo or in tournaments. Compete with players worldwide, win game coins, and rank on leaderboards.",
      },
    ],
  }),
  component: HomePage,
});

type NavTab = "home" | "tournaments" | "matches" | "profile" | "admin";

function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [profile, setProfile] = useState<UserProfile>(TournamentStore.getProfile());
  const [tournaments, setTournaments] = useState<Tournament[]>(TournamentStore.getTournaments());
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(TournamentStore.getMatchHistory());
  const [selectedTourney, setSelectedTourney] = useState<Tournament | null>(null);

  // Matchmaking state
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Profile edit state
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [profileSaved, setProfileSaved] = useState(false);

  // Admin form state
  const [adminTitle, setAdminTitle] = useState("");
  const [adminFee, setAdminFee] = useState(50);
  const [adminPrize, setAdminPrize] = useState(500);
  const [adminHours, setAdminHours] = useState(24);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Reload state
  const reloadData = () => {
    setProfile(TournamentStore.getProfile());
    setTournaments(TournamentStore.getTournaments());
    setMatchHistory(TournamentStore.getMatchHistory());
  };

  useEffect(() => {
    reloadData();
  }, []);

  async function createMatch() {
    setBusy(true);
    setMatchError(null);
    const playerId = getPlayerId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const c = makeCode();
      const { error: err } = await supabase.from("matches").insert({
        code: c,
        seed: Math.floor(Math.random() * 2 ** 31),
        p1_id: playerId,
        p1_name: profile.username,
        status: "waiting",
      });
      if (!err) {
        navigate({ to: "/match/$code", params: { code: c } });
        return;
      }
      if (!err.message.includes("duplicate")) {
        setMatchError("Could not create a match. Try again.");
        break;
      }
    }
    setBusy(false);
  }

  async function joinMatch(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true);
    setMatchError(null);
    const { data, error: err } = await supabase
      .from("matches")
      .select("id")
      .eq("code", c)
      .maybeSingle();
    if (err || !data) {
      setMatchError("No match found with that code.");
      setBusy(false);
      return;
    }
    navigate({ to: "/match/$code", params: { code: c } });
  }

  const handleClaimBonus = () => {
    const res = TournamentStore.claimDailyBonus();
    setProfile({ ...res.profile });
    alert(res.message);
  };

  const handleJoinTournament = (t: Tournament) => {
    if (t.entryFee > 0 && profile.coins < t.entryFee) {
      alert(`Not enough coins! You need ${t.entryFee} coins to enter this tournament.`);
      return;
    }
    if (t.entryFee > 0) {
      TournamentStore.deductCoins(t.entryFee);
    }
    navigate({ to: "/solo", search: { tournamentId: t.id } });
  };

  const handleSaveUsername = () => {
    if (!usernameInput.trim()) return;
    const updated = TournamentStore.updateUsername(usernameInput.trim());
    setProfile({ ...updated });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim()) return;
    TournamentStore.createTournament({
      title: adminTitle.trim(),
      entryFee: Number(adminFee),
      prizePool: Number(adminPrize),
      durationHours: Number(adminHours),
    });
    setAdminTitle("");
    setAdminFee(50);
    setAdminPrize(500);
    setAdminMessage("Tournament created and published successfully!");
    setTournaments(TournamentStore.getTournaments());
    setTimeout(() => setAdminMessage(null), 3000);
  };

  const handleDeleteTournament = (id: string) => {
    TournamentStore.deleteTournament(id);
    setTournaments(TournamentStore.getTournaments());
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f3ec] text-[#1e293b]">
      {/* Top Header matching reference (Image 1) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2dec9] bg-[#fbf9f4]/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-[#e8bc38] font-display font-black text-white shadow-md">
            <span>{profile.username.charAt(0).toUpperCase()}</span>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-medium text-slate-500">Welcome back,</div>
            <div className="font-display text-base font-black tracking-wide text-slate-900">
              {profile.username}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Coins Wallet Badge */}
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-100 to-amber-200 px-3 py-1.5 shadow-sm">
            <Coins className="size-4 text-amber-700" />
            <span className="font-display text-sm font-black text-amber-900 tabular-nums">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("profile")}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Notifications"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 pb-24">
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            {/* Wallet Quick Balance Card matching reference */}
            <div className="rounded-3xl border border-[#e5dfc5] bg-[#fffcf5] p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div>
                  <div className="text-[11px] font-mono font-semibold uppercase text-slate-500">
                    Game Coins
                  </div>
                  <div className="font-display text-2xl font-black text-slate-900 tabular-nums">
                    🪙 {profile.coins.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono font-semibold uppercase text-slate-500">
                    Bonus Coins
                  </div>
                  <div className="font-display text-2xl font-black text-amber-600 tabular-nums">
                    ★ {profile.bonusCoins.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  onClick={handleClaimBonus}
                  className="h-10 flex-1 rounded-xl border border-amber-400 bg-amber-400 font-display text-xs font-black tracking-wider text-slate-900 shadow-sm hover:bg-amber-300 active:scale-95"
                >
                  <Gift className="mr-1.5 size-4" /> DAILY BONUS +200
                </Button>
                <Button
                  onClick={() => setActiveTab("tournaments")}
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-slate-300 bg-white font-display text-xs font-black tracking-wider text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  <Trophy className="mr-1.5 size-4 text-amber-500" /> TOURNAMENTS
                </Button>
              </div>
            </div>

            {/* Featured Game Card (Flipster) */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-lg font-black tracking-wide text-slate-900">
                  Featured Game
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE NOW
                </span>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border-2 border-[#1e3a5f] bg-gradient-to-b from-[#67c5de] to-[#4faec7] p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <img
                    src="/flipster-badge.png"
                    alt="Flipster"
                    className="size-20 rounded-2xl object-cover drop-shadow-md"
                  />
                  <div className="flex-1">
                    <span className="rounded-md bg-amber-400/90 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                      MPL Style Ninja Run
                    </span>
                    <h3 className="font-display text-2xl font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      FL!PSTER
                    </h3>
                    <p className="font-mono text-xs text-white/90">
                      Flip gravity, dodge obstacles, and beat opponents to win game coins!
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => navigate({ to: "/solo" })}
                    className="h-12 rounded-xl border border-white/30 bg-[#1e3a5f] font-display text-sm font-black tracking-wider text-white shadow-md hover:bg-[#162a45] active:scale-95"
                  >
                    <Play className="mr-1.5 size-4 fill-white" /> PLAY SOLO
                  </Button>
                  <Button
                    onClick={() => setActiveTab("matches")}
                    className="h-12 rounded-xl border border-white/30 bg-amber-400 font-display text-sm font-black tracking-wider text-slate-900 shadow-md hover:bg-amber-300 active:scale-95"
                  >
                    <Users className="mr-1.5 size-4" /> 1v1 DUO RACE
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Tournaments Preview */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-lg font-black tracking-wide text-slate-900">
                  Active Tournaments
                </h2>
                <button
                  onClick={() => setActiveTab("tournaments")}
                  className="font-mono text-xs font-bold text-amber-700 hover:underline"
                >
                  View All ({tournaments.length})
                </button>
              </div>

              <div className="space-y-3">
                {tournaments.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-[#e2dec9] bg-white p-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-slate-900">{t.title}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 uppercase">
                          {t.entryFee === 0 ? "FREE" : `${t.entryFee} Coins`}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        Prize Pool: <span className="font-bold text-amber-600">🪙 {t.prizePool}</span> · {t.playersJoined} joined
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinTournament(t)}
                      className="h-9 rounded-xl bg-slate-900 px-4 font-display text-xs font-black tracking-wider text-white hover:bg-slate-800"
                    >
                      ENTER
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* More Games Coming Soon matching reference */}
            <div>
              <h2 className="mb-2.5 font-display text-lg font-black tracking-wide text-slate-900">
                More Games Coming Soon
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Sky Dash", icon: "🚀", color: "from-blue-400 to-indigo-500" },
                  { name: "Blade Arena", icon: "⚔️", color: "from-rose-400 to-red-600" },
                  { name: "Shadow Jump", icon: "🥷", color: "from-emerald-400 to-teal-600" },
                ].map((g, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm opacity-80"
                  >
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${g.color} text-xl shadow-sm`}
                    >
                      {g.icon}
                    </div>
                    <div className="mt-2 font-display text-xs font-black text-slate-800">
                      {g.name}
                    </div>
                    <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[8px] font-bold text-slate-500 uppercase">
                      Coming Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOURNAMENTS */}
        {activeTab === "tournaments" && (
          <div className="mx-auto max-w-lg space-y-4 p-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-black text-slate-900">Tournaments</h1>
                <p className="font-mono text-xs text-slate-500">
                  Join with Game Coins and climb the prize leaderboard
                </p>
              </div>
              <Button
                onClick={() => setActiveTab("admin")}
                variant="outline"
                className="h-8 rounded-lg border-dashed border-amber-600 font-mono text-[11px] font-bold text-amber-700"
              >
                + Admin Create
              </Button>
            </div>

            <div className="space-y-3.5">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="rounded-3xl border border-[#e2dec9] bg-white p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 uppercase">
                          {t.game}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                          {t.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-xl font-black text-slate-900">
                        {t.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Prize Pool</div>
                      <div className="font-display text-lg font-black text-amber-600">
                        🪙 {t.prizePool}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Entry Fee</div>
                      <div className="font-bold text-slate-800">
                        {t.entryFee === 0 ? "FREE" : `${t.entryFee} Coins`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Players</div>
                      <div className="font-bold text-slate-800">{t.playersJoined}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Remaining</div>
                      <div className="font-bold text-slate-800">Active</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setSelectedTourney(t)}
                      variant="outline"
                      className="h-11 flex-1 rounded-xl border-slate-200 font-display text-xs font-black tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      <Trophy className="mr-1.5 size-4 text-amber-500" /> LEADERBOARD
                    </Button>
                    <Button
                      onClick={() => handleJoinTournament(t)}
                      className="h-11 flex-1 rounded-xl bg-slate-900 font-display text-xs font-black tracking-wider text-white hover:bg-slate-800 active:scale-95"
                    >
                      <Play className="mr-1.5 size-4 fill-white" /> ENTER MATCH
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Leaderboard Modal */}
            {selectedTourney && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-md rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-display text-lg font-black text-slate-900">
                        {selectedTourney.title}
                      </div>
                      <div className="font-mono text-xs text-slate-500">Live Leaderboard Standings</div>
                    </div>
                    <button
                      onClick={() => setSelectedTourney(null)}
                      className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="my-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {selectedTourney.leaderboard.length === 0 ? (
                      <div className="py-8 text-center font-mono text-xs text-slate-400">
                        No scores recorded yet. Be the first to enter and claim Rank 1!
                      </div>
                    ) : (
                      selectedTourney.leaderboard.map((row) => (
                        <div
                          key={row.rank}
                          className={`flex items-center justify-between rounded-xl p-3 font-mono text-xs ${
                            row.rank === 1
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex size-6 items-center justify-center rounded-full font-bold ${
                                row.rank === 1
                                  ? "bg-amber-400 text-slate-900"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {row.rank}
                            </span>
                            <span className="font-bold text-slate-800">{row.username}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-900 tabular-nums">
                              {row.score} M
                            </span>
                            {row.prize > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                +{row.prize} 🪙
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      const t = selectedTourney;
                      setSelectedTourney(null);
                      handleJoinTournament(t);
                    }}
                    className="w-full rounded-xl bg-slate-900 py-3 font-display font-black text-white hover:bg-slate-800"
                  >
                    PLAY TOURNAMENT RUN
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATCHES (1v1 & HISTORY) */}
        {activeTab === "matches" && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            {/* 1v1 Room Launcher */}
            <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 shadow-sm">
              <h2 className="font-display text-xl font-black text-slate-900">
                1v1 Head-to-Head Race
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                Race a friend live on the exact same course with instant results.
              </p>

              <div className="mt-4 space-y-3">
                <Button
                  onClick={createMatch}
                  disabled={busy}
                  className="h-12 w-full rounded-xl bg-slate-900 font-display text-sm font-black tracking-wider text-white shadow-md hover:bg-slate-800 active:scale-95"
                >
                  <Users className="mr-2 size-4" /> CREATE MATCH ROOM
                </Button>

                <div className="relative flex items-center justify-center py-1">
                  <span className="w-full border-t border-slate-200" />
                  <span className="absolute bg-white px-3 font-mono text-[10px] uppercase text-slate-400">
                    OR JOIN ROOM
                  </span>
                </div>

                <form onSubmit={joinMatch} className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="ENTER 4-LETTER CODE"
                    maxLength={4}
                    className="h-12 flex-1 rounded-xl border-2 border-slate-200 px-4 font-mono font-bold uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    disabled={busy || code.length < 4}
                    className="size-12 shrink-0 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-300 active:scale-95"
                  >
                    <ArrowRight className="size-5" />
                  </Button>
                </form>

                {matchError && (
                  <p className="font-mono text-xs font-semibold text-rose-600">{matchError}</p>
                )}
              </div>
            </div>

            {/* Match History Cards matching reference (Image 1) */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-lg font-black tracking-wide text-slate-900">
                  Match History
                </h2>
                <span className="font-mono text-xs text-slate-400">
                  {matchHistory.length} matches recorded
                </span>
              </div>

              <div className="space-y-3">
                {matchHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center font-mono text-xs text-slate-400">
                    No match history yet. Play 1v1 matches to build your record!
                  </div>
                ) : (
                  matchHistory.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-slate-400">
                          {m.date}
                        </span>
                        {/* Win / Lose Badge matching reference (Image 1) */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-display text-[11px] font-black tracking-wider uppercase ${
                            m.result === "win"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : m.result === "lose"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {m.result === "win" ? "WIN" : m.result === "lose" ? "LOSE" : "DRAW"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="font-display font-black text-slate-900">
                          <span>{profile.username}</span>
                          <span className="mx-2 text-slate-400">vs</span>
                          <span className="text-slate-600">{m.opponent}</span>
                        </div>
                        <div className="font-mono text-sm font-black text-slate-900 tabular-nums">
                          {m.myScore} : {m.opponentScore}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-mono text-[11px]">
                        <span className="text-slate-500">{m.game}</span>
                        <span
                          className={`font-bold tabular-nums ${
                            m.coinsDelta > 0
                              ? "text-emerald-600"
                              : m.coinsDelta < 0
                              ? "text-rose-600"
                              : "text-slate-500"
                          }`}
                        >
                          {m.coinsDelta > 0 ? `+${m.coinsDelta}` : m.coinsDelta} Coins
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & STATS (Matching Image 1 Performance Screen) */}
        {activeTab === "profile" && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            {/* User Profile Header */}
            <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-900 shadow-md">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-display text-xl font-black text-slate-900">
                    {profile.username}
                  </div>
                  <div className="font-mono text-xs text-slate-500">Flipster Ninja Contender</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                      🪙 {profile.coins.toLocaleString()} Coins
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Username */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <label className="font-mono text-[11px] font-bold uppercase text-slate-400">
                  Edit Gamer Tag
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    maxLength={15}
                    className="h-10 flex-1 rounded-xl border border-slate-200 px-3 font-display text-sm font-bold text-slate-800 focus:border-slate-800 focus:outline-none"
                    placeholder="Enter username"
                  />
                  <Button
                    onClick={handleSaveUsername}
                    className="h-10 rounded-xl bg-slate-900 font-display text-xs font-black text-white hover:bg-slate-800"
                  >
                    SAVE
                  </Button>
                </div>
                {profileSaved && (
                  <p className="mt-1.5 font-mono text-xs font-bold text-emerald-600">
                    Username updated successfully!
                  </p>
                )}
              </div>
            </div>

            {/* Performance Overview (matching reference Image 1) */}
            <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 shadow-sm">
              <h2 className="mb-3.5 font-display text-lg font-black text-slate-900">
                Career Performance
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-[#fbfaf5] p-3.5">
                  <div className="font-mono text-[10px] uppercase text-slate-400">Total Matches</div>
                  <div className="mt-1 font-display text-2xl font-black text-slate-900">
                    {profile.stats.matchesPlayed}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#fbfaf5] p-3.5">
                  <div className="font-mono text-[10px] uppercase text-slate-400">Total Wins</div>
                  <div className="mt-1 font-display text-2xl font-black text-emerald-600">
                    {profile.stats.matchesWon}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#fbfaf5] p-3.5">
                  <div className="font-mono text-[10px] uppercase text-slate-400">Win Rate</div>
                  <div className="mt-1 font-display text-2xl font-black text-amber-600">
                    {profile.stats.matchesPlayed > 0
                      ? Math.round((profile.stats.matchesWon / profile.stats.matchesPlayed) * 100)
                      : 0}
                    %
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#fbfaf5] p-3.5">
                  <div className="font-mono text-[10px] uppercase text-slate-400">Total Coins Won</div>
                  <div className="mt-1 font-display text-2xl font-black text-slate-900">
                    🪙 {profile.stats.totalCoinsWon}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 rounded-2xl border border-slate-100 bg-[#fbfaf5] p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase text-slate-400">Best Distance Record</div>
                    <div className="mt-1 font-display text-2xl font-black text-slate-900">
                      {profile.stats.highestDistance} M
                    </div>
                  </div>
                  <Trophy className="size-8 text-amber-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN (Tournament Creator & Manager) */}
        {activeTab === "admin" && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-600" />
                <h1 className="font-display text-xl font-black text-slate-900">
                  Admin Tournament Manager
                </h1>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">
                Create and host official Flipster tournaments with entry fees, prize pools, and custom durations.
              </p>

              {/* Create Tournament Form */}
              <form onSubmit={handleCreateTournament} className="mt-5 space-y-3.5">
                <div>
                  <label className="font-mono text-xs font-bold text-slate-700">Tournament Title</label>
                  <input
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="e.g. Weekend Ninja Brawl"
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-display text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-xs font-bold text-slate-700">Entry Fee (Coins)</label>
                    <input
                      type="number"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      min={0}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs font-bold text-slate-700">Prize Pool (Coins)</label>
                    <input
                      type="number"
                      value={adminPrize}
                      onChange={(e) => setAdminPrize(Number(e.target.value))}
                      min={100}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs font-bold text-slate-700">Duration (Hours)</label>
                  <input
                    type="number"
                    value={adminHours}
                    onChange={(e) => setAdminHours(Number(e.target.value))}
                    min={1}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-amber-500 font-display text-sm font-black tracking-wider text-slate-950 shadow-md hover:bg-amber-400 active:scale-95"
                >
                  <PlusCircle className="mr-1.5 size-4" /> PUBLISH TOURNAMENT
                </Button>

                {adminMessage && (
                  <p className="font-mono text-xs font-bold text-emerald-600">{adminMessage}</p>
                )}
              </form>
            </div>

            {/* Manage Active Tournaments */}
            <div>
              <h2 className="mb-2.5 font-display text-lg font-black text-slate-900">
                Manage Active Tournaments
              </h2>
              <div className="space-y-3">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <div className="font-display font-black text-slate-900">{t.title}</div>
                      <div className="font-mono text-xs text-slate-500">
                        Fee: {t.entryFee} 🪙 · Pool: {t.prizePool} 🪙 · {t.playersJoined} Players
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTournament(t.id)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      title="End Tournament"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar matching reference (Image 1) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2dec9] bg-[#fbf9f4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {[
            { id: "home", label: "Home", icon: Gamepad2 },
            { id: "tournaments", label: "Tournaments", icon: Trophy },
            { id: "matches", label: "1v1 Match", icon: Users },
            { id: "profile", label: "Profile", icon: User },
            { id: "admin", label: "Admin", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTab)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 transition-all ${
                  isActive ? "text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-xl transition-all ${
                    isActive ? "bg-amber-400 text-slate-950 shadow-sm" : ""
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <span className="font-mono text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
