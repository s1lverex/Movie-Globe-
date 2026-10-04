# Travel Globe 🌍 (Movie Globe in Movie Mode 🎬)

An interactive 3D globe with a customisable chibi explorer and two modes, switched with the toggle at the top:

- **Normal Mode — Travel Globe** (default): tap anywhere on the globe or search any city (OpenStreetMap) to drop a pin, save it to your **planner** with a date and notes, walk or fly there, and arriving logs it in your **travel diary** (`/trips`).
- **Movie Mode — Movie Globe**: explore 24 verified film locations, travel to them, collect passport stamps and take guided movie tours.

Both modes link out to Trip.com to book a real trip.

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

## Configuration (`.env`)

The app runs on free services only. `.env` lists every slot for future paid providers (geocoding, maps, travel APIs, affiliate IDs), all empty by default. Put real keys in **`.env.local`** (git-ignored, overrides `.env`). Never put secrets in `VITE_*` variables: those are bundled into the browser. Server-only keys need a backend.

- `VITE_GEOCODER_PROVIDER=locationiq` + `VITE_GEOCODER_KEY` switches place search to LocationIQ without code changes (any Nominatim-compatible endpoint works via `custom` + `VITE_GEOCODER_URL`).
- `VITE_TRIP_AFFILIATE_PARAMS` appends Trip.com affiliate params to every link.

## Controls

Drag to orbit, scroll/pinch to zoom · WASD/arrows to walk (Shift = run) or the touch joystick · tap the globe to walk there · tap a pin → Walk/Fly there · `F` toggles the follow camera.

## Asset scripts

- `scripts/fetch_photos.py` — downloads CC0/PD/CC BY photos of the real filming locations from Wikimedia Commons (`pip install pillow`).
- `scripts/fetch_trip_ids.py` — resolves and verifies Trip.com destination / hotel-city IDs per film location (`src/data/tripIds.json`) so booking pages open pre-filled.
- `scripts/gen_credits.py` — regenerates `CREDITS.md` from `src/data/photos.json`.
- `scripts/render_icons.mjs` — renders PWA icons and the OG image from `public/favicon.svg` with Chromium.

Travel Globe / Movie Globe is not affiliated with Trip.com or any film studio.
