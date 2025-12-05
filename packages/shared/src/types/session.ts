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
