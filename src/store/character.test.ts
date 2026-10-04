import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER, isValidCharacter, randomCharacter } from './character';

describe('character config', () => {
  it('default is valid', () => expect(isValidCharacter(DEFAULT_CHARACTER)).toBe(true));
  it('randomize always produces valid combos', () => {
    for (let i = 0; i < 200; i++) expect(isValidCharacter(randomCharacter())).toBe(true);
  });
});
