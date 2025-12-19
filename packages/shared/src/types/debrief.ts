/**
 * Debrief Types
 * Types for gap analysis, pattern detection, and evidence generation
 */

import type { ParishIdLower } from '../constants/concordia.js';
import type { ValuesAlignmentScore } from './values.js';

// Re-export for convenience
export type { ValuesAlignmentScore };

// ============================================================================
// VALUES ALIGNMENT TYPES
// ============================================================================

export interface ValueScore {
  /** The value being scored */
  value: string;
  /** Alignment score (-3 betrayal to +3 exemplary) */
  alignment: ValuesAlignmentScore;
  /** Evidence supporting the score */
  evidence: string;
  /** Confidence in the score (0-100) */
  confidence: number;
  /** Team's definition of this value */
  teamDefinition?: string;
  /** Quote from team's rationale */
  rationaleQuote?: string;
}

export interface AlignmentDataPoint {
  /** Simulation time (hours from landfall) */
  simulationTime: number;
  /** Timeline phase */
  phase: string;
  /** Per-value scores */
  scores: ValueScore[];
  /** Decision ID this relates to */
  decisionId: string;
}

// ============================================================================
// GAP ANALYSIS TYPES
// ============================================================================

export interface ValueGap {
  /** The value analyzed */
  value: string;
  /** Position in team's stated ranking (1 = top priority) */
  statedPriority: number;
  /** Average alignment score across all decisions */
  averageAlignment: number;
  /** Average alignment by phase */
  alignmentByPhase: {
    watch: number | null;
    crisis: number | null;
    recovery: number | null;
  };
  /** Gap magnitude (how far enacted from stated) */
  gapMagnitude: number;
  /** Key evidence moments */
  keyMoments: GapEvidence[];
  /** Trajectory over time */
  trajectory: 'stable' | 'improved' | 'eroded' | 'volatile';
}

export interface GapEvidence {
  /** Decision ID */
  decisionId: string;
  /** When this happened (simulation time) */
  simulationTime: number;
  /** Phase when it occurred */
  phase: string;
  /** Description of what happened */
  description: string;
  /** Quote: "You said X. Then you decided Y." */
  quote: string;
  /** Reference to commitment statement if relevant */
  commitmentReference?: string;
  /** Alignment score at this moment */
  alignmentScore: ValuesAlignmentScore;
}

export interface CommitmentViolation {
  /** The commitment text that was violated */
  commitmentText: string;
  /** Decision ID where violation occurred */
  decisionId: string;
  /** What the team actually did */
  action: string;
  /** How severe the violation was */
  severity: 'minor' | 'moderate' | 'significant';
  /** Simulation time */
  simulationTime: number;
}

export interface GapReport {
  /** Team ID */
  teamId: string;
  /** When the report was generated */
  generatedAt: number;

  /** Overall summary */
  summary: {
    /** Overall gap score (0-100, lower = better alignment) */
    overallGapScore: number;
    /** Value with biggest gap */
    biggestGap: {
      value: string;
      avgAlignment: number;
      keyEvidence: string;
    };
    /** Value with best alignment */
    mostConsistent: {
      value: string;
      avgAlignment: number;
      keyEvidence: string;
    };
    /** Description of drift pattern */
    driftPattern: string;
  };

  /** Per-value analysis */
  valueAnalysis: ValueGap[];

  /** Commitment comparison */
  commitmentAnalysis: {
    /** Original commitment statement */
    originalStatement: string;
    /** Moments where commitment was tested */
    testedMoments: {
      quote: string;
      decisionId: string;
      outcome: 'honored' | 'tested' | 'violated';
    }[];
    /** Summary of commitment adherence */
    comparisonSummary: string;
  };

  /** Notable moments for debrief */
  notableMoments: {
    decisionId: string;
    simulationTime: number;
    description: string;
    category: 'gap' | 'consistency' | 'conflict' | 'growth';
    significance: 'low' | 'medium' | 'high';
  }[];
}

// ============================================================================
// RATIONALIZATION CASCADE TYPES
// ============================================================================

export type RationalizationStage =
  | 'denial' // "The threat probably won't materialize"
  | 'noble_cause' // "Our people need the income / want to help"
  | 'greater_good' // "We're serving something bigger"
  | 'responsibility_shift' // "Someone else should handle that"
  | 'stakeholder_pressure' // "We have obligations to stakeholders"
  | 'future_remedy'; // "We'll make it right afterward"

