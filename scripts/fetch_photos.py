"""Fetch freely-licensed photos of real filming locations from Wikimedia Commons.

Only CC0 / Public Domain / CC BY (no ShareAlike, no NC/ND) images are accepted.
Writes public/images/locations/<slug>/<n>.webp + thumb.webp and
src/data/photos.json with author/license per image.
Usage: python3 scripts/fetch_photos.py   (requires pillow)
"""
import io, json, re, sys, time, urllib.parse, urllib.request, html
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
UA = "MovieGlobe/1.0 (open-source educational project; build script)"
QUERIES = {
    "alnwick-castle": ["Alnwick Castle"],
    "glenfinnan-viaduct": ["Glenfinnan Viaduct", "Glenfinnan viaduct train", "Glenfinnan"],
    "hobbiton": ["Hobbiton Movie Set", "Hobbiton Matamata"],
    "kualoa-ranch": ["Kualoa Ranch", "Kualoa valley Oahu"],
    "zhangjiajie": ["Zhangjiajie National Forest Park", "Zhangjiajie pillars"],
    "pont-de-bir-hakeim": ["Pont de Bir-Hakeim"],
    "kananaskis": ["Kananaskis Country", "Kananaskis mountains"],
    "skellig-michael": ["Skellig Michael"],
    "matmata": ["Matmata Tunisia", "Hotel Sidi Driss"],
    "petra": ["Petra Treasury Al-Khazneh", "Petra Jordan"],
    "wadi-rum": ["Wadi Rum"],
    "salzburg": ["Salzburg Mirabell Gardens", "Salzburg old town"],
    "trevi-fountain": ["Trevi Fountain"],
    "skopelos": ["Skopelos Agios Ioannis Kastri", "Skopelos"],
    "glencoe": ["Glen Coe", "Buachaille Etive Mor"],
    "maya-bay": ["Maya Bay", "Ko Phi Phi Le"],
    "park-hyatt-tokyo": ["Park Hyatt Tokyo", "Shinjuku Park Tower"],
    "burj-khalifa": ["Burj Khalifa"],
    "svinafellsjokull": ["Svinafellsjokull", "Svínafellsjökull"],
    "namib-desert": ["Namib Desert dunes", "Namib desert"],
    "fifth-avenue-tiffany": ["Tiffany Fifth Avenue", "Fifth Avenue Manhattan"],
    "mumbai": ["Mumbai Chhatrapati Shivaji Terminus", "Mumbai skyline"],
    "monument-valley": ["Monument Valley"],
    "dubrovnik": ["Dubrovnik old town walls", "Dubrovnik"],
}
OK = re.compile(r"^(cc0|public domain|pd|cc by \d(\.\d)?( [a-z]+)?)$", re.I)

def api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(7):
        try:
            time.sleep(3)
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception:
            time.sleep(5 * 2 ** attempt)
    raise RuntimeError("api failed")

def fetch(url):
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception:
            time.sleep(2 ** attempt)
    raise RuntimeError("fetch failed " + url)

def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()

def main():
    only = set(sys.argv[1:])
    out_path = ROOT / "src/data/photos.json"
    result = json.loads(out_path.read_text()) if out_path.exists() else {}
    for slug, queries in QUERIES.items():
        if only and slug not in only:
            continue
        if not only and slug in result:
            continue
        found = []
        for q in queries:
            data = api({"action": "query", "format": "json", "generator": "search",
                        "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 40,
                        "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1200})
            pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
            for p in pages:
                ii = (p.get("imageinfo") or [{}])[0]
                md = ii.get("extmetadata", {})
                lic = strip(md.get("LicenseShortName", {}).get("value"))
                if not OK.match(lic) or "sa" in lic.lower().split():
                    continue
                if ii.get("width", 0) < 1000 or ii.get("width", 1) < ii.get("height", 0):
                    continue  # landscape, reasonably large only
                if not p["title"].lower().endswith((".jpg", ".jpeg")):
                    continue
                author = strip(md.get("Artist", {}).get("value")) or "Unknown"
                found.append({"title": p["title"], "thumb": ii["thumburl"], "page": ii["descriptionurl"],
                              "author": author[:120], "license": lic})
                if len(found) >= 3:
                    break
            if len(found) >= 3:
                break
        d = ROOT / "public/images/locations" / slug
        d.mkdir(parents=True, exist_ok=True)
        photos = []
        for i, f in enumerate(found):
            img = Image.open(io.BytesIO(fetch(f["thumb"]))).convert("RGB")
            img.thumbnail((1200, 800))
            img.save(d / f"{i + 1}.webp", quality=74)
            if i == 0:
                t = img.copy()
                s = min(t.size)
                t = t.crop(((t.width - s) // 2, (t.height - s) // 2, (t.width + s) // 2, (t.height + s) // 2))
                t.resize((160, 160), Image.LANCZOS).save(d / "thumb.webp", quality=72)
            photos.append({"src": f"/images/locations/{slug}/{i + 1}.webp",
                           "credit": f"{f['author']} via Wikimedia Commons ({f['title'][5:]})",
                           "license": f["license"], "sourceUrl": f["page"]})
            time.sleep(1.5)
        result[slug] = photos
        print(slug, len(photos), [p["license"] for p in photos], flush=True)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")

if __name__ == "__main__":
    main()
