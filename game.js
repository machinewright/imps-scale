import { LEVELS, goalOf } from './src/levels.js';
import { empty, add, known, above, pc } from './src/poset.js';
import { Imp, orders } from './src/imp.js';
import { CoinImp, applyOutcome, stateOf, hyps, start as coinStart } from './src/coins.js';

const $ = (id) => document.getElementById(id);
const NAMES = 'ABCDEFGH';
const SAVE = 'imp-solved-v1';
let solved; try { solved = new Set(JSON.parse(localStorage.getItem(SAVE) || '[]')); } catch { solved = new Set(); }
const imps = new Map();
let L, K, imp, hist, over;

// ---------- weights: find the heaviest / runner-up / middle / order ----------
const Weights = {
  makeImp: (lv) => new Imp(lv.n, goalOf(lv)),
  init: () => ({ gt: empty(L.n), sel: [], lastEdge: null }),
  need: (st) => imp.need(st.gt),
  settled: (st) => goalOf(L)(st.gt),
  ready(st) { return st.sel.length === 2 && !known(st.gt, st.sel[0], st.sel[1]); },
  label(st) { return st.sel.length === 2 ? `Weigh ${NAMES[st.sel[0]]} against ${NAMES[st.sel[1]]}` : 'Weigh'; },
  idle: 'Tap two weights to put them on the scale.',
  legend: 'Higher row: more weights known to be heavier. A line runs from a heavier weight down to a lighter one; the newest is gold.',
  weigh(st) {
    const [p, q] = st.sel; const pHeavy = imp.answer(st.gt, p, q); const [a, b] = pHeavy ? [p, q] : [q, p];
    return { st: { gt: add(st.gt, a, b), sel: [], lastEdge: [a, b] }, say: `${NAMES[a]} is heavier than ${NAMES[b]}.`,
      log: `${NAMES[a]} heavier than ${NAMES[b]}`, what: `${NAMES[p]} against ${NAMES[q]}` };
  },
  safe(st) { return imp.best(st.gt).pairs.slice(0, 3).map(([a, b]) => `${NAMES[a]} against ${NAMES[b]}`).join(', or '); },
  wonText(st, before) {
    if (L.goal === 'sort') return `Right before your last weighing, ${orders(before.gt)} different orders still fitted every answer. The Imp kept them all open as long as it could.`;
    return `There was never a hidden order. Even now, ${orders(st.gt)} different orders of the weights fit every answer the Imp gave. It only ever committed to what you forced out of it.`;
  },
  answers(st) {
    const n = L.n, out = new Set(); if (!goalOf(L)(st.gt)) return out;
    for (let j = 0; j < n; j++) { const b = pc(st.gt[j]), a = above(st.gt, j), g = L.goal;
      if ((g === 'max' || g === 'maxmin') && b === n - 1) out.add(j);
      if (g === 'maxmin' && a === n - 1) out.add(j);
      if (g === 'second' && a === 1 && b === n - 2) out.add(j);
      if (g === 'median' && a === (n - 1) >> 1 && b === (n - 1) >> 1) out.add(j);
      if (g === 'top3' && b >= n - 3) out.add(j);
      if (g === 'sort') out.add(j);
      if (g.startsWith('ranks:') && g.slice(6).split(',').map(Number).some((r) => a === r - 1 && b === n - r)) out.add(j);
      if (g.startsWith('top:') && b >= n - +g.slice(4)) out.add(j); }
    return out;
  },
  draw(st) {
    const n = L.n, W = Math.max(300, n * 66), colW = W / n, rowH = n > 6 ? 44 : 50, rows = n, H = rows * rowH + 10, gt = st.gt;
    const x = (j) => colW * (j + 0.5), y = (j) => 30 + above(gt, j) * rowH, ans = this.answers(st);
    let s = `<svg class="board" viewBox="0 0 ${W} ${H}" role="group" aria-label="Weights">`;
    for (let r = 0; r < rows; r++) s += `<line class="rowline" x1="0" x2="${W}" y1="${30 + r * rowH}" y2="${30 + r * rowH}"/>`;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (!((gt[a] >> b) & 1)) continue;
      let cover = true; for (let c = 0; c < n; c++) if (((gt[a] >> c) & 1) && ((gt[c] >> b) & 1)) { cover = false; break; }
      if (!cover) continue;
      const isNew = st.lastEdge && st.lastEdge[0] === a && st.lastEdge[1] === b;
      const span = Math.abs(x(b) - x(a)) / colW, bow = span > 1.2 ? Math.min(34, 10 * span) : 0;
      const mx = (x(a) + x(b)) / 2, my = (y(a) + y(b)) / 2 - bow;
      s += `<path class="edge${isNew ? ' new' : ''}" d="M${x(a)},${y(a)} Q${mx},${my} ${x(b)},${y(b)}" fill="none"/>`;
    }
    for (let j = 0; j < n; j++) {
      const cls = ['item']; if (st.sel.includes(j)) cls.push('sel'); if (ans.has(j)) cls.push('answer');
      s += `<g class="${cls.join(' ')}" data-j="${j}" tabindex="0" role="button" aria-pressed="${st.sel.includes(j)}"
        aria-label="Weight ${NAMES[j]}: ${above(gt, j)} known heavier, ${pc(gt[j])} known lighter">
        <circle class="ring" cx="${x(j)}" cy="${y(j)}" r="17"/><text class="lbl" x="${x(j)}" y="${y(j)}">${NAMES[j]}</text></g>`;
    }
    return s + '</svg>';
  },
  tap(st, j) {
    const i = st.sel.indexOf(j);
    if (i >= 0) st.sel.splice(i, 1); else { if (st.sel.length === 2) st.sel.shift(); st.sel.push(j); }
    if (st.sel.length === 2 && known(st.gt, st.sel[0], st.sel[1])) {
      const [a, b] = (st.gt[st.sel[0]] >> st.sel[1]) & 1 ? st.sel : [st.sel[1], st.sel[0]];
      return `You already know that: ${chain(st.gt, a, b)}. Weighing them would tell you nothing.`;
    }
    return st.sel.length === 2 ? '' : this.idle;
  },
};
function chain(gt, a, b) {
  const n = gt.length, path = [a]; let cur = a;
  while (cur !== b) for (let c = 0; c < n; c++) if (((gt[cur] >> c) & 1) && (c === b || ((gt[c] >> b) & 1))) {
    let cover = true; for (let d = 0; d < n; d++) if (((gt[cur] >> d) & 1) && ((gt[d] >> c) & 1)) cover = false;
    if (cover) { cur = c; path.push(c); break; }
  }
  return path.map((j) => NAMES[j]).join(' > ');
}

