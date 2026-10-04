import { BedDouble, Car, ExternalLink, FerrisWheel, Plane, Plus, X } from 'lucide-react';
import type { FilmLocation } from '../types';
import { TRIP_SECTIONS, tripLink, type TripSection } from '../lib/tripLinks';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';

const ICONS: Record<Exclude<TripSection, 'home'>, typeof Plane> = {
  flights: Plane,
  hotels: BedDouble,
  attractions: FerrisWheel,
  cars: Car,
};

export function TripWordmark({ className = '' }: { className?: string }) {
  // Plain text label (not the Trip.com logo artwork).
  return <span className={`font-display font-bold tracking-tight ${className}`}>Trip.com</span>;
}

function useOpenToast() {
  const toast = useAppStore((s) => s.toast);
  return (section: TripSection, slug: string) => {
    toast({ kind: 'trip', title: 'Opening Trip.com…', body: 'Your booking opens in a new tab.' });
    track('trip_click', { section, slug });
  };
}

export function TripLink({
  loc,
  section,
  className,
  children,
  ...rest
}: {
  loc: FilmLocation;
  section: TripSection;
  className?: string;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const onOpen = useOpenToast();
  return (
    <a
      {...rest}
      href={tripLink(loc, section)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => onOpen(section, loc.slug)}
    >
      {children}
    </a>
  );
}

/** Desktop card / mobile inline: "Travel to this location" + Trip.com section grid. */
export function TripPanel({ loc }: { loc: FilmLocation }) {
  return (
    <section aria-labelledby="trip-heading" className="glass rounded-3xl p-5">
      <h3 id="trip-heading" className="sr-only">
        Travel to this location
      </h3>
      <TripLink
        loc={loc}
        section="home"
        className="btn-primary w-full px-3 text-sm whitespace-nowrap"
        data-testid="travel-cta"
      >
        <Plus size={18} aria-hidden="true" /> Travel to this location
      </TripLink>
      <p className="mt-4 text-center text-sm text-slate-300">Book your trip on Trip.com</p>
      <div className="mt-1 text-center">
        <TripWordmark className="text-2xl text-white" />
      </div>
      <div className="my-4 h-px bg-white/10" />
      <ul className="grid grid-cols-3 gap-2">
        {TRIP_SECTIONS.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <li key={id}>
              <TripLink
                loc={loc}
                section={id}
                className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] whitespace-nowrap text-slate-300 transition hover:bg-white/5 hover:text-white"
                data-testid={`trip-${id}`}
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </TripLink>
            </li>
          );
        })}
      </ul>
      <TripLink
        loc={loc}
        section="home"
        className="btn-ghost mt-4 w-full rounded-full border-accent/40 bg-accent/10 text-sm text-[#9CC2FF]"
      >
        View on Trip.com <ExternalLink size={14} aria-hidden="true" />
      </TripLink>
    </section>
  );
}

/** Mobile white sheet matching the "Travel Journey" mockup. */
export function TripSheet({ loc, onClose }: { loc: FilmLocation; onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[70] flex items-end bg-black/40 p-3 lg:items-center lg:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-sheet-title"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-md rounded-3xl bg-white p-4 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <TripWordmark className="text-lg text-[#2F6BFF]" />
            <p id="trip-sheet-title" className="text-sm text-slate-600">
              Open in Trip.com to book your trip to {loc.city.split(',')[0]}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="mt-3 grid grid-cols-4 divide-x divide-slate-200">
          {TRIP_SECTIONS.map(({ id, label }) => {
            const Icon = ICONS[id];
            return (
              <li key={id}>
                <TripLink
                  loc={loc}
                  section={id}
                  className="flex flex-col items-center gap-1 py-2 text-[11px] text-slate-500 hover:text-[#2F6BFF]"
                >
                  <Icon size={20} className="text-[#2F6BFF]" aria-hidden="true" />
                  {label}
                </TripLink>
              </li>
            );
          })}
        </ul>
        <TripLink loc={loc} section="home" className="btn-primary mt-3 w-full rounded-full">
          Go to Trip.com <ExternalLink size={16} aria-hidden="true" />
        </TripLink>
      </div>
    </div>
  );
}
