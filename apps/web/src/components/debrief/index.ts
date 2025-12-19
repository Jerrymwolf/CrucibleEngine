/**
 * Debrief Components
 *
 * Components for the post-crisis debrief phase (90 min).
 * Design principle: For learning, not judgment.
 *
 * Components:
 * - DebriefJourney: Main orchestrator for the 5-chapter debrief experience
 * - DecisionTimeline: Visual reconstruction of decisions
 * - DecisionReplay: Dramatic step-by-step replay of decisions
 * - ValuesGapReport: Gap between stated and enacted values
 * - GapRevelation: Dramatic animated gap revelation
 * - CommitmentComparison: Side-by-side commitment vs actions
 * - RationalizationCascade: 6-step drift visualization
 * - TransferReflection: Personal commitment builder
 */

// Journey Orchestration
export {
  DebriefJourney,
  type DebriefJourneyProps,
  type DebriefChapter,
} from './DebriefJourney.js';

// Decision Analysis
export {
  DecisionTimeline,
  type DecisionTimelineProps,
  type TimelineDecision,
} from './DecisionTimeline.js';

export {
  DecisionReplay,
  type DecisionReplayProps,
  type ReplayDecision,
  type ReplayConsequence,
} from './DecisionReplay.js';

// Values Gap Analysis
export {
  ValuesGapReport,
  type ValuesGapReportProps,
  type ValueData,
  type PhaseData,
  type NotableMomentSummary,
} from './ValuesGapReport.js';

export {
  GapRevelation,
  type GapRevelationProps,
  type GapValue,
  type GapEvidence,
} from './GapRevelation.js';

// Commitment Analysis
export {
  CommitmentComparison,
  type CommitmentComparisonProps,
  type CommitmentClause,
  type CommitmentEvidence,
} from './CommitmentComparison.js';

// Drift Analysis
export {
  RationalizationCascade,
  type RationalizationCascadeProps,
  type RationalizationStep,
} from './RationalizationCascade.js';

// Transfer & Personal Commitment
export {
  TransferReflection,
  type TransferReflectionProps,
  type TransferReflectionData,
} from './TransferReflection.js';

// Export & Sharing
export {
  DebriefExport,
  type DebriefExportProps,
  type DebriefData,
} from './DebriefExport.js';
