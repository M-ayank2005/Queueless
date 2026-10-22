import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const assetsDir = path.resolve('assets');

function drawIcon(size, padding = 0.22, bg = [40, 77, 131, 255]) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const outerR = (size * (1 - padding * 2)) / 2;
  const strokeW = Math.max(2, size * 0.04);
  const innerR = outerR * 0.62;

  // Background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = bg[0];
      png.data[idx + 1] = bg[1];
      png.data[idx + 2] = bg[2];
      png.data[idx + 3] = bg[3];

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer circle stroke
      const outerDiff = Math.abs(dist - outerR);
      if (outerDiff < strokeW / 2) {
        const alpha = Math.min(1, Math.max(0, 1 - outerDiff / (strokeW / 2)));
        if (alpha > 0) {
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 255;
        }
      }

      // Inner circle stroke
      const innerDiff = Math.abs(dist - innerR);
      if (innerDiff < strokeW / 2) {
        const alpha = Math.min(1, Math.max(0, 1 - innerDiff / (strokeW / 2)));
        if (alpha > 0) {
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 255;
        }
      }

      // Tail of speech bubble Q (bottom-right pointing outward)
      // from (center + outerR*0.7, center + outerR*0.7) to (center + outerR*0.95, center + outerR*0.95)
      const tailX = center + outerR * 0.82;
      const tailY = center + outerR * 0.82;
      const dTail = Math.sqrt((x - tailX) ** 2 + (y - tailY) ** 2);
      if (dTail < strokeW * 0.9 && x > center && y > center) {
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      }
    }
  }

  return png;
}

const icon1024 = drawIcon(1024, 0.22, [40, 77, 131, 255]);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), PNG.sync.write(icon1024));

const adaptiveIcon = drawIcon(1024, 0.30, [40, 77, 131, 0]);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), PNG.sync.write(adaptiveIcon));

const fav = drawIcon(48, 0.15, [40, 77, 131, 255]);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), PNG.sync.write(fav));

console.log('App icons generated successfully in mobile/assets/');
