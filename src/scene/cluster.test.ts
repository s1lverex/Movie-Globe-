import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data';
import { clusterLocations, clusterThreshold } from './cluster';

describe('clusterLocations', () => {
  it('merges European pins at far zoom', () => {
    const clusters = clusterLocations(LOCATIONS, clusterThreshold(3.2));
    const uk = clusters.find((c) => c.items.some((l) => l.slug === 'alnwick-castle'))!;
    expect(uk.items.length).toBeGreaterThan(1);
    expect(clusters.length).toBeLessThan(LOCATIONS.length);
  });
  it('separates all pins when zoomed in', () => {
    expect(clusterLocations(LOCATIONS, clusterThreshold(1.4))).toHaveLength(LOCATIONS.length);
  });
});
