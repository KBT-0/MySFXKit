# Lead handoff — 2026-10-22 (evening), lead session 2 → next lead session

## Kemal için özet

**Durum: yolunda.** Ders 2026-11-03, sunum taslağı 2026-10-29'a kadar.

Biten (doğrulandı): §5.1 format kararı B olarak PROJECT §2.2'de; `core/` (tarif modeli,
expr dili, yorumlayıcı, çevrimdışı render, dizel tarifi, 39 test); `adapters/web/`
(AudioWorklet adaptörü, 13 test); `playground/` v0 (yapıştır, doğrula, çal, kaydırıcılar,
9 test); gate ve CI her push'ta yeşil; GitHub Pages yayında:
`https://kbt-0.github.io/MySFXKit/playground/`. Her riskli diff taze Opus incelemesinden geçti.
Biten (doğrulanmadı): hiçbir ajan sesi dinlemedi; Chrome bu Mac'te yok.

Açık ve senin: Safari'de dinleme kontrolü (STATE'te yazılı dört adım); brief §9 soruları
(ders süresi, öğrenci laptop'u, isim, lisans, Steam vakaları); STATE'teki kurulum
varsayımları. Açık ve ajanın: kalan beş Leeway tarifi (bunlar `core/`'a yeni bloklar
ister) ve sunum taslağı.

Risk: sunum taslağı için ders süresi ve öğrenci laptop'u cevabı gelmezse, taslak 60 dakika
ve laptop'suz varsayımıyla yazılır, cevap gelince bir blok değişir. Tarif işinde yeni blok
eklemek `core/`'u değiştirir: her blok testiyle gelir, taze inceleme şart.

İstenen tek karar: **ders süresi ve öğrencilerde laptop var mı** (brief §9).

## Brief for the next lead session

Route: deep · Risk: medium (core and playground are risky areas; a gate line is high) ·
Checks: `./scripts/check.sh` PASS; `node --test core/ adapters/web/ playground/` green;
`sh tests/boundary_checks_test.sh` PASS. Model: Fable 5.1 lead, high effort; workers Opus 5.5,
high, as sub-agents of type `worker`; reviews by fresh `diff-reviewer` sub-agents, Opus 5.5,
high. Every Agent call names `model` and `effort` (a hook blocks it otherwise).

1. **Task.** Two tasks in `docs/BACKLOG.md`, in this order unless Kemal says otherwise.
   (a) SFX-5, the remaining Leeway recipes as data in `core/recipes/`: hull water, hull
   impact, gull call, city noise bed, horn and ferry whistle. The evaluation
   (`docs/research/2026-10-22-format-evaluation.md` §1–§2) lists what each needs beyond the
   seven blocks that exist (`noise`, `osc`, `lowpass`, `bandpass`, `shape`, `mix`, `pulse` in
   `core/blocks.js`): an `lfo` with a harmonic, a `trigger` input with strength (impact), a
   `randomTrigger` scheduler (horn, ferry), a `sequence`/`choose` pair (gull), a `randomWalk`
   (city). Each new block is one registry entry in `core/blocks.js`, validated in
   `core/validate.js`, documented in the block table of `core/README.md`, and brought with
   a seeded feature test; each recipe gets a feature test like the diesel's (measure a
   feature, not sample values) and a line in `playground/examples.js`. Split it into
   worker tasks of one or two recipes each; the `core/` blocks for a recipe and the recipe
   itself may be one task. Leeway's numbers come from
   `../MyGameEngine_Projects/project_leeway/engine/audio/voices.hpp`, `soundscape.hpp` and
   `sound_tuning.hpp` (read-only: no write there, no git command there).
   (b) SFX-4, the presentation draft, due 2026-10-29: blocks 1–8 of brief §7, with
   screenshots of the playground and the Leeway demo; the format is Kemal's call (ask once;
   a Markdown outline in `docs/lecture/` is the fallback). It needs brief §9's answers
   (length, laptops); without them write under the assumption named in the summary above.
   Non-goals: Unity, C++ interpreter, MCP, Faust export, music, 2D scene, WAV export,
   copy-prompt text (those are SFX-6 and SFX-7), marketing the kit in the lecture.
