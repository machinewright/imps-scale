import { makeSolver, goals, add } from './minimax.mjs';
const [,, g, nStr] = process.argv; const n = +nStr;
const t = Date.now(); const S = makeSolver(n, goals[g]); const start = Array(n).fill(0);
console.log(g, n, 'V=', S.V(start), 'states', S.memo.size, (Date.now()-t)+'ms');
