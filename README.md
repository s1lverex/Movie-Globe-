# Movie Globe 🌍🎬

*Walk the World. See the Movies.* — an interactive 3D globe where a customisable chibi explorer walks or flies to famous film locations, collects passport stamps, and links out to Trip.com to plan a real trip.

Spec: [`Movie Globe Plan Md.md`](./Movie%20Globe%20Plan%20Md.md) · Status & deviations: [`Handover.md`](./Handover.md) · Assets: [`CREDITS.md`](./CREDITS.md)

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build to dist/
npm run preview      # serve dist/
npm run lint && npm run typecheck
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (builds + previews automatically)
```

Optional: copy `.env.example` to `.env` and set `VITE_TRIP_AFFILIATE_PARAMS`.

## Controls

Drag to orbit, scroll/pinch to zoom · WASD/arrows to walk (Shift = run) or the touch joystick · tap the globe to walk there · tap a pin → Walk/Fly there · `F` toggles the follow camera.

## Asset scripts

- `scripts/fetch_photos.py` — downloads CC0/PD/CC BY photos of the real filming locations from Wikimedia Commons (`pip install pillow`).
- `scripts/gen_credits.py` — regenerates `CREDITS.md` from `src/data/photos.json`.
- `scripts/render_icons.mjs` — renders PWA icons and the OG image from `public/favicon.svg` with Chromium.

Movie Globe is not affiliated with Trip.com or any film studio.
