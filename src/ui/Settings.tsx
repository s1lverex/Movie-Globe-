import { BatteryLow, List, Volume2, VolumeX } from 'lucide-react';
import { setAmbient } from '../lib/sound';
import { useAppStore, useLowPower } from '../store/useAppStore';

export function SettingsToggles({ vertical = false }: { vertical?: boolean }) {
  const muted = useAppStore((s) => s.muted);
  const setMuted = useAppStore((s) => s.setMuted);
  const lowPower = useLowPower();
  const setLowPower = useAppStore((s) => s.setLowPower);
  const setListView = useAppStore((s) => s.setListView);
  const cls =
    'flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white';
  return (
    <div className={`flex ${vertical ? 'flex-col items-stretch' : 'flex-wrap'} gap-1`}>
      <button
        type="button"
        className={cls}
        aria-pressed={!muted}
        onClick={() => {
          setMuted(!muted);
          setAmbient(muted);
        }}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? 'Sound off' : 'Sound on'}
      </button>
      <button type="button" className={cls} aria-pressed={lowPower} onClick={() => setLowPower(!lowPower)}>
        <BatteryLow size={16} /> Low power {lowPower ? 'on' : 'off'}
      </button>
      <button type="button" className={cls} onClick={() => setListView(true)}>
        <List size={16} /> List view
      </button>
    </div>
  );
}
