import Anthropic from '@anthropic-ai/sdk';
import { VALUES_OBSERVER_SYSTEM, VALUES_OBSERVER_USER_TEMPLATE } from './prompts/valuesObserver.js';
import type { CrucibleState, Decision } from '../schema/CrucibleState.js';

type ValuesAlignmentScore = -3 | -2 | -1 | 0 | 1 | 2 | 3;

interface ValuesAlignment {
  value: string;
  alignment: ValuesAlignmentScore;
  evidence: string;
}

interface ABCDAnalysis {
  affect: string;
  behavior: string;
  cognition: string;
  desire: string;
}

interface ValuesObservation {
  decisionId: string;
  statedValuesAnalysis: ValuesAlignment[];
  abcd: ABCDAnalysis;
  notableMoment: boolean;
  notableReason?: string;
  participantDynamics: string;
}

interface ValuesObserverConfig {
  apiKey: string;
  model?: string;
}

export class ValuesObserver {
  private client: Anthropic;
  private model: string;
  private observations: Map<string, ValuesObservation> = new Map();

  constructor(config: ValuesObserverConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Analyze a decision for values alignment
   */
  async analyzeDecision(
    decision: Decision,
    state: CrucibleState
  ): Promise<ValuesObservation> {
    const prompt = this.buildPrompt(decision, state);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: VALUES_OBSERVER_SYSTEM,
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
      const observation = this.validateObservation(parsed, decision.id);

      // Store observation
      this.observations.set(decision.id, observation);

      return observation;
    } catch (error) {
      console.error('ValuesObserver error:', error);
      return this.createDefaultObservation(decision.id);
    }
  }

  /**
   * Get all observations for a team
   */
  getTeamObservations(teamId: string, decisions: Decision[]): ValuesObservation[] {
    const teamDecisionIds = decisions
      .filter((d) => d.teamId === teamId)
      .map((d) => d.id);

    return teamDecisionIds
      .map((id) => this.observations.get(id))
      .filter((obs): obs is ValuesObservation => obs !== undefined);
  }

  /**
   * Get notable moments for debrief
   */
  getNotableMoments(): ValuesObservation[] {
    return Array.from(this.observations.values()).filter((obs) => obs.notableMoment);
  }

  /**
   * Calculate values gap summary for a team
   */
  calculateValuesGap(teamId: string, decisions: Decision[]): {
    value: string;
    avgAlignment: number;
    consistency: number;
  }[] {
    const observations = this.getTeamObservations(teamId, decisions);

    if (observations.length === 0) {
      return [];
    }

    // Aggregate alignments by value
    const valueAggregates = new Map<string, number[]>();

    for (const obs of observations) {
      for (const alignment of obs.statedValuesAnalysis) {
        const scores = valueAggregates.get(alignment.value) || [];
        scores.push(alignment.alignment);
        valueAggregates.set(alignment.value, scores);
      }
    }

    // Calculate stats for each value
    return Array.from(valueAggregates.entries()).map(([value, scores]) => {
      const avgAlignment = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Consistency = how stable the alignment is (lower variance = more consistent)
      const variance =
        scores.reduce((sum, score) => sum + Math.pow(score - avgAlignment, 2), 0) /
        scores.length;
      const consistency = Math.max(0, 100 - variance * 20);

      return {
        value,
        avgAlignment: Math.round(avgAlignment * 100) / 100,
        consistency: Math.round(consistency),
      };
    });
  }

