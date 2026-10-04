# Plan.md — Movie Globe 🌍🎬
*"Walk the World. See the Movies."*

An interactive 3D globe (three.js) where a customizable character walks across the Earth to visit famous film locations, learns about each one, and can book a real trip via Trip.com.

---

## 0. Rules for the Coding Agent

1. Work through tasks **in order**. Each task is atomic: finish it, verify its **✅ Done when**, then commit.
2. Commit message format: `T<task#>: <short summary>`.
3. **Free only.** No paid APIs, SDKs, or services. All assets must be CC0, public domain, or CC-BY (with attribution recorded in `CREDITS.md`).
4. **No copyrighted movie material.** No posters, stills, logos, or soundtrack clips. Use photos of the *real filming locations* (Wikimedia Commons / Unsplash) and our own text descriptions.
5. TypeScript strict mode. No `any` unless commented why.
6. Mobile-first: every UI feature must work at 375px width and on touch.
7. Never block the main thread with asset loading — show progress UI.
8. When finished (or if stopped early), write `Handover.md` (see Section 9).

---

## 1. Tech Stack (all free)

| Concern | Choice |
|---|---|
| Build | Vite + TypeScript |
| UI | React 18 |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei` |
| Post-processing | `@react-three/postprocessing` (bloom, vignette) |
| State | Zustand (with `persist` middleware → localStorage) |
| Styling | Tailwind CSS |
| Animation | `@react-spring/three` or GSAP (free core) |
| Icons | lucide-react |
| Routing | React Router (deep links like `/location/hobbiton`) |
| PWA | `vite-plugin-pwa` |
| Hosting | Vercel / Netlify / GitHub Pages free tier |
| Testing | Vitest + Playwright |

### Free asset sources
- **Earth textures:** NASA Visible Earth (Blue Marble day, Black Marble night lights, clouds, bump/specular) — public domain. Alternative: Solar System Scope (CC-BY 4.0).
- **Character:** Quaternius "Ultimate Modular Characters" or KayKit "Adventurers" (both CC0, rigged glTF with idle/walk/run animations).
- **Location photos:** Wikimedia Commons (record author + license per image).
- **Fonts:** Inter / Poppins (Google Fonts, OFL).
- **Sound (optional):** Kenney audio packs / freesound.org CC0.

---

## 2. Project Structure

```
movie-globe/
├─ public/
│  ├─ textures/earth/ (day_8k.jpg, night.jpg, clouds.png, bump.jpg, specular.jpg)
│  ├─ models/character/ (base.glb + part meshes)
│  └─ images/locations/<slug>/ (1–4 webp photos each)
├─ src/
│  ├─ data/locations.json
│  ├─ data/tours.json
│  ├─ scene/ (Globe.tsx, Atmosphere.tsx, Clouds.tsx, Stars.tsx, Pins.tsx,
│  │          Character.tsx, TravelArc.tsx, CameraRig.tsx)
│  ├─ ui/ (Sidebar, LocationPanel, TripPanel, CharacterEditor,
│  │       JourneyBar, SearchBar, Toasts, BottomNav)
│  ├─ lib/ (geo.ts, tripLinks.ts, analytics.ts)
│  ├─ store/ (useAppStore.ts)
│  ├─ shaders/ (atmosphere.glsl, earth.glsl)
│  └─ App.tsx, main.tsx
├─ CREDITS.md
├─ Plan.md
└─ Handover.md
```

---

## 3. Data Model

### `locations.json` entry
```ts
interface FilmLocation {
  slug: string;              // "hobbiton"
  movie: string;             // "The Lord of the Rings"
  years: string;             // "2001–2003"
  place: string;             // "Hobbiton Movie Set"
  city: string;              // "Matamata"
  country: string;           // "New Zealand"
  lat: number; lng: number;
  description: string;       // 2–3 sentences, original text
  funFact: string;
  genres: string[];          // ["fantasy","adventure"]
  decade: string;            // "2000s"
  pinColor: string;          // per-genre color
  photos: { src: string; credit: string; license: string }[];
  tripCityQuery: string;     // city name passed to Trip.com search
  nearestAirport: string;    // IATA, e.g. "AKL"
}
```

### Seed locations (verify each coordinate before shipping)

| Movie | Filming location | Lat, Lng |
|---|---|---|
| Harry Potter | Alnwick Castle, Northumberland, UK | 55.4155, -1.7059 |
| Harry Potter | Glenfinnan Viaduct, Scotland | 56.8763, -5.4318 |
| The Lord of the Rings | Hobbiton, Matamata, New Zealand | -37.8721, 175.6829 |
| Jurassic Park | Kualoa Ranch, Oʻahu / Kauaʻi, Hawaii | 21.5210, -157.8370 |
| Avatar (visual inspiration) | Zhangjiajie National Forest Park, China | 29.3249, 110.4343 |
| Inception | Pont de Bir-Hakeim, Paris | 48.8556, 2.2874 |
| The Revenant | Kananaskis Country, Alberta, Canada | 50.95, -115.15 |
| Star Wars: The Force Awakens | Skellig Michael, Ireland | 51.7711, -10.5397 |
| Star Wars: A New Hope | Matmata, Tunisia | 33.5426, 9.9670 |
| Indiana Jones and the Last Crusade | Petra, Jordan | 30.3285, 35.4444 |
| Lawrence of Arabia | Wadi Rum, Jordan | 29.5759, 35.4206 |
| The Sound of Music | Salzburg, Austria | 47.8095, 13.0550 |
| Roman Holiday | Trevi Fountain, Rome | 41.9009, 12.4833 |
| Mamma Mia! | Skopelos, Greece | 39.1222, 23.7260 |
| Skyfall | Glencoe, Scotland | 56.68, -5.10 |
| The Beach | Maya Bay, Thailand | 7.6783, 98.7656 |
| Lost in Translation | Park Hyatt, Tokyo | 35.6856, 139.6907 |
| Mission: Impossible – Ghost Protocol | Burj Khalifa, Dubai | 25.1972, 55.2744 |
| Interstellar | Svínafellsjökull, Iceland | 64.0, -16.87 |
| Mad Max: Fury Road | Namib Desert, Namibia | -22.67, 14.53 |
| Breakfast at Tiffany's | Fifth Avenue, New York | 40.7625, -73.9740 |
| Slumdog Millionaire | Mumbai, India | 19.0760, 72.8777 |

### `tours.json` (new feature)
Curated multi-stop routes: "Fantasy Realms", "Desert Epics", "Romance in Europe", "Sci-Fi Worlds" — each an ordered list of slugs.

---

## 4. Visual Design (from reference + upgrades)

- **Theme:** deep navy space (`#0B1220` bg, `#121A2B` panels), electric blue accent (`#2F6BFF`), glassmorphism panels (blur + 8% white border), rounded 16–24px.
- **Globe:** realistic Blue Marble day texture + bump map + specular oceans.
- **Upgrades over reference:**
  - Real-time **day/night terminator** with city lights glowing on the night side (custom shader blending day/night textures by sun direction).
  - **Fresnel atmosphere glow** (blue rim) and separate slowly rotating **cloud layer** that casts subtle shadows.
  - **Starfield + faint Milky Way** skybox, light bloom on pins and city lights.
  - **Pins:** glowing teardrop markers colored by genre, gentle bob animation, circular thumbnail "bubble" label (like reference) that scales with zoom and hides on the far side of the globe. Cluster nearby pins when zoomed out.
  - **Travel arc:** dotted, animated great-circle arc between current position and destination (as in "Travel Journey" mockup).
  - **Character:** chibi-style, scaled larger than realistic for charm, always stands upright on the surface with soft contact shadow and footstep dust particles.

