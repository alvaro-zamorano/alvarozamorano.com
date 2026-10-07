// Kit's blocks, decoded once and shared by every scene that draws him. No three.js
// here, so the companion (canvas 2D) can load it without the WebGL bundle.
import kit from '../../data/kit.json';

export const INK = 0;
export const BODY = 1;
export const CREAM = 2;
export const SIGNAL = 3; // tail tip
export const PAW = 4;
export const SHADE = 5; // inner ears

export interface KitModel {
  n: number; // instances drawn: Kit's blocks, then the joint fillers
  n0: number; // Kit's own blocks
  home: Float32Array; // block centres, in blocks
  start: Float32Array; // slots in the intro cube
  cls: Uint8Array;
  part: Uint8Array;
  exposed: Uint8Array; // 0 for fillers
  orig: Uint32Array; // the block each instance copies (itself for Kit's own blocks)
  bmin: number[];
  bmax: number[];
  pivots: Record<string, number[]>;
}

// The tail bends at four joints. Blocks of a segment that sit next to its joint
// are drawn a second time on the parent part, so bending never opens a crack.
const TAIL = [4, 5, 6, 7];
const JOINT_R = 2;

let cached: KitModel | null = null;

export function loadKit(): KitModel {
  if (cached) return cached;
  const bin = atob(kit.data);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  const n = kit.n;
  const h2 = new Int8Array(data.buffer, 0, n * 3);
  const s2 = new Int8Array(data.buffer, n * 3, n * 3);
  const meta = data.subarray(n * 6, n * 7);
  const home = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    home[i] = h2[i] / 2;
    start[i] = s2[i] / 2;
  }
  const pivots = kit.pivots as Record<string, number[]>;
  const fill: [number, number][] = []; // [block, parent part]
  for (let i = 0; i < n; i++) {
    const p = (meta[i] >> 3) & 7;
    const s = TAIL.indexOf(p);
    if (s < 0) continue;
    const pv = pivots[String(p)];
    const d = Math.hypot(home[i * 3] - pv[0], home[i * 3 + 1] - pv[1], home[i * 3 + 2] - pv[2]);
    if (d <= JOINT_R) fill.push([i, s === 0 ? 0 : TAIL[s - 1]]);
  }
  const total = n + fill.length;
  const H = new Float32Array(total * 3);
  const S = new Float32Array(total * 3);
  H.set(home);
  S.set(start);
  const cls = new Uint8Array(total);
  const part = new Uint8Array(total);
  const exposed = new Uint8Array(total);
  const orig = new Uint32Array(total);
  for (let i = 0; i < n; i++) {
    cls[i] = meta[i] & 7;
    part[i] = (meta[i] >> 3) & 7;
    exposed[i] = (meta[i] >> 6) & 1;
    orig[i] = i;
  }
  fill.forEach(([i, parent], k) => {
    const j = n + k;
    H.set(home.subarray(i * 3, i * 3 + 3), j * 3);
    S.set(start.subarray(i * 3, i * 3 + 3), j * 3);
    cls[j] = cls[i];
    part[j] = parent;
    orig[j] = i;
  });
  const [bmin, bmax] = kit.bounds as number[][];
  cached = { n: total, n0: n, home: H, start: S, cls, part, exposed, orig, bmin, bmax, pivots };
  return cached;
}

/** ink, body, cream, signal, paw (lit on the black stage), shade */
export function palette(dark: boolean): string[] {
  return ['#0A0A0A', '#047857', '#F5F2EB', '#34D399', dark ? '#2A2A2A' : '#0A0A0A', '#03563F'];
}

// small deterministic PRNG so every visit builds Kit the same way
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The tone of every block (green blocks vary a touch, like the canonical model's
 * voxel texture): 0.95, 1 or 1.05, from the same stream every scene uses, so Kit's
 * blocks look the same wherever he appears. Consumes the stream exactly as
 * blockLooks does.
 */
export function blockTones(m: KitModel): Float32Array {
  const k = new Float32Array(m.n);
  const rnd = mulberry32(20260925);
  for (let i = 0; i < m.n0; i++) {
    let t = 1;
    if (m.cls[i] === BODY || m.cls[i] === SHADE) {
      const f = rnd();
      t = f < 0.33 ? 0.95 : f < 0.66 ? 1 : 1.05;
    }
    k[i] = t;
    rnd(); rnd(); rnd(); rnd();
  }
  for (let j = m.n0; j < m.n; j++) k[j] = k[m.orig[j]];
  return k;
}

export const easeIO = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;
};
