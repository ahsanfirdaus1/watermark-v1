window.WM = window.WM || {};

(function () {
  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  function baseName(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  WM.applyToAll = function applyToAll() {
    const state = WM.state;
    const active = WM.getActiveImage();
    if (!active) return;
    const cloned = WM.cloneWatermark(active.watermark);
    for (const im of state.images) {
      if (im.id === active.id) continue;
      im.watermark = WM.cloneWatermark(cloned);
    }
  };

  WM.downloadCurrent = async function downloadCurrent() {
    const state = WM.state;
    const active = WM.getActiveImage();
    if (!active) return;
    const off = document.createElement('canvas');
    WM.renderImageToCanvas(off, active, state.logoImage);
    const blob = await canvasToBlob(off);
    triggerDownload(blob, `${baseName(active.name)}-watermarked.png`);
  };

  WM.downloadAll = async function downloadAll({ onProgress } = {}) {
    const state = WM.state;
    const images = state.images;
    if (!images.length) return;

    const total = images.length;
    const rendered = [];

    for (let i = 0; i < total; i++) {
      const im = images[i];
      const off = document.createElement('canvas');
      WM.renderImageToCanvas(off, im, state.logoImage);
      const blob = await canvasToBlob(off);
      rendered.push({ name: `${baseName(im.name)}-watermarked.png`, blob });
      if (onProgress) onProgress(i + 1, total);
      // Yield to the UI thread between images so it stays responsive.
      await sleep(0);
    }

    if (total === 1) {
      triggerDownload(rendered[0].blob, rendered[0].name);
      return;
    }

    if (typeof window.JSZip === 'function') {
      try {
        const zip = new window.JSZip();
        for (const { name, blob } of rendered) {
          zip.file(name, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerDownload(zipBlob, 'watermarked-images.zip');
        return;
      } catch (err) {
        console.error('Zip generation failed, falling back to individual downloads.', err);
      }
    }

    // Fallback: per-image downloads with a small stagger so browsers don't
    // block them as a burst of popups.
    for (const { name, blob } of rendered) {
      triggerDownload(blob, name);
      await sleep(300);
    }
  };
})();
