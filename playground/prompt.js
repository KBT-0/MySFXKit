// The "Copy prompt" text of brief §6, step 2: the kit's instruction, the recipe format, one
// valid example recipe and the user's request, as one string for any AI chat. Pure, no DOM.
// The format text below is a second description of `core/README.md`; `prompt.test.js` guards
// it against drift (every block type named, the example valid and audible).

/** The longest request accepted, in characters after trimming. */
export const MAX_REQUEST = 2000;

/**
 * The example recipe embedded in the prompt: wind whose strength the game sets (an input), with
 * a gust the game fires (a trigger node), slow random variation and a `shape` output.
 */
export const EXAMPLE_RECIPE = {
  name: 'wind',
  description: 'Wind whose strength the game sets (input storm, 0..1); the game fires a gust with trigger("gust", strength).',
  version: 0,
  seed: 12345,
  inputs: { storm: { min: 0, max: 1, default: 0.3 } },
  params: { level: { slew: 0.5, rate: 'storm' } },
  nodes: [
    { id: 'air', type: 'noise' },
    { id: 'drift', type: 'randomWalk', range: [0.6, 1], every: [1, 3], slew: 0.8 },
    { id: 'howl', type: 'bandpass', in: 'air', freq: '300 + 500 * level + 200 * drift.value', damping: '0.6 - 0.3 * level' },
    { id: 'rush', type: 'lowpass', in: 'air', cutoff: '800 + 2000 * level' },
    { id: 'gust', type: 'trigger', range: [0, 1] },
    { id: 'blast', type: 'lowpass', in: 'air', cutoff: 1200,
      env: { trigger: 'gust', attack: 0.3, length: 0.4, decay: 0.8, stop: 4 } },
    { id: 'wind', type: 'mix', in: ['howl', 'rush', 'blast'],
      gains: ['(0.3 + 0.7 * level) * drift.value', '0.4 * level', '0.8 * gust.strength'] },
    { id: 'out', type: 'shape', in: 'wind', drive: 1.2 },
  ],
};

/** `EXAMPLE_RECIPE` as JSON with one node per line: shorter for the AI than one value per line. */
function exampleJson() {
  const { nodes, ...head } = EXAMPLE_RECIPE;
  return ['{', ...Object.entries(head).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
    '  "nodes": [', nodes.map((node) => `    ${JSON.stringify(node)}`).join(',\n'), '  ]', '}'].join('\n');
}

