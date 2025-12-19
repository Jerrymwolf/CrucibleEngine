/**
 * Values Scorer Service
 *
 * Real-time values alignment scoring for team decisions.
 * Scores are captured during crisis but NOT shown to teams.
 * Used for debrief gap analysis.
 *
 * Uses ABCD framework:
 * - Affect: Emotional state observed
 * - Behavior: What they did
 * - Cognition: Reasoning expressed
 * - Desire: Outcome sought
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type {
  ValuesScoreRecord,
  TeamValueDefinition,
  ABCDAnalysis,
  ValuesAlignmentScore,
} from '@crucible/shared';
import type { DilemmaPhase } from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ScorerConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

interface DecisionToScore {
  decisionId: string;
  dilemmaId: string;
  dilemmaSetup: string;
  optionChosen: {
    id: string;
    label: string;
    description: string;
  };
  rationale: string;
  timestamp: number;
  simulationTime: number;
  phase: DilemmaPhase;
  intensityLevel: number;
  valuesCheckTriggered: boolean;
}

interface TeamContext {
  teamId: string;
  statedValues: string[];
  valueDefinitions: TeamValueDefinition[];
  commitmentStatement: string;
}

interface ScoringResult {
  record: ValuesScoreRecord;
  rawResponse: string;
  tokensUsed: number;
}

// ============================================================================
// PROMPTS
// ============================================================================

const SCORING_SYSTEM_PROMPT = `You are an expert facilitator analyzing leadership decisions for values alignment.

You score how well a team's decision aligns with THEIR OWN stated values and commitment.
Use THEIR definitions, not dictionary definitions.

SCORING SCALE (-3 to +3):
+3: Exemplary - Decision clearly honors this value at significant cost
+2: Strong - Decision reflects this value well
+1: Moderate - Decision somewhat reflects this value
 0: Neutral - Decision neither honors nor violates this value
-1: Tension - Decision creates minor tension with this value
-2: Significant gap - Decision clearly contradicts this value
-3: Violation - Decision fundamentally violates this value

ABCD FRAMEWORK:
- Affect: What emotional state drove the decision? (fear, urgency, compassion, pressure)
- Behavior: What did they actually DO? (the action, stripped of justification)
- Cognition: What reasoning did they express? (their stated logic)
- Desire: What outcome were they seeking? (the goal behind the choice)

NOTABLE MOMENT CATEGORIES:
- gap: Said-do gap (stated value vs enacted behavior)
- consistency: Maintained values under pressure
- conflict: Values conflicted with each other
- growth: Recognized and corrected drift

OUTPUT: JSON only. Be honest but compassionate. The goal is learning, not judgment.`;

function buildScoringPrompt(decision: DecisionToScore, team: TeamContext): string {
  const valuesSection = team.valueDefinitions
    .map(
      (v, i) => `${i + 1}. ${v.value}
   Their definition: "${v.teamDefinition}"
   Living it looks like: ${v.livingIt.join('; ')}
   Violating it looks like: ${v.violatingIt.join('; ')}`
    )
    .join('\n\n');

  return `TEAM'S STATED VALUES:
${valuesSection}

TEAM'S COMMITMENT:
"${team.commitmentStatement}"

THE DECISION:
Dilemma: ${decision.dilemmaSetup.substring(0, 500)}...

Choice made: "${decision.optionChosen.label}"
Description: ${decision.optionChosen.description}

Team's stated rationale: "${decision.rationale}"

Context:
- Phase: ${decision.phase}
- Intensity: ${decision.intensityLevel}/10
- Values check triggered before: ${decision.valuesCheckTriggered ? 'Yes' : 'No'}

Analyze this decision against THEIR stated values and commitment.
Be specific about evidence. Quote their rationale when relevant.

Return ONLY valid JSON:
{
  "scores": [
    {
      "value": "their value name",
      "alignment": -3 to +3,
      "evidence": "specific evidence from their rationale or choice",
      "confidence": 0-100,
      "teamDefinition": "their definition for context",
      "rationaleQuote": "relevant quote from their rationale if any"
    }
  ],
  "abcd": {
    "affect": "emotional driver observed",
    "behavior": "the action they took",
    "cognition": "reasoning they expressed",
    "desire": "outcome they sought"
  },
  "isNotable": true/false,
  "notableReason": "why this is a notable moment (if applicable)",
  "notableCategory": "gap|consistency|conflict|growth (if notable)",
  "commitmentAlignment": "aligned|tension|violation",
  "commitmentComparisonQuote": "how their action compares to their commitment words"
}`;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class ValuesScorer {
  private anthropic: Anthropic;
  private config: ScorerConfig;

  constructor(apiKey?: string, config?: Partial<ScorerConfig>) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      maxTokens: config?.maxTokens || 1500,
      temperature: config?.temperature || 0.3, // Lower temp for consistent scoring
    };
  }

  /**
   * Score a decision against the team's stated values
   */
  async scoreDecision(decision: DecisionToScore, team: TeamContext): Promise<ScoringResult> {
    const prompt = buildScoringPrompt(decision, team);

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from model');
    }

    const rawResponse = textContent.text;

    // Parse JSON response
    let parsed: {
      scores: Array<{
        value: string;
        alignment: number;
        evidence: string;
        confidence: number;
        teamDefinition?: string;
        rationaleQuote?: string;
      }>;
      abcd: ABCDAnalysis;
      isNotable: boolean;
      notableReason?: string;
      notableCategory?: 'gap' | 'consistency' | 'conflict' | 'growth';
      commitmentAlignment: 'aligned' | 'tension' | 'violation';
      commitmentComparisonQuote?: string;
    };

    try {
      const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                        rawResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawResponse;
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse scoring JSON: ${rawResponse.substring(0, 200)}`);
    }

    // Build record
    const record: ValuesScoreRecord = {
      id: `score_${randomUUID().split('-')[0]}`,
      decisionId: decision.decisionId,
      teamId: team.teamId,
      simulationTime: decision.simulationTime,
      phase: decision.phase,
      scores: parsed.scores.map((s) => ({
        value: s.value,
        alignment: Math.max(-3, Math.min(3, s.alignment)) as ValuesAlignmentScore,
        evidence: s.evidence,
        confidence: Math.max(0, Math.min(100, s.confidence)),
        teamDefinition: s.teamDefinition,
        rationaleQuote: s.rationaleQuote,
      })),
      abcd: parsed.abcd,
      isNotable: parsed.isNotable,
      notableReason: parsed.notableReason,
      notableCategory: parsed.notableCategory,
      commitmentAlignment: parsed.commitmentAlignment,
      commitmentComparisonQuote: parsed.commitmentComparisonQuote,
      valuesCheckTriggered: decision.valuesCheckTriggered,
      meta: {
        scoredAt: Date.now(),
        modelUsed: this.config.model,
        confidence: this.calculateOverallConfidence(parsed.scores),
      },
    };

    return {
      record,
      rawResponse,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Calculate overall confidence from individual scores
   */
  private calculateOverallConfidence(
    scores: Array<{ confidence: number }>
  ): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s.confidence, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * Check if a decision should be flagged as notable
   * Uses heuristics in addition to AI judgment
   */
  static shouldFlagAsNotable(record: ValuesScoreRecord): boolean {
    // Already flagged by AI
    if (record.isNotable) return true;

    // Heuristics for notable moments:

    // 1. Any -3 score (violation)
    if (record.scores.some((s) => s.alignment <= -3)) return true;

    // 2. Any +3 score under high pressure
    // (We don't have intensity here, but we can check phase)
    if (record.phase === 'crisis' && record.scores.some((s) => s.alignment >= 3)) {
      return true;
    }

    // 3. Commitment violation
    if (record.commitmentAlignment === 'violation') return true;

    // 4. Values check was triggered but decision still had tension
    // (violation is already handled above)
    if (record.valuesCheckTriggered && record.commitmentAlignment === 'tension') {
      return true;
    }

    return false;
  }

  /**
   * Calculate cumulative alignment for time series
   */
  static calculateCumulativeAlignment(
    records: ValuesScoreRecord[]
  ): Map<string, number> {
    const cumulative = new Map<string, { sum: number; count: number }>();

    for (const record of records) {
      for (const score of record.scores) {
        const current = cumulative.get(score.value) || { sum: 0, count: 0 };
        cumulative.set(score.value, {
          sum: current.sum + score.alignment,
          count: current.count + 1,
        });
      }
    }

    // Calculate averages
    const result = new Map<string, number>();
    cumulative.forEach((data, value) => {
      result.set(value, data.count > 0 ? data.sum / data.count : 0);
    });

    return result;
  }

  /**
   * Get average alignment by phase
   */
  static getAlignmentByPhase(
    records: ValuesScoreRecord[]
  ): Map<DilemmaPhase, Map<string, number>> {
    const byPhase = new Map<DilemmaPhase, ValuesScoreRecord[]>();

    for (const record of records) {
      const phaseRecords = byPhase.get(record.phase) || [];
      phaseRecords.push(record);
      byPhase.set(record.phase, phaseRecords);
    }

    const result = new Map<DilemmaPhase, Map<string, number>>();
    byPhase.forEach((phaseRecords, phase) => {
      result.set(phase, ValuesScorer.calculateCumulativeAlignment(phaseRecords));
    });

    return result;
  }

  /**
   * Identify notable moments for debrief
   */
  static getNotableMoments(records: ValuesScoreRecord[]): ValuesScoreRecord[] {
    return records.filter((r) => ValuesScorer.shouldFlagAsNotable(r));
  }

  /**
   * Find the biggest gap between stated values and enacted behavior
   */
  static findBiggestGap(
    records: ValuesScoreRecord[],
    teamValues: string[]
  ): { value: string; averageAlignment: number; lowestPoint: ValuesScoreRecord | null } | null {
    const alignments = ValuesScorer.calculateCumulativeAlignment(records);

    let biggestGap: { value: string; avg: number; lowest: ValuesScoreRecord | null } | null = null;

    for (const value of teamValues) {
      const avg = alignments.get(value) || 0;

      // Find lowest point for this value
      let lowest: ValuesScoreRecord | null = null;
      let lowestScore = 0;
      for (const record of records) {
        const valueScore = record.scores.find((s) => s.value === value);
        if (valueScore && valueScore.alignment < lowestScore) {
          lowestScore = valueScore.alignment;
          lowest = record;
        }
      }

      if (!biggestGap || avg < biggestGap.avg) {
        biggestGap = { value, avg, lowest };
      }
    }

    if (!biggestGap) return null;

    return {
      value: biggestGap.value,
      averageAlignment: biggestGap.avg,
      lowestPoint: biggestGap.lowest,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let scorerInstance: ValuesScorer | null = null;

export function getValuesScorer(): ValuesScorer {
  if (!scorerInstance) {
    scorerInstance = new ValuesScorer();
  }
  return scorerInstance;
}
