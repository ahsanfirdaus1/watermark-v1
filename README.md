# Watermark

A personal, single-page web app for watermarking images — entirely in your browser. Nothing is ever uploaded to a server.

**[Live Demo](#)** <!-- update after deploying to GitHub Pages -->

## Why

Add a text and/or logo watermark to one or more images (scanned documents, photos, etc.) before sharing them, without trusting a third-party service with the files. All processing happens client-side using the HTML5 Canvas API — you can disconnect your internet after the page loads and the app keeps working.

## Features

- **Text watermark** — custom text, font (Arial / Times New Roman / Georgia), color, size, opacity, rotation
- **Logo watermark** — upload a PNG/JPG (transparent PNG recommended) to use instead of, or alongside, text
- **Positioning** — 9-position preset grid, or free-drag anywhere on the image (mouse, touch, and pen supported)
- **Batch processing** — load multiple images, apply the same watermark settings to all of them in one click, then nudge individual images afterward if needed
- **Export** — download the current image, or download all as a `.zip`
- **Auto-downscaling** — large photos (20MP+) are automatically capped at 2000px on their longest side for smooth canvas performance
- **Mobile-first** — bottom-sheet controls on small screens, a full side panel on desktop, touch-friendly targets throughout

## Privacy

- Zero network calls involving your images, at any point — verify it yourself by loading the page, then disconnecting your internet.
- No accounts, no analytics, no tracking, no `localStorage`/`sessionStorage`.
- Every session starts clean — nothing is saved or remembered between visits.
- The only third-party code is [JSZip](https://stuk.github.io/jszip/) (MIT licensed), vendored locally in `lib/` — it's never fetched from a CDN at runtime.

## Usage

Just open [`index.html`](index.html) in a modern browser — no server, no build step, no install required.

1. Add one or more images (drag-and-drop, or tap to browse).
2. Choose text and/or logo watermark, and style it (font, color, size, opacity, rotation).
3. Position it using the preset grid or by dragging it on the preview.
4. For multiple images, click **Apply to All**, then optionally select any thumbnail to nudge its position individually.
5. Click **Download Image** for the current image, or **Download All (.zip)** for everything.

## Tech Stack

Plain HTML, CSS, and vanilla JavaScript — no framework, no bundler, no build pipeline. Chosen deliberately so the project can be served as-is from GitHub Pages with no CI step and no dependency drift.

- **Rendering:** HTML5 Canvas API
- **Image input:** File API (drag-and-drop + file picker)
- **Export:** `canvas.toBlob()` + [JSZip](https://stuk.github.io/jszip/) for batch `.zip` downloads
- **Browser support:** modern evergreen browsers (Chrome, Safari, Firefox, Edge) — desktop and mobile

## Project Structure

```
index.html              Markup and layout
css/styles.css          Mobile-first responsive styles
js/state.js             Shared app state (images, watermark settings)
js/imageLoader.js       Drag-drop / file picker, downscaling, thumbnails
js/renderer.js          Canvas compositing (base image + watermark)
js/dragController.js    Free-drag positioning + 9-position preset grid
js/controlsUI.js        Wiring for all form controls
js/batch.js             Apply-to-all, single/zip export
js/main.js              Entry point — wires everything together
lib/jszip.min.js        Vendored JSZip (MIT licensed)
PRD/                    Product requirements document
```

All JavaScript files are loaded as classic `<script>` tags sharing a `window.WM` namespace (not ES modules) so the app also works when `index.html` is opened directly via `file://`, not just when served over HTTP.

## Deployment

This is a static site — deploy it anywhere that serves static files. For GitHub Pages:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch".
4. Choose your default branch and the `/ (root)` folder, then save.
5. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## License

Personal project. The reference tool this builds on ([watermarkktp.com](https://watermarkktp.com)) is MIT licensed; JSZip (bundled in `lib/`) is MIT licensed.
