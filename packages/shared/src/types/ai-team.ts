/**
 * AI-Controlled Team Types
 * Types for AI teams that fill empty parishes in demo mode
 */

import type { ParishIdLower } from '../constants/concordia.js';
import type { AICooperationLevel } from './demo.js';

// ============================================================================
// AI TEAM PROFILE
// ============================================================================

export type AIArchetypeId =
  | 'by-the-book'
  | 'cowboy'
  | 'union-strong'
  | 'bottom-line'
  | 'caretaker';

export interface AIPersonality {
  /** 0-1: cautious to aggressive */
  riskTolerance: number;
  /** 0-1: deliberate to snap decisions */
  decisionSpeed: number;
  /** 0-1: self-interested to collaborative */
  cooperativeness: number;
  /** 0-1: guarded to open-book */
  transparencyBias: number;
  /** 0-1: independent to follows Summit */
  authorityDeference: number;
}

export type RationalizationTrigger =
  | 'production_pressure'
  | 'time_pressure'
  | 'authority_pressure'
  | 'peer_pressure'
  | 'resource_scarcity'
  | 'safety_threat'
  | 'impossible_choice';

export interface RationalizationPattern {
  trigger: RationalizationTrigger;
  vulnerableValue: string;
  narrative: string;
}

export interface DriftProfile {
  /** 0-1: how well they follow values at low intensity */
  baselineAlignment: number;
  /** Intensity level (1-10) where drift begins */
  driftThreshold: number;
  /** How fast alignment degrades per intensity level */
  driftRate: number;
  /** How fast they return to values when pressure drops */
  recoveryRate: number;
  /** Which values they abandon first under pressure */
  vulnerableValues: string[];
  /** Rationalization patterns for drift */
  rationalizationPatterns: RationalizationPattern[];
}

export interface AITeamValue {
  value: string;
  definition: string;
  rank: number; // 1-5, 1 being highest priority
}

export interface AITeamProfile {
  parishId: ParishIdLower;
  archetypeId: AIArchetypeId;
  teamName: string;
  teamValues: AITeamValue[];
  commitmentStatement: string;
  personality: AIPersonality;
  driftProfile: DriftProfile;
}

// ============================================================================
// AI TEAM STATE (Runtime)
// ============================================================================

export interface AITeamState {
  parishId: ParishIdLower;
  active: boolean;
  archetypeId: AIArchetypeId;
  /** Current values alignment (0-1) */
  currentAlignment: number;
  /** Current drift amount (0-1) */
  currentDrift: number;
  cooperationLevel: AICooperationLevel;
  /** Number of decisions made */
  decisionCount: number;
  /** Last decision timestamp */
  lastDecisionAt: number | null;
}

// ============================================================================
// AI DECISION MAKING
// ============================================================================

export interface AIDecisionResult {
  optionId: string;
  rationale: string;
  /** Delay in ms before decision is announced */
  delayMs: number;
  /** New drift level after decision */
  newDrift: number;
  /** Rationalization used (if drifting) */
  rationalizationUsed?: string;
}

export interface AIDecisionContext {
  dilemmaId: string;
  currentIntensity: number;
  simulationPhase: 'watch' | 'crisis' | 'recovery';
  decisionHistory: string[]; // Previous option IDs chosen
  worldState: {
    hoursToImpact: number;
    hurricaneCategory: number;
  };
}

// ============================================================================
// INTER-PARISH COMMUNICATION
// ============================================================================

export type InterParishRequestType =
  | 'resource'
  | 'coordination'
  | 'warning'
  | 'demand'
  | 'offer';

