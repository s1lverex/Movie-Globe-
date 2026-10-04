import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { CharacterConfig } from '../store/character';

export interface CharacterAnim {
  /** 0 idle, 1 walk, 2 run */
  speed: number;
  /** Seated/standing in balloon basket: hide leg swing. */
  riding?: boolean;
}

interface Props {
  config: CharacterConfig;
  anim: { current: CharacterAnim };
}

function Mat({ color, rough = 0.75 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0} />;
}

function Hair({ style, color }: { style: CharacterConfig['hairStyle']; color: string }) {
  return (
    <group>
      {/* base cap covering top and back of head */}
      <mesh position={[0, 0.02, -0.015]} castShadow>
        <sphereGeometry args={[0.275, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <Mat color={color} rough={0.9} />
      </mesh>
      {/* fringe */}
      <mesh position={[0, 0.12, 0.17]} rotation={[0.5, 0, 0]} scale={[1.3, 0.45, 0.6]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <Mat color={color} rough={0.9} />
      </mesh>
      {style === 'long' && (
        <mesh position={[0, -0.16, -0.1]} scale={[1, 1, 0.75]}>
          <cylinderGeometry args={[0.24, 0.27, 0.42, 24, 1, true, Math.PI * 0.15, Math.PI * 1.7]} />
          <meshStandardMaterial color={color} roughness={0.9} side={2} />
        </mesh>
      )}
      {style === 'bob' && (
        <mesh position={[0, -0.06, -0.03]}>
          <cylinderGeometry args={[0.27, 0.29, 0.2, 24, 1, true, Math.PI * 0.2, Math.PI * 1.6]} />
          <meshStandardMaterial color={color} roughness={0.9} side={2} />
        </mesh>
      )}
      {style === 'bun' && (
        <mesh position={[0, 0.25, -0.12]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <Mat color={color} rough={0.9} />
        </mesh>
      )}
      {style === 'spiky' &&
        [-0.5, -0.17, 0.17, 0.5].map((a, i) => (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.17, 0.25, Math.cos(a) * 0.05 - 0.04]}
            rotation={[-0.3, 0, -a * 0.9]}
          >
            <coneGeometry args={[0.06, 0.16, 8]} />
            <Mat color={color} rough={0.9} />
          </mesh>
        ))}
    </group>
  );
}

function Hat({ hat, color }: { hat: CharacterConfig['hat']; color: string }) {
  if (hat === 'none') return null;
  if (hat === 'beanie')
    return (
      <group position={[0, 0.04, -0.01]}>
        <mesh>
          <sphereGeometry args={[0.29, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.47]} />
          <Mat color={color} rough={0.95} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.045, 12, 32]} />
          <Mat color={color} rough={0.95} />
        </mesh>
      </group>
    );
  if (hat === 'cap')
    return (
      <group position={[0, 0.05, 0]}>
        <mesh>
          <sphereGeometry args={[0.285, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <Mat color={color} rough={0.7} />
        </mesh>
        <mesh position={[0, 0.03, 0.27]} scale={[1, 0.15, 1]}>
          <cylinderGeometry args={[0.17, 0.17, 0.1, 24, 1, false, -Math.PI / 2, Math.PI]} />
          <Mat color={color} rough={0.7} />
        </mesh>
      </group>
    );
  return (
    <group position={[0, 0.12, 0]}>
      <mesh>
        <cylinderGeometry args={[0.46, 0.46, 0.025, 32]} />
        <Mat color="#B08D57" rough={0.9} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.22, 0.27, 0.18, 24]} />
        <Mat color="#B08D57" rough={0.9} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.275, 0.275, 0.04, 24]} />
        <Mat color={color} rough={0.6} />
      </mesh>
    </group>
  );
}

function Backpack({ kind, color }: { kind: CharacterConfig['backpack']; color: string }) {
  if (kind === 'none') return null;
  const big = kind === 'explorer';
  const s = kind === 'mini' ? 0.65 : big ? 1.15 : 1;
  return (
    <group position={[0, 0.5, -0.17]} scale={s}>
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[0.28, 0.32, 0.16]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.17, -0.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.28, 16, 1, false, 0, Math.PI]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, -0.06, -0.16]}>
        <boxGeometry args={[0.2, 0.13, 0.05]} />
        <Mat color="#3B2F22" />
      </mesh>
      {big && (
        <mesh position={[0, 0.26, -0.07]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.36, 16]} />
          <Mat color="#4B6B3A" />
        </mesh>
      )}
      {/* straps */}
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.02, 0.035]}>
          <boxGeometry args={[0.04, 0.3, 0.02]} />
          <Mat color="#3B2F22" />
        </mesh>
      ))}
    </group>
  );
}

