import React from "react";

export type TierBadgeKind = "bronze" | "emerald" | "gold" | "diamond" | "amethyst" | "mythic";

export interface TierBadgeProps {
  tier: TierBadgeKind;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTitle?: boolean;
}

export const TIER_CONFIG: Record<
  TierBadgeKind,
  {
    title: string;
    subtitle: string;
    minWins: number;
    color: string;
    accent: string;
  }
> = {
  bronze: {
    title: "Rookie Ninja",
    subtitle: "Tier 1 Contender",
    minWins: 0,
    color: "#a8b2c1",
    accent: "text-slate-400",
  },
  emerald: {
    title: "Emerald Acrobat",
    subtitle: "Tier 2 Contender",
    minWins: 3,
    color: "#10b981",
    accent: "text-emerald-400",
  },
  gold: {
    title: "Championship Star",
    subtitle: "Tier 3 Contender",
    minWins: 10,
    color: "#f59e0b",
    accent: "text-amber-400",
  },
  diamond: {
    title: "Diamond Grandmaster",
    subtitle: "Tier 4 Contender",
    minWins: 25,
    color: "#06b6d4",
    accent: "text-cyan-400",
  },
  amethyst: {
    title: "Shadow Legend",
    subtitle: "Tier 5 Contender",
    minWins: 50,
    color: "#a855f7",
    accent: "text-purple-400",
  },
  mythic: {
    title: "Mythic Immortal",
    subtitle: "Top Arena Tier",
    minWins: 100,
    color: "#ec4899",
    accent: "text-rose-400",
  },
};

const SIZES = {
  sm: "size-8",
  md: "size-12",
  lg: "size-16",
  xl: "size-24",
};

/**
 * High-definition SVG badges matching Screenshot 6:
 * 1. Bronze Star Coin
 * 2. Emerald Green Star Coin
 * 3. Gold Ribbon Star Medal
 * 4. Diamond Cyan Radiant Ribbon Medal
 * 5. Amethyst Purple Gem Star Ribbon Medal with sparkles
 * 6. Radiant Sunset / Mythic Double Ribbon Medal with starbursts
 */
