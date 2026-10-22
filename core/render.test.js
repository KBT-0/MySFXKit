import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileRecipe, renderOffline } from './index.js';
import { rms, peak, hasNaN, pulseRate, brightness, crossingRate, onsets, spectralPeak } from './test_features.js';

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

// A saw at 0 Hz is a constant -1, so `gain: '-x.value'` renders a control field as samples, one value per block.
const fieldProbe = (node, field) => ({ name: 'probe', version: 0, seed: 9, nodes: [node, { id: 'out', type: 'osc', wave: 'saw', freq: 0, gain: `-${node.id}.${field}` }] });
const BLOCK_SECONDS = 128 / RATE;

test('lfo: value is a unit sine at its rate, harmonic at n times the rate', () => {
  const node = { id: 'l', type: 'lfo', rate: 2, harmonic: 3 };
  const value = clean(renderOffline(fieldProbe(node, 'value'), { sampleRate: RATE, seconds: 10 }));
  const harmonic = clean(renderOffline(fieldProbe(node, 'harmonic'), { sampleRate: RATE, seconds: 10 }));
  assert.ok(Math.abs(crossingRate(value, RATE) - 2) <= 0.15, `value at ${crossingRate(value, RATE)} Hz, expected 2`);
  assert.ok(Math.abs(crossingRate(harmonic, RATE) - 6) <= 0.15, `harmonic at ${crossingRate(harmonic, RATE)} Hz, expected 6`);
  assert.ok(peak(value) > 0.99 && Math.abs(rms(value) - Math.SQRT1_2) < 0.01, 'value is not a unit sine');
  const slow = clean(renderOffline(fieldProbe({ id: 'l', type: 'lfo', rate: 0.13 }, 'value'), { sampleRate: RATE, seconds: 10 }));
  assert.ok(Math.abs(crossingRate(slow, RATE) - 0.1) <= 0.05, 'a 0.13 Hz lfo does not cross zero once in 10 s');
});

test('randomWalk: stays in range, picks a new target every [a, b] seconds, glides with slew', () => {
  const steps = clean(renderOffline(fieldProbe({ id: 'w', type: 'randomWalk', range: [0.2, 0.6], every: [0.5, 1], slew: 0 }, 'value'), { sampleRate: RATE, seconds: 10 }));
  assert.ok(steps.every((v) => v >= 0.2 - 1e-6 && v <= 0.6 + 1e-6), 'a value outside [0.2, 0.6]');
  const changes = [];
  for (let i = 1; i < steps.length; i++) if (steps[i] !== steps[i - 1]) changes.push(i / RATE);
  const gaps = changes.slice(1).map((t, k) => t - changes[k]);
  assert.ok(changes.length >= 9, `only ${changes.length} target changes in 10 s`);
  assert.ok(gaps.every((g) => g >= 0.5 - 1e-9 && g <= 1 + BLOCK_SECONDS + 1e-9), `a gap outside [0.5, 1] s: ${gaps}`);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 0.2, 'the intervals do not vary');
  const glide = clean(renderOffline(fieldProbe({ id: 'w', type: 'randomWalk', range: [0.2, 0.6], every: [0.5, 1], slew: 0.5 }, 'value'), { sampleRate: RATE, seconds: 10 }));
  let jump = 0;
  for (let i = 1; i < glide.length; i++) jump = Math.max(jump, Math.abs(glide[i] - glide[i - 1]));
  assert.ok(jump <= 0.4 * (1 - Math.exp(-BLOCK_SECONDS / 0.5)) + 1e-6, `slew 0.5 s still jumps ${jump} in one block`);
  assert.ok(glide.reduce((m, v) => Math.max(m, v)) - glide.reduce((m, v) => Math.min(m, v)) > 0.1, 'a gliding walk does not move');
});

const hullWater = JSON.parse(readFileSync(new URL('./recipes/hull_water.json', import.meta.url), 'utf8'));
const cityBed = JSON.parse(readFileSync(new URL('./recipes/city_bed.json', import.meta.url), 'utf8'));

const horn = JSON.parse(readFileSync(new URL('./recipes/horn.json', import.meta.url), 'utf8'));
const ferry = JSON.parse(readFileSync(new URL('./recipes/ferry.json', import.meta.url), 'utf8'));

