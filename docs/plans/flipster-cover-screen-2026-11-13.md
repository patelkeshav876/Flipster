# Flipster cover screen

Rework the opening screen to match the supplied reference: a bright cyan game-sky scene, a centered translucent cyan title panel, a compact ninja-and-hazard emblem, and a bold FLIPSTER title. Keep the solo and online match actions available within the cover layout.

## Steps

1. Replace the current home-page composition with the reference-inspired cover and retain the existing solo, create-match, and join-match behavior.
2. Add focused responsive styling for the sky, clouds/landscape accents, central panel, and game emblem using the existing semantic game palette.
3. Verify the opening screen in the preview at desktop and mobile sizes, including that the play and multiplayer actions remain reachable.

## Technical details

- Limit changes to the home route and its relevant styles; do not alter game rules, matchmaking behavior, or backend security.
- Use the existing Button design-system component for interactive actions.