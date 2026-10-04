import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, type Camera } from 'three';
import { pickPoint } from '../lib/places';
import { useAppStore } from '../store/useAppStore';
import { indexPlaces, nearestPlaces, type IndexedPlace, type NearbyPlace } from './nearby';
import { runtime } from './runtime';
import { effectiveDistance } from './view';

interface Ranked {
  place: IndexedPlace;
  km: number;
}

interface Placement {
  dx: number; // label offset from its anchor, px
  dy: number;
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const _cam = new Vector3();
const _p = new Vector3();
const ROW = 34;

const labelWidth = (name: string) => 58 + name.length * 6.6;
const overlaps = (a: Rect, list: Rect[]) =>
  list.some((t) => a.x0 < t.x1 && a.x1 > t.x0 && a.y0 < t.y1 && a.y1 > t.y0);

/**
 * Screen-space layout: each label sits above its place if free; otherwise it
 * slides into a callout column beside the explorer (with a leader line).
 * Labels that can't be placed without overlapping are dropped.
 */
function layout(
  ranked: Ranked[],
  camera: Camera,
  size: { width: number; height: number },
  max: number,
  lift: number,
): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const toScreen = (v: Vector3) => ({
    x: (v.x * 0.5 + 0.5) * size.width,
    y: (-v.y * 0.5 + 0.5) * size.height,
  });
  _cam.copy(camera.position);
  const len = _cam.length();
  _cam.normalize();
  const ch = toScreen(
    _p
      .copy(runtime.pos)
      .multiplyScalar(1.02 + runtime.lift)
      .project(camera),
  );
  const W = size.width;
  const H = size.height;
  const mobile = W < 1024;
  const taken: Rect[] = [
    { x0: ch.x - 34, x1: ch.x + 34, y0: ch.y - 92, y1: ch.y + 18 }, // the explorer
    // On-screen UI: zoom/locate column (right), joystick + bottom bar, sidebar.
    mobile ? { x0: W - 72, x1: W, y0: H - 330, y1: H } : { x0: W - 84, x1: W, y0: H - 230, y1: H },
    mobile ? { x0: W / 2 - 70, x1: W / 2 + 70, y0: H - 250, y1: H } : { x0: 0, x1: 250, y0: 0, y1: H },
  ];
  const top = mobile ? 135 : 120;
  const bottom = mobile ? H - 100 : H - 20;
  const rectAt = (cx: number, bottom: number, w: number): Rect => ({
    x0: cx - w / 2 - 3,
    x1: cx + w / 2 + 3,
    y0: bottom - 30,
    y1: bottom + 2,
  });
  const inView = (r: Rect) => r.x0 > 4 && r.x1 < W - 4 && r.y0 > top && r.y1 < bottom;

  for (const r of ranked) {
    if (out.size >= max) break;
    if (r.place.v.dot(_cam) < 1 / len + 0.015) continue; // behind the globe
    _p.copy(r.place.v).multiplyScalar(lift).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1.1 || Math.abs(_p.y) > 1.1) continue;
    const a = toScreen(_p);
    const w = labelWidth(r.place.n);
    // 1) directly above the place  2) callout slots beside the explorer, nearest side first.
    const slots: { x: number; y: number }[] = [{ x: a.x, y: a.y - 8 }];
    const sides = a.x >= ch.x ? [1, -1] : [-1, 1];
    for (let k = 0; k < 6; k++)
      for (const side of sides)
        slots.push({
          x: ch.x + side * (40 + w / 2),
          y: ch.y - 50 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ROW,
        });
    for (const s of slots) {
      const rect = rectAt(s.x, s.y, w);
      if (!inView(rect) || overlaps(rect, taken)) continue;
      taken.push(rect);
      out.set(r.place.id, { dx: s.x - a.x, dy: s.y - a.y });
      break;
    }
  }
  return out;
}

/**
 * Pops up major landmarks, capitals and big cities around the explorer as it
 * moves — in the top-down orbit view and the follow (first-person-style) view.
 * Data: curated landmarks + Natural Earth cities, lazy-loaded (~25 KB gz).
 */
