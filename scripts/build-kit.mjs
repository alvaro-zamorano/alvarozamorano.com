// Kit, built as voxels at build time, true to the canonical 3D Kit.
//
// Proportions and details are measured from the canonical model (the chunky voxel
// fox of the 3D spec, alvaro-pipeline assets/kit/3d) on a grid where the head is
// 16 blocks wide: big cubic head, compact body, big eyes with a cream sclera and
// a highlight, a small cream muzzle with a black nose, cheek tufts, a cream chest
// cross, four dark paws, tall ears with dark green insides and a stepped tail.
// Every block gets a colour class and a body part; the intro ("one block -> Kit")
// pairs every slot of a solid cube with a block of Kit.
//
// Writes: src/data/kit.json, public/favicon.svg, src/assets/kit-front(-dark).svg
//
// Colour classes (resolved to canon tokens by the engine):
//   0 ink #0A0A0A (lid lines, pupils, nose) 1 body #047857
//   2 cream #F5F2EB (eyes, muzzle, chest)  3 signal #34D399 (tail tip)
//   4 paw (ink, lit on the black stage)    5 shade #03563F (inner ears)
// Parts (pivot-animated in the shader): 0 body, 1 head, 2 ear L, 3 ear R, 4-7 tail.
// Axes: x to Kit's left (symmetric about x = -0.5), y up from the paws, z forward.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INK = 0, BODY = 1, CREAM = 2, SIGNAL = 3, PAW = 4, SHADE = 5;
const P_BODY = 0, P_HEAD = 1, P_EAR_L = 2, P_EAR_R = 3, P_TAIL = [4, 5, 6, 7];

const vox = new Map(); // "x,y,z" -> [cls, part]
const key = (x, y, z) => `${x},${y},${z}`;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function box(x0, x1, y0, y1, z0, z1, cls, part, overwrite = true) {
  for (const x of range(x0, x1))
    for (const y of range(y0, y1))
      for (const z of range(z0, z1)) {
        const k = key(x, y, z);
        if (overwrite || !vox.has(k)) vox.set(k, [cls, part]);
      }
}
function paint(x0, x1, y0, y1, z0, z1, cls) {
  for (const x of range(x0, x1))
    for (const y of range(y0, y1))
      for (const z of range(z0, z1)) {
        const v = vox.get(key(x, y, z));
        if (v) v[0] = cls;
      }
}
function carve(pred) {
  for (const k of [...vox.keys()]) {
    const [x, y, z] = k.split(',').map(Number);
    if (pred(x, y, z)) vox.delete(k);
  }
}
const mirrorX = (x) => -1 - x; // symmetry axis between x = -1 and x = 0
const both = (x0, x1, fn) => {
  fn(x0, x1);
  fn(mirrorX(x1), mirrorX(x0));
};

// ------------------------------------------------------------------ body
box(-7, 6, 0, 4, -7, 2, BODY, P_BODY); // haunches and legs, sitting
box(-5, 4, 5, 9, -4, 3, BODY, P_BODY); // chest
box(-5, 4, 5, 6, -6, -5, BODY, P_BODY); // back, easing into the haunches
box(-4, 3, 10, 11, -4, 2, BODY, P_BODY); // neck
carve((x, y, z) => y === 0 && (x === -1 || x === 0) && z >= 0); // gap between the front paws
// paws: two in front, two at the sides
both(-4, -2, (a, b) => box(a, b, 0, 0, 0, 3, PAW, P_BODY));
both(-7, -5, (a, b) => paint(a, b, 0, 0, -2, 1, PAW));
// cream chest: a cross on the front, narrowing down to the belly
paint(-2, 1, 10, 10, 2, 2, CREAM);
paint(-3, 2, 6, 9, 3, 3, CREAM);
paint(-2, 1, 5, 5, 3, 3, CREAM);
paint(-1, 0, 1, 4, 2, 2, CREAM);

// ------------------------------------------------------------------ head
const [HX0, HX1, HY0, HY1, HZ0, HZ1] = [-8, 7, 12, 26, -7, 6];
box(HX0, HX1, HY0, HY1, HZ0, HZ1, BODY, P_HEAD);
carve((x, y, z) => (y >= HY1 - 1 || y <= HY0 + 1) && z === HZ0); // softer back edges
carve((x, y, z) => y === HY0 && (z === HZ0 + 1 || z === HZ1)); // chin tucks under
// cheek tufts on both sides, low on the face
both(-10, -9, (a, b) => box(a, b, 14, 15, -2, 3, BODY, P_HEAD));
both(-9, -9, (a, b) => box(a, b, 16, 16, -2, 3, BODY, P_HEAD));
// eyes: black lid line, cream sclera, tall black pupil, a highlight on the same side for both
for (const [x0, hl] of [[-6, -5], [2, 3]]) {
  paint(x0, x0 + 3, 17, 20, HZ1, HZ1, CREAM); // sclera
  paint(x0, x0 + 3, 21, 21, HZ1, HZ1, INK); // lid line
  paint(x0 + 1, x0 + 2, 17, 20, HZ1, HZ1, INK); // pupil
  paint(hl, hl, 20, 20, HZ1, HZ1, CREAM); // highlight
}
// muzzle: a small cream block that sticks out, black nose at the top of its front
box(-2, 1, 14, 16, HZ1 + 1, HZ1 + 3, CREAM, P_HEAD);
box(-1, 0, 16, 16, HZ1 + 4, HZ1 + 4, INK, P_HEAD);

