/**
 * AITeamController
 *
 * Controls AI-powered teams that fill empty parishes in demo/solo mode.
 * Implements archetype-based decision making with realistic drift under pressure.
 *
 * Key concepts:
 * - Each AI team has an archetype that defines personality and drift profile
 * - Drift: How much a team deviates from their values under pressure
 * - Rationalization: How teams justify decisions that conflict with their values
 */

import {
  AI_ARCHETYPES,
  PARISH_AI_DEFAULTS,
  AI_TIMING,
  DRIFT_BOUNDS,
  type AIArchetypeId,
  type AITeamState,
  type AIDecisionResult,
  type AIPersonality,
  type DriftProfile,
  type RationalizationPattern,
  type ParishIdLower,
} from '@crucible/shared';
import type { CrucibleState } from '../schema/CrucibleState.js';
import type { Dilemma, DilemmaOption } from '@crucible/shared';

// ============================================================================
// RATIONALE TEMPLATES BY ARCHETYPE
// ============================================================================

const RATIONALE_TEMPLATES: Record<AIArchetypeId, {
  normal: string[];
  under_pressure: string[];
  rationalizing: string[];
}> = {
  'by-the-book': {
    normal: [
      'Protocol is clear on this. We follow the guidelines.',
      'The procedures exist for a reason. We stick to them.',
      "Let me check the manual... yes, this is the correct approach.",
      'Standard operating procedure dictates this course of action.',
      'This aligns with our established protocols.',
    ],
    under_pressure: [
      'Management has approved this approach. We proceed.',
      'The timeline requires this. Documentation will follow.',
      'Given the circumstances, we adapt. But we document everything.',
      'Leadership has given us latitude here. We use it.',
      "We'll square this with compliance after the emergency.",
    ],
    rationalizing: [
      'The protocols were written for normal circumstances...',
      "Technically, there's an exception clause for emergencies.",
      "We're not violating the spirit of the rules, just the letter.",
      "I'll make sure we backfill the paperwork once this is over.",
      'Headquarters would understand if they could see what we see.',
    ],
  },
  cowboy: {
    normal: [
      "I've been doing this 20 years. Trust me on this one.",
      "We'll figure it out as we go. Always have.",
      "Sometimes you gotta make the call. This is it.",
      'My gut says this is the right move.',
      "Experience beats theory. Let's move.",
    ],
    under_pressure: [
      'No time for committees. We move.',
      "I've seen worse. We push through.",
      'Leadership will understand. Get it done.',
      'Analysis paralysis kills people. Action saves them.',
      "If we're wrong, we'll fix it. But we have to act now.",
    ],
    rationalizing: [
      'Sometimes you have to break eggs to make an omelet.',
      "They'll thank us when this is over.",
      "Rules are guidelines, not scripture.",
      "Better to ask forgiveness than permission.",
      "The people who wrote those rules never faced a Cat 4.",
    ],
  },
  'union-strong': {
    normal: [
      "The workers' safety comes first. Full stop.",
      "They don't pay us enough for this. Standard procedures.",
      "Let me check with the crew before we commit.",
      'Our members need to be consulted on this.',
      "We have agreements for a reason. Let's respect them.",
    ],
    under_pressure: [
      "They're asking us to risk lives for their bottom line.",
      "My people didn't sign up for this. We need guarantees.",
      "Corporate doesn't understand what they're asking.",
      "We'll do it, but I want assurances in writing.",
      'This better count toward hazard pay.',
    ],
    rationalizing: [
      'Sometimes the greater good means individual sacrifice...',
      'If we refuse, they might bring in people less trained.',
      "Our people are tough. They can handle more than corporate thinks.",
      "We'll make sure everyone gets compensated for this.",
      'Standing down now means no one has jobs tomorrow.',
    ],
  },
  'bottom-line': {
    normal: [
      "What's the ROI on this decision?",
      "Let's look at the numbers and decide.",
      'Efficiency is key. What\'s the fastest path?',
      "The quarterly target doesn't move. What gets us there?",
      "Time is money. Let's not waste either.",
    ],
    under_pressure: [
      "The quarterly target doesn't care about our feelings.",
      "We can't afford to miss this window. Push through.",
      'Document the risk and move forward.',
      'Shareholders are counting on us. We deliver.',
      'Every hour of downtime is $2M we never recover.',
    ],
    rationalizing: [
      'If we go under, no one has a job. Think about that.',
      "The insurance will cover it. That's what it's for.",
      'Long-term, this protects more people than it hurts.',
      "We're not the villains here—we're keeping lights on.",
      'Patient lives depend on us staying in business.',
    ],
  },
  caretaker: {
    normal: [
      'How does this affect our team?',
      "Let's make sure everyone is comfortable with this.",
      'I want to hear from everyone before we decide.',
      "What do our people need right now?",
      "Let's not forget the human element here.",
    ],
    under_pressure: [
      "Even now, we don't abandon our people.",
      'This is exactly when our values matter most.',
      "I'd rather explain a late delivery than a casualty.",
      "People over production. Always.",
      "We're not going to sacrifice anyone for a deadline.",
    ],
    rationalizing: [
      'Sometimes the kindest thing is the hardest...',
      "I hate this, but we have to think of everyone.",
      "If we don't act, more people suffer.",
      "Being paralyzed by compassion helps no one.",
      "I'll carry this weight so others don't have to.",
    ],
  },
};

