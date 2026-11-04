# Spesifikasi redesign Watermark

Tanggal: 19 Oktober 2026. Status: handoff untuk perbaikan existing + bilingual + pilihan ukuran ekspor. **Belum diimplementasikan pada aplikasi.** Kandidat fitur baru di bagian akhir tidak termasuk baseline ini.

## 1. Pengalaman dan desain

**Pengguna:** pemakai dokumen sensitif dan foto, dengan prioritas Chrome Android kelas menengah dan batch 1–10 gambar. Tetap GitHub Pages gratis, semua pemrosesan lokal, tanpa akun, backend, telemetry, persistence, atau service worker. PDF/HEIC dan kamera langsung tidak masuk scope.

### Alur dan kondisi layar

| Kondisi | Isi dan tindakan |
|---|---|
| Kosong | Satu CTA “Pilih gambar”, PNG/JPG/WebP, maksimum 10 gambar, penjelasan lokal. Kontrol edit tidak tampil; ekspor nonaktif |
| Memuat | Nama file aktif dan progres jumlah; validasi/decode serial. File gagal ditandai per nama tanpa membuang yang berhasil |
| Mengedit | Preview, nama/dimensi, pemilih gambar, teks/logo/keduanya, teks, opasitas, dan preset posisi. Kontrol lanjutan dilipat |
| Lanjutan terbuka | Font sistem, warna, ukuran teks/logo, rotasi, koordinat X/Y. Tidak mengubah state saat dibuka/ditutup |
| Menyiapkan ekspor | Satu job, snapshot stabil, semua mutasi dan ekspor lain terkunci; progres “Membuat gambar 2 dari 5”, lalu “Menyusun ZIP …” |
| Siap disimpan | Tautan/tombol “Simpan PNG” atau “Simpan ZIP” yang dipicu pengguna. Jelaskan browser menentukan lokasi simpan; jangan menyatakan file sudah tersimpan |
| Gagal | Pesan dekat konteks, `role=alert`, alasan singkat dan tindakan pemulihan. Pengaturan/gambar valid tetap ada |

Pemilihan gambar aktif menyinkronkan **seluruh** form, mode, indikator preset, dan label. Perubahan berlaku pada gambar aktif. “Terapkan ke N gambar” menyalin pengaturan secara eksplisit dan mengumumkan jumlah. Reset mengembalikan pengaturan gambar aktif ke default, bukan menghapus file atau mengganti logo sesi. Gambar yang ditambahkan kemudian mendapat default, bukan otomatis mengikuti gambar aktif.

Satu logo digunakan untuk seluruh sesi, diberi label **“Logo untuk semua gambar”** / **“Logo for all images”**; menggantinya memengaruhi semua gambar yang memakai mode logo/both. Thumbnail pemilihan dan tombol hapus terpisah sebagai sibling; fokus berpindah ke gambar tetangga atau tombol tambah setelah penghapusan. Hapus terakhir kembali ke kondisi kosong.

### Layout

- **320–899 px:** satu alur scroll halaman. Header ringkas, indikator tiga langkah, preview maksimal sekitar 35dvh pada layar normal, lalu kontrol dasar. Action bar tetap di bawah viewport, menghormati safe-area. Beri ruang bawah sebesar tinggi bar dan scroll margin untuk semua fokus; pada pembesaran teks/viewport pendek bar boleh kembali ke alur dokumen agar tidak menutupi layar.
- **≥900 px:** area kerja dua kolom, preview fleksibel dan panel sekitar 370 px. Panel sticky 20 px dari atas, tinggi tersedia dihitung dari posisi atas aktual sampai 20 px sebelum bawah viewport (maksimal `100dvh - 40px` setelah menempel). Kontrol scroll sendiri; footer aksi berada **di luar** area scroll kontrol. Preview tidak diubah menjadi ukuran ekspor.
- Tidak ada scroll horizontal halaman pada 320 px. Panjang nama file dan teks terlokalisasi membungkus. Preview boleh diperkecil secara CSS dengan rasio terjaga. Touch pada canvas tidak menonaktifkan zoom seluruh halaman; preset dan X/Y menyediakan alternatif.
- Preview dokumen dan foto tidak dipisahkan menjadi mode produk baru. Pola kerja sama, contoh bantu mencakup keduanya.

