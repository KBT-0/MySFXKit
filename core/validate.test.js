import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRecipe, compileRecipe } from './index.js';

const diesel = JSON.parse(readFileSync(new URL('./recipes/diesel.json', import.meta.url), 'utf8'));
const recipe = (nodes, extra = {}) => ({ name: 't', version: 0, seed: 1, ...extra, nodes });
const errorsOf = (r) => validateRecipe(r).errors;

test('validate: the bundled diesel is valid', () => {
  assert.deepEqual(validateRecipe(diesel), { ok: true, errors: [] });
});

test('validate: an unknown block type is rejected', () => {
  const errors = errorsOf(recipe([{ id: 'out', type: 'reverb' }]));
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /unknown block type "reverb"/);
  assert.equal(errors[0].node, 'out');
});

test('validate: an unknown id reference is rejected, in an input and in an expr', () => {
  assert.match(errorsOf(recipe([{ id: 'out', type: 'lowpass', in: 'nope' }]))[0].message, /"nope" is not a node id/);
  const errors = errorsOf(recipe([{ id: 'n', type: 'noise' }, { id: 'out', type: 'lowpass', in: 'n', cutoff: 'ghost.hz * 2' }]));
  assert.match(errors[0].message, /"ghost" is not a node id/);
  assert.match(errorsOf(recipe([{ id: 'out', type: 'osc', freq: 'speed' }]))[0].message, /reads "speed"/);
  assert.match(errorsOf(recipe([{ id: 'n', type: 'noise' }, { id: 'out', type: 'osc', freq: 'n.cutoff' }]))[0].message, /a noise node has gain/);
});

test('validate: a missing out is rejected; a node named out is the default', () => {
  assert.match(errorsOf(recipe([{ id: 'tone', type: 'osc' }]))[0].message, /missing/);
  assert.equal(errorsOf(recipe([{ id: 'tone', type: 'osc' }], { out: 'tone' })).length, 0);
  assert.match(errorsOf(recipe([{ id: 'tone', type: 'osc' }], { out: 'tonee' }))[0].message, /"tonee" is not a node id/);
});

test('validate: a cycle is rejected, through an input or an expr', () => {
  const viaInput = errorsOf(recipe([{ id: 'a', type: 'lowpass', in: 'out' }, { id: 'out', type: 'lowpass', in: 'a' }]));
  assert.equal(viaInput.length, 1);
  assert.match(viaInput[0].message, /cycle: (a -> out -> a|out -> a -> out)/);
  const viaExpr = errorsOf(recipe([{ id: 'out', type: 'osc', freq: 'out.freq + 1' }]));
  assert.match(viaExpr[0].message, /cycle: out -> out/);
});

test('validate: shapes, typos and option checks', () => {
  assert.match(errorsOf(null)[0].message, /JSON object/);
  assert.match(errorsOf(recipe([{ id: 'out', type: 'osc', cuttoff: 3 }]))[0].message, /unknown key for a osc node/);
  assert.match(errorsOf(recipe([{ id: 'out', type: 'osc', wave: 'square' }]))[0].message, /must be one of sine, saw/);
  assert.match(errorsOf(recipe([{ id: 'p', type: 'pulse', hold: { g: [1, 0] } }, { id: 'out', type: 'osc' }]))[0].message, /low <= high/);
  assert.match(errorsOf(recipe([{ id: 'n', type: 'noise' }, { id: 'out', type: 'lowpass', in: 'n', env: { trigger: 'n', decay: 1 } }]))[0].message, /must be a trigger node \(pulse, randomTrigger\)/);
  assert.match(errorsOf(recipe([{ id: 'n', type: 'noise' }, { id: 'out', type: 'mix', in: ['n'], gains: [1, 2] }]))[0].message, /one gain per input/);
  assert.match(errorsOf({ ...recipe([{ id: 'out', type: 'osc' }]), seed: 1.5 })[0].path, /seed/);
  assert.match(errorsOf(recipe([{ id: 'out', type: 'osc' }], { inputs: { x: { min: 1, max: 0, default: 0 } } }))[0].message, /min <= default <= max/);
  assert.match(errorsOf(recipe([{ id: 'out', type: 'osc' }], { params: { a: 'b', b: 1 } }))[0].message, /an input or an earlier param/);
});

test('compile: an invalid recipe throws with the errors attached', () => {
  assert.throws(() => compileRecipe(recipe([{ id: 'out', type: 'reverb' }]), { sampleRate: 48000 }),
    (e) => e.errors.length === 1 && /unknown block type/.test(e.message));
  assert.throws(() => compileRecipe(diesel, {}), /sampleRate/);
});

test('validate: more than 1000 nodes is rejected before any walk', () => {
  const chain = (n) => recipe(Array.from({ length: n }, (_, i) => (i === 0 ? { id: 'out', type: 'shape', in: 'n1' } : i === n - 1 ? { id: `n${i}`, type: 'noise' } : { id: `n${i}`, type: 'shape', in: `n${i + 1}` })));
  assert.deepEqual(errorsOf(chain(1000)), []);
  assert.match(errorsOf(chain(1001)).map((e) => e.message).join(), /1001 nodes; at most 1000/);
});

test('names like __proto__ and toString are plain names, not prototype lookups', () => {
  const r = JSON.parse(`{ "name": "p", "version": 0, "seed": 1,
    "inputs": { "__proto__": { "min": 0, "max": 1, "default": 0.5 }, "toString": { "min": 0, "max": 1, "default": 1 } },
    "nodes": [ { "id": "out", "type": "osc", "freq": 1000, "gain": "__proto__ * toString" } ] }`);
  assert.deepEqual(validateRecipe(r), { ok: true, errors: [] });
  const instance = compileRecipe(r, { sampleRate: 48000 });
  instance.setInput('__proto__', 0.25);
  const b = instance.render(new Float32Array(4800));
  assert.ok(Math.abs(Math.max(...b) - 0.25) < 0.01, `peak ${Math.max(...b)}, expected 0.25`);
  assert.throws(() => instance.setInput('valueOf', 1), /unknown input/);
});