// ============================================================================
// AI TEAM CONTROLLER
// ============================================================================

export class AITeamController {
  private teamStates: Map<string, AITeamState> = new Map();
  private pendingDecisions: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize AI team for a parish with optional archetype override
   */
  initializeTeam(parishId: ParishIdLower, archetypeOverride?: AIArchetypeId): AITeamState {
    const defaults = PARISH_AI_DEFAULTS[parishId];
    const archetypeId = archetypeOverride || defaults?.defaultArchetype || 'by-the-book';
    const archetype = AI_ARCHETYPES[archetypeId];

    // Apply parish-specific personality modifiers
    const personality = this.applyPersonalityModifiers(
      archetype.personality,
      defaults?.personalityModifiers || {}
    );

    const state: AITeamState = {
      parishId,
      active: true,
      archetypeId,
      currentAlignment: archetype.driftProfile.baselineAlignment,
      currentDrift: 0,
      cooperationLevel: this.mapCooperativeness(personality.cooperativeness),
      decisionCount: 0,
      lastDecisionAt: null,
    };

    this.teamStates.set(parishId, state);
    console.log(`[AITeam] Initialized ${parishId} with archetype: ${archetypeId}`);

    return state;
  }

  /**
   * Get current state for an AI team
   */
  getTeamState(parishId: string): AITeamState | undefined {
    return this.teamStates.get(parishId);
  }

  /**
   * Get all AI team states
   */
  getAllTeamStates(): Map<string, AITeamState> {
    return this.teamStates;
  }

  /**
   * Calculate drift based on intensity and decision history
   */
  calculateDrift(
    parishId: string,
    intensity: number,
    decisionHistory: number = 0
  ): number {
    const state = this.teamStates.get(parishId);
    if (!state) return 0;

    const archetype = AI_ARCHETYPES[state.archetypeId];
    const profile = archetype.driftProfile;

    let alignment = state.currentAlignment;

    // Drift under pressure (intensity above threshold)
    if (intensity > profile.driftThreshold) {
      const pressureFactor = (intensity - profile.driftThreshold) / 10;
      const driftAmount = pressureFactor * profile.driftRate;

      // Clamp drift per decision
      const clampedDrift = Math.min(driftAmount, DRIFT_BOUNDS.maximumDriftPerDecision);
      alignment -= clampedDrift;
    }

    // Recovery when pressure drops below threshold - 2
    if (intensity < profile.driftThreshold - 2) {
      alignment = Math.min(
        profile.baselineAlignment,
        alignment + DRIFT_BOUNDS.recoveryPerLowIntensity
      );
    }

    // Clamp to bounds
    alignment = Math.max(DRIFT_BOUNDS.minimumAlignment, Math.min(1.0, alignment));

    // Update state
    state.currentAlignment = alignment;
    state.currentDrift = profile.baselineAlignment - alignment;

    return state.currentDrift;
  }

