# Plays every level with an optimal strategy (from the solver) and one level badly; screenshots to ~/work/tmp/imp
import sys, os
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
OUT = os.path.expanduser('~/work/tmp/imp')
BEST = """async () => {
  const { LEVELS, goalOf } = await import('./src/levels.js');
  const { Imp } = await import('./src/imp.js');
  const lvl = LEVELS[parseInt(location.hash.slice(1)) - 1];
  const gt = window.__state();
  const imp = new Imp(lvl.n, goalOf(lvl));
  return imp.best(gt).pairs[0];
}"""
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1100, 360):
        pg = b.new_page(viewport={'width': w, 'height': 900})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        pg.goto(URL + '#1'); pg.wait_for_timeout(300)
        n = pg.locator('#levels button').count()
        for i in range(n):
            pg.goto(URL + f'#{i+1}'); pg.reload(); pg.wait_for_function("!document.getElementById('status').textContent.includes('thinking')", timeout=60000)
            steps = 0
            while not pg.locator('#verdict .won, #verdict .lost').count():
                best = pg.evaluate("() => window.__best()")
                if isinstance(best[0], list):  # coins: left list, right list
                    for j in best[0]: pg.locator(f'.item[data-j="{j}"]').click()
                    for j in best[1]: pg.locator(f'.item[data-j="{j}"]').click(); pg.locator(f'.item[data-j="{j}"]').click()
                else:
                    pg.locator(f'.item[data-j="{best[0]}"]').click(); pg.locator(f'.item[data-j="{best[1]}"]').click()
                pg.locator('#weigh-btn').click(); steps += 1
                if steps > 20: break
            won = pg.locator('#verdict .won').count() == 1
            print(w, i + 1, 'won' if won else 'LOST', steps)
            if i in (8, 13): pg.screenshot(path=f'{OUT}/win{i+1}-{w}.png', full_page=True)
        # a bad play: level 3, weigh A-B, A-C, A-D, then B-C
        pg.goto(URL + '#3'); pg.reload(); pg.wait_for_timeout(300)
        for a, c in [(0,1),(0,2),(0,3),(1,2),(1,3),(2,3)]:
            if pg.locator('#verdict .lost, #verdict .won').count(): break
            pg.locator(f'.item[data-j="{a}"]').click(); pg.locator(f'.item[data-j="{c}"]').click()
            if pg.locator('#weigh-btn').is_enabled(): pg.locator('#weigh-btn').click()
            else: pg.locator(f'.item[data-j="{a}"]').click(); pg.locator(f'.item[data-j="{c}"]').click()
        if pg.locator('#safe-btn').count(): pg.locator('#safe-btn').click()
        print(w, 'bad play:', pg.locator('#verdict').inner_text()[:300].replace('\n', ' | '))
        pg.screenshot(path=f'{OUT}/lost3-{w}.png', full_page=True)
        pg.locator('#retry-btn').click()
        print(w, 'after retry:', pg.locator('#status').inner_text(), '| log', pg.locator('#log li').count())
        while not pg.locator('#verdict .won, #verdict .lost').count():
            a, c = pg.evaluate("() => window.__best()")
            pg.locator(f'.item[data-j="{a}"]').click(); pg.locator(f'.item[data-j="{c}"]').click(); pg.locator('#weigh-btn').click()
        print(w, 'retry result:', 'won' if pg.locator('#verdict .won').count() else 'LOST')
    b.close()
print('errors:', errors)
