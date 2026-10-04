# Handover — Travel Globe (Movie Globe in Movie Mode)

## 1. Task status

| Phase | Tasks | Status |
|---|---|---|
| A Setup | T1–T4 | ✅ Done (Vite 6 + React 18 + TS strict, Tailwind 4, ESLint 9, Prettier, CREDITS.md, .env.example) |
| B Globe | T5–T11 | ✅ Done. T5: 2k WebP set for mobile, 4k day map on desktop (see deviations) |
| C Data & Pins | T12–T17 | ✅ Done (24 locations, instanced pins, label bubbles with horizon culling, zoom-based clustering, hover/click) |
| D Character | T18–T25 | ✅ Done with a procedural character instead of a glTF (see deviations) |
| E Travel | T26–T28 | ✅ Done (animated dotted arc, hot-air balloon flight 3–6 s, Walk there < 2,000 km) |
| F UI | T29–T36 | ✅ Done |
| G Customisation | T37–T40 | ✅ Done |
| H Extras | T41–T45 | ✅ Done (tours, passport, deep links + share, synthesised audio off by default, 3-step onboarding) |
| I Release | T46–T50 | ✅ Done (loading screen, lazy pages/photos, adaptive quality + Low power toggle, a11y list view, PWA, unit + E2E tests, CI workflow) |
| | T51 Deploy | ⛔ Blocked — needs a hosting account. `vercel.json` / `netlify.toml` and OG/meta tags are ready |

### Normal Mode / Movie Mode (follow-up)

- Toggle: `src/ui/ModeToggle.tsx` (top centre on desktop, under the header on mobile). Mode persists; Normal Mode is the default.
- Switching (`src/lib/mode.ts`) clears the selection, tours, filters and travel, leaves pages that belong to the other mode, and swaps the pins, navigation, search, Explore list, journey bar, tap behaviour, arrival logic and branding (Travel Globe vs. Movie Globe, `src/lib/brand.ts`).
- Normal Mode: places are stored as `DiaryPlace` in the persisted store; `/place/new`, `/place/:id` (`src/ui/PlacePanel.tsx`) and `/trips` (`src/pages/TripsPage.tsx`) cover the planner and diary. Place names come from OpenStreetMap Nominatim (`src/lib/geocode.ts`, free, about 1 request/s). If it fails, coordinates are used instead.
- Deep links switch mode automatically (`/location/*`, `/saved`, `/tours`, `/passport` → Movie; `/place/*`, `/trips` → Normal).
- Bugs fixed along the way: the mobile menu drawer couldn't be tapped (pointer-events), and position saves and arrival checks used clamped physics time, so they stalled at low fps.

### Mobile joystick, Trip.com pre-fill, `.env` (follow-up 2)

- **Joystick fix:** it was always rendered off-screen. Its own `relative` class overrode the `absolute bottom-28` placement, putting it 112 px above the viewport. It was also gated on `(pointer: coarse)`, which some in-app browsers don't report. It now shows on every mobile-width layout (and on touch desktops/tablets), shows a MOVE label, and resets if it unmounts mid-drag. It's covered by an E2E test.
- **Trip.com pre-fill:** film locations now link with Trip.com's own IDs, resolved and verified by `scripts/fetch_trip_ids.py`:
  - Hotels → `hotels/list?city=<id>` (confirmed to pre-select the city, e.g. 58806 = Matamata, NZ).
  - Attractions → `things-to-do/list?citytype=dt&id=<districtId>`.
  - "View on / Travel to" → `travel-guide/destination/<name>-<districtId>/`.
  - Flights and car hire still pass only the destination airport. Trip.com's bot challenge blocks verifying those from a server, and flights need a departure city that the app doesn't know. Normal Mode places (arbitrary spots) can't be resolved to Trip.com IDs from the browser (no public API / CORS), so they fall back to keyword search. The Trip.com mobile app may also drop URL parameters when it intercepts the link.
- **`.env`** is now committed as a template with empty slots: geocoder provider/URL/key (LocationIQ or custom Nominatim-compatible endpoints work today), map keys, affiliate IDs, and server-only travel API secrets (reserved). Real values go in `.env.local` (git-ignored). Typed access is in `src/lib/config.ts`.

### Follow-view steering, accounts, nearby landmarks (follow-up 4)

