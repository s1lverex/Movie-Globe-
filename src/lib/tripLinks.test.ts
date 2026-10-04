import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data';
import { TRIP_HOME, tripIdsFor, tripLink, withAffiliate } from './tripLinks';

const hobbiton = {
  slug: 'hobbiton',
  tripCityQuery: 'Matamata',
  nearestAirport: 'AKL',
  place: 'Hobbiton Movie Set',
};
const custom = { tripCityQuery: 'Kyoto', nearestAirport: '', place: 'Kyoto, Japan' };

describe('tripLink', () => {
  it('builds https trip.com links for each section', () => {
    for (const s of ['flights', 'hotels', 'attractions', 'cars', 'home'] as const) {
      const u = new URL(tripLink(hobbiton, s, ''));
      expect(u.protocol).toBe('https:');
      expect(u.hostname).toBe('www.trip.com');
    }
  });

  it('uses verified Trip.com IDs so film locations open pre-filled', () => {
    expect(tripLink(hobbiton, 'hotels', '')).toBe('https://www.trip.com/hotels/list?city=58806');
    expect(tripLink(hobbiton, 'attractions', '')).toBe(
      'https://www.trip.com/things-to-do/list?citytype=dt&id=17074',
    );
    expect(tripLink(hobbiton, 'home', '')).toBe(
      'https://www.trip.com/travel-guide/destination/matamata-17074/',
    );
    expect(tripLink(hobbiton, 'flights', '')).toContain('acity=akl');
    expect(tripLink(hobbiton, 'cars', '')).toContain('pickupAirport=AKL');
  });

  it('has IDs for every film location', () => {
    for (const l of LOCATIONS) {
      const ids = tripIdsFor(l.slug);
      expect(ids, l.slug).toBeDefined();
      expect(ids!.hotelCityId, l.slug).toBeGreaterThan(0);
    }
  });

  it('falls back to keyword search for custom (Normal Mode) places', () => {
    expect(tripLink(custom, 'hotels', '')).toBe('https://www.trip.com/hotels/list?keyword=Kyoto');
    expect(tripLink(custom, 'flights', '')).toBe('https://www.trip.com/flights/');
    expect(tripLink(custom, 'home', '')).toContain('keyword=Kyoto');
  });

  it('encodes special characters', () => {
    const u = tripLink({ tripCityQuery: 'Kāneʻohe & Co', nearestAirport: 'HNL', place: 'x' }, 'hotels', '');
    expect(u).not.toContain(' ');
    expect(u).toContain('%26');
  });

  it('falls back to the homepage without a location', () => {
    expect(tripLink(null, 'flights', '')).toBe(TRIP_HOME);
  });

  it('appends affiliate params', () => {
    expect(withAffiliate('https://www.trip.com/', 'Allianceid=1')).toBe('https://www.trip.com/?Allianceid=1');
    expect(tripLink(custom, 'hotels', 'Allianceid=1&SID=2')).toMatch(/keyword=Kyoto&Allianceid=1&SID=2$/);
  });
});
