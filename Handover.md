# Handover — Movie Globe

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

- **Trip.com URL formats** (`src/lib/tripLinks.ts`): `flights/showfarefirst?acity=<iata>`, `hotels/list?keyword=<city>`, `global-search/searchlist/search?keyword=<place>`, `carhire/?pickupAirport=<IATA>`. All return HTTP 200, but Trip.com is a client-side app, so check in a real browser that the searches pre-fill.
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
