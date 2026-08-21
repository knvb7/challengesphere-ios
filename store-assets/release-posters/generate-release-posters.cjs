const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const posterRoot = __dirname;
const finalIphone = path.join(root, 'screenshots', 'final-iphone');
const finalAndroid = path.join(posterRoot, 'android-sources');
const logoPath = path.join(root, 'challengesphere-logo-master-1024.png');
const darkBackground = path.join(posterRoot, 'backgrounds', 'momentum-dark-portrait.png');
const lightBackground = path.join(posterRoot, 'backgrounds', 'momentum-light-portrait.png');
const landscapeBackground = path.join(posterRoot, 'backgrounds', 'orbit-landscape.png');

const campaigns = [
  {
    slug: '01-build-habits-together',
    headline: ['Build habits', 'together.'],
    subhead: ['Share real progress and keep showing up', 'with friends who cheer you on.'],
    appleScreenshot: '01-friends.jpg',
    androidScreenshot: '01-friends.png',
    theme: 'dark',
  },
  {
    slug: '02-find-your-next-challenge',
    headline: ['Find your next', 'challenge.'],
    subhead: ['Discover meaningful goals and join', 'people moving in the same direction.'],
    appleScreenshot: '02-explore.jpg',
    androidScreenshot: '02-explore.png',
    theme: 'light',
  },
  {
    slug: '03-create-it-your-way',
    headline: ['Create it', 'your way.'],
    subhead: ['Start from a template or shape a challenge', 'around the habit you want to build.'],
    appleScreenshot: '03-create.jpg',
    androidScreenshot: '03-create.png',
    theme: 'light',
  },
  {
    slug: '04-turn-progress-into-momentum',
    headline: ['Turn progress', 'into momentum.'],
    subhead: ['Daily proof, streaks, and clear stats', 'make every small win visible.'],
    appleScreenshot: '06-progress.jpg',
    androidScreenshot: '04-progress.png',
    theme: 'dark',
  },
];

const formats = [
  {
    platform: 'apple',
    width: 1242,
    height: 2688,
    headlineSize: 102,
    subheadSize: 36,
    brandSize: 37,
    logoSize: 86,
    top: 90,
    screenWidth: 790,
    screenY: 730,
    radius: 66,
    border: 18,
  },
  {
    platform: 'google-play',
    width: 1080,
    height: 1920,
    headlineSize: 78,
    subheadSize: 30,
    brandSize: 32,
    logoSize: 72,
    top: 62,
    screenWidth: 570,
    screenY: 570,
    radius: 50,
    border: 14,
  },
];

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

