# STATE.md — Cross-Session Work State (MySFXKit)

**If it is not written here, it did not happen.** This file holds current state only: what
is in flight and what waits on someone. Its rules, and the permanent home for anything still
true next month, are in `docs/AGENTS.md`, "STATE.md discipline" (the reasons: `docs/WORKFLOW.md`,
"The state, backlog and phase files"). Every entry has a tool+model trace.

---

**Working mode:** solo (`docs/WORKFLOW.md`, "Working modes, by name"; `/myagentkit:mode` switches it).

## Active work

- Playground visual redesign (Claude Code, Opus 5.5 lead, 2026-11-09, lead session 6; worker
  an Opus 5.5 sub-agent at high effort): Kemal chose a blend of two mocks, "studio desk" layout
  in a dark theme. Only `playground/index.html` and `playground/style.css` changed; behaviour
  and every element id are unchanged. The header has a static EN/TR switch that does nothing
  yet. Kemal asked on 2026-11-09 for an English and Turkish UI switchable from the top; that
  follow-up task is next. Review: Accept with Manual Checks (Opus 5.5, high, fresh
  `diff-reviewer`); three Lows fixed, the fourth is the inert switch. Verified: headless Chrome
  at 1280×800 and 1440×900 with no page scroll, `./scripts/check.sh` PASS. NOT verified:
  Safari, Firefox sliders, a real projector, drag, keyboard and Play by hand. Manual checks
  owed to Kemal, in Safari and Chrome at about 1280×720: load the diesel example and confirm
  the panels scroll; drag the source to all four corners; press Tab through every control
  and confirm a focus ring shows on each one.
- SFX-23/SFX-26 demo fixes (Claude Code, Opus 5.5 lead, 2026-11-09, lead session 5; worker
  an Opus 5.5 sub-agent at high effort): Kemal chose on 2026-11-09 to fix only the
  demo-visible bugs before the lecture. The scene's panner now only pans (rolloff 0); a
  `GainNode` named `level` after it glides to Leeway's placement gain, so dragging the
  reference or rolloff slider no longer steps the level. An event press while the sound is
  stopped no longer reaches the player (`eventPressBlocked` in `playground/events.js`).
  Review: Accept with Manual Checks (Opus 5.5, high, fresh `diff-reviewer`); its Medium (the
  skill's step 5 names the playground's panner as its example) is fixed in the next commit,
  reviewed Accept (Opus 5.5, high, fresh);
  its Low is BACKLOG SFX-31. SFX-32 (a press in the milliseconds while Stop's
  `suspend()` is pending) is fixed with a `stopping` flag (Sonnet 5.5 worker, medium; review
  Accept, Opus 5.5, high, fresh). NOT verified: no browser run, no sound heard. Manual checks owed
  to Kemal, in Safari and Chrome:
  1. Play the diesel and drag the reference and rolloff sliders during playback: no step.
  2. Move the source before the first Play, then press Play: the level starts at the
     read-out's gain and does not fade from full.
  3. Press Stop, fire an event, press Play: no late thud sounds.
  4. Compare level and pan at the listener, inside the reference circle, at its edge and in a
     corner with the build before this commit: they match.
- Lecture slides (Claude Code, Opus 5.5 lead, 2026-11-09, lead session 5; worker an Opus 5.5
  sub-agent at high effort): Kemal chose a Claude Slides artifact (outline open point 6).
  Deck: https://claude.ai/artifact/TiWoR4Y2gmjWSuWZCUB6s1 (private; 34 Turkish slides in the
  outline's block order, speaker notes from the outline, five live-demo cue slides, dashed
  placeholder frames for every `[SCREENSHOT]`/`[VIDEO]` and for open points 2, 4 and 5).
  NOT verified: nobody has looked at the rendered deck; the .pptx and PDF exports were not
  tried. Open for Kemal: block 3 is 20 min in the time plan and 25 min in its heading; the
  outline's `[EKSİK ... SFX-7]` note is out of date (the skill shipped in `ddf2161`); whether
  a slide shows the playground address for the student exercise. Playground screenshots from
  the browser probe are in the parallel session's scratchpad (`probe/01-start.png` to
  `05-end.png`); they are temporary files.
