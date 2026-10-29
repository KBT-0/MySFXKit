# Rehearsal checklist — draft 1

Checklist for SFX-8: the rehearsal on the lecture Mac and the setup in the room, for the
lecture of 2026-11-20 (PROJECT §2.8). Steps are in Turkish, like `docs/lecture/outline.md`.
Sources: brief §10 (risks), PROJECT §2.7 (lab without audio), Leeway
`docs/DEV_SETUP.md` (macOS: `scripts/play_mac.sh`). An agent cannot run any step here:
each needs the Mac's screen, speakers or the room.

---

## A. Bir hafta önce (evde, Mac'te)

1. **Yedek video:** Leeway'den 30 sn'lik klibi iki kez kaydet: sessiz ve sesli (outline
   blok 1). Dosyaları masaüstüne ve bir USB belleğe koy.
2. **Playground çevrimdışı:** repo kökünde `python3 -m http.server 8000`, Safari'de
   `http://localhost:8000/playground/`. İnternet kapalıyken on bir örneğin hepsi çalıyor mu?
3. **Playground çevrimiçi:** `https://kbt-0.github.io/MySFXKit/playground/` aynı şekilde çalıyor mu?
4. **Leeway:** Leeway klasöründe `scripts/play_mac.sh`; oyun açılıyor, ses geliyor.
   `game/client/taka_sound.txt` dosyasında outline blok 4b ve 5'teki değişiklikleri dene, F5
   ile uygulandığını duy, sonra eski değerlere geri al.
5. **Canlı üretim:** Claude Code ile outline blok 6'daki örnek isteklerden ikisini dene;
   "Copy prompt" metniyle ChatGPT veya Gemini'de bir kez dene. Çalışan iki tarifi yedek
   olarak bir metin dosyasına kaydet.
6. **Tam prova:** saat tutarak bir kez baştan sona (120 dk planı, outline "Zaman planı").
   Uzun gelen bloğu not et.
7. **STATE.md'deki elle kontrol listeleri:** playground'un yeni özellikleri (Copy prompt,
   2B sahne, WAV, klasik örnekler) için yazılı kontrolleri bu provada yap.

## B. Bir gün önce

1. Mac'i şarj et; şarj aletini çantaya koy.
2. Dönüştürücüler: USB-C → HDMI, gerekirse USB-C → 3.5 mm ses (brief §10).
3. Kulaklık: salon sesi çalışmazsa sen dinleyip sınıfa projeksiyondan göster.
4. Bölüme sor: salonda hoparlör var mı, stereo mu (outline blok 4b'deki pan iki hoparlör
   ister), ses projeksiyon kablosundan mı ayrı kablodan mı gidiyor?
5. macOS bildirimlerini kapat (Odaklanma modu); ekran koruyucuyu ve uykuyu kapat.
6. Safari'de playground ve GitHub Pages sekmelerini, editörde `taka_sound.txt`'yi hazır tut.

## C. Salonda, dersten önce (15 dk)

1. Mac'i projeksiyona bağla; ekran yansıtma mı genişletme mi, karar ver.
2. **Ses testi:** Sistem Ayarları → Ses → Çıkış: doğru aygıt seçili mi (HDMI ya da
   hoparlör)? Playground'da Diesel'i çal, salonun arkasından dinle.
3. **Pan testi:** 2B sahnede kaynağı en sağa, sonra en sola sürükle; iki hoparlör ayrı duyuluyor mu?
4. Leeway'i aç, motoru çalıştır, ses geliyor mu; sonra oyunu arka planda beklet.
5. İnternet: salonun ağına bağlan; Pages açılıyor mu? Açılmıyorsa yerel sunucuya geç (A.2).
6. Öğrencilere duyuru: laptop ve kulaklık getirenler blok 6'da siteyi açabilir; zorunlu değil
   (PROJECT §2.7).

## D. Bir şey bozulursa

| Bozulan | Yedek |
|---|---|
| Salon sesi | Kulaklıkla dinleyip anlat; blok 1 için sesli videoyu yine dene |
| İnternet | Yerel sunucu (`python3 -m http.server 8000`) ve hazır örnekler |
| Yapay zekâ yanıt vermiyor | A.5'te kaydedilen yedek tarifler, ya da hazır örneklerin "içini aç" anlatımı |
| Leeway açılmıyor | Yedek video (A.1), blok 4b'yi playground'daki 2B sahneyle anlat |
| Pan duyulmuyor (tek hoparlör) | Sahnede yalnızca mesafeyi göster; pan'ı kulaklıkla tek kişiye dinlet ya da anlat |
