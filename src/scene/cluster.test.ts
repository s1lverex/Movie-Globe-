import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data';
import { clusterLocations, clusterThreshold } from './cluster';

const ITEMS = LOCATIONS.map((l) => ({ ...l, id: l.slug }));

describe('clusterLocations', () => {
  it('merges European pins at far zoom', () => {
    const clusters = clusterLocations(ITEMS, clusterThreshold(3.2));
    const uk = clusters.find((c) => c.items.some((l) => l.id === 'alnwick-castle'))!;
    expect(uk.items.length).toBeGreaterThan(1);
    expect(clusters.length).toBeLessThan(LOCATIONS.length);
  });
  it('separates all pins when zoomed in', () => {
    expect(clusterLocations(ITEMS, clusterThreshold(1.4))).toHaveLength(LOCATIONS.length);
  });
});
