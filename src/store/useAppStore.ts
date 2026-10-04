import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng } from '../types';
import { DEFAULT_CHARACTER, isValidCharacter, type CharacterConfig } from './character';

export type CameraMode = 'orbit' | 'follow';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  kind?: 'info' | 'stamp' | 'trip';
}

export interface Travel {
  mode: 'fly' | 'walk';
  slug: string;
}

export interface Filters {
  query: string;
  genre: string;
  decade: string;
  country: string;
}

export type CameraCommand =
  | { type: 'zoom'; factor: number }
  | { type: 'locate' }
  | { type: 'focus'; lat: number; lng: number; distance?: number };

interface AppState {
  // persisted
  character: CharacterConfig;
  visited: Record<string, number>;
  saved: string[];
  position: LatLng;
  muted: boolean;
  lowPower: boolean | null; // null = auto
  onboardingDone: boolean;

  // session
  selectedSlug: string | null;
  hoveredSlug: string | null;
  travel: Travel | null;
  walkTarget: LatLng | null;
  cameraMode: CameraMode;
  cameraCommand: (CameraCommand & { nonce: number }) | null;
  filters: Filters;
  tour: { id: string; index: number; awaitingNext: boolean } | null;
  toasts: Toast[];
  autoLowPower: boolean;
  listView: boolean;
  trackFlight: boolean;

  setCharacter: (c: Partial<CharacterConfig>) => void;
  replaceCharacter: (c: CharacterConfig) => void;
  markVisited: (slug: string) => boolean;
  toggleSaved: (slug: string) => void;
  setPosition: (p: LatLng) => void;
  select: (slug: string | null) => void;
  hover: (slug: string | null) => void;
  startTravel: (t: Travel | null) => void;
  setWalkTarget: (p: LatLng | null) => void;
  setCameraMode: (m: CameraMode) => void;
  camera: (c: CameraCommand) => void;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  setTour: (t: AppState['tour']) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setMuted: (m: boolean) => void;
  setLowPower: (v: boolean | null) => void;
  setAutoLowPower: (v: boolean) => void;
  setOnboardingDone: () => void;
  setListView: (v: boolean) => void;
}

let toastId = 1;
let nonce = 1;

export const EMPTY_FILTERS: Filters = { query: '', genre: '', decade: '', country: '' };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      character: DEFAULT_CHARACTER,
      visited: {},
      saved: [],
      position: { lat: 51.5, lng: -0.12 },
      muted: true,
      lowPower: null,
      onboardingDone: false,

      selectedSlug: null,
      hoveredSlug: null,
      travel: null,
      walkTarget: null,
      cameraMode: 'orbit',
      cameraCommand: null,
      filters: EMPTY_FILTERS,
      tour: null,
      toasts: [],
      autoLowPower: false,
      listView: false,
      trackFlight: true,

      setCharacter: (c) => set((s) => ({ character: { ...s.character, ...c } })),
      replaceCharacter: (c) => set({ character: c }),
      markVisited: (slug) => {
        if (get().visited[slug]) return false;
        set((s) => ({ visited: { ...s.visited, [slug]: Date.now() } }));
        return true;
      },
      toggleSaved: (slug) =>
        set((s) => ({
          saved: s.saved.includes(slug) ? s.saved.filter((x) => x !== slug) : [...s.saved, slug],
        })),
      setPosition: (p) => set({ position: p }),
      select: (slug) => set({ selectedSlug: slug }),
      hover: (slug) => set({ hoveredSlug: slug }),
      startTravel: (t) => set({ travel: t, walkTarget: null }),
      setWalkTarget: (p) => set({ walkTarget: p }),
      setCameraMode: (m) => set({ cameraMode: m }),
      camera: (c) => set({ cameraCommand: { ...c, nonce: nonce++ } }),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      setTour: (t) => set({ tour: t }),
      toast: (t) => {
        const id = toastId++;
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), t.kind === 'stamp' ? 5000 : 3200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      setMuted: (m) => set({ muted: m }),
      setLowPower: (v) => set({ lowPower: v }),
      setAutoLowPower: (v) => set({ autoLowPower: v }),
      setOnboardingDone: () => set({ onboardingDone: true }),
      setListView: (v) => set({ listView: v }),
    }),
    {
      name: 'movie-globe',
      version: 1,
      partialize: (s) => ({
        character: s.character,
        visited: s.visited,
        saved: s.saved,
        position: s.position,
        muted: s.muted,
        lowPower: s.lowPower,
        onboardingDone: s.onboardingDone,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          character: p.character && isValidCharacter(p.character) ? p.character : current.character,
        };
      },
    },
  ),
);

export const useLowPower = () => useAppStore((s) => (s.lowPower === null ? s.autoLowPower : s.lowPower));
