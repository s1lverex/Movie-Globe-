import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LOCATION_BY_SLUG } from './data';
import { registerNavigate } from './lib/nav';
import { initAccount } from './lib/account';
import { track } from './lib/analytics';
import { Scene } from './scene/Scene';
import { useAppStore } from './store/useAppStore';
import { BottomNav, MobileHeader } from './ui/BottomNav';
import { useTouchDevice, useIsDesktop, useKeyboardMovement, useReducedMotion } from './ui/hooks';
import { JourneyCard } from './ui/JourneyCard';
import { Joystick } from './ui/Joystick';
import { ListView } from './ui/ListView';
import { LoadingScreen } from './ui/LoadingScreen';
import { LocationPanel } from './ui/LocationPanel';
import { MapControls } from './ui/MapControls';
import { Onboarding } from './ui/Onboarding';
import { SearchBar } from './ui/SearchBar';
import { ModeToggle } from './ui/ModeToggle';
import { PlacePanel } from './ui/PlacePanel';
import { switchMode, useEnsureMode } from './lib/mode';
import { useBrand, useDocumentTitle } from './lib/brand';
import type { AppMode } from './store/useAppStore';
import { Sidebar } from './ui/Sidebar';
import { Toasts } from './ui/Toasts';

const CharacterEditor = lazy(() => import('./pages/CharacterEditor'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const ToursPage = lazy(() => import('./pages/ToursPage'));
const PassportPage = lazy(() => import('./pages/PassportPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const TravelSummaryPage = lazy(() => import('./pages/TravelSummaryPage'));

/** Mode-specific pages switch the app into their mode (supports deep links). */
function ModeGate({ mode, children }: { mode: AppMode; children: ReactNode }) {
  useEnsureMode(mode);
  return <Suspense fallback={null}>{children}</Suspense>;
}

function PlaceRoute({ desktop }: { desktop: boolean }) {
  const { id = '' } = useParams();
  useEnsureMode('normal');
  return <PlacePanel key={id} id={id} desktop={desktop} />;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    useAppStore.getState().setListView(true);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
          The 3D globe couldn’t start on this device. Use the list view to explore locations.
        </div>
      );
    return this.props.children;
  }
}

function LocationRoute({ desktop }: { desktop: boolean }) {
  const { slug = '' } = useParams();
  const loc = LOCATION_BY_SLUG[slug];
  const select = useAppStore((s) => s.select);
  const camera = useAppStore((s) => s.camera);
  const toast = useAppStore((s) => s.toast);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loc) {
      toast({ title: 'Location not found', body: slug });
      navigate('/', { replace: true });
      return;
    }
    switchMode('movie', { silent: true, keepRoute: true });
    select(loc.slug);
    if (useAppStore.getState().travel?.mode !== 'fly')
      camera({ type: 'focus', lat: loc.lat - (desktop ? 0 : 6), lng: loc.lng + (desktop ? 12 : 0) });
    track('open_location', { slug: loc.slug });
    return () => select(null);
  }, [loc, slug, select, camera, toast, navigate, desktop]);

  if (!loc) return null;
  return <LocationPanel loc={loc} desktop={desktop} />;
}

