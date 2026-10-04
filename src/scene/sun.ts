import { Vector3 } from 'three';
import { latLngToVector3, subsolarPoint } from '../lib/geo';

/** Shared sun direction (world space), refreshed from the real UTC clock. */
export const sunDir = new Vector3(1, 0, 0);

export function updateSun(date = new Date()): Vector3 {
  const p = subsolarPoint(date);
  return latLngToVector3(p.lat, p.lng, 1, sunDir);
}
updateSun();
