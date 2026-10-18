# Watermark

Editor watermark statis untuk foto dan hasil pindai dokumen. File dipilih dan diproses di browser; aplikasi tidak mengunggah gambar ke layanan pemrosesan.

**[Buka aplikasi](https://ahsanfirdaus1.github.io/watermark-v1/)**

## Cara pakai

1. Pilih hingga 10 gambar PNG, JPG, atau WebP.
2. Atur teks atau logo, lalu geser watermark atau gunakan tombol posisi dan panah keyboard.
3. Pilih ukuran hemat (maksimal 2.000 px pada sisi terpanjang) atau ukuran asli, lalu siapkan hasil.
4. Simpan satu PNG atau ZIP untuk beberapa gambar.

Semua tombol dapat digunakan dengan keyboard. Bahasa Indonesia menjadi pilihan awal; pilihan Indonesia/Inggris hanya berlaku selama halaman terbuka.

## Batas perangkat

- Maksimal 20 MiB per gambar dan 80 MiB total; paling banyak 10 gambar.
- Dimensi gambar dibatasi hingga 24 MP dan 8.192 px per sisi.
- Logo dibatasi hingga 8 MiB dan 4 MP.
- Hasil PNG dibatasi hingga 64 MiB per pekerjaan. Pilihan ukuran asli memakai lebih banyak memori dan dapat gagal pada perangkat dengan RAM terbatas.

## Privasi dan keamanan

Pemrosesan berlangsung di browser, tanpa akun, analitik, penyimpanan lokal, atau permintaan jaringan dari aplikasi. Hasil diekspor sebagai PNG sehingga metadata sumber seperti EXIF tidak disalin. GitHub Pages tetap menerima koneksi pengunjung dan dapat mencatat alamat IP untuk operasi dan keamanan hosting. Untuk dokumen yang sangat sensitif, pengguna dapat memutus jaringan setelah aplikasi selesai dimuat.

Halaman memasang kebijakan CSP berbasis meta dan hanya memuat skrip lokal. GitHub Pages tidak menyediakan konfigurasi header HTTP khusus untuk proyek ini, jadi kebijakan tersebut tidak menggantikan header keamanan yang biasanya dikonfigurasi oleh server sendiri.

## Pengembangan

Tidak ada build step atau framework. Buka `index.html` di browser modern atau sajikan folder ini sebagai situs statis. JSZip tersedia sebagai salinan lokal di `lib/jszip.min.js`.

File utama:

- `index.html` — struktur dan kebijakan halaman
- `css/styles.css` — layout mobile-first dan tema
- `js/state.js` — state sesi dan teks UI dua bahasa
- `js/imageLoader.js` — validasi, dekode, pratinjau, dan batch gambar
- `js/renderer.js` — komposisi canvas
- `js/dragController.js` dan `js/controlsUI.js` — interaksi editor
- `js/batch.js` — PNG dan ZIP
- `js/main.js` — penghubung aplikasi

## Referensi

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [Canvas `toBlob()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [JSZip](https://stuk.github.io/jszip/)
