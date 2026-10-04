import { describe, expect, it } from 'vitest';
import { LOCATION_BY_SLUG } from '../data';
import type { DiaryPlace } from '../store/useAppStore';
import { buildLegs, buildStops, inferTransport, summaryStats, type SummaryStop } from './summary';

const place = (
  id: string,
  name: string,
  lat: number,
  lng: number,
  extra: Partial<DiaryPlace> = {},
): DiaryPlace => ({
  id,
  name,
  lat,
  lng,
  status: 'visited',
  createdAt: 1,
  date: '',
  notes: '',
  ...extra,
});
const stop = (lat: number, lng: number): SummaryStop => ({
  id: `${lat},${lng}`,
  kind: 'trip',
  name: '',
  subtitle: '',
  country: '',
  lat,
  lng,
  time: 0,
  icon: '',
});
// Toy ocean: everything west of 0° longitude is water.
const westIsOcean = (_lat: number, lng: number) => lng < 0;

describe('buildStops', () => {
  it('merges diary places and film locations chronologically, skipping planned trips', () => {
    const stops = buildStops(
      [
        place('a', 'Kyoto, Japan', 35, 135.7, { date: '2026-03-10' }),
        place('b', 'Lisbon, Portugal', 38.7, -9.1, { visitedAt: new Date('2026-01-05').getTime() }),
        place('c', 'Plan only', 0, 0, { status: 'planned' }),
      ],
      { petra: new Date('2026-02-01').getTime() },
      LOCATION_BY_SLUG,
    );
    expect(stops.map((s) => s.name)).toEqual([
      'Lisbon, Portugal',
      'Al-Khazneh (The Treasury), Petra',
      'Kyoto, Japan',
    ]);
    expect(stops[1].kind).toBe('film');
    expect(stops[2].country).toBe('Japan');
  });
});

describe('inferTransport', () => {
  it('flies long hauls, drives short hops, sails short water crossings', () => {
    expect(inferTransport(stop(51.5, -0.1), stop(35.7, 139.7))).toBe('plane'); // London → Tokyo
    expect(inferTransport(stop(48.85, 2.35), stop(49.4, 2.8))).toBe('car'); // ~70 km
    expect(inferTransport(stop(48.85, 2.35), stop(45.76, 4.84))).toBe('bus'); // Paris → Lyon ~390 km
    expect(inferTransport(stop(50, -2), stop(50, -6), westIsOcean)).toBe('boat');
    expect(inferTransport(stop(50, -1), stop(50, -15), westIsOcean)).toBe('plane'); // ~1000 km over water
  });
});

describe('buildLegs / summaryStats', () => {
  it('uses recorded transport over inference and totals the trip', () => {
    const stops = buildStops(
      [
        place('a', 'Paris, France', 48.85, 2.35, { date: '2026-01-01' }),
        place('b', 'Lyon, France', 45.76, 4.84, { date: '2026-01-05', transport: 'plane' }),
        place('c', 'Tokyo, Japan', 35.7, 139.7, { date: '2026-02-01' }),
      ],
      {},
      LOCATION_BY_SLUG,
    );
    const legs = buildLegs(stops);
    expect(legs.map((l) => [l.transport, l.inferred])).toEqual([
      ['plane', false],
      ['plane', true],
    ]);
    const s = summaryStats(stops, legs);
    expect(s.places).toBe(3);
    expect(s.countries).toBe(2);
    expect(s.byTransport.plane).toBe(2);
    expect(s.km).toBeGreaterThan(9000);
  });
});
