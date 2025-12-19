/**
 * Concordia Island Geography and Parish Definitions
 * The fixed geography for The Values Crucible simulation
 *
 * Concordia is an island dominated by Meridian Corporation, a biotech company
 * with a critical supply chain running through multiple parishes.
 * Total population: 24,100
 */

export type SupplyChainRole = 'harvest' | 'process' | 'manufacture' | 'ship' | 'power' | 'coordinate';

// Note: ResourceLevel is defined in types/parish.ts to avoid duplication
// Import it from there: import type { ResourceLevel } from '../types/parish.js';
type ResourceLevel = 'low' | 'medium' | 'high';

export interface ClassCharacter {
  whoLivesHere: string;
  whatTheyFear: string;
  whatTheyWant: string;
}

export interface ParishAsset {
  type: string;
  name: string;
  capacity?: number | string;
}

export interface ParishResources {
  generators: number;
  medicalSupplies: ResourceLevel;
  fuel: ResourceLevel;
  food: ResourceLevel;
  water: ResourceLevel;
  shelterCapacity: number;
}

export const PARISHES = {
  KEYSTONE: {
    id: 'keystone' as const,
    name: 'Keystone',
    position: { x: 70, y: 60 }, // Southeast, near Haven
    population: 3200,
    meridianPercent: 95,
    supplyChainRole: 'manufacture' as SupplyChainRole,
    description: 'Biotech manufacturing facility and research center',
    classCharacter: {
      whoLivesHere: 'Technicians, researchers, clean room operators. Highly skilled workforce.',
      whatTheyFear: 'Contamination, facility shutdown, losing specialized jobs with no local alternatives.',
      whatTheyWant: 'Recognition for critical work, fair treatment during emergencies.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'facility', name: 'Biotech Manufacturing Plant', capacity: '200 workers/shift' },
      { type: 'cleanroom', name: 'Class 100 Clean Rooms', capacity: '12 production lines' },
      { type: 'lab', name: 'Quality Control Laboratory', capacity: '24/7 operations' },
      { type: 'storage', name: 'Cold Storage Facility', capacity: '500,000 units' },
    ] as ParishAsset[],
    resources: {
      generators: 6,
      medicalSupplies: 'low' as ResourceLevel,
      fuel: 'medium' as ResourceLevel,
      food: 'low' as ResourceLevel,
      water: 'high' as ResourceLevel, // Ultrapure water system
      shelterCapacity: 1200,
    },
    dependencies: ['heartland', 'haven'] as const, // Power, raw materials
    vulnerabilities: ['power failure', 'contamination', 'ultrapure water disruption'],
    valuesTested: ['production', 'worker-safety', 'quality', 'financial-responsibility'],
  },

  HAVEN: {
    id: 'haven' as const,
    name: 'Haven',
    position: { x: 85, y: 50 }, // East coast
    population: 5400,
    meridianPercent: 85,
    supplyChainRole: 'process' as SupplyChainRole,
    description: 'Port and processing hub with strong union presence',
    classCharacter: {
      whoLivesHere: 'Port workers, processing plant employees, union members. Working-class community.',
      whatTheyFear: 'Layoffs, safety violations, being treated as expendable.',
      whatTheyWant: 'Fair treatment, safe working conditions, job security.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'port', name: 'Main Shipping Port', capacity: '500 TEU/day' },
      { type: 'plant', name: 'Processing Facility', capacity: '300 workers' },
      { type: 'warehouse', name: 'Cold Chain Warehouse', capacity: '50,000 sq ft' },
      { type: 'station', name: 'Coast Guard Station', capacity: 45 },
    ] as ParishAsset[],
    resources: {
      generators: 8,
      medicalSupplies: 'low' as ResourceLevel,
      fuel: 'medium' as ResourceLevel,
      food: 'high' as ResourceLevel,
      water: 'medium' as ResourceLevel,
      shelterCapacity: 2000,
    },
    dependencies: ['gateway', 'heartland'] as const, // Raw materials, power
    vulnerabilities: ['storm surge', 'port flooding', 'processing shutdown'],
    valuesTested: ['worker-safety', 'solidarity', 'livelihood', 'dignity'],
  },

  GATEWAY: {
    id: 'gateway' as const,
    name: 'Gateway',
    position: { x: 15, y: 50 }, // West coast
    population: 3800,
    meridianPercent: 70,
    supplyChainRole: 'harvest' as SupplyChainRole,
    description: 'Airport and harvest operations hub, first to see approaching storms',
    classCharacter: {
      whoLivesHere: 'Harvest crews, airport staff, hospitality workers. Transient population.',
      whatTheyFear: 'Being forgotten during evacuation, stranded crews, airport closure.',
      whatTheyWant: 'Evacuation priority, clear communication, crew safety.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'airport', name: 'International Airport', capacity: '2 runways' },
      { type: 'fleet', name: 'Harvest Fleet Base', capacity: '12 vessels' },
      { type: 'depot', name: 'Aviation Fuel Depot', capacity: '2,000,000 gallons' },
      { type: 'hotels', name: 'Resort District', capacity: '3,500 rooms' },
    ] as ParishAsset[],
    resources: {
      generators: 15,
      medicalSupplies: 'medium' as ResourceLevel,
      fuel: 'high' as ResourceLevel,
      food: 'medium' as ResourceLevel,
      water: 'low' as ResourceLevel,
      shelterCapacity: 4000,
    },
    dependencies: ['heartland', 'sterling'] as const, // Power, coordination
    vulnerabilities: ['runway flooding', 'wind damage', 'fuel depot fire', 'stranded vessels'],
    valuesTested: ['crew-safety', 'quota-pressure', 'equity', 'economics'],
  },

  HEARTLAND: {
    id: 'heartland' as const,
    name: 'Heartland',
    position: { x: 45, y: 35 }, // Central crater
    population: 3400,
    meridianPercent: 90,
    supplyChainRole: 'power' as SupplyChainRole,
    description: 'Dam, utilities, and essential infrastructure in the crater',
    classCharacter: {
      whoLivesHere: 'Dam operators, utility workers, essential infrastructure staff. Critical workforce.',
      whatTheyFear: 'Being blamed for failures, impossible demands, dam failure.',
      whatTheyWant: 'Autonomy to make safety decisions, respect for expertise.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'dam', name: 'Heartland Dam', capacity: '200 MW' },
      { type: 'reservoir', name: 'Freshwater Reservoir', capacity: '50,000,000 gallons' },
      { type: 'plant', name: 'Water Treatment Plant', capacity: '10,000,000 GPD' },
      { type: 'substation', name: 'Power Distribution Hub', capacity: 'island-wide' },
    ] as ParishAsset[],
    resources: {
      generators: 25, // Backup for critical infrastructure
      medicalSupplies: 'low' as ResourceLevel,
      fuel: 'high' as ResourceLevel,
      food: 'low' as ResourceLevel,
      water: 'high' as ResourceLevel,
      shelterCapacity: 800,
    },
    dependencies: ['summit'] as const, // Coordination only
    vulnerabilities: ['dam stress', 'flooding', 'cascading power failure', 'isolated during storm'],
    valuesTested: ['system-integrity', 'safety', 'demand-pressure', 'expertise'],
  },

  SUMMIT: {
    id: 'summit' as const,
    name: 'Summit',
    position: { x: 50, y: 20 }, // Northern highlands
    population: 2100,
    meridianPercent: 95,
    supplyChainRole: 'coordinate' as SupplyChainRole,
    description: 'Executive headquarters and communications hub on high ground',
    classCharacter: {
      whoLivesHere: 'Executives, scientists, corporate leadership. Safest location on island.',
      whatTheyFear: 'Exposure of decisions, liability, loss of control.',
      whatTheyWant: 'Control over narrative, protection of company interests.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'hq', name: 'Meridian Corporate HQ', capacity: '500 executives' },
      { type: 'tower', name: 'Emergency Radio Tower', capacity: 'island-wide' },
      { type: 'bunker', name: 'Executive Emergency Shelter', capacity: 200 },
      { type: 'lab', name: 'Research Campus', capacity: '150 scientists' },
    ] as ParishAsset[],
    resources: {
      generators: 12,
      medicalSupplies: 'high' as ResourceLevel,
      fuel: 'low' as ResourceLevel,
      food: 'high' as ResourceLevel,
      water: 'medium' as ResourceLevel,
      shelterCapacity: 1500,
    },
    dependencies: ['heartland', 'gateway'] as const, // Power, external comms
    vulnerabilities: ['communications tower collapse', 'road isolation', 'information blackout'],
    valuesTested: ['shareholder-value', 'transparency', 'equity', 'accountability'],
  },

  STERLING: {
    id: 'sterling' as const,
    name: 'Sterling',
    position: { x: 50, y: 85 }, // South
    population: 6200,
    meridianPercent: 35,
    supplyChainRole: 'ship' as SupplyChainRole,
    description: 'Government center with hospital, schools, and non-Meridian families',
    classCharacter: {
      whoLivesHere: 'Service workers, teachers, healthcare staff, non-Meridian families. Most vulnerable population.',
      whatTheyFear: 'Abandonment, being deprioritized, inequality in emergency response.',
      whatTheyWant: 'Equality, fair access to resources, community-first decisions.',
    } as ClassCharacter,
    keyAssets: [
      { type: 'hospital', name: 'Sterling General Hospital', capacity: '200 beds' },
      { type: 'complex', name: 'Government Complex', capacity: 2000 },
      { type: 'broadcast', name: 'Emergency Broadcast Center', capacity: '100% island coverage' },
      { type: 'schools', name: 'School District', capacity: '3,000 students' },
    ] as ParishAsset[],
    resources: {
      generators: 10,
      medicalSupplies: 'high' as ResourceLevel,
      fuel: 'medium' as ResourceLevel,
      food: 'medium' as ResourceLevel,
      water: 'medium' as ResourceLevel,
      shelterCapacity: 3500,
    },
    dependencies: ['haven', 'summit', 'gateway', 'heartland'] as const, // All parishes
    vulnerabilities: ['shelter overflow', 'hospital overwhelm', 'communications failure', 'flooding'],
    valuesTested: ['community', 'equity', 'compassion', 'accountability'],
  },
} as const;

