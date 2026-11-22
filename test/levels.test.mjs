import { test } from 'node:test';
import assert from 'node:assert';
import { LEVELS, goalOf } from '../src/levels.js';
import { makeSolver, empty, add, goals, ranks } from '../src/poset.js';
import { orders } from '../src/imp.js';

test('budgets are the exact minimum', () => {
  for (const lv of LEVELS) assert.strictEqual(makeSolver(lv.n, goalOf(lv)).V(empty(lv.n)), lv.budget, lv.id);
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
