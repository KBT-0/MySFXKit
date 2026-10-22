// The playground page: paste a recipe, load it, play it, move its inputs.
// Pasted text is data: it is parsed with JSON.parse, validated by core and interpreted by the
// web adapter; it reaches the DOM only through textContent and element properties.
import { validateRecipe } from '../core/index.js';
import { createRecipePlayer } from '../adapters/web/index.js';
import { parseRecipeText } from './recipe_text.js';
import { EXAMPLES } from './examples.js';
import { listEvents } from './events.js';

const examples = document.getElementById('examples');
const textarea = document.getElementById('recipe');
const loadButton = document.getElementById('load');
const playButton = document.getElementById('play');
const status = document.getElementById('status');
const errorList = document.getElementById('errors');
const inputsBox = document.getElementById('inputs');
const eventsBox = document.getElementById('events');

let recipe = null;   // the last recipe that passed validation
let acceptedText = null;  // the textarea text `recipe` came from
let sliders = [];    // [{ name, value, row }] for `recipe`; `value` is what the player was sent
let context = null;
let player = null;

function showStatus(text) { status.textContent = text; }

/** Shows `[{ node, path, message }]` as a list, one line each; an empty list clears it. */
function showErrors(errors) {
  errorList.replaceChildren(...errors.map(({ node, path, message }) => {
    const item = document.createElement('li');
    item.textContent = `${node ?? '-'} · ${path} · ${message}`;
    return item;
  }));
}

/** One range input per recipe input, at its default, wired to the player. */
function buildSliders() {
  sliders = Object.entries(recipe.inputs ?? {}).map(([name, { min, max, default: value }]) => {
    const row = document.createElement('label');
    row.className = 'input';
    const caption = document.createElement('span');
    caption.textContent = name;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = '0.01';
    slider.value = String(value);
    const shown = document.createElement('output');
    shown.textContent = String(value);  // the exact default; the slider's own value is rounded to its step
    const entry = { name, value, row };
    slider.addEventListener('input', () => {
      shown.textContent = slider.value;
      entry.value = Number(slider.value);
      player?.setInput(name, entry.value);
    });
    row.append(caption, slider, shown);
    return entry;
  });
  inputsBox.replaceChildren(...sliders.map(({ row }) => row));
}

/**
 * One button and one strength slider per game event (`trigger` node) of `recipe`; the slider
 * spans the node's `range` and starts at its top, so a press is audible. A press while no sound
 * plays only says so: the player exists after the first Play.
 */
function buildEvents() {
  eventsBox.replaceChildren(...listEvents(recipe).map(({ id, range: [lo, hi] }) => {
    const row = document.createElement('div');
    row.className = 'input';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = id;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(lo);
    slider.max = String(hi);
    slider.step = '0.01';
    slider.value = String(hi);
    slider.setAttribute('aria-label', `${id} strength`);
    const shown = document.createElement('output');
    shown.textContent = String(hi);
    let strength = hi;  // the exact top; the slider's own value is rounded to its step
    slider.addEventListener('input', () => {
      shown.textContent = slider.value;
      strength = Number(slider.value);
    });
    button.addEventListener('click', () => {
      if (player) player.trigger(id, strength);
      else showStatus('Press Play first, then fire the event.');
    });
    row.append(button, slider, shown);
    return row;
  }));
}

/** Sends `recipe` to the player, then the input values (the adapter restarts inputs at defaults). */
async function sendRecipe() {
  await player.load(recipe);
  for (const { name, value } of sliders) player.setInput(name, value);
}

/**
 * Parses and validates the textarea; on success it becomes the current recipe and the sliders
 * are rebuilt. Synchronous, so the Play click can still create the AudioContext after it.
 */
function acceptText() {
  const { recipe: parsed, error } = parseRecipeText(textarea.value);
  if (error) {
    showErrors([]);
    showStatus(error);
    return false;
  }
  const { ok, errors } = validateRecipe(parsed);
  if (!ok) {
    showErrors(errors);
    showStatus(`Not loaded: the recipe has ${errors.length} error${errors.length === 1 ? '' : 's'}.`);
    return false;
  }
  recipe = parsed;
  acceptedText = textarea.value;
  buildSliders();
  buildEvents();
  showErrors([]);
  showStatus(`Loaded "${recipe.name}".`);
  return true;
}

/** The Load action: accepts the text and, while a player exists, swaps the sound. */
async function loadText() {
  if (acceptText() && player) await sendRecipe();
}

async function start() {
  context = new AudioContext();  // created inside the click: Safari starts audio only on a gesture
  const resumed = context.resume();  // called before the first await, while the click still counts
  try {
    await resumed;
    player = await createRecipePlayer(context);
    player.onError((errors) => {
      showErrors(errors);
      showStatus('The audio thread reported an error.');
    });
    player.node.connect(context.destination);
    await sendRecipe();
  } catch (error) {
    await context.close();
    context = player = null;
    throw error;
  }
}

async function togglePlay() {
  if (!context) {
    if (textarea.value !== acceptedText && !acceptText()) return;  // Play takes edited text, as Load does
    await start();  // no await before this line: the click must still count as a gesture
  } else if (context.state === 'running') await context.suspend();
  else {
    const resumed = context.resume();  // first, while the click still counts as a gesture
    if (textarea.value !== acceptedText) await loadText();
    await resumed;
  }
  playButton.textContent = context?.state === 'running' ? 'Stop' : 'Play';
}

/** Runs one action at a time with the controls disabled; an exception shows on the status line. */
function guarded(action) {
  return async () => {
    loadButton.disabled = playButton.disabled = examples.disabled = textarea.readOnly = true;
    try {
      await action();
    } catch (error) {
      showErrors(error.errors ?? []);
      showStatus(String(error.message ?? error));
    } finally {
      loadButton.disabled = playButton.disabled = examples.disabled = textarea.readOnly = false;
    }
  };
}

for (const { label } of EXAMPLES) {
  const option = document.createElement('option');
  option.value = String(examples.options.length - 1);
  option.textContent = label;
  examples.append(option);
}

examples.addEventListener('change', guarded(async () => {
  const example = EXAMPLES[Number(examples.value)];
  if (!examples.value || !example) return;
  const response = await fetch(new URL(example.path, import.meta.url));
  if (!response.ok) throw new Error(`${example.path}: HTTP ${response.status}`);
  textarea.value = await response.text();
  examples.value = '';  // so choosing the same example again fires `change`
  await loadText();
}));
loadButton.addEventListener('click', guarded(loadText));
playButton.addEventListener('click', guarded(togglePlay));