// ------------------------------------------------------------------ ears
// tall, stepped on the inside, flat at the front, darker green inside
const earRows = [ // [y, inner x (left ear), back z]
  [27, -3, -4], [28, -4, -4], [29, -5, -3], [30, -5, -2], [31, -6, -2], [32, -7, -1], [33, -7, -1],
];
function ear(part, side) {
  const mx = (x) => (side === 'L' ? x : mirrorX(x));
  for (const [y, xi, zb] of earRows) {
    const [a, b] = side === 'L' ? [HX0, xi] : [mirrorX(xi), mirrorX(HX0)];
    box(a, b, y, y, zb, 0, BODY, part);
    // inside: everything but the outer column and the inner edge (all of it at the base)
    const inner = y === 27 ? [HX0 + 1, xi] : [HX0 + 1, xi - 1];
    if (y <= 31 && inner[1] >= inner[0]) {
      const [c, d] = side === 'L' ? inner : [mx(inner[1]), mx(inner[0])];
      paint(c, d, y, y, 0, 0, SHADE);
    }
  }
}
ear(P_EAR_L, 'L');
ear(P_EAR_R, 'R');

// ------------------------------------------------------------------ tail
// short, stepped and pointy: it rises up and back from behind the haunch, as in the
// canonical model, and leans out to Kit's left so it reads from the resting 3/4 camera
const segs = [ // [x], [y], [z] per segment, base to tip
  [[2, 5], [1, 4], [-9, -7]],
  [[3, 6], [4, 7], [-11, -9]],
  [[4, 7], [7, 10], [-12, -10]],
  [[5, 8], [10, 12], [-13, -11]],
];
segs.forEach(([[x0, x1], [y0, y1], [z0, z1]], i) => box(x0, x1, y0, y1, z0, z1, BODY, P_TAIL[i], false));
box(6, 8, 13, 13, -13, -12, BODY, P_TAIL[3]); // the point
box(7, 8, 14, 14, -13, -13, BODY, P_TAIL[3]);
paint(5, 8, 11, 14, -13, -11, SIGNAL);

// ------------------------------------------------------------------ pivots
const pivots = {
  [P_BODY]: [0, 0, 0],
  [P_HEAD]: [-0.5, 11.5, -0.5],
  [P_EAR_L]: [-6, 26.5, -2],
  [P_EAR_R]: [mirrorX(-6), 26.5, -2],
  [P_TAIL[0]]: [3.5, 1.5, -7.0],
  [P_TAIL[1]]: [4.5, 4.0, -9.0],
  [P_TAIL[2]]: [5.5, 7.0, -10.5],
  [P_TAIL[3]]: [6.5, 10.0, -11.5],
};

// ------------------------------------------------------------------ export
const entries = [...vox.entries()].map(([k, v]) => [k.split(',').map(Number), v]);
entries.sort((a, b) => a[0][1] - b[0][1] || a[0][2] - b[0][2] || a[0][0] - b[0][0]);
const n = entries.length;
const P = entries.map((e) => e[0]);
const cls = entries.map((e) => e[1][0]);
const part = entries.map((e) => e[1][1]);
const occ = new Set(vox.keys());
const exposed = P.map(([x, y, z]) =>
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !occ.has(key(x + a, y + b, z + c))),
);

const offset = [-0.5, 0, (HZ0 + HZ1) / 2]; // symmetry axis and middle of the head
const home = P.map((p) => [p[0] - offset[0], p[1] - offset[1], p[2] - offset[2]]);

// intro plan: a solid cube of blocks; bottom-back slots (never seen) are dropped
const side = Math.ceil(Math.cbrt(n));
let slots = [];
for (let x = 0; x < side; x++)
  for (let y = 0; y < side; y++)
    for (let z = 0; z < side; z++) slots.push([x - (side - 1) / 2, y - (side - 1) / 2, z - (side - 1) / 2]);
slots.sort((a, b) => a[1] * 3 + a[2] * 2 + a[0] * 0.1 - (b[1] * 3 + b[2] * 2 + b[0] * 0.1));
slots = slots.slice(slots.length - n);
const centre = [0, 1, 2].map((a) => home.reduce((s, p) => s + p[a], 0) / n);
centre[1] = Math.min(...home.map((p) => p[1])) + side / 2 + 2;
const G = slots.map((g) => [g[0] + centre[0], g[1] + centre[1], g[2] + centre[2]]);