2. **Files (verified 2026-10-22 22:50).** `core/index.js` (public API: `validateRecipe`,
   `compileRecipe`, `renderOffline`, `BLOCKS`, `BLOCK`), `core/blocks.js` (`BLOCKS` registry,
   line 21), `core/validate.js`, `core/compile.js` (exprs compiled to a stack program; params
   and state in typed arrays; no per-block allocation), `core/expr.js`, `core/rng.js`,
   `core/recipes/diesel.json`, `core/README.md` (format v0, expr table, block table),
   `core/alloc.test.js` (allocation budget 32 KB per 10 s; a new block must stay inside it);
   `adapters/web/index.js` (`createRecipePlayer`), `adapters/web/processor.js`;
   `playground/main.js`, `playground/recipe_text.js`, `playground/examples.js` (`EXAMPLES`
   array, line 3); `scripts/boundary_checks.sh` (eval check armed for `core` and
   `playground`; it scans Markdown too, so write `eval` only in backticks under those
   folders); `tests/boundary_checks_test.sh`; `scripts/check.sh` line 899 (`build_test_cmd`),
   line 740 (`module_roots=""`, left empty on purpose, see BACKLOG SFX-11); `.nvmrc` (26).
   Owns: core/, adapters/, playground/, docs/lecture/, docs/ARCHITECTURE.md, scripts/check.sh
3. **Constraints.** "The playground NEVER executes pasted or generated text as code (`eval`,
   `new Function`, dynamic `import(`). A recipe is data: validated, then interpreted."
   "`core/` is engine-free: it imports no adapter and not the playground." "No untested code
   enters `core/` or any adapter: a logic change brings its test in the same change."
   "Never produce code or design contradicting a DECIDED item in `docs/PROJECT.md`" (§2.2:
   format B, four control blocks, AudioWorklet interpreter; `custom` blocks only from the
   bundled library). "Never decide an OPEN item" (brief §9: name, licence, length, laptops).
   "`../project_leeway` is a READ-ONLY reference: no file is written there and no `git`
   command runs there." "Adding any third-party dependency requires Kemal's approval."
   "No AI attribution in git." The real-time path never allocates per block (`core/alloc.test.js`
   enforces it). Risk tiers: a diff touching `scripts/check.sh`, CI or a hook is HIGH: two
   fresh reviewers (`REVIEW_FOCUS=logic` and `portability`), one after the other unless Kemal
   allows parallel, and Kemal reads a ten-line summary before the commit; `core/`,
   adapters and playground code are MEDIUM: one fresh reviewer. Round 1 findings go back to
   the author (the same worker, resumed by message); round 2 confirms the fixes; a reviewer's
   Low goes to BACKLOG, never into the round.
4. **Acceptance.** Each recipe renders NaN-free with peak ≤ 1, plays in the playground from
   the examples dropdown, and its feature test is seeded and deterministic. `./scripts/check.sh`
   PASS; `core/alloc.test.js` green with every new block. The deck draft exists by
   2026-10-29 and Kemal has read it once.
5. **Owner's words.** "Karar benim; öneri sun ve dur." (2026-10-22). Format: "B: bildirimsel
   + expr + 4 kontrol bloğu + AudioWorklet" (2026-10-22, PROJECT §2.2). "commiti bana sormana
   gerek yok" (commit without asking; ask before every push, then run `git push origin main`
   yourself: "push yapim mi diye sorabilirsin bende yap derim", 2026-10-22). "bu repo public
   olucak" (PROJECT §2.3). Reviews run one after the other, not in parallel (2026-10-22).
   Custom domain: none until the name is decided (brief §9).
6. **Tried and dropped.** `toolchain_path="/opt/homebrew/bin"` and `module_roots="core"` in
   `scripts/check.sh`: reverted after round 1 (shadows nvm; the module check reads the
   wrong level), `.nvmrc` makes `doctor.sh` check Node instead. `v8.getHeapStatistics` for
   the allocation test: drifts 100 KB between calls; the sampling heap profiler
   (`node:inspector`) counting only `core/` frames is what works. A worker's inner reviewer
   once ran `node --test .` from `/` after a failed `cd`; brief every reviewer: never `cd`
   outside the project, never `node --test` outside the project root.
7. **State.** HEAD is the commit that adds this file, on `main`, pushed; `origin/main`
   equal. Working tree clean. Session cost (`scripts/agent_cost.py --latest`): 491 requests,
   cache read 42.74M, cache write 1.51M, output 464.9k, hit 97 percent; the lead alone 106
   requests, context 51k to 218k; the largest worker (core, step 1) 81 requests, one
   compaction. `/usage: NOT RUN` (Kemal did not paste it).

Updating `docs/STATE.md` at session end is the implementer's job. Delete the "Handed off"
line in STATE and this file once they are read. If anything above is ambiguous, STOP and ask
Kemal; do not widen the task to make an unclear part fit.
