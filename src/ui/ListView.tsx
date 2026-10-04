import { useMemo } from 'react';
import { LOCATIONS } from '../data';
import { matchesFilters } from '../store/filters';
import { useAppStore } from '../store/useAppStore';
import { LocationList } from './LocationList';
import { Overlay } from './Overlay';
import { FilterSelects } from './SearchBar';
import { PlaceSearch } from './PlaceSearch';
import { navigate } from '../lib/nav';

/** Non-3D accessible list of every location; also the mobile "Explore" browser. */
export function ListView() {
  const open = useAppStore((s) => s.listView);
  const setOpen = useAppStore((s) => s.setListView);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const mode = useAppStore((s) => s.appMode);
  const places = useAppStore((s) => s.places);
  const items = useMemo(() => LOCATIONS.filter((l) => matchesFilters(l, filters)), [filters]);
  if (!open) return null;
  if (mode === 'normal')
    return (
      <Overlay title="Plan a trip" onClose={() => setOpen(false)}>
        <PlaceSearch inline onPick={() => setOpen(false)} />
        <p className="mt-3 text-xs text-slate-400">…or close this and tap anywhere on the globe.</p>
        <h3 className="mt-5 mb-2 text-sm font-semibold text-white">My places ({places.length})</h3>
        {places.length === 0 ? (
          <p className="text-sm text-slate-400">No trips yet.</p>
        ) : (
          <ul className="space-y-2">
            {places.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/place/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[.03] p-3 text-left hover:bg-white/5"
                >
                  <span aria-hidden="true">{p.status === 'visited' ? '✅' : '🧳'}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                    <span className="block text-xs text-slate-400">
                      {p.status === 'visited' ? 'Visited' : p.date ? `Planned · ${p.date}` : 'Planned'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Overlay>
    );
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
