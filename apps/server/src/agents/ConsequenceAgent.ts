import Anthropic from '@anthropic-ai/sdk';
import { CONSEQUENCE_AGENT_SYSTEM, CONSEQUENCE_AGENT_USER_TEMPLATE } from './prompts/consequenceAgent.js';
import type { CrucibleState, Decision } from '../schema/CrucibleState.js';

interface ConsequenceEffect {
  parishId: string;
  category: 'resources' | 'population' | 'infrastructure' | 'morale' | 'political';
  description: string;
  magnitude: number; // -5 to +5
  visible: boolean;
}

interface RippleEffect extends ConsequenceEffect {
  delayMinutes: number;
  trigger: string;
}

interface DelayedEffect {
  description: string;
  delayMinutes: number;
  condition: string;
}

interface ConsequenceResult {
  immediate: ConsequenceEffect[];
  ripple: RippleEffect[];
  delayed: DelayedEffect[];
  narrativeHooks: string[];
}

interface ConsequenceAgentConfig {
  apiKey: string;
  model?: string;
}

export class ConsequenceAgent {
  private client: Anthropic;
  private model: string;

  constructor(config: ConsequenceAgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Calculate consequences for a decision
   */
  async calculateConsequences(
    decision: Decision,
    state: CrucibleState
  ): Promise<ConsequenceResult> {
    const prompt = this.buildPrompt(decision, state);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: CONSEQUENCE_AGENT_SYSTEM,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      // Parse JSON response
      const parsed = JSON.parse(textContent.text);
      return this.validateResult(parsed);
    } catch (error) {
      console.error('ConsequenceAgent error:', error);
      return {
        immediate: [],
        ripple: [],
        delayed: [],
        narrativeHooks: [],
      };
    }
  }

  /**
   * Build the prompt from decision and state
   */
  private buildPrompt(decision: Decision, state: CrucibleState): string {
    // Get team info
    const team = state.teams.get(decision.teamId);
    const teamName = team?.teamName || decision.teamId;

    // Get making parish status
    const makingParish = state.parishes.get(decision.parishId);
    const makingParishStatus = makingParish
      ? `Power: ${makingParish.status.power}%, Comms: ${makingParish.status.communications}%, Morale: ${makingParish.morale}, Population: ${makingParish.status.populationRemaining.toLocaleString()}, Resources: Fuel ${makingParish.resources.fuel}%, Food ${makingParish.resources.food}%, Water ${makingParish.resources.water}%`
      : 'Unknown';

    // Build all parish statuses
    const allParishStatuses = Array.from(state.parishes.entries())
      .map(([id, parish]) => {
        return `${parish.name} (${id}): Power ${parish.status.power}%, Comms ${parish.status.communications}%, Morale ${parish.morale}, Pop: ${parish.status.populationRemaining.toLocaleString()}`;
      })
      .join('\n');

    // Get recent related decisions
    const recentDecisions = state.decisions
      .filter(
        (d) =>
          d.categoryId === decision.categoryId ||
          d.parishId === decision.parishId ||
          d.targetParishId === decision.parishId
      )
      .slice(-5)
      .map((d) => `[T+${d.simulationTime}] ${d.parishId}: ${d.decisionTypeId} → ${d.choice}`)
      .join('\n') || 'None';

    // Replace template placeholders
    let prompt = CONSEQUENCE_AGENT_USER_TEMPLATE;
    prompt = prompt.replace('{{teamName}}', teamName);
    prompt = prompt.replace('{{parishId}}', decision.parishId);
    prompt = prompt.replace('{{categoryId}}', decision.categoryId);
    prompt = prompt.replace('{{decisionTypeId}}', decision.decisionTypeId);
    prompt = prompt.replace('{{choice}}', decision.choice);
    prompt = prompt.replace('{{rationale}}', decision.rationale || 'None provided');
    prompt = prompt.replace('{{targetParishId}}', decision.targetParishId || 'N/A');
    prompt = prompt.replace('{{simulationTime}}', state.simulationTime.toString());
    prompt = prompt.replace('{{intensity}}', state.intensity.global.toString());
    prompt = prompt.replace('{{makingParishStatus}}', makingParishStatus);
    prompt = prompt.replace('{{allParishStatuses}}', allParishStatuses);
    prompt = prompt.replace('{{recentDecisions}}', recentDecisions);

    return prompt;
  }

  /**
   * Validate and sanitize consequence result
   */
  private validateResult(result: unknown): ConsequenceResult {
    const validated: ConsequenceResult = {
      immediate: [],
      ripple: [],
      delayed: [],
      narrativeHooks: [],
    };

    if (typeof result !== 'object' || result === null) {
      return validated;
    }

    const r = result as Record<string, unknown>;

    // Validate immediate effects
    if (Array.isArray(r.immediate)) {
      validated.immediate = r.immediate
        .filter(this.isValidEffect)
        .map((e) => ({
          parishId: String(e.parishId),
          category: e.category as ConsequenceEffect['category'],
          description: String(e.description),
          magnitude: Math.max(-5, Math.min(5, Number(e.magnitude))),
          visible: Boolean(e.visible),
        }));
    }

    // Validate ripple effects
    if (Array.isArray(r.ripple)) {
      validated.ripple = r.ripple
        .filter(this.isValidRippleEffect)
        .map((e) => ({
          parishId: String(e.parishId),
          category: e.category as ConsequenceEffect['category'],
          description: String(e.description),
          magnitude: Math.max(-5, Math.min(5, Number(e.magnitude))),
          visible: Boolean(e.visible),
          delayMinutes: Math.max(0, Number(e.delayMinutes)),
          trigger: String(e.trigger),
        }));
    }

    // Validate delayed effects
    if (Array.isArray(r.delayed)) {
      validated.delayed = r.delayed
        .filter(this.isValidDelayedEffect)
        .map((e) => ({
          description: String(e.description),
          delayMinutes: Math.max(0, Number(e.delayMinutes)),
          condition: String(e.condition),
        }));
    }

    // Validate narrative hooks
    if (Array.isArray(r.narrativeHooks)) {
      validated.narrativeHooks = r.narrativeHooks
        .filter((h): h is string => typeof h === 'string')
        .slice(0, 5);
    }

    return validated;
  }

  private isValidEffect(e: unknown): e is ConsequenceEffect {
    return (
      typeof e === 'object' &&
      e !== null &&
      typeof (e as Record<string, unknown>).parishId === 'string' &&
      typeof (e as Record<string, unknown>).category === 'string' &&
      typeof (e as Record<string, unknown>).description === 'string' &&
      typeof (e as Record<string, unknown>).magnitude === 'number'
    );
  }

  private isValidRippleEffect(e: unknown): e is RippleEffect {
    return (
      typeof e === 'object' &&
      e !== null &&
      typeof (e as Record<string, unknown>).parishId === 'string' &&
      typeof (e as Record<string, unknown>).category === 'string' &&
      typeof (e as Record<string, unknown>).description === 'string' &&
      typeof (e as Record<string, unknown>).magnitude === 'number' &&
      typeof (e as Record<string, unknown>).delayMinutes === 'number'
    );
  }

  private isValidDelayedEffect(e: unknown): e is DelayedEffect {
    return (
      typeof e === 'object' &&
      e !== null &&
      typeof (e as Record<string, unknown>).description === 'string' &&
      typeof (e as Record<string, unknown>).delayMinutes === 'number' &&
      typeof (e as Record<string, unknown>).condition === 'string'
    );
  }
}
