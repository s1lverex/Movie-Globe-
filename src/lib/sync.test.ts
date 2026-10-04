import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../store/character';
import type { DiaryPlace } from '../store/useAppStore';
import { mergeSync, type SyncData } from './sync';

const place = (id: string, name: string, createdAt: number): DiaryPlace => ({
  id,
  name,
  lat: 0,
  lng: 0,
  status: 'planned',
  createdAt,
  date: '',
  notes: '',
});
const base: SyncData = {
  version: 1,
  character: DEFAULT_CHARACTER,
  visited: {},
  saved: [],
  places: [],
  appMode: 'normal',
};

describe('mergeSync', () => {
  it('returns local data when the account is empty', () => {
    const local = { ...base, saved: ['petra'] };
    expect(mergeSync(local, null)).toBe(local);
  });

  it('unions places, stamps and favourites; account copy wins on conflicts', () => {
    const local: SyncData = {
      ...base,
      visited: { petra: 200, hobbiton: 50 },
      saved: ['petra'],
      places: [place('a', 'Local A', 1), place('b', 'Local only', 2)],
    };
    const remote: Partial<SyncData> = {
      character: { ...DEFAULT_CHARACTER, hat: 'cap' },
      visited: { petra: 100, dubrovnik: 10 },
      saved: ['dubrovnik'],
      places: [place('a', 'Remote A', 1), place('c', 'Remote only', 3)],
      appMode: 'movie',
    };
    const m = mergeSync(local, remote);
    expect(m.visited).toEqual({ petra: 100, hobbiton: 50, dubrovnik: 10 });
    expect(m.saved.sort()).toEqual(['dubrovnik', 'petra']);
    expect(m.places.map((p) => p.name)).toEqual(['Remote A', 'Local only', 'Remote only']);
    expect(m.character.hat).toBe('cap');
    expect(m.appMode).toBe('movie');
  });
});
