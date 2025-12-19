/**
 * Infrastructure Cascade Rules
 * Defines how infrastructure failures propagate across Concordia Island
 *
 * Key cascade patterns:
 * 1. Dam (Heartland) stress → power failure downstream
 * 2. Power failure to Keystone → clean room contamination risk
 * 3. Road closures → resource transfer blocked
 * 4. Port damage → supply chain interruption
 * 5. Communication tower → coordination breakdown
 */

import type { InfrastructureCascadeRule, InfrastructureSystem } from '../types/engine.js';
import type { ParishIdLower } from './concordia.js';

// ============================================================================
// INFRASTRUCTURE THRESHOLDS
// ============================================================================

/**
 * Status thresholds for infrastructure systems
 * 100 = fully operational, 0 = completely failed
 */
export const INFRASTRUCTURE_THRESHOLDS = {
  /** Below this, system is considered failed */
  FAILED: 20,
  /** Below this, system is degraded but operational */
  DEGRADED: 50,
  /** At or above this, system is fully operational */
  OPERATIONAL: 80,
  /** Critical threshold for cascade triggers */
  CRITICAL: 30,
} as const;

/**
 * Base degradation rates per hour during storm phases
 */
export const DEGRADATION_RATES = {
  watch: {
    power: 2,
    communications: 1,
    roads: 3,
    water: 1,
    hospital: 0,
    port: 2,
    airport: 3,
  },
  warning: {
    power: 5,
    communications: 3,
    roads: 8,
    water: 2,
    hospital: 1,
    port: 6,
    airport: 10,
  },
  crisis: {
    power: 10,
    communications: 8,
    roads: 15,
    water: 5,
    hospital: 3,
    port: 12,
    airport: 20,
  },
  recovery: {
    power: -5, // Negative = recovery
    communications: -3,
    roads: -2,
    water: -4,
    hospital: -2,
    port: -3,
    airport: -5,
  },
} as const;

// ============================================================================
// CASCADE RULES
// ============================================================================

/**
 * Infrastructure cascade rules
 * When trigger conditions are met, effects cascade to dependent systems
 */
