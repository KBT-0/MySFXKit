// The block registry: one entry per recipe node `type`. A later block is one more entry.
//
// Entry fields:
//   params   expr parameters and their defaults; each is also readable as `<id>.<param>`
//   in       'one' (one node id) or 'list' (an array of ids, with optional per-input `gains`)
//   sync     true: an optional `sync` names a pulse node that restarts the phase
//   trigger  true: the output is a trigger train, so the node takes no `gain` and no `env`
//   options  other keys the block reads (not exprs), checked by `check`
//   check    (node, report(path, message)) validates the block's non-expr options
//   fields   (node) -> extra `<id>.<field>` names the block publishes
//   create   (node, { sampleRate, rng }) -> { process(p, io, out), fields? }
//            p: evaluated params; io: { in, sync } buffers; out: Float32Array to fill.

const TAU = 2 * Math.PI;
const WAVES = ['sine', 'saw'];

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
      let phase = 0;
      return {
        process(p, io, out) {
          const step = p.freq / sampleRate;
          for (let i = 0; i < out.length; i++) {
            if (io.sync && io.sync[i] > 0) phase = 0;
            phase += step;
            phase -= Math.floor(phase);
            out[i] = saw ? 2 * phase - 1 : Math.sin(TAU * phase);
          }
        },
      };
    },
  },

  lowpass: {  // one pole, as Leeway's `Lowpass`
    params: { cutoff: 1000 },
    in: 'one',
    create(node, { sampleRate }) {
      let state = 0;
      return {
        process(p, io, out) {
          const k = 1 - Math.exp(-TAU * Math.max(p.cutoff, 0) / sampleRate);
          for (let i = 0; i < out.length; i++) out[i] = state += (io.in[i] - state) * k;
        },
      };
    },
  },

  bandpass: {  // Chamberlin state-variable filter, as Leeway's `Bandpass`; damping 2 is wide, 0.2 sharp
    params: { freq: 1000, damping: 1 },
    in: 'one',
    create(node, { sampleRate }) {
      let low = 0, band = 0;
      return {
        process(p, io, out) {
          const f = 2 * Math.sin(Math.PI * Math.min(Math.max(p.freq, 0), sampleRate / 6) / sampleRate);
          // Stable only while f^2 + 2 f q < 4 (its update matrix): cap the damping just inside that.
          const q = Math.min(Math.max(p.damping, 0.01), 2, 0.8 * (4 - f * f) / (2 * f));
          for (let i = 0; i < out.length; i++) {
            low += f * band;
            band += f * (io.in[i] - low - q * band);
            out[i] = band;
          }
        },
      };
    },
  },

  shape: {  // tanh saturation: soft-clips into (-1, 1)
    params: { drive: 1 },
    in: 'one',
    create: () => ({
      process(p, io, out) { for (let i = 0; i < out.length; i++) out[i] = Math.tanh(p.drive * io.in[i]); },
    }),
  },

  mix: {
    params: {},
    in: 'list',
    create: () => ({
      process(p, io, out) {
        out.fill(0);
        io.in.forEach((input, j) => {
          const g = p.gains[j];
          for (let i = 0; i < out.length; i++) out[i] += g * input[i];
        });
      },
    }),
  },

  pulse: {  // a train of one-sample triggers (1, else 0); per pulse: period jitter and `hold` values
    params: { hz: 1, jitter: 0 },
    trigger: true,
    options: ['hold'],
    check(node, report) {
      if (node.hold === undefined) return;
      if (typeof node.hold !== 'object' || node.hold === null || Array.isArray(node.hold)) return report('hold', 'must be an object of name: [low, high]');
      for (const [name, range] of Object.entries(node.hold)) {
        if (!/^[A-Za-z_]\w*$/.test(name)) report(`hold.${name}`, 'is not a valid name');
        else if (Object.hasOwn(BLOCKS.pulse.params, name)) report(`hold.${name}`, 'clashes with a parameter name');
        if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] > range[1]) report(`hold.${name}`, 'must be [low, high], two numbers with low <= high');
      }
    },
    fields: (node) => Object.keys(node.hold ?? {}),
    create(node, { sampleRate, rng }) {
      const holds = Object.entries(node.hold ?? {});
      const fields = Object.fromEntries(holds.map(([name, [, high]]) => [name, high]));
      let phase = 0;
      return {
        fields,
        process(p, io, out) {
          const step = Math.min(Math.max(p.hz, 0) / sampleRate, 0.5), jitter = Math.min(Math.max(p.jitter, 0), 0.5);
          for (let i = 0; i < out.length; i++) {
            phase += step;
            out[i] = 0;
            if (phase < 1) continue;
            phase -= 1 + jitter * rng.next();
            out[i] = 1;
            for (const [name, [low, high]] of holds) fields[name] = low + (high - low) * rng.unit();
          }
        },
      };
    },
  },
});
