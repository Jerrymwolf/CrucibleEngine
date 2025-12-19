'use client';

/**
 * useCamera - Camera controls for the isometric viewport
 *
 * Provides:
 * - Pan and zoom controls
 * - Smooth animations
 * - Boundary constraints
 * - Keyboard shortcuts
 */

import * as React from 'react';
import type { CameraState, CameraControls, TileMap } from '@/types/island';
import {
  createDefaultCamera,
  clampCameraToMap,
  getCameraCenterOnTile,
} from '@/lib/island/grid';

interface UseCameraOptions {
  /** Initial camera state */
  initial?: Partial<CameraState>;
  /** Tile map for boundary clamping */
  tileMap?: TileMap;
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Enable keyboard controls */
  enableKeyboard?: boolean;
}

interface UseCameraReturn extends CameraControls {
  /** Current camera state */
  camera: CameraState;
  /** Update camera state */
  setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
  /** Whether camera is currently animating */
  isAnimating: boolean;
}

export function useCamera(options: UseCameraOptions): UseCameraReturn {
  const {
    initial,
    tileMap,
    screenWidth,
    screenHeight,
    animationDuration = 300,
    enableKeyboard = true,
  } = options;

  const [camera, setCamera] = React.useState<CameraState>(() => ({
    ...createDefaultCamera(),
    ...initial,
  }));

  const [isAnimating, setIsAnimating] = React.useState(false);
  const animationRef = React.useRef<number | null>(null);

  // ==========================================================================
  // ANIMATION HELPER
  // ==========================================================================

  const animateTo = React.useCallback(
    (
      targetState: Partial<CameraState>,
      duration: number = animationDuration
    ) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const startState = { ...camera };
      const startTime = performance.now();
      setIsAnimating(true);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        setCamera((prev) => {
          const newState = { ...prev };

          if (targetState.x !== undefined) {
            newState.x = startState.x + (targetState.x - startState.x) * eased;
          }
          if (targetState.y !== undefined) {
            newState.y = startState.y + (targetState.y - startState.y) * eased;
          }
          if (targetState.zoom !== undefined) {
            newState.zoom =
              startState.zoom + (targetState.zoom - startState.zoom) * eased;
          }

          return newState;
        });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [camera, animationDuration]
  );

  // ==========================================================================
  // CAMERA CONTROLS
  // ==========================================================================

  const pan = React.useCallback(
    (dx: number, dy: number) => {
      setCamera((prev) => {
        let newCamera = {
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        };

        // Clamp to map bounds if tileMap provided
        if (tileMap) {
          newCamera = clampCameraToMap(
            newCamera,
            tileMap,
            screenWidth,
            screenHeight
          );
        }

        return newCamera;
      });
    },
    [tileMap, screenWidth, screenHeight]
  );

  const panTo = React.useCallback(
    (x: number, y: number, animate: boolean = true) => {
      if (animate) {
        animateTo({ x, y });
      } else {
        setCamera((prev) => ({ ...prev, x, y }));
      }
    },
    [animateTo]
  );

  const zoomIn = React.useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(prev.maxZoom, prev.zoom * 1.25),
    }));
  }, []);

  const zoomOut = React.useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(prev.minZoom, prev.zoom * 0.8),
    }));
  }, []);

  const zoomTo = React.useCallback(
    (level: number, animate: boolean = true) => {
      const clampedZoom = Math.max(
        camera.minZoom,
        Math.min(camera.maxZoom, level)
      );

      if (animate) {
        animateTo({ zoom: clampedZoom });
      } else {
        setCamera((prev) => ({ ...prev, zoom: clampedZoom }));
      }
    },
    [camera.minZoom, camera.maxZoom, animateTo]
  );

  const reset = React.useCallback(() => {
    animateTo({
      x: 0,
      y: 0,
      zoom: 1,
    });
  }, [animateTo]);

  const focusOnTile = React.useCallback(
    (col: number, row: number) => {
      const center = getCameraCenterOnTile(col, row);
      animateTo({ x: center.x, y: center.y });
    },
    [animateTo]
  );

  // ==========================================================================
  // KEYBOARD CONTROLS
  // ==========================================================================

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

      const panAmount = 50 / camera.zoom;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          pan(0, -panAmount);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          pan(0, panAmount);
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          pan(-panAmount, 0);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          pan(panAmount, 0);
          break;
        case '=':
        case '+':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          reset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, camera.zoom, pan, zoomIn, zoomOut, reset]);

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    camera,
    setCamera,
    isAnimating,
    pan,
    panTo,
    zoomIn,
    zoomOut,
    zoomTo,
    reset,
    focusOnTile,
  };
}

export default useCamera;
