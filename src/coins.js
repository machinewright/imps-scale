// Fake-coin weighings against the Imp. One coin is fake: heavier or lighter than the rest (or, in some levels,
// known to be heavier; or there may be no fake at all). A state counts coins by what is still possible for them:
//   u: could be heavy or light, h: could only be heavy, l: could only be light, g: known genuine.
// The goal: one possibility left (which coin, and heavy or light), or with `coinOnly`, the coin itself is known.
// `none`: "no fake at all" is still possible.

export function hyps(s) { return 2 * s.u + s.h + s.l + (s.none ? 1 : 0); }
export function settled(s, coinOnly) {
  const coins = s.u + s.h + s.l;
  if (coinOnly) return coins + (s.none ? 1 : 0) <= 1;
  return hyps(s) <= 1;
}

// A weighing puts counts {u,h,l,g} on the left and right. Returns the three outcome states (null = impossible).
export function outcomes(s, L, R) {
  const off = { u: s.u - L.u - R.u, h: s.h - L.h - R.h, l: s.l - L.l - R.l };
  const total = s.u + s.h + s.l + s.g;
  const bal = { u: off.u, h: off.h, l: off.l, g: total - off.u - off.h - off.l, none: s.none };
  // left heavier: fake is a left coin that may be heavy, or a right coin that may be light
  const lh = { u: 0, h: L.u + L.h, l: R.u + R.l, none: false }; lh.g = total - lh.h - lh.l;
  const rh = { u: 0, h: R.u + R.h, l: L.u + L.l, none: false }; rh.g = total - rh.h - rh.l;
  const ok = (t) => (hyps(t) > 0 ? t : null);
  return [ok(lh), ok(bal), ok(rh)];
}

function* splits(s) {
  // every way to choose left and right pans of equal size (left <= right lexicographically, by symmetry)
  for (let lu = 0; lu <= s.u; lu++) for (let ru = 0; ru <= s.u - lu; ru++)
  for (let lh = 0; lh <= s.h; lh++) for (let rh = 0; rh <= s.h - lh; rh++)
  for (let ll = 0; ll <= s.l; ll++) for (let rl = 0; rl <= s.l - ll; rl++) {
    const a = lu + lh + ll, b = ru + rh + rl;
    for (let lg = 0; lg <= s.g; lg++) { const rg = a + lg - b; if (rg < 0 || lg + rg > s.g) continue;
      if (a + lg === 0) continue;
      yield [{ u: lu, h: lh, l: ll, g: lg }, { u: ru, h: rh, l: rl, g: rg }];
    }
  }
}

export function makeCoinSolver(coinOnly) {
  const memo = new Map();
  const key = (s) => `${s.u},${s.h},${s.l},${Math.min(s.g, s.u + s.h + s.l)},${s.none ? 1 : 0}`;
  function V(s) {
    if (settled(s, coinOnly)) return 0;
    const k = key(s); if (memo.has(k)) return memo.get(k);
    memo.set(k, Infinity); // guard against useless weighings looping
    let best = Infinity;
    for (const [L, R] of splits(s)) {
      const outs = outcomes(s, L, R);
      // a weighing that can't change anything is useless
      if (outs.some((t) => t && key(t) === k && hyps(t) === hyps(s))) continue;
      let worst = 0;
      for (const t of outs) if (t) { worst = Math.max(worst, V(t)); if (worst + 1 >= best) break; }
      best = Math.min(best, worst + 1);
    }
    memo.set(k, best); return best;
  }
  return { V, memo };
}
export const start = (n, { heavy = false, extra = 0, none = false } = {}) =>
  heavy ? { u: 0, h: n, l: 0, g: extra, none } : { u: n, h: 0, l: 0, g: extra, none };

// Per-coin view. status[i] in 'u','h','l','g'.
export function counts(status, idx) {
  const c = { u: 0, h: 0, l: 0, g: 0 };
  for (const i of idx ?? status.keys()) c[status[i]]++;
  return c;
}
export function stateOf(status, none) { const c = counts(status); return { ...c, none }; }

export function applyOutcome(status, left, right, o) { // o: 0 left heavier, 1 balance, 2 right heavier
  const onL = new Set(left), onR = new Set(right);
  return status.map((st, i) => {
    if (o === 1) return onL.has(i) || onR.has(i) ? 'g' : st;
    const heavySide = o === 0 ? onL : onR, lightSide = o === 0 ? onR : onL;
    if (heavySide.has(i) && (st === 'u' || st === 'h')) return 'h';
    if (lightSide.has(i) && (st === 'u' || st === 'l')) return 'l';
    return 'g';
  });
}

export class CoinImp {
  constructor(coinOnly, rand = Math.random) { this.solver = makeCoinSolver(coinOnly); this.coinOnly = coinOnly; this.rand = rand; }
  need(s) { return this.solver.V(s); }
  settled(s) { return settled(s, this.coinOnly); }
  // returns outcome index 0/1/2
  answer(status, none, left, right) {
    const s = stateOf(status, none);
    const outs = outcomes(s, counts(status, left), counts(status, right));
    let best = [], bv = -1, bh = -1;
    outs.forEach((t, o) => { if (!t) return; const v = this.need(t), h = hyps(t);
      if (v > bv || (v === bv && h > bh)) { bv = v; bh = h; best = [o]; } else if (v === bv && h === bh) best.push(o); });
    return best[Math.floor(this.rand() * best.length)];
  }
  // a safe weighing from state s, as counts per pan
  best(s) {
    let pick = null, bv = Infinity;
    for (const [L, R] of splits(s)) {
      const outs = outcomes(s, L, R); let w = 0;
      for (const t of outs) if (t) w = Math.max(w, this.need(t));
      if (w < bv && !outs.some((t) => t && hyps(t) === hyps(s) && t.u === s.u)) { bv = w; pick = [L, R]; }
    }
    return pick;
  }
}
