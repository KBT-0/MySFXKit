import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRecipe } from '../core/index.js';
import { EXAMPLES } from './examples.js';

test('there is at least one example', () => {
  assert.ok(EXAMPLES.length > 0);
});

for (const { label, path } of EXAMPLES) {
  test(`example "${label}" exists and validates`, async () => {
    const recipe = JSON.parse(await readFile(new URL(path, new URL('./examples.js', import.meta.url)), 'utf8'));
    const { ok, errors } = validateRecipe(recipe);
    assert.ok(ok, `${path}: ${JSON.stringify(errors)}`);
  });
}
