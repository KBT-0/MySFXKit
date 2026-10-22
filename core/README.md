# core — recipe model, validator and interpreter

Engine-free JavaScript (ES modules, Node 26 or a browser, no dependency, no build step). A
**recipe** is JSON data describing a sound that reacts to game inputs (format B,
`docs/PROJECT.md` §2.2). `core/` validates it, interprets it block by block, and renders it
offline. Adapters (`adapters/`) feed its output to an engine; they never redefine a block.

## Public API (`core/index.js`)

| Call | Returns |
|---|---|
| `validateRecipe(json)` | `{ ok, errors: [{ node, path, message }] }`; `node` is the node id or `null` |
| `compileRecipe(recipe, { sampleRate })` | an instance; throws an `Error` with `.errors` if the recipe is invalid |
| `instance.setInput(name, value)` | sets a game input, clamped to its `[min, max]`; an unknown name or a non-finite value throws |
| `instance.render(out)` | fills a `Float32Array` of any length with the next samples and returns it; chunk sizes do not change the result |
| `instance.reset()` | back to the state right after compiling (generator, filters, glides); inputs keep their values |
| `renderOffline(recipe, { sampleRate = 48000, seconds, inputs })` | a new `Float32Array` of `seconds` with fixed inputs |
| `BLOCKS`, `BLOCK` | the block registry (read-only) and the control block size, 128 samples |

**Determinism:** the same recipe, seed and inputs give a bit-identical buffer. All randomness
comes from one xorshift32 generator seeded from `recipe.seed` (`rng.js`, as Leeway's `Noise`).

**Timing:** params and exprs are evaluated once per control block of 128 samples; blocks run
per sample. A node's fields read by an expr (`fire.gain`) are control-rate values.

**Real time:** once the JIT has optimized it (V8, measured on Node), `render` allocates
nothing per block, so an audio thread (an AudioWorklet) can call it every 128 frames without
garbage collection pauses; `alloc.test.js` measures it. The first second or so after a recipe
loads may still allocate, and `compileRecipe` and `reset` allocate.

## Recipe format v0

| Key | Meaning |
|---|---|
| `name` | non-empty string |
| `description` | optional text |
| `version` | `0` |
| `seed` | integer 0 .. 4294967295 |
| `inputs` | `{ name: { min, max, default } }`: game state, set with `setInput` |
| `params` | `{ name: value }`, evaluated in order; a value is a number, an expr, or `{ slew, rate }`: a glide toward `rate` with time constant `slew` seconds (both exprs). A glide starts at its target on the first block after compile or reset |
| `nodes` | `[{ id, type, ... }]`: the block graph (table below); order does not matter, cycles are rejected |
| `out` | the id of the output node; missing, the node with id `out` |

Every node parameter is a number or an expr string. Every node except a `pulse` also takes
`gain` (default 1) and `env: { trigger: <pulse id>, decay: <seconds> }`, an exponential decay
`exp(-t / decay)` restarted at each pulse and silent before the first. Unknown keys are errors.

The diesel (`recipes/diesel.json`) is a port of Leeway's `Diesel` (`engine/audio/voices.hpp`)
with Leeway's numbers: firing 4.5 Hz at idle to 13 Hz at full throttle, glide 1/1.2 s, period
jitter ±3 %, per-pulse gain 0.7–1.0, and Leeway's `engine` 0.35 and `master` 0.8 into `tanh`.

```json
{
  "name": "diesel", "version": 0, "seed": 7,
  "inputs": { "throttle": { "min": -1, "max": 1, "default": 0 } },
  "params": {
    "load": { "slew": "1 / 1.2", "rate": "abs(throttle)" },
    "firing": "4.5 + 8.5 * load"
  },
  "nodes": [
    { "id": "fire", "type": "pulse", "hz": "firing", "jitter": 0.03, "hold": { "gain": [0.7, 1.0] } },
    { "id": "body", "type": "osc", "wave": "sine", "freq": "52 + 18 * load", "sync": "fire",
      "env": { "trigger": "fire", "decay": "0.045 - 0.015 * load" } },
    { "id": "noise", "type": "noise" },
    { "id": "chuff", "type": "lowpass", "in": "noise", "cutoff": "500 + 1500 * load",
      "env": { "trigger": "fire", "decay": 0.025 } },
    { "id": "hum", "type": "osc", "wave": "sine", "freq": "2 * firing", "sync": "fire", "gain": 0.08 },
    { "id": "engine", "type": "mix", "in": ["body", "chuff", "hum"],
      "gains": ["0.35 * fire.gain * (0.5 + 0.5 * load)",
                "0.35 * fire.gain * (0.5 + 0.5 * load) * (1.5 + 2 * load)", 0.35] },
    { "id": "out", "type": "shape", "in": "engine", "drive": 0.8 }
  ]
}
```

## Expr language

| Element | Form |
|---|---|
| Numbers | `2`, `0.5`, `.5`, `1e3` |
| Names | an input (`throttle`), a param (`load`), a node field `node.field` (`fire.gain`, `body.freq`) |
| Operators | `+ - * /`, unary `-`, parentheses; the usual precedence |
| Functions | `abs(x)`, `min(a, b, ...)`, `max(a, b, ...)`, `clamp(x, lo, hi)`, `pow(x, y)`, `exp(x)`, `sin(x)` |

A param reads inputs and earlier params. A node reads inputs, params and other nodes' fields;
each field it reads orders that node first. A node's fields are its parameters (`gain`
included) and, for a pulse, its `hold` names. A result that is not finite (a division by zero)
counts as 0, and every result is clamped to ±1e6; so is every node's output sample, so NaN and
Infinity never reach the output. An expr is at most 1000 characters. A parse error names the
node, the parameter and the expr text. Exprs are parsed into a tree and compiled to a stack
program of fixed opcodes; nothing is ever run as code.

## Blocks

| Type | Parameters (default) | Output |
|---|---|---|
| `noise` | none | seeded white noise, uniform in [-1, 1) |
| `osc` | `freq` Hz (440), `wave`: `sine` (default) or `saw`, `sync`: a pulse id (optional) | a sine or a rising saw in [-1, 1]; `sync` restarts its phase at each pulse |
| `lowpass` | `in`, `cutoff` Hz (1000) | one-pole low-pass of `in` |
| `bandpass` | `in`, `freq` Hz (1000), `damping` (1; 2 is wide, 0.2 sharp) | Chamberlin state-variable band-pass of `in` (peak gain 1 / damping); near `freq` = sampleRate / 6 the damping is capped below 2 to keep the filter stable |
| `shape` | `in`, `drive` (1) | `tanh(drive * in)`, a soft clip into (-1, 1) |
| `mix` | `in`: a list of ids, `gains`: one expr per input (all 1) | the weighted sum |
| `pulse` | `hz` (1), `jitter` (0, at most 0.5), `hold: { name: [lo, hi] }` | one-sample triggers; each period is `(1 ± jitter) / hz`; each pulse draws every `hold` value uniformly from [lo, hi], readable as `<id>.<name>` |

## Tests

`node --test core/` (also run by `./scripts/check.sh`). The tests are seeded and assert on
measured features (pulse rate from envelope onsets, RMS, peak, filter response), never on
sample values; the helpers are in `test_features.js`.
