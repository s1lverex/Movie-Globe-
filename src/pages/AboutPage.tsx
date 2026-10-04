import credits from '../../CREDITS.md?raw';
import { Markdown } from '../ui/Markdown';
import { Overlay } from '../ui/Overlay';

export default function AboutPage() {
  return (
    <Overlay title="About" wide>
      <div className="space-y-4 text-sm text-slate-300">
        <p>
          <strong className="text-white">Travel Globe</strong> lets you walk a little explorer across a
          real-time 3D Earth. In <strong className="text-white">Normal Mode</strong> pick any place to plan
          trips and keep a travel diary. Switch to <strong className="text-white">Movie Mode</strong> (Movie
          Globe) to visit famous film locations and collect passport stamps.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs">
          <p className="font-semibold text-white">Controls</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li>Drag to orbit, scroll / pinch to zoom.</li>
            <li>WASD or arrow keys to walk (Shift to run), or use the joystick on touch screens.</li>
            <li>Tap anywhere on the globe to walk there; tap a pin for details, Walk there or Fly there.</li>
            <li>Press F to toggle the follow camera.</li>
          </ul>
        </div>
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">
          Travel Globe / Movie Globe is not affiliated with Trip.com or any film studio. Movie titles are used
          for identification only. Photos show the real filming locations and are credited below.
        </p>
        <Markdown source={credits} />
      </div>
    </Overlay>
  );
}
