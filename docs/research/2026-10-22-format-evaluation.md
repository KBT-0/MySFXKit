# Recipe format evaluation — brief §5.1 (A code / B declarative / C Faust)

Claude Code, Fable 5.1, 2026-10-22. Input: `docs/MySFXKit_brief.md`; Leeway's
`engine/audio/{voices,soundscape,sound_tuning}.hpp`, `game/client/taka_sound.txt`,
`tests/soundscape_test.cpp` (read-only). **The decision is Kemal's**; this file proposes.

**Not run:** the brief asks to have an LLM produce the same sound in A, B and C and compare
quality and error rate. No model was prompted here; the A/B/C samples below are hand-written
and the comparison is reasoned. A measured run is task SFX-7 in `docs/BACKLOG.md` (it needs
the schema first).

## 1. What the six Leeway sounds actually need

Each Leeway voice, reduced to the primitives it uses. "Expr" means a parameter that is an
arithmetic function of a game input, e.g. `cutoff = 300 + 1700 * speed`.

| Sound | DSP blocks | Control logic | Game inputs |
|---|---|---|---|
| Diesel | sine, seeded noise, 1-pole lowpass, exp decay, mix | **pulse train** whose rate glides to a target (slew); per pulse: period jitter ±3 %, random gain 0.85–1.0 (sample-and-hold); exprs on `load` for body pitch, decay, cutoff, mix | `throttle` → firing rate and load |
| HullWater | noise, 2 lowpass, LFO (0.13 Hz) with a 3× harmonic, `pow(speed, 1.3)` | none | `speed` |
| HullImpact | sine, noise, lowpass, 2 exp decays, hard stop at 1.2 s | **one-shot trigger** with strength, max-hold | `impact(strength)` event |
| GullCall | sawtooth, AM rasp (95 Hz), pitch jitter (noise → lowpass 30 Hz), 3 bandpass (two formants + breath), attack/release envelope | **note sequencer**: random call type (35 % laugh), 3–7 notes, first note long then 0.2–0.26 s, pitch × 0.965 per note, gap; piecewise pitch contour | `position` (3D), call rate per bird |
| CityNoise bed | noise, 2 lowpass, bandpass | **random walk**: new traffic target every 1.5–4 s, exponential smoothing | listener distance to each block |
| Horn | 2 sines, `tanh` waveshaper, lowpass, attack/release | **random scheduler**: every 5–18 s, 1 or 2 beeps, random pitch 380–470 Hz and length | none |
| Ferry | sawtooth, lowpass, attack/release | random scheduler: every 35–90 s, random pitch and length | none |
| Mixer (`Soundscape`) | inverse-distance gain `(ref/d)^rolloff`, equal-power pan, per-block gain glide, `tanh` master | listener height from zoom; city = saturating sum over buildings | positions, zoom |

Primitive count: 7 DSP block types (`noise`, `osc` sine/saw, `lowpass`, `bandpass`, `env`
exp/attack-release, `lfo`, `shape` tanh) plus `mix`/`gain`, 4 control block types (`pulse`,
`trigger`, `randomTrigger`, `sequence`) with sample-and-hold randomness, `slew`, and exprs.

## 2. The six sounds in format B

Sketch of a graph recipe. Nodes are a list; a parameter is a number, a game-input name, or an
expr string over inputs and node outputs. `seed` makes every render deterministic, as in
Leeway's tests.

