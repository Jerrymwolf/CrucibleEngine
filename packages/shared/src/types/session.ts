/**
 * Session-related types
 */

export type SessionPhase = 'lobby' | 'discovery' | 'briefing' | 'storm' | 'recovery' | 'debrief';

export type SessionStatus = 'lobby' | 'active' | 'completed';

export interface SessionConfig {
  sessionId: string;
  sessionCode: string; // 6-char join code
  companyName?: string;
  companyValues?: string[];
  crucibleMasterId: string;
  scenarioSeed?: string;
}

export interface SessionState {
  phase: SessionPhase;
  phaseStartTime: number;
  paused: boolean;
  simulationTime: number; // Minutes since storm watch
}

export interface JoinSessionPayload {
  sessionCode: string;
  role: 'team' | 'cm';
  teamId?: string;
  participantName?: string;
}

export interface CreateSessionPayload {
  companyName?: string;
  companyValues?: string[];
  crucibleMasterName: string;
}

/**
 * Production state snapshot for Celaritrin manufacturing metrics.
 * This is the core business pressure mechanism that creates authentic values tension.
 */
export interface ProductionSnapshot {
  // Batch tracking
  currentBatchId: string;
  batchProgress: number; // 0-100%
  batchValue: number; // $8.2M per batch
  batchEtaHours: number;

  // Pipeline status
  pipelineStatus: 'flowing' | 'blocked' | 'degraded';
  bottleneck: string; // Parish causing blockage

  // Cumulative impact
  revenueImpact: number; // Running total (negative when losing)
  productionHoursLost: number;
  burnRateActive: boolean; // True when losing money

  // Quarterly tracking
  quarterlyTarget: number;
  quarterlyProgress: number;
  daysRemainingInQuarter: number;

  // THE DUAL MORAL COUNTERS - creates authentic values pressure
  patientsAffected: number; // Global patients who miss doses
  childrenAffected: number; // Children (~14% of patients)
  workersAtRisk: number; // Workers still on-site during danger
  workersEvacuated: number; // Workers safely evacuated
  globalStockpileWeeks: number; // Weeks of global supply remaining
}
