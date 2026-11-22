// Difficulty proxy: along random optimal play (Imp answers optimally), share of safe pairs at each step.
import { makeSolver, ranks, top, goals, empty, add, known } from '../src/poset.js';
const cands = process.argv.slice(2);
const parse = (c) => { const [n, g] = c.split(':'); const N = +n;
  if (g.startsWith('r')) return [N, ranks(g.slice(1).split(',').map(Number))];
  if (g.startsWith('t')) return [N, top(+g.slice(1))]; return [N, goals[g]]; };
for (const c of cands) {
  const [n, goal] = parse(c); const S = makeSolver(n, goal); const V0 = S.V(empty(n));
  let fr = [], minFr = 1, runs = 30;
  for (let r = 0; r < runs; r++) {
    let gt = empty(n), left = V0;
    while (!goal(gt)) {
      const safe = [], all = [];
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { if (known(gt, a, b)) continue; all.push([a, b]);
        if (1 + Math.max(S.V(add(gt, a, b)), S.V(add(gt, b, a))) <= left) safe.push([a, b]); }
      const f = safe.length / all.length; fr.push(f); minFr = Math.min(minFr, f);
      const [a, b] = safe[Math.floor(Math.random() * safe.length)];
      const x = S.V(add(gt, a, b)), y = S.V(add(gt, b, a));
      gt = x > y || (x === y && Math.random() < .5) ? add(gt, a, b) : add(gt, b, a); left--;
    }
  }
  const avg = fr.reduce((s, x) => s + x, 0) / fr.length;
  // chance a random legal player survives = product of fractions (one run's estimate averaged)
  console.log(c.padEnd(10), 'V', V0, 'avg safe share', avg.toFixed(2), 'min', minFr.toFixed(2));
}