- **Follow-view spin bug:** in the follow camera the input was camera-relative, which fed back on itself (turn → camera swings → "right" moves → turn again). The follow view now uses steering: left/right turns, up/down walks forward/back. The orbit view keeps camera-relative input.
- **Accounts:** Cloudflare Pages Functions (`functions/api/*`) + D1 (SQLite; `migrations/0001_accounts.sql`). The endpoints are register, login, logout, me, sync (GET/PUT, max 256 KB) and account delete. Security:
  - PBKDF2-SHA256 with 100k iterations and a per-user salt
  - 256-bit session tokens, stored hashed, in an HttpOnly SameSite=Lax cookie (Secure on https)
  - Origin check on writes
  - per-IP and per-email rate limits
  - generic "wrong email or password" errors
  
  The client (`src/lib/account.ts`, `src/lib/sync.ts`) merges this device with the account on sign-in (union of places, stamps and favourites; the account's copy wins on conflicts) and auto-saves changes 1.5 s after they happen. Known limits: no email verification or password reset (both need an email service). Deletions on one device can come back after merging with another device's offline copy, because there are no tombstones.
- **Nearby landmarks:** `src/scene/NearbyLandmarks.tsx` with 121 curated landmarks + about 790 capitals and large cities from Natural Earth (`src/data/places.json`, lazy-loaded, ~25 KB gzip; rebuilt by `scripts/build_places.py`). The search radius adapts to zoom (250–1,600 km in the orbit view, 450 km in the follow view). Labels are laid out in screen space so they never overlap each other, the explorer or the controls; crowded ones slide into a callout column with a dashed leader line. Tapping one in Normal Mode starts planning a trip there.

## 2. Run / build / deploy

See README. Deploy: import the repo in Vercel or Netlify (free tier); build `npm run build`, output `dist/`. SPA rewrites are configured so `/location/<slug>` deep links work.

## 3. Deviations from the plan

- **Character:** built procedurally from three.js primitives (`src/scene/CharacterModel.tsx`) instead of a Quaternius/KayKit glTF. This makes every part (hair styles, hats, skin, outfit colours, backpacks) swappable instantly with no asset pipeline; walk/run/idle are procedural animations. The balloon is procedural too.
- **Character lean:** when zoomed out, the orbit camera looks straight down, so the chibi leans toward the screen (pivoting at the feet) to stay readable, matching the reference mockup. It stands fully upright in follow mode or close zoom. A glowing ring marks its feet.
- **Textures:** NASA source is 5400×2700, so the desktop day map is 4k (not 8k); KTX2 was skipped in favour of WebP (1.3 MB total). Bump/specular are derived from the NASA/GEBCO elevation map.
- **Pan** is disabled on the orbit camera. Rotating the globe already acts as panning, and free pan breaks the globe framing.
- **Locations:** 22 seed locations plus Monument Valley (Forrest Gump) and Dubrovnik (Star Wars: The Last Jedi), so 24 in total.
- **React Three Fiber 8 / drei 9** are used because the plan specifies React 18 (R3F 9 needs React 19).
- **Audio** is synthesised with WebAudio (no files, no licensing).
- **Analytics** (`lib/analytics.ts`) only counts events in localStorage. Nothing leaves the device.
- Shaders are split into `earth.vert/frag.glsl`, `atmosphere.vert/frag.glsl`, `clouds.frag.glsl`.

## 4. Known issues & numbers

- Bundle: JS ≈ 1.25 MB raw / ≈ 350 KB gzip (three 176 KB, R3F/drei 122 KB, app 50 KB gzip). The initial mobile download is about 2.5 MB including the 2k textures, under the 6 MB budget.
- FPS was **not measured on real hardware**. The cloud container only has a software renderer (SwiftShader), so fps there is meaningless. On low fps the app automatically switches to Low power (no bloom or clouds, DPR 1).
- Arrival needs the explorer within 50 km of a pin. Free keyboard walking rarely lands that precisely, so tapping a pin (Walk/Fly there) is the reliable way.
- Some location photos are generic views of the area, e.g. hotel interiors for Park Hyatt Tokyo.
- Lighthouse was not run (no Lighthouse in the container). ARIA labels, keyboard focus, reduced motion and the list view are implemented.

## 5. Unverified items

- **Trip.com URL formats** (`src/lib/tripLinks.ts`; hotels/attractions/destination for film locations are now verified, the rest below are not): `flights/showfarefirst?acity=<iata>`, `hotels/list?keyword=<city>`, `global-search/searchlist/search?keyword=<place>`, `carhire/?pickupAirport=<IATA>`. All return HTTP 200, but Trip.com is a client-side app, so check in a real browser that the searches pre-fill.
- **Coordinates** were checked against public sources to roughly ±1 km. Petra uses the plan's general Petra coordinate (about 1 km from the Treasury). Skopelos uses the town, not the Agios Ioannis chapel.
- Fun facts are written from general knowledge and should be fact-checked before launch.

## 6. Third-party assets

See `CREDITS.md` (generated). Summary: NASA Blue Marble / Black Marble / cloud / GEBCO textures (public domain); 66 Wikimedia Commons photos (CC0, public domain or CC BY 2.0–4.0, each credited and linked); Lucide icons (ISC); Inter and Poppins fonts (OFL).

## 7. Suggested next steps

1. Deploy to Vercel/Netlify and set the real domain in the OG tags.
2. Test on real phones for fps; tune `PerformanceMonitor` thresholds.
3. Join the free Trip.com affiliate programme and set `VITE_TRIP_AFFILIATE_PARAMS`.
4. Optionally swap in a rigged CC0 glTF character (keep `CharacterConfig`).
5. Add more locations and tours; snap keyboard walking to nearby pins.
