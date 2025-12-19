'use client';

/**
 * TerrainLayer - Renders the base terrain tiles
 *
 * Uses PixiJS Graphics to draw isometric diamond tiles
 * with terrain-specific colors. Supports both sprite-based
 * and color-fallback rendering.
 */

import * as React from 'react';
import { Container, Graphics } from 'pixi.js';
import type { CameraState, TileMap, GridPosition } from '@/types/island';
import {
  gridToWorld,
  getVisibleTiles,
  TILE_WIDTH,
  TILE_HEIGHT,
  getDepth,
} from '@/lib/island/grid';
import { getTerrainColor, islandAssets } from '@/lib/island/assets';

interface TerrainLayerProps {
  /** PixiJS container to render into */
  container: Container;
  /** Tile map data */
  tileMap: TileMap;
  /** Camera state */
  camera: CameraState;
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
  /** Currently selected tile */
  selectedTile?: GridPosition | null;
  /** Currently hovered tile */
  hoveredTile?: GridPosition | null;
  /** Whether to use sprite textures (vs color fallback) */
  useSprites?: boolean;
}

/**
 * Draw a single isometric tile
 */
function drawTile(
  graphics: Graphics,
  x: number,
  y: number,
  color: number,
  alpha: number = 1,
  strokeColor: number = 0x000000,
  strokeAlpha: number = 0.2
): void {
  graphics.beginFill(color, alpha);
  graphics.lineStyle(1, strokeColor, strokeAlpha);

  // Isometric diamond shape
  const halfWidth = TILE_WIDTH / 2;
  const halfHeight = TILE_HEIGHT / 2;

  graphics.moveTo(x, y - halfHeight);
  graphics.lineTo(x + halfWidth, y);
  graphics.lineTo(x, y + halfHeight);
  graphics.lineTo(x - halfWidth, y);
  graphics.closePath();
  graphics.endFill();
}

/**
 * Render terrain layer into the container
 */
export function renderTerrainLayer({
  container,
  tileMap,
  camera,
  screenWidth,
  screenHeight,
  selectedTile,
  hoveredTile,
  useSprites = false,
}: TerrainLayerProps): void {
  // Clear existing terrain children
  container.removeChildren();

  // Get visible tiles
  const visibleTiles = getVisibleTiles(tileMap, camera, screenWidth, screenHeight);

  // Create a single graphics object for all tiles (batched rendering)
  const terrainGraphics = new Graphics();
  terrainGraphics.zIndex = 0;

  for (const { col, row } of visibleTiles) {
    const tile = tileMap.tiles[row]?.[col];
    if (!tile) continue;

    // Get world position
    const world = gridToWorld(col, row);

    // Check highlight states
    const isSelected = selectedTile?.col === col && selectedTile?.row === row;
    const isHovered = hoveredTile?.col === col && hoveredTile?.row === row;

    // Get terrain color
    let color = getTerrainColor(tile.terrain);
    let alpha = 0.9;
    let strokeColor = 0x000000;
    let strokeAlpha = 0.2;

    // Highlight effects
    if (isSelected) {
      strokeColor = 0xffffff;
      strokeAlpha = 1;
      alpha = 1;
    } else if (isHovered) {
      alpha = 1;
      strokeColor = 0xffffff;
      strokeAlpha = 0.5;
    }

    // Draw the tile
    drawTile(terrainGraphics, world.x, world.y, color, alpha, strokeColor, strokeAlpha);
  }

  container.addChild(terrainGraphics);
}

/**
 * React component wrapper for terrain layer rendering
 */
export function TerrainLayer(props: Omit<TerrainLayerProps, 'container'> & {
  containerRef: React.RefObject<Container>;
}) {
  const { containerRef, ...rest } = props;

  React.useEffect(() => {
    if (!containerRef.current) return;

    renderTerrainLayer({
      container: containerRef.current,
      ...rest,
    });
  }, [containerRef, rest]);

  return null; // This component renders directly to PixiJS, not React DOM
}

export default TerrainLayer;
