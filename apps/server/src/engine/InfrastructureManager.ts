/**
 * InfrastructureManager
 *
 * Manages infrastructure status across all parishes and handles cascade failures.
 * Infrastructure includes: power, communications, roads, water, hospital, port, airport.
 *
 * Key cascade patterns:
 * 1. Dam (Heartland) stress → power failure downstream
 * 2. Power failure to Keystone → clean room contamination risk
 * 3. Road closures → resource transfer blocked
 * 4. Port damage → supply chain interruption
 * 5. Communication tower → coordination breakdown
 */

import { EventEmitter } from 'events';
import type {
  InfrastructureStatus,
  InfrastructureCascadeRule,
  CascadeEvent,
  InfrastructureManagerState,
  InfrastructureSystem,
} from '@crucible/shared';
import type { ParishIdLower, TimelinePhase, TimelineWeather } from '@crucible/shared';
import {
  CASCADE_RULES,
  INITIAL_INFRASTRUCTURE_STATUS,
  INFRASTRUCTURE_THRESHOLDS,
  DEGRADATION_RATES,
  getTriggeredCascades,
  isParishIsolated,
  getReachableParishes,
} from '@crucible/shared';

// ============================================================================
// INFRASTRUCTURE MANAGER EVENTS
// ============================================================================

export interface InfrastructureManagerEvents {
  statusChanged: (status: InfrastructureStatus) => void;
  cascadeTriggered: (event: CascadeEvent) => void;
  effectApplied: (effect: CascadeEvent['effects'][0], rule: InfrastructureCascadeRule) => void;
  systemFailed: (parishId: ParishIdLower, system: InfrastructureSystem) => void;
  parishIsolated: (parishId: ParishIdLower) => void;
}

// ============================================================================
// INFRASTRUCTURE MANAGER
// ============================================================================

export class InfrastructureManager extends EventEmitter {
  private state: InfrastructureManagerState;
  private cascadeRules: InfrastructureCascadeRule[];
  private currentSimulationTime: number = 0;
  private triggeredCascadeIds: Set<string> = new Set();

  constructor() {
    super();

    // Initialize status map from initial values
    const statuses = new Map<string, InfrastructureStatus>();
    const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];
    const systems: InfrastructureSystem[] = ['power', 'communications', 'roads', 'water', 'hospital', 'port', 'airport'];

    for (const parish of parishes) {
      for (const system of systems) {
        const key = `${parish}:${system}`;
        const initialStatus = INITIAL_INFRASTRUCTURE_STATUS[parish]?.[system] ?? 100;

        statuses.set(key, {
          system,
          parishId: parish,
          statusLevel: initialStatus,
          operational: initialStatus > INFRASTRUCTURE_THRESHOLDS.FAILED,
          statusReason: undefined,
          lastChanged: Date.now(),
        });
      }
    }

    this.state = {
      statuses,
      activeCascades: [],
      pendingEffects: [],
    };

    this.cascadeRules = CASCADE_RULES;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get the status of a specific infrastructure system in a parish
   */
  getStatus(parishId: ParishIdLower, system: InfrastructureSystem): InfrastructureStatus | undefined {
    return this.state.statuses.get(`${parishId}:${system}`);
  }

  /**
   * Get all infrastructure statuses for a parish
   */
  getParishStatuses(parishId: ParishIdLower): Map<InfrastructureSystem, InfrastructureStatus> {
    const result = new Map<InfrastructureSystem, InfrastructureStatus>();
    const systems: InfrastructureSystem[] = ['power', 'communications', 'roads', 'water', 'hospital', 'port', 'airport'];

    for (const system of systems) {
      const status = this.state.statuses.get(`${parishId}:${system}`);
      if (status) {
        result.set(system, { ...status });
      }
    }

    return result;
  }

  /**
   * Get all statuses
   */
  getAllStatuses(): Map<string, InfrastructureStatus> {
    const result = new Map<string, InfrastructureStatus>();
    for (const [key, status] of this.state.statuses) {
      result.set(key, { ...status });
    }
    return result;
  }

  /**
   * Get full state
   */
  getState(): InfrastructureManagerState {
    return {
      statuses: this.getAllStatuses(),
      activeCascades: [...this.state.activeCascades],
      pendingEffects: [...this.state.pendingEffects],
    };
  }

  /**
   * Apply weather degradation based on current phase
   */
  applyWeatherDegradation(phase: TimelinePhase, _weather: TimelineWeather): void {
    // Map timeline phases to degradation rate keys
    const phaseToRateKey: Record<TimelinePhase, keyof typeof DEGRADATION_RATES> = {
      watch: 'watch',
      warning: 'warning',
      approach: 'crisis',
      landfall: 'crisis',
      eye: 'crisis',
      recovery: 'recovery',
    };

    const rateKey = phaseToRateKey[phase];
    const rates = DEGRADATION_RATES[rateKey];
    if (!rates) return;

    const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];

