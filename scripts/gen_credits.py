"""Regenerates CREDITS.md from src/data/photos.json + static asset list."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
photos = json.loads((ROOT / "src/data/photos.json").read_text())
locs = {l["slug"]: l for l in json.loads((ROOT / "src/data/locations.json").read_text())}

out = ["# Credits", "",
       "Travel Globe (and its Movie Mode, Movie Globe) uses only free assets (CC0, public domain or CC BY). No movie posters, stills, logos or soundtrack clips are used.", "",
       "## Earth textures", "",
       "- **Day (Blue Marble: Next Generation, Dec 2004)** — NASA Earth Observatory / Reto Stöckli. Public domain. [Source](https://visibleearth.nasa.gov/images/73909)",
       "- **Night lights (Black Marble 2012)** — NASA Earth Observatory / NOAA NGDC. Public domain. [Source](https://visibleearth.nasa.gov/images/79765)",
       "- **Clouds (Blue Marble cloud composite)** — NASA Goddard Space Flight Center. Public domain. [Source](https://visibleearth.nasa.gov/images/57747)",
       "- **Topography (bump) and ocean mask (specular)** — derived from NASA / GEBCO elevation map. Public domain. [Source](https://visibleearth.nasa.gov/images/73934)",
       "",
       "## Character, sound, search and icons", "",
       "- **Place search & reverse geocoding (Normal Mode)** — [OpenStreetMap Nominatim](https://nominatim.org) · Data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).",
       "- **Explorer character, balloon and pins** — built procedurally in code for this project (no third-party models).",
       "- **Ambient music and sound effects** — synthesised at runtime with the Web Audio API (no audio files).",
       "- **Icons** — [Lucide](https://lucide.dev) (ISC licence).",
       "- **Fonts** — [Inter](https://fonts.google.com/specimen/Inter) and [Poppins](https://fonts.google.com/specimen/Poppins) via Google Fonts (SIL Open Font License).",
       "",
       "## Location photos (Wikimedia Commons)", "",
       "Photos show the real filming locations. Each is used under the licence listed; click through for the original file and full attribution.", ""]
for slug, items in photos.items():
    l = locs.get(slug)
    if not l or not items:
        continue
    out.append(f"### {l['place']} — {l['movie']}")
    for p in items:
        out.append(f"- {p['credit']} — {p['license']} — [Source]({p['sourceUrl'].replace('(', '%28').replace(')', '%29')})")
    out.append("")
out += ["## Disclaimer", "",
        "Travel Globe / Movie Globe is not affiliated with Trip.com or any film studio. Film titles are used only to identify locations. Location descriptions are original text written for this project.", ""]
(ROOT / "CREDITS.md").write_text("\n".join(out))
print("wrote CREDITS.md", sum(len(v) for v in photos.values()), "photos")
