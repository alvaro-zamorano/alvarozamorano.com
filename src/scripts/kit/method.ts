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
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import { blockLooks, loadKit, SIGNAL } from './model';
import { fragmentShader } from './shaders';
import { agentVertex, blockVertex, mouldFragment, mouldVertex, T } from './method-shaders';

export interface MethodStatus {
  text: string;
  checked: boolean;
}

export interface MethodOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement; // the sticky stage; the canvas follows its size
  clearOf?: HTMLElement; // the status bar: Kit is framed above it
  manualClock?: boolean; // deterministic captures
  onStatus?: (s: MethodStatus) => void;
  onScan?: (screenY: number | null) => void;
  onTip?: (p: { x: number; y: number } | null) => void; // where to offer "Approve"
}

const EAR_R = 3; // part id of the ear on the camera side
const AGENTS = 3;
const BINS = 48;
const HOVER = new Vector3(1.4, 6.5, 0.6);
const REST = [new Vector3(-15, 34, 3), new Vector3(0, 42, -5), new Vector3(15, 34, 3)];
const AGENT_SIZE = 1.9;
const DROP_S = 0.7; // seconds for the approved tip to land
const TIPSCAN_S = 0.4;

const c01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, t: number) => {
  const x = c01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

type Path = Float32Array; // BINS * 3

export class MethodScene {
  private opts: MethodOptions;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(22, 1, 1, 800);
  private blocks: ShaderMaterial;
  private mould: ShaderMaterial;
  private agents: ShaderMaterial;
  private mouldMesh: Mesh;

  private p = 0;
  private now = 0;
  private clock0 = performance.now();
  private approvedAt: number | null = null;
  private paused = false;
  private visible = true;
  private idle = 1;
  private raf = 0;
  private disposed = false;
  private statusKey = '';

  private pivots: Record<string, number[]>;
  private paths1: Path[] = []; // agents while Kit is taken apart
  private paths2: Path[] = []; // agents while they rebuild him
  private failTime = 0;
  private failRange = new Vector2();
  private failCentre = new Vector3();
  private failAgent = new Vector3();
  private tipRange = new Vector2();
  private tipCentre = new Vector3();
  private yRange = new Vector2();
  private target = new Vector3(0, 21, -1);
  private extent = { h: 48, w: 42 };
  private dist = 150;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(opts: MethodOptions) {
    this.opts = opts;
    const m = loadKit();
    const n = m.n;
    this.pivots = m.pivots;
    const { color, seed } = blockLooks(m, true);
    const [ymin, ymax] = [m.bmin[1], m.bmax[1]];
    this.yRange.set(ymin - 0.5, ymax + 0.5);

    // which blocks fail the check: the ear that faces the camera
    let e0 = 1e9, e1 = -1e9;
    for (let i = 0; i < m.n0; i++) if (m.part[i] === EAR_R) (e0 = Math.min(e0, m.home[i * 3 + 1])), (e1 = Math.max(e1, m.home[i * 3 + 1]));

    // order (bottom 0 .. top 1, a little ragged), kind, and which agent handles each block
    const order = new Float32Array(n);
    const kind = new Float32Array(n);
    const fail = new Vector3(), tip = new Vector3();
    let nf = 0, nt = 0;
    let t0 = 1e9, t1 = -1e9;
    for (let i = 0; i < n; i++) {
      const y = m.home[i * 3 + 1];
      const own = i < m.n0; // joint fillers copy their block and don't count twice
      order[i] = ((y - ymin) / (ymax - ymin)) * 0.9 + seed[i * 4 + 3] * 0.1;
      if (m.cls[i] === SIGNAL) {
        kind[i] = 1;
        if (!own) continue;
        tip.add(new Vector3(m.home[i * 3], y, m.home[i * 3 + 2]));
        nt++;
        t0 = Math.min(t0, y);
        t1 = Math.max(t1, y);
      } else if (m.part[i] === EAR_R) {
        kind[i] = 2;
        fail.add(new Vector3(m.home[i * 3], y, m.home[i * 3 + 2]));
        nf++;
      }
    }
    this.failCentre.copy(fail.multiplyScalar(1 / Math.max(1, nf)));
    this.failRange.set(e0, e1);
    this.failAgent.copy(this.failCentre).add(new Vector3(1.5, 8, 2));
    this.tipCentre.copy(tip.multiplyScalar(1 / Math.max(1, nt)));
    this.tipRange.set(t0, t1);
    // the check clears the failed blocks once it passes the top of the cluster
    const yk = (e1 - this.yRange.x) / (this.yRange.y - this.yRange.x);
    this.failTime = T.s0 + (T.s1 - T.s0) * yk;

    // agents: left, middle and right thirds of Kit, by count (fillers go with their block)
    const agent = new Uint8Array(n);
    const byX = Array.from({ length: m.n0 }, (_, i) => i).sort(
      (a, b) => m.home[a * 3] - m.home[b * 3] || m.home[a * 3 + 2] - m.home[b * 3 + 2],
    );
    byX.forEach((idx, j) => (agent[idx] = Math.min(AGENTS - 1, Math.floor((j * AGENTS) / m.n0))));
    for (let i = m.n0; i < n; i++) agent[i] = agent[m.orig[i]];

    // departure times per step, and each agent's path beside the blocks it handles
    const dep1 = new Float32Array(n);
    const dep2 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      dep1[i] = T.d1a + (T.d1b - T.d1a) * (1 - order[i]);
      dep2[i] = kind[i] === 1 ? T.d2b : T.d2a + (T.d2b - T.d2a) * order[i];
    }
    for (let a = 0; a < AGENTS; a++) {
      this.paths1.push(this.buildPath(m.home, agent, a, dep1, T.d1a, T.d1b));
      this.paths2.push(this.buildPath(m.home, agent, a, dep2, T.d2a, T.d2b));
    }
    const up = new Float32Array(n * 3);
    const down = new Float32Array(n * 3);
    const v = new Vector3();
    for (let i = 0; i < n; i++) {
      this.samplePath(this.paths1[agent[i]], T.d1a, T.d1b, dep1[i] + T.f1, v);
      up.set([v.x, v.y, v.z], i * 3);
      this.samplePath(this.paths2[agent[i]], T.d2a, T.d2b, dep2[i], v);
      down.set([v.x, v.y, v.z], i * 3);
    }

    const box = new BoxGeometry(1, 1, 1);
    const base = (count: number) => {
      const g = new InstancedBufferGeometry();
      g.index = box.index;
      g.setAttribute('position', box.getAttribute('position'));
      g.setAttribute('normal', box.getAttribute('normal'));
      g.setAttribute('uv', box.getAttribute('uv'));
      g.instanceCount = count;
      return g;
    };

    // the mould: outer blocks only
    const outer: number[] = [];
    for (let i = 0; i < n; i++) if (m.exposed[i]) outer.push(m.home[i * 3], m.home[i * 3 + 1], m.home[i * 3 + 2]);
    const mg = base(outer.length / 3);
    mg.setAttribute('aHome', new InstancedBufferAttribute(new Float32Array(outer), 3));
    this.mould = new ShaderMaterial({
      vertexShader: mouldVertex,
      fragmentShader: mouldFragment,
      uniforms: {
        uFace: { value: new Color('#101010') },
        uLine: { value: new Color('#3B3B39') },
        uLinePx: { value: 1.0 },
      },
    });
    const mouldMesh = (this.mouldMesh = new Mesh(mg, this.mould));
    mouldMesh.frustumCulled = false;

    // Kit's blocks
    const meta = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) meta.set([m.part[i], order[i], kind[i], 0], i * 4);
    const bg = base(n);
    bg.setAttribute('aHome', new InstancedBufferAttribute(m.home, 3));
    bg.setAttribute('aMeta', new InstancedBufferAttribute(meta, 4));
    bg.setAttribute('aColor', new InstancedBufferAttribute(color, 3));
    bg.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    bg.setAttribute('aUp', new InstancedBufferAttribute(up, 3));
    bg.setAttribute('aDown', new InstancedBufferAttribute(down, 3));
    this.blocks = new ShaderMaterial({
      vertexShader: blockVertex,
      fragmentShader,
      uniforms: {
        uP: { value: 0 },
        uPart: { value: Array.from({ length: 8 }, () => new Matrix4()) },
        uGrey: { value: new Color('#4A4A4A') },
        uFlash: { value: new Color('#F5F2EB') },
        uScan: { value: new Vector4(T.s0, T.s1, this.yRange.x, this.yRange.y) },
        uFail: { value: new Vector4(this.failTime, this.failRange.x, this.failRange.y, 0) },
        uFailAgent: { value: this.failAgent },
        uTipHover: { value: HOVER },
        uBob: { value: 0 },
        uDrop: { value: 0 },
        uTipScan: { value: 0 },
        uTipY: { value: this.tipRange },
        uGrout: { value: 0.09 },
        uGroutPx: { value: 1.0 },
      },
    });
    const blockMesh = new Mesh(bg, this.blocks);
    blockMesh.frustumCulled = false;

    // the agents
    const ag = base(AGENTS);
    ag.setAttribute('aIdx', new InstancedBufferAttribute(new Float32Array([0, 1, 2]), 1));
    this.agents = new ShaderMaterial({
      vertexShader: agentVertex,
      fragmentShader,
      uniforms: {
        uAgents: { value: Array.from({ length: AGENTS }, () => new Vector4()) },
        uAgentColor: { value: new Color('#F5F2EB') },
        uGrout: { value: 0.12 },
        uGroutPx: { value: 1.0 },
      },
    });
    const agentMesh = new Mesh(ag, this.agents);
    agentMesh.frustumCulled = false;

    this.scene.add(mouldMesh, blockMesh, agentMesh);

    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!opts.manualClock,
    });
    this.renderer.setClearColor(0x000000, 0);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.host);
    if (opts.clearOf) this.ro.observe(opts.clearOf);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.kick();
    });
    this.io.observe(opts.host);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  // ------------------------------------------------------------- public API
  /** Scroll progress: 0 before the first step, +1 per step, 4 at the end. */
  setProgress(p: number) {
    p = Math.min(4, Math.max(0, p));
    if (p === this.p) return;
    this.p = p;
    if (p < 2.95) this.approvedAt = null; // scrolling back undoes the approval
    this.kick();
  }

  /** The person approves the last block. */
  approve() {
    if (this.p < 3 || this.approvedAt !== null) return false;
    this.approvedAt = this.now;
    this.kick();
    return true;
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.kick();
  }

  /** Deterministic clock for captures: seconds since mount. */
  setTime(t: number) {
    this.now = t;
    this.frame(false);
  }

  get progress() {
    return this.p;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.dispose();
  }

  // ------------------------------------------------------------- internals
  private onVisibility = () => this.kick();

  private kick() {
    if (this.disposed) return;
    if (this.opts.manualClock) {
      this.frame(false);
      return;
    }
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = () => {
    if (this.disposed) return;
    this.now = (performance.now() - this.clock0) / 1000;
    const busy = this.frame(true);
    if (busy && this.visible && document.visibilityState === 'visible') this.raf = requestAnimationFrame(this.loop);
  };

  /** Mean position of the blocks an agent handles, per slice of its departure window. */
  private buildPath(home: Float32Array, agent: Uint8Array, a: number, dep: Float32Array, d0: number, d1: number): Path {
    const sum = new Float32Array(BINS * 4);
    for (let i = 0; i < agent.length; i++) {
      if (agent[i] !== a) continue;
      const b = Math.min(BINS - 1, Math.max(0, Math.round(((dep[i] - d0) / (d1 - d0)) * (BINS - 1))));
      sum[b * 4] += home[i * 3];
      sum[b * 4 + 1] += home[i * 3 + 1];
      sum[b * 4 + 2] += home[i * 3 + 2];
      sum[b * 4 + 3] += 1;
    }
    const raw = new Float32Array(BINS * 3);
    let last: number[] | null = null;
    for (let b = 0; b < BINS; b++) {
      const c = sum[b * 4 + 3];
      if (c > 0) last = [sum[b * 4] / c, sum[b * 4 + 1] / c, sum[b * 4 + 2] / c];
      if (last) raw.set(last, b * 3);
    }
    // fill leading gaps, then smooth so the agent glides
    const first = raw.findIndex((_, k) => k % 3 === 0 && sum[(k / 3) * 4 + 3] > 0);
    for (let b = 0; b < first / 3; b++) raw.set(raw.subarray(first, first + 3), b * 3);
    // agents work from outside Kit (left, front, right) at the height of the
    // blocks they handle, so the mould never hides them
    const out = new Float32Array(BINS * 3);
    for (let b = 0; b < BINS; b++) {
      let x = 0, y = 0, z = 0, w = 0;
      for (let k = -4; k <= 4; k++) {
        const j = Math.min(BINS - 1, Math.max(0, b + k));
        const wk = 5 - Math.abs(k);
        x += raw[j * 3] * wk;
        y += raw[j * 3 + 1] * wk;
        z += raw[j * 3 + 2] * wk;
        w += wk;
      }
      x /= w;
      y /= w;
      z /= w;
      if (a === 0) out.set([Math.min(-14, x - 7), y + 4, z], b * 3);
      else if (a === 2) out.set([Math.max(14, x + 7), y + 4, z], b * 3);
      else out.set([x, y + 4, 13], b * 3);
    }
    return out;
  }

  private samplePath(path: Path, d0: number, d1: number, t: number, out: Vector3) {
    const f = c01((t - d0) / (d1 - d0)) * (BINS - 1);
    const b = Math.min(BINS - 2, Math.floor(f));
    const k = f - b;
    return out.set(
      path[b * 3] + (path[b * 3 + 3] - path[b * 3]) * k,
      path[b * 3 + 1] + (path[b * 3 + 4] - path[b * 3 + 1]) * k,
      path[b * 3 + 2] + (path[b * 3 + 5] - path[b * 3 + 2]) * k,
    );
  }

  /** Where agent a is, and how big, at progress p. */
  private agentAt(a: number, p: number, out: Vector4) {
    const v = new Vector3();
    const s1End = T.d1b + T.f1;
    if (p < s1End) this.samplePath(this.paths1[a], T.d1a, T.d1b, p, v);
    else if (p < T.d2a) {
      const from = this.samplePath(this.paths1[a], T.d1a, T.d1b, s1End, new Vector3());
      const to = this.samplePath(this.paths2[a], T.d2a, T.d2b, T.d2a, new Vector3());
      v.lerpVectors(from, to, smooth(s1End, T.d2a, p));
    } else if (p < T.d2b + T.f2) this.samplePath(this.paths2[a], T.d2a, T.d2b, p, v);
    else {
      const from = this.samplePath(this.paths2[a], T.d2a, T.d2b, T.d2b + T.f2, new Vector3());
      v.lerpVectors(from, REST[a], smooth(T.d2b + T.f2, T.s0 + 0.04, p));
      if (a === AGENTS - 1) {
        // the right-hand agent takes the failed blocks back and redoes them
        const go = smooth(this.failTime - 0.06, this.failTime + T.ej0, p);
        const back = smooth(this.failTime + T.rd0 + T.rd, this.failTime + T.rd0 + T.rd + 0.08, p);
        v.lerp(this.failAgent, go * (1 - back));
      }
    }
    let size = AGENT_SIZE * smooth(0.0, 0.07, p);
    if (this.approvedAt !== null) size *= 1 - smooth(DROP_S + TIPSCAN_S, DROP_S + TIPSCAN_S + 0.5, this.now - this.approvedAt);
    return out.set(v.x, v.y, v.z, size);
  }

  private resize() {
    const { host, canvas } = this.opts;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const mobile = Math.min(w, h) < 700;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
    this.renderer.setSize(w, h, false);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    let inset = 0;
    const bar = this.opts.clearOf;
    if (bar && bar.offsetHeight > 0) {
      const gap = host.getBoundingClientRect().bottom - bar.getBoundingClientRect().top + 8;
      inset = Math.min(Math.max(0, gap), h * 0.35);
    }
    const fh = h - inset;
    this.camera.aspect = w / fh;
    this.camera.setViewOffset(w, fh, 0, 0, w, h);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fitH = this.extent.h / (2 * Math.tan(vFov / 2)) / 0.9;
    const fitW = this.extent.w / (2 * Math.tan(hFov / 2)) / 0.9;
    this.dist = Math.max(fitH, fitW);
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  private pose(t: number, amp: number) {
    const piv = this.pivots;
    const mats = this.blocks.uniforms.uPart.value as Matrix4[];
    const breathe = 1 + 0.012 * amp * Math.sin((2 * Math.PI * t) / 3.4);
    const body = new Matrix4().makeScale(1, breathe, 1);
    for (let k = 0; k < 4; k++) mats[k].copy(body);
    let chain = body.clone();
    for (let s = 0; s < 4; s++) {
      const id = 4 + s;
      const p = piv[String(id)];
      const a = amp * (0.09 * Math.sin((2 * Math.PI * t) / 1.7 - s * 0.95) - (s === 0 ? 0.12 : 0));
      chain = chain
        .clone()
        .multiply(new Matrix4().makeTranslation(p[0], p[1], p[2]))
        .multiply(new Matrix4().makeRotationY(a))
        .multiply(new Matrix4().makeRotationZ(a * 0.35))
        .multiply(new Matrix4().makeTranslation(-p[0], -p[1], -p[2]));
      mats[id].copy(chain);
    }
  }

  private status(p: number, since: number | null): MethodStatus {
    const tf = this.failTime;
    const hitFail = T.s0 + (T.s1 - T.s0) * ((this.failRange.x - this.yRange.x) / (this.yRange.y - this.yRange.x));
    if (since !== null) {
      return since < DROP_S + TIPSCAN_S
        ? { text: 'Approved. Checking', checked: false }
        : { text: 'Approved. Done and checked.', checked: true };
    }
    if (p < 0.04) return { text: 'Built. Checked.', checked: true };
    if (p < 1) return { text: 'Defining done', checked: false };
    if (p < T.s0) return { text: 'Agents at work', checked: false };
    if (p < hitFail) return { text: 'Checking', checked: false };
    if (p < tf + T.rs0 + T.rs) return { text: 'Ear failed the check. Redoing', checked: false };
    if (p < 3) return { text: 'Ear redone. Checked.', checked: true };
    return { text: 'Waiting for a human', checked: false };
  }

  /** Draws one frame. Returns true while something needs the next frame. */
  private frame(real: boolean): boolean {
    const p = this.p;
    const t = this.now;
    const u = this.blocks.uniforms;
    const since = this.approvedAt === null ? null : t - this.approvedAt;
    const done = since !== null && since >= DROP_S + TIPSCAN_S;

    // Kit breathes when he is whole: before the story starts, and once approved
    const want = !this.paused && (p < 0.02 || done) ? 1 : 0;
    this.idle += (want - this.idle) * (real ? 0.08 : 1);
    if (Math.abs(want - this.idle) < 0.002) this.idle = want;
    this.pose(this.paused ? 0 : t, this.idle);

    // the mould only shows while Kit is being rebuilt; when he breathes or wags,
    // his blocks move off it and its lines would peek through
    this.mouldMesh.visible = this.idle < 0.001 && !done;

    u.uP.value = p;
    const waiting = p >= 3 && since === null;
    u.uBob.value = waiting && !this.paused ? 0.35 * Math.sin(t * 2.2) : 0;
    u.uDrop.value = since === null ? 0 : c01(since / DROP_S);
    u.uTipScan.value = since === null ? 0 : c01((since - DROP_S) / TIPSCAN_S);

    const agents = this.agents.uniforms.uAgents.value as Vector4[];
    for (let a = 0; a < AGENTS; a++) this.agentAt(a, p, agents[a]);

    // camera: fixed three-quarter view from a touch above, so the layers read
    const az = 0.5, el = 0.26;
    this.camera.position.set(
      this.target.x + Math.sin(az) * Math.cos(el) * this.dist,
      this.target.y + Math.sin(el) * this.dist,
      this.target.z + Math.cos(az) * Math.cos(el) * this.dist,
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);

    // status
    const s = this.status(p, since);
    const key = s.text;
    if (key !== this.statusKey) {
      this.statusKey = key;
      this.opts.onStatus?.(s);
    }

    // scan line: global check, the redo's local check, or the tip's
    let scan: Vector3 | null = null;
    if (p >= T.s0 && p <= T.s1) scan = new Vector3(0, this.yRange.x + (this.yRange.y - this.yRange.x) * ((p - T.s0) / (T.s1 - T.s0)), 0);
    const r0 = this.failTime + T.rs0;
    if (p >= r0 && p <= r0 + T.rs) {
      const k = (p - r0) / T.rs;
      scan = this.failCentre.clone().setY(this.failRange.x - 0.5 + (this.failRange.y - this.failRange.x + 1) * k);
    }
    if (since !== null && since > DROP_S && since < DROP_S + TIPSCAN_S) {
      const k = (since - DROP_S) / TIPSCAN_S;
      scan = this.tipCentre.clone().setY(this.tipRange.x - 0.5 + (this.tipRange.y - this.tipRange.x + 1) * k);
    }
    if (this.opts.onScan) {
      if (!scan) this.opts.onScan(null);
      else this.opts.onScan(((1 - scan.project(this.camera).y) / 2) * this.opts.host.clientHeight);
    }

    // where to offer the approval: next to the waiting tip
    if (this.opts.onTip) {
      if (p >= 3.04 && since === null) {
        const v = this.tipCentre.clone().add(HOVER).project(this.camera);
        this.opts.onTip({
          x: ((v.x + 1) / 2) * this.opts.host.clientWidth,
          y: ((1 - v.y) / 2) * this.opts.host.clientHeight,
        });
      } else this.opts.onTip(null);
    }

    const settling = this.idle !== want;
    const dropping = since !== null && since < DROP_S + TIPSCAN_S + 0.6;
    const alive = !this.paused && (this.idle > 0 || waiting);
    return settling || dropping || alive;
  }
}
