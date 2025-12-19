/**
 * AI Types
 * Types for AI-powered dilemma generation, values scoring, and pre-crisis data capture
 */

import type { ParishIdLower } from '../constants/concordia.js';
import type { PersonaId } from './persona.js';
import type { TimelineWindow, TimelinePhase } from './timeline.js';
import type { DilemmaOption, DilemmaPhase, DilemmaWeight, DilemmaTrigger } from './dilemma.js';
import type { ValuesAlignmentScore, ABCDAnalysis } from './values.js';

// ============================================================================
// PRE-CRISIS DATA CAPTURE TYPES
// ============================================================================

/**
 * Individual value meaning captured during pre-crisis
 */
export interface ValueMeaning {
  /** The value being defined */
  value: string;
  /** What this value means to the participant (not dictionary definition) */
  personalDefinition: string;
  /** Behaviors that show they're living this value */
  livingBehaviors: string[];
  /** What it feels like when this value is honored */
  honoredFeeling: string;
  /** What it feels like when this value is violated */
  violatedFeeling: string;
}

/**
 * Values Quick Sort results
 */
export interface QuickSortResult {
  /** Final top 5 values, ranked (index 0 = highest) */
  topFive: string[];
  /** Time spent on each round (milliseconds) */
  roundTimings: [number, number, number];
  /** All values that made it to "Essential" pile in round 1 */
  cardsConsidered: string[];
  /** Total sort time */
  totalTime: number;
}

/**
 * Values Story captured during pre-crisis
 */
export interface ValuesStory {
  /** The story text */
  storyText: string;
  /** Values the participant identified in their own story */
  selfIdentifiedValues: string[];
  /** Values identified by peers during triad witnessing */
  peerIdentifiedValues: string[];
  /** Flag if peer-identified values differ significantly from self-identified */
  alignmentFlag: boolean;
  /** Brief summary for reference */
  summary?: string;
}

/**
 * Individual participant's complete pre-crisis profile
 */
export interface ParticipantPreCrisisProfile {
  /** Participant ID */
  participantId: string;
  /** Participant name */
  participantName: string;
  /** Quick sort results */
  quickSort: QuickSortResult;
  /** Detailed meanings for top 3 values */
  valueMeanings: ValueMeaning[];
  /** Values story */
  valuesStory: ValuesStory;
  /** When this profile was completed */
  completedAt: number;
}

/**
 * Individual values profile for UI submission (simpler than ParticipantPreCrisisProfile)
 */
export interface IndividualValuesProfile {
  /** Participant ID */
  participantId: string;
  /** Top 5 values, ranked */
  topFive: string[];
  /** Value meanings (simplified format for UI) */
  valueMeanings: Record<string, {
    definition: string;
    livingIt: string[];
    violatingIt: string[];
  }>;
  /** Values story text */
  valuesStory?: string;
  /** Self-identified values from story */
  selfIdentifiedValues: string[];
  /** Peer-identified values from triad */
  peerIdentifiedValues: string[];
  /** Submission timestamp */
  submittedAt: number;
}

// ============================================================================
// TEAM VALUES PROFILE TYPES
// ============================================================================

/**
 * Team value definition with behavioral anchors
 */
export interface TeamValueDefinition {
  /** The value */
  value: string;
  /** What this value means to the team */
  teamDefinition: string;
  /** Behaviors that show the team is living this value */
  livingIt: string[];
  /** Behaviors that show the team is NOT living this value */
  violatingIt: string[];
}

/**
 * Team decision process agreement
 */
export type DecisionProcess = 'consensus' | 'consultative' | 'majority' | 'leader' | 'valuesCheck';

export interface DecisionProcessAgreement {
  /** Selected process */
  process: DecisionProcess;
  /** Description of how they'll use it */
  description: string;
  /** When to use values check (always included as overlay) */
  valuesCheckTrigger: string;
}

/**
 * Complete team commitment with signatures
 */
export interface TeamCommitment {
  /** Team ID */
  teamId: string;
  /** Team's 5 values with definitions */
  values: TeamValueDefinition[];
  /** The commitment statement text */
  commitmentText: string;
  /** Decision process agreement */
  decisionProcess: DecisionProcessAgreement;
  /** Digital signatures (participant IDs) */
  signatures: string[];
  /** Timestamp when read aloud */
  readAloudAt: number | null;
  /** Created timestamp */
  createdAt: number;
}