export interface RationalizationInstance {
  /** Which stage this represents */
  stage: RationalizationStage;
  /** Decision where this occurred */
  decisionId: string;
  /** Simulation time */
  simulationTime: number;
  /** Quote from team's rationale */
  quote: string;
  /** Confidence this matches the stage */
  confidence: number;
}

export interface RationalizationCascade {
  /** Whether a cascade pattern was detected */
  detected: boolean;
  /** Stages that were detected */
  stages: {
    stage: RationalizationStage;
    stageName: string;
    stageDescription: string;
    detected: boolean;
    instances: RationalizationInstance[];
  }[];
  /** Overall narrative of the drift */
  narrative: string;
  /** Confidence in the pattern detection */
  patternConfidence: number;
}

// ============================================================================
// THREE-LAYER ANALYSIS TYPES (Personal, Team, Organizational)
// ============================================================================

export interface ThreeLayerAnalysis {
  /** Personal values gap (individual participants) */
  personalLayer: {
    participantId: string;
    participantName: string;
    topValues: string[];
    averageAlignment: number;
    biggestGap: string;
  }[];

  /** Team values gap */
  teamLayer: {
    teamValues: string[];
    commitmentStatement: string;
    averageAlignment: number;
    alignmentByValue: Map<string, number>;
  };

  /** Organizational values gap (if Phase 3 was used) */
  organizationalLayer?: {
    orgValues: string[];
    averageAlignment: number;
    alignmentByValue: Map<string, number>;
    mostAtRisk: string;
  };

  /** Cross-layer analysis */
  crossLayerInsights: {
    /** Where all three layers aligned */
    alignment: string[];
    /** Where layers conflicted */
    conflicts: {
      description: string;
      layersInvolved: ('personal' | 'team' | 'organizational')[];
      resolution: string;
    }[];
    /** Which layer was hardest to maintain */
    hardestLayer: 'personal' | 'team' | 'organizational';
    /** Why */
    hardestLayerReason: string;
  };
}

// ============================================================================
// TRANSFER REFLECTION TYPES
// ============================================================================

export interface TransferReflection {
  /** Participant ID */
  participantId: string;
  /** Session ID */
  sessionId: string;
  /** When written */
  writtenAt: number;

  /** Individual reflection */
  individualReflection: {
    /** Real situation with similar pressure */
    realSituation: string;
    /** Value that was tested */
    valueTested: string;
    /** What they did */
    action: string;
    /** What they might do differently */
    wouldDoDifferently: string;
  };

  /** Personal commitment */
  personalCommitment: {
    /** The pressure trigger */
    pressure: string;
    /** The action commitment */
    action: string;
    /** The value being protected */
    value: string;
    /** Full commitment statement */
    fullStatement: string;
  };
}

// ============================================================================
// DEBRIEF SESSION TYPES
// ============================================================================

export type DebriefPhase = 'cooldown' | 'timeline' | 'gaps' | 'cascade' | 'transfer' | 'closing';

export interface DebriefSession {
  /** Session ID */
  sessionId: string;
  /** Current phase of debrief */
  currentPhase: DebriefPhase;
  /** When debrief started */
  startedAt: number;
  /** Gap reports by team */
  teamReports: Map<string, GapReport>;
  /** Rationalization cascades by team */
  cascadeAnalysis: Map<string, RationalizationCascade>;
  /** Three-layer analysis (if org values used) */
  threeLayerAnalysis?: Map<string, ThreeLayerAnalysis>;
  /** Transfer reflections collected */
  reflections: TransferReflection[];
}

// ============================================================================
// DEBRIEF EVIDENCE TYPES
// ============================================================================

export type DebriefEvidenceType =
  | 'commitment-violation'
  | 'value-gap'
  | 'notable-moment'
  | 'rationalization'
  | 'consistency';

export interface DebriefEvidence {
  /** Type of evidence */
  type: DebriefEvidenceType;
  /** Headline for display */
  headline: string;
  /** Original commitment language (if relevant) */
  commitmentQuote?: string;
  /** What they decided */
  decisionQuote: string;
  /** Their justification */
  rationaleQuote?: string;
  /** What happened as a result */
  consequence?: string;
  /** Alignment score */
  alignmentScore?: ValuesAlignmentScore;
}
