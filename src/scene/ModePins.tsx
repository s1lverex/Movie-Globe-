import { useMemo } from 'react';
import { LOCATIONS, thumbFor } from '../data';
import { formatCoords } from '../lib/geocode';
import { navigate, openLocation } from '../lib/nav';
import { matchesFilters } from '../store/filters';
import { useAppStore } from '../store/useAppStore';
import { Pins, type PinItem } from './Pins';
import { PLACE_COLORS } from './placeColors';

/** Movie Mode pins: filtered film locations. */
export function MoviePins({ reducedMotion }: { reducedMotion: boolean }) {
  const filters = useAppStore((s) => s.filters);
  const selected = useAppStore((s) => s.selectedSlug);
  const visited = useAppStore((s) => s.visited);
  const items = useMemo<PinItem[]>(
    () =>
      LOCATIONS.filter((l) => matchesFilters(l, filters)).map((l) => ({
        id: l.slug,
        lat: l.lat,
        lng: l.lng,
        color: l.pinColor,
        title: l.movie,
        subtitle: `${l.city.split(',')[0]} (${l.country === 'United Kingdom' ? 'UK' : l.country})`,
        thumb: thumbFor(l),
        badge: !!visited[l.slug],
        onOpen: () => openLocation(l.slug),
      })),
    [filters, visited],
  );
  return <Pins items={items} selectedId={selected} reducedMotion={reducedMotion} />;
}

/** Normal Mode pins: the user's planned / visited places plus the unsaved draft. */
export function PlacePins({ reducedMotion }: { reducedMotion: boolean }) {
  const places = useAppStore((s) => s.places);
  const draft = useAppStore((s) => s.draftPlace);
  const selected = useAppStore((s) => s.selectedPlaceId);
  const query = useAppStore((s) => s.filters.query.trim().toLowerCase());
  const items = useMemo<PinItem[]>(() => {
    const list: PinItem[] = places
      .filter((p) => !query || `${p.name} ${p.notes}`.toLowerCase().includes(query))
      .map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: PLACE_COLORS[p.status],
        title: p.name,
        subtitle:
          p.status === 'visited'
            ? 'Visited · in your diary'
            : p.date
              ? `Planned · ${p.date}`
              : 'Planned trip',
        icon: p.status === 'visited' ? '✅' : '🧳',
        badge: p.status === 'visited',
        onOpen: () => navigate(`/place/${p.id}`),
      }));
    if (draft)
      list.push({
        id: 'draft',
        lat: draft.lat,
        lng: draft.lng,
        color: PLACE_COLORS.draft,
        title: draft.resolving ? 'Finding place…' : draft.name,
        subtitle: formatCoords(draft.lat, draft.lng),
        icon: '📍',
        onOpen: () => navigate('/place/new'),
      });
    return list;
  }, [places, draft, query]);
  return <Pins items={items} selectedId={draft ? 'draft' : selected} reducedMotion={reducedMotion} />;
}
