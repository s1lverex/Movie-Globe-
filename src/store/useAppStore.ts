import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng } from '../types';
import type { Transport } from '../lib/summary';
import { DEFAULT_CHARACTER, isValidCharacter, type CharacterConfig } from './character';

export type CameraMode = 'orbit' | 'follow';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  kind?: 'info' | 'stamp' | 'trip';
}

export type AppMode = 'normal' | 'movie';

export interface Travel {
  mode: 'fly' | 'walk';
  /** 'movie' → slug is a film location slug; 'place' → slug is a diary place id. */
  kind: 'movie' | 'place';
  slug: string;
  lat: number;
  lng: number;
}

/** A user-picked place in Normal Mode: planned trip or travel-diary entry. */
export interface DiaryPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'planned' | 'visited';
  createdAt: number;
  /** Planned trip date (YYYY-MM-DD), optional. */
  date: string;
  notes: string;
  visitedAt?: number;
  /** How the user travelled there (unset = inferred in the Travel Summary). */
  transport?: Transport;
}

export interface DraftPlace {
  lat: number;
  lng: number;
  name: string;
  resolving: boolean;
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
  appMode: AppMode;
  places: DiaryPlace[];

  // session
  selectedPlaceId: string | null;
  draftPlace: DraftPlace | null;
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

  setAppMode: (m: AppMode) => void;
  addPlace: (p: Omit<DiaryPlace, 'id' | 'createdAt'>) => DiaryPlace;
  updatePlace: (id: string, patch: Partial<DiaryPlace>) => void;
  removePlace: (id: string) => void;
  selectPlace: (id: string | null) => void;
  setDraftPlace: (d: DraftPlace | null) => void;
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
      appMode: 'normal',
      places: [],
      selectedPlaceId: null,
      draftPlace: null,

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

      setAppMode: (m) => set({ appMode: m }),
      addPlace: (p) => {
        const place: DiaryPlace = {
          ...p,
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: Date.now(),
        };
        set((s) => ({ places: [...s.places, place] }));
        return place;
      },
      updatePlace: (id, patch) =>
        set((s) => ({ places: s.places.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removePlace: (id) =>
        set((s) => ({
          places: s.places.filter((x) => x.id !== id),
          selectedPlaceId: s.selectedPlaceId === id ? null : s.selectedPlaceId,
        })),
      selectPlace: (id) => set({ selectedPlaceId: id }),
      setDraftPlace: (d) => set({ draftPlace: d }),
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
      version: 2,
      // v1 → v2 only added fields; merge() below fills in defaults.
      migrate: (persisted) => persisted as AppState,
      partialize: (s) => ({
        character: s.character,
        visited: s.visited,
        saved: s.saved,
        position: s.position,
        muted: s.muted,
        lowPower: s.lowPower,
        onboardingDone: s.onboardingDone,
        appMode: s.appMode,
        places: s.places,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          character: p.character && isValidCharacter(p.character) ? p.character : current.character,
          appMode: p.appMode === 'movie' ? 'movie' : 'normal',
          places: Array.isArray(p.places) ? p.places : [],
        };
      },
    },
  ),
);

export const useLowPower = () => useAppStore((s) => (s.lowPower === null ? s.autoLowPower : s.lowPower));
