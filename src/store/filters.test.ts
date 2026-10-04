import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data';
import { matchesFilters } from './filters';
import { EMPTY_FILTERS } from './useAppStore';

describe('matchesFilters', () => {
  it('matches everything with empty filters', () => {
    expect(LOCATIONS.every((l) => matchesFilters(l, EMPTY_FILTERS))).toBe(true);
  });
  it('filters by query, genre, decade, country', () => {
    const q = LOCATIONS.filter((l) => matchesFilters(l, { ...EMPTY_FILTERS, query: 'harry' }));
    expect(q.map((l) => l.slug).sort()).toEqual(['alnwick-castle', 'glenfinnan-viaduct']);
    expect(LOCATIONS.filter((l) => matchesFilters(l, { ...EMPTY_FILTERS, country: 'Jordan' }))).toHaveLength(
      2,
    );
    expect(
      LOCATIONS.filter((l) => matchesFilters(l, { ...EMPTY_FILTERS, genre: 'musical' })).length,
    ).toBeGreaterThan(0);
    expect(LOCATIONS.filter((l) => matchesFilters(l, { ...EMPTY_FILTERS, decade: '1950s' }))[0].slug).toBe(
      'trevi-fountain',
    );
  });
});