/**
 * Complete team values profile for AI consumption
 */
export interface TeamValuesProfile {
  /** Team ID */
  teamId: string;
  /** Parish assigned */
  parishId: ParishIdLower;
  /** Individual participant profiles */
  participantProfiles: ParticipantPreCrisisProfile[];
  /** Team values (ranked, index 0 = highest priority) */
  statedValues: string[];
  /** Full team value definitions */
  valueDefinitions: TeamValueDefinition[];
  /** Team commitment statement */
  commitmentStatement: string;
  /** Decision process */
  decisionProcess: DecisionProcess;
  /** Organizational values (if Phase 3 was used) */
  orgValues?: {
    values: string[];
    alignmentRatings: Map<string, number>;
    extensionCommitment?: string;
  };
}

// ============================================================================
// DILEMMA GENERATION TYPES
// ============================================================================

/**
 * Context provided to AI for dilemma generation
 */
export interface DilemmaGenerationContext {
  /** Team's values profile */
  teamProfile: {
    statedValues: string[];
    valueDefinitions: TeamValueDefinition[];
    commitmentStatement: string;
    decisionProcess: DecisionProcess;
  };
  /** Current world state */
  worldState: {
    currentWindow: TimelineWindow;
    currentPhase: TimelinePhase;
    parishStatuses: Map<ParishIdLower, DilemmaParishStatus>;
    activeConditions: string[];
    intensityLevel: number;
  };
  /** Decision history */
  decisionHistory: {
    decisions: DecisionHistoryEntry[];
    consequencesTriggered: string[];
    cumulativeAlignmentByValue: Map<string, number>;
  };
  /** Generation parameters */
  parameters: {
    targetIntensity: number;
    parishFocus?: ParishIdLower;
    personaRequired?: PersonaId;
    buildOnDecisionId?: string;
    avoidDilemmaTypes?: string[];
  };
}

/**
 * Simplified parish status for dilemma generation context
 */
export interface DilemmaParishStatus {
  parishId: ParishIdLower;
  population: number;
  resources: {
    food: number;
    medical: number;
    fuel: number;
    shelter: number;
  };
  infrastructure: {
    power: number;
    communications: number;
    roads: number;
    port: number;
  };
  morale: number;
  activeEvents: string[];
}

/**
 * Decision history entry for generation context
 */
export interface DecisionHistoryEntry {
  decisionId: string;
  dilemmaId: string;
  choice: string;
  rationale: string;
  timestamp: number;
  phase: DilemmaPhase;
  valuesAtStake: string[];
  consequences: string[];
}

/**
 * AI-generated dilemma with commitment relevance
 */
export interface GeneratedDilemma {
  /** Unique identifier (generated) */
  id: string;
  /** Title (5 words max) */
  title: string;
  /** Which phase this dilemma belongs to */
  phase: DilemmaPhase;
  /** Primary parish */
  parishId: ParishIdLower | 'multi';
  /** Situation setup using team's commitment language */
  setup: string;
  /** Conditions for presenting */
  trigger: DilemmaTrigger;
  /** Available choices (3-4 options) */
  options: GeneratedDilemmaOption[];
  /** Which team values are tested */
  valuesTested: string[];
  /** Persona voicing this dilemma */
  personaId: PersonaId | PersonaId[];
  /** Narrative importance */
  narrativeWeight: DilemmaWeight;
  /** How this tests their commitment (key for debrief) */
  commitmentRelevance: string;
  /** If building on a previous decision, reference it */
  buildsOnDecision?: {
    decisionId: string;
    connection: string;
  };
  /** Generation metadata */
  generationMeta: {
    generatedAt: number;
    contextWindow: string;
    intensityTarget: number;
    modelUsed: string;
  };
}

/**
 * Generated dilemma option with validation info
 */
export interface GeneratedDilemmaOption extends DilemmaOption {
  /** Validation scores from generation */
  validationScores?: {
    /** No option scores +3 on all values */
    noClearWinner: boolean;
    /** At least some cost to this option */
    hasCost: boolean;
    /** Persona voice is authentic */
    voiceAuthentic: boolean;
  };
}

/**
 * Dilemma validation result
 */
