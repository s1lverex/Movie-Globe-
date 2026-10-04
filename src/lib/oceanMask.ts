import type { OceanSampler } from './summary';

/**
 * Samples the Earth's ocean mask (the specular texture: white = water) so the
 * Travel Summary can tell sea crossings from road trips. Loaded once, ~44 KB.
 */
let pending: Promise<OceanSampler | undefined> | null = null;

export function loadOceanMask(src = '/textures/earth/specular_2k.webp'): Promise<OceanSampler | undefined> {
  pending ??= new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const w = 512;
        const h = 256;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(undefined);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        resolve((lat, lng) => {
          const x = Math.min(w - 1, Math.max(0, Math.floor(((lng + 180) / 360) * w)));
          const y = Math.min(h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * h)));
          return data[(y * w + x) * 4] > 128;
        });
      } catch {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
  return pending;
}
