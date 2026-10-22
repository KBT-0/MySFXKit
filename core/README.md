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
| `instance.trigger(name, strength)` | fires the game event `name`, the id of a `trigger` node, with `strength` clamped to the node's `range`; it lands at the start of the next control block, not on a sample (up to 128 samples late); an unknown name or a non-finite strength throws; allocates nothing, so an AudioWorklet's message handler may call it |
| `instance.render(out)` | fills a `Float32Array` of any length with the next samples and returns it; chunk sizes do not change the result |
| `instance.reset()` | back to the state right after compiling (generator, filters, glides); pending events are cleared; inputs keep their values |
| `renderOffline(recipe, { sampleRate = 48000, seconds, inputs, events })` | a new `Float32Array` of `seconds` with fixed inputs; `events: [{ at, name, strength }]` (optional) are fired with `trigger` once `at` seconds are rendered, in order of `at`; an `at` that is not a number >= 0 throws |
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

Every node parameter is a number or an expr string. Every node except a trigger block (`pulse`,
`randomTrigger`, `trigger`, `sequence`) or a control block (`lfo`, `randomWalk`) also takes `gain` (default 1) and
`env: { trigger, decay, attack, length, stop }`: an envelope restarted at each firing of the trigger
node `trigger` (any trigger block) and silent before the first. `decay`, `attack`, `length` and `stop`
are exprs in seconds, evaluated once per control block; `attack` and `length` are optional
(0), and so is `stop` (never). At `t` seconds after the firing the level is `min(1, t / attack)`, times 1 while
`t < length` and `exp(-(t - length) / decay)` after: it rises over `attack`, holds until
`length`, then decays; from `t > stop` the level is 0, a hard stop. Without `attack` and `length` it is the decay `exp(-t / decay)`.
`length` may read a held value (`horn.length - 0.02`). Unknown keys are errors.

The diesel (`recipes/diesel.json`) is a port of Leeway's `Diesel` (`engine/audio/voices.hpp`)
with Leeway's numbers: firing 4.5 Hz at idle to 13 Hz at full throttle, glide 1/1.2 s, period
jitter ±3 %, per-pulse gain 0.7–1.0, and Leeway's `engine` 0.35 and `master` 0.8 into `tanh`.

The hull water (`recipes/hull_water.json`) is a port of Leeway's `HullWater`, input `speed`
0..1: a 0.13 Hz `lfo` with a 3x harmonic on the lapping, a wash whose cutoff and
`pow(speed, 1.3)` gain grow with speed, Leeway's `water` 0.45 and `master` 0.8 into `tanh`.

The city bed (`recipes/city_bed.json`) is Leeway's `CityNoise` bed layer (rumble and traffic,
no horns or ferry) for one listener distance, with no inputs: a `randomWalk` traffic level.
The per-building distance sum and stereo placement stay game or adapter code.