// pair cube slots with Kit blocks: equal-count height slabs, then angle around the
// vertical axis inside each slab. Bottom goes to bottom, sides to sides, so the
// blocks flow outwards without crossing much.
const SLABS = 24;
const byH = (arr) => arr.map((p, i) => ({ p, i })).sort((a, b) => a.p[1] - b.p[1] || a.p[2] - b.p[2] || a.p[0] - b.p[0]);
const hs = byH(home), gs = byH(G);
const start = new Array(n);
for (let s = 0; s < SLABS; s++) {
  const a = Math.floor((s * n) / SLABS), b = Math.floor(((s + 1) * n) / SLABS);
  const ang = (o, c) => Math.atan2(o.p[2] - c[2], o.p[0] - c[0]);
  const hsl = hs.slice(a, b), gsl = gs.slice(a, b);
  const hc = [0, 1, 2].map((k) => hsl.reduce((t, o) => t + o.p[k], 0) / hsl.length);
  const gc = [0, 1, 2].map((k) => gsl.reduce((t, o) => t + o.p[k], 0) / gsl.length);
  // inside a slab: radius rings first (inner to inner), then angle
  const order = (arr, c) => {
    const withR = arr.map((o) => ({ o, r: Math.hypot(o.p[0] - c[0], o.p[2] - c[2]), t: ang(o, c) }));
    withR.sort((u, v) => u.r - v.r);
    const RINGS = 3;
    const out = [];
    for (let r = 0; r < RINGS; r++) {
      const ra = Math.floor((r * withR.length) / RINGS), rb = Math.floor(((r + 1) * withR.length) / RINGS);
      out.push(...withR.slice(ra, rb).sort((u, v) => u.t - v.t));
    }
    return out.map((w) => w.o);
  };
  const ho = order(hsl, hc), go = order(gsl, gc);
  ho.forEach((h, j) => (start[h.i] = go[j].p));
}

// pack: positions in half-units (int8), then one meta byte per block
const bytes = new Uint8Array(n * 7);
const i8 = new Int8Array(bytes.buffer);
for (let i = 0; i < n; i++) {
  for (let a = 0; a < 3; a++) {
    i8[i * 3 + a] = Math.round(home[i][a] * 2);
    i8[n * 3 + i * 3 + a] = Math.round(start[i][a] * 2);
  }
  bytes[n * 6 + i] = cls[i] | (part[i] << 3) | ((exposed[i] ? 1 : 0) << 6);
}
const mins = [0, 1, 2].map((a) => Math.min(...home.map((p) => p[a])));
const maxs = [0, 1, 2].map((a) => Math.max(...home.map((p) => p[a])));
const out = {
  n,
  cube: side,
  pivots: Object.fromEntries(
    Object.entries(pivots).map(([k, v]) => [k, v.map((c, a) => +(c - offset[a]).toFixed(2))]),
  ),
  bounds: [mins, maxs],
  data: Buffer.from(bytes).toString('base64'),
};
mkdirSync(resolve(root, 'src/data'), { recursive: true });
writeFileSync(resolve(root, 'src/data/kit.json'), JSON.stringify(out));

// ------------------------------------------------------------------ icons
// pixel marks projected straight from the model (front view)
const SHADE_HEX = '#03563F'; // body green in shadow (inner ears)
const COL = { 0: '#0A0A0A', 1: '#047857', 2: '#F5F2EB', 3: '#34D399', 4: '#0A0A0A', 5: SHADE_HEX };
function frontSvg(filter, pad, col) {
  const grid = new Map();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  home.forEach((p, i) => {
    if (!filter(p, i)) return;
    const [x, y, z] = p;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    const k = `${x},${y}`;
    const g = grid.get(k);
    if (!g || z > g[0]) grid.set(k, [z, cls[i]]);
  });
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const size = Math.max(w + pad * 2, h + pad * 2);
  const ox = (size - w) / 2, oy = (size - h) / 2;
  let rects = '';
  for (let j = 0; j < h; j++) {
    const y = y1 - j;
    let run = null;
    for (let i = 0; i <= w; i++) {
      const g = i < w ? grid.get(`${x0 + i},${y}`) : undefined;
      const c = g ? col[g[1]] : null;
      if (run && c !== run[1]) {
        rects += `<rect x="${ox + run[0]}" y="${oy + j}" width="${i - run[0]}" height="1" fill="${run[1]}"/>`;
        run = null;
      }
      if (c && !run) run = [i, c];
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
}
mkdirSync(resolve(root, 'public'), { recursive: true });
mkdirSync(resolve(root, 'src/assets'), { recursive: true });
const headOnly = (p, i) => part[i] === P_HEAD || part[i] === P_EAR_L || part[i] === P_EAR_R;
writeFileSync(resolve(root, 'public/favicon.svg'), frontSvg(headOnly, 1, COL));
writeFileSync(resolve(root, 'src/assets/kit-front.svg'), frontSvg(() => true, 0, COL));
writeFileSync(resolve(root, 'src/assets/kit-front-dark.svg'), frontSvg(() => true, 0, { ...COL, 4: '#2A2A2A' })); // paws lit, as on the stage

const counts = cls.reduce((c, v) => ((c[v] = (c[v] || 0) + 1), c), {});
console.log(`kit: ${n} blocks (${exposed.filter(Boolean).length} visible), cube ${side}^3, classes ${JSON.stringify(counts)}`);