### Token dan semantik

| Token | Nilai awal |
|---|---|
| Latar / surface | `#f3f5f2` / `#ffffff` |
| Teks / muted | `#172c27` / `#51665e` |
| Aksen | `#146954`, teks tombol putih |
| Border field | `#7b8c81`; border dekoratif kartu `#cbd6ce` |
| Focus | outline 3 px `#753dc4`, offset 3 px |
| Tipografi | system-ui; body 16 px; helper ≥13 px; heading 22–32 px |
| Spasi / radius | kelipatan 4 px; kartu 18 px, kontrol 10 px |
| Target sentuh | minimum desain 44 × 44 px; tombol aksi utama 48 px |

Target implementasi: WCAG 2.2 AA; bukan klaim bahwa prototype sudah memenuhi seluruh standar. Uji kontras teks ≥4,5:1, batas kontrol/fokus yang diperlukan ≥3:1. Border kartu dekoratif tidak dijadikan satu-satunya indikator kontrol. Pertahankan dukungan tema sistem terang/gelap dari aplikasi lama: palet gelap bg `#0f1915`, surface `#172820`, text `#eef5ef`, muted `#b5c7bc`, tombol tetap `#146954`/putih, focus `#d7bcff`, border input `#829b8d`. Selected mode/preset diberi checked/pressed, border, dan state semantik; tidak hanya warna.

Gunakan elemen native: button, fieldset/legend, label, details/summary, progress. Gambar aktif berupa button dengan `aria-pressed`; tombol hapus tidak dinest di dalamnya. Setiap posisi memiliki nama lengkap. Arrow keys di slider dan field angka tetap native. X/Y 0–100% dengan langkah 1%, dapat diketik; bila memakai keyboard pada preview, panah menggeser 1% dan Shift+panah 5%. Focus ring tidak dipotong. Label preview menjelaskan file aktif dan posisi; jangan membaca seluruh gambar sebagai data pribadi. Screen reader nyata harus diuji sebelum klaim aksesibilitas.

### Bahasa dan copy

- Default **Indonesia**, pengalih **Indonesia / English** berlaku di memori sesi. Reload kembali ke Indonesia. Mengganti bahasa tidak mengubah teks watermark milik pengguna.
- Dictionary lokal mencakup tombol, bantuan, aria-label, status/error, nama posisi, title dan description; `document.documentElement.lang` ikut berubah. Gunakan `Intl.NumberFormat` untuk dimensi/jumlah. Nama file tetap asli di UI.
- Default watermark data tetap `SAMPLE`, Arial, putih, 48 unit referensi, opacity 70%, rotation 0°, posisi tengah; logo 25%. Ini menjaga baseline existing. Teks “KHUSUS VERIFIKASI” pada prototype hanyalah contoh desain, bukan preset otomatis.
- Copy privasi: “Gambar diproses di perangkat dan tidak diunggah oleh aplikasi. Pengaturan tidak disimpan antar kunjungan. File unduhan tetap di perangkat.” Tambahkan penjelasan singkat hosting GitHub mencatat IP untuk keamanan. Tidak memakai klaim secure erase, anti-pemalsuan, atau “100% aman”.
- Error contoh: “File ini tidak bisa dibaca. Pilih PNG, JPG, atau WebP lain.” / “This file could not be read. Choose another PNG, JPG, or WebP.”; “Memori tidak cukup untuk ukuran asli. Coba versi Hemat.” / “Not enough memory for original dimensions. Try Efficient.”

## 2. Arsitektur, state, dan kontrak

Pertahankan HTML/CSS/vanilla JS, namespace `window.WM`, classic script, dan penggunaan `file://`. Tidak ada framework/build runtime baru. Pisahkan validasi/decode, state, rendering murni, export job, dan DOM/event UI. Tambahan file internal diperbolehkan untuk tanggung jawab tersebut; jangan menggandakan jalur impor dan ekspor.

### Model data minimum (JSDoc; bukan API server)

