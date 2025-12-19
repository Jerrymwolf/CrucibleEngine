/**
 * Generate Placeholder Sprites
 *
 * Creates simple colored placeholder images for development
 * while waiting for Kenney assets to be downloaded and processed.
 *
 * Usage: npx ts-node scripts/generate-placeholders.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_PATH = path.join(__dirname, '../public/assets/island');

// Terrain colors
const TERRAIN_COLORS: Record<string, string> = {
  water_deep: '#1e3a5f',
  water_shallow: '#60a5fa',
  sand: '#fcd34d',
  grass: '#4ade80',
  forest: '#166534',
  mountain: '#78716c',
  volcanic: '#7c2d12',
  road: '#6b7280',
  path: '#a3a3a3',
};

// Building colors
const BUILDING_COLORS: Record<string, string> = {
  dock_small: '#8b5cf6',
  dock_large: '#7c3aed',
  storage_shed: '#d97706',
  port_crane: '#0891b2',
  warehouse: '#dc2626',
  processing_plant: '#16a34a',
  clean_room: '#0284c7',
  admin_building: '#4f46e5',
  storage_tank: '#7c2d12',
  generator: '#eab308',
  dam: '#06b6d4',
  power_station: '#f97316',
  water_treatment: '#3b82f6',
  corporate_tower: '#6366f1',
  helipad: '#64748b',
  comm_array: '#a855f7',
  hospital: '#ef4444',
  school: '#22c55e',
  house_small: '#f472b6',
  house_medium: '#ec4899',
  shelter: '#14b8a6',
  fire_station: '#b91c1c',
};

/**
 * Create an isometric tile SVG
 */
function createIsometricTileSVG(color: string, width = 64, height = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <polygon points="${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
</svg>`;
}

/**
 * Create an isometric building SVG
 */
function createIsometricBuildingSVG(
  color: string,
  width = 64,
  height = 96
): string {
  // Parse hex color to adjust brightness
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 128, g: 128, b: 128 };
  };

  const rgb = hexToRgb(color);
  const darker = `rgb(${Math.max(0, rgb.r - 40)},${Math.max(0, rgb.g - 40)},${Math.max(0, rgb.b - 40)})`;
  const lighter = `rgb(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 40)},${Math.min(255, rgb.b + 40)})`;

  const halfWidth = width / 2;
  const buildingHeight = height * 0.6;
  const baseY = height * 0.75;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Left face -->
  <polygon points="0,${baseY - 16} 0,${baseY - 16 - buildingHeight} ${halfWidth},${baseY - 32 - buildingHeight} ${halfWidth},${baseY - 32}" fill="${color}"/>
  <!-- Right face -->
  <polygon points="${halfWidth},${baseY - 32} ${halfWidth},${baseY - 32 - buildingHeight} ${width},${baseY - 16 - buildingHeight} ${width},${baseY - 16}" fill="${darker}"/>
  <!-- Top face -->
  <polygon points="${halfWidth},${baseY - 32 - buildingHeight} 0,${baseY - 16 - buildingHeight} ${halfWidth},${baseY - buildingHeight} ${width},${baseY - 16 - buildingHeight}" fill="${lighter}"/>
</svg>`;
}

/**
 * Create entity placeholder SVG
 */
function createEntitySVG(color: string, width = 32, height = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
</svg>`;
}

/**
 * Create effect placeholder SVG
 */
function createEffectSVG(color: string, width = 64, height = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="effectGrad">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="url(#effectGrad)"/>
</svg>`;
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write SVG file
 */
function writeSVG(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content);
  console.log(`Created: ${filePath}`);
}

/**
 * Main generation function
 */
function generatePlaceholders(): void {
  console.log('Generating placeholder sprites...\n');

  // Create directories
  const dirs = ['terrain', 'buildings', 'entities', 'effects', 'ui'];
  for (const dir of dirs) {
    ensureDir(path.join(PUBLIC_PATH, dir));
  }

  // Generate terrain tiles
  console.log('Generating terrain tiles...');
  for (const [terrain, color] of Object.entries(TERRAIN_COLORS)) {
    const svg = createIsometricTileSVG(color);
    writeSVG(path.join(PUBLIC_PATH, 'terrain', `${terrain}.svg`), svg);
  }

  // Generate buildings
  console.log('\nGenerating buildings...');
  for (const [building, color] of Object.entries(BUILDING_COLORS)) {
    const svg = createIsometricBuildingSVG(color);
    writeSVG(path.join(PUBLIC_PATH, 'buildings', `${building}.svg`), svg);
  }

  // Generate entities
  console.log('\nGenerating entities...');
  const entities = ['worker', 'rescue_team', 'medical_team', 'truck', 'ambulance', 'helicopter', 'boat'];
  const entityColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#dc2626', '#6366f1', '#0891b2'];
  entities.forEach((entity, i) => {
    const svg = createEntitySVG(entityColors[i % entityColors.length]);
    writeSVG(path.join(PUBLIC_PATH, 'entities', `${entity}.svg`), svg);
  });

  // Generate effects
  console.log('\nGenerating effects...');
  const effects = [
    { name: 'rain', color: '#60a5fa' },
    { name: 'storm', color: '#6b7280' },
    { name: 'lightning', color: '#fbbf24' },
    { name: 'flood', color: '#3b82f6' },
    { name: 'fire', color: '#f97316' },
    { name: 'smoke', color: '#9ca3af' },
    { name: 'power_outage', color: '#374151' },
    { name: 'selection_ring', color: '#22c55e' },
  ];
  for (const effect of effects) {
    const svg = createEffectSVG(effect.color);
    writeSVG(path.join(PUBLIC_PATH, 'effects', `${effect.name}.svg`), svg);
  }

  // Generate UI elements
  console.log('\nGenerating UI elements...');
  const uiElements = [
    { name: 'cursor_default', svg: createEntitySVG('#ffffff', 24, 24) },
    { name: 'cursor_select', svg: createEntitySVG('#22c55e', 24, 24) },
    { name: 'health_bar', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="4" viewBox="0 0 32 4"><rect width="32" height="4" fill="#22c55e" rx="2"/></svg>` },
    { name: 'status_icons', svg: createEntitySVG('#ffffff', 16, 16) },
  ];
  for (const ui of uiElements) {
    writeSVG(path.join(PUBLIC_PATH, 'ui', `${ui.name}.svg`), ui.svg);
  }

  console.log('\nPlaceholder generation complete!');
  console.log(`\nFiles created in: ${PUBLIC_PATH}`);
  console.log('\nTo use real Kenney assets:');
  console.log('1. Download from https://kenney.nl/assets/isometric-buildings');
  console.log('2. Download from https://kenney.nl/assets/tiny-town');
  console.log('3. Extract and copy PNG files to the respective directories');
  console.log('4. Update file extensions in ASSET_MANIFEST from .svg to .png');
}

// Run if executed directly
generatePlaceholders();
