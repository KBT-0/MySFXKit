# /core rules

- `core/` is the engine-free recipe model, validator, expr language, blocks and offline renderer. It holds no audio output and no UI.
- It imports nothing from `adapters/` or `playground/` (gate: `scripts/boundary_checks.sh`, check 2).
- A recipe is data: exprs are parsed by `expr.js`, compiled to a fixed-opcode stack program and run. Never `eval`, `new Function` or a dynamic import; gate: `scripts/boundary_checks.sh`, check 1.
- Randomness only from the generator `compile.js` builds from `recipe.seed` (`rng.js`); never `Math.random`. No module-level mutable state.
- Objects keyed by names from a recipe have no prototype (`Object.create(null)`), and registry lookups use `Object.hasOwn`: names come from pasted text.
- A logic change brings its feature test (`*.test.js`, seeded, asserting on measured features, not sample values); run `node --test core/`.
- A new block is one entry in `blocks.js` plus a row in `README.md` and a test.
