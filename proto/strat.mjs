import { makeSolver, goals, add } from './minimax.mjs';
const [,, g, nStr, runsStr] = process.argv; const n = +nStr, runs = +(runsStr||2000);
const S = makeSolver(n, goals[g]); const start = Array(n).fill(0); const OPT = S.V(start);
const perms = (function p(a){ if(a.length<=1) return [a]; return a.flatMap((x,i)=>p([...a.slice(0,i),...a.slice(i+1)]).map(r=>[x,...r])); })([...Array(n).keys()]);
const ext = gt => perms.filter(p => { const r=[]; p.forEach((e,i)=>r[e]=n-i); for(let a=0;a<n;a++) for(let b=0;b<n;b++) if((gt[a]>>b)&1 && r[a]<r[b]) return false; return true; }).length;
function computerPick(gt) { // optimal pair; tie-break: largest punishment (min over answers smallest)
  let best=null, bv=Infinity, bp=-1;
  for (let a=0;a<n;a++) for (let b=a+1;b<n;b++) { if((gt[a]>>b)&1||(gt[b]>>a)&1) continue;
    const x=S.V(add(gt,a,b)), y=S.V(add(gt,b,a)); const v=1+Math.max(x,y), pun=Math.max(x,y)-Math.min(x,y);
    if (v<bv || (v===bv && (pun>bp || (pun===bp && Math.random()<0.5)))) { bv=v; best=[a,b]; bp=pun; } }
  return best;
}
const strats = {
  random: (gt,a,b) => Math.random()<0.5,
  count: (gt,a,b) => { const x=ext(add(gt,a,b)), y=ext(add(gt,b,a)); return x===y ? Math.random()<0.5 : x>y; },
  winsMore: (gt,a,b) => { const pc=v=>{let c=0;while(v){v&=v-1;c++}return c}; const x=pc(gt[a]),y=pc(gt[b]); return x===y?Math.random()<0.5:x>y; },
  optimal: (gt,a,b) => { const x=S.V(add(gt,a,b)), y=S.V(add(gt,b,a)); return x===y ? Math.random()<0.5 : x>y; },
};
for (const [name, f] of Object.entries(strats)) {
  if (name==='count' && n>6) continue;
  let hit=0, tot=0, R = name==='count'? Math.min(runs,300):runs;
  for (let r=0;r<R;r++){ let gt=start, q=0; while(!goals[g](gt)){ const [a,b]=computerPick(gt); gt = f(gt,a,b)? add(gt,a,b):add(gt,b,a); q++; } tot+=q; if(q===OPT) hit++; }
  console.log(g,n,'opt',OPT,name.padEnd(8),'reach opt', (100*hit/R).toFixed(0)+'%','avg',(tot/R).toFixed(2));
}
