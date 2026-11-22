import { test } from 'node:test';
import assert from 'node:assert';
import { LEVELS, goalOf } from '../src/levels.js';
import { makeSolver, empty, add, goals, ranks } from '../src/poset.js';
import { orders } from '../src/imp.js';
import { makeCoinSolver, start } from '../src/coins.js';

test('budgets are the exact minimum', () => {
  for (const lv of LEVELS) {
    const v = lv.kind === 'coins' ? makeCoinSolver(!!lv.coinOnly).V(start(lv.n, lv.opt || {})) : makeSolver(lv.n, goalOf(lv)).V(empty(lv.n));
    assert.strictEqual(v, lv.budget, lv.id);
  }
});
test('known values', () => {
  const v = (n, g) => makeSolver(n, g).V(empty(n));
  assert.strictEqual(v(5, goals.sort), 7); assert.strictEqual(v(6, goals.sort), 10); assert.strictEqual(v(7, goals.sort), 13);
  assert.strictEqual(v(7, goals.median), 10); assert.strictEqual(v(8, goals.second), 9); assert.strictEqual(v(8, goals.maxmin), 10);
  assert.strictEqual(v(6, ranks([2])), 7);
});
test('orders counts linear extensions', () => {
  assert.strictEqual(orders(empty(5)), 120);
  assert.strictEqual(orders(add(empty(4), 0, 1)), 12);
});

test('coin classics', () => {
  assert.strictEqual(makeCoinSolver(false).V(start(12)), 3);
  assert.strictEqual(makeCoinSolver(false).V(start(4)), 3); // level 13 text: direction too would take 3
  assert.strictEqual(makeCoinSolver(false).V(start(13)), 4);
  assert.strictEqual(makeCoinSolver(true).V(start(13)), 3);
  assert.strictEqual(makeCoinSolver(false).V(start(13, { extra: 1 })), 3);
  assert.strictEqual(makeCoinSolver(false).V(start(27, { heavy: true })), 3);
  assert.strictEqual(makeCoinSolver(false).V(start(28, { heavy: true })), 4);
});

test('text claims in level explanations', () => {
  const v = (n, g) => makeSolver(n, g).V(empty(n));
  assert.strictEqual(v(6, goals.sort), 10);   // x_r34_6: sorting six takes 10
  assert.strictEqual(v(5, goals.median), 6);  // x_med7: with five the middle took 6
  assert.ok(2 ** 8 >= 720 / 4 && 2 ** 7 < 720 / 4); // x_r34_6: counting alone allows 8
});