export interface DilemmaValidationResult {
  /** Is the dilemma valid for use? */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Scores */
  scores: {
    /** 3-4 options requirement */
    optionCount: boolean;
    /** No "right answer" (no option scores +3 on all values) */
    noRightAnswer: boolean;
    /** At least one option honors commitment */
    hasCommitmentHonorPath: boolean;
    /** At least one option violates commitment */
    hasCommitmentViolatePath: boolean;
    /** Persona voice is within fences */
    personaVoiceValid: boolean;
    /** Commitment relevance is clear */
    commitmentRelevanceClear: boolean;
  };
}

// ============================================================================
// VALUES SCORING TYPES
// ============================================================================

/**
 * Real-time values score (hidden during crisis)
 */
export interface ValuesScoreRecord {
  /** Unique identifier */
  id: string;
  /** Decision this scores */
  decisionId: string;
  /** Team ID */
  teamId: string;
  /** Simulation time when decision was made */
  simulationTime: number;
  /** Phase when decision was made */
  phase: DilemmaPhase;
  /** Per-value alignment scores */
  scores: {
    value: string;
    alignment: ValuesAlignmentScore;
    evidence: string;
    confidence: number;
    /** Team's definition of this value for context */
    teamDefinition?: string;
    /** Quote from team's rationale */
    rationaleQuote?: string;
  }[];
  /** ABCD coding */
  abcd: ABCDAnalysis;
  /** Is this a notable moment? */
  isNotable: boolean;
  /** Reason for notable flag */
  notableReason?: string;
  /** Category of notable moment */
  notableCategory?: 'gap' | 'consistency' | 'conflict' | 'growth';
  /** How decision relates to commitment */
  commitmentAlignment: 'aligned' | 'tension' | 'violation';
  /** Quote comparing commitment to action */
  commitmentComparisonQuote?: string;
  /** Whether CM triggered a values check before this */
  valuesCheckTriggered: boolean;
  /** Scoring metadata */
  meta: {
    scoredAt: number;
    modelUsed: string;
    confidence: number;
  };
}

/**
 * Aggregate values alignment over time
 */
export interface ValuesAlignmentTimeSeries {
  /** Team ID */
  teamId: string;
  /** Data points over time */
  dataPoints: {
    simulationTime: number;
    phase: DilemmaPhase;
    decisionId: string;
    byValue: Map<string, ValuesAlignmentScore>;
    averageAlignment: number;
    intensityLevel: number;
  }[];
}

// ============================================================================
// CM INTERVENTION TYPES
// ============================================================================

export type CMInterventionLevel = 'flash' | 'moment' | 'mirror';

export interface CMIntervention {
  /** Intervention ID */
  id: string;
  /** Type of intervention */
  level: CMInterventionLevel;
  /** When triggered */
  triggeredAt: number;
  /** Simulation time */
  simulationTime: number;
  /** Team targeted */
  teamId: string;
  /** Reason for intervention */
  reason?: string;
  /** Duration in seconds */
  duration: number;
  /** Content shown (for moment/mirror) */
  content?: string;
}

// ============================================================================
// INFORMATION FOG TYPES
// ============================================================================

export type MetricAccuracyType = 'accurate' | 'delayed' | 'gamed' | 'wrong';

export interface FoggedMetric {
  /** Metric identifier */
  metricId: string;
  /** Displayed value */
  displayedValue: string | number;
  /** Actual value (for debrief) */
  actualValue: string | number;
  /** Type of inaccuracy */
  accuracyType: MetricAccuracyType;
  /** Source persona (who reported this) */
  sourcePersona?: PersonaId;
  /** How teams can discover the truth */
  revealTrigger?: string;
  /** When the truth surfaces (if delayed) */
  revealsAt?: number;
}

export interface InformationFogState {
  /** Active fogged metrics */
  activeMetrics: Map<string, FoggedMetric>;
  /** Revealed truths */
  revealedTruths: {
    metricId: string;
    revealedAt: number;
    howRevealed: string;
  }[];
}

// ============================================================================
// PERSONA VOICE TYPES
// ============================================================================

// PersonaFence is defined in persona.ts - use that definition

export interface PersonaVoiceValidation {
  /** Is the content valid for this persona? */
  valid: boolean;
  /** Violations found */
  violations: {
    type: 'vocabulary' | 'knowledge' | 'neverSays' | 'tone';
    detail: string;
  }[];
}
