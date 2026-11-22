import { makeCoinSolver, start } from '../src/coins.js';
const show = (label, n, opt, coinOnly) => { const S = makeCoinSolver(coinOnly); console.log(label.padEnd(34), S.V(start(n, opt))); };
for (const n of [3,4,9,12,13,14,27]) show(`${n} coins heavy`, n, {heavy:true}, false);
for (const n of [3,4,5,12,13,14]) show(`${n} coins h/l, coin+dir`, n, {}, false);
for (const n of [3,4,5,12,13,14]) show(`${n} coins h/l, coin only`, n, {}, true);
for (const n of [4,12,13,14]) show(`${n} coins h/l +1 genuine, coin+dir`, n, {extra:1}, false);
for (const n of [3,4,12,13]) show(`${n} coins h/l maybe none, coin+dir`, n, {none:true}, false);
for (const n of [12,13]) show(`${n} coins maybe none +1 genuine`, n, {none:true, extra:1}, false);
