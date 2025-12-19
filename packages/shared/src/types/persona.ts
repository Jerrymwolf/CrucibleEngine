/**
 * Persona Fences for NarrativeAgent character constraints
 * These define the boundaries and voice for each key character in the simulation
 */

import type { ParishIdLower } from '../constants/concordia.js';

export type PersonaVocabulary = 'technical' | 'working-class' | 'executive' | 'political' | 'maritime';
export type PersonaTone = 'urgent' | 'measured' | 'defensive' | 'authoritative' | 'pleading';
export type LearningOutcome = 'LO1' | 'LO2' | 'LO3' | 'LO4' | 'LO5';

export interface PersonaFence {
  /** Unique identifier for the persona */
  id: PersonaId;
  /** Full name */
  name: string;
  /** Job title and affiliation */
  title: string;
  /** Primary parish association */
  parishId: ParishIdLower;
  /** Background (2 sentences max) */
  background: string;
  /** Speaking style constraints */
  speakingStyle: {
    vocabulary: PersonaVocabulary;
    tone: PersonaTone;
  };
  /** Specific facts this persona has access to */
  knows: string[];
  /** Information gaps (creates dramatic irony) */
  doesNotKnow: string[];
  /** The value they prioritize most */
  primaryValue: string;
  /** The conflict they embody */
  valueTension: string;
  /** 2-3 phrases that break character - NarrativeAgent must never use these */
  neverSays: string[];
  /** Example utterance for voice calibration */
  signatureLine: string;
  /** Which learning outcomes this persona serves */
  learningOutcomes: LearningOutcome[];
}

export type PersonaId = 'reeves' | 'santos' | 'mendez' | 'tanaka' | 'webb' | 'chen';
