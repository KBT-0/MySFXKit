# STATE.md — Cross-Session Work State (MySFXKit)

**If it is not written here, it did not happen.** This file holds current state only: what
is in flight and what waits on someone. Its rules, and the permanent home for anything still
true next month, are in `docs/AGENTS.md`, "STATE.md discipline" (the reasons: `docs/WORKFLOW.md`,
"The state, backlog and phase files"). Every entry has a tool+model trace.

---

**Working mode:** solo (`docs/WORKFLOW.md`, "Working modes, by name"; `/myagentkit:mode` switches it).

## Active work

- SFX-4 (Claude Code, Opus 5.5 lead, 2026-10-23, lead session 4): draft 1 of the lecture
  outline is committed as `docs/lecture/outline.md` (format chosen by Kemal: a Markdown
  outline; title, date 2026-11-20 and speaker line in PROJECT 2.8). It covers blocks 1–8 of
  brief §7 plus block 4b, 3D positioning (asked by Kemal for the title), with a 120-minute plan. NOT done: no screenshot or video was captured (named
  placeholders in the file; no browser session was run). SFX-4 is done once Kemal has read
  the draft once; its "Açık noktalar" list holds the six items owed by Kemal.
- SFX-7, copy-prompt part (Claude Code, Opus 5.5 lead, 2026-10-28, lead session 4; worker an
  Opus 5.5 sub-agent at high effort): the playground has a description box and a "Copy
  prompt" button; `playground/prompt.js` builds the prompt (format v0, an example recipe,
  the request). Proof: Sonnet 5.5 at medium effort, given only the prompt, wrote valid,
  non-silent recipes for rain, a door creak and a spaceship take-off on the first try (one
  vendor only; ChatGPT and Gemini NOT tested). Review: round 1 (fresh `diff-reviewer`, one
  Medium and three Lows, all fixed), round 2 Accept with Manual Checks (Opus 5.5, high,
  fresh); Low in BACKLOG SFX-24. NOT verified: the UI was not run in any browser. The skill
  v0 text of SFX-7 is still open. Manual checks owed to Kemal, in Safari:
  1. Serve the repository root (`python3 -m http.server 8000`), open
     `http://localhost:8000/playground/`, type a description, press Copy prompt and paste
     it somewhere: the clipboard holds the full prompt ending with the description.
  2. Open the page from an address with no clipboard access (plain HTTP that is not
     localhost, such as the Mac's LAN IP): the read-only box shows the prompt, selected,
     above the recipe box.
  3. Press Copy prompt with an empty description and with one over 2000 characters: each
     shows an error, and an open fallback box hides.
  4. Paste the prompt into a real AI chat (ChatGPT or Gemini) and paste its reply into the
     recipe box: it loads and plays.
- SFX-5 (Claude Code, Opus 5.5 lead, 2026-10-22/23, lead session 3; every worker an Opus
  5.5 sub-agent at high effort, every review a fresh Opus 5.5 `diff-reviewer` at high):
  all six remaining Leeway recipes are committed in `core/recipes/` with the blocks they
  need (`lfo`, `randomWalk`, `randomTrigger`, env `attack`/`length`/`stop`, `trigger` and
  `instance.trigger`, `sequence` with `variants`; PROJECT 2.4 to 2.6), the web adapter
  forwards events (`player.trigger`), and the playground lists all seven examples with an
  event button and strength slider per `trigger` node. Every part passed its review
  (Lows in BACKLOG SFX-17 to SFX-19, SFX-21 to SFX-23). NOT verified: the gull is not in
  `core/alloc.test.js` (BACKLOG SFX-20). SFX-5 is done once Kemal's checks below pass.
  Manual checks owed to Kemal, in Safari from `python3 -m http.server 8000` at the
  repository root, `http://localhost:8000/playground/` (or the Pages URL after a push):
  1. Load each of the seven examples while a sound plays: each plays, no error shows.
  2. Listen against Leeway in game: `hull_water` at speed 0, 0.5 and 1 (at 0 it is very
     quiet, RMS 0.0065, as in Leeway), `city_bed`, `horn`, `ferry` (its first whistle comes
     at 1 s, then every 35 to 90 s), `gull`. The tests measure pitch, timing and level,
     not timbre.
  3. Load "Hull impact (Leeway)", press `impact` before Play: the status asks for Play
     first and nothing sounds. Press Play, then `impact` at strength 1, 0.5 and 0: the
     thud weakens and is silent at 0.
  4. Load the diesel: the event row disappears.
  5. Press Stop, press `impact`, press Play: note whether a late thud sounds.
  6. Switch between the seven examples ten times while sound plays, then listen to
     `city_bed` and `gull` for a minute: report any click or dropout. In V8 the audio path
     allocates after recipe switches (BACKLOG SFX-20, deferred); Safari is expected to be
     unaffected, and this check is the only evidence.
  GitHub Pages is live at `https://kbt-0.github.io/MySFXKit/playground/`; pushes rebuild it.
- SFX-3 (Claude Code, Fable 5.1 lead; Opus 5.5 worker sub-agent, high effort, 2026-10-22):
  playground v0 in `playground/` (paste a recipe, fence stripping, schema errors, Play, one
  slider per recipe input, the bundled diesel), served from the repository root so GitHub
  Pages can host it. Kemal enables Pages once (Settings, Pages, branch `main`, folder root)
  when the folder lands. High tier (the gate line changed): two fresh reviews, logic and
  portability (Opus 5.5, high, one after the other), both Accept with Manual Checks; Lows
  in BACKLOG SFX-16. Committed as `7000b14` after Kemal read the summary; pushed, CI green.
  SFX-3 is done once the manual checks pass; then SFX-4 (the presentation draft, due
  2026-10-29) or SFX-5 (the remaining Leeway recipes) per `docs/BACKLOG.md`. Manual checks owed to Kemal, in Safari from `python3 -m http.server 8000` at the
  repository root, `http://localhost:8000/playground/`:
  1. Pick the diesel example, press Play: sound starts on that first click, the button
     reads Stop, the throttle slider changes the sound.
  2. Load an invalid recipe while a sound plays: the errors list one line per error, the
     old sound and sliders stay.
  3. Load a valid edited recipe while a sound plays: the sound switches and the sliders
     are rebuilt.
  4. After enabling Pages (Settings, Pages, branch `main`, folder root), open
     `https://kbt-0.github.io/MySFXKit/playground/`: the example and the worklet load.
  Chrome is not installed on this Mac; the Chrome checks stay open.
- The three earlier commits of today (`547ad4c`, `8c80ed8`, `eeb50a5`) changed gate and CI
  lines and got one reviewer each, not the high tier's two; the portability review of
  2026-10-22 covered their gate and CI lines after the fact (Accept with Manual Checks, one
  Medium: `doctor.sh` checks Node only with `.nvmrc` or a root `package.json`; fixed by
  adding `.nvmrc` with `26` and updating `docs/DEV_SETUP.md` §2, commit `607f0cc`).

- Setup (Claude Code, Fable 5.1, 2026-10-22): the kit v0.12.1 was installed with the
  `claude-code` overlay and every placeholder was filled from `docs/MySFXKit_brief.md` by the
  agent, without the interview conversation, on Kemal's instruction to do the whole setup
  alone. Every value is therefore a transcription of the brief or an agent default that Kemal
  has not confirmed; the defaults are listed under "Blocked / waiting on Kemal".
- SFX-2 (Claude Code, Fable 5.1 lead; Opus 5.5 worker sub-agent, high effort, 2026-10-22):
  step 1 of 3 done and committed: `core/` (recipe model, expr parser, interpreter, offline
  renderer, diesel recipe, 24 seeded tests), `node --test core/` in the gate, Node 26 in CI,
  the eval boundary check armed for `core/`. Review: round 1 Reject (Opus 5.5, high, fresh;
  one High, three Medium, all fixed by the worker), round 2 Accept (Opus 5.5, high, fresh).
  Steps 2 and 3 committed: `adapters/web/` (AudioWorklet processor running the core
  interpreter, `createRecipePlayer`, `demo.html` with a throttle slider, 13 tests) and
  `node --test adapters/web/` in the gate. Review: Accept with Manual Checks (Opus 5.5,
  high, fresh); Lows in BACKLOG SFX-13/14.
  Last part committed: the core no longer allocates per 128-sample block once V8 has
  optimized `render` (exprs compiled to a flat stack program, slots and params in typed
  arrays; output bit-identical to the previous code; `core/alloc.test.js` with the sampling
  heap profiler). Review: Accept with Manual Checks (Opus 5.5, high, fresh); Lows in
  BACKLOG SFX-15. SFX-2 is done once Kemal's listening check below passes; then SFX-3.
  Manual checks owed to Kemal:
  1. Serve the repository root (`python3 -m http.server 8000`), open
     `http://localhost:8000/adapters/web/demo.html` in Safari: Play gives the diesel, the
     throttle slider changes it while it plays, Stop/Play toggles, no error shows. Chrome
     is not installed on this Mac, so the Chrome check is open.
  2. Node 26 must be installed on the lecture Mac and on the PATH that a git hook sees
     (`node --version`). CI on ubuntu with Node 26 is green through `eeb50a5` (48 s),
     `core/alloc.test.js` included.

(task + module + status, or one line per operation pointing at its `docs/<OPERATION>.md`;
delete when done — an EMPTY section means nothing is in flight, so never park closed work
here; that meaning is a contract the gate does not check)

## Blocked / waiting on Kemal

(a decision, an approval, or a manual check owed by Kemal)

- Setup defaults Kemal has not confirmed (change any of them in the named file):
  1. `AGENTS.md`, kit feedback rule: offer upstream feedback, `kit_feedback: ask-each-time`
     (mirrors Leeway's practice). `docs/PROJECT.md` §2 records it as OPEN.
  2. `.claude/agents/worker.md` and `diff-reviewer.md`: model `opus`, effort `high` (mirrors Leeway).
  3. `docs/PHASES.md`: Phase 0 scope, non-goals and acceptance, transcribed from brief §8.
  4. `docs/WORKFLOW.md`, "Model routing": the kit's table as shipped, not adjusted to the two
     Claude Max accounts of brief §8; working mode `solo`.
  5. `scripts/boundary_checks.sh`: two DORMANT checks (no `eval` in `playground/`, no adapter
     import in `core/`), written before the §5.1 decision; their folder names follow brief §5.
- The brief's §9 questions are answered (PROJECT 2.7, 2026-10-23). The `LICENSE` file (MIT)
  is not added yet: the copyright holder's name is to be confirmed with Kemal.

## Known issues / watch out

Environment and tooling traps have a permanent home: **`docs/GOTCHAS.md`**. Read it when
something behaves unexpectedly. What belongs here instead is a check that is outstanding
RIGHT NOW — a manual verification owed before the next commit, a claim that has not been
observed yet.

- Setup review (Claude Code, Fable 5.1 author; Opus reviewer, high effort, fresh session,
  2026-10-22): run on the staged setup files before the first commit, as
  `setup/INTERVIEW.md` Phase 4 step 6 requires; `scripts/review.sh` cannot run without a base
  commit. Verdict: **Accept with Manual Checks**. The author fixed its finding 1 (the eval and
  import greps missed `Function(` without `new`, `eval (`, `(0, eval)`, `import(`,
  `require (` and bare `adapters/` specifiers; fixtures added) and finding 5 (the hook now
  also watches `.mjs`, `.ts`, `.html`); the fixtures and `check.sh` PASS after the fix.
  Manual checks owed to Kemal:
  1. (closed by the §5.1 decision for B, 2026-10-22: the no-`eval` rule stands as written.)
  2. The phase order in `docs/PHASES.md` (adapters, then MCP/providers, then music) is the
     agent's reading of brief §8, which lists them unordered. Confirm or reorder.
  3. Leeway read-only is prose only. The reviewer suggests a `permissions.deny` Edit/Write
     rule for `../MyGameEngine_Projects/project_leeway/**` in `.claude/settings.json`; the
     author did not add it (an agent does not change permission settings on its own).
  4. Low, not fixed: the fixtures do not test the folder scoping of the two checks (a green
     case outside the folder passes trivially while the folder does not exist). Add a green
     case inside `playground/` with no violation once the folder exists.
- [GOTCHA] The `diff-reviewer` and `worker` agents in `.claude/agents/` load only in a session
  started after they exist; the setup session used a general agent with the same brief.
- [GOTCHA] `docs/MySFXKit_brief.md` §3 names `audio_out.hpp` and raylib; Leeway now plays
  through SDL3 (`engine/audio/sdl_audio_out.hpp`), see
  `docs/research/2026-10-22-format-evaluation.md` §5. The brief is left unchanged on purpose.

