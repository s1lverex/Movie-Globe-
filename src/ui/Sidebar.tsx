import { NavLink } from 'react-router-dom';
import { NAV } from './nav';
import { Logo } from './Logo';
import { JourneyBar } from './JourneyBar';
import { SettingsToggles } from './Settings';

export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          data-tour={to === '/character' ? 'character' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-white ${
              isActive
                ? 'bg-accent/20 font-semibold text-[#8DB2FF]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-20 flex w-60 flex-col bg-gradient-to-r from-[#0B1220]/90 via-[#0B1220]/60 to-transparent p-5">
      <Logo />
      <div className="mt-8">
        <NavItems />
      </div>
      <div className="mt-auto space-y-3">
        <SettingsToggles vertical />
        <JourneyBar />
      </div>
    </aside>
  );
}
