import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { searchPlaces, type GeoResult } from '../lib/geocode';
import { navigate } from '../lib/nav';
import { pickPoint } from '../lib/places';
import { useAppStore } from '../store/useAppStore';

/** Normal Mode search: any place on Earth (OpenStreetMap) plus your saved trips. */
export function PlaceSearch({
  className = '',
  onPick,
  inline = false,
}: {
  className?: string;
  onPick?: () => void;
  inline?: boolean;
}) {
  const places = useAppStore((s) => s.places);
  const camera = useAppStore((s) => s.camera);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const needle = q.trim().toLowerCase();
  const saved = needle ? places.filter((p) => `${p.name} ${p.notes}`.toLowerCase().includes(needle)) : [];

  const run = async () => {
    if (needle.length < 2) return;
    setLoading(true);
    setResults(await searchPlaces(q));
    setLoading(false);
  };
  const pick = (r: GeoResult) => {
    pickPoint(r.lat, r.lng, r.name);
    camera({ type: 'focus', lat: r.lat, lng: r.lng });
    setResults(null);
    setQ('');
    onPick?.();
  };
  const open = (results !== null || saved.length > 0) && needle.length > 0;

  return (
    <div className={`pointer-events-auto relative ${className}`} data-tour="search">
      <form
        className="glass flex items-center gap-2 rounded-2xl px-3 py-1.5 shadow-lg shadow-black/30"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        role="search"
      >
        <Search size={16} className="text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setResults(null);
          }}
          placeholder="Search any city or place to plan a trip…"
          aria-label="Search any place"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          data-testid="place-search"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          disabled={needle.length < 2 || loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
        </button>
      </form>
      {open && (
        <ul
          className={`glass no-scrollbar mt-2 max-h-72 overflow-y-auto rounded-2xl p-1 shadow-xl ${inline ? '' : 'absolute inset-x-0'}`}
          aria-label="Place results"
        >
          {saved.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  navigate(`/place/${p.id}`);
                  onPick?.();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5"
              >
                <span aria-hidden="true">{p.status === 'visited' ? '✅' : '🧳'}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{p.name}</span>
                  <span className="block text-[11px] text-slate-400">
                    In your {p.status === 'visited' ? 'diary' : 'planner'}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {results?.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5"
                data-testid="place-result"
              >
                <span aria-hidden="true">📍</span>
                <span className="truncate text-sm text-white">{r.name}</span>
              </button>
            </li>
          ))}
          {results && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">
              No places found (or you're offline). Tap the globe instead.
            </li>
          )}
          {results === null && (
            <li className="px-3 py-2 text-xs text-slate-400">Press Enter to search the world.</li>
          )}
          <li className="px-3 pt-1 pb-1.5 text-[10px] text-slate-500">Search © OpenStreetMap contributors</li>
        </ul>
      )}
    </div>
  );
}
