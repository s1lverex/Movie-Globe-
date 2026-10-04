import type { FilmLocation } from '../types';

export type TripSection = 'flights' | 'hotels' | 'attractions' | 'cars' | 'home';

export const TRIP_HOME = 'https://www.trip.com/';

/**
 * Builds outbound Trip.com links. No API is used. Formats were checked on
 * 2026-10-04 (all return HTTP 200) but Trip.com is a client-side app, so the
 * exact pre-filled search behaviour should be re-verified manually.
 */
function affiliateParams(): string {
  const raw = (import.meta.env.VITE_TRIP_AFFILIATE_PARAMS as string | undefined) ?? '';
  return raw.trim().replace(/^[?&]/, '');
}

export function withAffiliate(url: string, extra = affiliateParams()): string {
  if (!extra) return url;
  return url + (url.includes('?') ? '&' : '?') + extra;
}

export function tripLink(
  loc: Pick<FilmLocation, 'tripCityQuery' | 'nearestAirport' | 'place'> | null,
  section: TripSection,
  extra?: string,
): string {
  if (!loc) return withAffiliate(TRIP_HOME, extra);
  const city = encodeURIComponent(loc.tripCityQuery.trim());
  const iata = encodeURIComponent(loc.nearestAirport.trim().toLowerCase());
  let url: string;
  switch (section) {
    case 'flights':
      url = iata
        ? `https://www.trip.com/flights/showfarefirst?dcity=&acity=${iata}&triptype=ow&class=y`
        : 'https://www.trip.com/flights/';
      break;
    case 'hotels':
      url = city ? `https://www.trip.com/hotels/list?keyword=${city}` : 'https://www.trip.com/hotels/';
      break;
    case 'attractions':
      url = city
        ? `https://www.trip.com/global-search/searchlist/search?keyword=${encodeURIComponent(loc.place)}`
        : 'https://www.trip.com/things-to-do/';
      break;
    case 'cars':
      url = iata
        ? `https://www.trip.com/carhire/?pickupAirport=${encodeURIComponent(loc.nearestAirport.toUpperCase())}`
        : 'https://www.trip.com/carhire/';
      break;
    case 'home':
    default:
      url = city ? `https://www.trip.com/global-search/searchlist/search?keyword=${city}` : TRIP_HOME;
  }
  return withAffiliate(url, extra);
}

export const TRIP_SECTIONS: { id: Exclude<TripSection, 'home'>; label: string }[] = [
  { id: 'flights', label: 'Flights' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'cars', label: 'Car Rentals' },
];