export function TierBadge({
  tier,
  size = "md",
  className = "",
  showTitle = false,
}: TierBadgeProps) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeClass} shrink-0 filter drop-shadow-md`}>
        {tier === "bronze" && (
          <svg viewBox="0 0 100 100" className="size-full">
            <defs>
              <linearGradient id="bronze-outer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="bronze-inner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>
            {/* Outer Rim */}
            <circle cx="50" cy="50" r="46" fill="url(#bronze-outer)" stroke="#475569" strokeWidth="3" />
            <circle cx="50" cy="50" r="38" fill="#334155" opacity="0.4" />
            {/* Fluted Rosette */}
            <path
              d="M50 18 C55 18 58 24 63 25 C68 26 73 23 77 27 C81 31 79 36 81 41 C83 46 89 48 89 53 C89 58 83 61 81 66 C79 71 81 76 77 80 C73 84 68 81 63 82 C58 83 55 89 50 89 C45 89 42 83 37 82 C32 81 27 84 23 80 C19 76 21 71 19 66 C17 61 11 58 11 53 C11 48 17 46 19 41 C21 36 19 31 23 27 C27 23 32 26 37 25 C42 24 45 18 50 18 Z"
              fill="url(#bronze-inner)"
            />
            {/* Center Disc */}
            <circle cx="50" cy="53" r="23" fill="#64748b" />
            <circle cx="50" cy="52" r="22" fill="#94a3b8" />
            {/* Star */}
            <polygon
              points="50,38 54,47 64,48 56,55 59,65 50,60 41,65 44,55 36,48 46,47"
              fill="#ffffff"
              filter="drop-shadow(0 1px 1px rgba(0,0,0,0.3))"
            />
          </svg>
        )}

        {tier === "emerald" && (
          <svg viewBox="0 0 100 100" className="size-full">
            <defs>
              <linearGradient id="emerald-outer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="emerald-inner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#emerald-outer)" stroke="#065f46" strokeWidth="3" />
            <path
              d="M50 18 C55 18 58 24 63 25 C68 26 73 23 77 27 C81 31 79 36 81 41 C83 46 89 48 89 53 C89 58 83 61 81 66 C79 71 81 76 77 80 C73 84 68 81 63 82 C58 83 55 89 50 89 C45 89 42 83 37 82 C32 81 27 84 23 80 C19 76 21 71 19 66 C17 61 11 58 11 53 C11 48 17 46 19 41 C21 36 19 31 23 27 C27 23 32 26 37 25 C42 24 45 18 50 18 Z"
              fill="url(#emerald-inner)"
            />
            <circle cx="50" cy="53" r="23" fill="#047857" />
            <circle cx="50" cy="52" r="22" fill="#10b981" />
            <polygon
              points="50,38 54,47 64,48 56,55 59,65 50,60 41,65 44,55 36,48 46,47"
              fill="#ffffff"
            />
          </svg>
        )}

        {tier === "gold" && (
          <svg viewBox="0 0 100 115" className="size-full">
            <defs>
              <linearGradient id="gold-outer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="gold-inner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            {/* Ribbons */}
            <polygon points="36,75 36,110 48,100 48,75" fill="#fde047" stroke="#b45309" strokeWidth="2" />
            <polygon points="64,75 64,110 52,100 52,75" fill="#facc15" stroke="#b45309" strokeWidth="2" />
            <polygon points="44,75 44,112 50,105 56,112 56,75" fill="#ffffff" opacity="0.9" />
            {/* Outer Coin */}
            <circle cx="50" cy="46" r="42" fill="url(#gold-outer)" stroke="#78350f" strokeWidth="3" />
            {/* Rosette */}
            <path
              d="M50 16 C54 16 57 21 61 22 C65 23 70 20 73 24 C77 28 75 32 77 37 C79 41 84 43 84 47 C84 51 79 54 77 58 C75 63 77 67 73 71 C70 75 65 72 61 73 C57 74 54 79 50 79 C46 79 43 74 39 73 C35 72 30 75 27 71 C23 67 25 63 23 58 C21 54 16 51 16 47 C16 43 21 41 23 37 C25 32 23 28 27 24 C30 20 35 23 39 22 C43 21 46 16 50 16 Z"
              fill="url(#gold-inner)"
            />
            <circle cx="50" cy="47" r="20" fill="#f59e0b" />
            <polygon
              points="50,34 53,42 62,43 55,49 57,58 50,53 43,58 45,49 38,43 47,42"
              fill="#ffffff"
            />
          </svg>
        )}

        {tier === "diamond" && (
          <svg viewBox="0 0 100 115" className="size-full">
            <defs>
              <linearGradient id="diamond-outer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="diamond-ribbon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
            {/* Back Glow */}
            <circle cx="50" cy="46" r="44" fill="#06b6d4" opacity="0.3" filter="blur(4px)" />
            {/* Ribbons */}
            <polygon points="36,75 36,110 48,98 48,75" fill="url(#diamond-ribbon)" stroke="#0891b2" strokeWidth="2" />
            <polygon points="64,75 64,110 52,98 52,75" fill="url(#diamond-ribbon)" stroke="#0891b2" strokeWidth="2" />
            <polygon points="44,75 44,110 50,102 56,110 56,75" fill="#cffafe" />
            {/* Rosette */}
            <circle cx="50" cy="46" r="42" fill="url(#diamond-outer)" stroke="#0e7490" strokeWidth="3" />
            <circle cx="50" cy="46" r="32" fill="#0891b2" />
            <circle cx="50" cy="46" r="24" fill="#06b6d4" />
            {/* Star */}
            <polygon
              points="50,33 53,41 62,42 55,48 57,57 50,52 43,57 45,48 38,42 47,41"
              fill="#ffffff"
            />
          </svg>
        )}

        {tier === "amethyst" && (
          <svg viewBox="0 0 100 115" className="size-full">
            <defs>
              <linearGradient id="amethyst-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3e8ff" />
                <stop offset="40%" stopColor="#c084fc" />
                <stop offset="80%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
            </defs>
            {/* Sparkles */}
            <path d="M12 25 L14 20 L16 25 L21 27 L16 29 L14 34 L12 29 L7 27 Z" fill="#f3e8ff" />
            <path d="M84 25 L86 20 L88 25 L93 27 L88 29 L86 34 L84 29 L79 27 Z" fill="#f3e8ff" />
            <path d="M86 65 L87 62 L88 65 L91 66 L88 67 L87 70 L86 67 L83 66 Z" fill="#f3e8ff" />
            {/* Ribbons */}
            <polygon points="36,75 36,110 48,98 48,75" fill="#a855f7" stroke="#6b21a8" strokeWidth="2" />
            <polygon points="64,75 64,110 52,98 52,75" fill="#9333ea" stroke="#6b21a8" strokeWidth="2" />
            <polygon points="44,75 44,110 50,103 56,110 56,75" fill="#f3e8ff" />
            {/* Coin */}
            <circle cx="50" cy="46" r="42" fill="url(#amethyst-grad)" stroke="#581c87" strokeWidth="3" />
            <circle cx="50" cy="46" r="30" fill="#7e22ce" />
            <circle cx="50" cy="46" r="22" fill="#9333ea" />
            <polygon
              points="50,33 53,41 62,42 55,48 57,57 50,52 43,57 45,48 38,42 47,41"
              fill="#ffffff"
            />
          </svg>
        )}

        {tier === "mythic" && (
          <svg viewBox="0 0 100 115" className="size-full">
            <defs>
              <linearGradient id="mythic-rainbow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <radialGradient id="mythic-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Aura */}
            <circle cx="50" cy="46" r="48" fill="url(#mythic-glow)" />
            {/* Sparkles */}
            <path d="M12 20 L14 15 L16 20 L21 22 L16 24 L14 29 L12 24 L7 22 Z" fill="#fef08a" />
            <path d="M85 18 L87 13 L89 18 L94 20 L89 22 L87 27 L85 22 L80 20 Z" fill="#fef08a" />
            <path d="M88 68 L89 65 L90 68 L93 69 L90 70 L89 73 L88 70 L85 69 Z" fill="#fbcfe8" />
            {/* Ribbons with Gradient */}
            <polygon points="34,75 34,112 48,98 48,75" fill="#f43f5e" stroke="#9f1239" strokeWidth="2" />
            <polygon points="66,75 66,112 52,98 52,75" fill="#ec4899" stroke="#9f1239" strokeWidth="2" />
            <polygon points="44,75 44,112 50,104 56,112 56,75" fill="#fde047" />
            {/* Outer Rim */}
            <circle cx="50" cy="46" r="42" fill="url(#mythic-rainbow)" stroke="#881337" strokeWidth="3" />
            <circle cx="50" cy="46" r="30" fill="#be185d" />
            <circle cx="50" cy="46" r="22" fill="#db2777" />
            {/* Star */}
            <polygon
              points="50,33 53,41 62,42 55,48 57,57 50,52 43,57 45,48 38,42 47,41"
              fill="#ffffff"
            />
          </svg>
        )}
      </div>

      {showTitle && (
        <div className="mt-1.5 text-center">
          <div className="font-display text-xs font-black tracking-wide text-slate-800">
            {cfg.title}
          </div>
          <div className="font-mono text-[9px] text-slate-400 uppercase">{cfg.subtitle}</div>
        </div>
      )}
    </div>
  );
}