// ---------- coins: one fake among them ----------
const MARK = { u: '?', h: 'heavy?', l: 'light?', g: 'genuine' };
const Coins = {
  makeImp: (lv) => new CoinImp(!!lv.coinOnly),
  init() { const s0 = coinStart(L.n, L.opt || {}); const status = [...Array(L.n).fill(s0.h ? 'h' : 'u'), ...Array(s0.g).fill('g')];
    return { status, none: !!(L.opt && L.opt.none), pan: Array(status.length).fill(0) }; },
  S: (st) => stateOf(st.status, st.none),
  need(st) { return imp.need(this.S(st)); },
  settled(st) { return !!imp && imp.settled(this.S(st)); },
  sides(st) { const l = [], r = []; st.pan.forEach((p, i) => { if (p === 1) l.push(i); if (p === 2) r.push(i); }); return [l, r]; },
  ready(st) { const [l, r] = this.sides(st); return l.length > 0 && l.length === r.length; },
  label(st) { const [l, r] = this.sides(st); return l.length || r.length ? `Weigh ${l.length} against ${r.length}` : 'Weigh'; },
  idle: 'Tap a coin to put it on the left pan, again for the right pan, a third time to take it off.',
  legend: '▲ heavy? means that coin can only be the fake if it is heavier; ▼ light? the same for lighter. Genuine coins are grey.',
  weigh(st) {
    const [l, r] = this.sides(st); const o = imp.answer(st.status, st.none, l, r);
    const status = applyOutcome(st.status, l, r, o), none = o === 1 ? st.none : false;
    const names = (a) => a.map((i) => i + 1).join(' ');
    const what = `${names(l)} against ${names(r)}`;
    const res = ['the left pan goes down', 'they balance', 'the right pan goes down'][o];
    return { st: { status, none, pan: Array(status.length).fill(0) }, say: `${what}: ${res}.`, log: `${what}: ${['left heavier', 'balance', 'right heavier'][o]}`, what };
  },
  safe(st) {
    const [a, b] = this.bestIdx(st); return `coins ${a.map((i) => i + 1).join(' ')} against ${b.map((i) => i + 1).join(' ')}`;
  },
  bestIdx(st) {
    const [Lc, Rc] = imp.best(this.S(st)); const pool = { u: [], h: [], l: [], g: [] };
    st.status.forEach((s, i) => pool[s].push(i));
    const take = (c) => Object.entries(c).flatMap(([k, m]) => pool[k].splice(0, m));
    return [take(Lc), take(Rc)];
  },
  wonText(st) {
    const i = st.status.findIndex((s) => s !== 'g');
    if (i < 0) return 'All the coins are genuine. The Imp could have made any of them fake until the end.';
    const s = st.status[i];
    const which = s === 'h' ? 'heavier' : s === 'l' ? 'lighter' : null;
    return `The fake is coin ${i + 1}${which ? `, ${which}` : ''}. Until you pinned it down, the Imp could have made other coins fake: it never chose in advance.`;
  },
  draw(st) {
    const n = st.status.length, per = n > 7 ? Math.ceil(n / 2) : n, W = Math.max(300, per * 62), rows = Math.ceil(n / per);
    const H = 80 + rows * 64;
    let s = `<svg class="board coins" viewBox="0 0 ${W} ${H}" role="group" aria-label="Coins">`;
    s += `<rect class="pan" x="${W * 0.04}" y="8" width="${W * 0.42}" height="46" rx="10"/><text class="panlab" x="${W * 0.25}" y="31">left pan</text>`;
    s += `<rect class="pan" x="${W * 0.54}" y="8" width="${W * 0.42}" height="46" rx="10"/><text class="panlab" x="${W * 0.75}" y="31">right pan</text>`;
    const settledNow = this.settled(st);
    const [onl, onr] = this.sides(st);
    st.status.forEach((stt, i) => {
      const r = Math.floor(i / per), c = i % per; let cx = (W / per) * (c + 0.5), cy = 96 + r * 64;
      if (st.pan[i]) { const list = st.pan[i] === 1 ? onl : onr, k = list.indexOf(i), m = list.length;
        const step = Math.min(40, (W * 0.4) / m), x0 = (st.pan[i] === 1 ? W * 0.25 : W * 0.75) - (step * (m - 1)) / 2;
        cx = x0 + k * step; cy = 31; }
      const cls = ['item', 'coin', 'st-' + stt]; if (st.pan[i]) cls.push(st.pan[i] === 1 ? 'onL' : 'onR');
      if (settledNow && stt !== 'g') cls.push('answer');
      s += `<g class="${cls.join(' ')}" data-j="${i}" tabindex="0" role="button"
        aria-label="Coin ${i + 1}: ${MARK[stt]}${st.pan[i] ? ', on the ' + (st.pan[i] === 1 ? 'left' : 'right') + ' pan' : ''}">
        <circle class="ring" cx="${cx}" cy="${cy}" r="${st.pan[i] ? 16 : 18}"/><text class="lbl" x="${cx}" y="${cy}">${i + 1}</text>
        ${st.pan[i] ? '' : `<text class="mark" x="${cx}" y="${cy + 28}">${stt === 'u' ? '' : stt === 'h' ? '▲ heavy?' : stt === 'l' ? '▼ light?' : 'genuine'}</text>`}</g>`;
    });
    return s + '</svg>';
  },
  tap(st, j) { st.pan[j] = (st.pan[j] + 1) % 3; const [l, r] = this.sides(st);
    if (!l.length && !r.length) return this.idle;
    return l.length === r.length ? '' : `Left pan: ${l.length}, right pan: ${r.length}. The pans need the same number of coins.`; },
};

