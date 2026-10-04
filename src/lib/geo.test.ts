import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { greatCircleSlerp, haversineKm, latLngToVector3, subsolarPoint, vector3ToLatLng } from './geo';

describe('latLngToVector3', () => {
  it('maps (0,0) to +X, north pole to +Y and 90°E to -Z', () => {
    const a = latLngToVector3(0, 0);
    expect(a.x).toBeCloseTo(1);
    expect(a.y).toBeCloseTo(0);
    expect(a.z).toBeCloseTo(0);
    expect(latLngToVector3(90, 0).y).toBeCloseTo(1);
    expect(latLngToVector3(0, 90).z).toBeCloseTo(-1);
  });

  it('respects radius', () => {
    expect(latLngToVector3(12, 34, 2.5).length()).toBeCloseTo(2.5);
  });

  it('round-trips with vector3ToLatLng', () => {
    for (const [lat, lng] of [
      [55.4155, -1.7059],
      [-37.8721, 175.6829],
      [64, -16.87],
      [-89, 10],
    ]) {
      const r = vector3ToLatLng(latLngToVector3(lat, lng, 3));
      expect(r.lat).toBeCloseTo(lat, 6);
      expect(r.lng).toBeCloseTo(lng, 6);
    }
  });
});

describe('greatCircleSlerp', () => {
  it('returns endpoints and stays on the unit sphere', () => {
    const a = latLngToVector3(10, 20);
    const b = latLngToVector3(-30, 120);
    expect(greatCircleSlerp(a, b, 0).distanceTo(a)).toBeLessThan(1e-9);
    expect(greatCircleSlerp(a, b, 1).distanceTo(b)).toBeLessThan(1e-9);
    for (let t = 0; t <= 1; t += 0.1) expect(greatCircleSlerp(a, b, t).length()).toBeCloseTo(1);
  });

  it('midpoint is equidistant', () => {
    const a = latLngToVector3(0, 0);
    const b = latLngToVector3(0, 90);
    const m = greatCircleSlerp(a, b, 0.5);
    expect(vector3ToLatLng(m).lng).toBeCloseTo(45);
  });

  it('handles antipodal points', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(-1, 0, 0);
    const m = greatCircleSlerp(a, b, 0.5);
    expect(m.length()).toBeCloseTo(1);
    expect(m.dot(a)).toBeCloseTo(0);
  });
});

describe('haversineKm', () => {
  it('computes known distances', () => {
    // London → Paris ≈ 344 km
    expect(haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 })).toBeCloseTo(344, -1);
    // Quarter of the equator ≈ 10,008 km
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 90 })).toBeCloseTo(10007.5, -1);
    expect(haversineKm({ lat: 5, lng: 5 }, { lat: 5, lng: 5 })).toBe(0);
  });
});

describe('subsolarPoint', () => {
  it('is near the equator at the March equinox noon UTC over Greenwich', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0, 0)));
    expect(Math.abs(p.lat)).toBeLessThan(1);
    expect(Math.abs(p.lng)).toBeLessThan(3);
  });

  it('is near the Tropic of Cancer at the June solstice', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 0, 0, 0)));
    expect(p.lat).toBeGreaterThan(23);
    expect(Math.abs(Math.abs(p.lng) - 180)).toBeLessThan(3);
  });
});
