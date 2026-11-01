/* Enjin terjemahan offline.
   - Model AI (MarianMT / OPUS-MT, format ONNX) dijalankan dalam telefon melalui transformers.js + WebAssembly.
   - Model dimuat turun SEKALI dari Hugging Face (semasa di Malaysia) dan disimpan dalam cache telefon.
     Selepas itu terjemahan berjalan tanpa internet. (Hugging Face disekat di China — muat turun sebelum berlepas.)
   - BM → EN (opus-mt-mul-en) → 中文 (opus-mt-en-zh). 中文 → EN (opus-mt-zh-en).
   - Sandaran tanpa model: kamus perkataan (data-glossary.js). */
window.MT = (function () {
  'use strict';
  const MODELS = {
    ms2en: 'Xenova/opus-mt-mul-en',
    en2zh: 'Xenova/opus-mt-en-zh',
    zh2en: 'Xenova/opus-mt-zh-en'
  };
  const PACKS = {
    out: { keys: ['ms2en', 'en2zh'], name: 'BM / English → 中文', approx: '~200 MB' },
    back: { keys: ['zh2en'], name: '中文 → English', approx: '~80 MB' }
  };
  const READY_KEY = 'harbin-mt-ready';
  let lib = null, libErr = null, pinyinLoaded = null;
  const pipes = {};

  function readyFlags() { try { return JSON.parse(localStorage.getItem(READY_KEY) || '{}'); } catch (e) { return {}; } }
  function setReady(k, v) { const f = readyFlags(); f[k] = v; try { localStorage.setItem(READY_KEY, JSON.stringify(f)); } catch (e) {} }

  function supported() {
    if (window.HARBIN_SINGLE) return { ok: false, why: 'Ini versi pratonton / satu-fail — terjemahan AI (pakej offline) hanya ada dalam app yang dibuka dari laman web (GitHub Pages / Netlify) dan dipasang di Home Screen.' };
    if (!/^https?:/.test(location.protocol)) return { ok: false, why: 'Terjemahan AI hanya berfungsi bila app dibuka dari laman web (GitHub Pages / Netlify) dan dipasang di Home Screen — bukan dari fail tempatan atau pratonton.' };
    if (typeof WebAssembly !== 'object') return { ok: false, why: 'Pelayar ini tidak menyokong WebAssembly.' };
    if (typeof caches === 'undefined') return { ok: false, why: 'Pelayar ini tidak menyokong storan cache.' };
    return { ok: true };
  }
  const base = () => new URL('vendor/', document.baseURI).href;

  async function getLib() {
    if (lib) return lib;
    if (libErr) throw libErr;
    try {
      const L = await import(base() + 'transformers.min.js');
      L.env.allowLocalModels = false;
      L.env.useBrowserCache = true;
      const w = L.env.backends.onnx.wasm;
      w.wasmPaths = base();
      w.numThreads = 1;
      w.proxy = false;
      lib = L;
      return L;
    } catch (e) {
      libErr = new Error('Fail enjin terjemahan tidak dijumpai. Pastikan folder vendor/ ada bersama app.');
      throw libErr;
    }
  }

  async function loadPipe(key, onProgress, allowRemote) {
    if (pipes[key]) return pipes[key];
    const L = await getLib();
    if (allowRemote) {
      // Mod muat turun: ambil dari Hugging Face & simpan dalam cache
      L.env.allowLocalModels = false;
      L.env.allowRemoteModels = true;
    } else {
      // Mod offline: baca dari cache SAHAJA — jangan sesekali cuba sambung ke internet (penting di China)
      L.env.allowLocalModels = true;
      L.env.localModelPath = new URL('__no_local_models__/', document.baseURI).href;
      L.env.allowRemoteModels = false;
    }
    pipes[key] = await L.pipeline('translation', MODELS[key], { dtype: 'q8', device: 'wasm', progress_callback: onProgress });
    return pipes[key];
  }

  async function isCached(key) {
    try {
      const c = await caches.open('transformers-cache');
      const ks = await c.keys();
      return ks.some(r => r.url.indexOf(MODELS[key] + '/') >= 0 && /decoder_model_merged/.test(r.url)) &&
        ks.some(r => r.url.indexOf(MODELS[key] + '/') >= 0 && /encoder_model/.test(r.url));
    } catch (e) { return false; }
  }
  async function packStatus(p) {
    const keys = PACKS[p].keys;
    const res = await Promise.all(keys.map(isCached));
    return res.every(Boolean);
  }

  // Muat turun pakej: onProg({loaded,total,file,pct})
  async function download(p, onProg) {
    const files = {};
    const cb = ev => {
      if (ev.status === 'progress' && ev.file) {
        files[ev.name + '/' + ev.file] = { loaded: ev.loaded || 0, total: ev.total || 0 };
        let L = 0, T = 0;
        Object.values(files).forEach(f => { L += f.loaded; T += f.total; });
        onProg && onProg({ loaded: L, total: T, file: ev.file, pct: T ? L / T : 0 });
      }
    };
    // Simpan juga fail enjin & pinyin dalam cache service worker
    try { await fetch(base() + 'pinyin-pro.js'); } catch (e) {}
    for (const k of PACKS[p].keys) {
      delete pipes[k];
      await loadPipe(k, cb, true);
    }
    setReady(p, true);
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    return true;
  }

  async function removePack(p) {
    try {
      const c = await caches.open('transformers-cache');
      const ks = await c.keys();
      const ids = PACKS[p].keys.map(k => MODELS[k] + '/');
      await Promise.all(ks.filter(r => ids.some(id => r.url.indexOf(id) >= 0)).map(r => c.delete(r)));
    } catch (e) {}
    PACKS[p].keys.forEach(k => delete pipes[k]);
    setReady(p, false);
  }

  // ---------- Bahasa ----------
  const CJK = /[㐀-鿿]/;
  const MS_WORDS = ['saya', 'aku', 'nak', 'hendak', 'mahu', 'ke', 'di', 'dengan', 'berapa', 'ini', 'itu', 'tak', 'tidak', 'boleh', 'ada', 'yang', 'untuk', 'pergi', 'kami', 'awak', 'anda', 'apa', 'mana', 'orang', 'dan', 'sini', 'sana', 'tolong', 'harga', 'duit', 'beli', 'makan', 'minum', 'kat', 'dia', 'bila', 'macam', 'mana', 'lagi', 'sikit', 'sangat', 'terima', 'kasih', 'maaf', 'bilik', 'jalan', 'kedai', 'mahal', 'murah', 'esok', 'hari', 'semalam', 'nanti', 'sudah', 'dah', 'belum', 'perlu', 'kena', 'jom', 'kita', 'mereka', 'encik', 'puan', 'kenapa', 'bagaimana', 'satu', 'dua', 'tiga', 'empat', 'lima'];
  const EN_WORDS = ['i', 'you', 'the', 'a', 'is', 'are', 'to', 'want', 'how', 'much', 'where', 'what', 'can', 'please', 'with', 'and', 'my', 'we', 'go', 'this', 'that', 'do', 'does', 'have', 'need', 'of', 'for', 'it', 'in', 'on', 'at', 'people', 'would', 'like', 'thank', 'sorry', 'there', 'here', 'when', 'why'];
  function detect(text) {
    if (CJK.test(text)) return 'zh';
    const w = text.toLowerCase().match(/[a-z']+/g) || [];
    let ms = 0, en = 0;
    w.forEach(x => { if (MS_WORDS.includes(x)) ms++; if (EN_WORDS.includes(x)) en++; });
    return ms >= en ? 'ms' : 'en';
  }
  // Tukar BM pasar / singkatan → BM standard (model lebih faham)
  const COLLOQ = [
    [/\baku\b/gi, 'saya'], [/\bnak\b/gi, 'mahu'], [/\bhendak\b/gi, 'mahu'], [/\btak\b/gi, 'tidak'], [/\bx\b/gi, 'tidak'], [/\bkat\b/gi, 'di'],
    [/\bdah\b/gi, 'sudah'], [/\bdgn\b/gi, 'dengan'], [/\bdg\b/gi, 'dengan'], [/\bbrp\b/gi, 'berapa'], [/\borg\b/gi, 'orang'], [/\byg\b/gi, 'yang'],
    [/\butk\b/gi, 'untuk'], [/\bsbb\b/gi, 'sebab'], [/\bsikit\b/gi, 'sedikit'], [/\bcamne\b/gi, 'bagaimana'], [/\bmacam mana\b/gi, 'bagaimana'],
    [/\bkenapa\b/gi, 'mengapa'], [/\bduit\b/gi, 'wang'], [/\bjom\b/gi, 'mari'], [/\bsape\b/gi, 'siapa'], [/\bape\b/gi, 'apa'], [/\bmane\b/gi, 'mana'],
    [/\bpegi\b/gi, 'pergi'], [/\bdkt\b/gi, 'dekat'], [/\bkene\b/gi, 'kena'], [/\bboleh tak\b/gi, 'bolehkah'], [/\bawak\b/gi, 'anda'], [/\bkau\b/gi, 'anda'],
    [/\bkorang\b/gi, 'kamu semua'], [/\bkitorang\b/gi, 'kami'], [/\bkitaorang\b/gi, 'kami'], [/\bje\b/gi, 'sahaja'], [/\bjer\b/gi, 'sahaja'],
    [/\bsini\b/gi, 'sini'], [/\bbiler\b/gi, 'bila'], [/\bbile\b/gi, 'bila'], [/\bmcm\b/gi, 'macam'], [/\bsgt\b/gi, 'sangat'], [/\bblh\b/gi, 'boleh'],
    [/\bpastu\b/gi, 'selepas itu'], [/\blepas tu\b/gi, 'selepas itu'], [/\bhotel\b/gi, 'hotel']
  ];
  function normMs(t) { let s = ' ' + t + ' '; COLLOQ.forEach(r => { s = s.replace(r[0], r[1]); }); return s.trim(); }
  function sentences(t) {
    return String(t).replace(/\s+/g, ' ').split(/(?<=[.!?。！？;；\n])\s*/).map(s => s.trim()).filter(Boolean);
  }
  async function runPipe(key, text) {
    const p = await loadPipe(key, null, false);
    const parts = sentences(text);
    const out = [];
    for (const s of parts) {
      const r = await p(s, { max_new_tokens: 256 });
      out.push((r && r[0] && r[0].translation_text || '').trim());
    }
    return out;
  }
  async function pinyinOf(zh) {
    try {
      if (!window.pinyinPro) {
        pinyinLoaded = pinyinLoaded || new Promise((res, rej) => { const s = document.createElement('script'); s.src = base() + 'pinyin-pro.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        await pinyinLoaded;
      }
      return window.pinyinPro.pinyin(zh, { nonZh: 'consecutive' });
    } catch (e) { return ''; }
  }

  // Terjemah: dir 'out' (BM/EN → 中文) atau 'back' (中文 → EN)
  async function translate(text, dir) {
    text = String(text || '').trim();
    if (!text) throw new Error('Tiada teks');
    if (dir === 'back') {
      const en = (await runPipe('zh2en', text)).join(' ');
      return { dir, src: text, lang: 'zh', en, zh: text, py: await pinyinOf(text) };
    }
    const lang = detect(text);
    let en;
    if (lang === 'zh') return { dir, src: text, lang, zh: text, en: '', py: await pinyinOf(text) };
    if (lang === 'ms') en = (await runPipe('ms2en', normMs(text))).join(' ');
    else en = text;
    const zh = (await runPipe('en2zh', en)).join('');
    return { dir, src: text, lang, en, zh, py: await pinyinOf(zh) };
  }

  // ---------- Kamus sandaran ----------
  let GL = null;
  function glossary() {
    if (GL) return GL;
    GL = [];
    String(window.GLOSSARY || '').split('\n').forEach(line => {
      const p = line.split('|'); if (p.length < 3) return;
      p[0].split(',').forEach(k => { k = k.trim().toLowerCase(); if (k) GL.push({ k, zh: p[1].trim(), py: p[2].trim() }); });
    });
    GL.sort((a, b) => b.k.length - a.k.length); // padanan frasa terpanjang dahulu
    return GL;
  }
  function wordByWord(text) {
    let s = ' ' + normMs(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ') + ' ';
    const hits = [];
    const found = [];
    // nombor + orang/hari/malam
    const ZHN = ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
    const PYN = ['líng', 'yí', 'liǎng', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí'];
    let m3; const reU = /(?<=\s)(\d+) (orang|hari|malam)(?=\s)/g;
    while ((m3 = reU.exec(s))) {
      const n = +m3[1], u = { orang: ['个人', 'gè rén'], hari: ['天', 'tiān'], malam: ['个晚上', 'gè wǎnshang'] }[m3[2]];
      found.push({ i: m3.index, len: m3[0].length, e: { k: m3[0], zh: (n <= 10 ? ZHN[n] : n) + u[0], py: (n <= 10 ? PYN[n] : n) + ' ' + u[1] } });
      s = s.slice(0, m3.index) + '#'.repeat(m3[0].length) + s.slice(m3.index + m3[0].length);
    }
    // cari padanan ikut kedudukan
    const g = glossary();
    g.forEach(e => {
      const re = new RegExp('(?<=\\s)' + e.k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s)', 'g');
      let m;
      while ((m = re.exec(s))) { found.push({ i: m.index, len: e.k.length, e }); s = s.slice(0, m.index) + '#'.repeat(e.k.length) + s.slice(m.index + e.k.length); }
    });
    let m2; const reN = /(?<=\s)\d+(?=\s)/g;
    while ((m2 = reN.exec(s))) found.push({ i: m2.index, len: m2[0].length, e: { k: m2[0], zh: m2[0], py: m2[0] } });
    found.sort((a, b) => a.i - b.i).forEach(f => hits.push(f.e));
    return hits;
  }

  return { MODELS, PACKS, supported, readyFlags, packStatus, download, removePack, translate, detect, wordByWord, pinyinOf, getLib };
})();
