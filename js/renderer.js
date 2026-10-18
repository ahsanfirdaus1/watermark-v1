// Canvas compositing: draws the base image plus the text/logo watermark.
// Text size is expressed relative to a 1000px-wide reference canvas so that
// "Apply to All" looks visually consistent across images of different resolutions.

window.WM = window.WM || {};

(function () {
  const REFERENCE_WIDTH = 1000;

  function drawWatermark(ctx, canvas, watermark, logoImage) {
    const refScale = canvas.width / REFERENCE_WIDTH;
    ctx.save();
    ctx.globalAlpha = watermark.opacity / 100;

    const anchorX = watermark.position.x * canvas.width;
    const anchorY = watermark.position.y * canvas.height;
    ctx.translate(anchorX, anchorY);
    ctx.rotate((watermark.rotation * Math.PI) / 180);

    const showText = (watermark.mode === 'text' || watermark.mode === 'both') && watermark.text.content;
    const showLogo = (watermark.mode === 'logo' || watermark.mode === 'both') && logoImage;

    const fontPx = Math.max(1, watermark.text.size * refScale);
    let logoW = 0, logoH = 0;
    if (showLogo) {
      logoW = (watermark.logo.sizePct / 100) * canvas.width;
      logoH = logoW * (logoImage.naturalHeight / logoImage.naturalWidth);
    }

    ctx.font = `${fontPx}px ${watermark.text.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textH = showText ? fontPx * 1.2 : 0;

    const gap = showText && showLogo ? fontPx * 0.3 : 0;
    const totalH = (showLogo ? logoH : 0) + gap + (showText ? textH : 0);

    let cursorY = -totalH / 2;

    if (showLogo) {
      ctx.drawImage(logoImage, -logoW / 2, cursorY, logoW, logoH);
      cursorY += logoH + gap;
    }
    if (showText) {
      const textCenterY = cursorY + textH / 2;
      ctx.fillStyle = watermark.text.color;
      ctx.fillText(watermark.text.content, 0, textCenterY);
    }

    ctx.restore();
  }

  WM.renderImageToCanvas = function renderImageToCanvas(canvas, imageEntry, logoImage, source) {
    const image = source || imageEntry.preview;
    if (!image) return canvas;
    if (!source && (canvas.width !== image.width || canvas.height !== image.height)) {
      canvas.width = image.width;
      canvas.height = image.height;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas, imageEntry.watermark, logoImage);
    return canvas;
  };
})();
