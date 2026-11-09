# Manual checks owed to Kemal

This file is the single list of manual checks that no agent can run: listening, a real
browser by hand, other devices and the deck. It replaces the numbered lists that sat in
six `docs/STATE.md` entries (2026-11-09, lead session 8). Kemal ticks a box when the check
passes. Kemal writes a short note under a box when the check fails. The lead deletes this
file once every box is ticked or moved to `docs/BACKLOG.md`.

The browser probe of 2026-11-09 already passed these in Safari 27 and Chrome 157, so they
are not listed again: the diesel starts on one click and the throttle changes it; a source
40 m right sounds only on the right; all eleven examples load and sound; an invalid recipe
lists errors while the old sound plays on; an event pressed after Stop stays silent; the
WAV file is 1 ch, 48000 Hz, Int16; Copy prompt fills the clipboard on localhost.

The tag after each check names the `docs/STATE.md` or `docs/BACKLOG.md` item it closes.

## Setup

1. In the repository root, run `python3 -m http.server 8000`.
2. Open `http://localhost:8000/playground/` in Safari, with headphones on.
3. Set the window to about 1280×720. Repeat part A in Chrome.

## A. Layout and keyboard (Safari, then Chrome)

- [ ] A1. Load the diesel example. The page does not scroll; the panels scroll inside. (redesign)
- [ ] A2. Drag the source to all four corners of the scene. (redesign)
- [ ] A3. Press Tab through every control. A focus ring shows on each one. On the source, the
      arrow keys move it 1 m and Shift with an arrow moves it 10 m. (redesign, SFX-6)
- [ ] A4. Switch to TR and read every Turkish text once. Switch EN/TR while a sound plays;
      the sound continues. (EN/TR switch)

## B. Behaviour by ear (Safari, headphones)

- [ ] B1. Before the first Play, move the source and both scene sliders, then press Play.
      The first sound matches the circle's place and the read-out, and it does not fade
      in from full level. (SFX-6, demo fixes)
- [ ] B2. Play the diesel. Drag the reference and rolloff sliders during playback: the level
      glides and never steps. (demo fixes)
- [ ] B3. During playback press Stop, drag the source, press Play, then switch the example.
      The sound keeps playing at the new place. (SFX-6)
- [ ] B4. Paste an edited, valid recipe while a sound plays. The sound switches and the
      sliders are rebuilt. (SFX-3)
- [ ] B5. Load "Hull impact (Leeway)". Press `impact` before Play: the status asks for Play
      and nothing sounds. Press Play, then `impact` at strength 1, 0.5 and 0: the thud
      weakens and is silent at 0. (SFX-5)
- [ ] B6. Load the diesel: the event row disappears. (SFX-5)
- [ ] B7. Switch between the examples ten times while sound plays. Then listen to
      `city_bed` and `gull` for a minute each and note any click or dropout. (SFX-5, SFX-20)
- [ ] B8. Open `http://localhost:8000/adapters/web/demo.html`. Play gives the diesel, the
      throttle changes it while it plays, Stop and Play toggle, and no error shows. (SFX-2)
- [ ] B9. Optional. Compare level and pan at the listener, inside the reference circle, at
      its edge and in a corner against the build before commit `74bf7c7`. They
      match. An agent can check out the old build into a temporary folder for this. (demo fixes)

## C. Listening on the lecture Mac

- [ ] C1. Listen against Leeway in game: `hull_water` at speed 0, 0.5 and 1 (at 0 it is
      very quiet, as in Leeway), `city_bed`, `horn`, `ferry` (first whistle at 1 s, then
      every 35 to 90 s) and `gull`. The tests measure pitch, timing and level, not timbre.
      (SFX-5)
- [ ] C2. The four classics are recognisable as a UI click, a jump, an explosion and wind.
      (SFX-6)
- [ ] C3. In a terminal on the lecture Mac, `node --version` prints 26 or later. (SFX-2)

## D. WAV export

- [ ] D1. Load "Jump (classic)" and press Download WAV. `jump.wav` downloads and plays in
      QuickTime. (SFX-6)
- [ ] D2. Make the recipe text invalid and press Download WAV. The error list shows, no file
      downloads, and the old recipe's sliders stay. (SFX-6)
- [ ] D3. Move an input slider and an event strength slider, then download. The WAV sounds
      different from one rendered at the defaults. (SFX-6)
- [ ] D4. Set Seconds to 30 and download: "Rendering..." shows before the page freezes.
      Type 100: the field shows a clamped value. (SFX-6)

## E. Copy prompt and a real AI

- [ ] E1. Open the playground from the Mac's LAN IP (for example
      `http://192.168.x.x:8000/playground/`), not localhost. Press Copy prompt: a read-only
      box shows the prompt, selected, above the recipe box. (SFX-7)
- [ ] E2. Press Copy prompt with an empty description, then with one over 2000 characters.
      Each shows an error, and an open fallback box hides. (SFX-7)
- [ ] E3. Paste the prompt into ChatGPT or Gemini. Paste its reply into the recipe box: it
      loads and plays. (SFX-7)

## F. Other devices and pages

- [ ] F1. On a phone, open the Pages playground and drag the source by touch. The page does
      not scroll during the drag; the page above and below the scene still scrolls. (SFX-6)
- [ ] F2. In Safari, a page with two recipe players on one `AudioContext` plays both sounds
      with no error. No such page exists yet; an agent can write a throwaway one. (SFX-7, skill)

## G. Lecture deck

- [ ] G1. Look through the deck once: https://claude.ai/artifact/TiWoR4Y2gmjWSuWZCUB6s1.
      The five playground screenshots fit their slides. (deck)
- [ ] G2. On a projector, or a screen viewed from a few metres away, the small mono labels
      are readable. (deck)
