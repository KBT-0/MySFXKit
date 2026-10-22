# /playground rules

- The static site of brief §6: no server, no LLM call, no dependency, no build step (brief §2 KARAR).
- A recipe is data: the page never evaluates pasted text as code; it uses `JSON.parse`, `validateRecipe` and the web adapter (gate: `scripts/boundary_checks.sh`, check 1).
- Pasted text reaches the DOM only through `textContent` or element properties, never as HTML.
- It imports core only through `core/index.js` and the adapter only through `adapters/web/index.js`.
- Text-handling logic lives in pure modules with `node:test` tests (`recipe_text.test.js`); run `node --test playground/`.
