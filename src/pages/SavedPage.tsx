import { Heart } from 'lucide-react';
import { LOCATION_BY_SLUG } from '../data';
import { useAppStore } from '../store/useAppStore';
import { LocationList } from '../ui/LocationList';
import { Overlay } from '../ui/Overlay';

export default function SavedPage() {
  const saved = useAppStore((s) => s.saved);
  const items = saved.map((s) => LOCATION_BY_SLUG[s]).filter(Boolean);
  return (
    <Overlay title="Saved">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
          <Heart size={36} className="text-slate-600" />
          <p className="max-w-xs text-sm">Tap the heart on any location to save it here for later.</p>
        </div>
      ) : (
        <LocationList items={items} />
      )}
    </Overlay>
  );
}
