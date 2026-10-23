# Lecture outline — draft 1

Draft of the guest lecture (SFX-4), blocks 1–8 of `docs/MySFXKit_brief.md` §7. Slide text and
speaker notes are in Turkish, the lecture's language. Constraints it follows: PROJECT §2.7
(two hours with a break; lab PCs probably have no audio, so every listening step runs from
the lecturer's Mac on the projector and the laptop exercise is optional; no Steam cases) and
brief §2 KARAR (the kit is not marketed; its name appears once, on the closing slide).
`[SCREENSHOT: ...]` and `[VIDEO: ...]` mark material not captured yet.

---

## Zaman planı (120 dk, mola dahil)

| # | Blok | Süre | Ses nereden |
|---|---|---|---|
| 1 | Açılış | 5 dk | Leeway video klibi |
| 2 | Oyun sesi ≠ film sesi | 10 dk | yok (slayt) |
| 3 | Kavramlar | 25 dk | playground, projeksiyondan |
| 4 | Sektör nasıl yapıyor | 5 dk | yok (slayt) |
| — | Mola | 10 dk | |
| 5 | Leeway canlı | 20 dk | Leeway, Mac'te |
| 6 | AI ile sentez | 25 dk | playground, projeksiyondan |
| 7 | Sınırlar | 10 dk | yok (slayt) |
| 8 | Kapanış | 10 dk | yok |

Süreler esnek; sıkışırsa blok 3'teki dinleme örnekleri kısalır, blok 6'daki canlı üretim
bir sese iner.

---

## Slayt 0 — Kapak

- Başlık: **Oyun Sesi Nasıl Düşünür? Prosedürel Ses ve 3B Konumlandırma**
- Kemal Tan · İstanbul Kent Üniversitesi · konuk ders · 20 Kasım 2026

---

## Blok 1 — Açılış (5 dk)

**Slayt 1.1 — Sessiz**
- Tam ekran video, ses kapalı: Leeway'de tekne limandan çıkıyor, gaz açılıyor, iskeleye sürtüyor, martılar geçiyor.
- `[VIDEO: Leeway, aynı 30 sn'lik klip, sessiz kopya]`

**Slayt 1.2 — Sesli**
- Aynı klip, sesli.
- `[VIDEO: aynı klip, sesli kopya]`

Konuşma notu: Soru: "İkisi arasında ne değişti?" Cevapları topla (motor, su, çarpma,
martı, şehir). Sonra: "Bu derste bu seslerin hiçbiri kaydedilmedi; hepsi bir tariften
üretiliyor ve oyunun durumuna göre değişiyor."

Hazırlık: iki klip Mac'te önceden kaydedilir (brief §10'daki yedek video da bu kayıttan
çıkar). Projeksiyon sesi çalışmazsa ders bu ilk slaytta fark eder; prova listesine bak (SFX-8).

---

## Blok 2 — Oyun sesi ≠ film sesi (10 dk)

**Slayt 2.1 — Film: sabit kayıt**
- Filmde ses bir kez kurgulanır; her izleyişte aynı ses, aynı saniyede.
- Zaman çizelgesi görseli: tek sabit ses izi.

**Slayt 2.2 — Oyun: ses durumun fonksiyonu**
- `ses = f(oyunun durumu, zaman)`
- Oyuncu ne yapacağını önceden bilmiyoruz → sesi önceden kurgulayamayız.

**Slayt 2.3 — Üç sonuç**
| Oyunda | Sorun | Cevap |
|---|---|---|
| Tekrar | Aynı ses 100 kez → "makineli tüfek" etkisi | **Varyasyon** |
| Etkileşim | Gaz kolu 0 ile 1 arasında her yerde olabilir | **Parametre** |
| Dünya | Ses bir yerde, oyuncu başka yerde | **Konum** |

Konuşma notu: Bu üç kelime dersin geri kalanının iskeleti; blok 3 her birini tek tek
gösterir, blok 5 üçünü aynı oyunda gösterir.

---

## Blok 3 — Kavramlar, kit olmadan da geçerli (25 dk)

Bu bloktaki her dinleme, Kemal'in Mac'inde playground'dan projeksiyona çalınır
(`https://kbt-0.github.io/MySFXKit/playground/`; internet yoksa
`python3 -m http.server 8000` ile yerelden). Öğrencinin bilgisayarı gerekmez.

**Slayt 3.1 — Varyasyon**
- Rastgele pitch / volume: her tekrar biraz farklı.
- Round-robin: birkaç varyant arasında dönmek.
- Dinleme: playground → "Diesel (Leeway)", gaz 0. Her motor vuruşunun gücü 0.7 ile 1.0
  arasında, aralığı ±%3 kayıyor. Sonra (anlatım) "hepsi aynı olsaydı" farkını sözle anlat.
