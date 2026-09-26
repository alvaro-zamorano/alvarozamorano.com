// Page behaviour that is not Kit: header colour, menu, reveals, row checks.

document.documentElement.setAttribute('data-ready', '');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- header takes the colour of whatever sits under it (left and right halves)
const header = document.querySelector<HTMLElement>('[data-header]');
function themeAt(x: number, y: number): string {
  for (const el of document.elementsFromPoint(x, y)) {
    if (header?.contains(el)) continue;
    const t = (el as HTMLElement).closest('[data-theme]');
    if (t && !t.closest('[data-menu]')) return t.getAttribute('data-theme') || 'light';
  }
  return 'light';
}
let ticking = false;
let lastY = scrollY;
function updateHeader() {
  ticking = false;
  if (!header) return;
  const y = 34;
  const left = themeAt(12, y);
  const right = themeAt(window.innerWidth - 12, y);
  header.dataset.over = left === right ? left : 'split';
  // solid once we leave the top; hide while reading down, show when going back up
  const sy = scrollY;
  header.classList.toggle('is-solid', sy > 24 && header.dataset.over !== 'split');
  const menuOpen = document.querySelector('[data-menu]')?.classList.contains('is-open');
  if (!menuOpen && !header.contains(document.activeElement)) {
    if (sy > 240 && sy > lastY + 6) header.classList.add('is-hidden');
    else if (sy < lastY - 6 || sy <= 240) header.classList.remove('is-hidden');
  }
  lastY = sy;
}
addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateHeader);
    }
  },
  { passive: true },
);
addEventListener('resize', updateHeader);
updateHeader();

// ---- current section in the nav
const links = [...document.querySelectorAll<HTMLAnchorElement>('.site-header nav a')];
const sections = links
  .map((a) => document.querySelector<HTMLElement>(a.getAttribute('href')!))
  .filter(Boolean) as HTMLElement[];
const navIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = '#' + e.target.id;
      links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === id)));
    }
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
sections.forEach((s) => navIO.observe(s));

// ---- small-screen menu
const menu = document.querySelector<HTMLElement>('[data-menu]');
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
const closeBtn = document.querySelector<HTMLButtonElement>('[data-menu-close]');
function setMenu(open: boolean) {
  if (!menu || !openBtn) return;
  menu.classList.toggle('is-open', open);
  openBtn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) closeBtn?.focus();
  else openBtn.focus();
}
openBtn?.addEventListener('click', () => setMenu(true));
closeBtn?.addEventListener('click', () => setMenu(false));
menu?.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu?.classList.contains('is-open')) setMenu(false);
});

// ---- reveals: masked lines and fades, once
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px' },
);
document.querySelectorAll('.reveal, .fade').forEach((el) => {
  if (reduced) el.classList.add('is-in');
  else revealIO.observe(el);
});

// ---- work rows: each block is checked as it enters, then earns its green
const rows = [...document.querySelectorAll<HTMLElement>('[data-check]')];
const checkIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      const i = rows.indexOf(el);
      setTimeout(() => el.classList.add('is-checked'), reduced ? 0 : 380 + (i % 3) * 140);
      checkIO.unobserve(el);
    }
  },
  { rootMargin: '0px 0px -22% 0px' },
);
rows.forEach((r) => checkIO.observe(r));

// ---- video posters: set as their section comes near, whatever the motion setting
const posters = [...document.querySelectorAll<HTMLVideoElement>('video[data-poster]')];
const posterIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const v = e.target as HTMLVideoElement;
      if (!v.getAttribute('poster')) v.poster = v.dataset.poster!;
      posterIO.unobserve(v);
    }
  },
  { rootMargin: '50% 0px' },
);
posters.forEach((v) => posterIO.observe(v));

// ---- silent videos (studio reel and loops): load when they come near, play
// only while on screen, and never against the visitor's motion choice (reduced
// motion, or "Pause motion" on the stage). Kit's log runs its own stage
// (src/components/Writing.astro).
const reels = [...document.querySelectorAll<HTMLVideoElement>('[data-inview-video]')];
if (reels.length && !reduced) {
  const html = document.documentElement;
  const paused = () => html.classList.contains('motion-paused');
  const near = new Set<HTMLVideoElement>();
  const onScreen = new Set<HTMLVideoElement>();
  const sync = () => {
    for (const v of reels) {
      if (!paused() && (near.has(v) || onScreen.has(v)) && !v.dataset.loaded) {
        v.querySelectorAll('source').forEach((src) => (src.src = src.dataset.src!));
        v.load();
        v.dataset.loaded = '1';
      }
      if (onScreen.has(v) && !paused()) v.play().catch(() => {});
      else v.pause();
    }
  };
  const track = (set: Set<HTMLVideoElement>, rootMargin: string) => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) set.add(e.target as HTMLVideoElement);
          else set.delete(e.target as HTMLVideoElement);
        }
        sync();
      },
      { rootMargin },
    );
    reels.forEach((v) => io.observe(v));
  };
  track(near, '25% 0px');
  track(onScreen, '0px');
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
}

export {};
