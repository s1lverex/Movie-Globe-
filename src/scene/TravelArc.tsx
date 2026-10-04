import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { AdditiveBlending, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, Vector3 } from 'three';
import type { Line2, LineMaterial } from 'three-stdlib';
import { LOCATION_BY_SLUG } from '../data';
import { latLngToVector3 } from '../lib/geo';
import { useAppStore } from '../store/useAppStore';
import { arcPoint } from './arc';
import { runtime } from './runtime';

const N = 72;
const UP = new Vector3(0, 1, 0);

/** Animated dotted great-circle arc from the character to the selected / travel destination. */
export function TravelArc({ reducedMotion }: { reducedMotion: boolean }) {
  const selected = useAppStore((s) => s.selectedSlug);
  const travel = useAppStore((s) => s.travel);
  const walkTarget = useAppStore((s) => s.walkTarget);
  const slug = travel?.slug ?? selected;
  const dest = useMemo(() => {
    if (slug && LOCATION_BY_SLUG[slug]) {
      const l = LOCATION_BY_SLUG[slug];
      return latLngToVector3(l.lat, l.lng);
    }
    if (walkTarget) return latLngToVector3(walkTarget.lat, walkTarget.lng);
    return null;
  }, [slug, walkTarget]);

  const line = useRef<Line2>(null);
  const marker = useRef<Mesh>(null);
  const origin = useRef(new Vector3());
  const flat = useMemo(() => new Float32Array(N * 3), []);
  const initial = useMemo(() => Array.from({ length: N }, () => new Vector3(0, 0, 0)), []);
  const ring = useMemo(() => {
    const g = new RingGeometry(0.018, 0.026, 40);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#7FB0FF',
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // Freeze the origin when a flight starts so the arc doesn't chase the balloon.
  useEffect(() => {
    origin.current.copy(runtime.pos);
  }, [travel, dest]);

  const tmp = useMemo(() => new Vector3(), []);
  const q = useMemo(() => new Quaternion(), []);
  const timer = useRef(1);

  useFrame(({ clock }, dt) => {
    const l = line.current;
    if (!l || !dest) return;
    const flying = travel?.mode === 'fly';
    timer.current += dt;
    if (!flying && timer.current > 0.15) {
      timer.current = 0;
      origin.current.copy(runtime.pos);
    }
    if (timer.current === 0 || flying || l.userData.dest !== dest) {
      l.userData.dest = dest;
      for (let i = 0; i < N; i++) {
        arcPoint(origin.current, dest, i / (N - 1), tmp, 1.004);
        flat.set([tmp.x, tmp.y, tmp.z], i * 3);
      }
      l.geometry.setPositions(flat);
      l.computeLineDistances();
    }
    const mat = l.material as LineMaterial;
    if (!reducedMotion) mat.dashOffset -= dt * 0.12;
    mat.opacity = flying ? 0.95 : 0.7;
    if (marker.current) {
      marker.current.position.copy(dest).multiplyScalar(1.002);
      marker.current.quaternion.copy(q.setFromUnitVectors(UP, dest));
      const s = reducedMotion ? 1 : 1 + 0.35 * Math.sin(clock.elapsedTime * 4);
      marker.current.scale.setScalar(s);
    }
  });

  if (!dest) return null;
  return (
    <group>
      <Line
        ref={line}
        points={initial}
        color="#9CC2FF"
        lineWidth={2.2}
        dashed
        dashSize={0.018}
        gapSize={0.014}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
      <mesh ref={marker} geometry={ring} material={ringMat} raycast={() => null} />
    </group>
  );
}
