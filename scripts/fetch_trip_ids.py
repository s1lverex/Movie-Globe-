"""Resolve Trip.com destination + hotel-city IDs for each film location so
outbound links open with the destination pre-filled.

search?keyword=<tripCityQuery> → districtId → /travel-guide/destination/x-<districtId>/
→ most-linked hotels/list?city=<id> → verified by the hotel page's cityName.
Writes src/data/tripIds.json. Usage: python3 scripts/fetch_trip_ids.py
"""
import json, re, time, urllib.parse, urllib.request, html as htmllib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36"
# Optional per-slug override of the search keyword (Trip.com naming differs).
KEYWORD = {"monument-valley": "Page", "maya-bay": "Ko Phi Phi", "svinafellsjokull": "Skaftafell", "skellig-michael": "Portmagee"}


def get(url):
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US"})
            return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "ignore")
        except Exception:
            time.sleep(2 * (i + 1))
    return ""


def norm(s):
    return re.sub(r"[^a-z]", "", s.lower())


def main():
    locs = json.loads((ROOT / "src/data/locations.json").read_text())
    out_path = ROOT / "src/data/tripIds.json"
    out = json.loads(out_path.read_text()) if out_path.exists() else {}
    for l in locs:
        if l["slug"] in out:
            continue
        kw = KEYWORD.get(l["slug"], l["tripCityQuery"])
        page = get("https://www.trip.com/global-search/searchlist/search?keyword=" + urllib.parse.quote(kw))
        pairs = [(int(i), htmllib.unescape(t).strip()) for i, t in re.findall(r'districtId=(\d+)&amp;type=0">([^<]+)<', page)]
        pick = next((p for p in pairs if norm(p[1]) == norm(kw)), None) or next((p for p in pairs if norm(kw) in norm(p[1])), None)
        if not pick:
            print(f"{l['slug']}: no district for {kw!r} (candidates {pairs[:4]})")
            continue
        did, dname = pick
        dest = get(f"https://www.trip.com/travel-guide/destination/x-{did}/")
        ids = Counter(re.findall(r"hotels/list\?city=(\d+)", dest))
        hotel_city, hotel_name = None, None
        if ids:
            hid = ids.most_common(1)[0][0]
            hp = get(f"https://www.trip.com/hotels/list?city={hid}")
            m = re.search(r'"cityName":"([^"]+)"', hp)
            if m:
                hotel_city, hotel_name = int(hid), m.group(1)
        out[l["slug"]] = {"keyword": kw, "districtId": did, "districtName": dname, "hotelCityId": hotel_city, "hotelCityName": hotel_name}
        print(l["slug"], out[l["slug"]], flush=True)
        out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
        time.sleep(1)


if __name__ == "__main__":
    main()