export type ParishId = keyof typeof PARISHES;
export type ParishIdLower = (typeof PARISHES)[ParishId]['id'];

export const PARISH_IDS = Object.keys(PARISHES) as ParishId[];
export const PARISH_IDS_LOWER = Object.values(PARISHES).map((p) => p.id) as ParishIdLower[];

// ============================================================================
// INFRASTRUCTURE TOPOLOGY
// ============================================================================

export const RING_ROAD = {
  segments: [
    { from: 'gateway' as const, to: 'sterling' as const, km: 12, normalMin: 15, degradedMin: 45 },
    { from: 'sterling' as const, to: 'haven' as const, km: 10, normalMin: 12, degradedMin: 40 },
    { from: 'haven' as const, to: 'keystone' as const, km: 8, normalMin: 10, degradedMin: 30 },
    { from: 'keystone' as const, to: 'gateway' as const, km: 12, normalMin: 15, degradedMin: 45 },
  ],
  totalKm: 42,
} as const;

export const CRATER_ROADS = {
  segments: [
    { from: 'ring' as const, to: 'summit' as const, km: 4, normalMin: 8, stormPassable: false },
    { from: 'ring' as const, to: 'heartland' as const, km: 3, normalMin: 6, stormPassable: false },
    { from: 'summit' as const, to: 'heartland' as const, km: 2, normalMin: 4, floodRisk: true },
  ],
} as const;

