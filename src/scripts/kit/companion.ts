// Kit as a companion: the same blocks as the stage, drawn with canvas 2D (no WebGL
// needed) in the corner. He breathes, wags, twitches an ear, looks at the pointer,
// hops in and out, stacks blocks while he thinks, and talks in a bubble. Answers
// come from the bank in src/data/companion.ts; nothing leaves the browser.
import { loadKit, blockTones, palette, CREAM, INK, type KitModel } from './blocks';
import { companion as C, match, looksSpanish, type Answer, type Link } from '../../data/companion';

type M3 = number[]; // 3x3, row major
type Aff = { m: M3; t: number[] }; // p' = m p + t

const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const ID: Aff = { m: I3, t: [0, 0, 0] };
const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const vec = (m: M3, v: number[]) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const rotX = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const rotY = (a: number): M3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const rotZ = (a: number): M3 => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const about = (piv: number[], R: M3): Aff => {
  const rp = vec(R, piv);
  return { m: R, t: [piv[0] - rp[0], piv[1] - rp[1], piv[2] - rp[2]] };
};
const compose = (A: Aff, B: Aff): Aff => {
  const t = vec(A.m, B.t);
  return { m: mul(A.m, B.m), t: [t[0] + A.t[0], t[1] + A.t[1], t[2] + A.t[2]] };
};
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const quint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const now = () => performance.now() / 1000;

// the resting camera: Kit faces the page, three-quarter, a little from above
const YAW = (-32 * Math.PI) / 180;
const PITCH = (14 * Math.PI) / 180;
const CAM = mul([1, 0, 0, 0, Math.cos(PITCH), -Math.sin(PITCH), 0, Math.sin(PITCH), Math.cos(PITCH)], rotY(YAW));
const FACE_SHADE = [1, 0.86, 0.72]; // top, front, side: flat tones, no lighting model
const MARGIN = { l: 2.5, r: 4.5, t: 5, b: 0.5 }; // blocks around him: ears, hops, the tail's sweep

