import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, validateRecipe, renderOffline } from '../core/index.js';
import { buildPrompt, EXAMPLE_RECIPE, MAX_REQUEST } from './prompt.js';

const prompt = buildPrompt('a door creak');

test('every block type of core is described in the prompt', () => {
  for (const type of Object.keys(BLOCKS)) assert.ok(prompt.includes(`\`${type}\``), `block type "${type}" is missing from the prompt`);
});

test('each block line of the prompt names every key its block takes', () => {
  for (const [type, def] of Object.entries(BLOCKS)) {
    const line = prompt.split('\n').find((l) => l.startsWith(`- \`${type}\``));
    const keys = [...Object.keys(def.params), ...(def.options ?? []), ...(def.sync ? ['sync'] : []), ...(def.in ? ['in'] : [])];
    for (const key of keys) assert.match(line, new RegExp(`\\b${key}\\b`), `the "${type}" line does not name "${key}"`);
  }
});

test('the embedded example recipe validates', () => {
  const { ok, errors } = validateRecipe(EXAMPLE_RECIPE);
  assert.ok(ok, JSON.stringify(errors));
});

/** RMS of 2 s of the example; asserts every sample is finite. */
function exampleRms(inputs, events) {
  const out = renderOffline(EXAMPLE_RECIPE, { seconds: 2, inputs, events });
  let sum = 0;
  for (const v of out) {
    assert.ok(Number.isFinite(v));
    sum += v * v;
  }
  return Math.sqrt(sum / out.length);
}

test('the embedded example renders finite, audible output; its input and its event both raise the level', () => {
  const calm = exampleRms({ storm: 0.3 }, []);
  const storm = exampleRms({ storm: 1 }, []);
  const gust = exampleRms({ storm: 0.3 }, [{ at: 0.5, name: 'gust', strength: 1 }]);
  assert.ok(calm > 0.01 && calm < 1, `rms ${calm}`);
  assert.ok(storm > calm, `storm 1: rms ${storm}, storm 0.3: rms ${calm}`);
  assert.ok(gust > calm, `with the gust: rms ${gust}, without: rms ${calm}`);
});

test('the example in the prompt is EXAMPLE_RECIPE', () => {
  const start = prompt.indexOf('```json\n{') + '```json\n'.length;
  assert.deepEqual(JSON.parse(prompt.slice(start, prompt.indexOf('\n```', start))), EXAMPLE_RECIPE);
});

test('the trimmed request ends the prompt verbatim', () => {
  const request = 'Yağmur, şiddeti oyun tarafından değişsin { "x": 1 }';
  assert.ok(buildPrompt(`  ${request}\n`).endsWith(`\n${request}`));
});

test('an empty or blank request is rejected', () => {
  assert.throws(() => buildPrompt(''), /Describe the sound/);
  assert.throws(() => buildPrompt(' \n\t'), /Describe the sound/);
});

test('a request over the cap is rejected; one at the cap is accepted', () => {
  assert.ok(buildPrompt('a'.repeat(MAX_REQUEST)).endsWith('a'.repeat(MAX_REQUEST)));
  assert.throws(() => buildPrompt('a'.repeat(MAX_REQUEST + 1)), new RegExp(`at most ${MAX_REQUEST}`));
});
