import { Vector3 } from 'three';
import { latLngToVector3 } from '../lib/geo';

/**
 * Per-frame mutable character state. Kept outside React/Zustand so the
 * 60 fps simulation never triggers re-renders.
 */
export const runtime = {
  /** Unit vector: where the character stands. */
  pos: latLngToVector3(51.5, -0.12),
  /** Unit tangent vector: where the character faces. */
  forward: new Vector3(0, 1, 0),
  /** 0 idle, ~1 walk, ~2 run */
  speed: 0,
  /** Height above surface while flying (globe units). */
  lift: 0,
  flying: false,
  /** Joystick input in screen space, x right, y up, magnitude ≤ 1. */
  joystick: { x: 0, y: 0 },
  keys: new Set<string>(),
  run: false,
  lastInteraction: performance.now(),
};

export function resetForward(): void {
  const p = runtime.pos;
  const north = new Vector3(0, 1, 0).sub(p.clone().multiplyScalar(p.y));
  if (north.lengthSq() < 1e-6) north.set(1, 0, 0).sub(p.clone().multiplyScalar(p.x));
  runtime.forward.copy(north.normalize());
}

if (import.meta.env.DEV) (window as unknown as { __mgRuntime: typeof runtime }).__mgRuntime = runtime;
