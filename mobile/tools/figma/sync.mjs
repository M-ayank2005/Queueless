import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, '../..');
const cacheDir = path.join(__dirname, '.cache');
const specDir = path.join(mobileRoot, 'design-spec');
const refDir = path.join(mobileRoot, 'design-reference/figma');
const iconsDir = path.join(mobileRoot, 'src/assets/icons');
const illustrationsDir = path.join(mobileRoot, 'src/assets/illustrations');

[cacheDir, specDir, refDir, iconsDir, illustrationsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function loadEnv() {
  const envPaths = [
    path.join(mobileRoot, '.env'),
    path.join(mobileRoot, '..', '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

if (!token || !fileKey) {
  console.error('Error: FIGMA_TOKEN or FIGMA_FILE_KEY not found in environment variables or .env file.');
  process.exit(1);
}

const BASE_URL = 'https://api.figma.com/v1';

async function fetchFigma(endpoint, retries = 4) {
  const cacheKey = endpoint.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const cacheFile = path.join(cacheDir, `${cacheKey}.json`);

  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch (e) {
      // cache corrupted, re-fetch
    }
  }

  const url = `${BASE_URL}${endpoint}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Fetching: ${endpoint.slice(0, 80)}...`);
      const res = await fetch(url, {
        headers: {
          'X-Figma-Token': token,
        },
      });

      if (res.status === 403 || res.status === 404) {
        console.error(`FIGMA_API_STATUS_${res.status}: The request returned ${res.status}.`);
        console.error('Likely causes: The link is a Figma Community URL or the token lacks read access to file content.');
        process.exit(2);
      }

      if (res.status === 429) {
        const retryHeader = res.headers.get('retry-after');
        const waitSec = Number(retryHeader) > 0 ? Number(retryHeader) : 30;
        console.warn(`Figma 429 Rate Limit hit. Waiting ${waitSec} seconds (attempt ${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Figma API error (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
      // Polite pacing delay to stay under Figma rate limits
      await new Promise((r) => setTimeout(r, 1200));
      return data;
    } catch (err) {
      console.warn(`Request failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

function rgbaToHex(color, opacity = 1) {
  if (!color) return null;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? color.a * opacity : opacity;
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  return { hex, alpha: Math.round(a * 100) / 100 };
}

// Target frames to process
const TARGET_FRAMES = [
  { name: 'Launch first screen', id: '10:1860', file: 'launch-first-screen' },
  { name: 'Onboarding Screen-1', id: '127:112', file: 'onboarding-screen-1' },
  { name: 'Onboarding Screen-2', id: '165:102', file: 'onboarding-screen-2' },
  { name: 'Onboarding Screen-3', id: '165:119', file: 'onboarding-screen-3' },
  { name: 'Login-1', id: '10:1685', file: 'login-1' },
  { name: 'Signup', id: '10:1802', file: 'signup' },
  { name: 'home-1', id: '10:1574', file: 'home-1' },
  { name: 'queue-1', id: '10:1293', file: 'queue-1' },
  { name: 'Detail-1', id: '10:1864', file: 'detail-1' },
  { name: 'Join queue-1', id: '10:1330', file: 'join-queue-1' },
  { name: 'Notification-1', id: '10:1187', file: 'notification-1' },
  { name: 'Notification-1-1', id: '44:553', file: 'notification-1-1' },
  { name: 'Updates-1', id: '10:1231', file: 'updates-1' },
];

const tokenStats = {
  colors: new Map(),
  typography: new Map(),
  radii: new Map(),
  shadows: new Map(),
  spacing: new Map(),
};

function trimNode(node, originX = 0, originY = 0) {
  const box = node.absoluteBoundingBox || { x: originX, y: originY, width: 0, height: 0 };
  const trimmed = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: Math.round((box.x - originX) * 10) / 10,
    y: Math.round((box.y - originY) * 10) / 10,
    width: Math.round(box.width * 10) / 10,
    height: Math.round(box.height * 10) / 10,
  };

  if (node.opacity !== undefined && node.opacity !== 1) {
    trimmed.opacity = Math.round(node.opacity * 100) / 100;
  }

  // Fills
  if (Array.isArray(node.fills) && node.fills.length > 0) {
    trimmed.fills = node.fills
      .filter((f) => f.visible !== false)
      .map((f) => {
        if (f.type === 'SOLID') {
          const color = rgbaToHex(f.color, f.opacity);
          const colorKey = color.alpha < 1 ? `${color.hex} (${Math.round(color.alpha * 100)}%)` : color.hex;
          tokenStats.colors.set(colorKey, (tokenStats.colors.get(colorKey) || 0) + 1);
          return { type: 'SOLID', ...color };
        }
        if (f.type.startsWith('GRADIENT')) {
          const stops = (f.gradientStops || []).map((s) => ({
            position: Math.round(s.position * 100) / 100,
            ...rgbaToHex(s.color),
          }));
          const gradDesc = stops.map((s) => s.hex).join(' -> ');
          tokenStats.colors.set(`Gradient: ${gradDesc}`, (tokenStats.colors.get(`Gradient: ${gradDesc}`) || 0) + 1);
          return {
            type: f.type,
            gradientHandlePositions: f.gradientHandlePositions,
            stops,
          };
        }
        return { type: f.type };
      });
  }

  // Strokes
  if (Array.isArray(node.strokes) && node.strokes.length > 0) {
    trimmed.strokes = node.strokes
      .filter((s) => s.visible !== false)
      .map((s) => {
        if (s.type === 'SOLID') {
          const color = rgbaToHex(s.color, s.opacity);
          const colorKey = color.alpha < 1 ? `${color.hex} (${Math.round(color.alpha * 100)}%)` : color.hex;
          tokenStats.colors.set(colorKey, (tokenStats.colors.get(colorKey) || 0) + 1);
          return { type: 'SOLID', ...color };
        }
        return { type: s.type };
      });
    if (node.strokeWeight) trimmed.strokeWeight = node.strokeWeight;
    if (node.strokeAlign) trimmed.strokeAlign = node.strokeAlign;
  }

  // Corner Radii
  if (node.cornerRadius !== undefined) {
    trimmed.cornerRadius = node.cornerRadius;
    tokenStats.radii.set(node.cornerRadius, (tokenStats.radii.get(node.cornerRadius) || 0) + 1);
  } else if (node.rectangleCornerRadii) {
    trimmed.rectangleCornerRadii = node.rectangleCornerRadii;
    const key = `[${node.rectangleCornerRadii.join(', ')}]`;
    tokenStats.radii.set(key, (tokenStats.radii.get(key) || 0) + 1);
  }

  // Effects (Shadows)
  if (Array.isArray(node.effects) && node.effects.length > 0) {
    trimmed.effects = node.effects
      .filter((e) => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
      .map((e) => {
        const shadow = {
          type: e.type,
          offset: e.offset,
          radius: e.radius,
          spread: e.spread || 0,
          color: rgbaToHex(e.color),
        };
        const shadowKey = `${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius}px rgba(${Math.round(e.color?.r * 255)}, ${Math.round(e.color?.g * 255)}, ${Math.round(e.color?.b * 255)}, ${Math.round((e.color?.a || 1) * 100) / 100})`;
        tokenStats.shadows.set(shadowKey, (tokenStats.shadows.get(shadowKey) || 0) + 1);
        return shadow;
      });
  }

  // Text
  if (node.type === 'TEXT') {
    const style = node.style || {};
    trimmed.text = {
      characters: node.characters,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeightPx: style.lineHeightPx ? Math.round(style.lineHeightPx * 10) / 10 : undefined,
      letterSpacing: style.letterSpacing ? Math.round(style.letterSpacing * 100) / 100 : 0,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
    };
    const typoKey = `${style.fontFamily} ${style.fontSize}px w${style.fontWeight} (lineHeight: ${trimmed.text.lineHeightPx || 'auto'}, letterSpacing: ${trimmed.text.letterSpacing})`;
    tokenStats.typography.set(typoKey, (tokenStats.typography.get(typoKey) || 0) + 1);
  }

  // Auto Layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    trimmed.autoLayout = {
      layoutMode: node.layoutMode,
      itemSpacing: node.itemSpacing || 0,
      paddingTop: node.paddingTop || 0,
      paddingRight: node.paddingRight || 0,
      paddingBottom: node.paddingBottom || 0,
      paddingLeft: node.paddingLeft || 0,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
    };
    if (node.itemSpacing) {
      tokenStats.spacing.set(`Gap: ${node.itemSpacing}px`, (tokenStats.spacing.get(`Gap: ${node.itemSpacing}px`) || 0) + 1);
    }
    const paddingKey = `Padding: ${node.paddingTop || 0}/${node.paddingRight || 0}/${node.paddingBottom || 0}/${node.paddingLeft || 0}`;
    tokenStats.spacing.set(paddingKey, (tokenStats.spacing.get(paddingKey) || 0) + 1);
  }

  // Children
  if (Array.isArray(node.children)) {
    trimmed.children = node.children.map((c) => trimNode(c, originX, originY));
  }

  return trimmed;
}

async function exportImages(nodeIds, format = 'png', scale = 1) {
  if (nodeIds.length === 0) return {};
  const idsParam = nodeIds.join(',');
  const query = `/images/${fileKey}?ids=${idsParam}&format=${format}${format === 'png' ? `&scale=${scale}` : ''}`;
  const data = await fetchFigma(query);
  return data.images || {};
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

async function run() {
  console.log('=== STEP 0: FIGMA SYNC & ASSET EXTRACTION ===\n');

  // 1. Fetch frames
  console.log('1. Fetching trimmed node specs for all target frames...');
  for (const target of TARGET_FRAMES) {
    const specFilePath = path.join(specDir, `${target.file}.json`);
    let spec;
    if (fs.existsSync(specFilePath)) {
      console.log(`Loading existing spec: ${target.file}.json`);
      spec = JSON.parse(fs.readFileSync(specFilePath, 'utf8'));
    } else {
      const res = await fetchFigma(`/files/${fileKey}/nodes?ids=${target.id}&geometry=paths`);
      const rawNode = res?.nodes?.[target.id]?.document;
      if (!rawNode) {
        console.warn(`Warning: Frame "${target.name}" (${target.id}) not found in node response.`);
        continue;
      }
      const origin = rawNode.absoluteBoundingBox || { x: 0, y: 0 };
      spec = trimNode(rawNode, origin.x, origin.y);
      fs.writeFileSync(specFilePath, JSON.stringify(spec, null, 2), 'utf8');
      console.log(`Saved spec: design-spec/${target.file}.json (${spec.width}x${spec.height})`);
    }
  }

  // 2. Export Reference PNGs (scale 1) into design-reference/figma/
  console.log('\n2. Exporting Reference PNGs at scale 1 into design-reference/figma/...');
  const pngUrls = await exportImages(frameIds, 'png', 1);
  for (const target of TARGET_FRAMES) {
    const url = pngUrls[target.id];
    if (url) {
      const dest = path.join(refDir, `${target.file}.png`);
      await downloadFile(url, dest);
      console.log(`Downloaded reference PNG: ${target.file}.png`);
    }
  }

  // 3. Export Key Assets: Logo, Onboarding illustrations, Icons
  console.log('\n3. Discovering and exporting icons and illustrations...');
  // Let's locate the Logo: arcticons:quora (id: 26:213)
  // And onboarding illustrations inside 127:112, 165:102, 165:119
  const assetNodesToExport = [
    { id: '26:213', name: 'logo-q', format: 'svg' },
  ];

  // Search inside onboarding frames for illustration groups/vectors
  for (const target of TARGET_FRAMES.filter((f) => f.name.startsWith('Onboarding'))) {
    const frameNode = frameNodes[target.id]?.document;
    if (frameNode) {
      // Find children that represent the blob or character illustrations
      const illustNodes = (frameNode.children || []).filter(
        (c) => c.name.toLowerCase().includes('group') || c.name.toLowerCase().includes('illustration') || c.type === 'GROUP' || c.name.includes('Frame')
      );
      illustNodes.forEach((n, idx) => {
        assetNodesToExport.push({
          id: n.id,
          name: `${target.file}-asset-${idx + 1}-${n.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          format: 'svg',
        });
      });
    }
  }

  console.log(`Exporting ${assetNodesToExport.length} discovered SVG assets...`);
  const svgUrls = await exportImages(assetNodesToExport.map((a) => a.id), 'svg');
  for (const asset of assetNodesToExport) {
    const url = svgUrls[asset.id];
    if (url) {
      const dest = path.join(illustrationsDir, `${asset.name}.svg`);
      await downloadFile(url, dest);
      console.log(`Downloaded asset: ${asset.name}.svg`);
    }
  }

  // 4. Generate TOKENS.md
  console.log('\n4. Generating design-spec/TOKENS.md...');
  const sortedColors = Array.from(tokenStats.colors.entries()).sort((a, b) => b[1] - a[1]);
  const sortedTypography = Array.from(tokenStats.typography.entries()).sort((a, b) => b[1] - a[1]);
  const sortedRadii = Array.from(tokenStats.radii.entries()).sort((a, b) => b[1] - a[1]);
  const sortedShadows = Array.from(tokenStats.shadows.entries()).sort((a, b) => b[1] - a[1]);
  const sortedSpacing = Array.from(tokenStats.spacing.entries()).sort((a, b) => b[1] - a[1]);

  let tokensMd = '# QueueLess Design Tokens (Extracted from Figma)\n\n';
  tokensMd += `Generated on: ${new Date().toISOString()}\n`;
  tokensMd += `Source Figma File: ${fileKey}\n\n`;

  tokensMd += '## 1. Colors & Gradients\n\n';
  tokensMd += '| Color / Gradient | Usage Count | Suggested Theme Token |\n';
  tokensMd += '| :--- | :--- | :--- |\n';
  for (const [color, count] of sortedColors) {
    let tokenName = 'custom';
    if (color.includes('#284D83')) tokenName = 'colors.primary / navy';
    else if (color.includes('#3E6BB2')) tokenName = 'colors.primaryGradientEnd / brandBlue';
    else if (color.includes('#FFFFFF')) tokenName = 'colors.background / white';
    else if (color.includes('#000000') || color.includes('#1A1A1A')) tokenName = 'colors.textPrimary';
    else if (color.includes('#525252')) tokenName = 'colors.textSecondary';
    else if (color.includes('#858585')) tokenName = 'colors.textMuted';
    else if (color.includes('#F7F7F7')) tokenName = 'colors.inputBg / chipInactive';
    else if (color.includes('#E6EDF7')) tokenName = 'colors.brandTint';
    else if (color.includes('#C6E5D2') || color.includes('#047857')) tokenName = 'colors.statusOpen';
    else if (color.includes('#F3C3AD') || color.includes('#F9773B')) tokenName = 'colors.statusCloseSoon';
    else if (color.includes('#F4A8AE') || color.includes('#FC0015')) tokenName = 'colors.statusClosed / danger';
    tokensMd += `| \`${color}\` | ${count} | ${tokenName} |\n`;
  }

  tokensMd += '\n## 2. Typography\n\n';
  tokensMd += '| Style | Usage Count |\n';
  tokensMd += '| :--- | :--- |\n';
  for (const [typo, count] of sortedTypography) {
    tokensMd += `| ${typo} | ${count} |\n`;
  }

  tokensMd += '\n## 3. Corner Radii\n\n';
  tokensMd += '| Radius | Usage Count |\n';
  tokensMd += '| :--- | :--- |\n';
  for (const [rad, count] of sortedRadii) {
    tokensMd += `| \`${rad}\` | ${count} |\n`;
  }

  tokensMd += '\n## 4. Drop Shadows\n\n';
  tokensMd += '| Shadow | Usage Count |\n';
  tokensMd += '| :--- | :--- |\n';
  for (const [shadow, count] of sortedShadows) {
    tokensMd += `| \`${shadow}\` | ${count} |\n`;
  }

  tokensMd += '\n## 5. Spacing & Auto-Layout Paddings / Gaps\n\n';
  tokensMd += '| Metric | Usage Count |\n';
  tokensMd += '| :--- | :--- |\n';
  for (const [sp, count] of sortedSpacing.slice(0, 30)) {
    tokensMd += `| \`${sp}\` | ${count} |\n`;
  }

  const tokensPath = path.join(specDir, 'TOKENS.md');
  fs.writeFileSync(tokensPath, tokensMd, 'utf8');
  console.log('Saved tokens summary to: design-spec/TOKENS.md');

  console.log('\n=== STEP 0 COMPLETE ===');
}

run().catch((err) => {
  console.error('Error during execution:', err);
  process.exit(1);
});
