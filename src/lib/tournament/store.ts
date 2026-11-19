export type Tournament = {
  id: string;
  title: string;
  game: string;
  entryFee: number;
  prizePool: number;
  playersJoined: number;
  status: "ongoing" | "upcoming" | "ended";
  endsAt: string;
  leaderboard: { rank: number; username: string; score: number; prize: number }[];
};

export type MatchRecord = {
  id: string;
  opponent: string;
  myScore: number;
  opponentScore: number;
  result: "win" | "lose" | "draw";
  coinsDelta: number;
  date: string;
  game: string;
};

export type UserProfile = {
  username: string;
  avatar: string;
  coins: number;
  bonusCoins: number;
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    totalCoinsWon: number;
    highestDistance: number;
    tournamentsEntered: number;
  };
  lastDailyBonus: number;
};

const DEFAULT_TOURNAMENTS: Tournament[] = [
  {
    id: "tourney-1",
    title: "Flipster Grand Championship",
    game: "Flipster",
    entryFee: 100,
    prizePool: 1000,
    playersJoined: 248,
    status: "ongoing",
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    leaderboard: [
      { rank: 1, username: "ShadowMaster", score: 1420, prize: 500 },
      { rank: 2, username: "SpeedNinja_9", score: 1190, prize: 300 },
      { rank: 3, username: "FlipKing", score: 980, prize: 200 },
      { rank: 4, username: "CyberRonin", score: 840, prize: 0 },
      { rank: 5, username: "GhostWalker", score: 710, prize: 0 },
    ],
  },
  {
    id: "tourney-2",
    title: "Daily Coin Rush",
    game: "Flipster",
    entryFee: 25,
    prizePool: 250,
    playersJoined: 112,
    status: "ongoing",
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    leaderboard: [
      { rank: 1, username: "ViperSprint", score: 880, prize: 150 },
      { rank: 2, username: "NinjaCat", score: 760, prize: 75 },
      { rank: 3, username: "BladeDancer", score: 620, prize: 25 },
    ],
  },
  {
    id: "tourney-3",
    title: "Rookie Flip Arena",
    game: "Flipster",
    entryFee: 0,
    prizePool: 100,
    playersJoined: 340,
    status: "ongoing",
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    leaderboard: [
      { rank: 1, username: "NewbieGod", score: 650, prize: 60 },
      { rank: 2, username: "ZenRunner", score: 540, prize: 30 },
      { rank: 3, username: "CloudJumper", score: 490, prize: 10 },
    ],
  },
  {
    id: "tourney-4",
    title: "Weekend High Roller Cup",
    game: "Flipster",
    entryFee: 250,
    prizePool: 3000,
    playersJoined: 64,
    status: "upcoming",
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    leaderboard: [],
  },
];

const DEFAULT_MATCHES: MatchRecord[] = [
  {
    id: "m-1",
    opponent: "ShadowMaster",
    myScore: 420,
    opponentScore: 310,
    result: "win",
    coinsDelta: 100,
    date: "Today, 18:30",
    game: "Flipster 1v1",
  },
  {
    id: "m-2",
    opponent: "SpeedNinja_9",
    myScore: 280,
    opponentScore: 450,
    result: "lose",
    coinsDelta: -50,
    date: "Yesterday, 21:15",
    game: "Flipster 1v1",
  },
  {
    id: "m-3",
    opponent: "CyberRonin",
    myScore: 560,
    opponentScore: 490,
    result: "win",
    coinsDelta: 100,
    date: "Nov 17, 14:20",
    game: "Flipster 1v1",
  },
  {
    id: "m-4",
    opponent: "GhostWalker",
    myScore: 350,
    opponentScore: 350,
    result: "draw",
    coinsDelta: 0,
    date: "Nov 16, 19:40",
    game: "Flipster 1v1",
  },
];

const PROFILE_KEY = "flipster.userProfile";
const TOURNAMENTS_KEY = "flipster.tournaments";
const MATCH_HISTORY_KEY = "flipster.matchHistory";

export class TournamentStore {
  static getProfile(): UserProfile {
    if (typeof window === "undefined") {
      return {
        username: "Markus",
        avatar: "ninja-red",
        coins: 1000,
        bonusCoins: 50,
        stats: { matchesPlayed: 4, matchesWon: 2, totalCoinsWon: 200, highestDistance: 560, tournamentsEntered: 1 },
        lastDailyBonus: 0,
      };
    }
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial: UserProfile = {
      username: "Markus",
      avatar: "ninja-red",
      coins: 1000,
      bonusCoins: 50,
      stats: { matchesPlayed: 4, matchesWon: 2, totalCoinsWon: 200, highestDistance: 560, tournamentsEntered: 1 },
      lastDailyBonus: 0,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(initial));
    return initial;
  }