export const CASCADE_RULES: InfrastructureCascadeRule[] = [
  // ============================================================================
  // HEARTLAND DAM CASCADES (Power source for island)
  // ============================================================================
  {
    id: 'heartland-dam-keystone-power',
    trigger: {
      system: 'power',
      parishId: 'heartland',
      threshold: 50, // Dam at 50% triggers concern
    },
    effects: [
      {
        system: 'power',
        parishId: 'keystone',
        degradation: 30,
        delayMinutes: 15,
      },
    ],
    narrative:
      'Dam output dropping. Keystone manufacturing facility switching to backup generators, but clean room power fluctuations detected.',
  },
  {
    id: 'heartland-dam-critical',
    trigger: {
      system: 'power',
      parishId: 'heartland',
      threshold: 30, // Dam critical
    },
    effects: [
      {
        system: 'power',
        parishId: 'keystone',
        degradation: 50,
        delayMinutes: 5,
      },
      {
        system: 'power',
        parishId: 'haven',
        degradation: 40,
        delayMinutes: 10,
      },
      {
        system: 'power',
        parishId: 'sterling',
        degradation: 35,
        delayMinutes: 15,
      },
      {
        system: 'power',
        parishId: 'gateway',
        degradation: 25,
        delayMinutes: 20,
      },
    ],
    narrative:
      'CRITICAL: Heartland Dam output at dangerous levels. Rolling blackouts beginning across the island. Priority power to Keystone failing.',
  },
  {
    id: 'heartland-dam-failure',
    trigger: {
      system: 'power',
      parishId: 'heartland',
      threshold: 20, // Dam failed
    },
    effects: [
      {
        system: 'power',
        parishId: 'keystone',
        degradation: 80,
        delayMinutes: 0,
      },
      {
        system: 'power',
        parishId: 'haven',
        degradation: 70,
        delayMinutes: 0,
      },
      {
        system: 'power',
        parishId: 'sterling',
        degradation: 60,
        delayMinutes: 0,
      },
      {
        system: 'power',
        parishId: 'gateway',
        degradation: 50,
        delayMinutes: 0,
      },
      {
        system: 'water',
        parishId: 'keystone',
        degradation: 40,
        delayMinutes: 30,
      },
    ],
    narrative:
      'EMERGENCY: Heartland Dam offline. Island-wide blackout. Only facilities with backup generators operational. Ultrapure water production halted at Keystone.',
  },

  // ============================================================================
  // KEYSTONE CLEAN ROOM CASCADES
  // ============================================================================
  {
    id: 'keystone-power-cleanroom',
    trigger: {
      system: 'power',
      parishId: 'keystone',
      threshold: 50,
    },
    effects: [
      {
        system: 'hospital', // Using 'hospital' as proxy for manufacturing
        parishId: 'keystone',
        degradation: 25,
        delayMinutes: 120, // 2 hours before contamination risk
      },
    ],
    narrative:
      'Keystone backup generators running. Clean room air handling on emergency power. Contamination risk increases every hour without grid power.',
  },
  {
    id: 'keystone-power-critical',
    trigger: {
      system: 'power',
      parishId: 'keystone',
      threshold: 30,
    },
    effects: [
      {
        system: 'hospital',
        parishId: 'keystone',
        degradation: 50,
        delayMinutes: 60,
      },
    ],
    narrative:
      'ALERT: Keystone clean room positive pressure failing. Batch contamination imminent if power not restored within 60 minutes.',
  },

  // ============================================================================
  // WATER SYSTEM CASCADES
  // ============================================================================
  {
    id: 'heartland-water-keystone',
    trigger: {
      system: 'water',
      parishId: 'heartland',
      threshold: 50,
    },
    effects: [
      {
        system: 'water',
        parishId: 'keystone',
        degradation: 40,
        delayMinutes: 60,
      },
    ],
    narrative:
      'Water treatment capacity reduced. Ultrapure water supply to Keystone manufacturing at risk.',
  },
  {
    id: 'heartland-water-critical',
    trigger: {
      system: 'water',
      parishId: 'heartland',
      threshold: 30,
    },
    effects: [
      {
        system: 'water',
        parishId: 'keystone',
        degradation: 60,
        delayMinutes: 30,
      },
      {
        system: 'water',
        parishId: 'sterling',
        degradation: 30,
        delayMinutes: 45,
      },
      {
        system: 'hospital',
        parishId: 'sterling',
        degradation: 20,
        delayMinutes: 90,
      },
    ],
    narrative:
      'CRITICAL: Water treatment failing. Boil water advisory for Sterling. Hospital sterilization protocols compromised.',
  },

  // ============================================================================
  // COMMUNICATIONS CASCADES
  // ============================================================================
  {
    id: 'summit-comms-island',
    trigger: {
      system: 'communications',
      parishId: 'summit',
      threshold: 50,
    },
    effects: [
      {
        system: 'communications',
        parishId: 'keystone',
        degradation: 20,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'haven',
        degradation: 20,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'sterling',
        degradation: 15,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'gateway',
        degradation: 25,
        delayMinutes: 0,
      },
    ],
    narrative:
      'Summit communication tower damaged. Radio coverage degraded across all parishes. Coordination between teams becoming difficult.',
  },
  {
    id: 'summit-comms-failure',
    trigger: {
      system: 'communications',
      parishId: 'summit',
      threshold: 20,
    },
    effects: [
      {
        system: 'communications',
        parishId: 'keystone',
        degradation: 50,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'haven',
        degradation: 50,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'heartland',
        degradation: 40,
        delayMinutes: 0,
      },
      {
        system: 'communications',
        parishId: 'gateway',
        degradation: 60,
        delayMinutes: 0,
      },
    ],
    narrative:
      'EMERGENCY: Summit tower collapsed. Island-wide communications blackout. Only Sterling emergency broadcast remains operational. Parishes isolated.',
  },

  // ============================================================================
  // ROAD CASCADES
  // ============================================================================
  {
    id: 'gateway-roads-isolation',
    trigger: {
      system: 'roads',
      parishId: 'gateway',
      threshold: 30,
    },
    effects: [
      {
        system: 'airport',
        parishId: 'gateway',
        degradation: 30,
        delayMinutes: 0,
      },
    ],
    narrative:
      'Gateway access roads flooded. Airport runways accessible only by helicopter. Ground evacuation routes compromised.',
  },
  {
    id: 'heartland-roads-isolation',
    trigger: {
      system: 'roads',
      parishId: 'heartland',
      threshold: 30,
    },
    effects: [
      {
        system: 'power',
        parishId: 'heartland',
        degradation: 10,
        delayMinutes: 120, // Repair crews can't reach
      },
    ],
    narrative:
      'Crater roads impassable. Dam maintenance crews unable to reach Heartland. Remote monitoring only.',
  },
  {
    id: 'haven-roads-port',
    trigger: {
      system: 'roads',
      parishId: 'haven',
      threshold: 40,
    },
    effects: [
      {
        system: 'port',
        parishId: 'haven',
        degradation: 25,
        delayMinutes: 30,
      },
    ],
    narrative:
      'Haven port access roads flooded. Shipping containers cannot be moved. Cold chain integrity at risk.',
  },

  // ============================================================================
  // PORT CASCADES
  // ============================================================================
  {
    id: 'haven-port-supply',
    trigger: {
      system: 'port',
      parishId: 'haven',
      threshold: 50,
    },
    effects: [
      {
        system: 'hospital',
        parishId: 'sterling',
        degradation: 10,
        delayMinutes: 360, // 6 hours as medical supplies run low
      },
    ],
    narrative:
      'Haven port operations limited. Medical supply shipments delayed. Sterling General may need to ration certain supplies.',
  },
  {
    id: 'haven-port-failure',
    trigger: {
      system: 'port',
      parishId: 'haven',
      threshold: 20,
    },
    effects: [
      {
        system: 'hospital',
        parishId: 'sterling',
        degradation: 30,
        delayMinutes: 720, // 12 hours
      },
    ],
    narrative:
      'CRITICAL: Haven port offline. No external supply deliveries possible. Island must survive on existing stockpiles.',
  },

  // ============================================================================
  // HOSPITAL CASCADES
  // ============================================================================
  {
    id: 'sterling-hospital-crisis',
    trigger: {
      system: 'hospital',
      parishId: 'sterling',
      threshold: 40,
    },
    effects: [
      {
        system: 'hospital',
        parishId: 'keystone',
        degradation: 15,
        delayMinutes: 60,
      },
      {
        system: 'hospital',
        parishId: 'haven',
        degradation: 15,
        delayMinutes: 60,
      },
    ],
    narrative:
      'Sterling General overwhelmed. Diverting critical cases to parish clinics. Medical resources stretched thin island-wide.',
  },

  // ============================================================================
  // AIRPORT CASCADES
  // ============================================================================
  {
    id: 'gateway-airport-evacuation',
    trigger: {
      system: 'airport',
      parishId: 'gateway',
      threshold: 30,
    },
    effects: [
      {
        system: 'communications',
        parishId: 'gateway',
        degradation: 20,
        delayMinutes: 0,
      },
    ],
    narrative:
      'Gateway Airport closed. External flights cancelled. Island isolated from mainland support. Satellite communications only.',
  },
];

