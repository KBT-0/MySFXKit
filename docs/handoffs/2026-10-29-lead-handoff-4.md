# Lead handoff — 2026-10-29, lead session 4 → next lead session

## Kemal için özet

**Durum: yolunda.** Ders 2026-11-20'de; sunum taslağı teslim gününde hazır.

Bitenler (testli, taze incelemeden geçti, push'landı; hiçbiri tarayıcıda denenmedi, hiçbir ses dinlenmedi):

- Sunum taslağı `docs/lecture/outline.md`: sekiz blok, 3B konumlandırma bloğu ve 120 dakikalık plan. Başlık, tarih ve konuşmacı satırı kesin.
- Prova listesi `docs/lecture/rehearsal.md`.
- Playground'da "Copy prompt" düğmesi. Ayrı bir yapay zekâ yalnızca bu metinle üç geçerli tarif yazdı; yalnızca Claude ile denendi.
- Playground'da 2B dinleyici sahnesi: mesafe ve sağ-sol, Leeway'in formülüyle.
- Dört klasik örnek (tıklama, zıplama, patlama, rüzgâr) ve WAV indirme.

Doğrulanmayanlar:

- Yeni özelliklerin hiçbiri Safari'de açılmadı.
- WAV dosyaları QuickTime'da çalınmadı.
- Klasik sesler ve Leeway sesleri dinlenmedi.

Açık ve sende:

- Taslağı bir kez okumak.
- `docs/STATE.md`'deki elle kontrol listeleri: playground'un eski altı adımı, "Copy prompt" için dört adım, sahne, klasikler ve WAV için on adım.
- Provanın kendisi.
- `LICENSE` dosyasındaki telif sahibi adı.

Açık ve ajanda:

- Ajan talimatının (skill) ilk sürümü. Bu aşamada yapılacak son yazılım işi bu.

Risk:

- Kapı kontrolündeki bellek testi bazen kırmızı düşüyor. Bunun nedeni makinenin yükü.
- Düşerse ve tek hata buysa, kontrol bir kez daha çalıştırılır ve durum not edilir.
- Asıl düzeltme senin kararınla ders sonrasında yapılacak.

İstenen tek karar: yeni oturum, ajan talimatına başlamadan önce kapsamı bir kez soracak.

## Brief for the next lead session

Route: deep · Risk: high for the skill text (the agent skill text is a risky area: the review
gate applies), low for docs · Checks: `./scripts/check.sh` PASS. Model: lead at high
effort; workers Opus 5.5, high, as `worker` sub-agents; reviews by fresh `diff-reviewer`
sub-agents, Opus 5.5, high, one after the other. Every Agent call names `model` and
`effort` (a hook blocks it otherwise).

1. **Task.** BACKLOG SFX-7, the remaining part: skill v0, the agent's workflow text of brief
   §5 (`docs/MySFXKit_brief.md` line 79: "projeyi tara → ses eksiklerini bul → ..."; phase
   scope in `docs/PHASES.md`: "scan project → find missing sounds → pick or write a recipe →
   integrate → position → verify"). It lives in a new top-level `skill/` folder
   (`docs/ARCHITECTURE.md` line 78, "planned"; line 25: the skill "decides workflow, never
   the format"). Ask Kemal once, through the question tool, for the scope of v0 before any
   work: which agent tools it targets (Claude Code skill format, a plain Markdown file any
   agent reads, or both), and whether "integrate" means the web adapter only (the only adapter
   that exists) or a written procedure for other engines too. Non-goals: Unity or C++
   adapters (Phase 1), MCP (Phase 2), any change to the recipe format, `core/`, `adapters/`.
   The copy-prompt text already exists in `playground/prompt.js` (`buildPrompt`); the skill
   must not become a second, drifting description of the format: point to `core/README.md`
   or reuse it, and say how drift is guarded.
2. **Files (verified 2026-10-29).** `docs/MySFXKit_brief.md` §5 and §6; `docs/ARCHITECTURE.md`
   lines 19, 25, 49, 78; `core/README.md` (format v0, blocks, the eleven recipes);
   `adapters/web/README.md` (player API); `playground/prompt.js`; `docs/PHASES.md`. A new
   module folder also needs its `AGENTS.md` (`MODULE_AGENTS_TEMPLATE.md` at the root) and a
   row in `docs/ARCHITECTURE.md`; `module_roots` in `scripts/check.sh` is empty (BACKLOG
   SFX-11, SFX-14). Owns (to confirm with Kemal's scope): `skill/`, `docs/ARCHITECTURE.md`.
3. **Constraints.** "Never decide an OPEN item." "The site is serverless and calls no LLM
   itself; the kit binds to no AI vendor." "Adding any third-party dependency requires
   Kemal's approval." `../project_leeway` (on this Mac:
   `../MyGameEngine_Projects/project_leeway`) is READ-ONLY: no write, no `git` there. No AI
   attribution in git. One task, one module; the skill text is a risky area, so the review
   gate runs before the commit.
4. **Acceptance.** Skill v0 exists in the agreed form; a worked check shows an agent
   following it on a small sample project (for example a copy of `adapters/web/demo.html`
   with a missing sound) produces a valid recipe, wired through `createRecipePlayer`; the
   review gate passed; `./scripts/check.sh` PASS on the commit.
5. **Owner's words.** "Karar benim; öneri sun ve dur." (2026-10-22). "hepsini sırayla
   yapalım" (2026-10-28: copy prompt, 2D scene, WAV and classics, rehearsal; all done). Title:
   "bu arada başlık kesinleşti; 20 Kasım - Oyun Sesi Nasıl Düşünür? Prosedürel Ses ve 3B
   Konumlandırma - Kemal Tan" (PROJECT 2.8). Commit without asking; ask "push yapayım mı?"
   through the question tool before every push, then run `git push origin main` yourself.
   Allocation: "Ertele, belgeyi düzelt" (2026-10-23, SFX-20 after the lecture); for the
   flaky test Kemal chose "Geri al, ölçümü yaz" (2026-10-29).
6. **Tried and dropped.** SFX-25: running `core/alloc.test.js` alone after the other test
   files did not stop the flake (the solo step failed under machine load, about 240 to 250 KB
   against 32 KB); reverted, kept as `git stash` "SFX-25 attempt", which also holds a
   `tests/build_test_cmd_test.sh` fixture that guards `build_test_cmd`. When the gate is red
   and its only failure is `core/alloc.test.js`, re-run it once and say so in the report;
   never call the red run a pass. A worker that spawns background work sends interim
   "waiting" notices; wait for its hand-back, do not resume it. A worker cut off by a network
   error (`ENOTFOUND`) was resumed in place with SendMessage and finished.
7. **State.** HEAD is the commit that adds this file, on `main`; `origin/main` is `82770df`
   plus `b7048bc` and this file's commit, not pushed (ask Kemal). Working tree clean. Session
   cost (`scripts/agent_cost.py --latest`, before the handoff): 313 requests, cache read
   26.83M, cache write 1.39M, output 247.4k, hit 95 percent; lead 100 requests, context 47k
   to 217k; one failed worker attempt (network error, resumed). `/usage: NOT RUN`.

Updating `docs/STATE.md` at session end is the implementer's job. Delete the "Handed off"
line in STATE and this file once they are read. If anything above is ambiguous, STOP and ask
Kemal; do not widen the task to make an unclear part fit.
