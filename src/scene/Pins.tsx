import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { latLngToVector3, vector3ToLatLng } from '../lib/geo';
import { useAppStore } from '../store/useAppStore';
import { clusterLocations, clusterThreshold, type Cluster } from './cluster';
import { effectiveDistance } from './view';
import { runtime } from './runtime';

/** Anything shown as a pin: a film location (Movie Mode) or a diary place (Normal Mode). */
export interface PinItem {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  subtitle: string;
  thumb?: string;
  /** Shown in the bubble when there is no thumbnail. */
  icon?: string;
  badge?: boolean;
  onOpen: () => void;
}

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

export function Pins({
  items,
  selectedId,
  reducedMotion,
}: {
  items: PinItem[];
  selectedId: string | null;
  reducedMotion: boolean;
}) {
  const hovered = useAppStore((s) => s.hoveredSlug);
  const hover = useAppStore((s) => s.hover);
  const camera = useThree((s) => s.camera);
  const count = items.length;

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

  const normals = useMemo(() => items.map((l) => latLngToVector3(l.lat, l.lng)), [items]);
  const quats = useMemo(() => normals.map((n) => new Quaternion().setFromUnitVectors(UP, n)), [normals]);

  useEffect(() => {
    const c = new Color();
    items.forEach((l, i) => {
      c.set(l.color).multiplyScalar(l.id === selectedId || l.id === hovered ? 2.4 : 1.5);
      pins.current?.setColorAt(i, c);
      rings.current?.setColorAt(i, c);
    });
    if (pins.current?.instanceColor) pins.current.instanceColor.needsUpdate = true;
    if (rings.current?.instanceColor) rings.current.instanceColor.needsUpdate = true;
  }, [items, selectedId, hovered]);

  const dummy = useMemo(() => new Object3D(), []);
  const [bucket, setBucket] = useState(() => Math.round(effectiveDistance(camera) * 5) / 5);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const camLen = effectiveDistance(camera);
    const scale = Math.min(0.95, Math.max(0.45, (camLen - 1) * 0.42));
    items.forEach((l, i) => {
      const emph = l.id === selectedId || l.id === hovered ? 1.35 : 1;
      const bob = reducedMotion ? 0 : Math.sin(t * 2 + i) * 0.004;
      dummy.position.copy(normals[i]).multiplyScalar(1.0 + bob);
      dummy.quaternion.copy(quats[i]);
      dummy.scale.setScalar(scale * emph);
      dummy.updateMatrix();
      pins.current?.setMatrixAt(i, dummy.matrix);
      const pulse = reducedMotion ? 1 : 1 + ((t * 0.6 + i * 0.37) % 1) * 0.9;
      dummy.position.copy(normals[i]).multiplyScalar(1.002);
      dummy.scale.setScalar(scale * pulse);
      dummy.updateMatrix();
      rings.current?.setMatrixAt(i, dummy.matrix);
    });
    if (pins.current) pins.current.instanceMatrix.needsUpdate = true;
    if (rings.current) rings.current.instanceMatrix.needsUpdate = true;

    const b = Math.round(camLen * 5) / 5;
    if (b !== bucket) setBucket(b);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) items[e.instanceId]?.onOpen();
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && items[e.instanceId]) {
      hover(items[e.instanceId].id);
      document.body.style.cursor = 'pointer';
    }
  };
  const onOut = () => {
    hover(null);
    document.body.style.cursor = '';
  };

  const clusters = useMemo(() => clusterLocations(items, clusterThreshold(bucket)), [items, bucket]);

  if (count === 0) return null;
  return (
    <group>
      <instancedMesh
        key={`p${count}`}
        ref={pins}
        args={[geometry, material, count]}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
        frustumCulled={false}
      />
      <instancedMesh
        key={`r${count}`}
        ref={rings}
        args={[ringGeometry, ringMaterial, count]}
        raycast={() => null}
        frustumCulled={false}
      />
      {clusters.map((c) => (
        <PinLabel key={c.id} cluster={c} selectedId={selectedId} hovered={hovered} />
      ))}
    </group>
  );
}

const tmpCam = new Vector3();
const tmpA = new Vector3();
const tmpB = new Vector3();

function PinLabel({
  cluster,
  selectedId,
  hovered,
}: {
  cluster: Cluster<PinItem>;
  selectedId: string | null;
  hovered: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchor = useMemo(() => cluster.center.clone().multiplyScalar(1.06), [cluster.center]);
  const single = cluster.items.length === 1 ? cluster.items[0] : null;
  const isSel = single && (single.id === selectedId || single.id === hovered);
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
            aria-label={`${cluster.items.length} places: ${cluster.items.map((l) => l.title).join(', ')}. Zoom in`}
            onClick={() => {
              const p = vector3ToLatLng(cluster.center);
              setCam({ type: 'focus', lat: p.lat, lng: p.lng, distance: 1.6 });
            }}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-[#121A2B]/80 py-1 pr-3 pl-1 text-left shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-[#2F6BFF]"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6BFF] text-base font-bold text-white ring-2 ring-white/70">
              {cluster.items.length}
            </span>
            <span className="w-36 text-[11px] leading-tight text-slate-300">
              <span className="block text-xs font-semibold whitespace-nowrap text-white">
                {cluster.items.length} places
              </span>
              <span className="block truncate">
                {cluster.items
                  .slice(0, 2)
                  .map((l) => l.title)
                  .join(', ')}
                {cluster.items.length > 2 ? '…' : ''}
              </span>
            </span>
          </button>
        </div>
      </Html>
    );
  }

  return (
    <Html position={anchor} zIndexRange={[isSel ? 30 : 20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="origin-bottom-left" style={{ transform: 'translate(-24px,-100%)' }}>
        <button
          type="button"
          onClick={single.onOpen}
          onMouseEnter={() => useAppStore.getState().hover(single.id)}
          onMouseLeave={() => useAppStore.getState().hover(null)}
          aria-label={`${single.title} — ${single.subtitle}`}
          className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-left transition ${
            isSel ? 'bg-[#121A2B]/90 shadow-lg ring-1 shadow-black/50 ring-[#2F6BFF]' : 'bg-transparent'
          }`}
        >
          <span
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-lg ring-2"
            style={{ ['--tw-ring-color' as string]: single.color }}
          >
            {single.thumb ? (
              <img
                src={single.thumb}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <span aria-hidden="true">{single.icon ?? '📍'}</span>
            )}
            {single.badge && (
              <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[#0B1220] bg-emerald-400" />
            )}
          </span>
          <span className="w-36 leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,.9)]">
            <span className="block truncate text-xs font-semibold text-white">{single.title}</span>
            <span className="block truncate text-[10.5px] text-slate-300">{single.subtitle}</span>
          </span>
        </button>
      </div>
    </Html>
  );
}
