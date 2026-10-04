import { Heart } from 'lucide-react';
import type { FilmLocation } from '../types';
import { thumbFor } from '../data';
import { openLocation } from '../lib/nav';
import { useAppStore } from '../store/useAppStore';

export function LocationList({ items, onPick }: { items: FilmLocation[]; onPick?: () => void }) {
  const visited = useAppStore((s) => s.visited);
  const saved = useAppStore((s) => s.saved);
  return (
    <ul className="space-y-2">
      {items.map((l) => (
        <li key={l.slug}>
          <button
            type="button"
            onClick={() => {
              onPick?.();
              openLocation(l.slug);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[.03] p-2 text-left transition hover:border-accent/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
          >
            <img
              src={thumbFor(l)}
              alt=""
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{l.movie}</div>
              <div className="truncate text-xs text-slate-400">
                {l.place} · {l.country}
              </div>
              <div className="mt-1 flex gap-1.5 text-[10px]">
                <span
                  className="rounded-full px-2 py-0.5 text-white/90"
                  style={{ background: `${l.pinColor}33` }}
                >
                  {l.genres[0]}
                </span>
                {visited[l.slug] && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Visited</span>
                )}
              </div>
            </div>
            {saved.includes(l.slug) && (
              <Heart size={16} className="shrink-0 fill-rose-500 text-rose-500" aria-label="Saved" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
