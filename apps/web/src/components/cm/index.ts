/**
 * CM (Crucible Master) Components
 *
 * Components for the facilitator console.
 * These provide tools for managing and monitoring the simulation.
 *
 * Components:
 * - FacilitationGuide: Contextual tips and guidance
 * - ControlDeck: Phase and intensity controls
 * - TeamMonitor: Team status grid
 * - InterventionPanel: Values intervention triggers
 * - NarrativeQueue: Feed management
 * - SessionRecovery: Connection recovery UX
 */

// Facilitation
export {
  FacilitationGuide,
  type FacilitationGuideProps,
  type FacilitationTip,
  type TeamAnalysis,
  type PacingStatus,
} from './FacilitationGuide';

// Control
export {
  ControlDeck,
  type ControlDeckProps,
  type PhaseId,
  type Phase,
} from './ControlDeck';

// Monitoring
export {
  TeamMonitor,
  type TeamMonitorProps,
  type TeamData,
  type TeamMember,
  type TeamStatus,
} from './TeamMonitor';

// Interventions
export {
  InterventionPanel,
  type InterventionPanelProps,
  type InterventionType,
  type InterventionHistory,
  type TeamOption,
} from './InterventionPanel';

// Narrative
export {
  NarrativeQueue,
  type NarrativeQueueProps,
  type FeedItem,
  type FeedItemType,
} from './NarrativeQueue';

// Recovery
export {
  SessionRecovery,
  type SessionRecoveryProps,
  type ConnectionStatus,
} from './SessionRecovery';
