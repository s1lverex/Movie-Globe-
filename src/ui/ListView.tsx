import { useMemo } from 'react';
import { LOCATIONS } from '../data';
import { matchesFilters } from '../store/filters';
import { useAppStore } from '../store/useAppStore';
import { LocationList } from './LocationList';
import { Overlay } from './Overlay';
import { FilterSelects } from './SearchBar';

/** Non-3D accessible list of every location; also the mobile "Explore" browser. */
export function ListView() {
  const open = useAppStore((s) => s.listView);
  const setOpen = useAppStore((s) => s.setListView);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const items = useMemo(() => LOCATIONS.filter((l) => matchesFilters(l, filters)), [filters]);
  if (!open) return null;
  return (
    <Overlay title="Explore locations" onClose={() => setOpen(false)}>
      <div className="sticky top-0 z-10 space-y-2 bg-[#0E1626]/95 pb-3">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
          placeholder="Search movies, places, countries…"
          aria-label="Search film locations"
          className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
        />
        <FilterSelects />
        <div className="text-xs text-slate-400" aria-live="polite">
          {items.length} of {LOCATIONS.length} locations
        </div>
      </div>
      <LocationList items={items} onPick={() => setOpen(false)} />
    </Overlay>
  );
}
