# Lead handoff — 2026-10-22, setup session → next lead session

## Kemal için özet

**Durum: yolunda.** Ders 2026-11-03, sunum taslağı 2026-10-29'a kadar.

Biten (doğrulandı): Keel v0.12.1 kurulu, gate yerel ve CI'da PASS; repo `KBT-0/MySFXKit`
public, `main` push'lu; brief `docs/MySFXKit_brief.md`'de; §5.1 değerlendirmesi
`docs/research/2026-10-22-format-evaluation.md`'de (öneri: B + expr + 4 kontrol bloğu +
AudioWorklet yorumlayıcı). Biten (doğrulanmadı): kurulumdaki ajan varsayımları (model
seçimleri, faz sırası, kit-feedback kuralı), `docs/STATE.md`'de listeli.

Açık ve senin: §5.1 format kararı; brief §9 (ders süresi, öğrenci laptop'u, isim, lisans,
Steam vakaları); STATE'teki 4 manuel kontrol. Açık ve ajanın: SFX-2'den itibaren backlog.

Risk: §5.1 kararı 23 Ekim'i geçerse, takvimden gün yakılır; o zaman B ile başla, karar
sonradan değişirse şema katmanı atılır. Pages yayını `playground/` doğunca bir kez elle
açılır (Settings → Pages → main, kök veya `/playground`).

İstenen tek karar: **§5.1 formatı** (A / B / C). Öneri B.

## Brief for the next lead session

Route: deep · Risk: medium · Checks: `./scripts/check.sh` PASS; fixture tests in
`tests/boundary_checks_test.sh`. Model: Fable 5.1 (lead; `docs/WORKFLOW.md`, "Model
routing"), high effort. Workers: Opus, high, per `.claude/agents/worker.md`.

1. **Task.** Continue from `docs/BACKLOG.md` SFX-1: obtain Kemal's §5.1 decision in chat
   (present the recommendation in three lines, then stop), record it as DECIDED in
   `docs/PROJECT.md` §2.2 with his words, then start SFX-2: `core/` recipe model and JS
   interpreter with an offline renderer and seeded feature tests, then the AudioWorklet
   adapter in `adapters/web/`, then the diesel recipe. Non-goals: Unity, C++ interpreter,
   MCP, Faust export, music (`docs/PHASES.md`). Do not touch
   `../MyGameEngine_Projects/project_leeway` (read-only; no writes, no git commands).
2. **Files (verified 2026-10-22).** `docs/MySFXKit_brief.md`; `docs/research/2026-10-22-format-evaluation.md`
   (§1 block list, §2 recipe sketch, §4 recommendation, §7 day plan); `docs/PHASES.md`;
   `docs/STATE.md` (open defaults and manual checks); `docs/BACKLOG.md` (SFX-1..8);
   `scripts/boundary_checks.sh` (two dormant checks arm when `playground/` and `core/`
   appear); `tests/boundary_checks_test.sh`; `scripts/check.sh` lines `module_roots=""`
   and `build_test_cmd="sh tests/boundary_checks_test.sh"`. Reference DSP:
   `../MyGameEngine_Projects/project_leeway/engine/audio/voices.hpp`, `soundscape.hpp`,
   `sound_tuning.hpp`, `tests/soundscape_test.cpp`.
   Owns: core/, adapters/, tests/, docs/ARCHITECTURE.md, scripts/check.sh
3. **Constraints.** The playground never executes pasted text as code (`eval`, `Function`,
   dynamic `import(`); a recipe is data, validated then interpreted. `core/` imports no
   adapter and not the playground. No untested code in `core/` or an adapter: a logic change
   brings its test in the same change. When `core/` lands, set `module_roots="core adapters"`
   in `scripts/check.sh`, add the modules to the `## Module map` of `docs/ARCHITECTURE.md`,
   and extend `build_test_cmd` to run the JS tests (Node is on `/opt/homebrew/bin`; add it
   to `toolchain_path` and to `.github/workflows/ci.yml` with `actions/setup-node`). Exprs
   are parsed into an AST, never `eval`ed. Every Agent call names `model` and `effort`
   (`guard_worker_route.py` blocks it otherwise). Never run `git remote` commands; Kemal
   runs them.
4. **Acceptance.** `./scripts/check.sh` PASS with the new tests; the diesel recipe plays in
   Safari and Chrome on this Mac from a bare page with a throttle slider; the boundary
   checks print no DORMANT note once their folders exist and their fixtures still PASS.
   Gate and CI changes are risky: fresh review before commit (`docs/REVIEW_GATE.md`).
5. **Owner's words.** "Karar benim; öneri sun ve dur." (2026-10-22). "bu repo public olucak"
   (2026-10-22; recorded as PROJECT §2.3). Brief KARAR items are binding; AÇIK items are his.
6. **Tried and dropped.** `diff-reviewer` sub-agent type was not loaded in the setup session
   (agents load only in a session started after they exist); a general Opus agent with the
   same brief reviewed instead. `git remote add` from the agent is refused by the kit hook.
7. **State.** HEAD `252e724` on `main`; `origin/main` is one or more commits behind until
   Kemal pushes. Working tree clean after this handoff's commit.
