/**
 * Demo Mode Types
 * Types for CM-controlled demo sessions with AI teams
 */

import type { ParishIdLower } from '../constants/concordia.js';

// ============================================================================
// DEMO SESSION CONFIGURATION
// ============================================================================

export type DemoPresetId =
  | 'full-demo'
  | 'crisis-sprint'
  | 'debrief-focus'
  | 'cooperative'
  | 'adversarial';

export interface DemoPreset {
  id: DemoPresetId;
  name: string;
  description: string;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** Starting simulation time (hours from T-72) */
  startTimeHours: number;
  /** Starting hurricane category */
  hurricaneCategory: number;
  /** Starting intensity level (1-10) */
  intensity: number;
  /** AI team cooperation level */
  aiCooperation: AICooperationLevel;
  /** AI drift modifier (-1 to +1) */
  aiDriftModifier: number;
  /** Pre-populated decisions for debrief focus */
  prePopulatedDecisions?: boolean;
  /** Jump directly to phase */
  startPhase?: 'lobby' | 'discovery' | 'briefing' | 'storm' | 'recovery' | 'debrief';
}

export type AICooperationLevel =
  | 'hostile'
  | 'uncooperative'
  | 'neutral'
  | 'cooperative'
  | 'allied';

export interface DemoConfig {
  enabled: boolean;
  soloMode: boolean;
  preset: DemoPresetId | null;
  aiTeamCount: number;
  simulationSpeed: number; // 1, 2, 5, 10
  /** Current checkpoint ID if saved */
  activeCheckpointId: string | null;
}

// ============================================================================
// TIME CONTROL
// ============================================================================

export interface TimeAdvancePayload {
  minutes: number; // 1-60
}

export interface TimeJumpPayload {
  /** Timeline window ID (e.g., 'T-72', 'T-48', etc.) */
  windowId: string;
}

export interface SetSpeedPayload {
  speed: 1 | 2 | 5 | 10;
}

// ============================================================================
// WORLD MANIPULATION
// ============================================================================

export interface SetParishStatePayload {
  parishId: ParishIdLower;
  infrastructure?: {
    power?: number;
    communications?: number;
    roads?: number;
    hospital?: number;
    port?: number;
  };
  morale?: number;
}

export interface SetWeatherPayload {
  category?: number;
  trajectory?: 'direct' | 'glancing' | 'miss-north' | 'miss-south' | 'stall';
  hoursToImpact?: number;
  certaintyPercent?: number;
}

export interface SetResourcesPayload {
  generators?: number;
  medical?: number;
  fuel?: number;
  food?: number;
  water?: number;
  shelter?: number;
}

// ============================================================================
// DECISION & DILEMMA CONTROL
// ============================================================================

export interface TriggerDilemmaPayload {
  dilemmaId: string;
  targetTeamId: string;
}

export interface InjectDecisionPayload {
  teamId: string;
  dilemmaId: string;
  optionId: string;
  rationale: string;
}

// ============================================================================
// NARRATIVE INJECTION
// ============================================================================

export type FeedItemType = 'news' | 'social' | 'emergency' | 'persona';

export interface InjectFeedItemPayload {
  type: FeedItemType;
  source: string;
  content: string;
  breaking?: boolean;
  targetTeams?: string[];
  personaId?: string;
}

// ============================================================================
// CHECKPOINT SYSTEM
// ============================================================================

export interface DemoCheckpoint {
  id: string;
  name: string;
  timestamp: number;
  simulationTime: number;
  phase: string;
  description?: string;
}

export interface SaveCheckpointPayload {
  name?: string;
  description?: string;
}

export interface RestoreCheckpointPayload {
  checkpointId: string;
}

// ============================================================================
// DEMO PRESETS
// ============================================================================

export const DEMO_PRESETS: Record<DemoPresetId, DemoPreset> = {
  'full-demo': {
    id: 'full-demo',
    name: 'Full Demo',
    description: 'Complete simulation experience from storm watch to debrief',
    durationMinutes: 15,
    startTimeHours: 0, // T-72
    hurricaneCategory: 3,
    intensity: 3,
    aiCooperation: 'neutral',
    aiDriftModifier: 0,
    startPhase: 'storm',
  },
  'crisis-sprint': {
    id: 'crisis-sprint',
    name: 'Crisis Sprint',
    description: 'Quick crisis showcase with high intensity',
    durationMinutes: 5,
    startTimeHours: 60, // T-12
    hurricaneCategory: 4,
    intensity: 7,
    aiCooperation: 'neutral',
    aiDriftModifier: 0.2,
    startPhase: 'storm',
  },
  'debrief-focus': {
    id: 'debrief-focus',
    name: 'Debrief Focus',
    description: 'Pre-populated decisions to demonstrate debrief features',
    durationMinutes: 3,
    startTimeHours: 96, // Post-storm
    hurricaneCategory: 4,
    intensity: 5,
    aiCooperation: 'neutral',
    aiDriftModifier: 0,
    prePopulatedDecisions: true,
    startPhase: 'debrief',
  },
  cooperative: {
    id: 'cooperative',
    name: 'Cooperative Mode',
    description: 'AI teams are helpful and supportive',
    durationMinutes: 10,
    startTimeHours: 0,
    hurricaneCategory: 3,
    intensity: 4,
    aiCooperation: 'cooperative',
    aiDriftModifier: -0.2,
    startPhase: 'storm',
  },
  adversarial: {
    id: 'adversarial',
    name: 'Adversarial Mode',
    description: 'AI teams are competitive and self-interested',
    durationMinutes: 10,
    startTimeHours: 0,
    hurricaneCategory: 4,
    intensity: 6,
    aiCooperation: 'uncooperative',
    aiDriftModifier: 0.3,
    startPhase: 'storm',
  },
};
