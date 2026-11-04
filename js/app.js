/* Harbin Trip — app offline. Semua data disimpan dalam telefon (localStorage). Tiada sambungan ke pelayan luar. */
(function () {
  'use strict';

  // ---------- Utiliti ----------
  const ROLE = window.HARBIN_ROLE === 'admin' ? 'admin' : 'user';
  const KEY = ROLE === 'admin' ? 'harbin-trip-admin-v1' : 'harbin-trip-v1';
  const HARBIN = { lat: 45.757, lng: 126.642, tz: 8 };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  const n2 = x => (Math.round((+x || 0) * 100) / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const RM = x => 'RM ' + n2(x);
  const CNY = x => '¥ ' + n2(x);
  const RM0 = x => 'RM ' + Math.round(+x || 0).toLocaleString('en-MY');
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ymd(new Date());
  const parseYmd = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const BLN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const fmtD = s => { const d = parseYmd(s); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtDs = s => { const d = parseYmd(s); return d.getDate() + ' ' + BLN[d.getMonth()]; };
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  // ---------- Simpanan ----------
  const DEF = () => ({
    v: 1, tab: 'tr', check: {}, custom: [], tx: [], rate: 1.65, favs: [], mine: [],
    hotel: { nameZh: '', nameEn: '', addr: '', phone: '' },
    trip: { start: '', end: '' }, vrate: 0.85, limit: 0, lastCur: 'CNY', itin: [], itinHidden: [], shared: null, sharedV: 0, announce: ''
  });
  let S = DEF();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(DEF(), JSON.parse(raw));
  } catch (e) { /* storan tidak tersedia */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('⚠ Gagal simpan — storan penuh atau disekat'); }
  }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  // State UI (tidak disimpan)
  const ui = {
    trCat: 'all', trQ: '', micLang: 'ms-MY',
    ckView: 'list', ckFilter: 'all', open: new Set(['dok']),
    fnView: 'day', fnDate: today(), fnFilter: 'all', fnQ: ''
  };

  // ---------- Toast & Sheet ----------
  let toastT;
  function toast(msg, actLabel, act) {
    $$('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (actLabel ? '<button>' + esc(actLabel) + '</button>' : '');
    if (actLabel) t.querySelector('button').onclick = () => { t.remove(); act(); };
    document.body.appendChild(t);
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), actLabel ? 5000 : 2600);
  }
  let curSheet = null;
  function closeSheet() { if (curSheet) { curSheet.remove(); curSheet = null; } }
  // Kotak pengesahan dalam app (confirm() asli disekat dalam sesetengah paparan)
  function ask(msg, okLabel, danger) {
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'scrim askwrap';
      el.innerHTML = '<div class="askbox" role="alertdialog"><p>' + esc(msg).replace(/\n/g, '<br>') + '</p><div class="grid2"><button class="btn" data-r="0">Batal</button><button class="btn ' + (danger ? 'red' : 'pri') + '" data-r="1">' + esc(okLabel || 'Ya') + '</button></div></div>';
      el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b || e.target === el) { el.remove(); res(!!(b && b.dataset.r === '1')); } });
      document.body.appendChild(el);
    });
  }
  function sheet(html, mount) {
    closeSheet();
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    scrim.addEventListener('click', e => { if (e.target === scrim) closeSheet(); });
    document.body.appendChild(scrim);
    curSheet = scrim;
    if (mount) mount(scrim.querySelector('.sheet'));
  }
  function download(name, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Fail disediakan: ' + name);
    } catch (e) { toast('Muat turun tidak disokong di sini'); }
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Disalin ke clipboard'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Disalin ke clipboard'); } catch (e2) { toast('Tak dapat salin'); }
      ta.remove();
    }
  }

  // ---------- Suara ----------
  let voices = [];
  function loadVoices() { try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; } }
  loadVoices();
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { loadVoices(); if (S.tab === 'tr') renderTrNote(); if (S.tab === 'in') renderIn(); };
  // Pilih suara: utamakan suara yang TERSIMPAN dalam peranti (localService) — suara "online" (cth. "Google 普通话") diam bila tiada internet
  const isZh = v => /^(zh|cmn)/i.test(v.lang || '') && !/HK|TW|yue/i.test(v.lang || '');
  function voicesFor(lang) {
    const L = (lang || '').toLowerCase().slice(0, 2);
    const list = lang.startsWith('zh') ? voices.filter(isZh).concat(voices.filter(v => /^zh/i.test(v.lang || '') && !isZh(v))) : voices.filter(v => (v.lang || '').toLowerCase().startsWith(L));
    return { local: list.filter(v => v.localService), online: list.filter(v => !v.localService) };
  }
  function pickVoice(lang) {
    const { local, online } = voicesFor(lang);
    // Ada internet: suara online (biasanya lebih jelas) atau tempatan. Tiada internet: tempatan SAHAJA.
    if (!navigator.onLine) return local[0] || null;
    return online[0] || local[0] || null;
  }
  function zhVoice() { return pickVoice('zh-CN'); }
  function zhLocalVoice() { return voicesFor('zh-CN').local[0] || null; }
  const devKind = () => /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : /Windows/.test(navigator.userAgent) ? 'windows' : /Mac OS/.test(navigator.userAgent) ? 'mac' : 'other';
  function voiceHowTo() {
    const k = devKind();
    const T = {
      ios: '<b>iPhone:</b> Settings → Accessibility → <b>Spoken Content</b> → Voices → <b>Chinese (China mainland)</b> → pilih suara (cth. Tingting / Lili) → muat turun.',
      android: '<b>Android:</b> Settings → System → Languages → <b>Text-to-speech output</b> → enjin <b>Speech Services by Google</b> → ⚙ → <b>Install voice data</b> → <b>Chinese (Mandarin)</b> → muat turun. (Samsung: Settings → General management → Text-to-speech.) Kemudian tutup & buka semula app.',
      windows: '<b>Windows:</b> Settings → Time & language → <b>Speech</b> → Add voices → <b>Chinese (Simplified, China)</b> → Add. Kemudian tutup semua tetingkap Chrome & buka semula.',
      mac: '<b>Mac:</b> System Settings → Accessibility → <b>Spoken Content</b> → System voice → Manage Voices → Chinese (China mainland) → muat turun.',
      other: 'Pasang suara Bahasa Cina (Mandarin) dalam tetapan text-to-speech peranti.'
    };
    return T[k];
  }
  function voiceMissingSheet() {
    sheet('<h2>🔇 Suara Cina offline belum dipasang</h2>' +
      '<p style="margin-top:0">Suara Bahasa Cina yang ada dalam ' + (devKind() === 'windows' || devKind() === 'mac' ? 'komputer' : 'telefon') + ' ini ialah suara <b>online</b> — ia hanya berbunyi bila ada internet. Untuk berbunyi tanpa internet (di China), pasang suara yang disimpan dalam peranti:</p>' +
      '<div class="note info small">' + voiceHowTo() + '</div>' +
      '<p class="small muted">Buat semasa ada internet. Sementara itu, tekan <b>⛶ Tunjuk</b> untuk paparkan teks Cina besar kepada orang tempatan.</p>' +
      '<button class="btn pri block" id="vm-ok">Faham</button>', sh => { $('#vm-ok', sh).onclick = closeSheet; });
  }
  let speakWarned = 0;
  function speak(text, lang, rate) {
    if (!('speechSynthesis' in window)) { toast('Peranti ini tidak menyokong suara'); return; }
    lang = lang || 'zh-CN';
    const clean = String(text).replace(/……|…/g, '，').replace(/\s*\/\s*/g, '，');
    loadVoices();
    const v = pickVoice(lang);
    if (lang.startsWith('zh') && voices.length && !v) {
      // Offline & hanya ada suara online / tiada suara langsung
      if (!navigator.onLine && voicesFor(lang).online.length) { voiceMissingSheet(); return; }
      if (!voicesFor(lang).online.length && Date.now() - speakWarned > 20000) { speakWarned = Date.now(); voiceMissingSheet(); return; }
    }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      if (v) u.voice = v;
      u.rate = rate || S.vrate || 0.85;
      let started = false;
      u.onstart = () => { started = true; };
      u.onerror = e => {
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        if (lang.startsWith('zh') && (!navigator.onLine || (v && !v.localService))) voiceMissingSheet();
        else toast('Suara gagal dimainkan' + (e && e.error ? ' (' + e.error + ')' : ''));
      };
      speechSynthesis.speak(u);
      // Chrome kadang-kadang "senyap" tanpa ralat bila suara online tiada internet
      setTimeout(() => { if (!started && !speechSynthesis.speaking && lang.startsWith('zh') && !navigator.onLine) voiceMissingSheet(); }, 2500);
    } catch (e) { toast('Gagal mainkan suara'); }
  }

  // ---------- Kad paparan besar (tunjuk kepada orang tempatan) ----------
  function showCard(o) {
    const el = document.createElement('div');
    el.className = 'show';
    el.innerHTML =
      '<div class="body">' +
      (o.lead ? '<div class="lead zh">' + esc(o.lead) + '</div>' : '') +
      '<div class="big zh">' + esc(o.zh) + '</div>' +
      (o.sub ? '<div class="lead zh" style="font-size:clamp(18px,5vw,26px)">' + esc(o.sub) + '</div>' : '') +
      (o.py ? '<div class="py">' + esc(o.py) + '</div>' : '') +
      (o.ms || o.en ? '<div class="tr">' + esc(o.ms || '') + (o.en ? '<br>' + esc(o.en) : '') + '</div>' : '') +
      '</div>' +
      '<div class="bar"><button class="btn pri" data-x="say">🔊 Dengar</button><button class="btn" data-x="slow">🐢 Perlahan</button><button class="btn" data-x="close">✕ Tutup</button></div>';
    const sayText = o.say || ((o.lead || '') + o.zh + (o.sub ? '，' + o.sub : ''));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-x]');
      if (!b) return;
      if (b.dataset.x === 'say') speak(sayText);
      else if (b.dataset.x === 'slow') speak(sayText, 'zh-CN', 0.55);
      else { try { speechSynthesis.cancel(); } catch (er) {} el.remove(); }
    });
    document.body.appendChild(el);
  }

  // =====================================================================
  // 1) TERJEMAH
  // =====================================================================
  const ALLP = [];
  const PMAP = {};
  (window.PHRASES || []).forEach(c => c.items.forEach(it => {
    const p = { id: 'p:' + it[2], cat: c.id, ms: it[0], en: it[1], zh: it[2], py: it[3] };
    p.hay = norm(p.ms + ' ' + p.en + ' ' + p.py) + ' ' + p.zh;
    if (!PMAP[p.id]) { PMAP[p.id] = p; ALLP.push(p); }
  }));
  function minePhrases() {
    return (S.mine || []).map(m => ({ id: 'm:' + m.id, mid: m.id, cat: 'mine', ms: m.ms, en: m.en, zh: m.zh, py: m.py, hay: norm(m.ms + ' ' + m.en + ' ' + m.py) + ' ' + m.zh }));
  }
  function findP(id) { return PMAP[id] || minePhrases().find(p => p.id === id) || orgPhrases().find(p => p.id === id); }
  const QUICK = ['我听不懂', '请写下来', '谢谢您', '这个多少钱？', '这是清真的吗？', '洗手间在哪里？'];
  const QUICK_MS = ['Tak faham', 'Tolong tulis', 'Terima kasih', 'Berapa harga?', 'Halal?', 'Tandas?'];
  const MICL = { 'ms-MY': 'BM', 'en-US': 'EN', 'zh-CN': '中' };

  function renderTr() {
    const v = $('#v-tr');
    const cats = [['all', 'Semua'], ['fav', '★ Kegemaran'], ['mine', '✍️ Frasa Saya']].concat(orgPhrases().length ? [['org', '📢 Frasa penganjur']] : []).concat((window.PHRASES || []).map(c => [c.id, c.icon + ' ' + c.name]));
    v.innerHTML = mtCardHTML() +
      '<div class="cat-h" style="margin-top:6px">📚 Frasa siap (disemak)</div>' +
      '<div class="search"><span class="mag">🔍</span><input class="input grow" id="trq" type="search" placeholder="Cari: halal, tandas, berapa, hotel…" value="' + esc(ui.trQ) + '" autocomplete="off">' +
      '<button class="icon-btn" id="micLang" title="Bahasa mic" style="font-size:13px;font-weight:800">' + MICL[ui.micLang] + '</button>' +
      '<button class="icon-btn" id="mic" title="Cakap untuk cari">🎤</button></div>' +
      '<div class="quick">' + QUICK.map((z, i) => '<button data-quick="' + esc(z) + '"><span class="zh">' + esc(z.replace('？', '')) + '</span>' + esc(QUICK_MS[i]) + '</button>').join('') + '</div>' +
      '<div class="chips" id="trChips">' + cats.map(c => '<button class="chip' + (ui.trCat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '">' + esc(c[1]) + '</button>').join('') + '</div>' +
      '<div id="trNote"></div><div id="trList"></div>';
    $('#trq').addEventListener('input', e => { ui.trQ = e.target.value; renderTrList(); });
    mtMount();
    renderTrNote();
    renderTrList();
  }

  // ---------- Terjemah ayat sendiri (AI offline) ----------
  ui.mtDir = 'out'; ui.mtText = ''; ui.pack = { out: false, back: false, backms: false }; ui.dl = null; ui.mtOutHTML = '';
  const mtSup = () => (window.MT ? MT.supported() : { ok: false, why: 'Enjin terjemahan tidak dimuatkan.' });
  function mtCardHTML() {
    const back = ui.mtDir === 'back';
    return '<div class="card mtc" id="mtCard">' +
      '<div class="row" style="margin-bottom:8px"><b class="grow" style="font-size:15.5px">✍️ Terjemah ayat sendiri</b><span id="mtBadge" class="small"></span></div>' +
      '<div class="seg" id="mtDir"><button data-dir="out" class="' + (!back ? 'on' : '') + '">BM / EN → 中文</button><button data-dir="back" class="' + (back ? 'on' : '') + '">中文 → BM / EN</button></div>' +
      (back ? '<div class="note info zh" style="font-size:15px;text-align:center"><b>请在下面输入或说出您想说的话</b><br><span class="small">(Serahkan telefon — minta dia taip / cakap dalam bahasa Cina)</span></div>' : '') +
      '<textarea class="input" id="mtIn" rows="3" placeholder="' + (back ? '在这里输入中文…' : 'Taip atau tekan 🎤. Contoh: Saya nak pergi Ice World dengan 3 orang, berapa harga tiket?') + '">' + esc(ui.mtText) + '</textarea>' +
      '<div class="row" style="margin-top:8px">' +
      '<button class="icon-btn" id="mtMic" title="Cakap">🎤</button>' +
      (!back ? '<button class="icon-btn" id="mtMicLang" title="Bahasa mic" style="font-size:13px;font-weight:800">' + (ui.micLang === 'en-US' ? 'EN' : 'BM') + '</button>' : '') +
      '<button class="icon-btn" id="mtClear" title="Kosongkan">✕</button><span class="grow"></span>' +
      '<button class="btn pri" id="mtGo" style="padding:10px 18px">Terjemah →</button></div>' +
      '<div id="mtOut">' + ui.mtOutHTML + '</div>' +
      '<div id="mtPack"></div><div id="mtHist"></div>' +
      '</div>';
  }
  async function mtMount() {
    const ta = $('#mtIn');
    ta.addEventListener('input', () => { ui.mtText = ta.value; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doTranslate(); } });
    renderPack();
    renderHist();
    if (window.MT && mtSup().ok) {
      try {
        const [a, b, c] = await Promise.all([MT.packStatus('out'), MT.packStatus('back'), MT.packStatus('backms')]);
        ui.pack = { out: a, back: b, backms: c };
      } catch (e) {}
      renderPack();
    }
  }
  function renderHist() {
    const box = $('#mtHist'); if (!box) return;
    const H = (S.mtHist || []).filter(x => x.dir === ui.mtDir);
    box.innerHTML = H.length ? '<details class="pack"><summary class="small" style="cursor:pointer;font-weight:700;padding:8px 0">🕘 Terjemahan terkini (' + H.length + ')</summary>' +
      H.map(x => '<div class="hist" data-hi="' + x.t + '"><div class="small muted">' + esc(x.src) + '</div><div class="zh" style="color:var(--red);font-weight:700">' + esc(x.dir === 'back' ? (x.ms || x.en) : x.zh) + '</div></div>').join('') +
      '<button class="btn sm ghost" data-a="clearhist" style="margin-top:6px">Padam sejarah</button></details>' : '';
  }
  const fmtMB = b => (b / 1048576).toFixed(b > 10485760 ? 0 : 1) + ' MB';
  function renderPack() {
    const box = $('#mtPack'), badge = $('#mtBadge');
    if (!box) return;
    const sup = mtSup();
    const need = ui.mtDir;
    if (badge) badge.innerHTML = ui.pack[need] ? '<span class="in">● Offline sedia</span>' : (navigator.onLine ? '<span class="fx">● Online</span>' : '<span class="muted">○ Offline: kamus</span>');
    if (!sup.ok) { box.innerHTML = '<div class="note small" style="margin:10px 0 0">ℹ️ ' + esc(sup.why) + ' Buat masa ini, terjemahan guna kamus perkataan + frasa siap.</div>'; return; }
    if (ui.dl) {
      const pct = Math.round((ui.dl.pct || 0) * 100);
      box.innerHTML = '<div class="pack"><b>⬇ Memuat turun pakej ' + esc(MT.PACKS[ui.dl.p].name) + '…</b><div class="prog"><i id="dlBar" style="width:' + pct + '%;background:var(--accent)"></i></div><div class="small muted" id="dlTxt">' + (ui.dl.total ? fmtMB(ui.dl.loaded) + ' / ' + fmtMB(ui.dl.total) + ' (' + pct + '%)' : 'Menyediakan…') + '</div><div class="small muted">Jangan tutup app. Guna WiFi.</div></div>';
      return;
    }
    const row = p => {
      const P = MT.PACKS[p];
      return '<div class="row" style="padding:7px 0;border-top:1px solid var(--line)"><div class="grow"><b class="small">' + esc(P.name) + '</b><div class="small muted">' + (ui.pack[p] ? '✓ Sudah dimuat turun — berfungsi tanpa internet' : 'Belum dimuat turun · ' + P.approx) + '</div></div>' +
        (ui.pack[p] ? '<button class="btn sm ghost" data-pk="rm" data-p="' + p + '">Buang</button>' : '<button class="btn sm pri" data-pk="dl" data-p="' + p + '">⬇ Muat turun</button>') + '</div>';
    };
    const allReady = ui.pack.out && ui.pack.back && ui.pack.backms;
    box.innerHTML = '<div class="small muted" style="margin-top:8px">' + (navigator.onLine ? '🌐 Ada internet — butang Terjemah berfungsi terus.' : '📴 Tiada internet — ' + (ui.pack[ui.mtDir] ? 'guna pakej offline.' : 'guna kamus & frasa siap.')) + '</div>' +
      '<details class="pack"><summary class="small" style="cursor:pointer;font-weight:700;padding:8px 0">📦 Pakej offline (untuk guna tanpa internet / di China) ' + (allReady ? '✓' : '(' + ((ui.pack.out ? 1 : 0) + (ui.pack.back ? 1 : 0) + (ui.pack.backms ? 1 : 0)) + '/3)') + '</summary>' +
      '<div class="small" style="margin-bottom:6px">Tidak wajib bila ada internet. Untuk terjemah <b>tanpa internet</b> (contoh di China), muat turun pakej ke dalam telefon <b>sekali sahaja di Malaysia (guna WiFi)</b>.</div>' +
      row('out') + row('back') + row('backms') + '</details>';
  }
  async function dlPack(p) {
    if (!navigator.onLine) { toast('Perlukan internet (WiFi) untuk muat turun pakej'); return; }
    const si = MT.storageInfo ? await MT.storageInfo() : null;
    const free = si && si.quota ? si.quota - si.used : 0;
    if (!(await ask('Muat turun pakej ' + MT.PACKS[p].name + ' (' + MT.PACKS[p].approx + ')?\n\nGuna WiFi & biarkan app terbuka sehingga siap. Jika terputus, tekan Muat turun sekali lagi — ia akan sambung.' + (free ? '\n\nRuang storan untuk app: ~' + fmtMB(free) : ''), '⬇ Muat turun'))) return;
    ui.dl = { p, pct: 0, loaded: 0, total: 0 };
    renderPack();
    let wake = null;
    try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {}
    try {
      await MT.download(p, pr => {
        ui.dl = Object.assign({ p }, pr);
        const bar = $('#dlBar'), txt = $('#dlTxt');
        if (bar) bar.style.width = Math.round((pr.pct || 0) * 100) + '%';
        if (txt) txt.textContent = pr.stage === 'engine' ? 'Menyediakan enjin terjemahan…'
          : 'Fail ' + pr.idx + '/' + pr.count + ' · ' + fmtMB(pr.loaded || 0) + ' dimuat turun (' + Math.round((pr.pct || 0) * 100) + '%)';
      });
      try { navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage('cache-vendor'); } catch (e) {}
      ui.pack[p] = await MT.packStatus(p);
      ui.dl = null; renderPack();
      toast(ui.pack[p] ? '✓ Pakej siap — terjemahan kini berfungsi offline' : 'Pakej dimuat turun, tetapi cache tidak dapat disahkan');
    } catch (e) {
      ui.dl = null; renderPack();
      const msg = (e && e.message) ? e.message : String(e);
      const diag = 'Ralat: ' + msg + '\nPakej: ' + p + '\nPelayar: ' + navigator.userAgent + '\nApp: ' + (isStandalone() ? 'Home Screen' : 'pelayar') + (si ? '\nStoran: ' + fmtMB(si.used) + ' / ' + fmtMB(si.quota) : '');
      sheet('<h2>⚠ Muat turun pakej gagal</h2><p style="margin-top:0">' + esc(msg) + '</p>' +
        '<div class="note small">Fail yang sudah siap disimpan. Tekan <b>⬇ Muat turun</b> sekali lagi untuk <b>sambung</b>.<br>• Pastikan WiFi stabil & skrin tidak dikunci.<br>• Pada iPhone, cuba buka link dalam <b>Safari</b> (bukan dari WhatsApp).<br>• Mod Incognito/Private tidak boleh simpan pakej.</div>' +
        '<textarea class="input" readonly rows="5" style="font-size:12px">' + esc(diag) + '</textarea>' +
        '<div class="grid2" style="margin-top:10px"><button class="btn" id="dg-copy">📋 Salin ralat</button><button class="btn pri" id="dg-retry">↻ Cuba lagi</button></div>', sh => {
          $('#dg-copy', sh).onclick = () => copyText(diag);
          $('#dg-retry', sh).onclick = () => { closeSheet(); dlPack(p); };
        });
    } finally { try { wake && wake.release(); } catch (e) {} }
  }
  function relatedPhrases(text, max) {
    const STOP = ['saya', 'aku', 'nak', 'mahu', 'yang', 'dan', 'ini', 'itu', 'the', 'and', 'you', 'ada', 'untuk', 'dengan', 'kami', 'kita', 'boleh', 'tak', 'tidak', 'please', 'want'];
    const toks = norm(text).split(' ').filter(t => t.length > 2 && !STOP.includes(t));
    if (!toks.length) return [];
    const raw = text.trim();
    return orgPhrases().concat(ALLP, minePhrases()).map(p => {
      let s = 0; toks.forEach(t => { if (p.hay.includes(t)) s++; });
      if (/[㐀-鿿]/.test(raw)) { for (const ch of raw) if (/[㐀-鿿]/.test(ch) && p.zh.includes(ch)) s += 0.3; }
      return { p, s };
    }).filter(x => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, max || 3).map(x => x.p);
  }
  function relatedHTML(text) {
    const rel = relatedPhrases(text, 3);
    return rel.length ? '<div class="small muted" style="margin:12px 2px 6px;font-weight:700">📚 Frasa siap yang berkaitan</div>' + rel.map(phCard).join('') : '';
  }
  function resHTML(r) {
    ui.mtLast = r;
    if (r.dir === 'back') {
      return '<div class="mt-res"><div class="small muted">' + (r.online ? '🌐 Online · ' : '📴 Offline · ') + '中文 → ' + (r.ms ? 'Bahasa Melayu & English' : 'English') + '</div>' +
        (r.ms ? '<div class="small muted" style="margin-top:4px">🇲🇾 Bahasa Melayu</div><div class="en-big">' + esc(r.ms) + '</div><div class="small muted" style="margin-top:8px">🇬🇧 English</div><div class="en-big" style="font-size:17px">' + esc(r.en) + '</div>'
          : '<div class="en-big">' + esc(r.en) + '</div>' + (!r.online && !ui.pack.backms && mtSup().ok ? '<div class="small muted" style="margin-top:4px">💡 Bila ada internet, BM keluar terus. Untuk BM tanpa internet, muat turun pakej “+ Bahasa Melayu” di bawah.</div>' : '')) +
        '<div class="zh small" style="margin-top:6px;color:var(--red)">' + esc(r.zh) + '</div>' + (r.py ? '<div class="py small">' + esc(r.py) + '</div>' : '') +
        '<div class="acts">' + (r.ms ? '<button class="btn" data-mt="sayms">🔊 BM</button>' : '') + '<button class="btn" data-mt="sayen">🔊 EN</button><button class="btn" data-mt="reply">↩ Balas</button></div>' +
        '<div class="small muted" style="margin-top:8px">🤖 Terjemahan mesin — baca BM & EN bersama jika ayat kurang jelas.</div></div>';
    }
    return '<div class="mt-res"><div class="small muted">' + (r.online ? '🌐 Online · ' : '📴 Offline · ') + ({ ms: 'Bahasa Melayu', en: 'English', zh: '中文' })[r.lang] + ' → 中文 (Mandarin)</div>' +
      '<div class="zhl zh">' + esc(r.zh) + '</div>' + (r.py ? '<div class="py">' + esc(r.py) + '</div>' : '') +
      (r.en && r.lang !== 'en' ? '<div class="en small" style="margin-top:4px"><b>EN:</b> ' + esc(r.en) + '</div>' : '') +
      '<div class="acts"><button class="btn pri" data-mt="say">🔊 Dengar</button><button class="btn" data-mt="slow">🐢</button><button class="btn" data-mt="show">⛶ Tunjuk</button><span class="grow"></span><button class="btn" data-mt="save" title="Simpan ke Frasa Saya">💾</button></div>' +
      '<div class="small muted" style="margin-top:8px">🤖 Terjemahan mesin. Semak maksud melalui baris EN. Untuk perkara penting (alahan, ubat), guna frasa siap.</div></div>';
  }
  function fallbackHTML(text, why) {
    let h = '<div class="note small" style="margin-top:10px">' + why + '</div>';
    if (ui.mtDir === 'back') {
      const hits = [];
      String(window.GLOSSARY || '').split('\n').forEach(l => { const p = l.split('|'); if (p.length >= 3 && p[1].length > 0 && text.includes(p[1].split('/')[0])) hits.push({ k: p[0].split(',')[0], zh: p[1], py: p[2] }); });
      h += hits.length ? '<div class="mt-res"><div class="small muted">Perkataan yang dikenal pasti:</div><div class="wchips">' + hits.slice(0, 20).map(w => '<span class="wchip"><b class="zh">' + esc(w.zh) + '</b> = ' + esc(w.k) + '</span>').join('') + '</div></div>' : '';
      return h + relatedHTML(text);
    }
    const hits = window.MT ? MT.wordByWord(text) : [];
    if (hits.length) {
      const zh = hits.map(w => w.zh).join(''), py = hits.map(w => w.py).join(' ');
      ui.mtLast = { dir: 'out', lang: 'ms', src: text, zh, py, en: '', rough: true };
      h += '<div class="mt-res"><div class="small muted">Terjemahan kasar perkataan demi perkataan (kamus):</div>' +
        '<div class="wchips">' + hits.map(w => '<span class="wchip">' + esc(w.k) + ' → <b class="zh">' + esc(w.zh) + '</b> <span class="muted">' + esc(w.py) + '</span></span>').join('') + '</div>' +
        '<div class="zhl zh" style="font-size:20px">' + esc(zh) + '</div>' +
        '<div class="acts"><button class="btn pri" data-mt="say">🔊 Dengar</button><button class="btn" data-mt="show">⛶ Tunjuk</button></div></div>';
    }
    return h + relatedHTML(text);
  }
  let mtBusy = false;
  // ---- Terjemahan online (bila ada internet) — MyMemory API, tiada kunci diperlukan ----
  function decodeEnt(t) { const ta = document.createElement('textarea'); ta.innerHTML = String(t || ''); return ta.value; }
  function chunks(text) {
    const parts = String(text).replace(/\s+/g, ' ').split(/(?<=[.!?。！？;；\n])\s*/).map(x => x.trim()).filter(Boolean);
    const out = []; let cur = '';
    parts.forEach(p => { if ((cur + ' ' + p).length > 400 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p; });
    if (cur) out.push(cur);
    return out.slice(0, 8);
  }
  async function mm1(q, from, to) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 10000);
    try {
      const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=' + from + '|' + to, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' });
      const j = await r.json();
      const t = j && j.responseData && j.responseData.translatedText;
      if (!t || (j.responseStatus && +j.responseStatus !== 200) || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE|PLEASE SELECT/i.test(t)) throw new Error((j && j.responseDetails) || 'Tiada hasil');
      return decodeEnt(t).trim();
    } finally { clearTimeout(tm); }
  }
  async function mm(text, from, to) {
    const out = [];
    for (const c of chunks(text)) out.push(await mm1(c, from, to));
    return out.join(to.startsWith('zh') ? '' : ' ');
  }
  async function onlineTranslate(text, dir) {
    const py = z => (window.MT && MT.pinyinOf ? MT.pinyinOf(z) : Promise.resolve(''));
    if (dir === 'back') {
      const [ms, en] = await Promise.all([mm(text, 'zh-CN', 'ms'), mm(text, 'zh-CN', 'en').catch(() => '')]);
      return { dir, src: text, lang: 'zh', zh: text, ms, en, py: await py(text), online: true };
    }
    const lang = window.MT ? MT.detect(text) : 'ms';
    if (lang === 'zh') return { dir, src: text, lang, zh: text, en: '', py: await py(text), online: true };
    const from = lang === 'ms' ? 'ms' : 'en';
    const [zh, en] = await Promise.all([mm(text, from, 'zh-CN'), lang === 'ms' ? mm(text, 'ms', 'en').catch(() => '') : Promise.resolve(text)]);
    return { dir, src: text, lang, zh, en, py: await py(zh), online: true };
  }
  async function doTranslate() {
    const ta = $('#mtIn'); if (!ta) return;
    const text = ta.value.trim(); ui.mtText = ta.value;
    if (!text) { ta.focus(); return; }
    if (mtBusy) return;
    const out = $('#mtOut');
    const sup = mtSup();
    const offFull = sup.ok && ui.pack[ui.mtDir] && (ui.mtDir === 'out' || ui.pack.backms);
    const offPart = sup.ok && ui.pack[ui.mtDir];
    const canOnline = navigator.onLine && !window.HARBIN_SINGLE;
    if (!offFull && !canOnline && !offPart) {
      ui.mtOutHTML = fallbackHTML(text, '📴 Tiada internet' + (sup.ok ? ' dan pakej offline belum dimuat turun' : '') + '. Guna kamus & frasa siap:');
      out.innerHTML = ui.mtOutHTML; return;
    }
    mtBusy = true;
    const go = $('#mtGo'); if (go) { go.disabled = true; go.textContent = '⏳…'; }
    out.innerHTML = '<div class="mt-res small muted">⏳ Sedang menterjemah…' + (offFull || !canOnline ? ' (kali pertama selepas buka app ambil masa 5–20 saat untuk memuatkan model offline)' : '') + '</div>';
    let r = null, err = null;
    if (!offFull && canOnline) {
      try { r = await onlineTranslate(text, ui.mtDir); } catch (e) { err = e; }
    }
    if (!r && offPart) {
      try { r = await MT.translate(text, ui.mtDir, { ms: ui.pack.backms }); } catch (e) { err = e; }
    }
    if (r) {
      ui.mtOutHTML = resHTML(r) + relatedHTML(text);
      S.mtHist = [{ dir: r.dir, src: r.src, zh: r.zh, en: r.en, ms: r.ms || '', py: r.py, t: Date.now() }].concat((S.mtHist || []).filter(x => x.src !== r.src)).slice(0, 30);
      save();
    } else {
      ui.mtOutHTML = fallbackHTML(text, '⚠ Terjemahan ' + (canOnline ? 'online' : '') + ' gagal' + (err && err.message ? ' (' + esc(String(err.message).slice(0, 80)) + ')' : '') + '. Guna kamus & frasa siap:');
    }
    const o2 = $('#mtOut'); if (o2) o2.innerHTML = ui.mtOutHTML;
    renderHist();
    mtBusy = false;
    const g2 = $('#mtGo'); if (g2) { g2.disabled = false; g2.textContent = 'Terjemah →'; }
  }
  function renderTrNote() {
    const n = $('#trNote');
    if (!n) return;
    let h = '';
    if (!('speechSynthesis' in window)) h = '<div class="note">Pelayar ini tidak menyokong suara. Teks Cina dan butang ⛶ Tunjuk masih boleh digunakan.</div>';
    else if (voices.length && !zhLocalVoice()) h = '<div class="note small">🔇 Suara Cina <b>offline</b> belum dipasang — butang 🔊 hanya berbunyi bila ada internet. Lihat <b>Info → 🔊 Suara</b> (buat sebelum berlepas).</div>';
    n.innerHTML = h;
  }
  function phCard(p) {
    const fav = (S.favs || []).includes(p.id);
    return '<div class="ph" data-pid="' + esc(p.id) + '">' +
      '<div class="ms">' + esc(p.ms) + '</div>' + (p.en ? '<div class="en">' + esc(p.en) + '</div>' : '') +
      '<div class="zhl zh">' + esc(p.zh) + '</div>' + (p.py ? '<div class="py">' + esc(p.py) + '</div>' : '') +
      '<div class="acts"><button class="btn pri" data-a="say">🔊 Dengar</button><button class="btn" data-a="slow" title="Perlahan">🐢</button><button class="btn" data-a="show">⛶ Tunjuk</button>' +
      '<span class="grow"></span>' +
      (p.cat === 'mine' ? '<button class="btn" data-a="editmine" title="Ubah">✎</button>' : '') +
      '<button class="btn" data-a="fav" title="Kegemaran">' + (fav ? '★' : '☆') + '</button></div></div>';
  }
  function renderTrList() {
    const box = $('#trList');
    if (!box) return;
    const q = norm(ui.trQ);
    const raw = ui.trQ.trim();
    let list;
    const pool = orgPhrases().concat(ALLP, minePhrases());
    if (q || raw) {
      const toks = q ? q.split(' ') : [];
      list = pool.filter(p => (raw && p.zh.includes(raw)) || (toks.length && toks.every(t => p.hay.includes(t))));
    } else if (ui.trCat === 'fav') list = pool.filter(p => (S.favs || []).includes(p.id));
    else if (ui.trCat === 'mine') list = minePhrases();
    else if (ui.trCat === 'org') list = orgPhrases();
    else if (ui.trCat === 'all') list = null;
    else list = pool.filter(p => p.cat === ui.trCat);

    let h = '';
    if (list === null) {
      const org = orgPhrases();
      if (org.length) h += '<div class="cat-h">📢 Frasa penganjur</div>' + org.map(phCard).join('');
      (window.PHRASES || []).forEach(c => {
        h += '<div class="cat-h">' + c.icon + ' ' + esc(c.name) + '</div>';
        if (c.note) h += '<div class="note info">' + esc(c.note) + '</div>';
        h += ALLP.filter(p => p.cat === c.id).map(phCard).join('');
      });
    } else {
      if (ui.trCat === 'mine' && !q) h += '<button class="btn pri block" data-a="addmine" style="margin-bottom:10px">＋ Tambah frasa sendiri</button><div class="note info">Sediakan ayat khas anda (contoh alamat, alahan makanan, soalan tertentu). Guna Google/Microsoft Translator di Malaysia untuk dapatkan teks Cina, kemudian simpan di sini untuk guna offline.</div>';
      if (q || raw) h += '<div class="small muted" style="margin:0 2px 8px">' + list.length + ' hasil untuk “' + esc(ui.trQ) + '”</div>';
      const cat = (window.PHRASES || []).find(c => c.id === ui.trCat);
      if (cat && cat.note && !q) h += '<div class="note info">' + esc(cat.note) + '</div>';
      h += list.length ? list.map(phCard).join('') : '<div class="empty">' + (ui.trCat === 'fav' && !q ? 'Tekan ☆ pada mana-mana frasa untuk simpan di sini.' : (q ? 'Tiada frasa dijumpai. Cuba perkataan lain, atau tambah dalam “Frasa Saya”.' : 'Belum ada frasa.')) + '</div>';
    }
    box.innerHTML = h;
  }
  function mineSheet(m) {
    m = m || { id: '', ms: '', en: '', zh: '', py: '' };
    sheet('<h2>' + (m.id ? 'Ubah frasa' : 'Frasa baharu') + '</h2>' +
      '<label class="field"><span>Bahasa Melayu</span><input class="input" id="m-ms" value="' + esc(m.ms) + '"></label>' +
      '<label class="field"><span>English (pilihan)</span><input class="input" id="m-en" value="' + esc(m.en) + '"></label>' +
      '<label class="field"><span>中文 (tulisan Cina)</span><input class="input zh" id="m-zh" value="' + esc(m.zh) + '"></label>' +
      '<label class="field"><span>Pinyin (pilihan)</span><input class="input" id="m-py" value="' + esc(m.py) + '"></label>' +
      '<div class="row"><button class="btn pri grow" id="m-save">Simpan</button>' + (m.id ? '<button class="btn red" id="m-del">Padam</button>' : '') + '</div>',
      sh => {
        $('#m-save', sh).onclick = () => {
          const o = { id: m.id || uid(), ms: $('#m-ms', sh).value.trim(), en: $('#m-en', sh).value.trim(), zh: $('#m-zh', sh).value.trim(), py: $('#m-py', sh).value.trim() };
          if (!o.zh || !o.ms) { toast('Isi sekurang-kurangnya BM dan 中文'); return; }
          S.mine = (S.mine || []).filter(x => x.id !== o.id).concat([o]);
          save(); closeSheet(); renderTrList(); toast('Frasa disimpan');
        };
        if (m.id) $('#m-del', sh).onclick = async () => {
          if (!(await ask('Padam frasa ini?', 'Padam', true))) return;
          S.mine = S.mine.filter(x => x.id !== m.id); S.favs = S.favs.filter(f => f !== 'm:' + m.id);
          save(); closeSheet(); renderTrList();
        };
      });
  }
  // Pengecaman suara. Cuba mod dalam-peranti (offline) jika pelayar menyokong.
  const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
  // Nota: SpeechRecognition.available()/install() (API Chrome baharu) menyebabkan pelayar crash — jangan digunakan.
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  let curRec = null;
  function micHelp(code) {
    if (code === 'aborted') return;
    if (code === 'no-speech') { toast('Tiada suara dikesan — dekatkan telefon & cakap sebaik selepas tekan 🎤'); return; }
    const M = {
      'not-allowed': 'Kebenaran mikrofon disekat untuk laman ini.',
      'service-not-allowed': 'Perkhidmatan pengecaman suara disekat oleh telefon/pelayar.',
      network: 'Pengecaman suara pelayar ini perlukan internet (dan pelayan Google/Apple boleh dicapai).',
      'audio-capture': 'Mikrofon tidak dapat digunakan — mungkin sedang digunakan oleh app lain.',
      'language-not-supported': 'Bahasa ini tidak disokong oleh pengecaman suara pelayar ini.',
      unsupported: 'Pelayar ini tidak menyokong pengecaman suara dalam web.',
      start: 'Mikrofon tidak dapat dimulakan.'
    };
    const tips = [];
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      tips.push(isIOS ? '<b>iPhone:</b> Settings → Apps → Safari → <b>Microphone</b> → Allow. Pastikan juga Settings → General → Keyboard → <b>Enable Dictation</b> hidup, dan Settings → Screen Time → Content & Privacy → Siri & Dictation dibenarkan.'
        : '<b>Android Chrome:</b> tekan ikon ⚙/🔒 di sebelah alamat laman → <b>Permissions → Microphone → Allow</b>, kemudian muat semula.');
    }
    if (isIOS && isStandalone()) tips.push('Pada iPhone, mic pelayar sering <b>tidak berfungsi dalam app Home Screen</b>. Buka link yang sama dalam <b>Safari</b> untuk guna butang 🎤 app.');
    if (code === 'unsupported' && !isIOS) tips.push('Guna <b>Chrome</b> (Android) atau <b>Safari</b> (iPhone). Pelayar dalam WhatsApp/Instagram tidak menyokong mic.');
    sheet('<h2>🎤 Mic tidak dapat digunakan</h2><p style="margin-top:0">' + esc(M[code] || ('Ralat: ' + code)) + '</p>' +
      tips.map(t => '<div class="note info small">' + t + '</div>').join('') +
      '<div class="note small"><b>✅ Cara paling pasti (juga offline & di China):</b> tekan kotak teks, kemudian tekan ikon <b>🎤 pada papan kekunci telefon</b> dan bercakap. Teks akan masuk sendiri.</div>' +
      '<button class="btn pri block" id="mh-kb">⌨️ Buka papan kekunci sekarang</button>', sh => {
        $('#mh-kb', sh).onclick = () => { closeSheet(); const ta = $('#mtIn') || $('#trq'); if (ta) { ta.focus(); ta.scrollIntoView({ block: 'center' }); } };
      });
  }
  // onText(teks akhir), onInterim(teks semasa bercakap)
  function recognize(lang, btn, onText, onInterim) {
    if (curRec) { try { curRec.stop(); } catch (e) {} return true; } // tekan sekali lagi untuk berhenti
    if (!SRC) { micHelp('unsupported'); return false; }
    let r;
    try {
      r = new SRC();
      r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    } catch (e) { micHelp('start'); return false; }
    let finalT = '', interimT = '', errored = false;
    r.onstart = () => { if (btn) btn.classList.add('on'); toast('🎤 Mendengar (' + (MICL[lang] || lang) + ')… tekan 🎤 sekali lagi untuk berhenti'); };
    r.onresult = e => {
      interimT = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t; else interimT += t;
      }
      if (onInterim) onInterim((finalT + interimT).trim());
    };
    r.onerror = e => { errored = true; micHelp(e.error); };
    r.onend = () => {
      curRec = null;
      if (btn) btn.classList.remove('on');
      const t = (finalT || interimT).trim();
      if (t) onText(t);
      else if (!errored) toast('Tiada suara dikesan — cuba lagi, atau guna 🎤 pada papan kekunci');
    };
    try { r.start(); curRec = r; } catch (e) { curRec = null; micHelp('start'); return false; }
    return true;
  }
  function listen() {
    const setQ = t => { ui.trQ = t; const q = $('#trq'); if (q) q.value = t; renderTrList(); };
    recognize(ui.micLang, $('#mic'), setQ, t => { const q = $('#trq'); if (q) q.value = t; });
  }
  function mtSpeakTarget() {
    const r = ui.mtLast; if (!r) return null;
    return r;
  }
  $('#v-tr').addEventListener('click', e => {
    const dir = e.target.closest('[data-dir]');
    if (dir) {
      if (ui.mtDir !== dir.dataset.dir) {
        ui.mtDir = dir.dataset.dir; ui.mtText = ''; ui.mtOutHTML = '';
        const card = $('#mtCard'); card.outerHTML = mtCardHTML(); mtMount();
      }
      return;
    }
    const pk = e.target.closest('[data-pk]');
    if (pk) {
      if (pk.dataset.pk === 'dl') dlPack(pk.dataset.p);
      else ask('Buang pakej ini dari telefon? Anda perlu internet untuk muat turun semula.', 'Buang', true).then(ok => { if (ok) MT.removePack(pk.dataset.p).then(() => { ui.pack[pk.dataset.p] = false; renderPack(); }); });
      return;
    }
    if (e.target.closest('#mtGo')) { doTranslate(); return; }
    if (e.target.closest('#mtClear')) { ui.mtText = ''; ui.mtOutHTML = ''; $('#mtIn').value = ''; $('#mtOut').innerHTML = ''; $('#mtIn').focus(); return; }
    if (e.target.closest('#mtMicLang')) {
      ui.micLang = ui.micLang === 'en-US' ? 'ms-MY' : 'en-US';
      $('#mtMicLang').textContent = ui.micLang === 'en-US' ? 'EN' : 'BM';
      const ml = $('#micLang'); if (ml) ml.textContent = MICL[ui.micLang];
      return;
    }
    if (e.target.closest('#mtMic')) {
      const lang = ui.mtDir === 'back' ? 'zh-CN' : (ui.micLang === 'zh-CN' ? 'ms-MY' : ui.micLang);
      recognize(lang, $('#mtMic'), t => { const ta = $('#mtIn'); if (ta) { ta.value = t; ui.mtText = t; } doTranslate(); },
        t => { const ta = $('#mtIn'); if (ta) { ta.value = t; ui.mtText = t; } });
      return;
    }
    const hi = e.target.closest('[data-hi]');
    if (hi) {
      const x = (S.mtHist || []).find(h => String(h.t) === hi.dataset.hi);
      if (x) {
        ui.mtLast = Object.assign({ lang: 'ms' }, x);
        if (x.dir === 'back') { ui.mtOutHTML = resHTML(Object.assign({ dir: 'back', lang: 'zh' }, x)); const o = $('#mtOut'); if (o) { o.innerHTML = ui.mtOutHTML; o.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
        else showCard({ zh: x.zh, py: x.py, ms: x.src, en: x.en });
      }
      return;
    }
    if (e.target.closest('[data-a="clearhist"]')) { S.mtHist = []; save(); renderHist(); return; }
    const mb = e.target.closest('[data-mt]');
    if (mb) {
      const r = mtSpeakTarget(); if (!r) return;
      const a = mb.dataset.mt;
      if (a === 'say') speak(r.zh);
      else if (a === 'slow') speak(r.zh, 'zh-CN', 0.55);
      else if (a === 'show') showCard({ zh: r.zh, py: r.py, ms: r.lang === 'ms' ? r.src : '', en: r.en || (r.lang === 'en' ? r.src : '') });
      else if (a === 'sayen') speak(r.en, 'en-US', 0.95);
      else if (a === 'sayms') speak(r.ms, 'ms-MY', 0.95);
      else if (a === 'save') {
        S.mine = (S.mine || []).concat([{ id: uid(), ms: r.lang === 'en' ? r.src : r.src, en: r.en || '', zh: r.zh, py: r.py || '' }]);
        save(); toast('Disimpan dalam ✍️ Frasa Saya');
      } else if (a === 'reply') {
        ui.mtDir = 'out'; ui.mtText = ''; ui.mtOutHTML = '';
        $('#mtCard').outerHTML = mtCardHTML(); mtMount(); $('#mtIn').focus();
      }
      return;
    }
    const chip = e.target.closest('[data-cat]');
    if (chip) {
      ui.trCat = chip.dataset.cat; ui.trQ = ''; const q = $('#trq'); if (q) q.value = '';
      $$('#trChips .chip').forEach(c => c.classList.toggle('on', c === chip));
      renderTrList(); window.scrollTo({ top: 0 }); return;
    }
    const qk = e.target.closest('[data-quick]');
    if (qk) { const p = PMAP['p:' + qk.dataset.quick]; if (p) { showCard(p); speak(p.zh); } return; }
    if (e.target.closest('#mic')) { listen(); return; }
    if (e.target.closest('#micLang')) {
      const order = ['ms-MY', 'en-US', 'zh-CN'];
      ui.micLang = order[(order.indexOf(ui.micLang) + 1) % 3];
      $('#micLang').textContent = MICL[ui.micLang];
      toast('Mic: ' + ({ 'ms-MY': 'Bahasa Melayu', 'en-US': 'English', 'zh-CN': '中文 (untuk faham apa orang cakap)' })[ui.micLang]);
      return;
    }
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'addmine') { mineSheet(); return; }
    const card = b.closest('[data-pid]');
    const p = card && findP(card.dataset.pid);
    if (!p) return;
    if (a === 'say') speak(p.zh);
    else if (a === 'slow') speak(p.zh, 'zh-CN', 0.55);
    else if (a === 'show') showCard(p);
    else if (a === 'fav') {
      const i = S.favs.indexOf(p.id);
      if (i >= 0) S.favs.splice(i, 1); else S.favs.push(p.id);
      save(); b.textContent = i >= 0 ? '☆' : '★';
      if (ui.trCat === 'fav') renderTrList();
    } else if (a === 'editmine') mineSheet((S.mine || []).find(m => m.id === p.mid));
  });

  // =====================================================================
  // 2) PERSIAPAN (CHECKLIST + BAJET)
  // =====================================================================
  const PRI = { W: 'Wajib', D: 'Disyorkan', P: 'Pilihan' };
  function catsWithItems() {
    return (window.CHECKLIST || []).map(c => {
      const items = c.items.map(r => ({ id: r[0], name: r[1], note: r[2], qty: r[3], price: r[4], pri: r[5], custom: false }))
        .concat(((S.shared && S.shared.ck && S.shared.ck.c) || []).filter(x => x.cat === c.id).map(x => Object.assign({}, x, { custom: false, shared: true })))
        .concat((S.custom || []).filter(x => x.cat === c.id).map(x => Object.assign({ custom: true }, x)));
      return Object.assign({}, c, { items });
    });
  }
  function eff(it) {
    const st = S.check[it.id] || {};
    const so = (S.shared && S.shared.ck && S.shared.ck.o && S.shared.ck.o[it.id]) || {};
    const pick = k => st[k] != null ? st[k] : (so[k] != null ? so[k] : undefined);
    const qty = pick('q') != null ? pick('q') : it.qty;
    const price = pick('p') != null ? pick('p') : it.price;
    return { id: it.id, name: pick('n') != null ? pick('n') : it.name, note: pick('nt') != null ? pick('nt') : it.note, qty, price, est: qty * price, pri: pick('pr') || it.pri, s: st.s || 'todo', a: st.a != null ? st.a : 0, tx: st.tx, custom: it.custom, base: it };
  }
  function totals() {
    const T = { all: 0, have: 0, spent: 0, todo: 0, n: 0, done: 0, byCat: {}, byPri: { W: 0, D: 0, P: 0 } };
    catsWithItems().forEach(c => {
      const C = T.byCat[c.id] = { need: 0, spent: 0, todo: 0, n: 0, done: 0 };
      c.items.forEach(it => {
        const e = eff(it);
        T.n++; C.n++; T.all += e.est;
        if (e.s !== 'todo') { T.done++; C.done++; }
        if (e.s === 'have') T.have += e.est;
        if (e.s === 'bought') { T.spent += e.a; C.spent += e.a; C.need += e.a; T.byPri[e.pri] += e.a; }
        if (e.s === 'todo') { T.todo += e.est; C.todo += e.est; C.need += e.est; T.byPri[e.pri] += e.est; }
      });
    });
    T.projected = T.spent + T.todo;
    return T;
  }
  function ckSumHTML(T) {
    const pct = T.n ? Math.round(T.done / T.n * 100) : 0;
    return '<div class="small muted" style="font-weight:700">JUMLAH BAJET PERSIAPAN (UNJURAN)</div>' +
      '<div class="sum-big num">' + RM(T.projected) + '</div>' +
      (S.limit > 0 ? '<div class="small ' + (T.projected > S.limit ? 'out' : 'in') + '" style="font-weight:600">' + (T.projected > S.limit ? '▲ Melebihi bajet ' + RM0(S.limit) + ' sebanyak ' + RM(T.projected - S.limit) : '✓ Dalam bajet ' + RM0(S.limit) + ' (lebihan ' + RM(S.limit - T.projected) + ')') + '</div>' : '') +
      '<div class="prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="small muted">' + T.done + ' / ' + T.n + ' item selesai (' + pct + '%)</div>' +
      '<div class="kv">' +
      '<div><span>Dah bayar / beli</span><b class="num in">' + RM(T.spent) + '</b></div>' +
      '<div><span>Belum bayar (anggaran)</span><b class="num out">' + RM(T.todo) + '</b></div>' +
      '<div><span>Wajib sahaja (unjuran)</span><b class="num">' + RM(T.byPri.W) + '</b></div>' +
      '<div><span>Jimat — dah ada</span><b class="num">' + RM(T.have) + '</b></div>' +
      '</div>';
  }
  function bajetSumHTML(T) {
    const L = S.limit || 0;
    const bal = L - T.projected, cash = L - T.spent;
    let h = '<h3>💼 Bajet saya</h3>' +
      '<label class="field"><span>Jumlah duit yang saya peruntukkan untuk trip (RM)</span><div class="row"><input class="input grow num" id="limit" inputmode="decimal" placeholder="Contoh: 8000" value="' + (L || '') + '"><button class="btn pri" data-a="setlimit">Simpan</button></div></label>' +
      '<div class="kv" style="margin-top:0">' +
      '<div><span>✓ Dah bayar</span><b class="num in">' + RM(T.spent) + '</b></div>' +
      '<div><span>☐ Belum bayar</span><b class="num out">' + RM(T.todo) + '</b></div>' +
      '<div><span>Jumlah perlu (unjuran)</span><b class="num">' + RM(T.projected) + '</b></div>' +
      (L ? '<div><span>Bajet belum digunakan</span><b class="num">' + RM(cash) + '</b></div>' : '<div><span>Bajet</span><b class="num muted">Belum ditetapkan</b></div>') +
      '</div>';
    if (L) {
      h += '<div class="prog" style="margin-top:12px;height:12px"><i style="width:' + Math.min(100, T.spent / L * 100) + '%;background:var(--ok)"></i></div>' +
        '<div class="small muted">' + Math.round(T.spent / L * 100) + '% bajet sudah dibayar · unjuran ' + Math.round(T.projected / L * 100) + '%</div>' +
        '<div class="note ' + (bal >= 0 ? 'info' : '') + '" style="margin:10px 0 0;font-size:14px">' + (bal >= 0
          ? '✅ <b>Baki bajet selepas semua dibayar: ' + RM(bal) + '</b><br><span class="small">Boleh guna sebagai duit belanja/poket tambahan.</span>'
          : '⚠️ <b>Bajet tidak cukup: kurang ' + RM(-bal) + '</b><br><span class="small">Kurangkan item “Pilihan”, tukar ke “Dah ada”, atau naikkan bajet.</span>') + '</div>';
    }
    return h;
  }
  function bRowHTML(e) {
    const val = e.s === 'bought' ? e.a : e.est;
    const sub = e.s === 'bought' ? '<span class="in">✓ Dah bayar</span>' + (e.est && Math.abs(e.est - e.a) > 0.005 ? ' · anggaran asal ' + RM(e.est) + (e.a < e.est ? ' <span class="in">(jimat ' + RM(e.est - e.a) + ')</span>' : ' <span class="out">(lebih ' + RM(e.a - e.est) + ')</span>') : '')
      : e.s === 'have' ? '<span class="fx">Dah ada — tidak dikira</span>'
      : (e.qty > 1 ? e.qty + ' × ' + RM(e.price) : 'Anggaran');
    return '<div class="brow ' + e.s + '" data-iid="' + esc(e.id) + '">' +
      '<button class="ck" data-a="bck" aria-label="Tanda dah bayar">' + (e.s !== 'todo' ? '✓' : '') + '</button>' +
      '<div class="grow" data-a="edit" style="cursor:pointer"><div class="nm">' + esc(e.name) + '</div><div class="small muted num">' + sub + '</div></div>' +
      (e.s === 'have' ? '<span class="small muted">—</span>' : '<label class="bin"><span>RM</span><input class="num" data-bin="' + esc(e.id) + '" inputmode="decimal" value="' + (+(+val).toFixed(2)) + '" aria-label="Harga"></label>') +
      '</div>';
  }
  function renderCk() {
    const v = $('#v-ck');
    const T = totals();
    let h = '<div class="card" id="cksum">' + ckSumHTML(T) + '</div>' +
      '<div class="seg"><button data-ckv="list" class="' + (ui.ckView === 'list' ? 'on' : '') + '">✅ Senarai barang</button><button data-ckv="budget" class="' + (ui.ckView === 'budget' ? 'on' : '') + '">💰 Bajet & bayaran</button></div>';

    if (ui.ckView === 'list') {
      h += '<div class="chips">' + [['all', 'Semua'], ['todo', 'Belum'], ['done', 'Selesai'], ['W', 'Wajib sahaja']].map(f => '<button class="chip' + (ui.ckFilter === f[0] ? ' on' : '') + '" data-ckf="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>';
      catsWithItems().forEach(c => {
        const C = T.byCat[c.id];
        const rows = c.items.map(eff).filter(e => ui.ckFilter === 'all' || (ui.ckFilter === 'todo' && e.s === 'todo') || (ui.ckFilter === 'done' && e.s !== 'todo') || (ui.ckFilter === 'W' && e.pri === 'W'));
        if (!rows.length && ui.ckFilter !== 'all') return;
        h += '<details class="cl" data-cid="' + c.id + '"' + (ui.open.has(c.id) || ui.ckFilter !== 'all' ? ' open' : '') + '><summary><span class="ic">' + c.icon + '</span><span class="grow"><span class="t">' + esc(c.name) + '</span><br><span class="s">' + C.done + '/' + C.n + ' selesai · ' + RM0(C.need) + '</span></span><span class="chev">›</span></summary>' +
          (c.note ? '<div class="cl-note">' + esc(c.note) + '</div>' : '') +
          rows.map(e => {
            let pr;
            if (e.s === 'bought') pr = '<span class="st">✓ Dibeli ' + RM(e.a) + '</span>' + (e.est ? ' <span class="muted">(anggaran ' + RM(e.est) + ')</span>' : '');
            else if (e.s === 'have') pr = '<span class="hv">✓ Dah ada — tak perlu beli</span>';
            else pr = (e.qty > 1 ? e.qty + ' × ' + RM(e.price) + ' = ' : '') + (e.est ? RM(e.est) : '<span class="muted">Tiada kos</span>');
            return '<div class="it ' + e.s + '" data-iid="' + esc(e.id) + '"><button class="ck" data-a="ck" aria-label="Tanda">' + (e.s === 'bought' ? '✓' : e.s === 'have' ? '✓' : '') + '</button>' +
              '<div class="grow"><div class="nm">' + esc(e.name) + ' <span class="badge b-' + e.pri + '">' + PRI[e.pri] + '</span></div>' +
              (e.note ? '<div class="nt">' + esc(e.note) + '</div>' : '') + '<button class="pr num prbtn" data-a="edit">' + pr + ' <span class="edhint">✎ ubah</span></button></div>' +
              '<button class="ed" data-a="edit" aria-label="Ubah">✎</button></div>';
          }).join('') +
          '<button class="add-it" data-a="add" data-cat="' + c.id + '">＋ Tambah barang</button></details>';
      });
    } else {
      h += '<div class="card" id="bsum">' + bajetSumHTML(T) + '</div>' +
        '<div class="note info small">✏️ <b>Ubah harga</b> terus dalam kotak RM (contoh tiket RM2,200 → 1,200). ☑️ <b>Tanda</b> bila dah bayar — jumlah itu ditolak daripada baki “belum bayar”. Tekan nama untuk ubah butiran / tandakan “dah ada”.</div>' +
        '<label class="row small" style="margin:0 2px 10px"><input type="checkbox" id="autoRec" ' + (S.autoRec !== false ? 'checked' : '') + ' style="width:20px;height:20px"> Rekod bayaran ke tab Kewangan secara automatik</label>' +
        '<div class="chips">' + [['all', 'Semua'], ['todo', 'Belum bayar'], ['bought', 'Dah bayar'], ['cost', 'Ada kos sahaja']].map(f => '<button class="chip' + ((ui.bFilter || 'cost') === f[0] ? ' on' : '') + '" data-bf="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>';
      const bf = ui.bFilter || 'cost';
      catsWithItems().forEach(c => {
        const C = T.byCat[c.id];
        const rows = c.items.map(eff).filter(e => bf === 'all' || (bf === 'todo' && e.s === 'todo') || (bf === 'bought' && e.s === 'bought') || (bf === 'cost' && (e.est > 0 || e.a > 0)));
        if (!rows.length) return;
        h += '<div class="card bcat" style="padding:10px 12px"><div class="row" style="margin-bottom:4px"><b>' + c.icon + ' ' + esc(c.name) + '</b><span class="grow"></span><span class="small num" data-bct="' + c.id + '">' + bcatTxt(C) + '</span></div>' +
          rows.map(bRowHTML).join('') +
          '<button class="add-it" data-a="add" data-cat="' + c.id + '" style="border-top:0;padding:8px 0 2px;text-align:left">＋ Tambah perbelanjaan</button></div>';
      });
      h += '<details class="card"><summary style="cursor:pointer;font-weight:700">📊 Jadual ikut kategori & keutamaan</summary><table class="tb num" style="margin-top:8px"><thead><tr><th>Kategori</th><th>Unjuran</th><th>Dah bayar</th><th>Baki</th></tr></thead><tbody>' +
        catsWithItems().map(c => { const C = T.byCat[c.id]; return '<tr><td>' + c.icon + ' ' + esc(c.name) + '</td><td>' + n2(C.need) + '</td><td class="in">' + n2(C.spent) + '</td><td class="out">' + n2(C.todo) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td>JUMLAH (RM)</td><td>' + n2(T.projected) + '</td><td class="in">' + n2(T.spent) + '</td><td class="out">' + n2(T.todo) + '</td></tr></tfoot></table>' +
        '<table class="tb num" style="margin-top:12px"><tbody>' +
        ['W', 'D', 'P'].map(k => '<tr><td><span class="badge b-' + k + '">' + PRI[k] + '</span></td><td>' + RM(T.byPri[k]) + '</td></tr>').join('') +
        '<tr><td>Wajib + Disyorkan</td><td>' + RM(T.byPri.W + T.byPri.D) + '</td></tr></tbody></table>' +
        '<p class="small muted" style="margin:10px 0 0">Unjuran = harga sebenar yang dah dibayar + anggaran yang belum dibayar. Item “dah ada” tidak dikira. Duit RMB yang ditukar direkod dalam tab Kewangan.</p></details>' +
        '<button class="btn block" data-a="resetck">↺ Set semula semua tanda</button>';
    }
    v.innerHTML = h;
    $$('details.cl', v).forEach(d => d.addEventListener('toggle', () => { if (d.open) ui.open.add(d.dataset.cid); else ui.open.delete(d.dataset.cid); }));
    const ar = $('#autoRec');
    if (ar) ar.addEventListener('change', () => { S.autoRec = ar.checked; save(); });
    $$('[data-bin]', v).forEach(inp => {
      inp.addEventListener('focus', () => { try { inp.select(); } catch (e) {} });
      inp.addEventListener('change', () => budgetEdit(inp.dataset.bin, inp.value));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    });
  }
  function bcatTxt(C) { return '<span class="in">' + RM0(C.spent) + '</span> / ' + RM0(C.need); }
  // Kemas kini ringkasan tanpa lukis semula senarai (supaya kotak input tidak hilang fokus)
  function refreshBudget(id) {
    const T = totals();
    const a = $('#cksum'); if (a) a.innerHTML = ckSumHTML(T);
    const b = $('#bsum'); if (b) { const lim = $('#limit'); const keep = lim && document.activeElement === lim ? lim.value : null; b.innerHTML = bajetSumHTML(T); if (keep != null) { const l2 = $('#limit'); l2.value = keep; } }
    Object.keys(T.byCat).forEach(cid => { const el = $('[data-bct="' + cid + '"]'); if (el) el.innerHTML = bcatTxt(T.byCat[cid]); });
    if (id) {
      const row = $('.brow[data-iid="' + CSS.escape(id) + '"]');
      const it = findItem(id);
      if (row && it) {
        const focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.bin;
        const tmp = document.createElement('div'); tmp.innerHTML = bRowHTML(eff(it));
        const nr = tmp.firstChild; row.replaceWith(nr);
        const inp = $('[data-bin]', nr);
        if (inp) {
          inp.addEventListener('focus', () => { try { inp.select(); } catch (e) {} });
          inp.addEventListener('change', () => budgetEdit(inp.dataset.bin, inp.value));
          inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
          if (focused === id) inp.focus();
        }
      }
    }
  }
  function budgetEdit(id, raw) {
    const it = findItem(id); if (!it) return;
    const e = eff(it);
    const val = Math.max(0, num(raw));
    if (e.s === 'bought') {
      setCheck(id, { a: val });
      const st = S.check[id];
      const tx = st.tx && S.tx.find(t => t.id === st.tx);
      if (tx) tx.amt = val;
    } else if (it.custom) {
      const c = S.custom.find(x => x.id === id);
      c.price = e.qty ? val / e.qty : val;
    } else {
      const unit = e.qty ? val / e.qty : val;
      setCheck(id, { p: Math.abs(unit - it.price) < 1e-9 ? undefined : unit });
    }
    save(); refreshBudget(id);
    toast('Harga dikemas kini: ' + RM(val));
  }
  function budgetToggle(id) {
    const it = findItem(id); if (!it) return;
    const e = eff(it);
    if (e.s === 'todo') {
      const inp = $('[data-bin="' + CSS.escape(id) + '"]');
      const a = inp ? Math.max(0, num(inp.value)) : e.est;
      let txid;
      if (S.autoRec !== false && a > 0) {
        txid = uid();
        S.tx.push({ id: txid, t: 'out', d: today(), tm: nowHM(), amt: a, cur: 'MYR', cat: 'prep', m: 'Kad', note: e.name, rate: S.rate, src: e.id });
      }
      setCheck(id, { s: 'bought', a, tx: txid });
      save(); refreshBudget(id);
      toast('✓ Dah bayar ' + RM(a) + ' — ditolak daripada baki' + (txid ? ' · direkod di Kewangan' : ''));
    } else {
      const prevSt = Object.assign({}, S.check[id]);
      const prevTx = e.tx ? S.tx.find(t => t.id === e.tx) : null;
      if (e.tx) S.tx = S.tx.filter(t => t.id !== e.tx);
      // kekalkan harga sebenar sebagai anggaran baharu supaya tidak hilang
      const unit = e.s === 'bought' && e.qty ? e.a / e.qty : undefined;
      setCheck(id, { s: 'todo', a: undefined, tx: undefined });
      if (unit != null && !it.custom) setCheck(id, { p: Math.abs(unit - it.price) < 1e-9 ? undefined : unit });
      if (unit != null && it.custom) S.custom.find(x => x.id === id).price = unit;
      save(); refreshBudget(id);
      toast('Ditanda belum bayar', 'Batal', () => { S.check[id] = prevSt; if (prevTx) S.tx.push(prevTx); save(); renderCk(); });
    }
  }
  function findItem(id) {
    for (const c of catsWithItems()) { const it = c.items.find(x => x.id === id); if (it) return it; }
    return null;
  }
  function setCheck(id, patch) { S.check[id] = Object.assign({}, S.check[id] || {}, patch); }
  function markDoneSheet(it) {
    const e = eff(it);
    sheet('<h2>✅ ' + esc(e.name) + '</h2>' +
      '<label class="field"><span>Harga sebenar dibayar (RM, jumlah)</span><input class="input num" id="md-a" inputmode="decimal" value="' + (e.est ? +e.est.toFixed(2) : '') + '"></label>' +
      '<label class="field"><span>Tarikh beli</span><input class="input" type="date" id="md-d" value="' + today() + '"></label>' +
      '<label class="row small" style="margin-bottom:14px"><input type="checkbox" id="md-r" checked style="width:20px;height:20px"> Rekod dalam Kewangan (belanja RM, kategori Persiapan)</label>' +
      '<button class="btn pri block" id="md-buy">🛒 Dah beli</button><div style="height:8px"></div>' +
      '<button class="btn block" id="md-have">👍 Dah ada — tak perlu beli</button><div style="height:8px"></div>' +
      '<button class="btn ghost block" id="md-x">Batal</button>',
      sh => {
        $('#md-buy', sh).onclick = () => {
          const a = num($('#md-a', sh).value);
          let txid;
          if ($('#md-r', sh).checked && a > 0) {
            txid = uid();
            S.tx.push({ id: txid, t: 'out', d: $('#md-d', sh).value || today(), tm: nowHM(), amt: a, cur: 'MYR', cat: 'prep', m: 'Kad', note: e.name, rate: S.rate, src: e.id });
          }
          setCheck(e.id, { s: 'bought', a: a, tx: txid });
          save(); closeSheet(); renderCk(); toast('Ditanda dah beli' + (txid ? ' & direkod dalam Kewangan' : ''));
        };
        $('#md-have', sh).onclick = () => { setCheck(e.id, { s: 'have', a: 0, tx: undefined }); save(); closeSheet(); renderCk(); };
        $('#md-x', sh).onclick = closeSheet;
      });
  }
  function itemSheet(it, catId) {
    const isNew = !it;
    const e = it ? eff(it) : { name: '', note: '', qty: 1, price: 0, pri: 'D', s: 'todo', a: 0, custom: true };
    const curPri = e.pri;
    sheet('<h2>' + (isNew ? 'Tambah barang' : 'Ubah barang') + '</h2>' +
      '<label class="field"><span>Nama barang</span><input class="input" id="it-n" value="' + esc(e.name) + '"></label>' +
      '<label class="field"><span>Nota</span><textarea class="input" id="it-nt" rows="2">' + esc(e.note) + '</textarea></label>' +
      '<div class="grid2"><label class="field"><span>Kuantiti</span><input class="input num" id="it-q" inputmode="decimal" value="' + e.qty + '"></label>' +
      '<label class="field"><span>Harga seunit (RM) — boleh ubah</span><input class="input num" id="it-p" inputmode="decimal" value="' + e.price + '"></label></div>' +
      (e.s === 'bought' ? '<label class="field"><span>Harga sebenar dibayar (RM)</span><input class="input num" id="it-a" inputmode="decimal" value="' + e.a + '"></label>' : '') +
      '<div class="field"><span>Keutamaan</span><div class="chips wrap" id="it-pri">' + ['W', 'D', 'P'].map(k => '<button class="chip' + (curPri === k ? ' on' : '') + '" data-k="' + k + '">' + PRI[k] + '</button>').join('') + '</div></div>' +
      '<div class="row"><button class="btn pri grow" id="it-save">Simpan</button>' +
      (!isNew && e.custom ? '<button class="btn red" id="it-del">Padam</button>' : '') +
      (!isNew && !e.custom ? '<button class="btn" id="it-reset">Asal</button>' : '') + '</div>' +
      (!isNew && e.s === 'todo' ? '<div style="height:8px"></div><button class="btn block" id="it-have">👍 Saya dah ada barang ni (tak perlu beli)</button>' : '') +
      (!isNew && e.s === 'have' ? '<div style="height:8px"></div><button class="btn block" id="it-unhave">↺ Tandakan belum ada / perlu beli</button>' : ''),
      sh => {
        let pri = curPri;
        $('#it-pri', sh).addEventListener('click', ev => { const b = ev.target.closest('[data-k]'); if (!b) return; pri = b.dataset.k; $$('#it-pri .chip', sh).forEach(c => c.classList.toggle('on', c === b)); });
        $('#it-save', sh).onclick = () => {
          const name = $('#it-n', sh).value.trim();
          if (!name) { toast('Isi nama barang'); return; }
          const q = num($('#it-q', sh).value), p = num($('#it-p', sh).value), nt = $('#it-nt', sh).value.trim();
          if (isNew) {
            S.custom.push({ id: 'c' + uid(), cat: catId, name, note: nt, qty: q || 1, price: p, pri });
          } else if (e.custom) {
            const c = S.custom.find(x => x.id === it.id);
            Object.assign(c, { name, note: nt, qty: q, price: p, pri });
          } else {
            setCheck(it.id, { n: name !== it.name ? name : undefined, nt: nt !== (it.note || '') ? nt : undefined, q: q !== it.qty ? q : undefined, p: p !== it.price ? p : undefined, pr: pri !== it.pri ? pri : undefined });
          }
          const aEl = $('#it-a', sh);
          if (aEl && !isNew) {
            const a = num(aEl.value);
            setCheck(it.id, { a });
            const st = S.check[it.id];
            const tx = st.tx && S.tx.find(t => t.id === st.tx);
            if (tx) tx.amt = a;
          }
          save(); closeSheet(); renderCk();
        };
        if ($('#it-del', sh)) $('#it-del', sh).onclick = async () => {
          if (!(await ask('Padam barang ini?', 'Padam', true))) return;
          const st = S.check[it.id];
          if (st && st.tx) S.tx = S.tx.filter(t => t.id !== st.tx);
          S.custom = S.custom.filter(x => x.id !== it.id); delete S.check[it.id];
          save(); closeSheet(); renderCk();
        };
        if ($('#it-have', sh)) $('#it-have', sh).onclick = () => { setCheck(it.id, { s: 'have', a: 0, tx: undefined }); save(); closeSheet(); renderCk(); toast('Ditanda dah ada — tidak dikira dalam bajet'); };
        if ($('#it-unhave', sh)) $('#it-unhave', sh).onclick = () => { setCheck(it.id, { s: 'todo', a: undefined, tx: undefined }); save(); closeSheet(); renderCk(); };
        if ($('#it-reset', sh)) $('#it-reset', sh).onclick = () => {
          const st = S.check[it.id] || {};
          S.check[it.id] = { s: st.s, a: st.a, tx: st.tx };
          save(); closeSheet(); renderCk(); toast('Nama, harga & nota dikembalikan ke asal');
        };
      });
  }
  $('#v-ck').addEventListener('click', e => {
    const v = e.target.closest('[data-ckv]');
    if (v) { ui.ckView = v.dataset.ckv; renderCk(); return; }
    const f = e.target.closest('[data-ckf]');
    if (f) { ui.ckFilter = f.dataset.ckf; renderCk(); return; }
    const bfb = e.target.closest('[data-bf]');
    if (bfb) { ui.bFilter = bfb.dataset.bf; renderCk(); return; }
    if (e.target.closest('[data-bin]') || e.target.closest('.bin')) return;
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'add') { itemSheet(null, b.dataset.cat); return; }
    if (a === 'setlimit') { S.limit = num($('#limit').value); save(); refreshBudget(); toast('Bajet disimpan'); return; }
    if (a === 'resetck') {
      ask('Set semula semua tanda (dah beli / dah ada)? Rekod Kewangan yang dibuat dari checklist juga akan dipadam. Harga & nota yang diubah dikekalkan.', 'Set semula', true).then(ok => { if (!ok) return;
      Object.keys(S.check).forEach(id => { const st = S.check[id]; if (st.tx) S.tx = S.tx.filter(t => t.id !== st.tx); st.s = 'todo'; delete st.a; delete st.tx; });
      save(); renderCk(); });
      return;
    }
    const row = b.closest('[data-iid]');
    const it = row && findItem(row.dataset.iid);
    if (!it) return;
    if (a === 'edit') { itemSheet(it); return; }
    if (a === 'bck') { budgetToggle(it.id); return; }
    if (a === 'ck') {
      const en = eff(it);
      if (en.s === 'todo') { markDoneSheet(it); return; }
      const prevSt = Object.assign({}, S.check[it.id]);
      const prevTx = en.tx ? S.tx.find(t => t.id === en.tx) : null;
      if (en.tx) S.tx = S.tx.filter(t => t.id !== en.tx);
      setCheck(it.id, { s: 'todo', a: undefined, tx: undefined });
      save(); renderCk();
      toast('Ditanda belum' + (prevTx ? ' (rekod Kewangan dipadam)' : ''), 'Batal', () => {
        S.check[it.id] = prevSt; if (prevTx) S.tx.push(prevTx); save(); renderCk();
      });
    }
  });

  // =====================================================================
  // 3) KEWANGAN
  // =====================================================================
  const OUTC = [['makan', '🍜', 'Makan & minum'], ['trans', '🚕', 'Pengangkutan'], ['tiket', '🎟️', 'Tiket & aktiviti'], ['inap', '🏨', 'Penginapan'], ['beli', '🛍️', 'Belanja & ole-ole'], ['prep', '🧳', 'Persiapan'], ['net', '📶', 'Internet & telefon'], ['sihat', '💊', 'Kesihatan'], ['lain', '📦', 'Lain-lain']];
  const INC = [['awal', '👛', 'Baki awal / wang dibawa'], ['refund', '↩️', 'Refund / pulangan'], ['hutang', '🤝', 'Bayaran balik / pinjaman'], ['lainm', '➕', 'Lain-lain']];
  const METH = ['Tunai', 'Alipay', 'WeChat Pay', 'Kad', 'TNG', 'Lain'];
  const catOf = (t) => (t.t === 'in' ? INC : OUTC).find(c => c[0] === t.cat) || ['?', '•', t.cat || '-'];
  const rmEq = t => t.t === 'fx' ? t.myr : (t.cur === 'MYR' ? t.amt : t.amt / (t.rate || S.rate || 1));
  const sortTx = arr => arr.slice().sort((a, b) => (b.d + (b.tm || '')).localeCompare(a.d + (a.tm || '')));
  function agg(list) {
    const A = { outC: 0, outM: 0, outRM: 0, inC: 0, inM: 0, inRM: 0, fxM: 0, fxC: 0 };
    list.forEach(t => {
      if (t.t === 'out') { if (t.cur === 'MYR') A.outM += t.amt; else A.outC += t.amt; A.outRM += rmEq(t); }
      else if (t.t === 'in') { if (t.cur === 'MYR') A.inM += t.amt; else A.inC += t.amt; A.inRM += rmEq(t); }
      else if (t.t === 'fx') { A.fxM += t.myr; A.fxC += t.cny; }
    });
    return A;
  }
  function cashCNY() {
    let b = 0;
    S.tx.forEach(t => {
      if (t.t === 'fx') b += t.cny;
      else if (t.cur === 'CNY' && t.m === 'Tunai') b += t.t === 'in' ? t.amt : -t.amt;
    });
    return b;
  }
  const splitTxt = (c, m) => [c ? CNY(c) : '', m ? RM(m) : ''].filter(Boolean).join(' + ') || '—';
  function txRow(t) {
    if (t.t === 'fx') {
      return '<div class="tx" data-tid="' + t.id + '"><div class="ic">💱</div><div class="grow"><div class="t1">Tukar duit</div><div class="t2">' + esc(t.tm || '') + (t.note ? ' · ' + esc(t.note) : '') + ' · 1 RM = ¥' + (+t.rate).toFixed(4) + '</div></div>' +
        '<div class="amt fx num">+' + CNY(t.cny) + '<small>−' + RM(t.myr) + '</small></div></div>';
    }
    const c = catOf(t);
    const sign = t.t === 'out' ? '−' : '+';
    const main = (t.cur === 'MYR' ? RM(t.amt) : CNY(t.amt));
    return '<div class="tx" data-tid="' + t.id + '"><div class="ic">' + c[1] + '</div><div class="grow"><div class="t1">' + esc(t.note || c[2]) + '</div><div class="t2">' + esc(t.tm || '') + ' · ' + esc(c[2]) + ' · ' + esc(t.m || '') + '</div></div>' +
      '<div class="amt num ' + t.t + '">' + sign + main + (t.cur === 'CNY' ? '<small>≈ ' + RM(rmEq(t)) + '</small>' : '') + '</div></div>';
  }
  function renderFn() {
    const v = $('#v-fn');
    const all = S.tx;
    const A = agg(all);
    const dayList = all.filter(t => t.d === ui.fnDate);
    const D = agg(dayList);
    let h = '<div class="rate"><span>💱</span><span class="grow">Kadar: <b class="num">1 RM = ¥ ' + (+S.rate).toFixed(4) + '</b> <span class="muted">(¥1 = RM ' + (1 / S.rate).toFixed(4) + ')</span></span><button class="btn sm" data-a="rate">Ubah</button></div>' +
      '<div class="conv"><input class="input num" id="cv-m" inputmode="decimal" placeholder="RM"><span class="muted">⇄</span><input class="input num" id="cv-c" inputmode="decimal" placeholder="¥ RMB"></div>' +
      '<div class="stats">' +
      '<div class="stat"><div class="l">Keluar ' + (ui.fnDate === today() ? 'hari ini' : fmtDs(ui.fnDate)) + '</div><div class="v out num">' + RM(D.outRM) + '</div><div class="s num">' + splitTxt(D.outC, D.outM) + '</div></div>' +
      '<div class="stat"><div class="l">Baki tunai RMB</div><div class="v num">' + CNY(cashCNY()) + '</div><div class="s">tukar + masuk − belanja tunai</div></div>' +
      '<div class="stat"><div class="l">Jumlah keluar</div><div class="v out num">' + RM(A.outRM) + '</div><div class="s num">' + splitTxt(A.outC, A.outM) + '</div></div>' +
      '<div class="stat"><div class="l">Jumlah masuk</div><div class="v in num">' + RM(A.inRM) + '</div><div class="s num">' + splitTxt(A.inC, A.inM) + (A.fxM ? ' · ditukar ' + RM0(A.fxM) : '') + '</div></div>' +
      '</div>' +
      '<div class="actions3"><button class="btn red" data-a="new" data-t="out">− Keluar</button><button class="btn" style="background:var(--ok);border-color:var(--ok);color:#fff" data-a="new" data-t="in">+ Masuk</button><button class="btn pri" data-a="new" data-t="fx">⇄ Tukar</button></div>' +
      '<div class="seg">' + [['day', '📅 Harian'], ['all', '📜 Semua'], ['cat', '📊 Kategori']].map(s => '<button data-fnv="' + s[0] + '" class="' + (ui.fnView === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div>';

    if (ui.fnView === 'day') {
      h += '<div class="daynav"><button class="icon-btn" data-a="dprev">◀</button><button class="btn grow d" data-a="dpick">' + fmtD(ui.fnDate) + (ui.fnDate === today() ? ' · Hari ini' : '') + '</button><input type="date" id="dpick" value="' + ui.fnDate + '"><button class="icon-btn" data-a="dnext">▶</button></div>' +
        '<div class="card"><div class="grid3 num" style="text-align:center">' +
        '<div><div class="small muted" style="font-weight:700">KELUAR</div><div class="out" style="font-weight:800">' + RM(D.outRM) + '</div><div class="small muted">' + splitTxt(D.outC, D.outM) + '</div></div>' +
        '<div><div class="small muted" style="font-weight:700">MASUK</div><div class="in" style="font-weight:800">' + RM(D.inRM) + '</div><div class="small muted">' + splitTxt(D.inC, D.inM) + '</div></div>' +
        '<div><div class="small muted" style="font-weight:700">TUKAR</div><div class="fx" style="font-weight:800">' + (D.fxC ? CNY(D.fxC) : '—') + '</div><div class="small muted">' + (D.fxM ? 'dari ' + RM(D.fxM) : '') + '</div></div>' +
        '</div><hr class="sep">' +
        (dayList.length ? sortTx(dayList).map(txRow).join('') : '<div class="empty">Tiada rekod pada hari ini.<br>Tekan <b>− Keluar</b> untuk catat belanja.</div>') +
        '</div>';
      const days = Array.from(new Set(all.map(t => t.d))).sort().reverse();
      if (days.length) {
        h += '<div class="card"><h3>Ringkasan setiap hari</h3><table class="tb num"><thead><tr><th>Tarikh</th><th>Keluar</th><th>Masuk</th></tr></thead><tbody>' +
          days.map(d => { const X = agg(all.filter(t => t.d === d)); return '<tr class="click' + (d === ui.fnDate ? ' sel' : '') + '" data-day="' + d + '"><td>' + fmtDs(d) + '<div class="small muted">' + HARI[parseYmd(d).getDay()] + '</div></td><td class="out">' + RM(X.outRM) + '<div class="small muted">' + splitTxt(X.outC, X.outM) + '</div></td><td class="in">' + (X.inRM ? RM(X.inRM) : '—') + (X.fxC ? '<div class="small fx">+' + CNY(X.fxC) + ' tukar</div>' : '') + '</td></tr>'; }).join('') +
          '</tbody><tfoot><tr><td>Jumlah</td><td class="out">' + RM(A.outRM) + '</td><td class="in">' + RM(A.inRM) + '</td></tr></tfoot></table>' +
          (days.length ? '<p class="small muted" style="margin:8px 0 0">Purata keluar sehari: <b>' + RM(A.outRM / days.length) + '</b> (' + days.length + ' hari berekod)</p>' : '') + '</div>';
      }
    } else if (ui.fnView === 'all') {
      h += '<div class="chips">' + [['all', 'Semua'], ['out', 'Keluar'], ['in', 'Masuk'], ['fx', 'Tukar']].map(f => '<button class="chip' + (ui.fnFilter === f[0] ? ' on' : '') + '" data-fnf="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
        '<div class="search"><span class="mag">🔍</span><input class="input grow" id="fnq" type="search" placeholder="Cari keterangan…" value="' + esc(ui.fnQ) + '"></div><div id="fnList"></div>';
    } else {
      const outs = all.filter(t => t.t === 'out');
      const byC = OUTC.map(c => { const l = outs.filter(t => t.cat === c[0]); const X = agg(l); return { c, rm: X.outRM, cn: X.outC, my: X.outM, n: l.length }; }).filter(x => x.n).sort((a, b) => b.rm - a.rm);
      const max = Math.max(1, ...byC.map(x => x.rm));
      h += '<div class="card"><h3>Belanja ikut kategori</h3>' + (byC.length ? '<div class="bars">' + byC.map(x => '<div class="b"><div class="row"><span>' + x.c[1] + ' ' + esc(x.c[2]) + ' <span class="muted small">(' + x.n + ')</span></span><span class="grow"></span><b class="num">' + RM(x.rm) + '</b></div><div class="small muted num">' + splitTxt(x.cn, x.my) + ' · ' + Math.round(x.rm / (A.outRM || 1) * 100) + '%</div><div class="track"><i style="width:' + (x.rm / max * 100) + '%"></i></div></div>').join('') + '</div>' : '<div class="empty">Belum ada perbelanjaan.</div>') + '</div>';
      const byM = METH.map(m => { const X = agg(outs.filter(t => t.m === m)); return { m, rm: X.outRM, cn: X.outC, my: X.outM }; }).filter(x => x.rm);
      if (byM.length) h += '<div class="card"><h3>Ikut cara bayaran</h3><table class="tb num"><tbody>' + byM.map(x => '<tr><td>' + esc(x.m) + '</td><td>' + splitTxt(x.cn, x.my) + '</td><td>' + RM(x.rm) + '</td></tr>').join('') + '</tbody></table></div>';
      const pre = agg(outs.filter(t => t.cur === 'MYR')), trip = agg(outs.filter(t => t.cur === 'CNY'));
      h += '<div class="card"><h3>Persiapan vs di Harbin</h3><table class="tb num"><tbody><tr><td>Belanja dalam RM (persiapan / Malaysia)</td><td>' + RM(pre.outRM) + '</td></tr><tr><td>Belanja dalam RMB (di China)</td><td>' + CNY(trip.outC) + '<div class="small muted">≈ ' + RM(trip.outRM) + '</div></td></tr></tbody><tfoot><tr><td>Jumlah</td><td>' + RM(A.outRM) + '</td></tr></tfoot></table></div>';
    }
    h += '<div class="card"><h3>Eksport & backup</h3><div class="grid2"><button class="btn" data-a="csv">⬇ CSV (Excel)</button><button class="btn" data-a="copy">📋 Salin ringkasan</button></div><p class="small muted" style="margin:8px 0 0">Backup penuh (semua data app) ada di tab Info → Data.</p></div>';
    v.innerHTML = h;

    const cm = $('#cv-m'), cc = $('#cv-c');
    cm.addEventListener('input', () => { cc.value = cm.value ? n2(num(cm.value) * S.rate).replace(/,/g, '') : ''; });
    cc.addEventListener('input', () => { cm.value = cc.value ? n2(num(cc.value) / S.rate).replace(/,/g, '') : ''; });
    const dp = $('#dpick');
    if (dp) dp.addEventListener('change', () => { if (dp.value) { ui.fnDate = dp.value; renderFn(); } });
    if (ui.fnView === 'all') {
      $('#fnq').addEventListener('input', e => { ui.fnQ = e.target.value; renderFnList(); });
      renderFnList();
    }
  }
  function renderFnList() {
    const box = $('#fnList');
    if (!box) return;
    const q = norm(ui.fnQ);
    const list = sortTx(S.tx.filter(t => (ui.fnFilter === 'all' || t.t === ui.fnFilter) && (!q || norm((t.note || '') + ' ' + catOf(t)[2] + ' ' + (t.m || '')).includes(q))));
    if (!list.length) { box.innerHTML = '<div class="empty">Tiada rekod.</div>'; return; }
    let h = '', cur = '';
    list.forEach(t => {
      if (t.d !== cur) {
        if (cur) h += '</div>';
        cur = t.d;
        const X = agg(list.filter(x => x.d === cur));
        h += '<div class="daygrp"><span>' + fmtD(cur) + '</span><span class="out num">' + (X.outRM ? '−' + RM(X.outRM) : '') + '</span></div><div class="card" style="padding:4px 12px">';
      }
      h += txRow(t);
    });
    box.innerHTML = h + '</div>';
  }
  function rateSheet() {
    sheet('<h2>Kadar tukaran</h2><label class="field"><span>1 RM = berapa ¥ RMB?</span><input class="input num" id="r-v" inputmode="decimal" value="' + S.rate + '"></label>' +
      '<p class="small muted">Kadar dikemas kini secara automatik setiap kali anda rekod <b>Tukar duit</b>. Rekod lama kekal dengan kadar asal mereka.</p>' +
      '<button class="btn pri block" id="r-s">Simpan</button>', sh => {
        $('#r-s', sh).onclick = () => { const r = num($('#r-v', sh).value); if (r <= 0) { toast('Kadar tidak sah'); return; } S.rate = r; save(); closeSheet(); renderFn(); };
      });
  }
  function txSheet(t0, type) {
    const isNew = !t0;
    const st = t0 ? Object.assign({}, t0) : { t: type || 'out', d: ui.fnDate || today(), tm: nowHM(), cur: S.lastCur || 'CNY', cat: type === 'in' ? 'awal' : 'makan', m: 'Tunai', amt: '', note: '', myr: '', cny: '' };
    function body() {
      const isFx = st.t === 'fx';
      const cats = st.t === 'in' ? INC : OUTC;
      let h = '<h2>' + (isNew ? 'Rekod baharu' : 'Ubah rekod') + '</h2>' +
        '<div class="seg" id="tx-type">' + [['out', '− Keluar'], ['in', '+ Masuk'], ['fx', '⇄ Tukar duit']].map(x => '<button data-tt="' + x[0] + '" class="' + (st.t === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>';
      if (isFx) {
        h += '<div class="grid2"><label class="field"><span>RM diberi</span><input class="input num" id="tx-myr" inputmode="decimal" value="' + esc(st.myr) + '" placeholder="0.00"></label>' +
          '<label class="field"><span>¥ RMB diterima</span><input class="input num" id="tx-cny" inputmode="decimal" value="' + esc(st.cny) + '" placeholder="0.00"></label></div>' +
          '<div class="small muted" id="tx-rate" style="margin:-4px 0 12px">Kadar akan dikira automatik</div>' +
          '<label class="field"><span>Tempat / nota</span><input class="input" id="tx-note" value="' + esc(st.note) + '" placeholder="Contoh: Money changer Mid Valley"></label>';
      } else {
        h += '<label class="field"><span>Amaun</span><div class="row"><input class="input num grow" id="tx-amt" inputmode="decimal" value="' + esc(st.amt) + '" placeholder="0.00" style="font-size:22px;font-weight:700">' +
          '<div class="seg" id="tx-cur" style="margin:0;flex:none">' + [['CNY', '¥ RMB'], ['MYR', 'RM']].map(x => '<button data-cur="' + x[0] + '" class="' + (st.cur === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
          '<div class="small muted" id="tx-eq" style="margin-top:5px"></div></label>' +
          '<label class="field"><span>' + (st.t === 'out' ? 'Beli apa / keterangan' : 'Keterangan') + '</span><input class="input" id="tx-note" value="' + esc(st.note) + '" placeholder="' + (st.t === 'out' ? 'Contoh: Mi Lanzhou, teksi ke Ice World' : 'Contoh: Tunai yang dibawa') + '"></label>' +
          '<div class="field"><span>Kategori</span><div class="chips wrap" id="tx-cat">' + cats.map(c => '<button class="chip' + (st.cat === c[0] ? ' on' : '') + '" data-c="' + c[0] + '">' + c[1] + ' ' + esc(c[2]) + '</button>').join('') + '</div></div>' +
          '<div class="field"><span>Cara bayaran</span><div class="chips wrap" id="tx-m">' + METH.map(m => '<button class="chip' + (st.m === m ? ' on' : '') + '" data-m="' + m + '">' + m + '</button>').join('') + '</div></div>';
      }
      h += '<div class="grid2"><label class="field"><span>Tarikh</span><input class="input" type="date" id="tx-d" value="' + esc(st.d) + '"></label><label class="field"><span>Masa</span><input class="input" type="time" id="tx-tm" value="' + esc(st.tm) + '"></label></div>' +
        '<div class="row"><button class="btn pri grow" id="tx-save">Simpan</button>' + (!isNew ? '<button class="btn red" id="tx-del">Padam</button>' : '') + '</div>';
      return h;
    }
    function grab(sh) {
      const g = id => $(id, sh);
      if (g('#tx-amt')) st.amt = g('#tx-amt').value;
      if (g('#tx-myr')) st.myr = g('#tx-myr').value;
      if (g('#tx-cny')) st.cny = g('#tx-cny').value;
      if (g('#tx-note')) st.note = g('#tx-note').value;
      st.d = g('#tx-d').value; st.tm = g('#tx-tm').value;
    }
    function mount(sh) {
      const upd = () => {
        const eq = $('#tx-eq', sh);
        if (eq) { const a = num($('#tx-amt', sh).value); eq.textContent = a ? (st.cur === 'CNY' ? '≈ ' + RM(a / S.rate) : '≈ ' + CNY(a * S.rate)) : ''; }
        const rt = $('#tx-rate', sh);
        if (rt) { const m = num($('#tx-myr', sh).value), c = num($('#tx-cny', sh).value); rt.textContent = m && c ? 'Kadar: 1 RM = ¥' + (c / m).toFixed(4) : 'Kadar akan dikira automatik'; }
      };
      sh.addEventListener('input', upd); upd();
      sh.addEventListener('click', ev => {
        const tt = ev.target.closest('[data-tt]');
        if (tt) { grab(sh); st.t = tt.dataset.tt; if (st.t === 'in' && !INC.find(c => c[0] === st.cat)) st.cat = 'awal'; if (st.t === 'out' && !OUTC.find(c => c[0] === st.cat)) st.cat = 'makan'; sh.innerHTML = '<div class="grab"></div>' + body(); mount2(sh); return; }
        const cu = ev.target.closest('[data-cur]');
        if (cu) { st.cur = cu.dataset.cur; $$('#tx-cur button', sh).forEach(b => b.classList.toggle('on', b === cu)); upd(); return; }
        const c = ev.target.closest('[data-c]');
        if (c) { st.cat = c.dataset.c; $$('#tx-cat .chip', sh).forEach(b => b.classList.toggle('on', b === c)); return; }
        const m = ev.target.closest('[data-m]');
        if (m) { st.m = m.dataset.m; $$('#tx-m .chip', sh).forEach(b => b.classList.toggle('on', b === m)); return; }
      });
      mount2(sh);
    }
    function mount2(sh) {
      $('#tx-save', sh).onclick = () => {
        grab(sh);
        let rec;
        if (st.t === 'fx') {
          const m = num(st.myr), c = num(st.cny);
          if (m <= 0 || c <= 0) { toast('Isi RM dan ¥ yang diterima'); return; }
          rec = { id: st.id || uid(), t: 'fx', d: st.d || today(), tm: st.tm, myr: m, cny: c, rate: c / m, note: st.note.trim() };
          S.rate = +(c / m).toFixed(4);
        } else {
          const a = num(st.amt);
          if (a <= 0) { toast('Isi amaun'); return; }
          rec = { id: st.id || uid(), t: st.t, d: st.d || today(), tm: st.tm, amt: a, cur: st.cur, cat: st.cat, m: st.m, note: st.note.trim(), rate: st.rate || S.rate, src: st.src };
          S.lastCur = st.cur;
          if (rec.src && S.check[rec.src] && S.check[rec.src].tx === rec.id && rec.cur === 'MYR') S.check[rec.src].a = a;
        }
        S.tx = S.tx.filter(x => x.id !== rec.id).concat([rec]);
        ui.fnDate = rec.d;
        save(); closeSheet(); renderFn();
        toast(isNew ? (rec.t === 'fx' ? 'Pertukaran direkod · kadar dikemas kini' : 'Direkod') : 'Dikemas kini');
      };
      const del = $('#tx-del', sh);
      if (del) del.onclick = async () => {
        if (!(await ask('Padam rekod ini?', 'Padam', true))) return;
        const old = S.tx.find(x => x.id === st.id);
        S.tx = S.tx.filter(x => x.id !== st.id);
        if (old && old.src && S.check[old.src]) S.check[old.src].tx = undefined;
        if (old && old.itin) { const it = (S.itin || []).find(i => i.id === old.itin); if (it) it.tx = undefined; }
        save(); closeSheet(); renderFn();
        toast('Rekod dipadam', 'Batal', () => { S.tx.push(old); if (old.src && S.check[old.src]) S.check[old.src].tx = old.id; save(); renderFn(); });
      };
    }
    sheet(body(), mount);
  }
  function csv() {
    const rows = [['Tarikh', 'Masa', 'Jenis', 'Kategori', 'Cara bayar', 'Keterangan', 'Amaun', 'Mata wang', 'Setara RM', 'Kadar (1RM=¥)']];
    sortTx(S.tx).reverse().forEach(t => {
      if (t.t === 'fx') rows.push([t.d, t.tm || '', 'Tukar', '', '', t.note || '', t.myr.toFixed(2) + ' -> ' + t.cny.toFixed(2), 'MYR->CNY', t.myr.toFixed(2), (+t.rate).toFixed(4)]);
      else rows.push([t.d, t.tm || '', t.t === 'out' ? 'Keluar' : 'Masuk', catOf(t)[2], t.m || '', t.note || '', t.amt.toFixed(2), t.cur, rmEq(t).toFixed(2), (+(t.rate || S.rate)).toFixed(4)]);
    });
    return '﻿' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }
  function summaryText() {
    const A = agg(S.tx);
    const days = Array.from(new Set(S.tx.map(t => t.d))).sort();
    let s = 'RINGKASAN KEWANGAN TRIP HARBIN\n';
    s += 'Jumlah keluar: ' + RM(A.outRM) + ' (' + splitTxt(A.outC, A.outM) + ')\n';
    s += 'Jumlah masuk: ' + RM(A.inRM) + '\nDitukar: ' + RM(A.fxM) + ' → ' + CNY(A.fxC) + '\nBaki tunai RMB: ' + CNY(cashCNY()) + '\n\n';
    days.forEach(d => {
      const l = sortTx(S.tx.filter(t => t.d === d)).reverse();
      const X = agg(l);
      s += '== ' + fmtD(d) + ' — keluar ' + RM(X.outRM) + (X.inRM ? ', masuk ' + RM(X.inRM) : '') + '\n';
      l.forEach(t => {
        if (t.t === 'fx') s += '  ' + (t.tm || '') + ' Tukar ' + RM(t.myr) + ' → ' + CNY(t.cny) + '\n';
        else s += '  ' + (t.tm || '') + ' ' + (t.t === 'out' ? '-' : '+') + (t.cur === 'MYR' ? RM(t.amt) : CNY(t.amt)) + ' ' + (t.note || catOf(t)[2]) + ' [' + (t.m || '') + ']\n';
      });
    });
    return s;
  }
  $('#v-fn').addEventListener('click', e => {
    const v = e.target.closest('[data-fnv]');
    if (v) { ui.fnView = v.dataset.fnv; renderFn(); return; }
    const f = e.target.closest('[data-fnf]');
    if (f) { ui.fnFilter = f.dataset.fnf; $$('[data-fnf]').forEach(c => c.classList.toggle('on', c === f)); renderFnList(); return; }
    const day = e.target.closest('[data-day]');
    if (day) { ui.fnDate = day.dataset.day; renderFn(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const tx = e.target.closest('[data-tid]');
    if (tx) { const t = S.tx.find(x => x.id === tx.dataset.tid); if (t) txSheet(t); return; }
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'new') txSheet(null, b.dataset.t);
    else if (a === 'rate') rateSheet();
    else if (a === 'dprev') { ui.fnDate = addDays(ui.fnDate, -1); renderFn(); }
    else if (a === 'dnext') { ui.fnDate = addDays(ui.fnDate, 1); renderFn(); }
    else if (a === 'dpick') { const dp = $('#dpick'); try { dp.showPicker(); } catch (er) { dp.focus(); dp.click(); } }
    else if (a === 'csv') download('kewangan-harbin-' + today() + '.csv', csv(), 'text/csv;charset=utf-8');
    else if (a === 'copy') copyText(summaryText());
  });

  // =====================================================================
  // 4) INFO
  // =====================================================================
  function prayerTimes(date, lat, lng, tz) {
    const D2R = Math.PI / 180, R2D = 180 / Math.PI;
    const sin = d => Math.sin(d * D2R), cos = d => Math.cos(d * D2R), tan = d => Math.tan(d * D2R);
    const asin = x => Math.asin(x) * R2D, acos = x => Math.acos(x) * R2D, atan2 = (y, x) => Math.atan2(y, x) * R2D, acot = x => Math.atan(1 / x) * R2D;
    const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
    let Y = date.getFullYear(), M = date.getMonth() + 1; const Dd = date.getDate();
    if (M <= 2) { Y -= 1; M += 12; }
    const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
    const jDate = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + Dd + B - 1524.5 - lng / (15 * 24);
    const sunPos = jd => {
      const D = jd - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
      const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * D;
      const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
      return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fix(RA, 24) };
    };
    const midDay = t => fix(12 - sunPos(jDate + t).eqt, 24);
    const angleTime = (ang, t, ccw) => { const dc = sunPos(jDate + t).decl; const T = acos((-sin(ang) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat))) / 15; return midDay(t) + (ccw ? -T : T); };
    const asr = (f, t) => { const dc = sunPos(jDate + t).decl; return angleTime(-acot(f + tan(Math.abs(lat - dc))), t); };
    const r = {
      Subuh: angleTime(20, 5 / 24, true), Syuruk: angleTime(0.833, 6 / 24, true), Zohor: midDay(12 / 24),
      Asar: asr(1, 13 / 24), Maghrib: angleTime(0.833, 18 / 24), Isyak: angleTime(18, 18 / 24)
    };
    const out = {};
    Object.keys(r).forEach(k => {
      let h = r[k] + tz - lng / 15;
      if (k !== 'Syuruk') h += 2 / 60; // ihtiyat ~2 minit
      h = fix(h, 24);
      let mins = Math.ceil(h * 60);
      out[k] = pad(Math.floor(mins / 60) % 24) + ':' + pad(mins % 60);
    });
    return out;
  }
  function qibla(lat, lng) {
    const D2R = Math.PI / 180, mk = { lat: 21.4225, lng: 39.8262 };
    const dl = (mk.lng - lng) * D2R;
    const y = Math.sin(dl), x = Math.cos(lat * D2R) * Math.tan(mk.lat * D2R) - Math.sin(lat * D2R) * Math.cos(dl);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }
  function renderIn() {
    const v = $('#v-in');
    const H = S.hotel || {};
    const ptDate = (S.trip.start && today() < S.trip.start) ? S.trip.start : today();
    const pt = prayerTimes(parseYmd(ui.ptDate || ptDate), HARBIN.lat, HARBIN.lng, HARBIN.tz);
    const qb = qibla(HARBIN.lat, HARBIN.lng);
    const zv = zhVoice();
    let h = (ROLE === 'admin' ? adminPanelHTML() + (onWeb() && LIVE_FEATURE ? liveAdminHTML() : '') : annHTML() + userSyncHTML() + (onWeb() && LIVE_FEATURE ? liveUserHTML() : '')) + shareCardHTML();
    h += '<div class="card"><h3>🗓️ Tarikh trip</h3><div class="grid2"><label class="field"><span>Pergi</span><input class="input" type="date" id="tr-s" value="' + esc(S.trip.start) + '"></label><label class="field"><span>Balik</span><input class="input" type="date" id="tr-e" value="' + esc(S.trip.end) + '"></label></div>' +
      (S.trip.start && S.trip.end ? '<div class="small muted">' + (daysBetween(S.trip.start, S.trip.end) + 1) + ' hari, ' + daysBetween(S.trip.start, S.trip.end) + ' malam</div>' : '<div class="small muted">Isi tarikh untuk kira detik ke Harbin.</div>') + '</div>';

    h += '<div class="card"><h3>🏨 Kad Hotel (tunjuk kepada pemandu teksi)</h3>' +
      '<label class="field"><span>Nama hotel dalam tulisan Cina</span><input class="input zh" id="h-nz" value="' + esc(H.nameZh) + '" placeholder="Salin dari Trip.com / emel tempahan"></label>' +
      '<label class="field"><span>Nama hotel (English)</span><input class="input" id="h-ne" value="' + esc(H.nameEn) + '"></label>' +
      '<label class="field"><span>Alamat dalam tulisan Cina</span><textarea class="input zh" id="h-ad" rows="2">' + esc(H.addr) + '</textarea></label>' +
      '<label class="field"><span>No. telefon hotel</span><input class="input" id="h-ph" inputmode="tel" value="' + esc(H.phone) + '"></label>' +
      '<div class="grid2"><button class="btn" data-a="savehotel">💾 Simpan</button><button class="btn pri" data-a="showhotel">⛶ Tunjuk kad</button></div></div>';

    h += '<div class="card"><h3>📍 Tempat popular — tunjuk kepada pemandu</h3><p class="small muted" style="margin-top:0">Tekan untuk paparan besar “Pakcik, tolong bawa saya ke…”.</p>' +
      (window.PLACES || []).map((p, i) => '<div class="place" data-place="' + i + '"><div class="grow"><div class="zh">' + esc(p[0]) + '</div><div class="small"><b>' + esc(p[2]) + '</b> <span class="muted">· ' + esc(p[1]) + '</span></div><div class="small muted">' + esc(p[3]) + '</div></div><span class="muted">⛶</span></div>').join('') + '</div>';

    h += '<div class="card"><h3>🚨 Nombor kecemasan China</h3>' +
      [['Polis', '110'], ['Ambulans', '120'], ['Bomba', '119'], ['Kemalangan jalan raya', '122'], ['Talian bantuan bandar (ada bantuan bahasa)', '12345']].map(x => '<div class="tel"><span>' + x[0] + '</span><a href="tel:' + x[1] + '">' + x[1] + '</a></div>').join('') +
      '<hr class="sep"><div><b>Kedutaan Besar Malaysia, Beijing</b><div class="small">No. 2 Liang Ma Qiao Bei Jie, Chaoyang District, Beijing</div><div class="small zh">北京市朝阳区亮马桥北街2号</div>' +
      '<div class="tel"><span>Telefon</span><a href="tel:+861065322531">+86 10 6532 2531</a></div></div>' +
      '<p class="small muted" style="margin:6px 0 0">Tiada konsulat Malaysia di Harbin — kedutaan di Beijing yang menjaga wilayah Heilongjiang. Sahkan nombor di laman KLN sebelum berlepas.</p></div>';

    h += '<div class="card"><h3>🕌 Waktu solat Harbin & kiblat</h3><div class="row" style="margin-bottom:10px"><input class="input" type="date" id="pt-d" value="' + esc(ui.ptDate || ptDate) + '"></div>' +
      '<div class="pt">' + Object.keys(pt).map(k => '<div><span>' + k + '</span><b class="num">' + pt[k] + '</b></div>').join('') + '</div>' +
      '<p class="small" style="margin:10px 0 4px">🧭 Arah kiblat dari Harbin: <b>' + qb.toFixed(0) + '°</b> dari Utara (arah Barat, sedikit ke Barat Laut).</p>' +
      '<p class="small muted" style="margin:0">Anggaran dikira offline (Subuh 20°, Isyak 18°, Asar Syafie, +2 minit ihtiyat). Waktu China (UTC+8) sama dengan Malaysia. Siang sangat pendek — Maghrib sekitar 3:50 petang.</p></div>';

    h += '<div class="card"><h3>❄️ Cuaca & tips penting</h3><ul class="list-plain">' +
      '<li><b>Suhu Disember:</b> siang sekitar −10°C hingga −15°C, malam −20°C hingga −30°C. Angin membuatkan rasa lebih sejuk.</li>' +
      '<li><b>Ice & Snow World</b> biasanya dibuka pertengahan–akhir Disember. Jika trip awal Disember, semak tarikh pembukaan dahulu.</li>' +
      '<li><b>Telefon & bateri</b> cepat mati dalam sejuk — simpan dalam poket dalam, bawa powerbank (berlogo 3C).</li>' +
      '<li><b>Jangan sentuh besi</b> dengan tangan/kulit basah di luar — boleh melekat.</li>' +
      '<li><b>Dalam bangunan sangat panas</b> (~24°C). Buka jaket bila masuk untuk elak berpeluh — peluh jadi sejuk bila keluar semula.</li>' +
      '<li><b>Tanda frostbite:</b> kulit putih/kelabu & kebas di jari, hidung, telinga. Masuk ke dalam, panaskan perlahan-lahan (jangan gosok kuat, jangan guna air panas mendidih).</li>' +
      '<li><b>Jalan berais:</b> langkah pendek, badan condong sedikit ke depan, tangan keluar dari poket.</li>' +
      '<li><b>Bayaran:</b> hampir semua guna Alipay / WeChat Pay. Bawa sedikit tunai untuk gerai kecil.</li>' +
      '<li><b>Internet:</b> WhatsApp, Google, Instagram disekat di WiFi China. Roaming/eSIM Malaysia boleh guna seperti biasa.</li>' +
      '<li><b>Air paip</b> jangan diminum terus — guna air botol atau air yang dimasak.</li>' +
      '<li><b>Makanan halal:</b> cari tulisan <span class="zh">清真</span> (qīngzhēn) atau restoran <span class="zh">兰州拉面</span>. Kawasan Daowai dekat masjid ada banyak pilihan.</li>' +
      '<li><b>Tandas:</b> banyak tandas cangkung & tiada tisu — bawa tisu & botol air.</li>' +
      '</ul></div>';

    h += '<div class="card"><h3>🔊 Suara (text-to-speech)</h3>' +
      (() => { if (!('speechSynthesis' in window)) return '<div class="note">Pelayar ini tidak menyokong suara.</div>';
        const vl = voicesFor('zh-CN');
        if (!voices.length) return '<div class="note">Menyemak suara… tekan Uji suara.</div>';
        return '<div class="note ' + (vl.local.length ? 'info' : '') + ' small">' +
          (vl.local.length ? '✅ <b>Suara offline:</b> ' + esc(vl.local[0].name) + ' — berbunyi walaupun tanpa internet.' : '⚠️ <b>Tiada suara Cina offline.</b> ' + (vl.online.length ? 'Yang ada hanya suara online (' + esc(vl.online[0].name) + ') — senyap bila tiada internet.' : 'Tiada suara Cina langsung.') + '<br>' + voiceHowTo()) +
          '</div>'; })() +
      '<label class="field"><span>Kelajuan suara: <b id="vr-l">' + (+S.vrate).toFixed(2) + '×</b></span><input type="range" id="vr" min="0.5" max="1.1" step="0.05" value="' + S.vrate + '" style="width:100%"></label>' +
      '<button class="btn block" data-a="testv">▶ Uji suara: 您好，我来自马来西亚</button>' +
      '<p class="small muted" style="margin:0">Buat semasa ada internet di Malaysia. Selepas dimuat turun, suara berfungsi tanpa internet.</p></div>';

    h += '<div class="card"><h3>🎤 Cakap → teks tanpa internet</h3>' +
      '<p class="small" style="margin-top:0">Cara paling boleh dipercayai bila offline: tekan kotak “Terjemah ayat sendiri”, kemudian tekan <b>🎤 pada papan kekunci telefon</b> dan bercakap. Teks keluar, tekan <b>Terjemah →</b>.</p>' +
      '<p class="small" style="margin:0 0 4px"><b>iPhone:</b> Settings → General → Keyboard → hidupkan <b>Enable Dictation</b>. Tambah papan kekunci <b>Malay</b> &amp; <b>Chinese Simplified (Pinyin)</b> supaya boleh dictate dalam BM &amp; 中文. iPhone baharu memproses dictation dalam peranti (offline).</p>' +
      '<p class="small" style="margin:0 0 8px"><b>Android (Gboard):</b> Gboard Settings → Voice typing → <b>Offline speech recognition</b> → muat turun <b>Malay</b>, <b>English</b> &amp; <b>中文 (普通话)</b>.</p>' +
      '<p class="small muted" style="margin:0">Butang 🎤 dalam app guna pengecaman suara pelayar — kebanyakan telefon perlukan internet untuknya. Mic papan kekunci boleh offline.</p>' +
      '</div>';

    h += '<div class="card"><h3>🤖 Pakej terjemahan offline</h3><p class="small" style="margin-top:0">Pakej AI untuk terjemah ayat bebas (BM/EN → 中文 dan 中文 → EN) diurus dalam tab <b>Terjemah</b> → bahagian “📦 Pakej terjemahan offline”. Muat turun di Malaysia menggunakan WiFi (sumbernya disekat di China).</p>' +
      '<button class="btn block" data-a="gotr">Pergi ke tab Terjemah</button></div>';

    h += '<div class="card"><h3>💾 Data & backup</h3><p class="small muted" style="margin-top:0">Semua data (checklist, kewangan, frasa sendiri) disimpan dalam telefon ini sahaja. Buat backup sekali-sekala & simpan dalam Files / emel kepada diri sendiri.</p>' +
      '<div class="grid2"><button class="btn" data-a="backup">⬇ Backup (JSON)</button><button class="btn" data-a="restore">⬆ Pulihkan</button></div><input type="file" id="restoreFile" accept=".json,application/json" style="display:none">' +
      '<div style="height:8px"></div><button class="btn block" data-a="reset" style="color:var(--red)">🗑 Padam semua data</button></div>';

    h += '<div class="card"><h3>📲 Cara guna tanpa internet</h3><ol class="list-plain">' +
      '<li>Di Malaysia (ada internet), buka pautan app ini dalam <b>Safari</b> (iPhone) atau <b>Chrome</b> (Android).</li>' +
      '<li>iPhone: butang Share → <b>Add to Home Screen</b>. Android: menu ⋮ → <b>Install app / Add to Home screen</b>.</li>' +
      '<li>Buka app dari ikon Home Screen sekali, kemudian hidupkan <b>Mod Kapal Terbang</b> dan buka semula untuk uji.</li>' +
      '<li>Di China, app tidak perlu internet langsung — jadi tiada apa yang boleh disekat.</li>' +
      '<li>Sentiasa buka app dari ikon Home Screen (data disimpan di situ).</li></ol>' +
      '<p class="small muted" style="margin:6px 0 0">Status: ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? '✓ App sudah disimpan untuk guna offline.' : (location.protocol === 'file:' ? 'Dibuka sebagai fail tempatan.' : 'Belum disimpan offline — muat semula halaman sekali semasa online.')) + '</p></div>';

    h += '<p class="small muted" style="text-align:center">Arztech Harbin Trip v10.2 · Semua harga & maklumat ialah anggaran — sahkan sebelum berlepas.</p>';
    v.innerHTML = h;

    const saveTrip = () => { S.trip.start = $('#tr-s').value; S.trip.end = $('#tr-e').value; save(); updateHeader(); };
    $('#tr-s').addEventListener('change', () => { saveTrip(); renderIn(); });
    $('#tr-e').addEventListener('change', () => { saveTrip(); renderIn(); });
    $$('[data-inc]', v).forEach(cb => cb.addEventListener('change', () => { pubCfg().inc[cb.dataset.inc] = cb.checked; save(); }));
    const annEl = $('#ad-ann'); if (annEl) annEl.addEventListener('change', () => { S.announce = annEl.value; save(); });
    $('#pt-d').addEventListener('change', e => { ui.ptDate = e.target.value; renderIn(); });
    $('#vr').addEventListener('input', e => { S.vrate = +e.target.value; $('#vr-l').textContent = S.vrate.toFixed(2) + '×'; save(); });
    $('#restoreFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          const d = JSON.parse(r.result);
          if (!d || typeof d !== 'object' || !Array.isArray(d.tx)) throw new Error('bad');
          if (!(await ask('Gantikan semua data sekarang dengan backup ini?', 'Gantikan', true))) return;
          S = Object.assign(DEF(), d); save(); toast('Data dipulihkan'); renderAll();
        } catch (er) { toast('Fail backup tidak sah'); }
      };
      r.readAsText(f);
    });
  }
  function hotelVals() { return { nameZh: $('#h-nz').value.trim(), nameEn: $('#h-ne').value.trim(), addr: $('#h-ad').value.trim(), phone: $('#h-ph').value.trim() }; }
  $('#v-in').addEventListener('click', e => {
    const pl = e.target.closest('[data-place]');
    if (pl) { const p = PLACES[+pl.dataset.place]; showCard({ lead: '师傅，请带我去：', zh: p[0], py: p[1], ms: 'Pakcik, tolong bawa saya ke: ' + p[2], en: 'Please take me to: ' + p[2] }); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { copyText(cp.dataset.copy); return; }
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (['publish', 'pubfile', 'ghsave', 'ghclear'].includes(a)) { adminClick(a); return; }
    if (a === 'livejoin') { liveJoinSheet(); return; }
    if (a === 'lvnew') { ask('Jana kod kumpulan baharu? Ahli lama perlu kod baharu untuk terus berkongsi.', 'Jana').then(ok => { if (ok) { $('#lv-code').value = newCode(); } }); return; }
    if (a === 'lvoff') { liveCfg().on = false; save(); liveStop(); renderIn(); return; }
    if (a === 'lvsave') {
      const c = liveCfg();
      const raw = $('#lv-db').value, code = normCode($('#lv-code').value), name = $('#lv-name').value.trim();
      if (!raw.trim()) { toast('Tampal alamat Firebase dahulu'); return; }
      if (code.length < 8) { toast('Kod kumpulan sekurang-kurangnya 8 aksara'); return; }
      if (!name) { toast('Isi nama anda'); return; }
      if (!navigator.onLine) { toast('Perlukan internet untuk aktifkan'); return; }
      b.disabled = true; b.textContent = '⏳ Menyemak sambungan…';
      (async () => {
        const db = await resolveDb(raw);
        if (!db) { b.disabled = false; b.textContent = '▶ Aktifkan itinerari bersama'; liveProblemSheet({ why: 'addr', msg: 'Alamat yang ditampal: ' + raw.trim().slice(0, 120) }); return; }
        const prev = { db: c.db, code: c.code, on: c.on };
        c.db = db; c.code = code; c.on = true; S.myName = name;
        const res = await liveCheck();
        if (!res.ok) { Object.assign(c, prev); save(); renderIn(); liveProblemSheet(res); return; }
        save(); liveStart(); renderIn();
        toast('✅ Sambungan berjaya — itinerari bersama aktif! Tekan 🚀 Terbitkan supaya pengguna dapat alamat database.');
      })();
      return;
    }
    if (a === 'syncnow') { syncShared(true); return; }
    if (a === 'sharelink') { navigator.share({ title: 'Arztech Harbin Trip', text: 'App Arztech Harbin Trip — terjemahan, itinerari & bajet (boleh guna offline)', url: siteBase() }).catch(() => {}); return; }
    if (a === 'savehotel') { S.hotel = hotelVals(); save(); toast('Kad hotel disimpan'); }
    else if (a === 'showhotel') {
      S.hotel = hotelVals(); save();
      const H = S.hotel;
      if (!H.nameZh && !H.addr) { toast('Isi nama atau alamat hotel dalam tulisan Cina dahulu'); return; }
      showCard({ lead: '师傅，请带我去这家酒店：', zh: H.nameZh || H.addr, sub: H.nameZh ? H.addr : '', py: H.phone ? '☎ ' + H.phone : '', ms: 'Tolong bawa saya ke hotel ini' + (H.nameEn ? ': ' + H.nameEn : ''), en: 'Please take me to this hotel' });
    }
    else if (a === 'testv') speak('您好，我来自马来西亚');
    else if (a === 'gotr') setTab('tr');
    else if (a === 'backup') download('harbin-trip-backup-' + today() + '.json', JSON.stringify(S, null, 1), 'application/json');
    else if (a === 'restore') $('#restoreFile').click();
    else if (a === 'reset') {
      ask('PADAM semua data (checklist, kewangan, itinerari, frasa sendiri)? Tidak boleh dibatalkan. Buat backup dahulu jika perlu.', 'Padam semua', true).then(ok => {
        if (!ok) return;
        S = DEF(); save(); renderAll(); toast('Semua data dipadam');
      });
    }
  });

  // =====================================================================
  // 5) ITINERARI
  // =====================================================================
  const ITYPES = [['flight', '✈️', 'Penerbangan'], ['trans', '🚕', 'Pengangkutan'], ['hotel', '🏨', 'Hotel'], ['activity', '🎡', 'Aktiviti / Lawatan'], ['food', '🍜', 'Makan'], ['meet', '🤝', 'Jumpa / Berkumpul'], ['shop', '🛍️', 'Membeli-belah'], ['pray', '🕌', 'Solat / Rehat'], ['other', '📌', 'Lain-lain']];
  const ITYPE_FIN = { flight: 'trans', trans: 'trans', hotel: 'inap', activity: 'tiket', food: 'makan', shop: 'beli' };
  const itype = k => ITYPES.find(t => t[0] === k) || ITYPES[ITYPES.length - 1];
  ui.itDay = 'all';
  function tripDays() {
    const out = [];
    if (S.trip.start && S.trip.end && S.trip.end >= S.trip.start) {
      for (let d = S.trip.start, i = 0; d <= S.trip.end && i < 60; d = addDays(d, 1), i++) out.push(d);
    }
    (S.itin || []).forEach(x => { if (x.d && !out.includes(x.d)) out.push(x.d); });
    return out.sort();
  }
  function dayNo(d) { return S.trip.start ? daysBetween(S.trip.start, d) + 1 : null; }
  const sortIt = arr => arr.slice().sort((a, b) => ((a.d || '') + (a.t1 || '99:99')).localeCompare((b.d || '') + (b.t1 || '99:99')));
  function nextItem() {
    const now = today() + ' ' + nowHM();
    return sortIt((S.itin || []).filter(x => !x.done && x.d)).find(x => (x.d + ' ' + (x.t2 || x.t1 || '23:59')) >= now);
  }
  function itCard(x, nxt) {
    const T = itype(x.type);
    const meta = [];
    if (x.ref) meta.push('🎫 ' + esc(x.ref));
    if (x.phone) meta.push('☎ <a href="tel:' + esc(x.phone.replace(/[^\d+]/g, '')) + '">' + esc(x.phone) + '</a>');
    if (x.cost) meta.push('💵 ' + (x.cur === 'MYR' ? RM(x.cost) : CNY(x.cost)) + (x.tx ? ' · ✓ direkod' : ''));
    if (x.priv) meta.push('🔒 Peribadi');
    else if (x.by && x.u && liveReady()) meta.push('✏️ ' + esc(x.by) + ' · ' + (new Date(x.u).toDateString() === new Date().toDateString() ? '' : fmtDs(ymd(new Date(x.u))) + ' ') + pad(new Date(x.u).getHours()) + ':' + pad(new Date(x.u).getMinutes()));
    return '<div class="iti' + (x.done ? ' done' : '') + (nxt ? ' next' : '') + '" data-itid="' + x.id + '">' + (nxt ? '<span class="nexttag">SETERUSNYA</span>' : '') +
      '<div class="tm">' + (x.t1 ? '<b class="num">' + esc(x.t1) + '</b>' : '<b class="muted">—</b>') + (x.t2 ? '<span class="num">hingga ' + esc(x.t2) + '</span>' : '') + '<span class="ic">' + T[1] + '</span></div>' +
      '<div class="grow">' +
      '<div class="ti">' + esc(x.title || T[2]) + (x.off ? ' <span class="badge ' + (x.mod ? 'b-P' : 'b-D') + '">' + (x.mod ? 'Rasmi · diubah' : '📢 Rasmi') + '</span>' : '') + '</div>' +
      (x.loc || x.locZh ? '<div class="lc">📍 ' + esc(x.loc || '') + (x.locZh ? ' <span class="zh">' + esc(x.locZh) + '</span>' : '') + '</div>' : '') +
      (x.detail ? '<div class="dt">' + esc(x.detail) + '</div>' : '') +
      (x.remark ? '<div class="rm">📝 ' + esc(x.remark) + '</div>' : '') +
      (meta.length ? '<div class="meta">' + meta.join('') + '</div>' : '') +
      '<div class="acts"><button class="btn" data-ia="done">' + (x.done ? '↺ Belum' : '✓ Selesai') + '</button>' +
      (x.locZh ? '<button class="btn" data-ia="taxi">🚕 Pemandu</button>' : '') +
      '<button class="btn" data-ia="edit">✎</button></div>' +
      '</div></div>';
  }
  function renderIt() {
    const v = $('#v-it');
    const items = S.itin || [];
    const days = tripDays();
    const t = today();
    const nx = nextItem();
    let h = annHTML() + liveBarHTML() + '<div class="card"><div class="row"><div class="grow"><div class="small muted" style="font-weight:700">ITINERARI TRIP</div>' +
      (S.trip.start ? '<div style="font-weight:800;font-size:17px">' + fmtDs(S.trip.start) + (S.trip.end ? ' – ' + fmtDs(S.trip.end) + ' ' + parseYmd(S.trip.end).getFullYear() : '') + '</div><div class="small muted">' + (S.trip.end ? (daysBetween(S.trip.start, S.trip.end) + 1) + ' hari · ' : '') + items.length + ' aktiviti · ' + items.filter(x => x.done).length + ' selesai</div>' : '<div class="small">Tetapkan tarikh trip supaya hari-hari dijana automatik.</div>') +
      '</div><button class="btn sm" data-ia="dates">🗓 Tarikh</button></div>' +
      (nx ? '<hr class="sep"><div class="small"><b class="out">▶ Seterusnya:</b> ' + esc(nx.title || itype(nx.type)[2]) + ' · ' + fmtDs(nx.d) + (nx.t1 ? ' ' + esc(nx.t1) : '') + (nx.locZh || nx.loc ? ' · 📍 ' + esc(nx.loc || nx.locZh) : '') + '</div>' : '') +
      '</div>';
    if (days.length) {
      h += '<div class="chips"><button class="chip' + (ui.itDay === 'all' ? ' on' : '') + '" data-itday="all">Semua</button>' +
        days.map(d => '<button class="chip' + (ui.itDay === d ? ' on' : '') + '" data-itday="' + d + '">' + (dayNo(d) ? 'Hari ' + dayNo(d) + ' · ' : '') + fmtDs(d) + (d === t ? ' •' : '') + '</button>').join('') + '</div>';
    }
    const show = ui.itDay === 'all' ? days : days.filter(d => d === ui.itDay);
    if (!days.length) {
      h += '<div class="empty">Belum ada itinerari.<br>Tekan <b>＋ Tambah</b> untuk mula, atau guna contoh di bawah.</div>';
    }
    show.forEach(d => {
      const list = sortIt(items.filter(x => x.d === d));
      let sun = '';
      try { const pt = prayerTimes(parseYmd(d), HARBIN.lat, HARBIN.lng, HARBIN.tz); sun = '🌅 ' + pt.Syuruk + ' · 🌇 ' + pt.Maghrib; } catch (e) {}
      const dn = dayNo(d);
      h += '<div class="dayh' + (d === t ? ' today' : '') + '"><span class="dn">' + (dn != null && dn >= 1 ? 'HARI ' + dn : (d === t ? 'HARI INI' : 'TARIKH')) + '</span><div class="grow"><div class="dd">' + fmtD(d) + (d === t ? ' · Hari ini' : '') + '</div><div class="sun">' + sun + ' (waktu Harbin)</div></div></div>' +
        list.map(x => itCard(x, nx && nx.id === x.id)).join('') +
        '<button class="addday" data-ia="add" data-d="' + d + '">＋ Tambah aktiviti ' + fmtDs(d) + '</button>';
    });
    const undated = items.filter(x => !x.d);
    if (undated.length && ui.itDay === 'all') h += '<div class="dayh"><span class="dn">TANPA TARIKH</span></div>' + undated.map(x => itCard(x)).join('');
    h += '<div class="card" style="margin-top:16px"><h3>Kongsi & alat</h3><div class="grid2"><button class="btn" data-ia="copy">📋 Salin (WhatsApp)</button><button class="btn" data-ia="csv">⬇ CSV</button></div>' +
      '<div style="height:8px"></div><button class="btn block" data-ia="sample">✨ Masukkan contoh itinerari Harbin</button>' +
      (items.length ? '<div style="height:8px"></div><button class="btn block ghost" data-ia="clear" style="color:var(--red)">🗑 Padam semua itinerari</button>' : '') + '</div>' +
      '<div style="height:64px"></div><button class="fab" data-ia="add">＋ Tambah</button>';
    v.innerHTML = h;
  }
  function itSheet(x, presetDate) {
    const isNew = !x;
    const st = x ? Object.assign({}, x) : { id: '', d: presetDate || (ui.itDay !== 'all' ? ui.itDay : (S.trip.start && today() < S.trip.start ? S.trip.start : today())), t1: '', t2: '', type: 'activity', title: '', loc: '', locZh: '', detail: '', remark: '', ref: '', phone: '', cost: '', cur: 'CNY', done: false };
    sheet('<h2>' + (isNew ? '＋ Aktiviti baharu' : '✎ Ubah aktiviti') + '</h2>' +
      '<div class="grid3"><label class="field"><span>Tarikh</span><input class="input" type="date" id="i-d" value="' + esc(st.d) + '" style="padding:10px 6px"></label>' +
      '<label class="field"><span>Masa mula</span><input class="input" type="time" id="i-t1" value="' + esc(st.t1) + '" style="padding:10px 6px"></label>' +
      '<label class="field"><span>Masa tamat</span><input class="input" type="time" id="i-t2" value="' + esc(st.t2) + '" style="padding:10px 6px"></label></div>' +
      '<div class="field"><span>Jenis</span><div class="chips wrap" id="i-type">' + ITYPES.map(t => '<button class="chip' + (st.type === t[0] ? ' on' : '') + '" data-k="' + t[0] + '">' + t[1] + ' ' + t[2] + '</button>').join('') + '</div></div>' +
      '<label class="field"><span>Tajuk *</span><input class="input" id="i-title" value="' + esc(st.title) + '" placeholder="Contoh: Ice & Snow World (malam)"></label>' +
      '<label class="field"><span>Lokasi</span><input class="input" id="i-loc" value="' + esc(st.loc) + '" placeholder="Contoh: Harbin Ice and Snow World"></label>' +
      '<label class="field"><span>Nama / alamat lokasi dalam tulisan Cina (untuk pemandu)</span><input class="input zh" id="i-locZh" value="' + esc(st.locZh) + '" placeholder="Contoh: 哈尔滨冰雪大世界"></label>' +
      '<label class="field"><span>…atau pilih tempat popular</span><select class="input" id="i-place"><option value="">— Pilih —</option>' + (window.PLACES || []).map((p, i) => '<option value="' + i + '">' + esc(p[2]) + ' · ' + esc(p[0]) + '</option>').join('') + (S.hotel && S.hotel.nameZh ? '<option value="hotel">🏨 Hotel saya · ' + esc(S.hotel.nameZh) + '</option>' : '') + '</select></label>' +
      '<label class="field"><span>Butiran</span><textarea class="input" id="i-detail" rows="3" placeholder="Apa nak buat, tiket, pakaian, dll.">' + esc(st.detail) + '</textarea></label>' +
      '<label class="field"><span>Remark / tempat jumpa</span><textarea class="input" id="i-remark" rows="2" placeholder="Contoh: Jumpa di lobi hotel 8:30 pagi. Bawa pasport.">' + esc(st.remark) + '</textarea></label>' +
      '<div class="grid2"><label class="field"><span>No. tempahan / rujukan</span><input class="input" id="i-ref" value="' + esc(st.ref) + '"></label>' +
      '<label class="field"><span>No. telefon</span><input class="input" id="i-phone" inputmode="tel" value="' + esc(st.phone) + '"></label></div>' +
      '<label class="field"><span>Anggaran kos</span><div class="row"><input class="input num grow" id="i-cost" inputmode="decimal" value="' + esc(st.cost) + '" placeholder="0.00">' +
      '<div class="seg" id="i-cur" style="margin:0;flex:none">' + [['CNY', '¥'], ['MYR', 'RM']].map(c => '<button data-cur="' + c[0] + '" class="' + (st.cur === c[0] ? 'on' : '') + '">' + c[1] + '</button>').join('') + '</div></div></label>' +
      (!isNew && +st.cost > 0 && !st.tx ? '<button class="btn block" id="i-rec" style="margin-bottom:10px">💰 Rekod kos ini ke Kewangan</button>' : '') +
      (st.off ? '<div class="note info small">📢 Aktiviti rasmi daripada penganjur. Jika anda ubah, versi anda dikekalkan walaupun penganjur kemas kini.' + (st.mod ? '</div><button class="btn block" id="i-revert" style="margin-bottom:10px">↺ Kembali ke versi penganjur</button>' : '</div>') : '') +
      (liveReady() ? '<label class="row small" style="margin:0 0 12px"><input type="checkbox" id="i-priv" ' + (st.priv ? 'checked' : '') + ' style="width:20px;height:20px"> 🔒 Peribadi — jangan kongsi aktiviti ini dengan kumpulan</label>' : '') +
      '<div class="row"><button class="btn pri grow" id="i-save">Simpan</button>' + (!isNew ? '<button class="btn" id="i-dup" title="Salin">⧉</button><button class="btn red" id="i-del">Padam</button>' : '') + '</div>',
      sh => {
        sh.addEventListener('click', ev => {
          const k = ev.target.closest('#i-type [data-k]');
          if (k) { st.type = k.dataset.k; $$('#i-type .chip', sh).forEach(c => c.classList.toggle('on', c === k)); }
          const c = ev.target.closest('#i-cur [data-cur]');
          if (c) { st.cur = c.dataset.cur; $$('#i-cur button', sh).forEach(b => b.classList.toggle('on', b === c)); }
        });
        $('#i-place', sh).addEventListener('change', e => {
          const val = e.target.value; if (!val) return;
          if (val === 'hotel') { $('#i-loc', sh).value = S.hotel.nameEn || 'Hotel'; $('#i-locZh', sh).value = S.hotel.nameZh + (S.hotel.addr ? '（' + S.hotel.addr + '）' : ''); if (!$('#i-phone', sh).value) $('#i-phone', sh).value = S.hotel.phone || ''; }
          else { const p = PLACES[+val]; $('#i-loc', sh).value = p[2]; $('#i-locZh', sh).value = p[0]; if (!$('#i-title', sh).value) $('#i-title', sh).value = p[2]; }
        });
        const grab = () => Object.assign(st, {
          d: $('#i-d', sh).value, t1: $('#i-t1', sh).value, t2: $('#i-t2', sh).value,
          title: $('#i-title', sh).value.trim(), loc: $('#i-loc', sh).value.trim(), locZh: $('#i-locZh', sh).value.trim(),
          detail: $('#i-detail', sh).value.trim(), remark: $('#i-remark', sh).value.trim(), ref: $('#i-ref', sh).value.trim(), phone: $('#i-phone', sh).value.trim(),
          cost: $('#i-cost', sh).value.trim() ? num($('#i-cost', sh).value) : ''
        });
        const commit = () => {
          grab();
          if (!st.title && !st.loc) { toast('Isi tajuk aktiviti'); return false; }
          if (!st.id) st.id = uid();
          if (st.off) st.mod = true;
          const pv = $('#i-priv', sh);
          if (pv) { if (pv.checked && !st.priv) itGone(st); st.priv = pv.checked; }
          if (st.tx) { const tx = S.tx.find(t => t.id === st.tx); if (tx) { tx.amt = +st.cost || tx.amt; tx.cur = st.cur; tx.d = st.d || tx.d; tx.note = st.title || tx.note; } }
          const saved = Object.assign({}, st);
          itTouch(saved);
          S.itin = (S.itin || []).filter(i => i.id !== st.id).concat([saved]);
          if (st.d && ui.itDay !== 'all' && ui.itDay !== st.d) ui.itDay = st.d;
          save(); liveFlush(); return true;
        };
        $('#i-save', sh).onclick = () => { if (commit()) { closeSheet(); renderIt(); toast(isNew ? 'Aktiviti ditambah' : 'Dikemas kini'); } };
        if ($('#i-rec', sh)) $('#i-rec', sh).onclick = () => {
          if (!commit()) return;
          const txid = uid();
          S.tx.push({ id: txid, t: 'out', d: st.d || today(), tm: st.t1 || nowHM(), amt: +st.cost, cur: st.cur, cat: ITYPE_FIN[st.type] || 'lain', m: 'Tunai', note: st.title || st.loc, rate: S.rate, itin: st.id });
          S.itin.find(i => i.id === st.id).tx = txid;
          save(); closeSheet(); renderIt(); toast('Direkod dalam Kewangan (cara bayar: Tunai — boleh ubah di tab Kewangan)');
        };
        if ($('#i-revert', sh)) $('#i-revert', sh).onclick = () => {
          const orig = ((S.shared && S.shared.itin) || []).find(i => i.id === st.id);
          const cur = S.itin.find(i => i.id === st.id) || {};
          S.itin = S.itin.filter(i => i.id !== st.id);
          if (orig) { const o2 = Object.assign({}, orig, { off: true, mod: false, done: !!cur.done, tx: cur.tx }); itTouch(o2); S.itin.push(o2); liveFlush(); }
          save(); closeSheet(); renderIt(); toast('Dikembalikan ke versi penganjur');
        };
        if ($('#i-dup', sh)) $('#i-dup', sh).onclick = () => {
          grab();
          const cp = Object.assign({}, st, { id: uid(), done: false, tx: undefined, off: false, mod: false, title: st.title + ' (salinan)' });
          itTouch(cp); S.itin.push(cp); save(); liveFlush(); closeSheet(); renderIt(); itSheet(cp);
        };
        if ($('#i-del', sh)) $('#i-del', sh).onclick = async () => {
          if (!(await ask('Padam aktiviti ini?', 'Padam', true))) return;
          const old = S.itin.find(i => i.id === st.id);
          S.itin = S.itin.filter(i => i.id !== st.id);
          if (old && old.off) S.itinHidden = (S.itinHidden || []).concat([old.id]);
          itGone(old);
          save(); liveFlush(); closeSheet(); renderIt();
          toast('Aktiviti dipadam', 'Batal', () => { itTouch(old); S.itin.push(old); S.itinHidden = (S.itinHidden || []).filter(i => i !== old.id); save(); liveFlush(); renderIt(); });
        };
      });
  }
  function itDatesSheet() {
    sheet('<h2>🗓 Tarikh trip</h2><div class="grid2"><label class="field"><span>Pergi</span><input class="input" type="date" id="td-s" value="' + esc(S.trip.start) + '"></label><label class="field"><span>Balik</span><input class="input" type="date" id="td-e" value="' + esc(S.trip.end) + '"></label></div>' +
      '<p class="small muted">Hari-hari antara tarikh ini dijana automatik dalam itinerari. Tarikh yang sama digunakan untuk kiraan detik di atas.</p><button class="btn pri block" id="td-save">Simpan</button>', sh => {
        $('#td-save', sh).onclick = () => {
          const a = $('#td-s', sh).value, b = $('#td-e', sh).value;
          if (a && b && b < a) { toast('Tarikh balik mesti selepas tarikh pergi'); return; }
          S.trip.start = a; S.trip.end = b; save(); closeSheet(); updateHeader(); renderIt();
        };
      });
  }
  function itText() {
    let s = '🗓️ ITINERARI HARBIN' + (S.trip.start ? ' (' + fmtDs(S.trip.start) + (S.trip.end ? ' – ' + fmtDs(S.trip.end) : '') + ')' : '') + '\n';
    tripDays().forEach(d => {
      const list = sortIt((S.itin || []).filter(x => x.d === d));
      const dn = dayNo(d);
      s += '\n*' + (dn ? 'Hari ' + dn + ' — ' : '') + fmtD(d) + '*\n';
      if (!list.length) s += '  (bebas)\n';
      list.forEach(x => {
        s += '• ' + (x.t1 ? x.t1 + (x.t2 ? '–' + x.t2 : '') + ' ' : '') + itype(x.type)[1] + ' ' + (x.title || itype(x.type)[2]) + '\n';
        if (x.loc || x.locZh) s += '   📍 ' + [x.loc, x.locZh].filter(Boolean).join(' / ') + '\n';
        if (x.detail) s += '   ' + x.detail.replace(/\n/g, '\n   ') + '\n';
        if (x.remark) s += '   📝 ' + x.remark.replace(/\n/g, '\n   ') + '\n';
        if (x.ref) s += '   🎫 ' + x.ref + '\n';
      });
    });
    return s;
  }
  function itCsv() {
    const rows = [['Hari', 'Tarikh', 'Mula', 'Tamat', 'Jenis', 'Tajuk', 'Lokasi', 'Lokasi (中文)', 'Butiran', 'Remark', 'No. tempahan', 'Telefon', 'Kos', 'Mata wang', 'Selesai']];
    sortIt(S.itin || []).forEach(x => rows.push([dayNo(x.d) || '', x.d || '', x.t1 || '', x.t2 || '', itype(x.type)[2], x.title || '', x.loc || '', x.locZh || '', x.detail || '', x.remark || '', x.ref || '', x.phone || '', x.cost || '', x.cost ? x.cur : '', x.done ? 'Ya' : '']));
    return '﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }
  function sampleItin() {
    if (!S.trip.start) { toast('Tetapkan tarikh trip dahulu'); itDatesSheet(); return; }
    const D = n => addDays(S.trip.start, n);
    const last = S.trip.end || D(5);
    const nDays = daysBetween(S.trip.start, last) + 1;
    const mk = (d, t1, t2, type, title, loc, locZh, detail, remark) => ({ id: uid(), d, t1, t2, type, title, loc, locZh, detail: detail || '', remark: remark || '', ref: '', phone: '', cost: '', cur: 'CNY', done: false });
    const L = [
      mk(D(0), '', '', 'flight', 'Tiba di Harbin', 'Harbin Taiping International Airport', '哈尔滨太平国际机场', 'Ambil bagasi, aktifkan roaming/eSIM, pakai jaket sebelum keluar terminal.', 'Isi waktu & no. penerbangan.'),
      mk(D(0), '', '', 'hotel', 'Daftar masuk hotel', S.hotel.nameEn || 'Hotel', S.hotel.nameZh || '', 'Simpan bagasi, rehat.', ''),
      mk(D(0), '17:00', '20:00', 'activity', 'Jalan-jalan Central Street & St. Sophia (malam)', 'Central Street', '中央大街', 'Lampu menyala sekitar 4 petang. Cuba aiskrim Madieer.', ''),
      mk(D(1), '10:00', '12:00', 'activity', 'Songhua River Ice & Snow Carnival', 'Songhua River', '松花江冰雪嘉年华', 'Kereta luncur, gelongsor ais.', 'Pakai ice cleats.'),
      mk(D(1), '15:00', '21:00', 'activity', 'Harbin Ice & Snow World', 'Harbin Ice and Snow World', '哈尔滨冰雪大世界', 'Masuk sebelum matahari terbenam untuk lihat siang & malam.', 'Semak tarikh buka. Bawa powerbank & heat pack.'),
      mk(D(2), '09:30', '12:30', 'activity', 'Sun Island Snow Sculpture Expo', 'Sun Island', '太阳岛风景区', '', ''),
      mk(D(2), '14:00', '16:00', 'activity', 'Siberian Tiger Park', 'Siberian Tiger Park', '东北虎林园', '', ''),
      mk(D(3), '11:30', '13:30', 'pray', 'Masjid Daowai & makan halal', 'Harbin Daowai Mosque', '哈尔滨道外清真寺', 'Makan tengah hari di restoran halal sekitar.', ''),
      mk(D(3), '14:00', '17:00', 'activity', 'Old Daowai (Chinese Baroque)', 'Old Daowai', '老道外', '', '')
    ];
    if (nDays > 5) L.push(mk(D(4), '07:00', '19:00', 'activity', 'Lawatan sehari: Yabuli / Snow Town (pilihan)', 'Yabuli Ski Resort', '亚布力滑雪旅游度假区', 'Biasanya ikut pakej tour.', 'Tempat jumpa: ikut pakej.'));
    L.push(mk(last, '', '', 'flight', 'Berlepas pulang', 'Harbin Taiping International Airport', '哈尔滨太平国际机场', 'Tiba di airport 3 jam awal.', 'Powerbank dalam beg kabin.'));
    const add = L.filter(x => x.d <= last); add.forEach(itTouch);
    S.itin = (S.itin || []).concat(add); liveFlush();
    save(); renderIt(); toast('Contoh dimasukkan — ubah atau padam ikut pelan anda');
  }
  $('#v-it').addEventListener('click', e => {
    const dc = e.target.closest('[data-itday]');
    if (dc) { ui.itDay = dc.dataset.itday; renderIt(); return; }
    const b = e.target.closest('[data-ia]');
    if (!b) {
      const card = e.target.closest('[data-itid]');
      if (card && !e.target.closest('a')) { const x = S.itin.find(i => i.id === card.dataset.itid); if (x) itSheet(x); }
      return;
    }
    const a = b.dataset.ia;
    if (a === 'add') { itSheet(null, b.dataset.d); return; }
    if (a === 'dates') { itDatesSheet(); return; }
    if (a === 'livejoin') { liveJoinSheet(); return; }
    if (a === 'copy') { copyText(itText()); return; }
    if (a === 'csv') { download('itinerari-harbin.csv', itCsv(), 'text/csv;charset=utf-8'); return; }
    if (a === 'sample') { if ((S.itin || []).length) ask('Tambah contoh itinerari kepada senarai sedia ada?', 'Tambah').then(ok => ok && sampleItin()); else sampleItin(); return; }
    if (a === 'clear') { ask('Padam SEMUA aktiviti itinerari?', 'Padam semua', true).then(ok => { if (ok) { S.itinHidden = (S.itinHidden || []).concat(S.itin.filter(x => x.off).map(x => x.id)); S.itin.forEach(itGone); S.itin = []; save(); liveFlush(); renderIt(); } }); return; }
    const card = b.closest('[data-itid]');
    const x = card && S.itin.find(i => i.id === card.dataset.itid);
    if (!x) return;
    if (a === 'edit') itSheet(x);
    else if (a === 'done') { x.done = !x.done; save(); renderIt(); }
    else if (a === 'taxi') showCard({ lead: '师傅，请带我去：', zh: x.locZh, py: '', ms: 'Tolong bawa saya ke: ' + (x.loc || x.title), en: 'Please take me to: ' + (x.loc || x.title), say: '师傅，请带我去' + x.locZh });
  });

  // =====================================================================
  // 6) ADMIN & PENGGUNA — kandungan utama dikongsi melalui data/shared.json
  // =====================================================================
  const TOKEN_KEY = 'harbin-admin-gh-token';
  const onWeb = () => /^https?:/.test(location.protocol) && !window.HARBIN_SINGLE;
  function siteBase() { return new URL('./', location.href).href; }
  function guessRepo() {
    // https://OWNER.github.io/REPO/... → OWNER/REPO dan laluan fail dalam repo
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const parts = location.pathname.split('/').filter(Boolean);
    if (m) {
      const owner = m[1];
      const isUserSite = !parts.length || /\.html?$/.test(parts[0]);
      const repo = isUserSite ? owner + '.github.io' : parts[0];
      const dirParts = (isUserSite ? parts : parts.slice(1)).filter(p => !/\.html?$/.test(p));
      return { repo: owner + '/' + repo, path: (dirParts.length ? dirParts.join('/') + '/' : '') + 'data/shared.json' };
    }
    return { repo: '', path: 'data/shared.json' };
  }
  function pubCfg() {
    const g = guessRepo();
    if (!S.pub || typeof S.pub !== 'object') S.pub = {};
    const d = { repo: g.repo, branch: 'main', path: g.path, inc: { trip: true, itin: true, phr: true, ck: true }, lastV: 0, lastAt: '' };
    Object.keys(d).forEach(k => { if (S.pub[k] === undefined || (k === 'repo' && !S.pub.repo)) S.pub[k] = d[k]; });
    return S.pub;
  }
  function stripIt(x) { const o = {}; ['id', 'd', 't1', 't2', 'type', 'title', 'loc', 'locZh', 'detail', 'remark', 'ref', 'phone', 'cost', 'cur'].forEach(k => { if (x[k] !== undefined && x[k] !== '') o[k] = x[k]; }); return o; }
  function buildShared() {
    const c = pubCfg(), inc = c.inc;
    const o = {};
    Object.keys(S.check || {}).forEach(id => { const st = S.check[id]; const x = {}; ['n', 'nt', 'q', 'p', 'pr'].forEach(k => { if (st[k] != null) x[k] = st[k]; }); if (Object.keys(x).length) o[id] = x; });
    return {
      v: Date.now(), at: new Date().toISOString(), app: 'Arztech Harbin Trip',
      announce: (S.announce || '').trim(),
      trip: inc.trip ? Object.assign({}, S.trip) : null,
      hotel: inc.trip ? Object.assign({}, S.hotel) : null,
      itin: inc.itin && !liveReady() ? sortIt((S.itin || []).filter(x => !x.priv)).map(stripIt) : null,
      live: liveCfg().db ? { db: liveCfg().db } : null,
      phrases: inc.phr ? (S.mine || []).map(m => ({ ms: m.ms, en: m.en, zh: m.zh, py: m.py })) : [],
      ck: inc.ck ? { o, c: (S.custom || []).map(x => ({ id: x.id, cat: x.cat, name: x.name, note: x.note, qty: x.qty, price: x.price, pri: x.pri })) } : null
    };
  }
  const b64 = str => btoa(unescape(encodeURIComponent(str)));
  async function publishGH(json) {
    const c = pubCfg();
    const token = (() => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } })();
    if (!token) throw new Error('Token GitHub belum diisi (Tetapan GitHub di bawah).');
    if (!/^[^/\s]+\/[^/\s]+$/.test(c.repo)) throw new Error('Nama repo tidak sah. Format: pemilik/repo');
    const api = 'https://api.github.com/repos/' + c.repo + '/contents/' + c.path.split('/').map(encodeURIComponent).join('/');
    const H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    let sha;
    const g = await fetch(api + '?ref=' + encodeURIComponent(c.branch) + '&t=' + Date.now(), { headers: H, cache: 'no-store' });
    if (g.ok) sha = (await g.json()).sha;
    else if (g.status !== 404) throw new Error('GitHub ' + g.status + (g.status === 401 ? ' — token tidak sah / tamat tempoh' : g.status === 403 ? ' — token tiada kebenaran Contents: write' : ''));
    const body = { message: 'Kemas kini kandungan Arztech Harbin Trip ' + new Date(json.v).toISOString(), content: b64(JSON.stringify(json, null, 1)), branch: c.branch };
    if (sha) body.sha = sha;
    const p = await fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify(body) });
    if (!p.ok) { const t = await p.json().catch(() => ({})); throw new Error('GitHub ' + p.status + ': ' + (t.message || 'gagal')); }
    c.lastV = json.v; c.lastAt = json.at; save();
  }
  // ---- Pengguna: terima kandungan ----
  function applyShared(d) {
    S.shared = d; S.sharedV = d.v;
    if (d.trip && d.trip.start) S.trip = Object.assign({}, S.trip, d.trip);
    if (d.hotel && (d.hotel.nameZh || d.hotel.addr || d.hotel.nameEn)) S.hotel = Object.assign({}, d.hotel);
    if (Array.isArray(d.itin) && !liveReady()) {
      const prev = {};
      (S.itin || []).filter(x => x.off).forEach(x => { prev[x.id] = x; });
      const hidden = new Set(S.itinHidden || []);
      const keep = (S.itin || []).filter(x => !x.off || x.mod);
      const modIds = new Set(keep.filter(x => x.off).map(x => x.id));
      const offs = d.itin.filter(x => !modIds.has(x.id) && !hidden.has(x.id)).map(x => Object.assign({}, x, { off: true, mod: false, done: prev[x.id] ? !!prev[x.id].done : false, tx: prev[x.id] ? prev[x.id].tx : undefined }));
      S.itin = keep.concat(offs);
    }
  }
  let lastSync = 0;
  async function syncShared(manual) {
    if (!onWeb()) { if (manual) toast('Kemas kini hanya tersedia bila app dibuka dari laman web'); return; }
    if (!manual && Date.now() - lastSync < 60000) return;
    lastSync = Date.now();
    try {
      const r = await fetch('data/shared.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      ui.remote = d;
      if (ROLE === 'admin') { if (S.tab === 'in') renderIn(); return; }
      if (!d || !d.v) { if (manual) toast('Belum ada kandungan daripada penganjur'); return; }
      if (d.v <= (S.sharedV || 0)) { if (manual) toast('✓ Sudah versi terkini'); return; }
      applyShared(d); save(); renderAll(); if (liveReady() && !LV.es) liveStart();
      toast('📢 Kemas kini daripada penganjur diterima');
    } catch (e) { if (manual) toast(navigator.onLine ? 'Gagal semak kemas kini' : 'Tiada internet — guna versi tersimpan'); }
  }
  function orgPhrases() {
    const P = (S.shared && S.shared.phrases) || [];
    return P.filter(p => p && p.zh).map(p => ({ id: 'o:' + p.zh, cat: 'org', ms: p.ms || '', en: p.en || '', zh: p.zh, py: p.py || '', hay: norm((p.ms || '') + ' ' + (p.en || '') + ' ' + (p.py || '')) + ' ' + p.zh }));
  }
  function annHTML() {
    const a = ROLE === 'admin' ? (S.announce || '').trim() : ((S.shared && S.shared.announce) || '').trim();
    return a ? '<div class="note ann"><b>📢 Pengumuman' + (ROLE === 'admin' ? ' (pratonton — diterbitkan kepada pengguna)' : ' daripada penganjur') + '</b><br>' + esc(a).replace(/\n/g, '<br>') + '</div>' : '';
  }
  function qrSVG(text) {
    try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { return ''; }
  }
  function shareCardHTML() {
    if (!onWeb()) return '';
    const userUrl = siteBase();
    const adminUrl = siteBase() + 'admin.html';
    let h = '<div class="card"><h3>🔗 Kongsi app</h3><p class="small muted" style="margin-top:0">Hantar link ini kepada rakan trip. Mereka buka, tekan <b>Add to Home Screen</b>, dan app boleh guna tanpa internet.</p>' +
      '<div class="qr">' + qrSVG(userUrl) + '</div>' +
      '<div class="linkbox"><span class="grow">' + esc(userUrl) + '</span><button class="btn sm" data-copy="' + esc(userUrl) + '">Salin</button></div>' +
      (navigator.share ? '<button class="btn block" data-a="sharelink" style="margin-top:8px">📤 Kongsi (WhatsApp, dll.)</button>' : '');
    if (ROLE === 'admin') h += '<hr class="sep"><div class="small"><b>🔒 Link admin (untuk anda sahaja — jangan kongsi):</b></div><div class="linkbox"><span class="grow">' + esc(adminUrl) + '</span><button class="btn sm" data-copy="' + esc(adminUrl) + '">Salin</button></div>';
    return h + '</div>';
  }
  function adminPanelHTML() {
    const c = pubCfg();
    const has = (() => { try { return !!localStorage.getItem(TOKEN_KEY); } catch (e) { return false; } })();
    const R = ui.remote;
    return '<div class="card adminc"><h3>🛠 Panel Admin — kandungan utama</h3>' +
      '<p class="small" style="margin-top:0">Ubah itinerari, tarikh trip, kad hotel, ✍️ Frasa Saya dan harga/item checklist seperti biasa dalam app ini, kemudian tekan <b>Terbitkan</b>. Semua pengguna menerimanya bila app mereka online. <b>Kewangan dan tanda checklist anda kekal peribadi.</b></p>' +
      '<label class="field"><span>📢 Pengumuman kepada pengguna (pilihan)</span><textarea class="input" id="ad-ann" rows="3" placeholder="Contoh: Semua berkumpul di lobi hotel 8:00 pagi esok. Pakai baju tebal!">' + esc(S.announce || '') + '</textarea></label>' +
      '<div class="field"><span>Kandungan yang diterbitkan</span>' +
      [['trip', 'Tarikh trip & kad hotel'], ['itin', 'Itinerari (' + (S.itin || []).length + ' aktiviti)'], ['phr', '✍️ Frasa Saya → Frasa penganjur (' + (S.mine || []).length + ')'], ['ck', 'Harga & item checklist yang diubah']].map(x =>
        '<label class="row small" style="margin:6px 0"><input type="checkbox" data-inc="' + x[0] + '" ' + (c.inc[x[0]] ? 'checked' : '') + ' style="width:20px;height:20px"> ' + esc(x[1]) + '</label>').join('') + '</div>' +
      '<button class="btn pri block" data-a="publish">🚀 Terbitkan kepada semua pengguna</button>' +
      '<div class="small muted" style="margin-top:8px">' + (c.lastAt ? 'Terakhir diterbitkan: ' + new Date(c.lastAt).toLocaleString('ms-MY') : 'Belum pernah diterbitkan.') +
      (R && R.v ? '<br>Versi di laman sekarang: ' + new Date(R.at || R.v).toLocaleString('ms-MY') + (c.lastV && R.v < c.lastV ? ' <span class="out">(laman sedang dikemas kini — tunggu 1–2 minit)</span>' : '') : '') + '</div>' +
      '<div style="height:8px"></div><button class="btn block" data-a="pubfile">⬇ Muat turun shared.json (cara manual)</button>' +
      '<details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700">⚙ Tetapan GitHub ' + (has ? '✓' : '(perlu diisi sekali)') + '</summary>' +
      '<label class="field" style="margin-top:10px"><span>Repo (pemilik/nama)</span><input class="input" id="gh-repo" value="' + esc(c.repo) + '" placeholder="pemilik/harbintrip"></label>' +
      '<div class="grid2"><label class="field"><span>Branch</span><input class="input" id="gh-branch" value="' + esc(c.branch) + '"></label><label class="field"><span>Fail</span><input class="input" id="gh-path" value="' + esc(c.path) + '"></label></div>' +
      '<label class="field"><span>Token GitHub (disimpan dalam telefon ini sahaja)</span><input class="input" id="gh-token" type="password" autocomplete="off" placeholder="' + (has ? '•••••••• (sudah disimpan)' : 'github_pat_…') + '"></label>' +
      '<div class="grid2"><button class="btn pri" data-a="ghsave">Simpan</button><button class="btn" data-a="ghclear">Buang token</button></div>' +
      '<ol class="list-plain small" style="margin-top:10px"><li>GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> → Generate new token.</li><li>Repository access: <b>Only select repositories</b> → pilih repo app.</li><li>Permissions → Repository → <b>Contents: Read and write</b>.</li><li>Salin token & tampal di atas.</li></ol></details>' +
      '</div>';
  }
  function userSyncHTML() {
    if (ROLE === 'admin') return '';
    const d = S.shared;
    return '<div class="card"><h3>📢 Kandungan daripada penganjur</h3>' +
      (d && d.v ? '<p class="small" style="margin-top:0">Versi diterima: <b>' + new Date(d.at || d.v).toLocaleString('ms-MY') + '</b><br>Itinerari rasmi, tarikh trip, kad hotel, frasa & harga dikemas kini automatik bila online. Perubahan anda sendiri pada aktiviti rasmi dikekalkan.</p>' : '<p class="small muted" style="margin-top:0">Belum ada kandungan daripada penganjur.</p>') +
      '<button class="btn block" data-a="syncnow">🔄 Semak kemas kini sekarang</button></div>';
  }
  async function adminClick(a) {
    const c = pubCfg();
    if (a === 'ghsave') {
      c.repo = $('#gh-repo').value.trim(); c.branch = $('#gh-branch').value.trim() || 'main'; c.path = $('#gh-path').value.trim() || 'data/shared.json';
      const t = $('#gh-token').value.trim();
      if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
      save(); renderIn(); toast('Tetapan GitHub disimpan');
    } else if (a === 'ghclear') {
      if (!(await ask('Buang token GitHub dari telefon ini?', 'Buang', true))) return;
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} renderIn();
    } else if (a === 'publish' || a === 'pubfile') {
      S.announce = $('#ad-ann').value; save();
      const json = buildShared();
      if (a === 'pubfile') { download('shared.json', JSON.stringify(json, null, 1), 'application/json'); return; }
      if (!navigator.onLine) { toast('Perlukan internet untuk terbitkan'); return; }
      if (!(await ask('Terbitkan kandungan ini kepada SEMUA pengguna?\n\n' + (json.itin ? json.itin.length + ' aktiviti itinerari\n' : '') + (json.phrases.length ? json.phrases.length + ' frasa\n' : '') + (json.announce ? 'Pengumuman: “' + json.announce.slice(0, 80) + '”' : ''), '🚀 Terbitkan'))) return;
      const btn = $('[data-a="publish"]'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Menerbitkan…'; }
      try { await publishGH(json); toast('✅ Diterbitkan! Pengguna akan terima dalam 1–2 minit bila online'); }
      catch (e) { toast('❌ ' + (e.message || 'Gagal').slice(0, 140)); }
      renderIn();
    }
  }

  // =====================================================================
  // 7) ITINERARI BERSAMA (LIVE) — Firebase Realtime Database melalui REST + SSE
  //    Sesiapa dalam kumpulan ubah → semua telefon yang online dapat serta-merta.
  //    Offline: perubahan disimpan dalam baris gilir & dihantar bila online.
  // =====================================================================
  // Ciri ditangguhkan: tukar kepada true untuk hidupkan semula itinerari bersama (Firebase)
  const LIVE_FEATURE = true;
  const LV = { es: null, status: 'off', retry: null, lastWho: '', flushing: false };
  const LIVE_FIELDS = ['id', 'd', 't1', 't2', 'type', 'title', 'loc', 'locZh', 'detail', 'remark', 'ref', 'phone', 'cost', 'cur', 'u', 'by'];
  function liveCfg() { if (!S.live || typeof S.live !== 'object') S.live = {}; const d = { db: '', code: '', on: false }; Object.keys(d).forEach(k => { if (S.live[k] === undefined) S.live[k] = d[k]; }); return S.live; }
  function liveDb() { const c = liveCfg(); return c.db || (S.shared && S.shared.live && S.shared.live.db) || ''; }
  function liveReady() { const c = liveCfg(); return !!(LIVE_FEATURE && c.on && c.code && liveDb() && onWeb()); }
  function normDb(u) { u = String(u || '').trim().replace(/\/+$/, ''); if (u && !/^https?:\/\//.test(u)) u = 'https://' + u; return u; }
  function normCode(c) { return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''); }
  function liveBase() { return normDb(liveDb()) + '/g/' + encodeURIComponent(liveCfg().code); }
  function liveItem(x) { const o = {}; LIVE_FIELDS.forEach(k => { if (x[k] !== undefined && x[k] !== '') o[k] = x[k]; }); return o; }
  function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'HRB-'; const r = crypto.getRandomValues(new Uint8Array(8)); r.forEach(n => { s += A[n % A.length]; }); return s; }
  function setLive(st) { LV.status = st; const el = $('#liveBar'); if (el) el.outerHTML = liveBarHTML(); }
  function liveBarHTML() {
    if (!onWeb() || !LIVE_FEATURE) return '<div id="liveBar"></div>';
    const q = (S.liveQ || []).length;
    if (!liveReady()) return '<div id="liveBar" class="livebar off"><span class="grow">🔄 <b>Itinerari bersama</b> belum diaktifkan</span><button class="btn sm" data-ia="livejoin">Sertai</button></div>';
    const st = !navigator.onLine ? ['wait', '⚪ Offline — ' + (q ? q + ' perubahan akan dihantar bila online' : 'guna salinan tersimpan')]
      : LV.status === 'on' ? ['on', '🟢 Live — dikemas kini automatik untuk semua' + (q ? ' · menghantar ' + q + '…' : '')]
      : LV.status === 'error' ? ['err', '🟠 Gagal sambung — cuba semula sebentar lagi']
      : ['wait', '🟡 Menyambung…'];
    return '<div id="liveBar" class="livebar ' + st[0] + '"><span class="grow">' + st[1] + '</span><span class="small muted">' + esc(liveCfg().code) + '</span></div>';
  }
  // Tandakan perubahan tempatan supaya dihantar kepada semua
  function itTouch(x) {
    if (!x || x.priv) return;
    x.u = Date.now(); x.by = S.myName || (ROLE === 'admin' ? 'Admin' : 'Pengguna');
    if (!liveReady()) return;
    S.liveQ = (S.liveQ || []).filter(i => i !== x.id).concat([x.id]);
  }
  function itGone(x) {
    if (!x || x.priv || !liveReady()) return;
    S.liveDel = S.liveDel || {};
    S.liveDel[x.id] = { id: x.id, del: true, u: Date.now(), by: S.myName || '' };
    S.liveQ = (S.liveQ || []).filter(i => i !== x.id).concat([x.id]);
  }
  async function liveFlush() {
    if (!liveReady() || !navigator.onLine || LV.flushing || !(S.liveQ || []).length) return;
    LV.flushing = true;
    try {
      for (const id of (S.liveQ || []).slice()) {
        const x = (S.itin || []).find(i => i.id === id);
        const body = x ? (x.priv ? null : liveItem(x)) : ((S.liveDel || {})[id] || null);
        if (body) {
          const r = await fetch(liveBase() + '/items/' + encodeURIComponent(id) + '.json', { method: 'PUT', body: JSON.stringify(body) });
          if (!r.ok) throw new Error('HTTP ' + r.status);
        }
        S.liveQ = (S.liveQ || []).filter(i => i !== id);
        if (S.liveDel) delete S.liveDel[id];
        save();
      }
    } catch (e) { setLive('error'); setTimeout(liveFlush, 15000); }
    LV.flushing = false;
    const el = $('#liveBar'); if (el) el.outerHTML = liveBarHTML();
  }
  function liveMerge(map, full) {
    let changed = 0, who = '';
    const pend = new Set(S.liveQ || []);
    Object.keys(map || {}).forEach(id => {
      const r = map[id];
      const i = (S.itin || []).findIndex(x => x.id === id);
      const l = i >= 0 ? S.itin[i] : null;
      if (l && l.priv) return;
      if (pend.has(id)) return; // perubahan tempatan belum dihantar menang dahulu
      if (!r || r.del) { if (l && (!r || (l.u || 0) <= (r.u || 0))) { S.itin.splice(i, 1); changed++; who = (r && r.by) || who; } return; }
      if (!l) { S.itin.push(Object.assign({}, r, { live: 1 })); changed++; who = r.by || who; }
      else if ((r.u || 0) > (l.u || 0)) { S.itin[i] = Object.assign({}, r, { live: 1, done: l.done, tx: l.tx, off: l.off, mod: l.mod }); changed++; who = r.by || who; }
    });
    if (full) {
      // Pertama kali sambung: hantar aktiviti tempatan yang belum ada / lebih baharu
      (S.itin || []).forEach(l => {
        if (l.priv) return;
        const r = (map || {})[l.id];
        if (!r || (!r.del && (l.u || 0) > (r.u || 0))) {
          if (!l.u) { l.u = Date.now(); l.by = l.by || S.myName || ''; }
          S.liveQ = (S.liveQ || []).filter(x => x !== l.id).concat([l.id]);
        }
      });
      liveFlush();
    }
    if (changed) {
      save();
      if (S.tab === 'it') renderIt();
      if (!full || LV.lastWho !== 'init') toast('🔄 Itinerari dikemas kini' + (who && who !== S.myName ? ' oleh ' + who : ''));
    }
    LV.lastWho = 'ok';
  }
  function liveStop() { if (LV.es) { try { LV.es.close(); } catch (e) {} LV.es = null; } clearTimeout(LV.retry); }
  function liveStart() {
    liveStop();
    if (!liveReady() || !navigator.onLine || typeof EventSource === 'undefined') { setLive('off'); return; }
    setLive('wait');
    let es;
    try { es = new EventSource(liveBase() + '/items.json'); } catch (e) { setLive('error'); return; }
    LV.es = es; LV.lastWho = 'init';
    const onData = (ev, isPatch) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m) return;
      const parts = String(m.path || '/').split('/').filter(Boolean);
      if (!parts.length) liveMerge(m.data || {}, !isPatch && LV.lastWho === 'init');
      else if (parts.length === 1) liveMerge({ [parts[0]]: m.data }, false);
      else liveRefetch();
      setLive('on');
    };
    es.addEventListener('put', ev => onData(ev, false));
    es.addEventListener('patch', ev => onData(ev, true));
    es.addEventListener('cancel', () => { setLive('error'); toast('Akses itinerari bersama ditolak — semak tetapan Firebase'); liveStop(); });
    es.onopen = () => { setLive('on'); liveFlush(); };
    es.onerror = () => { setLive('error'); liveStop(); LV.retry = setTimeout(liveStart, 20000); };
  }
  async function liveRefetch() {
    try { const r = await fetch(liveBase() + '/items.json', { cache: 'no-store' }); if (r.ok) liveMerge((await r.json()) || {}, false); } catch (e) {}
  }
  // Terima apa-apa bentuk alamat: alamat database, tanpa https, atau link console Firebase dari bar pelayar
  async function resolveDb(input) {
    const t = String(input || '').trim();
    const m = t.match(/([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:firebasedatabase\.app|firebaseio\.com))/i);
    if (m) return 'https://' + m[1].toLowerCase();
    if (/^https?:\/\/localhost(:\d+)?\/?$/i.test(t)) return t.replace(/\/+$/, ''); // ujian
    const n = (t.match(/\/database\/([a-z0-9-]+)/i) || t.match(/^([a-z0-9-]+-default-rtdb)$/i) || [])[1];
    if (!n) return '';
    const cands = ['https://' + n + '.asia-southeast1.firebasedatabase.app', 'https://' + n + '.firebaseio.com', 'https://' + n + '.europe-west1.firebasedatabase.app'];
    for (const c of cands) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(c + '/.json?shallow=true', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(tm);
        if (r.status === 200 || r.status === 401 || r.status === 403) return c;
      } catch (e) {}
    }
    return '';
  }
  // Uji sambungan sebenar ke /g/<kod>/items — sahkan alamat & Rules
  async function liveCheck() {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(liveBase() + '/items.json?shallow=true', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(tm);
      if (r.ok) return { ok: true };
      let msg = ''; try { msg = (await r.json()).error || ''; } catch (e) {}
      if (r.status === 401 || r.status === 403) return { ok: false, why: 'rules', msg };
      if (r.status === 404) return { ok: false, why: 'addr', msg };
      if (r.status === 423) return { ok: false, why: 'disabled', msg };
      return { ok: false, why: 'http', msg: 'HTTP ' + r.status + (msg ? ' — ' + msg : '') };
    } catch (e) { return { ok: false, why: 'net', msg: e && e.name === 'AbortError' ? 'tamat masa' : (e && e.message) || '' }; }
  }
  function liveProblemSheet(res) {
    const T = {
      rules: ['🔒 Firebase menolak akses (Rules)', 'Database dijumpai, tetapi <b>Rules</b> belum dipasang dengan betul. Dalam Firebase: Realtime Database → tab <b>Rules</b> → padam semua → tampal peraturan di bawah → tekan <b>Publish</b>. Kemudian tekan Aktifkan sekali lagi.', true],
      addr: ['❓ Database tidak dijumpai', 'Alamat tidak betul atau database belum dicipta. Dalam Firebase: <b>Realtime Database</b> → tab <b>Data</b> → salin alamat yang berakhir <b>.firebasedatabase.app</b> (atau .firebaseio.com).', false],
      disabled: ['⛔ Database dimatikan', 'Database ini dinyahaktifkan dalam Firebase. Semak Realtime Database dalam console.', false],
      net: ['📡 Tidak dapat hubungi Firebase', 'Semak sambungan internet. Jika guna WiFi/SIM China, Firebase disekat — guna roaming/eSIM Malaysia. Pastikan juga alamat betul.', false],
      http: ['⚠ Ralat Firebase', 'Firebase membalas ralat.', false]
    }[res.why] || ['⚠ Ralat', '', false];
    sheet('<h2>' + T[0] + '</h2><p style="margin-top:0">' + T[1] + '</p>' + (res.msg ? '<div class="small muted">Butiran: ' + esc(res.msg) + '</div>' : '') +
      (T[2] ? '<textarea class="input" readonly rows="8" style="font-family:monospace;font-size:12px;margin-top:8px">' + esc(FB_RULES) + '</textarea><button class="btn block" id="lp-copy" style="margin-top:8px">📋 Salin peraturan</button>' : '') +
      '<div style="height:8px"></div><button class="btn pri block" id="lp-ok">Faham</button>', sh => {
        if ($('#lp-copy', sh)) $('#lp-copy', sh).onclick = () => copyText(FB_RULES);
        $('#lp-ok', sh).onclick = closeSheet;
      });
  }
  function liveJoinSheet(prefill) {
    const c = liveCfg();
    sheet('<h2>🔄 Itinerari bersama</h2>' +
      '<p class="small" style="margin-top:0">Bila aktif, sesiapa dalam kumpulan yang ubah itinerari, semua telefon yang ada internet akan dapat perubahan itu <b>serta-merta</b>. Kewangan, checklist & bajet kekal peribadi.</p>' +
      '<label class="field"><span>Nama anda (dipaparkan bila anda ubah aktiviti)</span><input class="input" id="lj-name" value="' + esc(S.myName || '') + '" placeholder="Contoh: Hazim"></label>' +
      '<label class="field"><span>Kod kumpulan (daripada penganjur)</span><input class="input" id="lj-code" value="' + esc(prefill || c.code || '') + '" placeholder="HRB-XXXXXXXX" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:1px"></label>' +
      (!liveDb() ? '<label class="field"><span>Alamat pangkalan data (jika diberi penganjur)</span><input class="input" id="lj-db" value="' + esc(c.db) + '" placeholder="https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app"></label>' : '') +
      '<button class="btn pri block" id="lj-go">' + (c.on ? 'Simpan' : 'Sertai') + '</button>' +
      (c.on ? '<div style="height:8px"></div><button class="btn block" id="lj-off">Berhenti kongsi (itinerari kekal dalam telefon)</button>' : ''),
      sh => {
        $('#lj-go', sh).onclick = async () => {
          const code = normCode($('#lj-code', sh).value), name = $('#lj-name', sh).value.trim();
          const dbEl = $('#lj-db', sh);
          if (code.length < 8) { toast('Kod kumpulan tidak sah (sekurang-kurangnya 8 aksara)'); return; }
          if (!name) { toast('Isi nama anda'); return; }
          if (dbEl && dbEl.value.trim()) { const d = await resolveDb(dbEl.value); if (!d) { toast('Alamat database tidak sah — minta link jemputan daripada penganjur'); return; } c.db = d; }
          if (!liveDb()) { toast('Alamat database belum ada — buka link jemputan daripada penganjur, atau minta penganjur tekan 🚀 Terbitkan'); return; }
          const btn = $('#lj-go', sh); btn.disabled = true; btn.textContent = '⏳ Menyemak…';
          const prev = { code: c.code, on: c.on };
          S.myName = name; c.code = code; c.on = true;
          const res = navigator.onLine ? await liveCheck() : { ok: true };
          if (!res.ok) { Object.assign(c, prev); save(); btn.disabled = false; btn.textContent = 'Sertai'; liveProblemSheet(res); return; }
          save(); closeSheet();
          liveStart(); renderAll(); toast('✅ Itinerari bersama aktif');
        };
        if ($('#lj-off', sh)) $('#lj-off', sh).onclick = () => { c.on = false; save(); liveStop(); closeSheet(); renderAll(); };
      });
  }
  function liveAdminHTML() {
    const c = liveCfg();
    const invite = siteBase() + '#g=' + encodeURIComponent(c.code || '') + (c.db ? '&db=' + encodeURIComponent(c.db.replace(/^https:\/\//, '')) : '');
    return '<div class="card adminc"><h3>🔄 Itinerari bersama (live)</h3>' +
      '<p class="small" style="margin-top:0">Semua ahli kumpulan boleh ubah itinerari, dan perubahan sampai kepada semua yang online serta-merta.</p>' +
      '<label class="field"><span>Alamat Firebase Realtime Database</span><input class="input" id="lv-db" value="' + esc(c.db) + '" placeholder="https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app"></label>' +
      '<label class="field"><span>Kod kumpulan</span><div class="row"><input class="input grow" id="lv-code" value="' + esc(c.code || newCode()) + '" style="letter-spacing:1px"><button class="btn sm" data-a="lvnew">↻ Baharu</button></div></label>' +
      '<label class="field"><span>Nama anda</span><input class="input" id="lv-name" value="' + esc(S.myName || '') + '" placeholder="Contoh: Hazim"></label>' +
      '<button class="btn pri block" data-a="lvsave">' + (c.on ? '💾 Simpan' : '▶ Aktifkan itinerari bersama') + '</button>' +
      (c.on && c.code && c.db ? '<hr class="sep"><div class="small"><b>Link jemputan</b> — hantar kepada ahli kumpulan (WhatsApp). Mereka buka link ini dahulu, kemudian tekan Add to Home Screen:</div>' +
        '<div class="qr">' + qrSVG(invite) + '</div><div class="linkbox"><span class="grow">' + esc(invite) + '</span><button class="btn sm" data-copy="' + esc(invite) + '">Salin</button></div>' +
        '<p class="small muted">Yang sudah pasang app: Itinerari → <b>Sertai</b> → masukkan kod <b>' + esc(c.code) + '</b>. Alamat pangkalan data dihantar automatik bila anda tekan 🚀 Terbitkan.</p>' +
        '<button class="btn block" data-a="lvoff">Matikan untuk telefon ini</button>' : '') +
      '<details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700">📘 Cara sediakan Firebase (sekali sahaja, percuma)</summary><ol class="list-plain small" style="margin-top:8px">' +
      '<li>Buka <b>console.firebase.google.com</b> → log masuk akaun Google → <b>Create a project</b> (nama: arztech-harbin-trip). Google Analytics boleh dimatikan.</li>' +
      '<li>Menu kiri <b>Build → Realtime Database</b> → <b>Create Database</b> → lokasi <b>Singapore (asia-southeast1)</b> → pilih <b>Start in locked mode</b> → Enable.</li>' +
      '<li>Tab <b>Rules</b> → padam semua → tampal peraturan di bawah → <b>Publish</b>.</li>' +
      '<li>Tab <b>Data</b> → salin alamat di atas (bermula https:// dan berakhir .firebasedatabase.app) → tampal dalam kotak “Alamat Firebase” di atas.</li></ol>' +
      '<textarea class="input" readonly rows="9" style="font-family:monospace;font-size:12px">' + esc(FB_RULES) + '</textarea><button class="btn sm" data-copy="' + esc(FB_RULES) + '" style="margin-top:6px">Salin peraturan</button></details>' +
      '</div>';
  }
  const FB_RULES = JSON.stringify({ rules: { '.read': false, '.write': false, g: { $code: { '.read': '$code.length >= 8', '.write': '$code.length >= 8', items: { $id: { '.validate': 'newData.hasChild(\'u\') && newData.child(\'u\').isNumber()' } } } } } }, null, 2);
  function liveUserHTML() {
    const c = liveCfg();
    return '<div class="card"><h3>🔄 Itinerari bersama</h3>' +
      (c.on ? '<p class="small" style="margin-top:0">Aktif · kod <b>' + esc(c.code) + '</b> · nama: <b>' + esc(S.myName || '-') + '</b></p>' : '<p class="small muted" style="margin-top:0">Belum aktif. Minta kod kumpulan daripada penganjur.</p>') +
      '<button class="btn block" data-ia="livejoin">' + (c.on ? '⚙ Tetapan' : '➕ Sertai dengan kod') + '</button></div>';
  }
  // Link jemputan: #g=KOD&db=HOST
  (function joinFromHash() {
    const h = location.hash || '';
    const m = h.match(/[#&]g=([^&]+)/);
    if (!m) return;
    const c = liveCfg();
    const code = normCode(decodeURIComponent(m[1]));
    const db = (h.match(/[&]db=([^&]+)/) || [])[1];
    if (db) c.db = normDb(decodeURIComponent(db));
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (code.length >= 8 && LIVE_FEATURE) { c.code = code; save(); setTimeout(() => liveJoinSheet(code), 400); }
  })();

  // ---------- Header, tab & permulaan ----------
  function updateHeader() {
    const c = $('#countdown');
    const t = today();
    if (S.trip.start) {
      const d = daysBetween(t, S.trip.start);
      if (d > 0) c.textContent = d + ' hari lagi ke Harbin';
      else if (!S.trip.end || t <= S.trip.end) c.textContent = 'Hari ke-' + (1 - d) + ' di Harbin · 加油!';
      else c.textContent = 'Trip selesai — semoga seronok!';
    } else c.textContent = 'Teman perjalanan offline';
    const p = $('#netpill');
    p.textContent = navigator.onLine ? 'Online' : 'Offline ✓';
    p.classList.toggle('off', !navigator.onLine);
  }
  const RENDER = { tr: renderTr, it: renderIt, ck: renderCk, fn: renderFn, in: renderIn };
  function setTab(t) {
    S.tab = t; save();
    $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    $$('section.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + t));
    RENDER[t]();
    window.scrollTo({ top: 0 });
  }
  function renderAll() { updateHeader(); RENDER[S.tab](); }
  $$('nav.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  window.addEventListener('online', () => { updateHeader(); syncShared(false); renderPack(); liveStart(); });
  window.addEventListener('offline', () => { renderPack(); liveStop(); setLive('off'); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { syncShared(false); if (liveReady() && !LV.es) liveStart(); } });
  window.addEventListener('offline', updateHeader);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); $$('.show').forEach(x => x.remove()); } });

  if (!RENDER[S.tab]) S.tab = 'tr';
  setTab(S.tab);
  updateHeader();
  if (ROLE === 'admin') { const pill = document.createElement('span'); pill.className = 'pill adminpill'; pill.textContent = 'ADMIN'; $('.top-in').insertBefore(pill, $('#netpill')); }
  syncShared(false);
  liveStart();

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
