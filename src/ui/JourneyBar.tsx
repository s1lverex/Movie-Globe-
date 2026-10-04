import { Link } from 'react-router-dom';
import { LOCATIONS } from '../data';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from './Avatar';

export function JourneyBar() {
  const mode = useAppStore((s) => s.appMode);
  const filmVisited = useAppStore((s) => Object.keys(s.visited).length);
  const places = useAppStore((s) => s.places);
  const character = useAppStore((s) => s.character);

  const movie = mode === 'movie';
  const done = movie ? filmVisited : places.filter((p) => p.status === 'visited').length;
  const total = movie ? LOCATIONS.length : places.length;
  const planned = places.length - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const label = movie
    ? `${done} location${done === 1 ? '' : 's'} visited`
    : `${done} visited · ${planned} planned`;

  return (
    <Link
      to={movie ? '/passport' : '/trips'}
      className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
      aria-label={movie ? `Your Journey: ${label}. Open passport` : `Travel Diary: ${label}. Open my trips`}
      data-testid="journey-bar"
    >
      <Avatar config={character} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{movie ? 'Your Journey' : 'Travel Diary'}</div>
        <div className="text-xs text-slate-400">{label}</div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all ${movie ? 'bg-accent' : 'bg-emerald-400'}`}
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