for (const [name, recipe, inputs] of [['hull_water', hullWater, { speed: 0.5 }], ['city_bed', cityBed, {}], ['horn', horn, {}], ['ferry', ferry, {}]]) test(`${name}: 10 s at 48 kHz is clean and bit-identical twice`, () => {
  const a = clean(renderOffline(recipe, { sampleRate: RATE, seconds: 10, inputs }));
  assert.deepEqual(renderOffline(recipe, { sampleRate: RATE, seconds: 10, inputs }), a);
  assert.ok(rms(a) > 0.01, `${name} is silent`);
});

test('hull_water: louder and brighter with speed; at rest the lapping swells and fades (Leeway HullWater)', () => {
  const at = (speed) => clean(renderOffline(hullWater, { sampleRate: RATE, seconds: 10, inputs: { speed } }));
  const [rest, half, full] = [at(0), at(0.5), at(1)];
  assert.ok(rms(rest) > 0.002, 'the lapping at rest is silent');
  assert.ok(rms(rest) < rms(half) && rms(half) < rms(full), 'loudness does not grow with speed');
  assert.ok(brightness(rest) < brightness(half) && brightness(half) < brightness(full), 'brightness does not grow with speed');
  const seconds = Array.from({ length: 10 }, (_, s) => rms(rest, s * RATE, (s + 1) * RATE));
  assert.ok(Math.max(...seconds) > 1.5 * Math.min(...seconds), `no swell at rest: ${seconds}`);
});

test('city_bed: a steady low bed, band-limited well below white noise (Leeway CityNoise bed)', () => {
  const b = clean(renderOffline(cityBed, { sampleRate: RATE, seconds: 10 }));
  const seconds = Array.from({ length: 10 }, (_, s) => rms(b, s * RATE, (s + 1) * RATE));
  assert.ok(Math.max(...seconds) < 2 * Math.min(...seconds), `not steady: ${seconds}`);
  assert.ok(brightness(b) < 0.5, `brightness ${brightness(b)}; white noise is about 1.41`);
});

test('randomWalk range and pulse hold at the edge of a double still give a finite value (clamped to +-1e6 when read)', () => {
  for (const range of [[1e308, 1e308], [-1.7e308, 1.7e308]]) for (let seed = 1; seed <= 20; seed++) {
    const b = renderOffline({ ...fieldProbe({ id: 'w', type: 'randomWalk', range, every: [0.1, 0.2], slew: 0.05 }, 'value'), seed }, { sampleRate: RATE, seconds: 1 });
    assert.ok(b.every((v) => v !== 0 && Number.isFinite(v)), `range ${range}, seed ${seed}: a NaN field reads as 0`);
  }
  const held = renderOffline(fieldProbe({ id: 'p', type: 'pulse', hz: 100, hold: { g: [-1.7e308, 1.7e308] } }, 'g'), { sampleRate: RATE, seconds: 1 });
  const tail = held.slice(RATE / 10);  // high - low overflowed to +Infinity, so every draw read +1e6
  assert.ok(tail.some((v) => v < 0) && tail.some((v) => v > 0), 'pulse hold over [-1.7e308, 1.7e308] draws only one sign');
});

// The firing times (seconds) of a randomTrigger rendered as the output.
const firings = (node, seconds, seed = 5) => {
  const b = renderOffline({ name: 'r', version: 0, seed, nodes: [{ ...node, id: 'out', type: 'randomTrigger' }] }, { sampleRate: RATE, seconds });
  return [...b.keys()].filter((i) => b[i] === 1).map((i) => i / RATE);
};
const TICK = 2 / RATE;  // a countdown in seconds lands on a sample: allow two samples either way
const spread = (xs) => xs.reduce((m, x) => Math.max(m, x), -Infinity) - xs.reduce((m, x) => Math.min(m, x), Infinity);

