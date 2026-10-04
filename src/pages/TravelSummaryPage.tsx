import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { formatKm } from '../lib/geo';
import { navigate } from '../lib/nav';
import { formatDate, TRANSPORT_COLOR, TRANSPORT_META, TRANSPORTS, type SummaryLeg } from '../lib/summary';
import {
  closeSummary,
  goToStop,
  openSummary,
  replay,
  useSummary,
  type SummaryFilter,
} from '../lib/summaryPlayer';

const FILTERS: { id: SummaryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trip', label: 'My trips' },
  { id: 'film', label: 'Film locations' },
];

function legLine(leg: SummaryLeg) {
  const m = TRANSPORT_META[leg.transport];
  return `${m.icon} ${m.verb} ${formatKm(leg.km)} from ${leg.from.name.split(',')[0]}`;
}

/** Travel Summary: an animated replay of every place the user has visited. */
export default function TravelSummaryPage() {
  const { ready, filter, stops, legs, stats, step, phase, t, playing, speed } = useSummary();

  useEffect(() => {
    void openSummary();
    return () => closeSummary();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
      if (e.key === ' ') {
        e.preventDefault();
        useSummary.setState((s) => ({ playing: !s.playing }));
      }
      if (e.key === 'ArrowRight') goToStop(useSummary.getState().step + 1);
      if (e.key === 'ArrowLeft') goToStop(useSummary.getState().step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stop = stops[step];
  const arriving = phase === 'travel' ? legs[step - 1] : undefined;
  const cameFrom = step > 0 ? legs[step - 1] : undefined;

  return (
    <section
      className="pointer-events-none fixed inset-0 z-[45] flex flex-col lg:left-72"
      role="dialog"
      aria-label="Travel Summary"
      data-testid="travel-summary"
    >
      {/* Header */}
      <div className="pointer-events-auto flex items-start justify-between gap-2 bg-gradient-to-b from-[#0B1220] via-[#0B1220]/80 to-transparent px-4 pt-[max(env(safe-area-inset-top),14px)] pb-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Travel Summary</h2>
          <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Show">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => void openSummary(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === f.id ? 'bg-accent text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close Travel Summary"
          onClick={() => navigate('/')}
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="pointer-events-auto mx-auto w-full max-w-xl space-y-3 px-3 pb-[max(env(safe-area-inset-bottom),14px)]">
        {ready && stops.length === 0 && (
          <div className="glass animate-pop rounded-3xl p-5 text-center" data-testid="summary-empty">
            <div className="text-3xl">🧳</div>
            <p className="mt-2 font-semibold text-white">No travel history yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Visit places to build your story: mark trips as “Been here” or travel to them in Normal Mode, or
              collect film-location stamps in Movie Mode.
            </p>
          </div>
        )}

        {ready && stop && phase !== 'finale' && (
          <>
            {arriving ? (
              <div
                key={`travel-${step}`}
                className="glass animate-pop rounded-3xl p-4"
                data-testid="summary-travel-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: `${TRANSPORT_COLOR[arriving.transport]}33` }}
                  >
                    {TRANSPORT_META[arriving.transport].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] tracking-wide text-slate-400 uppercase">
                      By {TRANSPORT_META[arriving.transport].label.toLowerCase()}
                      {arriving.inferred ? ' (estimated)' : ''} · {formatKm(arriving.km)}
                    </div>
                    <div className="truncate text-sm font-semibold text-white">
                      {arriving.from.name.split(',')[0]} → {arriving.to.name.split(',')[0]}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${t * 100}%`, background: TRANSPORT_COLOR[arriving.transport] }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`stop-${step}`}
                className="glass animate-pop rounded-3xl p-4"
                data-testid="summary-stop-card"
              >
                <div className="flex items-center justify-between text-[11px] tracking-wide text-slate-400 uppercase">
                  <span>
                    Stop {step + 1} of {stops.length}
                  </span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[#9CC2FF] normal-case">
                    📅 {formatDate(stop.time)}
                  </span>
                </div>
                <div className="mt-1 flex items-start gap-2">
                  <span className="text-2xl" aria-hidden="true">
                    {stop.icon}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="font-display text-xl leading-tight font-bold text-white"
                      data-testid="summary-stop-name"
                    >
                      {stop.name}
                    </div>
                    <div className="text-xs text-slate-400">{stop.subtitle}</div>
                  </div>
                </div>
                {cameFrom && (
                  <p className="mt-2 text-sm text-slate-200" data-testid="summary-leg">
                    {legLine(cameFrom)}
                    {cameFrom.inferred && <span className="text-slate-500"> · estimated</span>}
                  </p>
                )}
                {stop.notes && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-300 italic">“{stop.notes}”</p>
                )}
              </div>
            )}
          </>
        )}

        {ready && phase === 'finale' && stats && (
          <div className="glass animate-pop rounded-3xl p-5" data-testid="summary-finale">
            <div className="text-[11px] tracking-wide text-[#9CC2FF] uppercase">Your journey so far</div>
            {stats.first && stats.last && (
              <div className="text-xs text-slate-400">
                {formatDate(stats.first)} – {formatDate(stats.last)}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [stats.places, 'places'],
                [stats.countries, 'countries'],
                [Math.round(stats.km).toLocaleString(), 'km travelled'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/5 py-2">
                  <div className="font-display text-xl font-bold text-white">{v}</div>
                  <div className="text-[10px] text-slate-400">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-4 text-sm text-slate-200">
              {TRANSPORTS.map((m) => (
                <span key={m} title={TRANSPORT_META[m].label}>
                  {TRANSPORT_META[m].icon} {stats.byTransport[m]}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1 text-sm"
                onClick={replay}
                data-testid="summary-replay"
              >
                <RotateCcw size={14} /> Replay
              </button>
              <button
                type="button"
                className="btn-primary flex-1 py-2.5 text-sm"
                onClick={() => navigate('/')}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {ready && stops.length > 0 && (
          <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
            <button
              type="button"
              className="icon-btn h-9 w-9"
              aria-label="Previous stop"
              onClick={() => goToStop(step - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="icon-btn h-9 w-9 !bg-accent"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => (phase === 'finale' ? replay() : useSummary.setState({ playing: !playing }))}
              data-testid="summary-play"
            >
              {playing && phase !== 'finale' ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className="icon-btn h-9 w-9"
              aria-label="Next stop"
              onClick={() => goToStop(step + 1)}
            >
              <ChevronRight size={16} />
            </button>
            {/* Timeline */}
            <ol
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1"
              aria-label="Timeline"
            >
              {stops.map((s, i) => (
                <li key={s.id} className="flex items-center">
                  {i > 0 && (
                    <span
                      className="mx-0.5 h-0.5 w-3 rounded"
                      style={{
                        background:
                          i <= step ? TRANSPORT_COLOR[legs[i - 1].transport] : 'rgba(255,255,255,.15)',
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => goToStop(i)}
                    title={`${s.name} · ${formatDate(s.time)}`}
                    aria-label={`Stop ${i + 1}: ${s.name}, ${formatDate(s.time)}`}
                    aria-current={i === step ? 'step' : undefined}
                    className={`h-3 w-3 shrink-0 rounded-full transition ${
                      i === step
                        ? 'scale-125 bg-white ring-2 ring-accent'
                        : i < step
                          ? 'bg-accent'
                          : 'bg-white/25'
                    }`}
                  />
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200"
              aria-label={`Playback speed ${speed}x`}
              onClick={() => useSummary.setState({ speed: speed === 1 ? 2 : speed === 2 ? 4 : 1 })}
            >
              {speed}×
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
