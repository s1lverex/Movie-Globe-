import { useState } from 'react';
import { BookOpen, CalendarDays, PlayCircle, Wind } from 'lucide-react';
import { useEnsureMode } from '../lib/mode';
import { navigate } from '../lib/nav';
import { travelToPlace } from '../scene/travel';
import { useAppStore, type DiaryPlace } from '../store/useAppStore';
import { Overlay } from '../ui/Overlay';

function PlaceRow({ p }: { p: DiaryPlace }) {
  return (
    <li className="rounded-2xl border border-white/5 bg-white/[.03] p-3">
      <button type="button" className="w-full text-left" onClick={() => navigate(`/place/${p.id}`)}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{p.status === 'visited' ? '✅' : '🧳'}</span>
          <span className="truncate text-sm font-semibold text-white">{p.name}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {p.status === 'visited'
            ? `Visited ${p.date || (p.visitedAt ? new Date(p.visitedAt).toLocaleDateString() : '')}`
            : p.date
              ? `Planned for ${p.date}`
              : 'No date yet'}
        </div>
        {p.notes && (
          <p className="mt-1.5 line-clamp-3 text-xs whitespace-pre-line text-slate-300">{p.notes}</p>
        )}
      </button>
      {p.status === 'planned' && (
        <button
          type="button"
          className="btn-ghost mt-2 w-full py-1.5 text-xs"
          onClick={() => {
            travelToPlace(p.id, 'fly');
            navigate('/');
          }}
        >
          <Wind size={14} /> Fly there
        </button>
      )}
    </li>
  );
}

/** Normal Mode: trip planner (upcoming) and travel diary (visited). */
export default function TripsPage() {
  useEnsureMode('normal');
  const places = useAppStore((s) => s.places);
  const [tab, setTab] = useState<'planned' | 'visited'>('planned');
  const planned = places
    .filter((p) => p.status === 'planned')
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const visited = places
    .filter((p) => p.status === 'visited')
    .sort((a, b) => (b.visitedAt ?? b.createdAt) - (a.visitedAt ?? a.createdAt));
  const list = tab === 'planned' ? planned : visited;
  return (
    <Overlay title="My Trips">
      <button
        type="button"
        className="btn-primary mb-4 w-full py-2.5 text-sm"
        onClick={() => navigate('/summary')}
        data-testid="open-summary"
      >
        <PlayCircle size={16} /> Travel Summary
      </button>
      <div className="mb-4 flex rounded-2xl bg-white/5 p-1" role="tablist">
        {(
          [
            ['planned', 'Planner', CalendarDays, planned.length],
            ['visited', 'Diary', BookOpen, visited.length],
          ] as const
        ).map(([id, label, Icon, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium ${tab === id ? 'bg-accent text-white' : 'text-slate-300'}`}
          >
            <Icon size={14} /> {label} ({n})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          {tab === 'planned'
            ? 'Tap anywhere on the globe (or search a place) and choose “Save to planner”.'
            : 'Places you travel to — or mark as “Been here” — appear in your diary.'}
        </p>
      ) : (
        <ul className="space-y-2" data-testid={`trips-${tab}`}>
          {list.map((p) => (
            <PlaceRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </Overlay>
  );
}
