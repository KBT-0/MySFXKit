// The `sequence` block (runs of notes, weighted variants) and the gull recipe that uses it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRecipe, renderOffline } from './index.js';
import { rms, peak, hasNaN, onsets, spectralPeak } from './test_features.js';

const RATE = 48000;
const TICK = 2 / RATE;  // a countdown in seconds lands on a sample: allow two samples either way
const gull = JSON.parse(readFileSync(new URL('./recipes/gull.json', import.meta.url), 'utf8'));
const clean = (b) => { assert.equal(hasNaN(b), false, 'NaN in the buffer'); assert.ok(peak(b) <= 1, `peak ${peak(b)} > 1`); return b; };
const errorsOf = (r) => validateRecipe(r).errors;

/** A recipe: `calls` (a randomTrigger) starts the sequence `seq`; `extra` nodes may read it. */
const sequenced = (seq, calls = {}, extra = [], out = 'seq') => ({
  name: 's', version: 0, seed: 5, out,
  nodes: [{ id: 'calls', type: 'randomTrigger', first: [0.1, 0.1], every: [2, 2], ...calls }, { id: 'seq', type: 'sequence', sync: 'calls', ...seq }, ...extra],
});
/** Sample times (seconds) of the firings in a trigger train. */
const firingTimes = (b) => [...b.keys()].filter((i) => b[i] === 1).map((i) => i / RATE);
/** Splits sorted times into runs: a new run after a pause longer than `pause` seconds. */
const runs = (times, pause) => {
  const out = [];
  times.forEach((t, k) => (k && t - times[k - 1] <= pause ? out.at(-1) : out[out.push([]) - 1]).push(t));
  return out;
};
const one = (variant) => ({ variants: [variant] });

test('validate: sequence options, its fields, and no gain or env', () => {
  const ok = { count: [3, 5], first: [0.3, 0.3], rest: [0.1, 0.2], gap: [0.05, 0.05] };
  assert.deepEqual(errorsOf(sequenced(one(ok), {}, [{ id: 'tone', type: 'osc', freq: '1000 * pow(0.9, seq.index) * (1 + seq.phase + seq.choice)',
    env: { trigger: 'seq', decay: 0.1, length: 'seq.length - 0.02', stop: 'seq.length' } }], 'tone')), []);
  assert.deepEqual(errorsOf(sequenced({ variants: [{ weight: 0.35, count: [4, 6], first: [0.11, 0.11] }, { weight: 0, count: [64, 64], first: [0, 0] }] })), []);
  const bad = (seq) => errorsOf(sequenced(seq))[0];
  assert.match(bad({ ...one(ok), sync: undefined }).message, /is required: the trigger node/);
  assert.match(errorsOf({ ...sequenced(one(ok)), nodes: [{ id: 'seq', type: 'sequence', sync: 'tone', ...one(ok) }, { id: 'tone', type: 'osc' }] })[0].message, /must be a trigger node/);
  assert.match(bad({}).message, /must be an array of 1 to 16 variants/);
  assert.match(bad({ variants: [] }).message, /must be an array of 1 to 16 variants/);
  assert.match(bad({ variants: Array(17).fill(ok) }).message, /must be an array of 1 to 16 variants/);
  assert.match(bad({ variants: [3] }).message, /must be an object/);
  for (const count of [[0, 3], [2, 1], [1.5, 2], [1, 65], [1e300, 1e300], [3], undefined]) {
    const error = bad(one({ ...ok, count }));
    assert.equal(error.path, 'nodes[1].variants[0].count', `count ${count}`);
    assert.match(error.message, /1 <= low <= high <= 64/);
  }
  assert.match(bad(one({ ...ok, first: undefined })).message, /is required/);
  for (const key of ['first', 'rest', 'gap']) {
    for (const value of [[-0.1, 0.2], [0.2, 0.1], 0.2, [0, Infinity]]) {
      const error = bad(one({ ...ok, [key]: value }));
      assert.equal(error.path, `nodes[1].variants[0].${key}`);
      assert.match(error.message, /0 <= low <= high/);
    }
  }
  assert.match(bad(one({ ...ok, weight: -1 })).message, /a number >= 0/);
  assert.match(bad(one({ ...ok, weight: null })).message, /a number >= 0/);
  assert.match(bad(one({ ...ok, weight: 0 })).message, /total weight above 0/);
  assert.match(bad({ variants: [{ ...ok, weight: 1e308 }, { ...ok, weight: 1e308 }] }).message, /total weight above 0/);
  assert.match(bad(one({ ...ok, pitch: 2 })).message, /unknown key \(known: weight, count, first, rest, gap\)/);
  assert.match(bad({ ...one(ok), gain: 0.5 }).message, /unknown key for a sequence node/);
  assert.match(bad({ ...one(ok), env: { trigger: 'calls', decay: 1 } }).message, /unknown key for a sequence node/);
  assert.match(errorsOf(sequenced(one(ok), {}, [{ id: 'tone', type: 'osc', freq: 'seq.time' }], 'tone'))[0].message, /a sequence node has choice, index, length, phase$/);
  assert.match(errorsOf({ ...sequenced(one(ok)), nodes: [{ id: 'seq', type: 'sequence', sync: 'seq', ...one(ok) }] })[0].message, /cycle: seq -> seq/);
});

