import { makeSolver, goals, empty } from '../src/poset.js';
const [,, g, nStr] = process.argv; const n = +nStr;
const t = Date.now(); const S = makeSolver(n, goals[g]);
console.log(g, n, 'V=', S.V(empty(n)), 'states', S.memo.size, (Date.now()-t)+'ms');
