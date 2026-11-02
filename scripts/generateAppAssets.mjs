/**
 * Generate Play Store / PWA image assets from public/puurga-logo.svg
 * Run:  npm run assets
 *
 * Outputs (committed to git — the server never needs to run this):
 *   public/icon-192.png        PWA / TWA icon
 *   public/icon-512.png        PWA / TWA icon
 *   public/icon-512-maskable.png  maskable icon (10% safe padding)
 *   public/icon-64.png         favicon fallback
 *   public/feature-graphic.png Play Store feature graphic (1024x500)
 *   public/banner.png          og:image / social card (1200x630)
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BG = '#0d0d0d';
const ACCENT = '#e11d48';

const logo = fs.readFileSync(path.join(PUBLIC, 'puurga-logo.svg'), 'utf8');
const logoMatch = logo.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
const inner = logoMatch ? logoMatch[1] : logo;

function iconSvg(size, padRatio, bg = BG, dotColor = ACCENT) {
  const pad = size * padRatio;
  const innerSize = size - pad * 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bg}" rx="${size * 0.18}"/>
  <g transform="translate(${pad} ${pad}) scale(${innerSize / 100})">${inner}</g>
  <circle cx="${size * 0.82}" cy="${size * 0.24}" r="${size * 0.06}" fill="${dotColor}"/>
</svg>`;
}

function bannerSvg(w, h) {
  const logoSize = h * 0.42;
  const pad = (h - logoSize) / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${ACCENT}" opacity="0.9"/>
  <g transform="translate(${pad * 2.2} ${pad}) scale(${(logoSize / 100).toFixed(4)})">${inner}</g>
</svg>`;
}

const jobs = [
  ['icon-192.png', iconSvg(192, 0.12)],
  ['icon-512.png', iconSvg(512, 0.12)],
  ['icon-512-maskable.png', iconSvg(512, 0.24)],
  ['icon-64.png', iconSvg(64, 0.14)],
  ['feature-graphic.png', bannerSvg(1024, 500)],
  ['banner.png', bannerSvg(1200, 630)],
];

for (const [file, svg] of jobs) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(PUBLIC, file), png);
  console.log(`✅ public/${file} (${(png.length / 1024).toFixed(0)} KB)`);
}
console.log('Done.');
