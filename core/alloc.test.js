import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { compileRecipe } from './index.js';

const RATE = 48000;
const BUDGET = 32 * 1024;  // bytes over 3750 blocks: one 16-byte boxed number per block (60 KB) exceeds it
const CORE = new URL('.', import.meta.url).href;
const load = (name) => JSON.parse(readFileSync(new URL(`./recipes/${name}.json`, import.meta.url), 'utf8'));
const diesel = load('diesel');
// The blocks the diesel does not use: a saw osc, a bandpass and a lowpass of it.
const others = {
  name: 'others', version: 0, seed: 5,
  nodes: [
    { id: 'saw', type: 'osc', wave: 'saw', freq: 110 },
    { id: 'band', type: 'bandpass', in: 'saw', freq: 'max(400, 300, 200)', damping: 0.5 },
    { id: 'out', type: 'lowpass', in: 'band', cutoff: 2000 },
  ],
};

// Bytes allocated by core code while `work` runs, from V8's sampling heap profiler: a sample every
// 64 bytes on average, short-lived objects included. v8.getHeapStatistics() is no use here: two
// calls in a row differ by about 100 KB of the runtime's own allocations.
async function coreAllocations(work) {
  const session = new Session();
  session.connect();
  try {
    await session.post('HeapProfiler.startSampling', {
      samplingInterval: 64, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true,
    });
    work();
    const { profile } = await session.post('HeapProfiler.stopSampling');
    const sum = (node, inCore) => {
      const here = inCore || node.callFrame.url.startsWith(CORE);
      return (here ? node.selfSize : 0) + node.children.reduce((total, child) => total + sum(child, here), 0);
    };
    return sum(profile.head, false);
  } finally {
    session.disconnect();
  }
}

for (const [name, recipe, inputs] of [['diesel', diesel, { throttle: 0.5 }], ['others', others, {}], ['hull_water', load('hull_water'), { speed: 0.5 }], ['city_bed', load('city_bed'), {}], ['horn', load('horn'), {}], ['ferry', load('ferry'), {}]]) test(`${name}: render allocates nothing per control block once optimized (an AudioWorklet calls it every 128 frames)`, async () => {
  const instance = compileRecipe(recipe, { sampleRate: RATE });
  for (const [input, value] of Object.entries(inputs)) instance.setInput(input, value);
  const out = new Float32Array(128);
  const renderSeconds = (seconds) => { for (let i = 0; i < seconds * RATE / out.length; i++) instance.render(out); };
  renderSeconds(5);  // warm up: the JIT optimizes the hot path, again for a second recipe in this process
  // The smaller of two runs: the first may still run code the JIT has not optimized yet.
  const least = Math.min(await coreAllocations(() => renderSeconds(10)), await coreAllocations(() => renderSeconds(10)));
  assert.ok(least < BUDGET, `${least} bytes allocated over 10 s (3750 blocks); budget ${BUDGET}`);
});
