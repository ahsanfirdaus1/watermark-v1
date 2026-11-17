// Smoke test for compress.html. Needs Node, an installed Playwright and Chrome.
//   PLAYWRIGHT_MODULE=<path to playwright> node tests/compress-smoke.cjs
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const fx = f => path.join(root, 'docs/audit-2026-10-19/evidence/fixtures', f);
const url = 'file:///' + path.join(root, 'compress.html').replace(/\\/g, '/');
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + detail : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  page.on('request', r => { const u = r.url(); if (!/^(file|blob|data):/.test(u)) problems.push('network: ' + u); });
  await page.goto(url);

  // A noisy 3000x2000 photo-like JPEG, so a 200 KB target is a real squeeze.
  const noisy = path.join(os.tmpdir(), 'cmp-noisy.jpg');
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d');
    const d = x.createImageData(3000, 2000);
    for (let i = 0; i < d.data.length; i += 4) { const v = (i / 4 * 7919) % 256; d.data[i] = v; d.data[i + 1] = (v * 3) % 256; d.data[i + 2] = (v * 5) % 256; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95)); const buf = new Uint8Array(await b.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s);
  });
  fs.writeFileSync(noisy, Buffer.from(b64, 'base64'));

  const status = () => page.textContent('#cmpStatus');
  // Done when the run is no longer "working": either the download link is back or a warning is shown.
  const settle = () => page.waitForFunction(() => {
    const s = document.getElementById('cmpStatus');
    return !/Mengompres|Compressing/.test(s.textContent) && (!document.getElementById('cmpDownload').hidden || s.classList.contains('is-warn'));
  }, null, { timeout: 60000 });
  const download = async () => { const [d] = await Promise.all([page.waitForEvent('download'), page.click('#cmpDownload')]); return fs.readFileSync(await d.path()); };
  const jpegInfo = buf => {
    let i = 2, app1 = false, w = 0, h = 0;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xe1) app1 = true;
      if (m >= 0xc0 && m <= 0xc2) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { app1, w, h, soi: buf[0] === 0xff && buf[1] === 0xd8 };
  };
  const warn = () => page.$eval('#cmpStatus', e => e.classList.contains('is-warn'));

  // 1. Noisy photo: 200 KB preset fits, or an honest warning says it cannot above the quality floor.
  await page.setInputFiles('#cmpFile', noisy); await settle();
  let out = await page.evaluate(() => 0), info;
  if (!(await warn())) { out = await download(); info = jpegInfo(out); check('200 KB preset fits', out.length <= 200 * 1024, out.length + ' B, ' + info.w + 'x' + info.h); }
  else check('200 KB preset warns when it cannot fit', /200/.test(await status()), await status());
  // 2. Larger target keeps quality and passes without a warning.
  await page.click('#cmpPresets [data-kb="1000"]'); await settle();
  out = await download(); info = jpegInfo(out);
  check('1 MB preset fits, no warning', out.length <= 1000 * 1024 && !(await warn()), out.length + ' B');
  check('output is a JPEG, longest side <= 1600', info.soi && Math.max(info.w, info.h) <= 1600, info.w + 'x' + info.h);
  // 3. Impossible target warns and still gives a file.
  await page.fill('#cmpCustom', '20'); await page.click('#cmpCustomBtn'); await settle();
  check('20 KB target warns', await warn(), await status());
  check('20 KB target still offers a file', !(await page.$eval('#cmpDownload', e => e.hidden)));
  // 4. Manual change recompresses (latest wins) and flips the mode label.
  await page.selectOption('#cmpSide', '800'); await settle();
  check('manual mode label', (await page.textContent('#cmpMode')) === 'Manual', await page.textContent('#cmpMode'));
  out = await download(); info = jpegInfo(out);
  check('manual 800 px side', Math.max(info.w, info.h) <= 800, info.w + 'x' + info.h);
  // 5. Metadata: the oriented fixture keeps no EXIF segment and matches what the browser shows.
  await page.setInputFiles('#cmpFile', fx('metadata-oriented.jpg')); await settle();
  out = await download(); info = jpegInfo(out);
  const nat = await page.$eval('#cmpImgBefore', i => [i.naturalWidth, i.naturalHeight]);
  check('no EXIF in output', !info.app1);
  check('orientation matches browser', info.w === nat[0] && info.h === nat[1], info.w + 'x' + info.h + ' vs ' + nat.join('x'));
  // 6. Transparent PNG gets a white background.
  await page.setInputFiles('#cmpFile', fx('transparent.png')); await settle();
  out = await download();
  const px = await page.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); return Array.from(x.getImageData(0, 0, 1, 1).data);
  }, out.toString('base64'));
  check('transparent PNG becomes white', px[0] > 240 && px[1] > 240 && px[2] > 240, px.join(','));
  // 7. Bad input is refused with a message and the workspace stays.
  await page.setInputFiles('#cmpFile', fx('corrupt.png')); await page.waitForTimeout(500);
  check('corrupt file refused', /rusak|tidak dapat dibaca|tidak didukung/.test(await status()), await status());
  await page.setInputFiles('#cmpFile', fx('unsupported.svg')); await page.waitForTimeout(500);
  check('svg refused', /tidak didukung/.test(await status()), await status());
  check('workspace still open after refusal', !(await page.$eval('#cmpWork', e => e.hidden)));
  // 8. Zoom, view, language, clear. Previews must actually draw (not collapse to a dot).
  for (const id of ['cmpImgBefore', 'cmpImgAfter']) {
    const box = await page.$eval('#' + id, i => { const r = i.getBoundingClientRect(); return [r.width, r.height]; });
    check('fit preview draws ' + id, box[0] > 100 && box[1] > 50, box.map(Math.round).join('x'));
  }
  await page.click('#cmpZooms [data-zoom="1"]');
  const z1 = await page.$eval('#cmpImgAfter', i => [Math.round(i.getBoundingClientRect().width), i.naturalWidth]);
  check('100% zoom shows natural width', z1[0] === z1[1], z1.join(' vs '));
  await page.click('#cmpZooms [data-zoom="2"]');
  check('zoom class applied', await page.$eval('#cmpViewAfter', e => e.classList.contains('zoom-2')));
  await page.click('#cmpViews [data-view="after"]');
  check('single view hides original pane', await page.$eval('#cmpPaneBefore', e => e.hidden));
  await page.selectOption('#languageSelect', 'en');
  check('language switches', (await page.textContent('#cmpDownload')) === 'Download JPG');
  await page.click('#cmpClear');
  check('clear returns to picker', (await page.$eval('#cmpWork', e => e.hidden)) && !(await page.$eval('#cmpDrop', e => e.hidden)));
  // 9. Layout: no sideways scroll with the workspace open.
  for (const w of [320, 390, 1280]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.setInputFiles('#cmpFile', fx('large.jpg')); await settle();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('no horizontal overflow at ' + w, over <= 0, 'over=' + over);
    await page.click('#cmpClear');
  }
  // 10. Mode "Gambar lain": batch, ZIP, WebP, per-image target, limits.
  const JSZip = require(path.join(root, 'lib/jszip.min.js'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('#cmpModes [data-mode="other"]');
  check('other mode shows its panel only', !(await page.$eval('#othPanel', e => e.hidden)) && (await page.$eval('#ktpPanel', e => e.hidden)));
  const othDone = n => page.waitForFunction(count => {
    const rows = document.querySelectorAll('#othList .oth-row');
    return rows.length === count && [...rows].every(r => r.querySelector('a'));
  }, n, { timeout: 60000 });
  await page.setInputFiles('#othFile', [fx('landscape.jpg'), fx('portrait.png'), fx('small.webp')]); await othDone(3);
  check('zip button ready for 3 images', !(await page.$eval('#othZip', e => e.hidden)) && !(await page.$eval('#othZip', e => e.disabled)));
  check('summary shown', /3 (gambar|images)/.test(await page.textContent('#othSummary')), await page.textContent('#othSummary'));
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#othZip')]);
  let zip = await JSZip.loadAsync(fs.readFileSync(await dl.path())), zn = Object.keys(zip.files);
  check('zip holds 3 unique files', zn.length === 3 && new Set(zn).size === 3, zn.join(','));
  // Same base name from two formats must not overwrite each other.
  await page.click('#othClear');
  await page.setInputFiles('#othFile', [fx('duplicate.jpg'), fx('duplicate.png')]); await othDone(2);
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#othZip')]);
  zip = await JSZip.loadAsync(fs.readFileSync(await dl.path())); zn = Object.keys(zip.files).sort();
  check('duplicate names get a suffix', zn.length === 2 && zn[0] !== zn[1], zn.join(','));
  // WebP output: real WebP, no EXIF chunk.
  await page.selectOption('#othFormat', 'image/webp'); await othDone(2);
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#othList .oth-row a')]);
  let wb = fs.readFileSync(await dl.path());
  check('webp output is WebP without EXIF', wb.slice(0, 4).toString() === 'RIFF' && wb.slice(8, 12).toString() === 'WEBP' && !wb.includes('EXIF'), wb.length + ' B');
  // Per-image KB target on a noisy photo.
  await page.selectOption('#othFormat', 'image/jpeg');
  await page.click('#othClear');
  await page.setInputFiles('#othFile', noisy); await othDone(1);
  await page.fill('#othTarget', '150'); await page.press('#othTarget', 'Enter'); await page.dispatchEvent('#othTarget', 'change'); await othDone(1);
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#othList .oth-row a')]);
  wb = fs.readFileSync(await dl.path());
  const missed = (await page.$$('#othList .is-warn')).length > 0;
  check('150 KB target met or flagged', wb.length <= 150 * 1024 || missed, wb.length + ' B, flagged=' + missed);
  // Limits: 10 images at most, 20 MiB per file.
  await page.click('#othClear');
  const eleven = Array.from({ length: 11 }, () => fx('portrait.png'));
  await page.setInputFiles('#othFile', eleven); await othDone(10);
  check('11th image refused', /Maksimal 10|Maximum 10/.test(await status()), await status());
  await page.click('#othClear');
  await page.setInputFiles('#othFile', { name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(21 * 1048576) }); await page.waitForTimeout(800);
  check('21 MiB file refused', /20 MiB/.test(await status()), await status());
  // Language and layout in this mode.
  await page.selectOption('#languageSelect', 'en');
  await page.setInputFiles('#othFile', [fx('landscape.jpg'), fx('portrait.png'), fx('small.webp')]); await othDone(3);
  check('zip button translates', (await page.textContent('#othZip')) === 'Download ZIP');
  for (const w of [320, 390, 1280]) {
    await page.setViewportSize({ width: w, height: 800 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('other mode: no horizontal overflow at ' + w, over <= 0, 'over=' + over);
  }
  // 11. Navigation between the two pages must work from a plain file:// open too (a "./" link lists the folder there).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url);
  await page.click('.site-nav a:nth-child(1)'); await page.waitForLoadState();
  check('nav: Kompres -> Watermark lands on index.html', page.url().endsWith('/index.html'), page.url());
  check('nav: Watermark page marks itself current', (await page.getAttribute('.site-nav a:nth-child(1)', 'aria-current')) === 'page');
  await page.click('.site-nav a:nth-child(2)'); await page.waitForLoadState();
  check('nav: Watermark -> Kompres lands on compress.html', page.url().endsWith('/compress.html'), page.url());
  await page.click('a.brand'); await page.waitForLoadState();
  check('brand link from compress lands on index.html', page.url().endsWith('/index.html'), page.url());
  await page.click('a.brand'); await page.waitForLoadState();
  check('brand link from index stays on index.html', page.url().endsWith('/index.html'), page.url());
  // 12. The watermark editor still works end to end (theme, header and shared-script changes touched it).
  await page.setInputFiles('#fileInput', fx('landscape.jpg'));
  await page.waitForFunction(() => document.getElementById('previewCanvas') && !document.getElementById('previewCanvas').hidden && document.getElementById('previewCanvas').width > 1, null, { timeout: 30000 });
  check('watermark: preview canvas draws', true);
  await page.waitForFunction(() => !document.getElementById('downloadBtn').disabled, null, { timeout: 30000 });
  await page.click('#downloadBtn');
  await page.waitForFunction(() => !document.getElementById('saveLink').hidden, null, { timeout: 60000 });
  const [wm] = await Promise.all([page.waitForEvent('download'), page.click('#saveLink')]);
  const png = fs.readFileSync(await wm.path());
  check('watermark: exports a PNG', png.slice(1, 4).toString() === 'PNG' && png.length > 500, png.length + ' B');
  await page.selectOption('#languageSelect', 'en');
  check('watermark: nav translates', (await page.textContent('.site-nav a:nth-child(2)')) === 'Compress');
  check('no console errors, CSP violations or network requests', problems.length === 0, problems.join(' || '));
  await browser.close();
  fs.rmSync(noisy, { force: true });
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
