# BACKLOG.md — Next and Parked Work (MySFXKit)

What is planned but not started, and what was put aside on purpose. Read it when the next
task is chosen, NOT at every session start: `docs/STATE.md` holds only what is in flight.
When work on a task starts, its line moves to `docs/STATE.md` and leaves this file.

---

## Next tasks (priority order)

- SFX-2: core recipe model + WebAudio adapter + first Leeway recipe (diesel) playing in the browser.
- SFX-3: playground v0 on GitHub Pages (paste recipe → play; sliders), Safari + Chrome on the Mac.
- SFX-4: presentation draft (deadline 2026-10-29, end of week 1).
- SFX-5: remaining Leeway recipes: hull water, hull impact, gull, city noise, horn / ferry whistle.
- SFX-6: 2D listener scene, WAV export, bundled classic examples (UI click, jump, explosion, wind).
- SFX-7: skill v0 (agent workflow text) and the copy-prompt text of brief §6.
- SFX-8: rehearsal on the Mac: playground + Leeway demo (`taka_sound.txt` + F5), projector audio (brief §10).

- SFX-9: `validateRecipe` throws a TypeError instead of returning errors when a JSON field that should be a string is an object with a non-callable `toString` (`"type": {"toString": 0}`, also `in`, `out`, `env.trigger`); round 2 review 2026-10-22, Medium. Coerce with `typeof === "string"` checks before the message templates.
- SFX-10: the eval boundary check also scans Markdown under `core/` and `playground/`, so prose like "dynamic import (" turns it red; narrow the scan to code files or document the wording rule in `core/AGENTS.md`.
- SFX-11: `module_roots` in `scripts/check.sh` treats a root's subfolders as modules, which does not fit a top-level `core/` module; decide the value once `adapters/` exists (round 1 review 2026-10-22).
- SFX-12: the recipe glide starts at its target while Leeway spools up from idle; the output is not clamped to [-1, 1] (the adapter's job); `fire.gain` lags up to 127 samples (control rate). Lows from the 2026-10-22 reviews.

## Deferred / parked

- Unity adapter, raylib adapter in the kit, MCP, provider interface, music: after the lecture (`docs/PHASES.md`).
- Leeway `BACKLOG.md` one-liner about adopting the kit: Leeway's own decision, written there by a Leeway session, never from here.
