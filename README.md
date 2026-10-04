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

## Travel Summary

Open **Travel Summary** from the menu, My Trips or the Passport. It replays every place you've visited (diary entries + film locations) in date order: a vehicle travels each leg (✈️ plane arcs, 🚗 car / 🚌 bus / ⛴️ boat along the surface), and a card pops up at each stop with the date, the place, your notes and how you got there. It ends with totals: places, countries, distance and legs by transport. You can play/pause, step, scrub the timeline, play at 1×/2×/4×, and filter to My trips or Film locations. To record how you travelled, use the "How did you travel here?" picker on a place. Otherwise the transport is estimated from distance and whether the route crosses water.

## Accounts (free: Cloudflare Pages Functions + D1/SQLite)

Sign-in syncs trips, diary, passport stamps, favourites and the character across devices. The API lives in `functions/api/` (Pages Functions) with a D1 database (Cloudflare's free SQLite) defined in `migrations/`. Passwords are hashed with PBKDF2-SHA256, sessions use HttpOnly cookies, cross-site writes are rejected, and sign-in attempts are rate-limited. Without the API the app still works and keeps data on the device; the Account page then says accounts aren't available.

**Local:** `npm run dev:api` (API + local SQLite on :8788) alongside `npm run dev` (Vite proxies `/api`). `npm run preview:full` serves the whole stack on :4173 (this is what the E2E tests use).

**Deployed setup (Cloudflare account already prepared):** Pages project `travel-globe` (https://travel-globe-32r.pages.dev) with the D1 database `travel-globe` bound as `DB` (migrations 0001–0002 applied), and `RESEND_API_KEY` stored as an encrypted Pages secret. To deploy, either add the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets so `.github/workflows/deploy.yml` deploys on every push, or run `npm run build && npx wrangler pages deploy dist --project-name travel-globe --branch main` locally after `npx wrangler login`.

Smoke-test a live deployment: `PLAYWRIGHT_BASE_URL=https://travel-globe-32r.pages.dev npx playwright test e2e/account.spec.ts e2e/summary.spec.ts` (test sign-ups use Resend's `delivered+…@resend.dev` sink and are deleted afterwards).

**Email (Resend):** sign-up sends a welcome email and "Forgot password?" sends a single-use reset link (30 min). Optional env vars on the Pages project: `RESEND_FROM` (e.g. `Travel Globe <noreply@interesting-lab.com>` once that domain is verified in Resend; default `onboarding@resend.dev`, which Resend only lets you send to your own address) and `APP_URL` (defaults to the request's origin).

**Production from scratch (one-time, free tier):**

1. `npx wrangler login`
2. `npx wrangler d1 create travel-globe`, then paste the printed `database_id` into `wrangler.toml`.
3. `npm run db:migrate:remote` creates the tables.
4. In the Cloudflare dashboard, open the Pages project → Settings → Bindings → add a **D1 database** binding with variable name **`DB`** → select `travel-globe` (for Production and Preview).
5. Redeploy. `functions/` is picked up automatically by Pages.

`wrangler.toml` deliberately has no `pages_build_output_dir`, so Pages ignores it and deploys keep working before step 4.

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
