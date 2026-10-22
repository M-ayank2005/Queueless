import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const mobileRoot = path.resolve('.');
const svgPath = path.join(mobileRoot, 'design-reference/QueueLess (Community).svg');
const outDir = path.join(mobileRoot, 'src/assets/illustrations');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  console.log('Searching for pattern24_0_1, pattern25_0_1, pattern26_0_1 in SVG...');
  const stream = fs.createReadStream(svgPath);
  const rl = readline.createInterface({ input: stream });

  const targetImages = {
    image19_0_1: 'onboarding-1.png',
    image20_0_1: 'onboarding-2.png',
    image21_0_1: 'onboarding-3.png',
  };

  let activeImage = null;

  for await (const line of rl) {
    for (const [imgId, fileName] of Object.entries(targetImages)) {
      if (line.includes(`id="${imgId}"`)) {
        const match = line.match(/base64,([^"]+)"/);
        if (match) {
          const dest = path.join(outDir, fileName);
          fs.writeFileSync(dest, Buffer.from(match[1], 'base64'));
          console.log(`Saved: ${fileName} (${Math.round(match[1].length * 0.75 / 1024)} KB)`);
        } else {
          activeImage = { imgId, fileName };
        }
        break;
      }
    }

    if (activeImage && line.includes('base64,')) {
      const match = line.match(/base64,([^"]+)"/);
      if (match) {
        const dest = path.join(outDir, activeImage.fileName);
        fs.writeFileSync(dest, Buffer.from(match[1], 'base64'));
        console.log(`Saved: ${activeImage.fileName} (${Math.round(match[1].length * 0.75 / 1024)} KB)`);
        activeImage = null;
      }
    }
  }

  console.log('Done extracting onboarding illustrations!');
}

run().catch(console.error);
