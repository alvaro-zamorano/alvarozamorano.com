import type { Companion } from './companion';

declare global {
  interface Window {
    __companion?: Companion;
  }
}

// Kit keeps to one place at a time. While one of his stages is on screen (the
// hero, or the How I build story) the corner stays empty; the companion module,
// his blocks included, only loads once the visitor scrolls past the hero, so the
// page loads exactly as it did without him.
export function mountCompanion() {
  const root = document.querySelector<HTMLElement>('[data-companion]');
  const hero = document.getElementById('kit-stage');
  if (!root || !hero || !('IntersectionObserver' in window)) return;
  const stages = [hero, ...document.querySelectorAll<HTMLElement>('[data-method-stage]')];
  const on = new Set<Element>();
  let kit: Promise<Companion> | null = null;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        // a sliver of a stage under the header doesn't count: the big Kit is gone by then
        if (e.isIntersecting && e.intersectionRatio >= 0.12) on.add(e.target);
        else on.delete(e.target);
      }
      const onStage = on.size > 0;
      if (!onStage && !kit) {
        kit = import('./companion').then(({ Companion }) => {
          const c = new Companion(root);
          window.__companion = c;
          return c;
        });
      }
      kit?.then((c) => c.setOnStage(onStage));
    },
    { threshold: [0, 0.12] },
  );
  stages.forEach((s) => io.observe(s));
}
