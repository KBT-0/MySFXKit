// The interpreter: runs a validated recipe plan. Exprs and params are evaluated once per
// control block of BLOCK samples; the blocks' DSP runs per sample.
import { BLOCKS } from './blocks.js';
import { compileExpr, runExpr } from './expr.js';
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

  // Everything step() reads is built here or in start(), so render() allocates nothing per block:
  // every name an expr reads has a slot in one Float64Array of values, and every expr is compiled once.
  const slots = new Map();
  const slot = (name) => { if (!slots.has(name)) slots.set(name, slots.size); return slots.get(name); };
  const expr = (ast) => compileExpr(ast, slot);
  const inputSlots = Object.keys(inputs).map((name) => [name, slot(name)]);
  const params = plan.params.map(({ name, rate, slew }) => ({ at: slot(name), rate: expr(rate), slew: slew && expr(slew) }));
  const nodes = plan.nodes.map((n) => {
    const keys = Object.keys(n.exprs), field = (key) => slot(`${n.id}.${key}`);
    return {
      n,
      exprs: keys.map((key) => expr(n.exprs[key])),
      at: keys.map(field),
      gain: Object.hasOwn(n.exprs, 'gain') ? field('gain') : -1,  // -1: a pulse, which has no gain
      params: Object.keys(BLOCKS[n.type].params).map(field),
      gains: (n.gains ?? []).map(expr),
      decay: n.env && expr(n.env.decay),
      fieldAt: (BLOCKS[n.type].fields?.(n.node) ?? []).map(field),
    };
  });
  const tmp = new Float64Array(1);  // the result of a glide's target or time, or of a decay
  let run;  // everything reset() rebuilds: the generator, block state, values, the partial block

  const start = () => {
    const rng = createRng(plan.seed);
    const buffers = new Map(plan.nodes.map((n) => [n.id, new Float32Array(BLOCK)]));
    run = {
      values: new Float64Array(slots.size),
      first: true,  // the first block after start: every glide starts at its target
      read: BLOCK,  // read position in the output node's block; BLOCK means "compute the next one"
      output: buffers.get(plan.out),
      nodes: nodes.map((c) => ({
        c,
        p: new Float64Array(c.params.length + c.gains.length),  // the block's params, then the gains
        processor: BLOCKS[c.n.type].create(c.n.node, { sampleRate, rng }),
        out: buffers.get(c.n.id),
        io: {
          in: Array.isArray(c.n.input) ? c.n.input.map((id) => buffers.get(id)) : buffers.get(c.n.input) ?? null,
          sync: c.n.sync ? buffers.get(c.n.sync) : null,
        },
        trigger: c.n.env ? buffers.get(c.n.env.trigger) : null,
        envTime: Float64Array.of(Infinity),  // silent until the first trigger
      })),
    };
  };

  const step = () => {
    const { values } = run;
    for (let j = 0; j < inputSlots.length; j++) values[inputSlots[j][1]] = inputs[inputSlots[j][0]];
    for (let j = 0; j < params.length; j++) {
      const { at, rate, slew } = params[j];
      runExpr(rate, values, tmp, 0);
      const target = finite(tmp[0]);
      if (!slew || run.first) values[at] = target;  // a glide starts at its target
      else {
        runExpr(slew, values, tmp, 0);
        const time = finite(tmp[0]), now = values[at];
        values[at] = time > 0 ? now + (target - now) * (1 - Math.exp(-blockSeconds / time)) : target;
      }
    }
    run.first = false;
    for (let k = 0; k < run.nodes.length; k++) {
      const node = run.nodes[k], { c, p, out } = node;
      for (let j = 0; j < c.at.length; j++) {
        runExpr(c.exprs[j], values, values, c.at[j]);
        values[c.at[j]] = finite(values[c.at[j]]);
      }
      for (let j = 0; j < c.params.length; j++) p[j] = values[c.params[j]];
      for (let j = 0, at = c.params.length; j < c.gains.length; j++, at++) {
        runExpr(c.gains[j], values, p, at);
        p[at] = finite(p[at]);
      }
      node.processor.process(p, node.io, out);
      const gain = c.gain < 0 ? 1 : values[c.gain];
      if (c.decay) {
        runExpr(c.decay, values, tmp, 0);
        const decay = Math.max(finite(tmp[0]), 1e-4);
        let time = node.envTime[0];
        for (let i = 0; i < BLOCK; i++) {
          if (node.trigger[i] > 0) time = 0;
          time += 1 / sampleRate;
          out[i] *= gain * Math.exp(-time / decay);
        }
        node.envTime[0] = time;
      } else if (gain !== 1) for (let i = 0; i < BLOCK; i++) out[i] *= gain;
      for (let i = 0; i < BLOCK; i++) out[i] = finite(out[i]);  // so no block state ever takes a NaN
      for (let j = 0; j < c.fieldAt.length; j++) values[c.fieldAt[j]] = node.processor.fields[j];
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
