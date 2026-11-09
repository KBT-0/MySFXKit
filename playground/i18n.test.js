import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STRINGS, EXAMPLE_LABELS_TR, DEFAULT_LANGUAGE, isLanguage, translate, exampleLabel, fromEnglish } from './i18n.js';
import { EXAMPLES } from './examples.js';
import { eventPressBlocked } from './events.js';
import { parseRecipeText, MAX_RECIPE_TEXT } from './recipe_text.js';
import { buildPrompt, MAX_REQUEST } from './prompt.js';

const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();
const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('English is the default and both languages exist', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.ok(isLanguage('en') && isLanguage('tr'));
  assert.ok(!isLanguage(null) && !isLanguage('de') && !isLanguage('toString'));
});

test('every key exists in both languages, with the same placeholders', () => {
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
  for (const [key, english] of Object.entries(STRINGS.en)) {
    assert.deepEqual(params(STRINGS.tr[key]), params(english), key);
    assert.ok(STRINGS.tr[key].trim(), `${key} is empty in Turkish`);
  }
});

test('a lookup fills its parameters and leaves an unknown one as it is', () => {
  assert.equal(translate('en', 'status.loaded', { name: 'diesel' }), 'Loaded "diesel".');
  assert.equal(translate('tr', 'status.loaded', { name: 'diesel' }), '"diesel" yüklendi.');
  assert.equal(translate('en', 'event.strength', { id: 'impact' }), 'impact strength');
  assert.equal(translate('en', 'status.loaded'), 'Loaded "{name}".');
  assert.equal(translate('en', 'status.loaded', { name: '$& {name} $1' }), 'Loaded "$& {name} $1".');
});

test('an unknown key or language throws', () => {
  assert.throws(() => translate('en', 'no.such.key'), /no en string/);
  assert.throws(() => translate('de', 'status.loaded'), /no de string/);
});

test('every example has a Turkish name, and English keeps the label', () => {
  for (const { label } of EXAMPLES) {
    assert.ok(EXAMPLE_LABELS_TR[label], label);
    assert.equal(exampleLabel('en', label), label);
    assert.equal(exampleLabel('tr', label), EXAMPLE_LABELS_TR[label]);
  }
  assert.deepEqual(Object.keys(EXAMPLE_LABELS_TR).sort(), EXAMPLES.map(({ label }) => label).sort());
});

test('index.html shows the English text of every tagged node, character for character', async () => {
  const html = await read('index.html');
  const tagged = [...html.matchAll(/<(\w+)([^>]*)\sdata-i18n="([^"]+)"([^>]*)>([^<]*)<\/\1>/g)];
  assert.ok(tagged.length >= 15, `only ${tagged.length} tagged nodes found`);
  for (const [, , , key, , text] of tagged) assert.equal(text, STRINGS.en[key], key);
  const attributes = [...html.matchAll(/\sdata-i18n-([\w-]+)="([^"]+)"/g)];
  assert.ok(attributes.length >= 4);
  for (const [, attribute, key] of attributes) {
    const tag = html.slice(html.lastIndexOf('<', html.indexOf(`data-i18n-${attribute}="${key}"`)));
    const value = new RegExp(`\\s${attribute}="([^"]*)"`).exec(tag.slice(0, tag.indexOf('>')))?.[1];
    assert.equal(value, STRINGS.en[key], `${attribute} of ${key}`);
  }
});

test('every key main.js shows exists', async () => {
  const main = await read('main.js');
  const keys = [...main.matchAll(/(?:say|showStatus)\('([\w.]+)'/g), ...main.matchAll(/'((?:status|transport)\.\w+)'/g)]
    .map(([, key]) => key);
  assert.ok(keys.length >= 10);
  for (const key of keys) assert.ok(Object.hasOwn(STRINGS.en, key), key);
});

test('the English messages of other modules are recognised and translate', () => {
  const cases = [
    [eventPressBlocked(false, 'running'), 'events.pressPlayFirst', {}],
    [eventPressBlocked(true, 'suspended'), 'events.stopped', {}],
    [parseRecipeText('').error, 'text.empty', {}],
    [parseRecipeText('no braces').error, 'text.noBlock', {}],
    [parseRecipeText('{ "a": 1').error, 'text.notClosed', {}],
    [parseRecipeText('x'.repeat(MAX_RECIPE_TEXT + 1)).error, 'text.tooLong', { length: String(MAX_RECIPE_TEXT + 1), max: String(MAX_RECIPE_TEXT) }],
  ];
  for (const [text, key, expected] of cases) {
    const found = fromEnglish(text);
    assert.equal(found?.key, key, text);
    assert.deepEqual(found.params, expected, text);
    assert.equal(translate('en', found.key, found.params), text);
  }
  const notJson = parseRecipeText('{ nope }').error;
  const found = fromEnglish(notJson);
  assert.equal(found.key, 'text.notJson');
  assert.match(translate('tr', found.key, found.params), /^geçerli JSON değil: ./);
  assert.deepEqual(fromEnglish('../core/recipes/x.json: HTTP 404'), { key: 'fetch.failed', params: { path: '../core/recipes/x.json', status: '404' } });
  for (const [request, key] of [['  ', 'request.empty'], ['x'.repeat(MAX_REQUEST + 1), 'request.tooLong']]) {
    assert.throws(() => buildPrompt(request), (error) => fromEnglish(error.message)?.key === key);
  }
});

test('a message that is not a known one stays untranslated', () => {
  assert.equal(fromEnglish('Loaded'), null);
  assert.equal(fromEnglish(`not valid JSON: ${'x'.repeat(2000)}`), null);  // too long to match
  assert.equal(fromEnglish('Loaded "diesel".'), null);  // only other modules' messages are matched
});
