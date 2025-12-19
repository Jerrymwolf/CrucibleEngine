/**
 * Dilemma Selector Service
 * Selects appropriate dilemmas based on game state, timeline, and intensity
 */

import {
  DILEMMA_LIBRARY,
  getCurrentWindow,
  type Dilemma,
  type DilemmaPhase,
  type ParishIdLower,
} from '@crucible/shared';

interface DilemmaSelectionContext {
  parishId: ParishIdLower | 'any';
  intensity: number;
  simulationTime: number;
  previousDecisionIds: string[];
  presentedDilemmaIds: string[];
}

interface SelectedDilemma {
  dilemma: Dilemma;
  reason: string;
}

/**
 * Select the next appropriate dilemma for a parish/team
 */
export function selectNextDilemma(context: DilemmaSelectionContext): SelectedDilemma | null {
  const { parishId, intensity, simulationTime, previousDecisionIds, presentedDilemmaIds } = context;

  // Get current timeline window
  const currentWindow = getCurrentWindow(simulationTime);
  const windowId = currentWindow.id;

  // Determine which phase's dilemmas to use
  const phase = mapTimelinePhaseToDiglemmaPhase(currentWindow.phase);

  // Get all dilemmas for this phase
  const phaseDilemmas = DILEMMA_LIBRARY[phase];

  // Filter dilemmas
  const candidates = phaseDilemmas.filter((dilemma) => {
    // Skip already presented
    if (presentedDilemmaIds.includes(dilemma.id)) {
      return false;
    }

    // Check parish match (parish-specific or 'multi')
    if (parishId !== 'any' && dilemma.parishId !== parishId && dilemma.parishId !== 'multi') {
      return false;
    }

    // Check intensity range
    const trigger = dilemma.trigger;
    if (trigger.intensityMin !== undefined && intensity < trigger.intensityMin) {
      return false;
    }
    if (trigger.intensityMax !== undefined && intensity > trigger.intensityMax) {
      return false;
    }

    // Check timeline window if specified
    if (trigger.timelineWindow && trigger.timelineWindow !== windowId) {
      return false;
    }

    // Check prerequisites
    if (trigger.prerequisiteDecisions && trigger.prerequisiteDecisions.length > 0) {
      const prereqsMet = trigger.prerequisiteDecisions.every((prereq) =>
        previousDecisionIds.includes(prereq)
      );
      if (!prereqsMet) {
        return false;
      }
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  // Sort by narrative weight (pivotal > major > standard > minor)
  const weightOrder: Record<string, number> = {
    pivotal: 4,
    major: 3,
    standard: 2,
    minor: 1,
  };

  candidates.sort((a, b) => {
    const weightDiff = (weightOrder[b.narrativeWeight] || 0) - (weightOrder[a.narrativeWeight] || 0);
    if (weightDiff !== 0) return weightDiff;

    // Secondary sort by matching parish (prefer parish-specific over multi)
    if (parishId !== 'any') {
      if (a.parishId === parishId && b.parishId !== parishId) return -1;
      if (b.parishId === parishId && a.parishId !== parishId) return 1;
    }

    return 0;
  });

  const selected = candidates[0];
  return {
    dilemma: selected,
    reason: `Selected ${selected.narrativeWeight} dilemma for ${phase} phase at intensity ${intensity}`,
  };
}

/**
 * Get all dilemmas for a specific parish across all phases
 */
export function getDilemmasForParish(parishId: ParishIdLower): Dilemma[] {
  const allDilemmas: Dilemma[] = [...DILEMMA_LIBRARY.watch, ...DILEMMA_LIBRARY.crisis, ...DILEMMA_LIBRARY.recovery];
  return allDilemmas.filter((d) => d.parishId === parishId || d.parishId === 'multi');
}

/**
 * Get dilemmas by learning outcome
 */
export function getDilemmasByLearningOutcome(outcome: string): Dilemma[] {
  const allDilemmas: Dilemma[] = [...DILEMMA_LIBRARY.watch, ...DILEMMA_LIBRARY.crisis, ...DILEMMA_LIBRARY.recovery];
  return allDilemmas.filter((d) => d.learningOutcomes.includes(outcome as Dilemma['learningOutcomes'][number]));
}

/**
 * Get dilemmas voiced by a specific persona
 */
export function getDilemmasByPersona(personaId: string): Dilemma[] {
  const allDilemmas: Dilemma[] = [...DILEMMA_LIBRARY.watch, ...DILEMMA_LIBRARY.crisis, ...DILEMMA_LIBRARY.recovery];
  return allDilemmas.filter((d) => {
    if (Array.isArray(d.personaId)) {
      return d.personaId.includes(personaId as Dilemma['personaId'] extends (infer U)[] ? U : never);
    }
    return d.personaId === personaId;
  });
}

/**
 * Get the count of dilemmas by phase
 */
export function getDilemmaCounts(): { watch: number; crisis: number; recovery: number; total: number } {
  return {
    watch: DILEMMA_LIBRARY.watch.length,
    crisis: DILEMMA_LIBRARY.crisis.length,
    recovery: DILEMMA_LIBRARY.recovery.length,
    total: DILEMMA_LIBRARY.watch.length + DILEMMA_LIBRARY.crisis.length + DILEMMA_LIBRARY.recovery.length,
  };
}

/**
 * Map timeline phase to dilemma phase
 * Timeline has more granular phases; dilemmas use watch/crisis/recovery
 */
function mapTimelinePhaseToDiglemmaPhase(timelinePhase: string): DilemmaPhase {
  switch (timelinePhase) {
    case 'watch':
    case 'warning':
      return 'watch';
    case 'approach':
    case 'landfall':
    case 'eye':
      return 'crisis';
    case 'recovery':
      return 'recovery';
    default:
      return 'watch';
  }
}

/**
 * Validate that all dilemmas have required fields
 * Used for development/testing
 */
export function validateDilemmaLibrary(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allDilemmas: Dilemma[] = [...DILEMMA_LIBRARY.watch, ...DILEMMA_LIBRARY.crisis, ...DILEMMA_LIBRARY.recovery];

  for (const dilemma of allDilemmas) {
    if (!dilemma.id) {
      errors.push(`Dilemma missing id`);
    }
    if (!dilemma.title) {
      errors.push(`Dilemma ${dilemma.id} missing title`);
    }
    if (!dilemma.options || dilemma.options.length < 2) {
      errors.push(`Dilemma ${dilemma.id} has fewer than 2 options`);
    }
    if (!dilemma.valuesTested || dilemma.valuesTested.length === 0) {
      errors.push(`Dilemma ${dilemma.id} has no values tested`);
    }
    if (!dilemma.learningOutcomes || dilemma.learningOutcomes.length === 0) {
      errors.push(`Dilemma ${dilemma.id} has no learning outcomes`);
    }

    // Validate options
    for (const option of dilemma.options || []) {
      if (!option.id || !option.label || !option.description) {
        errors.push(`Dilemma ${dilemma.id} has option missing id/label/description`);
      }
      if (!option.consequenceSketch) {
        errors.push(`Dilemma ${dilemma.id} option ${option.id} missing consequence sketch`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a summary of the dilemma library coverage
 */
export function getDilemmaCoverage(): {
  byParish: Record<string, number>;
  byPhase: Record<DilemmaPhase, number>;
  byLearningOutcome: Record<string, number>;
  byPersona: Record<string, number>;
} {
  const allDilemmas: Dilemma[] = [...DILEMMA_LIBRARY.watch, ...DILEMMA_LIBRARY.crisis, ...DILEMMA_LIBRARY.recovery];

  const byParish: Record<string, number> = {};
  const byPhase: Record<DilemmaPhase, number> = { watch: 0, crisis: 0, recovery: 0 };
  const byLearningOutcome: Record<string, number> = {};
  const byPersona: Record<string, number> = {};

  for (const dilemma of allDilemmas) {
    // By parish
    byParish[dilemma.parishId] = (byParish[dilemma.parishId] || 0) + 1;

    // By phase
    byPhase[dilemma.phase]++;

    // By learning outcome
    for (const lo of dilemma.learningOutcomes) {
      byLearningOutcome[lo] = (byLearningOutcome[lo] || 0) + 1;
    }

    // By persona
    const personas = Array.isArray(dilemma.personaId) ? dilemma.personaId : [dilemma.personaId];
    for (const persona of personas) {
      byPersona[persona] = (byPersona[persona] || 0) + 1;
    }
  }

  return { byParish, byPhase, byLearningOutcome, byPersona };
}