interface Pose {
  breathe: number;
  nod: number;
  yaw: number;
  tilt: number;
  earL: number;
  earR: number;
  tail: number[];
  asleep: number;
}
const REST: Pose = { breathe: 1, nod: 0, yaw: 0, tilt: 0, earL: 0, earR: 0, tail: [0, 0, 0, 0], asleep: 0 };

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(clamp(v * k, 0, 255));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Visible faces of every block (top, front, Kit's left side), minus the ones a neighbour hides. */
function buildFaces(m: KitModel) {
  const occ = new Set<number>();
  const key = (x2: number, y2: number, z2: number) => ((x2 + 128) << 16) | ((y2 + 128) << 8) | (z2 + 128);
  for (let i = 0; i < m.n0; i++) {
    occ.add(key(Math.round(m.home[i * 3] * 2), Math.round(m.home[i * 3 + 1] * 2), Math.round(m.home[i * 3 + 2] * 2)));
  }
  const corners: number[] = [];
  const part: number[] = [];
  const block: number[] = [];
  const normal: number[] = [];
  const eye: number[] = [];
  for (let i = 0; i < m.n; i++) {
    const x = m.home[i * 3], y = m.home[i * 3 + 1], z = m.home[i * 3 + 2];
    const x2 = Math.round(x * 2), y2 = Math.round(y * 2), z2 = Math.round(z * 2);
    const p = m.part[i], c = m.cls[i];
    const isEye = p === 1 && (c === CREAM || c === INK) && y >= 17 && y <= 20;
    const add = (n: number, pts: number[]) => {
      corners.push(...pts);
      part.push(p);
      block.push(i);
      normal.push(n);
      eye.push(isEye && n === 1 ? 1 : 0);
    };
    if (!occ.has(key(x2, y2 + 2, z2))) add(0, [x - 0.5, y + 0.5, z - 0.5, x + 0.5, y + 0.5, z - 0.5, x + 0.5, y + 0.5, z + 0.5, x - 0.5, y + 0.5, z + 0.5]);
    if (!occ.has(key(x2, y2, z2 + 2))) add(1, [x - 0.5, y - 0.5, z + 0.5, x + 0.5, y - 0.5, z + 0.5, x + 0.5, y + 0.5, z + 0.5, x - 0.5, y + 0.5, z + 0.5]);
    if (!occ.has(key(x2 + 2, y2, z2))) add(2, [x + 0.5, y - 0.5, z - 0.5, x + 0.5, y - 0.5, z + 0.5, x + 0.5, y + 0.5, z + 0.5, x + 0.5, y + 0.5, z - 0.5]);
  }
  return {
    n: part.length,
    corners: Float32Array.from(corners),
    part: Uint8Array.from(part),
    block: Uint32Array.from(block),
    normal: Uint8Array.from(normal),
    eye: Uint8Array.from(eye),
  };
}

export class Companion {
  private root: HTMLElement;
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bubble: HTMLElement;
  private say: HTMLElement;
  private you: HTMLElement;
  private chips: HTMLElement;
  private form: HTMLFormElement;
  private input: HTMLInputElement;
  private send: HTMLButtonElement;
  private hit: HTMLButtonElement;
  private stack: HTMLElement[];
  private bit: HTMLElement;

  private model = loadKit();
  private faces = buildFaces(this.model);
  private colours: { light: string[]; dark: string[] };
  private eyeColour: { light: string[]; dark: string[] };
  private P: Float32Array; // projected corners, 8 per face
  private D: Float32Array; // depth per face
  private order: Int32Array;

  private S = 3.6; // px per block
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private cw = 0;
  private ch = 0;
  private bounds = { x0: 0, x1: 0, y0: 0, y1: 0 };
  private headPx = 0;
  private dark = false;
  private phone = matchMedia('(max-width: 640px)');
  private finePointer = matchMedia('(pointer: fine)');
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // animation
  private A = {
    asleep: 0, asleepT: 0, listen: 0, listenT: 0, talk: 0, shakeT0: -9,
    twitch: { side: 0, t: -9, next: 4 }, happyUntil: 0, hops: [] as { t0: number; h: number; d: number }[],
    look: { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 }, last: 0, dirty: true, slideX: 0,
  };

  // behaviour
  state: 'away' | 'arriving' | 'here' | 'leaving' = 'away';
  private wanted = false; // should he be here, as far as the stages say
  private busy = false;
  private open = false;
  private resting = false;
  private greeted = false;
  private saidSpanish = false;
  private seen = new Set<string>();
  private hideT = 0;
  private gen = 0;
  private bitT = 0;
  private sections: IntersectionObserver;

  constructor(root: HTMLElement) {
    this.root = root;
    const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    this.cv = q<HTMLCanvasElement>('[data-kc-canvas]');
    this.ctx = this.cv.getContext('2d')!;
    this.bubble = q('[data-kc-bubble]');
    this.say = q('[data-kc-say]');
    this.you = q('[data-kc-you]');
    this.chips = q('[data-kc-chips]');
    this.form = q<HTMLFormElement>('[data-kc-ask]');
    this.input = q<HTMLInputElement>('#kc-q');
    this.send = q<HTMLButtonElement>('[data-kc-send]');
    this.hit = q<HTMLButtonElement>('[data-kc-hit]');
    this.stack = [...root.querySelectorAll<HTMLElement>('[data-kc-stack] .kc__block')];
    this.bit = q('[data-kc-bit]');

    // colours per face, both stages: the block's tone times the face's shade
    const tones = blockTones(this.model);
    const table = (dark: boolean) => {
      const pal = palette(dark);
      const out = new Array<string>(this.faces.n);
      for (let i = 0; i < this.faces.n; i++) {
        const b = this.faces.block[i];
        out[i] = shade(pal[this.model.cls[b]], tones[b] * FACE_SHADE[this.faces.normal[i]]);
      }
      return out;
    };
    this.colours = { light: table(false), dark: table(true) };
    const eye = (dark: boolean) => FACE_SHADE.map((k) => shade(palette(dark)[1], k));
    this.eyeColour = { light: eye(false), dark: eye(true) };
    this.P = new Float32Array(this.faces.n * 8);
    this.D = new Float32Array(this.faces.n);
    this.order = new Int32Array(this.faces.n);
    for (let i = 0; i < this.faces.n; i++) this.order[i] = i;

    this.layout();
    this.wire();
    this.sections = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && this.comment((e.target as HTMLElement).dataset.kcSection!)),
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    for (const id of Object.keys(C.sections)) {
      // the method's line waits for the payoff, after his stage has gone by
      const el = id === 'method' ? document.querySelector<HTMLElement>('#method .method__payoff') : document.getElementById(id);
      if (!el) continue;
      el.dataset.kcSection = id;
      this.sections.observe(el);
    }
    requestAnimationFrame(this.frame);
  }

  // ---------------------------------------------------------------- drawing
  private still() {
    return this.reduced || document.documentElement.classList.contains('motion-paused');
  }

  private partTransforms(p: Pose): Aff[] {
    const piv = this.model.pivots;
    const body: Aff = { m: [1, 0, 0, 0, p.breathe, 0, 0, 0, 1], t: [0, 0, 0] };
    const head = compose(body, about(piv['1'], mul(rotZ(p.tilt), mul(rotY(p.yaw), rotX(p.nod)))));
    const xf: Aff[] = [body, head];
    xf[2] = compose(head, about(piv['2'], mul(rotZ(p.earL), rotX(0.5 * p.asleep))));
    xf[3] = compose(head, about(piv['3'], mul(rotZ(-p.earR), rotX(0.5 * p.asleep))));
    let chain = body;
    for (let s = 0; s < 4; s++) {
      chain = compose(chain, about(piv[String(4 + s)], mul(rotY(p.tail[s]), rotZ(p.tail[s] * 0.35))));
      xf[4 + s] = chain;
    }
    return xf.map((a) => ({ m: mul(CAM, a.m), t: vec(CAM, a.t) }));
  }

  private project(p: Pose) {
    const xf = this.partTransforms(p);
    const F = this.faces, c = F.corners, P = this.P, D = this.D;
    for (let i = 0; i < F.n; i++) {
      const a = xf[F.part[i]], m = a.m, t = a.t;
      let d = 0;
      for (let j = 0; j < 4; j++) {
        const o = i * 12 + j * 3;
        const x = c[o], y = c[o + 1], z = c[o + 2];
        P[i * 8 + j * 2] = m[0] * x + m[1] * y + m[2] * z + t[0];
        P[i * 8 + j * 2 + 1] = m[3] * x + m[4] * y + m[5] * z + t[1];
        d += m[6] * x + m[7] * y + m[8] * z + t[2];
      }
      D[i] = d;
    }
  }

  private layout() {
    this.S = this.phone.matches ? 2.8 : 3.6;
    this.project(REST);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < this.faces.n * 8; i += 2) {
      x0 = Math.min(x0, this.P[i]); x1 = Math.max(x1, this.P[i]);
      y0 = Math.min(y0, this.P[i + 1]); y1 = Math.max(y1, this.P[i + 1]);
    }
    this.bounds = { x0, x1, y0, y1 };
    this.cw = Math.round((x1 - x0 + MARGIN.l + MARGIN.r) * this.S);
    this.ch = Math.round((y1 - y0 + MARGIN.t + MARGIN.b) * this.S);
    this.cv.width = this.cw * this.dpr;
    this.cv.height = this.ch * this.dpr;
    this.root.style.setProperty('--kc-w', `${this.cw}px`);
    this.root.style.setProperty('--kc-h', `${this.ch}px`);
    const hp = vec(CAM, [-0.5, 19, 0]);
    this.headPx = (hp[0] - x0 + MARGIN.l) * this.S;
    this.placeBubble();
    this.A.dirty = true;
  }

  private draw(p: Pose, hop: number) {
    this.project(p);
    const D = this.D;
    this.order.sort((a, b) => D[a] - D[b]);
    const ctx = this.ctx, S = this.S, dpr = this.dpr, b = this.bounds;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    ctx.setTransform(dpr * S, 0, 0, -dpr * S, (MARGIN.l - b.x0) * S * dpr, (this.ch - MARGIN.b * S + b.y0 * S - hop * S) * dpr);
    ctx.lineWidth = 0.55 / S;
    const cols = this.dark ? this.colours.dark : this.colours.light;
    const eyes = this.dark ? this.eyeColour.dark : this.eyeColour.light;
    const closed = p.asleep > 0.5;
    let last = '';
    const P = this.P, F = this.faces;
    for (let k = 0; k < F.n; k++) {
      const i = this.order[k];
      const col = closed && F.eye[i] ? eyes[F.normal[i]] : cols[i];
      if (col !== last) {
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        last = col;
      }
      const o = i * 8;
      ctx.beginPath();
      ctx.moveTo(P[o], P[o + 1]);
      ctx.lineTo(P[o + 2], P[o + 3]);
      ctx.lineTo(P[o + 4], P[o + 5]);
      ctx.lineTo(P[o + 6], P[o + 7]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke(); // the same colour over the seams anti-aliasing leaves between faces
    }
  }

  private pose(t: number): { p: Pose; hop: number } {
    const A = this.A, still = this.still();
    const tt = still ? 0 : t;
    const happy = t < A.happyUntil;
    const p: Pose = { ...REST, tail: [0, 0, 0, 0] };
    p.asleep = A.asleep;
    p.breathe = still ? 1 : 1 + 0.012 * Math.sin((2 * Math.PI * tt) / 3.4);
    // tail: an S-wave to the tip around a slight outward lean; faster and wider when he's pleased
    const amp = (still ? 0 : happy ? 0.3 : 0.09) * (1 - A.asleep);
    const per = happy ? 0.8 : 1.7;
    for (let s = 0; s < 4; s++) p.tail[s] = amp * Math.sin((2 * Math.PI * tt) / per - s * 0.95) - (s === 0 ? 0.12 : 0);
    // ears: a twitch now and then, back a touch while he listens
    const k = Math.sin(clamp((t - A.twitch.t) / 0.28, 0, 1) * Math.PI);
    p.earL = (A.twitch.side === 2 ? 0.22 * k : 0) + 0.08 * A.listen;
    p.earR = (A.twitch.side === 3 ? 0.22 * k : 0) + 0.08 * A.listen;
    // head: looks at the pointer, nods as he talks, shakes for a no, drops when asleep
    const su = (t - A.shakeT0) / 0.9;
    const shake = su >= 0 && su < 1 ? 0.22 * Math.sin(2 * Math.PI * 2.5 * su) * (1 - su) : 0;
    p.yaw = A.look.yaw * (1 - A.asleep) + shake;
    p.nod = A.look.pitch * (1 - A.asleep) + 0.07 * A.talk + 0.32 * A.asleep;
    p.tilt = 0.1 * A.listen - 0.06 * A.asleep;
    let hop = 0;
    for (const h of A.hops) {
      const u = (t - h.t0) / h.d;
      if (u > 0 && u < 1) hop += h.h * Math.sin(Math.PI * u);
    }
    if (!still) hop += A.asleep * 0.25 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 3.2));
    return { p, hop };
  }

  private frame = () => {
    requestAnimationFrame(this.frame);
    if (document.hidden || this.root.hidden) return;
    const A = this.A, t = now();
    const dt = Math.min(0.1, t - (A.last || t));
    const active = A.talk > 0.01 || A.hops.length > 0 || t < A.shakeT0 + 1 || t < A.happyUntil || t < A.twitch.t + 0.3;
    if (!active && !A.dirty && t - A.last < 1 / 24) return;
    A.last = t;
    A.dirty = false;
    const still = this.still();
    A.asleep += (A.asleepT - A.asleep) * Math.min(1, dt * 4);
    A.listen += (A.listenT - A.listen) * Math.min(1, dt * 6);
    A.talk *= Math.pow(0.02, dt);
    A.look.yaw += (A.look.tyaw - A.look.yaw) * Math.min(1, dt * 5);
    A.look.pitch += (A.look.tpitch - A.look.pitch) * Math.min(1, dt * 5);
    A.hops = A.hops.filter((h) => t < h.t0 + h.d);
    if (!still && !this.busy && !A.asleepT && t > A.twitch.next) {
      A.twitch = { side: Math.random() < 0.5 ? 2 : 3, t, next: t + 3 + Math.random() * 4 };
    }
    if (!still && this.state === 'here' && !this.busy && !this.open && !A.asleepT && t > this.bitT) {
      this.bitT = t + 14 + Math.random() * 8;
      this.buildBit();
    }
    const { p, hop } = this.pose(t);
    this.draw(p, hop);
    if (still) A.dirty = false;
  };

  // ---------------------------------------------------------------- where he is
  private themeUnder() {
    const r = this.root.getBoundingClientRect();
    const x = clamp(r.left + r.width / 2, 1, innerWidth - 1), y = clamp(r.top + r.height * 0.7, 1, innerHeight - 1);
    for (const el of document.elementsFromPoint(x, y)) {
      if (this.root.contains(el) || el.closest('[data-header]')) continue;
      const t = el.closest('[data-theme]');
      if (t) return t.getAttribute('data-theme') === 'dark';
    }
    return false;
  }

  private syncTheme() {
    const dark = this.themeUnder();
    if (dark === this.dark) return;
    this.dark = dark;
    this.root.dataset.over = dark ? 'dark' : 'light';
    this.A.dirty = true;
  }

  private placeBubble() {
    const ptr = this.bubble.querySelector<HTMLElement>('.kc__ptr')!;
    if (this.phone.matches) {
      this.bubble.style.right = '';
      const br = this.bubble.getBoundingClientRect(), kr = this.root.getBoundingClientRect();
      ptr.style.right = `${clamp(br.right - (kr.left + this.headPx) - 5, 14, Math.max(14, br.width - 24))}px`;
    } else {
      this.bubble.style.right = `${Math.max(0, this.cw - this.headPx - 29)}px`;
      ptr.style.right = '24px';
    }
  }

  // ---------------------------------------------------------------- small moves
  private wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, this.still() ? Math.min(ms, 40) : ms));
  }
  private twitch(side: 2 | 3) {
    this.A.twitch = { side, t: now(), next: now() + 4 };
    this.A.dirty = true;
  }
  private hop(h = 3, d = 0.42) {
    if (this.still()) return;
    this.A.hops.push({ t0: now(), h, d });
    this.A.dirty = true;
  }
  private happy() {
    this.A.happyUntil = now() + 1.6;
  }

  /** Slides the whole corner by `from` → `to` px while he hops, over `dur` ms. */
  private slide(from: number, to: number, dur: number) {
    if (this.still()) {
      this.root.style.transform = to ? `translateX(${to}px)` : '';
      return Promise.resolve();
    }
    const n = Math.max(1, Math.round(dur / 420));
    for (let i = 0; i < n; i++) this.A.hops.push({ t0: now() + i * 0.42, h: 3, d: 0.42 });
    this.A.dirty = true;
    const t0 = performance.now();
    return new Promise<void>((done) => {
      const tick = (tn: number) => {
        const u = clamp((tn - t0) / dur, 0, 1);
        const x = from + (to - from) * u;
        this.root.style.transform = x ? `translateX(${x}px)` : '';
        if (u < 1) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
  }

  private async buildBit() {
    const b = this.bit;
    b.classList.remove('is-up', 'is-checked');
    b.classList.add('is-in');
    this.twitch(2);
    await this.wait(700);
    if (this.busy) return;
    b.classList.add('is-checked');
    await this.wait(500);
    b.classList.add('is-up');
    await this.wait(400);
    b.classList.remove('is-in', 'is-up', 'is-checked');
  }

  /** Three grey blocks go up above his head, then each one is checked, bottom up. */
  private async think(g: number) {
    this.A.listenT = 1;
    for (const s of this.stack) s.classList.remove('is-in', 'is-out', 'is-checked');
    for (const s of this.stack) {
      await this.wait(20);
      s.classList.add('is-in');
      await this.wait(220);
      if (g !== this.gen) return;
    }
    await this.wait(160);
    for (const s of this.stack) {
      s.classList.add('is-checked');
      await this.wait(130);
    }
    await this.wait(220);
    for (const s of this.stack) s.classList.add('is-out');
    this.A.listenT = 0;
    await this.wait(200);
    for (const s of this.stack) s.classList.remove('is-in', 'is-out', 'is-checked');
  }

  // ---------------------------------------------------------------- the bubble
  private show(opts: { you?: string; chips?: HTMLElement[]; autohide?: number }) {
    clearTimeout(this.hideT);
    this.you.hidden = !opts.you;
    this.you.textContent = opts.you ? `you · ${opts.you}` : '';
    this.chips.textContent = '';
    (opts.chips || []).forEach((c) => this.chips.appendChild(c));
    this.bubble.classList.add('is-open');
    this.bubble.setAttribute('aria-hidden', 'false');
    this.hit.setAttribute('aria-expanded', 'true');
    this.open = true;
    this.placeBubble();
    if (opts.autohide) this.hideT = window.setTimeout(() => this.hide(), opts.autohide);
  }

  hide() {
    clearTimeout(this.hideT);
    this.bubble.classList.remove('is-open');
    this.bubble.setAttribute('aria-hidden', 'true');
    this.hit.setAttribute('aria-expanded', 'false');
    this.open = false;
  }

  private el(tag: string, cls: string, text: string) {
    const e = document.createElement(tag);
    e.className = cls;
    e.textContent = text;
    return e;
  }
  private chipQ(text: string) {
    const b = this.el('button', 'kc__chip kc__chip--q', text) as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', () => this.ask(text));
    return b;
  }
  private chipGo(id: string) {
    const b = this.el('button', 'kc__chip', C.follow(id)) as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', () => this.follow(id));
    return b;
  }
  private chipOut(l: Link) {
    const a = this.el('a', 'kc__chip kc__chip--out', `${l.label} ↗`) as HTMLAnchorElement;
    a.href = l.href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  private chipsFor(r: Answer) {
    const out: HTMLElement[] = [];
    if (r.go) out.push(this.chipGo(r.go));
    (r.links || []).forEach((l) => out.push(this.chipOut(l)));
    return out;
  }
  private suggestions() {
    return C.suggest.map((s) => this.chipQ(s));
  }

  private speak(text: string, g: number) {
    this.say.textContent = '';
    if (this.still()) {
      this.say.textContent = text;
      return Promise.resolve();
    }
    const caret = this.el('span', 'kc__caret', '');
    this.say.appendChild(caret);
    const words = text.split(' ');
    let i = 0;
    return new Promise<void>((done) => {
      const step = () => {
        if (g !== this.gen || i >= words.length) {
          caret.remove();
          done();
          return;
        }
        this.say.insertBefore(document.createTextNode((i ? ' ' : '') + words[i]), caret);
        this.A.talk = 1;
        this.A.dirty = true;
        i++;
        setTimeout(step, 34 + Math.random() * 36);
      };
      step();
    });
  }

  // ---------------------------------------------------------------- behaviour
  /** Asks Kit something. Resolves once he has answered. */
  async ask(text: string) {
    text = (text || '').trim();
    if (!text || this.busy || this.state !== 'here') return;
    this.busy = true;
    this.send.disabled = true;
    this.input.disabled = true;
    this.input.value = '';
    const g = ++this.gen;
    if (this.A.asleepT) await this.wake();
    this.show({ you: text });
    this.say.textContent = '';
    await this.think(g);
    if (g !== this.gen) return;
    const r: Answer | null = match(text);
    if (!r) {
      this.A.shakeT0 = now();
      this.A.dirty = true;
      await this.wait(300);
    }
    let line = (r || C.oos).a;
    if (!this.saidSpanish && looksSpanish(text)) {
      this.saidSpanish = true;
      line += ` ${C.spanish}`;
    }
    await this.speak(line, g);
    if (g !== this.gen) return;
    this.chipsFor(r || C.oos).forEach((c) => this.chips.appendChild(c));
    if (r) this.happy();
    this.busy = false;
    this.send.disabled = false;
    this.input.disabled = false;
    if (this.finePointer.matches) this.input.focus();
    this.hideT = window.setTimeout(() => this.hide(), 25000);
  }

  /** Scrolls to a section while he hops in place, then says its line. */
  async follow(id: string) {
    const target = document.getElementById(id);
    if (!target || this.busy) return;
    this.busy = true;
    this.hide();
    const from = scrollY;
    const to = Math.max(0, target.getBoundingClientRect().top + from - (id === 'top' ? 0 : 72));
    const dur = this.still() ? 0 : 900;
    if (dur) {
      const n = Math.ceil(dur / 420), t0 = performance.now();
      for (let i = 0; i < n; i++) this.A.hops.push({ t0: now() + i * 0.42, h: 2.6, d: 0.42 });
      this.A.dirty = true;
      await new Promise<void>((done) => {
        const tick = (tn: number) => {
          const u = clamp((tn - t0) / dur, 0, 1);
          scrollTo({ top: from + (to - from) * quint(u), behavior: 'instant' });
          if (u < 1) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
    } else scrollTo({ top: to, behavior: 'instant' });
    this.busy = false;
    this.seen.add(id);
    if (this.state !== 'here') return;
    this.happy();
    const line = C.sections[id];
    if (!line) return;
    await this.wait(500);
    if (this.busy || this.state !== 'here') return;
    this.say.textContent = `${C.here} ${line.a}`;
    this.show({ chips: [this.chipQ(line.q)], autohide: 9000 });
  }

  private comment(id: string) {
    const line = C.sections[id];
    if (!line || this.seen.has(id) || this.state !== 'here' || this.busy || this.resting || this.A.asleepT) return;
    this.seen.add(id);
    this.twitch(Math.random() < 0.5 ? 2 : 3);
    setTimeout(() => {
      if (this.busy || this.state !== 'here' || (this.open && !this.you.hidden)) return;
      this.say.textContent = line.a;
      this.show({ chips: [this.chipQ(line.q)], autohide: 8000 });
    }, 500);
  }

  private async wake() {
    this.resting = false;
    this.A.asleepT = 0;
    this.twitch(2);
    this.happy();
    await this.wait(350);
  }

  private async openAsk() {
    if (this.busy || this.state !== 'here') return;
    const wasResting = this.A.asleepT > 0;
    if (wasResting) await this.wake();
    this.say.textContent = wasResting ? C.awake : this.greeted ? C.again : C.hello;
    this.greeted = true;
    this.show({ chips: this.suggestions() });
    if (this.finePointer.matches) this.input.focus();
  }

  private rest() {
    this.gen++;
    this.hide();
    this.resting = true;
    this.busy = false;
    this.send.disabled = false;
    this.input.disabled = false;
    for (const s of this.stack) s.classList.remove('is-in', 'is-out', 'is-checked');
    this.A.listenT = 0;
    this.A.asleepT = 1;
    this.A.dirty = true;
  }

  /** The stages say whether the corner is his right now. */
  setOnStage(onStage: boolean) {
    this.wanted = !onStage;
    this.settle();
  }

  private settling = false;
  private async settle() {
    if (this.settling) return;
    this.settling = true;
    try {
      while ((this.wanted && this.state === 'away') || (!this.wanted && this.state === 'here')) {
        if (this.wanted) await this.arrive();
        else await this.leave();
      }
    } finally {
      this.settling = false;
    }
  }

  private async arrive() {
    this.state = 'arriving';
    this.root.hidden = false;
    this.syncTheme();
    this.hide();
    const off = this.cw + 40;
    this.root.style.transform = `translateX(${off}px)`;
    await this.wait(200);
    await this.slide(off, 0, 4 * 420);
    this.state = 'here';
    this.happy();
    if (!this.greeted && !this.resting) {
      await this.wait(500);
      if (this.state !== 'here' || this.busy) return;
      this.greeted = true;
      this.say.textContent = C.hello;
      this.show({ chips: this.suggestions(), autohide: 10000 });
    }
  }

  private async leave() {
    this.state = 'leaving';
    this.gen++;
    this.hide();
    this.busy = false;
    this.send.disabled = false;
    this.input.disabled = false;
    for (const s of this.stack) s.classList.remove('is-in', 'is-out', 'is-checked');
    const off = this.cw + 40;
    await this.slide(0, off, 3 * 420);
    this.root.hidden = true;
    this.root.style.transform = '';
    this.state = 'away';
  }

  // ---------------------------------------------------------------- wiring
  private wire() {
    this.hit.addEventListener('click', () => {
      if (this.open) {
        clearTimeout(this.hideT);
        this.input.focus();
      } else this.openAsk();
    });
    this.root.querySelector('[data-kc-close]')!.addEventListener('click', () => this.hide());
    this.root.querySelector('[data-kc-rest]')!.addEventListener('click', () => this.rest());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.ask(this.input.value);
    });
    this.input.addEventListener('focus', () => {
      this.A.listenT = 1;
      this.A.dirty = true;
      clearTimeout(this.hideT);
    });
    this.input.addEventListener('blur', () => {
      if (!this.busy) this.A.listenT = 0;
      this.A.dirty = true;
    });
    this.bubble.addEventListener('mouseenter', () => clearTimeout(this.hideT));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.hide();
    });
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!this.root.hidden) this.syncTheme();
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => {
      this.layout();
      onScroll();
    });
    this.phone.addEventListener('change', () => this.layout());
    document.addEventListener('visibilitychange', () => (this.A.dirty = true));
    // he looks at the pointer, the way he does on the stage
    addEventListener(
      'pointermove',
      (e) => {
        if (!this.finePointer.matches || this.root.hidden || this.still()) return;
        const r = this.root.getBoundingClientRect();
        const hx = r.left + this.headPx, hy = r.top + r.height * 0.4;
        this.A.look.tyaw = clamp(((e.clientX - hx) / innerWidth) * 0.9, -0.42, 0.42);
        this.A.look.tpitch = clamp(((e.clientY - hy) / innerHeight) * 0.5, -0.2, 0.2);
        this.A.dirty = true;
      },
      { passive: true },
    );
  }
}
