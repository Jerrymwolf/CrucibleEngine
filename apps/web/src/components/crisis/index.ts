/**
 * Crisis Components
 *
 * Components for the crisis phase of the simulation.
 * Design principle: No values reminders - teams must remember their own values.
 */

// Main Dashboard
export { ParishDashboard, type ParishDashboardProps } from './ParishDashboard.js';

// Decision Interface (Legacy)
export { DilemmaModal, type DilemmaModalProps } from './DilemmaModal.js';

// Decision Interface (Enhanced)
export {
  DilemmaPresenter,
  type DilemmaPresenterProps,
  type TeamVote,
} from './DilemmaPresenter.js';

// Consequence Reveal
export {
  ConsequenceReveal,
  type ConsequenceRevealProps,
  type ConsequenceData,
  type ConsequenceType,
  type ConsequenceSeverity,
  type MetricChange,
} from './ConsequenceReveal.js';

// Notable Moment Badges
export {
  NotableMomentBadge,
  type NotableMomentBadgeProps,
  type NotableMomentType,
  PivotalBadge,
  ValuesGapBadge,
  SacrificeBadge,
  LeadershipBadge,
  TurningPointBadge,
} from './NotableMomentBadge.js';

// CM Interventions
export {
  ValuesCheckIn,
  type ValuesCheckInProps,
  type ValuesCheckInResponse,
} from './ValuesCheckIn.js';
