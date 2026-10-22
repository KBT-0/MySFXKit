import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listEvents } from './events.js';

const recipe = (nodes) => ({ name: 'x', version: 0, nodes });
const out = { id: 'out', type: 'noise' };

test('a recipe with no trigger node has no events', () => {
  assert.deepEqual(listEvents(recipe([{ id: 'p', type: 'pulse' }, out])), []);
});

test('a trigger node without range gets the default [0, 1]', () => {
  assert.deepEqual(listEvents(recipe([{ id: 'impact', type: 'trigger', maxHold: 1.2 }, out])),
    [{ id: 'impact', range: [0, 1] }]);
});

test('a custom range is kept, events stay in node order', () => {
  const nodes = [{ id: 'b', type: 'trigger', range: [0.2, 5] }, out, { id: 'a', type: 'trigger' }];
  assert.deepEqual(listEvents(recipe(nodes)), [{ id: 'b', range: [0.2, 5] }, { id: 'a', range: [0, 1] }]);
});

test('a hostile id is an ordinary string and pollutes nothing', () => {
  const [event] = listEvents(recipe([{ id: '__proto__', type: 'trigger' }, out]));
  assert.equal(event.id, '__proto__');
  assert.ok(Object.hasOwn(event, 'id'));
  assert.deepEqual(event.range, [0, 1]);
  assert.equal(({}).range, undefined);
});
