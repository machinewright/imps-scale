import { LEVELS, goalOf } from './src/levels.js';
import { empty, add, known, above, pc } from './src/poset.js';
import { Imp, orders } from './src/imp.js';

const $ = (id) => document.getElementById(id);
const NAMES = 'ABCDEFGH';
const SAVE = 'imp-solved-v1';
const solved = new Set(JSON.parse(localStorage.getItem(SAVE) || '[]'));
const imps = new Map();
let L, imp, gt, hist, sel, over, lastEdge;

function impFor(lv) { if (!imps.has(lv.id)) imps.set(lv.id, new Imp(lv.n, goalOf(lv))); return imps.get(lv.id); }

function renderLevels() {
  const nav = $('levels'); nav.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.textContent = i + 1; b.title = lv.title;
    if (solved.has(lv.id)) b.classList.add('solved');
    if (lv === L) b.setAttribute('aria-current', 'true');
    b.onclick = () => load(i); nav.append(b);
  });
}

function load(i) {
  L = LEVELS[i]; history.replaceState(null, '', '#' + (i + 1));
  $('chapter').textContent = L.chapter; $('title').textContent = L.title; $('ask').textContent = L.ask;
  $('hint').hidden = true; $('hint').textContent = L.hint; $('hint-btn').setAttribute('aria-expanded', 'false');
  renderLevels();
  $('status').textContent = imps.has(L.id) ? '' : 'The Imp is thinking through every strategy…';
  $('verdict').innerHTML = ''; $('log').innerHTML = '';
  gt = empty(L.n); sel = []; hist = []; over = false; lastEdge = null; draw();
  setTimeout(() => { imp = impFor(L); imp.need(gt); restart(); }, 30);
}

function restart() {
  gt = empty(L.n); sel = []; hist = [{ gt, need: L.budget }]; over = false; lastEdge = null;
  $('verdict').innerHTML = ''; $('log').innerHTML = ''; $('next-btn').hidden = true;
  $('status').textContent = 'Tap two weights to put them on the scale.';
  draw();
}

window.__state = () => gt;
function used() { return hist.length - 1; }

function drawCount() {
  const c = $('count'); c.innerHTML = '';
  for (let k = 0; k < L.budget; k++) { const p = document.createElement('span'); p.className = 'pip' + (k < used() ? ' used' : ''); c.append(p); }
  const s = document.createElement('span'); s.className = 'lab';
  s.textContent = `${used()} of ${L.budget} weighings used`; c.append(s);
}

function answerItems() {
  const n = L.n; const out = new Set();
  if (!goalOf(L)(gt)) return out;
  const g = L.goal;
  for (let j = 0; j < n; j++) {
    const b = pc(gt[j]), a = above(gt, j);
    if ((g === 'max' || g === 'maxmin') && b === n - 1) out.add(j);
    if (g === 'maxmin' && a === n - 1) out.add(j);
    if (g === 'second' && a === 1 && b === n - 2) out.add(j);
    if (g === 'median' && a === (n - 1) >> 1 && b === (n - 1) >> 1) out.add(j);
    if (g === 'top3' && b >= n - 3) out.add(j);
    if (g === 'sort') out.add(j);
  }
  return out;
}

function draw() {
  drawCount();
  const n = L.n, W = Math.max(300, n * 66), colW = W / n, rowH = n > 6 ? 44 : 50, rows = n;
  const H = rows * rowH + 10;
  const x = (j) => colW * (j + 0.5), y = (j) => 30 + above(gt, j) * rowH;
  const ans = answerItems();
  let s = `<svg class="board" viewBox="0 0 ${W} ${H}" role="group" aria-label="Weights">`;
  for (let r = 0; r < rows; r++) s += `<line class="rowline" x1="0" x2="${W}" y1="${30 + r * rowH}" y2="${30 + r * rowH}"/>`;
  // covering edges
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (!((gt[a] >> b) & 1)) continue;
    let cover = true; for (let c = 0; c < n; c++) if (((gt[a] >> c) & 1) && ((gt[c] >> b) & 1)) { cover = false; break; }
    if (!cover) continue;
    const isNew = lastEdge && lastEdge[0] === a && lastEdge[1] === b;
    // long edges bow upwards so they don't run through weights in between
    const dx = x(b) - x(a), dy = y(b) - y(a), span = Math.abs(dx) / colW;
    const bow = span > 1.2 ? Math.min(34, 10 * span) : 0;
    const mx = (x(a) + x(b)) / 2, my = (y(a) + y(b)) / 2 - bow;
    s += `<path class="edge${isNew ? ' new' : ''}" d="M${x(a)},${y(a)} Q${mx},${my} ${x(b)},${y(b)}" fill="none"/>`;
  }
  for (let j = 0; j < n; j++) {
    const cls = ['item']; if (sel.includes(j)) cls.push('sel'); if (ans.has(j)) cls.push('answer');
    const lighter = pc(gt[j]), heavier = above(gt, j);
    s += `<g class="${cls.join(' ')}" data-j="${j}" tabindex="0" role="button" aria-pressed="${sel.includes(j)}"
      aria-label="Weight ${NAMES[j]}: ${heavier} known heavier, ${lighter} known lighter">
      <circle class="ring" cx="${x(j)}" cy="${y(j)}" r="17"/><text class="lbl" x="${x(j)}" y="${y(j)}">${NAMES[j]}</text></g>`;
  }
  s += '</svg>';
  $('stage').innerHTML = s;
  $('stage').querySelectorAll('.item').forEach((g) => {
    const j = +g.dataset.j;
    g.onclick = () => tap(j);
    g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(j); } };
  });
  const wb = $('weigh-btn');
  wb.disabled = over || sel.length !== 2 || !imp;
  wb.textContent = sel.length === 2 ? `Weigh ${NAMES[sel[0]]} against ${NAMES[sel[1]]}` : 'Weigh';
}

