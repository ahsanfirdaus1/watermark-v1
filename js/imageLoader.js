window.WM = window.WM || {};

(function () {
  const MAX_DIMENSION = 2000; // auto-downscale cap for canvas performance

  function downscaleToCanvas(img) {
    let { naturalWidth: w, naturalHeight: h } = img;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  WM.initImageLoader = function initImageLoader({ onChange }) {
    const state = WM.state;
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const thumbnailsEl = document.getElementById('thumbnails');

    async function addFiles(fileList) {
      const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        try {
          const img = await loadImageFile(file);
          const canvas = downscaleToCanvas(img);
          const thumbCanvas = document.createElement('canvas');
          const THUMB = 140;
          const scale = THUMB / Math.max(canvas.width, canvas.height);
          thumbCanvas.width = Math.round(canvas.width * scale);
          thumbCanvas.height = Math.round(canvas.height * scale);
          thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

          const entry = {
            id: WM.makeImageId(),
            name: file.name,
            canvas,
            width: canvas.width,
            height: canvas.height,
            thumbUrl: thumbCanvas.toDataURL('image/jpeg', 0.8),
            watermark: WM.defaultWatermark(),
          };
          state.images.push(entry);
          if (!state.activeId) state.activeId = entry.id;
        } catch (err) {
          console.error('Failed to load image', file.name, err);
        }
      }
      renderThumbnails();
      onChange();
    }

    function renderThumbnails() {
      thumbnailsEl.innerHTML = '';
      for (const im of state.images) {
        const thumb = document.createElement('div');
        thumb.className = 'thumb' + (im.id === state.activeId ? ' active' : '');
        thumb.dataset.id = im.id;

        const img = document.createElement('img');
        img.src = im.thumbUrl;
        img.alt = im.name;
        thumb.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'thumb-remove';
        removeBtn.setAttribute('aria-label', 'Remove image');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeImage(im.id);
        });
        thumb.appendChild(removeBtn);

        thumb.addEventListener('click', () => {
          state.activeId = im.id;
          renderThumbnails();
          onChange();
        });

        thumbnailsEl.appendChild(thumb);
      }
    }

    function removeImage(id) {
      const idx = state.images.findIndex(im => im.id === id);
      if (idx === -1) return;
      state.images.splice(idx, 1);
      if (state.activeId === id) {
        state.activeId = state.images.length ? state.images[Math.max(0, idx - 1)].id : null;
      }
      renderThumbnails();
      onChange();
    }

    fileInput.addEventListener('change', (e) => {
      addFiles(e.target.files);
      fileInput.value = '';
    });

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    });

    // Allow dropping anywhere on the canvas area too
    const canvasArea = document.getElementById('canvasArea');
    ['dragenter', 'dragover'].forEach(evt => {
      canvasArea.addEventListener(evt, (e) => e.preventDefault());
    });
    canvasArea.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    });

    return { renderThumbnails, removeImage };
  };
})();