```json
{ "name": "diesel", "version": 0, "seed": 7,
  "inputs": { "throttle": { "min": -1, "max": 1, "default": 0 } },
  "params": { "load": "abs(throttle)",
              "firing": { "slew": "4.5 + 8.5 * load", "rate": 1.2 } },
  "nodes": [
    { "id": "fire",  "type": "pulse", "hz": "firing", "jitter": 0.03,
      "hold": { "gain": [0.85, 1.0] } },
    { "id": "body",  "type": "osc", "wave": "sine", "freq": "52 + 18 * load",
      "env": { "trigger": "fire", "decay": "0.045 - 0.015 * load" } },
    { "id": "chuff", "type": "lowpass", "in": "noise", "cutoff": "500 + 1500 * load",
      "env": { "trigger": "fire", "decay": 0.025 } },
    { "id": "hum",   "type": "osc", "wave": "sine", "freq": "2 * firing", "gain": 0.08 },
    { "id": "out",   "type": "mix", "in": ["body", "chuff", "hum"],
      "gains": ["fire.gain * (0.5 + 0.5 * load)",
                "fire.gain * (0.5 + 0.5 * load) * (1.5 + 2 * load)", 1] } ] }
```

| Sound | Expressible in B? | What it needs beyond a plain graph |
|---|---|---|
| Diesel | yes | `pulse` with jitter and per-pulse hold; `slew`; exprs |
| HullWater | yes | `lfo` with harmonic; `pow` in exprs |
| HullImpact | yes | `trigger` input with a strength value; envelope with a hard stop |
| GullCall | **partly** | one note is a graph; the sequencer (call type, note count, first-note rule, pitch decay per note, contour) is a `sequence` block with per-note arrays and a random count. The "first note long, then short" rule and the 35 % laugh choice are two `sequence` variants chosen by a `choose` block, not arbitrary logic. Fidelity to Leeway's exact behaviour: close, not bit-identical |
| City bed | yes | `randomWalk` (target every a–b s, smoothing) |
| Horn / ferry | yes | `randomTrigger` (interval range, hold pitch/length/beeps) and a `repeat` count |
| 3D placement | **not a recipe concern** | the adapter does distance, pan and height; a recipe declares `spatial: { reference: 25, rolloff: 0.8 }` and takes `position`. Leeway's saturating city sum over buildings stays game code: it is an aggregation of sources, not a sound |

**Cannot be expressed in B, by design:** arbitrary control flow (a state machine with more
than "sequence / choose / random trigger"), new DSP algorithms (a block the schema does not
have), and anything per-sample that is not a block output. Those are the **escape hatch**: a
`custom` block implemented in the adapter's language, allowed only from the bundled library,
never from pasted text.

**Expr is the one risk of B.** An expr is a tiny expression language (numbers, inputs, node
outputs, `+ - * /`, `abs min max clamp pow exp sin`). It is parsed into an AST and evaluated
by the interpreter, never `eval`ed; a parser is about 80 lines in each language. Without
exprs, every mapping needs its own block (`lerp`, `pow`) and recipes get long and ugly for
an LLM to write. With exprs, the schema has one small "language" to teach, which is where
most LLM mistakes will concentrate. Error messages must name the node and the expr.

## 3. The same sound in A, B and C

Diesel, reduced to its core (pulse → body sine + filtered noise chuff), to compare the shape
of what an LLM must produce.

**A — code (JS, per-sample):**
```js
export function diesel({ throttle }, rng, rate) {
  let firing = 4.5, phase = 0, t = 1, gain = 1, lp = 0;
  return () => {
    const load = Math.abs(throttle()), target = 4.5 + 8.5 * load;
    firing += (target - firing) * (1 - Math.exp(-1.2 / rate));
    phase += firing / rate;
    if (phase >= 1) { phase -= 1 + 0.03 * rng(); t = 0; gain = 0.85 + 0.15 * rng(); }
    t += 1 / rate;
    const body = Math.sin(2 * Math.PI * (52 + 18 * load) * t) * Math.exp(-t / (0.045 - 0.015 * load));
    lp += (rng() - lp) * (1 - Math.exp(-2 * Math.PI * (500 + 1500 * load) / rate));
    return gain * (0.5 + 0.5 * load) * (body + (1.5 + 2 * load) * lp * Math.exp(-t / 0.025));
  };
}
```
**B — recipe:** the JSON in §2.

