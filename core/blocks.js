// The block registry: one entry per recipe node `type`. A later block is one more entry.
//
// Entry fields:
//   params   expr parameters and their defaults; each is also readable as `<id>.<param>`
//   in       'one' (one node id) or 'list' (an array of ids, with optional per-input `gains`)
//   sync     true: an optional `sync` names a trigger node that restarts the phase
//   trigger  true: the output is a trigger train (1 at a firing, else 0), so the node takes no
//            `gain` and no `env`; any trigger node can drive an `env` or a `sync`
//   control  true: the node only publishes `fields`; its output is silent, it takes no `gain` and no `env`
//   options  other keys the block reads (not exprs), checked by `check`
//   check    (node, report(path, message)) validates the block's non-expr options
//   fields   (node) -> extra `<id>.<field>` names the block publishes
//   create   (node, { sampleRate, rng }) -> { process(p, io, out), fields? }
//            p: a Float64Array of the evaluated `params` in the order listed, then the `gains`;
//            io: { in, sync } buffers; out: Float32Array to fill; fields: a Float64Array of the
//            values of the `fields` names, in their order.
//            process() runs on an audio thread and allocates nothing: a block keeps its state in
//            a typed array, since a number stored in a closure variable is boxed on every write.
//            An optional fire(strength) makes the node a game event named by its id: the
//            instance's trigger(id, strength) calls it, from an audio thread too, so it allocates nothing.

const TAU = 2 * Math.PI;
const WAVES = ['sine', 'saw'];
const isRange = (r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite) && r[0] <= r[1];
/** Most notes one `sequence` run may have, and most `variants` one `sequence` may have. */
const MAX_NOTES = 64, MAX_VARIANTS = 16;
const VARIANT_KEYS = ['weight', 'count', 'first', 'rest', 'gap'];

/** Checks a `sequence` node's `variants: [{ weight, count, first, rest, gap }]`. */
function checkVariants(node, report) {
  if (!Array.isArray(node.variants) || node.variants.length === 0 || node.variants.length > MAX_VARIANTS) {
    return report('variants', `must be an array of 1 to ${MAX_VARIANTS} variants { weight, count, first, rest, gap }`);
  }
  let total = 0;
  node.variants.forEach((v, j) => {
    const at = `variants[${j}]`;
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return report(at, 'must be an object { weight, count, first, rest, gap }');
    for (const key of Object.keys(v)) if (!VARIANT_KEYS.includes(key)) report(`${at}.${key}`, `unknown key (known: ${VARIANT_KEYS.join(', ')})`);
    const weight = v.weight === undefined ? 1 : v.weight;
    if (!(Number.isFinite(weight) && weight >= 0)) report(`${at}.weight`, 'must be a number >= 0');
    else total += weight;
    if (!(isRange(v.count) && v.count.every(Number.isInteger) && v.count[0] >= 1 && v.count[1] <= MAX_NOTES)) report(`${at}.count`, `must be [low, high] notes, two whole numbers with 1 <= low <= high <= ${MAX_NOTES}`);
    if (v.first === undefined) report(`${at}.first`, 'is required: [low, high] seconds, the first note\'s length');
    for (const key of ['first', 'rest', 'gap']) {
      if (v[key] !== undefined && !(isRange(v[key]) && v[key][0] >= 0)) report(`${at}.${key}`, 'must be [low, high] seconds, two numbers with 0 <= low <= high');
    }
  });
  if (!(total > 0 && Number.isFinite(total))) report('variants', 'needs a total weight above 0');
}

/** Checks a trigger block's `hold: { name: [lo, hi] }`, whose names must not clash with its `params`. */
function checkHold(node, report, params) {
  if (node.hold === undefined) return;
  if (typeof node.hold !== 'object' || node.hold === null || Array.isArray(node.hold)) return report('hold', 'must be an object of name: [low, high]');
  for (const [name, range] of Object.entries(node.hold)) {
    if (!/^[A-Za-z_]\w*$/.test(name)) report(`hold.${name}`, 'is not a valid name');
    else if (Object.hasOwn(params, name)) report(`hold.${name}`, 'clashes with a parameter name');
    if (!isRange(range)) report(`hold.${name}`, 'must be [low, high], two numbers with low <= high');
  }
}

