import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Check, Footprints, MapPin, Save, Trash2, Wind, X } from 'lucide-react';
import { formatKm } from '../lib/geo';
import { formatCoords } from '../lib/geocode';
import { navigate } from '../lib/nav';
import { saveDraft } from '../lib/places';
import { TRANSPORTS, TRANSPORT_META, type Transport } from '../lib/summary';
import { PLACE_COLORS } from '../scene/placeColors';
import { distanceToPointKm, travelToPlace, WALK_MAX_KM } from '../scene/travel';
import { useAppStore, type DiaryPlace } from '../store/useAppStore';
import { BottomSheet } from './LocationPanel';
import { TripPanel, type TripTarget } from './TripPanel';

function tripTarget(id: string, name: string): TripTarget {
  return { slug: id, place: name, city: name, tripCityQuery: name.split(',')[0], nearestAirport: '' };
}

function useDistance(lat: number, lng: number) {
  const position = useAppStore((s) => s.position);
  const travel = useAppStore((s) => s.travel);
  const [km, setKm] = useState(() => distanceToPointKm({ lat, lng }));
  useEffect(() => {
    setKm(distanceToPointKm({ lat, lng }));
    const id = setInterval(() => setKm(distanceToPointKm({ lat, lng })), 1000);
    return () => clearInterval(id);
  }, [lat, lng, position, travel]);
  return km;
}

const field =
  'w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none';

interface Draftish {
  id: string | null;
  name: string;
  lat: number;
  lng: number;
  status: DiaryPlace['status'] | 'draft';
  date: string;
  notes: string;
  transport?: Transport;
  resolving?: boolean;
}

