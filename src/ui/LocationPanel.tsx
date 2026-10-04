import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Footprints,
  Heart,
  Lightbulb,
  MapPin,
  Share2,
  Wind,
} from 'lucide-react';
import type { FilmLocation } from '../types';
import { formatKm } from '../lib/geo';
import { navigate } from '../lib/nav';
import { distanceToKm, flyTo, walkTo, WALK_MAX_KM } from '../scene/travel';
import { useAppStore } from '../store/useAppStore';
import { TripPanel, TripSheet, TripWordmark } from './TripPanel';
import { shareLocation } from './share';

function useDistance(slug: string) {
  const position = useAppStore((s) => s.position);
  const travel = useAppStore((s) => s.travel);
  const [km, setKm] = useState(() => distanceToKm(slug));
  useEffect(() => {
    setKm(distanceToKm(slug));
    const id = setInterval(() => setKm(distanceToKm(slug)), 1000);
    return () => clearInterval(id);
  }, [slug, position, travel]);
  return km;
}

function Hero({
  loc,
  idx,
  onBack,
  compact,
}: {
  loc: FilmLocation;
  idx: number;
  onBack: () => void;
  compact?: boolean;
}) {
  const saved = useAppStore((s) => s.saved.includes(loc.slug));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const photo = loc.photos[idx];
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${compact ? 'h-52 rounded-t-3xl' : 'h-64 rounded-3xl'} bg-slate-800`}
    >
      {photo && (
        <img src={photo.src} alt={`${loc.place}, ${loc.country}`} className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-transparent to-black/30" />
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
        aria-label="Back to globe"
      >
        <ArrowLeft size={16} /> {!compact && 'Back to Globe'}
      </button>
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={() => void shareLocation(loc)}
          aria-label="Share location"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        >
          <Share2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => toggleSaved(loc.slug)}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved' : 'Save location'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        >
          <Heart size={16} className={saved ? 'fill-rose-500 text-rose-500' : ''} />
        </button>
      </div>
      {photo && (
        <a
          href={photo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 bottom-2 max-w-[70%] truncate text-[10px] text-white/70 hover:text-white"
          title={`${photo.credit} — ${photo.license}`}
        >
          📷 {photo.credit.split(' via ')[0]} · {photo.license}
        </a>
      )}
    </div>
  );
}

function Carousel({ loc, idx, setIdx }: { loc: FilmLocation; idx: number; setIdx: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  if (loc.photos.length < 2) return null;
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Photos">
        {loc.photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            role="tab"
            aria-selected={i === idx}
            aria-label={`Photo ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === idx ? 'ring-accent' : 'ring-transparent opacity-80 hover:opacity-100'}`}
          >
            <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          aria-label="Previous photo"
          className="icon-btn h-8 w-8"
          onClick={() => setIdx((idx - 1 + loc.photos.length) % loc.photos.length)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          className="icon-btn h-8 w-8"
          onClick={() => setIdx((idx + 1) % loc.photos.length)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function TravelButtons({ loc }: { loc: FilmLocation }) {
  const km = useDistance(loc.slug);
  const travel = useAppStore((s) => s.travel);
  const here = km < 50;
  const busy = travel?.mode === 'fly';
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">
        {here ? '📍 You are here!' : `${formatKm(km)} from your explorer`}
      </div>
      {!here && (
        <div className="flex gap-2">
          {km < WALK_MAX_KM && (
            <button
              type="button"
              className="btn-ghost flex-1 px-2 text-sm whitespace-nowrap"
              disabled={busy}
              onClick={() => walkTo(loc.slug)}
              data-testid="walk-there"
            >
              <Footprints size={16} /> Walk there
            </button>
          )}
          <button
            type="button"
            className="btn-ghost flex-1 border-accent/40 bg-accent/15 px-2 text-sm whitespace-nowrap"
            disabled={busy}
            onClick={() => flyTo(loc.slug)}
            data-testid="fly-there"
          >
            <Wind size={16} /> Fly there
          </button>
        </div>
      )}
    </div>
  );
}

function Details({ loc }: { loc: FilmLocation }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <MapPin
          size={26}
          className="mt-1 shrink-0"
          style={{ color: loc.pinColor, fill: `${loc.pinColor}55` }}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-display text-2xl leading-tight font-bold text-white" id="location-title">
            {loc.movie}
          </h2>
          <p className="text-sm text-slate-300">
            {loc.place} ({loc.country})
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{loc.description}</p>
      <dl className="space-y-3 text-sm">
        <div className="flex gap-3">
          <Clapperboard size={20} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <dt className="text-xs text-slate-400">Movie</dt>
            <dd className="text-slate-100">
              {loc.movie} ({loc.years})
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin size={20} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <dt className="text-xs text-slate-400">Filming Location</dt>
            <dd className="text-slate-100">
              {loc.place}, {loc.city}, {loc.country}
            </dd>
          </div>
        </div>
      </dl>
      <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
        <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
        <p>
          <span className="font-semibold">Fun fact: </span>
          {loc.funFact}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {loc.genres.map((g) => (
          <span key={g} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 capitalize">
            {g}
          </span>
        ))}
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">{loc.decade}</span>
      </div>
    </>
  );
}

export function LocationPanel({ loc, desktop }: { loc: FilmLocation; desktop: boolean }) {
  const [idx, setIdx] = useState(0);
  const [tripOpen, setTripOpen] = useState(false);
  const close = () => navigate('/');
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setIdx(0), [loc.slug]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.querySelectorAll('.overflow-y-auto').forEach((el) => (el.scrollTop = 0));
  }, [loc.slug]);

  if (desktop) {
    return (
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="location-title"
        className="pointer-events-auto absolute top-4 right-4 bottom-4 z-30 flex w-[420px] gap-4 outline-none xl:w-[min(760px,calc(100vw-300px))]"
        data-testid="location-panel"
      >
        <div className="glass animate-slide-up no-scrollbar flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-3xl p-3 pb-5">
          <Hero loc={loc} idx={idx} onBack={close} />
          <div className="space-y-4 px-2">
            <Details loc={loc} />
            <Carousel loc={loc} idx={idx} setIdx={setIdx} />
            <div className="space-y-4 xl:hidden">
              <TravelButtons loc={loc} />
              <TripPanel loc={loc} />
            </div>
          </div>
        </div>
        <div className="animate-slide-up no-scrollbar hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto xl:flex">
          <TripPanel loc={loc} />
          <div className="glass rounded-3xl p-4">
            <TravelButtons loc={loc} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <BottomSheet onClose={close} labelledBy="location-title">
        <Hero loc={loc} idx={idx} onBack={close} compact />
        <div className="space-y-4 px-4 pt-3 pb-6">
          <Details loc={loc} />
          <Carousel loc={loc} idx={idx} setIdx={setIdx} />
          <TravelButtons loc={loc} />
          <button
            type="button"
            className="btn-primary w-full rounded-full"
            onClick={() => setTripOpen(true)}
            data-testid="travel-cta"
          >
            Travel to this location <ExternalLink size={16} aria-hidden="true" />
          </button>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
            Book your trip on Trip.com <TripWordmark className="text-base text-white" />
          </p>
        </div>
      </BottomSheet>
      {tripOpen && <TripSheet loc={loc} onClose={() => setTripOpen(false)} />}
    </>
  );
}

/** Draggable mobile bottom sheet with two snap points; drag down to dismiss. */
export function BottomSheet({
  children,
  onClose,
  labelledBy,
  testId = 'location-panel',
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
  testId?: string;
}) {
  const [snap, setSnap] = useState<'half' | 'full'>('half');
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const baseVh = snap === 'full' ? 8 : 42;
  const onDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current !== null) setDrag(e.clientY - start.current);
  };
  const onUp = () => {
    if (start.current === null) return;
    if (drag < -60) setSnap('full');
    else if (drag > 120 && snap === 'half') onClose();
    else if (drag > 60) setSnap('half');
    start.current = null;
    setDrag(0);
  };
  return (
    <div
      role="dialog"
      aria-labelledby={labelledBy}
      data-testid={testId}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#0E1626]/95 shadow-2xl backdrop-blur-xl"
      style={{
        top: `calc(${baseVh}vh + ${Math.max(drag, snap === 'full' ? 0 : -window.innerHeight * 0.34)}px)`,
        transition: start.current === null ? 'top .25s ease' : 'none',
      }}
    >
      <div
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="button"
        tabIndex={0}
        aria-label={snap === 'full' ? 'Collapse panel' : 'Expand panel'}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSnap(snap === 'full' ? 'half' : 'full')}
      >
        <span className="h-1.5 w-10 rounded-full bg-white/30" />
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
