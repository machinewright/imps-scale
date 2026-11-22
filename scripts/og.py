# Renders og.png (1200x630): title, pitch, and a real board mid-game (runner-up of eight). Needs the local server on 8765.
import base64
from playwright.sync_api import sync_playwright
URL = 'http://127.0.0.1:8765/'
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
FONTS = f'''<style>
@font-face {{ font-family: S; font-weight: 200 900; src: url(data:font/woff2;base64,{b64('fonts/source-serif-4-latin-opsz-normal.woff2')}) format("woff2"); }}
@font-face {{ font-family: I; font-weight: 100 900; src: url(data:font/woff2;base64,{b64('fonts/inter-latin-wght-normal.woff2')}) format("woff2"); }}
</style>'''
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=2)
    pg.goto(URL + '#6'); pg.reload(); pg.wait_for_function("!document.getElementById('status').textContent.includes('thinking')")
    for _ in range(6):
        a, c = pg.evaluate('() => window.__best()')
        pg.locator(f'.item[data-j="{a}"]').click(); pg.locator(f'.item[data-j="{c}"]').click(); pg.locator('#weigh-btn').click()
    board = base64.b64encode(pg.locator('#stage svg').screenshot()).decode()
    pg.evaluate("document.getElementById('count').style.display='inline-flex'")
    pips = base64.b64encode(pg.locator('#count').screenshot()).decode()
    card = b.new_page(viewport={'width': 1200, 'height': 630})
    card.set_content(FONTS + f'''<body style="margin:0;width:1200px;height:630px;background:#fbf9f4;display:flex;align-items:center">
      <div style="width:470px;padding:0 24px 0 64px;color:#1f2430;flex:none">
        <div style="font:650 70px/1.02 S;letter-spacing:-2px">The Imp’s<br>Scale</div>
        <div style="font:400 28px/1.38 S;color:#3d4452;margin-top:24px">Find the heaviest in the fewest weighings. The Imp decides the answers as late as it can.</div>
        <div style="font:500 19px/1.4 I;color:#646b78;margin-top:26px">A puzzle game · 20 levels · in the browser</div>
      </div>
      <div style="width:620px;flex:none;padding-right:40px">
        <div style="background:#fff;border:1px solid #e2dbcb;border-radius:14px;padding:14px">
          <img src="data:image/png;base64,{pips}" style="height:24px;display:block;margin:0 0 6px 6px">
          <div style="height:330px;overflow:hidden"><img src="data:image/png;base64,{board}" style="width:100%;display:block"></div>
        </div>
      </div></body>''')
    card.wait_for_timeout(300)
    card.screenshot(path='og.png')
    b.close()
print('og.png written')