test('randomTrigger: the first event inside `first`, the next ones `every` [a, b] s apart', () => {
  const at = firings({ every: [0.5, 1], first: [0.2, 0.3] }, 20);
  assert.ok(at[0] >= 0.2 - TICK && at[0] <= 0.3 + TICK, `first event at ${at[0]} s`);
  const gaps = at.slice(1).map((t, k) => t - at[k]);
  assert.ok(gaps.length >= 19, `only ${at.length} events in 20 s`);
  assert.ok(gaps.every((g) => g >= 0.5 - TICK && g <= 1 + TICK), `an interval outside [0.5, 1] s: ${gaps}`);
  assert.ok(spread(gaps) > 0.2, 'the intervals do not vary');
  const late = firings({ every: [0.5, 1] }, 2);
  assert.ok(late[0] >= 0.5 - TICK && late[0] <= 1 + TICK, `without first, the first event at ${late[0]} s`);
});

test('randomTrigger: repeat [lo, hi] firings per event, spacing apart; spacing may read the held values', () => {
  const at = firings({ every: [0.5, 1], repeat: [1, 3], spacing: 0.1 }, 30);
  const events = [[at[0]]];
  for (let k = 1; k < at.length; k++) (at[k] - at[k - 1] < 0.3 ? events.at(-1) : events[events.push([]) - 1]).push(at[k]);
  const counts = events.map((e) => e.length);
  assert.ok([1, 2, 3].every((n) => counts.includes(n)) && counts.every((n) => n >= 1 && n <= 3), `firings per event: ${counts}`);
  for (const e of events) assert.ok(e.slice(1).every((t, k) => Math.abs(t - e[k] - 0.1) <= TICK), `repeats not 0.1 s apart: ${e}`);
  const waits = events.slice(1).map((e, k) => e[0] - events[k].at(-1));
  assert.ok(waits.every((w) => w >= 0.5 - TICK && w <= 1 + TICK), `a wait after an event's last firing outside [0.5, 1] s: ${waits}`);

  const held = firings({ every: [0.5, 1], repeat: [2, 2], spacing: 'out.len + 0.05', hold: { len: [0.1, 0.3] } }, 30);
  const pairs = held.filter((_, k) => k % 2 === 1).map((t, k) => t - held[2 * k]);
  assert.ok(pairs.length >= 20 && pairs.every((g) => g >= 0.15 - TICK && g <= 0.35 + TICK), `spacing len + 0.05 outside [0.15, 0.35] s: ${pairs}`);
  assert.ok(spread(pairs) > 0.1, 'the spacing does not follow the held value');
});

test('randomTrigger: each event draws every hold value in [lo, hi]', () => {
  const values = clean(renderOffline(fieldProbe({ id: 'r', type: 'randomTrigger', every: [0.2, 0.4], first: [0, 0], hold: { g: [0.2, 0.6] } }, 'g'), { sampleRate: RATE, seconds: 10 }));
  assert.ok(values.every((v) => v >= 0.2 - 1e-6 && v <= 0.6 + 1e-6), 'a held value outside [0.2, 0.6]');
  assert.ok(new Set(values).size >= 20 && spread(values) > 0.3, 'hold does not draw a new value per event');
});

test('env: rises over attack, holds until length, then decays; a randomTrigger drives it; without attack and length it is exp(-t / decay)', () => {
  const level = (env) => clean(renderOffline({
    name: 'e', version: 0, seed: 1,
    nodes: [{ id: 'r', type: 'randomTrigger', first: [0.5, 0.5], every: [100, 100] },
      { id: 'out', type: 'osc', wave: 'saw', freq: 0, gain: -1, env: { trigger: 'r', ...env } }],  // a 0 Hz saw is -1: out is the level
  }, { sampleRate: RATE, seconds: 1.5 }));
  const b = level({ attack: 0.1, length: 0.3, decay: 0.05 });
  const t0 = b.findIndex((v) => v > 0), at = (s) => b[t0 + Math.round(s * RATE) - 1];  // the level s seconds after the trigger
  assert.ok(Math.abs(t0 / RATE - 0.5) <= TICK, `silent until the trigger, then starts at ${t0 / RATE} s`);
  assert.ok(Math.abs(at(0.05) - 0.5) < 1e-3, `half-way up the attack: ${at(0.05)}`);
  for (let s = 0.001; s < 0.1; s += 0.001) assert.ok(at(s + 0.001) > at(s), `the attack does not rise at ${s} s`);
  assert.ok(b.slice(t0 + 0.1 * RATE, t0 + 0.3 * RATE).every((v) => Math.abs(v - 1) < 1e-6), 'not held at 1 from attack to length');
  assert.ok(Math.abs(at(0.35) - Math.exp(-1)) < 1e-3, `one decay time after length: ${at(0.35)}`);
  assert.ok(at(0.8) < 1e-4, 'not decayed');
  const plain = level({ decay: 0.05 }), p0 = plain.findIndex((v) => v > 0);
  assert.ok(Math.abs(plain[p0 + 0.05 * RATE - 1] - Math.exp(-1)) < 1e-3 && plain[p0] > 0.99, 'without attack and length the env is not exp(-t / decay)');
});

