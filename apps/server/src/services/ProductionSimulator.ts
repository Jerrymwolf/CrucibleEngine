/**
 * Production Simulator Service
 *
 * Simulates Celaritrin production on Concordia Island.
 * Creates the authentic values pressure through:
 * - Revenue loss when pipeline blocked
 * - Patient impact counters
 * - Worker risk tracking
 *
 * Called every simulation tick (5 seconds = 1 simulation minute)
 */

import {
  PRODUCTION_ECONOMICS,
  calculatePatientsAffected,
  calculateStockpileWeeks,
} from '@crucible/shared';
import type { CrucibleState } from '../schema/CrucibleState.js';

export class ProductionSimulator {
  private static instance: ProductionSimulator;

  static getInstance(): ProductionSimulator {
    if (!this.instance) {
      this.instance = new ProductionSimulator();
    }
    return this.instance;
  }

  /**
   * Update production state - called every simulation tick
   * @param state The Colyseus game state
   */
  update(state: CrucibleState): void {
    this.updatePipelineStatus(state);

    if (state.production.pipelineStatus === 'flowing') {
      this.advanceProduction(state);
    } else {
      this.accumulateLosses(state);
    }

    this.updateWorkerRisk(state);
  }

  /**
   * Check if pipeline is blocked by checking infrastructure at each stage
   */
  private updatePipelineStatus(state: CrucibleState): void {
    const { PIPELINE, INFRASTRUCTURE_THRESHOLDS } = PRODUCTION_ECONOMICS;

    // Check each pipeline stage for blockage
    for (const stage of PIPELINE) {
      const parish = state.parishes.get(stage.parish);
      if (!parish) continue;

      // Pipeline blocked if parish infrastructure too low
      const isBlocked =
        parish.status.power < INFRASTRUCTURE_THRESHOLDS.POWER_MIN ||
        parish.status.roads < INFRASTRUCTURE_THRESHOLDS.ROADS_MIN ||
        (stage.parish === 'haven' &&
          parish.status.port < INFRASTRUCTURE_THRESHOLDS.PORT_MIN) ||
        (stage.parish === 'gateway' &&
          parish.status.airport < INFRASTRUCTURE_THRESHOLDS.AIRPORT_MIN);

      if (isBlocked) {
        state.production.pipelineStatus = 'blocked';
        state.production.bottleneck = stage.parish;
        state.production.burnRateActive = true;
        return;
      }
    }

    // All clear - pipeline is flowing
    state.production.pipelineStatus = 'flowing';
    state.production.bottleneck = '';
    state.production.burnRateActive = false;
  }

  /**
   * Advance production when pipeline is flowing
   * Progress batch and complete when done
   */
  private advanceProduction(state: CrucibleState): void {
    const { BATCH_DURATION_HOURS, BATCH_VALUE } = PRODUCTION_ECONOMICS;

    // Advance batch progress (1 minute = 1/(48*60) of 48-hour batch)
    const progressPerMinute = 100 / (BATCH_DURATION_HOURS * 60);
    state.production.batchProgress += progressPerMinute;
    state.production.batchEtaHours =
      ((100 - state.production.batchProgress) / progressPerMinute) / 60;

    // Complete batch when progress reaches 100%
    if (state.production.batchProgress >= 100) {
      state.production.quarterlyProgress += BATCH_VALUE;
      state.production.batchProgress = 0;
      state.production.currentBatchId = this.generateBatchId();
      state.production.batchEtaHours = BATCH_DURATION_HOURS;
    }
  }

  /**
   * Accumulate losses when production is blocked
   * Updates revenue impact and patient counters
   */
  private accumulateLosses(state: CrucibleState): void {
    const { MINUTE_REVENUE } = PRODUCTION_ECONOMICS;

    // Lose ~$34K per minute
    state.production.revenueImpact -= MINUTE_REVENUE;
    state.production.productionHoursLost += 1 / 60;

    // Update patient impact using shared helper
    const patientImpact = calculatePatientsAffected(
      state.production.productionHoursLost
    );
    state.production.patientsAffected = patientImpact.total;
    state.production.childrenAffected = patientImpact.children;

    // Deplete stockpile
    state.production.globalStockpileWeeks = calculateStockpileWeeks(
      state.production.productionHoursLost
    );
  }

  /**
   * Update worker risk based on evacuation status and intensity
   */
  private updateWorkerRisk(state: CrucibleState): void {
    const { WORKERS_BY_PARISH } = PRODUCTION_ECONOMICS;
    let totalAtRisk = 0;
    let totalEvacuated = 0;

    for (const [parishId, count] of Object.entries(WORKERS_BY_PARISH)) {
      const parish = state.parishes.get(parishId);
      if (!parish) continue;

      if (parish.status.evacuationStatus === 'complete') {
        totalEvacuated += count;
      } else if (state.intensity.global >= 6) {
        // At high intensity, workers still on-site are at risk
        totalAtRisk += count;
      }
    }

    state.production.workersAtRisk = totalAtRisk;
    state.production.workersEvacuated = totalEvacuated;
  }

  /**
   * Generate a new batch ID in format KS-XXXX
   */
  private generateBatchId(): string {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `KS-${num}`;
  }

  /**
   * Reset production state (for new sessions)
   */
  resetProduction(state: CrucibleState): void {
    const { QUARTERLY_TARGET, STARTING_PROGRESS, DAYS_REMAINING, BATCH_VALUE, STOCKPILE_WEEKS, BATCH_DURATION_HOURS } =
      PRODUCTION_ECONOMICS;

    state.production.currentBatchId = this.generateBatchId();
    state.production.batchProgress = 0;
    state.production.batchValue = BATCH_VALUE;
    state.production.batchEtaHours = BATCH_DURATION_HOURS;

    state.production.pipelineStatus = 'flowing';
    state.production.bottleneck = '';

    state.production.revenueImpact = 0;
    state.production.productionHoursLost = 0;
    state.production.burnRateActive = false;

    state.production.quarterlyTarget = QUARTERLY_TARGET;
    state.production.quarterlyProgress = STARTING_PROGRESS;
    state.production.daysRemainingInQuarter = DAYS_REMAINING;

    state.production.patientsAffected = 0;
    state.production.childrenAffected = 0;
    state.production.workersAtRisk = 0;
    state.production.workersEvacuated = 0;
    state.production.globalStockpileWeeks = STOCKPILE_WEEKS;
  }

  /**
   * Get a summary of the current production state for logging
   */
  getProductionSummary(state: CrucibleState): string {
    const p = state.production;
    const quarterlyPercent =
      ((p.quarterlyProgress / p.quarterlyTarget) * 100).toFixed(1);

    return [
      `Pipeline: ${p.pipelineStatus}${p.bottleneck ? ` (blocked at ${p.bottleneck})` : ''}`,
      `Batch: ${p.currentBatchId} @ ${p.batchProgress.toFixed(1)}%`,
      `Q3: ${quarterlyPercent}% ($${(p.quarterlyProgress / 1e9).toFixed(2)}B)`,
      `Revenue Impact: $${(p.revenueImpact / 1e6).toFixed(1)}M`,
      `Workers: ${p.workersAtRisk} at risk, ${p.workersEvacuated} evacuated`,
      `Patients: ${p.patientsAffected} affected (${p.childrenAffected} children)`,
      `Stockpile: ${p.globalStockpileWeeks.toFixed(1)} weeks`,
    ].join(' | ');
  }
}

/**
 * Get singleton instance of ProductionSimulator
 */
export function getProductionSimulator(): ProductionSimulator {
  return ProductionSimulator.getInstance();
}
