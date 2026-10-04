import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, ShaderMaterial, Vector2, type Mesh, type Texture } from 'three';
import vert from '../shaders/earth.vert.glsl?raw';
import frag from '../shaders/earth.frag.glsl?raw';
import { sunDir, updateSun } from './sun';
import { TEX, cloudRotation } from './textures';

interface Props {
  hiRes: boolean;
  onSurfaceClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export const GLOBE_SEGMENTS = 128;

export function Globe({ hiRes, onSurfaceClick }: Props) {
  const [day, night, bump, spec, clouds] = useTexture([
    TEX.day(hiRes),
    TEX.night,
    TEX.bump,
    TEX.spec,
    TEX.clouds,
  ]) as Texture[];
  const mesh = useRef<Mesh>(null);

  const material = useMemo(() => {
    day.colorSpace = SRGBColorSpace;
    night.colorSpace = SRGBColorSpace;
    day.anisotropy = 8;
    return new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        dayMap: { value: day },
        nightMap: { value: night },
        bumpMap: { value: bump },
        specMap: { value: spec },
        cloudMap: { value: clouds },
        sunDir: { value: sunDir },
        cloudOffset: { value: 0 },
        bumpScale: { value: 6.0 },
        cloudShadow: { value: 0.35 },
        texel: { value: new Vector2(1 / 2048, 1 / 1024) },
      },
    });
  }, [day, night, bump, spec, clouds]);

  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > 30) {
      t.current = 0;
      updateSun();
    }
    material.uniforms.cloudOffset.value = cloudRotation.value / (Math.PI * 2);
  });

  return (
    <mesh ref={mesh} material={material} onClick={onSurfaceClick} name="earth">
      <sphereGeometry args={[1, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
    </mesh>
  );
}
