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
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  Crown,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerId, makeCode } from "@/lib/game/player-id";
import {
  TournamentStore,
  type Tournament,
  type MatchRecord,
  type UserProfile,
} from "@/lib/tournament/store";
import {
  AdminAuth,
  type AdminAuthStatus,
  type TelegramAdminUser,
} from "@/lib/auth/admin";
import { TierBadge, type TierBadgeKind, TIER_CONFIG } from "@/components/ui/tier-badge";

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

  // Admin authentication state
  const [adminStatus, setAdminStatus] = useState<AdminAuthStatus>(AdminAuth.getStatus());
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

  // Reload state
  const reloadData = () => {
    setProfile(TournamentStore.getProfile());
    setTournaments(TournamentStore.getTournaments());
    setMatchHistory(TournamentStore.getMatchHistory());
    setAdminStatus(AdminAuth.getStatus(authUser?.email));
  };

  useEffect(() => {
    reloadData();

    // Check existing Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      setAdminStatus(AdminAuth.getStatus(user?.email));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      setAdminStatus(AdminAuth.getStatus(user?.email));
    });

    return () => subscription.unsubscribe();
  }, []);

  const [googleHelpOpen, setGoogleHelpOpen] = useState(false);

  async function handleGoogleSignIn() {
    setAuthLoading(true);
    const { error } = await AdminAuth.signInWithGoogle();
    if (error) {
      setGoogleHelpOpen(true);
    }
    setAuthLoading(false);
  }

  async function handleGoogleSignOut() {
    setAuthLoading(true);
    await AdminAuth.signOut();
    setAuthUser(null);
    setAdminStatus(AdminAuth.getStatus(null));
    setAuthLoading(false);
  }

  async function findOnlineMatch() {
    setBusy(true);
    setMatchError(null);
    const playerId = getPlayerId();

    try {
      // 1. Look for any waiting match created by another player in the last 30 minutes
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: openMatches, error: searchErr } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "waiting")
        .is("p2_id", null)
        .neq("p1_id", playerId)
        .gte("created_at", thirtyMinsAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!searchErr && openMatches && openMatches.length > 0) {
        const matchToJoin = openMatches[0];
        // Join this existing match as Player 2
        const { error: joinErr } = await supabase
          .from("matches")
          .update({
            p2_id: playerId,
            p2_name: profile.username,
          })
          .eq("id", matchToJoin.id)
          .is("p2_id", null);

        if (!joinErr) {
          navigate({ to: "/match/$code", params: { code: matchToJoin.code } });
          return;
        }
      }

      // 2. If no open matches are waiting, automatically create one so another player can join
      await createMatch();
    } catch (err: any) {
      setMatchError(err?.message || "Could not find a match. Try again.");
      setBusy(false);
    }
  }

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

  const refreshAdminStatus = () => {
    setAdminStatus(AdminAuth.getStatus(authUser?.email));
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const success = AdminAuth.verifyPin(pinInput);
    if (success) {
      setPinInput("");
      refreshAdminStatus();
    } else {
      setPinError("Invalid Master PIN. (Default setup PIN is 8760)");
    }
  };

  const handleLockAdmin = () => {
    AdminAuth.lockAdminSession();
    refreshAdminStatus();
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length < 4) {
      setSecurityMessage("PIN must be at least 4 characters.");
      return;
    }
    AdminAuth.updatePin(newPinInput.trim());
    setNewPinInput("");
    setSecurityMessage("Master PIN updated successfully!");
    setTimeout(() => setSecurityMessage(null), 3000);
  };

  const handleAddCurrentTelegram = () => {
    if (adminStatus.telegramUser?.username) {
      AdminAuth.addWhitelist(adminStatus.telegramUser.username);
    } else if (adminStatus.telegramUser?.id) {
      AdminAuth.addWhitelist(String(adminStatus.telegramUser.id));
    }
    refreshAdminStatus();
    setSecurityMessage("Your Telegram account is now permanently whitelisted as Admin!");
    setTimeout(() => setSecurityMessage(null), 3000);
  };

  const handleAddCustomWhitelist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelistInput.trim()) return;
    AdminAuth.addWhitelist(whitelistInput.trim());
    setWhitelistInput("");
    refreshAdminStatus();
    setSecurityMessage(`Added ${whitelistInput.trim()} to Admin Whitelist!`);
    setTimeout(() => setSecurityMessage(null), 3000);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f6f4ee] text-[#1e293b] overflow-x-hidden selection:bg-transparent">
      {/* Ambient Glassmorphic Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-[450px] rounded-full bg-gradient-to-br from-indigo-500/15 via-sky-400/10 to-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-96 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-500/10 blur-3xl" />
      </div>

      {/* Top Header with Frosted Glassmorphism */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/70 px-5 py-3.5 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 font-display font-black text-slate-950 shadow-md">
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
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-400/15 backdrop-blur-md px-3 py-1.5 shadow-sm">
            <Coins className="size-4 text-amber-600" />
            <span className="font-display text-sm font-black text-amber-900 tabular-nums">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("profile")}
            className="flex size-9 items-center justify-center rounded-xl border border-white/60 bg-white/70 backdrop-blur-md text-slate-600 hover:bg-white shadow-sm"
            title="Notifications"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="relative z-10 flex-1 pb-24">
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            {/* Wallet Quick Balance Card (Glassmorphic) */}
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl p-5 shadow-lg shadow-slate-900/5">
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
                  className="h-10 flex-1 rounded-xl border border-amber-300 bg-amber-400 font-display text-xs font-black tracking-wider text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-300 active:scale-95"
                >
                  <Gift className="mr-1.5 size-4" /> DAILY BONUS +200
                </Button>
                <Button
                  onClick={() => setActiveTab("tournaments")}
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-white/80 bg-white/80 backdrop-blur-md font-display text-xs font-black tracking-wider text-slate-800 shadow-sm hover:bg-white"
                >
                  <Trophy className="mr-1.5 size-4 text-amber-500" /> TOURNAMENTS
                </Button>
              </div>
            </div>

            {/* Featured Game Card (Flipster Glassmorphism) */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-lg font-black tracking-wide text-slate-900">
                  Featured Game
                </h2>
                <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 backdrop-blur-md">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE NOW
                </span>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-900/95 p-6 text-white shadow-2xl shadow-indigo-950/20 backdrop-blur-2xl">
                {/* Ambient Internal Glows */}
                <div className="absolute -right-12 -top-12 size-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-indigo-500/25 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4">
                  <img
                    src="/flipster-badge.png"
                    alt="Flipster"
                    className="size-20 rounded-2xl object-cover drop-shadow-md border border-white/15"
                  />
                  <div className="flex-1">
                    <span className="rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase tracking-wider backdrop-blur-md">
                      Arcade Gravity Runner
                    </span>
                    <h3 className="font-display text-2xl font-black tracking-wide text-white drop-shadow-md">
                      FL!PSTER
                    </h3>
                    <p className="font-mono text-xs text-white/80">
                      Flip gravity, dodge obstacles, and beat opponents to win game coins!
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => navigate({ to: "/solo" })}
                    className="h-12 rounded-xl border border-white/20 bg-white/10 font-display text-sm font-black tracking-wider text-white backdrop-blur-md shadow-md hover:bg-white/20 active:scale-95"
                  >
                    <Play className="mr-1.5 size-4 fill-white" /> PLAY SOLO
                  </Button>
                  <Button
                    onClick={() => setActiveTab("matches")}
                    className="h-12 rounded-xl border border-amber-300 bg-amber-400 font-display text-sm font-black tracking-wider text-slate-950 shadow-lg shadow-amber-500/25 hover:bg-amber-300 active:scale-95"
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
                    className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-4 shadow-sm"
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
              {adminStatus.isAdmin && (
                <Button
                  onClick={() => setActiveTab("admin")}
                  variant="outline"
                  className="h-8 rounded-lg border-dashed border-amber-600 font-mono text-[11px] font-bold text-amber-700"
                >
                  + Admin Create
                </Button>
              )}
            </div>

            <div className="space-y-3.5">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm transition-all hover:shadow-md"
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

            {/* Leaderboard Modal (Matching Image 5 3D Podium) */}
            {selectedTourney && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in">
                <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-900/95 p-6 text-white shadow-2xl backdrop-blur-2xl">
                  {/* Glare */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="font-display text-xl font-black text-white">
                        {selectedTourney.title}
                      </div>
                      <div className="font-mono text-xs text-amber-300">
                        Total Prize Pool: 🪙 {selectedTourney.prizePool} Coins
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTourney(null)}
                      className="rounded-full bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 3D Leaderboard Podium (matching Image 5) */}
                  {selectedTourney.leaderboard.length >= 3 && (
                    <div className="my-5 flex items-end justify-center gap-2 pt-6">
                      {/* 2nd Place Podium */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-1 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 font-display font-black text-slate-950 shadow-md">
                          {selectedTourney.leaderboard[1].username.charAt(0).toUpperCase()}
                          <span className="absolute -top-2 -right-1 text-sm">🥈</span>
                        </div>
                        <span className="max-w-[70px] truncate font-display text-[11px] font-bold text-slate-200">
                          {selectedTourney.leaderboard[1].username}
                        </span>
                        <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 font-mono text-[9px] font-black text-cyan-300 border border-cyan-400/30">
                          🪙 {selectedTourney.leaderboard[1].prize}
                        </span>
                        {/* 3D Pedestal Step 2 */}
                        <div className="mt-2 flex h-20 w-20 flex-col items-center justify-center rounded-t-2xl border-t-2 border-slate-300 bg-gradient-to-b from-slate-700/80 to-slate-900/90 shadow-lg">
                          <span className="font-display text-3xl font-black text-slate-300/80">2</span>
                          <span className="font-mono text-[9px] text-slate-400">{selectedTourney.leaderboard[1].score} M</span>
                        </div>
                      </div>

                      {/* 1st Place Podium (Highest Center) */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-1 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 font-display font-black text-slate-950 shadow-xl shadow-amber-500/30">
                          {selectedTourney.leaderboard[0].username.charAt(0).toUpperCase()}
                          <span className="absolute -top-3 text-lg">👑</span>
                        </div>
                        <span className="max-w-[85px] truncate font-display text-xs font-black text-amber-300">
                          {selectedTourney.leaderboard[0].username}
                        </span>
                        <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 border border-amber-400/40">
                          🪙 {selectedTourney.leaderboard[0].prize}
                        </span>
                        {/* 3D Pedestal Step 1 */}
                        <div className="mt-2 flex h-28 w-24 flex-col items-center justify-center rounded-t-2xl border-t-2 border-amber-400 bg-gradient-to-b from-amber-600/30 via-slate-800/90 to-slate-900/95 shadow-xl shadow-amber-500/20">
                          <span className="font-display text-4xl font-black text-amber-300">1</span>
                          <span className="font-mono text-[10px] font-bold text-amber-300">{selectedTourney.leaderboard[0].score} M</span>
                        </div>
                      </div>

                      {/* 3rd Place Podium */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-1 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 to-amber-800 font-display font-black text-white shadow-md">
                          {selectedTourney.leaderboard[2].username.charAt(0).toUpperCase()}
                          <span className="absolute -top-2 -right-1 text-sm">🥉</span>
                        </div>
                        <span className="max-w-[70px] truncate font-display text-[11px] font-bold text-slate-300">
                          {selectedTourney.leaderboard[2].username}
                        </span>
                        <span className="rounded-full bg-amber-700/30 px-2 py-0.5 font-mono text-[9px] font-black text-amber-400 border border-amber-600/30">
                          🪙 {selectedTourney.leaderboard[2].prize}
                        </span>
                        {/* 3D Pedestal Step 3 */}
                        <div className="mt-2 flex h-14 w-20 flex-col items-center justify-center rounded-t-2xl border-t-2 border-amber-700 bg-gradient-to-b from-slate-800/80 to-slate-900/90 shadow-md">
                          <span className="font-display text-2xl font-black text-amber-600/80">3</span>
                          <span className="font-mono text-[9px] text-slate-400">{selectedTourney.leaderboard[2].score} M</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rest of Ranks List */}
                  <div className="my-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {selectedTourney.leaderboard.slice(selectedTourney.leaderboard.length >= 3 ? 3 : 0).map((row) => (
                      <div
                        key={row.rank}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 font-mono text-xs backdrop-blur-md"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-300">
                            {row.rank}
                          </span>
                          <span className="font-bold text-slate-200">{row.username}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white tabular-nums">{row.score} M</span>
                          {row.prize > 0 && (
                            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                              +{row.prize} 🪙
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      const t = selectedTourney;
                      setSelectedTourney(null);
                      handleJoinTournament(t);
                    }}
                    className="mt-3 h-12 w-full rounded-xl bg-amber-400 font-display text-sm font-black tracking-wider text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95"
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
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
              <h2 className="font-display text-xl font-black text-slate-900">
                1v1 Head-to-Head Race
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                Race a friend live on the exact same course with instant results.
              </p>

              <div className="mt-4 space-y-3">
                <Button
                  onClick={findOnlineMatch}
                  disabled={busy}
                  className="h-12 w-full rounded-xl bg-amber-500 font-display text-sm font-black tracking-wider text-slate-950 shadow-md hover:bg-amber-400 active:scale-95"
                >
                  <Sparkles className="mr-2 size-4" /> FIND ONLINE PLAYER (AUTO-MATCH)
                </Button>

                <Button
                  onClick={createMatch}
                  disabled={busy}
                  variant="outline"
                  className="h-11 w-full rounded-xl border-slate-200 font-display text-xs font-black tracking-wider text-slate-800 hover:bg-slate-50 active:scale-95"
                >
                  <Users className="mr-2 size-4" /> CREATE PRIVATE ROOM CODE
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
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
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
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
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

            {/* Tier & Honor Badges Showcase (Matching Image 6) */}
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-black text-slate-900">
                    Ninja Arena Badges
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    Tiered honor medals earned by winning matches & tournaments
                  </p>
                </div>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-800">
                  {profile.stats.matchesWon >= 100
                    ? "MYTHIC"
                    : profile.stats.matchesWon >= 50
                    ? "LEGEND"
                    : profile.stats.matchesWon >= 25
                    ? "DIAMOND"
                    : profile.stats.matchesWon >= 10
                    ? "GOLD"
                    : profile.stats.matchesWon >= 3
                    ? "EMERALD"
                    : "ROOKIE"}
                </span>
              </div>

              {/* 6 Badges Grid (Matching Screenshot 6) */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { tier: "bronze" as TierBadgeKind, req: 0 },
                  { tier: "emerald" as TierBadgeKind, req: 3 },
                  { tier: "gold" as TierBadgeKind, req: 10 },
                  { tier: "diamond" as TierBadgeKind, req: 25 },
                  { tier: "amethyst" as TierBadgeKind, req: 50 },
                  { tier: "mythic" as TierBadgeKind, req: 100 },
                ].map(({ tier, req }) => {
                  const unlocked = profile.stats.matchesWon >= req;
                  return (
                    <div
                      key={tier}
                      className={`relative flex flex-col items-center rounded-2xl border p-3 transition-all ${
                        unlocked
                          ? "border-amber-300/60 bg-gradient-to-b from-white to-amber-50/50 shadow-md shadow-amber-500/10"
                          : "border-slate-200 bg-slate-50/60 opacity-40 grayscale"
                      }`}
                    >
                      <TierBadge tier={tier} size="md" />
                      <div className="mt-1 font-display text-[11px] font-black text-slate-800 text-center">
                        {TIER_CONFIG[tier].title}
                      </div>
                      <div className="font-mono text-[9px] text-slate-500">
                        {unlocked ? "✓ UNLOCKED" : `${req} Wins needed`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Google Account & Player Verification */}
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
              <div>
                <h3 className="font-display text-base font-black text-slate-900">
                  Player Identity Verification
                </h3>
                <p className="font-mono text-xs text-slate-500">
                  Verify with Google to preserve ranking, stats, and tournament coin rewards.
                </p>
              </div>

              {authUser ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {authUser.user_metadata?.avatar_url ? (
                        <img
                          src={authUser.user_metadata.avatar_url}
                          alt="Google Avatar"
                          className="size-10 rounded-full border border-emerald-300"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-800">
                          {authUser.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-display text-sm font-black text-emerald-950">
                          {authUser.user_metadata?.full_name || authUser.email}
                        </div>
                        <div className="font-mono text-xs text-emerald-700">{authUser.email}</div>
                      </div>
                    </div>
                    <Button
                      onClick={handleGoogleSignOut}
                      variant="outline"
                      size="sm"
                      disabled={authLoading}
                      className="h-8 rounded-lg border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      Sign Out
                    </Button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Identity Verified via Google</span>
                    {AdminAuth.isEmailAdmin(authUser.email) && (
                      <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase">
                        ⭐ Master Admin
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    variant="outline"
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white font-display text-xs font-black tracking-wider text-slate-800 shadow-sm hover:bg-slate-50 active:scale-95"
                  >
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    CONTINUE WITH GOOGLE
                  </Button>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-mono text-[10px] text-slate-400">Admin email: patelkeshav876@gmail.com</span>
                    <button
                      type="button"
                      onClick={() => setGoogleHelpOpen(true)}
                      className="font-mono text-[10px] text-amber-600 hover:text-amber-700 underline font-semibold"
                    >
                      OAuth Setup Guide ℹ️
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Access Panel (Only if verified) or discreet passcode prompt */}
            {adminStatus.isAdmin ? (
              <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-5 text-amber-600" />
                    <div>
                      <div className="font-display text-sm font-black text-slate-900">
                        Admin Privileges Active
                      </div>
                      <div className="font-mono text-xs text-amber-800">
                        {adminStatus.method === "email"
                          ? `Signed in as Admin (${adminStatus.adminEmail})`
                          : adminStatus.method === "telegram"
                          ? `Verified Telegram ID (${adminStatus.telegramUser?.id || "1446312281"})`
                          : "Verified via Master PIN"}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab("admin")}
                    className="h-9 rounded-xl bg-slate-900 font-display text-xs font-black text-white hover:bg-slate-800"
                  >
                    OPEN DASHBOARD →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center pt-2">
                <button
                  onClick={() => setActiveTab("admin")}
                  className="font-mono text-[11px] text-slate-400 hover:text-slate-600 underline"
                >
                  Admin Portal Login (Passcode)
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN (Tournament Creator & Manager) */}
        {activeTab === "admin" && !adminStatus.isAdmin && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-6 shadow-sm text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-sm">
                <Lock className="size-7" />
              </div>

              <h1 className="mt-3.5 font-display text-2xl font-black text-slate-900">
                Admin Verification Gate
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500 max-w-xs mx-auto">
                Flipster tournament management is restricted. Unlock with Telegram or Master PIN.
              </p>

              {/* Telegram Detection Status Box */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-[#fbfaf5] p-4 text-left">
                <div className="flex items-center gap-2 font-display text-xs font-black text-slate-900 uppercase tracking-wide">
                  <span>📱 Telegram Verification</span>
                </div>
                {adminStatus.telegramUser ? (
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div className="text-slate-700">
                      User:{" "}
                      <span className="font-bold text-slate-900">
                        @{adminStatus.telegramUser.username || "No Username"}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Telegram ID: <span className="font-bold text-slate-700">{adminStatus.telegramUser.id}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                      <ShieldAlert className="size-3.5 text-amber-600" />
                      <span>Not on admin whitelist. Use Master PIN below to unlock.</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs font-mono text-slate-500">
                    No Telegram session detected. Entering via web browser.
                  </div>
                )}
              </div>

              {/* Master PIN Unlock Form */}
              <form onSubmit={handleVerifyPin} className="mt-5 space-y-3.5 text-left">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs font-bold text-slate-700">
                      Master Admin PIN
                    </label>
                    <span className="font-mono text-[10px] text-slate-400">Default PIN: 8760</span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={showPin ? "text" : "password"}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Enter 4-digit PIN (e.g. 8760)"
                      maxLength={12}
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 pl-3.5 pr-10 font-mono text-sm font-bold text-slate-900 tracking-widest focus:border-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {pinError && (
                    <p className="mt-1.5 font-mono text-xs font-bold text-rose-600">{pinError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-slate-900 font-display text-xs font-black tracking-wider text-white shadow-md hover:bg-slate-800 active:scale-95"
                >
                  <KeyRound className="mr-2 size-4" /> UNLOCK ADMIN ACCESS
                </Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "admin" && adminStatus.isAdmin && (
          <div className="mx-auto max-w-lg space-y-5 p-4 animate-in fade-in">
            {/* Admin Header with Verification Status */}
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-600" />
                    <h1 className="font-display text-xl font-black text-slate-900">
                      Admin Tournament Manager
                    </h1>
                  </div>
                  {adminStatus.method === "email" ? (
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Verified via Google ({adminStatus.adminEmail})
                    </div>
                  ) : adminStatus.method === "telegram" ? (
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Verified via Telegram (@{adminStatus.telegramUser?.username || adminStatus.telegramUser?.id || "1446312281"})
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-amber-700">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Verified via Master PIN
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleLockAdmin}
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-200 font-mono text-[11px] font-bold text-slate-600 hover:text-rose-600"
                >
                  <LogOut className="mr-1 size-3.5" /> Lock
                </Button>
              </div>

              {/* One-click whitelist current telegram if unlocked via PIN */}
              {adminStatus.telegramUser && !adminStatus.isTelegramWhitelisted && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-xs font-black text-emerald-900">
                        Link Your Telegram Account
                      </div>
                      <div className="font-mono text-[11px] text-emerald-700">
                        Auto-unlock without PIN next time
                      </div>
                    </div>
                    <Button
                      onClick={handleAddCurrentTelegram}
                      size="sm"
                      className="h-8 rounded-lg bg-emerald-600 font-mono text-[10px] font-bold text-white hover:bg-emerald-700"
                    >
                      <UserCheck className="mr-1 size-3.5" /> Authorize @{adminStatus.telegramUser.username || adminStatus.telegramUser.id}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Settings Toggle */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSecuritySettings(!showSecuritySettings)}
                  className="flex items-center justify-between w-full font-mono text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <span>🔐 Admin Security & Passcode Settings</span>
                  <span>{showSecuritySettings ? "▲" : "▼"}</span>
                </button>

                {showSecuritySettings && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-[#fbfaf5] p-3.5 text-xs font-mono">
                    {/* Change PIN Form */}
                    <form onSubmit={handleUpdatePin} className="space-y-2">
                      <label className="font-bold text-slate-700">Change Master PIN</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          placeholder="New 4-digit PIN"
                          maxLength={12}
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-2.5 font-bold text-slate-800 focus:outline-none"
                        />
                        <Button type="submit" size="sm" className="h-9 rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                          UPDATE PIN
                        </Button>
                      </div>
                    </form>

                    {/* Add Telegram User / ID */}
                    <form onSubmit={handleAddCustomWhitelist} className="space-y-2 border-t border-slate-200 pt-3">
                      <label className="font-bold text-slate-700">Whitelist Another Telegram User</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={whitelistInput}
                          onChange={(e) => setWhitelistInput(e.target.value)}
                          placeholder="Telegram @username or User ID"
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-2.5 font-bold text-slate-800 focus:outline-none"
                        />
                        <Button type="submit" size="sm" className="h-9 rounded-lg bg-slate-800 text-[11px] font-bold text-white">
                          ADD ADMIN
                        </Button>
                      </div>
                    </form>

                    {securityMessage && (
                      <p className="font-bold text-emerald-600">{securityMessage}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Create Tournament Form */}
            <div className="rounded-3xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 p-5 shadow-sm">
              <h2 className="font-display text-lg font-black text-slate-900">
                Create New Tournament
              </h2>
              <form onSubmit={handleCreateTournament} className="mt-4 space-y-3.5">
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

      {/* Google OAuth Setup Guide Modal */}
      {googleHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#0d1424] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white">Google OAuth Setup</h3>
                  <p className="font-mono text-xs text-slate-400">Enable Google sign-in in Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setGoogleHelpOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs text-slate-300">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300 leading-relaxed">
                ⚠️ <strong>"Unsupported provider: provider is not enabled"</strong> means the Google provider toggle is currently OFF in your Supabase project.
              </div>

              <ol className="list-decimal space-y-2 pl-4 text-slate-300 text-[11px] leading-relaxed">
                <li>
                  Open your <strong>Supabase Dashboard</strong> (project: <code className="text-amber-400">bbcfhzssrqoxfjamedry</code>).
                </li>
                <li>
                  Go to <strong>Authentication</strong> → <strong>Providers</strong> → click <strong>Google</strong>.
                </li>
                <li>
                  Toggle <strong>"Enable Google provider"</strong> to <strong>ON</strong>.
                </li>
                <li>
                  Enter your Google Cloud <strong>Client ID</strong> and <strong>Client Secret</strong>, then click <strong>Save</strong>.
                </li>
                <li>
                  (In Google Cloud Console) make sure your Authorized Redirect URI is: <br />
                  <code className="break-all text-[10px] text-emerald-400">https://bbcfhzssrqoxfjamedry.supabase.co/auth/v1/callback</code>
                </li>
              </ol>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="font-bold text-white mb-1">⚡ Quick Admin Access (Instant):</div>
                <p className="text-[11px] text-slate-400">
                  You are already pre-whitelisted via <strong>Telegram ID: 1446312281</strong> or you can enter Master PIN <code className="text-amber-400 font-bold">8760</code> in the Admin tab.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setGoogleHelpOpen(false);
                  setActiveTab("admin");
                }}
                className="flex-1 rounded-xl bg-amber-400 py-2.5 font-display text-xs font-black text-slate-950 hover:bg-amber-300 transition-all"
              >
                UNLOCK VIA ADMIN TAB (PIN 8760)
              </button>
              <button
                onClick={() => setGoogleHelpOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 font-mono text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Radar Matchmaking Scanner Modal */}
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 text-center text-white shadow-2xl backdrop-blur-2xl">
            {/* Animated Sonar Radar Scanner */}
            <div className="relative mx-auto my-6 flex size-36 items-center justify-center">
              {/* Sonar Expanding Pulses */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-sonar" />
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-sonar-delayed" />

              {/* Radar Grid Circles */}
              <div className="absolute size-28 rounded-full border border-white/10" />
              <div className="absolute size-20 rounded-full border border-white/15" />

              {/* Sweeping Radar Beam */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/25 via-amber-400/5 to-transparent origin-center animate-radar-sweep" />
              </div>

              {/* Center Glowing Ninja Orb */}
              <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/50">
                <span className="text-2xl animate-pulse">🥷</span>
              </div>
            </div>

            {/* Dynamic Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-400 uppercase tracking-widest backdrop-blur-md">
              <span className="size-2 rounded-full bg-amber-400 animate-ping" />
              <span>FINDING OPPONENT...</span>
            </div>

            <h3 className="mt-3 font-display text-xl font-black text-white tracking-wide">
              Scanning Live Contenders
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Pinging arena servers and pairing you with an active ninja rival...
            </p>

            <button
              onClick={() => setBusy(false)}
              className="mt-6 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 font-mono text-xs font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
            >
              Cancel Matchmaking
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar with Frosted Glassmorphism */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/75 backdrop-blur-xl shadow-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {[
            { id: "home", label: "Home", icon: Gamepad2 },
            { id: "tournaments", label: "Tournaments", icon: Trophy },
            { id: "matches", label: "1v1 Match", icon: Users },
            { id: "profile", label: "Profile", icon: User },
            ...(adminStatus.isAdmin
              ? [
                  {
                    id: "admin",
                    label: "Admin",
                    icon: ShieldCheck,
                  },
                ]
              : []),
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
                    isActive ? "bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/20" : ""
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