  /**
   * Build the prompt from decision and state
   */
  private buildPrompt(decision: Decision, state: CrucibleState): string {
    const team = state.teams.get(decision.teamId);
    if (!team) {
      throw new Error(`Team ${decision.teamId} not found`);
    }

    // Get stated values
    const statedValues =
      Array.from(team.statedValues)
        .map((v, i) => `${i + 1}. ${v}`)
        .join('\n') || 'Not yet defined';

    // Get advocates info
    const advocates =
      Array.from(decision.advocatedBy)
        .map((id) => `- ${id}`)
        .join('\n') || 'Unknown';

    // Get situation context
    const parish = state.parishes.get(decision.parishId);
    const situationContext = parish
      ? `Parish Status: Power ${parish.status.power}%, Comms ${parish.status.communications}%, Morale ${parish.morale}. ${parish.currentCrisis ? `Crisis: ${parish.currentCrisis}` : 'No active crisis.'}`
      : 'Unknown situation';

    // Determine time pressure
    const intensity = state.intensity.byTeam.get(decision.teamId) ?? state.intensity.global;
    let timePressure = 'Low';
    if (intensity >= 8) {
      timePressure = 'Extreme';
    } else if (intensity >= 6) {
      timePressure = 'High';
    } else if (intensity >= 4) {
      timePressure = 'Moderate';
    }

    // Replace template placeholders
    let prompt = VALUES_OBSERVER_USER_TEMPLATE;
    prompt = prompt.replace('{{teamName}}', team.teamName);
    prompt = prompt.replace('{{parishId}}', team.parishId);
    prompt = prompt.replace('{{statedValues}}', statedValues);
    prompt = prompt.replace('{{commitmentStatement}}', team.commitmentStatement || 'None');
    prompt = prompt.replace('{{decisionProcess}}', team.decisionProcess);
    prompt = prompt.replace('{{decisionId}}', decision.id);
    prompt = prompt.replace('{{categoryId}}', decision.categoryId);
    prompt = prompt.replace('{{decisionTypeId}}', decision.decisionTypeId);
    prompt = prompt.replace('{{choice}}', decision.choice);
    prompt = prompt.replace('{{rationale}}', decision.rationale || 'None provided');
    prompt = prompt.replace('{{simulationTime}}', state.simulationTime.toString());
    prompt = prompt.replace('{{intensity}}', intensity.toString());
    prompt = prompt.replace('{{timePressure}}', timePressure);
    prompt = prompt.replace('{{advocates}}', advocates);
    prompt = prompt.replace('{{situationContext}}', situationContext);

    return prompt;
  }

  /**
   * Validate and sanitize observation result
   */
  private validateObservation(result: unknown, decisionId: string): ValuesObservation {
    if (typeof result !== 'object' || result === null) {
      return this.createDefaultObservation(decisionId);
    }

    const r = result as Record<string, unknown>;

    // Validate values analysis
    const statedValuesAnalysis: ValuesAlignment[] = [];
    if (Array.isArray(r.statedValuesAnalysis)) {
      for (const item of r.statedValuesAnalysis) {
        if (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).value === 'string' &&
          typeof (item as Record<string, unknown>).alignment === 'number'
        ) {
          const alignment = Math.max(-3, Math.min(3, Math.round((item as Record<string, unknown>).alignment as number)));
          statedValuesAnalysis.push({
            value: String((item as Record<string, unknown>).value),
            alignment: alignment as ValuesAlignmentScore,
            evidence: String((item as Record<string, unknown>).evidence || ''),
          });
        }
      }
    }

    // Validate ABCD
    const abcdRaw = r.abcd as Record<string, unknown> | undefined;
    const abcd: ABCDAnalysis = {
      affect: typeof abcdRaw?.affect === 'string' ? abcdRaw.affect : '',
      behavior: typeof abcdRaw?.behavior === 'string' ? abcdRaw.behavior : '',
      cognition: typeof abcdRaw?.cognition === 'string' ? abcdRaw.cognition : '',
      desire: typeof abcdRaw?.desire === 'string' ? abcdRaw.desire : '',
    };

    return {
      decisionId,
      statedValuesAnalysis,
      abcd,
      notableMoment: Boolean(r.notableMoment),
      notableReason: typeof r.notableReason === 'string' ? r.notableReason : undefined,
      participantDynamics: typeof r.participantDynamics === 'string' ? r.participantDynamics : '',
    };
  }

  /**
   * Create a default observation for error cases
   */
  private createDefaultObservation(decisionId: string): ValuesObservation {
    return {
      decisionId,
      statedValuesAnalysis: [],
      abcd: {
        affect: 'Unable to assess',
        behavior: 'Unable to assess',
        cognition: 'Unable to assess',
        desire: 'Unable to assess',
      },
      notableMoment: false,
      participantDynamics: 'Unable to assess',
    };
  }
}
