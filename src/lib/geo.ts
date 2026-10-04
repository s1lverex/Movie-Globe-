import { Vector3 } from 'three';
import type { LatLng } from '../types';

export const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;

/**
 * Converts lat/lng (degrees) to a point on a sphere. The mapping matches
 * three.js SphereGeometry UVs with an equirectangular texture:
 * (0°,0°) → +X (Gulf of Guinea), north pole → +Y, 90°E → −Z.
 */
export function latLngToVector3(lat: number, lng: number, radius = 1, target = new Vector3()): Vector3 {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  return target.set(
    radius * Math.cos(phi) * Math.cos(lambda),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(lambda),
  );
}

export function vector3ToLatLng(v: Vector3): LatLng {
  const r = v.length() || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, v.y / r))) / DEG;
  const lng = Math.atan2(-v.z, v.x) / DEG;
  return { lat, lng };
}

/** Spherical linear interpolation between two unit vectors along the great circle. */
export function greatCircleSlerp(a: Vector3, b: Vector3, t: number, target = new Vector3()): Vector3 {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const dot = Math.max(-1, Math.min(1, an.dot(bn)));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return target.copy(an);
  if (Math.PI - omega < 1e-6) {
    // Antipodal: pick any perpendicular axis to define the great circle.
    const axis = Math.abs(an.y) < 0.99 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    axis.cross(an).normalize();
    return target.copy(an).applyAxisAngle(axis, omega * t);
  }
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return target.set(an.x * wa + bn.x * wb, an.y * wa + bn.y * wb, an.z * wa + bn.z * wb);
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Angle (radians) between two points on the unit sphere. */
export function angleBetween(a: Vector3, b: Vector3): number {
  return a.angleTo(b);
}

/**
 * Approximate sub-solar point for a given date (declination + equation of time).
 * Good to ~1°, which is plenty for a day/night terminator.
 */
export function subsolarPoint(date: Date): LatLng {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  const g = ((2 * Math.PI) / 365.25) * (dayOfYear - 1);
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let lng = -((utcMinutes + eqTimeMin) / 4 - 180);
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;
  return { lat: decl / DEG, lng };
}

export function formatKm(km: number): string {
  return km >= 100 ? `${Math.round(km).toLocaleString('en-US')} km` : `${km.toFixed(1)} km`;
}
