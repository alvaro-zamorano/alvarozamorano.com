// Kit's blocks for the WebGL scenes: the decoder lives in blocks.ts (no three.js),
// this adds the per-instance colours and seeds the shaders take.
import { Color } from 'three';
import { BODY, SHADE, mulberry32, palette, type KitModel } from './blocks';

export { INK, BODY, CREAM, SIGNAL, PAW, SHADE, loadKit, palette, mulberry32, easeIO } from './blocks';
export type { KitModel } from './blocks';

/**
 * Per-block colour (green blocks vary a touch in tone, like the canonical model's
 * voxel texture) and four random seeds. Same stream in every scene, so Kit's
 * blocks look the same wherever he appears.
 */
export function blockLooks(m: KitModel, dark: boolean) {
  const pal = palette(dark).map((h) => new Color(h));
  const color = new Float32Array(m.n * 3);
  const seed = new Float32Array(m.n * 4);
  const rnd = mulberry32(20260925);
  for (let i = 0; i < m.n0; i++) {
    const c = pal[m.cls[i]];
    let k = 1;
    if (m.cls[i] === BODY || m.cls[i] === SHADE) {
      const f = rnd();
      k = f < 0.33 ? 0.95 : f < 0.66 ? 1 : 1.05;
    }
    color.set([c.r * k, c.g * k, c.b * k], i * 3);
    seed.set([rnd(), rnd(), rnd(), rnd()], i * 4);
  }
  // joint fillers look exactly like the block they copy
  for (let j = m.n0; j < m.n; j++) {
    const i = m.orig[j];
    color.set(color.subarray(i * 3, i * 3 + 3), j * 3);
    seed.set(seed.subarray(i * 4, i * 4 + 4), j * 4);
  }
  return { color, seed };
}
