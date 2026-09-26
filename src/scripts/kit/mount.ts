import type { KitEngine, KitStatus } from './engine';

declare global {
  interface Window {
    __kit?: KitEngine;
  }
}

// WebGL2 on a real GPU. Where the browser can only draw it in software (no GPU:
// some VMs, remote desktops, blocklisted drivers, and the lab browsers behind
// Lighthouse and PageSpeed) every frame of Kit costs the main thread seconds, so
// those get the still Kit and the static line of steps instead. `?kitgl` (and
// the capture clock, `?kitclock`) force the scenes on for tests.
let gl: boolean | undefined;
export function webglAvailable() {
  if (gl !== undefined) return gl;
  const params = new URLSearchParams(location.search);
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('webgl2');
    if (!ctx) return (gl = false);
    const info = ctx.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(ctx.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : ctx.RENDERER));
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
    gl = !software || params.has('kitgl') || params.has('kitclock');
  } catch {
    gl = false;
  }
  return gl;
}

export async function mountKit() {
  const stage = document.getElementById('kit-stage');
  if (!stage) return;
  const canvas = stage.querySelector('canvas') as HTMLCanvasElement;
  const statusEl = stage.querySelector('.stage__status') as HTMLElement;
  const statusTxt = statusEl.querySelector('.txt') as HTMLElement;
  const scanEl = stage.querySelector('.stage__scan') as HTMLElement;
  const hint = stage.querySelector('[data-kit-hint]') as HTMLElement;
  const breakBtn = stage.querySelector('[data-kit-break]') as HTMLButtonElement;
  const motionBtn = stage.querySelector('[data-motion-toggle]') as HTMLButtonElement;

  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  hint.textContent = coarse ? hint.dataset.touch! : hint.dataset.pointer!;

  let paused = document.documentElement.classList.contains('motion-paused');
  const syncMotionBtn = () => {
    motionBtn.setAttribute('aria-pressed', String(paused));
    motionBtn.textContent = paused ? 'Play motion' : 'Pause motion';
  };
  syncMotionBtn();
  if (reduced) motionBtn.hidden = true;

  if (!webglAvailable()) {
    document.documentElement.classList.add('no-webgl');
    statusTxt.textContent = 'Kit, built from blocks.';
    breakBtn.hidden = true;
    motionBtn.hidden = true;
    return;
  }

  let brokeOnce = false;
  const setStatus = (s: KitStatus) => {
    const checked = s.kind === 'built' || s.kind === 'rebuilt';
    statusEl.classList.toggle('is-checked', checked);
    switch (s.kind) {
      case 'building':
        statusTxt.textContent = 'Building Kit';
        break;
      case 'checking':
        statusTxt.textContent = 'Checking';
        break;
      case 'built':
        statusTxt.textContent = 'Built. Checked.';
        if (!brokeOnce) hint.hidden = false;
        break;
      case 'broken':
        brokeOnce = true;
        hint.hidden = true;
        statusTxt.textContent = `${s.part} broken. Rebuilding`;
        break;
      case 'rebuilt':
        statusTxt.textContent = `${s.part} rebuilt. Checked.`;
        break;
    }
  };

  let seen = false;
  try {
    seen = localStorage.getItem('kit:seen') === '1';
    localStorage.setItem('kit:seen', '1');
  } catch {}

  const { KitEngine } = await import('./engine');
  const engine = new KitEngine({
    canvas,
    host: stage,
    clearOf: stage.querySelector<HTMLElement>('.stage__bar') ?? undefined,
    theme: 'dark',
    reducedMotion: reduced,
    skipIntro: params.has('nointro'),
    introSpeed: seen && !params.has('intro') ? 1.8 : 1,
    manualClock: params.has('kitclock'),
    onStatus: setStatus,
    onScan: (y) => {
      if (y === null) scanEl.style.opacity = '0';
      else {
        scanEl.style.opacity = '1';
        scanEl.style.transform = `translateY(${y.toFixed(1)}px)`;
      }
    },
  });
  engine.setPaused(paused);
  window.__kit = engine;

  breakBtn.addEventListener('click', () => engine.breakRandom());
  motionBtn.addEventListener('click', () => {
    paused = !paused;
    document.documentElement.classList.toggle('motion-paused', paused);
    try {
      localStorage.setItem('motion', paused ? 'paused' : 'on');
    } catch {}
    syncMotionBtn();
    engine.setPaused(paused);
  });
}
