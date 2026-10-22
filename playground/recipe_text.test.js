import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecipeText, parseRecipeText, MAX_RECIPE_TEXT } from './recipe_text.js';

const recipe = '{ "name": "x", "version": 0, "nodes": [{ "id": "out", "type": "noise" }] }';

test('a bare JSON object is returned whole', () => {
  assert.deepEqual(extractRecipeText(recipe), { text: recipe });
});

test('JSON inside ```json fences is found', () => {
  assert.deepEqual(extractRecipeText('```json\n' + recipe + '\n```\n'), { text: recipe });
});

test('JSON between prose before and after is found', () => {
  const reply = 'Here is your engine sound:\n\n' + recipe + '\n\nMove the throttle slider to hear it.';
  assert.deepEqual(extractRecipeText(reply), { text: recipe });
});

test('braces and escaped quotes inside string literals do not count', () => {
  const tricky = '{ "description": "a } and a { and a \\"quoted } brace\\"", "name": "y" }';
  assert.deepEqual(extractRecipeText('prose ' + tricky + ' } trailing'), { text: tricky });
  assert.equal(parseRecipeText(tricky).recipe.name, 'y');
});

test('an unbalanced input is an error', () => {
  assert.match(extractRecipeText('{ "name": { "x": 1 }').error, /not closed/);
  assert.match(extractRecipeText('{ "name": "unterminated }').error, /not closed/);
});

test('input over the size cap is an error, at the cap it is scanned', () => {
  const padded = recipe + ' '.repeat(MAX_RECIPE_TEXT - recipe.length);
  assert.deepEqual(extractRecipeText(padded), { text: recipe });
  assert.match(extractRecipeText(padded + ' ').error, /at most/);
});

test('with two objects the first wins', () => {
  assert.deepEqual(extractRecipeText('{ "a": 1 }\n{ "b": 2 }'), { text: '{ "a": 1 }' });
});

test('empty or brace-free input is an error', () => {
  assert.match(extractRecipeText('').error, /paste a recipe/);
  assert.match(extractRecipeText('  \n ').error, /paste a recipe/);
  assert.match(extractRecipeText('no recipe here').error, /no \{ \.\.\. \} block/);
});

test('parseRecipeText returns the parsed object or the JSON error message', () => {
  assert.equal(parseRecipeText('```json\n' + recipe + '\n```').recipe.name, 'x');
  assert.match(parseRecipeText('{ name: 1 }').error, /^not valid JSON: /);
  assert.match(parseRecipeText('').error, /paste a recipe/);
});
