# Audit Watermark — 19 Oktober 2026

Status: audit kode lokal dan pengujian browser selesai; deployment live belum terverifikasi. Tidak ada perbaikan kode aplikasi, push, perubahan Pages, atau deployment dalam pekerjaan ini.

Baseline Git: `09f6ae06c3667f0e0757a6b7e098cede13cb7739`. PRD asli tetap utuh. Preferensi terbaru pengguna menjadi acuan ketika berbeda dengan PRD Juli 2026: dokumen dan foto setara, bilingual ID/EN, kualitas ekspor bisa dipilih, prioritas Android kelas menengah, batch 1–10.

## Keputusan utama

Arsitektur HTML/CSS/vanilla JavaScript masih sesuai kebutuhan. Tidak ada bukti bahwa migrasi framework atau backend akan menyelesaikan masalah yang ditemukan. Perbaikan paling mendesak ialah integritas ZIP, kualitas ekspor yang transparan, akses keyboard, serta operasi ekspor yang konsisten.

Fondasi privasi cukup baik pada kode yang diperiksa: aset aplikasi lokal, teks digambar dengan Canvas, dan tidak ditemukan kode unggah atau penyimpanan sesi pada aplikasi. Ini bukan sertifikasi keamanan atau bukti bahwa setiap versi deployment identik.

### Ringkasan hasil

| Pemeriksaan | Hasil dan batas bukti |
|---|---|
| Suite aplikasi lama | **28 PASS, 15 FAIL, 3 OBSERVATION, 1 UNVERIFIED**; 47 pemeriksaan, bukan skor keamanan atau jumlah temuan unik |
| Chrome 155.0.8059.84 / Windows | Suite utama; viewport mobile/touch diemulasikan di komputer desktop |
| WebKit 26.6 / Windows | Smoke test dua gambar, preview, teks, dan blob ekspor lulus; bukan Safari iPhone asli |
| Edge | Executable ditemukan tetapi peluncuran gagal; belum terverifikasi |
| Firefox, Android/iPhone fisik, NVDA/VoiceOver/TalkBack | Tidak diuji; jangan menyatakan kompatibilitas atau aksesibilitas penuh |
| Layout kode lama | Tidak ada overflow horizontal pada 320, 375, 390, 768, 1280 px; tombol unduh berada jauh di dalam panel scroll |
| Prototype redesign | 23 pemeriksaan interaksi/layout lulus. Bukan pengujian editor produksi |
| Hosting live | Web tool gagal mengakses; PowerShell DNS gagal; Chrome `ERR_NAME_NOT_RESOLVED`. HTTPS, redirect, header, aset live, serta kesamaan dengan lokal **belum terverifikasi** |

**Batas lingkungan:** koneksi localhost diblokir. Playwright menyajikan byte file lokal tanpa perubahan melalui `route.fulfill` pada origin uji `http://watermark.test/`. Ini menguji DOM dan JavaScript, bukan server HTTP sungguhan. Penyimpanan native `download.saveAs` dibatalkan lingkungan; harness menangkap klik tautan blob, membaca byte hasil aktual, lalu menyimpannya untuk pemeriksaan. Dialog Save, native download manager, perilaku iOS, dan popup/multiple-download permission belum diverifikasi. Percobaan awal yang gagal diganti oleh run final yang tercatat; tidak ada perubahan keamanan lingkungan atau instalasi paket.

## Temuan berprioritas

P1 = berpotensi kehilangan hasil atau memblokir alur utama. P2 = perlu diperbaiki sebelum redesign dinyatakan siap. P3 = pemeliharaan/discoverability. Label **teruji** berarti direproduksi; **statis** berarti dibaca dari kode dan tidak disamakan dengan eksploitasi.

### A01 · P1 · Hasil ZIP tertimpa saat nama dasar sama — teruji

