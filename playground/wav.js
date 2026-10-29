// The WAV export of the playground: mono 16-bit PCM files and the choices around them. Pure, no DOM.

/** The sample rate the playground renders a WAV at, in Hz. */
export const WAV_SAMPLE_RATE = 48000;
/** The duration field: its default and its limits, in seconds. */
export const WAV_SECONDS = { default: 5, min: 0.5, max: 30 };
/** When a WAV fires each game event, in seconds from its start. */
export const WAV_EVENT_AT = 0.25;

const HEADER_BYTES = 44;

/**
 * Encodes `samples` (numbers, nominally -1..1) as a mono 16-bit PCM WAV file at `sampleRate` Hz.
 * Each sample is clamped to [-1, 1] and scaled by 32767 with rounding, so +1 is 32767 and -1 is
 * -32767 (-32768 is never written); NaN is written as 0. Returns the file as a Uint8Array.
 */
export function encodeWav(samples, sampleRate) {
  if (!(Number.isInteger(sampleRate) && sampleRate > 0)) throw new Error('encodeWav needs a whole sampleRate > 0');
  const dataBytes = samples.length * 2;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const ascii = (offset, text) => { for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i); };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);  // the RIFF chunk: everything after these 8 bytes
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);              // fmt chunk size for PCM
  view.setUint16(20, 1, true);               // format 1: integer PCM
  view.setUint16(22, 1, true);               // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);  // bytes per second
  view.setUint16(32, 2, true);               // bytes per sample frame
  view.setUint16(34, 16, true);              // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const clamped = Number.isNaN(x) ? 0 : Math.min(1, Math.max(-1, x));
    view.setInt16(HEADER_BYTES + i * 2, Math.round(clamped * 32767), true);
  }
  return bytes;
}

/**
 * The duration field's text as seconds: a number clamped to `WAV_SECONDS.min..max`; empty or not
 * a number gives `WAV_SECONDS.default`.
 */
export function wavSeconds(text) {
  const seconds = String(text).trim() === '' ? NaN : Number(text);
  if (Number.isNaN(seconds)) return WAV_SECONDS.default;
  return Math.min(WAV_SECONDS.max, Math.max(WAV_SECONDS.min, seconds));
}

/**
 * A download file name for a recipe `name`: only letters, digits, `-` and `_` are kept, at most
 * 64 of them; nothing left (or no string) gives `recipe`. The `.wav` extension is appended.
 */
export function wavFileName(name) {
  const safe = (typeof name === 'string' ? name : '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return `${safe || 'recipe'}.wav`;
}