---

## 5. Core Features

1. **Explore globe** — orbit/zoom/pan, auto-rotate when idle, "locate me" button returns camera to character.
2. **Walking character** — WASD/arrow keys (desktop), virtual joystick (mobile), or tap a spot on the globe to walk there.
3. **Fast travel** — click a pin → "Walk there" or "Fly there" (character hops into a small plane/balloon and follows the arc).
4. **Location detail** — hero photo, movie + years, place, description, fun fact, photo carousel, save/heart.
5. **Travel to this location** — Trip.com panel: Flights, Hotels, Attractions, Car Rentals → opens Trip.com in new tab.
6. **Character customization** — Looks / Outfit / Backpack tabs, skin tones, hair, hats, colors; persisted.
7. **Your Journey** — visited count, progress bar, **passport stamps** earned on arrival (new).
8. **Saved** — list of favorited locations.
9. **Search & filter** (new) — by movie, country, genre, decade.
10. **Movie Tours** (new) — guided multi-stop routes with auto-travel.
11. **Shareable deep links** — `/location/<slug>` opens with camera on that pin.

---

## 6. Trip.com Integration (free)

- No API needed — use outbound links in `src/lib/tripLinks.ts`.
- Build links from `tripCityQuery` / `nearestAirport`. Base sections: flights, hotels, things-to-do, car hire on `https://www.trip.com/`.
- **Agent must verify the current Trip.com URL/query formats manually** and fall back to the Trip.com homepage if a deep link fails.
- Add optional affiliate params via env var `VITE_TRIP_AFFILIATE_PARAMS` (empty by default; user can join the free Trip.com affiliate program later).
- All links: `target="_blank" rel="noopener noreferrer"`, and show an "Opening Trip.com…" toast.
- Footer note: "Movie Globe is not affiliated with Trip.com or any film studio."

