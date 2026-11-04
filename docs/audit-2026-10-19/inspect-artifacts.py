"""Inspect actual generated output bytes; does not change application sources."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import zipfile
from PIL import Image

base = Path(__file__).parent / 'evidence'
root = Path(__file__).resolve().parents[2]
results = json.loads((base / 'results.json').read_text())
output = {'archives': {}, 'pngs': {}, 'sourceMetadata': {}, 'sourceIntegrity': {}}
for archive in sorted(base.glob('*.zip')):
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None, archive.name
        output['archives'][archive.name] = z.namelist()
        for name in z.namelist():
            with Image.open(BytesIO(z.read(name))) as image:
                image.verify()
for file in sorted(base.glob('*export.png')):
    with Image.open(file) as image:
        output['pngs'][file.name] = {'size': image.size, 'info': image.info, 'mode': image.mode}
with Image.open(base / 'fixtures/metadata-oriented.jpg') as image:
    output['sourceMetadata']['jpegExif'] = dict(image.getexif())
with Image.open(base / 'fixtures/transparent.png') as image:
    output['sourceMetadata']['pngInfo'] = image.info
for relative, expected in results['sourceHashes'].items():
    actual = hashlib.sha256((root / relative).read_bytes()).hexdigest()
    output['sourceIntegrity'][relative] = actual == expected
assert all(output['sourceIntegrity'].values()), 'Application changed since audit!'
assert len(output['archives']['batch-normal.zip']) == 4
assert len(output['archives']['batch-duplicates.zip']) == 1  # reproduced existing bug
assert len(output['archives']['batch-ten.zip']) == 1  # same basename collision
assert output['pngs']['large-export.png']['size'] == (2000, 1333)
assert output['pngs']['metadata-export.png']['size'] == (600, 800)
for file in ['metadata-export.png', 'transparent-export.png']:
    assert 'SYNTHETIC_' not in json.dumps(output['pngs'][file]['info'])
(base / 'artifact-inspection.json').write_text(json.dumps(output, indent=2), encoding='utf-8')
print(json.dumps(output, indent=2))
