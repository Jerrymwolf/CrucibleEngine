/**
 * Briefing Components
 *
 * Components for the scenario briefing phase that occurs between
 * values discovery and the crisis simulation.
 *
 * Flow:
 * 1. StormApproach - Dramatic storm briefing with countdown
 * 2. ParishAssignment - Animated reveal of team's assigned parish
 * 3. ValuesReminder - Review of team values before crisis begins
 */

// Storm Briefing
export { StormApproach, type StormApproachProps } from './StormApproach.js';

// Parish Assignment
export { ParishAssignment, type ParishAssignmentProps } from './ParishAssignment.js';

// Values Reminder
export { ValuesReminder, type ValuesReminderProps, type TeamValue } from './ValuesReminder.js';
