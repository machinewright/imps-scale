// Posets on n <= 8 labelled items. gt[i] = bitmask of items known lighter than i (transitively closed).
export const pc = (x) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };

export function empty(n) { return Array(n).fill(0); }

// record "a heavier than b" and close transitively
export function add(gt, a, b) {
  const g = gt.slice(), below = gt[b] | (1 << b);
  for (let i = 0; i < g.length; i++) if (i === a || (g[i] >> a) & 1) g[i] |= below;
  return g;
}
export const known = (gt, a, b) => ((gt[a] >> b) & 1) === 1 || ((gt[b] >> a) & 1) === 1;
export function above(gt, j) { let c = 0; for (let i = 0; i < gt.length; i++) if ((gt[i] >> j) & 1) c++; return c; }

// Goals: return true when the comparisons so far settle the question.
// rank r = 1 is the heaviest. ranks(list) is settled when, for each r, some item is known to have exactly r-1 above
// and n-r below it.
export const ranks = (list) => (gt) => list.every((r) => gt.some((m, j) => pc(m) === gt.length - r && above(gt, j) === r - 1));
// top(k): the k heaviest are known as a set (each of them known heavier than each of the others).
export const top = (k) => (gt) => { const n = gt.length; const hi = gt.map((m, j) => pc(m) >= n - k);
  // items with >= n-k below are certainly in the top k; need exactly k of them
  return hi.filter(Boolean).length === k; };
export const goals = {
  max: (gt) => gt.some((m) => pc(m) === gt.length - 1),
  maxmin: (gt) => goals.max(gt) && gt.some((_, j) => above(gt, j) === gt.length - 1),
  second: (gt) => gt.some((m, j) => above(gt, j) === 1 && pc(m) === gt.length - 2),
  median: (gt) => { const k = (gt.length - 1) >> 1; return gt.some((m, j) => above(gt, j) === k && pc(m) === k); },
  sort: (gt) => gt.every((m) => true) && new Set(gt.map(pc)).size === gt.length,
};

// Canonical key: relabel by (above, below) signature, then try all orders within ties.
export function canon(gt) {
  const n = gt.length;
  const sig = gt.map((m, i) => above(gt, i) * 16 + pc(m));
  const idx = [...Array(n).keys()].sort((a, b) => sig[a] - sig[b]);
  // groups of equal signature
  const groups = []; for (const i of idx) { const g = groups[groups.length - 1]; if (g && sig[g[0]] === sig[i]) g.push(i); else groups.push([i]); }
  let best = null;
  const order = [];
  const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
  const gp = groups.map(perms);
  (function rec(k) {
    if (k === gp.length) {
      const pos = []; order.forEach((e, p) => (pos[e] = p));
      let key = '';
      for (const e of order) { let m = 0; for (let j = 0; j < n; j++) if ((gt[e] >> j) & 1) m |= 1 << pos[j]; key += String.fromCharCode(65 + m % 64, 65 + (m >> 6)); }
      if (best === null || key < best) best = key;
      return;
    }
    for (const p of gp[k]) { order.push(...p); rec(k + 1); order.length -= p.length; }
  })(0);
  return best;
}

export function makeSolver(n, goal) {
  const memo = new Map();
  function V(gt) {
    if (goal(gt)) return 0;
    const key = canon(gt);
    const m = memo.get(key); if (m !== undefined) return m;
    let best = Infinity;
    for (let a = 0; a < n && best > 1; a++) for (let b = a + 1; b < n; b++) {
      if (known(gt, a, b)) continue;
      const v = 1 + Math.max(V(add(gt, a, b)), V(add(gt, b, a)));
      if (v < best) { best = v; if (best === 1) break; }
    }
    memo.set(key, best); return best;
  }
  return { V, memo };
}
