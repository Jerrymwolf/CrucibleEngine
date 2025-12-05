import Anthropic from '@anthropic-ai/sdk';
import { TEMPEST_MONITOR_SYSTEM, TEMPEST_MONITOR_USER_TEMPLATE } from './prompts/tempestMonitor.js';
import type { CrucibleState } from '../schema/CrucibleState.js';

type PsychologicalZone = 'comfort' | 'learning' | 'panic';
type Recommendation = 'increase' | 'maintain' | 'decrease' | 'pause';

interface TempestAssessment {
  teamId: string;
  currentZone: PsychologicalZone;
  confidence: number; // 0-100
  signals: string[];
  recommendation: Recommendation;
  suggestedLever: string;
  rationale: string;
}

interface TempestMonitorConfig {
  apiKey: string;
  model?: string;
}

export class TempestMonitor {
  private client: Anthropic;
  private model: string;
  private decisionTimestamps: Map<string, number[]> = new Map();

  constructor(config: TempestMonitorConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Record a decision timestamp for velocity tracking
   */
  recordDecision(teamId: string, timestamp: number): void {
    const timestamps = this.decisionTimestamps.get(teamId) || [];
    timestamps.push(timestamp);
    // Keep last 20 decisions
    if (timestamps.length > 20) {
      timestamps.shift();
    }
    this.decisionTimestamps.set(teamId, timestamps);
  }

  /**
   * Assess a team's psychological state
   */
  async assessTeam(teamId: string, state: CrucibleState): Promise<TempestAssessment> {
    const prompt = this.buildPrompt(teamId, state);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: TEMPEST_MONITOR_SYSTEM,
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
      return this.validateAssessment(parsed, teamId);
    } catch (error) {
      console.error('TempestMonitor error:', error);
      return {
        teamId,
        currentZone: 'learning',
        confidence: 0,
        signals: ['Unable to assess'],
        recommendation: 'maintain',
        suggestedLever: 'none',
        rationale: 'Assessment failed',
      };
    }
  }

  /**
   * Assess all teams and return combined advisory
   * Uses Promise.all for parallel execution (performance optimization)
   */
  async assessAllTeams(state: CrucibleState): Promise<{
    assessments: TempestAssessment[];
    overallAdvisory: string;
  }> {
    const teamIds = Array.from(state.teams.keys());

    // Parallel assessment - all teams assessed concurrently
    const assessments = await Promise.all(
      teamIds.map(teamId => this.assessTeam(teamId, state))
    );

    // Generate overall advisory
    const panicTeams = assessments.filter((a) => a.currentZone === 'panic');
    const comfortTeams = assessments.filter((a) => a.currentZone === 'comfort');

    let overallAdvisory = '';
    if (panicTeams.length > 0) {
      overallAdvisory = `⚠️ ${panicTeams.length} team(s) in panic zone. Consider reducing intensity or calling stand-down.`;
    } else if (comfortTeams.length > assessments.length / 2) {
      overallAdvisory = `📈 Most teams in comfort zone. Consider increasing pressure to drive engagement.`;
    } else {
      overallAdvisory = `✓ Teams in productive learning zone. Maintain current intensity.`;
    }

    return { assessments, overallAdvisory };
  }

  /**
   * Build the prompt from team state
   */
  private buildPrompt(teamId: string, state: CrucibleState): string {
    const team = state.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const parish = state.parishes.get(team.parishId);

    // Calculate decision velocity
    const timestamps = this.decisionTimestamps.get(teamId) || [];
    let avgDecisionTime = 0;
    let recentDecisionCount = 0;

    if (timestamps.length > 1) {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      recentDecisionCount = timestamps.filter((t) => t >= fiveMinutesAgo).length;

      // Average time between decisions
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push((timestamps[i] ?? 0) - (timestamps[i - 1] ?? 0));
      }
      if (intervals.length > 0) {
        avgDecisionTime = Math.round(
          intervals.reduce((a, b) => a + b, 0) / intervals.length / 1000
        );
      }
    }

