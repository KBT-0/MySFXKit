import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileRecipe, renderOffline } from './index.js';
import { rms, peak, hasNaN, pulseRate } from './test_features.js';

const RATE = 48000;
const diesel = JSON.parse(readFileSync(new URL('./recipes/diesel.json', import.meta.url), 'utf8'));
const clean = (b) => { assert.equal(hasNaN(b), false, 'NaN in the buffer'); assert.ok(peak(b) <= 1, `peak ${peak(b)} > 1`); return b; };
const tone = (node, extra = {}) => ({
  name: 't', version: 0, seed: 3, ...extra,
  nodes: [{ id: 'src', type: 'osc', freq: 1000 }, node, { id: 'noise', type: 'noise' }],
});

test('determinism: the same seed gives a bit-identical buffer, another seed does not', () => {
  const a = clean(renderOffline(diesel, { sampleRate: RATE, seconds: 1, inputs: { throttle: 0.5 } }));
  const b = renderOffline(diesel, { sampleRate: RATE, seconds: 1, inputs: { throttle: 0.5 } });
  assert.deepEqual(a, b);
  const c = renderOffline({ ...diesel, seed: 8 }, { sampleRate: RATE, seconds: 1, inputs: { throttle: 0.5 } });
  assert.notDeepEqual(a, c);
});

test('render: chunk size and reset do not change the result', () => {
  const whole = renderOffline(diesel, { sampleRate: RATE, seconds: 0.5, inputs: { throttle: 1 } });
  const instance = compileRecipe(diesel, { sampleRate: RATE });
  instance.setInput('throttle', 1);
  const pieces = new Float32Array(whole.length);
  for (let i = 0; i < pieces.length; i += 100) pieces.set(instance.render(new Float32Array(Math.min(100, pieces.length - i))), i);
  assert.deepEqual(pieces, whole);
  instance.reset();
  assert.deepEqual(instance.render(new Float32Array(whole.length)), whole);
});

test('diesel: about 4.5 firings a second at idle, 13 at full ahead or astern (Leeway idleFiringHz, fullFiringHz)', () => {
  for (const [throttle, hz] of [[0, 4.5], [0.5, 8.75], [1, 13], [-1, 13]]) {
    const b = clean(renderOffline(diesel, { sampleRate: RATE, seconds: 2, inputs: { throttle } }));
    const measured = pulseRate(b, RATE);
    assert.ok(Math.abs(measured - hz) <= 0.15 * hz, `throttle ${throttle}: ${measured.toFixed(2)} Hz, expected ${hz} +-15 %`);
  }
});

test('diesel: louder under load, and a half-throttle render is audible and clean', () => {
  const idle = clean(renderOffline(diesel, { sampleRate: RATE, seconds: 2, inputs: { throttle: 0 } }));
  const half = clean(renderOffline(diesel, { sampleRate: RATE, seconds: 2, inputs: { throttle: 0.5 } }));
  const full = clean(renderOffline(diesel, { sampleRate: RATE, seconds: 2, inputs: { throttle: 1 } }));
  assert.ok(rms(half) > 0.01, 'half throttle is silent');
  assert.ok(rms(idle) < rms(half) && rms(half) < rms(full), 'loudness does not grow with load');
});

test('slew: a { slew, rate } param starts at its target, then glides to a new one', () => {
  const recipe = {
    name: 'glide', version: 0, seed: 1,
    inputs: { x: { min: 0, max: 1, default: 0 } },
    params: { level: { slew: 0.1, rate: 'x' } },
    nodes: [{ id: 'out', type: 'osc', freq: 1000, gain: 'level' }],
  };
  const instance = compileRecipe(recipe, { sampleRate: RATE });
  assert.equal(rms(instance.render(new Float32Array(RATE / 10))), 0, 'starts at x = 0');
  instance.setInput('x', 1);
  const after = clean(instance.render(new Float32Array(RATE)));
  assert.ok(rms(after, 0, RATE / 100) < 0.3 * Math.SQRT1_2, 'jumped instead of gliding');
  assert.ok(Math.abs(rms(after, RATE * 0.9) - Math.SQRT1_2) < 0.01, 'did not converge to the target');
  const started = renderOffline(recipe, { sampleRate: RATE, seconds: 0.1, inputs: { x: 1 } });
  assert.ok(Math.abs(rms(started) - Math.SQRT1_2) < 0.01, 'a glide starts at its target');
  assert.throws(() => instance.setInput('y', 1), /unknown input "y"/);
});

