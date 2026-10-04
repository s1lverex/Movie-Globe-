import { describe, expect, it } from 'vitest';
import places from '../data/places.json';
import { latLngToVector3 } from '../lib/geo';
import { indexPlaces, nearestPlaces, type NearbyPlace } from './nearby';

const ALL = indexPlaces(places as NearbyPlace[]);

describe('nearestPlaces', () => {
  it('finds landmarks and cities around Paris, landmarks first', () => {
    const r = nearestPlaces(ALL, latLngToVector3(48.86, 2.35), 400, 6);
    const names = r.map((x) => x.place.n);
    expect(names).toContain('Eiffel Tower');
    expect(names).toContain('Paris');
    expect(r[0].place.k).toBe('landmark');
    for (const x of r) expect(x.km).toBeLessThanOrEqual(400);
  });

  it('returns nothing in the middle of the Pacific', () => {
    expect(nearestPlaces(ALL, latLngToVector3(-30, -140), 300, 6)).toHaveLength(0);
  });

  it('has sane data', () => {
    expect(ALL.length).toBeGreaterThan(500);
    for (const p of ALL) {
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
      expect(p.n).toBeTruthy();
    }
  });
});
