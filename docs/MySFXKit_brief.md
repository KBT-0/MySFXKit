# MySFXKit — Proje Brief'i (taslak v0.1, 2026-10-20)

> Çalışma adı `MySFXKit` (alternatif: `MySoundSynthKit`) — **AÇIK**.
> Bu doküman Keel ile açılacak yeni projenin başlangıç girdisidir. Fable değerlendirmesinden önce
> hiçbir mimari karar kesin değildir; KARAR olarak işaretlenenler Kemal'in onayladıklarıdır.

## 1. Neden var

İki çıktı, tek iş:

1. **Ders:** İstanbul Kent Üniversitesi, Dijital Oyun Tasarımı bölümü, oyunlarda ses konulu
   tek seferlik misafir ders. Tarih: ~2026-11-03 (bugünden 2 hafta). Ana hoca teoriyi ve
   FMOD/Wwise gibi middleware'i zaten işliyor; Kemal'den beklenen sektörden gelen **pratik**.
2. **Kit:** Bir AI agent'ın (Claude Code, Codex, herhangi biri) oyun projesine bağlanıp ses
   ihtiyacını görmesini, sesi **sentezleyerek** üretmesini, oyuna entegre etmesini ve
   konumlandırmasını sağlayan açık kaynak araç seti. Kemal'in kit ailesinin parçası
   (MyAgentKit, MyModelKit…). Uzun vadeli geliştirilecek.

## 2. İlkeler (KARAR)

- **Kiti pazarlamıyoruz.** Ders, kit olmadan da geçerli kavramları öğretir; kit yalnızca bu
  kavramları gösterdiğimiz tezgâhtır. Test: öğrenci kiti hiç açmasa da dersten bir şey
  öğrenmiş olmalı. Kit adı derste en sonda tek slaytta "kaynak" olarak geçer.
- **Teori kısa, pratik ağırlıklı.** Teoriyi ana hoca veriyor.
- **Sunucusuz.** Site LLM çağırmaz; kullanıcı kendi AI'ını kullanır (bkz. §6). VPS yok.
- **AI'dan bağımsız.** Kit belirli bir model/sağlayıcıya bağlı değildir.
- **Dürüst tez:** "Foley/asset toplamak demode" değil; doğru tez:
  *"Prototip ve stilize oyunlarda sıfır kayıtlı asset ile gidebilirsiniz; sentezin sınırları şunlar."*
  Gerçekçi ayak sesi, kumaş, insan sesi, AAA detay hâlâ kayıt işidir — bunu derste söyleriz.
- Leeway'deki ses mantığı kitte serbestçe kullanılabilir (Kemal, 2026-10-20).
- **Ayrı repo.** Kit Leeway içinde geliştirilmez. Leeway `../project_leeway` yolunda,
  `claude --add-dir ../project_leeway` ile **yalnızca okunur referans** olarak açılır; oraya
  hiçbir dosya yazılmaz, commit atılmaz (Kemal, 2026-10-22). Kit olgunlaşınca Leeway'in kiti
  kullanması Leeway'in kendi kararıdır (Leeway `BACKLOG.md`'ye tek satır).
- **Geliştirme ve ders makinesi: Mac.** Derse Mac götürülecek; tüm geliştirme ve provalar
  Mac'te yapılır (Kemal, 2026-10-22). Leeway'de ses kodu değişirse önce diğer makinede push,
  sonra Mac'te pull.

## 3. Çıkış noktası: Leeway'de ne var

Leeway (`KBT-0/project_leeway`, private, C++20 + raylib) sesin tamamını koddan üretir, hiç
kayıtlı ses dosyası yoktur (GDD 10).

| Dosya | Görev |
|---|---|
| `engine/audio/voices.hpp` (~190 satır) | DSP blokları + sesler: `Noise` (xorshift), `Lowpass`, `Bandpass` (Chamberlin SVF), `Diesel`, `HullWater`, `HullImpact`, `GullCall`, `CityNoise` |
| `engine/audio/soundscape.hpp` | Stereo miks; ters-mesafe zayıflama + equal-power pan; dinleyici kameranın üstünde, zoom çıkınca yükselir |
| `engine/audio/audio_out.hpp` | raylib `AudioStream`'e buffer besler (raylib yalnızca çıkış; sentez raylib'de değil) |
| `engine/audio/sound_tuning.hpp` + `game/client/taka_sound.txt` | Parametre dosyası; oyunda F5 ile **canlı** yeniden yüklenir |
| `tests/soundscape_test.cpp` | Seeded, deterministik testler |

