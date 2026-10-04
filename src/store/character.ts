export const SKIN_TONES = ['#F8D9C0', '#EEC1A0', '#D9A07A', '#B57A55', '#8A5A3B', '#5C3A26'] as const;
export const HAIR_COLORS = [
  '#2B1B12',
  '#5A3A22',
  '#8B5A2B',
  '#D8B06A',
  '#B5402A',
  '#1F2A44',
  '#E8E4DC',
] as const;
export const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'bob'] as const;
export const HATS = ['beanie', 'cap', 'explorer', 'none'] as const;
export const OUTFIT_COLORS = [
  '#2F5D8A',
  '#3B7D4F',
  '#8A2F3B',
  '#C77D2E',
  '#4B3F72',
  '#2A2F3A',
  '#E5E7EB',
] as const;
export const PANTS_COLORS = ['#2E4A6B', '#3A3A3A', '#6B5638', '#5B6B3A', '#1F2937'] as const;
export const BACKPACKS = ['classic', 'explorer', 'mini', 'none'] as const;
export const BACKPACK_COLORS = ['#6B5638', '#3B7D4F', '#C2410C', '#1D4ED8', '#7C3AED', '#374151'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type Hat = (typeof HATS)[number];
export type Backpack = (typeof BACKPACKS)[number];

export interface CharacterConfig {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  hat: Hat;
  hatColor: string;
  top: string;
  pants: string;
  shoes: string;
  backpack: Backpack;
  backpackColor: string;
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  skin: SKIN_TONES[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[1],
  hat: 'beanie',
  hatColor: '#3A4150',
  top: OUTFIT_COLORS[0],
  pants: PANTS_COLORS[0],
  shoes: '#6B4A2E',
  backpack: 'classic',
  backpackColor: BACKPACK_COLORS[0],
};

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomCharacter(): CharacterConfig {
  return {
    skin: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    hat: pick(HATS),
    hatColor: pick([...OUTFIT_COLORS, '#3A4150']),
    top: pick(OUTFIT_COLORS),
    pants: pick(PANTS_COLORS),
    shoes: pick(['#6B4A2E', '#1F2937', '#E5E7EB', '#9A3412']),
    backpack: pick(BACKPACKS),
    backpackColor: pick(BACKPACK_COLORS),
  };
}

export function isValidCharacter(c: Partial<CharacterConfig>): c is CharacterConfig {
  return (
    typeof c.skin === 'string' &&
    HAIR_STYLES.includes(c.hairStyle as HairStyle) &&
    HATS.includes(c.hat as Hat) &&
    BACKPACKS.includes(c.backpack as Backpack) &&
    typeof c.top === 'string' &&
    typeof c.pants === 'string'
  );
}
