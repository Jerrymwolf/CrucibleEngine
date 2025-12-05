#!/usr/bin/env node

/**
 * Icon Generation Script for The Values Crucible
 *
 * Prerequisites:
 *   pnpm add -D sharp
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Alternatively, use online tools:
 *   - https://realfavicongenerator.net (favicon + all icons)
 *   - https://squoosh.app (WebP conversion)
 */

import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'apps/web/public');
const LOGOS = join(PUBLIC, 'logos');

// Source images
const VC_ICON = join(ROOT, 'VCIcon.jpg');
const VC_LOGO = join(ROOT, 'VCLogo.jpg');

async function generateIcons() {
  console.log('🎨 Generating icons for The Values Crucible...\n');

  // Ensure directories exist
  await mkdir(LOGOS, { recursive: true });

  // 1. Generate favicon.ico (48x48 PNG, browsers accept PNG in .ico)
  console.log('📌 Generating favicon.ico...');
  await sharp(VC_ICON)
    .resize(48, 48, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(PUBLIC, 'favicon.ico'));

  // 2. Generate Apple Touch Icon (180x180)
  console.log('🍎 Generating apple-touch-icon.png...');
  await sharp(VC_ICON)
    .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(PUBLIC, 'apple-touch-icon.png'));

  // 3. Generate PWA icons
  console.log('📱 Generating PWA icons...');

  // 192x192 standard
  await sharp(VC_ICON)
    .resize(192, 192, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(PUBLIC, 'icon-192.png'));

  // 512x512 maskable (with 10% safe zone padding)
  await sharp(VC_ICON)
    .resize(410, 410, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    })
    .png()
    .toFile(join(PUBLIC, 'icon-512.png'));

  // 4. Generate OG image (1200x630)
  console.log('🌐 Generating og-image.png...');
  await sharp(VC_LOGO)
    .resize(1200, 630, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(PUBLIC, 'og-image.png'));

  // 5. Convert logos to WebP
  console.log('🖼️ Converting logos to WebP...');

  await sharp(VC_LOGO)
    .webp({ quality: 85 })
    .toFile(join(LOGOS, 'vc-logo-full.webp'));

  await sharp(VC_ICON)
    .webp({ quality: 85 })
    .toFile(join(LOGOS, 'vc-icon.webp'));

  // 6. Copy JPG fallbacks
  console.log('📋 Copying JPG fallbacks...');
  await copyFile(VC_LOGO, join(LOGOS, 'vc-logo-full.jpg'));
  await copyFile(VC_ICON, join(LOGOS, 'vc-icon.jpg'));

  console.log('\n✅ All icons generated successfully!');
  console.log('\nFiles created:');
  console.log('  - public/favicon.ico');
  console.log('  - public/apple-touch-icon.png');
  console.log('  - public/icon-192.png');
  console.log('  - public/icon-512.png');
  console.log('  - public/og-image.png');
  console.log('  - public/logos/vc-logo-full.webp');
  console.log('  - public/logos/vc-icon.webp');
  console.log('  - public/logos/vc-logo-full.jpg');
  console.log('  - public/logos/vc-icon.jpg');
}

generateIcons().catch(console.error);
