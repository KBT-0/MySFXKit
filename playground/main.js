// The playground page: paste a recipe, load it, play it, move its inputs and its place around the listener.
// Pasted text is data: it is parsed with JSON.parse, validated by core and interpreted by the
// web adapter; it reaches the DOM only through textContent and element properties.
import { validateRecipe, renderOffline } from '../core/index.js';
import { createRecipePlayer } from '../adapters/web/index.js';
import { parseRecipeText } from './recipe_text.js';
import { EXAMPLES } from './examples.js';
import { listEvents } from './events.js';
import { buildPrompt } from './prompt.js';
import { encodeWav, wavFileName, wavSeconds, WAV_EVENT_AT, WAV_SAMPLE_RATE, WAV_SECONDS } from './wav.js';
import { clampToScene, pointerToScene, placement, pannerPosition } from './scene.js';

const examples = document.getElementById('examples');
const textarea = document.getElementById('recipe');
const loadButton = document.getElementById('load');
const playButton = document.getElementById('play');
const wavButton = document.getElementById('download-wav');
const wavSecondsField = document.getElementById('wav-seconds');
const status = document.getElementById('status');
const errorList = document.getElementById('errors');
const inputsBox = document.getElementById('inputs');
const eventsBox = document.getElementById('events');
const requestBox = document.getElementById('request');
const copyButton = document.getElementById('copy-prompt');
const promptBox = document.getElementById('prompt-box');
const promptText = document.getElementById('prompt');
const scene = document.getElementById('scene');
const sourceDot = document.getElementById('source');
const referenceRing = document.getElementById('reference-ring');
const sceneReadout = document.getElementById('scene-readout');
const referenceSlider = document.getElementById('reference');
const referenceValue = document.getElementById('reference-value');
const rolloffSlider = document.getElementById('rolloff');
const rolloffValue = document.getElementById('rolloff-value');

