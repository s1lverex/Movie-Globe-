import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export function LoadingScreen() {
  const { progress, active, total } = useProgress();
  const [hidden, setHidden] = useState(false);
  const done = !active && (total > 0 ? progress >= 100 : false);
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setHidden(true), 400);
      return () => clearTimeout(t);
    }
  }, [done]);
  if (hidden) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B1220] transition-opacity duration-500 ${done ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role="progressbar"
      aria-label="Loading the globe"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="loading"
    >
      <img src="/favicon.svg" alt="" className="h-20 w-20 animate-pulse" />
      <div className="mt-4 font-display text-2xl font-bold text-white">Movie Globe</div>
      <div className="text-sm text-slate-400">Walk the World. See the Movies.</div>
      <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">{Math.round(progress)}%</div>
    </div>
  );
}
