/**
 * Isometric Grid Utilities
 *
 * Provides coordinate conversion between:
 * - Grid coordinates (col, row) - tile-based integer positions
 * - World coordinates (x, y) - isometric space positions
 * - Screen coordinates (x, y) - pixel positions on canvas
 *
 * Uses standard 2:1 isometric projection (tile width = 2 * tile height)
 */

import type {
  GridPosition,
  WorldPosition,
  ScreenPosition,
  CameraState,
  Tile,
  TileMap,
} from '@/types/island';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base tile dimensions (in pixels) */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/** Half tile dimensions for calculations */
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

/** Elevation step height (pixels per elevation unit) */
export const ELEVATION_HEIGHT = 8;

/** Default map size */
export const DEFAULT_MAP_WIDTH = 32;
export const DEFAULT_MAP_HEIGHT = 32;

// =============================================================================
// COORDINATE CONVERSIONS
// =============================================================================

/**
 * Convert grid coordinates to world (isometric) coordinates
 * World origin is at center-top of the map
 */
export function gridToWorld(col: number, row: number): WorldPosition {
  return {
    x: (col - row) * HALF_TILE_WIDTH,
    y: (col + row) * HALF_TILE_HEIGHT,
  };
}

/**
 * Convert world coordinates to grid coordinates
 * Returns floating point values (use Math.floor for tile index)
 */
export function worldToGrid(x: number, y: number): GridPosition {
  return {
    col: (x / HALF_TILE_WIDTH + y / HALF_TILE_HEIGHT) / 2,
    row: (y / HALF_TILE_HEIGHT - x / HALF_TILE_WIDTH) / 2,
  };
}

/**
 * Convert world coordinates to screen coordinates
 * Applies camera transform (pan and zoom)
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): ScreenPosition {
  return {
    x: (worldX - camera.x) * camera.zoom + screenWidth / 2,
    y: (worldY - camera.y) * camera.zoom + screenHeight / 2,
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): WorldPosition {
  return {
    x: (screenX - screenWidth / 2) / camera.zoom + camera.x,
    y: (screenY - screenHeight / 2) / camera.zoom + camera.y,
  };
}

/**
 * Convert screen coordinates directly to grid coordinates
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): GridPosition {
  const world = screenToWorld(screenX, screenY, camera, screenWidth, screenHeight);
  return worldToGrid(world.x, world.y);
}

/**
 * Convert grid coordinates directly to screen coordinates
 */
export function gridToScreen(
  col: number,
  row: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): ScreenPosition {
  const world = gridToWorld(col, row);
  return worldToScreen(world.x, world.y, camera, screenWidth, screenHeight);
}

// =============================================================================
// TILE UTILITIES
// =============================================================================

/**
 * Get the tile at a specific grid position
 */
export function getTile(tileMap: TileMap, col: number, row: number): Tile | null {
  if (col < 0 || col >= tileMap.width || row < 0 || row >= tileMap.height) {
    return null;
  }
  return tileMap.tiles[row]?.[col] ?? null;
}

/**
 * Check if a grid position is within bounds
 */
export function isInBounds(tileMap: TileMap, col: number, row: number): boolean {
  return col >= 0 && col < tileMap.width && row >= 0 && row < tileMap.height;
}

/**
 * Get the screen bounding box for a tile
 */
export function getTileScreenBounds(
  col: number,
  row: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number; width: number; height: number } {
  const screen = gridToScreen(col, row, camera, screenWidth, screenHeight);
  const scaledWidth = TILE_WIDTH * camera.zoom;
  const scaledHeight = TILE_HEIGHT * camera.zoom;

  return {
    x: screen.x - scaledWidth / 2,
    y: screen.y,
    width: scaledWidth,
    height: scaledHeight,
  };
}

/**
 * Check if a tile is visible on screen
 */
export function isTileVisible(
  col: number,
  row: number,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number,
  margin: number = 100
): boolean {
  const screen = gridToScreen(col, row, camera, screenWidth, screenHeight);
  return (
    screen.x > -margin &&
    screen.x < screenWidth + margin &&
    screen.y > -margin &&
    screen.y < screenHeight + margin
  );
}

/**
 * Get all visible tiles for rendering
 */
export function getVisibleTiles(
  tileMap: TileMap,
  camera: CameraState,
  screenWidth: number,
  screenHeight: number
): GridPosition[] {
  const visible: GridPosition[] = [];
  const margin = TILE_WIDTH * 2;

  for (let row = 0; row < tileMap.height; row++) {
    for (let col = 0; col < tileMap.width; col++) {
      if (isTileVisible(col, row, camera, screenWidth, screenHeight, margin)) {
        visible.push({ col, row });
      }
    }
  }

  return visible;
}

// =============================================================================
// SORTING & RENDERING ORDER
// =============================================================================

