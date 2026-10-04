import { useEffect, useRef, useState } from 'react';
import { runtime } from '../scene/runtime';

/** Touch joystick writing a normalised vector into the shared runtime. */
/** `className` must position it (e.g. `absolute bottom-28 left-4`); defaults to `relative`. */
export function Joystick({ className = 'relative' }: { className?: string }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 44;

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    runtime.joystick.x = dx / R;
    runtime.joystick.y = -dy / R;
    runtime.lastInteraction = performance.now();
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    runtime.joystick.x = 0;
    runtime.joystick.y = 0;
  };
  // Never leave the explorer walking if the joystick disappears mid-drag.
  useEffect(
    () => () => {
      runtime.joystick.x = 0;
      runtime.joystick.y = 0;
    },
    [],
  );

  return (
    <div
      ref={base}
      className={`pointer-events-auto h-28 w-28 touch-none rounded-full border border-white/15 bg-[#121A2B]/50 backdrop-blur-md select-none ${className}`}
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
      role="application"
      aria-label="Movement joystick: drag to walk"
      data-tour="joystick"
      data-testid="joystick"
    >
      {/* direction ticks + label so it reads as a control */}
      <span className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-white/10" />
      <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold tracking-widest text-white/50">
        MOVE
      </span>
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-12 w-12 rounded-full bg-accent/80 shadow-lg shadow-accent/40 ring-2 ring-white/40"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
