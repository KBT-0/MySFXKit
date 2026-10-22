# playground — the static site (version 0)

The page of brief §6: paste a recipe, hear it, move its game inputs. Plain HTML, CSS and ES
modules; no framework, no build step, no dependency, no server code and no LLM call. It
imports `../core/index.js` (validation) and `../adapters/web/index.js` (the AudioWorklet
player) with relative paths, so it runs from any static file server at the repository root.

## What it does

1. **Example** loads a bundled recipe into the text box and loads it. The list is
   `EXAMPLES` in `examples.js` (label and path); add a line there to add an example.
2. The text box takes a recipe: bare JSON, JSON in Markdown fences, or a whole AI reply with
   prose around it. `recipe_text.js` takes the first balanced `{ ... }` block (braces inside
   string literals do not count; at most 200 KB of text) and parses it with `JSON.parse`.
3. **Load** parses the text and checks it with `validateRecipe`. A parse error shows its
   message; validation errors show as a list, one `node · path · message` per line. A valid
   recipe rebuilds the sliders and, while a sound plays, replaces it.
4. **Play / Stop** creates and resumes the `AudioContext` inside the click (Safari starts
   audio only on a click) and plays the recipe in the text box, loading it first when the
   text changed since the last load; later clicks suspend and resume it.
5. One slider per entry of `recipe.inputs` (its `min`, `max` and `default`, step 0.01)
   calls `player.setInput` while it moves. After each load the player gets each input's exact
   `default`, even where the slider rounds its position to the step.

The page never evaluates text: pasted text is data for `JSON.parse` and the core interpreter,
and it reaches the page only through `textContent`.

## Run it locally

From the repository root run `python3 -m http.server 8000`, then open
`http://localhost:8000/playground/` in Safari or Chrome. Opening the file directly
(`file://`) does not work: ES modules, an AudioWorklet and `fetch` need HTTP.

On GitHub Pages (serving `main` at the root) the page is
`https://kbt-0.github.io/MySFXKit/playground/`.

## Not in version 0

- The copy-prompt text (brief §6, step 2) and more bundled examples: SFX-6.
- The 2D listener scene and WAV export: SFX-7.

## Tests

`node --test playground/` (also run by `./scripts/check.sh`) tests `recipe_text.js`. The page
itself has no automated test; it is checked by hand in a browser.
