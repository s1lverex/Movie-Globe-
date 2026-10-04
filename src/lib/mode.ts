import { useEffect } from 'react';
import { useAppStore, type AppMode } from '../store/useAppStore';
import { track } from './analytics';
import { navigate } from './nav';

const MODE_ROUTES: Record<AppMode, RegExp> = {
  movie: /^\/(location|saved|tours|passport)(\/|$)/,
  normal: /^\/(place|trips)(\/|$)/,
};

/**
 * Switches between Normal Mode (free travel planner + diary) and Movie Mode
 * (film locations). Clears mode-specific selection, tours and filters, and
 * leaves pages that belong to the other mode.
 */
export function switchMode(mode: AppMode, opts: { silent?: boolean; keepRoute?: boolean } = {}): void {
  const s = useAppStore.getState();
  if (s.appMode === mode) return;
  if (s.travel) s.startTravel(null);
  s.setWalkTarget(null);
  s.setTour(null);
  s.resetFilters();
  s.select(null);
  s.selectPlace(null);
  s.setDraftPlace(null);
  s.setListView(false);
  s.setAppMode(mode);
  const other: AppMode = mode === 'movie' ? 'normal' : 'movie';
  if (!opts.keepRoute && MODE_ROUTES[other].test(window.location.pathname)) navigate('/');
  if (!opts.silent)
    s.toast({
      title: mode === 'movie' ? 'Movie Mode' : 'Normal Mode',
      body:
        mode === 'movie'
          ? 'Explore and travel to film locations.'
          : 'Tap anywhere on the globe to plan a trip.',
    });
  track('mode', { mode });
}

/** Pages that only make sense in one mode switch to it on mount (deep links). */
export function useEnsureMode(mode: AppMode): void {
  useEffect(() => {
    switchMode(mode, { silent: true, keepRoute: true });
  }, [mode]);
}
