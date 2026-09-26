import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import { blockLooks, easeIO, loadKit, PAW } from './model';
import { fragmentShader, vertexShader } from './shaders';

export type KitStatus =
  | { kind: 'building' }
  | { kind: 'checking' }
  | { kind: 'built' }
  | { kind: 'broken'; part: string }
  | { kind: 'rebuilt'; part: string };

export interface KitOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement; // element whose size the canvas follows
  clearOf?: HTMLElement; // Kit is framed above this element (the stage bar)
  theme?: 'dark' | 'light';
  reducedMotion?: boolean;
  skipIntro?: boolean;
  introSpeed?: number; // >1 plays the intro faster (returning visitors)
  onStatus?: (s: KitStatus) => void;
  onScan?: (screenY: number | null) => void;
  manualClock?: boolean; // for deterministic captures
}

const PART_NAMES = ['Body', 'Head', 'Ear', 'Ear', 'Tail', 'Tail', 'Tail', 'Tail'];

// timeline (seconds)
const T_SCAN = 1.45; // global check starts, relative to intro start
const SCAN_SPEED = 42; // units per second (Kit is ~35 units tall)
const BREAK_SCAN_AT = 1.95; // local check starts, relative to the break
const BREAK_LIFE = 3.2;

export class KitEngine {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(22, 1, 1, 600);
  private material: ShaderMaterial;
  private mesh: Mesh;
  private opts: KitOptions;

  private n0: number; // Kit's own blocks (the rest are joint fillers)
  private pivots: Record<string, number[]>;
  private home: Float32Array;
  private part: Uint8Array;
  private cls: Uint8Array;
  private occ = new Map<number, number>(); // grid cell -> block index
  private min = new Vector3();
  private dims = new Vector3();

  private clock0 = performance.now();
  private now = 0;
  private introAt = 0;
  private speed = 1;
  private breaks: { c: Vector3; t: number; part: string; scanY0: number; scanSpeed: number; announced: number }[] = [];
  private lastBreak = { t: -10, c: new Vector3(1e9, 0, 0) };

  private pointer = { x: 0, y: 0, active: false, down: false };
  private look = { yaw: 0, pitch: 0 };
  private cam = { az: 0.62, el: 0.13, dist: 120 };
  private target = new Vector3();
  private extent = { h: 36, w: 26 };
  private earTwitch = { side: 0, t: -10, next: 3.5 };
  private paused = false;
  private visible = true;
  private raf = 0;
  private status: KitStatus['kind'] | '' = '';
  private introAnnounced = false;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private disposed = false;

