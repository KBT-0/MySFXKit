# Phases — what we are building now, and what we are deliberately not

Read every session: the CURRENT phase in full, every later phase in one line. When a phase
closes, its permanent findings move to their homes and its detail is deleted; its history
stays in git (other kits archive a finished plan instead; this one harvests and deletes). The
reasons are in `docs/WORKFLOW.md`, "The state, backlog and phase files".

---

## Current phase: Phase 0 — recipe format and the lecture MVP

**What it must find out:** Can a sound recipe that reacts to game state be produced by any LLM, pasted into a serverless playground, heard in a browser on the lecture Mac, and shown in the lecture on about 2026-11-03?

<!-- State what the phase must find out or which risk it retires, in one sentence (a
     question is a good form, not a requirement). If it cannot be put in one sentence, split
     the phase. A kit choice; no study measured it. -->

**In scope**

- The core recipe format, per the §5.1 decision (OPEN until Kemal decides; Fable's evaluation is the input)
- A WebAudio interpreter/adapter for that format
- The playground of brief §6 on GitHub Pages: copy-prompt flow, paste recipe, play, game-input sliders, 2D listener scene, WAV export, bundled examples
- Ports of the Leeway sounds: diesel, hull water, hull impact, gull, city noise (+ horn / ferry whistle)
- The agent skill, v0: scan project → find missing sounds → pick or write a recipe → integrate → position → verify
- The lecture presentation: draft done by the end of week 1 (2026-10-29), then kit polish and rehearsal

**NOT in scope — do not build these yet**

- Unity adapter (C#, `OnAudioFilterRead`) — Phase 1
- Moving the raylib/C++ adapter into the kit — Phase 1
- MCP server for render / preview / WAV export — Phase 2
- Provider interface for external generators (ElevenLabs etc.) — Phase 2
- Music and adaptive music — Phase 3
- Marketing the kit in the lecture — never (brief §2, KARAR)

<!-- Spend as much effort here as on the list above. Each entry names the phase it belongs to
     instead, so "not yet" does not read as "never". An agent that finds itself needing
     something on this list STOPS and reports rather than quietly widening the phase.
     Sources: non-goals in Google design docs (industrialempathy.com/posts/design-docs-at-google);
     GitHub Spec Kit, spec-driven.md; Anthropic's prompting guide on overeagerness. Naming
     the phase each entry belongs to is the kit's addition. -->

**Done when**

- The playground on GitHub Pages plays every bundled Leeway recipe in Safari and Chrome on the lecture Mac after one click; moving a game-input slider changes the sound while it plays.
- A recipe pasted from an LLM reply plays without a code change on the site.
- WAV export writes a file that plays in QuickTime.
- `./scripts/check.sh` PASSes with the format's tests (deterministic, seeded) and the boundary fixture tests.
- The presentation draft exists by 2026-10-29; Kemal has run one full rehearsal on the Mac, with the Leeway demo (`taka_sound.txt` + F5), before the lecture. Kemal decides it is ready.

<!-- Commands or observations, never adjectives. "The simulation runs 100 days at seed 42
     with no price outside its declared band" is a criterion. "The economy feels balanced" is
     not — unless it names WHO decides and when, which makes a subjective criterion valid.
     An unowned subjective criterion is not a criterion. -->

---

## After this one

<!-- One line per phase, in order, and no more than a line. What it will find out is
     enough; scope and criteria are written when it becomes current. Reordering this list is
     a decision and belongs in docs/PROJECT.md with its reasoning — this is the view, not the
     authority. Sources: rolling-wave planning (detail when a stage becomes near); an
     architecture decision record is superseded, not edited (Nygard, cognitect.com 2011). -->

- Phase 1 — engine adapters: does one recipe run unchanged in the browser, raylib/C++ and Unity?
- Phase 2 — MCP and providers: can an agent hear its result (render / preview) and delegate to external generators?
- Phase 3 — music: does the recipe model extend to adaptive music?
- Beyond that: not decided yet.
