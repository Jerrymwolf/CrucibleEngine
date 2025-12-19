/**
 * Dilemma Generator Service
 *
 * LLM-powered generation of dilemmas tailored to team values profiles.
 * Creates personalized moral dilemmas that specifically test the team's
 * stated values and commitment language.
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type {
  DilemmaGenerationContext,
  GeneratedDilemma,
  GeneratedDilemmaOption,
  TeamValuesProfile,
  TeamValueDefinition,
  DilemmaParishStatus,
} from '@crucible/shared';
import type { DilemmaPhase, DilemmaWeight, ParishIdLower, PersonaId } from '@crucible/shared';
import { PERSONAS, PARISHES } from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

interface GeneratorConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

interface GenerationResult {
  dilemma: GeneratedDilemma;
  rawResponse: string;
  tokensUsed: number;
}

// ============================================================================
// PROMPTS
// ============================================================================

const DILEMMA_SYSTEM_PROMPT = `You are an expert facilitator creating moral dilemmas for a leadership values simulation.

The simulation is set on Concordia Island during Hurricane Midas. Teams manage parishes for Meridian BioSciences, which produces Celarithin - a cancer medication that 340,000 patients depend on.

CRITICAL RULES:
1. Test THEIR values - Use their exact commitment language and definitions
2. No clean choices - Every option must have a meaningful cost
3. Create ambiguity - Who counts as "our people"? What's the threshold?
4. Consequences cascade - Reference previous decisions when provided
5. 3-4 options only - Never 2, never 5+
6. No option should score +3 on ALL their values (no "right answer")
7. At least one option honors their commitment (at cost)
8. At least one option violates their commitment (for benefit)
9. Persona voice must be authentic to their character

INTENSITY CALIBRATION:
- Watch (2-5): Positioning decisions, preparation tradeoffs, "do X now or wait?"
- Crisis (6-9): Impossible tradeoffs, "save A or B, not both"
- Peak (9-10): Life and death, no ambiguity about stakes
- Recovery (4-6): Accountability, "how do we explain what happened?"

OUTPUT FORMAT: JSON only. No markdown, no explanation. Just the dilemma object.`;

function buildGenerationPrompt(context: DilemmaGenerationContext): string {
  const { teamProfile, worldState, decisionHistory, parameters } = context;

  // Format team values with their definitions
  const valuesSection = teamProfile.valueDefinitions
    .map(
      (v: TeamValueDefinition, i: number) => `${i + 1}. ${v.value}
   Team definition: "${v.teamDefinition}"
   Living it: ${v.livingIt.join('; ')}
   Violating it: ${v.violatingIt.join('; ')}`
    )
    .join('\n\n');

  // Format recent decisions if any
  let decisionSection = 'No previous decisions yet.';
  if (decisionHistory.decisions.length > 0) {
    const recent = decisionHistory.decisions.slice(-3);
    decisionSection = recent
      .map(
        (d) => `- ${d.dilemmaId}: Chose "${d.choice}" because "${d.rationale}"
   Consequences: ${d.consequences.join(', ')}`
      )
      .join('\n');
  }

  // Get parish info if specified
  let parishContext = '';
  if (parameters.parishFocus) {
    const parishKey = Object.keys(PARISHES).find(
      (k) => PARISHES[k as keyof typeof PARISHES].id === parameters.parishFocus
    ) as keyof typeof PARISHES | undefined;
    if (parishKey) {
      const parish = PARISHES[parishKey];
      parishContext = `
FOCUS PARISH: ${parish.name}
- Population: ${parish.population.toLocaleString()}
- ${parish.description}
- Who lives here: ${parish.classCharacter.whoLivesHere}
- They fear: ${parish.classCharacter.whatTheyFear}
- They want: ${parish.classCharacter.whatTheyWant}
- Key vulnerabilities: ${parish.vulnerabilities.join(', ')}`;
    }
  }

  // Get persona info if required
  let personaContext = '';
  if (parameters.personaRequired) {
    const persona = PERSONAS[parameters.personaRequired];
    if (persona) {
      personaContext = `
REQUIRED PERSONA: ${persona.name} (${persona.title})
- Background: ${persona.background}
- Speaking style: ${persona.speakingStyle.vocabulary} vocabulary, ${persona.speakingStyle.tone} tone
- Primary motivation: ${persona.primaryValue}
- Signature line: "${persona.signatureLine}"
- NEVER says: ${persona.neverSays.join(', ')}`;
    }
  }

  // Build buildOn reference if specified
  let buildOnContext = '';
  if (parameters.buildOnDecisionId) {
    const prevDecision = decisionHistory.decisions.find(
      (d) => d.decisionId === parameters.buildOnDecisionId
    );
    if (prevDecision) {
      buildOnContext = `
BUILD ON PREVIOUS DECISION:
Decision: ${prevDecision.dilemmaId}
Choice: "${prevDecision.choice}"
Rationale: "${prevDecision.rationale}"
Consequences: ${prevDecision.consequences.join(', ')}

Create a dilemma that directly follows from this decision - show how it cascades.`;
    }
  }

  return `TEAM VALUES PROFILE:
${valuesSection}

TEAM COMMITMENT:
"${teamProfile.commitmentStatement}"

Decision process: ${teamProfile.decisionProcess}

CURRENT WORLD STATE:
- Timeline: ${worldState.currentWindow.id} (${worldState.currentPhase})
- Intensity Level: ${worldState.intensityLevel}/10
- Active conditions: ${worldState.activeConditions.join(', ') || 'None'}
${parishContext}

RECENT DECISIONS:
${decisionSection}
${personaContext}
${buildOnContext}

GENERATION PARAMETERS:
- Target intensity: ${parameters.targetIntensity}/10
- Parish focus: ${parameters.parishFocus || 'Any'}
- Persona required: ${parameters.personaRequired || 'Any'}
- Avoid types: ${parameters.avoidDilemmaTypes?.join(', ') || 'None'}

Generate a dilemma that tests this team's specific values. Use their exact language.
The dilemma should create genuine tension - no easy answers.

Return ONLY valid JSON matching this structure:
{
  "title": "5 words max",
  "phase": "watch|crisis|recovery",
  "parishId": "${parameters.parishFocus || 'multi'}",
  "setup": "Situation using team's commitment language, 2-3 paragraphs",
  "trigger": {
    "intensityMin": ${parameters.targetIntensity - 1},
    "intensityMax": ${parameters.targetIntensity + 1}
  },
  "options": [
    {
      "id": "a",
      "label": "Short action label",
      "description": "What this means, using their value language",
      "consequenceSketch": {
        "immediate": "What happens right away",
        "ripple": "Effects on other parishes/people",
        "delayed": "Long-term consequences"
      },
      "valueAlignment": {
        "their value 1": -3 to +3,
        "their value 2": -3 to +3
      }
    }
  ],
  "valuesTested": ["their value 1", "their value 2"],
  "personaId": "${parameters.personaRequired || 'reeves'}",
  "narrativeWeight": "standard|major|pivotal",
  "commitmentRelevance": "How this specifically tests their commitment statement"
}`;
}

// ============================================================================
// VALIDATOR HELPERS
// ============================================================================

function validateGeneratedDilemma(
  dilemma: Partial<GeneratedDilemma>,
  teamProfile: { statedValues: string[]; commitmentStatement: string }
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!dilemma.title || dilemma.title.split(' ').length > 7) {
    errors.push('Title must be 5-7 words');
  }
  if (!dilemma.setup || dilemma.setup.length < 100) {
    errors.push('Setup must be at least 100 characters');
  }
  if (!dilemma.options || dilemma.options.length < 3 || dilemma.options.length > 4) {
    errors.push('Must have 3-4 options');
  }
  if (!dilemma.valuesTested || dilemma.valuesTested.length === 0) {
    errors.push('Must test at least one value');
  }
  if (!dilemma.commitmentRelevance) {
    errors.push('Must explain commitment relevance');
  }

  // Check options
  if (dilemma.options) {
    for (const option of dilemma.options) {
      if (!option.label || !option.description) {
        errors.push(`Option ${option.id} missing label or description`);
      }
      if (!option.consequenceSketch) {
        errors.push(`Option ${option.id} missing consequence sketch`);
      }
      if (!option.valueAlignment || Object.keys(option.valueAlignment).length === 0) {
        errors.push(`Option ${option.id} missing value alignment scores`);
      }
    }

    // Check no "right answer" (no option scores +3 on all values)
    for (const option of dilemma.options) {
      if (option.valueAlignment) {
        const scores = Object.values(option.valueAlignment);
        const allPositive = scores.every((score) => score >= 2);
        if (allPositive && scores.length >= teamProfile.statedValues.length) {
          errors.push(`Option ${option.id} scores too high on all values - no right answers allowed`);
        }
      }
    }
  }

  // Check values tested are from team's values
  if (dilemma.valuesTested) {
    for (const value of dilemma.valuesTested) {
      const lowerValue = value.toLowerCase();
      const matchFound = teamProfile.statedValues.some(
        (v) => v.toLowerCase() === lowerValue || v.toLowerCase().includes(lowerValue)
      );
      if (!matchFound) {
        warnings.push(`Value "${value}" not in team's stated values`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class DilemmaGenerator {
  private anthropic: Anthropic;
  private config: GeneratorConfig;

  constructor(apiKey?: string, config?: Partial<GeneratorConfig>) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      maxTokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.7,
    };
  }

  /**
   * Generate a dilemma tailored to the team's values profile
   */
  async generateDilemma(context: DilemmaGenerationContext): Promise<GenerationResult> {
    const prompt = buildGenerationPrompt(context);

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: DILEMMA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from model');
    }

    const rawResponse = textContent.text;

    // Parse JSON response
    let parsedDilemma: Partial<GeneratedDilemma>;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                        rawResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawResponse;
      parsedDilemma = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse dilemma JSON: ${rawResponse.substring(0, 200)}`);
    }

    // Validate
    const validation = validateGeneratedDilemma(parsedDilemma, {
      statedValues: context.teamProfile.statedValues,
      commitmentStatement: context.teamProfile.commitmentStatement,
    });

    if (!validation.valid) {
      throw new Error(`Generated dilemma invalid: ${validation.errors.join('; ')}`);
    }

    // Add generation metadata
    const dilemma: GeneratedDilemma = {
      id: `gen_${randomUUID().split('-')[0]}`,
      title: parsedDilemma.title!,
      phase: (parsedDilemma.phase as DilemmaPhase) || 'watch',
      parishId: (parsedDilemma.parishId as ParishIdLower | 'multi') || 'multi',
      setup: parsedDilemma.setup!,
      trigger: parsedDilemma.trigger || { intensityMin: 1, intensityMax: 10 },
      options: (parsedDilemma.options || []) as GeneratedDilemmaOption[],
      valuesTested: parsedDilemma.valuesTested || [],
      personaId: (parsedDilemma.personaId as PersonaId | PersonaId[]) || 'reeves',
      narrativeWeight: (parsedDilemma.narrativeWeight as DilemmaWeight) || 'standard',
      commitmentRelevance: parsedDilemma.commitmentRelevance || '',
      generationMeta: {
        generatedAt: Date.now(),
        contextWindow: context.worldState.currentWindow.id,
        intensityTarget: context.parameters.targetIntensity,
        modelUsed: this.config.model,
      },
    };

    // Add buildsOnDecision if specified
    if (context.parameters.buildOnDecisionId) {
      const prevDecision = context.decisionHistory.decisions.find(
        (d) => d.decisionId === context.parameters.buildOnDecisionId
      );
      if (prevDecision) {
        dilemma.buildsOnDecision = {
          decisionId: context.parameters.buildOnDecisionId,
          connection: `Follows from choosing "${prevDecision.choice}"`,
        };
      }
    }

    return {
      dilemma,
      rawResponse,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Generate multiple dilemma candidates and return the best
   */
  async generateDilemmaWithRetry(
    context: DilemmaGenerationContext,
    maxAttempts: number = 3
  ): Promise<GeneratedDilemma> {
    let lastError: Error | null = null;
    const candidates: GeneratedDilemma[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.generateDilemma(context);
        candidates.push(result.dilemma);

        // If we have a valid dilemma, return it
        if (candidates.length > 0) {
          // Could add scoring logic here to pick best candidate
          return candidates[0];
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Dilemma generation attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Failed to generate dilemma after max attempts');
  }

  /**
   * Build a full generation context from room state
   */
  static buildContext(
    teamProfile: TeamValuesProfile,
    worldState: {
      currentWindowId: string;
      currentPhase: string;
      parishStatuses: Map<ParishIdLower, DilemmaParishStatus>;
      activeConditions: string[];
      intensityLevel: number;
    },
    decisionHistory: {
      decisions: Array<{
        decisionId: string;
        dilemmaId: string;
        choice: string;
        rationale: string;
        timestamp: number;
        phase: DilemmaPhase;
        valuesAtStake: string[];
        consequences: string[];
      }>;
      consequencesTriggered: string[];
    },
    parameters: {
      targetIntensity?: number;
      parishFocus?: ParishIdLower;
      personaRequired?: PersonaId;
      buildOnDecisionId?: string;
      avoidDilemmaTypes?: string[];
    }
  ): DilemmaGenerationContext {
    return {
      teamProfile: {
        statedValues: teamProfile.statedValues,
        valueDefinitions: teamProfile.valueDefinitions,
        commitmentStatement: teamProfile.commitmentStatement,
        decisionProcess: teamProfile.decisionProcess,
      },
      worldState: {
        currentWindow: { id: worldState.currentWindowId } as DilemmaGenerationContext['worldState']['currentWindow'],
        currentPhase: worldState.currentPhase as DilemmaGenerationContext['worldState']['currentPhase'],
        parishStatuses: worldState.parishStatuses,
        activeConditions: worldState.activeConditions,
        intensityLevel: worldState.intensityLevel,
      },
      decisionHistory: {
        decisions: decisionHistory.decisions,
        consequencesTriggered: decisionHistory.consequencesTriggered,
        cumulativeAlignmentByValue: new Map(),
      },
      parameters: {
        targetIntensity: parameters.targetIntensity || worldState.intensityLevel,
        parishFocus: parameters.parishFocus,
        personaRequired: parameters.personaRequired,
        buildOnDecisionId: parameters.buildOnDecisionId,
        avoidDilemmaTypes: parameters.avoidDilemmaTypes,
      },
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let generatorInstance: DilemmaGenerator | null = null;

export function getDilemmaGenerator(): DilemmaGenerator {
  if (!generatorInstance) {
    generatorInstance = new DilemmaGenerator();
  }
  return generatorInstance;
}
