import { LOCATION_BY_SLUG, TOURS } from '../data';
import { haversineKm, vector3ToLatLng } from '../lib/geo';
import { playSfx } from '../lib/sound';
import { track } from '../lib/analytics';
import { useAppStore, type Travel } from '../store/useAppStore';
import type { LatLng } from '../types';
import { runtime } from './runtime';

export const ARRIVAL_KM = 50;
export const WALK_MAX_KM = 2000;

export function distanceToPointKm(p: LatLng): number {
  return haversineKm(vector3ToLatLng(runtime.pos), p);
}

export function distanceToKm(slug: string): number {
  const l = LOCATION_BY_SLUG[slug];
  if (!l) return Infinity;
  return distanceToPointKm(l);
}

function start(t: Travel) {
  const s = useAppStore.getState();
  s.startTravel(t);
  if (t.mode === 'fly') {
    useAppStore.setState({ trackFlight: true });
    s.setCameraMode('orbit');
    playSfx('whoosh');
  } else {
    s.setWalkTarget({ lat: t.lat, lng: t.lng });
  }
  track(t.mode, { kind: t.kind, id: t.slug });
}

/** Movie Mode: travel to a film location. */
export function flyTo(slug: string): void {
  const l = LOCATION_BY_SLUG[slug];
  if (l) start({ mode: 'fly', kind: 'movie', slug, lat: l.lat, lng: l.lng });
}

export function walkTo(slug: string): void {
  const l = LOCATION_BY_SLUG[slug];
  if (l) start({ mode: 'walk', kind: 'movie', slug, lat: l.lat, lng: l.lng });
}

/** Normal Mode: travel to a saved diary place. */
export function travelToPlace(id: string, mode: 'fly' | 'walk'): void {
  const p = useAppStore.getState().places.find((x) => x.id === id);
  if (p) start({ mode, kind: 'place', slug: id, lat: p.lat, lng: p.lng });
}

/** Normal Mode: arriving at a planned place logs it in the travel diary. */
export function handlePlaceArrival(id: string): void {
  const s = useAppStore.getState();
  const p = s.places.find((x) => x.id === id);
  if (!p) return;
  if (p.status !== 'visited') {
    s.updatePlace(id, { status: 'visited', visitedAt: Date.now() });
    s.toast({ kind: 'stamp', title: 'Added to your travel diary', body: `You arrived at ${p.name}` });
    playSfx('stamp');
    track('place_visit');
  } else if (s.travel?.slug === id) playSfx('land');
  if (s.travel?.slug === id) s.startTravel(null);
}

/** Movie Mode: called whenever the character comes within ARRIVAL_KM of a film location. */
export function handleArrival(slug: string): void {
  const s = useAppStore.getState();
  const l = LOCATION_BY_SLUG[slug];
  if (!l) return;
  const isNew = s.markVisited(slug);
  if (isNew) {
    s.toast({ kind: 'stamp', title: `Passport stamp earned!`, body: `${l.place} · ${l.movie}` });
    playSfx('stamp');
    track('visit', { slug });
  }
  if (s.travel?.slug === slug) {
    s.startTravel(null);
    if (!isNew) playSfx('land');
  }
  const tour = s.tour;
  if (tour) {
    const t = TOURS.find((x) => x.id === tour.id);
    if (t && t.stops[tour.index] === slug) s.setTour({ ...tour, awaitingNext: true });
  }
}

export function startTour(id: string): void {
  const t = TOURS.find((x) => x.id === id);
  if (!t) return;
  useAppStore.getState().setTour({ id, index: 0, awaitingNext: false });
  flyTo(t.stops[0]);
  track('tour_start', { id });
}

export function nextTourStop(): void {
  const s = useAppStore.getState();
  const tour = s.tour;
  if (!tour) return;
  const t = TOURS.find((x) => x.id === tour.id);
  if (!t) return;
  const next = tour.index + 1;
  if (next >= t.stops.length) {
    s.setTour(null);
    s.toast({ kind: 'info', title: 'Tour complete! 🎬', body: `You finished “${t.name}”.` });
    playSfx('stamp');
    track('tour_complete', { id: t.id });
    return;
  }
  s.setTour({ id: tour.id, index: next, awaitingNext: false });
  flyTo(t.stops[next]);
}
