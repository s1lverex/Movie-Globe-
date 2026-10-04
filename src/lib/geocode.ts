import { env } from './config';

/**
 * Place search / reverse geocoding. Default: free OpenStreetMap Nominatim
 * (no key; ≤1 request/s; attribution required). A Nominatim-compatible paid
 * provider (e.g. LocationIQ) can be enabled from `.env` without code changes.
 * Every call fails soft: callers fall back to coordinates.
 */
function endpoint(kind: 'search' | 'reverse', params: string): string {
  const { url, key } = env.geocoder;
  return `${url}/${kind}?format=json&addressdetails=1&accept-language=en&${params}${key ? `&key=${encodeURIComponent(key)}` : ''}`;
}

export interface GeoResult {
  name: string;
  lat: number;
  lng: number;
}

let last = 0;
async function politeFetch(url: string, timeoutMs = 6000): Promise<unknown> {
  const wait = Math.max(0, last + env.geocoder.throttleMs - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export function formatCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
}

interface NominatimItem {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
}

function shortName(item: NominatimItem): string | null {
  const a = item.address ?? {};
  const local =
    a.city || a.town || a.village || a.hamlet || a.municipality || a.county || a.state || item.name;
  const country = a.country;
  if (local && country) return `${local}, ${country}`;
  if (local || country) return (local || country) as string;
  return item.display_name?.split(',').slice(0, 2).join(',').trim() || null;
}

export async function searchPlaces(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const data = (await politeFetch(
      endpoint('search', `limit=5&q=${encodeURIComponent(q)}`),
    )) as NominatimItem[];
    return data
      .filter((d) => d.lat && d.lon)
      .map((d) => ({ name: shortName(d) ?? q, lat: Number(d.lat), lng: Number(d.lon) }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const data = (await politeFetch(
      endpoint('reverse', `zoom=10&lat=${lat}&lon=${lng}`),
    )) as NominatimItem & { error?: string };
    if (data.error) return null;
    return shortName(data);
  } catch {
    return null;
  }
}
