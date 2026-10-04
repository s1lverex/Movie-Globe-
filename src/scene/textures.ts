/** Shared so the Earth shader can offset its cloud shadows to match. */
export const cloudRotation = { value: 0 };

export const TEX = {
  day: (hi: boolean) => (hi ? '/textures/earth/day_4k.webp' : '/textures/earth/day_2k.webp'),
  night: '/textures/earth/night_2k.webp',
  bump: '/textures/earth/bump_2k.webp',
  spec: '/textures/earth/specular_2k.webp',
  clouds: '/textures/earth/clouds_2k.webp',
};
