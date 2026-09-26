# Captures the "How I build" scroll story at fixed points, by scrolling the page
# (so the scroll mapping is exercised too), then approves the last block.
# usage: python3 tools/qa_method.py OUTDIR BASE_URL WIDTH HEIGHT TAG
# Exits 1 unless every step ends done, the approval lands, and there is no
# horizontal overflow and no console or page error.
import asyncio, sys, json
from playwright.async_api import async_playwright

OUT, BASE, W, H, TAG = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
POINTS = [0.0, 0.35, 0.7, 1.0, 1.3, 1.6, 1.95, 2.3, 2.5, 2.6, 2.7, 2.85, 3.3]

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
        top = await pg.evaluate("document.querySelector('[data-method]').getBoundingClientRect().top + scrollY")
        await pg.evaluate(f'window.scrollTo({{top: {top}, behavior: "instant"}})')
        await pg.wait_for_function('window.__method')
        await pg.evaluate('window.__method.setTime(1)')

        async def settle():
            await pg.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')

        async def scroll_to_progress(target):
            if target <= 0:
                # the stage pinned at the top, before the first step starts
                await pg.evaluate(f'window.scrollTo({{top: {top}, behavior: "instant"}})')
                await settle()
                return await pg.evaluate('window.__method.progress')
            lo, hi = top - H, top + 8 * H
            for _ in range(22):
                mid = (lo + hi) / 2
                await pg.evaluate(f'window.scrollTo({{top: {mid}, behavior: "instant"}})')
                await settle()
                got = await pg.evaluate('window.__method.progress')
                if got < target:
                    lo = mid
                else:
                    hi = mid
            await pg.evaluate(f'window.scrollTo({{top: {hi}, behavior: "instant"}})')
            await settle()
            return await pg.evaluate('window.__method.progress')

        report = []
        for pt in POINTS:
            got = await scroll_to_progress(pt)
            await pg.evaluate('window.__method.setTime(1)')
            status = await pg.evaluate("document.querySelector('[data-method] .stage__status .txt').textContent")
            active = await pg.evaluate("[...document.querySelectorAll('[data-step]')].findIndex(s => s.classList.contains('is-active'))")
            name = f'{OUT}/{TAG}_p{pt:.2f}.png'
            await pg.screenshot(path=name)
            report.append({'target': pt, 'progress': round(got, 3), 'status': status, 'active_step': active})

        # the person approves the last block
        await scroll_to_progress(3.3)
        btn = await pg.evaluate("(() => { const b = document.querySelector('[data-approve]'); const r = b.getBoundingClientRect(); return {hidden: b.hidden, x: r.x, y: r.y, w: r.width, h: r.height}; })()")
        await pg.evaluate('window.__method.setTime(2)')
        await pg.screenshot(path=f'{OUT}/{TAG}_approve0.png')
        await pg.click('[data-approve]')
        for dt in [0.35, 0.9, 1.4, 2.2]:
            await pg.evaluate(f'window.__method.setTime({2 + dt})')
            status = await pg.evaluate("document.querySelector('[data-method] .stage__status .txt').textContent")
            await pg.screenshot(path=f'{OUT}/{TAG}_approve{dt:.2f}.png')
            report.append({'approved_after_s': dt, 'status': status})
        done = await pg.evaluate("[...document.querySelectorAll('[data-step]')].map(s => s.classList.contains('is-done'))")
        ov = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        print(json.dumps({'tag': TAG, 'points': report, 'approve_button': btn, 'steps_done': done,
                          'horizontal_overflow_px': ov, 'errors': errs[:10]}, indent=1))
        await b.close()
        return all(done) and not btn['hidden'] and report[-1]['status'].startswith('Approved') and ov == 0 and not errs

sys.exit(0 if asyncio.run(main()) else 1)
