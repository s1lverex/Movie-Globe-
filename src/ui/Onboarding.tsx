import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const STEPS = [
  {
    title: 'Welcome to Movie Globe 🎬',
    body: 'Spin the Earth and find glowing pins — each one is a real place where a famous film was shot.',
  },
  {
    title: 'Walk the world',
    body: 'Use WASD / arrow keys or the joystick to walk, or tap anywhere on the globe and your explorer will walk there.',
  },
  {
    title: 'Visit & collect stamps',
    body: 'Open a pin to Walk or Fly there. Arriving earns a passport stamp, and you can book a real trip on Trip.com.',
  },
];

export function Onboarding() {
  const done = useAppStore((s) => s.onboardingDone);
  const finish = useAppStore((s) => s.setOnboardingDone);
  const [i, setI] = useState(0);
  if (done) return null;
  const step = STEPS[i];
  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-28 z-[55] flex justify-center px-4 lg:bottom-8"
      role="dialog"
      aria-label="Getting started"
      data-testid="onboarding"
    >
      <div className="glass animate-slide-up w-full max-w-sm rounded-3xl p-5 shadow-2xl">
        <div className="mb-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-accent' : 'bg-white/10'}`} />
          ))}
        </div>
        <div className="text-[11px] text-slate-400">
          Step {i + 1} of {STEPS.length}
        </div>
        <h2 className="mt-1 font-display text-lg font-bold text-white">{step.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{step.body}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-ghost flex-1 text-sm" onClick={finish}>
            Skip
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2.5 text-sm"
            onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : finish())}
            data-testid="onboarding-next"
          >
            {i < STEPS.length - 1 ? 'Next' : "Let's go"}
          </button>
        </div>
      </div>
    </div>
  );
}