function Body({ p, onClose }: { p: Draftish; onClose: () => void }) {
  const update = useAppStore((s) => s.updatePlace);
  const remove = useAppStore((s) => s.removePlace);
  const travel = useAppStore((s) => s.travel);
  const [name, setName] = useState(p.name);
  const [date, setDate] = useState(p.date);
  const [notes, setNotes] = useState(p.notes);
  const km = useDistance(p.lat, p.lng);
  const isDraft = p.id === null;
  const here = km < 50;

  // Keep the reverse-geocoded name flowing into an untouched draft field.
  useEffect(() => {
    if (isDraft) setName(p.name);
  }, [isDraft, p.name]);
  useEffect(() => {
    setDate(p.date);
    setNotes(p.notes);
  }, [p.id, p.date, p.notes]);

  const patch = (x: Partial<DiaryPlace>) => p.id && update(p.id, x);
  const ensureSaved = (status: DiaryPlace['status'] = 'planned') => {
    if (p.id) return p.id;
    const saved = saveDraft({ name, date, notes, status });
    if (saved) navigate(`/place/${saved.id}`);
    return saved?.id ?? null;
  };
  const go = (mode: 'fly' | 'walk') => {
    const id = ensureSaved();
    if (id) travelToPlace(id, mode);
  };
  const color = p.status === 'draft' ? PLACE_COLORS.draft : PLACE_COLORS[p.status];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <MapPin
          size={26}
          className="mt-2 shrink-0"
          style={{ color, fill: `${color}55` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-wide uppercase" style={{ color }}>
            {isDraft ? 'New place' : p.status === 'visited' ? 'Travel diary' : 'Planned trip'}
          </div>
          <label className="sr-only" htmlFor="place-name">
            Place name
          </label>
          <input
            id="place-name"
            value={p.resolving && isDraft ? 'Finding place…' : name}
            onChange={(e) => {
              setName(e.target.value);
              patch({ name: e.target.value });
            }}
            className="w-full bg-transparent font-display text-2xl font-bold text-white focus:outline-none"
            data-testid="place-name"
          />
          <p className="text-xs text-slate-400">
            {formatCoords(p.lat, p.lng)} · {here ? '📍 You are here' : `${formatKm(km)} from your explorer`}
          </p>
        </div>
        <button type="button" className="icon-btn h-9 w-9 shrink-0" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {!isDraft && (
        <div className="flex rounded-2xl bg-white/5 p-1" role="radiogroup" aria-label="Trip status">
          {(['planned', 'visited'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={p.status === s}
              onClick={() => patch({ status: s, visitedAt: s === 'visited' ? Date.now() : undefined })}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium capitalize transition ${
                p.status === s ? 'bg-accent text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {s === 'planned' ? <CalendarDays size={14} /> : <Check size={14} />} {s}
            </button>
          ))}
        </div>
      )}

      {!isDraft && (
        <fieldset>
          <legend className="mb-1 text-xs text-slate-400">
            {p.status === 'visited' ? 'How did you travel here?' : 'How will you get there?'}
          </legend>
          <div className="flex gap-1.5" role="radiogroup">
            {([undefined, ...TRANSPORTS] as (Transport | undefined)[]).map((m) => (
              <button
                key={m ?? 'auto'}
                type="button"
                role="radio"
                aria-checked={p.transport === m}
                onClick={() => patch({ transport: m })}
                className={`flex-1 rounded-xl py-1.5 text-[11px] transition ${
                  p.transport === m ? 'bg-accent text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                data-testid={`transport-${m ?? 'auto'}`}
              >
                <span className="block text-base">{m ? TRANSPORT_META[m].icon : '✨'}</span>
                {m ? TRANSPORT_META[m].label : 'Auto'}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">
          {p.status === 'visited' ? 'Date visited' : 'Trip date'}
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            patch({ date: e.target.value });
          }}
          className={field}
          data-testid="place-date"
        />
      </label>
      <label className="block space-y-1">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <BookOpen size={12} /> {p.status === 'visited' ? 'Diary entry' : 'Plans & notes'}
        </span>
        <textarea
          value={notes}
          rows={4}
          placeholder={
            p.status === 'visited'
              ? 'What did you see, eat and love here?'
              : 'Things to do, where to stay, budget…'
          }
          onChange={(e) => {
            setNotes(e.target.value);
            patch({ notes: e.target.value });
          }}
          className={`${field} resize-y`}
          data-testid="place-notes"
        />
      </label>

      {isDraft && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1 px-3 text-sm whitespace-nowrap"
            onClick={() => ensureSaved('planned')}
            data-testid="save-place"
          >
            <Save size={16} /> Save to planner
          </button>
          <button
            type="button"
            className="btn-ghost flex-1 px-3 text-sm whitespace-nowrap"
            onClick={() => ensureSaved('visited')}
            data-testid="save-visited"
          >
            <Check size={16} /> Been here
          </button>
        </div>
      )}

      {!here && (
        <div className="flex gap-2">
          {km < WALK_MAX_KM && (
            <button
              type="button"
              className="btn-ghost flex-1 px-2 text-sm whitespace-nowrap"
              disabled={travel?.mode === 'fly'}
              onClick={() => go('walk')}
              data-testid="place-walk"
            >
              <Footprints size={16} /> Walk there
            </button>
          )}
          <button
            type="button"
            className="btn-ghost flex-1 border-accent/40 bg-accent/15 px-2 text-sm whitespace-nowrap"
            disabled={travel?.mode === 'fly'}
            onClick={() => go('fly')}
            data-testid="place-fly"
          >
            <Wind size={16} /> Fly there
          </button>
        </div>
      )}

      <TripPanel loc={tripTarget(p.id ?? 'draft', name)} />

      {!isDraft && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-xs text-rose-300 hover:bg-rose-500/10"
          onClick={() => {
            if (p.id) remove(p.id);
            onClose();
          }}
          data-testid="delete-place"
        >
          <Trash2 size={14} /> Remove from my trips
        </button>
      )}
    </div>
  );
}

/** Normal Mode panel for a new pin (`/place/new`) or a saved planner/diary place (`/place/:id`). */
export function PlacePanel({ id, desktop }: { id: string; desktop: boolean }) {
  const draft = useAppStore((s) => s.draftPlace);
  const place = useAppStore((s) => s.places.find((p) => p.id === id) ?? null);
  const selectPlace = useAppStore((s) => s.selectPlace);
  const setDraft = useAppStore((s) => s.setDraftPlace);
  const camera = useAppStore((s) => s.camera);
  const isNew = id === 'new';

  const data: Draftish | null = isNew
    ? draft && {
        id: null,
        name: draft.name,
        lat: draft.lat,
        lng: draft.lng,
        status: 'draft',
        date: '',
        notes: '',
        resolving: draft.resolving,
      }
    : place && { ...place };

  useEffect(() => {
    if (!isNew && place) {
      selectPlace(place.id);
      camera({ type: 'focus', lat: place.lat - (desktop ? 0 : 6), lng: place.lng + (desktop ? 12 : 0) });
    }
    return () => selectPlace(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus once per place
  }, [id]);

  const missing = !data;
  useEffect(() => {
    if (missing) navigate('/');
  }, [missing]);

  const close = () => {
    if (isNew) setDraft(null);
    navigate('/');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!data) return null;
  if (desktop)
    return (
      <div
        role="dialog"
        aria-label={data.name}
        className="glass animate-slide-up no-scrollbar pointer-events-auto absolute top-4 right-4 bottom-4 z-30 w-[400px] overflow-y-auto rounded-3xl p-5"
        data-testid="place-panel"
      >
        <Body p={data} onClose={close} />
      </div>
    );
  return (
    <BottomSheet onClose={close} testId="place-panel">
      <div className="px-4 pt-1 pb-8">
        <Body p={data} onClose={close} />
      </div>
    </BottomSheet>
  );
}
