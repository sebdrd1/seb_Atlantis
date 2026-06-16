import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const sizes = [192, 512];
const outputDir = 'public/icons';

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

function makeIcon(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4a4ae0"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.08}" text-anchor="middle" font-size="${size * 0.45}">🌊</text>
</svg>`;
}

for (const size of sizes) {
  const svg = Buffer.from(makeIcon(size));
  await sharp(svg).png().toFile(`${outputDir}/icon-${size}.png`);
  console.log(`icon-${size}.png generated`);
}
