import { Clapperboard, Compass } from 'lucide-react';
import { switchMode } from '../lib/mode';
import { useAppStore, type AppMode } from '../store/useAppStore';

const MODES: { id: AppMode; label: string; hint: string; icon: typeof Compass }[] = [
  { id: 'normal', label: 'Normal', hint: 'Plan trips anywhere & keep a travel diary', icon: Compass },
  { id: 'movie', label: 'Movie', hint: 'Travel to famous film locations', icon: Clapperboard },
];

/** Segmented control switching Normal Mode ↔ Movie Mode. */
export function ModeToggle({ className = '' }: { className?: string }) {
  const mode = useAppStore((s) => s.appMode);
  return (
    <div
      role="radiogroup"
      aria-label="App mode"
      data-testid="mode-toggle"
      data-mode={mode}
      className={`glass pointer-events-auto inline-flex rounded-full p-1 shadow-lg shadow-black/30 ${className}`}
    >
      {MODES.map(({ id, label, hint, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={hint}
            onClick={() => switchMode(id)}
            data-testid={`mode-${id}`}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-white ${
              active ? 'bg-accent text-white shadow-md shadow-accent/40' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Icon size={16} aria-hidden="true" /> {label} Mode
          </button>
        );
      })}
    </div>
  );
}