test('horn: the first event at 4 s; 1 or 2 beeps at 380 .. 470 Hz, 0.18 .. 0.35 s long, length + 0.12 s apart (Leeway CityNoise horns)', () => {
  const b = clean(renderOffline(horn, { sampleRate: RATE, seconds: 90 }));
  const starts = onsets(b, RATE);
  assert.ok(Math.abs(starts[0] - 4) < 0.05, `first beep at ${starts[0]} s`);
  const gaps = starts.slice(1).map((t, k) => t - starts[k]);
  assert.ok(gaps.every((g) => (g >= 0.29 && g <= 0.48) || (g >= 5 && g <= 18.1)), `a gap that is neither a second beep nor a wait of 5 .. 18 s: ${gaps}`);
  assert.ok(gaps.some((g) => g < 1) && gaps.some((g, k) => g > 1 && (k === 0 || gaps[k - 1] > 1)), 'no two-beep and no one-beep event');
  const pitches = starts.map((t) => spectralPeak(b, RATE, 300, 560, Math.round((t + 0.02) * RATE), Math.round((t + 0.15) * RATE)));
  assert.ok(pitches.every((f) => f >= 378 && f <= 472), `a beep pitch outside 380 .. 470 Hz: ${pitches}`);
  assert.ok(spread(pitches) > 20, `every event at the same pitch: ${pitches}`);
  for (const t of starts) {  // an onset is the start of a 20 ms window: the beep starts inside it
    const loud = 0.1 * rms(b, Math.round((t + 0.02) * RATE), Math.round((t + 0.15) * RATE));
    let from = Math.round((t - 0.01) * RATE);
    while (rms(b, from, from + 48) < loud) from += 48;  // 1 ms steps
    let end = from;
    while (rms(b, end, end + 48) >= loud) end += 48;
    assert.ok((end - from) / RATE >= 0.17 && (end - from) / RATE <= 0.37, `a beep ${(end - from) / RATE} s long`);
  }
});

test('ferry: an event at 1 s, a 115 .. 145 Hz saw for 1.8 .. 2.6 s (Leeway CityNoise ferry)', () => {
  const lengths = [];
  for (let seed = 1; seed <= 6; seed++) {
    const b = clean(renderOffline({ ...ferry, seed }, { sampleRate: RATE, seconds: 5 }));
    const start = onsets(b, RATE)[0];
    assert.ok(Math.abs(start - 1) < 0.15, `seed ${seed}: the event starts at ${start} s`);
    const pitch = crossingRate(b.subarray(Math.round(1.3 * RATE), Math.round(2.6 * RATE)), RATE);
    assert.ok(pitch >= 113 && pitch <= 147, `seed ${seed}: pitch ${pitch} Hz`);
    const loud = 0.1 * rms(b, 1.3 * RATE, 2.6 * RATE) * Math.SQRT2, windows = [];
    for (let i = 0; i + 480 <= b.length; i += 480) windows.push(rms(b, i, i + 480) > loud ? 1 : 0);  // 10 ms windows
    lengths.push(windows.reduce((a, w) => a + w) / 100);
  }
  assert.ok(lengths.every((s) => s >= 1.75 && s <= 2.75), `an event length outside 1.8 .. 2.6 s: ${lengths}`);
  assert.ok(spread(lengths) > 0.2, `every event the same length: ${lengths}`);
});