export const BLOCKS = Object.freeze({
  noise: {
    params: {},
    create: (node, { rng }) => ({
      process(p, io, out) { for (let i = 0; i < out.length; i++) out[i] = rng.next(); },
    }),
  },

  osc: {
    params: { freq: 440 },
    sync: true,
    options: ['wave'],
    check(node, report) {
      if (node.wave !== undefined && !WAVES.includes(node.wave)) report('wave', `must be one of ${WAVES.join(', ')}`);
    },
    create(node, { sampleRate }) {
      const saw = node.wave === 'saw';
      const state = new Float64Array(1);  // [phase]
      return {
        process(p, io, out) {
          const step = p[0] / sampleRate;  // p: [freq]
          let phase = state[0];
          for (let i = 0; i < out.length; i++) {
            if (io.sync && io.sync[i] > 0) phase = 0;
            phase += step;
            phase -= Math.floor(phase);
            out[i] = saw ? 2 * phase - 1 : Math.sin(TAU * phase);
          }
          state[0] = phase;
        },
      };
    },
  },

  lowpass: {  // one pole, as Leeway's `Lowpass`
    params: { cutoff: 1000 },
    in: 'one',
    create(node, { sampleRate }) {
      const state = new Float64Array(1);
      return {
        process(p, io, out) {
          const k = 1 - Math.exp(-TAU * Math.max(p[0], 0) / sampleRate);
          let y = state[0];
          for (let i = 0; i < out.length; i++) out[i] = y += (io.in[i] - y) * k;
          state[0] = y;
        },
      };
    },
  },

  bandpass: {  // Chamberlin state-variable filter, as Leeway's `Bandpass`; damping 2 is wide, 0.2 sharp
    params: { freq: 1000, damping: 1 },
    in: 'one',
    create(node, { sampleRate }) {
      const state = new Float64Array(2);  // [low, band]
      return {
        process(p, io, out) {
          let low = state[0], band = state[1];
          const f = 2 * Math.sin(Math.PI * Math.min(Math.max(p[0], 0), sampleRate / 6) / sampleRate);
          // Stable only while f^2 + 2 f q < 4 (its update matrix): cap the damping just inside that.
          const q = Math.min(Math.max(p[1], 0.01), 2, 0.8 * (4 - f * f) / (2 * f));
          for (let i = 0; i < out.length; i++) {
            low += f * band;
            band += f * (io.in[i] - low - q * band);
            out[i] = band;
          }
          state[0] = low;
          state[1] = band;
        },
      };
    },
  },

  shape: {  // tanh saturation: soft-clips into (-1, 1)
    params: { drive: 1 },
    in: 'one',
    create: () => ({
      process(p, io, out) { for (let i = 0; i < out.length; i++) out[i] = Math.tanh(p[0] * io.in[i]); },
    }),
  },

  mix: {
    params: {},
    in: 'list',
    create: () => ({
      process(p, io, out) {
        out.fill(0);
        for (let j = 0; j < io.in.length; j++) {
          const input = io.in[j], g = p[j];  // p: the gains
          for (let i = 0; i < out.length; i++) out[i] += g * input[i];
        }
      },
    }),
  },

  pulse: {  // a train of one-sample triggers (1, else 0); per pulse: period jitter and `hold` values
    params: { hz: 1, jitter: 0 },
    trigger: true,
    options: ['hold'],
    check: (node, report) => checkHold(node, report, BLOCKS.pulse.params),
    fields: (node) => Object.keys(node.hold ?? {}),
    create(node, { sampleRate, rng }) {
      const ranges = Object.values(node.hold ?? {}), lows = ranges.map((r) => r[0]), highs = ranges.map((r) => r[1]);
      const fields = Float64Array.from(highs);  // in the order of `fields(node)`
      const state = new Float64Array(1);  // [phase]
      return {
        fields,
        process(p, io, out) {
          const step = Math.min(Math.max(p[0], 0) / sampleRate, 0.5), jitter = Math.min(Math.max(p[1], 0), 0.5);  // p: [hz, jitter]
          let phase = state[0];
          for (let i = 0; i < out.length; i++) {
            phase += step;
            out[i] = 0;
            if (phase < 1) continue;
            phase -= 1 + jitter * rng.next();
            out[i] = 1;
            for (let j = 0; j < fields.length; j++) { const u = rng.unit(); fields[j] = lows[j] * (1 - u) + highs[j] * u; }  // high - low may overflow
          }
          state[0] = phase;
        },
      };
    },
  },

  randomTrigger: {  // events at random intervals, as Leeway's city horns and ferry; per event: `hold` values and `repeat` firings
    params: { spacing: 0.25 },
    trigger: true,
    options: ['every', 'first', 'repeat', 'hold'],
    check(node, report) {
      for (const key of ['every', 'first']) {
        if (node[key] !== undefined && !(isRange(node[key]) && node[key][0] >= 0)) report(key, 'must be [low, high] seconds, two numbers with 0 <= low <= high');
      }
      if (node.repeat !== undefined && !(isRange(node.repeat) && node.repeat.every(Number.isInteger) && node.repeat[0] >= 1)) report('repeat', 'must be [low, high], two whole numbers with 1 <= low <= high');
      checkHold(node, report, BLOCKS.randomTrigger.params);
    },
    fields: (node) => Object.keys(node.hold ?? {}),
    create(node, { sampleRate, rng }) {
      const ranges = Object.values(node.hold ?? {}), lows = ranges.map((r) => r[0]), highs = ranges.map((r) => r[1]);
      const [soonest, latest] = node.every ?? [1, 4], [fewest, most] = node.repeat ?? [1, 1], first = node.first ?? [soonest, latest];
      const fields = Float64Array.from(highs);  // in the order of `fields(node)`
      const dt = 1 / sampleRate, u = rng.unit();
      const state = Float64Array.of(first[0] * (1 - u) + first[1] * u, 0, 0);  // [seconds until the next event, firings left in it, seconds since the last firing]
      return {
        fields,
        process(p, io, out) {  // p: [spacing], seconds between the firings of one event
          for (let i = 0; i < out.length; i++) {
            out[i] = 0;
            if (state[1] > 0) {  // an event's repeat; the wait for the next event starts after its last firing
              if ((state[2] += dt) < p[0]) continue;
              state[1]--;
            } else {
              if ((state[0] -= dt) > 0) continue;
              for (let j = 0; j < fields.length; j++) { const v = rng.unit(); fields[j] = lows[j] * (1 - v) + highs[j] * v; }  // high - low may overflow
              state[1] = fewest + Math.floor(rng.unit() * (most - fewest + 1)) - 1;  // unit() < 1, so at most `most` firings
              const w = rng.unit();
              state[0] = soonest * (1 - w) + latest * w;
            }
            state[2] = 0;
            out[i] = 1;
          }
        },
      };
    },
  },

  trigger: {  // a game event, as Leeway's HullImpact.hit: fires when the game calls instance.trigger(<id>, strength)
    params: {},
    trigger: true,
    options: ['range', 'maxHold'],
    check(node, report) {
      if (node.range !== undefined && !isRange(node.range)) report('range', 'must be [low, high], two numbers with low <= high');
      if (node.maxHold !== undefined && !(Number.isFinite(node.maxHold) && node.maxHold >= 0)) report('maxHold', 'must be seconds, a number >= 0');
    },
    fields: () => ['strength'],
    create(node, { sampleRate }) {
      const [lo, hi] = node.range ?? [0, 1], maxHold = node.maxHold ?? 0;
      const fields = Float64Array.of(lo);  // [strength]
      const state = Float64Array.of(0, 0, Infinity);  // [1 if an event is pending, its strength, seconds since the last firing]
      return {
        fields,
        fire(strength) {  // two events before the next control block: the stronger one
          const s = Math.min(Math.max(strength, lo), hi);
          state[1] = state[0] ? Math.max(state[1], s) : s;
          state[0] = 1;
        },
        process(p, io, out) {  // the pending event fires at the first sample of the block
          out.fill(0);
          if (state[0]) {
            out[0] = 1;
            // Leeway's max-hold: an event within maxHold seconds of the last keeps the stronger strength.
            fields[0] = state[2] <= maxHold ? Math.max(fields[0], state[1]) : state[1];
            state[0] = 0;
            state[2] = 0;
          }
          state[2] += out.length / sampleRate;
        },
      };
    },
  },

  sequence: {  // a run of notes started by each firing of `sync`, as Leeway's GullCall: one trigger per note start
    params: {},
    trigger: true,
    sync: true,
    options: ['variants'],
    check(node, report) {
      if (node.sync === undefined) report('sync', 'is required: the trigger node whose firings start a run');
      checkVariants(node, report);
    },
    fields: () => ['choice', 'index', 'length', 'phase'],
    create(node, { sampleRate, rng }) {
      // Per variant, 8 numbers: count lo, hi; first lo, hi; rest lo, hi; gap lo, hi. Then the running total of the weights.
      const n = node.variants.length, table = new Float64Array(8 * n), cumulative = new Float64Array(n);
      let total = 0, last = 0;  // last: the last variant with a weight above 0, so a weight-0 one is never picked, even when unit() * total rounds up to total
      node.variants.forEach((v, j) => {
        table.set([...v.count, ...v.first, ...(v.rest ?? v.first), ...(v.gap ?? [0, 0])], 8 * j);
        cumulative[j] = total += v.weight ?? 1;
        if (v.weight !== 0) last = j;
      });
      const draw = (at) => { const u = rng.unit(); return table[at] * (1 - u) + table[at + 1] * u; };  // not lo + (hi - lo) * u: hi - lo may overflow
      const fields = new Float64Array(4);  // [choice: the variant index, index: the note from 0, length: its seconds, phase: time in it / length, at most 1]
      const state = Float64Array.of(0, -1, 0);  // [notes left after this one, seconds since this note's start (-1: no run), this note's gap]
      const dt = 1 / sampleRate;
      return {
        fields,
        process(p, io, out) {
          for (let i = 0; i < out.length; i++) {
            out[i] = 0;
            if (io.sync[i] > 0) {  // a firing starts a new run, also in the middle of one
              const w = rng.unit() * total;
              let k = 0;
              while (k < last && w >= cumulative[k]) k++;
              const at = 8 * k;
              state[0] = table[at] + Math.floor(rng.unit() * (table[at + 1] - table[at] + 1)) - 1;  // unit() < 1, so at most `high` notes
              fields[0] = k;
              fields[1] = 0;
              fields[2] = draw(at + 2);
            } else {
              if (state[1] < 0 || (state[1] += dt) < fields[2] + state[2]) continue;
              if (state[0] <= 0) { state[1] = -1; continue; }
              state[0]--;
              fields[1]++;
              fields[2] = draw(8 * fields[0] + 4);
            }
            state[2] = draw(8 * fields[0] + 6);
            state[1] = 0;
            out[i] = 1;
          }
          fields[3] = state[1] < 0 || fields[2] <= state[1] ? 1 : state[1] / fields[2];
        },
      };
    },
  },

  lfo: {  // a slow sine read by other nodes' exprs, as Leeway's hull-water swell; control rate
    params: { rate: 1 },
    control: true,
    options: ['harmonic'],
    check(node, report) {
      if (node.harmonic !== undefined && !(Number.isInteger(node.harmonic) && node.harmonic >= 1)) report('harmonic', 'must be a whole number from 1 up');
    },
    fields: (node) => (node.harmonic === undefined ? ['value'] : ['value', 'harmonic']),
    create(node, { sampleRate }) {
      const n = node.harmonic ?? 0;
      const fields = new Float64Array(n ? 2 : 1);  // [sin(phase), sin(n * phase)]
      const state = new Float64Array(1);  // [phase, in cycles]
      return {
        fields,
        process(p, io, out) {  // p: [rate]
          const phase = state[0];
          fields[0] = Math.sin(TAU * phase);
          if (n) fields[1] = Math.sin(TAU * n * phase);
          state[0] = phase + p[0] * out.length / sampleRate;
          state[0] -= Math.floor(state[0]);
        },
      };
    },
  },

  randomWalk: {  // a level that heads for a new random target every `every` seconds, as Leeway's city traffic; control rate
    params: { slew: 1 },
    control: true,
    options: ['range', 'every'],
    check(node, report) {
      if (node.range !== undefined && !isRange(node.range)) report('range', 'must be [low, high], two numbers with low <= high');
      if (node.every !== undefined && !(isRange(node.every) && node.every[0] >= 0)) report('every', 'must be [low, high] seconds, two numbers with 0 <= low <= high');
    },
    fields: () => ['value'],
    create(node, { sampleRate, rng }) {
      const [lo, hi] = node.range ?? [0, 1], [soonest, latest] = node.every ?? [1, 4];
      const fields = Float64Array.of(lo / 2 + hi / 2);  // [value]; starts mid-range. Halves first: lo + hi may overflow
      const state = Float64Array.of(fields[0], 0);  // [target, seconds until the next target]
      return {
        fields,
        process(p, io, out) {  // p: [slew], the smoothing time constant in seconds
          const dt = out.length / sampleRate;
          if ((state[1] -= dt) <= 0) {
            const u = rng.unit();
            state[0] = lo * (1 - u) + hi * u;  // not lo + (hi - lo) * u: hi - lo may overflow
            state[1] = soonest + (latest - soonest) * rng.unit();
          }
          const k = p[0] > 0 ? 1 - Math.exp(-dt / p[0]) : 1;
          fields[0] = fields[0] * (1 - k) + state[0] * k;  // not value + (target - value) * k: target - value may overflow
        },
      };
    },
  },
});