**C — Faust:**
```faust
import("stdfaust.lib");
throttle = hslider("throttle", 0, -1, 1, 0.01);
load = abs(throttle);
firing = (4.5 + 8.5 * load) : si.smooth(ba.tau2pole(1 / 1.2));
fire = ba.pulsen(1, ma.SR / firing);            // no jitter, no per-pulse gain: needs more
body = os.osc(52 + 18 * load) * en.ar(0.001, 0.045 - 0.015 * load, fire);
chuff = no.noise : fi.lowpass(1, 500 + 1500 * load) : *(en.ar(0.001, 0.025, fire));
process = (0.5 + 0.5 * load) * (body + (1.5 + 2 * load) * chuff);
```

| Criterion | A — code | B — recipe | C — Faust |
|---|---|---|---|
| LLM writability | best: JS is the most-trained language; a sample loop is idiomatic | good: JSON with a schema in the prompt; models emit valid JSON reliably; mistakes concentrate in exprs and in unknown block names, both caught by validation with a named error | weakest: little training data; `ba.`/`en.` library names and the block-diagram algebra are easy to get wrong; compile errors are cryptic to a design student |
| Safety on a public static site | pasted code must run: `new Function` or a Blob-URL AudioWorklet module. The real harm is small (no credentials, the user runs code they pasted themselves) but it is exactly the pattern the boundary check forbids, and a CSP cannot allow it selectively | data only: validated, then interpreted. No code path from paste to execution | a compiler in the browser: the pasted text is compiled by libfaust-wasm, not `eval`ed; safe in principle, heavy in practice (the compiler is a multi-megabyte WebAssembly download; exact size not verified here) |
| Portability across engines | each engine gets its own LLM port of each sound: the diesel in the browser and the diesel in Unity will drift | one interpreter per engine (about 400–600 lines each, 12 block types); the recipe is identical everywhere; cross-engine tests compare features (firing rate, RMS, brightness) as Leeway's tests do | best: one source, `faust2` targets for C++, WASM, Unity. The adapter per engine is then a wrapper, not an interpreter |
| Testability / determinism | per snippet, by hand | seeded recipe + offline renderer: every bundled recipe gets Leeway-style feature tests | deterministic, but testing means compiling |
| Lesson value | shows "sound is a function of state" in code; students at a design faculty will not read it | the recipe **is** the lesson's block diagram (source → filter → envelope, inputs → parameters); block 6 of the lesson, "open the recipe", works on it directly | a DSP language on a slide; a step removed from the students |
| Fits 2 weeks | yes for the browser alone; no for "same sound in three engines" | yes: schema + JS interpreter + worklet adapter is about 3 days; the Leeway ports are hours each once the blocks exist | no: toolchain, compiler-in-browser, and the lower LLM hit rate make the live class demo the riskiest part |
| Long-term | dead end for the kit's thesis (one recipe, many engines) | needs an interpreter per engine, which is the kit's work anyway; Faust can later be an **export target** of a recipe | strong as a backend; a Faust exporter from B keeps the door open without paying its cost now |

## 4. Recommendation

**B, as the brief proposes, with three specifics the brief leaves open:**

1. **Exprs on parameters**, parsed (no `eval`), with a fixed function list. This is what makes
   the Leeway sounds short enough for an LLM to write and for a student to read.
2. **Four control blocks** (`pulse`, `trigger`, `randomTrigger`, `sequence`/`choose`) with
   sample-and-hold randomness, derived from the Leeway sounds above. Without them B covers
   water and impact only; with them it covers all seven recipes.
3. **The web adapter is an AudioWorklet running the same interpreter**, not a mapping to
   native `OscillatorNode`/`BiquadFilterNode`. Native nodes have different filter shapes and
   no per-sample control, so the recipe would sound different in the browser and in C++.
   The C++ and C# interpreters later implement the same 1-pole and Chamberlin SVF with the
   same semantics, and the schema document is the spec for all three.

