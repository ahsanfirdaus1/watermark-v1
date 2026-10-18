(function () {
  const state = WM.state;
  const canvas = document.getElementById('previewCanvas');
  const wrap = document.getElementById('canvasWrap');
  const empty = document.getElementById('emptyState');
  const apply = document.getElementById('applyAllBtn');
  const one = document.getElementById('downloadBtn');
  const all = document.getElementById('downloadAllBtn');
  const progress = document.getElementById('progressBar');
  const message = document.getElementById('exportMessage');
  const save = document.getElementById('saveLink');
  const dims = document.getElementById('dimensionSummary');
  let rafPending = false, loader;
  const textMeasure = document.createElement('canvas').getContext('2d');
  function updateClipWarning(active) {
    const warning = document.getElementById('clipWarning');
    if (!active) { warning.hidden = true; return; }
    const wm = active.watermark, w = canvas.width, h = canvas.height;
    const showText = (wm.mode === 'text' || wm.mode === 'both') && wm.text.content.trim();
    const showLogo = (wm.mode === 'logo' || wm.mode === 'both') && state.logoImage;
    const font = wm.text.size * w / 1000;
    textMeasure.font = font + 'px ' + wm.text.font;
    const textWidth = showText ? textMeasure.measureText(wm.text.content).width : 0;
    const textHeight = showText ? font * 1.2 : 0;
    const logoWidth = showLogo ? wm.logo.sizePct * w / 100 : 0;
    const logoHeight = showLogo ? logoWidth * state.logoImage.naturalHeight / state.logoImage.naturalWidth : 0;
    const gap = showText && showLogo ? font * 0.3 : 0;
    const boxWidth = Math.max(textWidth, logoWidth), boxHeight = textHeight + logoHeight + gap;
    const radians = wm.rotation * Math.PI / 180;
    const boundWidth = Math.abs(boxWidth * Math.cos(radians)) + Math.abs(boxHeight * Math.sin(radians));
    const boundHeight = Math.abs(boxWidth * Math.sin(radians)) + Math.abs(boxHeight * Math.cos(radians));
    const x = wm.position.x * w, y = wm.position.y * h;
    warning.hidden = x - boundWidth / 2 >= 0 && x + boundWidth / 2 <= w && y - boundHeight / 2 >= 0 && y + boundHeight / 2 <= h;
  }
  function hideOldExport() {
    save.hidden = true; message.textContent = '';
    if (state.exportUrl) URL.revokeObjectURL(state.exportUrl);
    state.exportUrl = null;
  }
  function render() {
    const active = WM.getActiveImage();
    if (!active || !active.preview) {
      wrap.classList.remove('has-image'); empty.hidden = false; canvas.hidden = true; canvas.width = 1; canvas.height = 1;
      dims.textContent = ''; document.getElementById('activeFilename').textContent = WM.t('emptyTitle'); return;
    }
    wrap.classList.add('has-image'); empty.hidden = true; canvas.hidden = false;
    WM.renderImageToCanvas(canvas, active, state.logoImage);
    updateClipWarning(active);
    document.getElementById('activeFilename').textContent = active.name;
    const scale = state.resolution === 'efficient' ? Math.min(1, 2000 / Math.max(active.width, active.height)) : 1;
    dims.textContent = Math.round(active.width * scale) + ' × ' + Math.round(active.height * scale) + ' px';
  }
  function scheduleRender() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); });
  }
  const drag = WM.initDragController({ canvas, getActiveWatermark: () => { const active = WM.getActiveImage(); return active ? active.watermark : null; }, onPositionChange: () => { updatePosition(); scheduleRender(); } });
  function updatePosition() {
    const active = WM.getActiveImage(); if (!active) return;
    document.getElementById('positionX').value = Math.round(active.watermark.position.x * 100);
    document.getElementById('positionY').value = Math.round(active.watermark.position.y * 100);
    const x = Math.round(active.watermark.position.x * 100), y = Math.round(active.watermark.position.y * 100);
    document.querySelectorAll('.pos-btn').forEach(btn => {
      const match = Math.abs(Number(btn.dataset.x) * 100 - x) <= 1 && Math.abs(Number(btn.dataset.y) * 100 - y) <= 1;
      btn.classList.toggle('active', match); btn.setAttribute('aria-pressed', String(match));
    });
  }
  const ui = WM.initControlsUI({ onChange: () => { hideOldExport(); updatePosition(); scheduleRender(); updateButtons(); }, clearPresetActive: () => drag.clearPresetActive() });
  loader = WM.initImageLoader({ onChange: () => {
    ui.syncFormFromState(); updatePosition(); hideOldExport(); scheduleRender(); updateButtons();
    const count = state.images.length; all.hidden = count < 2; one.hidden = count > 1;
  } });
  function validWatermark() {
    const active = WM.getActiveImage(); if (!active) return false;
    const wm = active.watermark;
    const hasText = (wm.mode === 'text' || wm.mode === 'both') && wm.text.content.trim().length > 0;
    const hasLogo = (wm.mode === 'logo' || wm.mode === 'both') && !!state.logoImage;
    return hasText || hasLogo;
  }
  function updateButtons() {
    const disabled = state.busy || !state.images.length || !validWatermark();
    one.disabled = disabled; all.disabled = disabled || state.images.length < 2; apply.disabled = state.busy || state.images.length < 2;
  }
  async function prepare(images) {
    if (state.busy || !validWatermark()) { message.textContent = WM.t('noWatermark'); return; }
    state.busy = true; document.body.classList.add('busy');
    const locked = Array.from(document.querySelectorAll('.app-main button, .app-main input, .app-main select, #resolutionSelect')).map(el => [el, el.disabled]);
    locked.forEach(([el]) => { el.disabled = true; });
    progress.hidden = false; progress.value = 0; hideOldExport(); updateButtons();
    try {
      const result = await WM.prepareExports(images, (done, total, percent) => { progress.value = percent == null ? (done / total) * 100 : percent; message.textContent = WM.t('processing') + ' ' + done + ' / ' + total; });
      state.exportUrl = URL.createObjectURL(result.blob); save.href = state.exportUrl; save.download = result.filename; save.hidden = false; message.textContent = WM.t('ready');
    } catch (error) {
      message.textContent = WM.t(error.message === 'size' ? 'exportFailed' : 'exportFailed');
    } finally { locked.forEach(([el, disabled]) => { el.disabled = disabled; }); state.busy = false; document.body.classList.remove('busy'); progress.hidden = true; progress.value = 0; updateButtons(); }
  }
  apply.addEventListener('click', () => { WM.applyToAll(); loader.renderThumbnails(); ui.syncFormFromState(); scheduleRender(); hideOldExport(); });
  one.addEventListener('click', () => { const active = WM.getActiveImage(); if (active) prepare([active]); });
  all.addEventListener('click', () => prepare(state.images.slice()));
  document.getElementById('resolutionSelect').addEventListener('change', event => { state.resolution = event.target.value === 'original' ? 'original' : 'efficient'; document.getElementById('exportMessage').textContent = state.resolution === 'original' ? WM.t('sizeWarning') : WM.t('efficientInfo'); hideOldExport(); scheduleRender(); });
  WM.refreshLanguage(); updateButtons();
})();
