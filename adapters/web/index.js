// MySFXKit web adapter: plays a recipe through the core interpreter in an AudioWorklet
// (docs/PROJECT.md §2.2). The main-thread half; the audio thread runs processor.js.
import { validateRecipe } from '../../core/index.js';

/**
 * Loads the worklet into `audioContext` and returns a player:
 * `{ node, load(recipe), setInput(name, value), reset(), onError(callback) }`.
 * `node` is a mono AudioWorkletNode the caller connects to the destination or a spatial chain.
 */
export async function createRecipePlayer(audioContext) {
  await audioContext.audioWorklet.addModule(new URL('./processor.js', import.meta.url));
  const node = new AudioWorkletNode(audioContext, 'mysfxkit-recipe', {
    numberOfInputs: 0,
    outputChannelCount: [1],
    processorOptions: { sampleRate: audioContext.sampleRate },
  });
  const callbacks = [];
  node.port.onmessage = (event) => {
    if (event.data?.type === 'error') for (const callback of callbacks) callback(event.data.errors);
  };
  return {
    node,
    /** Validates the recipe (a parsed object), then sends it; rejects with an Error carrying `.errors`. */
    async load(recipe) {
      const { ok, errors } = validateRecipe(recipe);
      if (!ok) {
        const error = new Error(`invalid recipe: ${errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`);
        error.errors = errors;
        throw error;
      }
      node.port.postMessage({ type: 'recipe', recipe });
    },
    /** Sets a game input; an unknown name or a non-finite value is reported through onError. */
    setInput(name, value) { node.port.postMessage({ type: 'input', name, value }); },
    /** Restarts the recipe from its compiled state; inputs keep their values. */
    reset() { node.port.postMessage({ type: 'reset' }); },
    /** Calls `callback(errors)` for every error the audio thread reports. */
    onError(callback) { callbacks.push(callback); },
  };
}
