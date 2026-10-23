# Lead handoff — 2026-10-23, lead session 3 → next lead session

## Kemal için özet

**Durum: yolunda.** Ders yaklaşık 2026-11-03; sunum taslağının teslimi 2026-10-29.

Bitenler (testli, incelemeden geçti, push'landı):

- Leeway'in kalan altı sesi tarif olarak `core/recipes/` içinde: gövde suyu, şehir uğultusu, korna, vapur düdüğü, gövde çarpması, martı.
- Bu sesler için yeni bloklar eklendi.
- Web adaptörü çarpma olayını iletiyor.
- Playground yedi örneği listeliyor ve çarpma için bir düğme gösteriyor.
- Kararların PROJECT §2.4–§2.6'ya yazıldı.

Doğrulanmayanlar:

- Hiçbir ajan sesleri dinlemedi.
- Martı bellek ayırma testinde değil.

Açık ve sende:

- STATE'teki altı adımlı Safari kontrolü: dinleme ve tarif değiştirirken çıtırtı.
- Brief §9 soruları.
- Kurulum varsayımları.

Açık ve ajanda:

- Sunum taslağı.
- Ertelenen bellek ayırma işi (dersten sonra).

Risk: Chrome'da (V8) tarif değiştirdikten sonra ses yolu bellek ayırıyor. Safari'de büyük olasılıkla sorun yok, ama ölçülmedi. Senin Safari kontrolün tek kanıt olacak.

İstenen tek karar: **sunumun formatı** (yeni oturum bir kez soracak; varsayılan, `docs/lecture/` içinde bir Markdown ana hat).

## Brief for the next lead session

Route: deep · Risk: low for the deck (docs only), medium for any `core/`, adapter or
playground code · Checks: `./scripts/check.sh` PASS. Model: lead at high effort; workers
Opus 5.5, high, as `worker` sub-agents; reviews by fresh `diff-reviewer` sub-agents, Opus 5.5,
high. Every Agent call names `model` and `effort` (a hook blocks it otherwise).

1. **Task.** SFX-4 in `docs/BACKLOG.md`: the presentation draft, due 2026-10-29: blocks 1–8
   of brief §7 (`docs/MySFXKit_brief.md`), with screenshots of the playground and the Leeway
   demo. Ask Kemal the format once (question tool); a Markdown outline in `docs/lecture/` is
   the fallback. Brief §9 is answered (PROJECT 2.7): two hours with a break, time is not
   tight; a lab whose PCs probably have no audio output, students asked to bring laptops or
   headphones, so every listening step must work from the projector alone and the laptop
   exercise is optional; no Steam cases. Lecture title, proposed by the lead and answered "tamam devam edelim" by Kemal (read as accepted, not confirmed as final): "Sesin Tarifi: Kaydetmeden Üretilen, Oyunun Durumuna Tepki Veren Prosedürel Oyun Sesi". Confirm it once before it goes on the title slide. Non-goals: Unity, C++ interpreter, MCP, Faust
   export, music, 2D listener scene, WAV export, copy-prompt text (SFX-6, SFX-7), marketing
   the kit in the lecture (brief §2 KARAR).
2. **Files (verified 2026-10-23).** `docs/MySFXKit_brief.md` §2, §6, §7, §9, §10;
   `docs/PROJECT.md` §2.2–§2.6; `core/README.md` (format, blocks, the seven recipes);
   `core/recipes/*.json`; `playground/README.md`; Pages:
   `https://kbt-0.github.io/MySFXKit/playground/`. Leeway demo: `taka_sound.txt` + F5 in
   `../MyGameEngine_Projects/project_leeway` (READ-ONLY). Owns: docs/lecture/.
3. **Constraints.** "Never decide an OPEN item."
   No marketing of the kit in the lecture (brief §2 KARAR). The kit is the bench the concepts
   are shown on, not the subject. `../project_leeway` is READ-ONLY: no write, no `git` there.
   No AI attribution in git. Screenshots need a browser; Chrome is not installed on this
   Mac; if a screenshot cannot be taken, leave a named placeholder and say "not run".
4. **Acceptance.** The deck draft exists in the chosen format by 2026-10-29 and Kemal has
   read it once. `./scripts/check.sh` PASS on the commit.
5. **Owner's words.** "Karar benim; öneri sun ve dur." (2026-10-22). Commit without asking;
   ask "push yapayım mı?" before every push, then run `git push origin main` yourself.
   Reviews one after the other, not in parallel. Allocation fix: "Ertele, belgeyi düzelt"
   (2026-10-23; BACKLOG SFX-20, after the lecture).
6. **Tried and dropped.** For the allocation issue: V8 flags (`--no-maglev`,
   `--no-maglev-function-context-specialization`, `--no-flush-bytecode`) and shared
   functions with object-literal state did not help; details in BACKLOG SFX-20. A worker
   that spawns its own background work sends an interim "waiting" notice; wait for its
   hand-back, do not resume it.
7. **State.** HEAD is the commit that adds this file, on `main`; `origin/main` is
   `6058c03`; this file's commit is not pushed (ask Kemal). Working tree clean. Session
   cost (`scripts/agent_cost.py --latest`, before the handoff): 466 requests, cache read
   40.43M, cache write 1.59M, output 460.8k, hit 96 percent; lead 68 requests, context 49k
   to 192k; one failed worker attempt (SFX-20, blocked by design, no code) 48 requests.
   `/usage: NOT RUN`.

Updating `docs/STATE.md` at session end is the implementer's job. Delete the "Handed off"
line in STATE and this file once they are read. If anything above is ambiguous, STOP and ask
Kemal; do not widen the task to make an unclear part fit.
