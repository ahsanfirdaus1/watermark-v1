(function () {
  const state = WM.state;
  const getActiveImage = WM.getActiveImage;

  const previewCanvas = document.getElementById('previewCanvas');
  const canvasWrap = document.getElementById('canvasWrap');
  const applyAllBtn = document.getElementById('applyAllBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const progressOverlay = document.getElementById('progressOverlay');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');

  let rafPending = false;
  function render() {
    const active = getActiveImage();
    if (!active) {
      canvasWrap.classList.remove('has-image');
      return;
    }
    canvasWrap.classList.add('has-image');
    WM.renderImageToCanvas(previewCanvas, active, state.logoImage);
  }
  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    const run = () => {
      if (!rafPending) return;
      rafPending = false;
      render();
    };
    requestAnimationFrame(run);
    // Backstop: rAF is suspended while the tab/page is hidden (backgrounded),
    // but canvas redraws here are cheap, so don't let a hidden tab stall the preview.
    setTimeout(run, 50);
  }

  const dragController = WM.initDragController({
    canvas: previewCanvas,
    getActiveWatermark: () => {
      const active = getActiveImage();
      return active ? active.watermark : null;
    },
    onPositionChange: scheduleRender,
  });

  const controlsUI = WM.initControlsUI({
    onChange: scheduleRender,
    clearPresetActive: () => dragController.clearPresetActive(),
  });

  WM.initImageLoader({
    onChange: () => {
      controlsUI.syncFormFromState();
      scheduleRender();
      updateActionButtons();
    },
  });

  function updateActionButtons() {
    const hasImages = state.images.length > 0;
    const multiple = state.images.length > 1;
    applyAllBtn.disabled = !multiple;
    downloadBtn.disabled = !hasImages;
    downloadAllBtn.disabled = !hasImages;
  }

  applyAllBtn.addEventListener('click', () => {
    WM.applyToAll();
  });

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    try {
      await WM.downloadCurrent();
    } finally {
      downloadBtn.disabled = state.images.length === 0;
    }
  });

  downloadAllBtn.addEventListener('click', async () => {
    downloadAllBtn.disabled = true;
    progressOverlay.hidden = false;
    try {
      await WM.downloadAll({
        onProgress: (done, total) => {
          progressText.textContent = `Processing ${done} / ${total}…`;
          progressFill.style.width = `${(done / total) * 100}%`;
        },
      });
    } finally {
      progressOverlay.hidden = true;
      progressFill.style.width = '0%';
      downloadAllBtn.disabled = state.images.length === 0;
    }
  });

  updateActionButtons();
})();
