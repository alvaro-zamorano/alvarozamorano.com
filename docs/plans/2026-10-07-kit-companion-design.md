# Kit as a companion

7 October 2026. Agreed in conversation, prototyped twice (a chat panel first, then
the animated character that won), built the same day.

## What it is

Once the hero scrolls out of view, Kit hops into the bottom-right corner and keeps
the visitor company: he breathes, wags, twitches an ear, looks at the pointer, and
now and then builds one block, checks it and lets it go. He comments on each
section once, in a bubble, with a question to pull on. Asked something, he stacks
three grey blocks above his head, checks them green bottom up, answers word by
word, and offers to lead you to the section he is quoting: he hops in place while
the page goes there. Off the bank he shakes his head and points to LinkedIn.

He is the same Kit as the stage: the blocks, colour classes, tones and pivots
come from `src/data/kit.json`, drawn with canvas 2D instead of WebGL.

## Decisions

- **No model, no API.** Answers come from a bank of about seventy-five entries in
  `src/data/companion.ts`, matched by keyword phrases (longer phrases weigh more;
  Spanish phrases are understood, answers are in English). The site stays fully
  static and costs nothing to run. The bank says nothing the page does not: no
  numbers, no employer, no clients beyond the named ones. Off the bank: LinkedIn.
- **One Kit at a time.** The corner is empty while one of his stages is on screen,
  the hero or the "How I build" story (`companion-mount.ts` watches both with an
  IntersectionObserver). He arrives when the hero is gone and leaves when a stage
  comes back. The method section gets its comment at the payoff, after the story.
- **Nothing before the first scroll.** The companion module, Kit's blocks
  included, is a dynamic import triggered the first time the hero leaves the
  viewport. Lighthouse and the first paint see the page exactly as before.
- **Canvas 2D, not three.js.** `blocks.ts` decodes the model with no three.js
  dependency; `model.ts` re-exports it and keeps the shader colours. The companion
  chunk is the bank plus the renderer; the blocks chunk is shared with the hero.
- **The canon.** Flat colour per face (top, front, side), hard edges, no shadows;
  the bubble takes the colour of the section under him (like the header); the
  link colour is accent on paper, signal on ink. Reduced motion and the page's
  own "Pause motion" leave him still and make text appear at once.
- **Honest about himself.** Asked whether he is an AI, he says there is no model
  behind him. The footer line in the bubble says "answers from this page only".

## Pieces

- `src/components/Companion.astro`: the markup (bubble, stack, canvas, hit area).
- `src/styles/companion.css`: styles, both themes, phone layout.
- `src/scripts/kit/companion-mount.ts`: the watcher that loads him.
- `src/scripts/kit/companion.ts`: renderer, animation, bubble, behaviour.
- `src/data/companion.ts`: everything he says, the bank, the matcher.
- `tools/qa_companion.py`: the check, in `checks.yml` at 1440 and 390 px.

## Checked

Types, build, the existing layout and story checks, the new companion check at
both widths, and Lighthouse (performance 0.99, accessibility 1, best practices 1,
SEO 1 on three runs), all run on the branch before the pull request.

## Not done, on purpose

- No conversation memory: the bubble shows the last exchange only.
- No analytics on questions. If unanswered questions ever matter, log them
  client-side first and decide then.
- No Spanish answers. The bank understands Spanish keys; a second answer column
  is the obvious next step if Spanish visitors turn out to ask.