    // Get team's recent decisions
    const teamDecisions = state.decisions
      .filter((d) => d.teamId === teamId)
      .slice(-10)
      .map(
        (d) =>
          `[T+${d.simulationTime}] ${d.decisionTypeId} → ${d.choice}${d.rationale ? ` (${d.rationale.substring(0, 50)}...)` : ''}`
      )
      .join('\n') || 'None yet';

    // Get inter-parish activity
    const interParishActivity = state.decisions
      .filter(
        (d) =>
          (d.teamId === teamId && d.targetParishId) ||
          d.targetParishId === team.parishId
      )
      .slice(-5)
      .map((d) => {
        const direction =
          d.teamId === teamId ? `→ ${d.targetParishId}` : `← from ${d.parishId}`;
        return `${d.decisionTypeId} ${direction}: ${d.choice}`;
      })
      .join('\n') || 'None';

    // Get intensity for this team
    const intensity =
      state.intensity.byTeam.get(teamId) ?? state.intensity.global;

    // Get stated values
    const statedValues =
      Array.from(team.statedValues).join(', ') || 'Not yet defined';

    // Current crises
    const currentCrises = parish?.currentCrisis || 'None active';

    // Calculate phase minutes
    const phaseMinutes = Math.round(
      (Date.now() - state.phase.phaseStartTime) / 60000
    );

    // Replace template placeholders
    let prompt = TEMPEST_MONITOR_USER_TEMPLATE;
    prompt = prompt.replace('{{teamName}}', team.teamName);
    prompt = prompt.replace('{{parishId}}', team.parishId);
    prompt = prompt.replace('{{intensity}}', intensity.toString());
    prompt = prompt.replace('{{phaseMinutes}}', phaseMinutes.toString());
    prompt = prompt.replace('{{recentDecisions}}', teamDecisions);
    prompt = prompt.replace('{{avgDecisionTime}}', avgDecisionTime.toString());
    prompt = prompt.replace('{{recentDecisionCount}}', recentDecisionCount.toString());
    prompt = prompt.replace('{{memberCount}}', team.members.length.toString());
    prompt = prompt.replace('{{statedValues}}', statedValues);
    prompt = prompt.replace('{{interParishActivity}}', interParishActivity);
    prompt = prompt.replace('{{currentCrises}}', currentCrises);

    return prompt;
  }

  /**
   * Validate and sanitize assessment result
   */
  private validateAssessment(result: unknown, teamId: string): TempestAssessment {
    const defaultAssessment: TempestAssessment = {
      teamId,
      currentZone: 'learning',
      confidence: 50,
      signals: [],
      recommendation: 'maintain',
      suggestedLever: 'none',
      rationale: 'Default assessment',
    };

    if (typeof result !== 'object' || result === null) {
      return defaultAssessment;
    }

    const r = result as Record<string, unknown>;

    // Validate zone
    const validZones: PsychologicalZone[] = ['comfort', 'learning', 'panic'];
    const zone = validZones.includes(r.currentZone as PsychologicalZone)
      ? (r.currentZone as PsychologicalZone)
      : 'learning';

    // Validate recommendation
    const validRecs: Recommendation[] = ['increase', 'maintain', 'decrease', 'pause'];
    const recommendation = validRecs.includes(r.recommendation as Recommendation)
      ? (r.recommendation as Recommendation)
      : 'maintain';

    // Validate confidence
    const confidence =
      typeof r.confidence === 'number'
        ? Math.max(0, Math.min(100, r.confidence))
        : 50;

    // Validate signals
    const signals = Array.isArray(r.signals)
      ? r.signals.filter((s): s is string => typeof s === 'string').slice(0, 10)
      : [];

    return {
      teamId,
      currentZone: zone,
      confidence,
      signals,
      recommendation,
      suggestedLever: typeof r.suggestedLever === 'string' ? r.suggestedLever : 'none',
      rationale: typeof r.rationale === 'string' ? r.rationale : 'No rationale provided',
    };
  }
}