- Dinleme: "Gull (Leeway)": her çağrı ya kahkaha (%35) ya uzun çağrı (%65); notaların
  sayısı ve uzunluğu her seferinde yeniden çekiliyor.
- `[SCREENSHOT: playground, Diesel yüklü, throttle slider görünür]`

**Slayt 3.2 — Katmanlama**
- Bir ses birkaç basit sesin toplamıdır.
- Diesel = gövde (alçak sinüs vuruşu) + püf (filtreli gürültü) + uğultu (hafif sinüs).
- Görsel: üç katman → mix → çıkış.

**Slayt 3.3 — Parametre (adaptif ses)**
- Oyun bir sayı verir, ses ona tepki verir.
- Dinleme: Diesel çalarken gaz slider'ını 0'dan 1'e sür: vuruş saniyede 4.5'ten 13'e çıkıyor,
  ses parlaklaşıyor; motor gaza 1.2 sn'de yetişiyor (anında değil, ataleti var).
- Dinleme: "Hull water (Leeway)", hız 0 → 0.5 → 1.
- `[SCREENSHOT: playground, Hull water, speed slider]`

**Slayt 3.4 — Olay (event)**
- Bazı sesler sürekli değil, bir anda olur: çarpma, zıplama, tık.
- Dinleme: "Hull impact (Leeway)", Play, sonra `impact` düğmesi, güç 1 → 0.5 → 0.
- `[SCREENSHOT: playground, Hull impact, impact düğmesi ve güç slider'ı]`

**Slayt 3.5 — Mesafe ve pan**
- Uzaklaştıkça sessizleşir (ve tizler önce kaybolur); sağdaki ses sağ hoparlörde.
- Bu derste canlı olarak blok 5'te, Leeway'deki martılarla gösterilir.

**Slayt 3.6 — Sentezin üç adımı**
- **Kaynak:** osilatör (sinüs, testere), gürültü
- **Şekillendirme:** filtre (low-pass, band-pass)
- **Zaman:** zarf (envelope): yükseliş, tutma, sönme
- Görsel: kaynak → filtre → zarf → çıkış; Diesel'in püf katmanı örnek: gürültü → low-pass
  (gazla açılır) → 25 ms'lik sönme.

Konuşma notu: Test cümlesi (brief §2): bu bloktan sonra öğrenci kiti hiç açmasa da
varyasyon, katman, parametre, olay ve sentezin üç adımını öğrenmiş olmalı.

---

## Blok 4 — Sektör nasıl yapıyor (5 dk)

**Slayt 4.1 — Middleware: FMOD ve Wwise**
- Sektörde bu fikirlerin aracı: event, parametre, varyasyon kabı, 3D konumlama.
- Tek cümle: "Bunu ana hocanız işliyor."
- `[SCREENSHOT: FMOD veya Wwise arayüzünden bir event / parametre görüntüsü; lisansına uygun kaynak seçilecek]`

Konuşma notu: Bugün gördüğümüz kavramlar bu araçlarda aynı isimlerle var; fark, burada
kayıt yerine sentez kullanmamız.

---

## Mola (10 dk)

Molada Leeway'i Mac'te aç, ses çıkışını projeksiyona doğrula.

---

## Blok 5 — Leeway canlı (20 dk)

Kemal'in Mac'inde Leeway, ses projeksiyondan.

**Slayt 5.1 — Oyun**
- Leeway: İstanbul'da bir taka (küçük tekne).
- `[SCREENSHOT: Leeway oyun içi, tekne ve şehir]`

