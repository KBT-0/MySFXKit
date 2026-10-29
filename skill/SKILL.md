---
name: mysfxkit
description: Give a game synthesized sound effects with the MySFXKit kit. Use when the user asks to add, find, or fix sounds in a game project. Scan the project, find the missing sounds, pick or write a MySFXKit recipe (JSON data that reacts to game state), integrate it in a web game through the kit's WebAudio adapter, position it with a PannerNode, and verify it. No recorded assets.
---

# MySFXKit: add synthesized sound to a game

A MySFXKit **recipe** is JSON data that describes a sound and the game inputs and events it
reacts to (throttle drives an engine, a collision fires an impact). The kit's `core/`
validates and interprets recipes; `adapters/web/` plays them in a browser. This file is the
workflow only. It never describes the recipe format: `core/README.md` is the authority.

## 0. Find the kit

- This file lives in `skill/` of a MySFXKit checkout. The kit root is the parent of the
  folder that holds this file, after resolving symbolic links (`realpath`): a skills folder
  may link to `skill/`. If this file was copied elsewhere, ask the user for the path of their
  MySFXKit checkout.
- Check the root: `core/index.js`, `core/README.md` and `adapters/web/index.js` exist there.
  Below, `<kit>` stands for that absolute path; replace it in every command.
- Read `<kit>/core/README.md` once before step 3: "Public API", "Recipe format v0",
  "Expr language" and "Blocks". Do not rely on memory of the format; it changes.
- Requirements: Node (to run core in your shell), and for a web game a page served over
  HTTP from `localhost` or HTTPS (an AudioWorklet does not load from `file://`).

Done when: you have `<kit>` and those three files exist.

## 1. Scan the project

- Identify the engine and language. Web (a browser page with JavaScript or TypeScript) is the
  only engine with an adapter. For any other engine tell the user that its adapter does not
  exist yet (raylib/C++ and Unity are planned for the kit's Phase 1). Do steps 1 to 3 and the
  offline checks of step 6, then stop: give the user the validated recipe files and a WAV
  render, and integrate nothing.
- Find the existing audio: audio files (`.wav`, `.ogg`, `.mp3`), `AudioContext`, `new Audio(`,
  `.play(` and audio libraries.
- Find the sound moments. Events: jump, hit, collision, pickup, button click, explosion,
  death, door. Continuous state: speed, throttle, engine load, wind, rain, distance to
  something. Note the file and line of each, and the variable that carries its value.

Done when: you have a list of sound moments, each with its code site (file:line), its kind
(event or continuous) and, for continuous state, the variable and its range.

## 2. Find the missing sounds

- Compare the list with the existing audio. A moment with no sound is missing; a sound the
  user wants replaced by synthesis counts too.
- For each missing sound note: what it should sound like, its game inputs (continuous
  values and their ranges), its game events (with a strength, if the game has one, such as
  impact speed), and whether it has a position in the world.
- Show the list to the user and let them choose which sounds to make. Do not add sounds the
  user did not choose.

Done when: the user has confirmed the list of sounds to make.

## 3. Pick or write a recipe

- Look first in `<kit>/core/recipes/`: `core/README.md` describes each bundled recipe, its
  inputs, its events and its character. Pick one whose inputs and events match the sound's
  (a continuous input, an event, or both) and whose character is close. Copy it into the
  game project and adapt it.
- Otherwise write a new recipe by the rules of `core/README.md`.
- Name each recipe input after the game value that drives it, and each `trigger` node after
  the game event that fires it. In a copied recipe, renaming an input or a trigger id means
  renaming every reference to it in the recipe; validate again afterwards.
- Give each input the range the game value really takes, and set its default to the game
  value at rest. The recipe plays its defaults until the first `setInput`: a copied default
  (wind's 0.5) sounds before the game has moved.
- Keep each recipe as one `.json` file in the game project, where the game keeps its other
  data or assets.
- Validate every recipe file with core's `validateRecipe`, and fix each error it reports
  (`node`, `path`, `message`) until it passes:

  ```sh
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { validateRecipe } from "<kit>/core/index.js";
  const result = validateRecipe(JSON.parse(readFileSync(process.argv[1], "utf8")));
  console.log(result.ok ? "valid" : result.errors);
  process.exit(result.ok ? 0 : 1);
  ' path/to/recipe.json
  ```

Done when: every recipe file prints `valid`.

## 4. Integrate (web games only)

The adapter's API is `<kit>/adapters/web/README.md`; read it.

- Make the kit's `core/` and `adapters/web/` reachable from the game's web server, keeping
  their relative layout: `adapters/web/index.js` and `processor.js` import
  `../../core/index.js`. Ask the user whether to copy those two folders into the game or to
  serve the kit next to it.
- Create one `AudioContext` inside a user gesture handler (a click or a key press), and call
  `context.resume()` before the first `await` in that handler. Browsers start audio only
  on a gesture. `<kit>/adapters/web/demo.html` shows this pattern. If the game has no click
  handler, start audio on its first `keydown` or `pointerdown`. Start once: the start is
  async, so a second gesture can arrive before it finishes; keep the start promise and
  reuse it rather than creating a second context.
- For each sound: `const player = await createRecipePlayer(context)`, then
  `player.onError(...)` to log errors, then `player.node.connect(context.destination)`
  (step 5 puts a panner in between).
- Fetch the recipe file, `JSON.parse` its text, then `await player.load(recipe)`. `load`
  validates again and rejects with an `Error` that carries `.errors`. Never run recipe text
  as code.
- Wire game state: after each `load`, and whenever the game value changes (once per frame
  at most), call `player.setInput(name, value)`. Each `load` resets every input to its
  default.
- A `setInput` or `trigger` sent before the first `load` is ignored
  (`<kit>/adapters/web/README.md`). Game code that runs before audio starts must check that
  the player exists and its `load` has resolved, or skip the call.
- Wire events: at each event's code site call `player.trigger(id, strength)`, where `id` is
  the recipe's `trigger` node id.

Done when: the page loads with no console error, every `player.load` resolves, the
`onError` callback stays silent, and every recipe input and event is called from the game
code.

## 5. Position (web games only)

For a sound with a place in the world, put a WebAudio `PannerNode` between the player and
the destination. The kit's playground does this (`<kit>/playground/main.js`,
`pannerOptions` and `updateScene`; `<kit>/playground/scene.js`, `pannerPosition`). Read it
as an example; do not import playground code into the game.

- `const panner = new PannerNode(context, { panningModel: 'equalpower', distanceModel: 'exponential', refDistance, rolloffFactor, maxDistance: 10000 })`,
  then `player.node.connect(panner).connect(context.destination)`.
- Positions are in the game's own units; pixels are fine. Choose `refDistance` (full level
  inside it) and `rolloffFactor` for the play area: the playground's 25 is in metres for a
  100 m scene, with rolloff 0.8, so a 1000-pixel screen needs a `refDistance` of about 250.
