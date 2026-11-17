import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users } from "lucide-react";
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
        <header className="flipster-cover-header">
          <div className="flipster-cover-mark"><NinjaMark /></div>
          <p className="flipster-cover-kicker">READY TO PLAY</p>
          <h1 className="flipster-cover-title">FLIPSTER</h1>
          <p className="flipster-cover-tagline">JUMP · FLIP · RACE</p>
        </header>

        <div className="flipster-cover-actions">
          <Button
            onClick={() => navigate({ to: "/solo" })}
            className="h-12 w-full rounded-none border-2 border-foreground bg-foreground font-display text-base tracking-[0.16em] text-background hover:bg-foreground/90"
          >
            <Play fill="currentColor" /> PLAY SOLO
          </Button>
          <Button
            variant="outline"
            onClick={createMatch}
            disabled={busy}
            className="h-12 w-full rounded-none border-2 border-foreground bg-transparent font-display text-base tracking-[0.12em] text-foreground hover:bg-background/35"
          >
            <Users /> CREATE MATCH
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
              className="h-12 w-12 shrink-0 rounded-none border-2 border-foreground bg-transparent text-foreground hover:bg-background/35"
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

function NinjaMark() {
  return (
    <svg viewBox="0 0 88 88" className="h-full w-full" aria-hidden="true">
      <rect x="5" y="5" width="78" height="78" rx="13" className="cover-mark-frame" />
      <path d="M17 26c8-9 21-12 32-7l7 5-2 23-10 9-21-1-7-9z" className="cover-mark-ninja" />
      <path d="M49 30c-6-3-14-2-18 3 5 2 11 2 18 0z" className="cover-mark-eye" />
      <path d="m25 51 23 1-3 13-12 5-10-7z" className="cover-mark-ninja" />
      <path d="m23 55 27-4 1 5-27 5z" className="cover-mark-scarf" />
      <path d="m34 67-7 8 12-3 4-7zm10-1 2 9 8-8-4-5z" className="cover-mark-ninja" />
      <path d="m57 70 10-18 10 18z" className="cover-mark-hazard" />
      <path d="m67 70 2-8 3 8z" className="cover-mark-highlight" />
    </svg>
  );
}
