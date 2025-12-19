/**
 * Sprite Sheet Loader
 *
 * Handles loading and parsing of Kenney-style sprite sheets.
 * Supports both JSON-based sprite atlases and grid-based sheets.
 */

import { Assets, Texture, Spritesheet } from 'pixi.js';
import type { SpritesheetData, SpritesheetFrameData } from 'pixi.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sprite frame definition within a sheet
 */
export interface SpriteFrame {
  /** Frame name/ID */
  name: string;
  /** X position in sheet */
  x: number;
  /** Y position in sheet */
  y: number;
  /** Frame width */
  width: number;
  /** Frame height */
  height: number;
  /** Optional anchor point */
  anchor?: { x: number; y: number };
  /** Whether frame is rotated */
  rotated?: boolean;
  /** Whether frame is trimmed */
  trimmed?: boolean;
}

/**
 * Sprite sheet definition
 */
export interface SpriteSheetDef {
  /** Unique sheet ID */
  id: string;
  /** Path to the sprite sheet image */
  imagePath: string;
  /** Optional path to JSON atlas data */
  atlasPath?: string;
  /** Grid-based sheet configuration */
  grid?: {
    columns: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    /** Optional frame names in order (left-to-right, top-to-bottom) */
    frameNames?: string[];
  };
  /** Individual frame definitions (for irregular sheets) */
  frames?: SpriteFrame[];
}

/**
 * Kenney Atlas JSON format
 */
interface KenneyAtlasFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  pivot: { x: number; y: number };
}

interface KenneyAtlas {
  frames: KenneyAtlasFrame[];
  meta: {
    image: string;
    size: { w: number; h: number };
    scale: string;
  };
}

// =============================================================================
// KENNEY SPRITE SHEET DEFINITIONS
// =============================================================================

/**
 * Kenney isometric building sprite sheet mapping
 * Based on: https://kenney.nl/assets/isometric-buildings
 */
export const KENNEY_ISOMETRIC_BUILDINGS: SpriteSheetDef = {
  id: 'kenney_isometric_buildings',
  imagePath: '/assets/island/spritesheets/isometric_buildings.png',
  atlasPath: '/assets/island/spritesheets/isometric_buildings.json',
};

/**
 * Kenney tiny town sprite sheet mapping
 * Based on: https://kenney.nl/assets/tiny-town
 */
export const KENNEY_TINY_TOWN: SpriteSheetDef = {
  id: 'kenney_tiny_town',
  imagePath: '/assets/island/spritesheets/tiny_town.png',
  grid: {
    columns: 16,
    rows: 16,
    cellWidth: 16,
    cellHeight: 16,
  },
};

/**
 * Kenney 1-bit pack for icons/UI
 * Based on: https://kenney.nl/assets/1-bit-pack
 */
export const KENNEY_1BIT_PACK: SpriteSheetDef = {
  id: 'kenney_1bit',
  imagePath: '/assets/island/spritesheets/1bit_pack.png',
  grid: {
    columns: 48,
    rows: 22,
    cellWidth: 16,
    cellHeight: 16,
  },
};

// =============================================================================
// SPRITE SHEET LOADER
// =============================================================================

/**
 * Sprite sheet loader class
 */
export class SpriteSheetLoader {
  private sheets: Map<string, Spritesheet> = new Map();
  private textures: Map<string, Texture> = new Map();
  private loading: Map<string, Promise<Spritesheet>> = new Map();

  /**
   * Load a sprite sheet by definition
   */
  async load(def: SpriteSheetDef): Promise<Spritesheet> {
    // Return cached if available
    const cached = this.sheets.get(def.id);
    if (cached) return cached;

    // Return loading promise if in progress
    const loading = this.loading.get(def.id);
    if (loading) return loading;

    // Start loading
    const loadPromise = this._loadSheet(def);
    this.loading.set(def.id, loadPromise);

    try {
      const sheet = await loadPromise;
      this.sheets.set(def.id, sheet);
      return sheet;
    } finally {
      this.loading.delete(def.id);
    }
  }