export function NearbyLandmarks() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const follow = cameraMode === 'follow';
  const lift = follow ? 1.03 : 1.012;
  const [all, setAll] = useState<IndexedPlace[] | null>(null);
  const [shown, setShown] = useState<Ranked[]>([]);
  const placements = useRef(new Map<string, Placement>());
  const timer = useRef(1);
  const key = useRef('');

  useEffect(() => {
    let alive = true;
    void import('../data/places.json').then((m) => alive && setAll(indexPlaces(m.default as NearbyPlace[])));
    return () => {
      alive = false;
    };
  }, []);

  useFrame((_, dt) => {
    if (!all) return;
    const max = follow ? 6 : 5;
    // Re-layout the current labels every frame so they track the camera.
    placements.current = layout(shown, camera, size, max, lift);
    timer.current += Math.min(dt, 0.5);
    if (timer.current < 0.35) return;
    timer.current = 0;
    // Wider search when zoomed out, tighter in the close-up follow view.
    const radius = follow ? 450 : Math.min(1600, Math.max(250, (effectiveDistance(camera) - 1) * 650));
    const candidates = nearestPlaces(all, runtime.pos, radius, 24);
    const fitted = layout(candidates, camera, size, max, lift);
    const list = candidates.filter((c) => fitted.has(c.place.id));
    const k = list.map((x) => `${x.place.id}@${Math.round(x.km / 10)}`).join('|');
    if (k !== key.current) {
      key.current = k;
      setShown(list);
    }
  });

  return (
    <>
      {shown.map((s) => (
        <NearbyLabel key={s.place.id} place={s.place} km={s.km} lift={lift} placements={placements} />
      ))}
    </>
  );
}

function NearbyLabel({
  place,
  km,
  lift,
  placements,
}: {
  place: IndexedPlace;
  km: number;
  lift: number;
  placements: React.RefObject<Map<string, Placement>>;
}) {
  const label = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const anchor = useMemo(() => place.v.clone().multiplyScalar(lift), [place.v, lift]);
  const appMode = useAppStore((s) => s.appMode);

  useFrame(() => {
    const p = placements.current?.get(place.id);
    if (!root.current || !label.current || !line.current) return;
    root.current.style.visibility = p ? 'visible' : 'hidden';
    if (!p) return;
    label.current.style.transform = `translate(calc(-50% + ${p.dx}px), calc(-100% + ${p.dy}px))`;
    const callout = Math.hypot(p.dx, p.dy + 8) > 6;
    line.current.setAttribute('x2', String(p.dx));
    line.current.setAttribute('y2', String(p.dy));
    line.current.style.opacity = callout ? '0.7' : '0';
  });

  const isLandmark = place.k === 'landmark';
  return (
    <Html position={anchor} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={root} className="relative" style={{ visibility: 'hidden' }}>
        <svg
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width="1"
          height="1"
          aria-hidden="true"
        >
          <line
            ref={line}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke={isLandmark ? '#FCD34D' : '#7DD3FC'}
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        </svg>
        <span
          className={`absolute -top-1 -left-1 h-2 w-2 rounded-full ${isLandmark ? 'bg-amber-300' : 'bg-sky-300'} shadow-[0_0_8px_2px_rgba(255,255,255,0.35)]`}
        />
        <div ref={label} className="absolute top-0 left-0" style={{ transform: 'translate(-50%, -100%)' }}>
          <button
            type="button"
            onClick={() => {
              if (appMode === 'normal') pickPoint(place.lat, place.lng, `${place.n}, ${place.c}`);
              else
                useAppStore
                  .getState()
                  .toast({ title: `${place.i} ${place.n}`, body: `${place.c} · ${Math.round(km)} km away` });
            }}
            title={appMode === 'normal' ? 'Plan a trip here' : place.n}
            aria-label={`${place.n}, ${place.c}, ${Math.round(km)} kilometres away`}
            data-testid="nearby-landmark"
            className={`animate-pop pointer-events-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 whitespace-nowrap shadow-lg shadow-black/40 backdrop-blur-md ${
              isLandmark
                ? 'border-amber-300/40 bg-[#2A1F0B]/85 text-amber-100'
                : 'border-white/15 bg-[#121A2B]/85 text-slate-100'
            }`}
          >
            <span aria-hidden="true" className="text-sm">
              {place.i}
            </span>
            <span className="text-[11px] font-semibold">{place.n}</span>
            <span className="text-[10px] text-slate-400">{km < 1 ? 'here' : `${Math.round(km)} km`}</span>
          </button>
        </div>
      </div>
    </Html>
  );
}
