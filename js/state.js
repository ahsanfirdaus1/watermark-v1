// Central application state. No persistence — everything lives in memory
// for the session only, per the "nothing is retained" privacy requirement.
//
// Plain global-namespace script (not an ES module) so the app also works
// when index.html is opened directly via file:// (double-click), where
// browsers block ES module loading under CORS.

window.WM = window.WM || {};

WM.defaultWatermark = function defaultWatermark() {
  return {
    mode: 'text', // 'text' | 'logo' | 'both'
    text: {
      content: 'SAMPLE',
      font: "Arial, Helvetica, sans-serif",
      color: '#ffffff',
      size: 48, // px, relative to a 1000px-wide reference canvas; scaled per image
    },
    logo: {
      img: null,        // HTMLImageElement (decoded logo, shared across images)
      sizePct: 25,       // logo width as % of canvas width
    },
    opacity: 70,   // 0-100
    rotation: 0,   // degrees
    position: { x: 0.5, y: 0.5 }, // fractional canvas coords (0-1)
  };
};

WM.cloneWatermark = function cloneWatermark(wm) {
  return {
    mode: wm.mode,
    text: { ...wm.text },
    logo: { ...wm.logo },
    opacity: wm.opacity,
    rotation: wm.rotation,
    position: { ...wm.position },
  };
};

WM.state = {
  images: [],       // { id, file, preview, dimensions, thumbnail, watermark }
  activeId: null,
  logoImage: null,  // decoded HTMLImageElement for the logo, shared across all images
  logoFile: null,
  dragState: null,  // transient drag info, not persisted
  logoUrl: null,
  locale: 'id',
  resolution: 'efficient',
  busy: false,
  exportUrl: null,
};

