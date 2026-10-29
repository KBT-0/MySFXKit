# /skill rules

- `skill/` holds `SKILL.md`, the agent's workflow (brief §5: scan, find missing sounds, pick
  or write a recipe, integrate, position, verify) in the common Agent Skills format. It holds
  no code, no recipe and no second copy of the skill for another tool.
- Frontmatter has `name` and `description` only; no tool-specific field, so Claude Code,
  Codex and any agent reading Markdown get the same file. Nothing checks this.
- The skill decides workflow, never the format (`docs/ARCHITECTURE.md`, "Runtime topology").
  It never describes the recipe format, the expr language or the block list: it points to
  `core/README.md` and the adapter's API to `adapters/web/README.md`. A copy would drift.
- Drift guard: pointers, not copies, and validation at use: the skill makes the agent run
  core's `validateRecipe` on every recipe before integrating, and `player.load` validates
  again. No test in `scripts/check.sh` checks that the names the skill uses still exist.
- Every path, function and field the skill names must exist when you edit it: grep each one.
  A rename in `core/`, `adapters/web/` or `playground/` must update `SKILL.md` too.
- Integration steps cover the web adapter only; another engine gets steps when its adapter
  exists. `playground/prompt.js` (`buildPrompt`) is the chat AI's prompt, a different text:
  do not merge or copy the two.
- After editing a command block in `SKILL.md`, run it once on a recipe in `core/recipes/`.
