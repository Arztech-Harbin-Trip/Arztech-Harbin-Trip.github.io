# Arztech Harbin Trip — Teman Perjalanan Offline ❄️ 哈尔滨

Web app untuk trip ke Harbin (Disember). Ia **berfungsi tanpa internet** selepas dipasang di telefon, jadi tiada apa yang boleh disekat di China. Tiada CDN, font luar atau pelayan: semua kod dan data ada dalam telefon.

## Ciri

| Tab | Isi |
|---|---|
| 🗣️ **Terjemah ayat sendiri** | Taip atau cakap apa sahaja ayat dalam **BM / English**, dan ia diterjemah ke **中文 + pinyin**. Ada 🔊 dengar, ⛶ tunjuk dan 💾 simpan. Arah sebaliknya **中文 → English** pula untuk orang tempatan taip/cakap balasan. Guna model AI (OPUS-MT) yang berjalan **dalam telefon**: pakej dimuat turun sekali di Malaysia (~200 MB + ~80 MB pilihan), lepas tu jalan tanpa internet. Kalau pakej belum ada, app guna kamus perkataan dan cadangan frasa siap. |
| 🗣️ **Frasa siap** | ~200 frasa sopan/formal dalam **BM ⇄ English ⇄ 中文 (Mandarin, tulisan ringkas) + pinyin**. Ada 11 kategori: asas, imigresen, makanan & halal, teksi, hotel, membeli & bayaran, arah, musim sejuk, kecemasan, nombor, dan ayat yang anda akan dengar (termasuk loghat Harbin/Dongbei). Butang 🔊 mainkan suara Cina dan 🐢 versi perlahan. **⛶ Tunjuk** paparkan teks besar untuk ditunjuk kepada orang. Ada carian (BM/EN/pinyin/中文), mic, ★ kegemaran dan **Frasa Saya** untuk tambah ayat sendiri. |
| 🗓️ **Itinerari** | Aktiviti disusun ikut hari (Hari 1, Hari 2…), dijana daripada tarikh trip. Setiap aktiviti boleh ada tarikh, masa mula/tamat, jenis, tajuk, lokasi + nama Cina, butiran, remark/tempat jumpa, no. tempahan, telefon dan anggaran kos. Kos boleh direkod ke Kewangan. Butang 🚕 tunjuk lokasi kepada pemandu, tanda selesai dan penanda "SETERUSNYA". Setiap hari tunjuk waktu matahari terbit/terbenam Harbin. Ada salin ke WhatsApp, CSV dan contoh itinerari. |
| ✅ **Persiapan** | 118 item dalam 10 kategori: dokumen, kos perjalanan, pakaian 3 lapisan, heat pack, elektronik, toiletries, ubat & first aid, makanan, aplikasi & kewangan, beg. Setiap item ada nota, tahap keutamaan (Wajib/Disyorkan/Pilihan), kuantiti dan harga anggaran (RM). Bila ditanda **Dah beli**, harga sebenar direkod terus ke Kewangan. Tab **💰 Bajet & bayaran** ada beberapa fungsi. Kau boleh **ubah harga terus** (contoh tiket RM2,200 → RM1,200). Kau **tanda ☑ bila dah bayar** dan jumlah itu ditolak daripada "belum bayar". Kau tetapkan **jumlah bajet sendiri** dan app tunjuk baki/kekurangan. Bayaran juga direkod automatik ke Kewangan. |
| 💰 **Kewangan** | Rekod **Keluar / Masuk / Tukar duit (RM → ¥)** dengan kategori, cara bayar (Tunai, Alipay, WeChat Pay, Kad, TNG) dan keterangan. Ada ringkasan **harian** (hari ini beli apa, keluar dan masuk berapa) dan ringkasan setiap hari, dalam ¥ dan RM. Ada juga baki tunai RMB, carta ikut kategori, penukar kadar, eksport CSV dan teks ringkasan. |
| ℹ️ **Info** | Kad hotel untuk pemandu teksi, 17 tempat popular Harbin (kad "师傅，请带我去…"), nombor kecemasan, Kedutaan Malaysia, waktu solat Harbin & arah kiblat (dikira offline), tips cuaca sejuk, tetapan suara, dan backup/pulih data. |

## Dua link: Admin & Pengguna

| Link | Untuk | Fungsi |
|---|---|---|
| `…/` (index.html) | **Pengguna** (rakan trip) | Semua ciri app. Kandungan daripada admin (itinerari rasmi, tarikh trip, kad hotel, frasa, harga checklist, pengumuman) diterima automatik bila online. Pengguna boleh ubah atau tambah itinerari sendiri; perubahan mereka dikekalkan. |
| `…/admin.html` | **Admin** (penganjur sahaja) | Sama seperti app pengguna, ditambah **🛠 Panel Admin** dalam tab Info: tulis pengumuman dan tekan **🚀 Terbitkan**. Kandungan ditulis ke `data/shared.json` dalam repo melalui GitHub API. |

