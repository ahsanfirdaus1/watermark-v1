(function () {
  const MAX_FILE_BYTES = 20 * 1024 * 1024, MAX_PIXELS = 24_000_000, MAX_SIDE = 8192;
  // Floor for ID photos: below this, small print on a KTP gets hard to read.
  const TOP_Q = 0.94, FLOOR_Q = 0.5, SIDES = [1600, 1280, 1024];
  const $ = id => document.getElementById(id);

  Object.assign(WM.messages.id, {
    skipContent: 'Lewati ke konten', cmpTitle: 'Kompres foto KTP', cmpIntro: 'Kecilkan ukuran file sampai di bawah batas portal. Periksa keterbacaan tulisan sebelum mengunggah.',
    cmpDropTitle: 'Pilih foto KTP, KK, atau paspor', cmpDropHelp: 'JPG, PNG, atau WebP. Maksimal 20 MiB.', cmpChoose: 'Pilih foto', cmpDropHint: 'atau tarik file ke sini',
    cmpTargetTitle: 'Target ukuran', cmpTargetHelp: 'Cek batas ukuran di portal tujuan, lalu pilih yang sama atau lebih kecil.', cmpCustomLabel: 'Target lain (KB)', cmpCustomBtn: 'Kecilkan ke target',
    cmpManualTitle: 'Atur manual', cmpQuality: 'Kualitas JPG', cmpMaxSide: 'Sisi terpanjang', cmpSideOriginal: 'Ukuran asli',
    cmpDownload: 'Unduh JPG', cmpAnother: 'Pilih foto lain', cmpClear: 'Hapus gambar dari halaman',
    cmpPrivacy: 'Hasil dibuat ulang lewat canvas, jadi metadata kamera seperti lokasi GPS tidak ikut tersimpan.',
    cmpStatOriginal: 'Ukuran asli', cmpStatResult: 'Hasil kompres', cmpStatSaved: 'Penghematan', cmpStatDims: 'Dimensi hasil',
    cmpViewSide: 'Berdampingan', cmpViewAfter: 'Hasil saja', cmpViewBefore: 'Asli saja', cmpZoomFit: 'Pas', cmpPaneBefore: 'ASLI', cmpPaneAfter: 'HASIL',
    cmpAltBefore: 'Foto asli', cmpAltAfter: 'Foto hasil kompres',
    cmpCheckTitle: 'Cek keterbacaan.', cmpCheckBody: 'Pilih zoom 100% atau 200%, lalu geser ke NIK, nama, dan alamat. Pastikan hurufnya masih tajam sebelum mengunggah ke portal.',
    cmpModeAuto: 'Otomatis, maks. {kb} KB', cmpModeManual: 'Manual', cmpWorking: 'Mengompres…',
    cmpMissed: 'Target {kb} KB tidak tercapai tanpa menurunkan kualitas di bawah batas aman. Hasil terkecil: {size}. Coba target lebih besar.',
    cmpBadTarget: 'Isi target antara 20 dan 10.000 KB.', cmpFailed: 'Kompres gagal. Coba gambar lain atau sisi terpanjang yang lebih kecil.', cmpCleared: 'Gambar sudah dihapus dari halaman ini.'
  });
  Object.assign(WM.messages.en, {
    skipContent: 'Skip to content', cmpTitle: 'Compress ID card photos', cmpIntro: 'Reduce the file size to fit a portal limit. Check that the text is still readable before you upload.',
    cmpDropTitle: 'Choose a photo of your ID card, family card, or passport', cmpDropHelp: 'JPG, PNG, or WebP. Up to 20 MiB.', cmpChoose: 'Choose photo', cmpDropHint: 'or drop a file here',
    cmpTargetTitle: 'Target size', cmpTargetHelp: 'Check the size limit on the portal you are uploading to, then pick the same or a smaller one.', cmpCustomLabel: 'Other target (KB)', cmpCustomBtn: 'Compress to target',
    cmpManualTitle: 'Manual settings', cmpQuality: 'JPG quality', cmpMaxSide: 'Longest side', cmpSideOriginal: 'Original size',
    cmpDownload: 'Download JPG', cmpAnother: 'Choose another photo', cmpClear: 'Remove image from this page',
    cmpPrivacy: 'The result is redrawn on a canvas, so camera metadata such as GPS location is not kept.',
    cmpStatOriginal: 'Original size', cmpStatResult: 'Compressed result', cmpStatSaved: 'Saved', cmpStatDims: 'Result dimensions',
    cmpViewSide: 'Side by side', cmpViewAfter: 'Result only', cmpViewBefore: 'Original only', cmpZoomFit: 'Fit', cmpPaneBefore: 'ORIGINAL', cmpPaneAfter: 'RESULT',
    cmpAltBefore: 'Original photo', cmpAltAfter: 'Compressed photo',
    cmpCheckTitle: 'Check legibility.', cmpCheckBody: 'Choose 100% or 200% zoom, then scroll to the ID number (NIK), name, and address. Make sure the letters stay sharp before you upload.',
    cmpModeAuto: 'Automatic, max {kb} KB', cmpModeManual: 'Manual', cmpWorking: 'Compressing…',
    cmpMissed: 'The {kb} KB target cannot be reached without dropping quality below the safe limit. Smallest result: {size}. Try a larger target.',
    cmpBadTarget: 'Enter a target between 20 and 10,000 KB.', cmpFailed: 'Compression failed. Try another image or a smaller longest side.', cmpCleared: 'The image was removed from this page.'
  });

  const st = { file: null, img: null, srcUrl: null, outUrl: null, run: 0, kb: 200, auto: true, status: null, result: null };

  const fill = (text, params) => Object.entries(params || {}).reduce((t, [k, v]) => t.replace('{' + k + '}', v), text);
  const size = n => n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
  function renderStatus() {
    const el = $('cmpStatus'), s = st.status;
    el.textContent = s ? fill(WM.t(s.key), s.params) + (s.params && s.params.detail ? ' ' + s.params.detail : '') : '';
    el.classList.toggle('is-warn', !!s && s.warn === true);
  }
  function say(key, params, warn) { st.status = key ? { key, params, warn } : null; renderStatus(); }
  function renderMode() {
    $('cmpMode').textContent = st.auto ? fill(WM.t('cmpModeAuto'), { kb: st.kb }) : WM.t('cmpModeManual');
  }
  function renderLang() {
    WM.refreshLanguage();
    $('cmpImgBefore').alt = WM.t('cmpAltBefore'); $('cmpImgAfter').alt = WM.t('cmpAltAfter');
    renderMode(); renderStatus();
  }

  function draw(img, side) {
    const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const x = c.getContext('2d', { alpha: false });
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  const jpeg = (c, q) => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('encode')), 'image/jpeg', q));

  // Largest quality (and, only if needed, the largest side) that fits targetBytes.
  async function fit(img, targetBytes, live) {
    const top = Math.min(SIDES[0], Math.max(img.naturalWidth, img.naturalHeight));
    const sides = [...new Set([top, ...SIDES.filter(s => s < top)])];
    const enc = async (c, q) => { const b = await jpeg(c, q); if (!live()) throw new Error('stale'); return b; };
    let last;
    for (const side of sides) {
      const c = draw(img, side);
      try {
        const hi = await enc(c, TOP_Q);
        if (hi.size <= targetBytes) return { blob: hi, w: c.width, h: c.height, q: TOP_Q, side };
        const lo = await enc(c, FLOOR_Q);
        last = { blob: lo, w: c.width, h: c.height, q: FLOOR_Q, side };
        if (lo.size <= targetBytes) {
          let low = FLOOR_Q, high = TOP_Q, best = last;
          for (let i = 0; i < 7; i++) {
            const mid = (low + high) / 2, b = await enc(c, mid);
            if (b.size <= targetBytes) { best = { blob: b, w: c.width, h: c.height, q: mid, side }; low = mid; } else high = mid;
          }
          return best;
        }
      } finally { c.width = 0; c.height = 0; }
    }
    return { ...last, missed: true };
  }
  async function manual(img, side, q, live) {
    const c = draw(img, side || Infinity);
    try { const blob = await jpeg(c, q); if (!live()) throw new Error('stale'); return { blob, w: c.width, h: c.height, q, side }; }
    finally { c.width = 0; c.height = 0; }
  }

  function outName() {
    const base = st.file.name.replace(/\.[^.]*$/, '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.+$/, '').trim().slice(0, 100);
    return (base || 'ktp') + '-compressed.jpg';
  }
  function show(r, targetKb) {
    if (st.outUrl) URL.revokeObjectURL(st.outUrl);
    st.outUrl = URL.createObjectURL(r.blob); st.result = r;
    $('cmpImgAfter').src = st.outUrl;
    const link = $('cmpDownload'); link.href = st.outUrl; link.download = outName(); link.hidden = false;
    const saved = (1 - r.blob.size / st.file.size) * 100;
    $('cmpStatOriginal').textContent = size(st.file.size);
    $('cmpStatResult').textContent = size(r.blob.size);
    $('cmpStatSaved').textContent = (saved >= 0 ? '-' : '+') + Math.abs(saved).toFixed(1) + '%';
    $('cmpStatDims').textContent = r.w + ' × ' + r.h;
    $('cmpMetaAfter').textContent = r.w + '×' + r.h + ' · Q ' + Math.round(r.q * 100) + '%';
    $('cmpQuality').value = Math.round(r.q * 100); $('cmpQualityVal').textContent = Math.round(r.q * 100) + '%';
    const opt = [...$('cmpSide').options].find(o => Number(o.value) === r.side);
    $('cmpSide').value = opt ? opt.value : '0';
    if (r.missed) say('cmpMissed', { kb: targetKb, size: size(r.blob.size) }, true); else say(null);
  }

  async function go(job, targetKb) {
    const id = ++st.run, live = () => id === st.run;
    $('cmpDownload').hidden = true; say('cmpWorking'); renderMode();
    try {
      const r = await job(live);
      if (live()) show(r, targetKb);
    } catch (e) {
      if (e.message !== 'stale' && live()) say('cmpFailed', null, true);
    }
  }
  function runAuto(kb) {
    st.auto = true; st.kb = kb; markPreset(kb);
    return go(live => fit(st.img, kb * 1024, live), kb);
  }
  function runManual() {
    st.auto = false; markPreset(null);
    const side = Number($('cmpSide').value), q = Number($('cmpQuality').value) / 100;
    return go(live => manual(st.img, side, q, live));
  }
  function markPreset(kb) {
    document.querySelectorAll('#cmpPresets .btn').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.kb) === kb)));
  }

  function release() {
    st.run++;
    [st.srcUrl, st.outUrl].forEach(u => u && URL.revokeObjectURL(u));
    st.srcUrl = st.outUrl = st.file = st.img = st.result = null;
    $('cmpImgBefore').removeAttribute('src'); $('cmpImgAfter').removeAttribute('src');
    $('cmpDownload').hidden = true; $('cmpDownload').removeAttribute('href');
  }
  async function open(file) {
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES) return say('fileTooLarge', { detail: file.name }, true);
      const h = await WM.readImageHeader(file);
      if (h.width > MAX_SIDE || h.height > MAX_SIDE || h.width * h.height > MAX_PIXELS) return say('imageTooLarge', { detail: file.name }, true);
      const img = await WM.loadImage(file);
      if (img.naturalWidth > MAX_SIDE || img.naturalHeight > MAX_SIDE || img.naturalWidth * img.naturalHeight > MAX_PIXELS) return say('imageTooLarge', { detail: file.name }, true);
      release();
      st.file = file; st.img = img; st.srcUrl = URL.createObjectURL(file);
      $('cmpImgBefore').src = st.srcUrl;
      $('cmpMetaBefore').textContent = img.naturalWidth + '×' + img.naturalHeight + ' · ' + size(file.size);
      $('cmpDrop').hidden = true; $('cmpWork').hidden = false;
      runAuto(200);
    } catch (e) {
      say(e.message === 'unsupportedImage' ? 'unsupportedImage' : 'corruptImage', { detail: file.name }, true);
    }
  }
  function clear() {
    release(); $('cmpFile').value = '';
    $('cmpWork').hidden = true; $('cmpDrop').hidden = false;
    say('cmpCleared'); $('cmpChoose').focus();
  }

  // Preview: view mode, zoom, natural width for 1:1 and 2:1 zoom.
  function setView(v) {
    $('cmpStage').classList.toggle('is-single', v !== 'side');
    $('cmpPaneBefore').hidden = v === 'after'; $('cmpPaneAfter').hidden = v === 'before';
    document.querySelectorAll('#cmpViews .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  }
  function setZoom(z) {
    ['cmpViewBefore', 'cmpViewAfter'].forEach(id => { const el = $(id); el.classList.toggle('zoom-1', z === '1'); el.classList.toggle('zoom-2', z === '2'); });
    document.querySelectorAll('#cmpZooms .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zoom === z)));
  }
  [['cmpImgBefore', 'cmpViewBefore'], ['cmpImgAfter', 'cmpViewAfter']].forEach(([i, v]) => {
    $(i).addEventListener('load', e => $(v).style.setProperty('--nw', e.target.naturalWidth));
  });

  $('cmpChoose').addEventListener('click', () => $('cmpFile').click());
  $('cmpAnother').addEventListener('click', () => $('cmpFile').click());
  $('cmpFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; open(f); });
  $('cmpClear').addEventListener('click', clear);
  $('cmpPresets').addEventListener('click', e => {
    const b = e.target.closest('.btn'); if (!b || !st.img) return;
    $('cmpCustom').value = ''; runAuto(Number(b.dataset.kb));
  });
  const custom = () => {
    const kb = Number($('cmpCustom').value);
    if (!Number.isInteger(kb) || kb < 20 || kb > 10000) return say('cmpBadTarget', null, true);
    if (st.img) runAuto(kb);
  };
  $('cmpCustomBtn').addEventListener('click', custom);
  $('cmpCustom').addEventListener('keydown', e => { if (e.key === 'Enter') custom(); });
  $('cmpQuality').addEventListener('input', e => { $('cmpQualityVal').textContent = e.target.value + '%'; });
  $('cmpQuality').addEventListener('change', () => st.img && runManual());
  $('cmpSide').addEventListener('change', () => st.img && runManual());
  $('cmpViews').addEventListener('click', e => { const b = e.target.closest('.seg-btn'); if (b) setView(b.dataset.view); });
  $('cmpZooms').addEventListener('click', e => { const b = e.target.closest('.seg-btn'); if (b) setZoom(b.dataset.zoom); });
  $('languageSelect').addEventListener('change', e => { WM.state.locale = e.target.value === 'en' ? 'en' : 'id'; renderLang(); });

  // A file dropped anywhere opens it; without this the browser would navigate to the file.
  const drop = $('cmpDrop');
  ['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => { e.preventDefault(); drop.classList.add('drag-over'); }));
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) drop.classList.remove('drag-over'); });
  document.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag-over'); open(e.dataTransfer && e.dataTransfer.files[0]); });

  renderLang();
})();
