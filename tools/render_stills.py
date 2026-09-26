"""Renders the OG card and the no-WebGL fallback still from the live page."""
import asyncio, sys
from playwright.async_api import async_playwright
BASE, OUT = sys.argv[1], sys.argv[2]
HIDE = """
const s=document.createElement('style');
s.textContent='.site-header,.stage__bar,.skip{display:none!important} .hero{min-height:0!important;height:100vh} .stage{min-height:0!important;height:100vh}';
document.head.appendChild(s);
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1200,'height':630}, device_scale_factor=1)
        await pg.goto(BASE + '/?kitclock&nointro'); await pg.wait_for_function('window.__kit')
        await pg.evaluate('document.fonts.ready'); await pg.evaluate(HIDE)
        await pg.evaluate("document.querySelector('.hero__links').style.display='none'; document.querySelector('.hero .eyebrow').textContent='Álvaro Zamorano, AI Systems Architect'")
        await pg.wait_for_timeout(300); await pg.evaluate('window.__kit.setTime(3)')
        await pg.screenshot(path=f'{OUT}/og.png')
        # fallback still: just the stage, transparent-free on ink
        st = await b.new_page(viewport={'width':900,'height':1100}, device_scale_factor=1)
        await st.goto(BASE + '/?kitclock&nointro'); await st.wait_for_function('window.__kit')
        await st.evaluate(HIDE)
        await st.evaluate("document.querySelector('.hero__text').style.display='none'; document.querySelector('.hero').style.gridTemplateColumns='1fr'")
        await st.wait_for_timeout(300); await st.evaluate('window.__kit.setTime(3)')
        el = await st.query_selector('#kit-stage')
        await el.screenshot(path=f'{OUT}/kit-still.png')
        await b.close()
asyncio.run(main())