export const INFRASTRUCTURE = {
  power: {
    source: 'heartland' as const, // Dam
    priority: ['keystone', 'summit'] as const, // Keystone needs constant power for clean rooms
    backupGenerators: {
      summit: true,
      keystone: true,
      sterling: false,
      haven: false,
      gateway: true, // Airport
      heartland: true, // Critical infrastructure
    },
  },
  water: {
    source: 'heartland' as const, // Reservoir
    ultrapureRequired: ['keystone'] as const, // Biotech needs ultrapure
    treatment: 'heartland' as const,
  },
  comms: {
    primary: 'summit' as const, // Island-wide tower
    external: 'gateway' as const, // Airport connects to mainland
    backup: 'sterling' as const, // Emergency broadcast
  },
} as const;

// ============================================================================
// SUPPLY CHAIN
// ============================================================================

export const SUPPLY_CHAIN = {
  steps: [
    { stage: 'harvest' as const, parish: 'gateway' as const, hoursToNext: 4 },
    { stage: 'transport-in' as const, parish: 'haven' as const, hoursToNext: 2 },
    { stage: 'process' as const, parish: 'haven' as const, hoursToNext: 8 },
    { stage: 'manufacture' as const, parish: 'keystone' as const, hoursToNext: 12 },
    { stage: 'transport-out' as const, parish: 'haven' as const, hoursToNext: 2 },
    { stage: 'ship' as const, parish: 'haven' as const, hoursToNext: 0 },
  ],
  totalCycleHours: 28,
  interruptionCostPerHour: 2400000, // $2.4M/hour
  productName: 'BioCore-7 pharmaceutical compound',
} as const;