export interface InterParishRequest {
  id: string;
  fromParish: ParishIdLower;
  toParish: ParishIdLower;
  type: InterParishRequestType;
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export type InterParishResponseType = 'accept' | 'conditional' | 'decline';

export interface InterParishResponse {
  requestId: string;
  type: InterParishResponseType;
  message: string;
  condition?: string;
}

// ============================================================================
// CM CONTROLS
// ============================================================================

export interface SetAIArchetypePayload {
  parishId: ParishIdLower;
  archetypeId: AIArchetypeId;
}

export interface AdjustAIDriftPayload {
  parishId: ParishIdLower;
  /** -1 to +1, added to current drift */
  driftModifier: number;
}

export interface SetAICooperationPayload {
  parishId: ParishIdLower;
  toward: ParishIdLower | 'all';
  level: AICooperationLevel;
}

export interface ForceAIDecisionPayload {
  parishId: ParishIdLower;
  dilemmaId: string;
  optionId: string;
  rationale?: string;
}

export type AIBehaviorInjection =
  | 'withhold_information'
  | 'share_freely'
  | 'make_demand'
  | 'offer_help';

export interface InjectAIBehaviorPayload {
  parishId: ParishIdLower;
  behavior: AIBehaviorInjection;
  targetParish?: ParishIdLower;
  details?: string;
}

export interface SetAllAIPressurePayload {
  /** -1 to +1, applied to all AI teams */
  driftModifier: number;
}

// ============================================================================
// ARCHETYPES
// ============================================================================

export interface AIArchetype {
  id: AIArchetypeId;
  name: string;
  description: string;
  personality: AIPersonality;
  driftProfile: Omit<DriftProfile, 'rationalizationPatterns'>;
}

export const AI_ARCHETYPES: Record<AIArchetypeId, AIArchetype> = {
  'by-the-book': {
    id: 'by-the-book',
    name: 'By The Book',
    description: 'Follows protocols, defers to authority. Holds values longer but breaks hard.',
    personality: {
      riskTolerance: 0.3,
      decisionSpeed: 0.4,
      cooperativeness: 0.6,
      transparencyBias: 0.7,
      authorityDeference: 0.8,
    },
    driftProfile: {
      baselineAlignment: 0.9,
      driftThreshold: 7,
      driftRate: 0.15,
      recoveryRate: 0.3,
      vulnerableValues: ['Innovation', 'Speed'],
    },
  },
  cowboy: {
    id: 'cowboy',
    name: 'Cowboy',
    description: 'Acts fast, takes risks, independent. Drifts early but recovers quickly.',
    personality: {
      riskTolerance: 0.8,
      decisionSpeed: 0.9,
      cooperativeness: 0.4,
      transparencyBias: 0.3,
      authorityDeference: 0.2,
    },
    driftProfile: {
      baselineAlignment: 0.7,
      driftThreshold: 4,
      driftRate: 0.1,
      recoveryRate: 0.5,
      vulnerableValues: ['Safety', 'Collaboration'],
    },
  },
  'union-strong': {
    id: 'union-strong',
    name: 'Union Strong',
    description: 'Protects workers, skeptical of management. Slow to drift, slow to recover trust.',
    personality: {
      riskTolerance: 0.4,
      decisionSpeed: 0.5,
      cooperativeness: 0.7,
      transparencyBias: 0.5,
      authorityDeference: 0.2,
    },
    driftProfile: {
      baselineAlignment: 0.85,
      driftThreshold: 6,
      driftRate: 0.2,
      recoveryRate: 0.2,
      vulnerableValues: ['Efficiency', 'Obedience'],
    },
  },
  'bottom-line': {
    id: 'bottom-line',
    name: 'Bottom Line',
    description: 'Production-focused, metric-driven. Sacrifices soft values for hard outcomes.',
    personality: {
      riskTolerance: 0.6,
      decisionSpeed: 0.7,
      cooperativeness: 0.5,
      transparencyBias: 0.4,
      authorityDeference: 0.6,
    },
    driftProfile: {
      baselineAlignment: 0.75,
      driftThreshold: 5,
      driftRate: 0.2,
      recoveryRate: 0.4,
      vulnerableValues: ['Safety', 'Fairness', 'Transparency'],
    },
  },
  caretaker: {
    id: 'caretaker',
    name: 'Caretaker',
    description: 'People-first, collaborative. Holds values too long, deep guilt when drifting.',
    personality: {
      riskTolerance: 0.2,
      decisionSpeed: 0.3,
      cooperativeness: 0.9,
      transparencyBias: 0.8,
      authorityDeference: 0.4,
    },
    driftProfile: {
      baselineAlignment: 0.95,
      driftThreshold: 8,
      driftRate: 0.25,
      recoveryRate: 0.1,
      vulnerableValues: ['Efficiency', 'Speed'],
    },
  },
};

// ============================================================================
// PARISH DEFAULT CONFIGURATIONS
// ============================================================================

export interface ParishAIConfig {
  defaultArchetype: AIArchetypeId;
  personalityModifiers: Partial<AIPersonality>;
  vulnerableValues: string[];
  rationalizationPatterns: RationalizationPattern[];
  defaultValues: string[];
}

export const PARISH_AI_DEFAULTS: Record<ParishIdLower, ParishAIConfig> = {
  gateway: {
    defaultArchetype: 'cowboy',
    personalityModifiers: {
      riskTolerance: 0.15, // +0.15
      authorityDeference: -0.2,
    },
    vulnerableValues: ['Safety', 'Patience'],
    rationalizationPatterns: [
      {
        trigger: 'time_pressure',
        vulnerableValue: 'Safety',
        narrative: "We've run in worse conditions. The boats can handle it.",
      },
      {
        trigger: 'production_pressure',
        vulnerableValue: 'Prudence',
        narrative: "One more run won't make the difference. Or it will.",
      },
    ],
    defaultValues: ['Speed', 'Production', 'Independence', 'Risk-Taking', 'Loyalty'],
  },
  haven: {
    defaultArchetype: 'union-strong',
    personalityModifiers: {
      cooperativeness: 0.1,
      transparencyBias: -0.1,
    },
    vulnerableValues: ['Obedience', 'Efficiency'],
    rationalizationPatterns: [
      {
        trigger: 'authority_pressure',
        vulnerableValue: 'Cooperation',
        narrative: "They don't understand what they're asking. We'll do what's actually possible.",
      },
      {
        trigger: 'safety_threat',
        vulnerableValue: 'Production',
        narrative: "No shipment is worth someone's life. The contract can wait.",
      },
    ],
    defaultValues: ['Safety', 'Solidarity', 'Dignity', 'Fair Treatment', 'Job Security'],
  },
  keystone: {
    defaultArchetype: 'by-the-book',
    personalityModifiers: {
      riskTolerance: -0.2,
      decisionSpeed: -0.1,
    },
    vulnerableValues: ['Speed', 'Flexibility'],
    rationalizationPatterns: [
      {
        trigger: 'production_pressure',
        vulnerableValue: 'Safety',
        narrative: 'The protocols exist for a reason, but this is an exceptional situation.',
      },
      {
        trigger: 'authority_pressure',
        vulnerableValue: 'Integrity',
        narrative: "Leadership has information we don't. We have to trust the process.",
      },
    ],
    defaultValues: ['Quality', 'Precision', 'Protocol', 'Safety', 'Excellence'],
  },
  heartland: {
    defaultArchetype: 'caretaker',
    personalityModifiers: {
      transparencyBias: 0.2,
      authorityDeference: -0.1,
    },
    vulnerableValues: ['Popularity', 'Harmony'],
    rationalizationPatterns: [
      {
        trigger: 'impossible_choice',
        vulnerableValue: 'Fairness',
        narrative: "Physics doesn't negotiate. Someone has to lose. It's not a choice—it's math.",
      },
      {
        trigger: 'time_pressure',
        vulnerableValue: 'Consultation',
        narrative: "There's no time to explain. They'll understand when they see the data.",
      },
    ],
    defaultValues: ['Reliability', 'Expertise', 'System Integrity', 'Community', 'Responsibility'],
  },
  summit: {
    defaultArchetype: 'bottom-line',
    personalityModifiers: {
      authorityDeference: 0.3,
      transparencyBias: -0.2,
    },
    vulnerableValues: ['Transparency', 'Humility', 'Fairness'],
    rationalizationPatterns: [
      {
        trigger: 'production_pressure',
        vulnerableValue: 'Safety',
        narrative: 'We have a responsibility to 340,000 patients. That has to factor in.',
      },
      {
        trigger: 'authority_pressure',
        vulnerableValue: 'Honesty',
        narrative: 'We need to control the narrative. The full truth would be misunderstood.',
      },
    ],
    defaultValues: ['Results', 'Leadership', 'Shareholder Value', 'Reputation', 'Control'],
  },
  sterling: {
    defaultArchetype: 'caretaker',
    personalityModifiers: {
      cooperativeness: 0.2,
      authorityDeference: -0.3,
    },
    vulnerableValues: ['Efficiency', 'Corporate Loyalty'],
    rationalizationPatterns: [
      {
        trigger: 'resource_scarcity',
        vulnerableValue: 'Fairness',
        narrative: 'Our people—the community—have to come first. Meridian can take care of its own.',
      },
      {
        trigger: 'authority_pressure',
        vulnerableValue: 'Cooperation',
        narrative: 'I answer to this community, not to corporate headquarters.',
      },
    ],
    defaultValues: ['Community', 'Compassion', 'Equity', 'Service', 'Care'],
  },
};

// ============================================================================
// GUARDRAILS
// ============================================================================

export const AI_GUARDRAILS = {
  neverChoose: [
    'options_that_make_simulation_impossible',
    'options_that_kill_all_personas',
    'physically_contradictory_choices',
  ],
  neverSay: [
    'reference_to_being_AI',
    'meta_commentary_on_simulation',
    'out_of_character_knowledge',
  ],
  neverBehave: [
    'perfectly_optimal_play',
    'completely_random_play',
    'identical_to_other_AI_teams',
  ],
} as const;

export const DRIFT_BOUNDS = {
  /** Never completely abandon all values */
  minimumAlignment: 0.15,
  /** Can't swing wildly between decisions */
  maximumDriftPerDecision: 0.15,
  /** Gradual return when pressure drops */
  recoveryPerLowIntensity: 0.1,
  /** Some values have floors even when drifting */
  valueFloors: {
    Safety: 0.3,
    Honesty: 0.2,
  },
} as const;

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

export const AI_TIMING = {
  decision: {
    watch: { minSeconds: 30, maxSeconds: 90 },
    crisis: { minSeconds: 15, maxSeconds: 45 },
    recovery: { minSeconds: 20, maxSeconds: 60 },
  },
  communication: {
    responseMinSeconds: 5,
    responseMaxSeconds: 30,
  },
  /** Stagger multiple AI decisions by this many seconds */
  staggerSeconds: { min: 10, max: 20 },
} as const;