/** Chibi explorer built from primitives so every part is customisable. Faces +Z, feet at y=0, ~1.2 units tall. */
export const CharacterModel = forwardRef<Group, Props>(function CharacterModel({ config, anim }, outer) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const head = useRef<Group>(null);
  const phase = useRef(0);
  useImperativeHandle(outer, () => root.current as Group);

  useFrame(({ clock }, dt) => {
    const { speed, riding } = anim.current;
    const s = riding ? 0 : Math.min(speed, 2);
    phase.current += dt * (4 + 5 * s) * (s > 0.05 ? 1 : 0);
    const swing = Math.sin(phase.current) * 0.55 * Math.min(1, s) * (s > 1.2 ? 1.25 : 1);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.9;
    if (armR.current) armR.current.rotation.x = swing * 0.9;
    const t = clock.elapsedTime;
    if (body.current) {
      body.current.position.y = s > 0.05 ? Math.abs(Math.sin(phase.current)) * 0.04 : Math.sin(t * 2) * 0.008;
      body.current.rotation.x = s > 1.2 ? 0.15 : s * 0.05;
    }
    if (head.current) head.current.rotation.z = s > 0.05 ? 0 : Math.sin(t * 0.9) * 0.05;
    if (riding && armL.current && armR.current) {
      armL.current.rotation.x = -2.6 + Math.sin(t * 3) * 0.2;
      armR.current.rotation.z = 0;
    }
  });

  const c = config;
  return (
    <group ref={root}>
      <group ref={body}>
        {/* legs */}
        {[
          [legL, -0.08],
          [legR, 0.08],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<Group>} position={[x as number, 0.34, 0]}>
            <mesh position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.065, 0.16, 6, 12]} />
              <Mat color={c.pants} />
            </mesh>
            <mesh position={[0, -0.3, 0.03]} scale={[1, 0.7, 1.4]}>
              <sphereGeometry args={[0.075, 14, 10]} />
              <Mat color={c.shoes} rough={0.6} />
            </mesh>
          </group>
        ))}
        {/* torso / jacket */}
        <mesh position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.16, 0.18, 8, 16]} />
          <Mat color={c.top} />
        </mesh>
        {/* t-shirt peek */}
        <mesh position={[0, 0.53, 0.13]} scale={[0.8, 1, 0.4]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <Mat color="#F3F4F6" />
        </mesh>
        {/* arms */}
        {[
          [armL, -0.21],
          [armR, 0.21],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<Group>} position={[x as number, 0.62, 0]}>
            <mesh position={[0, -0.11, 0]} rotation={[0, 0, (x as number) > 0 ? 0.12 : -0.12]}>
              <capsuleGeometry args={[0.052, 0.14, 6, 12]} />
              <Mat color={c.top} />
            </mesh>
            <mesh position={[(x as number) > 0 ? 0.025 : -0.025, -0.24, 0]}>
              <sphereGeometry args={[0.05, 12, 10]} />
              <Mat color={c.skin} rough={0.6} />
            </mesh>
          </group>
        ))}
        <Backpack kind={c.backpack} color={c.backpackColor} />
        {/* head */}
        <group ref={head} position={[0, 0.93, 0]}>
          <mesh>
            <sphereGeometry args={[0.26, 32, 24]} />
            <Mat color={c.skin} rough={0.55} />
          </mesh>
          {/* ears */}
          {[-0.255, 0.255].map((x) => (
            <mesh key={x} position={[x, -0.02, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <Mat color={c.skin} rough={0.55} />
            </mesh>
          ))}
          {/* eyes */}
          {[-0.09, 0.09].map((x) => (
            <group key={x} position={[x, -0.01, 0.235]}>
              <mesh scale={[1, 1.25, 0.6]}>
                <sphereGeometry args={[0.04, 14, 10]} />
                <meshStandardMaterial color="#1B1410" roughness={0.2} />
              </mesh>
              <mesh position={[0.012, 0.018, 0.02]}>
                <sphereGeometry args={[0.012, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {/* cheeks */}
          {[-0.15, 0.15].map((x) => (
            <mesh key={x} position={[x, -0.08, 0.2]} scale={[1, 0.6, 0.4]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color="#F29C9C" transparent opacity={0.55} />
            </mesh>
          ))}
          {/* mouth */}
          <mesh position={[0, -0.1, 0.24]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.025, 0.007, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#7A3B2E" />
          </mesh>
          <Hair style={c.hairStyle} color={c.hairColor} />
          <Hat hat={c.hat} color={c.hatColor} />
        </group>
      </group>
    </group>
  );
});