export default function App() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const reducedMotion = useReducedMotion();
  const touch = useTouchDevice();
  const { pathname } = useLocation();
  const selected = /^\/(location|place)\//.test(pathname) ? pathname : null;
  // The Travel Summary replay takes over the screen: hide the live controls.
  const replaying = pathname === '/summary';
  const overlay = /^\/(saved|tours|trips|account)$/.test(pathname)
    ? 'narrow'
    : /^\/(passport|about)$/.test(pathname)
      ? 'wide'
      : null;
  const setListView = useAppStore((s) => s.setListView);
  useKeyboardMovement();
  useDocumentTitle();
  const brand = useBrand();
  const appMode = useAppStore((s) => s.appMode);

  useEffect(() => registerNavigate((to) => navigate(to)), [navigate]);
  useEffect(() => void initAccount(), []);
  const webgl = typeof document !== 'undefined' && hasWebGL();
  useEffect(() => {
    if (!webgl) setListView(true);
  }, [webgl, setListView]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05080F]">
      <main className="absolute inset-0" aria-label={brand.name}>
        {webgl ? (
          <SceneBoundary>
            <Scene reducedMotion={reducedMotion} />
          </SceneBoundary>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
            WebGL is unavailable – showing the list view.
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute inset-0">
        {desktop ? (
          <>
            <Sidebar />
            {!replaying && (
              <>
                <div
                  className={`absolute top-4 z-20 flex flex-col items-center gap-2 ${
                    overlay === 'narrow'
                      ? 'left-[700px]'
                      : overlay === 'wide'
                        ? 'left-[840px]'
                        : selected
                          ? 'left-64'
                          : 'left-1/2 w-[min(440px,40vw)] -translate-x-1/2'
                  }`}
                >
                  {pathname !== '/character' && <ModeToggle />}
                  {!selected && !overlay && pathname !== '/character' && <SearchBar className="w-full" />}
                </div>
                <MapControls
                  className={`absolute bottom-6 z-20 transition-all ${selected ? 'right-[452px] xl:right-[min(792px,calc(100vw-268px))]' : 'right-6'}`}
                />
                {touch && !selected && (
                  <Joystick className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2" />
                )}
              </>
            )}
            <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-[10px] text-slate-500">
              {brand.name} is not affiliated with Trip.com{appMode === 'movie' ? ' or any film studio' : ''}.
            </p>
          </>
        ) : (
          <>
            {!replaying && (
              <>
                <MobileHeader />
                <div className="absolute inset-x-0 top-[72px] z-30 flex justify-center">
                  <ModeToggle />
                </div>
                {!selected && <MapControls className="absolute right-4 bottom-28 z-20" />}
                {!selected && <Joystick className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2" />}
                {!selected && <BottomNav />}
              </>
            )}
          </>
        )}

        <div
          className={`absolute inset-x-0 z-[35] flex justify-center px-4 ${desktop ? 'top-36' : 'top-32'}`}
        >
          {!replaying && <JourneyCard hideFor={desktop && selected ? selected.split('/')[2] : null} />}
        </div>

        <Routes>
          <Route path="/" element={null} />
          <Route path="/location/:slug" element={<LocationRoute desktop={desktop} />} />
          <Route path="/place/:id" element={<PlaceRoute desktop={desktop} />} />
          <Route
            path="/summary"
            element={
              <Suspense fallback={null}>
                <TravelSummaryPage />
              </Suspense>
            }
          />
          <Route
            path="/account"
            element={
              <Suspense fallback={null}>
                <AccountPage />
              </Suspense>
            }
          />
          <Route
            path="/trips"
            element={
              <ModeGate mode="normal">
                <TripsPage />
              </ModeGate>
            }
          />
          <Route
            path="/character"
            element={
              <Suspense fallback={null}>
                <CharacterEditor />
              </Suspense>
            }
          />
          <Route
            path="/saved"
            element={
              <ModeGate mode="movie">
                <SavedPage />
              </ModeGate>
            }
          />
          <Route
            path="/tours"
            element={
              <ModeGate mode="movie">
                <ToursPage />
              </ModeGate>
            }
          />
          <Route
            path="/passport"
            element={
              <ModeGate mode="movie">
                <PassportPage />
              </ModeGate>
            }
          />
          <Route
            path="/about"
            element={
              <Suspense fallback={null}>
                <AboutPage />
              </Suspense>
            }
          />
          <Route path="*" element={null} />
        </Routes>
        <ListView />
        <Onboarding />
        <Toasts />
      </div>
      {webgl && <LoadingScreen />}
    </div>
  );
}
