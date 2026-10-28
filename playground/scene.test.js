import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_SIZE, clampToScene, pointerToScene, placement, pannerPosition } from './scene.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const rect = { left: 10, top: 20, width: 400, height: 400 };  // 4 px per metre

test('the scene is 100 m across', () => assert.equal(SCENE_SIZE, 100));

test('the source at the listener has gain 1 and pan 0', () => {
  assert.deepEqual(placement({ x: 0, y: 0 }, 25, 0.8), { distance: 0, gain: 1, pan: 0 });
});

test('inside the reference distance the gain stays 1', () => {
  near(placement({ x: 3, y: 4 }, 25, 0.8).gain, 1);
});

test('at twice the reference with rolloff 1 the gain is 0.5', () => {
  const { distance, gain } = placement({ x: 0, y: 50 }, 25, 1);
  near(distance, 50);
  near(gain, 0.5);
});

test('rolloff 0.8 at twice the reference follows pow(1/2, 0.8)', () => {
  near(placement({ x: -30, y: -40 }, 25, 0.8).gain, 0.5 ** 0.8);
});

test('pan is the sine of the angle from straight ahead', () => {
  near(placement({ x: 10, y: 0 }, 25, 0.8).pan, 1);
  near(placement({ x: -10, y: 0 }, 25, 0.8).pan, -1);
  near(placement({ x: 0, y: 10 }, 25, 0.8).pan, 0);
  near(placement({ x: 3, y: -4 }, 25, 0.8).pan, 0.6);  // behind and right: same pan as in front
});

test('the pointer at the box centre is the listener; up on screen is forward', () => {
  assert.deepEqual(pointerToScene(210, 220, rect), { x: 0, y: 0 });
  const { x, y } = pointerToScene(250, 180, rect);
  near(x, 10);
  near(y, 10);
  assert.deepEqual(pointerToScene(10, 420, rect), { x: -50, y: -50 });
});

test('a pointer outside the box is clamped to the scene edge', () => {
  assert.deepEqual(pointerToScene(900, -300, rect), { x: 50, y: 50 });
  assert.deepEqual(pointerToScene(-5, 1000, rect), { x: -50, y: -50 });
});

test('clamping keeps inner points and maps a non-finite coordinate to 0', () => {
  assert.deepEqual(clampToScene({ x: 12.5, y: -7 }), { x: 12.5, y: -7 });
  assert.deepEqual(clampToScene({ x: 51, y: -60 }), { x: 50, y: -50 });
  assert.deepEqual(clampToScene({ x: NaN, y: Infinity }), { x: 0, y: 0 });
});

test('scene forward is panner -z, scene right is panner +x', () => {
  assert.deepEqual(pannerPosition({ x: 3, y: 4 }), { x: 3, y: 0, z: -4 });
});
