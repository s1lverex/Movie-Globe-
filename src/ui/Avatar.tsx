import type { CharacterConfig } from '../store/character';

/** Flat SVG portrait of the current character (used in nav + journey badges). */
export function Avatar({
  config,
  size = 44,
  className = '',
}: {
  config: CharacterConfig;
  size?: number;
  className?: string;
}) {
  const c = config;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={`rounded-full bg-gradient-to-b from-[#2A3B63] to-[#16213A] ring-2 ring-white/20 ${className}`}
    >
      <path d="M14 64c2-12 9-17 18-17s16 5 18 17z" fill={c.top} />
      <circle cx="32" cy="30" r="15" fill={c.skin} />
      {c.hairStyle === 'long' && <path d="M16 30c0 14 4 18 4 18h24s4-4 4-18z" fill={c.hairColor} />}
      {c.hairStyle === 'bob' && <path d="M16 28c0 9 2 13 2 13h28s2-4 2-13z" fill={c.hairColor} />}
      <path d="M17 28c0-10 7-15 15-15s15 5 15 15c-5-4-9-6-15-6s-10 2-15 6z" fill={c.hairColor} />
      {c.hairStyle === 'bun' && <circle cx="32" cy="12" r="6" fill={c.hairColor} />}
      {c.hairStyle === 'spiky' && <path d="M20 18l3-8 4 6 5-8 4 8 5-6 2 8z" fill={c.hairColor} />}
      {c.hat === 'beanie' && (
        <>
          <path d="M16 26c0-10 7-16 16-16s16 6 16 16z" fill={c.hatColor} />
          <rect x="15" y="23" width="34" height="6" rx="3" fill={c.hatColor} stroke="#0003" />
        </>
      )}
      {c.hat === 'cap' && (
        <>
          <path d="M17 25c0-9 7-14 15-14s15 5 15 14z" fill={c.hatColor} />
          <path d="M30 24h22c0 3-3 4-6 4H30z" fill={c.hatColor} stroke="#0003" />
        </>
      )}
      {c.hat === 'explorer' && (
        <>
          <ellipse cx="32" cy="22" rx="24" ry="4" fill="#B08D57" />
          <path d="M21 22c0-8 5-11 11-11s11 3 11 11z" fill="#B08D57" />
          <rect x="21" y="18" width="22" height="3" fill={c.hatColor} />
        </>
      )}
      <ellipse cx="26.5" cy="32" rx="2.2" ry="2.8" fill="#1B1410" />
      <ellipse cx="37.5" cy="32" rx="2.2" ry="2.8" fill="#1B1410" />
      <circle cx="27.3" cy="31" r=".8" fill="#fff" />
      <circle cx="38.3" cy="31" r=".8" fill="#fff" />
      <path d="M29 38q3 2.5 6 0" stroke="#7A3B2E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
