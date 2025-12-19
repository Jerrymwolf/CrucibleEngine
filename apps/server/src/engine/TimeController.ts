/**
 * TimeController
 *
 * Manages simulation time progression with variable compression ratios based on phase.
 * Time compression allows players to experience a 96-hour hurricane timeline in ~3.5 hours.
 *
 * Compression ratios:
 * - Watch: 50:1 (5 sec real = ~4 min sim)
 * - Warning: 30:1
 * - Approach/Landfall: 15:1 (peak intensity - slower for important decisions)
 * - Eye: 20:1
 * - Recovery: 20:1
 */

import { EventEmitter } from 'events';
import type {
  TimeControllerState,
  TimeControllerConfig,
  TimeCompressionConfig,
} from '@crucible/shared';
import type { TimelinePhase } from '@crucible/shared';
import {
  getCurrentWindow,
  simulationTimeToTMinusHours,
  getMinutesUntilNextWindow,
} from '@crucible/shared';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_COMPRESSIONS: TimeCompressionConfig = {
  watch: 50, // 5 sec real = 250 sec sim = ~4 min sim
  warning: 30, // 5 sec real = 150 sec sim = ~2.5 min sim
  approach: 15, // 5 sec real = 75 sec sim = ~1.25 min sim
  landfall: 15, // Peak intensity - slower
  eye: 20,
  recovery: 20,
};

const DEFAULT_CONFIG: TimeControllerConfig = {
  defaultCompression: 30,
  phaseCompressions: DEFAULT_COMPRESSIONS,
};

// ============================================================================
// TIME CONTROLLER
// ============================================================================

export interface TimeControllerEvents {
  tick: (state: TimeControllerState) => void;
  phaseChange: (oldPhase: TimelinePhase, newPhase: TimelinePhase) => void;
  paused: () => void;
  resumed: () => void;
  windowTransition: (oldWindow: string, newWindow: string) => void;
}

export class TimeController extends EventEmitter {
  private state: TimeControllerState;
  private config: TimeControllerConfig;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private readonly TICK_MS = 1000; // Tick every second

  constructor(config: Partial<TimeControllerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      compressionRatio: this.config.defaultCompression,
      paused: true,
      currentPhase: 'watch',
      simulationTimeMinutes: 0,
      lastRealTime: Date.now(),
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start the time controller
   */
  start(): void {
    if (this.tickInterval) return;

    this.state.paused = false;
    this.state.lastRealTime = Date.now();

    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.TICK_MS);

    this.emit('resumed');
  }

  /**
   * Stop the time controller
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.state.paused = true;
    this.emit('paused');
  }

  /**
   * Pause simulation time (keeps interval running for state checks)
   */
  pause(): void {
    this.state.paused = true;
    this.emit('paused');
  }

  /**
   * Resume simulation time
   */
  resume(): void {
    this.state.paused = false;
    this.state.lastRealTime = Date.now();
    this.emit('resumed');
  }

  /**
   * Get current state
   */
  getState(): TimeControllerState {
    return { ...this.state };
  }

  /**
   * Get current simulation time in minutes
   */
  getSimulationTime(): number {
    return this.state.simulationTimeMinutes;
  }

  /**
   * Get current T-minus hours
   */
  getTMinusHours(): number {
    return simulationTimeToTMinusHours(this.state.simulationTimeMinutes);
  }

  /**
   * Get current timeline window ID
   */
  getCurrentWindowId(): string {
    return getCurrentWindow(this.state.simulationTimeMinutes).id;
  }

  /**
   * Get minutes until next window transition
   */
  getMinutesUntilNextWindow(): number | null {
    return getMinutesUntilNextWindow(this.state.simulationTimeMinutes);
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): TimelinePhase {
    return this.state.currentPhase;
  }

  /**
   * Get current compression ratio
   */
  getCompressionRatio(): number {
    return this.state.compressionRatio;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.state.paused;
  }

