/**
 * WeatherEngine
 *
 * Manages the hurricane timeline state machine for Hurricane Midas.
 * Tracks weather progression through 8 timeline windows and emits events
 * for window transitions, phase changes, and weather updates.
 *
 * Works in coordination with TimeController for time progression.
 */

import { EventEmitter } from 'events';
import type {
  WeatherEngineState,
  WeatherEngineConfig,
  WeatherTransition,
} from '@crucible/shared';
import type { TimelineWindow, TimelinePhase, TimelineWeather } from '@crucible/shared';
import {
  HURRICANE_MIDAS,
  getTimelineWindow,
  getCurrentWindow,
  getNextWindow,
  simulationTimeToTMinusHours,
} from '@crucible/shared';
import type { TimeController } from './TimeController.js';

// ============================================================================
// WEATHER ENGINE EVENTS
// ============================================================================

export interface WeatherEngineEvents {
  windowTransition: (transition: WeatherTransition) => void;
  phaseChange: (oldPhase: TimelinePhase, newPhase: TimelinePhase) => void;
  weatherUpdate: (weather: TimelineWeather, window: TimelineWindow) => void;
  started: () => void;
  stopped: () => void;
}

// ============================================================================
// WEATHER ENGINE
// ============================================================================

export class WeatherEngine extends EventEmitter {
  private state: WeatherEngineState;
  private config: WeatherEngineConfig;
  private timeController: TimeController | null = null;
  private boundTimeTickHandler: ((state: unknown) => void) | null = null;

