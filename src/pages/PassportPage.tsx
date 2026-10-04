import { Lock } from 'lucide-react';
import { LOCATIONS } from '../data';
import { openLocation } from '../lib/nav';
import { useAppStore } from '../store/useAppStore';
import { Overlay } from '../ui/Overlay';

export default function PassportPage() {
  const visited = useAppStore((s) => s.visited);
  const count = Object.keys(visited).length;
  return (
    <Overlay title="Passport" wide>
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#0F1B3D] p-5 ring-1 ring-white/10">
        <div className="text-xs tracking-[.25em] text-[#9CC2FF] uppercase">Movie Globe Passport</div>
        <div className="mt-1 font-display text-3xl font-bold text-white">
          {count} <span className="text-base font-medium text-slate-300">/ {LOCATIONS.length} stamps</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber-300"
            style={{ width: `${(count / LOCATIONS.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Stamps">
        {LOCATIONS.map((l, i) => {
          const at = visited[l.slug];
          return (
            <li key={l.slug}>
              <button
                type="button"
                onClick={() => openLocation(l.slug)}
                aria-label={
                  at
                    ? `${l.place} stamp, earned ${new Date(at).toLocaleDateString()}`
                    : `${l.place} stamp, locked`
                }
                className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[#F5EEDC]/[.04] p-2 transition hover:bg-white/5"
                data-testid={at ? 'stamp-earned' : 'stamp-locked'}
              >
                {at ? (
                  <div
                    className="flex aspect-square w-full flex-col items-center justify-center rounded-full border-[3px] border-dashed p-2 text-center"
                    style={{
                      borderColor: l.pinColor,
                      color: l.pinColor,
                      transform: `rotate(${((i * 37) % 24) - 12}deg)`,
                    }}
                  >
                    <span className="text-[9px] font-bold tracking-widest uppercase">{l.country}</span>
                    <span className="my-0.5 line-clamp-2 font-display text-[12px] leading-tight font-bold">
                      {l.place}
                    </span>
                    <span className="text-[9px] opacity-80">
                      {new Date(at).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-white/10 text-slate-600">
                    <Lock size={16} />
                    <span className="line-clamp-2 px-2 text-center text-[10px]">{l.place}</span>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Overlay>
  );
}
