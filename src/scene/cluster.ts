import { Vector3 } from 'three';
import { latLngToVector3 } from '../lib/geo';

export interface Clusterable {
  id: string;
  lat: number;
  lng: number;
}

export interface Cluster<T extends Clusterable> {
  id: string;
  items: T[];
  center: Vector3;
}

/** Greedy angular clustering: pins closer than `thresholdRad` merge. */
export function clusterLocations<T extends Clusterable>(locs: T[], thresholdRad: number): Cluster<T>[] {
  const pts = locs.map((l) => ({ l, v: latLngToVector3(l.lat, l.lng) }));
  const used = new Set<number>();
  const clusters: Cluster<T>[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const members = [pts[i]];
    for (let j = i + 1; j < pts.length; j++) {
      if (used.has(j)) continue;
      if (members.some((m) => m.v.angleTo(pts[j].v) < thresholdRad)) {
        used.add(j);
        members.push(pts[j]);
      }
    }
    const center = members.reduce((acc, m) => acc.add(m.v), new Vector3()).normalize();
    clusters.push({ id: members.map((m) => m.l.id).join('|'), items: members.map((m) => m.l), center });
  }
  return clusters;
}

/** Cluster radius as a function of camera distance from globe centre. */
export function clusterThreshold(cameraDistance: number): number {
  return Math.max(0, (cameraDistance - 1.45) * 0.17);
}
