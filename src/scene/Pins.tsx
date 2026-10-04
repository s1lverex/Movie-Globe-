import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LOCATIONS, thumbFor } from '../data';
import { latLngToVector3 } from '../lib/geo';
import { openLocation } from '../lib/nav';
import { matchesFilters } from '../store/filters';
import { useAppStore } from '../store/useAppStore';
import { clusterLocations, clusterThreshold, type Cluster } from './cluster';
import { effectiveDistance } from './view';
import { runtime } from './runtime';

const UP = new Vector3(0, 1, 0);

function pinGeometry() {
  const head = new SphereGeometry(0.013, 20, 16);
  head.translate(0, 0.036, 0);
  const tip = new ConeGeometry(0.0118, 0.03, 20, 1, true);
  tip.rotateX(Math.PI);
  tip.translate(0, 0.021, 0);
  const g = mergeGeometries([head.toNonIndexed(), tip.toNonIndexed()]);
  head.dispose();
  tip.dispose();
  return g;
}

export function Pins({ reducedMotion }: { reducedMotion: boolean }) {
  const filters = useAppStore((s) => s.filters);
  const selected = useAppStore((s) => s.selectedSlug);
  const hovered = useAppStore((s) => s.hoveredSlug);
  const visited = useAppStore((s) => s.visited);
  const hover = useAppStore((s) => s.hover);
  const camera = useThree((s) => s.camera);

  const visible = useMemo(() => LOCATIONS.filter((l) => matchesFilters(l, filters)), [filters]);
  const visibleSet = useMemo(() => new Set(visible.map((l) => l.slug)), [visible]);

  const geometry = useMemo(pinGeometry, []);
  const ringGeometry = useMemo(() => {
    const g = new RingGeometry(0.009, 0.0125, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  const ringMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        toneMapped: false,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const pins = useRef<InstancedMesh>(null);
  const rings = useRef<InstancedMesh>(null);

  const normals = useMemo(() => LOCATIONS.map((l) => latLngToVector3(l.lat, l.lng)), []);
  const quats = useMemo(() => normals.map((n) => new Quaternion().setFromUnitVectors(UP, n)), [normals]);

  useEffect(() => {
    const c = new Color();
    LOCATIONS.forEach((l, i) => {
      c.set(l.pinColor).multiplyScalar(l.slug === selected || l.slug === hovered ? 2.4 : 1.5);
      pins.current?.setColorAt(i, c);
      rings.current?.setColorAt(i, c);
    });
    if (pins.current?.instanceColor) pins.current.instanceColor.needsUpdate = true;
    if (rings.current?.instanceColor) rings.current.instanceColor.needsUpdate = true;
  }, [selected, hovered]);

  const dummy = useMemo(() => new Object3D(), []);
  const m = useMemo(() => new Matrix4(), []);
  const [bucket, setBucket] = useState(() => Math.round(effectiveDistance(camera) * 5) / 5);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const camLen = effectiveDistance(camera);
    const scale = Math.min(0.95, Math.max(0.45, (camLen - 1) * 0.42));
    LOCATIONS.forEach((l, i) => {
      const on = visibleSet.has(l.slug);
      const emph = l.slug === selected || l.slug === hovered ? 1.35 : 1;
      const bob = reducedMotion ? 0 : Math.sin(t * 2 + i) * 0.004;
      dummy.position.copy(normals[i]).multiplyScalar(1.0 + bob);
      dummy.quaternion.copy(quats[i]);
      dummy.scale.setScalar(on ? scale * emph : 0);
      dummy.updateMatrix();
      pins.current?.setMatrixAt(i, dummy.matrix);
      const pulse = reducedMotion ? 1 : 1 + ((t * 0.6 + i * 0.37) % 1) * 0.9;
      dummy.position.copy(normals[i]).multiplyScalar(1.002);
      dummy.scale.setScalar(on ? scale * pulse : 0);
      dummy.updateMatrix();
      m.copy(dummy.matrix);
      rings.current?.setMatrixAt(i, m);
    });
    if (pins.current) pins.current.instanceMatrix.needsUpdate = true;
    if (rings.current) rings.current.instanceMatrix.needsUpdate = true;

    const b = Math.round(camLen * 5) / 5;
    if (b !== bucket) setBucket(b);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    openLocation(LOCATIONS[e.instanceId].slug);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      hover(LOCATIONS[e.instanceId].slug);
      document.body.style.cursor = 'pointer';
    }
  };
  const onOut = () => {
    hover(null);
    document.body.style.cursor = '';
  };

  const clusters = useMemo(() => clusterLocations(visible, clusterThreshold(bucket)), [visible, bucket]);

  return (
    <group>
      <instancedMesh
        ref={pins}
        args={[geometry, material, LOCATIONS.length]}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rings}
        args={[ringGeometry, ringMaterial, LOCATIONS.length]}
        raycast={() => null}
        frustumCulled={false}
      />
      {clusters.map((c) => (
        <PinLabel key={c.id} cluster={c} selected={selected} hovered={hovered} visited={visited} />
      ))}
    </group>
  );
}