```js
// Source = { id, name, file: File, mime, width, height, thumbnailUrl,
//            watermark: Watermark }
// width/height adalah dimensi setelah orientasi EXIF, bukan dimensi preview.
// Session = { images, activeId, locale: 'id'|'en',
//             logoAsset, resolution: 'efficient'|'original',
//             busy: null|'import'|'export', error, exportResult }
// logoAsset = { file, decodedImage, objectUrl, width, height } | null
// Watermark mempertahankan mode/text/logo-size/opacity/rotation/position existing.
// position memakai pecahan 0..1; ukuran teks relatif terhadap referensi 1000 px.
```

Tidak ada API publik jaringan, database, migrasi data tersimpan, atau perubahan akun. Interface internal yang perlu ditambah/dirapikan:

```js
WM.importImages(files, { onProgress })
// Promise<{ addedIds: string[], rejected: { name, code }[] }>
WM.preparePreview(imageId)
// Promise<Preview>; batalkan hasil usang lewat generation token.
WM.renderImageToCanvas(canvas, { source, watermark, logo, width, height })
// Sama untuk preview/export; tidak membaca state global yang sedang berubah.
WM.exportImages({ ids, resolution, onProgress, signal })
// Promise<{ blob: Blob, filename: string, mime: string, count: number }>
// onProgress({ stage: 'render'|'archive'|'ready', done, total, percent })
// reject dengan Error.code yang dipetakan dictionary; tidak memicu download.
```

Adapter untuk event existing boleh dipertahankan agar regresi kecil. `downloadCurrent`/`downloadAll` beralih ke satu export service; handler UI hanya menyiapkan hasil dan menampilkan tombol simpan. Error code minimum: `UNSUPPORTED_TYPE`, `INVALID_IMAGE`, `FILE_LIMIT`, `PIXEL_LIMIT`, `MEMORY_LIMIT`, `EMPTY_WATERMARK`, `ENCODE_FAILED`, `ZIP_FAILED`, `BUSY`, `ABORTED`. UI tidak menampilkan stack trace atau menulis nama file pribadi ke log produksi.

### Batas resource awal

Nilai di bawah adalah batas implementasi konservatif yang **diusulkan**, bukan kapasitas HP yang sudah terukur: maksimal 10 gambar, 20 MiB/file, total file sumber 80 MiB; maksimal 24 MP dan sisi 8192 px setelah orientasi. Logo: PNG/JPEG/WebP, maksimal 8 MiB dan 4 MP. Angka dipusatkan di satu konstanta kebijakan agar tidak berbeda antara picker/drop/logo. Jika uji perangkat nyata gagal, itu blocker rilis dan nilai harus dikalibrasi dengan bukti; jangan menyatakan angka ini menjamin bebas crash.

Validasi byte signature dan header dimensi sebelum decode: PNG IHDR, JPEG SOF/EXIF orientation, WebP VP8/VP8L/VP8X. Parser harus bounded terhadap ukuran input, mengecek panjang segmen dan overflow; header rusak/tidak lengkap ditolak. MIME browser dipakai sebagai petunjuk, bukan bukti tunggal. Konfirmasi kembali dimensi/type hasil decode. Tolak SVG/GIF/HEIC/PDF di kedua jalur input; jangan membaca file sebagai HTML. Terima extension huruf besar jika signature valid; jika MIME kosong, keputusan tetap berdasarkan signature. Tidak menambahkan library decoder input kompleks.

### Pipeline dan memori

1. Validasi antrean dan batas kumulatif, decode **serial**, koreksi orientasi hanya sekali, buat thumbnail, simpan `File` asli. Jangan menyimpan seluruh gambar full-resolution sebagai canvas permanen.
2. Simpan hanya satu preview aktif dengan sisi maksimal 2000 px dan thumbnail kecil untuk gambar lain. Snapshot render dinormalisasi, sehingga posisi/skala sama ketika ukuran ekspor berbeda. Hasil decode lama dibuang saat activeId berubah; generation token mencegah race.
3. Jadwalkan maksimal satu redraw per animation frame; ubah `canvas.width/height` hanya bila ukuran berubah. Jeda render saat tab tersembunyi; tidak perlu memaksa redraw background memakai timer 50 ms.
4. Saat ekspor, snapshot berisi sumber File, watermark yang di-clone, urutan, logo yang stabil, dan resolution. Kunci impor/hapus/edit/logo/reset/apply/ekspor lain selama job. Bahasa boleh berubah dan hanya memengaruhi label.
5. Decode/render **satu sumber per giliran**, panggil `toBlob('image/png')`, cek blob non-null dan nonzero, masukkan ke ZIP bila batch; lepas canvas/bitmap sementara sebelum giliran berikutnya. Preview sumber asli dipisahkan dari canvas kerja agar tidak ter-watermark dua kali.
6. Akumulasi blob PNG tidak melebihi 64 MiB per job; jika terlewati hentikan dengan pesan untuk mengurangi batch/pakai Hemat, jangan memotong daftar diam-diam. Batas ini membantu membatasi output; bukan estimasi pasti seluruh heap. JSZip tetap membutuhkan memori hasil akhir. Gunakan STORE untuk PNG yang sudah terkompresi dan callback progres archive.
7. Satu hasil ekspor tersimpan sementara. Lepas object URL hasil lama saat hasil diganti/session ditutup atau setelah pengguna selesai, bukan segera sesudah image onload jika masih diperlukan UI. Sumber/decoded image/URL dilepas saat gambar/logo dihapus; `ImageBitmap.close()` bila digunakan. Tidak menjanjikan secure erase.

