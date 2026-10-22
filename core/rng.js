/**
 * Seeded xorshift32, the same generator as Leeway's `Noise` (engine/audio/voices.hpp).
 * `next()` is uniform in [-1, 1), `unit()` in [0, 1). A seed of 0 is read as 1.
 */
export function createRng(seed) {
  const state = Uint32Array.of((seed >>> 0) || 1);  // a typed array: a closure variable would box each value
  const next = () => {
    let x = state[0];
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state[0] = x;
    return (state[0] >>> 8) / (1 << 23) - 1;
  };
  return { next, unit: () => 0.5 * (next() + 1) };
}