---

## 7. Atomic Task List

### Phase A — Setup
- **T1** Init Vite + React + TS strict; add Tailwind, ESLint, Prettier. ✅ Done when `npm run dev` shows a blank navy page.
- **T2** Install three, R3F, drei, postprocessing, zustand, react-router, lucide-react. ✅ Builds without warnings.
- **T3** Create folder structure from Section 2 and empty component stubs. ✅ App renders stub layout.
- **T4** Add `CREDITS.md` template and `.env.example`. ✅ Files exist.

### Phase B — Globe
- **T5** Download NASA textures, compress to webp/KTX2 (2k mobile, 8k desktop). ✅ Total initial load < 6 MB on mobile.
- **T6** `Globe.tsx`: sphere (radius 1, 128 segments) with day texture + bump + specular. ✅ Earth renders correctly oriented (0°,0° faces Gulf of Guinea).
- **T7** `earth.glsl` day/night blend using sun direction from current UTC time. ✅ Night side shows city lights; terminator matches real time.
- **T8** `Clouds.tsx` slightly larger sphere, transparent, slow rotation. ✅ Visible and smooth at 60 fps.
- **T9** `Atmosphere.tsx` fresnel rim shader, additive blending. ✅ Blue glow around edge.
- **T10** `Stars.tsx` starfield + bloom postprocessing. ✅ Matches reference mood.
- **T11** `CameraRig.tsx` OrbitControls with min/max zoom, damping, idle auto-rotate, zoom +/- and locate buttons. ✅ Controls work on mouse and touch.

### Phase C — Data & Pins
- **T12** `lib/geo.ts`: `latLngToVector3`, `vector3ToLatLng`, `greatCircleSlerp`, `haversineKm`. ✅ Unit tests pass.
- **T13** Write `locations.json` with all seed locations, original descriptions, photo credits. ✅ JSON validates against TS type.
- **T14** `Pins.tsx`: instanced glowing pins at coordinates, genre colors, bob animation. ✅ All pins visible at correct places.
- **T15** Pin label bubbles (drei `Html`) with thumbnail + movie + place; hide when behind globe. ✅ No labels show through the Earth.
- **T16** Pin clustering at far zoom. ✅ Overlapping European pins merge into a count bubble.
- **T17** Hover (desktop) highlight and click → select location in store. ✅ Selection logs/updates state.

### Phase D — Character
- **T18** Load CC0 rigged character glTF; play idle animation. ✅ Character visible on globe.
- **T19** Surface placement: position from lat/lng, orient "up" to surface normal. ✅ Stands upright anywhere, including poles.
- **T20** Movement: keyboard input moves along tangent plane, heading rotates via quaternion around normal; blend idle↔walk↔run. ✅ Can walk around the whole planet without flipping.
- **T21** Mobile virtual joystick. ✅ Works on touch devices.
- **T22** Tap-to-walk: raycast globe point, walk along great-circle path. ✅ Character reaches tapped point.
- **T23** Camera follow mode (third-person over shoulder) toggle vs free orbit. ✅ Smooth transitions.
- **T24** Contact shadow + footstep dust particles. ✅ Visible, no fps drop below 50 on mid phones.
- **T25** Arrival detection (within ~50 km of a pin) → mark visited, show stamp toast. ✅ Visit counted once per location.