- Environment (2026-11-09): a Homebrew upgrade of Node on 2026-10-31 left
  `/opt/homebrew/bin/node` unlinked (`brew link node` stops on an existing `npm` link), so
  the gate failed with `node: command not found`. With Kemal's yes the lead added only that
  link (`ln -s ../opt/node/bin/node /opt/homebrew/bin/node`, the version-free path, so a `brew upgrade` keeps it; undo: `rm` it);
  `doctor.sh` reads ready. Google Chrome is now installed on this Mac.
- Browser probe (Claude Code, Opus 5.5 lead, 2026-11-09, lead session 5): Kemal chose to
  automate the manual browser checks. A one-off script outside the repository drove Safari
  27.0.1 (`safaridriver`) and Chrome 157 (DevTools protocol, a separate profile) on the
  working tree with the playground fixes above, and tapped the page's output with an
  `AnalyserNode`. 19 of 19 checks passed in each browser: diesel starts on one click and
  the throttle changes it; a source 40 m right sounds only on the right, and left mirrors
  it; all eleven examples load and sound with no error (events fired by their buttons);
  ten fast switches, then `city_bed` sounds; an invalid recipe lists errors while the old
  sound continues; after Stop an event press shows the stopped message and the next Play
  is silent; WAV export reads as 1 ch, 48000 Hz, Int16 (`afinfo`); Copy prompt fills the
  clipboard. This covers the "loads, plays, no error" parts of the SFX-2, SFX-3, SFX-5,
  SFX-6 and SFX-7 lists below. NOT covered, still owed to Kemal: everything heard by ear
  (timbre against Leeway, clicks, the classics being recognisable), QuickTime playback,
  phone touch, the non-localhost clipboard fallback, and a real ChatGPT or Gemini reply.
- SFX-7, skill v0 part (Claude Code, Opus 5.5 lead, 2026-10-29, lead session 5; worker an
  Opus 5.5 sub-agent at high effort): `skill/SKILL.md` (Agent Skills format, frontmatter
  `name` and `description` only) and `skill/AGENTS.md`; `docs/ARCHITECTURE.md` lists `skill/`.
  Kemal's scope (2026-10-29): one shared SKILL.md; integrate and position cover the web
  adapter only. The skill points to `core/README.md` and never restates the format; drift
  test proposed as BACKLOG SFX-29. Worked check: a fresh Sonnet 5.5 agent at medium effort,
  given only the skill, added two valid, non-silent recipes (thrust, coin) to a soundless 2D
  canvas game and wired them through `createRecipePlayer` with a `PannerNode`; its five gaps
  were fixed. Review: Accept with Manual Checks (Opus 5.5, high, fresh `diff-reviewer`); Low
  in BACKLOG SFX-30. Gate: two worker runs of `./scripts/check.sh` FAILED, each only on
  `core/alloc.test.js` (`hull_impact`, BACKLOG SFX-25); the lead's run on the same tree,
  machine idle, PASSED. NOT verified: no browser run of the skill's steps 4 and 5; Claude
  Code and Codex loading the file as a skill was not tested. Manual check owed to Kemal:
  1. In Safari, load two recipe players on one `AudioContext` (step 4 makes one player per
     sound, and each calls `addModule` again): both sounds play and no error shows.
- SFX-4 (Claude Code, Opus 5.5 lead, 2026-10-23, lead session 4): draft 1 of the lecture
  outline is committed as `docs/lecture/outline.md` (format chosen by Kemal: a Markdown
  outline; title, date 2026-11-20 and speaker line in PROJECT 2.8). It covers blocks 1–8 of
  brief §7 plus block 4b, 3D positioning (asked by Kemal for the title), with a 120-minute plan. NOT done: no screenshot or video was captured (named
  placeholders in the file; no browser session was run). SFX-4 is done once Kemal has read
  the draft once; its "Açık noktalar" list holds the six items owed by Kemal.
