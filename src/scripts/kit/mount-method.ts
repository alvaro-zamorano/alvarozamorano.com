// "How I build" as a scroll story. The steps stay plain HTML; this adds a sticky
// stage where Kit is taken apart and rebuilt as you read them. Scroll position
// drives the scene, so it never plays on its own and scrolling back rewinds it.
import type { MethodScene, MethodStatus } from './method';
import { webglAvailable } from './mount';

declare global {
  interface Window {
    __method?: MethodScene;
  }
}

export function mountMethod() {
  const root = document.querySelector<HTMLElement>('[data-method]');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !webglAvailable()) return; // the steps stay a static line

  const stage = root.querySelector<HTMLElement>('[data-method-stage]')!;
  const canvas = stage.querySelector('canvas') as HTMLCanvasElement;
  const statusEl = stage.querySelector<HTMLElement>('.stage__status')!;
  const statusTxt = statusEl.querySelector<HTMLElement>('.txt')!;
  const scanEl = stage.querySelector<HTMLElement>('.stage__scan')!;
  const approveBtn = stage.querySelector<HTMLButtonElement>('[data-approve]')!;
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const narrow = matchMedia('(max-width: 860px)');
  const params = new URLSearchParams(location.search);

  root.classList.add('is-story');

  let scene: MethodScene | null = null;
  let approved = false;

  // progress: 0 before the first step, +1 for each step read. A step counts as
  // read as it scrolls past a reading line (below the stage on small screens).
  const progress = () => {
    const vh = window.innerHeight;
    let line = vh * 0.55;
    if (narrow.matches) {
      const b = stage.getBoundingClientRect().bottom;
      line = b + (vh - b) * 0.4;
    }
    let p = 0;
    for (const s of steps) {
      const r = s.getBoundingClientRect();
      p += Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
    }
    return p;
  };

  const paint = (p: number) => {
    const active = Math.min(steps.length - 1, Math.floor(p));
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === active);
      const done = i < steps.length - 1 ? p >= i + 1 : approved;
      s.classList.toggle('is-done', done);
    });
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const p = progress();
    if (p < 2.95) approved = false;
    paint(p);
    scene?.setProgress(p);
  };
  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  update();

  const setStatus = (s: MethodStatus) => {
    statusTxt.textContent = s.text;
    statusEl.classList.toggle('is-checked', s.checked);
  };

  approveBtn.addEventListener('click', () => {
    if (!scene?.approve()) return;
    approved = true;
    paint(scene.progress);
    statusEl.focus({ preventScroll: true }); // the button goes away; keep focus nearby
  });

  // build the scene only when the section gets close
  const start = async () => {
    const { MethodScene } = await import('./method');
    scene = new MethodScene({
      canvas,
      host: stage,
      clearOf: stage.querySelector<HTMLElement>('.stage__bar') ?? undefined,
      manualClock: params.has('kitclock'),
      onStatus: setStatus,
      onScan: (y) => {
        if (y === null) scanEl.style.opacity = '0';
        else {
          scanEl.style.opacity = '1';
          scanEl.style.transform = `translateY(${y.toFixed(1)}px)`;
        }
      },
      onTip: (pos) => {
        approveBtn.hidden = !pos;
        if (!pos) return;
        // beside the waiting tip, kept inside the stage
        const w = approveBtn.offsetWidth || 120;
        const h = approveBtn.offsetHeight || 40;
        const x = Math.min(stage.clientWidth - w - 16, Math.max(16, pos.x + 28));
        const y = Math.min(stage.clientHeight - h - 90, Math.max(16, pos.y - h / 2));
        approveBtn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      },
    });
    const html = document.documentElement;
    scene.setPaused(html.classList.contains('motion-paused'));
    new MutationObserver(() => scene?.setPaused(html.classList.contains('motion-paused'))).observe(html, {
      attributes: true,
      attributeFilter: ['class'],
    });
    scene.setProgress(progress());
    window.__method = scene;
  };

  // two screens ahead, in idle time, so the scene is ready before the reader
  // gets there without competing with whatever is on screen now
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      if ('requestIdleCallback' in window) requestIdleCallback(() => start(), { timeout: 1200 });
      else setTimeout(start, 200);
    },
    { rootMargin: '200% 0px' },
  );
  near.observe(root);
}