test('validate: the bundled hull_water, city_bed, horn and ferry are valid', () => {
  for (const name of ['hull_water', 'city_bed', 'horn', 'ferry']) {
    const r = JSON.parse(readFileSync(new URL(`./recipes/${name}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(validateRecipe(r), { ok: true, errors: [] }, name);
  }
});

test('validate: lfo and randomWalk options, fields, and no gain or env', () => {
  const reading = (node, gain) => recipe([node, { id: 'out', type: 'osc', gain }]);
  assert.deepEqual(errorsOf(reading({ id: 'l', type: 'lfo', rate: 0.13, harmonic: 3 }, 'l.value * l.harmonic')), []);
  assert.match(errorsOf(reading({ id: 'l', type: 'lfo', harmonic: 1.5 }, 1))[0].message, /whole number from 1/);
  assert.match(errorsOf(reading({ id: 'l', type: 'lfo', harmonic: 0 }, 1))[0].message, /whole number from 1/);
  assert.match(errorsOf(reading({ id: 'l', type: 'lfo' }, 'l.harmonic'))[0].message, /a lfo node has rate, value$/);
  assert.match(errorsOf(reading({ id: 'l', type: 'lfo', gain: 0.5 }, 1))[0].message, /unknown key for a lfo node/);
  assert.deepEqual(errorsOf(reading({ id: 'w', type: 'randomWalk', range: [0.2, 1], every: [1.5, 4], slew: 1.25 }, 'w.value')), []);
  assert.match(errorsOf(reading({ id: 'w', type: 'randomWalk', range: [1, 0.2] }, 1))[0].message, /low <= high/);
  assert.match(errorsOf(reading({ id: 'w', type: 'randomWalk', every: [-1, 4] }, 1))[0].message, /0 <= low <= high/);
  assert.match(errorsOf(reading({ id: 'w', type: 'randomWalk', every: 2 }, 1))[0].message, /\[low, high\] seconds/);
  assert.match(errorsOf(reading({ id: 'w', type: 'randomWalk', env: { trigger: 'w', decay: 1 } }, 1))[0].message, /unknown key for a randomWalk node/);
});

test('validate: randomTrigger options, and any trigger node drives an env or a sync', () => {
  const firing = (node, extra = {}) => recipe([{ id: 'r', type: 'randomTrigger', ...node }, { id: 'out', type: 'osc', ...extra }]);
  assert.deepEqual(errorsOf(firing({ every: [5, 18], first: [4, 4], repeat: [1, 2], spacing: 'r.length + 0.12', hold: { pitch: [380, 470], length: [0.18, 0.35] } },
    { freq: 'r.pitch', sync: 'r', env: { trigger: 'r', attack: 0.01, length: 'r.length - 0.02', decay: 0.01 } })), []);
  assert.match(errorsOf(firing({ every: [-1, 2] }))[0].message, /0 <= low <= high/);
  assert.match(errorsOf(firing({ first: [2, 1] }))[0].message, /0 <= low <= high/);
  assert.match(errorsOf(firing({ every: 3 }))[0].message, /\[low, high\] seconds/);
  assert.match(errorsOf(firing({ repeat: [0, 2] }))[0].message, /two whole numbers with 1 <= low <= high/);
  assert.match(errorsOf(firing({ repeat: [1, 2.5] }))[0].message, /two whole numbers/);
  assert.match(errorsOf(firing({ hold: { spacing: [0, 1] } }))[0].message, /clashes with a parameter name/);
  assert.match(errorsOf(firing({ hold: { g: [1, 0] } }))[0].message, /low <= high/);
  assert.match(errorsOf(firing({ gain: 0.5 }))[0].message, /unknown key for a randomTrigger node/);
  assert.match(errorsOf(firing({}, { freq: 'r.pitch' }))[0].message, /a randomTrigger node has spacing$/);
});

test('validate: env takes optional attack and length; other keys are rejected', () => {
  const env = (e) => recipe([{ id: 'p', type: 'pulse', hold: { len: [0.1, 0.2] } }, { id: 'out', type: 'osc', env: e }]);
  assert.deepEqual(errorsOf(env({ trigger: 'p', decay: 0.1, attack: 0.01, length: 'p.len' })), []);
  assert.deepEqual(errorsOf(env({ trigger: 'p', decay: 0.1, length: 0.3 })), []);
  assert.match(errorsOf(env({ trigger: 'p', decay: 0.1, release: 0.2 }))[0].message, /optional attack and length/);
  assert.match(errorsOf(env({ trigger: 'p', attack: 0.1 }))[0].message, /decay: <seconds>/);
  assert.match(errorsOf(env({ trigger: 'p', decay: 0.1, attack: 'p.nope' }))[0].message, /a pulse node has hz, jitter, len$/);
});

test('validate: a node may read its own published fields, never its own parameters', () => {
  assert.deepEqual(errorsOf(recipe([{ id: 'p', type: 'pulse', hz: '10 * p.g', hold: { g: [1, 2] } }, { id: 'out', type: 'osc' }])), []);
  assert.match(errorsOf(recipe([{ id: 'r', type: 'randomTrigger', spacing: 'r.spacing' }, { id: 'out', type: 'osc' }]))[0].message, /cycle: r -> r/);
  assert.match(errorsOf(recipe([{ id: 'l', type: 'lfo', rate: 'l.rate + 1' }, { id: 'out', type: 'osc' }]))[0].message, /cycle: l -> l/);
});