  static saveProfile(profile: UserProfile) {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  static updateUsername(username: string): UserProfile {
    const p = this.getProfile();
    p.username = username.trim() || "Markus";
    this.saveProfile(p);
    return p;
  }

  static addCoins(amount: number): UserProfile {
    const p = this.getProfile();
    p.coins = Math.max(0, p.coins + amount);
    if (amount > 0) p.stats.totalCoinsWon += amount;
    this.saveProfile(p);
    return p;
  }

  static deductCoins(amount: number): boolean {
    const p = this.getProfile();
    if (p.coins < amount) return false;
    p.coins -= amount;
    this.saveProfile(p);
    return true;
  }

  static claimDailyBonus(): { success: boolean; profile: UserProfile; message: string } {
    const p = this.getProfile();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - p.lastDailyBonus < oneDay) {
      const hoursLeft = Math.ceil((oneDay - (now - p.lastDailyBonus)) / (60 * 60 * 1000));
      return { success: false, profile: p, message: `Bonus available in ${hoursLeft}h` };
    }
    p.coins += 200;
    p.bonusCoins += 50;
    p.lastDailyBonus = now;
    this.saveProfile(p);
    return { success: true, profile: p, message: "Claimed +200 Game Coins & +50 Bonus!" };
  }

  static getTournaments(): Tournament[] {
    if (typeof window === "undefined") return DEFAULT_TOURNAMENTS;
    const saved = localStorage.getItem(TOURNAMENTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(DEFAULT_TOURNAMENTS));
    return DEFAULT_TOURNAMENTS;
  }

  static saveTournaments(tournaments: Tournament[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
  }

  static createTournament(data: { title: string; entryFee: number; prizePool: number; durationHours: number }): Tournament {
    const list = this.getTournaments();
    const newT: Tournament = {
      id: "tourney-" + Date.now().toString(36),
      title: data.title || "Custom Ninja Clash",
      game: "Flipster",
      entryFee: Number(data.entryFee) || 0,
      prizePool: Number(data.prizePool) || 500,
      playersJoined: 1,
      status: "ongoing",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * (Number(data.durationHours) || 24)).toISOString(),
      leaderboard: [],
    };
    list.unshift(newT);
    this.saveTournaments(list);
    return newT;
  }

  static deleteTournament(id: string) {
    const list = this.getTournaments().filter((t) => t.id !== id);
    this.saveTournaments(list);
  }

  static submitTournamentScore(tournamentId: string, score: number): Tournament | null {
    const list = this.getTournaments();
    const t = list.find((item) => item.id === tournamentId);
    if (!t) return null;

    const profile = this.getProfile();
    const existing = t.leaderboard.find((entry) => entry.username === profile.username);
    if (existing) {
      if (score > existing.score) existing.score = score;
    } else {
      t.leaderboard.push({
        rank: 0,
        username: profile.username,
        score,
        prize: 0,
      });
      t.playersJoined++;
    }

    // Sort descending by score
    t.leaderboard.sort((a, b) => b.score - a.score);
    t.leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
      if (idx === 0) entry.prize = Math.floor(t.prizePool * 0.5);
      else if (idx === 1) entry.prize = Math.floor(t.prizePool * 0.3);
      else if (idx === 2) entry.prize = Math.floor(t.prizePool * 0.2);
      else entry.prize = 0;
    });

    this.saveTournaments(list);
    return t;
  }

  static getMatchHistory(): MatchRecord[] {
    if (typeof window === "undefined") return DEFAULT_MATCHES;
    const saved = localStorage.getItem(MATCH_HISTORY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(DEFAULT_MATCHES));
    return DEFAULT_MATCHES;
  }

  static recordMatch(record: Omit<MatchRecord, "id">) {
    const history = this.getMatchHistory();
    const newRecord: MatchRecord = {
      ...record,
      id: "m-" + Date.now().toString(36),
    };
    history.unshift(newRecord);
    if (typeof window !== "undefined") {
      localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    }

    // Update stats
    const profile = this.getProfile();
    profile.stats.matchesPlayed++;
    if (record.result === "win") {
      profile.stats.matchesWon++;
    }
    profile.coins = Math.max(0, profile.coins + record.coinsDelta);
    if (record.coinsDelta > 0) {
      profile.stats.totalCoinsWon += record.coinsDelta;
    }
    if (record.myScore > profile.stats.highestDistance) {
      profile.stats.highestDistance = record.myScore;
    }
    this.saveProfile(profile);
  }
}