**Canlı akış (slayt yok, oyun ekranı):**
1. Gaz kolu → motor: vuruş hızlanıyor, ses parlaklaşıyor (blok 3.3'ün aynısı, oyunun içinde).
2. Hız → su: tekne hızlandıkça gövde suyu gürleşiyor.
3. İskeleye çarp → çarpmanın gücü sesin gücü.
4. Martılar 3D: kamerayı martı sürüsüne yaklaştır / uzaklaştır, sağa sola çevir.
5. Şehir: korna ve vapur düdüğü arada bir, şehrin uğultusu mesafeyle değişiyor.

**Canlı ayar — `taka_sound.txt` + F5**
- Dosyayı ekranın yarısında aç. Örnek değişiklikler:
  - `idleFiringHz = 4.5` → `8`: rölanti hızlanır.
  - `engine = 0.35` → `0.1`: motor kısılır.
  - `gulls = 0.6` → `1.5`: martılar öne çıkar.
  - `rolloff = 0.8` → `1.5`: ses mesafeyle daha hızlı düşer.
- Kaydet, oyunda F5: ses anında değişir. Hatalı satır HUD'da görünür ve hiçbir şey uygulanmaz.
- `[SCREENSHOT: taka_sound.txt editörde, yanında oyun]`

Konuşma notu: Ana mesaj: ses tasarımcısı kod yazmadan sayılarla oynuyor; oyun sesi bir
dosya değil, ayarlanabilir bir davranış.

Yedek: Leeway Mac'te açılmazsa blok 1'in videosu ve blok 3'teki playground dinlemeleri.

---

## Blok 6 — AI ile sentez (25 dk)

**Slayt 6.1 — Fikir**
- Bir yapay zekâya sesi tarif et → bir **tarif** (veri, kod değil) geri gelir → tarayıcıda anında çalar.
- Akış görseli: istek → AI → tarif metni → playground → ses + slider'lar.

**Canlı akış:**
1. Sınıftan bir ses isteği al (örnek: "yağmur, şiddeti ayarlanabilsin", "uzay gemisi
   kalkışı", "kapı gıcırtısı").
2. Kemal isteği kendi Claude Code'una verir; dönen tarifi playground'a yapıştırır, Load, Play.
3. Slider'larla oyna; sınıfa "oyunda bu slider neye bağlanırdı?" diye sor.
4. Tarifin içini aç: hangi düğüm kaynak, hangisi filtre, hangisi zarf; blok 3.6'daki üç adım
   tarifin içinde nerede?
5. Bir değeri elle değiştir (örnek: filtre kesimini), Load: ses değişir.
- `[SCREENSHOT: playground, yapıştırılmış bir tarif ve doğrulama hatası örneği]`
- `[SCREENSHOT: playground, aynı tarif düzeltilmiş ve çalıyor]`

**İsteğe bağlı öğrenci alıştırması** (laptop ve kulaklığı olanlar):
- Aynı akışı kendi AI'larıyla yaparlar: siteyi açar, tarifi kendi AI'larından ister,
  yapıştırırlar. Bilgisayarı olmayan öğrenci projeksiyondan izler; ders buna dayanmaz.
- `[EKSİK: AI'a verilecek hazır istek metni ("Prompt'u kopyala") henüz yok (BACKLOG SFX-7). Hazır olana kadar istek tahtaya yazılır.]`

Yedek: internet veya AI yanıt vermezse yedi hazır Leeway örneğinin tarifleri açılıp
aynı "içini aç" adımı onlarla yapılır.

---

## Blok 7 — Sınırlar (10 dk)

**Slayt 7.1 — Dürüst tez**
- "Prototip ve stilize oyunlarda sıfır kayıtlı asset ile gidebilirsiniz; sentezin sınırları şunlar." (brief §2)
- "Foley demode" demiyoruz.

**Slayt 7.2 — Sentezle zor olanlar**
- Gerçekçi ayak sesi, kumaş hışırtısı, insan sesi, AAA detay: hâlâ kayıt / foley / kütüphane işi.
- Leeway'den örnek: martı tanınıyor ama bir doğa belgeselindeki martı değil.

**Slayt 7.3 — Ne zaman ne?**
| Durum | Uygun yol |
|---|---|
| Prototip, game jam, stilize oyun | Sentez |
| Sürekli, duruma bağlı ses (motor, rüzgâr, su) | Sentez veya kayıt + parametre |
| Gerçekçi, yakın, insan kaynaklı ses | Kayıt / foley / kütüphane |

**Slayt 7.4 — Metinden ses üreten modeller**
- ElevenLabs gibi servisler metinden kayıt benzeri ses üretir: sonuç bir dosya, oyunun
  durumuna kendiliğinden tepki vermez.
- Lisans: üretilen sesin kullanım hakkı servisin şartlarına bağlıdır; ticari bir projede
  kullanmadan önce şartlar okunur.
- `[DOĞRULANACAK: güncel bir servis şartından bir örnek cümle, ders öncesi kontrol edilir]`

---

## Blok 8 — Kapanış (10 dk)

**Slayt 8.1 — Bugün ne gördük**
- Oyun sesi durumun fonksiyonu: varyasyon, parametre, konum.
- Sentezin üç adımı: kaynak, şekillendirme, zaman.
- Sesi kaydetmeden bir tarifle anlatmak, ve sınırları.

**Slayt 8.2 — Kaynaklar**
- (Kaynak listesi Kemal'den: kitap, makale, video.)
- Bu derste kullanılan kit: MySFXKit — `https://github.com/KBT-0/MySFXKit` (tek satır, brief §2).

**Slayt 8.3 — Soru-cevap**

---

## Açık noktalar (Kemal)

1. Başlık "3B Konumlandırma"yı vaat ediyor; taslakta konumlandırma şimdilik bir slayt (3.5)
   ve Leeway'deki martılar. Ağırlığının artırılıp artırılmayacağı Kemal'in kararı.
2. Kapaktaki unvan (varsa) Kemal'den.
3. Blok 1'in iki videosu ve tüm ekran görüntüleri çekilmedi.
4. Blok 4 için FMOD / Wwise görselinin kaynağı seçilecek.
5. Blok 8'in kaynak listesi Kemal'den gelecek.
6. Sunumun son aracı (Keynote, Google Slides, başka): bu ana hat oraya taşınır.
