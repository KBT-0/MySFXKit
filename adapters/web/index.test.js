// The main-thread player, driven through a shim: Node has no AudioContext or AudioWorkletNode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRecipePlayer } from './index.js';

globalThis.AudioWorkletNode = class {
  constructor(context, name, options) {
    Object.assign(this, { context, name, options });
    this.port = { sent: [], onmessage: null, postMessage(message) { this.sent.push(message); } };
  }
};
const fakeContext = () => {
  const modules = [];
  return { sampleRate: 44100, modules, audioWorklet: { addModule: async (url) => { modules.push(String(url)); } } };
};
const diesel = JSON.parse(readFileSync(new URL('../../core/recipes/diesel.json', import.meta.url), 'utf8'));

test('createRecipePlayer adds processor.js and builds a mono node at the context rate', async () => {
  const context = fakeContext();
  const player = await createRecipePlayer(context);
  assert.deepEqual(context.modules, [new URL('./processor.js', import.meta.url).href]);
  assert.equal(player.node.name, 'mysfxkit-recipe');
  assert.deepEqual(player.node.options.outputChannelCount, [1]);
  assert.equal(player.node.options.processorOptions.sampleRate, 44100);
});

test('load posts a valid recipe; setInput and reset post their messages', async () => {
  const player = await createRecipePlayer(fakeContext());
  await player.load(diesel);
  player.setInput('throttle', 0.5);
  player.reset();
  assert.deepEqual(player.node.port.sent, [
    { type: 'recipe', recipe: diesel },
    { type: 'input', name: 'throttle', value: 0.5 },
    { type: 'reset' },
  ]);
});

test('load rejects an invalid recipe with its errors and posts nothing', async () => {
  const player = await createRecipePlayer(fakeContext());
  await assert.rejects(player.load({ name: 'broken' }), (error) => error.errors.length > 0);
  assert.deepEqual(player.node.port.sent, []);
});

test('onError receives the errors the audio thread posts', async () => {
  const player = await createRecipePlayer(fakeContext());
  const seen = [];
  player.onError((errors) => seen.push(errors));
  const errors = [{ node: null, path: '', message: 'boom' }];
  player.node.port.onmessage({ data: { type: 'error', errors } });
  player.node.port.onmessage({ data: { type: 'other' } });
  assert.deepEqual(seen, [errors]);
});