function textLines(lines, x, y, size, lineHeight, fill, weight, letterSpacing = 0) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="${size}" ` +
    `font-weight="${weight}" letter-spacing="${letterSpacing}">${escapeXml(line)}</text>`
  )).join('');
}

async function roundedScreenshot(sourcePath, width, radius) {
  const metadata = await sharp(sourcePath).metadata();
  const height = Math.round(width * metadata.height / metadata.width);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
  const buffer = await sharp(sourcePath)
    .resize(width, height, { fit: 'fill' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return { buffer, width, height };
}

function posterOverlay(campaign, format, screen) {
  const dark = campaign.theme === 'dark';
  const text = dark ? '#FFFFFF' : '#171126';
  const muted = dark ? '#D6D1E5' : '#554E68';
  const chipFill = dark ? 'rgba(255,255,255,0.10)' : 'rgba(76,0,226,0.09)';
  const chipStroke = dark ? 'rgba(255,255,255,0.20)' : 'rgba(76,0,226,0.19)';
  const x = Math.round(format.width * 0.075);
  const brandY = format.top + Math.round(format.logoSize * 0.68);
  const headlineY = format.platform === 'apple' ? 320 : 245;
  const headlineLine = Math.round(format.headlineSize * 1.02);
  const subheadY = headlineY + headlineLine * campaign.headline.length + Math.round(format.subheadSize * 0.95);
  const subheadLine = Math.round(format.subheadSize * 1.42);
  const chipY = format.screenY - (format.platform === 'apple' ? 94 : 70);
  const chipWidth = format.platform === 'apple' ? 380 : 322;
  const chipHeight = format.platform === 'apple' ? 56 : 48;
  const chipFont = format.platform === 'apple' ? 24 : 20;
  const screenX = Math.round((format.width - screen.width) / 2);
  const shadowX = screenX - format.border;
  const shadowY = format.screenY - format.border;
  const shadowWidth = screen.width + format.border * 2;
  const shadowHeight = screen.height + format.border * 2;
  const frameRadius = format.radius + format.border;

  return Buffer.from(`
    <svg width="${format.width}" height="${format.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="${format.platform === 'apple' ? 30 : 22}" stdDeviation="${format.platform === 'apple' ? 32 : 24}" flood-color="#070311" flood-opacity="0.46"/>
        </filter>
      </defs>
      <rect x="${shadowX}" y="${shadowY}" width="${shadowWidth}" height="${shadowHeight}" rx="${frameRadius}" fill="${dark ? '#111019' : '#FFFFFF'}" stroke="${dark ? 'rgba(255,255,255,0.32)' : 'rgba(71,0,236,0.18)'}" stroke-width="3" filter="url(#shadow)"/>
      ${textLines(campaign.headline, x, headlineY, format.headlineSize, headlineLine, text, 800, -2.2)}
      ${textLines(campaign.subhead, x, subheadY, format.subheadSize, subheadLine, muted, 500, -0.3)}
      <rect x="${x}" y="${chipY}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${chipFill}" stroke="${chipStroke}" stroke-width="2"/>
      <circle cx="${x + 28}" cy="${chipY + chipHeight / 2}" r="7" fill="${dark ? '#93FFCB' : '#5A00F0'}"/>
      <text x="${x + 48}" y="${chipY + chipHeight * 0.68}" fill="${text}" font-family="Arial, Helvetica, sans-serif" font-size="${chipFont}" font-weight="700" letter-spacing="0.7">REAL CHALLENGES. REAL PROGRESS.</text>
      <text x="${x + format.logoSize + 22}" y="${brandY}" fill="${text}" font-family="Arial, Helvetica, sans-serif" font-size="${format.brandSize}" font-weight="750" letter-spacing="-0.8">ChallengeSphere</text>
    </svg>
  `);
}

async function renderPoster(campaign, format) {
  const outputDir = path.join(posterRoot, format.platform);
  fs.mkdirSync(outputDir, { recursive: true });
  const sourcePath = format.platform === 'google-play'
    ? path.join(finalAndroid, campaign.androidScreenshot)
    : path.join(finalIphone, campaign.appleScreenshot);
  const screen = await roundedScreenshot(sourcePath, format.screenWidth, format.radius);
  const backgroundPath = campaign.theme === 'dark' ? darkBackground : lightBackground;
  const background = await sharp(backgroundPath)
    .resize(format.width, format.height, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: campaign.theme === 'dark' ? 0.78 : 1.0, saturation: 0.94 })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toBuffer();
  const logo = await sharp(logoPath)
    .resize(format.logoSize, format.logoSize)
    .png()
    .toBuffer();
  const screenX = Math.round((format.width - screen.width) / 2);
  const outputPath = path.join(outputDir, `${campaign.slug}-${format.width}x${format.height}.jpg`);

  await sharp(background)
    .composite([
      { input: posterOverlay(campaign, format, screen), left: 0, top: 0 },
      { input: logo, left: Math.round(format.width * 0.075), top: format.top },
      { input: screen.buffer, left: screenX, top: format.screenY },
    ])
    .flatten({ background: '#FFFFFF' })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toFile(outputPath);
}

async function framedPhone(sourcePath, width, border, radius, angle = 0) {
  const screen = await roundedScreenshot(sourcePath, width, radius);
  const frameWidth = screen.width + border * 2;
  const frameHeight = screen.height + border * 2;
  const frame = Buffer.from(
    `<svg width="${frameWidth}" height="${frameHeight}"><rect width="${frameWidth}" height="${frameHeight}" rx="${radius + border}" fill="#0B0912" stroke="rgba(255,255,255,0.28)" stroke-width="2"/></svg>`,
  );
  const phone = await sharp({
    create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: frame, left: 0, top: 0 },
      { input: screen.buffer, left: border, top: border },
    ])
    .png()
    .toBuffer();
  if (!angle) return phone;
  return sharp(phone).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

async function renderFeatureGraphic() {
  const width = 1024;
  const height = 500;
  const outputDir = path.join(posterRoot, 'google-play');
  fs.mkdirSync(outputDir, { recursive: true });
  const background = await sharp(landscapeBackground)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.76, saturation: 0.92 })
    .png()
    .toBuffer();
  const logo = await sharp(logoPath).resize(74, 74).png().toBuffer();
  const friends = await framedPhone(path.join(finalAndroid, '01-friends.png'), 180, 7, 20, -5);
  const progress = await framedPhone(path.join(finalAndroid, '04-progress.png'), 194, 7, 20, 5);
  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/></filter>
      </defs>
      <text x="158" y="87" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="750" letter-spacing="-0.5">ChallengeSphere</text>
      <text x="70" y="210" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.8" filter="url(#textShadow)">Build habits</text>
      <text x="70" y="272" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.8" filter="url(#textShadow)">together.</text>
      <text x="70" y="322" fill="#DAD4E9" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500">Real challenges. Real progress.</text>
      <rect x="70" y="363" width="245" height="48" rx="24" fill="rgba(255,255,255,0.11)" stroke="rgba(255,255,255,0.22)"/>
      <circle cx="94" cy="387" r="7" fill="#93FFCB"/>
      <text x="112" y="395" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">BETTER WITH FRIENDS</text>
    </svg>
  `);

  await sharp(background)
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: logo, left: 70, top: 35 },
      { input: friends, left: 610, top: 76 },
      { input: progress, left: 785, top: 40 },
    ])
    .flatten({ background: '#080712' })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, 'feature-graphic-1024x500.png'));
}

async function main() {
  for (const campaign of campaigns) {
    for (const format of formats) {
      await renderPoster(campaign, format);
    }
  }
  await renderFeatureGraphic();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
