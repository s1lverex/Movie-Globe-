import { useMemo } from 'react';
import { AdditiveBlending, BackSide, Color, ShaderMaterial } from 'three';
import vert from '../shaders/atmosphere.vert.glsl?raw';
import frag from '../shaders/atmosphere.frag.glsl?raw';
import { sunDir } from './sun';

export function Atmosphere() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: BackSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        uniforms: {
          glowColor: { value: new Color('#4C8DFF') },
          sunDir: { value: sunDir },
          intensity: { value: 1.1 },
        },
      }),
    [],
  );
  return (
    <mesh material={material} raycast={() => null} scale={1.13}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}
