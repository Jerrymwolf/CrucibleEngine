/**
 * Decision-related types
 */

import type { ParishIdLower } from '../constants/concordia.js';

export interface Decision {
  id: string;
  teamId: string;
  parishId: ParishIdLower;
  categoryId: string;
  decisionTypeId: string;
  choice: string;
  rationale?: string;
  advocatedBy: string[]; // Participant IDs
  simulationTime: number;
  realTime: number; // Unix timestamp
  targetParishId?: ParishIdLower; // For inter-parish decisions
  processed: boolean;
}

export interface DecisionPayload {
  categoryId: string;
  decisionTypeId: string;
  choice: string;
  rationale?: string;
  targetParishId?: ParishIdLower;
}

export interface DecisionAdvocate {
  participantId: string;
  position: 'for' | 'against' | 'neutral';
}

export interface ConsequenceResult {
  immediate: ConsequenceEffect[];
  ripple: RippleEffect[];
  delayed: DelayedEffect[];
  narrativeHooks: string[];
}

export interface ConsequenceEffect {
  parishId: ParishIdLower;
  category: 'resources' | 'population' | 'infrastructure' | 'morale' | 'political';
  description: string;
  magnitude: number; // -5 to +5
  visible: boolean;
}

export interface RippleEffect extends ConsequenceEffect {
  delayMinutes: number;
  trigger: string;
}

export interface DelayedEffect {
  description: string;
  delayMinutes: number;
  condition: string;
}
