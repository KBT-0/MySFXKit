// The audio-thread half of the web adapter: an AudioWorkletProcessor that runs the core
// interpreter. Loaded by index.js through audioWorklet.addModule; never imported by a page.
import { compileRecipe } from '../../core/index.js';

/** Posts errors in the core's shape, `[{ node, path, message }]`. */
const errorsOf = (error) => error.errors ?? [{ node: null, path: '', message: String(error.message ?? error) }];

class RecipeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // `sampleRate` is a global of the worklet scope; the fallback is for the Node test shim.
    this.rate = globalThis.sampleRate ?? options?.processorOptions?.sampleRate;
    this.instance = null;  // the compiled recipe; null means silence
    this.port.onmessage = (event) => this.receive(event.data);
  }

  receive(message) {
    try {
      switch (message?.type) {
        case 'recipe':
          this.instance = null;  // an invalid recipe leaves the processor silent
          this.instance = compileRecipe(message.recipe, { sampleRate: this.rate });
          break;
        case 'input': this.instance?.setInput(message.name, message.value); break;
        case 'trigger': this.instance?.trigger(message.name, message.strength); break;
        case 'reset': this.instance?.reset(); break;
        default: break;
      }
    } catch (error) {
      this.port.postMessage({ type: 'error', errors: errorsOf(error) });
    }
  }

  process(inputs, outputs) {
    const channels = outputs[0];
    if (!channels || channels.length === 0) return true;
    const first = channels[0];
    if (this.instance) {
      try {
        this.instance.render(first);
        for (let i = 0; i < first.length; i++) first[i] = Math.min(Math.max(first[i], -1), 1);
      } catch (error) {
        this.instance = null;  // reported once; silent until the next recipe
        this.port.postMessage({ type: 'error', errors: errorsOf(error) });
      }
    }
    if (!this.instance) first.fill(0);
    for (let c = 1; c < channels.length; c++) channels[c].set(first);
    return true;
  }
}

registerProcessor('mysfxkit-recipe', RecipeProcessor);
