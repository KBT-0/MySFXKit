// MySFXKit core: the public API. Engine-free; adapters and the playground build on it.
import { compileRecipe } from './compile.js';

export { validateRecipe } from './validate.js';
export { compileRecipe, BLOCK } from './compile.js';
export { BLOCKS } from './blocks.js';

/** Renders `seconds` of a recipe with fixed `inputs` into a new Float32Array. */
export function renderOffline(recipe, { sampleRate = 48000, seconds, inputs = {} } = {}) {
  if (!(Number.isFinite(seconds) && seconds >= 0)) throw new Error('renderOffline needs { seconds } >= 0');
  const instance = compileRecipe(recipe, { sampleRate });
  for (const [name, value] of Object.entries(inputs)) instance.setInput(name, value);
  return instance.render(new Float32Array(Math.round(seconds * sampleRate)));
}