test('blocks: lowpass, bandpass, shape and saw keep their character', () => {
  const ratio = (node, freq) => {
    const r = tone(node, { out: node.id });
    Object.assign(r.nodes[0], { freq, gain: 0.5 });  // headroom: a resonant filter may overshoot
    const b = clean(renderOffline(r, { sampleRate: RATE, seconds: 0.5 }));
    return rms(b, RATE / 10) / (0.5 * Math.SQRT1_2);
  };
  assert.ok(ratio({ id: 'lp', type: 'lowpass', in: 'src', cutoff: 100 }, 5000) < 0.05, 'lowpass passes 5 kHz at 100 Hz cutoff');
  assert.ok(ratio({ id: 'lp', type: 'lowpass', in: 'src', cutoff: 5000 }, 100) > 0.95, 'lowpass cuts 100 Hz at 5 kHz cutoff');
  assert.ok(ratio({ id: 'bp', type: 'bandpass', in: 'src', freq: 1000, damping: 1 }, 1000) > 0.8, 'bandpass cuts its own centre');
  assert.ok(ratio({ id: 'bp', type: 'bandpass', in: 'src', freq: 1000, damping: 1 }, 50) < 0.1, 'bandpass passes 50 Hz');
  assert.ok(ratio({ id: 'sh', type: 'shape', in: 'src', drive: 20 }, 1000) > 1.3, 'shape does not square a hard-driven sine');
  const saw = clean(renderOffline({ name: 's', version: 0, seed: 1, nodes: [{ id: 'out', type: 'osc', wave: 'saw', freq: 100 }] }, { sampleRate: RATE, seconds: 0.5 }));
  assert.ok(Math.abs(rms(saw) - 1 / Math.sqrt(3)) < 0.01, 'saw RMS is not 1/sqrt(3)');
  const noise = clean(renderOffline(tone({ id: 'x', type: 'shape', in: 'noise' }, { out: 'noise' }), { sampleRate: RATE, seconds: 0.5 }));
  assert.ok(Math.abs(rms(noise) - 1 / Math.sqrt(3)) < 0.01, 'noise is not uniform in [-1, 1)');
});

test('hostile values: no NaN or Infinity reaches the output, and the state recovers', () => {
  const recipe = {
    name: 'hostile', version: 0, seed: 1,
    inputs: { x: { min: 0, max: 1, default: 0 } },
    nodes: [
      { id: 'n', type: 'noise', gain: 'pow(10, 39) / x' },
      { id: 'lp', type: 'lowpass', in: 'n', cutoff: '1 / x' },
      { id: 'm1', type: 'mix', in: ['lp', 'n'], gains: [1e308, '-1 / 0'] },
      ...[2, 3, 4, 5, 6, 7].map((k) => ({ id: `m${k}`, type: 'mix', in: [`m${k - 1}`], gains: [1e6] })),  // 1e6^7 overflows a float
      { id: 'out', type: 'lowpass', in: 'm7', cutoff: 100 },
    ],
  };
  const instance = compileRecipe(recipe, { sampleRate: RATE });
  for (const x of [0, 1, 0]) {
    instance.setInput('x', x);
    const b = instance.render(new Float32Array(RATE / 10));
    assert.equal(hasNaN(b) || b.some((v) => !Number.isFinite(v)), false, `x = ${x}`);
  }
  const unstable = { name: 'bp', version: 0, seed: 1, nodes: [{ id: 'n', type: 'noise' }, { id: 'out', type: 'bandpass', in: 'n', freq: 20000, damping: 2 }] };
  const b = renderOffline(unstable, { sampleRate: RATE, seconds: 1 });
  assert.ok(!hasNaN(b) && peak(b) < 20, `bandpass blew up: peak ${peak(b)}`);
  assert.ok(rms(b, RATE / 2) < 1.5 * rms(b, 0, RATE / 2), 'bandpass output grows over time');
});

test('an expr result is clamped to +-1e6 before it reaches a sample', () => {
  const b = renderOffline({ name: 'g', version: 0, seed: 1, nodes: [{ id: 'out', type: 'osc', freq: 1000, gain: '1e300' }] }, { sampleRate: RATE, seconds: 0.1 });
  assert.equal(peak(b), 1e6);
});

test('setInput clamps to [min, max]', () => {
  const at = (throttle) => renderOffline(diesel, { sampleRate: RATE, seconds: 0.3, inputs: { throttle } });
  assert.deepEqual(at(5), at(1));
  assert.deepEqual(at(-5), at(-1));
  assert.notDeepEqual(at(0.5), at(1));
});

test('pulse: jitter spreads the periods, hold draws each pulse a value in [lo, hi]', () => {
  const triggers = (jitter) => {
    const b = renderOffline({ name: 'p', version: 0, seed: 5, nodes: [{ id: 'out', type: 'pulse', hz: 100, jitter }] }, { sampleRate: RATE, seconds: 1 });
    const at = [...b.keys()].filter((i) => b[i] === 1);
    return at.slice(1).map((t, k) => t - at[k]);
  };
  const steady = triggers(0), loose = triggers(0.1);
  assert.ok(Math.max(...steady) - Math.min(...steady) <= 1, 'periods vary without jitter');
  assert.ok(Math.max(...loose) - Math.min(...loose) > 40, 'jitter 0.1 does not spread 480-sample periods');
  assert.ok(Math.max(...loose) <= 480 * 1.1 + 1 && Math.min(...loose) >= 480 * 0.9 - 1, 'a period is outside (1 +- jitter) / hz');

  const held = clean(renderOffline({
    name: 'h', version: 0, seed: 5,
    nodes: [{ id: 'p', type: 'pulse', hz: 10, hold: { g: [0.2, 0.4] } }, { id: 'out', type: 'osc', freq: 1000, gain: 'p.g' }],
  }, { sampleRate: RATE, seconds: 2 }));
  const levels = [];  // the level in the middle of each 100 ms pulse period
  for (let s = 1; s < 19; s++) levels.push(rms(held, s * 4800 + 1200, s * 4800 + 3600) / Math.SQRT1_2);
  assert.ok(levels.every((l) => l >= 0.2 - 1e-3 && l <= 0.4 + 1e-3), `a held value outside [0.2, 0.4]: ${levels}`);
  assert.ok(Math.max(...levels) - Math.min(...levels) > 0.1, 'hold does not draw a new value per pulse');
});