### Phase E — Travel Animation
- **T26** `TravelArc.tsx`: animated dotted great-circle arc lifted above surface. ✅ Arc appears between character and destination.
- **T27** "Fly there": character hops into a small plane/balloon model and follows arc (3–6 s scaled by distance), camera follows. ✅ Lands at pin and triggers arrival.
- **T28** "Walk there" for short distances (< 2,000 km). ✅ Option hidden for long trips.

### Phase F — UI
- **T29** Desktop sidebar: logo, Explore, My Character, Saved, Tours, About; "Your Journey" progress at bottom. ✅ Matches reference layout.
- **T30** Mobile layout: top header, bottom bar (avatar, Explore button, profile). ✅ Matches mobile mockup.
- **T31** `LocationPanel`: hero photo, title, place, description, movie, filming location, fun fact, carousel, heart. Desktop side panel, mobile bottom sheet (draggable). ✅ Opens on pin click and deep link.
- **T32** `TripPanel`: "Travel to this location" button + Flights/Hotels/Attractions/Car Rentals grid. ✅ All links open correct Trip.com pages in new tab.
- **T33** In-app travel journey card ("Your next adventure") during flight animation (mobile mockup 4). ✅ Shows destination and "View details".
- **T34** Search bar + filters (genre, decade, country). ✅ Filtering hides non-matching pins.
- **T35** Saved page. ✅ Hearted locations listed and clickable.
- **T36** About page with credits and disclaimers. ✅ Pulls from `CREDITS.md` content.

### Phase G — Character Customization
- **T37** `CharacterEditor` with live 3D preview, rotate arrows, tabs Looks/Outfit/Backpack. ✅ UI matches mockup.
- **T38** Swap meshes/materials: hair styles, hats, skin tones, outfit colors, backpacks. ✅ Changes appear instantly.
- **T39** Persist character config in Zustand `persist`. ✅ Survives reload.
- **T40** Randomize button. ✅ Produces valid combos.

### Phase H — Extras
- **T41** Movie Tours: pick tour → auto-travel through stops with narration cards. ✅ Full tour completes.
- **T42** Passport screen with stamps per visited location. ✅ Stamps unlock on arrival.
- **T43** Deep links `/location/:slug` and share button (Web Share API, fallback copy link). ✅ Link opens focused on pin.
- **T44** Optional ambient music + SFX with mute toggle (off by default). ✅ Respects mute state.
- **T45** Onboarding: 3-step tooltip tour on first visit. ✅ Shown once.

### Phase I — Performance, A11y, Release
- **T46** Loading screen with progress; lazy-load photos and character parts. ✅ First interaction < 3 s on 4G.
- **T47** Adaptive quality: lower texture res, disable bloom/clouds on low-end devices; "Low power" toggle. ✅ ≥ 30 fps on mid-range phone.
- **T48** Accessibility: keyboard nav for all panels, ARIA labels, reduced-motion support, list view of locations as non-3D fallback. ✅ Lighthouse a11y ≥ 90.
- **T49** PWA manifest + offline caching of core assets. ✅ Installable.
- **T50** Tests: unit (geo, tripLinks), Playwright E2E (open pin → Travel → Trip.com link). ✅ CI green.
- **T51** Deploy to free hosting; set meta/OG tags. ✅ Public URL works.

---

## 8. Acceptance Criteria (MVP = Phases A–F)
- Globe renders with atmosphere, clouds, and day/night.
- ≥ 20 accurate film locations with original text and credited photos.
- Character walks anywhere on the globe without glitches.
- Clicking a pin shows details; "Travel to this location" opens Trip.com.
- Works on desktop and mobile at ≥ 30 fps.

---

## 9. Handover.md (write at the end)
Include:
1. Tasks completed / skipped / blocked (by task number).
2. How to run, build, deploy.
3. Any deviations from this plan and why.
4. Known bugs and performance numbers (fps desktop/mobile, bundle size).
5. Unverified items (especially Trip.com URL formats and location coordinates).
6. List of all third-party assets with licenses (mirror of `CREDITS.md`).
7. Suggested next steps.
