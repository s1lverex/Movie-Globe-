import type { FilmLocation } from '../types';
import type { Filters } from './useAppStore';

export function matchesFilters(l: FilmLocation, f: Filters): boolean {
  if (f.genre && !l.genres.includes(f.genre)) return false;
  if (f.decade && l.decade !== f.decade) return false;
  if (f.country && l.country !== f.country) return false;
  const q = f.query.trim().toLowerCase();
  if (q) {
    const hay = `${l.movie} ${l.place} ${l.city} ${l.country} ${l.genres.join(' ')}`.toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
