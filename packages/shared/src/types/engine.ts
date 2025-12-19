/**
 * Engine Types
 * Types for WeatherEngine, TimeController, InfrastructureManager, and ConsequenceTracker
 */

import type { ParishIdLower } from '../constants/concordia.js';
import type { TimelinePhase, TimelineWindow } from './timeline.js';

// ============================================================================
// TIME CONTROLLER TYPES
// ============================================================================

/**
 * Time compression ratios by phase
 * Real seconds : Simulation minutes
 */
export interface TimeCompressionConfig {
  watch: number; // Default: 50:1 (5 sec real = ~4 min sim)
  warning: number; // Default: 30:1
  approach: number; // Default: 15:1 (peak intensity)
  landfall: number; // Default: 15:1
  eye: number; // Default: 20:1
  recovery: number; // Default: 20:1
}

export interface TimeControllerState {
  /** Current compression ratio */
  compressionRatio: number;
  /** Whether time is paused */
  paused: boolean;
  /** Current timeline phase */
  currentPhase: TimelinePhase;
  /** Total simulation time in minutes */
  simulationTimeMinutes: number;
  /** Last real-time timestamp */
  lastRealTime: number;
}

export interface TimeControllerConfig {
  /** Default compression ratio */
  defaultCompression: number;
  /** Per-phase compression ratios */
  phaseCompressions: TimeCompressionConfig;
}

// ============================================================================
// WEATHER ENGINE TYPES
// ============================================================================

export interface WeatherEngineState {
  /** Current timeline window */
  currentWindow: TimelineWindow;
  /** Index in the windows array */
  currentWindowIndex: number;
  /** Simulation time in hours relative to landfall */
  simulationTimeOffset: number;
  /** Whether the engine is running */
  running: boolean;
}

export interface WeatherEngineConfig {
  /** Initial window ID (e.g., 'watch-72') */
  initialWindow: string;
  /** Callback when window transitions */
  onWindowTransition?: (previousWindow: TimelineWindow, nextWindow: TimelineWindow) => void;
  /** Callback when phase changes */
  onPhaseChange?: (previousPhase: TimelinePhase, nextPhase: TimelinePhase) => void;
}

export interface WeatherTransition {
  /** Previous window */
  from: TimelineWindow;
  /** New window */
  to: TimelineWindow;
  /** Transition timestamp (simulation time) */
  timestamp: number;
}

// ============================================================================
// INFRASTRUCTURE MANAGER TYPES
// ============================================================================

export type InfrastructureSystem = 'power' | 'communications' | 'roads' | 'water' | 'hospital' | 'port' | 'airport';

export interface InfrastructureStatus {
  system: InfrastructureSystem;
  parishId: ParishIdLower;
  /** Status level: 100 = fully operational, 0 = completely failed */
  statusLevel: number;
  /** Whether the system is currently operational (above threshold) */
  operational: boolean;
  /** Reason for current status */
  statusReason?: string;
  /** When status last changed */
  lastChanged: number;
}

export interface InfrastructureCascadeRule {
  /** Unique identifier for this rule */
  id: string;
  /** Trigger condition */
  trigger: {
    /** System that triggers the cascade */
    system: InfrastructureSystem;
    /** Parish where trigger occurs */
    parishId: ParishIdLower;
    /** Threshold below which cascade triggers (0-100) */
    threshold: number;
  };
  /** Effects when triggered */
  effects: {
    /** System affected */
    system: InfrastructureSystem;
    /** Parish affected */
    parishId: ParishIdLower;
    /** Degradation amount (0-100, subtracted from status) */
    degradation: number;
    /** Delay in simulation minutes before effect applies */
    delayMinutes: number;
  }[];
  /** Narrative description of the cascade */
  narrative: string;
}

export interface CascadeEvent {
  /** Rule that triggered */
  ruleId: string;
  /** When the cascade was triggered */
  triggeredAt: number;
  /** Effects being applied */
  effects: {
    system: InfrastructureSystem;
    parishId: ParishIdLower;
    degradation: number;
    appliedAt: number;
  }[];
  /** Narrative description */
  narrative: string;
}

