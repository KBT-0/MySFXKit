# adapters/web — the WebAudio adapter

Plays a recipe in a browser: the `core/` interpreter runs inside an AudioWorklet
(`docs/PROJECT.md` §2.2), so the browser hears exactly what `renderOffline` renders. Plain ES
modules, no dependency, no build step; it loads from any static file server with relative
imports (`index.js` and `processor.js` import `../../core/index.js`).

## Public API (`index.js`)

| Call | Does |
|---|---|
| `createRecipePlayer(audioContext)` | adds `processor.js` to the context's worklet and resolves to a player |
| `player.node` | the `AudioWorkletNode` (no input, one mono output); connect it to `audioContext.destination` or a spatial chain |
| `player.load(recipe)` | validates the parsed recipe with `validateRecipe` on the main thread; rejects with an `Error` carrying `.errors` (as `validateRecipe` returns them), else sends it to the audio thread |
| `player.setInput(name, value)` | sets a game input; an unknown name or a non-finite value comes back through `onError` |
| `player.reset()` | restarts the recipe from its compiled state; inputs keep their values |
| `player.onError(callback)` | calls `callback(errors)` for each error the audio thread reports; `errors` is `[{ node, path, message }]` |

The caller parses recipe text with `JSON.parse`; this module never parses or runs recipe text.

Inputs belong to the loaded recipe: a `setInput` before the first `load` is ignored, and each
`load` starts every input at its default. Set the inputs again after `load`.

## Message protocol (`player.node.port`)

| Direction | Message | Effect |
|---|---|---|
| to the worklet | `{ type: "recipe", recipe }` | compiles it with `compileRecipe` at the context's sample rate; invalid: an error message, then silence |
| to the worklet | `{ type: "input", name, value }` | `instance.setInput`; a bad name or value: an error message, the sound keeps playing |
| to the worklet | `{ type: "reset" }` | `instance.reset()` |
| from the worklet | `{ type: "error", errors }` | `errors` is `[{ node, path, message }]`; an exception during rendering is reported once and the processor stays silent until the next recipe |

The processor renders 128 frames per `process()` call into the first output channel, clamps
them to [-1, 1] and copies them to any further channel. With no recipe it outputs silence.

## Demo

From the repository root run `python3 -m http.server 8000`, then open
`http://localhost:8000/adapters/web/demo.html` in Safari or Chrome. Press Play; the throttle
slider (-1 .. 1) drives the diesel (`core/recipes/diesel.json`) while it plays. Opening the
file directly (`file://`) does not work: an AudioWorklet module and `fetch` need HTTP.

## Tests

`node --test adapters/web/` (also run by `./scripts/check.sh`). Node has no AudioWorklet: the
tests define small shims of `AudioWorkletProcessor`, `registerProcessor` and
`AudioWorkletNode` and drive the message protocol through them.
