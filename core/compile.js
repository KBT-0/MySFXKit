// The interpreter: runs a validated recipe plan. Exprs and params are evaluated once per
// control block of BLOCK samples; the blocks' DSP runs per sample.
import { BLOCKS } from './blocks.js';
import { evaluate } from './expr.js';
import { analyzeRecipe } from './validate.js';
import { createRng } from './rng.js';

/** Samples per control block. */
export const BLOCK = 128;

/** Bound on every expr result and every node sample: NaN or Infinity must never reach the output. */
const LIMIT = 1e6;
/** A non-finite expr result (a division by zero) counts as 0; a huge one is clamped to ±LIMIT. */
const finite = (v) => (Number.isFinite(v) ? Math.min(Math.max(v, -LIMIT), LIMIT) : 0);

/**
 * Compiles a recipe for one sample rate. Throws an Error with `.errors` (as `validateRecipe`
 * returns them) if the recipe is invalid. Returns `{ setInput(name, value), render(out), reset() }`.
 */
export function compileRecipe(recipe, { sampleRate } = {}) {
  const { errors, plan } = analyzeRecipe(recipe);
  if (errors.length) {
    const error = new Error(`invalid recipe: ${errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`);
    error.errors = errors;
    throw error;
  }
  if (!(Number.isFinite(sampleRate) && sampleRate > 0)) throw new Error('compileRecipe needs { sampleRate } above 0');

  const inputs = Object.create(null);  // no prototype: names come from pasted text
  for (const [name, spec] of Object.entries(plan.inputs)) inputs[name] = spec.default;
  const blockSeconds = BLOCK / sampleRate;
  let run;  // everything reset() rebuilds: the generator, block state, glides, the partial block

  const start = () => {
    const rng = createRng(plan.seed);
    const buffers = new Map(plan.nodes.map((n) => [n.id, new Float32Array(BLOCK)]));
    run = {
      glides: new Map(),
      scope: Object.create(null),
      read: BLOCK,  // read position in the output node's block; BLOCK means "compute the next one"
      output: buffers.get(plan.out),
      nodes: plan.nodes.map((n) => ({
        n,
        out: buffers.get(n.id),
        processor: BLOCKS[n.type].create(n.node, { sampleRate, rng }),
        io: {
          in: Array.isArray(n.input) ? n.input.map((id) => buffers.get(id)) : buffers.get(n.input) ?? null,
          sync: n.sync ? buffers.get(n.sync) : null,
        },
        trigger: n.env ? buffers.get(n.env.trigger) : null,
        envTime: Infinity,  // silent until the first trigger
      })),
    };
  };

  const step = () => {
    const { scope, glides } = run;
    Object.assign(scope, inputs);
    for (const { name, rate, slew } of plan.params) {
      const target = finite(evaluate(rate, scope));
      if (!slew || !glides.has(name)) glides.set(name, target);  // a glide starts at its target
      else {
        const time = finite(evaluate(slew, scope));
        const now = glides.get(name);
        glides.set(name, time > 0 ? now + (target - now) * (1 - Math.exp(-blockSeconds / time)) : target);
      }
      scope[name] = glides.get(name);
    }
    for (const node of run.nodes) {
      const { n, out } = node;
      const p = {};
      for (const [key, ast] of Object.entries(n.exprs)) p[key] = finite(evaluate(ast, scope));
      if (n.gains) p.gains = n.gains.map((ast) => finite(evaluate(ast, scope)));
      node.processor.process(p, node.io, out);
      if (n.env) {
        const decay = Math.max(finite(evaluate(n.env.decay, scope)), 1e-4);
        for (let i = 0; i < BLOCK; i++) {
          if (node.trigger[i] > 0) node.envTime = 0;
          node.envTime += 1 / sampleRate;
          out[i] *= p.gain * Math.exp(-node.envTime / decay);
        }
      } else if (p.gain !== undefined && p.gain !== 1) for (let i = 0; i < BLOCK; i++) out[i] *= p.gain;
      for (let i = 0; i < BLOCK; i++) out[i] = finite(out[i]);  // so no block state ever takes a NaN
      for (const key of Object.keys(n.exprs)) scope[`${n.id}.${key}`] = p[key];
      for (const [key, value] of Object.entries(node.processor.fields ?? {})) scope[`${n.id}.${key}`] = value;
    }
  };

  start();
  return {
    /** Sets a game input; the value is clamped to the input's [min, max]. */
    setInput(name, value) {
      const spec = plan.inputs[name];
      if (!spec) throw new Error(`unknown input "${name}" (known: ${Object.keys(plan.inputs).join(', ') || 'none'})`);
      if (!Number.isFinite(value)) throw new Error(`input "${name}" needs a finite number`);
      inputs[name] = Math.min(Math.max(value, spec.min), spec.max);
    },
    /** Fills `out` (a Float32Array of any length) with the next samples. */
    render(out) {
      for (let i = 0; i < out.length; i++) {
        if (run.read === BLOCK) { step(); run.read = 0; }
        out[i] = run.output[run.read++];
      }
      return out;
    },
    /** Restarts from the state right after compiling; the inputs keep their current values. */
    reset: start,
  };
}
