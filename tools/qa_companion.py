# Kit as a companion, at one viewport: he arrives once the hero stage is out of
# view, answers a question from the bank with a "follow me" chip, leads to that
# section, turns a question off the bank into a LinkedIn link, and leaves when a
# stage of his comes back.
# usage: python3 tools/qa_companion.py OUTDIR BASE_URL WIDTH HEIGHT TAG
# Exits 1 unless every step lands, with no horizontal overflow and no console or page error.
import asyncio, sys, json
from playwright.async_api import async_playwright

OUT, BASE, W, H, TAG = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
FAILED = []

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        mobile = W < 600
        pg = await b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2 if mobile else 1,
                              is_mobile=mobile, has_touch=mobile)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(BASE + '/?kitclock&nointro')
        await pg.wait_for_function('window.__kit')
        await pg.evaluate('document.fonts.ready')
        await pg.evaluate("document.querySelectorAll('.reveal,.fade').forEach(e=>e.classList.add('is-in'))")

        # before the first scroll nothing of his has loaded
        loaded = await pg.evaluate('!!window.__companion')
        if loaded:
            FAILED.append('companion loaded before the hero went by')

        # past the hero: he arrives
        await pg.evaluate("document.getElementById('work').scrollIntoView({behavior:'instant'})")
        await pg.wait_for_function("window.__companion && window.__companion.state === 'here'", timeout=15000)
        await pg.wait_for_timeout(900)  # the greeting
        await pg.screenshot(path=f'{OUT}/{TAG}_1arrive.png')
        kc = pg.locator('[data-companion]')
        if not await kc.is_visible():
            FAILED.append('companion not visible after arriving')

        # a question from the bank
        await pg.click('[data-kc-hit]')
        await pg.wait_for_selector('[data-kc-bubble].is-open')
        await pg.fill('#kc-q', 'Can I hire him?')
        await pg.press('#kc-q', 'Enter')
        await pg.wait_for_function(
            "[...document.querySelectorAll('[data-kc-chips] .kc__chip')].some(c => c.textContent.includes('#contact'))", timeout=15000)
        said = await pg.evaluate("document.querySelector('[data-kc-say]').textContent")
        if 'LinkedIn' not in said:
            FAILED.append(f'unexpected answer: {said!r}')
        await pg.screenshot(path=f'{OUT}/{TAG}_2answer.png')

        # follow me: the page goes to the section
        y0 = await pg.evaluate('scrollY')
        await pg.click("[data-kc-chips] .kc__chip:has-text('#contact')")
        await pg.wait_for_function(f'scrollY > {y0} + 200', timeout=5000)
        await pg.wait_for_timeout(1800)
        near = await pg.evaluate("Math.abs(document.getElementById('contact').getBoundingClientRect().top - 72) < 40")
        if not near:
            FAILED.append('follow me did not land on #contact')
        await pg.screenshot(path=f'{OUT}/{TAG}_3follow.png')

        # off the bank: LinkedIn, no section
        await pg.click('[data-kc-hit]')
        await pg.wait_for_selector('[data-kc-bubble].is-open')
        await pg.fill('#kc-q', 'What is the weather like on Mars?')
        await pg.press('#kc-q', 'Enter')
        await pg.wait_for_function(
            "[...document.querySelectorAll('[data-kc-chips] a.kc__chip')].some(a => a.href.includes('linkedin'))", timeout=15000)
        chips = await pg.evaluate("[...document.querySelectorAll('[data-kc-chips] .kc__chip')].map(c => c.textContent)")
        if any('follow me' in c for c in chips):
            FAILED.append(f'off-bank question got a section: {chips}')
        await pg.screenshot(path=f'{OUT}/{TAG}_4offbank.png')

        # his stage comes back: he leaves
        await pg.evaluate("document.getElementById('top').scrollIntoView({behavior:'instant'})")
        await pg.wait_for_function("window.__companion.state === 'away'", timeout=8000)

        ov = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        print(json.dumps({'tag': TAG, 'horizontal_overflow_px': ov, 'failed': FAILED, 'errors': errs[:10]}))
        await b.close()
        if ov != 0 or errs:
            FAILED.append('overflow or errors')

asyncio.run(main())
sys.exit(1 if FAILED else 0)
