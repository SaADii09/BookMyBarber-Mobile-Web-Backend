/**
 * Makes outer black pixels transparent on Android brand icons for splash/adaptive use.
 * Usage: node scripts/prepare-brand-splash.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = join(__dirname, '../assets/images/brand');

const python = `
from PIL import Image
import os
brand = ${JSON.stringify(brandDir.replace(/\\/g, '/'))}
TH = 24
pairs = [
  ('android-512-light.png', 'android-splash-light.png'),
  ('android-512-dark.png', 'android-splash-dark.png'),
  ('android-512-light.png', 'android-adaptive-foreground-light.png'),
  ('android-512-dark.png', 'android-adaptive-foreground-dark.png'),
]
for inp, out in pairs:
    im = Image.open(os.path.join(brand, inp)).convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= TH and g <= TH and b <= TH:
                px[x, y] = (r, g, b, 0)
    path = os.path.join(brand, out)
    im.save(path)
    print('Wrote', path)
`;

const result = spawnSync('python', ['-c', python], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('prepare-brand-splash failed — install Pillow: pip install pillow');
  process.exit(1);
}