  /**
   * Set simulation time directly (for recovery or testing)
   */
  setSimulationTime(minutes: number): void {
    const oldWindowId = this.getCurrentWindowId();
    const oldPhase = this.state.currentPhase;

    this.state.simulationTimeMinutes = minutes;
    this.state.lastRealTime = Date.now();

    this.updatePhaseAndCompression();

    const newWindowId = this.getCurrentWindowId();
    if (oldWindowId !== newWindowId) {
      this.emit('windowTransition', oldWindowId, newWindowId);
    }

    if (oldPhase !== this.state.currentPhase) {
      this.emit('phaseChange', oldPhase, this.state.currentPhase);
    }
  }

  /**
   * Override compression ratio temporarily (for CM control)
   */
  setCompressionOverride(ratio: number | null): void {
    if (ratio === null) {
      // Reset to phase-based compression
      this.updatePhaseAndCompression();
    } else {
      this.state.compressionRatio = ratio;
    }
  }

  /**
   * Format current time for display
   */
  formatCurrentTime(): string {
    const tMinusHours = this.getTMinusHours();
    const hours = Math.floor(Math.abs(tMinusHours));
    const minutes = Math.round((Math.abs(tMinusHours) % 1) * 60);

    if (tMinusHours < 0) {
      return `T-${hours}h ${minutes}m`;
    } else if (tMinusHours === 0) {
      return 'LANDFALL';
    } else {
      return `T+${hours}h ${minutes}m`;
    }
  }

  /**
   * Get estimated real-time duration until simulation end
   */
  getEstimatedRealTimeRemaining(): number {
    // Recovery ends at T+24h, which is simulationTime = (72 + 24) * 60 = 5760 minutes
    const END_SIMULATION_MINUTES = 5760;
    const remainingSimMinutes = END_SIMULATION_MINUTES - this.state.simulationTimeMinutes;

    if (remainingSimMinutes <= 0) return 0;

    // Rough estimate using current compression
    return (remainingSimMinutes / this.state.compressionRatio) * 60 * 1000; // ms
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Main tick function - called every TICK_MS
   */
  private tick(): void {
    if (this.state.paused) {
      this.emit('tick', this.getState());
      return;
    }

    const now = Date.now();
    const realElapsedMs = now - this.state.lastRealTime;
    this.state.lastRealTime = now;

    // Calculate simulation time elapsed
    // compressionRatio:1 means 1 real second = compressionRatio simulation seconds
    const realElapsedSeconds = realElapsedMs / 1000;
    const simElapsedSeconds = realElapsedSeconds * this.state.compressionRatio;
    const simElapsedMinutes = simElapsedSeconds / 60;

    const oldWindowId = this.getCurrentWindowId();
    const oldPhase = this.state.currentPhase;

    // Advance simulation time
    this.state.simulationTimeMinutes += simElapsedMinutes;

    // Update phase and compression based on new time
    this.updatePhaseAndCompression();

    const newWindowId = this.getCurrentWindowId();
    const newPhase = this.state.currentPhase;

    // Emit events for transitions
    if (oldWindowId !== newWindowId) {
      this.emit('windowTransition', oldWindowId, newWindowId);
    }

    if (oldPhase !== newPhase) {
      this.emit('phaseChange', oldPhase, newPhase);
    }

    this.emit('tick', this.getState());
  }

  /**
   * Update phase and compression ratio based on current simulation time
   */
  private updatePhaseAndCompression(): void {
    const currentWindow = getCurrentWindow(this.state.simulationTimeMinutes);
    const newPhase = currentWindow.phase;

    if (newPhase !== this.state.currentPhase) {
      this.state.currentPhase = newPhase;
    }

    // Update compression ratio based on phase
    const phaseCompression = this.config.phaseCompressions[newPhase];
    if (phaseCompression !== undefined) {
      this.state.compressionRatio = phaseCompression;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createTimeController(config?: Partial<TimeControllerConfig>): TimeController {
  return new TimeController(config);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate real-world duration for a given simulation duration at a compression ratio
 */
export function simulationToRealTime(simMinutes: number, compressionRatio: number): number {
  return (simMinutes / compressionRatio) * 60 * 1000; // Returns milliseconds
}

/**
 * Calculate simulation duration for a given real-world duration at a compression ratio
 */
export function realToSimulationTime(realMs: number, compressionRatio: number): number {
  return (realMs / 1000 / 60) * compressionRatio; // Returns minutes
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
