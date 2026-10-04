import type { DiaryPlace } from '../store/useAppStore';
import type { FilmLocation } from '../types';
import { haversineKm, latLngToVector3, greatCircleSlerp, vector3ToLatLng } from './geo';

/** How a leg of the journey was travelled. */
export type Transport = 'car' | 'bus' | 'boat' | 'plane';

export const TRANSPORTS: Transport[] = ['car', 'bus', 'boat', 'plane'];

export const TRANSPORT_META: Record<Transport, { icon: string; label: string; verb: string }> = {
  car: { icon: '🚗', label: 'Car', verb: 'Drove' },
  bus: { icon: '🚌', label: 'Bus', verb: 'Bus ride' },
  boat: { icon: '⛴️', label: 'Boat', verb: 'Sailed' },
  plane: { icon: '✈️', label: 'Plane', verb: 'Flew' },
};

export const TRANSPORT_COLOR: Record<Transport, string> = {
  plane: '#9CC2FF',
  car: '#FBBF24',
  bus: '#FB923C',
  boat: '#22D3EE',
};

export interface SummaryStop {
  id: string;
  kind: 'trip' | 'film';
  name: string;
  subtitle: string;
  country: string;
  lat: number;
  lng: number;
  /** When the user was there (ms since epoch). */
  time: number;
  icon: string;
  notes?: string;
  /** Explicit transport used to reach this stop, if the user recorded one. */
  transport?: Transport;
}

export interface SummaryLeg {
  from: SummaryStop;
  to: SummaryStop;
  km: number;
  transport: Transport;
  inferred: boolean;
}

/** Returns true if the point is open water. */
export type OceanSampler = (lat: number, lng: number) => boolean;

function dateOf(p: DiaryPlace): number {
  // Prefer the user's "date visited" (local midday avoids timezone day-shifts).
  if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) return new Date(`${p.date}T12:00:00`).getTime();
  return p.visitedAt ?? p.createdAt;
}

const countryOf = (name: string) => {
  const parts = name.split(',').map((x) => x.trim());
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

/** All visited places (diary + film locations), oldest first. */
export function buildStops(
  places: DiaryPlace[],
  visited: Record<string, number>,
  locations: Record<string, FilmLocation>,
): SummaryStop[] {
  const stops: SummaryStop[] = [];
  for (const p of places) {
    if (p.status !== 'visited') continue;
    stops.push({
      id: `trip:${p.id}`,
      kind: 'trip',
      name: p.name,
      subtitle: 'Travel diary',
      country: countryOf(p.name),
      lat: p.lat,
      lng: p.lng,
      time: dateOf(p),
      icon: '📍',
      notes: p.notes || undefined,
      transport: p.transport,
    });
  }
  for (const [slug, t] of Object.entries(visited)) {
    const l = locations[slug];
    if (!l) continue;
    stops.push({
      id: `film:${slug}`,
      kind: 'film',
      name: l.place,
      subtitle: `${l.movie} (${l.years})`,
      country: l.country,
      lat: l.lat,
      lng: l.lng,
      time: t,
      icon: '🎬',
    });
  }
  return stops.sort((a, b) => a.time - b.time);
}

/** Share of the great-circle route (excluding the ends) that crosses water. */
export function waterFraction(a: SummaryStop, b: SummaryStop, isOcean: OceanSampler, samples = 24): number {
  const va = latLngToVector3(a.lat, a.lng);
  const vb = latLngToVector3(b.lat, b.lng);
  let wet = 0;
  let n = 0;
  for (let i = 2; i < samples - 1; i++) {
    const p = vector3ToLatLng(greatCircleSlerp(va, vb, i / samples));
    n++;
    if (isOcean(p.lat, p.lng)) wet++;
  }
  return n ? wet / n : 0;
}

/**
 * Best guess when the user didn't record transport: long hauls fly, short
 * water crossings sail, everything else is a road trip (car if short, bus if longer).
 */
export function inferTransport(a: SummaryStop, b: SummaryStop, isOcean?: OceanSampler): Transport {
  const km = haversineKm(a, b);
  if (km > 1200) return 'plane';
  const water = isOcean ? waterFraction(a, b, isOcean) : 0;
  if (water > 0.35) return km > 700 ? 'plane' : 'boat';
  return km < 250 ? 'car' : 'bus';
}

export function buildLegs(stops: SummaryStop[], isOcean?: OceanSampler): SummaryLeg[] {
  const legs: SummaryLeg[] = [];
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1];
    const to = stops[i];
    legs.push({
      from,
      to,
      km: haversineKm(from, to),
      transport: to.transport ?? inferTransport(from, to, isOcean),
      inferred: !to.transport,
    });
  }
  return legs;
}

export interface SummaryStats {
  places: number;
  countries: number;
  km: number;
  byTransport: Record<Transport, number>;
  first?: number;
  last?: number;
}

export function summaryStats(stops: SummaryStop[], legs: SummaryLeg[]): SummaryStats {
  const byTransport: Record<Transport, number> = { car: 0, bus: 0, boat: 0, plane: 0 };
  for (const l of legs) byTransport[l.transport]++;
  return {
    places: stops.length,
    countries: new Set(stops.map((s) => s.country).filter(Boolean)).size,
    km: legs.reduce((sum, l) => sum + l.km, 0),
    byTransport,
    first: stops[0]?.time,
    last: stops[stops.length - 1]?.time,
  };
}

export const formatDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
