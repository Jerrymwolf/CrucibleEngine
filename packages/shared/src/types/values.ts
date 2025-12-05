/**
 * Values-related types for tracking and analysis
 */

export interface TeamValues {
  teamId: string;
  parishId: string;
  statedValues: string[]; // Ordered by priority
  valuesRankOrder: number[]; // Indices into statedValues
  decisionProcess: 'consensus' | 'majority' | 'leader';
  commitmentStatement?: string;
}

export interface ParticipantValues {
  participantId: string;
  personalValues: string[]; // Individual's top 5
  valuesRankOrder: number[];
}

/**
 * ABCD Framework for coding decisions
 * Affect, Behavior, Cognition, Desire
 */
export interface ABCDAnalysis {
  affect: string; // Emotional state observed
  behavior: string; // Actions taken
  cognition: string; // Reasoning expressed
  desire: string; // Outcome sought
}

/**
 * Values alignment score
 * -3 to +3 scale
 */
export type ValuesAlignmentScore = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export interface ValuesAlignment {
  value: string;
  alignment: ValuesAlignmentScore;
  evidence: string;
}

export interface ValuesObservation {
  decisionId: string;
  statedValuesAnalysis: ValuesAlignment[];
  abcd: ABCDAnalysis;
  notableMoment: boolean;
  notableReason?: string;
  participantDynamics: string;
}

/**
 * Team psychological state zones
 */
export type PsychologicalZone = 'comfort' | 'learning' | 'panic';

export interface TempestAssessment {
  teamId: string;
  currentZone: PsychologicalZone;
  confidence: number; // 0-100
  signals: string[];
  recommendation: 'increase' | 'maintain' | 'decrease' | 'pause';
  suggestedLever: string;
  rationale: string;
}

/**
 * Reflection types
 */
export interface Reflection {
  id: string;
  participantId: string;
  phase: 'individual' | 'team' | 'company';
  momentId?: string; // Reference to notable moment
  content: string;
  isPrivate: boolean;
  createdAt: number;
}

/**
 * Report types
 */
export type ReportType = 'personal' | 'team' | 'organizational' | 'cm' | 'data';
export type ReportFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx';

export interface ReportRequest {
  sessionId: string;
  type: ReportType;
  recipientId?: string; // Participant or Team ID
  format: ReportFormat;
}

export interface ReportResult {
  id: string;
  sessionId: string;
  type: ReportType;
  recipientId?: string;
  filePath: string;
  format: ReportFormat;
  generatedAt: number;
}
