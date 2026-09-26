# Layout check: every section at one viewport, with Kit's scene forced on.
# usage: python3 tools/qa.py OUTDIR BASE_URL WIDTH HEIGHT TAG
# Exits 1 on horizontal overflow or any console or page error.
import asyncio, sys, json
from playwright.async_api import async_playwright
OUT, BASE, W, H, TAG = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
FAILED = False
FORCE = """
document.querySelectorAll('.reveal,.fade').forEach(e=>e.classList.add('is-in'));
document.querySelectorAll('[data-check]').forEach(e=>e.classList.add('is-checked'));
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        mobile = W < 600
        pg = await b.new_page(viewport={'width':W,'height':H}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(BASE + '/?kitclock&nointro'); await pg.wait_for_function('window.__kit')
        await pg.evaluate('document.fonts.ready'); await pg.evaluate('window.__kit.setTime(3)')
        await pg.screenshot(path=f'{OUT}/{TAG}_0hero.png')
        await pg.evaluate(FORCE)
        for sec in ['work','method','writing','studio','about','contact']:
            await pg.evaluate(f"document.getElementById('{sec}').scrollIntoView({{behavior:'instant'}})")
            await pg.wait_for_timeout(250)
            await pg.screenshot(path=f'{OUT}/{TAG}_{sec}.png')
        # overflow check
        ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print(json.dumps({'tag':TAG,'horizontal_overflow_px':ov,'errors':errs[:10]}))
        await b.close()
        global FAILED
        FAILED = ov != 0 or bool(errs)
asyncio.run(main())
sys.exit(1 if FAILED else 0)
