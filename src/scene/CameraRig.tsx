import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { latLngToVector3 } from '../lib/geo';
import { useAppStore } from '../store/useAppStore';
import { runtime } from './runtime';
import { effectiveDistance } from './view';

export const MIN_DIST = 1.25;
export const MAX_DIST = 8;
const IDLE_MS = 12000;

const _dir = new Vector3();
const _goal = new Vector3();
const _look = new Vector3();
const _up = new Vector3();
const _q = new Quaternion();
const _worldUp = new Vector3(0, 1, 0);
const MAX_POLAR_Y = 0.985;

/**
 * Keeps a camera direction away from the exact poles, where an orbit camera
 * with a fixed world-up would flip. Falls back to `prev`'s heading.
 */
function clampPolar(v: Vector3, prev: Vector3): Vector3 {
  if (Math.abs(v.y) <= MAX_POLAR_Y) return v;
  let hx = v.x;
  let hz = v.z;
  if (hx * hx + hz * hz < 1e-8) {
    hx = prev.x;
    hz = prev.z;
  }
  const h = Math.hypot(hx, hz) || 1;
  const r = Math.sqrt(1 - MAX_POLAR_Y * MAX_POLAR_Y);
  return v.set((hx / h) * r, Math.sign(v.y) * MAX_POLAR_Y, (hz / h) * r);
}

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const anim = useRef<{ dir: Vector3 | null; dist: number | null }>({ dir: null, dist: null });
  const cameraMode = useAppStore((s) => s.cameraMode);
  const lastUser = useRef(performance.now());
  const dragging = useRef(false);
  const following = useRef(false);

  // Camera commands from UI (zoom +/-, locate, focus on a pin). Polled per
  // frame so commands issued before the canvas mounted (deep links) still run.
  const lastNonce = useRef(0);
  const processCommand = () => {
    const s = useAppStore.getState();
    const c = s.cameraCommand;
    if (!c || c.nonce === lastNonce.current) return;
    lastNonce.current = c.nonce;
    const len = camera.position.length();
    if (c.type === 'zoom') {
      anim.current.dist = Math.min(MAX_DIST, Math.max(MIN_DIST, (anim.current.dist ?? len) * c.factor));
    } else if (c.type === 'locate') {
      if (s.cameraMode === 'orbit') {
        anim.current.dir = runtime.pos.clone();
        anim.current.dist = Math.min(len, 2.6);
      }
    } else if (c.type === 'focus') {
      if (s.cameraMode === 'follow') s.setCameraMode('orbit');
      anim.current.dir = latLngToVector3(c.lat, c.lng);
      anim.current.dist = c.distance ?? Math.min(Math.max(len, 2.4), 3);
    }
  };

  // Leaving follow mode: restore orbit up-vector.
  useEffect(() => {
    if (cameraMode === 'orbit') {
      camera.up.set(0, 1, 0);
      controls.current?.target.set(0, 0, 0);
      anim.current.dir = camera.position.clone().normalize();
      anim.current.dist = Math.min(Math.max(camera.position.length(), 2.2), 3);
    }
  }, [cameraMode, camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const ctl = controls.current;
    if (!ctl) return;
    processCommand();
    const s = useAppStore.getState();
    const len = camera.position.length();

    if (s.cameraMode === 'follow') {
      ctl.enabled = false;
      const up = runtime.pos;
      _goal
        .copy(up)
        .multiplyScalar(1 + runtime.lift + 0.16)
        .addScaledVector(runtime.forward, -0.22);
      _look
        .copy(up)
        .multiplyScalar(1 + runtime.lift + 0.05)
        .addScaledVector(runtime.forward, 0.08);
      const k = 1 - Math.exp(-dt * 4);
      camera.position.lerp(_goal, k);
      _up.copy(camera.up).lerp(up, k).normalize();
      camera.up.copy(_up);
      camera.lookAt(_look);
      return;
    }
    ctl.enabled = true;

    // Track the balloon during flights.
    if (s.travel?.mode === 'fly' && s.trackFlight) {
      anim.current.dir = runtime.pos.clone();
      if (anim.current.dist === null) anim.current.dist = Math.max(2.3, Math.min(len, 3.2));
    }

    // Follow the explorer: while it walks, rotate the globe with it so it stays
    // centred. Paused while the user drags; settles once it stops moving.
    const a = anim.current;
    const moving = runtime.speed > 0.05 && !runtime.flying;
    if (moving && !dragging.current) following.current = true;
    if (following.current && !dragging.current && !a.dir && s.travel?.mode !== 'fly') {
      const prev = _look.copy(camera.position).normalize();
      _dir
        .copy(prev)
        .lerp(runtime.pos, 1 - Math.exp(-dt * (reducedMotion ? 10 : 2.5)))
        .normalize();
      // Carry the camera's up-vector along the same rotation (parallel transport)
      // so "screen up" stays continuous — this lets the follow cross the poles,
      // which a fixed north-up orbit camera cannot.
      _q.setFromUnitVectors(prev, _dir);
      camera.up.applyQuaternion(_q);
      camera.up.addScaledVector(_dir, -camera.up.dot(_dir)).normalize();
      camera.position.copy(_dir).multiplyScalar(a.dist ?? len);
      camera.lookAt(0, 0, 0);
      if (!moving && _dir.angleTo(runtime.pos) < 0.004) following.current = false;
    } else if (camera.up.y < 0.9999) {
      // Not following: settle back to the normal north-up orbit (needed for
      // dragging / auto-rotate), easing off the exact pole first.
      const k = 1 - Math.exp(-dt * (dragging.current ? 8 : 3));
      const prev = _look.copy(camera.position).normalize();
      _dir.copy(prev);
      clampPolar(_dir, prev);
      _dir.lerp(prev, 1 - k).normalize();
      camera.up.lerp(_worldUp, k).normalize();
      if (camera.up.y > 0.9999) camera.up.copy(_worldUp);
      camera.position.copy(_dir).multiplyScalar(len);
      camera.lookAt(0, 0, 0);
    }

    if (a.dir || a.dist !== null) {
      const k = 1 - Math.exp(-dt * (reducedMotion ? 10 : 3));
      _dir.copy(camera.position).normalize();
      if (a.dir) {
        _look.copy(_dir);
        _dir.lerp(a.dir, k).normalize();
        clampPolar(_dir, _look);
        if (_dir.angleTo(a.dir) < 0.002 && s.travel?.mode !== 'fly') a.dir = null;
        // A pole target can't be reached exactly (clamped); stop once settled.
        else if (
          Math.abs(_dir.y) >= MAX_POLAR_Y - 1e-6 &&
          Math.abs(a.dir.y) > MAX_POLAR_Y &&
          s.travel?.mode !== 'fly'
        )
          a.dir = null;
      }
      let d = len;
      if (a.dist !== null) {
        d = len + (a.dist - len) * k;
        if (Math.abs(a.dist - d) < 0.002) a.dist = null;
      }
      camera.position.copy(_dir.multiplyScalar(d));
      camera.lookAt(0, 0, 0);
    }

    // Finer rotation near the surface.
    ctl.rotateSpeed = Math.min(0.9, Math.max(0.12, (effectiveDistance(camera) - 1) * 0.35));
    ctl.zoomSpeed = 0.6;
    const idle = performance.now() - Math.max(lastUser.current, runtime.lastInteraction) > IDLE_MS;
    ctl.autoRotate = !reducedMotion && idle && !s.selectedSlug && !s.travel && !s.walkTarget;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      autoRotateSpeed={0.35}
      onStart={() => {
        dragging.current = true;
        following.current = false;
        lastUser.current = performance.now();
        anim.current.dir = null;
        anim.current.dist = null;
        useAppStore.setState({ trackFlight: false });
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}
