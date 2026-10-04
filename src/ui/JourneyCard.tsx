import { ArrowRight } from 'lucide-react';
import { LOCATION_BY_SLUG, TOURS, thumbFor } from '../data';
import { openLocation } from '../lib/nav';
import { nextTourStop } from '../scene/travel';
import { useAppStore } from '../store/useAppStore';

/** "Your next adventure" card shown during a flight, and tour narration cards on arrival. */
export function JourneyCard({ hideFor }: { hideFor?: string | null }) {
  const travel = useAppStore((s) => s.travel);
  const tour = useAppStore((s) => s.tour);
  const setTour = useAppStore((s) => s.setTour);
  const t = tour ? TOURS.find((x) => x.id === tour.id) : null;

  if (tour && t && tour.awaitingNext) {
    const loc = LOCATION_BY_SLUG[t.stops[tour.index]];
    const last = tour.index === t.stops.length - 1;
    return (
      <div
        className="glass animate-slide-up pointer-events-auto w-full max-w-md rounded-3xl p-4 shadow-2xl"
        role="status"
        aria-live="polite"
        data-testid="tour-card"
      >
        <div className="text-[11px] font-semibold tracking-wide text-[#9CC2FF] uppercase">
          {t.name} · Stop {tour.index + 1} of {t.stops.length}
        </div>
        <div className="mt-1 font-display text-lg font-bold text-white">{loc.place}</div>
        <p className="mt-1 text-sm text-slate-300">{loc.description}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-ghost flex-1 text-sm" onClick={() => openLocation(loc.slug)}>
            Details
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2.5 text-sm"
            onClick={nextTourStop}
            data-testid="tour-next"
          >
            {last ? 'Finish tour' : 'Next stop'} <ArrowRight size={16} />
          </button>
        </div>
        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-slate-400 hover:text-white"
          onClick={() => setTour(null)}
        >
          End tour
        </button>
      </div>
    );
  }

  if (travel?.mode !== 'fly' || (hideFor && hideFor === travel.slug)) return null;
  const loc = LOCATION_BY_SLUG[travel.slug];
  if (!loc) return null;
  return (
    <div
      className="glass animate-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-3xl p-3 shadow-2xl"
      role="status"
      aria-live="polite"
      data-testid="journey-card"
    >
      <img src={thumbFor(loc)} alt="" className="h-16 w-20 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-400">
          {t ? `${t.name} · Stop ${tour!.index + 1}/${t.stops.length}` : 'Your next adventure'}
        </div>
        <div className="truncate text-sm font-semibold text-white">
          {loc.place} ({loc.country})
        </div>
        <div className="truncate text-xs text-slate-300">{loc.movie}</div>
        <button
          type="button"
          onClick={() => openLocation(loc.slug)}
          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-medium text-[#9CC2FF] hover:bg-accent/30"
        >
          View details <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
