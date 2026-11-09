# Lead handoff — 2026-11-09, lead session 6 → next lead session

## Kemal için özet

**Durum: yolunda.** Ders 2026-11-20'de. Bu oturumun iki işi de bitti, testlerden geçti ve
push'landı.

Bugün bitenler:

- Playground'un yeni karanlık tasarımı. Senin seçtiğin yön: A ile C'nin karışımı.
- Başlıkta EN/TR düğmesi. Arayüz iki dilli ve seçilen dil tarayıcıda hatırlanıyor.
- Türkçe arayüzle çekilmiş altı yeni ekran görüntüsü: `docs/lecture/screenshots/`.
- Bu görüntülerin beşi destede dört slayta kondu (15. sürüm).

Açık ve sende:

- Destede değişen dört slayta bakmak. "Sınıfın isteği, canlı" slaytında pay az.
- Playground'u Safari'de açmak. Tasarım şimdiye kadar yalnızca Chrome'da göründü.
- `docs/STATE.md`'deki elle denetimler ve dinleme turu.
- Leeway videoları ve ekran görüntüleri, taslağın açık noktaları, `LICENSE` için telif adı.

Açık ve ajanda: yok. Dersten önce yalnızca demoda görünen hatalar düzeltilecek; bu senin
2026-11-09 kararın.

## Brief for the next lead session

Route: quick · Risk: low · Checks: `./scripts/check.sh` PASS before any commit.

1. Delete this file and its line in `docs/STATE.md` once you have read them.
2. No agent task is queued. Kemal decided on 2026-11-09 to fix only demo-visible bugs before
   the lecture. Wait for Kemal's results from his manual checks and his look at the deck.
3. If Kemal reports a slide that does not fit: the deck is
   https://claude.ai/artifact/TiWoR4Y2gmjWSuWZCUB6s1, slides `b3-varyasyon`, `b3-parametre`,
   `b3-olay` and `b6-canli`. Read the slide file first (`Artifact` action `read` with `path`).
   The images are already uploaded; change only the `<img>` size.
4. If Kemal reports a playground bug: it is demo-visible by definition, so brief a worker for
   it (one module, `Owns:` line) and run a fresh `diff-reviewer`.
5. Screenshots are retaken with the one-off script
   `/private/tmp/claude-501/-Users-kemalberhantan--Development-Projects-MySFXKit/ef52e57c-b4a8-44b9-a94f-810d09a8d75d/scratchpad/shots2/deck.mjs`
   (`node deck.mjs <repo root> <out dir>`). It drives headless Chrome over the DevTools protocol,
   switches the UI to Turkish, and saves six 2560×1600 shots. It is a temporary file. If it is
   gone, write it again from this description. `safaridriver` timed out connecting to Safari on
   2026-11-09.