Web Worker/OffscreenCanvas tidak wajib v1. Tambahkan hanya bila profil perangkat nyata menunjukkan long task saat drag/encode yang tetap buruk setelah pemisahan preview dan ekspor; fallback Canvas utama harus tetap ada. Penggunaan `file://` dan CSP tidak boleh dikorbankan tanpa revisi scope.

## 3. Ekspor, privasi, dan keamanan

### Ukuran, nama, dan integritas

- **Default Hemat:** `scale = min(1, 2000/max(width,height))`, dimensi dibulatkan dan minimal 1 px; tidak upscale. Pilihan **Ukuran asli** mempertahankan dimensi berorientasi sumber dalam batas resource. Tampilkan sumber → hasil sebelum unduh; pilihan berlaku satu sesi untuk semua gambar.
- Format tetap **PNG** untuk single maupun ZIP; alpha dipertahankan. “Ukuran asli” berarti dimensi, bukan file identik, metadata identik, atau kualitas JPEG yang dipulihkan. “Hemat” mengurangi dimensi; PNG hasil tetap bisa lebih besar daripada JPEG input. Pilihan lossy quality/JPEG/WebP belum ditambahkan.
- Nama hasil dari basename yang sudah dibersihkan: hilangkan path separator, kontrol, path traversal, trailing dot/space, dan nama kosong; nama kosong menjadi `image`. Batasi basename 100 karakter, pertahankan Unicode normal NFC. Tambahkan `-watermarked.png` dan suffix `-2`, `-3` jika bentrok; bandingkan hasil case-insensitive untuk portabilitas.
- ZIP flat, tidak membuat folder dari nama input. Jumlah entri harus sama dengan jumlah hasil, tanpa nama bentrok, PNG valid dan memiliki dimensi target. Satu gambar melalui “Unduh semua” menghasilkan PNG seperti perilaku existing; tombol batch hanya tampil untuk >1 gambar.
- Opasitas 5–100%, posisi 0–1; teks maksimal 160 karakter Unicode yang diinformasikan di field. Jika teks kosong/whitespace pada mode text, logo belum ada pada mode logo, atau keduanya tidak efektif, disable ekspor dengan alasan. Pada both, minimal satu komponen efektif boleh diekspor.
- Ukur bounds teks/logo terotasi: preset mempertahankan margin 4% dan keseluruhan watermark bila muat. Jika watermark lebih besar dari gambar, pusatkan dan tampilkan peringatan untuk mengecilkan; jangan merusak proporsi. Drag tetap bebas, peringatan inline jika sebagian keluar; ekspor mengikuti preview, tanpa reposition tersembunyi.
- `toBlob` gagal menghasilkan error yang dapat dipulihkan. Kegagalan ZIP tidak memicu unduhan massal otomatis; berikan retry atau kembali mengunduh satu gambar. Jangan menyatakan progres 100% sampai blob akhir siap.
- Tombol simpan menjadi aktivasi pengguna tersendiri setelah blob siap; uji Safari/Chrome Android native. UI mengatakan “Unduhan dimulai”, bukan “File sudah tersimpan”. Simpan ulang menggunakan URL hasil yang sama sampai diganti.