test('sequence: each run has a note count in [lo, hi], both ends drawn; the first note `first` long, the rest `rest`, `gap` apart', () => {
  const at = firingTimes(clean(renderOffline(sequenced(one({ count: [3, 5], first: [0.3, 0.3], rest: [0.1, 0.1], gap: [0.05, 0.05] })), { sampleRate: RATE, seconds: 100 })));
  const each = runs(at, 0.5), counts = each.map((r) => r.length);
  assert.ok(each.length === 50, `${each.length} runs in 100 s, expected 50`);
  assert.ok(counts.every((n) => n >= 3 && n <= 5) && counts.includes(3) && counts.includes(5), `notes per run: ${counts}`);
  each.forEach((r, k) => assert.ok(Math.abs(r[0] - (0.1 + 2 * k)) <= TICK, `run ${k} starts at ${r[0]} s, not with its firing`));
  for (const r of each) {
    assert.ok(Math.abs(r[1] - r[0] - 0.35) <= TICK, `the first note and its gap last ${r[1] - r[0]} s, not 0.35`);
    assert.ok(r.slice(2).every((t, k) => Math.abs(t - r[k + 1] - 0.15) <= TICK), `a later note and its gap do not last 0.15 s: ${r}`);
  }
  // rest drawn per note from a range
  const drawn = runs(firingTimes(renderOffline(sequenced(one({ count: [6, 6], first: [0.3, 0.3], rest: [0.1, 0.2] })), { sampleRate: RATE, seconds: 40 })), 0.5);
  const lengths = drawn.flatMap((r) => r.slice(2).map((t, k) => t - r[k + 1]));
  assert.ok(lengths.every((l) => l >= 0.1 - TICK && l <= 0.2 + TICK), 'a later note outside rest [0.1, 0.2] s');
  assert.ok(Math.max(...lengths) - Math.min(...lengths) > 0.07, 'rest is not drawn per note');
});

test('sequence: a firing during a run starts a new run', () => {
  const at = firingTimes(renderOffline(sequenced(one({ count: [5, 5], first: [0.2, 0.2], gap: [0.05, 0.05] }), { every: [0.3, 0.3] }), { sampleRate: RATE, seconds: 3 }));
  assert.ok(at.length >= 18, `starts: ${at}`);
  assert.ok(at.slice(1).every((t, k) => [0.05, 0.25].some((d) => Math.abs(t - at[k] - d) <= TICK)), `not 0.25 s notes cut by a firing every 0.3 s: ${at}`);
});