const INSTRUCTION = `You write sound recipes for MySFXKit. A recipe is JSON data that describes a synthesized sound (no recorded audio) which reacts to game state. A web page validates the recipe and plays it; game inputs become sliders, game events become buttons.

# Your reply

Reply with exactly ONE recipe: one JSON object inside one \`\`\`json fenced block. The page takes the first { ... } in your reply, so write no { or } before the fence and only one JSON object. Plain JSON only: no comments, no trailing commas, no JavaScript. One or two short sentences after the fence (what the inputs and events do) are fine.

# Recipe format (version 0)

Top-level keys (any other key is an error):
- "name": non-empty string.
- "description": optional string.
- "version": 0 (the number zero).
- "seed": an integer from 0 to 4294967295; it seeds all randomness.
- "inputs": optional, { name: { "min", "max", "default" } }, three numbers with min <= default <= max. Continuous game state the game sets at any time (throttle, speed, intensity, distance).
- "params": optional, { name: value }, evaluated in order once per control block (128 samples). A value is a number, an expr string, or { "slew": expr, "rate": expr }: a glide toward rate with time constant slew seconds. A param reads inputs and earlier params only.
- "nodes": a non-empty array of nodes [{ "id", "type", ... }]: the block graph. Order does not matter; cycles are rejected.
- "out": the id of the output node; if missing, the node with id "out" is the output.

Names (inputs, params, node ids, hold names) match [A-Za-z_][A-Za-z0-9_]*. An input, a param and a node never share a name; node ids are unique.

Node parameters: every parameter listed as "expr" below is a number or an expr string. Keys shown as [low, high] are literal JSON arrays of two numbers with low <= high, never exprs. "in" and "sync" are node ids (strings); "in" of a mix is an array of ids.

gain and env: every SOUND node (noise, osc, lowpass, bandpass, shape, mix) also takes "gain" (expr, default 1) and "env": { "trigger": <id of a trigger-type node>, "decay": s, "attack": s, "length": s, "stop": s }. decay is required; attack, length (default 0) and stop (default never) are optional; all are exprs in seconds. The envelope restarts at each firing of its trigger node and is silent before the first firing: t seconds after a firing the level is min(1, t / attack), held at 1 while t < length, then exp(-(t - length) / decay); 0 after t > stop. Trigger-type nodes (pulse, randomTrigger, trigger, sequence) and control nodes (lfo, randomWalk) take NO gain and NO env.

# Expr language

- Numbers: 2, 0.5, .5, 1e3.
- Names: an input (throttle), a param (load), or a node field written id.field (fire.gain, body.freq).
- Operators: + - * /, unary -, parentheses, usual precedence. Nothing else: no comparisons, no ?:, no if, no variables like t or time, no random().
- Functions: abs(x), min(a, b, ...), max(a, b, ...), clamp(x, lo, hi), pow(x, y), exp(x), sin(x).
- At most 1000 characters per expr. A non-finite result counts as 0; results are clamped to +-1e6.
- A node's fields are its expr parameters (gain included for sound nodes) plus what it publishes (below). Reading another node's field orders that node first; a node may read its own published fields (it gets the previous block's value).

# Blocks

Each line: type, its keys with defaults, and what it outputs.
- \`noise\`: no parameters. Seeded white noise in [-1, 1).
- \`osc\`: freq expr Hz (440), wave "sine" (default) or "saw", sync: a trigger-type node id (optional, restarts the phase at each firing). A sine or rising saw in [-1, 1].
- \`lowpass\`: in (node id), cutoff expr Hz (1000). One-pole low-pass of in.
- \`bandpass\`: in, freq expr Hz (1000), damping expr (1; 2 is wide, 0.2 sharp, peak gain 1 / damping). State-variable band-pass of in.
- \`shape\`: in, drive expr (1). tanh(drive * in), a soft clip into (-1, 1).
- \`mix\`: in: [ids], gains: [one expr per input] (all 1). The weighted sum.
- \`pulse\` (trigger-type): hz expr (1), jitter expr (0, at most 0.5), hold: { name: [low, high] } (optional). A firing every (1 +- jitter) / hz seconds; each firing draws each hold value uniformly, readable as id.name.
- \`randomTrigger\` (trigger-type): every: [a, b] seconds ([1, 4]), first: [a, b] seconds (every), repeat: [low, high] whole numbers ([1, 1]), spacing expr seconds (0.25), hold: { name: [low, high] }. Random events: the first after "first" seconds, then a wait drawn from "every"; each event fires "repeat" times, "spacing" seconds apart, and draws each hold value (id.name).
- \`trigger\` (trigger-type): range: [low, high] ([0, 1]), maxHold seconds (0, a number). A GAME EVENT named by its id: the game fires it with a strength; it publishes id.strength (clamped to range, low before the first event). An event within maxHold seconds of the last keeps the stronger strength.
- \`sequence\` (trigger-type): sync: a trigger-type node id (REQUIRED), variants: 1 to 16 objects { "weight" (1), "count": [low, high] whole numbers 1..64 (required), "first": [a, b] seconds (required), "rest": [a, b] seconds (first), "gap": [a, b] seconds ([0, 0]) }. Each firing of sync starts a run of notes (one firing per note) from a variant picked by weight: count notes, the first lasting "first", the others "rest", each followed by "gap". Publishes id.choice (variant index from 0), id.index (note from 0), id.length (seconds) and id.phase (0 to 1 across the note; 1 between runs).
- \`lfo\` (control): rate expr Hz (1), harmonic: whole number >= 1 (optional). Silent; publishes id.value = sin(2 pi phase) and, with harmonic n, id.harmonic = sin(2 pi n phase).
- \`randomWalk\` (control): range: [low, high] ([0, 1]), every: [a, b] seconds ([1, 4]), slew expr seconds (1). Silent; publishes id.value, which glides toward a new random target in range after each wait drawn from every.

Control nodes are silent and trigger-type nodes output only one-sample clicks: use them through their fields, env, sync or a sequence, not as a sound source.

# Rules that most often fail validation

- Unknown keys are errors everywhere: top level, in a node, in env, in a variant. Use only the keys listed above for each type.
- "version" must be 0; "seed" must be an integer in range.
- Every id named in in, sync, env.trigger and in every id.field must exist; env.trigger and sync must name a trigger-type node.
- A field read must exist for that type (osc has freq and gain, not value; lfo and randomWalk have value).
- No cycles: a node may not feed itself through in, sync, env or a field read (reading its own published field is allowed).
- There must be an output: a node with id "out", or "out" naming one.

# How to design the sound

- Model continuous game state (speed, throttle, rain intensity, health) as "inputs" with a sensible min, max and default, and let params and exprs map it to pitch, cutoff and gain. Glide fast-changing inputs with { "slew", "rate" } so the sound does not jump.
- Model one-off game events (a door opening, a hit, a jump, a shot) as "trigger" nodes; drive the sound with env { "trigger": that id, ... } and scale it by id.strength. Give it a "stop" so it ends.
- Add variation so repeats do not sound identical: jitter, hold ranges, randomTrigger, randomWalk, sequence variants.
- Layer a few sources (osc, noise) through filters and mix them, but keep it small (usually 4 to 15 nodes).
- Keep levels safe: end in a "shape" node (drive about 0.8 to 1.5) as the output, and keep mix gains so the sum stays near 1.

# Example recipe (valid; wind with an input and a game event)

\`\`\`json
${exampleJson()}
\`\`\`

# The request

Write one recipe for the sound described below. The description may be in any language; write the recipe's name and description in English.

`;

/**
 * Returns the full prompt for `request`, a description of the sound in any language; the trimmed
 * request ends the prompt verbatim. Throws an `Error` when the request is empty or longer than
 * `MAX_REQUEST` characters.
 */
export function buildPrompt(request) {
  const text = String(request ?? '').trim();
  if (!text) throw new Error('Describe the sound first.');
  if (text.length > MAX_REQUEST) throw new Error(`The description is ${text.length} characters; at most ${MAX_REQUEST} are accepted.`);
  return INSTRUCTION + text;
}
