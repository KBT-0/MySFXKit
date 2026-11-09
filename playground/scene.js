// The 2D listener scene: a square seen from above, the listener fixed at its centre facing up.
// Points are in metres: x to the right, y forward (up on the screen). Pure: no DOM, no audio.

/** Width and height of the square scene in metres; the listener stands at its centre. */
export const SCENE_SIZE = 100;
const HALF = SCENE_SIZE / 2;

const clamp = (v) => (Number.isFinite(v) ? Math.min(HALF, Math.max(-HALF, v)) : 0);

/** The point moved inside the scene's square; a non-finite coordinate becomes 0. */
export function clampToScene({ x, y }) {
  return { x: clamp(x), y: clamp(y) };
}

/**
 * The scene point under a pointer at (`clientX`, `clientY`) over a box `rect` (a DOMRect: `left`,
 * `top`, `width`, `height` in pixels) that shows the whole scene, clamped to the scene.
 */
export function pointerToScene(clientX, clientY, rect) {
  return clampToScene({
    x: ((clientX - rect.left) / rect.width - 0.5) * SCENE_SIZE,
    y: (0.5 - (clientY - rect.top) / rect.height) * SCENE_SIZE,
  });
}

/**
 * Leeway's placement (`soundscape.hpp`, `place`) of a source at `point`: `distance` in metres,
 * `gain = pow(reference / max(reference, distance), rolloff)` and `pan` in [-1, 1], the sine of
 * the source's angle from straight ahead (-1 left, 1 right, 0 at the listener).
 */
export function placement({ x, y }, reference, rolloff) {
  const distance = Math.hypot(x, y);
  const gain = (reference / Math.max(reference, distance)) ** rolloff;
  const pan = distance > 1e-3 ? Math.min(1, Math.max(-1, x / distance)) : 0;
  return { distance, gain, pan };
}

/**
 * The Web Audio `PannerNode` position of a scene point, for a listener at the origin with the
 * default orientation (facing -z, up +y): scene x is panner x, scene forward is panner -z.
 */
export function pannerPosition({ x, y }) {
  return { x, y: 0, z: -y };
}

/** Time constant in seconds of the scene's glides (panner position and level): a drag or a slider move does not step the level. */
export const SCENE_GLIDE = 0.02;

/**
 * `PannerNode` options for the scene: an equal-power pan with no distance attenuation (the
 * exponential model with rolloff 0 has gain 1 at every distance). The level comes from
 * `placement` through a `GainNode` after the panner, whose gain glides: the panner's
 * `refDistance` and `rolloffFactor` are plain attributes, so changing them would step the level.
 */
export const SCENE_PANNER = Object.freeze({
  panningModel: 'equalpower', distanceModel: 'exponential', refDistance: 1, rolloffFactor: 0, maxDistance: 10000,
});
