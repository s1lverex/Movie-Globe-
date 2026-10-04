import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';
import { LOCATIONS, LOCATION_BY_SLUG } from '../data';
import { latLngToVector3, vector3ToLatLng } from '../lib/geo';
import { useAppStore } from '../store/useAppStore';
import { arcHeight, easeInOut, flightDuration } from './arc';
import { Balloon } from './Balloon';
import { CharacterModel, type CharacterAnim } from './CharacterModel';
import { resetForward, runtime } from './runtime';
import { ARRIVAL_KM, handleArrival } from './travel';
import { effectiveDistance } from './view';
import { greatCircleSlerp } from '../lib/geo';

export const CHARACTER_SCALE = 0.06;
const WALK = 0.07; // rad/s
const RUN = 0.18;
const TURN = 5; // rad/s
const ARRIVAL_RAD = ARRIVAL_KM / 6371;

const _axis = new Vector3();
const _q = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();
const _right = new Vector3();
const _m = new Matrix4();
const _up = new Vector3();
const _fwd = new Vector3();

function tangent(v: Vector3, at: Vector3, out: Vector3) {
  return out.copy(v).addScaledVector(at, -v.dot(at));
}

/** Advance runtime.pos along runtime.forward by `angle` radians (parallel transport). */
function step(angle: number) {
  _axis.crossVectors(runtime.pos, runtime.forward).normalize();
  _q.setFromAxisAngle(_axis, angle);
  runtime.pos.applyQuaternion(_q).normalize();
  runtime.forward.applyQuaternion(_q);
  tangent(runtime.forward, runtime.pos, runtime.forward).normalize();
}