- Pick the listener: the camera (or screen centre) or the player character. A sound the
  listener itself makes needs no panner: with the player as listener, the player's own
  engine connects straight to the destination. With the camera as listener, the player's
  sound is positioned like any other.
- Each frame, compute the source's offset from the listener in the listener's frame. Keep
  the default listener (at the origin, facing -z, up +y) and map the offset:
  - a right/forward offset `(x, y)` (forward = the way the listener faces) becomes
    `(x, 0, -y)`;
  - a top-down screen offset `(dx, dy)` (dx right, dy down the screen; up the screen is
    forward) becomes `(dx, 0, dy)`;
  - a side-view screen offset `(dx, dy)` (dy down the screen) becomes `(dx, -dy, 0)`.
  Check the sign: a source to the right of the listener must get a positive `positionX`.
- Move the panner smoothly: `panner.positionX.setTargetAtTime(x, context.currentTime, 0.02)`,
  and the same for `positionY` and `positionZ`.

Done when: every positioned sound plays through a `PannerNode` whose position the game
updates from world coordinates every frame.

## 6. Verify

You cannot hear. Check what you can, then tell the user what to listen for.

- Every recipe passes `validateRecipe` (step 3).
- Every recipe renders a non-silent buffer with core's `renderOffline`. Set typical
  inputs, and fire each event, or an event-only recipe stays silent:

  ```sh
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { renderOffline } from "<kit>/core/index.js";
  const recipe = JSON.parse(readFileSync(process.argv[1], "utf8"));
  const inputs = {}; // set typical game values, e.g. { thrust: 0.8 }
  const events = recipe.nodes.filter((n) => n.type === "trigger").map((n) => ({ at: 0.25, name: n.id, strength: 1 }));
  const out = renderOffline(recipe, { seconds: 5, inputs, events });
  let sum = 0, peak = 0;
  for (const s of out) { sum += s * s; peak = Math.max(peak, Math.abs(s)); }
  console.log({ rms: Math.sqrt(sum / out.length), peak });
  ' path/to/recipe.json
  ```

  An RMS near 0 means silence: check gains, envelopes and the input values. Change
  `inputs` to check other game states, the rest value included. A sound with a
  random first event (a `randomTrigger` with a late `first`) needs more `seconds`.
- A WAV for the user (and the only output for a non-web engine): the user can paste the
  recipe into the kit's playground and press Download WAV (`<kit>/playground/README.md`).
- Web games: the page loads with no console error and `onError` stays silent. Check this
  with a browser tool if you have one; otherwise ask the user.
- Ask the user to listen and confirm: each sound starts after the first click or key
  press; each continuous input changes the sound audibly across its range; each event sounds
  at the right moment; a sound to the left of the listener is heard on the left; the levels
  sit well against each other and the game's other audio.

Done when: every recipe is valid and non-silent, the page shows no error, and the user has
confirmed what they heard.