  constructor(opts: KitOptions) {
    this.opts = opts;
    const model = loadKit();
    const n = model.n;
    this.n0 = model.n0;
    this.pivots = model.pivots;
    this.home = model.home;
    const start = model.start;
    this.cls = model.cls;
    this.part = model.part;

    const dark = (opts.theme ?? 'dark') === 'dark';
    const { color, seed } = blockLooks(model, dark);
    const metaAttr = new Float32Array(n * 2);
    const { bmin, bmax } = model;
    this.target.set(0, (bmin[1] + bmax[1]) / 2, 0);
    const wx = bmax[0] - bmin[0] + 1;
    const wz = bmax[2] - bmin[2] + 1;
    // height with room for the breath and the ears' twitch; width as seen from the resting 3/4 camera
    this.extent = { h: bmax[1] - bmin[1] + 5, w: Math.cos(0.4) * wx + Math.sin(0.4) * wz + 2 };
    for (let i = 0; i < n; i++) {
      metaAttr[i * 2] = this.part[i];
      metaAttr[i * 2 + 1] = (this.home[i * 3 + 1] - bmin[1]) / (bmax[1] - bmin[1]);
    }
    // centre of the intro cube (Kit's own blocks; joint fillers ride along with theirs)
    const cube = new Vector3();
    for (let i = 0; i < model.n0; i++) {
      cube.x += start[i * 3];
      cube.y += start[i * 3 + 1];
      cube.z += start[i * 3 + 2];
    }
    cube.multiplyScalar(1 / model.n0);

    // occupancy grid for picking (cells are unit blocks centred on integers)
    this.min.set(bmin[0] - 0.5, bmin[1] - 0.5, bmin[2] - 0.5);
    this.dims.set(bmax[0] - bmin[0] + 1, bmax[1] - bmin[1] + 1, bmax[2] - bmin[2] + 1);
    for (let i = 0; i < model.n0; i++) {
      const gx = Math.round(this.home[i * 3] - bmin[0]);
      const gy = Math.round(this.home[i * 3 + 1] - bmin[1]);
      const gz = Math.round(this.home[i * 3 + 2] - bmin[2]);
      this.occ.set(this.cellKey(gx, gy, gz), i);
    }

    const box = new BoxGeometry(1, 1, 1);
    const geo = new InstancedBufferGeometry();
    geo.index = box.index;
    geo.setAttribute('position', box.getAttribute('position'));
    geo.setAttribute('normal', box.getAttribute('normal'));
    geo.setAttribute('uv', box.getAttribute('uv'));
    geo.setAttribute('aHome', new InstancedBufferAttribute(this.home, 3));
    geo.setAttribute('aStart', new InstancedBufferAttribute(start, 3));
    geo.setAttribute('aColor', new InstancedBufferAttribute(color, 3));
    geo.setAttribute('aMeta', new InstancedBufferAttribute(metaAttr, 2));
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    geo.instanceCount = n;

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntro: { value: 100 },
        uScan: { value: new Vector3(-100, -10, SCAN_SPEED) },
        uPart: { value: Array.from({ length: 8 }, () => new Matrix4()) },
        uBreak: { value: Array.from({ length: 4 }, () => new Vector4(0, 0, 0, -100)) },
        uBreakScan: { value: Array.from({ length: 4 }, () => new Vector3(-100, -10, 40)) },
        uBreakR: { value: 4.4 },
        uReduced: { value: opts.reducedMotion ? 1 : 0 },
        uCube: { value: cube },
        uGrey: { value: new Color(dark ? '#4A4A4A' : '#B9B6AE') },
        uGrout: { value: 0.09 },
        uGroutPx: { value: 1.0 },
      },
    });
    this.mesh = new Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!opts.manualClock,
    });
    this.renderer.setClearColor(0x000000, 0);

    this.speed = opts.introSpeed ?? 1;
    if (opts.reducedMotion || opts.skipIntro) this.introAt = -100;
    else this.introAt = 0.15;
    this.setScanFromIntro();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.host);
    if (opts.clearOf) this.ro.observe(opts.clearOf);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.kick();
    });
    this.io.observe(opts.host);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.bindPointer();
    this.resize();
    this.emit(this.introAt < 0 ? 'built' : 'building');
    if (!opts.manualClock) this.kick();
  }

  // ------------------------------------------------------------- public API
  setPaused(p: boolean) {
    this.paused = p;
    this.kick();
  }

  /** Break Kit at a random visible spot (keyboard / button). */
  breakRandom() {
    const candidates = [1, 1, 1, 2, 3, 4, 5, 6, 7, 0];
    const want = candidates[Math.floor(Math.random() * candidates.length)];
    let idx = -1;
    for (let tries = 0; tries < 200; tries++) {
      const i = Math.floor(Math.random() * this.n0);
      if (this.part[i] === want) {
        idx = i;
        break;
      }
    }
    if (idx < 0) idx = Math.floor(Math.random() * this.n0);
    this.breakAt(new Vector3(this.home[idx * 3], this.home[idx * 3 + 1], this.home[idx * 3 + 2]), idx);
  }

  /** Deterministic clock for captures: seconds since mount. */
  setTime(t: number) {
    this.now = t;
    this.frame(false);
  }

  /** Simulate a break at normalised screen coords (for captures and tests). */
  breakAtScreen(nx: number, ny: number) {
    const hit = this.pick(nx, ny);
    if (hit) this.breakAt(hit.p, hit.i);
    return !!hit;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }

  // ------------------------------------------------------------- internals
  private onVisibility = () => this.kick();

  private kick() {
    if (this.opts.manualClock || this.disposed) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = () => {
    if (this.disposed) return;
    this.now = (performance.now() - this.clock0) / 1000;
    const busy = this.frame(true);
    const run = this.visible && document.visibilityState === 'visible' && (busy || !this.paused);
    if (run) this.raf = requestAnimationFrame(this.loop);
  };

  private cellKey(x: number, y: number, z: number) {
    return (x * 64 + y) * 64 + z;
  }

  private setScanFromIntro() {
    const u = this.material.uniforms;
    if (this.introAt < 0) u.uScan.value.set(-100, -10, SCAN_SPEED);
    else u.uScan.value.set(this.introAt + T_SCAN / this.speed, -1.5, SCAN_SPEED * this.speed);
  }

  private resize() {
    const { host, canvas } = this.opts;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const mobile = Math.min(w, h) < 700;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // frame Kit in the part of the stage above the bar, so he never covers it
    let inset = 0;
    const bar = this.opts.clearOf;
    if (bar && bar.offsetHeight > 0) {
      const gap = host.getBoundingClientRect().bottom - bar.getBoundingClientRect().top + 12;
      inset = Math.min(Math.max(0, gap), h * 0.4);
    }
    const fh = h - inset;
    this.camera.aspect = w / fh;
    this.camera.setViewOffset(w, fh, 0, 0, w, h);
    // fit Kit inside that area
    const vFov = (this.camera.fov * Math.PI) / 180;
    const fitH = this.extent.h / (2 * Math.tan(vFov / 2)) / 0.86;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fitW = this.extent.w / (2 * Math.tan(hFov / 2)) / 0.86;
    this.cam.dist = Math.max(fitH, fitW);
    this.camera.updateProjectionMatrix();
    this.kick();
    if (this.opts.manualClock) this.frame(false);
  }

  private bindPointer() {
    const c = this.opts.canvas;
    const toN = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)];
    };
    c.addEventListener('pointermove', (e) => {
      const [x, y] = toN(e);
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = true;
      if (this.pointer.down) this.tryBreak(x, y, true);
      this.kick();
    });
    c.addEventListener('pointerleave', () => {
      this.pointer.active = false;
      this.pointer.down = false;
      c.style.cursor = '';
    });
    c.addEventListener('pointerdown', (e) => {
      const [x, y] = toN(e);
      this.pointer.down = true;
      if (e.pointerType === 'mouse') c.style.cursor = 'grabbing';
      this.tryBreak(x, y, false);
      this.kick();
    });
    window.addEventListener('pointerup', () => {
      this.pointer.down = false;
      c.style.cursor = '';
    });
  }

  private tryBreak(nx: number, ny: number, dragging: boolean) {
    const hit = this.pick(nx, ny);
    if (!hit) return;
    const since = this.now - this.lastBreak.t;
    const far = hit.p.distanceTo(this.lastBreak.c);
    if (dragging && (since < 0.11 || far < 4.2)) return;
    if (!dragging && since < 0.08) return;
    this.breakAt(hit.p, hit.i);
  }

  private breakAt(p: Vector3, i: number) {
    if (this.introAt >= 0 && (this.now - this.introAt) * this.speed < 2.6) return; // let Kit finish first
    const partName = this.cls[i] === PAW ? 'Paw' : PART_NAMES[this.part[i]];
    const R = this.material.uniforms.uBreakR.value as number;
    // reuse the oldest slot
    if (this.breaks.length >= 4) this.breaks.shift();
    this.breaks.push({
      c: p.clone(),
      t: this.now,
      part: partName,
      scanY0: p.y - R - 0.6,
      scanSpeed: (2 * R + 1.2) / 0.5,
      announced: 0,
    });
    this.lastBreak = { t: this.now, c: p.clone() };
    this.emitStatus({ kind: 'broken', part: partName });
    this.kick();
  }

  /** Grid DDA along the camera ray; returns the first block hit. */
  private pick(nx: number, ny: number): { p: Vector3; i: number } | null {
    const origin = this.camera.position.clone();
    const dir = new Vector3(nx, ny, 0.5).unproject(this.camera).sub(origin).normalize();
    // move to grid space
    const o = origin.clone().sub(this.min);
    const d = dir;
    const size = this.dims;
    // intersect ray with grid bounds
    let tmin = 0;
    let tmax = 1e9;
    for (const ax of ['x', 'y', 'z'] as const) {
      const inv = 1 / (d[ax] || 1e-9);
      let t0 = (0 - o[ax]) * inv;
      let t1 = (size[ax] - o[ax]) * inv;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tmin = Math.max(tmin, t0);
      tmax = Math.min(tmax, t1);
    }
    if (tmax < tmin) return null;
    const p = o.clone().addScaledVector(d, tmin + 1e-4);
    let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
    const stepX = Math.sign(d.x), stepY = Math.sign(d.y), stepZ = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tx = (stepX > 0 ? x + 1 - p.x : p.x - x) * tdx;
    let ty = (stepY > 0 ? y + 1 - p.y : p.y - y) * tdy;
    let tz = (stepZ > 0 ? z + 1 - p.z : p.z - z) * tdz;
    for (let s = 0; s < 256; s++) {
      if (x < 0 || y < 0 || z < 0 || x >= size.x || y >= size.y || z >= size.z) return null;
      const idx = this.occ.get(this.cellKey(x, y, z));
      if (idx !== undefined) {
        return { p: new Vector3(this.home[idx * 3], this.home[idx * 3 + 1], this.home[idx * 3 + 2]), i: idx };
      }
      if (tx < ty && tx < tz) {
        x += stepX;
        tx += tdx;
      } else if (ty < tz) {
        y += stepY;
        ty += tdy;
      } else {
        z += stepZ;
        tz += tdz;
      }
    }
    return null;
  }

  private emit(kind: 'building' | 'checking' | 'built') {
    if (this.status === kind) return;
    this.status = kind;
    this.opts.onStatus?.({ kind } as KitStatus);
  }

  private emitStatus(s: KitStatus) {
    this.status = s.kind;
    this.opts.onStatus?.(s);
  }

  /** Advances one frame. Returns true while something time-based is in flight. */
  private frame(real: boolean): boolean {
    const t = this.now;
    const u = this.material.uniforms;
    const reduced = !!this.opts.reducedMotion;
    const still = reduced || this.paused;
    u.uTime.value = t;
    const intro = this.introAt < 0 ? 100 : (t - this.introAt) * this.speed;
    u.uIntro.value = Math.max(0, intro);

    // intro status (robust to clock jumps)
    let busy = intro < 3.0;
    if (this.introAt >= 0 && !this.introAnnounced) {
      if (intro < T_SCAN) this.emit('building');
      else if (intro < T_SCAN + 0.95) this.emit('checking');
      else {
        this.emit('built');
        this.introAnnounced = true;
      }
    }

    // breaks: status first (so a jump in time never skips it), then uniforms
    const R = u.uBreakR.value as number;
    const latest = this.breaks[this.breaks.length - 1];
    for (const b of this.breaks) {
      const bt = t - b.t;
      const dur = (2 * R + 1.2) / b.scanSpeed;
      if (bt >= BREAK_SCAN_AT && b.announced < 1) {
        b.announced = 1;
        if (b === latest) this.emit('checking');
      }
      if (bt >= BREAK_SCAN_AT + dur + 0.1 && b.announced < 2) {
        b.announced = 2;
        if (b === latest) this.emitStatus({ kind: 'rebuilt', part: b.part });
      }
    }
    this.breaks = this.breaks.filter((b) => t - b.t < BREAK_LIFE);
    for (let i = 0; i < 4; i++) {
      const b = this.breaks[i];
      if (b) {
        u.uBreak.value[i].set(b.c.x, b.c.y, b.c.z, b.t);
        u.uBreakScan.value[i].set(b.t + BREAK_SCAN_AT, b.scanY0, b.scanSpeed);
      } else {
        u.uBreak.value[i].set(0, 0, 0, -100);
        u.uBreakScan.value[i].set(-100, -10, 40);
      }
    }
    const last = this.breaks[this.breaks.length - 1];
    if (last) busy = true;

    // idle pose
    const tt = still ? 0 : t;
    const breathe = still ? 1 : 1 + 0.012 * Math.sin((2 * Math.PI * tt) / 3.4);
    const piv = this.pivots;
    const m = u.uPart.value as Matrix4[];
    const body = new Matrix4().makeScale(1, breathe, 1);
    m[0].copy(body);

    // head looks at the pointer (or drifts gently)
    const tx = this.pointer.active && !still ? this.pointer.x * 0.42 : still ? 0 : Math.sin(tt * 0.35) * 0.08;
    const ty = this.pointer.active && !still ? this.pointer.y * 0.2 : 0;
    const ease = real ? 0.08 : 1;
    this.look.yaw += (tx - this.look.yaw) * ease;
    this.look.pitch += (-ty - this.look.pitch) * ease;
    const hp = piv['1'];
    const head = body
      .clone()
      .multiply(new Matrix4().makeTranslation(hp[0], hp[1], hp[2]))
      .multiply(new Matrix4().makeRotationY(this.look.yaw))
      .multiply(new Matrix4().makeRotationX(this.look.pitch))
      .multiply(new Matrix4().makeTranslation(-hp[0], -hp[1], -hp[2]));
    m[1].copy(head);

    // ears: follow the head, twitch now and then
    if (!still && t > this.earTwitch.next) {
      this.earTwitch = { side: Math.random() < 0.5 ? 2 : 3, t, next: t + 3 + Math.random() * 4 };
    }
    for (const e of [2, 3]) {
      const ep = piv[String(e)];
      const k = this.earTwitch.side === e ? Math.sin(Math.min(1, (t - this.earTwitch.t) / 0.28) * Math.PI) : 0;
      const dirSign = e === 2 ? 1 : -1;
      m[e].copy(head)
        .multiply(new Matrix4().makeTranslation(ep[0], ep[1], ep[2]))
        .multiply(new Matrix4().makeRotationZ(dirSign * 0.22 * k))
        .multiply(new Matrix4().makeTranslation(-ep[0], -ep[1], -ep[2]));
    }

    // tail: an S-wave that travels to the tip (the whole tail moves, not just the end)
    let chain = body.clone();
    for (let s = 0; s < 4; s++) {
      const id = 4 + s;
      const p = piv[String(id)];
      // sways around a slight outward lean, so the tip stays in view from the resting camera
      const a = (still ? 0 : 0.09 * Math.sin((2 * Math.PI * tt) / 1.7 - s * 0.95)) - (s === 0 ? 0.12 : 0);
      chain = chain
        .clone()
        .multiply(new Matrix4().makeTranslation(p[0], p[1], p[2]))
        .multiply(new Matrix4().makeRotationY(a))
        .multiply(new Matrix4().makeRotationZ(a * 0.35))
        .multiply(new Matrix4().makeTranslation(-p[0], -p[1], -p[2]));
      m[id].copy(chain);
    }

    // camera: settles during the intro, small parallax with the pointer
    const settle = this.introAt < 0 ? 1 : easeIO(intro / 2.6);
    const baseAz = 0.62 + (0.4 - 0.62) * settle;
    const paz = this.pointer.active && !still ? this.pointer.x * 0.05 : 0;
    const pel = this.pointer.active && !still ? this.pointer.y * 0.03 : 0;
    this.cam.az += (baseAz + paz - this.cam.az) * (real ? 0.06 : 1);
    this.cam.el += (0.13 + pel - this.cam.el) * (real ? 0.06 : 1);
    const target = this.target;
    const d = this.cam.dist;
    this.camera.position.set(
      target.x + Math.sin(this.cam.az) * Math.cos(this.cam.el) * d,
      target.y + Math.sin(this.cam.el) * d,
      target.z + Math.cos(this.cam.az) * Math.cos(this.cam.el) * d,
    );
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();

    this.renderer.render(this.scene, this.camera);

    // scan line on screen (the most recent active scan)
    let scanY: number | null = null;
    const gs = u.uScan.value as Vector3;
    if (t >= gs.x && t <= gs.x + 38 / gs.z) scanY = gs.y + (t - gs.x) * gs.z;
    if (last) {
      const s0 = last.t + BREAK_SCAN_AT;
      const dur = (2 * R + 1.2) / last.scanSpeed;
      if (t >= s0 && t <= s0 + dur) scanY = last.scanY0 + (t - s0) * last.scanSpeed;
    }
    if (this.opts.onScan) {
      if (scanY === null) this.opts.onScan(null);
      else {
        const v = new Vector3(0, scanY, 0).project(this.camera);
        this.opts.onScan(((1 - v.y) / 2) * this.opts.host.clientHeight);
      }
    }
    return busy || (!still && this.pointer.active);
  }
}
