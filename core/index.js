// MySFXKit core: the public API. Engine-free; adapters and the playground build on it.
import { compileRecipe } from './compile.js';

export { validateRecipe } from './validate.js';
export { compileRecipe, BLOCK } from './compile.js';
export { BLOCKS } from './blocks.js';

/**
 * Renders `seconds` of a recipe with fixed `inputs` into a new Float32Array. `events`:
 * `[{ at, name, strength }]`, each fired with `trigger(name, strength)` after `at` seconds.
 */
export function renderOffline(recipe, { sampleRate = 48000, seconds, inputs = {}, events = [] } = {}) {
  if (!(Number.isFinite(seconds) && seconds >= 0)) throw new Error('renderOffline needs { seconds } >= 0');
  if (!Array.isArray(events) || !events.every((e) => Number.isFinite(e?.at) && e.at >= 0)) throw new Error('renderOffline needs events: [{ at, name, strength }] with at >= 0 seconds');
  const instance = compileRecipe(recipe, { sampleRate });
  for (const [name, value] of Object.entries(inputs)) instance.setInput(name, value);
  const out = new Float32Array(Math.round(seconds * sampleRate));
  let done = 0;
  for (const { at, name, strength } of [...events].sort((a, b) => a.at - b.at)) {
    const until = Math.min(Math.round(at * sampleRate), out.length);
    instance.render(out.subarray(done, until));
    done = until;
    instance.trigger(name, strength);
  }
  instance.render(out.subarray(done));
  return out;
}
