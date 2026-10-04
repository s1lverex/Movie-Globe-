import { Suspense, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import type { DirectionalLight } from 'three';
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ACESFilmicToneMapping } from 'three';
import { latLngToVector3, vector3ToLatLng } from '../lib/geo';
import { useAppStore, useLowPower } from '../store/useAppStore';
import { Atmosphere } from './Atmosphere';
import { CameraRig } from './CameraRig';
import { PlayerCharacter } from './Character';
import { Clouds } from './Clouds';
import { Globe } from './Globe';
import { MoviePins, PlacePins } from './ModePins';
import { NearbyLandmarks } from './NearbyLandmarks';
import { SummaryLayer } from './SummaryLayer';
import { useSummary } from '../lib/summaryPlayer';
import { pickPoint } from '../lib/places';
import { Stars } from './Stars';
import { TravelArc } from './TravelArc';
import { runtime } from './runtime';
import { isPortrait } from './view';

function onSurfaceClick(e: ThreeEvent<MouseEvent>) {
  // Ignore drags (orbiting) — only treat taps/clicks as walk targets.
  if (e.delta > 6) return;
  e.stopPropagation();
  const s = useAppStore.getState();
  if (s.travel?.mode === 'fly') return;
  const p = vector3ToLatLng(e.point.clone().normalize());
  runtime.lastInteraction = performance.now();
  // Normal Mode: any spot on the globe becomes a place you can plan / travel to.
  if (s.appMode === 'normal') {
    pickPoint(p.lat, p.lng);
    return;
  }
  // Movie Mode: tap-to-walk.
  s.startTravel(null);
  s.setWalkTarget(p);
}

/** Key light that follows the camera so the character is always readable. */
function CameraLight() {
  const ref = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.copy(camera.position).add(camera.up);
  });
  return <directionalLight ref={ref} intensity={1.6} />;
}

export function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const lowPower = useLowPower();
  const appMode = useAppStore((s) => s.appMode);
  const summaryOpen = useSummary((s) => s.open);
  const setAutoLowPower = useAppStore((s) => s.setAutoLowPower);
  const start = useAppStore.getState().position;
  const portrait = isPortrait();
  const camPos = latLngToVector3(start.lat + 8, start.lng, portrait ? 4.4 : 3.1).toArray();
  const hiRes = !lowPower && typeof window !== 'undefined' && window.innerWidth >= 1024;

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak =
      (nav.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4 ||
      /Android.*(SM-A|Redmi|Moto)/.test(nav.userAgent);
    if (weak) setAutoLowPower(true);
  }, [setAutoLowPower]);

  return (
    <Canvas
      camera={{ position: camPos, fov: portrait ? 55 : 45, near: 0.01, far: 200 }}
      dpr={lowPower ? 1 : [1, 2]}
      gl={{ antialias: !lowPower, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
      onPointerMissed={() => undefined}
      aria-label="Interactive 3D globe of film locations"
      role="img"
    >
      <color attach="background" args={['#05080F']} />
      <PerformanceMonitor onDecline={() => setAutoLowPower(true)} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#bcd4ff', '#1b2440', 0.6]} />
      <CameraLight />
      <Stars count={lowPower ? 2500 : 6000} />
      <Suspense fallback={null}>
        <Globe hiRes={hiRes} onSurfaceClick={onSurfaceClick} />
        {!lowPower && <Clouds reducedMotion={reducedMotion} />}
        <Atmosphere />
        {summaryOpen ? (
          // Travel Summary replay owns the globe: hide the live explorer & pins.
          <SummaryLayer />
        ) : (
          <>
            {appMode === 'movie' ? (
              <MoviePins reducedMotion={reducedMotion} />
            ) : (
              <PlacePins reducedMotion={reducedMotion} />
            )}
            <TravelArc reducedMotion={reducedMotion} />
            <PlayerCharacter />
            <NearbyLandmarks />
          </>
        )}
        <Preload all />
      </Suspense>
      <CameraRig reducedMotion={reducedMotion} />
      {!lowPower && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