// ---------- shell ----------
function renderLevels() {
  const nav = $('levels'); nav.innerHTML = '';
  let ch = null;
  LEVELS.forEach((lv, i) => {
    if (ch !== null && lv.chapter !== ch && (lv.kind || 'w') !== (LEVELS[i - 1].kind || 'w')) { const sp = document.createElement('span'); sp.className = 'sep'; nav.append(sp); }
    ch = lv.chapter;
    const b = document.createElement('button'); b.textContent = i + 1; b.title = lv.title;
    if (solved.has(lv.id)) b.classList.add('solved');
    if (lv === L) b.setAttribute('aria-current', 'true');
    b.onclick = () => load(i); nav.append(b);
  });
}
const cur = () => hist[hist.length - 1].st;
const used = () => hist.length - 1;

function load(i) {
  L = LEVELS[i]; K = L.kind === 'coins' ? Coins : Weights; history.replaceState(null, '', '#' + (i + 1));
  $('chapter').textContent = L.chapter; $('title').textContent = L.title; $('ask').textContent = L.ask;
  $('hint').hidden = true; $('hint').textContent = L.hint; $('hint-btn').setAttribute('aria-expanded', 'false');
  renderLevels(); imp = null;
  hist = [{ st: K.init(), need: L.budget }]; over = false; $('verdict').innerHTML = ''; $('log').innerHTML = ''; $('next-btn').hidden = true;
  $('status').textContent = imps.has(L.id) ? '' : 'The Imp is thinking through every strategy…';
  draw();
  setTimeout(() => { if (!imps.has(L.id)) imps.set(L.id, K.makeImp(L)); imp = imps.get(L.id); K.need(cur()); restart(); }, 30);
}
function restart(again) {
  hist = [{ st: K.init(), need: L.budget }]; over = false; $('legend').textContent = K.legend;
  $('verdict').innerHTML = ''; $('log').innerHTML = ''; $('next-btn').hidden = true; $('status').textContent = again ? 'Fresh start. The Imp may answer differently this time: it only promises the worst for you, not the same answers.' : K.idle; draw();
}
function draw() {
  const c = $('count'); c.innerHTML = '';
  for (let k = 0; k < L.budget; k++) { const p = document.createElement('span'); p.className = 'pip' + (k < used() ? ' used' : ''); c.append(p); }
  const s = document.createElement('span'); s.className = 'lab'; s.textContent = `${used()} of ${L.budget} weighings used`; c.append(s);
  $('stage').innerHTML = K.draw(cur());
  $('stage').querySelectorAll('.item').forEach((g) => {
    const j = +g.dataset.j, go = () => { if (over || !imp) return; $('status').textContent = K.tap(cur(), j); draw(); };
    g.onclick = go; g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
  const wb = $('weigh-btn'); wb.disabled = over || !imp || !K.ready(cur()); wb.textContent = K.label(cur());
}
function weigh() {
  if (over || !imp || !K.ready(cur())) return;
  const r = K.weigh(cur()); hist.push({ st: r.st, need: K.need(r.st), what: r.what });
  const li = document.createElement('li'); li.textContent = r.log; $('log').append(li);
  $('status').textContent = r.say;
  if (K.settled(r.st)) finish(true); else if (used() >= L.budget) finish(false);
  draw();
}
function finish(won) {
  over = true; const v = $('verdict');
  if (won) {
    solved.add(L.id); try { localStorage.setItem(SAVE, JSON.stringify([...solved])); } catch {}
    renderLevels();
    v.innerHTML = `<p class="won">Settled in ${used()}. Nobody can do it in fewer.</p><p>${K.wonText(cur(), hist[hist.length - 2].st)}</p><p>${L.why || ''}</p>`;
    if (LEVELS.indexOf(L) < LEVELS.length - 1) $('next-btn').hidden = false;
  } else {
    let k = 1; while (k < hist.length && k + hist[k].need <= L.budget) k++;
    const h = hist[k], prev = hist[k - 1];
    v.innerHTML = `<p class="lost">Out of weighings, and it isn't settled yet.</p>
      <p>Weighing ${k} (${h.what}) was the slip. Before it you could still finish in time, whatever the Imp said.
      After its answer the Imp could hold out for ${h.need} more weighing${h.need > 1 ? 's' : ''}, and you had ${L.budget - k} left.</p>
      <p><button id="safe-btn" class="quiet">Show a safe weighing for that moment</button> <span id="safe"></span></p>`;
    $('safe-btn').onclick = () => { $('safe').textContent = `Safe there: ${K.safe(prev.st)}.`; };
  }
}
window.__state = () => cur();
window.__best = () => K === Coins ? Coins.bestIdx(cur()) : imp.best(cur().gt).pairs[0];
$('weigh-btn').onclick = weigh;
$('restart-btn').onclick = () => imp && restart(true);
$('next-btn').onclick = () => load(LEVELS.indexOf(L) + 1);
$('hint-btn').onclick = () => { const h = $('hint'); h.hidden = !h.hidden; $('hint-btn').setAttribute('aria-expanded', String(!h.hidden)); };
load(Math.min(LEVELS.length, Math.max(1, parseInt(location.hash.slice(1)) || 1)) - 1);