### Pembatasan aplikasi dan hosting

Kebijakan awal meta CSP, diletakkan sebelum pemuatan aset:

```text
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' blob: data:; font-src 'self'; connect-src 'none';
object-src 'none'; base-uri 'none'; form-action 'none';
frame-src 'none'; worker-src 'none'
```

Ini baseline untuk **aplikasi yang nantinya diimplementasikan**, bukan CSP prototype yang inline. Pindahkan progres ke `<progress>`; pengaturan DOM style numerik bila dibutuhkan harus diuji terhadap CSP, jangan menambahkan `unsafe-inline` secara menyeluruh. Karena same-origin di github.io meliputi project lain milik akun yang sama, hanya rujuk path aset lokal tetap; CSP `'self'` bukan isolasi path per repositori. CSP membatasi beberapa jalur, bukan melindungi dari aset first-party yang sudah dikompromikan atau semua navigasi keluar.

Jangan memakai fetch/blob round-trip pada jalur runtime; pemrosesan tetap File/Canvas/object URL. Blob fetch yang ada di harness adalah instrumentation pengujian. Tidak ada service worker, IndexedDB, localStorage/sessionStorage, remote font, analytics, atau reporting endpoint. Teks/file name dimasukkan lewat textContent/value, bukan HTML.

Tambahkan `meta name=referrer content=no-referrer`; title/description dan favicon lokal. Canonical hanya project URL yang sudah terbukti aktif. Catat provenance JSZip 3.10.1 saat ini dan hash rilis yang diverifikasi sebelum mengganti dependensi; sertakan teks lisensi yang diperlukan. Tidak otomatis upgrade vendor hanya karena audit menemukan kekurangan catatan.

`frame-ancestors`, X-Frame-Options, HSTS, Permissions-Policy dan custom cache header tidak disimulasikan dengan meta yang tidak didukung. Jangan menganggap `.htaccess`, `_headers`, CORS config atau secret dalam JavaScript dapat menyelesaikan masalah Pages. Verifikasi header live bila jaringan memungkinkan; bila proteksi framing penuh menjadi syarat mutlak, ajukan perubahan hosting sebagai keputusan baru.

### Rujukan utama

