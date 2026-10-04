import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { LOCATION_BY_SLUG } from './data';
import { registerNavigate } from './lib/nav';
import { track } from './lib/analytics';
import { Scene } from './scene/Scene';
import { useAppStore } from './store/useAppStore';
import { BottomNav, MobileHeader } from './ui/BottomNav';
import { useCoarsePointer, useIsDesktop, useKeyboardMovement, useReducedMotion } from './ui/hooks';
import { JourneyCard } from './ui/JourneyCard';
import { Joystick } from './ui/Joystick';
import { ListView } from './ui/ListView';
import { LoadingScreen } from './ui/LoadingScreen';
import { LocationPanel } from './ui/LocationPanel';
import { MapControls } from './ui/MapControls';
import { Onboarding } from './ui/Onboarding';
import { SearchBar } from './ui/SearchBar';
import { Sidebar } from './ui/Sidebar';
import { Toasts } from './ui/Toasts';

const CharacterEditor = lazy(() => import('./pages/CharacterEditor'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const ToursPage = lazy(() => import('./pages/ToursPage'));
const PassportPage = lazy(() => import('./pages/PassportPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

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
  const coarse = useCoarsePointer();
  const selected = useAppStore((s) => s.selectedSlug);
  const setListView = useAppStore((s) => s.setListView);
  useKeyboardMovement();

  useEffect(() => registerNavigate((to) => navigate(to)), [navigate]);
  const webgl = typeof document !== 'undefined' && hasWebGL();
  useEffect(() => {
    if (!webgl) setListView(true);
  }, [webgl, setListView]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05080F]">
      <main className="absolute inset-0" aria-label="Movie Globe">
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
            <div className="absolute top-4 left-1/2 z-20 w-[min(440px,40vw)] -translate-x-1/2">
              {!selected && <SearchBar />}
            </div>
            <MapControls
              className={`absolute bottom-6 z-20 transition-all ${selected ? 'right-[452px] xl:right-[min(792px,calc(100vw-268px))]' : 'right-6'}`}
            />
            <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-[10px] text-slate-500">
              Movie Globe is not affiliated with Trip.com or any film studio.
            </p>
          </>
        ) : (
          <>
            <MobileHeader />
            {!selected && <MapControls className="absolute right-4 bottom-28 z-20" />}
            {!selected && coarse && <Joystick className="absolute bottom-28 left-4 z-20" />}
            {!selected && <BottomNav />}
          </>
        )}

        <div
          className={`absolute inset-x-0 z-[35] flex justify-center px-4 ${desktop ? 'top-20' : 'top-20'}`}
        >
          <JourneyCard hideFor={desktop ? selected : null} />
        </div>

        <Routes>
          <Route path="/" element={null} />
          <Route path="/location/:slug" element={<LocationRoute desktop={desktop} />} />
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
              <Suspense fallback={null}>
                <SavedPage />
              </Suspense>
            }
          />
          <Route
            path="/tours"
            element={
              <Suspense fallback={null}>
                <ToursPage />
              </Suspense>
            }
          />
          <Route
            path="/passport"
            element={
              <Suspense fallback={null}>
                <PassportPage />
              </Suspense>
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
