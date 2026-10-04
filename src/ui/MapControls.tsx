import { Minus, Navigation, Plus, Video } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function MapControls({ className = '' }: { className?: string }) {
  const camera = useAppStore((s) => s.camera);
  const mode = useAppStore((s) => s.cameraMode);
  const setMode = useAppStore((s) => s.setCameraMode);
  return (
    <div className={`pointer-events-auto flex flex-col gap-2 ${className}`} data-tour="controls">
      <div className="glass flex flex-col overflow-hidden rounded-full">
        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-11 w-11 items-center justify-center text-slate-100 hover:bg-white/10"
          onClick={() => camera({ type: 'zoom', factor: 0.75 })}
        >
          <Plus size={18} />
        </button>
        <div className="mx-2 h-px bg-white/10" />
        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-11 w-11 items-center justify-center text-slate-100 hover:bg-white/10"
          onClick={() => camera({ type: 'zoom', factor: 1.33 })}
        >
          <Minus size={18} />
        </button>
      </div>
      <button
        type="button"
        aria-label="Locate my character"
        className="icon-btn glass"
        onClick={() => camera({ type: 'locate' })}
      >
        <Navigation size={18} />
      </button>
      <button
        type="button"
        aria-label={mode === 'follow' ? 'Switch to free orbit camera' : 'Switch to follow camera'}
        aria-pressed={mode === 'follow'}
        title="Follow camera (F)"
        className={`icon-btn glass ${mode === 'follow' ? '!bg-accent text-white' : ''}`}
        onClick={() => setMode(mode === 'follow' ? 'orbit' : 'follow')}
      >
        <Video size={18} />
      </button>
    </div>
  );
}
