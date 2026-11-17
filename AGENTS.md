# watermark-v1

Follows the workspace rules in `../AGENTS.md` (read them; Codex does not auto-load parent folders).

## Product
- What it is: editor watermark statis untuk foto dan hasil pindai dokumen. Semua pemrosesan di browser, tanpa unggah, akun, analitik, atau penyimpanan lokal.
- Audience / ICP: belum didokumentasikan di repo. Isi bila sudah diputuskan.
- Offer / goal: alat gratis (belum ada penawaran atau penjualan di repo). Bukan produk Meta ads, jadi `docs/ads.md` tidak dibuat.
- Stack: HTML, CSS, vanilla JavaScript. Tanpa build step atau framework. JSZip lokal di `lib/jszip.min.js`.
- Hosting / domain: GitHub Pages, https://ahsanfirdaus1.github.io/watermark-v1/ (sumber deploy Pages belum diverifikasi)
- Repo: github.com/ahsanfirdaus1/watermark-v1 (private). AhsanOS note: belum ada.

## Commands
- Install: tidak ada
- Dev: buka `index.html` di browser, atau sajikan folder sebagai situs statis
- Test: tidak ada test suite aplikasi. Harness audit ada di `docs/audit-2026-10-19/` (Node + Playwright + Python/Pillow, lihat README di sana)
- Build/deploy: tidak ada build. Deploy = push ke `main`, GitHub Pages melayani. Push butuh persetujuan Ahsan.

## Peta file
- `index.html`: struktur dan CSP meta (hanya skrip lokal)
- `css/styles.css`: layout mobile-first dan tema
- `js/state.js`: state sesi dan teks UI ID/EN
- `js/imageLoader.js`: validasi, dekode, pratinjau, batch
- `js/renderer.js`: komposisi canvas
- `js/dragController.js`, `js/controlsUI.js`: interaksi editor
- `js/batch.js`: ekspor PNG dan ZIP
- `js/main.js`: penghubung
- `PRD/`: PRD asli (docx, pdf), jangan diedit
- `docs/audit-2026-10-19/`: audit, spesifikasi implementasi, prototype redesign, bukti uji

## Notes / decisions
- Batas: maks 10 gambar, 20 MiB per gambar, 80 MiB total, 24 MP dan 8.192 px per sisi, logo 8 MiB dan 4 MP, hasil PNG 64 MiB per pekerjaan.
- Jangan menambah permintaan jaringan, analitik, atau penyimpanan lokal: itu melanggar klaim privasi di README.
- Audit 2026-10-19 menemukan 15 FAIL dari 47 pemeriksaan. Perbaikan belum diterapkan; acuannya `docs/audit-2026-10-19/IMPLEMENTATION-SPEC.md`. Preferensi terbaru (bilingual ID/EN, pilihan kualitas ekspor, Android kelas menengah, batch 1-10) menggantikan PRD Juli 2026 bila berbeda.
- Status live GitHub Pages belum terverifikasi saat audit.
- Tema (sejak Nov 2026): dark saja. Hitam `#000`, putih, aksen oranye `#f97316`, gradient `#f97316` ke `#ca8a04` hanya untuk brand mark, ikon empty state, dan tombol utama. Teks di atas gradient wajib hitam (putih hanya 2,8:1). Semua warna lewat token di `:root` pada `css/styles.css`.
- Rencana fitur compressor: halaman `compress.html` dengan dua mode, "KTP / ID" (target KB, satu file, lantai kualitas) dan "Gambar lain" (slider kualitas, JPG/WebP, batch 10 + ZIP). PDF belum masuk cakupan. Sumber awal: file HTML buatan Gemini di Downloads (tidak ada di repo).
