# BACKLOG.md — Next and Parked Work (MySFXKit)

What is planned but not started, and what was put aside on purpose. Read it when the next
task is chosen, NOT at every session start: `docs/STATE.md` holds only what is in flight.
When work on a task starts, its line moves to `docs/STATE.md` and leaves this file.

---

## Next tasks (priority order)

- SFX-2: core recipe model + WebAudio adapter + first Leeway recipe (diesel) playing in the browser.
- SFX-4: presentation draft (deadline 2026-10-29, end of week 1).
- SFX-6: 2D listener scene, WAV export, bundled classic examples (UI click, jump, explosion, wind).
- SFX-7: skill v0 (agent workflow text) and the copy-prompt text of brief §6.
- SFX-8: rehearsal on the Mac: playground + Leeway demo (`taka_sound.txt` + F5), projector audio (brief §10).

- SFX-9: `validateRecipe` throws a TypeError instead of returning errors when a JSON field that should be a string is an object with a non-callable `toString` (`"type": {"toString": 0}`, also `in`, `out`, `env.trigger`); round 2 review 2026-10-22, Medium. Coerce with `typeof === "string"` checks before the message templates.
- SFX-10: the eval boundary check also scans Markdown under `core/` and `playground/`, so prose like "dynamic import (" turns it red; narrow the scan to code files or document the wording rule in `core/AGENTS.md`.
- SFX-11: `module_roots` in `scripts/check.sh` treats a root's subfolders as modules, which does not fit a top-level `core/` module; decide the value once `adapters/` exists (round 1 review 2026-10-22).
- SFX-12: the recipe glide starts at its target while Leeway spools up from idle; the output is not clamped to [-1, 1] (the adapter's job); `fire.gain` lags up to 127 samples (control rate). Lows from the 2026-10-22 reviews.
- SFX-13: `adapters/web/`: `errorsOf` in `processor.js` dies on `throw undefined` (unreachable today); no `dispose()` on the player; inputs restart at defaults on each `load`; no fixture test guards the `adapters/web/` part of `build_test_cmd`; decide whether `GUARDED_EVAL` should cover `adapters/` (the test's own `await import()` needs an exemption). Lows from the 2026-10-22 adapter review.
- SFX-14: a gate fixture that makes `build_test_cmd` fail when a module's test files are absent; and `module_roots` once two top-level modules exist (see SFX-11).
- SFX-15: `core/alloc.test.js` charges the profiler's own `session.post` cost to the budget because `CORE` includes the test file; exclude `*.test.js` from the counted frames. The pulse block still allocates a boxed double per firing (`rng.next()` on the cold branch, about 6 KB per 10 s); either name the exception in `core/README.md` or draw without a returned double. Lows from the 2026-10-22 allocation review.
- SFX-16: playground Lows (2026-10-22 reviews): a `{` in prose before the JSON wins extraction (first balanced block, by spec); the `textContent`-only rule of `playground/AGENTS.md` has no gate (add "not enforced" to ARCHITECTURE or a grep with a red fixture); the eval check scans Markdown and JSON under `core/` and `playground/` (write `eval` in backticks; one NOTE in each AGENTS.md); `guard_boundaries.py` matches tokens as substrings (`retrieval(` warns) and a parent folder named `core` would match everything; the header comment of `scripts/boundary_checks.sh` still says DORMANT; `checkout@v4`/`setup-node@v4` run on the Node 20 actions runtime GitHub retires in 2026, bump the majors.
- SFX-17: SFX-5 part 1 Lows (2026-10-22 review): the comment at `core/render.test.js` near line 206 says the old code read +1e6, it read 0 (`finite()` maps Infinity to 0); the comment at `core/compile.js` line 46 ("-1: a pulse") now also covers the control blocks `lfo` and `randomWalk`; a control node used as `in` or `out` is silently quiet (documented in `core/README.md`): Kemal decides whether validation should reject it.
- SFX-18: SFX-5 part 2 Lows (2026-10-22 review): a node reading its own field gets the previous block's value inside the block where its event fires, so a `randomTrigger` `spacing` shorter than one control block (2.7 ms) uses the old hold value (`core/compile.js` 98-101); retriggering an `env` with `attack > 0` while loud drops the level to about 0 in one sample, a click (`core/compile.js` 117-119); `randomTrigger` `repeat` has no upper bound, so `[1e300, 1e300]` makes one event never end (`core/blocks.js` 167). The README notes per recipe could become a table.

## Deferred / parked

- Unity adapter, raylib adapter in the kit, MCP, provider interface, music: after the lecture (`docs/PHASES.md`).
- Leeway `BACKLOG.md` one-liner about adopting the kit: Leeway's own decision, written there by a Leeway session, never from here.