The horn (`recipes/horn.json`) is Leeway's `CityNoise` car horn, no inputs: a `randomTrigger`
every 5–18 s (the first at 4 s, as Leeway's) of 1 or 2 beeps, each event with a pitch of
380–470 Hz and a beep length of 0.18–0.35 s, two `tanh`-shaped sines low-passed at 1500 Hz
under an attack/length/decay `env`. The ferry (`recipes/ferry.json`) is Leeway's ferry horn:
an event every 35–90 s (the first at 1 s, not Leeway's 25 s, so a short render hears it), a
115–145 Hz saw low-passed at 600 Hz for 1.8–2.6 s. Placement (distance, pan) is the
adapter's; each recipe's `description` lists its deviations from Leeway.

The gull (`recipes/gull.json`) is one bird of Leeway's `GullCall`, no inputs: a `randomTrigger`
starts a call 0.5–1.5 s in, then every 3–22 s, at a pitch of 700–1000 Hz. A `sequence` makes each call a
laugh (35 %: 4–6 notes of 0.11 s) or a long call (65 %: 3–7 notes, the first 0.42 s, each later one 0.2–0.26 s, drawn per note where
Leeway draws one length for all of a call's later notes). Each note is
0.965 times lower than the one before and rises then falls within itself. The voice is a rasping saw
plus noise through two formant band-passes. A flock is several instances with their own seeds, placed by the adapter.

The hull impact (`recipes/hull_impact.json`) is Leeway's `HullImpact`, played once per event:
the game calls `trigger('impact', strength)`, strength 0..1. A 45 Hz sine decaying with time
constant 0.15 s and noise low-passed at 700 Hz, times 3, decaying with 0.05 s; both stop hard
1.2 s after the event; scaled by the strength, then Leeway's `impact` 0.9 and `master` 0.8 into
`tanh`. An event within 1.2 s of the last keeps the stronger strength (`maxHold`), as Leeway's.

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
included), for a `pulse` or a `randomTrigger` its `hold` names, for a `trigger` `strength`, for a `sequence` `choice`,
`index`, `length` and `phase`, for an `lfo` `value` (and `harmonic`), for a `randomWalk` `value`. A node may also read its own published fields (not its
parameters): it gets their value at the end of the previous control block, 0 in the first
(`spacing: "horn.length + 0.12"`). A result that is not finite (a division by zero)
counts as 0, and every result is clamped to ±1e6; so is every node's output sample, so NaN and
Infinity never reach the output. An expr is at most 1000 characters. A parse error names the
node, the parameter and the expr text. Exprs are parsed into a tree and compiled to a stack
program of fixed opcodes; nothing is ever run as code.

## Blocks

| Type | Parameters (default) | Output |
|---|---|---|
| `noise` | none | seeded white noise, uniform in [-1, 1) |
| `osc` | `freq` Hz (440), `wave`: `sine` (default) or `saw`, `sync`: a trigger node id (optional) | a sine or a rising saw in [-1, 1]; `sync` restarts its phase at each firing |
| `lowpass` | `in`, `cutoff` Hz (1000) | one-pole low-pass of `in` |
| `bandpass` | `in`, `freq` Hz (1000), `damping` (1; 2 is wide, 0.2 sharp) | Chamberlin state-variable band-pass of `in` (peak gain 1 / damping); near `freq` = sampleRate / 6 the damping is capped below 2 to keep the filter stable |
| `shape` | `in`, `drive` (1) | `tanh(drive * in)`, a soft clip into (-1, 1) |
| `mix` | `in`: a list of ids, `gains`: one expr per input (all 1) | the weighted sum |
| `pulse` | `hz` (1), `jitter` (0, at most 0.5), `hold: { name: [lo, hi] }` | one-sample triggers; each period is `(1 ± jitter) / hz`; each pulse draws every `hold` value uniformly from [lo, hi], readable as `<id>.<name>` |
| `randomTrigger` | `every: [a, b]` seconds ([1, 4]), `first: [a, b]` seconds (`every`), `repeat: [lo, hi]` whole numbers ([1, 1]), `spacing` seconds (0.25), `hold: { name: [lo, hi] }` | one-sample triggers in events: the first event `first` seconds in, each next one a wait drawn uniformly from `every` after the previous event's last firing; each event draws every `hold` value uniformly from [lo, hi] (readable as `<id>.<name>`) and a count of firings uniformly from `repeat`, `spacing` seconds apart (evaluated once per control block) |
| `trigger` | `range: [lo, hi]` (`[0, 1]`), `maxHold` seconds (0) | a game event named by the node id: one trigger at the first sample of the control block after `instance.trigger(id, strength)`. Publishes `<id>.strength`, the event's strength clamped to `range` (`lo` before the first event). Two events before the same block fire once, with the stronger strength; an event within `maxHold` seconds of the previous firing keeps the stronger of its strength and the held one, as Leeway's `HullImpact` |
| `sequence` | `sync`: a trigger node id (required), `variants`: 1 to 16 `{ weight (1), count: [lo, hi] whole numbers, 1 to 64, first: [a, b] seconds, rest: [a, b] seconds (first), gap: [a, b] seconds ([0, 0]) }` | one trigger per note: each firing of `sync` starts a run (a firing during a run starts a new one) and picks a variant with chance weight / total weight. The run has a count of notes drawn uniformly from `count`; the first note lasts a length drawn from `first`, each next one a length drawn from `rest`, and a gap drawn from `gap` follows each note before the next starts. Publishes `<id>.choice` (the variant's index, from 0), `<id>.index` (the note, from 0), `<id>.length` (its seconds) and `<id>.phase` (seconds since its start / its length, at most 1; 1 between runs, before the first included), once per control block. Modelled on Leeway's `GullCall`, which draws one length for all of a call's later notes where `rest` is drawn per note |
| `lfo` | `rate` Hz (1), `harmonic`: a whole number n >= 1 (optional) | silent; publishes `<id>.value` = sin(2π · phase) and, with `harmonic`, `<id>.harmonic` = sin(2π · n · phase), once per control block; the phase starts at 0 |
| `randomWalk` | `range: [lo, hi]` ([0, 1]), `every: [a, b]` seconds ([1, 4]), `slew` seconds (1) | silent; publishes `<id>.value`, which starts mid-range and glides (time constant `slew`; 0 jumps) toward a target drawn uniformly from `range`; a new target and a new wait drawn from `every` when the wait runs out, the first at once; once per control block |

## Tests

`node --test core/` (also run by `./scripts/check.sh`). The tests are seeded and assert on
measured features (pulse rate from envelope onsets, RMS, peak, filter response), never on
sample values; the helpers are in `test_features.js`.
