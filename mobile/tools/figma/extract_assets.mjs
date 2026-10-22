import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const mobileRoot = path.resolve('.');
const svgPath = path.join(mobileRoot, 'design-reference/QueueLess (Community).svg');
const outDir = path.join(mobileRoot, 'src/assets/illustrations');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  console.log('Extracting embedded images and patterns from QueueLess (Community).svg...');
  const stream = fs.createReadStream(svgPath);
  const rl = readline.createInterface({ input: stream });

  let currentPattern = null;
  const patterns = {};

  for await (const line of rl) {
    const pMatch = line.match(/<pattern id="([^"]+)"/);
    if (pMatch) currentPattern = pMatch[1];
    if (currentPattern && line.includes('xlink:href="data:image/png;base64,')) {
      const dataMatch = line.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
      if (dataMatch) {
        patterns[currentPattern] = dataMatch[1];
        currentPattern = null;
      }
    }
  }

  console.log(`Found ${Object.keys(patterns).length} embedded base64 image patterns.`);

  // Let's inspect the cached nodes to see which patterns belong to onboarding 1, 2, 3
  const c = JSON.parse(
    fs.readFileSync('tools/figma/.cache/_files_9GTY20bTnNeXrW5UJUagZk_nodes_ids_10_1860_127_112_165_102_165_119_geometry_paths.json', 'utf8')
  );

  const screens = [
    { name: 'onboarding-1', node: c.nodes['127:112'].document },
    { name: 'onboarding-2', node: c.nodes['165:102'].document },
    { name: 'onboarding-3', node: c.nodes['165:119'].document },
  ];

  for (const s of screens) {
    const imgNode = s.node.children.find((c) => c.name.includes('removebg') || c.type === 'RECTANGLE' && c.fills?.some((f) => f.type === 'IMAGE'));
    if (imgNode) {
      console.log(`Screen ${s.name}: image node "${imgNode.name}" id=${imgNode.id}`);
    }
  }
}

run().catch(console.error);
