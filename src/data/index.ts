import rawLocations from './locations.json';
import photos from './photos.json';
import rawTours from './tours.json';
import type { FilmLocation, Photo, Tour } from '../types';

const photoMap = photos as Record<string, Photo[]>;

export const LOCATIONS: FilmLocation[] = (rawLocations as FilmLocation[]).map((l) => ({
  ...l,
  photos: photoMap[l.slug] ?? [],
}));

export const LOCATION_BY_SLUG: Record<string, FilmLocation> = Object.fromEntries(
  LOCATIONS.map((l) => [l.slug, l]),
);

export const TOURS: Tour[] = rawTours as Tour[];

export const GENRES = [...new Set(LOCATIONS.flatMap((l) => l.genres))].sort();
export const DECADES = [...new Set(LOCATIONS.map((l) => l.decade))].sort();
export const COUNTRIES = [...new Set(LOCATIONS.map((l) => l.country))].sort();

export function thumbFor(l: FilmLocation): string | undefined {
  return l.photos.length ? `/images/locations/${l.slug}/thumb.webp` : undefined;
}
