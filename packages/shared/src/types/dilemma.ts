/**
 * Dilemma Types
 * Defines the decision library structure for the simulation
 */

import type { ParishIdLower } from '../constants/concordia.js';
import type { PersonaId, LearningOutcome } from './persona.js';

export type DilemmaPhase = 'watch' | 'crisis' | 'recovery';
export type DilemmaWeight = 'minor' | 'standard' | 'major' | 'pivotal';

export interface ConsequenceSketch {
  /** What happens immediately */
  immediate: string;
  /** Ripple effects to other parishes/personas */
  ripple: string;
  /** Long-term or delayed consequences */
  delayed: string;
}

export interface DilemmaOption {
  /** Unique identifier within the dilemma */
  id: string;
  /** Short action label (2-4 words) */
  label: string;
  /** Full description of what this choice means */
  description: string;
  /** Value alignment scores: -3 to +3 for each tested value */
  valueAlignment: Record<string, number>;
  /** Consequence descriptions for each option */
  consequenceSketch: ConsequenceSketch;
}

export interface DilemmaTrigger {
  /** Minimum intensity level (1-10) to present this dilemma */
  intensityMin?: number;
  /** Maximum intensity level */
  intensityMax?: number;
  /** Timeline window ID when this dilemma can appear */
  timelineWindow?: string;
  /** Custom condition string */
  condition?: string;
  /** Decision IDs that must have been made first */
  prerequisiteDecisions?: string[];
}

export interface Dilemma {
  /** Unique identifier: [phase]-[parish]-[number] e.g., "watch-keystone-01" */
  id: string;
  /** Title (5 words max) */
  title: string;
  /** Which phase this dilemma belongs to */
  phase: DilemmaPhase;
  /** Primary parish (use 'multi' for cross-parish dilemmas) */
  parishId: ParishIdLower | 'multi';
  /** Situation setup (2 sentences) */
  setup: string;
  /** Conditions for presenting this dilemma */
  trigger: DilemmaTrigger;
  /** Available choices (3-4 options, none purely good) */
  options: DilemmaOption[];
  /** Which values are in conflict */
  valuesTested: string[];
  /** Who voices the pressure (can be array for multi-parish) */
  personaId: PersonaId | PersonaId[];
  /** Which learning outcomes this dilemma serves */
  learningOutcomes: LearningOutcome[];
  /** Narrative importance */
  narrativeWeight: DilemmaWeight;
}

export interface DilemmaLibrary {
  watch: Dilemma[];
  crisis: Dilemma[];
  recovery: Dilemma[];
}
