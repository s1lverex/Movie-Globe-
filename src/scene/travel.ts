import { LOCATION_BY_SLUG, TOURS } from '../data';
import { haversineKm, vector3ToLatLng } from '../lib/geo';
import { playSfx } from '../lib/sound';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';
import { runtime } from './runtime';

export const ARRIVAL_KM = 50;
export const WALK_MAX_KM = 2000;

export function distanceToKm(slug: string): number {
  const l = LOCATION_BY_SLUG[slug];
  if (!l) return Infinity;
  return haversineKm(vector3ToLatLng(runtime.pos), l);
}

export function flyTo(slug: string): void {
  const s = useAppStore.getState();
  s.startTravel({ mode: 'fly', slug });
  useAppStore.setState({ trackFlight: true });
  s.setCameraMode('orbit');
  playSfx('whoosh');
  track('fly', { slug });
}

export function walkTo(slug: string): void {
  const l = LOCATION_BY_SLUG[slug];
  if (!l) return;
  const s = useAppStore.getState();
  s.startTravel({ mode: 'walk', slug });
  s.setWalkTarget({ lat: l.lat, lng: l.lng });
  track('walk', { slug });
}

/** Called whenever the character comes within ARRIVAL_KM of a location. */
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
