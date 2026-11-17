// "Gambar lain" mode: up to 10 images, JPG or WebP, optional per-image KB target, ZIP for several.
(function () {
  const C = WM.cmp, $ = id => document.getElementById(id);
  const MAX_FILES = 10, MAX_FILE = 20 * 1048576, MAX_TOTAL = 80 * 1048576, MAX_PIXELS = 24_000_000, MAX_SIDE = 8192, FLOOR_Q = 0.3;

  Object.assign(WM.messages.id, {
    modeKtp: 'KTP / ID', modeOther: 'Gambar lain', cmpIntroOther: 'Kecilkan foto dan gambar biasa. Pilih format, kualitas, dan ukuran, lalu unduh satu per satu atau sebagai ZIP.',
    othDropTitle: 'Pilih gambar untuk dikompres', othDropHelp: 'Sampai 10 gambar JPG, PNG, atau WebP. Maksimal 20 MiB per gambar dan 80 MiB total.', othChoose: 'Pilih gambar',
    othSettings: 'Pengaturan', othFormat: 'Format hasil', othQuality: 'Kualitas', othTarget: 'Target ukuran per gambar (KB)', othTargetHelp: 'Opsional. Kosongkan untuk memakai kualitas di atas apa adanya.',
    othZip: 'Unduh ZIP', othAdd: 'Tambah gambar', othClear: 'Hapus semua gambar', othDownload: 'Unduh', othPrivacy: 'Hasil dibuat ulang lewat canvas, jadi metadata kamera seperti lokasi GPS tidak ikut tersimpan.',
    othSummary: '{n} gambar: {from} menjadi {to} ({pct})', othMissed: 'Target {kb} KB tidak tercapai. Hasil terkecil dipakai.', othZipFailed: 'ZIP gagal dibuat. Unduh gambar satu per satu.'
  });
  Object.assign(WM.messages.en, {
    modeKtp: 'ID card', modeOther: 'Other images', cmpIntroOther: 'Shrink ordinary photos and images. Choose the format, quality, and size, then download them one by one or as a ZIP.',
    othDropTitle: 'Choose images to compress', othDropHelp: 'Up to 10 JPG, PNG, or WebP images. Up to 20 MiB each and 80 MiB in total.', othChoose: 'Choose images',
    othSettings: 'Settings', othFormat: 'Output format', othQuality: 'Quality', othTarget: 'Target size per image (KB)', othTargetHelp: 'Optional. Leave empty to use the quality above as it is.',
    othZip: 'Download ZIP', othAdd: 'Add images', othClear: 'Remove all images', othDownload: 'Download', othPrivacy: 'The result is redrawn on a canvas, so camera metadata such as GPS location is not kept.',
    othSummary: '{n} images: {from} to {to} ({pct})', othMissed: 'The {kb} KB target was not reached. The smallest result is used.', othZipFailed: 'Could not create the ZIP. Download the images one by one.'
  });

  const O = { items: [], run: 0, nextId: 1, adding: false };

  // A browser that cannot encode WebP from a canvas hands back a PNG; hide the option then.
  const probe = document.createElement('canvas'); probe.width = probe.height = 1;
  probe.toBlob(b => { if (!b || b.type !== 'image/webp') { const o = $('othFormat').querySelector('[value="image/webp"]'); if (o) o.remove(); } }, 'image/webp');

  const settings = () => ({ type: $('othFormat').value, q: Number($('othQuality').value) / 100, side: Number($('othSide').value), kb: Number($('othTarget').value) || 0 });
  const stale = () => new Error('stale');

  async function one(it, s, live) {
    const img = await WM.loadImage(it.file); if (!live()) throw stale();
    const c = C.draw(img, s.side || Infinity, s.type === 'image/jpeg');
    try {
      const enc = async q => { const b = await C.encode(c, s.type, q); if (!live()) throw stale(); return b; };
      const limit = s.kb * 1024;
      let blob = await enc(s.q), q = s.q, missed = false;
      if (limit && blob.size > limit) {
        const lo = await enc(FLOOR_Q); blob = lo; q = FLOOR_Q;
        if (lo.size > limit) missed = true;
        else {
          let low = FLOOR_Q, high = s.q;
          for (let i = 0; i < 7; i++) { const mid = (low + high) / 2, b = await enc(mid); if (b.size <= limit) { blob = b; q = mid; low = mid; } else high = mid; }
        }
      }
      if (blob.type !== s.type) throw new Error('type');
      if (it.url) URL.revokeObjectURL(it.url);
      Object.assign(it, { blob, q, missed, kb: s.kb, w: c.width, h: c.height, url: URL.createObjectURL(blob), ext: s.type === 'image/webp' ? 'webp' : 'jpg', stale: false, failed: false });
    } finally { c.width = 0; c.height = 0; }
  }

  async function process() {
    const id = ++O.run, live = () => id === O.run, s = settings();
    render();
    for (const it of O.items) {
      if (!it.stale) continue;
      try { await one(it, s, live); }
      catch (e) { if (e.message === 'stale' || !live()) return; it.stale = false; it.failed = true; C.say('cmpFailed', null, true); }
      render();
    }
  }
  const restaleAll = () => { O.items.forEach(it => { it.stale = true; }); process(); };

  function names() {
    const used = new Set();
    return O.items.map(it => {
      const base = it.name.replace(/\.[^.]*$/, '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.+$/, '').trim().slice(0, 100) || 'image';
      let n = base + '-compressed.' + (it.ext || 'jpg'), i = 2;
      while (used.has(n.toLowerCase())) n = base + '-compressed-' + i++ + '.' + (it.ext || 'jpg');
      used.add(n.toLowerCase()); return n;
    });
  }

  function render() {
    const list = $('othList'), out = names(), done = O.items.filter(it => it.blob && !it.stale);
    list.replaceChildren(...O.items.map((it, i) => {
      const row = document.createElement('li'); row.className = 'oth-row';
      const thumb = document.createElement('img'); thumb.className = 'oth-thumb'; thumb.alt = ''; thumb.width = 56; thumb.height = 56;
      if (it.url) thumb.src = it.url;
      const info = document.createElement('div'); info.className = 'oth-info';
      const name = document.createElement('span'); name.className = 'oth-name'; name.textContent = it.name; name.title = it.name;
      const meta = document.createElement('span'); meta.className = 'oth-meta';
      if (it.stale || !it.blob) meta.textContent = it.failed ? '' : WM.t('cmpWorking');
      else meta.textContent = C.size(it.file.size) + ' → ' + C.size(it.blob.size) + ' · ' + it.w + '×' + it.h;
      info.append(name, meta);
      if (it.missed && !it.stale) { const w = document.createElement('span'); w.className = 'oth-meta is-warn'; w.textContent = C.fill(WM.t('othMissed'), { kb: it.kb }); info.append(w); }
      row.append(thumb, info);
      if (it.blob && !it.stale) {
        const a = document.createElement('a'); a.className = 'btn btn-secondary btn-small'; a.href = it.url; a.download = out[i];
        a.textContent = WM.t('othDownload'); a.setAttribute('aria-label', WM.t('othDownload') + ': ' + out[i]); row.append(a);
      }
      return row;
    }));
    const from = done.reduce((n, it) => n + it.file.size, 0), to = done.reduce((n, it) => n + it.blob.size, 0);
    $('othSummary').textContent = done.length === O.items.length && done.length
      ? C.fill(WM.t('othSummary'), { n: done.length, from: C.size(from), to: C.size(to), pct: (to <= from ? '-' : '+') + Math.abs((1 - to / from) * 100).toFixed(1) + '%' }) : '';
    const zip = $('othZip'); zip.hidden = O.items.length < 2; zip.disabled = done.length !== O.items.length;
  }

  async function add(fileList) {
    if (O.adding) return; O.adding = true;
    const fresh = [];
    try {
      for (const file of Array.from(fileList || [])) {
        if (O.items.length + fresh.length >= MAX_FILES) { C.say('maxImages', null, true); break; }
        if (file.size > MAX_FILE) { C.say('fileTooLarge', { detail: file.name }, true); continue; }
        if ([...O.items, ...fresh].reduce((n, it) => n + it.file.size, 0) + file.size > MAX_TOTAL) { C.say('batchTooLarge', { detail: file.name }, true); continue; }
        try {
          const h = await WM.readImageHeader(file);
          if (h.width > MAX_SIDE || h.height > MAX_SIDE || h.width * h.height > MAX_PIXELS) throw new Error('imageTooLarge');
          fresh.push({ id: O.nextId++, file, name: file.name, stale: true });
        } catch (e) { C.say(e.message === 'imageTooLarge' ? 'imageTooLarge' : e.message === 'unsupportedImage' ? 'unsupportedImage' : 'corruptImage', { detail: file.name }, true); }
      }
    } finally { O.adding = false; }
    if (!fresh.length) return;
    O.items.push(...fresh); $('othDrop').hidden = true; $('othWork').hidden = false;
    process();
  }
  function clear() {
    O.run++; O.items.forEach(it => it.url && URL.revokeObjectURL(it.url)); O.items = [];
    $('othFile').value = ''; $('othWork').hidden = true; $('othDrop').hidden = false; $('othList').replaceChildren(); $('othSummary').textContent = '';
    C.say('cmpCleared'); $('othChoose').focus();
  }
  async function zip() {
    try {
      const z = new window.JSZip(), out = names();
      O.items.forEach((it, i) => z.file(out[i], it.blob));
      const blob = await z.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'gambar-terkompres.zip'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { C.say('othZipFailed', null, true); }
  }

  function setMode(m) {
    C.mode = m;
    $('ktpPanel').hidden = m !== 'ktp'; $('othPanel').hidden = m !== 'other';
    document.querySelectorAll('#cmpModes .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    $('cmpIntroText').dataset.i18n = m === 'ktp' ? 'cmpIntro' : 'cmpIntroOther';
    C.say(null); WM.refreshLanguage();
  }

  C.addOther = add;
  $('cmpModes').addEventListener('click', e => { const b = e.target.closest('.seg-btn'); if (b) setMode(b.dataset.mode); });
  $('othChoose').addEventListener('click', () => $('othFile').click());
  $('othAdd').addEventListener('click', () => $('othFile').click());
  $('othFile').addEventListener('change', e => { const files = Array.from(e.target.files); e.target.value = ''; add(files); });
  $('othClear').addEventListener('click', clear);
  $('othZip').addEventListener('click', zip);
  $('othFormat').addEventListener('change', restaleAll);
  $('othSide').addEventListener('change', restaleAll);
  $('othQuality').addEventListener('input', e => { $('othQualityVal').textContent = e.target.value + '%'; });
  $('othQuality').addEventListener('change', restaleAll);
  $('othTarget').addEventListener('change', () => {
    const raw = $('othTarget').value, kb = Number(raw);
    if (raw !== '' && (!Number.isInteger(kb) || kb < 20 || kb > 10000)) return C.say('cmpBadTarget', null, true);
    C.say(null); restaleAll();
  });
  // Runs after compress.js's own handler, which has already set the locale.
  $('languageSelect').addEventListener('change', () => { WM.refreshLanguage(); render(); });
})();