  private async _loadSheet(def: SpriteSheetDef): Promise<Spritesheet> {
    // Load the base texture
    const baseTexture = await Assets.load(def.imagePath);

    if (def.atlasPath) {
      // Load JSON atlas
      return this._loadAtlasSheet(def, baseTexture);
    } else if (def.grid) {
      // Create grid-based sheet
      return this._loadGridSheet(def, baseTexture);
    } else if (def.frames) {
      // Create from frame definitions
      return this._loadFrameSheet(def, baseTexture);
    }

    throw new Error(`[SpriteSheetLoader] Invalid sheet definition: ${def.id}`);
  }

  private async _loadAtlasSheet(
    def: SpriteSheetDef,
    baseTexture: Texture
  ): Promise<Spritesheet> {
    try {
      // Fetch atlas JSON
      const response = await fetch(def.atlasPath!);
      const atlasData: KenneyAtlas = await response.json();

      // Convert Kenney format to PixiJS format
      const frames: Record<string, SpritesheetFrameData> = {};

      for (const frame of atlasData.frames) {
        const name = frame.filename.replace('.png', '');
        frames[name] = {
          frame: frame.frame,
          rotated: frame.rotated,
          trimmed: frame.trimmed,
          spriteSourceSize: frame.spriteSourceSize,
          sourceSize: frame.sourceSize,
          anchor: frame.pivot,
        };
      }

      const pixiAtlas: SpritesheetData = {
        frames,
        meta: {
          image: def.imagePath,
          format: 'RGBA8888',
          size: atlasData.meta.size,
          scale: atlasData.meta.scale,
        },
      };

      // Create PixiJS spritesheet
      const sheet = new Spritesheet(baseTexture, pixiAtlas);
      await sheet.parse();

      // Cache individual textures
      for (const [name, texture] of Object.entries(sheet.textures)) {
        this.textures.set(`${def.id}:${name}`, texture);
      }

      return sheet;
    } catch (error) {
      console.warn(`[SpriteSheetLoader] Failed to load atlas: ${def.atlasPath}`, error);
      // Return empty sheet
      return new Spritesheet(baseTexture, { frames: {}, meta: { scale: '1' } });
    }
  }

  private async _loadGridSheet(
    def: SpriteSheetDef,
    baseTexture: Texture
  ): Promise<Spritesheet> {
    const { columns, rows, cellWidth, cellHeight, frameNames } = def.grid!;

    const frames: Record<string, SpritesheetFrameData> = {};

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        const name = frameNames?.[index] ?? `${def.id}_${index}`;

        frames[name] = {
          frame: {
            x: col * cellWidth,
            y: row * cellHeight,
            w: cellWidth,
            h: cellHeight,
          },
          sourceSize: { w: cellWidth, h: cellHeight },
          spriteSourceSize: { x: 0, y: 0, w: cellWidth, h: cellHeight },
        };
      }
    }

    const atlas: SpritesheetData = {
      frames,
      meta: {
        image: def.imagePath,
        format: 'RGBA8888',
        size: { w: columns * cellWidth, h: rows * cellHeight },
        scale: '1',
      },
    };

    const sheet = new Spritesheet(baseTexture, atlas);
    await sheet.parse();

    // Cache textures
    for (const [name, texture] of Object.entries(sheet.textures)) {
      this.textures.set(`${def.id}:${name}`, texture);
    }

    return sheet;
  }

  private async _loadFrameSheet(
    def: SpriteSheetDef,
    baseTexture: Texture
  ): Promise<Spritesheet> {
    const frames: Record<string, SpritesheetFrameData> = {};

    for (const frame of def.frames!) {
      frames[frame.name] = {
        frame: { x: frame.x, y: frame.y, w: frame.width, h: frame.height },
        sourceSize: { w: frame.width, h: frame.height },
        spriteSourceSize: { x: 0, y: 0, w: frame.width, h: frame.height },
        anchor: frame.anchor,
        rotated: frame.rotated ?? false,
        trimmed: frame.trimmed ?? false,
      };
    }

    const atlas: SpritesheetData = {
      frames,
      meta: {
        image: def.imagePath,
        format: 'RGBA8888',
        size: { w: baseTexture.width, h: baseTexture.height },
        scale: '1',
      },
    };

    const sheet = new Spritesheet(baseTexture, atlas);
    await sheet.parse();

    // Cache textures
    for (const [name, texture] of Object.entries(sheet.textures)) {
      this.textures.set(`${def.id}:${name}`, texture);
    }

    return sheet;
  }

  /**
   * Get a specific texture from a loaded sheet
   */
  getTexture(sheetId: string, frameName: string): Texture | null {
    return this.textures.get(`${sheetId}:${frameName}`) ?? null;
  }

  /**
   * Get all textures from a loaded sheet
   */
  getSheetTextures(sheetId: string): Map<string, Texture> {
    const result = new Map<string, Texture>();
    const prefix = `${sheetId}:`;

    for (const [key, texture] of this.textures) {
      if (key.startsWith(prefix)) {
        result.set(key.slice(prefix.length), texture);
      }
    }

    return result;
  }

  /**
   * Check if a sheet is loaded
   */
  isLoaded(sheetId: string): boolean {
    return this.sheets.has(sheetId);
  }

  /**
   * Clear all cached sheets
   */
  clear(): void {
    this.sheets.clear();
    this.textures.clear();
    this.loading.clear();
  }
}

