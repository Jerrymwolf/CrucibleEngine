'use client';

/**
 * CommandView - Dual-view container for crisis management
 *
 * Provides seamless switching between:
 * - Strategic View: SVG choropleth map (ConcordiaMap) for risk assessment
 * - Tactical View: Isometric renderer (IslandViewport) for detailed operations
 *
 * Features:
 * - Smooth animated transitions between views
 * - Keyboard shortcut (Space) for quick toggle
 * - Persistent camera position across view switches
 * - Synchronized selection state
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSound } from '@/hooks/useSound';
import { ConcordiaMap } from './ConcordiaMap';
import { IslandViewport } from '@/components/island';
import { generateDemoTileMap, createDefaultCamera } from '@/lib/island/grid';
import type { CameraState, IslandState, GridPosition } from '@/types/island';
import { Map, Layers, Maximize2, Minimize2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = 'strategic' | 'tactical';

/** Parish data matching ConcordiaMap expectations */
interface ParishData {
  id: string;
  power: number;
  communications: number;
  morale: number;
  populationRemaining: number;
  casualties: number;
  roads?: number;
  waterSystem?: number;
  hospital?: number;
}

/** Weather overlay for strategic view */
interface WeatherOverlay {
  intensity: 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
  stormPosition?: { x: number; y: number };
}

interface CommandViewProps {
  /** Parish data for the strategic map */
  parishes?: Record<string, ParishData>;
  /** Weather/hurricane data for strategic view */
  weather?: WeatherOverlay;
  /** Currently selected parish */
  selectedParish?: string | null;
  /** Parish selection handler */
  onParishClick?: (parishId: string) => void;
  /** Optional island state for tactical view */
  islandState?: IslandState;
  /** Initial view mode */
  initialView?: ViewMode;
  /** Whether to show view toggle controls */
  showControls?: boolean;
  /** Whether keyboard shortcuts are enabled */
  enableKeyboard?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const viewVariants = {
  enter: {
    opacity: 0,
    scale: 0.98,
  },
  center: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: 'easeIn' as const,
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function CommandView({
  parishes,
  weather,
  selectedParish,
  onParishClick,
  islandState,
  initialView = 'strategic',
  showControls = true,
  enableKeyboard = true,
  className,
}: CommandViewProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(initialView);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [tacticalCamera, setTacticalCamera] = React.useState<CameraState>(createDefaultCamera);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { playUI } = useSound();

  // Generate demo island state if not provided
  const defaultIslandState = React.useMemo((): IslandState => {
    if (islandState) return islandState;

    return {
      tileMap: generateDemoTileMap(24, 24),
      buildings: [],
      entities: [],
      effects: [],
      selectedTile: null,
      hoveredTile: null,
      camera: createDefaultCamera(),
      layers: [
        { type: 'terrain', visible: true, opacity: 1, zIndex: 0 },
        { type: 'buildings', visible: true, opacity: 1, zIndex: 1 },
        { type: 'entities', visible: true, opacity: 1, zIndex: 2 },
        { type: 'effects', visible: true, opacity: 1, zIndex: 3 },
      ],
    };
  }, [islandState]);

  // Toggle view mode
  const toggleView = React.useCallback(() => {
    playUI('select');
    setViewMode((prev) => (prev === 'strategic' ? 'tactical' : 'strategic'));
  }, [playUI]);

  // Toggle fullscreen
  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    playUI('click');
  }, [playUI]);

  // Handle fullscreen change events
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut for view toggle
  React.useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleView();
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, toggleView, toggleFullscreen]);

  // Handle tile click in tactical view
  const handleTileClick = React.useCallback(
    (event: { position: GridPosition }) => {
      if (!parishes || !onParishClick) return;
      // Map tile position to parish (simplified mapping)
      // In a real implementation, this would use the actual parish boundaries
      const parishIds = Object.keys(parishes);
      const index = (event.position.col + event.position.row) % parishIds.length;
      const parishId = parishIds[index];
      if (parishId) {
        onParishClick(parishId);
      }
    },
    [parishes, onParishClick]
  );

  // Handle camera changes in tactical view
  const handleCameraChange = React.useCallback((camera: CameraState) => {
    setTacticalCamera(camera);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-background overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* View Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'strategic' ? (
          <motion.div
            key="strategic"
            variants={viewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <ConcordiaMap
              parishes={parishes}
              weather={weather}
              selectedParish={selectedParish}
              onParishClick={onParishClick}
              className="w-full h-full"
            />
          </motion.div>
        ) : (
          <motion.div
            key="tactical"
            variants={viewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <IslandViewport
              state={defaultIslandState}
              onTileClick={handleTileClick}
              onCameraChange={handleCameraChange}
              interactive
              debug={false}
              className="w-full h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Controls */}
      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm overflow-hidden">
            <Button
              variant={viewMode === 'strategic' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => {
                if (viewMode !== 'strategic') {
                  playUI('select');
                  setViewMode('strategic');
                }
              }}
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Strategic</span>
            </Button>
            <Button
              variant={viewMode === 'tactical' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => {
                if (viewMode !== 'tactical') {
                  playUI('select');
                  setViewMode('tactical');
                }
              }}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Tactical</span>
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="bg-background/90 backdrop-blur-sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* View Mode Indicator */}
      <div className="absolute bottom-3 left-3 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-lg border text-xs">
          <span className="text-muted-foreground">View:</span>
          <span className="font-medium capitalize">{viewMode}</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
            Space
          </kbd>
        </div>
      </div>

      {/* Tactical View Camera Info */}
      {viewMode === 'tactical' && (
        <div className="absolute bottom-3 right-3 z-20">
          <div className="px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-lg border text-xs font-mono">
            <span className="text-muted-foreground">Zoom: </span>
            <span>{tacticalCamera.zoom.toFixed(2)}x</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandView;