function chain(a, b) { // a known heavier than b: show a path
  const n = L.n, path = [a];
  let cur = a;
  while (cur !== b) {
    for (let c = 0; c < n; c++) if (((gt[cur] >> c) & 1) && (c === b || ((gt[c] >> b) & 1))) {
      let cover = true; for (let d = 0; d < n; d++) if (((gt[cur] >> d) & 1) && ((gt[d] >> c) & 1)) cover = false;
      if (cover) { cur = c; path.push(c); break; }
    }
  }
  return path.map((j) => NAMES[j]).join(' > ');
}

function tap(j) {
  if (over || !imp) return;
  const i = sel.indexOf(j);
  if (i >= 0) sel.splice(i, 1); else { if (sel.length === 2) sel.shift(); sel.push(j); }
  if (sel.length === 2 && known(gt, sel[0], sel[1])) {
    const [a, b] = (gt[sel[0]] >> sel[1]) & 1 ? sel : [sel[1], sel[0]];
    $('status').textContent = `You already know that: ${chain(a, b)}. Weighing them would tell you nothing.`;
  } else $('status').textContent = sel.length === 2 ? '' : 'Tap two weights to put them on the scale.';
  draw();
  if (sel.length === 2 && !known(gt, sel[0], sel[1])) $('weigh-btn').disabled = false; else $('weigh-btn').disabled = true;
}

function weigh() {
  if (sel.length !== 2 || over) return;
  const [p, q] = sel;
  if (known(gt, p, q)) return;
  const pHeavy = imp.answer(gt, p, q);
  const [a, b] = pHeavy ? [p, q] : [q, p];
  gt = add(gt, a, b); lastEdge = [a, b]; sel = [];
  hist.push({ gt, need: imp.need(gt), pair: [p, q], heavy: a, light: b });
  const li = document.createElement('li'); li.textContent = `${NAMES[a]} heavier than ${NAMES[b]}`; $('log').append(li);
  $('status').textContent = `${NAMES[a]} is heavier than ${NAMES[b]}.`;
  if (goalOf(L)(gt)) finish(true); else if (used() >= L.budget) finish(false);
  draw();
}

function finish(won) {
  over = true; const v = $('verdict');
  if (won) {
    solved.add(L.id); localStorage.setItem(SAVE, JSON.stringify([...solved])); renderLevels();
    const before = hist[hist.length - 2].gt;
    const left = orders(gt), was = orders(before);
    const tail = L.goal === 'sort'
      ? `Right before your last weighing, ${was} different orders still fitted every answer. The Imp kept them all open as long as it could.`
      : `There was never a hidden order. Even now, ${left} different orders of the weights fit every answer the Imp gave. It only ever committed to what you forced out of it.`;
    v.innerHTML = `<p class="won">Settled in ${used()}. Nobody can do it in fewer.</p><p>${L.why || ''}</p><p>${tail}</p>`;
    const i = LEVELS.indexOf(L); if (i < LEVELS.length - 1) $('next-btn').hidden = false;
  } else {
    let k = 1; while (k < hist.length && k + hist[k].need <= L.budget) k++;
    const h = hist[k], prev = hist[k - 1];
    v.innerHTML = `<p class="lost">Out of weighings, and it isn't settled yet.</p>
      <p>Weighing ${k} (${NAMES[h.pair[0]]} against ${NAMES[h.pair[1]]}) was the slip. Before it you could still finish in time
      whatever the Imp said. After its answer, the Imp could hold out for ${h.need} more weighings, and you had ${L.budget - k} left.</p>
      <p><button id="safe-btn" class="quiet">Show a safe weighing for that moment</button> <span id="safe"></span></p>`;
    $('safe-btn').onclick = () => {
      const { pairs } = imp.best(prev.gt);
      $('safe').textContent = 'Safe there: ' + pairs.slice(0, 4).map(([a, b]) => `${NAMES[a]} against ${NAMES[b]}`).join(', ') + (pairs.length > 4 ? ', …' : '') + '.';
    };
  }
}

$('weigh-btn').onclick = weigh;
$('restart-btn').onclick = () => imp && restart();
$('next-btn').onclick = () => load(LEVELS.indexOf(L) + 1);
$('hint-btn').onclick = () => { const h = $('hint'); h.hidden = !h.hidden; $('hint-btn').setAttribute('aria-expanded', String(!h.hidden)); };
const start = Math.min(LEVELS.length, Math.max(1, parseInt(location.hash.slice(1)) || 1)) - 1;
load(start);