The escape hatch stays as the brief says: `custom` blocks only from the bundled library. Faust
is not rejected; it is a later export target (Phase 1 or 2), which gives "one source → C++,
WASM, Unity" without putting a compiler in the lesson.

## 5. Critique of the brief

- **§3 is out of date on the output layer.** There is no `engine/audio/audio_out.hpp` and
  raylib is gone: Leeway now plays through SDL3 (`engine/audio/sdl_audio_out.hpp`, fed from
  the main loop, no audio-thread callback; commit `af504c4` removed raylib, the client is bgfx
  + SDL3). The kit's "raylib/C++ adapter" (brief §5, §8) should read "C++ adapter (SDL3 in
  Leeway)". The synthesis headers (`voices.hpp`, `soundscape.hpp`, `sound_tuning.hpp`) are
  as described.
- **"5-6 recipes" is 7:** CityNoise returns three layers (bed, horns, ferry) with separate
  levels; horn and ferry are their own recipes.
- **The 3D layer is not a recipe feature.** The brief lists "position → 3D" among what the
  recipe expresses. In Leeway it is the mixer (`place`, `cityPlacement`), driven by the game.
  The recipe should only declare a reference distance and rolloff; the adapter and the
  playground's 2D scene do the rest. Otherwise every recipe duplicates the mixer.
- **"Her motor için ayrı port" is true of B too**, in a weaker form: an interpreter per engine.
  The brief frames it as B's cost ("yorumlayıcıları yazmak ilk iş"); it is also the kit's
  product. The MVP writes one (JS).
- **Determinism is a feature to keep, not an implementation detail.** Leeway's seeded
  xorshift makes tests exact and makes "the same recipe sounds the same on every student's
  laptop" true. The schema should carry `seed`.
- **The copy-prompt flow (§6) needs a tolerant paste parser:** LLM replies arrive in markdown
  fences, sometimes with a trailing comma or a comment. Strip fences, parse, validate against
  the schema, and show the error with the node id and the expr; otherwise the live demo dies
  on a formatting slip.
- **Safari risks (§10) are slightly wrong in emphasis:** AudioWorklet has shipped in Safari
  since 14.1; the real traps are the user-gesture rule (one "play" button), HTTPS (GitHub
  Pages is fine) and the iPhone mute switch, which silences WebAudio.
- **The LLM comparison the brief asks for was not run** (see the top). It should be run
  against the real schema, once, with three vendors and the same five prompts, and the error
  types recorded; that is a half-day task, not a design input.
- **Scope-creep risk (§8) is real and the plan below guards it** by putting the deck draft on
  day 4–5, before the second half of the kit work.

## 6. Prior art — verified and added

Verified from the brief (all exist): bfxr-mcp (wraps increpare's bfxr2 code in a Node
sandbox), bfxr2-mcp, sfx-gen-mcp (Stable Audio Open, local, text → WAV), make-sfx-mcp
(procedural, outputs WAV plus the code that made it), ElevenLabs MCP, Faust. All produce a
WAV; none runs in the game reacting to state. The brief's "our difference" holds.

Missed by the brief, worth knowing:

