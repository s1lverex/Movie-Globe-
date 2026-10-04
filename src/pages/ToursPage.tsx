import { Play, Square } from 'lucide-react';
import { LOCATION_BY_SLUG, TOURS, thumbFor } from '../data';
import { navigate } from '../lib/nav';
import { startTour } from '../scene/travel';
import { useAppStore } from '../store/useAppStore';
import { Overlay } from '../ui/Overlay';

export default function ToursPage() {
  const tour = useAppStore((s) => s.tour);
  const setTour = useAppStore((s) => s.setTour);
  const visited = useAppStore((s) => s.visited);
  return (
    <Overlay title="Movie Tours">
      <p className="mb-4 text-sm text-slate-400">
        Guided multi-stop routes. Your explorer flies to each stop automatically with a narration card on
        arrival.
      </p>
      <ul className="space-y-3">
        {TOURS.map((t) => {
          const active = tour?.id === t.id;
          const done = t.stops.filter((s) => visited[s]).length;
          return (
            <li
              key={t.id}
              className={`rounded-3xl border p-4 ${active ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/[.03]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{t.name}</h3>
                  <p className="text-xs text-slate-400">{t.tagline}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                  {done}/{t.stops.length}
                </span>
              </div>
              <div className="mt-3 flex -space-x-2">
                {t.stops.map((s) => (
                  <img
                    key={s}
                    src={thumbFor(LOCATION_BY_SLUG[s])}
                    alt={LOCATION_BY_SLUG[s].place}
                    title={LOCATION_BY_SLUG[s].place}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-[#0E1626]"
                    loading="lazy"
                  />
                ))}
              </div>
              <ol className="mt-3 space-y-0.5 text-xs text-slate-300">
                {t.stops.map((s, i) => (
                  <li key={s}>
                    <span className={active && tour!.index === i ? 'font-semibold text-[#9CC2FF]' : ''}>
                      {i + 1}. {LOCATION_BY_SLUG[s].place} —{' '}
                      <span className="text-slate-400">{LOCATION_BY_SLUG[s].movie}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {active ? (
                <button type="button" className="btn-ghost mt-3 w-full text-sm" onClick={() => setTour(null)}>
                  <Square size={14} /> Stop tour
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary mt-3 w-full py-2.5 text-sm"
                  data-testid={`start-${t.id}`}
                  onClick={() => {
                    startTour(t.id);
                    navigate('/');
                  }}
                >
                  <Play size={14} /> Start tour
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Overlay>
  );
}
