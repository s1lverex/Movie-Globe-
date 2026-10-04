import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { greatCircleSlerp, latLngToVector3, vector3ToLatLng } from '../lib/geo';
import { formatDate, TRANSPORT_COLOR, TRANSPORT_META, type SummaryLeg, type Transport } from '../lib/summary';
import { tickSummary, useSummary } from '../lib/summaryPlayer';
import { useAppStore } from '../store/useAppStore';
import { arcPoint, easeInOut } from './arc';

const N = 64;

/** Point along a leg: planes arc up into the sky, surface transport hugs the globe. */
function legPoint(leg: SummaryLeg, t: number, out: Vector3): Vector3 {
  const a = latLngToVector3(leg.from.lat, leg.from.lng);
  const b = latLngToVector3(leg.to.lat, leg.to.lng);
  if (leg.transport === 'plane') return arcPoint(a, b, t, out, 1.006);
  return greatCircleSlerp(a, b, t, out).multiplyScalar(1.006);
}

function legPoints(leg: SummaryLeg, upTo = 1): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i < N; i++) pts.push(legPoint(leg, (i / (N - 1)) * upTo, new Vector3()));
  return pts;
}

function DoneLeg({ leg }: { leg: SummaryLeg }) {
  const pts = useMemo(() => legPoints(leg), [leg]);
  return (
    <Line
      points={pts}
      color={TRANSPORT_COLOR[leg.transport]}
      lineWidth={2}
      dashed={leg.transport === 'boat'}
      dashSize={0.015}
      gapSize={0.01}
      transparent
      opacity={0.8}
      depthWrite={false}
      toneMapped={false}
    />
  );
}

/** Replays the user's travel history on the globe (see lib/summaryPlayer). */
export function SummaryLayer() {
  const { open, ready, stops, legs, step, phase } = useSummary();
  const line = useRef<Line2>(null);
  const vehiclePos = useRef(new Vector3());
  const flat = useMemo(() => new Float32Array(N * 3), []);
  const initial = useMemo(() => Array.from({ length: N }, () => new Vector3()), []);
  const camTimer = useRef(0);
  const current = phase === 'travel' ? legs[step - 1] : undefined;

  useFrame((_, dt) => {
    if (!open || !ready) return;
    tickSummary(Math.min(dt, 0.25));
    const st = useSummary.getState();
    const leg = st.phase === 'travel' ? st.legs[st.step - 1] : undefined;
    if (!leg) return;
    const e = easeInOut(st.t);
    legPoint(leg, e, vehiclePos.current);
    if (line.current) {
      const tmp = new Vector3();
      for (let i = 0; i < N; i++) {
        legPoint(leg, (i / (N - 1)) * e, tmp);
        flat.set([tmp.x, tmp.y, tmp.z], i * 3);
      }
      line.current.geometry.setPositions(flat);
    }
    // Camera follows the vehicle, pulled back for long hauls.
    camTimer.current += dt;
    if (camTimer.current > 0.2) {
      camTimer.current = 0;
      const p = vector3ToLatLng(vehiclePos.current);
      const distance = Math.min(3.4, 1.9 + leg.km / 6000) + (leg.transport === 'plane' ? 0.2 : 0);
      useAppStore.getState().camera({ type: 'focus', lat: p.lat - 4, lng: p.lng, distance });
    }
  });

  if (!open || !ready || stops.length === 0) return null;
  const doneLegs = legs.slice(0, phase === 'travel' ? step - 1 : step);
  const visibleStops = stops.slice(0, phase === 'travel' ? step : step + 1);

  return (
    <group>
      {doneLegs.map((l) => (
        <DoneLeg key={`${l.from.id}>${l.to.id}`} leg={l} />
      ))}
      {current && (
        <>
          <Line
            key={`cur-${step}`}
            ref={line}
            points={initial}
            color={TRANSPORT_COLOR[current.transport]}
            lineWidth={3}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
          <VehicleMarker key={`veh-${step}`} pos={vehiclePos} transport={current.transport} />
        </>
      )}
      {visibleStops.map((s, i) => (
        <Html
          key={s.id}
          position={latLngToVector3(s.lat, s.lng, 1.01)}
          zIndexRange={[25, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="flex -translate-x-1/2 -translate-y-full flex-col items-center"
            data-testid="summary-stop-marker"
          >
            <div
              className={`animate-pop flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-lg ${
                i === step && phase !== 'travel'
                  ? 'border-white/60 bg-accent text-white'
                  : 'border-white/15 bg-[#121A2B]/85 text-slate-200'
              }`}
            >
              <span className="rounded-full bg-white/15 px-1.5">{i + 1}</span>
              {s.icon} {formatDate(s.time)}
            </div>
            <span className="mt-0.5 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_3px_rgba(156,194,255,0.7)]" />
          </div>
        </Html>
      ))}
    </group>
  );
}

function VehicleMarker({ pos, transport }: { pos: React.RefObject<Vector3>; transport: Transport }) {
  const group = useRef<import('three').Group>(null);
  useFrame(() => {
    if (group.current && pos.current) group.current.position.copy(pos.current);
  });
  return (
    <group ref={group}>
      <Html center zIndexRange={[40, 30]} style={{ pointerEvents: 'none' }}>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[#0B1220]/90 text-2xl shadow-xl"
          style={{
            borderColor: TRANSPORT_COLOR[transport],
            boxShadow: `0 0 18px ${TRANSPORT_COLOR[transport]}`,
          }}
          data-testid="summary-vehicle"
          aria-label={TRANSPORT_META[transport].label}
        >
          {TRANSPORT_META[transport].icon}
        </div>
      </Html>
    </group>
  );
}
