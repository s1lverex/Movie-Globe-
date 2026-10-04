import { useAppStore, type DiaryPlace } from '../store/useAppStore';
import { track } from './analytics';
import { formatCoords, reverseGeocode } from './geocode';
import { navigate } from './nav';

/** Normal Mode: drop a draft pin anywhere and open the planner panel for it. */
export function pickPoint(lat: number, lng: number, name?: string): void {
  const s = useAppStore.getState();
  s.selectPlace(null);
  s.setDraftPlace({ lat, lng, name: name ?? formatCoords(lat, lng), resolving: !name });
  navigate('/place/new');
  track('pick_point');
  if (name) return;
  void reverseGeocode(lat, lng).then((resolved) => {
    const d = useAppStore.getState().draftPlace;
    if (d && d.lat === lat && d.lng === lng)
      useAppStore.getState().setDraftPlace({ ...d, name: resolved ?? d.name, resolving: false });
  });
}

/** Saves the current draft as a planned place and returns it. */
export function saveDraft(
  fields: Partial<Pick<DiaryPlace, 'name' | 'date' | 'notes' | 'status'>> = {},
): DiaryPlace | null {
  const s = useAppStore.getState();
  const d = s.draftPlace;
  if (!d) return null;
  const status = fields.status ?? 'planned';
  const place = s.addPlace({
    name: (fields.name ?? d.name).trim() || formatCoords(d.lat, d.lng),
    lat: d.lat,
    lng: d.lng,
    status,
    date: fields.date ?? '',
    notes: fields.notes ?? '',
    visitedAt: status === 'visited' ? Date.now() : undefined,
  });
  s.setDraftPlace(null);
  track('place_save', { status });
  return place;
}