WM.messages = {
  id: { skip:'Lewati ke pengaturan', tagline:'Dokumen dan foto. Diproses di perangkat.', languageLabel:'Bahasa', stepOne:'LANGKAH 1 · PILIH GAMBAR', addImages:'Tambah gambar', dropHint:'Pilih gambar atau tarik file ke sini', stepTwo:'LANGKAH 2 · ATUR WATERMARK', emptyTitle:'Tambahkan gambar untuk memulai', localBadge:'Lokal', emptyHelp:'PNG, JPG, atau WebP. Maksimal 10 gambar; ukuran asli tersedia saat ekspor.', chooseImages:'Pilih gambar', previewHelp:'Geser watermark pada pratinjau atau atur posisi di bawah. Tombol panah juga bisa digunakan.', stepThree:'LANGKAH 3 · TINJAU DAN SIMPAN', settingsTitle:'Pengaturan watermark', modeLabel:'Jenis watermark', textMode:'Teks', logoMode:'Logo', bothMode:'Keduanya', textLabel:'Teks watermark', textHelp:'Tulis tujuan gambar akan dibagikan.', logoForAll:'Logo untuk semua gambar', logoHelp:'PNG transparan disarankan. Batas ukuran 8 MiB.', logoSize:'Ukuran logo', opacity:'Opasitas', position:'Posisi', dragHelp:'Geser watermark pada pratinjau atau gunakan tombol panah.', clipWarning:'Sebagian watermark berada di luar gambar.', advanced:'Pengaturan lanjutan', font:'Font', color:'Warna', textSize:'Ukuran teks', rotation:'Rotasi', reset:'Reset gambar ini', applyAll:'Terapkan ke semua', outputSize:'Ukuran hasil', efficient:'Hemat · maks. 2.000 px', original:'Ukuran asli', prepare:'Siapkan gambar', prepareAll:'Siapkan ZIP', saveResult:'Simpan hasil', privacy:'Gambar diproses di perangkat dan tidak diunggah oleh aplikasi.', hostNote:'GitHub Pages mencatat alamat IP pengunjung untuk keamanan situs. Gambar tetap diproses oleh browser di perangkatmu.', removeImage:'Hapus gambar', imageCount:'{count} gambar dipilih.', maxImages:'Maksimal 10 gambar.', fileTooLarge:'Ukuran file melebihi 20 MiB:', batchTooLarge:'Total file melebihi 80 MiB:', imageTooLarge:'Dimensi gambar melebihi batas 24 MP / 8192 px:', unsupportedImage:'Format tidak didukung (gunakan PNG, JPG, atau WebP):', corruptImage:'Gambar rusak atau tidak dapat dibaca:', addedCount:'Gambar berhasil ditambahkan:', logoTooLarge:'Logo melebihi batas ukuran atau dimensi.', logoFailed:'Logo tidak dapat dibaca. Gunakan PNG, JPG, atau WebP.', noWatermark:'Isi teks atau pilih logo sebelum mengekspor.', processing:'Memproses', packing:'Menyusun ZIP…', ready:'Hasil siap diunduh.', exportFailed:'Ekspor gagal. Coba ukuran hemat atau kurangi jumlah gambar.', sizeWarning:'Ukuran asli memakai memori lebih besar dan bisa gagal pada perangkat dengan RAM terbatas.', efficientInfo:'Ukuran hemat membatasi sisi terpanjang hingga 2.000 px.', positionX:'Posisi horizontal watermark dalam persen.', positionY:'Posisi vertikal watermark dalam persen.' },
  en: { skip:'Skip to settings', tagline:'Documents and photos. Processed on your device.', languageLabel:'Language', stepOne:'STEP 1 · CHOOSE IMAGES', addImages:'Add images', dropHint:'Choose images or drop files here', stepTwo:'STEP 2 · SET WATERMARK', emptyTitle:'Add images to get started', localBadge:'Local', emptyHelp:'PNG, JPG, or WebP. Up to 10 images; choose original size when exporting.', chooseImages:'Choose images', previewHelp:'Drag the watermark on the preview or set its position below. Arrow keys work too.', stepThree:'STEP 3 · REVIEW AND SAVE', settingsTitle:'Watermark settings', modeLabel:'Watermark type', textMode:'Text', logoMode:'Logo', bothMode:'Both', textLabel:'Watermark text', textHelp:'Enter the intended use of the image.', logoForAll:'Logo for all images', logoHelp:'Transparent PNG recommended. 8 MiB size limit.', logoSize:'Logo size', opacity:'Opacity', position:'Position', dragHelp:'Drag the watermark on the preview or use arrow keys.', clipWarning:'Part of the watermark is outside the image.', advanced:'Advanced settings', font:'Font', color:'Color', textSize:'Text size', rotation:'Rotation', reset:'Reset this image', applyAll:'Apply to all', outputSize:'Output size', efficient:'Efficient · max 2,000 px', original:'Original size', prepare:'Prepare image', prepareAll:'Prepare ZIP', saveResult:'Save result', privacy:'Images are processed on your device and are not uploaded by this app.', hostNote:'GitHub Pages records visitor IP addresses for site security. Images are still processed by your browser on your device.', removeImage:'Remove image', imageCount:'{count} images selected.', maxImages:'Maximum 10 images.', fileTooLarge:'File exceeds 20 MiB:', batchTooLarge:'Total files exceed 80 MiB:', imageTooLarge:'Image exceeds the 24 MP / 8192 px limit:', unsupportedImage:'Unsupported format (use PNG, JPG, or WebP):', corruptImage:'Image is damaged or cannot be read:', addedCount:'Images added:', logoTooLarge:'Logo exceeds size or dimension limits.', logoFailed:'Logo could not be read. Use PNG, JPG, or WebP.', noWatermark:'Enter text or choose a logo before exporting.', processing:'Processing', packing:'Creating ZIP…', ready:'Your result is ready to download.', exportFailed:'Export failed. Try efficient size or fewer images.', sizeWarning:'Original size uses more memory and may fail on devices with limited RAM.', efficientInfo:'Efficient size limits the longest side to 2,000 px.', positionX:'Horizontal watermark position in percent.', positionY:'Vertical watermark position in percent.' }
};
WM.t = function (key) { return (WM.messages[WM.state.locale] || WM.messages.id)[key] || key; };
WM.refreshLanguage = function () {
  document.documentElement.lang = WM.state.locale;
  document.querySelectorAll('[data-i18n]').forEach(el => { const text = WM.t(el.dataset.i18n); if (text !== el.dataset.i18n) el.textContent = text; });
};

let wmNextId = 1;
WM.makeImageId = function makeImageId() {
  return 'img-' + (wmNextId++);
};

WM.getActiveImage = function getActiveImage() {
  return WM.state.images.find(im => im.id === WM.state.activeId) || null;
};
