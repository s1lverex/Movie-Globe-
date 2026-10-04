import { Link } from 'react-router-dom';
import { LOCATIONS } from '../data';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from './Avatar';

export function JourneyBar() {
  const visited = useAppStore((s) => Object.keys(s.visited).length);
  const character = useAppStore((s) => s.character);
  const pct = Math.round((visited / LOCATIONS.length) * 100);
  return (
    <Link
      to="/passport"
      className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
      aria-label={`Your Journey: ${visited} of ${LOCATIONS.length} locations visited. Open passport`}
    >
      <Avatar config={character} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">Your Journey</div>
        <div className="text-xs text-slate-400">
          {visited} location{visited === 1 ? '' : 's'} visited
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