/** Rotate forward toward desired tangent direction, limited by turn rate. */
function turnToward(desired: Vector3, maxAngle: number) {
  const f = runtime.forward;
  const angle = Math.atan2(_v.crossVectors(f, desired).dot(runtime.pos), f.dot(desired));
  const a = Math.max(-maxAngle, Math.min(maxAngle, angle));
  _q.setFromAxisAngle(runtime.pos, a);
  f.applyQuaternion(_q);
  tangent(f, runtime.pos, f).normalize();
  return Math.abs(angle);
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

const DUST = 40;

function Dust({ emit }: { emit: { current: number } }) {
  const geom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(DUST * 3), 3));
    g.setAttribute('alpha', new BufferAttribute(new Float32Array(DUST), 1));
    return g;
  }, []);
  const parts = useMemo(
    () => Array.from({ length: DUST }, () => ({ p: new Vector3(), v: new Vector3(), life: 0 })),
    [],
  );
  const next = useRef(0);
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt * emit.current;
    while (acc.current > 0.06) {
      acc.current -= 0.06;
      const pt = parts[next.current];
      next.current = (next.current + 1) % DUST;
      _right.crossVectors(runtime.pos, runtime.forward);
      pt.p
        .copy(runtime.pos)
        .multiplyScalar(1.002)
        .addScaledVector(runtime.forward, -0.006)
        .addScaledVector(_right, (Math.random() - 0.5) * 0.008);
      pt.v
        .copy(runtime.pos)
        .multiplyScalar(0.01 + Math.random() * 0.01)
        .addScaledVector(_right, (Math.random() - 0.5) * 0.01)
        .addScaledVector(runtime.forward, -0.006);
      pt.life = 1;
    }
    const pos = geom.attributes.position as BufferAttribute;
    const alpha = geom.attributes.alpha as BufferAttribute;
    parts.forEach((pt, i) => {
      if (pt.life > 0) {
        pt.life -= dt * 1.8;
        pt.p.addScaledVector(pt.v, dt);
      }
      pos.setXYZ(i, pt.p.x, pt.p.y, pt.p.z);
      alpha.setX(i, Math.max(0, pt.life));
    });
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
  });
  return (
    <points geometry={geom} frustumCulled={false} raycast={() => null}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute float alpha;
          varying float vA;
          void main() {
            vA = alpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (6.0 + (1.0 - alpha) * 10.0) * (2.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * vA * 0.45;
            gl_FragColor = vec4(vec3(0.85, 0.75, 0.6) * a, a);
          }`}
      />
    </points>
  );
}

export function PlayerCharacter() {
  const config = useAppStore((s) => s.character);
  const travel = useAppStore((s) => s.travel);
  const camera = useThree((s) => s.camera);
  const group = useRef<Group>(null);
  const scaler = useRef<Group>(null);
  const balloon = useRef<Group>(null);
  const shadow = useRef<Group>(null);
  const anim = useRef<CharacterAnim>({ speed: 0 });
  const dustEmit = useRef(0);
  const shadowTex = useMemo(shadowTexture, []);
  const flight = useRef<{ from: Vector3; to: Vector3; t: number; dur: number; slug: string } | null>(null);
  const timers = useRef({ save: 0, arrival: 0 });
  const lastSaved = useRef(new Vector3());

  // Initialise from persisted position.
  useEffect(() => {
    const p = useAppStore.getState().position;
    latLngToVector3(p.lat, p.lng, 1, runtime.pos);
    resetForward();
    lastSaved.current.copy(runtime.pos);
  }, []);

  useEffect(() => {
    if (travel?.mode === 'fly') {
      const l = LOCATION_BY_SLUG[travel.slug];
      if (!l) return;
      const to = latLngToVector3(l.lat, l.lng);
      flight.current = {
        from: runtime.pos.clone(),
        to,
        t: 0,
        dur: flightDuration(runtime.pos, to),
        slug: l.slug,
      };
    } else {
      flight.current = null;
    }
  }, [travel]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const store = useAppStore.getState();
    let moving = 0;

    const f = flight.current;
    if (f) {
      // Real time (not the clamped physics dt) so flights take 3–6 s even at low fps.
      f.t = Math.min(1, f.t + Math.min(rawDt, 0.25) / f.dur);
      const e = easeInOut(f.t);
      const prev = _v2.copy(runtime.pos);
      greatCircleSlerp(f.from, f.to, e, runtime.pos);
      runtime.lift = Math.sin(Math.PI * e) * arcHeight(f.from, f.to);
      runtime.flying = true;
      const dir = tangent(_v.copy(f.to), runtime.pos, _v);
      if (dir.lengthSq() > 1e-10) turnToward(dir.normalize(), TURN * dt);
      else if (prev.distanceToSquared(runtime.pos) > 0)
        tangent(prev.negate().add(runtime.pos), runtime.pos, runtime.forward).normalize();
      if (f.t >= 1) {
        flight.current = null;
        runtime.lift = 0;
        runtime.flying = false;
        runtime.pos.copy(f.to);
        handleArrival(f.slug);
      }
    } else {
      runtime.flying = false;
      runtime.lift = Math.max(0, runtime.lift - dt);
      // Input (camera-relative): keyboard + joystick.
      let ix = runtime.joystick.x;
      let iy = runtime.joystick.y;
      const k = runtime.keys;
      if (k.has('w') || k.has('arrowup')) iy += 1;
      if (k.has('s') || k.has('arrowdown')) iy -= 1;
      if (k.has('d') || k.has('arrowright')) ix += 1;
      if (k.has('a') || k.has('arrowleft')) ix -= 1;
      const mag = Math.min(1, Math.hypot(ix, iy));
      if (mag > 0.08) {
        if (store.walkTarget) store.setWalkTarget(null);
        if (store.travel?.mode === 'walk') store.startTravel(null);
        _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        _v2.set(0, 1, 0).applyQuaternion(camera.quaternion);
        tangent(_right, runtime.pos, _right);
        tangent(_v2, runtime.pos, _v2);
        const desired = _v.set(0, 0, 0).addScaledVector(_right, ix).addScaledVector(_v2, iy);
        if (desired.lengthSq() > 1e-8) {
          desired.normalize();
          const off = turnToward(desired.clone(), TURN * dt);
          const run = runtime.run || runtime.joystick.x ** 2 + runtime.joystick.y ** 2 > 0.85;
          const sp = (run ? RUN : WALK) * mag * (off > 1.5 ? 0.3 : 1);
          step(sp * dt);
          moving = run ? 2 : 1;
        }
        runtime.lastInteraction = performance.now();
      } else if (store.walkTarget) {
        const target = latLngToVector3(store.walkTarget.lat, store.walkTarget.lng, 1, _v2);
        const remaining = runtime.pos.angleTo(target);
        if (remaining < 0.002) {
          store.setWalkTarget(null);
          if (store.travel?.mode === 'walk') store.startTravel(null);
        } else {
          const dir = tangent(_v.copy(target), runtime.pos, _v);
          if (dir.lengthSq() < 1e-12) dir.copy(runtime.forward);
          turnToward(dir.normalize(), TURN * dt);
          const run = remaining > 0.35;
          step(Math.min(remaining, (run ? RUN : WALK) * dt));
          moving = run ? 2 : 1;
        }
      }
    }

    runtime.speed += (moving - runtime.speed) * Math.min(1, dt * 8);
    anim.current.speed = runtime.speed;
    anim.current.riding = runtime.flying;
    dustEmit.current = !runtime.flying && moving > 0 ? moving : 0;

    // Place & orient on the surface: up = normal, +Z = forward.
    // When zoomed out the orbit camera looks straight down, so the chibi leans
    // toward the camera (pivoting at the feet) to stay readable; fully upright
    // when close or in follow mode.
    const g = group.current;
    if (g) {
      g.position.copy(runtime.pos).multiplyScalar(1 + runtime.lift);
      const camDist = effectiveDistance(camera);
      const lean = store.cameraMode === 'follow' ? 0 : Math.min(0.62, Math.max(0, (camDist - 1.35) * 0.5));
      _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      tangent(_up, runtime.pos, _up);
      if (_up.lengthSq() > 1e-8) _up.normalize();
      _up
        .multiplyScalar(lean)
        .addScaledVector(runtime.pos, 1 - lean)
        .normalize();
      _fwd.copy(runtime.forward).addScaledVector(_up, -runtime.forward.dot(_up)).normalize();
      _right.crossVectors(_up, _fwd).normalize();
      _m.makeBasis(_right, _up, _fwd);
      g.quaternion.setFromRotationMatrix(_m);
    }
    // Chibi charm: the explorer grows when zoomed out so it stays readable.
    if (scaler.current) {
      const d = effectiveDistance(camera);
      const boost = (camera as PerspectiveCamera).aspect < 0.8 ? 1.35 : 1;
      const target = CHARACTER_SCALE * boost * Math.min(3, Math.max(0.55, (d - 1) * 1.3));
      scaler.current.scale.setScalar(
        scaler.current.scale.x + (target - scaler.current.scale.x) * Math.min(1, dt * 6),
      );
    }
    if (balloon.current) {
      const show = runtime.flying || runtime.lift > 0.001;
      balloon.current.visible = show;
    }
    if (shadow.current) {
      shadow.current.position.copy(runtime.pos).multiplyScalar(1.0015);
      _right.crossVectors(runtime.pos, runtime.forward).normalize();
      _m.makeBasis(_right, runtime.pos, runtime.forward);
      shadow.current.quaternion.setFromRotationMatrix(_m);
      shadow.current.scale.setScalar(
        ((scaler.current?.scale.x ?? CHARACTER_SCALE) / CHARACTER_SCALE) * (1 + runtime.lift * 6),
      );
      shadow.current.visible = runtime.lift < 0.08;
    }

    // Arrival detection + persistence (throttled).
    timers.current.arrival += dt;
    if (timers.current.arrival > 0.2 && !runtime.flying) {
      timers.current.arrival = 0;
      for (const l of LOCATIONS) {
        if (runtime.pos.angleTo(latLngToVector3(l.lat, l.lng, 1, _v)) < ARRIVAL_RAD) {
          if (!store.visited[l.slug] || store.travel?.slug === l.slug) handleArrival(l.slug);
        }
      }
    }
    timers.current.save += dt;
    if (timers.current.save > 2 && lastSaved.current.distanceToSquared(runtime.pos) > 1e-8) {
      timers.current.save = 0;
      lastSaved.current.copy(runtime.pos);
      store.setPosition(vector3ToLatLng(runtime.pos));
    }
  });

  return (
    <>
      <group ref={group}>
        <group ref={scaler} scale={CHARACTER_SCALE}>
          <CharacterModel config={config} anim={anim} />
          <group ref={balloon} visible={false} scale={0.8}>
            <Balloon />
          </group>
        </group>
      </group>
      <group ref={shadow}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={3}>
          <circleGeometry args={[0.028, 24]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} raycast={() => null} renderOrder={4}>
          <ringGeometry args={[0.017, 0.022, 40]} />
          <meshBasicMaterial
            color={[0.45, 1.1, 2]}
            transparent
            opacity={0.6}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <Dust emit={dustEmit} />
    </>
  );
}
