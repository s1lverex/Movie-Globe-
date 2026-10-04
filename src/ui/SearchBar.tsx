import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { COUNTRIES, DECADES, GENRES, LOCATIONS, thumbFor } from '../data';
import { openLocation } from '../lib/nav';
import { matchesFilters } from '../store/filters';
import { useAppStore } from '../store/useAppStore';
import { PlaceSearch } from './PlaceSearch';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FilterSelects() {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const sel =
    'min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0B1220] px-2 py-2 text-xs text-slate-200 focus:border-accent focus:outline-none';
  return (
    <div className="flex gap-2">
      <select
        aria-label="Filter by genre"
        className={sel}
        value={filters.genre}
        onChange={(e) => setFilters({ genre: e.target.value })}
      >
        <option value="">All genres</option>
        {GENRES.map((g) => (
          <option key={g} value={g}>
            {cap(g)}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by decade"
        className={sel}
        value={filters.decade}
        onChange={(e) => setFilters({ decade: e.target.value })}
      >
        <option value="">All decades</option>
        {DECADES.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <select
        aria-label="Filter by country"
        className={sel}
        value={filters.country}
        onChange={(e) => setFilters({ country: e.target.value })}
      >
        <option value="">All countries</option>
        {COUNTRIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

export function SearchBar({ className = '' }: { className?: string }) {
  const mode = useAppStore((s) => s.appMode);
  return mode === 'movie' ? <MovieSearch className={className} /> : <PlaceSearch className={className} />;
}

function MovieSearch({ className = '' }: { className?: string }) {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const reset = useAppStore((s) => s.resetFilters);
  const [focused, setFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const results = useMemo(() => LOCATIONS.filter((l) => matchesFilters(l, filters)), [filters]);
  const active = !!(filters.query || filters.genre || filters.decade || filters.country);

  return (
    <div className={`pointer-events-auto relative ${className}`} data-tour="search">
      <div className="glass flex items-center gap-2 rounded-2xl px-3 py-1.5 shadow-lg shadow-black/30">
        <Search size={16} className="text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              openLocation(results[0].slug);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Search movies, places, countries…"
          aria-label="Search film locations"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
        {active && (
          <span
            className="rounded-full bg-accent/25 px-2 py-0.5 text-[11px] font-semibold text-[#9CC2FF]"
            aria-live="polite"
          >
            {results.length}
          </span>
        )}
        {active && (
          <button
            type="button"
            aria-label="Clear search and filters"
            onClick={reset}
            className="rounded-full p-1 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          aria-label="Filters"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
          className={`rounded-xl p-1.5 transition ${showFilters || filters.genre || filters.decade || filters.country ? 'bg-accent text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
      {showFilters && (
        <div className="glass animate-slide-up mt-2 rounded-2xl p-2">
          <FilterSelects />
        </div>
      )}
      {focused && filters.query && (
        <ul
          className="glass no-scrollbar absolute inset-x-0 mt-2 max-h-72 overflow-y-auto rounded-2xl p-1 shadow-xl"
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-400">No matching locations</li>
          )}
          {results.map((l) => (
            <li key={l.slug}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openLocation(l.slug)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
              >
                <img src={thumbFor(l)} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{l.movie}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {l.place} · {l.country}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
