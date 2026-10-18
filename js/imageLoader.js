window.WM = window.WM || {};

(function () {
  const MAX_FILES = 10;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
  const MAX_PIXELS = 24_000_000;
  const MAX_SIDE = 8192;
  const MAX_PREVIEW_SIDE = 2000;

  function readHeader(file) {
    return file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer().then(buffer => {
      const b = new Uint8Array(buffer);
      const u16 = i => (b[i] << 8) | b[i + 1];
      const u16le = i => b[i] | (b[i + 1] << 8);
      const u24le = i => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
      const u32le = i => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
      if (b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) {
        return { type: 'image/png', width: (b[16] * 0x1000000) + (b[17] << 16) + (b[18] << 8) + b[19], height: (b[20] * 0x1000000) + (b[21] << 16) + (b[22] << 8) + b[23] };
      }
      if (b.length >= 30 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') {
        const chunk = String.fromCharCode(...b.slice(12, 16));
        if (chunk === 'VP8X' && b.length >= 30) return { type: 'image/webp', width: u24le(24) + 1, height: u24le(27) + 1 };
        if (chunk === 'VP8L' && b.length >= 25 && b[20] === 0x2f) return { type: 'image/webp', width: 1 + (((b[22] & 0x3f) << 8) | b[21]), height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
        if (chunk === 'VP8 ' && b.length >= 30) return { type: 'image/webp', width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
        throw new Error('unsupportedImage');
      }
      if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('unsupportedImage');
      let width = 0, height = 0;
      for (let i = 2; i + 9 < b.length;) {
        if (b[i] !== 0xff) { i++; continue; }
        while (b[i] === 0xff) i++;
        const marker = b[i++];
        if (marker === 0xd9 || marker === 0xda) break;
        const length = u16(i);
        if (length < 2 || i + length > b.length) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          height = u16(i + 3); width = u16(i + 5); break;
        }
        i += length;
      }
      if (!width || !height) throw new Error('unsupportedImage');
      return { type: 'image/jpeg', width, height };
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('corruptImage')); };
      img.src = url;
    });
  }

  function previewCanvas(img) {
    const scale = Math.min(1, MAX_PREVIEW_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  WM.initImageLoader = function ({ onChange }) {
    const state = WM.state;
    const picker = document.getElementById('fileInput');
    const drop = document.getElementById('dropZone');
    const list = document.getElementById('thumbnails');
    const status = document.getElementById('importStatus');
    let loading = false;

    function message(key, detail) {
      status.textContent = WM.t(key) + (detail ? ' ' + detail : '');
    }
    function renderThumbnails() {
      list.replaceChildren();
      state.images.forEach(entry => {
        const item = document.createElement('div'); item.className = 'thumb' + (entry.id === state.activeId ? ' active' : '');
        const select = document.createElement('button'); select.type = 'button'; select.className = 'thumb-select'; select.setAttribute('aria-pressed', String(entry.id === state.activeId));
        const img = document.createElement('img'); img.src = entry.thumbUrl; img.alt = '';
        const label = document.createElement('span'); label.className = 'thumb-name'; label.textContent = entry.name;
        select.append(img, label); select.addEventListener('click', async () => { state.activeId = entry.id; await activate(entry); renderThumbnails(); onChange(); });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'thumb-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', WM.t('removeImage') + ': ' + entry.name);
        remove.addEventListener('click', () => { removeImage(entry.id); }); item.append(select, remove); list.append(item);
      });
      const count = document.getElementById('imageCount');
      if (count) count.textContent = state.images.length ? WM.t('imageCount').replace('{count}', String(state.images.length)) : '';
    }
    async function activate(entry) {
      state.images.forEach(image => { if (image !== entry && image.preview) { image.preview.width = 0; image.preview.height = 0; image.preview = null; } });
      if (entry.preview) return;
      const img = await loadImage(entry.file);
      if (!img.naturalWidth || img.naturalWidth > MAX_SIDE || img.naturalHeight > MAX_SIDE || img.naturalWidth * img.naturalHeight > MAX_PIXELS) throw new Error('imageTooLarge');
      entry.preview = previewCanvas(img);
      entry.width = img.naturalWidth; entry.height = img.naturalHeight;
    }
    async function addFiles(fileList) {
      if (loading || state.busy) return;
      loading = true;
      const candidates = Array.from(fileList);
      let added = 0;
      try {
        for (const file of candidates) {
          if (state.images.length >= MAX_FILES) { message('maxImages'); break; }
          if (file.size > MAX_FILE_BYTES) { message('fileTooLarge', file.name); continue; }
          if (state.images.reduce((sum, im) => sum + im.file.size, 0) + file.size > MAX_TOTAL_BYTES) { message('batchTooLarge', file.name); continue; }
          try {
            const header = await readHeader(file);
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(header.type)) throw new Error('unsupportedImage');
            if (header.width > MAX_SIDE || header.height > MAX_SIDE || header.width * header.height > MAX_PIXELS) throw new Error('imageTooLarge');
            const image = await loadImage(file);
            if (image.naturalWidth > MAX_SIDE || image.naturalHeight > MAX_SIDE || image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('imageTooLarge');
            const canvas = previewCanvas(image);
            const thumb = document.createElement('canvas');
            const scale = Math.min(1, 128 / Math.max(canvas.width, canvas.height));
            thumb.width = Math.max(1, Math.round(canvas.width * scale)); thumb.height = Math.max(1, Math.round(canvas.height * scale));
            thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
            const entry = { id: WM.makeImageId(), file, name: file.name, width: image.naturalWidth, height: image.naturalHeight, preview: state.activeId ? null : canvas, thumbUrl: thumb.toDataURL('image/jpeg', 0.78), watermark: WM.defaultWatermark() };
            if (entry.preview !== canvas) { canvas.width = 0; canvas.height = 0; }
            state.images.push(entry); added++;
            if (!state.activeId) state.activeId = entry.id;
          } catch (error) { message(error.message === 'imageTooLarge' ? 'imageTooLarge' : error.message === 'unsupportedImage' ? 'unsupportedImage' : 'corruptImage', file.name); }
        }
      } finally {
        loading = false; renderThumbnails();
        if (added) message('addedCount', String(added));
        onChange();
      }
    }
    async function removeImage(id) {
      const i = state.images.findIndex(entry => entry.id === id); if (i < 0) return;
      state.images.splice(i, 1);
      if (state.activeId === id) state.activeId = state.images[Math.max(0, i - 1)]?.id || null;
      const active = WM.getActiveImage(); if (active) { try { await activate(active); } catch (_) {} }
      renderThumbnails(); onChange();
    }
    picker.addEventListener('change', e => { addFiles(e.target.files); picker.value = ''; });
    drop.addEventListener('click', () => picker.click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } });
    ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('drag-over'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });
    document.getElementById('canvasArea').addEventListener('dragover', e => e.preventDefault());
    document.getElementById('canvasArea').addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });
    return { renderThumbnails, removeImage, activate };
  };
})();
