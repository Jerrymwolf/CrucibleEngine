/**
 * Island Types - Type definitions for the isometric island renderer
 *
 * Provides types for:
 * - Grid coordinates and positions
 * - Camera state and controls
 * - Sprites and entities
 * - Layer configuration
 */

// =============================================================================
// COORDINATE SYSTEMS
// =============================================================================

/** Grid coordinates (tile-based, integer) */
export interface GridPosition {
  col: number;
  row: number;
}

/** World coordinates (isometric space, float) */
export interface WorldPosition {
  x: number;
  y: number;
}

/** Screen coordinates (pixel space) */
export interface ScreenPosition {
  x: number;
  y: number;
}

/** 3D world position with elevation */
export interface WorldPosition3D extends WorldPosition {
  z: number;
}

// =============================================================================
// CAMERA
// =============================================================================

export interface CameraState {
  /** Camera position in world space */
  x: number;
  y: number;
  /** Zoom level (1.0 = default) */
  zoom: number;
  /** Target zoom for smooth transitions */
  targetZoom: number;
  /** Min/max zoom bounds */
  minZoom: number;
  maxZoom: number;
}

export interface CameraControls {
  pan: (dx: number, dy: number) => void;
  panTo: (x: number, y: number, animate?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (level: number, animate?: boolean) => void;
  reset: () => void;
  focusOnTile: (col: number, row: number) => void;
}

// =============================================================================
// TILES & TERRAIN
// =============================================================================

export type TerrainType =
  | 'water_deep'
  | 'water_shallow'
  | 'sand'
  | 'grass'
  | 'forest'
  | 'mountain'
  | 'volcanic'
  | 'road'
  | 'path';

export interface Tile {
  col: number;
  row: number;
  terrain: TerrainType;
  elevation: number;
  passable: boolean;
  buildable: boolean;
}

export interface TileMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

// =============================================================================
// BUILDINGS & STRUCTURES
// =============================================================================

export type BuildingType =
  // Gateway (fishing/docks)
  | 'dock_small'
  | 'dock_large'
  | 'storage_shed'
  // Haven (port)
  | 'port_crane'
  | 'warehouse'
  | 'processing_plant'
  // Keystone (manufacturing)
  | 'clean_room'
  | 'admin_building'
  | 'storage_tank'
  | 'generator'
  // Heartland (power/water)
  | 'dam'
  | 'power_station'
  | 'water_treatment'
  // Summit (corporate)
  | 'corporate_tower'
  | 'helipad'
  | 'comm_array'
  // Sterling (community)
  | 'hospital'
  | 'school'
  | 'house_small'
  | 'house_medium'
  | 'shelter'
  | 'fire_station';

export type BuildingStatus =
  | 'operational'
  | 'damaged'
  | 'critical'
  | 'destroyed'
  | 'under_repair';

export interface Building {
  id: string;
  type: BuildingType;
  col: number;
  row: number;
  status: BuildingStatus;
  health: number;
  parishId: string;
  /** Size in tiles (width x height) */
  size: { w: number; h: number };
}

// =============================================================================
// ENTITIES (Workers, Vehicles)
// =============================================================================

export type EntityType =
  | 'worker'
  | 'rescue_team'
  | 'medical_team'
  | 'truck'
  | 'ambulance'
  | 'helicopter'
  | 'boat';

export type EntityState =
  | 'idle'
  | 'moving'
  | 'working'
  | 'emergency';

export interface Entity {
  id: string;
  type: EntityType;
  state: EntityState;
  position: WorldPosition;
  targetPosition?: WorldPosition;
  speed: number;
  parishId: string;
  visible: boolean;
}

// =============================================================================
// EFFECTS
// =============================================================================

export type EffectType =
  | 'rain'
  | 'storm'
  | 'lightning'
  | 'flood'
  | 'fire'
  | 'smoke'
  | 'power_outage'
  | 'selection_ring';

export interface Effect {
  id: string;
  type: EffectType;
  position: WorldPosition;
  radius: number;
  intensity: number;
  duration?: number;
  startTime: number;
}

// =============================================================================
// LAYERS
// =============================================================================

export type LayerType =
  | 'terrain'
  | 'roads'
  | 'buildings'
  | 'entities'
  | 'effects'
  | 'ui'
  | 'weather';

export interface LayerConfig {
  type: LayerType;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

// =============================================================================
// ISLAND STATE
// =============================================================================

export interface IslandState {
  tileMap: TileMap;
  buildings: Building[];
  entities: Entity[];
  effects: Effect[];
  selectedTile: GridPosition | null;
  hoveredTile: GridPosition | null;
  camera: CameraState;
  layers: LayerConfig[];
}

// =============================================================================
// ASSET DEFINITIONS
// =============================================================================

export interface SpriteAsset {
  id: string;
  path: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  frames?: number;
  frameRate?: number;
}

export interface AssetManifest {
  terrain: Record<TerrainType, SpriteAsset>;
  buildings: Record<BuildingType, SpriteAsset>;
  entities: Record<EntityType, SpriteAsset>;
  effects: Record<EffectType, SpriteAsset>;
  ui: Record<string, SpriteAsset>;
}

// =============================================================================
// EVENTS
// =============================================================================

export interface IslandEvent {
  type: 'tile_click' | 'tile_hover' | 'building_click' | 'entity_click';
  position: GridPosition;
  worldPosition: WorldPosition;
  target?: Building | Entity;
}

export type IslandEventHandler = (event: IslandEvent) => void;