- SFX-8 (Claude Code, Opus 5.5 lead, 2026-10-29, lead session 4): draft 1 of the rehearsal
  checklist is `docs/lecture/rehearsal.md` (a week before, a day before, in the room, and a
  fallback table). No step was run: each needs the Mac, its speakers or the room. SFX-8 is
  done once Kemal has run the rehearsal.
- SFX-7, copy-prompt part (Claude Code, Opus 5.5 lead, 2026-10-28, lead session 4; worker an
  Opus 5.5 sub-agent at high effort): the playground has a description box and a "Copy
  prompt" button; `playground/prompt.js` builds the prompt (format v0, an example recipe,
  the request). Proof: Sonnet 5.5 at medium effort, given only the prompt, wrote valid,
  non-silent recipes for rain, a door creak and a spaceship take-off on the first try (one
  vendor only; ChatGPT and Gemini NOT tested). Review: round 1 (fresh `diff-reviewer`, one
  Medium and three Lows, all fixed), round 2 Accept with Manual Checks (Opus 5.5, high,
  fresh); Low in BACKLOG SFX-24. NOT verified: the UI was not run in any browser. The skill
  v0 text is the entry above. Manual checks owed to Kemal, in Safari:
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
- SFX-6, 2D listener scene part (Claude Code, Opus 5.5 lead, 2026-10-28, lead session 4;
  worker an Opus 5.5 sub-agent at high effort): the playground routes `player.node` through a
  `PannerNode` (equal-power, exponential distance model = Leeway's `place` formula) and shows
  an SVG scene with a draggable, keyboard-movable source, reference and rolloff sliders
  (Leeway's 25 and 0.8) and a read-out. Review: Accept with Manual Checks (Opus 5.5, high,
  fresh); Lows in BACKLOG SFX-26. NOT verified: no browser run, no real audio heard, Safari's
  `PannerNode` constructor and `positionX` not checked. The WAV part (2026-10-29, Opus 5.5
  worker, high): a "Download WAV" button renders the loaded recipe with `renderOffline`
  (48 kHz, the sliders' values, one event per trigger at 0.25 s) into a mono 16-bit WAV
  (`playground/wav.js`); `afinfo` reads the output as "1 ch, 48000 Hz, Int16". Review:
  Accept with Manual Checks (Opus 5.5, high, fresh), no finding. NOT verified: QuickTime
  playback and the page in a browser. With this, every part of SFX-6 is built; SFX-6 is
  done once the manual checks below pass.
  The classic examples part: four recipes in `core/recipes/` (`ui_click`, `jump`,
  `explosion`, `wind`; Opus 5.5 worker, high) with seeded feature tests in
  `core/classics.test.js` (outside the brief's Owns line, same module, accepted by the
  reviewer). Review: Accept with Manual Checks (Opus 5.5, high, fresh); Lows in BACKLOG
  SFX-27. NOT verified: no agent listened to them. The WAV task added them to the
  playground list as "(classic)". Manual checks owed to Kemal, from `http://localhost:8000/playground/`:
  1. In Safari with headphones, drag the source to the right edge: the sound pans right; at
     the left edge it pans left.
  2. Move the source and both sliders before the first Play, then press Play: the first
     sound matches the circle's place and the read-out.
  3. During playback press Stop, drag the source, press Play, then switch the example: the
     sound keeps playing at the new place.
  4. Press Tab to the source: a blue ring shows, arrow keys move it 1 m, Shift with an arrow 10 m.
  5. On a phone, drag the source by touch: the page does not scroll during the drag, and the
     page above and below the scene still scrolls.
  6. Listen to the four classic recipes on the lecture Mac: each is recognisable as a UI
     click, a jump, an explosion and wind for the lecture.
  7. Load "Jump (classic)", press Download WAV: `jump.wav` downloads and plays in QuickTime.
  8. Make the recipe text invalid, press Download WAV: the error list shows, no file
     downloads, the old recipe's sliders stay.
  9. Move an input slider and an event strength slider, download: the WAV differs from one
     rendered at the defaults.
  10. Set Seconds to 30 and download: "Rendering..." shows before the page freezes; typing
      100 shows a clamped value.
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

