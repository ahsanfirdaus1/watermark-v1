window.WM = window.WM || {};

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ image: img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

WM.initControlsUI = function initControlsUI({ onChange, clearPresetActive }) {
  const state = WM.state;
  const getActiveImage = WM.getActiveImage;
  const defaultWatermark = WM.defaultWatermark;
  const els = {
    seg: document.querySelectorAll('.seg-btn'),
    textControls: document.getElementById('textControls'),
    logoControls: document.getElementById('logoControls'),
    textInput: document.getElementById('textInput'),
    fontSelect: document.getElementById('fontSelect'),
    colorInput: document.getElementById('colorInput'),
    textSizeInput: document.getElementById('textSizeInput'),
    textSizeValue: document.getElementById('textSizeValue'),
    logoInput: document.getElementById('logoInput'),
    logoPreview: document.getElementById('logoPreview'),
    logoPreviewImg: document.getElementById('logoPreviewImg'),
    logoSizeInput: document.getElementById('logoSizeInput'),
    logoSizeValue: document.getElementById('logoSizeValue'),
    opacityInput: document.getElementById('opacityInput'),
    opacityValue: document.getElementById('opacityValue'),
    rotationInput: document.getElementById('rotationInput'),
    rotationValue: document.getElementById('rotationValue'),
    resetBtn: document.getElementById('resetBtn'),
    sheetHandle: document.getElementById('sheetHandle'),
    controlsPanel: document.getElementById('controlsPanel'),
    positionX: document.getElementById('positionX'),
    positionY: document.getElementById('positionY'),
  };

  function wm() {
    const active = getActiveImage();
    return active ? active.watermark : null;
  }

  // Reflect the active image's current watermark settings into the form controls.
  function syncFormFromState() {
    const w = wm();
    if (!w) return;
    els.seg.forEach(b => b.classList.toggle('active', b.dataset.mode === w.mode));
    els.seg.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === w.mode)));
    els.textControls.hidden = w.mode === 'logo';
    els.logoControls.hidden = w.mode === 'text';

    els.textInput.value = w.text.content;
    els.fontSelect.value = w.text.font;
    els.colorInput.value = w.text.color;
    els.textSizeInput.value = w.text.size;
    els.textSizeValue.textContent = w.text.size;

    els.logoSizeInput.value = w.logo.sizePct;
    els.logoSizeValue.textContent = w.logo.sizePct + '%';

    els.opacityInput.value = w.opacity;
    els.opacityValue.textContent = w.opacity + '%';
    els.rotationInput.value = w.rotation;
    els.rotationValue.textContent = w.rotation + '°';
    els.positionX.value = Math.round(w.position.x * 100);
    els.positionY.value = Math.round(w.position.y * 100);
  }

  els.seg.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = wm();
      if (!w) return;
      w.mode = btn.dataset.mode;
      els.seg.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      els.seg.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      els.textControls.hidden = w.mode === 'logo';
      els.logoControls.hidden = w.mode === 'text';
      onChange();
    });
  });

  els.textInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.text.content = els.textInput.value;
    onChange();
  });
  els.fontSelect.addEventListener('change', () => {
    const w = wm(); if (!w) return;
    w.text.font = els.fontSelect.value;
    onChange();
  });
  els.colorInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.text.color = els.colorInput.value;
    onChange();
  });
  els.textSizeInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.text.size = parseFloat(els.textSizeInput.value);
    els.textSizeValue.textContent = w.text.size;
    onChange();
  });

  els.logoInput.addEventListener('change', async () => {
    const file = els.logoInput.files[0];
    if (!file) return;
    let loaded = null;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('logoTooLarge');
      loaded = await loadImageFromFile(file); const img = loaded.image;
      if (img.naturalWidth * img.naturalHeight > 4_000_000) throw new Error('logoTooLarge');
      if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
      state.logoImage = img;
      state.logoFile = file;
      state.logoUrl = loaded.url;
      els.logoPreview.hidden = false;
      els.logoPreviewImg.src = img.src;
      document.getElementById('exportMessage').textContent = '';
      onChange();
    } catch (err) {
      if (loaded) URL.revokeObjectURL(loaded.url);
      document.getElementById('exportMessage').textContent = WM.t(err.message === 'logoTooLarge' ? 'logoTooLarge' : 'logoFailed');
    }
    els.logoInput.value = '';
  });
  document.getElementById('removeLogoBtn').addEventListener('click', () => {
    if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
    state.logoUrl = null; state.logoImage = null; state.logoFile = null;
    els.logoPreview.hidden = true; els.logoPreviewImg.removeAttribute('src'); onChange();
  });
  els.logoSizeInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.logo.sizePct = parseFloat(els.logoSizeInput.value);
    els.logoSizeValue.textContent = w.logo.sizePct + '%';
    onChange();
  });

  els.opacityInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.opacity = parseFloat(els.opacityInput.value);
    els.opacityValue.textContent = w.opacity + '%';
    onChange();
  });
  els.rotationInput.addEventListener('input', () => {
    const w = wm(); if (!w) return;
    w.rotation = parseFloat(els.rotationInput.value);
    els.rotationValue.textContent = w.rotation + '°';
    onChange();
  });

  [els.positionX, els.positionY].forEach((input, index) => input.addEventListener('change', () => {
    const w = wm(); if (!w) return;
    w.position[index ? 'y' : 'x'] = Math.min(100, Math.max(0, Number(input.value) || 0)) / 100;
    input.value = Math.round(w.position[index ? 'y' : 'x'] * 100); onChange();
  }));

  els.resetBtn.addEventListener('click', () => {
    const active = getActiveImage();
    if (!active) return;
    active.watermark = defaultWatermark();
    clearPresetActive();
    syncFormFromState();
    onChange();
  });

  // Bottom-sheet collapse toggle (mobile only — hidden via CSS on desktop)
  els.sheetHandle?.addEventListener('click', () => {
    const collapsed = els.controlsPanel.classList.toggle('collapsed');
    els.sheetHandle.setAttribute('aria-expanded', String(!collapsed));
  });

  document.getElementById('languageSelect').addEventListener('change', event => {
    state.locale = event.target.value === 'en' ? 'en' : 'id';
    WM.refreshLanguage(); syncFormFromState(); onChange();
  });

  return { syncFormFromState };
};
