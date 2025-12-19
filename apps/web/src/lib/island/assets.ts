/**
 * Island Asset Loader
 *
 * Manages loading and caching of sprite assets for the isometric renderer.
 * Uses PixiJS Assets system for efficient loading and caching.
 *
 * Asset Strategy:
 * - Primary: Kenney.nl free CC0 assets (isometric-buildings, tiny-town)
 * - Fallback: Procedurally generated colored shapes
 *
 * Kenney Asset Sources:
 * - Isometric Buildings: https://kenney.nl/assets/isometric-buildings
 * - Tiny Town: https://kenney.nl/assets/tiny-town
 * - UI Audio: https://kenney.nl/assets/ui-audio
 */

import { Assets, Texture, Spritesheet, Graphics } from 'pixi.js';
import type {
  TerrainType,
  BuildingType,
  EntityType,
  EffectType,
  SpriteAsset,
  AssetManifest,
} from '@/types/island';

// =============================================================================
// ASSET PATHS
// =============================================================================

const ASSET_BASE_PATH = '/assets/island';

// =============================================================================
// KENNEY ASSET MAPPING
// =============================================================================

/**
 * Maps our building types to Kenney isometric-buildings filenames
 * Download from: https://kenney.nl/assets/isometric-buildings
 */
export const KENNEY_BUILDING_MAP: Partial<Record<BuildingType, string>> = {
  warehouse: 'warehouseLarge',
  processing_plant: 'factory',
  admin_building: 'officeLow',
  corporate_tower: 'officeHigh',
  hospital: 'hospital',
  fire_station: 'fireStation',
  house_small: 'houseSmall',
  house_medium: 'houseLarge',
  storage_tank: 'storageBarrel',
  generator: 'generator',
  power_station: 'powerPlant',
};

/**
 * Maps our terrain types to Kenney isometric tiles
 */
export const KENNEY_TERRAIN_MAP: Partial<Record<TerrainType, string>> = {
  grass: 'grass',
  sand: 'sand',
  water_shallow: 'waterShallow',
  water_deep: 'waterDeep',
  road: 'road',
  path: 'path',
};

/**
 * Maps our entity types to Kenney tiny-town sprites
 * Download from: https://kenney.nl/assets/tiny-town
 */
export const KENNEY_ENTITY_MAP: Partial<Record<EntityType, string>> = {
  truck: 'vehicle_truck',
  ambulance: 'vehicle_ambulance',
  boat: 'vehicle_boat',
  helicopter: 'vehicle_helicopter',
  worker: 'character_worker',
};

// =============================================================================
// ASSET MANIFEST
// =============================================================================

/**
 * Complete asset manifest for all island sprites
 * Maps asset types to their sprite definitions
 */
