// Feature tests of the four classic example recipes (brief section 6, step 8): ui_click, jump, explosion, wind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileRecipe, renderOffline, validateRecipe } from './index.js';
import { rms, peak, hasNaN, brightness, spectralPeak } from './test_features.js';

const RATE = 48000;
const load = (name) => JSON.parse(readFileSync(new URL(`./recipes/${name}.json`, import.meta.url), 'utf8'));
const [uiClick, jump, explosion, wind] = ['ui_click', 'jump', 'explosion', 'wind'].map(load);
const clean = (b) => { assert.equal(hasNaN(b), false, 'NaN in the buffer'); assert.ok(peak(b) <= 1, `peak ${peak(b)} > 1`); return b; };
const at = (seconds) => Math.round(seconds * RATE);
const lands = (seconds) => Math.ceil(seconds * RATE / 128) * 128;  // an event lands at the next control block
const spread = (xs) => Math.max(...xs) - Math.min(...xs);
/** Renders `seconds` of an event recipe with the event `name` fired at each time in `times`. */
const fire = (recipe, name, times, seconds, strength = 1) => clean(renderOffline(recipe, { sampleRate: RATE, seconds, events: times.map((t) => ({ at: t, name, strength })) }));

test('classics: every recipe is valid and renders the same features twice', () => {
  for (const recipe of [uiClick, jump, explosion, wind]) assert.deepEqual(validateRecipe(recipe), { ok: true, errors: [] }, recipe.name);
  const twice = (render) => { const a = render(), b = render(); assert.deepEqual([rms(a), peak(a), brightness(a)], [rms(b), peak(b), brightness(b)]); };
  twice(() => fire(uiClick, 'click', [0.2, 0.6], 1));
  twice(() => fire(jump, 'jump', [0.2, 1], 1.5));
  twice(() => fire(explosion, 'explode', [0.2], 3, 0.8));
  twice(() => clean(renderOffline(wind, { sampleRate: RATE, seconds: 3, inputs: { strength: 0.7 } })));
});

test('ui_click: silent before the click, a short bright click that is gone within 0.1 s', () => {
  const b = fire(uiClick, 'click', [0.5], 1), from = lands(0.5);
  assert.equal(peak(b.subarray(0, from)), 0, 'sound before the click');
  const body = rms(b, from, from + at(0.01));
  assert.ok(body > 0.1, `the click is not audible: ${body}`);
  assert.ok(rms(b, from + at(0.05), from + at(0.1)) < 0.02 * body, 'the click has not decayed by 50 .. 100 ms');
  assert.equal(peak(b.subarray(from + at(0.1))), 0, 'sound 0.1 s after the click');
});

test('ui_click: each click is near 2 kHz; the clicks vary a little in pitch (variation)', () => {
  const times = [0.5, 1, 1.5, 2, 2.5, 3];
  const b = fire(uiClick, 'click', times, 3.5);
  const pitches = times.map((t) => spectralPeak(b, RATE, 1500, 3000, lands(t) + at(0.002), lands(t) + at(0.03), 5));
  assert.ok(pitches.every((f) => f >= 1900 && f <= 2100), `a click pitch outside 1920 .. 2080 Hz: ${pitches}`);
  assert.ok(spread(pitches) >= 80, `every click at the same pitch: ${pitches}`);
});

test('jump: silent before the jump, a sweep that is gone within 0.6 s, its pitch rising', () => {
  const b = fire(jump, 'jump', [0.5], 1.5), from = lands(0.5);
  assert.equal(peak(b.subarray(0, from)), 0, 'sound before the jump');
  assert.ok(rms(b, from + at(0.02), from + at(0.15)) > 0.1, 'the jump is not audible');
  assert.equal(peak(b.subarray(from + at(0.6))), 0, 'sound 0.6 s after the jump');
  const early = spectralPeak(b, RATE, 150, 1500, from + at(0.005), from + at(0.045), 5);
  const late = spectralPeak(b, RATE, 150, 1500, from + at(0.15), from + at(0.19), 5);
  assert.ok(late > 1.5 * early, `the pitch does not rise: ${early} Hz early, ${late} Hz late`);
});

