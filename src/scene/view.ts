import { PerspectiveCamera, type Camera } from 'three';

const REF = Math.tan((22.5 * Math.PI) / 180);

/**
 * Camera distance normalised to a 45° landscape view, so pin sizes, label
 * clustering and the character's chibi scale look the same on portrait phones
 * (which use a wider FOV and sit further back).
 */
export function effectiveDistance(camera: Camera): number {
  const d = camera.position.length();
  if (!(camera instanceof PerspectiveCamera)) return d;
  const half = Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect);
  return 1 + (d - 1) * (half / REF);
}

export const isPortrait = () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.8;
