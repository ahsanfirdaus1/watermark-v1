# Paket audit dan rancangan Watermark

19 Oktober 2026 • baseline Git `09f6ae06c3667f0e0757a6b7e098cede13cb7739`.

1. Baca [laporan audit](AUDIT.md): 20 temuan berprioritas, bukti reproduksi, serta sumber resmi.
2. Buka [prototype interaktif](redesign-prototype.html) di browser: layout mobile/desktop, ID/EN, mode teks/logo, kualitas, contoh per gambar, reset/apply, kondisi kosong, dan simulasi unduh.
3. Gunakan [spesifikasi implementasi](IMPLEMENTATION-SPEC.md) untuk perbaikan aplikasi berikutnya; mencakup kontrak internal, kebijakan resource, keamanan, dan 18 kelompok acceptance criteria.

**Hasil tahap ini berupa dokumen, mockup, harness dan bukti. Aplikasi existing belum diperbaiki dan deployment belum diubah.** Prototype hanya memakai contoh sintetis; bukan editor, uploader, atau encoder produksi. Tidak ada fitur baru yang dipilih di luar bilingual dan pilihan ukuran yang sudah disepakati. PRD asli tidak diedit.

## Bukti

| Berkas | Isi |
|---|---|
| [results.json](evidence/results.json) | 47 pemeriksaan: 28 PASS, 15 FAIL, 3 OBSERVATION, 1 UNVERIFIED; versi engine, request, error, hash sumber |
| [artifact-inspection.json](evidence/artifact-inspection.json) | Daftar entri ZIP, dimensi/metadata PNG, marker sumber, dan verifikasi hash aplikasi |
| [prototype-qa.json](evidence/prototype-qa.json) | 23 pemeriksaan prototype: seluruhnya lulus |
| [Mobile lama](evidence/current-mobile-editor.png) / [desktop lama](evidence/current-desktop-editor.png) | Screenshot kode baseline |
| [Mobile redesign](evidence/redesign-mobile-viewport.png) / [desktop redesign](evidence/redesign-desktop-viewport.png) | Screenshot viewport prototype; versi full-page tersedia di direktori evidence |
| [Kondisi kosong](evidence/redesign-mobile-empty.png) / [teks 200%](evidence/redesign-mobile-text-200.png) | Contoh state prototype dan simulasi pembesaran teks |

Seluruh gambar fixture dibuat dari warna/bentuk/teks sintetis, tanpa dokumen identitas atau foto pribadi. Output PNG dan ZIP adalah byte hasil kode lama yang benar-benar dihasilkan, disimpan melalui instrumentation pengujian. Jangan menganggap marker metadata sintetis sebagai bukti GPS/ICC sudah diuji.

Koneksi localhost diblokir lingkungan, jadi aset lokal dilayani lewat Playwright `route.fulfill`. Native browser `download.saveAs` dibatalkan lingkungan: klik tautan blob ditangkap dan byte dibaca oleh harness; dialog simpan/download manager nyata belum diuji. HTTP yang muncul pada origin `watermark.test` bukan request ke server publik. Tidak ada CSP hosting yang diuji melalui origin mock ini.

Live GitHub Pages gagal diakses melalui web tool, DNS PowerShell, dan browser. Tidak ada kesimpulan situs down. HTTPS, redirect, response header, asset availability, dan kesamaan source live masih UNVERIFIED. Chrome Windows dengan viewport/touch emulation bukan HP Android; WebKit Windows bukan Safari iPhone. Edge launch gagal; Firefox dan screen reader belum diuji.

## Reproduksi lokal

Harness membutuhkan Node, Playwright yang **sudah tersedia**, browser kompatibel, Python dan Pillow. Tidak ada install, perubahan execution policy, atau konfigurasi hosting. `PLAYWRIGHT_MODULE`, `BROWSER_CHROMIUM`, dan `BROWSER_WEBKIT` boleh disesuaikan ke instalasi existing. Versi Playwright dalam run ini `1.64.0-alpha-1790635538000`; Chrome `155.0.8059.84`; WebKit `26.6`. Ketergantungan tooling ini hanya untuk audit, bukan runtime situs.

Dari root repository di PowerShell, lingkungan sesi ini menggunakan:

```powershell
$auditPython = 'C:\Users\Ahsan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PLAYWRIGHT_MODULE = 'C:/Users/Ahsan/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright'
$env:BROWSER_WEBKIT = 'C:/Users/Ahsan/AppData/Local/ms-playwright/webkit-2370/Playwright.exe'
& $auditPython docs/audit-2026-10-19/create-fixtures.py
node docs/audit-2026-10-19/run-audit.cjs
& $auditPython docs/audit-2026-10-19/inspect-artifacts.py
node docs/audit-2026-10-19/verify-prototype.cjs
```

Run ulang menulis ulang bukti dalam folder tanggal ini; salin folder terlebih dulu jika ingin mempertahankan run historis. Harness tidak mengedit app source. Exit 0 dari audit berarti proses selesai, **bukan semua pemeriksaan PASS**: FAIL pada kode lama memang hasil audit. Lihat status per pemeriksaan di JSON. `inspect-artifacts.py` mengharapkan reproduksi bug baseline; bukan acceptance suite untuk implementasi yang diperbaiki.

Untuk run lintas environment, path browser/module harus mengarah ke instalasi yang tersedia; kegagalan launch dicatat terpisah dari kegagalan produk. Jangan menginstal engine baru atau menonaktifkan proteksi lingkungan hanya untuk mengubah UNVERIFIED menjadi PASS.

## Catatan penyerahan

Prioritaskan A01 (ZIP tertimpa), A02 (sumber resolusi asli dibuang), A03 (state berubah saat batch), A04 (pemilihan gambar via keyboard), lalu perbaikan P2. Spesifikasi menetapkan default engineering agar handoff dapat dijalankan; kapasitas HP dan batas resource masih memerlukan kalibrasi perangkat nyata. Kandidat fitur tambahan dibahas terpisah berdasarkan manfaat dan biaya pada tabel akhir spesifikasi.

Folder ini belum di-commit atau di-push. Karena deployment Pages berbasis root dapat menyajikan dokumen tambahan sebagai aset publik saat suatu hari di-push, pertahankan fixture sintetis dan jangan masukkan bukti/data pribadi ke folder ini.
