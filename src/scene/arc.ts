import { Vector3 } from 'three';
import { greatCircleSlerp } from '../lib/geo';

export function arcHeight(from: Vector3, to: Vector3): number {
  const angle = from.angleTo(to);
  return 0.04 + 0.32 * (angle / Math.PI);
}

/** Point along the lifted great-circle arc between two unit vectors. */
export function arcPoint(
  from: Vector3,
  to: Vector3,
  t: number,
  target = new Vector3(),
  surface = 1.004,
): Vector3 {
  greatCircleSlerp(from, to, t, target);
  const lift = Math.sin(Math.PI * t) * arcHeight(from, to);
  return target.multiplyScalar(surface + lift);
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Flight duration in seconds: 3–6 s scaled by great-circle angle. */
export function flightDuration(from: Vector3, to: Vector3): number {
  return 3 + 3 * Math.min(1, from.angleTo(to) / Math.PI);
}
