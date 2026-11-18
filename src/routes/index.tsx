import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerId, makeCode } from "@/lib/game/player-id";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flipster — Solo & Multiplayer Ninja Runner" },
      {
        name: "description",
        content:
           "Play Flipster solo or race a friend with live scores. Jump and flip underneath the track.",
      },
      { property: "og:title", content: "Flipster — Solo & Multiplayer Ninja Runner" },
      {
        property: "og:description",
        content:
           "Jump over spikes, flip underneath the track, and race a friend with live scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createMatch() {
    setBusy(true);
    setError(null);
    const playerId = getPlayerId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const c = makeCode();
      const { error: err } = await supabase.from("matches").insert({
        code: c,
        seed: Math.floor(Math.random() * 2 ** 31),
        p1_id: playerId,
        status: "waiting",
      });
      if (!err) {
        navigate({ to: "/match/$code", params: { code: c } });
        return;
      }
      if (!err.message.includes("duplicate")) {
        setError("Could not create a match. Try again.");
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
    setError(null);
    const { data, error: err } = await supabase
      .from("matches")
      .select("id")
      .eq("code", c)
      .maybeSingle();
    if (err || !data) {
      setError("No match with that code.");
      setBusy(false);
      return;
    }
    navigate({ to: "/match/$code", params: { code: c } });
  }

  return (
    <main className="flipster-cover">
      <div className="flipster-cover-scene" aria-hidden="true">
        <span className="cover-cloud cover-cloud-one" />
        <span className="cover-cloud cover-cloud-two" />
        <span className="cover-cloud cover-cloud-three" />
        <span className="cover-horizon" />
        <span className="cover-ground" />
      </div>

      <section className="flipster-cover-panel" aria-label="Flipster game menu">
        {/* Center avatar card */}
        <div className="flex flex-col items-center">
          <div className="flipster-cover-avatar mb-3">
            <NinjaAvatar />
          </div>
          <p className="font-mono text-xs font-bold tracking-widest text-[#1e3a5f] uppercase">
            YOU'RE READY TO PLAY
          </p>
          <h1 className="flipster-cover-title mt-1 tracking-wider text-[#1e3a5f] drop-shadow-[0_2px_0_rgba(255,255,255,0.7)]">
            FL!PSTER
          </h1>
          <p className="font-mono text-[10px] font-bold tracking-wide text-[#2a4f7a] uppercase mt-2 mb-6">
            PLAY UNLIMITED TIMES TILL THE TOURNAMENT ENDS
          </p>
        </div>

        <div className="flipster-cover-actions">
          <Button
            onClick={() => navigate({ to: "/solo" })}
            className="h-14 w-full rounded-xl border-2 border-[#1e3a5f] bg-[#1e3a5f] font-display text-xl font-bold tracking-[0.16em] text-white shadow-lg transition-transform active:scale-95 hover:bg-[#2a4f7a]"
          >
            <Play fill="currentColor" className="mr-2 size-5" /> PLAY
          </Button>

          <Button
            variant="outline"
            onClick={createMatch}
            disabled={busy}
            className="h-12 w-full rounded-xl border-2 border-[#1e3a5f] bg-white/70 font-display text-sm font-bold tracking-[0.12em] text-[#1e3a5f] hover:bg-white"
          >
            <Users className="mr-2 size-4" /> CREATE MATCH
          </Button>

          <form onSubmit={joinMatch} className="flipster-join-form">
            <label className="sr-only" htmlFor="match-code">Match code</label>
            <input
              id="match-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="ENTER CODE"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={4}
              className="flipster-code-input"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={busy || code.length < 4}
              aria-label="Join match"
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-[#1e3a5f] bg-white/70 text-[#1e3a5f] hover:bg-white"
            >
              <ArrowRight />
            </Button>
          </form>
          {error && <p role="alert" className="text-center font-mono text-xs text-destructive">{error}</p>}
        </div>
      </section>
      <p className="flipster-cover-footer" aria-hidden="true">FLIPSTER <span>•</span> ENDLESS RUNNER</p>
    </main>
  );
}

function NinjaAvatar() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {/* Outer rounded card frame */}
      <rect x="2" y="2" width="96" height="96" rx="20" fill="#58bad6" stroke="#ffffff" strokeWidth="4" />
      {/* Sky inside */}
      <rect x="6" y="6" width="88" height="88" rx="16" fill="#67c5de" />
      {/* Little clouds */}
      <ellipse cx="28" cy="38" rx="8" ry="3" fill="rgba(255,255,255,0.7)" />
      <ellipse cx="72" cy="28" rx="11" ry="4" fill="rgba(255,255,255,0.7)" />
      {/* Ground strip */}
      <rect x="6" y="70" width="88" height="24" fill="#52391e" />
      <rect x="6" y="70" width="88" height="6" fill="#75ba2d" />
      {/* Red cone obstacle */}
      <polygon points="66,70 54,70 60,46" fill="#c43828" stroke="#8a1f12" strokeWidth="1.5" />
      <polygon points="60,70 54,70 60,46" fill="#a82d1f" />
      {/* Jumping ninja character */}
      {/* Body */}
      <path d="M26 34 C26 28, 38 28, 42 32 C46 36, 44 48, 44 54 C44 58, 48 58, 52 56 C53 58, 50 63, 44 63 C36 63, 30 63, 26 56 C24 53, 20 54, 18 57 C16 54, 18 48, 22 46 C26 44, 26 38, 26 34 Z" fill="#141414" />
      {/* Large white crescent eye */}
      <ellipse cx="37" cy="38" rx="6.5" ry="8.5" fill="#ffffff" />
      <ellipse cx="39" cy="39" rx="3" ry="5.5" fill="#141414" />
      {/* Red scarf */}
      <rect x="23" y="47" width="22" height="4.5" rx="2" fill="#e02424" />
      {/* Scarf tails */}
      <path d="M23 48 C16 48, 14 52, 12 55 C15 54, 19 51, 23 50 Z" fill="#e02424" />
      <path d="M23 49 C18 52, 14 57, 13 60 C16 57, 20 53, 23 52 Z" fill="#e02424" />
    </svg>
  );
}
