import { useMemo } from 'react';

/** Small hot-air balloon used for "Fly there". Local units match CharacterModel. */
export function Balloon() {
  const segments = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  return (
    <group>
      {/* envelope */}
      <group position={[0, 2.25, 0]} scale={[1, 1.15, 1]}>
        {segments.map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.75, 8, 20, (i * Math.PI * 2) / 10, (Math.PI * 2) / 10]} />
            <meshStandardMaterial color={i % 2 ? '#F8FAFC' : '#2F6BFF'} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.72, 0]}>
          <cylinderGeometry args={[0.28, 0.12, 0.3, 16, 1, true]} />
          <meshStandardMaterial color="#2F6BFF" roughness={0.6} side={2} />
        </mesh>
      </group>
      {/* ropes */}
      {[
        [0.28, 0.28],
        [-0.28, 0.28],
        [0.28, -0.28],
        [-0.28, -0.28],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.75, 0.88, z * 0.75]} rotation={[z * 0.25, 0, -x * 0.25]}>
          <cylinderGeometry args={[0.008, 0.008, 1.0, 4]} />
          <meshStandardMaterial color="#5B4636" />
        </mesh>
      ))}
      {/* burner glow */}
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshBasicMaterial color={[4, 2, 0.6]} toneMapped={false} />
      </mesh>
      {/* basket */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.34, 0.28, 0.36, 16]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.03, 8, 24]} />
        <meshStandardMaterial color="#5B3A1E" roughness={0.95} />
      </mesh>
    </group>
  );
}
