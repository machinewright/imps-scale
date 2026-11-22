// State: closure as array of n bitmasks: gt[i] = set of j with i>j (known).
export function add(gt, a, b) { // a > b, return new closure
  const n = gt.length, g = gt.slice();
  // everything >= a now > everything <= b
  const below = gt[b] | (1 << b);
  for (let i = 0; i < n; i++) if (i === a || (g[i] >> a) & 1) g[i] |= below;
  return g;
}
const pc = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
export const goals = {
  sort: (gt) => gt.every((m, i) => true) && new Set(gt.map(pc)).size === gt.length,
  max: (gt) => gt.some(m => pc(m) === gt.length - 1),
  maxmin: (gt) => { const n = gt.length; const all = (1 << n) - 1;
    const hasMax = gt.some(m => pc(m) === n - 1);
    let isMin = 0; for (let j = 0; j < n; j++) { let c = 0; for (let i = 0; i < n; i++) if ((gt[i] >> j) & 1) c++; if (c === n - 1) isMin = 1; }
    return hasMax && isMin; },
  second: (gt) => { const n = gt.length; // known which is 2nd: an element with exactly 1 above, known > all others n-2
    for (let j = 0; j < n; j++) { let above = 0; for (let i = 0; i < n; i++) if ((gt[i] >> j) & 1) above++; if (above === 1 && pc(gt[j]) === n - 2) return true; } return false; },
  median: (gt) => { const n = gt.length, k = (n - 1) / 2;
    for (let j = 0; j < n; j++) { let above = 0; for (let i = 0; i < n; i++) if ((gt[i] >> j) & 1) above++; if (above === k && pc(gt[j]) === k) return true; } return false; },
};
export function makeSolver(n, goal) {
  const memo = new Map();
  function V(gt) {
    if (goal(gt)) return 0;
    const key = gt.join(',');
    const m = memo.get(key); if (m !== undefined) return m;
    let best = Infinity;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if ((gt[a] >> b) & 1 || (gt[b] >> a) & 1) continue;
      const v = 1 + Math.max(V(add(gt, a, b)), V(add(gt, b, a)));
      if (v < best) best = v;
      if (best === 1) break;
    }
    memo.set(key, best); return best;
  }
  return { V, memo };
}
