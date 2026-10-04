export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/favicon.svg" alt="" className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <div className="leading-tight">
        <div className={`font-display font-bold text-white ${compact ? 'text-lg' : 'text-xl'}`}>
          Movie Globe
        </div>
        <div className="text-[11px] whitespace-nowrap text-slate-400">Walk the World. See the Movies.</div>
      </div>
    </div>
  );
}
