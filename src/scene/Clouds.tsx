import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { ShaderMaterial, type Mesh } from 'three';
import vert from '../shaders/earth.vert.glsl?raw';
import frag from '../shaders/clouds.frag.glsl?raw';
import { sunDir } from './sun';
import { TEX, cloudRotation } from './textures';

export function Clouds({ reducedMotion }: { reducedMotion: boolean }) {
  const map = useTexture(TEX.clouds);
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        uniforms: { cloudMap: { value: map }, sunDir: { value: sunDir } },
      }),
    [map],
  );
  useFrame((_, dt) => {
    if (!reducedMotion) cloudRotation.value = (cloudRotation.value + dt * 0.006) % (Math.PI * 2);
    if (ref.current) ref.current.rotation.y = cloudRotation.value;
  });
  return (
    <mesh ref={ref} material={material} raycast={() => null} renderOrder={2}>
      <sphereGeometry args={[1.008, 96, 96]} />
    </mesh>
  );
}
