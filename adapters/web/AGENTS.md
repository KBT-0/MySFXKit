# /adapters/web rules

- The WebAudio adapter: `index.js` (main thread) and `processor.js` (AudioWorklet). It runs the core interpreter; it never redefines a block or maps one to a native node (`docs/PROJECT.md` §2.2).
- It imports core only through `core/index.js`.
- The adapter's own real-time code (`process()`) allocates nothing after a recipe is loaded and never throws out of `process()`. The core's `render` still allocates once per 128-sample block (proposed core fix, SFX-2 report).
- A recipe is data: this module never executes recipe text as code and never parses it; the caller passes a parsed object.
- A change to the message protocol or the player API updates `README.md` and the tests in the same task; run `node --test adapters/web/`.
