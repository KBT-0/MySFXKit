# STATE.md — Cross-Session Work State (MySFXKit)

**If it is not written here, it did not happen.** This file holds current state only: what
is in flight and what waits on someone. Its rules, and the permanent home for anything still
true next month, are in `docs/AGENTS.md`, "STATE.md discipline" (the reasons: `docs/WORKFLOW.md`,
"The state, backlog and phase files"). Every entry has a tool+model trace.

---

**Working mode:** solo (`docs/WORKFLOW.md`, "Working modes, by name"; `/myagentkit:mode` switches it).

## Active work

- Setup (Claude Code, Fable 5.1, 2026-10-22): the kit v0.12.1 was installed with the
  `claude-code` overlay and every placeholder was filled from `docs/MySFXKit_brief.md` by the
  agent, without the interview conversation, on Kemal's instruction to do the whole setup
  alone. Every value is therefore a transcription of the brief or an agent default that Kemal
  has not confirmed; the defaults are listed under "Blocked / waiting on Kemal".
- Phase 1 of the brief (analysis of §5.1, A/B/C, prior art, work breakdown): written to
  `docs/research/2026-10-22-format-evaluation.md` by the same session; the decision is Kemal's.

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
- The §5.1 format decision (A / B / C): Kemal decides after reading the evaluation.
- The brief's open questions §9 (lecture length, students' computers, name, licence, Steam cases).
- Making `KBT-0/MySFXKit` public: Kemal's decision, asked before the lecture.

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
  1. The no-`eval` rule in `AGENTS.md` already rules out brief option A (code) for the
     playground while §5.1 is still OPEN. Confirm the rule, or reword it as conditional.
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

