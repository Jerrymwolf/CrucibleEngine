/**
 * Production Economics - Celaritrin Manufacturing
 *
 * The math that creates authentic values pressure:
 * - Children with cancer waiting for medication
 * - Workers in harm's way on the island
 * - Revenue ticking down in real-time
 * - Bonus money at stake
 *
 * Neither choice is wrong. Neither choice is right. That's the point.
 */

export const PRODUCTION_ECONOMICS = {
  // Batch economics
  BATCH_VALUE: 8_200_000, // $8.2M per batch
  BATCHES_PER_DAY: 6,
  BATCH_DURATION_HOURS: 48,
  CLEAN_ROOMS: 12,

  // Revenue rates
  DAILY_REVENUE: 49_200_000, // $49.2M/day
  HOURLY_REVENUE: 2_050_000, // $2.05M/hour
  MINUTE_REVENUE: 34_166, // ~$34K/minute

  // Quarterly targets
  QUARTERLY_TARGET: 4_200_000_000, // $4.2B
  STARTING_PROGRESS: 2_600_000_000, // 62% ($2.6B)
  DAYS_REMAINING: 18,

  // Patient impact
  TOTAL_PATIENTS: 340_000,
  CHILDREN_PERCENTAGE: 0.14, // 14% are children (~47,000)
  PATIENTS_PER_HOUR: 39, // affected by stoppage
  PATIENTS_PER_DAY: 932,
  STOCKPILE_WEEKS: 6.0,

  // Worker counts by parish
  WORKERS_BY_PARISH: {
    keystone: 247, // Manufacturing - highest risk
    haven: 186, // Port/processing
    gateway: 142, // Harvest fleet
    heartland: 89, // Utilities
    summit: 34, // HQ
    sterling: 12, // Community liaison
  } as const,

  // Total workers on island
  TOTAL_WORKERS: 710,

  // Pipeline stages - how production flows through the island
  PIPELINE: [
    { parish: 'gateway', stage: 'harvest', durationHours: 4 },
    { parish: 'haven', stage: 'process', durationHours: 10 },
    { parish: 'keystone', stage: 'manufacture', durationHours: 12 },
    { parish: 'haven', stage: 'ship', durationHours: 2 },
  ] as const,

  // Bonus structure (for narrative pressure)
  BONUS: {
    WORKER_PERCENTAGE: 0.15, // 15% bonus if target hit
    WORKER_AVERAGE_BONUS: 12_000, // $12K average
    MANAGER_PERCENTAGE: 0.25, // 25% for parish managers
    EXECUTIVE_PERCENTAGE: 0.4, // 40% for executives
    TOTAL_AT_STAKE: 204_000_000, // $204M in bonuses at risk
  } as const,

  // Infrastructure thresholds that block production
  INFRASTRUCTURE_THRESHOLDS: {
    POWER_MIN: 30, // Pipeline blocked if power < 30%
    ROADS_MIN: 20, // Pipeline blocked if roads < 20%
    PORT_MIN: 30, // Haven port must be operational
    AIRPORT_MIN: 30, // Gateway airport must be operational
  } as const,
} as const;

export type PipelineStage = (typeof PRODUCTION_ECONOMICS.PIPELINE)[number];
export type ParishWithWorkers = keyof typeof PRODUCTION_ECONOMICS.WORKERS_BY_PARISH;

/**
 * Calculate workers at risk for a given intensity level
 */
export function calculateWorkersAtRisk(
  intensity: number,
  evacuatedParishes: string[]
): number {
  if (intensity < 6) return 0;

  let atRisk = 0;
  for (const [parish, count] of Object.entries(
    PRODUCTION_ECONOMICS.WORKERS_BY_PARISH
  )) {
    if (!evacuatedParishes.includes(parish)) {
      atRisk += count;
    }
  }
  return atRisk;
}

/**
 * Calculate patients affected by production hours lost
 */
export function calculatePatientsAffected(productionHoursLost: number): {
  total: number;
  children: number;
} {
  const total = Math.floor(
    productionHoursLost * PRODUCTION_ECONOMICS.PATIENTS_PER_HOUR
  );
  const children = Math.floor(
    total * PRODUCTION_ECONOMICS.CHILDREN_PERCENTAGE
  );
  return { total, children };
}

/**
 * Calculate stockpile depletion
 */
export function calculateStockpileWeeks(productionHoursLost: number): number {
  const weeksLost = productionHoursLost / (24 * 7);
  return Math.max(0, PRODUCTION_ECONOMICS.STOCKPILE_WEEKS - weeksLost);
}