let recipe = null;   // the last recipe that passed validation
let acceptedText = null;  // the textarea text `recipe` came from
let sliders = [];    // [{ name, value, row }] for `recipe`; `value` is what the player was sent
let eventStrengths = [];  // [{ id, strength }] for `recipe`: each event's strength slider value
let context = null;
let player = null;
let panner = null;    // player.node -> panner -> destination, from the first Play
let source = { x: 0, y: 0 };  // the sound source in scene metres; the listener is at the origin

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
  eventStrengths = [];
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
    const entry = { id, strength: hi };  // the exact top; the slider's own value is rounded to its step
    eventStrengths.push(entry);
    slider.addEventListener('input', () => {
      shown.textContent = slider.value;
      entry.strength = Number(slider.value);
    });
    button.addEventListener('click', () => {
      if (player) player.trigger(id, entry.strength);
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

/** The Load action: accepts the text and, while a player exists, swaps the sound. Returns whether it was accepted. */
async function loadText() {
  const accepted = acceptText();
  if (accepted && player) await sendRecipe();
  return accepted;
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
    panner = new PannerNode(context, pannerOptions());
    player.node.connect(panner).connect(context.destination);
    await sendRecipe();
  } catch (error) {
    await context.close();
    context = player = panner = null;
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

/**
 * The Download WAV action: renders the recipe offline, dry and mono (no scene pan or distance),
 * for the duration field's seconds, with the sliders' inputs and each game event fired once at
 * `WAV_EVENT_AT` with its strength slider value, and downloads it as a 16-bit WAV file.
 */
async function downloadWav() {
  if (textarea.value !== acceptedText && !(await loadText())) return;  // edited text goes through Load first
  const seconds = wavSeconds(wavSecondsField.value);
  wavSecondsField.value = String(seconds);
  showStatus(`Rendering ${seconds} s of "${recipe.name}"...`);
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));  // paint the status before the blocking render
  const samples = renderOffline(recipe, {
    sampleRate: WAV_SAMPLE_RATE,
    seconds,
    inputs: Object.fromEntries(sliders.map(({ name, value }) => [name, value])),
    events: eventStrengths.map(({ id, strength }) => ({ at: WAV_EVENT_AT, name: id, strength })),
  });
  const url = URL.createObjectURL(new Blob([encodeWav(samples, WAV_SAMPLE_RATE)], { type: 'audio/wav' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = wavFileName(recipe.name);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);  // later, not at once: some browsers read the URL after click() returns
  showStatus(`Downloaded ${link.download} (${seconds} s, mono, 16-bit, ${WAV_SAMPLE_RATE} Hz).`);
}

/** Panner settings for the scene: Leeway's placement, exponential rolloff and an equal-power pan. */
function pannerOptions() {
  const { x, y, z } = pannerPosition(source);
  return {
    panningModel: 'equalpower', distanceModel: 'exponential', maxDistance: 10000,
    refDistance: Number(referenceSlider.value), rolloffFactor: Number(rolloffSlider.value),
    positionX: x, positionY: y, positionZ: z,
  };
}

/** Draws the scene and its read-out and, once a player exists, moves the panner to match. */
function updateScene() {
  const reference = Number(referenceSlider.value);
  const rolloff = Number(rolloffSlider.value);
  sourceDot.setAttribute('cx', String(source.x));
  sourceDot.setAttribute('cy', String(-source.y));  // SVG y grows downwards; scene y is forward (up)
  referenceRing.setAttribute('r', String(reference));
  referenceValue.textContent = referenceSlider.value;
  rolloffValue.textContent = rolloffSlider.value;
  const { distance, gain, pan } = placement(source, reference, rolloff);
  sceneReadout.textContent = `Distance ${distance.toFixed(1)} m · gain ${gain.toFixed(2)} (${(20 * Math.log10(gain)).toFixed(1)} dB) · pan ${pan.toFixed(2)}`;
  if (!panner) return;
  panner.refDistance = reference;
  panner.rolloffFactor = rolloff;
  const { x, y, z } = pannerPosition(source);
  const now = context.currentTime;  // a short glide, so a drag does not step the level audibly
  panner.positionX.setTargetAtTime(x, now, 0.02);
  panner.positionY.setTargetAtTime(y, now, 0.02);
  panner.positionZ.setTargetAtTime(z, now, 0.02);
}

function moveSource(point) {
  source = clampToScene(point);
  updateScene();
}

/** Runs one action at a time with the controls disabled; an exception shows on the status line. */
function guarded(action) {
  return async () => {
    loadButton.disabled = playButton.disabled = wavButton.disabled = examples.disabled = textarea.readOnly = true;
    try {
      await action();
    } catch (error) {
      showErrors(error.errors ?? []);
      showStatus(String(error.message ?? error));
    } finally {
      loadButton.disabled = playButton.disabled = wavButton.disabled = examples.disabled = textarea.readOnly = false;
    }
  };
}

/**
 * The Copy prompt action: the prompt for the description goes to the clipboard. Where the
 * clipboard API is missing (a page not served over HTTPS or localhost) or refuses, the prompt
 * shows in a read-only box to copy by hand.
 */
async function copyPrompt() {
  promptBox.hidden = true;  // a prompt from an earlier fallback is stale now
  let text;
  try {
    text = buildPrompt(requestBox.value);
  } catch (error) {
    showStatus(error.message);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);  // the first await: the click must still count as a gesture
    showStatus('Prompt copied. Paste it into your AI, then paste its reply into the recipe box below.');
  } catch {
    promptText.value = text;
    promptBox.hidden = false;
    promptText.select();
    showStatus('The browser did not allow copying: copy the prompt above by hand, then paste your AI\'s reply into the recipe box.');
  }
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
wavButton.addEventListener('click', guarded(downloadWav));
wavSecondsField.min = String(WAV_SECONDS.min);
wavSecondsField.max = String(WAV_SECONDS.max);
wavSecondsField.value = String(WAV_SECONDS.default);
copyButton.addEventListener('click', copyPrompt);

// The scene: a press anywhere puts the source there and a drag moves it (mouse, touch, pen).
scene.addEventListener('pointerdown', (event) => {
  event.preventDefault();  // no text selection or scrolling while dragging
  scene.setPointerCapture(event.pointerId);
  sourceDot.focus({ preventScroll: true });
  moveSource(pointerToScene(event.clientX, event.clientY, scene.getBoundingClientRect()));
});
scene.addEventListener('pointermove', (event) => {
  if (scene.hasPointerCapture(event.pointerId)) {
    moveSource(pointerToScene(event.clientX, event.clientY, scene.getBoundingClientRect()));
  }
});
const KEY_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
sourceDot.addEventListener('keydown', (event) => {
  if (!Object.hasOwn(KEY_STEPS, event.key)) return;
  event.preventDefault();
  const [dx, dy] = KEY_STEPS[event.key];
  const metres = event.shiftKey ? 10 : 1;
  moveSource({ x: source.x + dx * metres, y: source.y + dy * metres });
});
referenceSlider.addEventListener('input', updateScene);
rolloffSlider.addEventListener('input', updateScene);
updateScene();
