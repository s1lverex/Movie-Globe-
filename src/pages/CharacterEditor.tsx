import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import type { Group } from 'three';
import { navigate } from '../lib/nav';
import { CharacterModel, type CharacterAnim } from '../scene/CharacterModel';
import {
  BACKPACKS,
  BACKPACK_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  OUTFIT_COLORS,
  PANTS_COLORS,
  SKIN_TONES,
  randomCharacter,
  type CharacterConfig,
} from '../store/character';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from '../ui/Avatar';

type Tab = 'looks' | 'outfit' | 'backpack';

function Preview({ config, yaw }: { config: CharacterConfig; yaw: number }) {
  const g = useRef<Group>(null);
  const anim = useRef<CharacterAnim>({ speed: 0 });
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += (yaw - g.current.rotation.y) * Math.min(1, dt * 8);
  });
  return (
    <group ref={g} position={[0, -0.62, 0]}>
      <CharacterModel config={config} anim={anim} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.45, 40]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-slate-400">{label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
            className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-[#0E1626] transition ${value === c ? 'ring-2 ring-accent' : 'ring-1 ring-white/10 hover:ring-white/40'}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Options<T extends string>({
  label,
  options,
  value,
  onPick,
  render,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onPick: (v: T) => void;
  render: (v: T) => React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-slate-400">{label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            aria-label={`${label}: ${o}`}
            onClick={() => onPick(o)}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-1.5 text-[10px] capitalize transition ${value === o ? 'border-accent bg-accent/15 text-white' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/30'}`}
          >
            {render(o)}
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function CharacterEditor() {
  const character = useAppStore((s) => s.character);
  const set = useAppStore((s) => s.setCharacter);
  const replace = useAppStore((s) => s.replaceCharacter);
  const [tab, setTab] = useState<Tab>('looks');
  const [yaw, setYaw] = useState(0.35);
  const done = () => navigate('/');

  return (
    <section
      role="dialog"
      aria-label="Customize your character"
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-[#0B1220] lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-[min(820px,92vh)] lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border lg:border-white/10 lg:shadow-2xl"
    >
      <div className="relative flex items-center justify-center px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2 lg:pt-5">
        <button type="button" onClick={done} className="icon-btn absolute left-4" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h2 className="font-display text-base font-bold text-white sm:text-lg">Customize Your Character</h2>
        <button
          type="button"
          onClick={() => replace(randomCharacter())}
          className="icon-btn absolute right-4"
          aria-label="Randomize character"
          data-testid="randomize"
        >
          <Shuffle size={18} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle_at_50%_45%,#1D3260_0%,#0B1220_65%)]">
        <Canvas
          camera={{ position: [0, 0.1, 2.9], fov: 32 }}
          dpr={[1, 2]}
          aria-label="Character preview"
          role="img"
        >
          <ambientLight intensity={0.7} />
          <hemisphereLight args={['#cfe0ff', '#1b2440', 0.6]} />
          <directionalLight position={[2, 3, 3]} intensity={2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.6} color="#7FB0FF" />
          <Suspense fallback={null}>
            <Preview config={character} yaw={yaw} />
          </Suspense>
        </Canvas>
        <button
          type="button"
          aria-label="Rotate left"
          className="icon-btn absolute top-1/2 left-4 -translate-y-1/2"
          onClick={() => setYaw((y) => y - Math.PI / 4)}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Rotate right"
          className="icon-btn absolute top-1/2 right-4 -translate-y-1/2"
          onClick={() => setYaw((y) => y + Math.PI / 4)}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex border-b border-white/10 px-4" role="tablist">
        {(['looks', 'outfit', 'backpack'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold capitalize transition ${tab === t ? 'border-accent bg-white/5 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="no-scrollbar max-h-[38vh] space-y-4 overflow-y-auto p-4" role="tabpanel">
        {tab === 'looks' && (
          <>
            <Options
              label="Hair style"
              options={HAIR_STYLES}
              value={character.hairStyle}
              onPick={(v) => set({ hairStyle: v })}
              render={(v) => <Avatar config={{ ...character, hairStyle: v, hat: 'none' }} size={48} />}
            />
            <Swatches
              label="Skin tone"
              colors={SKIN_TONES}
              value={character.skin}
              onPick={(c) => set({ skin: c })}
            />
            <Swatches
              label="Hair color"
              colors={HAIR_COLORS}
              value={character.hairColor}
              onPick={(c) => set({ hairColor: c })}
            />
          </>
        )}
        {tab === 'outfit' && (
          <>
            <Options
              label="Hat"
              options={HATS}
              value={character.hat}
              onPick={(v) => set({ hat: v })}
              render={(v) => <Avatar config={{ ...character, hat: v }} size={48} />}
            />
            <Swatches
              label="Hat color"
              colors={['#3A4150', ...OUTFIT_COLORS]}
              value={character.hatColor}
              onPick={(c) => set({ hatColor: c })}
            />
            <Swatches
              label="Jacket"
              colors={OUTFIT_COLORS}
              value={character.top}
              onPick={(c) => set({ top: c })}
            />
            <Swatches
              label="Trousers"
              colors={PANTS_COLORS}
              value={character.pants}
              onPick={(c) => set({ pants: c })}
            />
            <Swatches
              label="Shoes"
              colors={['#6B4A2E', '#1F2937', '#E5E7EB', '#9A3412']}
              value={character.shoes}
              onPick={(c) => set({ shoes: c })}
            />
          </>
        )}
        {tab === 'backpack' && (
          <>
            <Options
              label="Backpack"
              options={BACKPACKS}
              value={character.backpack}
              onPick={(v) => set({ backpack: v })}
              render={(v) => (
                <span className="flex h-12 w-12 items-center justify-center text-2xl">
                  {v === 'none' ? '∅' : v === 'mini' ? '👝' : v === 'explorer' ? '🏕️' : '🎒'}
                </span>
              )}
            />
            <Swatches
              label="Backpack color"
              colors={BACKPACK_COLORS}
              value={character.backpackColor}
              onPick={(c) => set({ backpackColor: c })}
            />
          </>
        )}
      </div>

      <div className="p-4 pt-0 pb-[max(env(safe-area-inset-bottom),16px)]">
        <button
          type="button"
          className="btn-primary w-full rounded-full py-3.5"
          onClick={done}
          data-testid="character-done"
        >
          Done
        </button>
      </div>
    </section>
  );
}
