import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, wavSeconds, wavFileName, WAV_SECONDS } from './wav.js';

const ascii = (bytes, offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const samplesOf = (bytes) => Array.from({ length: (bytes.length - 44) / 2 }, (_, i) => view(bytes).getInt16(44 + i * 2, true));

test('the header is a mono 16-bit PCM RIFF/WAVE header, field by field', () => {
  const bytes = encodeWav(new Float32Array(3), 48000);
  const v = view(bytes);
  assert.equal(ascii(bytes, 0, 4), 'RIFF');
  assert.equal(v.getUint32(4, true), 36 + 6);
  assert.equal(ascii(bytes, 8, 4), 'WAVE');
  assert.equal(ascii(bytes, 12, 4), 'fmt ');
  assert.equal(v.getUint32(16, true), 16);
  assert.equal(v.getUint16(20, true), 1, 'format: PCM');
  assert.equal(v.getUint16(22, true), 1, 'channels');
  assert.equal(v.getUint32(24, true), 48000, 'sample rate');
  assert.equal(v.getUint32(28, true), 96000, 'bytes per second');
  assert.equal(v.getUint16(32, true), 2, 'block align');
  assert.equal(v.getUint16(34, true), 16, 'bits per sample');
  assert.equal(ascii(bytes, 36, 4), 'data');
  assert.equal(v.getUint32(40, true), 6, 'data bytes');
});

test('the file is 44 bytes plus 2 per sample, for a known count, an odd count and an empty input', () => {
  assert.equal(encodeWav(new Float32Array(48000), 48000).length, 44 + 96000);
  const odd = encodeWav(new Float32Array(7), 44100);
  assert.equal(odd.length, 44 + 14);
  assert.equal(view(odd).getUint32(4, true), 36 + 14);
  assert.equal(view(odd).getUint32(24, true), 44100);
  const empty = encodeWav(new Float32Array(0), 48000);
  assert.equal(empty.length, 44);
  assert.equal(view(empty).getUint32(4, true), 36);
  assert.equal(view(empty).getUint32(40, true), 0);
});

test('samples scale by 32767 with rounding and clamp to [-1, 1]', () => {
  const bytes = encodeWav([0, 1, -1, 0.5, -0.5, 2, -2, Infinity, -Infinity], 48000);
  assert.deepEqual(samplesOf(bytes), [0, 32767, -32767, 16384, -16383, 32767, -32767, 32767, -32767]);
});

test('NaN is written as 0', () => {
  assert.deepEqual(samplesOf(encodeWav(new Float32Array([NaN, 0.25, NaN]), 48000)), [0, 8192, 0]);
});

test('a sample rate that is not a whole number above 0 throws', () => {
  for (const rate of [0, -1, 44100.5, NaN, undefined]) assert.throws(() => encodeWav([], rate));
});

test('wavSeconds clamps the field and falls back to the default', () => {
  assert.equal(wavSeconds('3'), 3);
  assert.equal(wavSeconds('0.1'), WAV_SECONDS.min);
  assert.equal(wavSeconds('-4'), WAV_SECONDS.min);
  assert.equal(wavSeconds('120'), WAV_SECONDS.max);
  assert.equal(wavSeconds(''), WAV_SECONDS.default);
  assert.equal(wavSeconds('abc'), WAV_SECONDS.default);
  assert.equal(wavSeconds('Infinity'), WAV_SECONDS.max);
});

test('wavFileName keeps letters, digits, - and _, caps the length and falls back to recipe', () => {
  assert.equal(wavFileName('ui_click'), 'ui_click.wav');
  assert.equal(wavFileName('Big Boom-2!'), 'BigBoom-2.wav');
  assert.equal(wavFileName('../../etc/passwd'), 'etcpasswd.wav');
  assert.equal(wavFileName('çğü'), 'recipe.wav');
  assert.equal(wavFileName(''), 'recipe.wav');
  assert.equal(wavFileName(undefined), 'recipe.wav');
  assert.equal(wavFileName('a'.repeat(100)), `${'a'.repeat(64)}.wav`);
});
