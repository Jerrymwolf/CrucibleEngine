import Anthropic from '@anthropic-ai/sdk';
import { NARRATIVE_AGENT_SYSTEM, NARRATIVE_AGENT_USER_TEMPLATE } from './prompts/narrativeAgent.js';
import type { CrucibleState } from '../schema/CrucibleState.js';
import {
  buildPersonaConstraint,
  getPersonaById,
  getCurrentWindow,
  type PersonaId,
} from '@crucible/shared';

interface NarrativeContent {
  type: 'news' | 'social' | 'radio' | 'weather' | 'official' | 'character';
  source: string;
  content: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedParish?: string;
  breaking: boolean;
  personaId?: PersonaId;
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

  /**
   * Generate persona-constrained character dialogue
   * Uses persona fences to ensure consistent character voice
   */
  async generateCharacterDialogue(
    personaId: PersonaId,
    situation: string,
    state: CrucibleState
  ): Promise<NarrativeContent | null> {
    const persona = getPersonaById(personaId);
    const personaConstraint = buildPersonaConstraint(personaId);
    const currentWindow = getCurrentWindow(state.simulationTime);

    const systemPrompt = `${NARRATIVE_AGENT_SYSTEM}

CHARACTER CONSTRAINT:
${personaConstraint}

You must generate dialogue ONLY for this character. Stay strictly within their voice, knowledge, and values.
The character must NEVER reference information from "doesNotKnow" list.`;

    const userPrompt = `CURRENT SITUATION:
${situation}

TIMELINE: ${currentWindow.label} (${currentWindow.phase} phase)
Weather: ${currentWindow.weather.windMph}mph winds, visibility ${currentWindow.weather.visibility}
Emerging pressures: ${currentWindow.emergingPressures.join('; ')}

GAME STATE:
Simulation time: T+${state.simulationTime} minutes
Intensity: ${state.intensity.global}/10
Parish ${persona.parishId} morale: ${state.parishes.get(persona.parishId)?.morale || 'unknown'}%

Generate a single piece of character dialogue (1-3 sentences) that ${persona.name} would say in this situation.
The dialogue should reflect their ${persona.speakingStyle.vocabulary} vocabulary and ${persona.speakingStyle.tone} tone.
It should advance the narrative tension around their core conflict: ${persona.valueTension}.

Respond with JSON: { "content": "the dialogue", "urgency": 1-5, "breaking": boolean }`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const parsed = JSON.parse(textContent.text);

      return {
        type: 'character',
        source: persona.name,
        content: parsed.content,
        urgency: Math.max(1, Math.min(5, parsed.urgency || 3)) as 1 | 2 | 3 | 4 | 5,
        relatedParish: persona.parishId,
        breaking: Boolean(parsed.breaking),
        personaId,
      };
    } catch (error) {
      console.error(`[NarrativeAgent] Character dialogue error for ${personaId}:`, error);
      return null;
    }
  }

  /**
   * Generate dialogue for a dilemma presentation
   * The persona voices the pressure/conflict of the dilemma
   */
  async generateDilemmaPresentation(
    personaId: PersonaId,
    dilemmaSetup: string,
    options: string[],
    state: CrucibleState
  ): Promise<NarrativeContent | null> {
    const persona = getPersonaById(personaId);
    const personaConstraint = buildPersonaConstraint(personaId);

    const systemPrompt = `${NARRATIVE_AGENT_SYSTEM}

CHARACTER CONSTRAINT:
${personaConstraint}

You are presenting a critical decision point to the player team. Stay in character.`;

    const userPrompt = `DILEMMA SITUATION:
${dilemmaSetup}

AVAILABLE OPTIONS:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Generate ${persona.name}'s in-character presentation of this dilemma (2-4 sentences).
They should convey urgency and the weight of the decision without explicitly listing options.
Their presentation should reflect their personal stake in the outcome based on their primary value: "${persona.primaryValue}".

Respond with JSON: { "content": "the presentation dialogue", "urgency": 1-5 }`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const parsed = JSON.parse(textContent.text);

      return {
        type: 'character',
        source: persona.name,
        content: parsed.content,
        urgency: Math.max(1, Math.min(5, parsed.urgency || 4)) as 1 | 2 | 3 | 4 | 5,
        relatedParish: persona.parishId,
        breaking: true, // Dilemmas are always breaking
        personaId,
      };
    } catch (error) {
      console.error(`[NarrativeAgent] Dilemma presentation error for ${personaId}:`, error);
      return null;
    }
  }
}