test('jump: jumps differ from one another (variation)', () => {
  const times = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
  const b = fire(jump, 'jump', times, 6.5);
  const starts = times.map((t) => spectralPeak(b, RATE, 150, 450, lands(t) + at(0.005), lands(t) + at(0.045), 5));
  assert.ok(starts.every((f) => f >= 200 && f <= 400), `a start pitch outside 200 .. 400 Hz: ${starts}`);
  assert.ok(spread(starts) >= 20, `every jump starts at the same pitch: ${starts}`);
});

test('explosion: silent before the event, louder and brighter with strength, silent at strength 0', () => {
  const blast = (strength) => fire(explosion, 'explode', [0.5], 5, strength), from = lands(0.5);
  const [none, weak, full] = [0, 0.3, 1].map(blast);
  assert.equal(peak(none), 0, 'strength 0 is not silent');
  assert.equal(peak(full.subarray(0, from)), 0, 'sound before the event');
  assert.ok(rms(full) > 2 * rms(weak), `strength 1 is not louder than 0.3: ${rms(full)} vs ${rms(weak)}`);
  const crack = (b) => brightness(b.subarray(from, from + at(0.05)));
  assert.ok(crack(full) > 1.5 * crack(weak), `strength 1 is not brighter than 0.3: ${crack(full)} vs ${crack(weak)}`);
});

test('explosion: a bright crack, a low thump, a long tail that fades to silence by 4 s', () => {
  const b = fire(explosion, 'explode', [0.5], 5), from = lands(0.5);
  const crack = brightness(b.subarray(from, from + at(0.03))), tail = brightness(b.subarray(from + at(1), from + at(2)));
  assert.ok(crack > 3 * tail, `the crack is not brighter than the tail: ${crack} vs ${tail}`);
  const thump = spectralPeak(b, RATE, 30, 200, from + at(0.1), from + at(0.4));
  assert.ok(thump >= 35 && thump <= 80, `no low thump: the strongest low frequency is ${thump} Hz`);
  const body = rms(b, from, from + at(0.3));
  assert.ok(rms(b, from + at(1), from + at(2)) > 0.05 * body, 'no tail a second after the event');
  assert.ok(rms(b, from + at(3.5), from + at(4)) < 0.01 * body, 'the tail has not faded by 3.5 .. 4 s');
  assert.equal(peak(b.subarray(from + at(4))), 0, 'sound 4 s after the event');
});

test('wind: strength 1 is louder and brighter than 0.2, 0 is still; it gusts; it has no events', () => {
  const blow = (strength) => clean(renderOffline(wind, { sampleRate: RATE, seconds: 10, inputs: { strength } }));
  const [still, light, storm] = [0, 0.2, 1].map(blow);
  assert.equal(peak(still), 0, 'strength 0 is not still');
  assert.ok(rms(storm) > 3 * rms(light), `strength 1 is not louder than 0.2: ${rms(storm)} vs ${rms(light)}`);
  assert.ok(brightness(storm) > 1.3 * brightness(light), `strength 1 is not brighter than 0.2: ${brightness(storm)} vs ${brightness(light)}`);
  const seconds = Array.from({ length: 10 }, (_, s) => rms(storm, s * RATE, (s + 1) * RATE));
  assert.ok(Math.max(...seconds) > 1.3 * Math.min(...seconds), `no gusts: ${seconds}`);
  assert.throws(() => compileRecipe(wind, { sampleRate: RATE }).trigger('gust', 1), /known: none/);
});

test('wind: a change of strength glides instead of jumping', () => {
  const instance = compileRecipe(wind, { sampleRate: RATE });
  instance.setInput('strength', 0);
  instance.render(new Float32Array(RATE / 2));
  instance.setInput('strength', 1);
  const b = clean(instance.render(new Float32Array(3 * RATE)));
  assert.ok(rms(b, 0, at(0.05)) < 0.3 * rms(b, at(2), at(3)), 'the level jumped to full strength at once');
});