export interface InfrastructureManagerState {
  /** Current status of all systems */
  statuses: Map<string, InfrastructureStatus>;
  /** Active cascade events */
  activeCascades: CascadeEvent[];
  /** Pending effects waiting to apply */
  pendingEffects: {
    effect: CascadeEvent['effects'][0];
    applyAt: number;
    ruleId: string;
  }[];
}

// ============================================================================
// CONSEQUENCE TRACKER TYPES
// ============================================================================

export type ConsequenceType = 'immediate' | 'ripple' | 'delayed' | 'hidden';

export interface TrackedConsequence {
  /** Unique identifier */
  id: string;
  /** Decision that caused this consequence */
  sourceDecisionId: string;
  /** Type of consequence */
  type: ConsequenceType;
  /** Description of the consequence */
  description: string;
  /** Scheduled simulation time to reveal (for delayed/ripple) */
  scheduledTime: number;
  /** When actually revealed to players (null if not yet) */
  revealedTime: number | null;
  /** New dilemma ID this consequence triggers */
  triggeredDilemma?: string;
  /** Dilemma ID this consequence prevents */
  blockedDilemma?: string;
  /** Parish affected */
  parishId?: ParishIdLower;
  /** Category of effect */
  category: 'resources' | 'population' | 'infrastructure' | 'morale' | 'political' | 'narrative';
  /** Magnitude of effect (-5 to +5) */
  magnitude: number;
}

export interface ConsequenceChain {
  /** The originating decision */
  sourceDecisionId: string;
  /** The choice made */
  sourceChoice: string;
  /** First-order consequences */
  directConsequences: TrackedConsequence[];
  /** Dilemmas this decision enables */
  enablesDilemmas: {
    dilemmaId: string;
    reason: string;
  }[];
  /** Dilemmas this decision blocks */
  blocksDilemmas: {
    dilemmaId: string;
    reason: string;
  }[];
  /** World state changes */
  stateChanges: {
    parish?: ParishIdLower;
    property: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface ConsequenceTrackerState {
  /** Pending consequences not yet revealed */
  pending: TrackedConsequence[];
  /** Consequences that have been revealed */
  revealed: TrackedConsequence[];
  /** Hidden consequences (only shown in debrief) */
  hidden: TrackedConsequence[];
  /** Full consequence chains by decision */
  chains: Map<string, ConsequenceChain>;
}

// ============================================================================
// WORLD STATE MANAGER TYPES
// ============================================================================

export interface WorldState {
  /** Current simulation time offset from landfall (hours) */
  timeOffset: number;
  /** Current timeline phase */
  phase: TimelinePhase;
  /** Current intensity level (1-10) */
  intensityLevel: number;
  /** Current weather conditions */
  weather: {
    windMph: number;
    rainfallInchesPerHour: number;
    stormSurgeFeet: number;
    visibility: 'clear' | 'reduced' | 'poor' | 'zero';
  };
  /** Infrastructure status by parish */
  infrastructure: Map<ParishIdLower, Map<InfrastructureSystem, InfrastructureStatus>>;
  /** Parish accessibility (can resources/people move there?) */
  parishAccess: Map<ParishIdLower, boolean>;
  /** Active events */
  activeEvents: string[];
  /** Revealed information */
  revealedInformation: string[];
  /** Hidden information (CM can reveal) */
  hiddenInformation: string[];
}

// ============================================================================
// ENGINE EVENT TYPES
// ============================================================================

export type EngineEventType =
  | 'window_transition'
  | 'phase_change'
  | 'infrastructure_failure'
  | 'cascade_triggered'
  | 'consequence_revealed'
  | 'time_paused'
  | 'time_resumed'
  | 'intensity_changed';

export interface EngineEvent {
  type: EngineEventType;
  timestamp: number;
  simulationTime: number;
  data: Record<string, unknown>;
}
