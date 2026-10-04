import { describe, expect, it } from 'vitest';
import { TRIP_HOME, tripLink, withAffiliate } from './tripLinks';

const loc = { tripCityQuery: 'Matamata', nearestAirport: 'AKL', place: 'Hobbiton Movie Set' };

describe('tripLink', () => {
  it('builds https trip.com links for each section', () => {
    for (const s of ['flights', 'hotels', 'attractions', 'cars', 'home'] as const) {
      const u = new URL(tripLink(loc, s, ''));
      expect(u.protocol).toBe('https:');
      expect(u.hostname).toBe('www.trip.com');
    }
  });

  it('includes the airport and city', () => {
    expect(tripLink(loc, 'flights', '')).toContain('acity=akl');
    expect(tripLink(loc, 'hotels', '')).toContain('keyword=Matamata');
    expect(tripLink(loc, 'cars', '')).toContain('pickupAirport=AKL');
    expect(tripLink(loc, 'attractions', '')).toContain('keyword=Hobbiton%20Movie%20Set');
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
    expect(tripLink(loc, 'hotels', 'Allianceid=1&SID=2')).toMatch(/keyword=Matamata&Allianceid=1&SID=2$/);
  });
});