test('sequence: index scales a pitch per note (1000 Hz times 0.9 per note); phase runs 0 .. 1 across each note', () => {
  const seq = one({ count: [4, 4], first: [0.25, 0.25], gap: [0.05, 0.05] }), calls = { every: [1.5, 1.5] };
  const tone = [{ id: 'tone', type: 'osc', freq: '1000 * pow(0.9, seq.index)', env: { trigger: 'seq', decay: 1, stop: 'seq.length' } }];
  const b = clean(renderOffline(sequenced(seq, calls, tone, 'tone'), { sampleRate: RATE, seconds: 3 }));
  const at = firingTimes(renderOffline(sequenced(seq, calls, tone), { sampleRate: RATE, seconds: 3 }));
  assert.equal(at.length, 8);
  at.forEach((t, k) => {
    const want = 1000 * 0.9 ** (k % 4), from = Math.round((t + 0.01) * RATE);
    const got = spectralPeak(b, RATE, 600, 1100, from, from + Math.round(0.2 * RATE), 2);
    assert.ok(Math.abs(got - want) <= 0.01 * want, `note ${k}: ${got} Hz, expected ${want.toFixed(0)}`);
  });
  const phase = clean(renderOffline(sequenced(seq, calls, [{ id: 'probe', type: 'osc', wave: 'saw', freq: 0, gain: '-seq.phase' }], 'probe'), { sampleRate: RATE, seconds: 3 }));
  const read = (t) => phase[Math.round(t * RATE)];
  assert.equal(read(0.05), 1, 'before the first run, phase is 1');
  for (const [into, want] of [[0.0625, 0.25], [0.125, 0.5], [0.1875, 0.75], [0.27, 1]]) {
    assert.ok(Math.abs(read(at[1] + into) - want) <= 0.03, `phase ${read(at[1] + into)} at ${into} s into a 0.25 s note, expected ${want}`);
  }
});

test('sequence: weights pick the variant per run (1 : 3 over 400 runs); choice is its index', () => {
  const seq = { variants: [{ weight: 1, count: [2, 2], first: [0.1, 0.1] }, { weight: 3, count: [4, 4], first: [0.1, 0.1] }] }, calls = { every: [1, 1] };
  const each = runs(firingTimes(renderOffline(sequenced(seq, calls), { sampleRate: RATE, seconds: 400 })), 0.5);
  assert.equal(each.length, 400);
  assert.ok(each.every((r) => r.length === 2 || r.length === 4), 'a run with neither variant\'s count');
  const share = each.filter((r) => r.length === 2).length / each.length;
  assert.ok(Math.abs(share - 0.25) <= 0.07, `variant 0 picked in ${(100 * share).toFixed(1)} % of runs, expected 25 %`);
  const choice = renderOffline(sequenced(seq, calls, [{ id: 'probe', type: 'osc', wave: 'saw', freq: 0, gain: '-seq.choice' }], 'probe'), { sampleRate: RATE, seconds: 400 });
  each.forEach((r) => assert.equal(choice[Math.round((r[0] + 0.05) * RATE)], r.length === 2 ? 0 : 1, `run at ${r[0]} s`));
});

test('sequence: a weight-0 variant is never picked, first, between or last, and not when the total weight is subnormal', () => {
  const never = { weight: 0, count: [5, 5], first: [0.1, 0.1] }, two = { count: [2, 2], first: [0.1, 0.1] }, three = { count: [3, 3], first: [0.1, 0.1] };
  for (const variants of [[never, two], [two, never, three], [two, never], [{ ...two, weight: 5e-324 }, never]]) {
    const each = runs(firingTimes(renderOffline(sequenced({ variants }, { every: [1, 1] }), { sampleRate: RATE, seconds: 100 })), 0.5);
    assert.equal(each.length, 100);
    assert.ok(each.every((r) => r.length !== 5), `the weight-0 variant played: ${JSON.stringify(variants.map((v) => v.weight))}`);
  }
});

/** The gull's note starts, grouped into calls (calls are at least 3 s apart, notes within one at most 0.51 s). Switching `out` changes no draw. */
const gullCalls = (recipe, seconds) => runs(firingTimes(renderOffline({ ...recipe, out: 'notes' }, { sampleRate: RATE, seconds })), 0.6);