- [GitHub Pages statis dan pencatatan IP](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [HTTPS Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [frame-ancestors tidak didukung meta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
- [Canvas toBlob, null dan encoding](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob), [JSZip memory limitations](https://stuk.github.io/jszip/documentation/limitations.html).
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/), [target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 4. Acceptance criteria dan pelaksanaan

Semua item di bawah adalah **syarat implementasi berikutnya**, bukan hasil yang sudah lulus aplikasi saat ini. Tautan hasil audit lama ada di [AUDIT.md](AUDIT.md).

| ID | Skenario dan hasil wajib |
|---|---|
| AC01 | Picker/drop/logo memakai validasi sama; PNG/JPEG/WebP valid lolos, corrupt/SVG/type palsu/header overflow ditolak dengan pesan ID/EN |
| AC02 | 1–10 gambar dimuat; file ke-11/batas byte/piksel ditolak jelas tanpa menghapus gambar yang sudah valid. Tes gambar lebar ekstrem, 1 × 1, portrait, landscape |
| AC03 | Ganti gambar/reset/mode/preset selalu konsisten dengan state. Apply All meng-clone pengaturan; edit satu gambar setelahnya tidak merembet |
| AC04 | Text, logo, both menghasilkan preview dan PNG setara; logo tidak rusak setelah load/ganti/hapus; cakupan logo sesi dijelaskan |
| AC05 | Mouse, touch, preset, dan koordinat keyboard setara. Tab memilih gambar dan menghapus tanpa kehilangan fokus; nama/pressed/status benar pada screen reader |
| AC06 | Sumber 6000 × 4000: Hemat 2000 × 1333, Asli 6000 × 4000. Tidak upscale sumber kecil; EXIF orientation 6 tampil/ekspor konsisten; alpha PNG tetap |
| AC07 | ZIP dari `a.png`, `a.jpg`, `A.webp`, nama Unicode, nama path-like dan 10 nama identik memiliki jumlah entri tepat, nama aman/unik, semua PNG dapat dibuka |
| AC08 | Null blob, throw encoder, ZIP reject, batas output dan resource exhaustion ditangani; UI pulih; tidak ada fallback unduhan massal diam-diam |
| AC09 | Selama ekspor, mutasi/reentry ditolak. Snapshot hasil konsisten; progres mencakup archive; tombol Simpan baru aktif setelah blob siap |
| AC10 | Mode teks kosong/logo kosong tidak menghasilkan output tanpa watermark tanpa alasan; bounds dan peringatan clipping sesuai preview |
| AC11 | ID/EN mengganti semua copy/aria/status dan `lang`, mempertahankan konten pengguna. Reload tidak menyimpan pilihan atau gambar |
| AC12 | 320/375/390/768/1280/1440 px, landscape pendek dan 200% teks tidak menimbulkan overflow halaman atau fokus tertutup bar. Pinch zoom bekerja di HP nyata |
| AC13 | Tema terang/gelap dan hover/focus: teks/UI memenuhi kontras, target sentuh 44 px, prefers-reduced-motion dan forced colors dapat digunakan |
| AC14 | Network setelah initial load tidak membawa gambar, nama file atau watermark. Edit+ekspor bekerja offline setelah load. CSP tidak melanggar fungsi; storage tetap kosong |
| AC15 | JPEG sintetis dengan EXIF/GPS dan PNG marker diperiksa pada output; dokumentasikan metadata yang ditemukan/dibuang per engine. Jangan menggeneralisasi hasil ke semua format |
| AC16 | Chrome Android fisik kelas menengah diuji dengan 10 foto realistis 12 MP + satu 24 MP, portrait/landscape. Catat model/RAM/OS/browser/waktu/long task. Drag p95 jarak pointer→paint ≤50 ms; batch tidak membuat tab crash dan progres tetap merespons. Kegagalan target menahan rilis |
| AC17 | Chrome/Firefox/Edge desktop dan Safari iPhone nyata: picker, oriented image, text/logo, single/ZIP, foreground/background dan native save diuji. Kegagalan environment dicatat UNVERIFIED, bukan PASS |
| AC18 | Aset lokal dan `file://` tetap bekerja tanpa build. Live HTTP→HTTPS, sertifikat, asset status, console, base path `/watermark-v1/`, header aktual dan hash script dibandingkan dengan rilis yang dipilih |

Urutan implementasi: (1) integritas ekspor/snapshot/validasi dan regression tests, (2) pemisahan sumber-preview-ekspor dan opsi ukuran, (3) layout/a11y/bilingual, (4) CSP/provenance/metadata, (5) perangkat nyata dan pemeriksaan live. Simpan baseline Git agar rollback berupa revert perubahan yang ditinjau, bukan reset kerja pengguna. Tidak ada migrasi data karena sesi tidak persisten.

Deployment berikutnya memerlukan instruksi pengguna tersendiri. Sebelum itu, hasil implementasi lokal harus dapat direview dan seluruh gate yang relevan dilaporkan. Tidak menambahkan monitor/analytics/automation. Sesudah deployment yang diminta pengguna, jalankan smoke live; laporkan batas verifikasi jika jaringan tetap tidak memungkinkan.

## 5. Kandidat di luar baseline

| Kandidat | Manfaat | Biaya/keputusan yang masih dibutuhkan |
|---|---|---|
| Pola berulang | Memperluas cakupan watermark dokumen/foto | Keterbacaan dokumen, kepadatan, overlap, performa; belum dipilih |
| Preset tujuan dokumen | Mengurangi mengetik berulang | Pilihan template dan copy; PRD awal melarang auto-generated text; belum dipilih |
| Ekspor JPEG/WebP | Mengurangi ukuran foto | Transparansi/background/quality/dukungan encoder; belum dipilih |
| PDF/HEIC | Mendukung sumber lain | Dependency dan attack surface decoder jauh lebih besar; belum dipilih |
| PWA | Bisa membuka app offline dari cold start | Cache/update/privacy semantics; di luar constraint sekarang |

Tidak ada kandidat yang dimasukkan ke kode aplikasi atau dijanjikan sebagai hasil implementasi baseline. Rancangan dapat ditinjau lewat [prototype](redesign-prototype.html); contoh visual belum mengimplementasikan drag, file parser, encoder, theme gelap, X/Y, atau seluruh gate rilis di atas.
