import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Menu, Navigation2, Stamp, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { JourneyBar } from './JourneyBar';
import { NavItems } from './Sidebar';
import { SettingsToggles } from './Settings';

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-[#0B1220] via-[#0B1220]/70 to-transparent px-4 pt-[max(env(safe-area-inset-top),12px)] pb-6">
        <Logo compact />
        <button
          type="button"
          className="icon-btn"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
      </header>
      {open && (
        <div className="pointer-events-auto fixed inset-0 z-[80] bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="animate-slide-up absolute inset-y-0 right-0 flex w-72 flex-col gap-6 bg-[#0E1626] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Logo compact />
              <button
                type="button"
                className="icon-btn"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <SettingsToggles vertical />
            <div className="mt-auto">
              <JourneyBar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BottomNav() {
  const character = useAppStore((s) => s.character);
  const setListView = useAppStore((s) => s.setListView);
  const mode = useAppStore((s) => s.appMode);
  return (
    <nav
      aria-label="Quick actions"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/80 to-transparent px-4 pt-6 pb-[max(env(safe-area-inset-bottom),14px)]"
    >
      <Link
        to="/character"
        aria-label="Customize character"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-white"
        data-tour="character"
      >
        <Avatar config={character} size={52} />
      </Link>
      <button
        type="button"
        className="btn-primary max-w-56 flex-1 rounded-full py-3.5"
        onClick={() => setListView(true)}
      >
        <Navigation2 size={18} className="rotate-45" aria-hidden="true" /> Explore
      </button>
      {mode === 'movie' ? (
        <Link to="/passport" aria-label="Passport" className="icon-btn h-[52px] w-[52px]">
          <Stamp size={20} />
        </Link>
      ) : (
        <Link to="/trips" aria-label="My trips" className="icon-btn h-[52px] w-[52px]">
          <BookOpen size={20} />
        </Link>
      )}
    </nav>
  );
}