// ============================================================================
// INITIAL INFRASTRUCTURE STATES
// ============================================================================

type InfrastructureStatusMap = Record<ParishIdLower, Record<InfrastructureSystem, number>>;

/**
 * Starting infrastructure status for each parish
 * All systems start at 100 (fully operational) unless otherwise specified
 */
export const INITIAL_INFRASTRUCTURE_STATUS: InfrastructureStatusMap = {
  keystone: {
    power: 100,
    communications: 100,
    roads: 100,
    water: 100,
    hospital: 100, // Manufacturing/clean rooms
    port: 0, // No port
    airport: 0, // No airport
  },
  haven: {
    power: 100,
    communications: 100,
    roads: 100,
    water: 100,
    hospital: 80, // Small clinic
    port: 100, // Main port
    airport: 0, // No airport
  },
  gateway: {
    power: 100,
    communications: 100,
    roads: 100,
    water: 100,
    hospital: 70, // Basic medical
    port: 80, // Small harbor
    airport: 100, // Main airport
  },
  heartland: {
    power: 100, // Dam
    communications: 100,
    roads: 90, // Crater roads are vulnerable
    water: 100, // Water treatment
    hospital: 60, // Minimal medical
    port: 0, // No port
    airport: 0, // No airport
  },
  summit: {
    power: 100,
    communications: 100, // Main tower
    roads: 85, // Mountain roads
    water: 100,
    hospital: 90, // Executive medical
    port: 0, // No port
    airport: 0, // No airport
  },
  sterling: {
    power: 100,
    communications: 100, // Emergency broadcast
    roads: 100,
    water: 100,
    hospital: 100, // Main hospital
    port: 70, // Small docks
    airport: 0, // No airport
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all cascade rules triggered by a given infrastructure state
 */
export function getTriggeredCascades(
  parishId: ParishIdLower,
  system: InfrastructureSystem,
  currentStatus: number
): InfrastructureCascadeRule[] {
  return CASCADE_RULES.filter(
    (rule) =>
      rule.trigger.parishId === parishId &&
      rule.trigger.system === system &&
      currentStatus <= rule.trigger.threshold
  );
}

/**
 * Get all rules that could affect a given parish
 */
export function getRulesAffectingParish(parishId: ParishIdLower): InfrastructureCascadeRule[] {
  return CASCADE_RULES.filter((rule) => rule.effects.some((effect) => effect.parishId === parishId));
}

/**
 * Calculate total degradation for a system in a parish from multiple cascades
 */
export function calculateCascadeDegradation(
  parishId: ParishIdLower,
  system: InfrastructureSystem,
  triggeredRules: InfrastructureCascadeRule[]
): number {
  return triggeredRules.reduce((total, rule) => {
    const effect = rule.effects.find((e) => e.parishId === parishId && e.system === system);
    return total + (effect?.degradation ?? 0);
  }, 0);
}

/**
 * Check if a parish is isolated (roads and communications both failed)
 */
export function isParishIsolated(
  parishId: ParishIdLower,
  statuses: InfrastructureStatusMap
): boolean {
  const parishStatus = statuses[parishId];
  return (
    parishStatus.roads <= INFRASTRUCTURE_THRESHOLDS.FAILED &&
    parishStatus.communications <= INFRASTRUCTURE_THRESHOLDS.FAILED
  );
}

/**
 * Get parishes that can still be reached from a given parish
 */
export function getReachableParishes(
  fromParish: ParishIdLower,
  statuses: InfrastructureStatusMap
): ParishIdLower[] {
  const reachable: ParishIdLower[] = [];
  const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];

  for (const parish of parishes) {
    if (parish === fromParish) continue;

    // Check if roads are passable from origin
    if (statuses[fromParish].roads > INFRASTRUCTURE_THRESHOLDS.FAILED) {
      // Check if destination roads are passable
      if (statuses[parish].roads > INFRASTRUCTURE_THRESHOLDS.FAILED) {
        reachable.push(parish);
      }
    }
  }

  return reachable;
}
