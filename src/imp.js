// The Imp: an adversary that never fixes a hidden order. It answers each weighing so that the
// questioner needs as many more weighings as possible (exact minimax), never contradicting itself.
import { add, known, makeSolver } from './poset.js';

// Number of total orders consistent with what is known (bitmask DP, n <= 8).
export function orders(gt) {
  const n = gt.length, f = new Float64Array(1 << n); f[0] = 1;
  // build from the heaviest down: item i may be placed next if every item heavier than i is placed
  const heavier = Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((gt[i] >> j) & 1) heavier[j] |= 1 << i;
  for (let s = 0; s < 1 << n; s++) if (f[s]) for (let i = 0; i < n; i++)
    if (!((s >> i) & 1) && (heavier[i] & s) === heavier[i]) f[s | (1 << i)] += f[s];
  return f[(1 << n) - 1];
}

export class Imp {
  constructor(n, goal, rand = Math.random) { this.n = n; this.goal = goal; this.solver = makeSolver(n, goal); this.rand = rand; }
  need(gt) { return this.solver.V(gt); }
  // answer a weighing of a vs b: returns true if a is heavier
  answer(gt, a, b) {
    if (known(gt, a, b)) return ((gt[a] >> b) & 1) === 1;
    const A = add(gt, a, b), B = add(gt, b, a);
    const va = this.need(A), vb = this.need(B);
    if (va !== vb) return va > vb;
    const oa = orders(A), ob = orders(B);
    if (oa !== ob) return oa > ob;
    return this.rand() < 0.5;
  }
  // best pair to weigh now (for hints/tests): the one minimising the worst case
  best(gt) {
    let best = [], bv = Infinity;
    for (let a = 0; a < this.n; a++) for (let b = a + 1; b < this.n; b++) {
      if (known(gt, a, b)) continue;
      const v = Math.max(this.need(add(gt, a, b)), this.need(add(gt, b, a)));
      if (v < bv) { bv = v; best = [[a, b]]; } else if (v === bv) best.push([a, b]);
    }
    return { pairs: best, need: bv + 1 };
  }
}