test('gull: valid; 10 s at 48 kHz is clean and bit-identical twice; a call of 3 .. 7 notes in the first 2 s (Leeway GullCall)', () => {
  assert.deepEqual(validateRecipe(gull), { ok: true, errors: [] });
  const a = clean(renderOffline(gull, { sampleRate: RATE, seconds: 10 }));
  assert.deepEqual(renderOffline(gull, { sampleRate: RATE, seconds: 10 }), a);
  const [first] = gullCalls(gull, 10);
  assert.ok(first[0] >= 0.5 - TICK && first[0] <= 1.5 + TICK, `the first call at ${first[0]} s`);
  const from = Math.round((first[0] - 0.05) * RATE), heard = onsets(a.subarray(from, from + Math.round(2.75 * RATE)), RATE, 0.1);  // from just before the call: an onset is a rise
  assert.ok(rms(a, from, from + RATE) > 0.03, 'the first call is not heard');
  assert.ok(heard.length >= 3 && heard.length <= 7, `${heard.length} notes heard in the first call`);
});

test('gull: over 300 s every call is 3 .. 7 notes heard as envelope onsets, and its pitch falls note by note (Leeway 0.965 per note)', () => {
  const b = clean(renderOffline(gull, { sampleRate: RATE, seconds: 300 }));
  const calls = gullCalls(gull, 300).filter((own) => own[0] < 297);
  assert.ok(calls.length >= 15, `${calls.length} calls in 300 s, expected about 24 (0.08 a second)`);
  const falls = [];
  for (const own of calls) {
    const start = own[0], from = Math.round((start - 0.05) * RATE), heard = onsets(b.subarray(from, from + Math.round(2.75 * RATE)), RATE, 0.1);
    assert.ok(heard.length >= 3 && heard.length <= 7, `${heard.length} notes heard in the call at ${start} s`);
    assert.equal(heard.length, own.length, `the call at ${start} s: ${heard.length} onsets heard, ${own.length} notes started`);
    // The fundamental's peak over the first 0.1 s of the second note and of the last one.
    const pitch = (t) => spectralPeak(b, RATE, 450, 1250, Math.round(t * RATE), Math.round((t + 0.1) * RATE), 2);
    falls.push([pitch(own.at(-1)) / pitch(own[1]), 0.965 ** (own.length - 2)]);  // measured, and Leeway's
  }
  const shown = falls.map(([got, want]) => `${got.toFixed(3)} (${want.toFixed(3)})`).join(', ');
  assert.ok(falls.every(([got]) => got < 0.97), `the last note is not lower than the second, per call: ${shown}`);
  const mean = falls.reduce((sum, [got, want]) => sum + got / want, 0) / falls.length;
  assert.ok(Math.abs(mean - 1) <= 0.03, `last-note / second-note pitch, measured (0.965 ^ (notes - 2)): ${shown}`);
});

test('gull: about 35 % of calls are laughs (short notes), the rest long calls (Leeway GullCall.start)', () => {
  const often = { ...gull, nodes: gull.nodes.map((n) => (n.id === 'calls' ? { ...n, every: [3, 3] } : n)) };  // calls every 3 s: more calls per rendered second
  const each = gullCalls(often, 600).filter((r) => r[0] < 597);  // the last call may be cut by the render's end
  assert.ok(each.length === 199, `${each.length} whole calls in 600 s, expected 199`);
  const laughs = each.filter((r) => r[1] - r[0] < 0.2);  // a laugh's first note and gap: 0.17 s; a long call's: 0.51 s
  assert.ok(laughs.every((r) => r.length >= 4 && r.length <= 6), 'a laugh outside 4 .. 6 notes');
  assert.ok(each.filter((r) => r[1] - r[0] >= 0.2).every((r) => r.length >= 3 && r.length <= 7 && Math.abs(r[1] - r[0] - 0.51) <= TICK), 'a long call outside 3 .. 7 notes or without its 0.42 s opening note');
  const share = laughs.length / each.length;
  assert.ok(Math.abs(share - 0.35) <= 0.08, `${(100 * share).toFixed(1)} % laughs, expected 35 %`);
});