- Penerbitan memerlukan **token GitHub** (fine-grained, Contents: Read & write, untuk repo laman sahaja). Token disimpan dalam telefon admin sahaja dan tidak masuk dalam backup. Tanpa token, orang lain yang jumpa link admin tidak boleh ubah apa-apa.
- Kewangan, tanda checklist dan bajet setiap orang kekal peribadi dalam telefon masing-masing.
- Data admin disimpan berasingan daripada data pengguna (kunci storan lain), jadi kedua-dua link boleh dibuka dalam telefon yang sama.

## Hosting (GitHub Pages)

Repo laman mesti **public** untuk GitHub Pages percuma.

1. Buat repo public baharu, contohnya `harbintrip`.
2. Jalankan `tools/deploy-site.sh /path/ke/harbintrip`, kemudian commit & push ke `main`.
3. GitHub → repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. Link: `https://<pengguna>.github.io/harbintrip/` (pengguna) dan `https://<pengguna>.github.io/harbintrip/admin.html` (admin).

## Cara pasang (buat di Malaysia, semasa ada internet)

1. Hoskan folder `harbin/` di mana-mana laman HTTPS (contoh GitHub Pages, Netlify Drop atau Cloudflare Pages).
2. Buka pautan dalam **Safari** (iPhone) atau **Chrome** (Android).
3. iPhone: Share → **Add to Home Screen**. Android: ⋮ → **Install app**.
4. Buka app dari ikon sekali. Kemudian hidupkan **mod kapal terbang** dan buka semula untuk uji.
5. Dalam tab Terjemah → **📦 Pakej terjemahan offline**, tekan **Muat turun** (guna WiFi). Sumber pakej, Hugging Face, disekat di China, jadi buat sebelum berlepas.
6. Muat turun suara Bahasa Cina dalam telefon supaya 🔊 jalan offline (langkah ada dalam tab Info → Suara).

**Sandaran:** `dist/harbin-trip-offline.html` ialah versi satu fail. Boleh disimpan dalam telefon atau komputer dan dibuka terus dalam pelayar. Data dalam versi ini disimpan berasingan daripada versi yang dipasang.

## Nota

- Data disimpan dalam telefon (localStorage). Gunakan **Info → Backup** sekali-sekala.
- Suara (text-to-speech) guna suara terbina dalam telefon dan berfungsi offline.
- Cakap → teks bila offline: guna 🎤 pada **papan kekunci telefon** (iPhone Dictation / Gboard offline voice typing). Butang 🎤 dalam app guna pengecaman suara pelayar. Ia cuba mod dalam peranti jika disokong, tetapi kebanyakan telefon perlukan internet untuknya.
- Terjemahan AI ialah terjemahan mesin. Semak maksud melalui baris English, dan untuk perkara penting (alahan, ubat) guna frasa siap.
- Semua harga, tarikh pembukaan dan peraturan (visa, powerbank 3C, kastam) ialah anggaran. Sahkan sebelum berlepas.

## Fail

| Fail | Keterangan |
|---|---|
| `index.html` | Rangka app |
| `css/style.css` | Gaya (mod cerah/gelap automatik) |
| `js/app.js` | Logik semua tab |
| `js/data-phrases.js` | Frasa terjemahan & senarai tempat (mudah diubah/ditambah) |
| `js/data-checklist.js` | Senarai persiapan & harga anggaran (mudah diubah) |
| `js/mt.js` | Enjin terjemahan offline (muat turun pakej, BM → EN → 中文, 中文 → EN) |
| `js/data-glossary.js` | Kamus BM → 中文 (sandaran tanpa pakej) |
| `vendor/` | transformers.js 3.8.1 + ONNX Runtime WebAssembly + pinyin-pro (disimpan dalam app, tiada CDN) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Untuk pasang di Home Screen & guna offline |
| `admin.html` | Dijana oleh `tools/make-admin.js` daripada `index.html` (jangan ubah terus) |
| `data/shared.json` | Kandungan yang diterbitkan oleh admin |
| `tools/deploy-site.sh` | Salin app ke repo laman |
| `tools/build-single.js` | `node tools/build-single.js` jana `dist/harbin-trip-offline.html` |
| `tools/make-icons.js` | Jana ikon PNG daripada `icons/icon.svg` |