- **Bukti:** `F12`, [arsip aktual](evidence/batch-duplicates.zip), dan [inspeksi arsip](evidence/artifact-inspection.json). `duplicate.png` + `duplicate.jpg` menghasilkan hanya `duplicate-watermarked.png`. Sepuluh input bernama `portrait.png` juga hanya menyisakan satu entri, meski sepuluh gambar berhasil dimuat.
- **Penyebab:** [batch.js](../../js/batch.js) baris 8–10, 62, 76–79 memakai basename sebagai key JSZip tanpa deduplikasi.
- **Dampak:** pengguna mengira semua hasil tersimpan; sebagian sebenarnya hilang dari arsip.
- **Rekomendasi:** penamaan unik deterministik (`duplicate-watermarked.png`, `duplicate-watermarked-2.png`, dst.), sanitasi path/nama, dan verifikasi jumlah entri sama dengan jumlah hasil. Referensi [JSZip file API](https://stuk.github.io/jszip/documentation/api_jszip/file_data.html).

### A02 · P1 · Resolusi asli dibuang sebelum pengguna memilih kualitas — teruji

- **Bukti:** `F13`, [large-export.png](evidence/large-export.png): sumber 6000 × 4000 menjadi 2000 × 1333, tanpa peringatan UI. [imageLoader.js](../../js/imageLoader.js) baris 4–18 dan 56–64 hanya menyimpan canvas hasil pengecilan.
- **Dampak:** detail dokumen/foto tidak dapat dipulihkan saat ekspor. PNG tidak mengembalikan detail yang sudah diperkecil.
- **Rekomendasi:** simpan `File` asli di memori sesi; pisahkan preview kecil dari render ekspor. Tawarkan Hemat dan Ukuran asli dengan dimensi hasil terlihat sebelum unduh. Referensi perilaku encoding [Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

### A03 · P1 · Perubahan daftar saat batch dapat menggagalkan ekspor — teruji dengan injeksi terkontrol

- **Bukti:** `F22`: jeda encoder pertama, hapus satu entri state, lanjutkan; ekspor gagal `Cannot read properties of undefined (reading 'width')`. [batch.js](../../js/batch.js) baris 50–60 memakai referensi array yang sama dengan state. Panel progres hanya menutup area canvas; kontrol lainnya tidak terkunci oleh [main.js](../../js/main.js) baris 81–95.
- **Dampak:** penghapusan gambar atau ekspor bersamaan dapat menghasilkan job gagal atau hasil dengan pengaturan campuran.
- **Rekomendasi:** snapshot urutan gambar, watermark, logo, dan opsi ekspor; satu job aktif; kunci mutasi selama job. Ini masalah konsistensi operasi async, bukan kebutuhan backend. Acuan metode ekspor async: [Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

### A04 · P1 · Pemilihan gambar tidak dapat dilakukan melalui keyboard — teruji/DOM

- **Bukti:** `A02`: semua `.thumb` adalah `DIV`, `tabIndex=-1`, tanpa role. Canvas juga tidak fokus. [imageLoader.js](../../js/imageLoader.js) baris 78–103 hanya memasang handler click. Slider native tetap bekerja lewat ArrowLeft (`A11`).
- **Dampak:** pengguna keyboard tidak bisa beralih gambar; pemindahan posisi bebas juga tidak memiliki alternatif keyboard yang setara.
- **Rekomendasi:** tombol pilih dan hapus sebagai sibling, nama menyebut file dan nomor, status terpilih programatis; sediakan koordinat X/Y di pengaturan lanjutan dan preset bernama. [WCAG 2.2: keyboard dan dragging](https://www.w3.org/WAI/WCAG22/quickref/), [penjelasan dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

### A05 · P2 · Kontrol logo tetap tampil dalam mode teks — teruji

- **Bukti:** `F21`: `logoControls.hidden=true`, tetapi computed display `flex`. [styles.css](../../css/styles.css) baris 280–284 menetapkan `.control-group { display:flex }`, mengalahkan aturan hidden bawaan browser.
- **Dampak:** mode terasa tidak berfungsi; panel lebih panjang dan kontrol yang tidak relevan membingungkan.
- **Rekomendasi:** aturan `[hidden] { display:none !important }` yang konsisten; tes setiap mode dan state kosong. Referensi [atribut hidden](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden).

### A06 · P2 · Preview logo rusak setelah pemuatan — teruji

- **Bukti:** `F08`: decoded logo memiliki `naturalWidth>0`, tetapi `#logoPreviewImg.naturalWidth=0`. [controlsUI.js](../../js/controlsUI.js) baris 7 me-revoke URL sebelum baris 111 memakainya di elemen img lain.
- **Dampak:** preview terlihat gagal meski bitmap untuk renderer tersedia.
- **Rekomendasi:** pegang URL preview sampai diganti/dihapus; gunakan aset sesi yang kepemilikannya jelas dan lepas hanya saat tidak digunakan. [MDN revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static).

### A07 · P2 · File rusak dan kegagalan ekspor tidak diberi pesan pengguna — teruji

- **Bukti:** `F15` memuat PNG rusak: 0 gambar, 0 alert/status. `F19` menginjeksikan callback encoder `null`: promise ditolak oleh `createObjectURL`, tanpa pesan. `F20` menginjeksikan kegagalan ZIP: sembilan klik unduh terpisah dipicu otomatis, tanpa notifikasi. [imageLoader.js](../../js/imageLoader.js) baris 67–68; [batch.js](../../js/batch.js) baris 4–5, 74–92; [main.js](../../js/main.js) baris 72–95 hanya memakai finally.
- **Dampak:** pengguna tidak tahu penyebab gagal atau bahwa browser mungkin memblokir fallback unduhan massal.
- **Rekomendasi:** tolak blob null/ukuran nol secara eksplisit, tampilkan error terlokalisasi dengan pemulihan, hentikan fallback otomatis dan tawarkan tindakan unduh satu per satu. [toBlob dapat menghasilkan null](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob), [WCAG error identification/status](https://www.w3.org/WAI/WCAG22/quickref/).

### A08 · P2 · Tidak ada batas resource impor; allowlist tidak konsisten — teruji + risiko statis

- **Bukti:** `S02`: SVG sintetis diterima melalui input yang diisi programatis, padahal UI mengiklankan PNG/JPEG/WebP. Jalur picker dan drop memakai filter MIME umum `image/*`; logo tidak memvalidasi type/ukuran/dimensi. Tidak ada batas jumlah, byte, atau piksel pada loader.
- **Dampak:** format yang tidak dijanjikan tetap diproses; decode gambar terkompresi besar dan banyak canvas dapat menghabiskan memori perangkat. Downscale terjadi **setelah decode**, sehingga tidak mencegah seluruh lonjakan memori. Crash/decoder exploit tidak direproduksi.
- **Rekomendasi:** satu pipeline validasi picker/drop/logo, allowlist raster, batas jumlah/byte/piksel, decode serial, pesan limit. MIME/extension bukan jaminan; konfirmasi signature dan hasil decode. SVG yang diterima bukan bukti XSS—fixture berupa SVG statis di konteks image. [MDN accept bukan validasi](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file), [OWASP validasi file](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) diterapkan proporsional pada client-only; antivirus/server storage tidak relevan untuk arsitektur ini.

### A09 · P2 · Memori ekspor tumbuh dan progres selesai terlalu dini — statis

- **Bukti:** [batch.js](../../js/batch.js) baris 55–79 menyimpan seluruh blob pada `rendered`, lalu JSZip menyusun arsip; callback progres dipanggil sampai 100% sebelum `generateAsync`. Tidak ada callback progres pengarsipan. Renderer juga mengalokasikan ulang dimensi canvas setiap redraw.
- **Dampak:** UI dapat menampilkan selesai ketika masih membuat ZIP. Foto realistis bertekstur akan lebih berat daripada fixture sintetis yang mudah dikompresi; tidak ada klaim benchmark HP.
- **Rekomendasi:** pisahkan tahap render/arsip/siap; render ekspor satu per satu, batasi preview, lepas canvas sementara, dan awasi ukuran blob/ZIP. `generateAsync` tetap memegang hasil akhir di memori—bukan streaming hemat memori. [JSZip limitations](https://stuk.github.io/jszip/documentation/limitations.html).

### A10 · P2 · Tombol unduh tersembunyi di panel scroll — teruji

- **Bukti:** `U01-reflow-390`: panel kontrol terlihat pada y=502–844; tombol Download berada pada y≈1550 di konten panel. Konten 1112 px dalam panel sekitar 342 px. [Tampilan awal](evidence/current-mobile-empty.png) sudah menampilkan kontrol meski belum ada gambar.
- **Dampak:** langkah terakhir sulit ditemukan dan banyak kontrol muncul sebelum berguna.
- **Rekomendasi:** kondisi kosong fokus pada pemilihan gambar; kontrol lanjutan dilipat. Action bar di bawah viewport mobile dengan ruang aman, desktop footer di luar area scroll kontrol. [WCAG reflow/focus not obscured](https://www.w3.org/WAI/WCAG22/quickref/).

### A11 · P2 · Zoom diminta dinonaktifkan — teruji atribut

- **Bukti:** `A05`, [index.html](../../index.html) baris 5 berisi `maximum-scale=1,user-scalable=no`. Pembesaran font 200% diuji sebagai simulasi, bukan pinch zoom perangkat asli; browser tertentu dapat mengabaikan pembatasan viewport.
- **Dampak:** menghambat keterbacaan pada browser yang menghormatinya.
- **Rekomendasi:** `width=device-width, initial-scale=1`; uji zoom native dan keyboard HP fisik. [WCAG resize text/reflow](https://www.w3.org/WAI/WCAG22/quickref/).

### A12 · P2 · Teks tombol tema gelap kurang kontras — terukur

- **Bukti:** `A07`: putih di accent `#4f8cff` = **3,22:1**, di bawah 4,5:1 untuk teks tombol normal. Tema terang `#2f6fed` = 4,55:1; muted gelap = 6,42:1; muted terang = 5,60:1. Perhitungan memakai luminansi sRGB WCAG.
- **Rekomendasi:** pilih warna tombol gelap dengan kontras teks ≥4,5:1; uji default, hover, pressed, serta focus. Jangan mengklaim seluruh palet lulus dari empat pasangan saja. [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/quickref/).

### A13 · P2 · Status pilihan dan progres tidak disampaikan secara programatis — teruji/statis

- **Bukti:** `A03` mode tanpa `aria-pressed`; `A01` Reset memusatkan state tetapi mengosongkan semua indikator preset. `syncFormFromState` tidak menyinkronkan posisi; nama preset hanya simbol panah. Elemen progres tanpa `role=status`, `aria-live`, atau progressbar native.
- **Dampak:** pilihan visual dapat berbeda dari state; teknologi bantu tidak memperoleh status yang cukup. Output screen reader sesungguhnya belum diuji.
- **Rekomendasi:** render state sebagai satu sumber kebenaran, tombol pressed/radio semantik, nama posisi terlokalisasi, `<progress>` dan status yang tidak terlalu sering diumumkan. [WCAG name/role/value dan status messages](https://www.w3.org/WAI/WCAG22/quickref/).

### A14 · P2 · Target hapus hanya 20 × 20 px — terukur

- **Bukti:** `A04`, [styles.css](../../css/styles.css) baris 128–146. Tombol berada di atas target pemilihan thumbnail, sehingga tidak memiliki ruang bebas terhadap target lain.
- **Dampak:** salah sentuh pada HP, terutama saat ingin memilih gambar.
- **Rekomendasi:** pisahkan select/remove menjadi sibling, target minimum desain **44 × 44 px**. WCAG 2.2 AA menggunakan **24 px atau pengecualian jarak**, bukan kewajiban universal 44 px; 44 px adalah pilihan desain proyek. [W3C target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### A15 · P2 · Watermark dapat terpotong atau kosong tanpa peringatan — statis

- **Bukti:** [renderer.js](../../js/renderer.js) baris 15–47 berpusat pada anchor tanpa menghitung batas teks/logo terotasi. [dragController.js](../../js/dragController.js) hanya membatasi anchor 0–1. Mode logo tanpa logo, atau teks kosong, tetap dapat diekspor.
- **Dampak:** hasil dapat kehilangan bagian watermark atau menjadi salinan tanpa watermark tanpa disadari. Penempatan keluar tepi bisa disengaja, sehingga jangan mengubah posisi diam-diam.
- **Rekomendasi:** hitung bounds gabungan, clamp preset dengan margin aman; drag bebas boleh tetapi beri peringatan potongan. Blokir ekspor ketika tidak ada watermark efektif. Rujukan teknis [Canvas measureText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText).

### A16 · P2 · Logo bersifat global tetapi kontrol tampak per gambar — statis

- **Bukti:** [controlsUI.js](../../js/controlsUI.js) baris 108–109 mengganti `WM.state.logoImage`; [renderer.js](../../js/renderer.js) menerima satu logo global. Clone watermark membawa field logo tetapi bukan pemilihan logo efektif yang terpisah.
- **Dampak:** mengganti logo saat memilih satu gambar juga mengganti hasil gambar lain, tanpa hubungan yang jelas dengan Apply to All.
- **Rekomendasi:** tetap satu logo sesi untuk v1 demi efisiensi, labeli “Logo untuk semua gambar”; mode, ukuran, posisi, opasitas tetap per gambar. Pilihan banyak logo berbeda belum ditambahkan. Ini klarifikasi perilaku existing, bukan permintaan fitur baru. Referensi konteks alur: [PRD sumber](../../PRD/PRD-Watermark-Web-App.docx).

### A17 · P2 · Belum ada CSP aplikasi — statis; header live tidak diketahui

- **Bukti:** [index.html](../../index.html) tidak mendeklarasikan CSP. Kode tidak ditemukan memakai fetch, XHR, WebSocket, beacon, atau user HTML injection. `innerHTML=''` hanya mengosongkan thumbnail; bukan sink user-controlled yang terbukti rentan.
- **Dampak:** lapisan pembatasan resource belum tersedia jika ada regresi injeksi. Tidak ada eksploitasi exfiltration yang dibuktikan.
- **Rekomendasi:** meta CSP awal untuk aset lokal, `connect-src 'none'`, `object-src 'none'`, dan izin image blob/data; uji semua ekspor. Pages merupakan hosting statis; jangan menambahkan `.htaccess`/`_headers` dan menganggap itu mengubah response header. `frame-ancestors` tidak bekerja via meta; proteksi framing/header live tetap pekerjaan hosting yang belum terverifikasi, bukan alasan otomatis migrasi. [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

### A18 · P2 · Klaim privasi perlu membedakan aplikasi, hosting, dan file unduhan — teruji + dokumentasi

- **Bukti lokal:** `S03` teks `<img ...>` tetap teks Canvas; `S04` cookie/localStorage/sessionStorage kosong; `S05` edit dan byte ekspor selesai offline tanpa request HTTP tambahan. Seluruh request tercatat memakai GET. Ini pengamatan alur uji, bukan jaminan semua versi/skenario.
- **Bukti metadata:** [inspeksi artefak](evidence/artifact-inspection.json): sumber JPEG mengandung author/description EXIF dan orientation 6; output PNG 600 × 800 tidak membawa marker tersebut. Marker teks PNG juga tidak bertahan. **GPS, ICC, dan seluruh format metadata tidak diuji**; nama file asli masih menjadi bagian nama hasil/ZIP. Canvas bukan janji penghapusan semua metadata.
- **Rekomendasi:** copy “Gambar tidak diunggah oleh aplikasi”, sebut pemrosesan sesi serta unduhan tetap di perangkat. Jangan menjanjikan secure erase memori/browser/cache. GitHub mendokumentasikan pencatatan IP pengunjung untuk keamanan. [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

### A19 · P3 · Dependensi vendored belum mempunyai catatan provenance/maintenance — statis

- **Bukti:** banner [lib/jszip.min.js](../../lib/jszip.min.js) menyebut **3.10.1**, dual MIT/GPLv3 dan pako MIT; tidak ada manifest dependency atau catatan checksum upstream. Hash byte lokal tersimpan dalam `results.json`; hash itu membuktikan snapshot lokal, bukan verifikasi kesamaan dengan upstream.
- **Rekomendasi:** catat asal rilis, versi, hash dan lisensi lengkap, serta prosedur review pembaruan. Aplikasi hanya membuat ZIP, tidak membuka ZIP input, sehingga jangan melabeli zip-slip tanpa jalur ekstraksi. Halaman advisories upstream yang terlihat tidak cukup untuk menyatakan tidak ada CVE. [JSZip repository/security](https://github.com/Stuk/jszip/security/advisories), [JSZip project](https://stuk.github.io/jszip/).

### A20 · P3 · Metadata halaman dan dokumentasi belum lengkap — statis

- **Bukti:** [index.html](../../index.html) baru menyediakan title, lang Inggris, charset, viewport. Tidak ada description, ikon, atau metadata sosial; PRD menyebut PT Sans, implementasi memakai Georgia. Ini selisih dokumen, bukan alasan memuat font dari CDN.
- **Rekomendasi:** ID sebagai default dengan dictionary EN, lang mengikuti pilihan, title/description terlokalisasi, favicon lokal, canonical project URL hanya setelah diverifikasi. Pakai font sistem yang tersedia; jelaskan substitusi font lintas OS. Tidak ada klaim ranking SEO. Rujukan [Google title links](https://developers.google.com/search/docs/appearance/title-link) dan [PRD sumber](../../PRD/PRD-Watermark-Web-App.docx).

## Yang sudah bekerja

- PNG/JPEG/WebP, portrait/landscape, alpha transparan, dan gambar 1 × 1 berhasil diproses pada alur yang diuji.
- Kontrol teks, opasitas, rotasi, preset, touch positioning, mouse drag, Apply to All, dan override per gambar berjalan. Reset mengubah data dengan benar, walau indikator posisi salah.
- Empat gambar bernama berbeda menghasilkan empat PNG dalam ZIP. Sepuluh gambar dapat dimuat, tetapi nama sama menyebabkan kegagalan integritas arsip A01.
- File lokal `file://` berhasil memuat aplikasi tanpa build. Aset pihak ketiga tidak diambil dari CDN pada runtime yang diperiksa.
- Kontras beberapa pasangan teks memadai; fokus drop-zone sudah bisa diakses keyboard. Review ini tidak menyamakan hal tersebut dengan kelulusan WCAG penuh.

## Paket hasil dan langkah berikutnya

- [Spesifikasi redesign dan acceptance criteria](IMPLEMENTATION-SPEC.md).
- [Prototype bilingual mobile/desktop](redesign-prototype.html): pengaturan demo, kualitas, kondisi kosong, dan simulasi download; tanpa membuka file pribadi atau mengimplementasikan renderer.
- [Hasil mentah](evidence/results.json), [inspeksi artefak](evidence/artifact-inspection.json), [QA prototype](evidence/prototype-qa.json), screenshot before/after, fixture, serta harness dapat diperiksa ulang. [Petunjuk reproduksi](README.md).

Tidak ada kebutuhan fitur baru yang dibuktikan oleh audit ini selain pilihan kualitas dan bahasa yang sudah disepakati. Watermark berulang, preset dokumen otomatis, PDF/HEIC, format ekspor tambahan, PWA, dan backend tetap kandidat diskusi terpisah. Spesifikasi mencakup perbaikan existing dan dua penambahan yang disepakati; tidak mengunci fitur kandidat itu.