| Tool | Why it matters here |
|---|---|
| **Flocking** (colinbdclark) | Synths defined as **JSON** unit-generator graphs: the closest prior art to B. Dormant since 2024, browser-only; proves the shape and shows what an LLM-era redo should fix |
| **Elementary Audio** | Declarative JS audio graphs as a function of state, one engine for browser/plugin/embedded: B's idea done well. PolyForm Strict licence, so not reusable in an MIT kit; a design reference only |
| **Heavy / hvcc** (Wasted-Audio fork) | Pure Data patches compiled to C/C++ with wrappers for game engines (Unity, Wwise) and plugins: the other "solve the port problem" option besides Faust, with a graph as the source. LLMs write Pd files badly; a B → Pd exporter is conceivable |
| **Unreal MetaSounds** and **Nemisindo** | MetaSounds is the professional graph format for state-driven procedural audio; Nemisindo (QMUL spin-out) ships about 70 procedural models as MetaSounds nodes and plugins. Lesson block 4: "the industry does B already, inside the engine" |
| **latentscore** (NIME 2026, arXiv 2607.00309, Apache-2.0, Python) | Text → categorical schema → procedural synthesis, three backends (embedding retrieval, hosted LLM, 270M local model) emitting the same schema: independent evidence for "the LLM emits a schema, not code". Music, one-shot, no game-state input |
| **LLM2Fx** (Sony, WASPAA 2025) | LLMs predict audio-effect parameters zero-shot from text, beating optimisation baselines: evidence that parameter-level generation is a sweet spot |
| **Andy Farnell, *Designing Sound*** | The textbook of procedural game audio (Pd patches for rain, fire, engines, birds). The lesson's "sentez blokları" slide and the kit's recipe library both have a citable source |
| **Tone.js** | Not an alternative (a music-oriented wrapper over native WebAudio nodes), but a student-known name; mention why the kit does not build on it: no per-sample control |

## 7. Work breakdown for the lecture MVP

Ten working days, 2026-10-23 to 2026-11-03; the deck draft is due 2026-10-29. Estimates are
agent-days with Kemal reviewing; "worker" means a parallel kit worker session.

| Day | Task | Estimate | Deliverable |
|---|---|---|---|
| 1 (Thu 23) | Kemal decides §5.1. Schema v0 (block list of §1–2, exprs, `seed`, `inputs`, `spatial`); core interpreter in JS with an offline renderer; expr parser; tests (seeded, feature-based like Leeway's) | 1 day | `core/` passing `check.sh` |
| 2 (Fri 24) | AudioWorklet adapter; diesel and hull-water recipes playing with sliders in a bare page | 1 day | sound in Safari and Chrome on the Mac |
| 3 (Sat 25) | Playground v0: paste box with fence stripping and schema errors, play button, input sliders, bundled recipes; GitHub Pages deploy | 1 day | public URL on GitHub Pages (the repo is public, Kemal 2026-10-22); a local `npx serve` fallback for the class |
| 4–5 (Sun 26–Mon 27) | **Presentation draft**, lesson blocks 1–8, with screenshots; backup video of the Leeway demo and of one AI-generated recipe. Worker in parallel: impact, gull, city, horn, ferry recipes | 1.5 day + 1 worker-day | deck v1 |
| 6 (Tue 28) | 2D listener scene (drag → pan and distance), WAV export; polish the deck from the first read | 1 day | playground v1 |
| 7 (Wed 29) | Copy-prompt text and skill v0; run the deferred LLM experiment (three vendors, five prompts) and fix the schema's worst error type. **Deck draft done (calendar rule)** | 1 day | `skill/`, experiment notes |
| 8 (Thu 30) | Leeway Mac build with `taka_sound.txt` + F5; projector/HDMI audio check with the department's answer; classic examples (click, jump, explosion, wind) | 1 day | rehearsal checklist ticked |
| 9 (Fri 31) | Full rehearsal with timing; fix what broke; freeze | 1 day | frozen build + deck |
| 10 (Sat 1 – Sun 2) | Buffer. Licence file (MIT proposed, brief §9) | 0.5 day | — |

Not in the ten days: C++/Unity interpreters, MCP, Faust export (Phases 1–2).

**Dependencies on Kemal, in order:** the §5.1 decision (day 1); lecture length and whether
students have laptops (shapes the deck, day 4); the licence file (the repo is already public).

Sources checked 2026-10-22: glama.ai listings for bfxr-mcp, bfxr2-mcp, sfx-gen-mcp;
libraries.io for make-sfx-mcp; elementary.audio docs; github.com/colinbdclark/Flocking;
github.com/Wasted-Audio/hvcc; nemisindo.com and the Unreal marketplace listing;
arxiv.org/abs/2607.00309 and github.com/prabal-rje/latentscore; ai.sony LLM2Fx page.
