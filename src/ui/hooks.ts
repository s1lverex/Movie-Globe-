import { useEffect, useState } from 'react';
import { runtime } from '../scene/runtime';
import { useAppStore } from '../store/useAppStore';

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
/**
 * True on any touch-capable device. `(pointer: coarse)` alone is unreliable:
 * some in-app / custom-tab browsers report a fine primary pointer on phones.
 */
export function useTouchDevice(): boolean {
  const anyCoarse = useMediaQuery('(any-pointer: coarse)');
  const touchPoints = typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
  const touchEvents = typeof window !== 'undefined' && 'ontouchstart' in window;
  return anyCoarse || touchPoints || touchEvents;
}

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

/** WASD / arrow keys drive the character unless typing in a field. */
export function useKeyboardMovement(): void {
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return (
        !!t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      );
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) {
        // Arrow keys inside focused buttons/lists keep their native behaviour.
        const t = e.target as HTMLElement | null;
        if (k.startsWith('arrow') && t && t !== document.body && t.tagName !== 'CANVAS') return;
        runtime.keys.add(k);
        e.preventDefault();
      }
      if (e.key === 'Shift') runtime.run = true;
      if (k === 'f' && !e.repeat) {
        const s = useAppStore.getState();
        s.setCameraMode(s.cameraMode === 'orbit' ? 'follow' : 'orbit');
      }
    };
    const up = (e: KeyboardEvent) => {
      runtime.keys.delete(e.key.toLowerCase());
      if (e.key === 'Shift') runtime.run = false;
    };
    const blur = () => {
      runtime.keys.clear();
      runtime.run = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}
