import type { FilmLocation } from '../types';
import tripIds from '../data/tripIds.json';
import { env } from './config';

export type TripSection = 'flights' | 'hotels' | 'attractions' | 'cars' | 'home';

export const TRIP_HOME = 'https://www.trip.com/';

/**
 * Trip.com's own IDs for each film location's nearest town, resolved and
 * verified by scripts/fetch_trip_ids.py. With them, hotel / attraction /
 * destination pages open with the destination already filled in.
 */
interface TripIds {
  districtId: number;
  districtName: string;
  hotelCityId: number | null;
}
const IDS = tripIds as Record<string, TripIds>;

export function tripIdsFor(slug: string | undefined): TripIds | undefined {
  return slug ? IDS[slug] : undefined;
}

function affiliateParams(): string {
  return env.tripAffiliateParams.trim().replace(/^[?&]/, '');
}

export function withAffiliate(url: string, extra = affiliateParams()): string {
  if (!extra) return url;
  return url + (url.includes('?') ? '&' : '?') + extra;
}

const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-') || 'destination';

/**
 * Builds outbound Trip.com links (no API). Film locations use verified Trip.com
 * IDs so the destination is pre-selected; anything else (Normal Mode places)
 * falls back to keyword search. Flight / car-hire pre-fill can't be verified
 * from a server (Trip.com bot challenge) and may only open the search form.
 */
export function tripLink(
  loc: (Pick<FilmLocation, 'tripCityQuery' | 'nearestAirport' | 'place'> & { slug?: string }) | null,
  section: TripSection,
  extra?: string,
): string {
  if (!loc) return withAffiliate(TRIP_HOME, extra);
  const ids = tripIdsFor(loc.slug);
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
      url = ids?.hotelCityId
        ? `https://www.trip.com/hotels/list?city=${ids.hotelCityId}`
        : city
          ? `https://www.trip.com/hotels/list?keyword=${city}`
          : 'https://www.trip.com/hotels/';
      break;
    case 'attractions':
      url = ids
        ? `https://www.trip.com/things-to-do/list?citytype=dt&id=${ids.districtId}`
        : city
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
      url = ids
        ? `https://www.trip.com/travel-guide/destination/${slugify(ids.districtName)}-${ids.districtId}/`
        : city
          ? `https://www.trip.com/global-search/searchlist/search?keyword=${city}`
          : TRIP_HOME;
  }
  return withAffiliate(url, extra);
}

export const TRIP_SECTIONS: { id: Exclude<TripSection, 'home'>; label: string }[] = [
  { id: 'flights', label: 'Flights' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'cars', label: 'Car Rentals' },
];
