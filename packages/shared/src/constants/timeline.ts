/**
 * Hurricane Timeline Constants
 * Defines the progression of Hurricane Midas through 8 timeline windows
 *
 * The timeline drives the weather state machine and determines:
 * - What actions are available at each phase
 * - Infrastructure degradation
 * - Narrative pressure points
 */

import type { HurricaneProfile, TimelineWindow, TimelinePhase } from '../types/timeline.js';
import type { ParishIdLower } from './concordia.js';

// All parishes for convenience
const ALL_PARISHES: ParishIdLower[] = ['haven', 'summit', 'gateway', 'heartland', 'keystone', 'sterling'];

export const HURRICANE_MIDAS: HurricaneProfile = {
  id: 'midas',
  name: 'Hurricane Midas',
  category: 4,
  windows: [
    // ========================================================================
    // T-72h: WATCH ISSUED
    // ========================================================================
    {
      id: 'watch-72',
      phase: 'watch',
      tMinusHours: -72,
      label: 'Watch Issued',
      certaintyPercent: 40,
      decisionType: 'Pre-positioning',
      weather: {
        windMph: 15,
        rainfallInchesPerHour: 0,
        stormSurgeFeet: 0,
        visibility: 'clear',
      },
      infrastructureState: {
        roadsPassable: ALL_PARISHES,
        powerAvailable: ALL_PARISHES,
        commsOperational: ALL_PARISHES,
      },
      unavailableActions: [],
      emergingPressures: [
        'Tourists requesting early flights',
        'Supply orders need confirmation',
        'Workers asking about contingency plans',
      ],
      narrativeBeats: [
        'First weather advisory appears',
        'Corporate asks for status update',
        '"Should we or shouldn\'t we" tension begins',
        'Production targets remain unchanged',
      ],
    },

    // ========================================================================
    // T-48h: TRACK SOLIDIFIES
    // ========================================================================
    {
      id: 'watch-48',
      phase: 'watch',
      tMinusHours: -48,
      label: 'Track Solidifies',
      certaintyPercent: 65,
      decisionType: 'Early release',
      weather: {
        windMph: 25,
        rainfallInchesPerHour: 0.1,
        stormSurgeFeet: 0,
        visibility: 'clear',
      },
      infrastructureState: {
        roadsPassable: ALL_PARISHES,
        powerAvailable: ALL_PARISHES,
        commsOperational: ALL_PARISHES,
      },
      unavailableActions: ['Order new supplies from mainland (too late for delivery)'],
      emergingPressures: [
        'Workers asking about evacuation',
        'Last commercial flights filling up',
        'Production targets still active',
        'Union meeting called',
      ],
      narrativeBeats: [
        'Executives book flights "just in case"',
        'First resource conflict emerges',
        'Workers notice who gets to leave',
        'Frank Reeves faces impossible choice',
      ],
    },

    // ========================================================================
    // T-24h: WARNING ISSUED
    // ========================================================================
    {
      id: 'warning-24',
      phase: 'warning',
      tMinusHours: -24,
      label: 'Warning Issued',
      certaintyPercent: 85,
      decisionType: 'Evacuation',
      weather: {
        windMph: 45,
        rainfallInchesPerHour: 0.5,
        stormSurgeFeet: 1,
        visibility: 'reduced',
      },
      infrastructureState: {
        roadsPassable: ALL_PARISHES,
        powerAvailable: ALL_PARISHES,
        commsOperational: ALL_PARISHES,
      },
      unavailableActions: [
        'Order new supplies',
        'Evacuate by sea (conditions too rough)',
        'Continue harvest operations',
      ],
      emergingPressures: [
        'Airport closing in 12 hours',
        'Who gets evacuation priority?',
        'Production shutdown decision urgent',
        'Sterling shelter capacity concerns',
      ],
      narrativeBeats: [
        'Mandatory evacuation debates begin',
        'Class divisions become visible',
        'First "we should have acted sooner" regrets',
        'Maria Santos threatens work stoppage',
      ],
    },

    // ========================================================================
    // T-12h: OUTER BANDS
    // ========================================================================
    {
      id: 'approach-12',
      phase: 'approach',
      tMinusHours: -12,
      label: 'Outer Bands',
      certaintyPercent: 95,
      decisionType: 'Last movement',
      weather: {
        windMph: 65,
        rainfallInchesPerHour: 2,
        stormSurgeFeet: 3,
        visibility: 'poor',
      },
      infrastructureState: {
        roadsPassable: ['haven', 'gateway', 'keystone', 'sterling'], // Crater roads closed
        powerAvailable: ALL_PARISHES,
        commsOperational: ALL_PARISHES,
      },
      unavailableActions: [
        'Evacuate by air',
        'Move between crater and ring road',
        'Continue any production',
        'Transfer heavy equipment',
      ],
      emergingPressures: [
        "People who didn't evacuate need shelter",
        'Power demand spiking',
        'Last chance to position resources',
        'Summit and Heartland now isolated',
      ],
      narrativeBeats: [
        'Airport closes',
        'Summit/Heartland cut off from ring road',
        'Shelter capacity decisions forced',
        'Tanaka warns about dam stress',
      ],
    },

    // ========================================================================
    // T-6h: HURRICANE CONDITIONS
    // ========================================================================
    {
      id: 'approach-6',
      phase: 'approach',
      tMinusHours: -6,
      label: 'Hurricane Conditions',
      certaintyPercent: null, // 100% certain
      decisionType: 'Shelter only',
      weather: {
        windMph: 95,
        rainfallInchesPerHour: 4,
        stormSurgeFeet: 6,
        visibility: 'zero',
      },
      infrastructureState: {
        roadsPassable: [], // All roads closed
        powerAvailable: ['summit', 'keystone'], // Only backup generators
        commsOperational: ['summit'], // Only tower
      },
      unavailableActions: [
        'Any movement between parishes',
        'Most communications',
        'Resource transfers',
        'Rescue operations',
      ],
      emergingPressures: [
        'Medical emergencies with no transport',
        'Power failures cascading',
        'Communication blackouts',
        'People trapped in wrong locations',
      ],
      narrativeBeats: [
        'Total isolation begins',
        'Life-or-death decisions',
        'Earlier choices have consequences',
        'Sterling hospital overwhelmed',
      ],
    },

    // ========================================================================
    // T-0: LANDFALL
    // ========================================================================
    {
      id: 'landfall-0',
      phase: 'landfall',
      tMinusHours: 0,
      label: 'Landfall',
      certaintyPercent: null, // 100% certain
      decisionType: 'Life safety',
      weather: {
        windMph: 130,
        rainfallInchesPerHour: 6,
        stormSurgeFeet: 12,
        visibility: 'zero',
      },
      infrastructureState: {
        roadsPassable: [],
        powerAvailable: ['summit'], // Only Summit backup holds
        commsOperational: [],
      },
      unavailableActions: ['Everything except immediate shelter decisions'],
      emergingPressures: [
        'Structural failures',
        'Flooding deaths',
        'Complete information blackout',
        'Dam at critical stress',
      ],
      narrativeBeats: [
        'Peak crisis',
        'Survival mode',
        'No more decisions - consequences play out',
        'Each parish faces their worst fear',
      ],
    },

    // ========================================================================
    // T+6h: EYE / EASING
    // ========================================================================
    {
      id: 'eye-6',
      phase: 'eye',
      tMinusHours: 6,
      label: 'Eye Passage / Easing',
      certaintyPercent: null,
      decisionType: 'Rescue priority',
      weather: {
        windMph: 40,
        rainfallInchesPerHour: 1,
        stormSurgeFeet: 4,
        visibility: 'poor',
      },
      infrastructureState: {
        roadsPassable: ['summit', 'heartland'], // Crater roads clearing first
        powerAvailable: ['summit', 'heartland'],
        commsOperational: ['summit'],
      },
      unavailableActions: ['Ring road travel', 'External communication', 'Full operations'],
      emergingPressures: [
        'Rescue vs. assessment',
        'Who do we reach first?',
        'Damage reports flooding in',
        'Body count unknown',
      ],
      narrativeBeats: [
        'First survey of damage',
        'Rescue triage begins',
        'Accountability questions emerge',
        'Who made it and who did not',
      ],
    },

    // ========================================================================
    // T+24h: RECOVERY BEGINS
    // ========================================================================
    {
      id: 'recovery-24',
      phase: 'recovery',
      tMinusHours: 24,
      label: 'Recovery Begins',
      certaintyPercent: null,
      decisionType: 'Accountability',
      weather: {
        windMph: 20,
        rainfallInchesPerHour: 0.2,
        stormSurgeFeet: 1,
        visibility: 'reduced',
      },
      infrastructureState: {
        roadsPassable: ALL_PARISHES,
        powerAvailable: ['summit', 'heartland', 'keystone'],
        commsOperational: ['summit', 'gateway'],
      },
      unavailableActions: ['Pretend nothing happened'],
      emergingPressures: [
        'Media arriving',
        'Families demanding answers',
        'Insurance assessments',
        'Blame assignment',
        'Board demanding explanation',
      ],
      narrativeBeats: [
        'Reporter asks "why did you..."',
        'Body count known',
        'Redemption or deflection choice',
        'Values tested one final time',
      ],
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get timeline window by ID
 */
export function getTimelineWindow(windowId: string): TimelineWindow | undefined {
  return HURRICANE_MIDAS.windows.find((w) => w.id === windowId);
}

/**
 * Get timeline window by T-minus hours
 */
export function getWindowByTMinusHours(tMinusHours: number): TimelineWindow | undefined {
  // Find the window that contains this time
  const sorted = [...HURRICANE_MIDAS.windows].sort((a, b) => a.tMinusHours - b.tMinusHours);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (next) {
      if (tMinusHours >= current.tMinusHours && tMinusHours < next.tMinusHours) {
        return current;
      }
    } else {
      // Last window
      if (tMinusHours >= current.tMinusHours) {
        return current;
      }
    }
  }

  return sorted[0]; // Before first window, return first
}

/**
 * Convert simulation time (minutes since watch) to T-minus hours
 */
export function simulationTimeToTMinusHours(simulationMinutes: number): number {
  // Simulation starts at T-72h (watch issued)
  // So simulationMinutes 0 = T-72h
  const hoursElapsed = simulationMinutes / 60;
  return -72 + hoursElapsed;
}

/**
 * Get current window from simulation time
 */
export function getCurrentWindow(simulationMinutes: number): TimelineWindow {
  const tMinusHours = simulationTimeToTMinusHours(simulationMinutes);
  return getWindowByTMinusHours(tMinusHours) || HURRICANE_MIDAS.windows[0];
}

/**
 * Check if roads are passable between parishes at a given window
 */
export function areRoadsPassable(
  from: ParishIdLower,
  to: ParishIdLower,
  windowId: string
): boolean {
  const window = getTimelineWindow(windowId);
  if (!window) return true;

  const passable = window.infrastructureState.roadsPassable;
  return passable.includes(from) && passable.includes(to);
}

/**
 * Check if a parish has power at a given window
 */
export function hasPowerAtWindow(parishId: ParishIdLower, windowId: string): boolean {
  const window = getTimelineWindow(windowId);
  if (!window) return true;

  return window.infrastructureState.powerAvailable.includes(parishId);
}

/**
 * Check if a parish has communications at a given window
 */
export function hasCommsAtWindow(parishId: ParishIdLower, windowId: string): boolean {
  const window = getTimelineWindow(windowId);
  if (!window) return true;

  return window.infrastructureState.commsOperational.includes(parishId);
}

/**
 * Get all windows for a specific phase
 */
export function getWindowsByPhase(phase: TimelinePhase): TimelineWindow[] {
  return HURRICANE_MIDAS.windows.filter((w) => w.phase === phase);
}

/**
 * Get the next window in sequence
 */
export function getNextWindow(currentWindowId: string): TimelineWindow | undefined {
  const currentIndex = HURRICANE_MIDAS.windows.findIndex((w) => w.id === currentWindowId);
  if (currentIndex === -1 || currentIndex === HURRICANE_MIDAS.windows.length - 1) {
    return undefined;
  }
  return HURRICANE_MIDAS.windows[currentIndex + 1];
}

/**
 * Get the previous window in sequence
 */
export function getPreviousWindow(currentWindowId: string): TimelineWindow | undefined {
  const currentIndex = HURRICANE_MIDAS.windows.findIndex((w) => w.id === currentWindowId);
  if (currentIndex <= 0) {
    return undefined;
  }
  return HURRICANE_MIDAS.windows[currentIndex - 1];
}

/**
 * Calculate minutes until next window
 */
export function getMinutesUntilNextWindow(simulationMinutes: number): number | null {
  const tMinusHours = simulationTimeToTMinusHours(simulationMinutes);
  const currentWindow = getWindowByTMinusHours(tMinusHours);
  if (!currentWindow) return null;

  const nextWindow = getNextWindow(currentWindow.id);
  if (!nextWindow) return null;

  const hoursUntilNext = nextWindow.tMinusHours - tMinusHours;
  return Math.max(0, hoursUntilNext * 60);
}