export const ASSET_MANIFEST: AssetManifest = {
  terrain: {
    water_deep: {
      id: 'terrain_water_deep',
      path: `${ASSET_BASE_PATH}/terrain/water_deep.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    water_shallow: {
      id: 'terrain_water_shallow',
      path: `${ASSET_BASE_PATH}/terrain/water_shallow.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    sand: {
      id: 'terrain_sand',
      path: `${ASSET_BASE_PATH}/terrain/sand.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    grass: {
      id: 'terrain_grass',
      path: `${ASSET_BASE_PATH}/terrain/grass.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    forest: {
      id: 'terrain_forest',
      path: `${ASSET_BASE_PATH}/terrain/forest.png`,
      width: 64,
      height: 48,
      anchor: { x: 0.5, y: 0.75 },
    },
    mountain: {
      id: 'terrain_mountain',
      path: `${ASSET_BASE_PATH}/terrain/mountain.png`,
      width: 64,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    volcanic: {
      id: 'terrain_volcanic',
      path: `${ASSET_BASE_PATH}/terrain/volcanic.png`,
      width: 64,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    road: {
      id: 'terrain_road',
      path: `${ASSET_BASE_PATH}/terrain/road.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    path: {
      id: 'terrain_path',
      path: `${ASSET_BASE_PATH}/terrain/path.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
  },
  buildings: {
    dock_small: {
      id: 'building_dock_small',
      path: `${ASSET_BASE_PATH}/buildings/dock_small.png`,
      width: 64,
      height: 48,
      anchor: { x: 0.5, y: 0.75 },
    },
    dock_large: {
      id: 'building_dock_large',
      path: `${ASSET_BASE_PATH}/buildings/dock_large.png`,
      width: 128,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    storage_shed: {
      id: 'building_storage_shed',
      path: `${ASSET_BASE_PATH}/buildings/storage_shed.png`,
      width: 64,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    port_crane: {
      id: 'building_port_crane',
      path: `${ASSET_BASE_PATH}/buildings/port_crane.png`,
      width: 64,
      height: 96,
      anchor: { x: 0.5, y: 0.85 },
    },
    warehouse: {
      id: 'building_warehouse',
      path: `${ASSET_BASE_PATH}/buildings/warehouse.png`,
      width: 128,
      height: 80,
      anchor: { x: 0.5, y: 0.75 },
    },
    processing_plant: {
      id: 'building_processing_plant',
      path: `${ASSET_BASE_PATH}/buildings/processing_plant.png`,
      width: 128,
      height: 96,
      anchor: { x: 0.5, y: 0.8 },
    },
    clean_room: {
      id: 'building_clean_room',
      path: `${ASSET_BASE_PATH}/buildings/clean_room.png`,
      width: 128,
      height: 96,
      anchor: { x: 0.5, y: 0.8 },
    },
    admin_building: {
      id: 'building_admin_building',
      path: `${ASSET_BASE_PATH}/buildings/admin_building.png`,
      width: 96,
      height: 80,
      anchor: { x: 0.5, y: 0.8 },
    },
    storage_tank: {
      id: 'building_storage_tank',
      path: `${ASSET_BASE_PATH}/buildings/storage_tank.png`,
      width: 64,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    generator: {
      id: 'building_generator',
      path: `${ASSET_BASE_PATH}/buildings/generator.png`,
      width: 64,
      height: 48,
      anchor: { x: 0.5, y: 0.75 },
    },
    dam: {
      id: 'building_dam',
      path: `${ASSET_BASE_PATH}/buildings/dam.png`,
      width: 192,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    power_station: {
      id: 'building_power_station',
      path: `${ASSET_BASE_PATH}/buildings/power_station.png`,
      width: 128,
      height: 112,
      anchor: { x: 0.5, y: 0.85 },
    },
    water_treatment: {
      id: 'building_water_treatment',
      path: `${ASSET_BASE_PATH}/buildings/water_treatment.png`,
      width: 128,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    corporate_tower: {
      id: 'building_corporate_tower',
      path: `${ASSET_BASE_PATH}/buildings/corporate_tower.png`,
      width: 96,
      height: 160,
      anchor: { x: 0.5, y: 0.9 },
    },
    helipad: {
      id: 'building_helipad',
      path: `${ASSET_BASE_PATH}/buildings/helipad.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
    comm_array: {
      id: 'building_comm_array',
      path: `${ASSET_BASE_PATH}/buildings/comm_array.png`,
      width: 64,
      height: 128,
      anchor: { x: 0.5, y: 0.9 },
    },
    hospital: {
      id: 'building_hospital',
      path: `${ASSET_BASE_PATH}/buildings/hospital.png`,
      width: 128,
      height: 96,
      anchor: { x: 0.5, y: 0.8 },
    },
    school: {
      id: 'building_school',
      path: `${ASSET_BASE_PATH}/buildings/school.png`,
      width: 128,
      height: 80,
      anchor: { x: 0.5, y: 0.75 },
    },
    house_small: {
      id: 'building_house_small',
      path: `${ASSET_BASE_PATH}/buildings/house_small.png`,
      width: 64,
      height: 56,
      anchor: { x: 0.5, y: 0.75 },
    },
    house_medium: {
      id: 'building_house_medium',
      path: `${ASSET_BASE_PATH}/buildings/house_medium.png`,
      width: 80,
      height: 64,
      anchor: { x: 0.5, y: 0.75 },
    },
    shelter: {
      id: 'building_shelter',
      path: `${ASSET_BASE_PATH}/buildings/shelter.png`,
      width: 128,
      height: 80,
      anchor: { x: 0.5, y: 0.75 },
    },
    fire_station: {
      id: 'building_fire_station',
      path: `${ASSET_BASE_PATH}/buildings/fire_station.png`,
      width: 96,
      height: 80,
      anchor: { x: 0.5, y: 0.8 },
    },
  },
  entities: {
    worker: {
      id: 'entity_worker',
      path: `${ASSET_BASE_PATH}/entities/worker.png`,
      width: 16,
      height: 24,
      anchor: { x: 0.5, y: 0.9 },
      frames: 4,
      frameRate: 8,
    },
    rescue_team: {
      id: 'entity_rescue_team',
      path: `${ASSET_BASE_PATH}/entities/rescue_team.png`,
      width: 24,
      height: 24,
      anchor: { x: 0.5, y: 0.9 },
      frames: 4,
      frameRate: 8,
    },
    medical_team: {
      id: 'entity_medical_team',
      path: `${ASSET_BASE_PATH}/entities/medical_team.png`,
      width: 24,
      height: 24,
      anchor: { x: 0.5, y: 0.9 },
      frames: 4,
      frameRate: 8,
    },
    truck: {
      id: 'entity_truck',
      path: `${ASSET_BASE_PATH}/entities/truck.png`,
      width: 48,
      height: 32,
      anchor: { x: 0.5, y: 0.75 },
    },
    ambulance: {
      id: 'entity_ambulance',
      path: `${ASSET_BASE_PATH}/entities/ambulance.png`,
      width: 48,
      height: 32,
      anchor: { x: 0.5, y: 0.75 },
    },
    helicopter: {
      id: 'entity_helicopter',
      path: `${ASSET_BASE_PATH}/entities/helicopter.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
      frames: 2,
      frameRate: 12,
    },
    boat: {
      id: 'entity_boat',
      path: `${ASSET_BASE_PATH}/entities/boat.png`,
      width: 48,
      height: 24,
      anchor: { x: 0.5, y: 0.75 },
    },
  },
  effects: {
    rain: {
      id: 'effect_rain',
      path: `${ASSET_BASE_PATH}/effects/rain.png`,
      width: 64,
      height: 64,
      anchor: { x: 0.5, y: 0.5 },
      frames: 4,
      frameRate: 12,
    },
    storm: {
      id: 'effect_storm',
      path: `${ASSET_BASE_PATH}/effects/storm.png`,
      width: 128,
      height: 128,
      anchor: { x: 0.5, y: 0.5 },
      frames: 4,
      frameRate: 8,
    },
    lightning: {
      id: 'effect_lightning',
      path: `${ASSET_BASE_PATH}/effects/lightning.png`,
      width: 64,
      height: 256,
      anchor: { x: 0.5, y: 0 },
      frames: 3,
      frameRate: 24,
    },
    flood: {
      id: 'effect_flood',
      path: `${ASSET_BASE_PATH}/effects/flood.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
      frames: 4,
      frameRate: 6,
    },
    fire: {
      id: 'effect_fire',
      path: `${ASSET_BASE_PATH}/effects/fire.png`,
      width: 32,
      height: 48,
      anchor: { x: 0.5, y: 0.9 },
      frames: 4,
      frameRate: 12,
    },
    smoke: {
      id: 'effect_smoke',
      path: `${ASSET_BASE_PATH}/effects/smoke.png`,
      width: 32,
      height: 48,
      anchor: { x: 0.5, y: 0.9 },
      frames: 4,
      frameRate: 8,
    },
    power_outage: {
      id: 'effect_power_outage',
      path: `${ASSET_BASE_PATH}/effects/power_outage.png`,
      width: 24,
      height: 24,
      anchor: { x: 0.5, y: 0.5 },
      frames: 2,
      frameRate: 4,
    },
    selection_ring: {
      id: 'effect_selection_ring',
      path: `${ASSET_BASE_PATH}/effects/selection_ring.png`,
      width: 64,
      height: 32,
      anchor: { x: 0.5, y: 0.5 },
    },
  },
  ui: {
    cursor_default: {
      id: 'ui_cursor_default',
      path: `${ASSET_BASE_PATH}/ui/cursor_default.png`,
      width: 24,
      height: 24,
      anchor: { x: 0, y: 0 },
    },
    cursor_select: {
      id: 'ui_cursor_select',
      path: `${ASSET_BASE_PATH}/ui/cursor_select.png`,
      width: 24,
      height: 24,
      anchor: { x: 0.5, y: 0.5 },
    },
    health_bar: {
      id: 'ui_health_bar',
      path: `${ASSET_BASE_PATH}/ui/health_bar.png`,
      width: 32,
      height: 4,
      anchor: { x: 0.5, y: 0.5 },
    },
    status_icons: {
      id: 'ui_status_icons',
      path: `${ASSET_BASE_PATH}/ui/status_icons.png`,
      width: 16,
      height: 16,
      anchor: { x: 0.5, y: 0.5 },
    },
  },
};

// =============================================================================
// ASSET LOADER CLASS
// =============================================================================

/**
 * Singleton asset loader for island sprites
 */
class IslandAssetLoader {
  private loaded = false;
  private loading = false;
  private loadPromise: Promise<void> | null = null;
  private textures: Map<string, Texture> = new Map();
  private fallbackTexture: Texture | null = null;

  /**
   * Load all island assets
   */
  async loadAll(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;
    if (this.loading && this.loadPromise) return this.loadPromise;

    this.loading = true;

    this.loadPromise = this._loadAllAssets(onProgress);
    await this.loadPromise;

    this.loaded = true;
    this.loading = false;
  }

  private async _loadAllAssets(onProgress?: (progress: number) => void): Promise<void> {
    // Collect all asset paths
    const allAssets: { id: string; path: string }[] = [];

    const categories = ['terrain', 'buildings', 'entities', 'effects', 'ui'] as const;
    for (const category of categories) {
      const assets = ASSET_MANIFEST[category];
      for (const [key, asset] of Object.entries(assets)) {
        allAssets.push({ id: asset.id, path: asset.path });
      }
    }

    // Add assets to PixiJS bundle
    const bundle: Record<string, string> = {};
    for (const asset of allAssets) {
      bundle[asset.id] = asset.path;
    }

    try {
      Assets.addBundle('island', bundle);

      // Load with progress callback
      const textures = await Assets.loadBundle('island', (progress) => {
        onProgress?.(progress * 100);
      });

      // Store textures
      for (const [id, texture] of Object.entries(textures)) {
        if (texture instanceof Texture) {
          this.textures.set(id, texture);
        }
      }
    } catch (error) {
      console.warn('[IslandAssetLoader] Failed to load assets:', error);
      // Create a fallback texture (colored rectangle)
      await this._createFallbackTextures();
    }
  }

  private async _createFallbackTextures(): Promise<void> {
    // In production, you'd want proper fallback textures
    // For now, we'll just log the warning
    console.warn('[IslandAssetLoader] Using fallback textures');
  }

  /**
   * Get a texture by ID
   */
  getTexture(id: string): Texture | null {
    return this.textures.get(id) ?? this.fallbackTexture;
  }

  /**
   * Get terrain texture
   */
  getTerrainTexture(terrain: TerrainType): Texture | null {
    const asset = ASSET_MANIFEST.terrain[terrain];
    return this.getTexture(asset?.id ?? '');
  }

  /**
   * Get building texture
   */
  getBuildingTexture(building: BuildingType): Texture | null {
    const asset = ASSET_MANIFEST.buildings[building];
    return this.getTexture(asset?.id ?? '');
  }

  /**
   * Get entity texture
   */
  getEntityTexture(entity: EntityType): Texture | null {
    const asset = ASSET_MANIFEST.entities[entity];
    return this.getTexture(asset?.id ?? '');
  }

  /**
   * Get effect texture
   */
  getEffectTexture(effect: EffectType): Texture | null {
    const asset = ASSET_MANIFEST.effects[effect];
    return this.getTexture(asset?.id ?? '');
  }

  /**
   * Get sprite asset definition
   */
  getSpriteAsset(
    category: keyof AssetManifest,
    type: string
  ): SpriteAsset | null {
    const assets = ASSET_MANIFEST[category] as Record<string, SpriteAsset>;
    return assets[type] ?? null;
  }

  /**
   * Check if assets are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Clear all cached textures
   */
  clear(): void {
    this.textures.clear();
    this.loaded = false;
    this.loading = false;
    this.loadPromise = null;
  }
}

// Export singleton instance
export const islandAssets = new IslandAssetLoader();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Preload critical assets (terrain, basic buildings)
 */
export async function preloadCriticalAssets(
  onProgress?: (progress: number) => void
): Promise<void> {
  await islandAssets.loadAll(onProgress);
}

/**
 * Get terrain color fallback (when sprites aren't loaded)
 */
export function getTerrainColor(terrain: TerrainType): number {
  const colors: Record<TerrainType, number> = {
    water_deep: 0x1e3a5f,
    water_shallow: 0x60a5fa,
    sand: 0xfcd34d,
    grass: 0x4ade80,
    forest: 0x166534,
    mountain: 0x78716c,
    volcanic: 0x7c2d12,
    road: 0x6b7280,
    path: 0xa3a3a3,
  };
  return colors[terrain] ?? 0x808080;
}

/**
 * Get building status color
 */
export function getBuildingStatusColor(status: string): number {
  const colors: Record<string, number> = {
    operational: 0x22c55e,
    damaged: 0xeab308,
    critical: 0xef4444,
    destroyed: 0x6b7280,
    under_repair: 0x3b82f6,
  };
  return colors[status] ?? 0x808080;
}
