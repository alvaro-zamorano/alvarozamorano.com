# alvarozamorano.com

The site of Álvaro Zamorano, AI Systems Architect. Kit, a fox made of blocks,
builds himself in your browser, checks his own work, and rebuilds when you
break him.

Live at [www.alvarozamorano.com](https://www.alvarozamorano.com).

## Run it

```sh
npm ci
npm run dev     # local site
npm run build   # static output in dist/
npm run check   # types
```

## How it's built

- [Astro](https://astro.build), static output, and [three.js](https://threejs.org) for Kit.
- `scripts/build-kit.mjs` builds Kit from boxes at build time: blocks, colour
  classes, body parts, pivots and the intro plan. Nothing generated is committed.
- `src/scripts/kit/` holds Kit's two scenes: the hero (`engine.ts`), where he
  builds himself and can be broken, and "How I build" (`method.ts`), a scroll
  story where he is taken apart and rebuilt step by step. Each is one instanced
  mesh; everything that moves is computed in the vertex shader from a few
  uniforms. `model.ts` decodes Kit once for both.
- Without a GPU (WebGL drawn in software, as in lab browsers and some virtual
  machines) the page shows a still Kit and the plain list of steps. `?kitgl`
  forces the scenes on.
- Once the hero scrolls out of view, Kit hops into the corner as a companion
  (`src/scripts/kit/companion.ts`): the same blocks drawn with canvas 2D, so he
  works without a GPU. He comments on each section once and answers questions
  from a bank in `src/data/companion.ts`, matched by keywords; there is no model
  behind him and nothing leaves the browser. Off the bank he points to LinkedIn.
  He leaves whenever one of his stages is on screen. Nothing of his loads before
  the first scroll.
- Copy lives in `src/data/site.ts`; the clips and stills on Cloudinary in
  `src/data/media.ts`.

## Checked before every release

Changes reach `main` through pull requests, and
[`checks`](.github/workflows/checks.yml) has to pass first:

- types (`npm run check`) and the build;
- `tools/qa.py` at 1440 and 390 px: every section with Kit's scene on, no
  horizontal overflow, no console errors;
- `tools/qa_method.py` at 1440 and 390 px: the "How I build" story at fixed
  points, then the approval;
- `tools/qa_companion.py` at 1440 and 390 px: Kit arrives after the hero,
  answers a question from the bank, leads to the section, turns a question off
  the bank into a LinkedIn link, and leaves when his stage comes back;
- Lighthouse on phone settings ([`lighthouserc.json`](lighthouserc.json)):
  performance at least 90, accessibility 100, best practices at least 95,
  SEO 100.

## Rights

The code is here to read and learn from. Kit, the copy, the films and the
images are Álvaro's; all rights reserved.
