/* Itinerari rasmi "Kembara Musim Sejuk Harbin" (Arztech) 04–13 Disember 2026 — daripada PDF ITINERARI_ARZTECH_TRIP_TO_HARBIN_2026.
   Dimuatkan sekali ke dalam app (aktiviti bertanda 📢 Rasmi). Pengguna boleh ubah/padam; ubahan mereka dikekalkan.
   Naikkan `v` bila kandungan ini dikemas kini supaya app menerimanya. */
window.TRIP_SEED = {
  v: 2,
  trip: { start: '2026-12-04', end: '2026-12-13' },
  hotels: [
    { id: 'hz1', nameEn: 'Ease Hotel (Harbin Central Street)', nameZh: '宜致酒店中央大街店', addr: '哈尔滨道里区西十六道街19号', addrEn: 'No. 19, West 16th Street, Daoli District, Harbin', from: '2026-12-05', to: '2026-12-07' },
    { id: 'hz2', nameEn: 'Snow Town Jingya Villa', nameZh: '雪乡静雅山庄', addr: '海林长汀镇大海林局址雪乡景区河南路1号', addrEn: 'No. 1 Henan Road, Snow Town Scenic Area, Hailin', from: '2026-12-07', to: '2026-12-08' },
    { id: 'hz3', nameEn: 'Longjiang Gaosheng Inn', nameZh: '龙江高升客栈', addr: '五常山河屯林业局东升林场中国雪谷', addrEn: 'China Snow Valley, Dongsheng Forest Farm, Wuchang', from: '2026-12-08', to: '2026-12-10' },
    { id: 'hz4', nameEn: 'Homeinn Selected Hotel (Central Avenue Memorial Flood Control Tower)', nameZh: '如家精选酒店中央大街防洪纪念塔店', addr: '哈尔滨道里区友谊路225号', addrEn: 'No. 225 Youyi Road, Daoli District, Harbin', from: '2026-12-10', to: '2026-12-12' }
  ],
  docs: [
    { id: 'itin', title: 'Itinerari Arztech Trip to Harbin 2026', desc: 'Jadual harian, penerbangan, penginapan, PIC & bajet (5 muka surat)', path: 'files/itinerari-arztech-2026.pdf', thumb: 'dt-itin', size: 420407 },
    { id: 'maps', title: 'Harbin City Maps', desc: 'Peta hotel, laluan jalan kaki, restoran halal & peta pelancongan (14 muka surat)', path: 'files/harbin-city-maps.pdf', thumb: 'dt-maps', size: 2970311 }
  ],
  itin: [
    // ===================== 04 DISEMBER (Jumaat) =====================
    { id: 'tz00', d: '2026-12-04', t1: '00:00', type: 'other', title: 'Agihan tugas PIC & bajet aktiviti (baca dahulu)',
      detail: 'PIC (Person In Charge):\n• Hazim — tempahan Didi dari lapangan terbang ke hotel (05 Dis), pengangkutan van/bas ke Snow Town & Snow Village, urusan aktiviti salji Snow Valley Shimen Mountain (Hari Ketibaan, Hari 2, Hari 3).\n• Mimi — daftar masuk & pembahagian bilik di semua hotel dan homestay (Hari Ketibaan, Hari 2, 3 & 5).\n• Sann — pek makanan sedia dimakan (RTE) untuk sarapan, brunch, makan tengah hari & malam (Hari 2, 3, 4 & 5).\n• En Azrul — penyelarasan aktiviti Snow Valley & Rime Ridge, bayaran tunai (RMB) pakej Rime Ridge, sarapan bersama homestay (Hari 3, 4 & 5).\n\nBajet aktiviti (13 pax):\n• Hari 3 Snow Valley Shimen Mountain: RM 1,596.00 (~RM 122.80/pax)\n• Hari 4 Rime Ridge (tunai sahaja): RM 2,946.46 (~RM 226.65/pax)\n• Hari 6 pilihan (tiket individu): Ice and Snow World ~RM 120++ (200+ RMB) · Volga Manor RM 98 · Siberian Tiger Park RM 73 · Polar Park RM 40',
      remark: 'Nota: nombor hari dalam app bermula 04 Dis (Hari 1). Dalam PDF, "Hari 1" ialah 06 Dis (Hari 2 = 07 Dis ... Hari 7 = 12 Dis). Rombongan 13 pax. Kumpulan 1: Staf Arztech (berlepas 04 Dis). Kumpulan 2: En Azrul & Sekeluarga (berlepas 05 Dis).' },
    { id: 'tz01', d: '2026-12-04', t1: '11:45', t2: '15:30', type: 'flight', title: '✈ KUL → Manila (PR526) — Kumpulan 1: Staf Arztech',
      loc: 'KLIA (Kuala Lumpur International Airport)', detail: 'Philippine Airlines PR526.', remark: 'Kumpulan 1: Staf Arztech' },
    { id: 'tz02', d: '2026-12-04', t1: '15:30', t2: '21:10', type: 'flight', title: 'Transit di Manila (5j 40m)', loc: 'Ninoy Aquino International Airport, Manila', remark: 'Kumpulan 1: Staf Arztech' },
    { id: 'tz03', d: '2026-12-04', t1: '21:10', t2: '00:40', type: 'flight', title: '✈ Manila → Shanghai (PVG)', detail: 'Penerbangan 3j 30m. Tiba 05 Dis 12:40 AM.', remark: 'Kumpulan 1: Staf Arztech' },
    // ===================== 05 DISEMBER (Sabtu) =====================
    { id: 'tz04', d: '2026-12-05', t1: '00:40', t2: '20:20', type: 'flight', title: 'Tiba & transit panjang di Shanghai Pudong (PVG) — 20 jam', loc: 'Shanghai Pudong International Airport (PVG)', locZh: '上海浦东国际机场', detail: 'Transit panjang 20 jam. Rehat, makan, cas telefon. Simpan beg kabin dengan selamat.', remark: 'Kumpulan 1: Staf Arztech' },
    { id: 'tz05', d: '2026-12-05', t1: '06:50', t2: '12:40', type: 'flight', title: '✈ KUL → Nanjing (NKG) (PR526) — Kumpulan 2', loc: 'KLIA (Kuala Lumpur International Airport)', detail: 'Philippine Airlines PR526.', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz06', d: '2026-12-05', t1: '12:40', t2: '15:00', type: 'flight', title: 'Transit di Nanjing (2j 20m)', loc: 'Nanjing Lukou International Airport (NKG)', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz07', d: '2026-12-05', t1: '15:00', t2: '16:55', type: 'flight', title: '✈ Nanjing → Beijing', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz08', d: '2026-12-05', t1: '16:55', t2: '21:55', type: 'flight', title: 'Transit di Beijing (5 jam)', loc: 'Beijing Capital International Airport', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz09', d: '2026-12-05', t1: '20:20', t2: '23:20', type: 'flight', title: '✈ Shanghai (PVG) → Harbin (HRB) — Kumpulan 1', loc: 'Harbin Taiping International Airport', locZh: '哈尔滨太平国际机场', detail: 'Penerbangan 3 jam. Tiba di Lapangan Terbang Harbin 11:20 PM.', remark: 'Kumpulan 1: Staf Arztech' },
    { id: 'tz10', d: '2026-12-05', t1: '21:55', t2: '00:05', type: 'flight', title: '✈ Beijing → Harbin (HRB) — Kumpulan 2', loc: 'Harbin Taiping International Airport', locZh: '哈尔滨太平国际机场', detail: 'Penerbangan 3 jam. Tiba 06 Dis 12:05 AM.', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz11', d: '2026-12-05', t1: '23:20', type: 'hotel', title: 'Daftar masuk Ease Hotel (Kumpulan 1)',
      loc: 'Ease Hotel (Harbin Central Street) — No. 19, West 16th Street, Daoli District, Harbin', locZh: '哈尔滨道里区西十六道街19号 (宜致酒店中央大街店)',
      detail: 'Dari lapangan terbang: perjalanan 35 minit menaiki Didi (PIC: Hazim). Penginapan 05–07 Dis (2 malam).', remark: 'Tempah Didi seawal mendarat. Tunjuk alamat Cina kepada pemandu.', imgs: ['cm01', 'cm02', 'cm04'] },
    // ===================== 06 DISEMBER (Ahad) — HARI 1 =====================
    { id: 'tz12', d: '2026-12-06', t1: '00:05', type: 'hotel', title: 'Kumpulan 2 tiba di Harbin & daftar masuk Ease Hotel',
      loc: 'Ease Hotel (Harbin Central Street)', locZh: '哈尔滨道里区西十六道街19号 (宜致酒店中央大街店)', detail: 'Tiba di Lapangan Terbang Harbin 12:05 AM; ke hotel 35 minit.', remark: 'Kumpulan 2: En Azrul & Sekeluarga', imgs: ['cm01'] },
    { id: 'tz13', d: '2026-12-06', t1: '08:00', type: 'food', title: 'Sarapan: Northwest Beef Noodles', loc: 'Northwest Beef Noodles (cawangan Tongjiang Street)', detail: 'Jelajah bandar Harbin & makanan halal.' },
    { id: 'tz14', d: '2026-12-06', t1: '10:00', type: 'shop', title: 'Membeli-belah & bergambar di Gereja Saint Sophia',
      loc: 'Toulong International Commodity City · Yibin Store · Saint Sophia Cathedral', locZh: '圣索菲亚教堂', detail: 'Beli-belah di Toulong International Commodity City & Yibin Store, kemudian bergambar di Gereja Saint Sophia. Dari Ease Hotel ke Sophia Square: jalan kaki 11 minit (671 m).', imgs: ['cm04', 'cm02'] },
    { id: 'tz15', d: '2026-12-06', t1: '11:30', type: 'pray', title: 'Makan tengah hari halal di Masjid Daowai · Mixue · solat Zohor',
      loc: 'Harbin Daowai Mosque', locZh: '哈尔滨道外清真寺', detail: 'Makan tengah hari halal di medan selera Masjid Daowai, pencuci mulut Mixue Ice Cream & solat Zohor (~11:30 AM).\nKawasan masjid: Food Court Mixue (di bawah bangunan KTV) · Mr. Chai Sausage (depan masjid) · Tsingtao Tomahawk (belakang masjid) · Hahui Qingxiang Cun (kedai roti, 180 N Shierdao St, +86 451 8781 3883).', imgs: ['cm10', 'cm11'] },
    { id: 'tz16', d: '2026-12-06', t1: '', type: 'activity', title: 'Petang: bersiar-siar sekitar Masjid Daowai', loc: 'Harbin Daowai Mosque', locZh: '哈尔滨道外清真寺' },
    { id: 'tz17', d: '2026-12-06', t1: '', type: 'food', title: 'Malam: makan malam di Mr Chai & pulang ke Ease Hotel', loc: 'Mr. Chai (depan Masjid Daowai)', remark: 'Pulang ke Ease Hotel.' },
    // ===================== 07 DISEMBER (Isnin) — HARI 2 =====================
    { id: 'tz18', d: '2026-12-07', t1: '08:00', type: 'trans', title: 'Bertolak ke Snow Town (4 jam)', loc: 'China Snow Town (Xuexiang)', locZh: '中国雪乡', detail: 'Naik pengangkutan (van/bas) ke Snow Town. Perjalanan lebih kurang 4 jam. PIC: Hazim.', remark: 'Cuaca ekstrem — pakai 3–4 lapisan, bawa heat pack.', imgs: ['cm12'] },
    { id: 'tz19', d: '2026-12-07', t1: '12:00', type: 'hotel', title: 'Daftar masuk Snow Town Jingya Villa (2H 1M)',
      loc: 'Snow Town Jingya Villa — No. 1 Henan Road, Snow Town Scenic Area, Hailin', locZh: '海林长汀镇大海林局址雪乡景区河南路1号 (雪乡静雅山庄)', detail: 'Penginapan 07–08 Dis (1 malam). PIC daftar masuk: Mimi.' },
    { id: 'tz20', d: '2026-12-07', t1: '', type: 'food', title: 'Brunch & makan malam pek RTE di hotel · petang & malam bebas', detail: 'Pek makanan sedia dimakan (RTE) — PIC: Sann. Petang & malam aktiviti bebas menikmati suasana salji.' },
    // ===================== 08 DISEMBER (Selasa) — HARI 3 =====================
    { id: 'tz21', d: '2026-12-08', t1: '08:00', type: 'trans', title: 'Daftar keluar & bertolak ke Snow Village (2 jam)', loc: 'Snow Village (China Snow Valley)', detail: 'PIC: Hazim.', imgs: ['cm12'] },
    { id: 'tz22', d: '2026-12-08', t1: '11:00', type: 'hotel', title: 'Daftar masuk Longjiang Gaosheng Inn (3H 2M) & brunch RTE',
      loc: 'Longjiang Gaosheng Inn — China Snow Valley, Dongsheng Forest Farm, Wuchang', locZh: '五常山河屯林业局东升林场中国雪谷 (龙江高升客栈)', detail: 'Penginapan 08–10 Dis (2 malam). PIC daftar masuk: Mimi. Brunch pek RTE: PIC Sann.' },
    { id: 'tz23', d: '2026-12-08', t1: '11:30', t2: '15:00', type: 'activity', title: 'Aktiviti salji: Snow Valley Diaoyutai Shimen Mountain Amusement Park',
      loc: 'Snow Valley Diaoyutai Shimen Mountain Amusement Park', detail: 'Air terjun ais, merentas hutan salji, memandu sendiri snowmobile, ice skiing, skating, snow circle 200m, ice fishing & ice plowing.\nPIC: Hazim & En Azrul.', remark: 'Kos kumpulan RM 1,596.00 (13 pax).', cost: 122.8, cur: 'MYR' },
    { id: 'tz24', d: '2026-12-08', t1: '16:00', type: 'food', title: 'Pulang ke homestay · makan malam RTE · aktiviti bebas', detail: 'Makan malam pek RTE — PIC: Sann.' },
    // ===================== 09 DISEMBER (Rabu) — HARI 4 =====================
    { id: 'tz25', d: '2026-12-09', t1: '07:00', type: 'food', title: 'Sarapan di homestay', detail: 'Sajian homestay + pek RTE. PIC: En Azrul & Sann.' },
    { id: 'tz26', d: '2026-12-09', t1: '09:00', type: 'activity', title: 'Rime Ridge (bertolak 40 minit) — bayaran TUNAI sahaja',
      loc: 'Rime Ridge', detail: 'Memandu sendiri snowmobile, banana boat, snow tubing, snow drifting, ski cerun kecil & melihat matahari terbenam. PIC: En Azrul.', remark: 'Bawa tunai RMB secukupnya. Kos kumpulan RM 2,946.46 (13 pax).', cost: 226.65, cur: 'MYR' },
    { id: 'tz27', d: '2026-12-09', t1: '', type: 'food', title: 'Makan tengah hari di Rime Ridge · makan malam di homestay (RTE)', detail: 'Makan malam pek RTE — PIC: Sann.' },
    // ===================== 10 DISEMBER (Khamis) — HARI 5 =====================
    { id: 'tz28', d: '2026-12-10', t1: '08:00', type: 'food', title: 'Sarapan di homestay', detail: 'Sajian homestay + pek RTE. PIC: En Azrul & Sann.' },
    { id: 'tz29', d: '2026-12-10', t1: '11:00', type: 'trans', title: 'Daftar keluar & bertolak pulang ke Bandar Harbin (4 jam)', loc: 'Harbin' },
    { id: 'tz30', d: '2026-12-10', t1: '15:00', type: 'hotel', title: 'Daftar masuk Homeinn Selected Hotel (Central Ave Memorial Flood Control Tower)',
      loc: 'Homeinn Selected Hotel — No. 225 Youyi Road, Daoli District, Harbin', locZh: '哈尔滨道里区友谊路225号 (如家精选酒店中央大街防洪纪念塔店)',
      detail: 'Penginapan 10–12 Dis (2 malam). PIC daftar masuk: Mimi.\nBerdekatan: Flood Control Memorial Tower (500 m), Zhongyang Street (260 m), Stesen metro Friendship Palace Hotel (190 m), Hongzhuan Morning Market (730 m), Gereja Saint Sophia (1.8 km), Stesen kereta api Harbin (4.7 km).', imgs: ['cm03', 'cm05', 'cm06', 'cm07'] },
    { id: 'tz31', d: '2026-12-10', t1: '15:30', type: 'food', title: 'Makan tengah hari & malam di sekitar Masjid Daowai · aktiviti bebas',
      loc: 'Restoran halal berhampiran Homeinn', detail: 'Restoran halal berdekatan hotel:\n• Dahongmei 清真大红梅 — 194 Youyi Rd (+86 451 8765 3234), buka hingga 9 mlm\n• Muslim Liushunyuan 清真六顺园 — 8 Gongcheng St, buka hingga 9:30 mlm\n• Muslim Restaurant 清真餐馆 — 163 Maimai St (+86 451 8765 6006)\n• Muslim Mutton Restaurant\nDari Homeinn ke masjid boleh naik bas metro (lihat peta).', imgs: ['cm08', 'cm09', 'cm10', 'cm07'] },
    // ===================== 11 DISEMBER (Jumaat) — HARI 6 =====================
    { id: 'tz32', d: '2026-12-11', t1: '08:00', type: 'activity', title: 'Aktiviti bebas (Free & Easy) sehingga malam',
      detail: 'Lokasi PERCUMA: Central Street, Jambatan Songhuajiang, Baroque Style Street, Music Gallery & Brickstone Sea.\nLokasi BERBAYAR (pilihan, tiket individu): Ice & Snow World ~RM 120++ (200+ RMB) · Volga Manor RM 98 · Siberian Tiger Park RM 73 · Polar Park RM 40.', remark: 'Ice & Snow World paling cantik waktu malam. Jalan licin — pakai ice cleats.', imgs: ['cm14', 'cm13', 'cm06'] },
    // ===================== 12 DISEMBER (Sabtu) — HARI 7 =====================
    { id: 'tz33', d: '2026-12-12', t1: '11:00', type: 'trans', title: 'Daftar keluar hotel & bergerak ke lapangan terbang', loc: 'Harbin Taiping International Airport', locZh: '哈尔滨太平国际机场', detail: 'Bergerak mengikut kumpulan penerbangan masing-masing. Tiba di lapangan terbang 3 jam awal.' },
    { id: 'tz34', d: '2026-12-12', t1: '12:40', t2: '15:55', type: 'flight', title: '✈ Harbin (HRB) → Nanjing (NKG) — Kumpulan 2', locZh: '哈尔滨太平国际机场', remark: 'Kumpulan 2: En Azrul & Sekeluarga' },
    { id: 'tz35', d: '2026-12-12', t1: '18:05', t2: '21:05', type: 'flight', title: '✈ Harbin (HRB) → Shanghai (PVG) — Kumpulan 1 (7 pax)', locZh: '哈尔滨太平国际机场', remark: 'Kumpulan 1: Staf Arztech (7 pax). Transit PVG 10j 10m.' },
    { id: 'tz36', d: '2026-12-12', t1: '18:10', t2: '23:40', type: 'flight', title: '✈ Nanjing (NKG) → Kuala Lumpur (KUL) — Kumpulan 2', remark: 'Kumpulan 2: En Azrul & Sekeluarga. Tiba KL 11:40 PM.' },
    // ===================== 13 DISEMBER (Ahad) =====================
    { id: 'tz37', d: '2026-12-13', t1: '07:30', t2: '13:20', type: 'flight', title: '✈ Shanghai (PVG) → Kuala Lumpur (KUL) — Kumpulan 1', loc: 'KLIA', remark: 'Kumpulan 1: Staf Arztech. Tiba KL 1:20 PM. Selamat pulang!' }
  ]
};
