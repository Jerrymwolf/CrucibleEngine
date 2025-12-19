'use client';

/**
 * BuildingLayer - Renders buildings on the island
 *
 * Buildings are rendered with proper depth sorting and
 * status indicators (operational, damaged, critical, etc.)
 */

import * as React from 'react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { CameraState, Building, GridPosition } from '@/types/island';
import {
  gridToWorld,
  getDepth,
  TILE_WIDTH,
  TILE_HEIGHT,
  sortByDepth,
} from '@/lib/island/grid';
import { getBuildingStatusColor, islandAssets, ASSET_MANIFEST } from '@/lib/island/assets';

interface BuildingLayerProps {
  /** PixiJS container to render into */
  container: Container;
  /** Buildings to render */
  buildings: Building[];
  /** Camera state */
  camera: CameraState;
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
  /** Currently selected building ID */
  selectedBuildingId?: string | null;
  /** Whether to show building labels */
  showLabels?: boolean;
  /** Whether to show health bars */
  showHealthBars?: boolean;
}

/**
 * Draw a building placeholder (colored box)
 */
function drawBuildingPlaceholder(
  graphics: Graphics,
  x: number,
  y: number,
  building: Building,
  isSelected: boolean
): void {
  const assetDef = ASSET_MANIFEST.buildings[building.type];
  const width = assetDef?.width ?? 64;
  const height = assetDef?.height ?? 64;

  // Get status color
  const statusColor = getBuildingStatusColor(building.status);

  // Building body (simple isometric box)
  graphics.beginFill(statusColor, 0.9);
  graphics.lineStyle(isSelected ? 2 : 1, isSelected ? 0xffffff : 0x000000, 0.5);

  // Front face
  const halfWidth = width / 2;
  const buildingHeight = height - TILE_HEIGHT;

  graphics.moveTo(x - halfWidth, y);
  graphics.lineTo(x - halfWidth, y - buildingHeight);
  graphics.lineTo(x, y - buildingHeight - TILE_HEIGHT / 2);
  graphics.lineTo(x, y - TILE_HEIGHT / 2);
  graphics.closePath();
  graphics.endFill();

  // Right face (slightly darker)
  graphics.beginFill(statusColor, 0.7);
  graphics.moveTo(x, y - TILE_HEIGHT / 2);
  graphics.lineTo(x, y - buildingHeight - TILE_HEIGHT / 2);
  graphics.lineTo(x + halfWidth, y - buildingHeight);
  graphics.lineTo(x + halfWidth, y);
  graphics.closePath();
  graphics.endFill();

  // Top face (lighter)
  graphics.beginFill(statusColor, 1);
  graphics.moveTo(x, y - buildingHeight - TILE_HEIGHT / 2);
  graphics.lineTo(x - halfWidth, y - buildingHeight);
  graphics.lineTo(x, y - buildingHeight + TILE_HEIGHT / 2);
  graphics.lineTo(x + halfWidth, y - buildingHeight);
  graphics.closePath();
  graphics.endFill();
}

/**
 * Draw a health bar above a building
 */
function drawHealthBar(
  graphics: Graphics,
  x: number,
  y: number,
  health: number,
  building: Building
): void {
  const assetDef = ASSET_MANIFEST.buildings[building.type];
  const buildingHeight = (assetDef?.height ?? 64) - TILE_HEIGHT;

  const barWidth = 32;
  const barHeight = 4;
  const barY = y - buildingHeight - TILE_HEIGHT / 2 - 10;

  // Background
  graphics.beginFill(0x000000, 0.5);
  graphics.drawRoundedRect(x - barWidth / 2, barY, barWidth, barHeight, 2);
  graphics.endFill();

  // Health fill
  const healthColor =
    health >= 70 ? 0x22c55e : health >= 40 ? 0xeab308 : 0xef4444;
  const fillWidth = (health / 100) * (barWidth - 2);

  graphics.beginFill(healthColor);
  graphics.drawRoundedRect(
    x - barWidth / 2 + 1,
    barY + 1,
    fillWidth,
    barHeight - 2,
    1
  );
  graphics.endFill();
}

/**
 * Render building layer into the container
 */
export function renderBuildingLayer({
  container,
  buildings,
  camera,
  screenWidth,
  screenHeight,
  selectedBuildingId,
  showLabels = false,
  showHealthBars = true,
}: BuildingLayerProps): void {
  // Clear existing children
  container.removeChildren();

  // Sort buildings by depth for proper rendering order
  const sortedBuildings = sortByDepth(
    buildings.map((b) => ({
      ...b,
      elevation: 0, // Buildings sit on ground level
    }))
  );

  for (const building of sortedBuildings) {
    // Create container for this building
    const buildingContainer = new Container();

    // Get world position
    const world = gridToWorld(building.col, building.row);

    // Set depth
    buildingContainer.zIndex = getDepth(building.col, building.row, 1);

    // Create graphics for the building
    const graphics = new Graphics();
    const isSelected = building.id === selectedBuildingId;

    // Draw building placeholder
    drawBuildingPlaceholder(graphics, 0, 0, building, isSelected);

    // Draw health bar if damaged and enabled
    if (showHealthBars && building.health < 100) {
      drawHealthBar(graphics, 0, 0, building.health, building);
    }

    buildingContainer.addChild(graphics);

    // Add label if enabled
    if (showLabels) {
      const style = new TextStyle({
        fontSize: 8,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
      });

      const assetHeight = ASSET_MANIFEST.buildings[building.type]?.height;
      const labelY = assetHeight !== undefined ? -assetHeight : -64;

      const label = new Text({ text: building.type.replace(/_/g, ' '), style });
      label.anchor.set(0.5, 1);
      label.y = labelY;
      buildingContainer.addChild(label);
    }

    // Position the container
    buildingContainer.x = world.x;
    buildingContainer.y = world.y;

    container.addChild(buildingContainer);
  }

  // Sort by zIndex
  container.sortChildren();
}

/**
 * React component wrapper for building layer rendering
 */
export function BuildingLayer(
  props: Omit<BuildingLayerProps, 'container'> & {
    containerRef: React.RefObject<Container>;
  }
) {
  const { containerRef, ...rest } = props;

  React.useEffect(() => {
    if (!containerRef.current) return;

    renderBuildingLayer({
      container: containerRef.current,
      ...rest,
    });
  }, [containerRef, rest]);

  return null;
}

export default BuildingLayer;
