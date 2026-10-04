import { useEffect } from 'react';
import { useAppStore, type AppMode } from '../store/useAppStore';

/** The app is "Travel Globe"; it becomes "Movie Globe" only while in Movie Mode. */
export const BRAND: Record<AppMode, { name: string; tagline: string }> = {
  normal: { name: 'Travel Globe', tagline: 'Walk the World. Plan Your Journey.' },
  movie: { name: 'Movie Globe', tagline: 'Walk the World. See the Movies.' },
};

export function useBrand() {
  return BRAND[useAppStore((s) => s.appMode)];
}

/** Keeps the browser tab title in sync with the current mode's brand. */
export function useDocumentTitle(): void {
  const { name, tagline } = useBrand();
  useEffect(() => {
    document.title = `${name} — ${tagline}`;
  }, [name, tagline]);
}
