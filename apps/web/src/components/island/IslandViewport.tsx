'use client';

/**
 * IslandViewport - Main PixiJS-based isometric island renderer
 *
 * Features:
 * - Hardware-accelerated WebGL rendering
 * - Isometric tile grid with proper depth sorting
 * - Pan/zoom camera controls
 * - Layer-based rendering (terrain, buildings, entities, effects)
 * - Responsive to container size
 */

import * as React from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { cn } from '@/lib/utils';
import {
  gridToWorld,
  screenToGrid,
  createDefaultCamera,
  getVisibleTiles,
  TILE_WIDTH,
  TILE_HEIGHT,
} from '@/lib/island/grid';
import { preloadCriticalAssets, getTerrainColor } from '@/lib/island/assets';
import type {
  CameraState,
  GridPosition,
  IslandState,
  IslandEventHandler,
} from '@/types/island';

// =============================================================================
// TYPES
// =============================================================================

interface IslandViewportProps {
  /** Island state from server */
  state: IslandState;
  /** Tile click handler */
  onTileClick?: IslandEventHandler;
  /** Tile hover handler */
  onTileHover?: IslandEventHandler;
  /** Camera change handler */
  onCameraChange?: (camera: CameraState) => void;
  /** Whether interactions are enabled */
  interactive?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show debug grid */
  debug?: boolean;
}

// =============================================================================
// RENDER FUNCTION (outside component for stability)
// =============================================================================

function renderTiles(
  mainContainer: Container,
  state: IslandState,
  camera: CameraState,
  dimensions: { width: number; height: number },
  hoveredTile: GridPosition | null,
  debug: boolean
): void {
  const { width, height } = dimensions;

  // Clear previous render
  mainContainer.removeChildren();

  // Apply camera transform
  mainContainer.x = width / 2 - camera.x * camera.zoom;
  mainContainer.y = height / 2 - camera.y * camera.zoom;
  mainContainer.scale.set(camera.zoom);

  // Get visible tiles
  const visibleTiles = getVisibleTiles(state.tileMap, camera, width, height);

  // Create a batched graphics object for all tiles
  const terrainGraphics = new Graphics();

  for (const { col, row } of visibleTiles) {
    const tile = state.tileMap.tiles[row]?.[col];
    if (!tile) continue;

    // Get world position
    const world = gridToWorld(col, row);

    // Draw isometric diamond
    const color = getTerrainColor(tile.terrain);
    const isHovered = hoveredTile?.col === col && hoveredTile?.row === row;

    terrainGraphics.beginFill(color, isHovered ? 1 : 0.9);
    terrainGraphics.lineStyle(1, isHovered ? 0xffffff : 0x000000, isHovered ? 0.5 : 0.2);

    // Diamond shape centered at world position
    terrainGraphics.moveTo(world.x, world.y - TILE_HEIGHT / 2);
    terrainGraphics.lineTo(world.x + TILE_WIDTH / 2, world.y);
    terrainGraphics.lineTo(world.x, world.y + TILE_HEIGHT / 2);
    terrainGraphics.lineTo(world.x - TILE_WIDTH / 2, world.y);
    terrainGraphics.closePath();
    terrainGraphics.endFill();
  }

  terrainGraphics.zIndex = 0;
  mainContainer.addChild(terrainGraphics);

  // Debug labels (separate pass for text)
  if (debug) {
    for (const { col, row } of visibleTiles) {
      const world = gridToWorld(col, row);
      const textStyle = new TextStyle({
        fontSize: 8,
        fill: 0xffffff,
      });
      const text = new Text({ text: `${col},${row}`, style: textStyle });
      text.anchor.set(0.5);
      text.x = world.x;
      text.y = world.y;
      text.zIndex = 10000;
      mainContainer.addChild(text);
    }
  }

  // Sort children by zIndex
  mainContainer.sortChildren();
}

// =============================================================================
// COMPONENT
// =============================================================================

