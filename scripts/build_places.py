"""Builds src/data/places.json: curated world landmarks (scripts/landmarks.json)
+ cities from Natural Earth 1:50m populated places (public domain).
Usage: python3 scripts/build_places.py"""
import json, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places_simple.geojson"

landmarks = json.loads((ROOT / "scripts/landmarks.json").read_text())
cities = json.load(urllib.request.urlopen(NE, timeout=60))["features"]

out = []
for name, country, lat, lng, icon in landmarks:
    out.append({"n": name, "c": country, "lat": round(lat, 4), "lng": round(lng, 4), "k": "landmark", "i": icon, "r": 3})
for f in cities:
    p = f["properties"]
    capital = p.get("adm0cap") == 1
    pop = p.get("pop_max") or 0
    if not capital and pop < 300_000:
        continue
    rank = 2 if capital or pop >= 5_000_000 else 1 if pop >= 1_000_000 else 0
    out.append({
        "n": p["name"], "c": p.get("adm0name") or "", "lat": round(p["latitude"], 4), "lng": round(p["longitude"], 4),
        "k": "capital" if capital else "city", "i": "⭐" if capital else "🏙️", "r": rank, "p": pop,
    })
(ROOT / "src/data/places.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
print(len(out), "places;", sum(1 for x in out if x["k"] == "landmark"), "landmarks")
