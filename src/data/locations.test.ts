import { describe, expect, it } from 'vitest';
import { LOCATIONS, LOCATION_BY_SLUG, TOURS } from '.';

describe('locations data', () => {
  it('has at least 20 valid locations with unique slugs', () => {
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(LOCATIONS.map((l) => l.slug)).size).toBe(LOCATIONS.length);
    for (const l of LOCATIONS) {
      expect(l.lat).toBeGreaterThanOrEqual(-90);
      expect(l.lat).toBeLessThanOrEqual(90);
      expect(l.lng).toBeGreaterThanOrEqual(-180);
      expect(l.lng).toBeLessThanOrEqual(180);
      expect(l.description.length).toBeGreaterThan(40);
      expect(l.funFact.length).toBeGreaterThan(10);
      expect(l.pinColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(l.nearestAirport).toMatch(/^[A-Z]{3}$/);
      expect(l.genres.length).toBeGreaterThan(0);
      for (const p of l.photos) {
        expect(p.credit).toBeTruthy();
        expect(p.license).toMatch(/^(CC0|CC BY \d\.\d( [a-z]{2})?|Public domain)$/i);
      }
    }
  });
  it('tours reference existing slugs', () => {
    for (const t of TOURS) for (const s of t.stops) expect(LOCATION_BY_SLUG[s]).toBeDefined();
  });
});
