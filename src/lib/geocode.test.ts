import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCoords, reverseGeocode, searchPlaces } from './geocode';

afterEach(() => vi.restoreAllMocks());

describe('geocode', () => {
  it('formats coordinates', () => {
    expect(formatCoords(48.8566, 2.3522)).toBe('48.86°N, 2.35°E');
    expect(formatCoords(-33.87, -70.5)).toBe('33.87°S, 70.50°W');
  });

  it('parses search results into short names', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([{ lat: '35.0', lon: '135.7', address: { city: 'Kyoto', country: 'Japan' } }]),
      ),
    );
    expect(await searchPlaces('kyoto')).toEqual([{ name: 'Kyoto, Japan', lat: 35, lng: 135.7 }]);
  });

  it('fails soft when offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await reverseGeocode(1, 2)).toBeNull();
  });
});
