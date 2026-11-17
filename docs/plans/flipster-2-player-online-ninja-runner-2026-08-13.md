# Flipster — 2-player online ninja runner

A mobile-first endless runner: a black ninja auto-runs, one tap jumps, speed ramps up over time. Two players join the same match from their own phones and see each other's score update live. Last one standing / higher score wins.

## Gameplay

- One control: tap anywhere (or press space) to jump. Hold-free, single jump with a short coyote window.
- Ninja auto-runs right; obstacles spawn from the right at increasing frequency.
- Speed starts slow and increases steadily with distance (score = distance travelled).
- Hit an obstacle -> you're out. Your opponent keeps running.
- Round ends when both players are out. Higher score wins; a live "VS" bar at the top shows both scores in real time.
- Solid black silhouette ninja, minimal flat art, no extra characters or power-ups.

## Screens

1. **Home** (`/`) — Flipster title, "Create match" and "Join match" (short room code), quick how-to-play line.
2. **Lobby** (`/match/$code`) — shows both players joined, ready state, 3-2-1 countdown once both are ready.
3. **Game** — full-screen canvas with the live score bar (You / Opponent) and a "waiting for opponent to finish" state after you crash.
4. **Result** — final scores, winner banner, rematch and back-home buttons.

## Multiplayer approach

Enable Lovable Cloud for matches. A `matches` table holds the room code, status, shared random seed, and both players' scores/alive flags. Both clients generate identical obstacle layouts from the shared seed so each player runs the same course, while the game loop stays local (no laggy position syncing). Only score + alive state is pushed, throttled to a few updates per second, and mirrored to the opponent via realtime subscription.

## Technical details

- Game loop: `requestAnimationFrame` on a `<canvas>` sized to the viewport, with fixed-timestep physics so speed is device-independent. Rendering handled in a `useGameEngine` hook; React only owns HUD state.
- Obstacles: seeded PRNG (mulberry32) driven by `matches.seed` so both devices see the same course.
- Anonymous player identity per device stored locally; no login screen.
- Cloud table `matches` (code, seed, status, p1_id/p2_id, p1_score/p2_score, p1_alive/p2_alive, timestamps) with realtime enabled, RLS allowing read/update only for rows a player belongs to, plus grants.
- Mobile-first layout, portrait, no scroll, safe-area padding; tap target is the whole screen.
- Design: near-black background, single ink-black ninja silhouette, thin white ground line, sharp corners, condensed mono type for scores.
