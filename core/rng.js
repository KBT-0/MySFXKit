/**
 * Seeded xorshift32, the same generator as Leeway's `Noise` (engine/audio/voices.hpp).
 * `next()` is uniform in [-1, 1), `unit()` in [0, 1). A seed of 0 is read as 1.
 */
export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state >>> 8) / (1 << 23) - 1;
  };
  return { next, unit: () => 0.5 * (next() + 1) };
}
