import { useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Procedural starfield with a faint Milky Way band (no external assets). */
export function Stars({ count = 6000 }: { count?: number }) {
  const geometry = useMemo(() => {
    const rand = seeded(42);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const galacticPole = new Vector3(0.3, 0.85, 0.42).normalize();
    const tmp = new Vector3();
    const c = new Color();
    const palette = ['#FFFFFF', '#CFE0FF', '#FFE9C9', '#A9C4FF'];
    for (let i = 0; i < count; i++) {
      const inBand = i < count * 0.45;
      // uniform direction
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      tmp.set(Math.sqrt(1 - u * u) * Math.cos(th), u, Math.sqrt(1 - u * u) * Math.sin(th));
      if (inBand) {
        // squash toward galactic plane
        const d = tmp.dot(galacticPole);
        tmp.addScaledVector(galacticPole, -d * (1 - 0.12 * rand())).normalize();
      }
      const r = 60 + rand() * 30;
      positions.set([tmp.x * r, tmp.y * r, tmp.z * r], i * 3);
      c.set(palette[Math.floor(rand() * palette.length)]);
      const b = inBand ? 0.25 + rand() * 0.45 : 0.4 + rand() * 0.6;
      colors.set([c.r * b, c.g * b, c.b * b], i * 3);
      sizes[i] = inBand ? 0.6 + rand() * 0.8 : 0.8 + rand() * 1.8;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.setAttribute('size', new BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  return (
    <points geometry={geometry} raycast={() => null}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mv.z) * 0.35;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor * a, a);
          }`}
      />
    </points>
  );
}
