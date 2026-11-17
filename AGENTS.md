# Architecture Rules

- Initialize Telegram Mini App SDK behavior in the shared root shell so every game route receives the same viewport setup.
- Request landscape only while gameplay is active, using best-effort orientation APIs and a rotate-device fallback.
- Render the runner from its 4×4 sprite sheet in the canvas, keeping movement and collision logic independent of animation.
