import Anthropic from '@anthropic-ai/sdk';
import { NARRATIVE_AGENT_SYSTEM, NARRATIVE_AGENT_USER_TEMPLATE } from './prompts/narrativeAgent.js';
import type { CrucibleState } from '../schema/CrucibleState.js';

interface NarrativeContent {
  type: 'news' | 'social' | 'radio' | 'weather' | 'official';
  source: string;
  content: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedParish?: string;
  breaking: boolean;
}

interface NarrativeAgentConfig {
  apiKey: string;
  model?: string;
}

export class NarrativeAgent {
  private client: Anthropic;
  private model: string;

  constructor(config: NarrativeAgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Generate narrative content based on current game state
   */
  async generateContent(state: CrucibleState): Promise<NarrativeContent[]> {
    const prompt = this.buildPrompt(state);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: NARRATIVE_AGENT_SYSTEM,
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
      const parsed = JSON.parse(textContent.text) as NarrativeContent[];
      return this.validateContent(parsed);
    } catch (error) {
      console.error('NarrativeAgent error:', error);
      return [];
    }
  }

  /**
   * Stream narrative content for real-time updates
   */
  async *streamContent(state: CrucibleState): AsyncGenerator<string> {
    const prompt = this.buildPrompt(state);

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      system: NARRATIVE_AGENT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * Build the prompt from game state
   */
  private buildPrompt(state: CrucibleState): string {
    // Build parish statuses
    const parishStatuses = Array.from(state.parishes.entries())
      .map(([id, parish]) => {
        return `${parish.name}: Power ${parish.status.power}%, Comms ${parish.status.communications}%, Morale ${parish.morale}%, Pop: ${parish.status.populationRemaining.toLocaleString()}, Casualties: ${parish.status.casualties}`;
      })
      .join('\n');

    // Build recent decisions (last 5)
    const recentDecisions = state.decisions
      .slice(-5)
      .map((d) => `[T+${d.simulationTime}] ${d.parishId}: ${d.decisionTypeId} → ${d.choice}`)
      .join('\n') || 'None yet';

    // Build active crises
    const activeCrises = Array.from(state.parishes.entries())
      .filter(([, p]) => p.currentCrisis)
      .map(([, p]) => `${p.name}: ${p.currentCrisis}`)
      .join('\n') || 'None active';

    // Replace template placeholders
    let prompt = NARRATIVE_AGENT_USER_TEMPLATE;
    prompt = prompt.replace('{{simulationTime}}', state.simulationTime.toString());
    prompt = prompt.replace('{{intensity}}', state.intensity.global.toString());
    prompt = prompt.replace('{{weatherConditions}}', state.weather.conditions);
    prompt = prompt.replace('{{hurricaneCategory}}', state.weather.hurricane.category.toString());
    prompt = prompt.replace('{{hurricaneTrajectory}}', state.weather.hurricane.trajectory);
    prompt = prompt.replace('{{hoursToImpact}}', state.weather.hurricane.hoursToImpact.toString());
    prompt = prompt.replace('{{currentAdvisory}}', state.weather.hurricane.currentAdvisory || 'None');
    prompt = prompt.replace('{{parishStatuses}}', parishStatuses);
    prompt = prompt.replace('{{recentDecisions}}', recentDecisions);
    prompt = prompt.replace('{{activeCrises}}', activeCrises);

    return prompt;
  }

  /**
   * Validate and sanitize content from AI
   */
  private validateContent(content: unknown): NarrativeContent[] {
    if (!Array.isArray(content)) {
      return [];
    }

    return content
      .filter((item): item is NarrativeContent => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.type === 'string' &&
          typeof item.source === 'string' &&
          typeof item.content === 'string' &&
          typeof item.urgency === 'number' &&
          item.urgency >= 1 &&
          item.urgency <= 5
        );
      })
      .map((item) => ({
        type: item.type as NarrativeContent['type'],
        source: item.source,
        content: item.content,
        urgency: item.urgency as 1 | 2 | 3 | 4 | 5,
        relatedParish: item.relatedParish,
        breaking: Boolean(item.breaking),
      }));
  }
}
