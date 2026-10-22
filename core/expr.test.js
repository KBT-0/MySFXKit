import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpr, evaluate, exprRefs } from './expr.js';
import { validateRecipe } from './index.js';

const value = (text, scope = {}) => evaluate(parseExpr(text), scope);

test('expr: operators, precedence, unary minus and parentheses', () => {
  assert.equal(value('1 + 2 * 3'), 7);
  assert.equal(value('(1 + 2) * 3'), 9);
  assert.equal(value('10 / 4 - 1'), 1.5);
  assert.equal(value('-(2 - 5)'), 3);
  assert.equal(value('2 * -3'), -6);
  assert.equal(value('.5e1 + 1.25'), 6.25);
});

test('expr: every function, and names read from the scope', () => {
  assert.equal(value('abs(-2)'), 2);
  assert.equal(value('min(3, 1, 2) + max(1, 2)'), 3);
  assert.equal(value('clamp(5, 0, 1) + clamp(-5, 0, 1)'), 1);
  assert.equal(value('pow(2, 3)'), 8);
  assert.equal(value('exp(0) + sin(0)'), 1);
  assert.equal(value('500 + 1500 * load', { load: 0.5 }), 1250);
  assert.equal(value('fire.gain * 2', { 'fire.gain': 0.4 }), 0.8);
  assert.deepEqual([...exprRefs(parseExpr('a + max(b, fire.gain)'))], ['a', 'b', 'fire.gain']);
});

test('expr: a bad expr is rejected with the reason', () => {
  for (const [text, reason] of [
    ['1 +', /unexpected end/], ['(1', /unexpected end/], ['1 2', /unexpected '2'/],
    ['2 $ 3', /unexpected character '\$'/], ['foo(1)', /unknown function 'foo'/],
    ['abs(1, 2)', /abs\(\) takes 1/], ['', /unexpected end/], ['constructor(1)', /unknown function/],
  ]) assert.throws(() => parseExpr(text), reason, text);
});

test('expr: a parse error in a recipe names the node, the parameter and the expr', () => {
  const recipe = {
    name: 't', version: 0, seed: 1,
    nodes: [{ id: 'tone', type: 'osc', freq: '440 * * 2' }, { id: 'out', type: 'shape', in: 'tone' }],
  };
  const { ok, errors } = validateRecipe(recipe);
  assert.equal(ok, false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].node, 'tone');
  assert.equal(errors[0].path, 'nodes[0].freq');
  assert.match(errors[0].message, /node "tone", parameter "freq": cannot parse "440 \* \* 2"/);
});

test('expr: an overlong expr is a validation error, not a stack overflow', () => {
  const { ok, errors } = validateRecipe({
    name: 't', version: 0, seed: 1, nodes: [{ id: 'out', type: 'osc', freq: '1' + '+1'.repeat(20000) }],
  });
  assert.equal(ok, false);
  assert.match(errors[0].message, /longer than 1000 characters/);
});
