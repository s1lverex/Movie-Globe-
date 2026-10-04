import type { Vector3 } from 'three';
import { latLngToVector3 } from '../lib/geo';

export interface NearbyPlace {
  n: string; // name
  c: string; // country
  lat: number;
  lng: number;
  k: 'landmark' | 'capital' | 'city';
  i: string; // icon
  r: number; // importance 0–3
  p?: number; // population
}

export interface IndexedPlace extends NearbyPlace {
  id: string;
  v: Vector3;
}

export const indexPlaces = (list: NearbyPlace[]): IndexedPlace[] =>
  list.map((p, i) => ({ ...p, id: `${i}:${p.n}`, v: latLngToVector3(p.lat, p.lng) }));

const KM_PER_RAD = 6371;

/**
 * The most relevant places around `pos` within `radiusKm`: landmarks first,
 * then capitals and big cities, nearer ones preferred.
 */
export function nearestPlaces(all: IndexedPlace[], pos: Vector3, radiusKm: number, max: number) {
  const out: { place: IndexedPlace; km: number; score: number }[] = [];
  const maxAngle = radiusKm / KM_PER_RAD;
  for (const place of all) {
    const a = place.v.angleTo(pos);
    if (a > maxAngle) continue;
    const km = a * KM_PER_RAD;
    out.push({ place, km, score: place.r * 0.35 + (place.k === 'landmark' ? 0.4 : 0) - km / radiusKm });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, max);
}