// ============================================================================
// PARISH DEPENDENCIES (Updated for 6 parishes)
// ============================================================================

export const PARISH_DEPENDENCIES: Record<
  ParishId,
  {
    dependsOn: ParishId[];
    providesTo: ParishId[];
    criticalResources: string[];
  }
> = {
  KEYSTONE: {
    dependsOn: ['HEARTLAND', 'HAVEN'],
    providesTo: ['HAVEN'],
    criticalResources: ['biotech-manufacturing', 'quality-control', 'cold-storage'],
  },
  HAVEN: {
    dependsOn: ['GATEWAY', 'HEARTLAND', 'KEYSTONE'],
    providesTo: ['KEYSTONE', 'STERLING'],
    criticalResources: ['port-access', 'processing', 'cold-chain'],
  },
  GATEWAY: {
    dependsOn: ['HEARTLAND', 'STERLING'],
    providesTo: ['HAVEN', 'SUMMIT', 'HEARTLAND'],
    criticalResources: ['air-evacuation', 'harvest', 'external-supplies', 'fuel'],
  },
  HEARTLAND: {
    dependsOn: ['SUMMIT'],
    providesTo: ['KEYSTONE', 'HAVEN', 'GATEWAY', 'STERLING', 'SUMMIT'],
    criticalResources: ['power', 'freshwater', 'ultrapure-water'],
  },
  SUMMIT: {
    dependsOn: ['HEARTLAND', 'GATEWAY'],
    providesTo: ['HEARTLAND', 'STERLING', 'KEYSTONE', 'HAVEN', 'GATEWAY'],
    criticalResources: ['coordination', 'radio-communications', 'corporate-authority'],
  },
  STERLING: {
    dependsOn: ['HAVEN', 'SUMMIT', 'GATEWAY', 'HEARTLAND'],
    providesTo: ['HAVEN', 'GATEWAY'],
    criticalResources: ['medical-care', 'emergency-broadcast', 'government-coordination', 'shelter'],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get parish by lowercase ID
 */
export function getParishByLowerId(id: string) {
  return Object.values(PARISHES).find((p) => p.id === id);
}

/**
 * Get parish key by lowercase ID
 */
export function getParishKeyByLowerId(id: string): ParishId | undefined {
  const entry = Object.entries(PARISHES).find(([, v]) => v.id === id);
  return entry?.[0] as ParishId | undefined;
}

/**
 * Get travel time between two parishes
 */
export function getTravelTime(
  from: ParishIdLower,
  to: ParishIdLower,
  conditions: 'normal' | 'degraded' = 'normal'
): number | null {
  // Check ring road
  const ringSegment = RING_ROAD.segments.find(
    (s) => (s.from === from && s.to === to) || (s.from === to && s.to === from)
  );
  if (ringSegment) {
    return conditions === 'normal' ? ringSegment.normalMin : ringSegment.degradedMin;
  }

  // Check crater roads
  if (from === 'summit' || to === 'summit' || from === 'heartland' || to === 'heartland') {
    const craterSegment = CRATER_ROADS.segments.find(
      (s) =>
        (s.from === from && s.to === to) ||
        (s.from === to && s.to === from) ||
        (s.to === from && s.from === 'ring') ||
        (s.to === to && s.from === 'ring')
    );
    if (craterSegment) {
      // Check if road is passable in degraded conditions
      // stormPassable: false means road is closed during storm
      // floodRisk: true means road may flood but is still passable
      const isStormPassable = 'stormPassable' in craterSegment ? craterSegment.stormPassable : true;
      if (conditions === 'degraded' && !isStormPassable) {
        return null; // Impassable
      }
      return craterSegment.normalMin;
    }
  }

  return null; // No direct route
}

/**
 * Check if a parish has power during a given infrastructure state
 */
export function hasPower(parishId: ParishIdLower, availableParishes: ParishIdLower[]): boolean {
  return availableParishes.includes(parishId);
}

/**
 * Get total island population
 */
export function getTotalPopulation(): number {
  return Object.values(PARISHES).reduce((sum, p) => sum + p.population, 0);
}

/**
 * Get Meridian employee count
 */
export function getMeridianEmployeeCount(): number {
  return Object.values(PARISHES).reduce(
    (sum, p) => sum + Math.round(p.population * (p.meridianPercent / 100)),
    0
  );
}