  /**
   * Schedule a decision for an AI team with realistic delay
   */
  scheduleDecision(
    parishId: string,
    dilemma: Dilemma,
    intensity: number,
    gameState: CrucibleState,
    onDecision: (result: AIDecisionResult) => void
  ): void {
    const state = this.teamStates.get(parishId);
    if (!state) {
      console.error(`[AITeam] Team not initialized for ${parishId}`);
      return;
    }

    // Clear any pending decision
    const existingTimeout = this.pendingDecisions.get(parishId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate decision delay
    const delayMs = this.calculateDecisionDelay(intensity, state);

    console.log(`[AITeam] ${parishId} considering dilemma "${dilemma.title}" (delay: ${delayMs}ms)`);

    // Schedule the decision
    const timeout = setTimeout(() => {
      const result = this.makeDecision(parishId, dilemma, intensity, gameState);
      this.pendingDecisions.delete(parishId);
      onDecision(result);
    }, delayMs);

    this.pendingDecisions.set(parishId, timeout);
  }

  /**
   * Make an immediate decision for an AI team
   */
  makeDecision(
    parishId: string,
    dilemma: Dilemma,
    intensity: number,
    gameState: CrucibleState
  ): AIDecisionResult {
    const state = this.teamStates.get(parishId);
    if (!state) {
      throw new Error(`AI team not initialized for ${parishId}`);
    }

    const archetype = AI_ARCHETYPES[state.archetypeId];
    const parishDefaults = PARISH_AI_DEFAULTS[parishId as ParishIdLower];

    // Calculate current drift
    this.calculateDrift(parishId, intensity, state.decisionCount);

    // Score each option
    const scoredOptions = dilemma.options.map(option => ({
      option,
      score: this.scoreOption(option, archetype, state, intensity, parishDefaults),
    }));

    // Sort by score (highest first)
    scoredOptions.sort((a, b) => b.score - a.score);

    // Pick with some variance for realism
    const chosen = this.pickWithVariance(scoredOptions, state.currentDrift);

    // Determine if rationalizing
    const isRationalizing = state.currentDrift > 0.2;

    // Generate rationale
    const rationale = this.generateRationale(
      state.archetypeId,
      chosen.option,
      intensity,
      state.currentAlignment,
      isRationalizing,
      parishDefaults?.rationalizationPatterns || []
    );

    // Update state
    state.decisionCount++;
    state.lastDecisionAt = Date.now();

    const result: AIDecisionResult = {
      optionId: chosen.option.id,
      rationale,
      delayMs: 0, // Already applied via schedule
      newDrift: state.currentDrift,
      rationalizationUsed: isRationalizing ? this.pickRationalization(parishDefaults?.rationalizationPatterns || [], intensity) : undefined,
    };

    console.log(`[AITeam] ${parishId} decided: "${chosen.option.label}" (drift: ${state.currentDrift.toFixed(2)})`);

    return result;
  }

  /**
   * Cancel any pending decision for a team
   */
  cancelPendingDecision(parishId: string): void {
    const timeout = this.pendingDecisions.get(parishId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingDecisions.delete(parishId);
    }
  }

  /**
   * Reset all AI teams
   */
  reset(): void {
    // Cancel all pending decisions
    for (const timeout of this.pendingDecisions.values()) {
      clearTimeout(timeout);
    }
    this.pendingDecisions.clear();
    this.teamStates.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private applyPersonalityModifiers(
    base: AIPersonality,
    modifiers: Partial<AIPersonality>
  ): AIPersonality {
    return {
      riskTolerance: this.clamp(base.riskTolerance + (modifiers.riskTolerance || 0), 0, 1),
      decisionSpeed: this.clamp(base.decisionSpeed + (modifiers.decisionSpeed || 0), 0, 1),
      cooperativeness: this.clamp(base.cooperativeness + (modifiers.cooperativeness || 0), 0, 1),
      transparencyBias: this.clamp(base.transparencyBias + (modifiers.transparencyBias || 0), 0, 1),
      authorityDeference: this.clamp(base.authorityDeference + (modifiers.authorityDeference || 0), 0, 1),
    };
  }

  private mapCooperativeness(value: number): 'hostile' | 'uncooperative' | 'neutral' | 'cooperative' | 'allied' {
    if (value < 0.2) return 'hostile';
    if (value < 0.4) return 'uncooperative';
    if (value < 0.6) return 'neutral';
    if (value < 0.8) return 'cooperative';
    return 'allied';
  }

  private scoreOption(
    option: DilemmaOption,
    archetype: typeof AI_ARCHETYPES[AIArchetypeId],
    state: AITeamState,
    intensity: number,
    parishDefaults?: typeof PARISH_AI_DEFAULTS[ParishIdLower]
  ): number {
    let score = 50; // Base score
    const personality = archetype.personality;
    const optionId = option.id.toLowerCase();
    const optionLabel = option.label.toLowerCase();

    // Risk tolerance affects safety vs production choices
    if (
      optionId.includes('safe') ||
      optionId.includes('evacuate') ||
      optionLabel.includes('safe') ||
      optionLabel.includes('evacuate') ||
      optionLabel.includes('stop')
    ) {
      score += (1 - personality.riskTolerance) * 25;
    }

    if (
      optionId.includes('continue') ||
      optionId.includes('production') ||
      optionId.includes('push') ||
      optionLabel.includes('continue') ||
      optionLabel.includes('proceed') ||
      optionLabel.includes('push')
    ) {
      score += personality.riskTolerance * 25;
    }

    // Value alignment scoring (when not drifting)
    if (option.valueAlignment && state.currentAlignment > 0.5) {
      const alignmentSum = Object.values(option.valueAlignment)
        .reduce((sum, v) => sum + v, 0);
      score += alignmentSum * state.currentAlignment * 5;
    }

    // Authority deference under pressure
    if (intensity > 6) {
      if (
        optionId.includes('follow') ||
        optionId.includes('order') ||
        optionLabel.includes('follow') ||
        optionLabel.includes('comply') ||
        optionLabel.includes('headquarters')
      ) {
        score += personality.authorityDeference * 20;
      }
    }

    // Cooperativeness affects inter-parish decisions
    if (
      optionId.includes('share') ||
      optionId.includes('help') ||
      optionLabel.includes('share') ||
      optionLabel.includes('assist') ||
      optionLabel.includes('coordinate')
    ) {
      score += personality.cooperativeness * 15;
    }

    if (
      optionId.includes('hoard') ||
      optionId.includes('refuse') ||
      optionLabel.includes('keep') ||
      optionLabel.includes('refuse') ||
      optionLabel.includes('prioritize own')
    ) {
      score += (1 - personality.cooperativeness) * 15;
    }

    // Vulnerable values affect scoring when drifting
    if (state.currentDrift > 0.15 && parishDefaults?.vulnerableValues) {
      for (const vulnValue of parishDefaults.vulnerableValues) {
        const vulnLower = vulnValue.toLowerCase();
        if (option.valueAlignment) {
          for (const [value, alignment] of Object.entries(option.valueAlignment)) {
            if (value.toLowerCase().includes(vulnLower) && alignment > 0) {
              // Under pressure, less weight to vulnerable values
              score -= state.currentDrift * 10;
            }
          }
        }
      }
    }

    // Intensity pressure - higher intensity pushes toward expedient choices
    if (intensity >= 7) {
      if (
        optionLabel.includes('fast') ||
        optionLabel.includes('immediate') ||
        optionLabel.includes('now')
      ) {
        score += (intensity - 6) * 5;
      }
    }

    return score;
  }

  private pickWithVariance(
    scoredOptions: Array<{ option: DilemmaOption; score: number }>,
    drift: number
  ): { option: DilemmaOption; score: number } {
    if (scoredOptions.length === 0) {
      throw new Error('No options to choose from');
    }

    if (scoredOptions.length === 1) {
      return scoredOptions[0];
    }

    // Higher drift = more erratic decisions
    const varianceChance = 0.1 + drift * 0.3; // 10-40% chance of not picking best

    if (Math.random() < varianceChance && scoredOptions.length > 1) {
      // Pick second best (or random if close scores)
      const scoreDiff = scoredOptions[0].score - scoredOptions[1].score;
      if (scoreDiff < 10) {
        // Close scores - could go either way
        return Math.random() < 0.5 ? scoredOptions[0] : scoredOptions[1];
      }
      return scoredOptions[1];
    }

    return scoredOptions[0];
  }

  private generateRationale(
    archetypeId: AIArchetypeId,
    option: DilemmaOption,
    intensity: number,
    alignment: number,
    isRationalizing: boolean,
    patterns: RationalizationPattern[]
  ): string {
    const templates = RATIONALE_TEMPLATES[archetypeId];

    let pool: string[];
    if (isRationalizing && templates.rationalizing.length > 0) {
      pool = templates.rationalizing;
    } else if (intensity > 6 || alignment < 0.6) {
      pool = templates.under_pressure;
    } else {
      pool = templates.normal;
    }

    // Pick a random template
    const template = pool[Math.floor(Math.random() * pool.length)];

    // Add option context if template is generic
    if (!template.includes(option.label)) {
      return `${template} We're going with "${option.label}".`;
    }

    return template;
  }

  private pickRationalization(patterns: RationalizationPattern[], intensity: number): string | undefined {
    if (patterns.length === 0) return undefined;

    // Pick pattern based on current trigger
    const applicablePatterns = patterns.filter(p => {
      if (intensity > 7 && p.trigger === 'production_pressure') return true;
      if (intensity > 6 && p.trigger === 'time_pressure') return true;
      if (intensity > 5 && p.trigger === 'authority_pressure') return true;
      return false;
    });

    if (applicablePatterns.length === 0) {
      return patterns[Math.floor(Math.random() * patterns.length)].narrative;
    }

    return applicablePatterns[Math.floor(Math.random() * applicablePatterns.length)].narrative;
  }

  private calculateDecisionDelay(intensity: number, state: AITeamState): number {
    const archetype = AI_ARCHETYPES[state.archetypeId];
    const speedFactor = archetype.personality.decisionSpeed;

    // Get timing based on current phase (assume crisis during storm)
    const timing = intensity > 6 ? AI_TIMING.decision.crisis : AI_TIMING.decision.watch;

    // Base delay in milliseconds
    const baseDelay = (timing.minSeconds + (timing.maxSeconds - timing.minSeconds) * (1 - speedFactor)) * 1000;

    // Add some randomness (±20%)
    const variance = baseDelay * 0.2;
    const randomOffset = (Math.random() - 0.5) * 2 * variance;

    return Math.max(timing.minSeconds * 1000, baseDelay + randomOffset);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// Singleton instance
let aiControllerInstance: AITeamController | null = null;

export function getAITeamController(): AITeamController {
  if (!aiControllerInstance) {
    aiControllerInstance = new AITeamController();
  }
  return aiControllerInstance;
}

export function resetAITeamController(): void {
  if (aiControllerInstance) {
    aiControllerInstance.reset();
  }
  aiControllerInstance = null;
}