const tmpCam = new Vector3();
const tmpA = new Vector3();
const tmpB = new Vector3();

function PinLabel({
  cluster,
  selected,
  hovered,
  visited,
}: {
  cluster: Cluster;
  selected: string | null;
  hovered: string | null;
  visited: Record<string, number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchor = useMemo(() => cluster.center.clone().multiplyScalar(1.06), [cluster.center]);
  const single = cluster.items.length === 1 ? cluster.items[0] : null;
  const isSel = single && (single.slug === selected || single.slug === hovered);
  const setCam = useAppStore((s) => s.camera);

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    tmpCam.copy(camera.position);
    const len = tmpCam.length();
    const facing = cluster.center.dot(tmpCam.normalize());
    // Horizon for a point just above the surface seen from distance `len`.
    const horizon = 1 / len + 0.04;
    let vis = Math.min(1, Math.max(0, (facing - horizon) / 0.12));
    // Keep the explorer readable: fade labels sitting on top of the character.
    tmpA.copy(anchor).project(camera);
    tmpB
      .copy(runtime.pos)
      .multiplyScalar(1.04 + runtime.lift)
      .project(camera);
    const px = Math.hypot((tmpA.x - tmpB.x) * size.width * 0.5, (tmpA.y - tmpB.y) * size.height * 0.5);
    if (px < 70) vis = Math.min(vis, 0.12 + (px / 70) * 0.5);
    el.style.opacity = String(vis);
    el.style.pointerEvents = vis > 0.5 ? 'auto' : 'none';
    el.style.visibility = vis <= 0.01 ? 'hidden' : 'visible';
    const s = Math.min(1.1, Math.max(0.72, 2.8 / effectiveDistance(camera))) * (size.width < 640 ? 0.82 : 1);
    el.style.transform = `translate(-24px, -100%) scale(${s.toFixed(3)})`;
  });

  if (!single) {
    return (
      <Html position={anchor} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={ref} className="origin-bottom-left" style={{ transform: 'translate(-24px,-100%)' }}>
          <button
            type="button"
            aria-label={`${cluster.items.length} film locations: ${cluster.items.map((l) => l.movie).join(', ')}. Zoom in`}
            onClick={() => {
              const p = cluster.center;
              setCam({
                type: 'focus',
                lat: (Math.asin(p.y) * 180) / Math.PI,
                lng: (Math.atan2(-p.z, p.x) * 180) / Math.PI,
                distance: 1.6,
              });
            }}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-[#121A2B]/80 py-1 pr-3 pl-1 text-left shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-[#2F6BFF]"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6BFF] text-base font-bold text-white ring-2 ring-white/70">
              {cluster.items.length}
            </span>
            <span className="w-36 text-[11px] leading-tight text-slate-300">
              <span className="block text-xs font-semibold whitespace-nowrap text-white">
                {cluster.items.length} locations
              </span>
              <span className="block truncate">
                {cluster.items
                  .slice(0, 2)
                  .map((l) => l.movie)
                  .join(', ')}
                {cluster.items.length > 2 ? '…' : ''}
              </span>
            </span>
          </button>
        </div>
      </Html>
    );
  }

  const thumb = thumbFor(single);
  return (
    <Html position={anchor} zIndexRange={[isSel ? 30 : 20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="origin-bottom-left" style={{ transform: 'translate(-24px,-100%)' }}>
        <button
          type="button"
          onClick={() => openLocation(single.slug)}
          onMouseEnter={() => useAppStore.getState().hover(single.slug)}
          onMouseLeave={() => useAppStore.getState().hover(null)}
          aria-label={`${single.movie} — ${single.place}, ${single.country}`}
          className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-left transition ${
            isSel ? 'bg-[#121A2B]/90 shadow-lg shadow-black/50 ring-1 ring-[#2F6BFF]' : 'bg-transparent'
          }`}
        >
          <span
            className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-700 ring-2"
            style={{ ['--tw-ring-color' as string]: single.pinColor }}
          >
            {thumb && (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
            )}
            {visited[single.slug] && (
              <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[#0B1220] bg-emerald-400" />
            )}
          </span>
          <span className="w-36 leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,.9)]">
            <span className="block truncate text-xs font-semibold text-white">{single.movie}</span>
            <span className="block truncate text-[10.5px] text-slate-300">
              {single.city.split(',')[0]} ({single.country === 'United Kingdom' ? 'UK' : single.country})
            </span>
          </span>
        </button>
      </div>
    </Html>
  );
}
