# Architecture Map

This file answers **"where does X live?"** It holds boundaries, invariants and who may decide
what, not a description of each file, and agents read it to orient (`AGENTS.md`, reading
order), so it stays short: aim for about 100 lines. If an agent cannot orient with it, look
at this file first; the cause may also be a missing module README. (Sources: matklad,
https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html: keep it short, name invariants and
boundaries; Claude Code memory, https://code.claude.com/docs/en/memory: an instruction file
under 200 lines.)

## Runtime topology

```
  user's own AI (ChatGPT / Claude / Gemini …)      ← prompt copied from the playground
          │ recipe (text)
          ▼
  browser: playground (static, GitHub Pages) → core interpreter → WebAudio adapter → speakers
  game:    engine adapter (raylib/C++, Unity …) → core interpreter → engine audio output
  agent:   Claude Code / Codex + skill/ → edits the game project, writes recipes, runs the adapter
```

- **Playground** — a static site; no server, no LLM call of its own (brief §2, KARAR). It only interprets recipe data; it decides nothing about the format.
- **Core** — engine-free DSP blocks and the recipe model. It is the single authority on what a recipe means; every adapter obeys it.
- **Adapters** — one per engine; they feed audio out and map game inputs in. They never redefine a block.
- **Skill** — instructions to the agent; it decides workflow, never the format.
- **Leeway** — `../project_leeway` (on this Mac: `../MyGameEngine_Projects/project_leeway`) is the read-only reference game whose sounds the kit ports; it is not a runtime of this project.

<!-- A small diagram plus one line per process: what it is, and what authority it has.
     "Which component is allowed to decide X?" must be answerable from this section.
     Sources: matklad (invariants and boundaries code cannot show); Claude Code best
     practices, https://code.claude.com/docs/en/best-practices ("architectural decisions
     specific to your project"). -->

## Repository layout

```
docs/        the brief (docs/MySFXKit_brief.md), the kit's process docs, reviews, worktree notes
scripts/     the gate (check.sh), boundary checks, review and worker tooling (kit-owned)
tests/       fixture tests for the boundary checks; the format's tests join them
setup/       the kit's setup interview (kit-owned)
.claude/     Claude Code hooks, sub-agents and settings (convenience; the gate works without them)
.githooks/   pre-commit, commit-msg, pre-merge-commit, post-merge (kit-owned)
.github/     CI, which runs scripts/check.sh

core/        the recipe model, validator, expr language, blocks, offline renderer (core/README.md)
adapters/    one folder per engine; adapters/web/ runs core in an AudioWorklet (adapters/web/README.md)
playground/  the static site of brief §6: paste, load, play, sliders (playground/README.md)
skill/       the agent's workflow as one Agent Skills file (skill/SKILL.md, rules in skill/AGENTS.md)

Planned (brief §5): more adapters, later mcp/ and providers/.
```

Two documentation subdirectories exist for process output rather than design:

- `docs/reviews/` — raw review-gate output, one file per review
  (`<UTC-timestamp>-<random>-<reviewer>-review.md`), recording the reviewing model and
  whether it is attested, reasoning effort, sandbox mode, limits, scope and base ref.
  Every reviewer writes the same header table and one verdict line, so the records stay
  comparable when the author and reviewer roles swap. Written by the review wrapper and
  never edited afterwards: it is evidence, not a document.
- `docs/worktree-notes/` — progress notes from sessions working on a branch or in a
  worktree, one file per branch, so `docs/STATE.md` never becomes a merge conflict. The
  integrating session folds a note into STATE.md at merge time and deletes it.

## Module map

Each module: its own folder, its own project/build unit, its own README summarising its
public API, its own tests (a kit choice; no study measured this layout). Modules see each
other ONLY through public contracts.

The layout is brief §5. A planned module gets a row here, its own README and its own tests
when it is created. No gate checks this table yet: `module_roots` in `scripts/check.sh` stays
empty until a second top-level module exists.

| Module | Responsibility |
|---|---|
| `core/` | Engine-free recipe model (format B, PROJECT §2.2): validator, expr language, block registry, interpreter, offline renderer, and the recipe library ported from Leeway as data (`core/recipes/`); `node --test core/` |
| `adapters/` | One folder per engine. `adapters/web/`: the WebAudio adapter, the core interpreter in an AudioWorklet (PROJECT §2.2), and a demo page; `node --test adapters/web/`. Planned: raylib/C++, Unity … |
| `skill/` | Skill v0: the agent's workflow (scan, find missing sounds, pick or write a recipe, integrate, position, verify) in `skill/SKILL.md`; it points to `core/README.md` for the format and integrates through `adapters/web/` only; no tests |
| `playground/` | The static site of brief §6, version 0: paste a recipe, validate it with core, play it through `adapters/web/`, one slider per input, bundled examples (`playground/examples.js`); `node --test playground/` |

<!-- One table per top-level area. Columns: Module | Responsibility | (optional) the design
     document section it implements. One line each — this is a map, not documentation; a
     module's detail lives in its own folder (its AGENTS.md and README), read when work
     there needs it, not here on every read (Claude Code best practices: no file-by-file
     descriptions in an instruction file). -->

## Boundary enforcement (rule ≠ advice)

For each boundary below, state WHAT enforces it — and write "not enforced" where nothing
does. A boundary enforced only by prose is a request, and requests decay; the point of this
section is to make that distinction visible rather than to imply it away. An honest gap gets
closed. A gap everyone assumes is covered does not.

1. The playground and `core/` never execute pasted text as code (`eval`, `new Function`): a grep in `scripts/boundary_checks.sh`, mirrored for the playground by `.claude/hooks/guard_boundaries.py`; armed for `core/` and `playground/`.
2. `core/` imports no adapter and not the playground: a grep in `scripts/boundary_checks.sh`, mirrored by the same hook; armed since `core/` exists.
3. Adapters never redefine a block's meaning: not enforced by a check. The web adapter calls `compileRecipe` from `core/index.js` and its tests (`node --test adapters/web/`, run by the gate) cover its message protocol, not that no block is redefined.
4. `../project_leeway` (on this Mac: `../MyGameEngine_Projects/project_leeway`) is read-only: no file is written there and no version-control command runs there — not enforced; a rule in `AGENTS.md`.
5. No server, no LLM call from the site: not enforced; brief §2 KARAR.

<!-- Numbered list. For each: the rule, and WHAT enforces it — a compiler error, a project
     reference whitelist, a grep in scripts/check.sh. If nothing enforces it, write "not
     enforced" rather than implying otherwise; an honest gap can be closed, a fictional
     gate cannot. Source: OpenAI's harness team enforces its architecture with linters and
     structural tests, not prose (the kit's docs/research/agent-kits-in-practice.md, §2.2);
     the reasoning: the kit's docs/rules-that-enforce.md. -->

## Contract change procedure

A task that wants to change a module's public API: (1) proposes the change in that module's
README; (2) finds the affected modules mechanically (builds or runs the tests of every
module that depends on it, searches for the changed symbol) and lists what it found;
(3) applies it after Kemal's approval. Step 2 is a check, not a reading of the
contract: users come to rely on behaviour no contract promises (Hyrum's Law,
https://www.hyrumslaw.com/), and consumer-driven contract tests find them by running them
(Pact, https://docs.pact.io/).

If a contract changes often, report it: the boundary may be in the wrong place.