  constructor(config: Partial<WeatherEngineConfig> = {}) {
    super();

    const initialWindow = getTimelineWindow(config.initialWindow || 'watch-72') || HURRICANE_MIDAS.windows[0];
    const initialIndex = HURRICANE_MIDAS.windows.findIndex((w) => w.id === initialWindow.id);

    this.config = {
      initialWindow: initialWindow.id,
      ...config,
    };

    this.state = {
      currentWindow: initialWindow,
      currentWindowIndex: initialIndex >= 0 ? initialIndex : 0,
      simulationTimeOffset: initialWindow.tMinusHours,
      running: false,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Attach to a TimeController for automatic progression
   */
  attachTimeController(timeController: TimeController): void {
    if (this.timeController) {
      this.detachTimeController();
    }

    this.timeController = timeController;

    // Listen for time ticks
    this.boundTimeTickHandler = () => {
      this.updateFromSimulationTime(timeController.getSimulationTime());
    };

    timeController.on('tick', this.boundTimeTickHandler);
  }

  /**
   * Detach from TimeController
   */
  detachTimeController(): void {
    if (this.timeController && this.boundTimeTickHandler) {
      this.timeController.off('tick', this.boundTimeTickHandler);
    }
    this.timeController = null;
    this.boundTimeTickHandler = null;
  }

  /**
   * Start the weather engine
   */
  start(): void {
    this.state.running = true;
    this.emit('started');
    this.emit('weatherUpdate', this.state.currentWindow.weather, this.state.currentWindow);
  }

  /**
   * Stop the weather engine
   */
  stop(): void {
    this.state.running = false;
    this.emit('stopped');
  }

  /**
   * Get current state
   */
  getState(): WeatherEngineState {
    return {
      ...this.state,
      currentWindow: { ...this.state.currentWindow },
    };
  }

  /**
   * Get current weather conditions
   */
  getCurrentWeather(): TimelineWeather {
    return { ...this.state.currentWindow.weather };
  }

  /**
   * Get current window
   */
  getCurrentWindow(): TimelineWindow {
    return { ...this.state.currentWindow };
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): TimelinePhase {
    return this.state.currentWindow.phase;
  }

  /**
   * Get T-minus hours
   */
  getTMinusHours(): number {
    return this.state.simulationTimeOffset;
  }

  /**
   * Get current window index (0-7)
   */
  getWindowIndex(): number {
    return this.state.currentWindowIndex;
  }

  /**
   * Check if all windows have been completed
   */
  isComplete(): boolean {
    return this.state.currentWindowIndex >= HURRICANE_MIDAS.windows.length - 1;
  }

  /**
   * Get all available windows
   */
  getAllWindows(): TimelineWindow[] {
    return [...HURRICANE_MIDAS.windows];
  }

  /**
   * Get windows remaining
   */
  getRemainingWindows(): TimelineWindow[] {
    return HURRICANE_MIDAS.windows.slice(this.state.currentWindowIndex + 1);
  }

  /**
   * Get previous windows (for decision history context)
   */
  getPreviousWindows(): TimelineWindow[] {
    return HURRICANE_MIDAS.windows.slice(0, this.state.currentWindowIndex);
  }

  /**
   * Manually advance to next window (for testing or CM control)
   */
  advanceToNextWindow(): boolean {
    const nextWindow = getNextWindow(this.state.currentWindow.id);
    if (!nextWindow) return false;

    this.transitionToWindow(nextWindow);
    return true;
  }

  /**
   * Set window directly (for testing or recovery)
   */
  setWindow(windowId: string): boolean {
    const window = getTimelineWindow(windowId);
    if (!window) return false;

    this.transitionToWindow(window);
    return true;
  }

  /**
   * Update from simulation time (called by TimeController)
   */
  updateFromSimulationTime(simulationMinutes: number): void {
    const tMinusHours = simulationTimeToTMinusHours(simulationMinutes);
    const newWindow = getCurrentWindow(simulationMinutes);

    if (newWindow.id !== this.state.currentWindow.id) {
      this.transitionToWindow(newWindow);
    }

    this.state.simulationTimeOffset = tMinusHours;
  }

  /**
   * Get intensity level for current conditions (1-10)
   */
  getIntensityLevel(): number {
    const weather = this.state.currentWindow.weather;
    const phase = this.state.currentWindow.phase;

    // Calculate base intensity from weather conditions
    let intensity = 1;

    // Wind contribution (0-5 points)
    if (weather.windMph >= 130) intensity += 5;
    else if (weather.windMph >= 95) intensity += 4;
    else if (weather.windMph >= 65) intensity += 3;
    else if (weather.windMph >= 45) intensity += 2;
    else if (weather.windMph >= 25) intensity += 1;

    // Phase contribution (0-3 points)
    if (phase === 'landfall') intensity += 3;
    else if (phase === 'approach') intensity += 2;
    else if (phase === 'warning' || phase === 'eye') intensity += 1;

    // Storm surge contribution (0-2 points)
    if (weather.stormSurgeFeet >= 10) intensity += 2;
    else if (weather.stormSurgeFeet >= 5) intensity += 1;

    return Math.min(10, Math.max(1, intensity));
  }

  /**
   * Get human-readable status
   */
  getStatusDescription(): string {
    const window = this.state.currentWindow;
    const weather = window.weather;

    return [
      `${window.label} (${window.phase})`,
      `Winds: ${weather.windMph} mph`,
      `Rain: ${weather.rainfallInchesPerHour} in/hr`,
      `Surge: ${weather.stormSurgeFeet} ft`,
      `Visibility: ${weather.visibility}`,
    ].join(' | ');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.detachTimeController();
    this.stop();
    this.removeAllListeners();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Handle transition to a new window
   */
  private transitionToWindow(newWindow: TimelineWindow): void {
    const oldWindow = this.state.currentWindow;
    const oldPhase = oldWindow.phase;

    // Find new window index
    const newIndex = HURRICANE_MIDAS.windows.findIndex((w) => w.id === newWindow.id);

    // Create transition record
    const transition: WeatherTransition = {
      from: oldWindow,
      to: newWindow,
      timestamp: Date.now(),
    };

    // Update state
    this.state.currentWindow = newWindow;
    this.state.currentWindowIndex = newIndex >= 0 ? newIndex : this.state.currentWindowIndex;
    this.state.simulationTimeOffset = newWindow.tMinusHours;

    // Emit events
    this.emit('windowTransition', transition);

    if (oldPhase !== newWindow.phase) {
      this.emit('phaseChange', oldPhase, newWindow.phase);
      this.config.onPhaseChange?.(oldPhase, newWindow.phase);
    }

    this.config.onWindowTransition?.(oldWindow, newWindow);
    this.emit('weatherUpdate', newWindow.weather, newWindow);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createWeatherEngine(config?: Partial<WeatherEngineConfig>): WeatherEngine {
  return new WeatherEngine(config);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get weather severity string
 */
export function getWeatherSeverity(weather: TimelineWeather): 'calm' | 'rough' | 'dangerous' | 'catastrophic' {
  if (weather.windMph >= 110 || weather.stormSurgeFeet >= 10) return 'catastrophic';
  if (weather.windMph >= 75 || weather.stormSurgeFeet >= 5) return 'dangerous';
  if (weather.windMph >= 40 || weather.rainfallInchesPerHour >= 1) return 'rough';
  return 'calm';
}

/**
 * Check if outdoor operations are possible
 */
export function canOperateOutdoors(weather: TimelineWeather): boolean {
  return weather.windMph < 45 && weather.visibility !== 'zero';
}

/**
 * Check if air operations are possible
 */
export function canOperateAir(weather: TimelineWeather): boolean {
  return weather.windMph < 35 && weather.visibility !== 'zero' && weather.visibility !== 'poor';
}

/**
 * Check if sea operations are possible
 */
export function canOperateSea(weather: TimelineWeather): boolean {
  return weather.windMph < 25 && weather.stormSurgeFeet < 3;
}

/**
 * Get interpolated weather between two windows
 * Useful for smooth transitions
 */
export function interpolateWeather(
  from: TimelineWeather,
  to: TimelineWeather,
  progress: number // 0-1
): TimelineWeather {
  const lerp = (a: number, b: number) => a + (b - a) * progress;

  return {
    windMph: Math.round(lerp(from.windMph, to.windMph)),
    rainfallInchesPerHour: Math.round(lerp(from.rainfallInchesPerHour, to.rainfallInchesPerHour) * 10) / 10,
    stormSurgeFeet: Math.round(lerp(from.stormSurgeFeet, to.stormSurgeFeet)),
    visibility: progress < 0.5 ? from.visibility : to.visibility,
  };
}
