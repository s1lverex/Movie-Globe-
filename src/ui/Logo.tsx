import { useBrand } from '../lib/brand';

export function Logo({ compact = false }: { compact?: boolean }) {
  const { name, tagline } = useBrand();
  return (
    <div className="flex items-center gap-3">
      <img src="/favicon.svg" alt="" className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <div className="leading-tight">
        <div
          className={`font-display font-bold text-white ${compact ? 'text-lg' : 'text-xl'}`}
          data-testid="brand-name"
        >
          {name}
        </div>
        <div className="text-[11px] whitespace-nowrap text-slate-400">{tagline}</div>
      </div>
    </div>
  );
}