/**
 * Calculate depth (z-order) for a grid position
 * Higher values render on top (painter's algorithm)
 */
export function getDepth(col: number, row: number, elevation: number = 0): number {
  // Base depth from position (col + row determines which tiles are "in front")
  const positionDepth = (col + row) * 1000;
  // Add elevation offset
  const elevationOffset = elevation * 100;
  return positionDepth + elevationOffset;
}

/**
 * Sort positions by depth for correct rendering order
 */
export function sortByDepth<T extends { col: number; row: number; elevation?: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const depthA = getDepth(a.col, a.row, a.elevation ?? 0);
    const depthB = getDepth(b.col, b.row, b.elevation ?? 0);
    return depthA - depthB;
  });
}

// =============================================================================
// CAMERA UTILITIES
// =============================================================================

/**
 * Create default camera state
 */
export function createDefaultCamera(): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    targetZoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
  };
}

/**
 * Clamp camera position to map bounds
 */
export function clampCameraToMap(
  camera: CameraState,
  tileMap: TileMap,
  screenWidth: number,
  screenHeight: number
): CameraState {
  // Calculate world bounds
  const topLeft = gridToWorld(0, 0);
  const topRight = gridToWorld(tileMap.width - 1, 0);
  const bottomLeft = gridToWorld(0, tileMap.height - 1);
  const bottomRight = gridToWorld(tileMap.width - 1, tileMap.height - 1);

  const minX = Math.min(topLeft.x, bottomLeft.x);
  const maxX = Math.max(topRight.x, bottomRight.x);
  const minY = Math.min(topLeft.y, topRight.y);
  const maxY = Math.max(bottomLeft.y, bottomRight.y);

  // Add screen-sized padding
  const padX = screenWidth / (2 * camera.zoom);
  const padY = screenHeight / (2 * camera.zoom);

  return {
    ...camera,
    x: Math.max(minX - padX, Math.min(maxX + padX, camera.x)),
    y: Math.max(minY - padY, Math.min(maxY + padY, camera.y)),
  };
}

/**
 * Calculate camera position to center on a tile
 */
export function getCameraCenterOnTile(col: number, row: number): WorldPosition {
  return gridToWorld(col, row);
}

// =============================================================================
// MAP GENERATION (for testing/demo)
// =============================================================================

/**
 * Generate a simple demo tile map
 */
export function generateDemoTileMap(width: number = 32, height: number = 32): TileMap {
  const tiles: Tile[][] = [];

  for (let row = 0; row < height; row++) {
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      // Simple terrain generation
      const distFromCenter = Math.sqrt(
        Math.pow(col - width / 2, 2) + Math.pow(row - height / 2, 2)
      );
      const maxDist = Math.min(width, height) / 2;

      let terrain: Tile['terrain'] = 'grass';
      let elevation = 0;

      if (distFromCenter > maxDist * 0.9) {
        terrain = 'water_deep';
      } else if (distFromCenter > maxDist * 0.8) {
        terrain = 'water_shallow';
      } else if (distFromCenter > maxDist * 0.75) {
        terrain = 'sand';
      } else if (distFromCenter < maxDist * 0.2) {
        terrain = 'volcanic';
        elevation = 2;
      } else if (distFromCenter < maxDist * 0.3) {
        terrain = 'mountain';
        elevation = 1;
      } else if (Math.random() < 0.3) {
        terrain = 'forest';
      }

      tiles[row][col] = {
        col,
        row,
        terrain,
        elevation,
        passable: !['water_deep', 'mountain', 'volcanic'].includes(terrain),
        buildable: ['grass', 'sand'].includes(terrain),
      };
    }
  }

  return { width, height, tiles };
}

// =============================================================================
// PATHFINDING HELPERS
// =============================================================================

/**
 * Get neighboring tile positions (4-directional)
 */
export function getNeighbors(col: number, row: number): GridPosition[] {
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ];
}

/**
 * Get neighboring tile positions (8-directional, including diagonals)
 */
export function getNeighbors8(col: number, row: number): GridPosition[] {
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
    { col: col - 1, row: row - 1 },
    { col: col + 1, row: row - 1 },
    { col: col - 1, row: row + 1 },
    { col: col + 1, row: row + 1 },
  ];
}

/**
 * Calculate Manhattan distance between two tiles
 */
export function manhattanDistance(
  col1: number,
  row1: number,
  col2: number,
  row2: number
): number {
  return Math.abs(col1 - col2) + Math.abs(row1 - row2);
}

/**
 * Calculate Euclidean distance between two tiles
 */
export function euclideanDistance(
  col1: number,
  row1: number,
  col2: number,
  row2: number
): number {
  return Math.sqrt(Math.pow(col1 - col2, 2) + Math.pow(row1 - row2, 2));
}