Öne çıkan, ders için değerli özellikler:
- Diesel motoru gaz koluna (`throttle`) göre hızlanır, yük altında parlaklaşır; her ateşleme hafif farklı (varyasyon).
- Su sesi teknenin hızıyla değişir; durgunda şıpırtı, hızda köpük.
- Martılar 3D konumlu; iki çağrı tipi (uzun "kyow", kısa "ha-ha-ha"), formant + sawtooth.
- Şehir: binaların yoğunluğundan gelen uğultu, arada korna ve vapur düdüğü.
- **Canlı tuning** (dosyayı düzenle → F5 → ses değişir) — derste en güçlü demo.

## 4. Prior art ("bu zaten var mı?")

| Ne | Not |
|---|---|
| sfxr / bfxr / jsfxr / ChipTone | Parametrik retro SFX üreticileri; yıllardır var |
| [ZzFX](https://github.com/KilledByAPixel/ZzFX) | Tek satırlık sayı dizisiyle SFX; "tarif = birkaç sayı" fikrinin iyi örneği |
| [bfxr-mcp](https://glama.ai/mcp/servers/zaynabed/bfxr-mcp), [bfxr2-mcp](https://glama.ai/mcp/servers/avi892nash/bfxr2-mcp), [sfx-gen-mcp](https://glama.ai/mcp/servers/JimCline/sfx-gen-mcp), [make-sfx-mcp](https://libraries.io/npm/make-sfx-mcp) | Agent'a sfxr tarzı ses ürettiren MCP'ler — bu katman dolu |
| [UE Audio MCP](https://glama.ai/mcp/servers/koshimazaki/UE-AUDIO-MCP) | Unreal tarafında agent-ses entegrasyonu |
| [ElevenLabs MCP](https://glama.ai/mcp/servers/elevenlabs/elevenlabs-mcp) | Metinden SFX; resmi MCP mevcut, yeniden sarmayacağız |
| [Faust](https://faust.grame.fr) | DSP dili; tek kaynaktan C++/WASM/Unity (`faust2unity`) |

**Farkımız:** Rakipler bir **wav dosyası** üretir. Bizim çekirdeğimiz oyunun içinde çalışan,
**oyun durumuna tepki veren ses tarifi** (gaz → motor, hız → su, konum → 3D) ve bu tarifleri
üretme/entegre etme know-how'ı (skill). Statik wav export yan özelliktir.

## 5. Mimari (öneri)

```
core/          motorsuz DSP blokları + tarif modeli + Leeway'den çıkan tarif kütüphanesi
adapters/      web (WebAudio/AudioWorklet), raylib/C++, unity (C#, OnAudioFilterRead) …
skill/         agent'a iş akışını öğreten talimat: projeyi tara → ses eksiklerini bul →
               tarif seç/yaz → entegre et → 3D konumlandır → dinlet/doğrula
mcp/           (sonra) render / önizleme / wav export — agent'ın sonucu "duyabilmesi" için
providers/     (sonra) harici üreticiler için arayüz (ElevenLabs vb. — kendi MCP'leri üzerinden)
playground/    GitHub Pages'te statik site (§6)
```

### 5.1 AÇIK KARAR — AI neyi üretecek? (Fable değerlendirsin)

| Seçenek | Artı | Eksi |
|---|---|---|
| **A) Kod** (JS / C++ / C#) | En esnek; Leeway bu şekilde yapıldı; LLM'ler iyi yazıyor | Her motor için ayrı port; tarayıcıda AI kodu çalıştırmak (`eval`) güvenlik riski; doğrulaması zor |
| **B) Deklaratif tarif** (JSON graph: `noise → bandpass → envelope`, parametreler `throttle`, `speed` gibi oyun girdilerine bağlı) | Motor başına bir yorumlayıcı, tarif her yerde aynı; şema ile doğrulanır; güvenli; playground'a yapıştırmaya uygun | İfade gücü blok kümesiyle sınırlı; yorumlayıcıları yazmak ilk iş; LLM'e şema öğretmek gerek |
| **C) Faust** | Port sorununu hazır çözer (C++/WASM/Unity); olgun DSP ekosistemi | LLM'lerin Faust kalitesi JS'ten düşük; yeni bağımlılık ve derleme adımı; tarayıcıda derleyici (faustwasm) ağırlığı |

Claude'un önerisi: **B, kaçış kapısıyla** (blok kümesi yetmediğinde özel blok olarak kod;
playground'da yalnızca güvenilir/önceden tanımlı bloklar). Fable'dan beklenen:
- Leeway'in 5-6 sesini B formatında ifade etmeyi dene; neyi ifade edemiyor?
- Aynı sesi bir LLM'e A, B ve C ile ürettir; kalite ve hata oranını karşılaştır.
- 2 haftalık ders MVP'sine hangisi sığar?

## 6. Playground akışı (KARAR: sunucusuz)

1. Kullanıcı sesi tarif eder ("teknenin motoru, gazla hızlansın").
2. **"Prompt'u kopyala"** → kit'in sistem talimatı + şema + kullanıcının isteği panoya gelir.
3. Kullanıcı bunu kendi AI'ına yapıştırır (ChatGPT, Claude, Gemini…).
4. Dönen tarifi siteye yapıştırır → ses anında çalar.
5. Oyun girdileri (gaz, hız, mesafe…) **slider** olarak çıkar; çaldıkça değiştirilebilir.
6. Konum için basit 2D sahne (dinleyici + kaynak, sürükle → pan/mesafe duy).
7. **WAV export** (statik kullanım için).
8. Hazır örnekler: Leeway tarifleri + birkaç klasik (UI tık, zıplama, patlama, rüzgâr).

Derste: Kemal canlı üretimi kendi Claude Code'u ile yapar; öğrenciler (bilgisayar varsa)
aynı akışı kendi AI'ları ile takip eder. İnternet/LLM patlarsa hazır örneklerle devam.

## 7. Ders akışı (süre AÇIK — bloklar esnek)

| # | Blok | İçerik |
|---|---|---|
| 1 | Açılış | Aynı oyun klibi sessiz → sesli |
| 2 | Oyun sesi ≠ film sesi | Film sabit kayıt; oyunda ses **durumun fonksiyonu**. Tekrar → varyasyon; etkileşim → parametre; dünya → konum |
| 3 | Kavramlar (kit'siz geçerli) | Varyasyon (pitch/volume random, round-robin), katmanlama, mesafe/pan, adaptif ses; sentez blokları: kaynak (osilatör, noise) → şekillendirme (filtre) → zaman (envelope) |
| 4 | Sektör nasıl yapıyor | FMOD/Wwise tek slayt — "bunu ana hocanız işliyor" |
| 5 | Leeway canlı | Oyunu aç; gaz kolu → motor; hız → su; martılar 3D; `taka_sound.txt` + F5 ile canlı tuning |
| 6 | AI ile sentez | Sınıftan ses isteği al, birlikte üret; tarifin içini aç (hangi blok ne yapıyor) |
| 7 | Sınırlar | Sentezle neyi yapamazsın; ne zaman kayıt/foley/kütüphane; metinden-ses modelleri (ElevenLabs vb.) ve lisans |
| 8 | Kapanış | Kaynaklar (kit tek satır), soru-cevap |

Kendi oyunlarından (The 4 Masked, Silent Authority) kısa vaka/postmortem eklenebilir — AÇIK.

## 8. Kapsam ve takvim

**Ders MVP (2 hafta içinde):**
- Çekirdek tarif formatı (§5.1 kararına göre)
- WebAudio yorumlayıcı/adapter
- Playground (§6), GitHub Pages
- Leeway'den 5-6 tarif portu: diesel, su, çarpma, martı, şehir (+korna/vapur)
- Skill (agent talimatı) v0
- Sunum

**Ders sonrası:** Unity adapter, raylib/C++ adapter'ın kite taşınması, MCP, provider arayüzü
(ElevenLabs), müzik/adaptif müzik.

**Takvim kuralı:** Sunum taslağı **1. haftanın sonunda** bitmiş olur. 2. hafta kit cilası +
prova. Risk: iş kit geliştirmeye kayar, sunum son 2 güne kalır.

Kaynak: 2 adet Claude Max hesabı, 2 hafta tam zaman.

## 9. Açık sorular (Kemal)

1. Ders süresi?
2. Öğrencilerin derste bilgisayarı olacak mı (lab / laptop / amfi)?
3. Kit adı: `MySFXKit` mi, `MySoundSynthKit` mi?
4. Lisans (MIT öneri)?
5. Kendi Steam oyunlarından vaka anlatılacak mı?
6. §5.1 formatı (Fable değerlendirmesi sonrası).

## 10. Riskler

- Canlı demo internet/LLM'e bağlı → hazır örnekler + yedek video kaydı.
- **Salon sesi:** projeksiyona bağlanınca ses HDMI'ya gidebilir. Bölümden salonun ses
  düzenini öğren; USB-C/HDMI dönüştürücü götür; prova listesine ekle.
- **Safari/WebAudio:** ses ancak kullanıcı etkileşiminden sonra başlar; AudioWorklet
  davranışı farklı olabilir. Playground Safari (Mac + iPhone) ve Chrome'da test edilir.
- **Leeway demosu Mac build'inde** çalışmalı (`taka_sound.txt` + F5 canlı tuning dahil);
  ders öncesi Mac'te prova.
- Öğrencilerin kod seviyesi düşük olabilir (tasarım fakültesi) → playground kod gerektirmemeli.
- Sentez kalitesi gerçekçi seslerde zayıf → tez buna göre kuruldu (§2), sınırlar derste açıkça söylenir.
- Kapsam kayması (§8).