// Export singleton
export const spriteSheetLoader = new SpriteSheetLoader();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a procedural isometric tile texture
 */
export function createIsometricTileTexture(
  color: number,
  width: number = 64,
  height: number = 32
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Convert hex color to CSS
  const cssColor = `#${color.toString(16).padStart(6, '0')}`;

  // Draw isometric diamond
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width, height / 2);
  ctx.lineTo(width / 2, height);
  ctx.lineTo(0, height / 2);
  ctx.closePath();

  ctx.fillStyle = cssColor;
  ctx.fill();

  // Add subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  return Texture.from(canvas);
}

/**
 * Create a procedural building placeholder texture
 */
export function createBuildingPlaceholder(
  color: number,
  width: number = 64,
  height: number = 96
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const cssColor = `#${color.toString(16).padStart(6, '0')}`;
  const darkColor = `#${Math.max(0, color - 0x333333).toString(16).padStart(6, '0')}`;
  const lightColor = `#${Math.min(0xffffff, color + 0x333333).toString(16).padStart(6, '0')}`;

  const baseY = height * 0.75;
  const buildingHeight = height * 0.6;
  const halfWidth = width / 2;

  // Left face (main color)
  ctx.beginPath();
  ctx.moveTo(0, baseY - 16);
  ctx.lineTo(0, baseY - 16 - buildingHeight);
  ctx.lineTo(halfWidth, baseY - 32 - buildingHeight);
  ctx.lineTo(halfWidth, baseY - 32);
  ctx.closePath();
  ctx.fillStyle = cssColor;
  ctx.fill();

  // Right face (darker)
  ctx.beginPath();
  ctx.moveTo(halfWidth, baseY - 32);
  ctx.lineTo(halfWidth, baseY - 32 - buildingHeight);
  ctx.lineTo(width, baseY - 16 - buildingHeight);
  ctx.lineTo(width, baseY - 16);
  ctx.closePath();
  ctx.fillStyle = darkColor;
  ctx.fill();

  // Top face (lighter)
  ctx.beginPath();
  ctx.moveTo(halfWidth, baseY - 32 - buildingHeight);
  ctx.lineTo(0, baseY - 16 - buildingHeight);
  ctx.lineTo(halfWidth, baseY - buildingHeight);
  ctx.lineTo(width, baseY - 16 - buildingHeight);
  ctx.closePath();
  ctx.fillStyle = lightColor;
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  return Texture.from(canvas);
}
