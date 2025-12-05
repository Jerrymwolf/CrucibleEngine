/**
 * Concordia Island Geography and Parish Definitions
 * The fixed geography for The Values Crucible simulation
 */

export const PARISHES = {
  HAVEN: {
    id: 'haven',
    name: 'Haven',
    position: { x: 85, y: 50 }, // % of map (east coast)
    population: 45000,
    description: 'Maritime hub and fishing community',
    keyAssets: [
      { type: 'port', name: 'Main Port', capacity: 500 },
      { type: 'fleet', name: 'Fishing Fleet', vessels: 120 },
      { type: 'station', name: 'Coast Guard Station', personnel: 45 },
    ],
    resources: {
      generators: 8,
      medicalSupplies: 'low' as const,
      fuel: 'medium' as const,
      food: 'high' as const,
      shelterCapacity: 12000,
    },
    dependencies: ['gateway', 'heartland', 'summit'], // fuel, medical, comms
    vulnerabilities: ['storm surge', 'flooding', 'port damage'],
  },

  SUMMIT: {
    id: 'summit',
    name: 'Summit',
    position: { x: 50, y: 20 }, // mountains, north-central
    population: 38000,
    description: 'Agricultural highlands and water source',
    keyAssets: [
      { type: 'reservoir', name: 'Freshwater Reservoir', gallons: 50000000 },
      { type: 'tower', name: 'Emergency Radio Tower', range: 'island-wide' },
      { type: 'farms', name: 'Agricultural District', acres: 8500 },
    ],
    resources: {
      generators: 12,
      medicalSupplies: 'low' as const,
      fuel: 'low' as const,
      food: 'high' as const,
      shelterCapacity: 15000,
    },
    dependencies: ['haven', 'heartland'], // supplies, power
    vulnerabilities: ['landslides', 'road damage', 'tower collapse'],
  },

  GATEWAY: {
    id: 'gateway',
    name: 'Gateway',
    position: { x: 15, y: 50 }, // west coast
    population: 52000,
    description: 'International airport and tourism hub',
    keyAssets: [
      { type: 'airport', name: 'International Airport', runways: 2 },
      { type: 'hotels', name: 'Resort District', rooms: 3500 },
      { type: 'depot', name: 'Fuel Depot', gallons: 2000000 },
    ],
    resources: {
      generators: 20,
      medicalSupplies: 'medium' as const,
      fuel: 'high' as const,
      food: 'medium' as const,
      shelterCapacity: 18000,
    },
    dependencies: ['sterling', 'heartland'], // financial, medical
    vulnerabilities: ['wind damage', 'runway flooding', 'fuel fire'],
  },

  HEARTLAND: {
    id: 'heartland',
    name: 'Heartland',
    position: { x: 50, y: 55 }, // central
    population: 41000,
    description: 'Medical center and manufacturing',
    keyAssets: [
      { type: 'hospital', name: 'Regional Hospital', beds: 450 },
      { type: 'plant', name: 'Power Plant', megawatts: 200 },
      { type: 'factory', name: 'Manufacturing District', workers: 5000 },
    ],
    resources: {
      generators: 15,
      medicalSupplies: 'high' as const,
      fuel: 'medium' as const,
      food: 'medium' as const,
      shelterCapacity: 14000,
    },
    dependencies: ['gateway', 'summit'], // fuel, water
    vulnerabilities: ['power failure', 'hospital overwhelm', 'infrastructure'],
  },

  STERLING: {
    id: 'sterling',
    name: 'Sterling',
    position: { x: 50, y: 85 }, // south
    population: 35000,
    description: 'Government center and coordination hub',
    keyAssets: [
      { type: 'complex', name: 'Government Complex', capacity: 2000 },
      { type: 'bank', name: 'Central Bank', reserves: 'classified' },
      { type: 'broadcast', name: 'Emergency Broadcast Center', reach: '100%' },
    ],
    resources: {
      generators: 10,
      medicalSupplies: 'medium' as const,
      fuel: 'medium' as const,
      food: 'low' as const,
      shelterCapacity: 10000,
    },
    dependencies: ['haven', 'summit', 'gateway', 'heartland'], // all
    vulnerabilities: ['communications failure', 'government disruption'],
  },
} as const;

export type ParishId = keyof typeof PARISHES;
export type ParishIdLower = (typeof PARISHES)[ParishId]['id'];

export const PARISH_IDS = Object.keys(PARISHES) as ParishId[];
export const PARISH_IDS_LOWER = Object.values(PARISHES).map((p) => p.id) as ParishIdLower[];

export const PARISH_DEPENDENCIES: Record<
  ParishId,
  {
    dependsOn: ParishId[];
    providesTo: ParishId[];
    criticalResources: string[];
  }
> = {
  HAVEN: {
    dependsOn: ['GATEWAY', 'HEARTLAND', 'SUMMIT'],
    providesTo: ['SUMMIT', 'STERLING'],
    criticalResources: ['seafood', 'port-access', 'coast-guard'],
  },
  SUMMIT: {
    dependsOn: ['HAVEN', 'HEARTLAND'],
    providesTo: ['HEARTLAND', 'STERLING', 'GATEWAY', 'HAVEN'],
    criticalResources: ['freshwater', 'radio-communications', 'agriculture'],
  },
  GATEWAY: {
    dependsOn: ['STERLING', 'HEARTLAND'],
    providesTo: ['HEARTLAND', 'HAVEN', 'SUMMIT', 'STERLING'],
    criticalResources: ['fuel', 'air-evacuation', 'external-supplies'],
  },
  HEARTLAND: {
    dependsOn: ['GATEWAY', 'SUMMIT'],
    providesTo: ['HAVEN', 'GATEWAY', 'STERLING', 'SUMMIT'],
    criticalResources: ['medical-care', 'power', 'manufacturing'],
  },
  STERLING: {
    dependsOn: ['HAVEN', 'SUMMIT', 'GATEWAY', 'HEARTLAND'],
    providesTo: ['HAVEN', 'SUMMIT', 'GATEWAY', 'HEARTLAND'],
    criticalResources: ['coordination', 'emergency-broadcast', 'financial'],
  },
};

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