export function IslandViewport({
  state,
  onTileClick,
  onTileHover,
  onCameraChange,
  interactive = true,
  className,
  debug = false,
}: IslandViewportProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const appRef = React.useRef<Application | null>(null);
  const mainContainerRef = React.useRef<Container | null>(null);

  const [camera, setCamera] = React.useState<CameraState>(createDefaultCamera);
  const [hoveredTile, setHoveredTile] = React.useState<GridPosition | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadProgress, setLoadProgress] = React.useState(0);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Drag state for panning
  const isDragging = React.useRef(false);
  const lastPointer = React.useRef({ x: 0, y: 0 });

  // ==========================================================================
  // INITIALIZE PIXI APPLICATION
  // ==========================================================================

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    setDimensions({ width, height });

    // Create PixiJS application
    const initApp = async () => {
      const app = new Application();

      await app.init({
        width,
        height,
        backgroundColor: 0x1e3a5f, // Ocean blue
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Add canvas to container
      container.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      // Create main container for camera transforms
      const mainContainer = new Container();
      mainContainer.sortableChildren = true;
      app.stage.addChild(mainContainer);
      mainContainerRef.current = mainContainer;

      // Load assets
      await preloadCriticalAssets((progress) => {
        setLoadProgress(progress);
      });

      setIsLoading(false);
    };

    initApp().catch(console.error);

    // Cleanup
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // ==========================================================================
  // RESIZE HANDLER
  // ==========================================================================

  React.useEffect(() => {
    if (!containerRef.current || !appRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });

        if (appRef.current) {
          appRef.current.renderer.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // ==========================================================================
  // RENDER ISLAND (on state/camera change)
  // ==========================================================================

  React.useEffect(() => {
    if (!isLoading && mainContainerRef.current && dimensions.width > 0) {
      renderTiles(
        mainContainerRef.current,
        state,
        camera,
        dimensions,
        hoveredTile,
        debug
      );
    }
  }, [state, camera, dimensions, hoveredTile, debug, isLoading]);

  // ==========================================================================
  // POINTER HANDLERS
  // ==========================================================================

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    },
    [interactive]
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;

      // Pan camera while dragging
      if (isDragging.current) {
        const dx = (e.clientX - lastPointer.current.x) / camera.zoom;
        const dy = (e.clientY - lastPointer.current.y) / camera.zoom;

        setCamera((prev) => ({
          ...prev,
          x: prev.x - dx,
          y: prev.y - dy,
        }));

        lastPointer.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Update hovered tile
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const gridPos = screenToGrid(
          screenX,
          screenY,
          camera,
          dimensions.width,
          dimensions.height
        );

        const col = Math.floor(gridPos.col);
        const row = Math.floor(gridPos.row);

        if (
          col >= 0 &&
          col < state.tileMap.width &&
          row >= 0 &&
          row < state.tileMap.height
        ) {
          setHoveredTile({ col, row });

          if (onTileHover) {
            onTileHover({
              type: 'tile_hover',
              position: { col, row },
              worldPosition: { x: gridPos.col, y: gridPos.row },
            });
          }
        } else {
          setHoveredTile(null);
        }
      }
    },
    [interactive, camera, dimensions, state.tileMap, onTileHover]
  );

  const handlePointerUp = React.useCallback(
    () => {
      if (!interactive) return;

      if (isDragging.current) {
        isDragging.current = false;

        if (hoveredTile && onTileClick) {
          onTileClick({
            type: 'tile_click',
            position: hoveredTile,
            worldPosition: { x: hoveredTile.col, y: hoveredTile.row },
          });
        }
      }
    },
    [interactive, hoveredTile, onTileClick]
  );

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();

      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;

      setCamera((prev) => ({
        ...prev,
        zoom: Math.max(prev.minZoom, Math.min(prev.maxZoom, prev.zoom * zoomDelta)),
      }));
    },
    [interactive]
  );

  // Notify parent of camera changes
  React.useEffect(() => {
    onCameraChange?.(camera);
  }, [camera, onCameraChange]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden',
        interactive && 'cursor-grab active:cursor-grabbing',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        isDragging.current = false;
        setHoveredTile(null);
      }}
      onWheel={handleWheel}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading assets... {Math.round(loadProgress)}%
          </p>
        </div>
      )}

      {/* Debug info */}
      {debug && !isLoading && (
        <div className="absolute top-2 left-2 bg-background/80 rounded p-2 text-xs font-mono z-20">
          <div>Camera: ({camera.x.toFixed(0)}, {camera.y.toFixed(0)})</div>
          <div>Zoom: {camera.zoom.toFixed(2)}</div>
          {hoveredTile && (
            <div>
              Tile: ({hoveredTile.col}, {hoveredTile.row})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IslandViewport;
