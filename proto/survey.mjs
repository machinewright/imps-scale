import { makeSolver, ranks, top, empty } from '../src/poset.js';
const out = [];
for (const n of [5,6,7]) {
  const cands = {};
  for (let r=1;r<=n;r++) cands[`rank${r}`]=ranks([r]);
  for (let a=1;a<=n;a++) for (let b=a+1;b<=n;b++) cands[`ranks${a},${b}`]=ranks([a,b]);
  for (let k=1;k<n;k++) cands[`top${k}`]=top(k);
  const line=[];
  for (const [name,g] of Object.entries(cands)) { const S=makeSolver(n,g); line.push(`${name}=${S.V(empty(n))}`); }
  console.log('n='+n, line.join(' '));
}
