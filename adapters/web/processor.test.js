// The worklet's message protocol, driven through a shim: Node has no AudioWorklet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The shim: the two worklet globals processor.js needs, defined before it is imported.
let Processor;
globalThis.AudioWorkletProcessor = class {
  constructor() { this.port = { sent: [], onmessage: null, postMessage(message) { this.sent.push(message); } }; }
};
globalThis.registerProcessor = (name, processorClass) => { assert.equal(name, 'mysfxkit-recipe'); Processor = processorClass; };
await import('./processor.js');  // after the shim; a static import would run first

const RATE = 48000;
const diesel = JSON.parse(readFileSync(new URL('../../core/recipes/diesel.json', import.meta.url), 'utf8'));
const loud = { name: 'loud', version: 0, seed: 1, inputs: {}, params: {},
  nodes: [{ id: 'out', type: 'osc', freq: 220, gain: 5 }] };

const make = () => new Processor({ processorOptions: { sampleRate: RATE } });
const send = (processor, message) => processor.port.onmessage({ data: message });
/** Runs `seconds` of process() calls on a stereo output prefilled with NaN; returns channel 0. */
function play(processor, seconds) {
  const blocks = Math.round((seconds * RATE) / 128);
  const out = new Float32Array(blocks * 128);
  for (let b = 0; b < blocks; b++) {
    const channels = [new Float32Array(128).fill(NaN), new Float32Array(128).fill(NaN)];
    assert.equal(processor.process([], [channels], {}), true);
    assert.deepEqual(channels[1], channels[0]);
    out.set(channels[0], b * 128);
  }
  return out;
}
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

test('no recipe: silent, keeps running', () => {
  assert.equal(peak(play(make(), 0.1)), 0);
});

test('the diesel plays: non-silent, finite, within [-1, 1], no error', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  const out = play(p, 1);
  assert.ok(out.every(Number.isFinite));
  assert.ok(peak(out) <= 1 && rms(out) > 0.01, `rms ${rms(out)}`);
  assert.deepEqual(p.port.sent, []);
});

test('output is clamped to [-1, 1]', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: loud });
  assert.equal(peak(play(p, 0.1)), 1);
});

test('an invalid recipe posts one error and stays silent', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: { name: 'broken' } });
  assert.equal(p.port.sent.length, 1);
  assert.equal(p.port.sent[0].type, 'error');
  assert.ok(p.port.sent[0].errors.length > 0 && p.port.sent[0].errors.every((e) => typeof e.message === 'string'));
  assert.equal(peak(play(p, 0.1)), 0);
});

test('an invalid recipe replaces a playing one with silence', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  play(p, 0.1);
  send(p, { type: 'recipe', recipe: { name: 'broken' } });
  assert.equal(peak(play(p, 0.1)), 0);
});

test('throttle changes the sound while it plays', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  const idle = play(p, 1);
  send(p, { type: 'input', name: 'throttle', value: 1 });
  play(p, 2);  // the load glides in with a 1.2 s time constant
  const full = play(p, 1);
  assert.ok(rms(full) > 2 * rms(idle), `idle ${rms(idle)}, full ${rms(full)}`);
  assert.deepEqual(p.port.sent, []);
});

test('an unknown input posts an error and keeps playing', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  send(p, { type: 'input', name: 'speed', value: 1 });
  assert.equal(p.port.sent.length, 1);
  assert.match(p.port.sent[0].errors[0].message, /unknown input "speed"/);
  assert.ok(rms(play(p, 0.5)) > 0.01);
});

test('reset restarts the recipe', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  const first = play(p, 0.2);
  send(p, { type: 'reset' });
  assert.deepEqual(play(p, 0.2), first);
});

test('an exception in render is reported once, then silence', () => {
  const p = make();
  send(p, { type: 'recipe', recipe: diesel });
  p.instance.render = () => { throw new Error('boom'); };
  assert.equal(peak(play(p, 0.1)), 0);
  assert.equal(p.port.sent.length, 1);
  assert.equal(p.port.sent[0].errors[0].message, 'boom');
});
