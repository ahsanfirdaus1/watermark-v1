// Free-drag positioning via Pointer Events (unifies mouse, touch, and pen —
// the modern superset of touchstart/touchmove/touchend + mousedown/mousemove/mouseup)
// plus the 9-position preset grid.

window.WM = window.WM || {};

WM.initDragController = function initDragController({ canvas, getActiveWatermark, onPositionChange }) {
  let dragging = false;
  const posButtons = document.querySelectorAll('.pos-btn');
  const clearPresetActive = () => posButtons.forEach(b => b.classList.remove('active'));

  function clientToFraction(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const wm = getActiveWatermark();
    if (!wm) return;
    dragging = true;
    canvas.classList.add('dragging');
    clearPresetActive();
    const { x, y } = clientToFraction(e.clientX, e.clientY);
    wm.position.x = x;
    wm.position.y = y;
    canvas.focus({ preventScroll: true });
    onPositionChange();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const wm = getActiveWatermark();
    if (!wm) return;
    const { x, y } = clientToFraction(e.clientX, e.clientY);
    wm.position.x = x;
    wm.position.y = y;
    onPositionChange();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('keydown', (e) => {
    const wm = getActiveWatermark(); if (!wm) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault(); wm.position.x = Math.min(1, Math.max(0, wm.position.x + delta[0])); wm.position.y = Math.min(1, Math.max(0, wm.position.y + delta[1])); onPositionChange();
  });

  // Preset position grid
  posButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const wm = getActiveWatermark();
      if (!wm) return;
      wm.position.x = parseFloat(btn.dataset.x);
      wm.position.y = parseFloat(btn.dataset.y);
      clearPresetActive();
      btn.classList.add('active');
      posButtons.forEach(item => item.setAttribute('aria-pressed', String(item === btn)));
      onPositionChange();
    });
  });

  return { clearPresetActive };
};