    for (const parish of parishes) {
      for (const [systemStr, rate] of Object.entries(rates)) {
        const system = systemStr as InfrastructureSystem;
        if (rate === 0) continue;

        // Apply degradation (or recovery if negative)
        this.modifyStatus(parish, system, -rate, `Weather degradation (${phase})`);
      }
    }

    // Check for cascades after weather degradation
    this.checkForCascades();
  }

  /**
   * Modify infrastructure status
   */
  modifyStatus(
    parishId: ParishIdLower,
    system: InfrastructureSystem,
    delta: number,
    reason?: string
  ): void {
    const key = `${parishId}:${system}`;
    const status = this.state.statuses.get(key);
    if (!status) return;

    const oldLevel = status.statusLevel;
    const wasOperational = status.operational;

    // Apply change
    status.statusLevel = Math.max(0, Math.min(100, status.statusLevel + delta));
    status.operational = status.statusLevel > INFRASTRUCTURE_THRESHOLDS.FAILED;
    status.statusReason = reason;
    status.lastChanged = Date.now();

    // Emit events
    if (status.statusLevel !== oldLevel) {
      this.emit('statusChanged', { ...status });
    }

    // Check for system failure
    if (wasOperational && !status.operational) {
      this.emit('systemFailed', parishId, system);

      // Check if parish is now isolated
      if (isParishIsolated(parishId, this.getStatusMap())) {
        this.emit('parishIsolated', parishId);
      }
    }

    // Check for cascades
    this.checkForCascades();
  }

  /**
   * Set infrastructure status directly
   */
  setStatus(
    parishId: ParishIdLower,
    system: InfrastructureSystem,
    level: number,
    reason?: string
  ): void {
    const key = `${parishId}:${system}`;
    const status = this.state.statuses.get(key);
    if (!status) return;

    const wasOperational = status.operational;

    status.statusLevel = Math.max(0, Math.min(100, level));
    status.operational = level > INFRASTRUCTURE_THRESHOLDS.FAILED;
    status.statusReason = reason;
    status.lastChanged = Date.now();

    this.emit('statusChanged', { ...status });

    if (wasOperational && !status.operational) {
      this.emit('systemFailed', parishId, system);
    }

    this.checkForCascades();
  }

  /**
   * Update simulation time and process pending effects
   */
  tick(simulationTimeMinutes: number): void {
    this.currentSimulationTime = simulationTimeMinutes;

    // Process pending effects that are due
    const dueEffects = this.state.pendingEffects.filter(
      (pe) => simulationTimeMinutes >= pe.applyAt
    );

    for (const pending of dueEffects) {
      const rule = this.cascadeRules.find((r) => r.id === pending.ruleId);
      if (rule) {
        this.applyEffect(pending.effect, rule);
      }
    }

    // Remove applied effects
    this.state.pendingEffects = this.state.pendingEffects.filter(
      (pe) => simulationTimeMinutes < pe.applyAt
    );
  }

  /**
   * Check if resources can be transferred between parishes
   */
  canTransferResources(from: ParishIdLower, to: ParishIdLower): boolean {
    const fromRoads = this.getStatus(from, 'roads');
    const toRoads = this.getStatus(to, 'roads');

    return (
      (fromRoads?.operational ?? false) &&
      (toRoads?.operational ?? false)
    );
  }

  /**
   * Check if communication is possible between parishes
   */
  canCommunicate(from: ParishIdLower, to: ParishIdLower): boolean {
    const fromComms = this.getStatus(from, 'communications');
    const toComms = this.getStatus(to, 'communications');

    return (
      (fromComms?.operational ?? false) &&
      (toComms?.operational ?? false)
    );
  }

  /**
   * Get reachable parishes from a given parish
   */
  getReachableParishes(from: ParishIdLower): ParishIdLower[] {
    return getReachableParishes(from, this.getStatusMap());
  }

  /**
   * Check if a parish is isolated
   */
  isParishIsolated(parishId: ParishIdLower): boolean {
    return isParishIsolated(parishId, this.getStatusMap());
  }

  /**
   * Get summary of failed systems
   */
  getFailedSystems(): { parishId: ParishIdLower; system: InfrastructureSystem }[] {
    const failed: { parishId: ParishIdLower; system: InfrastructureSystem }[] = [];

    for (const status of this.state.statuses.values()) {
      if (!status.operational) {
        failed.push({
          parishId: status.parishId,
          system: status.system,
        });
      }
    }

    return failed;
  }

  /**
   * Get active cascades
   */
  getActiveCascades(): CascadeEvent[] {
    return [...this.state.activeCascades];
  }

  /**
   * Reset all infrastructure to initial state
   */
  reset(): void {
    this.triggeredCascadeIds.clear();
    this.state.activeCascades = [];
    this.state.pendingEffects = [];

    const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];
    const systems: InfrastructureSystem[] = ['power', 'communications', 'roads', 'water', 'hospital', 'port', 'airport'];

    for (const parish of parishes) {
      for (const system of systems) {
        const key = `${parish}:${system}`;
        const initialStatus = INITIAL_INFRASTRUCTURE_STATUS[parish]?.[system] ?? 100;

        this.state.statuses.set(key, {
          system,
          parishId: parish,
          statusLevel: initialStatus,
          operational: initialStatus > INFRASTRUCTURE_THRESHOLDS.FAILED,
          statusReason: undefined,
          lastChanged: Date.now(),
        });
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Check for and trigger cascade effects
   */
  private checkForCascades(): void {
    const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];
    const systems: InfrastructureSystem[] = ['power', 'communications', 'roads', 'water', 'hospital', 'port', 'airport'];

    for (const parish of parishes) {
      for (const system of systems) {
        const status = this.state.statuses.get(`${parish}:${system}`);
        if (!status) continue;

        // Get triggered cascades for this status
        const cascades = getTriggeredCascades(parish, system, status.statusLevel);

        for (const cascade of cascades) {
          // Check if already triggered
          if (this.triggeredCascadeIds.has(cascade.id)) continue;

          // Mark as triggered
          this.triggeredCascadeIds.add(cascade.id);

          // Schedule effects
          const cascadeEvent: CascadeEvent = {
            ruleId: cascade.id,
            triggeredAt: Date.now(),
            effects: [],
            narrative: cascade.narrative,
          };

          for (const effect of cascade.effects) {
            const applyAt = this.currentSimulationTime + effect.delayMinutes;

            // Transform cascade rule effect to CascadeEvent effect format
            const transformedEffect: CascadeEvent['effects'][0] = {
              system: effect.system,
              parishId: effect.parishId,
              degradation: effect.degradation,
              appliedAt: Date.now(),
            };

            if (effect.delayMinutes === 0) {
              // Apply immediately
              this.applyEffect(transformedEffect, cascade);
              cascadeEvent.effects.push(transformedEffect);
            } else {
              // Schedule for later - update appliedAt to scheduled time
              const scheduledEffect: CascadeEvent['effects'][0] = {
                ...transformedEffect,
                appliedAt: applyAt,
              };
              this.state.pendingEffects.push({
                effect: scheduledEffect,
                applyAt,
                ruleId: cascade.id,
              });
            }
          }

          this.state.activeCascades.push(cascadeEvent);
          this.emit('cascadeTriggered', cascadeEvent);
        }
      }
    }
  }

  /**
   * Apply a cascade effect
   */
  private applyEffect(
    effect: CascadeEvent['effects'][0],
    rule: InfrastructureCascadeRule
  ): void {
    const status = this.state.statuses.get(`${effect.parishId}:${effect.system}`);
    if (!status) return;

    const wasOperational = status.operational;

    status.statusLevel = Math.max(0, status.statusLevel - effect.degradation);
    status.operational = status.statusLevel > INFRASTRUCTURE_THRESHOLDS.FAILED;
    status.statusReason = `Cascade: ${rule.narrative}`;
    status.lastChanged = Date.now();

    this.emit('statusChanged', { ...status });
    this.emit('effectApplied', effect, rule);

    if (wasOperational && !status.operational) {
      this.emit('systemFailed', effect.parishId, effect.system);

      if (isParishIsolated(effect.parishId, this.getStatusMap())) {
        this.emit('parishIsolated', effect.parishId);
      }
    }
  }

  /**
   * Convert status map to format expected by helper functions
   */
  private getStatusMap(): Record<ParishIdLower, Record<InfrastructureSystem, number>> {
    const result: Record<string, Record<string, number>> = {};
    const parishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];

    for (const parish of parishes) {
      result[parish] = {};
      const systems: InfrastructureSystem[] = ['power', 'communications', 'roads', 'water', 'hospital', 'port', 'airport'];

      for (const system of systems) {
        const status = this.state.statuses.get(`${parish}:${system}`);
        result[parish][system] = status?.statusLevel ?? 0;
      }
    }

    return result as Record<ParishIdLower, Record<InfrastructureSystem, number>>;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createInfrastructureManager(): InfrastructureManager {
  return new InfrastructureManager();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get human-readable status level
 */
export function getStatusLabel(level: number): 'operational' | 'degraded' | 'critical' | 'failed' {
  if (level > INFRASTRUCTURE_THRESHOLDS.OPERATIONAL) return 'operational';
  if (level > INFRASTRUCTURE_THRESHOLDS.DEGRADED) return 'degraded';
  if (level > INFRASTRUCTURE_THRESHOLDS.FAILED) return 'critical';
  return 'failed';
}

/**
 * Get status color for UI
 */
export function getStatusColor(level: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (level > INFRASTRUCTURE_THRESHOLDS.OPERATIONAL) return 'green';
  if (level > INFRASTRUCTURE_THRESHOLDS.DEGRADED) return 'yellow';
  if (level > INFRASTRUCTURE_THRESHOLDS.FAILED) return 'orange';
  return 'red';
}
