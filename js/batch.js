window.WM = window.WM || {};
(function () {
  const MAX_PIXELS = 24_000_000, MAX_SIDE = 8192, MAX_OUTPUT = 64 * 1024 * 1024;
  const sleep = () => new Promise(resolve => setTimeout(resolve, 0));
  function load(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function toBlob(canvas) {
    return new Promise((resolve, reject) => {
      try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('encode')), 'image/png'); }
      catch (error) { reject(error); }
    });
  }
  function safeBase(name) {
    const base = name.replace(/\.[^.]*$/, '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.+$/g, '').trim().slice(0, 100);
    return base || 'image';
  }
  function uniqueName(name, used) {
    const root = safeBase(name) + '-watermarked'; let candidate = root + '.png', i = 2;
    while (used.has(candidate.toLocaleLowerCase())) candidate = root + '-' + i++ + '.png';
    used.add(candidate.toLocaleLowerCase()); return candidate;
  }
  WM.applyToAll = function () {
    const active = WM.getActiveImage(); if (!active) return;
    const copy = WM.cloneWatermark(active.watermark);
    WM.state.images.forEach(image => { if (image.id !== active.id) image.watermark = WM.cloneWatermark(copy); });
  };
  WM.prepareExports = async function (images, onProgress) {
    const state = WM.state, used = new Set(), results = []; let totalBytes = 0;
    try {
      for (let i = 0; i < images.length; i++) {
        const entry = images[i], image = await load(entry.file);
        const w = image.naturalWidth, h = image.naturalHeight;
        if (!w || !h || w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS) throw new Error('decode');
        const scale = state.resolution === 'efficient' ? Math.min(1, 2000 / Math.max(w, h)) : 1;
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
        WM.renderImageToCanvas(canvas, entry, state.logoImage, image);
        const blob = await toBlob(canvas); totalBytes += blob.size;
        if (totalBytes > MAX_OUTPUT) throw new Error('size');
        results.push({ name: uniqueName(entry.name, used), blob });
        canvas.width = 0; canvas.height = 0; onProgress(i + 1, images.length); await sleep();
      }
      if (results.length === 1) return { blob: results[0].blob, filename: results[0].name };
      if (typeof window.JSZip !== 'function') throw new Error('zip');
      const zip = new window.JSZip(); results.forEach(item => zip.file(item.name, item.blob));
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, meta => onProgress(images.length, images.length, meta.percent));
      return { blob, filename: 'watermarked-images.zip' };
    } finally { results.forEach(item => { item.blob = null; }); }
  };
})();
