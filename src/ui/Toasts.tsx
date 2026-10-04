import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4 lg:top-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass animate-slide-up pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-xl shadow-black/40"
        >
          {t.kind === 'stamp' && (
            <span className="animate-stamp flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-300 text-lg">
              🎬
            </span>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{t.title}</div>
            {t.body && <div className="truncate text-xs text-slate-300">{t.body}</div>}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="ml-1 rounded-full p-1 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
