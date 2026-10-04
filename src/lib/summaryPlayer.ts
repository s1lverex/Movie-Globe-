import { create } from 'zustand';
import { LOCATION_BY_SLUG } from '../data';
import { useAppStore } from '../store/useAppStore';
import { loadOceanMask } from './oceanMask';
import {
  buildLegs,
  buildStops,
  summaryStats,
  type SummaryLeg,
  type SummaryStats,
  type SummaryStop,
} from './summary';

/**
 * Travel Summary playback state, shared by the 3D layer (route + vehicle) and
 * the overlay UI (cards, timeline, controls).
 *
 * Timeline: stop 0 pops up → leg 0 animates → stop 1 pops up → … → finale.
 * `step` is the index of the stop being shown; `phase` says whether we are
 * travelling towards it or dwelling on it.
 */
export type Phase = 'travel' | 'dwell' | 'finale';
export type SummaryFilter = 'all' | 'trip' | 'film';

interface SummaryState {
  open: boolean;
  ready: boolean;
  filter: SummaryFilter;
  stops: SummaryStop[];
  legs: SummaryLeg[];
  stats: SummaryStats | null;
  step: number;
  phase: Phase;
  /** 0→1 progress of the current leg while travelling. */
  t: number;
  playing: boolean;
  speed: number;
}

export const useSummary = create<SummaryState>(() => ({
  open: false,
  ready: false,
  filter: 'all',
  stops: [],
  legs: [],
  stats: null,
  step: 0,
  phase: 'dwell',
  t: 0,
  playing: true,
  speed: 1,
}));

export const DWELL_S = 2.2;
export const legDuration = (leg: SummaryLeg) => Math.min(4.2, 1.8 + leg.km / 6000);

export async function openSummary(filter: SummaryFilter = useSummary.getState().filter): Promise<void> {
  const s = useAppStore.getState();
  // Stop any in-app travel so the replay owns the camera.
  if (s.travel) s.startTravel(null);
  s.setWalkTarget(null);
  s.setTour(null);
  if (s.cameraMode !== 'orbit') s.setCameraMode('orbit');
  useSummary.setState({ open: true, ready: false, filter });
  const all = buildStops(s.places, s.visited, LOCATION_BY_SLUG);
  const stops = filter === 'all' ? all : all.filter((x) => x.kind === filter);
  const legs = buildLegs(stops, await loadOceanMask());
  dwellLeft = DWELL_S;
  useSummary.setState({
    ready: true,
    stops,
    legs,
    stats: summaryStats(stops, legs),
    step: 0,
    phase: 'dwell',
    t: 0,
    playing: true,
  });
  focusStop(stops[0]);
}

export function closeSummary(): void {
  useSummary.setState({ open: false, ready: false, stops: [], legs: [], stats: null, step: 0, t: 0 });
}

export function focusStop(stop: SummaryStop | undefined, distance = 2.3): void {
  if (stop) useAppStore.getState().camera({ type: 'focus', lat: stop.lat - 4, lng: stop.lng, distance });
}

/** Jump to a stop (shown in dwell state). */
export function goToStop(i: number): void {
  const { stops } = useSummary.getState();
  const step = Math.max(0, Math.min(stops.length - 1, i));
  dwellLeft = DWELL_S;
  useSummary.setState({ step, phase: 'dwell', t: 0 });
  focusStop(stops[step]);
}

export function replay(): void {
  goToStop(0);
  useSummary.setState({ playing: true });
}

/** Advance the timeline by dt seconds (called every frame by the 3D layer). */
let dwellLeft = DWELL_S;
export function tickSummary(dt: number): void {
  const st = useSummary.getState();
  if (!st.open || !st.ready || !st.playing || st.phase === 'finale' || st.stops.length === 0) return;
  const d = dt * st.speed;
  if (st.phase === 'dwell') {
    dwellLeft -= d;
    if (dwellLeft > 0) return;
    dwellLeft = DWELL_S;
    if (st.step >= st.stops.length - 1) {
      useSummary.setState({ phase: 'finale' });
      useAppStore.getState().camera({ type: 'zoom', factor: 1.35 });
      return;
    }
    useSummary.setState({ phase: 'travel', step: st.step + 1, t: 0 });
    return;
  }
  const leg = st.legs[st.step - 1];
  const t = Math.min(1, st.t + d / legDuration(leg));
  if (t >= 1) {
    dwellLeft = DWELL_S;
    useSummary.setState({ t: 1, phase: 'dwell' });
  } else useSummary.setState({ t });
}

export function resetDwell(): void {
  dwellLeft = DWELL_S;
}
