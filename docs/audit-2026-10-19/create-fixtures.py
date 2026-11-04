"""Synthetic images only; no real identity documents. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, PngImagePlugin

out = Path(__file__).parent / 'evidence' / 'fixtures'
out.mkdir(parents=True, exist_ok=True)
for name, size, color in [
    ('portrait.png', (900, 1200), '#e8f0ff'),
    ('landscape.jpg', (1200, 800), '#e8fff4'),
    ('large.jpg', (6000, 4000), '#fbf1df'),
    ('duplicate.png', (600, 400), '#ffcccc'),
    ('duplicate.jpg', (600, 400), '#ccffcc'),
    ('small.webp', (400, 300), '#ddeeff'),
]:
    im = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(im)
    draw.rectangle((size[0]*.1, size[1]*.1, size[0]*.9, size[1]*.9), outline='#15332d', width=5)
    draw.text((size[0]*.15, size[1]*.2), 'SYNTHETIC TEST ONLY - NOT A REAL DOCUMENT', fill='#15332d')
    im.save(out / name)
transparent = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
ImageDraw.Draw(transparent).ellipse((150, 150, 350, 350), fill='#146954')
meta = PngImagePlugin.PngInfo()
meta.add_text('PrivateTestMarker', 'SYNTHETIC_METADATA_20261019')
transparent.save(out / 'transparent.png', pnginfo=meta)
transparent.resize((100, 100)).save(out / 'logo.png')
Image.new('RGBA', (1, 1), '#ffffff').save(out / 'tiny.png')
exif = Image.Exif()
exif[0x010E] = 'SYNTHETIC_PRIVATE_DESCRIPTION_20261019'
exif[0x013B] = 'SYNTHETIC_PRIVATE_AUTHOR'
exif[0x0112] = 6
Image.new('RGB', (800, 600), '#eadcf5').save(out / 'metadata-oriented.jpg', exif=exif)
(out / 'corrupt.png').write_bytes(b'NOT_A_PNG_SYNTHETIC')
(out / 'unsupported.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>')
print(f'Synthetic fixtures: {out}')
