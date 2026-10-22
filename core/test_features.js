// Measured features of a rendered buffer, for the feature tests (assert on these, never on samples).

export const rms = (b, from = 0, to = b.length) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += b[i] * b[i];
  return Math.sqrt(sum / Math.max(to - from, 1));
};

export const peak = (b) => b.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

export const hasNaN = (b) => b.some(Number.isNaN);

/**
 * Onset times (seconds) of a pulsed sound: its loudness (mean |x| over 20 ms, every 1 ms)
 * crossing half its maximum upward, at least `gap` seconds after the previous onset.
 */
export function onsets(b, sampleRate, gap = 0.06) {
  const hop = Math.round(sampleRate / 1000), win = 20 * hop, env = [];
  for (let i = 0; i + win <= b.length; i += hop) {
    let a = 0;
    for (let j = i; j < i + win; j++) a += Math.abs(b[j]);
    env.push(a / win);
  }
  const threshold = 0.5 * Math.max(...env), times = [];
  for (let k = 1; k < env.length; k++) {
    const t = k / 1000;
    if (env[k] >= threshold && env[k - 1] < threshold && (!times.length || t - times.at(-1) >= gap)) times.push(t);
  }
  return times;
}

/** Pulses per second from the mean interval between onsets. */
export function pulseRate(b, sampleRate) {
  const t = onsets(b, sampleRate);
  return t.length < 2 ? 0 : (t.length - 1) / (t.at(-1) - t[0]);
}
