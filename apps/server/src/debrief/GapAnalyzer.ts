/**
 * GapAnalyzer Service
 *
 * Analyzes the gap between stated values/commitment and enacted behavior.
 * Generates insights for debrief without judgment - for learning, not assessment.
 *
 * Key outputs:
 * - Values alignment by phase
 * - Notable moments (gaps, consistency, conflicts, growth)
 * - Commitment comparison
 * - Rationalization pattern detection
 */

import type {
  ValuesScoreRecord,
  TeamValueDefinition,
  DilemmaPhase,
  ValuesAlignmentScore,
} from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface GapReport {
  teamId: string;
  summary: GapSummary;
  alignmentByPhase: PhaseAlignment[];
  alignmentByValue: ValueAlignment[];
  notableMoments: NotableMoment[];
  commitmentAnalysis: CommitmentAnalysis;
  rationalizationPattern: RationalizationPattern | null;
  recommendations: string[];
}

export interface GapSummary {
  overallAlignment: number; // -3 to +3 average
  biggestGap: { value: string; averageScore: number } | null;
  strongestAlignment: { value: string; averageScore: number } | null;
  gapMomentCount: number;
  consistencyMomentCount: number;
  totalDecisions: number;
}

export interface PhaseAlignment {
  phase: DilemmaPhase;
  averageAlignment: number;
  decisionCount: number;
  byValue: Map<string, number>;
  keyMoment?: string;
}

export interface ValueAlignment {
  value: string;
  teamDefinition: string;
  averageScore: number;
  scoresByPhase: { phase: DilemmaPhase; score: number }[];
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  lowestPoint?: { decisionId: string; score: number; context: string };
  highestPoint?: { decisionId: string; score: number; context: string };
}

export interface NotableMoment {
  decisionId: string;
  timestamp: number;
  phase: DilemmaPhase;
  category: 'gap' | 'consistency' | 'conflict' | 'growth';
  title: string;
  description: string;
  valuesInvolved: string[];
  evidence: {
    stated: string;
    enacted: string;
  };
  forDebrief: boolean;
}

export interface CommitmentAnalysis {
  commitmentText: string;
  timesAligned: number;
  timesTension: number;
  timesViolated: number;
  keyViolationMoments: { decisionId: string; description: string }[];
  overallAssessment: 'honored' | 'tested' | 'challenged';
}

export interface RationalizationPattern {
  detected: boolean;
  steps: RationalizationStep[];
  description: string;
  peakIntensity: number;
}

export interface RationalizationStep {
  stepNumber: number;
  label: string;
  detected: boolean;
  evidence?: string;
  decisionId?: string;
}

// ============================================================================
// RATIONALIZATION CASCADE PATTERNS
// ============================================================================

const RATIONALIZATION_STEPS = [
  {
    step: 1,
    label: 'Denial of threat',
    patterns: ['won\'t materialize', 'unlikely', 'probably fine', 'worst case', 'overreacting'],
  },
  {
    step: 2,
    label: 'Appeal to benefit',
    patterns: ['need the income', 'want to help', 'volunteer', 'their choice', 'they want to stay'],
  },
  {
    step: 3,
    label: 'Higher purpose',
    patterns: ['bigger picture', 'greater good', 'patients depend', 'mission', 'serving'],
  },
  {
    step: 4,
    label: 'Diffusion of responsibility',
    patterns: ['someone else', 'not our job', 'their decision', 'above my pay', 'management'],
  },
  {
    step: 5,
    label: 'Economic necessity',
    patterns: ['obligations', 'shareholders', 'contract', 'deadlines', 'costs', 'budget'],
  },
  {
    step: 6,
    label: 'Future remedy',
    patterns: ['make it right', 'compensate', 'afterward', 'later', 'next time', 'learn from'],
  },
];

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class GapAnalyzer {
  /**
   * Generate a complete gap report for debrief
   */
  static analyze(
    teamId: string,
    scoreRecords: ValuesScoreRecord[],
    teamValues: string[],
    valueDefinitions: TeamValueDefinition[],
    commitmentText: string
  ): GapReport {
    // Sort records by timestamp
    const sortedRecords = [...scoreRecords].sort((a, b) => a.simulationTime - b.simulationTime);

    // Calculate alignments
    const alignmentByPhase = GapAnalyzer.calculatePhaseAlignment(sortedRecords, teamValues);
    const alignmentByValue = GapAnalyzer.calculateValueAlignment(
      sortedRecords,
      teamValues,
      valueDefinitions
    );

    // Find notable moments
    const notableMoments = GapAnalyzer.findNotableMoments(sortedRecords, teamValues);

    // Analyze commitment
    const commitmentAnalysis = GapAnalyzer.analyzeCommitment(sortedRecords, commitmentText);

    // Detect rationalization patterns
    const rationalizationPattern = GapAnalyzer.detectRationalization(sortedRecords);

    // Generate summary
    const summary = GapAnalyzer.generateSummary(
      sortedRecords,
      alignmentByValue,
      notableMoments
    );

    // Generate recommendations
    const recommendations = GapAnalyzer.generateRecommendations(
      summary,
      alignmentByValue,
      commitmentAnalysis,
      rationalizationPattern
    );

    return {
      teamId,
      summary,
      alignmentByPhase,
      alignmentByValue,
      notableMoments,
      commitmentAnalysis,
      rationalizationPattern,
      recommendations,
    };
  }

  /**
   * Calculate alignment scores by phase
   */
  private static calculatePhaseAlignment(
    records: ValuesScoreRecord[],
    teamValues: string[]
  ): PhaseAlignment[] {
    const phases: DilemmaPhase[] = ['watch', 'crisis', 'recovery'];
    const results: PhaseAlignment[] = [];

    for (const phase of phases) {
      const phaseRecords = records.filter((r) => r.phase === phase);
      if (phaseRecords.length === 0) {
        results.push({
          phase,
          averageAlignment: 0,
          decisionCount: 0,
          byValue: new Map(),
        });
        continue;
      }

      // Calculate average alignment
      const allScores = phaseRecords.flatMap((r) => r.scores.map((s) => s.alignment as number));
      const averageAlignment = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Calculate by value
      const byValue = new Map<string, number>();
      for (const value of teamValues) {
        const valueScores = phaseRecords
          .flatMap((r) => r.scores.filter((s) => s.value === value))
          .map((s) => s.alignment as number);
        if (valueScores.length > 0) {
          byValue.set(value, valueScores.reduce((a, b) => a + b, 0) / valueScores.length);
        }
      }

      // Find key moment for this phase
      const notableInPhase = phaseRecords.find((r) => r.isNotable);
      const keyMoment = notableInPhase?.notableReason;

      results.push({
        phase,
        averageAlignment: Math.round(averageAlignment * 100) / 100,
        decisionCount: phaseRecords.length,
        byValue,
        keyMoment,
      });
    }

    return results;
  }

  /**
   * Calculate alignment scores by value
   */
  private static calculateValueAlignment(
    records: ValuesScoreRecord[],
    teamValues: string[],
    definitions: TeamValueDefinition[]
  ): ValueAlignment[] {
    const results: ValueAlignment[] = [];

    for (const value of teamValues) {
      const definition = definitions.find((d) => d.value === value);
      const valueScores = records.flatMap((r) =>
        r.scores
          .filter((s) => s.value === value)
          .map((s) => ({ ...s, decisionId: r.decisionId, phase: r.phase }))
      );

      if (valueScores.length === 0) {
        results.push({
          value,
          teamDefinition: definition?.teamDefinition || '',
          averageScore: 0,
          scoresByPhase: [],
          trend: 'stable',
        });
        continue;
      }

      const averageScore = valueScores.reduce((a, s) => a + s.alignment, 0) / valueScores.length;

      // Calculate by phase
      const phases: DilemmaPhase[] = ['watch', 'crisis', 'recovery'];
      const scoresByPhase = phases.map((phase) => {
        const phaseScores = valueScores.filter((s) => s.phase === phase);
        return {
          phase,
          score: phaseScores.length > 0
            ? phaseScores.reduce((a, s) => a + s.alignment, 0) / phaseScores.length
            : 0,
        };
      });

      // Determine trend
      const trend = GapAnalyzer.calculateTrend(valueScores.map((s) => s.alignment));

      // Find lowest and highest points
      const sorted = [...valueScores].sort((a, b) => a.alignment - b.alignment);
      const lowestPoint = sorted[0];
      const highestPoint = sorted[sorted.length - 1];

      results.push({
        value,
        teamDefinition: definition?.teamDefinition || '',
        averageScore: Math.round(averageScore * 100) / 100,
        scoresByPhase,
        trend,
        lowestPoint: lowestPoint
          ? {
              decisionId: lowestPoint.decisionId,
              score: lowestPoint.alignment,
              context: lowestPoint.evidence,
            }
          : undefined,
        highestPoint: highestPoint
          ? {
              decisionId: highestPoint.decisionId,
              score: highestPoint.alignment,
              context: highestPoint.evidence,
            }
          : undefined,
      });
    }

    return results;
  }

  /**
   * Calculate trend from scores
   */
  private static calculateTrend(
    scores: number[]
  ): 'improving' | 'declining' | 'stable' | 'volatile' {
    if (scores.length < 3) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Check volatility
    const variance = scores.reduce((acc, s) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return acc + Math.pow(s - avg, 2);
    }, 0) / scores.length;

    if (Math.sqrt(variance) > 1.5) return 'volatile';

    const diff = secondAvg - firstAvg;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  /**
   * Find notable moments for debrief
   */
  private static findNotableMoments(
    records: ValuesScoreRecord[],
    teamValues: string[]
  ): NotableMoment[] {
    const moments: NotableMoment[] = [];

    for (const record of records) {
      if (!record.isNotable) continue;

      const moment: NotableMoment = {
        decisionId: record.decisionId,
        timestamp: record.simulationTime,
        phase: record.phase,
        category: record.notableCategory || 'gap',
        title: GapAnalyzer.generateMomentTitle(record),
        description: record.notableReason || '',
        valuesInvolved: record.scores.map((s) => s.value),
        evidence: {
          stated: record.scores[0]?.teamDefinition || '',
          enacted: record.scores[0]?.rationaleQuote || '',
        },
        forDebrief: true,
      };

      moments.push(moment);
    }

    return moments.slice(0, 10); // Cap at 10 for debrief
  }

  /**
   * Generate title for notable moment
   */
  private static generateMomentTitle(record: ValuesScoreRecord): string {
    const lowestScore = record.scores.reduce((min, s) =>
      s.alignment < min.alignment ? s : min
    );

    switch (record.notableCategory) {
      case 'gap':
        return `${lowestScore.value} Gap`;
      case 'consistency':
        return `${lowestScore.value} Consistency`;
      case 'conflict':
        return `Values Conflict`;
      case 'growth':
        return `Growth Moment`;
      default:
        return `Decision Point`;
    }
  }

  /**
   * Analyze commitment alignment
   */
  private static analyzeCommitment(
    records: ValuesScoreRecord[],
    commitmentText: string
  ): CommitmentAnalysis {
    let aligned = 0;
    let tension = 0;
    let violated = 0;
    const violations: { decisionId: string; description: string }[] = [];

    for (const record of records) {
      switch (record.commitmentAlignment) {
        case 'aligned':
          aligned++;
          break;
        case 'tension':
          tension++;
          break;
        case 'violation':
          violated++;
          if (record.commitmentComparisonQuote) {
            violations.push({
              decisionId: record.decisionId,
              description: record.commitmentComparisonQuote,
            });
          }
          break;
      }
    }

    const total = records.length || 1;
    let assessment: 'honored' | 'tested' | 'challenged';
    if (violated / total > 0.3) {
      assessment = 'challenged';
    } else if ((tension + violated) / total > 0.3) {
      assessment = 'tested';
    } else {
      assessment = 'honored';
    }

    return {
      commitmentText,
      timesAligned: aligned,
      timesTension: tension,
      timesViolated: violated,
      keyViolationMoments: violations.slice(0, 3),
      overallAssessment: assessment,
    };
  }

  /**
   * Detect rationalization cascade patterns
   */
  private static detectRationalization(records: ValuesScoreRecord[]): RationalizationPattern | null {
    const steps: RationalizationStep[] = [];
    let maxIntensity = 0;

    // Check each rationalization step
    for (const stepDef of RATIONALIZATION_STEPS) {
      let detected = false;
      let evidence = '';
      let matchingDecisionId = '';

      // Look through rationale quotes for patterns
      for (const record of records) {
        const rationales = record.scores
          .map((s) => s.rationaleQuote || '')
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        for (const pattern of stepDef.patterns) {
          if (rationales.includes(pattern.toLowerCase())) {
            detected = true;
            evidence = pattern;
            matchingDecisionId = record.decisionId;
            break;
          }
        }
        if (detected) break;
      }

      steps.push({
        stepNumber: stepDef.step,
        label: stepDef.label,
        detected,
        evidence: detected ? evidence : undefined,
        decisionId: detected ? matchingDecisionId : undefined,
      });

      if (detected && stepDef.step > maxIntensity) {
        maxIntensity = stepDef.step;
      }
    }

    const detectedCount = steps.filter((s) => s.detected).length;

    if (detectedCount < 2) {
      return null;
    }

    return {
      detected: true,
      steps,
      description: `Detected ${detectedCount} of 6 rationalization steps in decision patterns`,
      peakIntensity: maxIntensity,
    };
  }

  /**
   * Generate summary statistics
   */
  private static generateSummary(
    records: ValuesScoreRecord[],
    alignmentByValue: ValueAlignment[],
    notableMoments: NotableMoment[]
  ): GapSummary {
    // Overall alignment
    const allScores = records.flatMap((r) => r.scores.map((s) => s.alignment as number));
    const overallAlignment = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : 0;

    // Find biggest gap (lowest average)
    const sortedByScore = [...alignmentByValue].sort((a, b) => a.averageScore - b.averageScore);
    const biggestGap = sortedByScore[0]?.averageScore < 0
      ? { value: sortedByScore[0].value, averageScore: sortedByScore[0].averageScore }
      : null;

    // Find strongest alignment (highest average)
    const strongestAlignment = sortedByScore[sortedByScore.length - 1]?.averageScore > 0
      ? {
          value: sortedByScore[sortedByScore.length - 1].value,
          averageScore: sortedByScore[sortedByScore.length - 1].averageScore,
        }
      : null;

    return {
      overallAlignment,
      biggestGap,
      strongestAlignment,
      gapMomentCount: notableMoments.filter((m) => m.category === 'gap').length,
      consistencyMomentCount: notableMoments.filter((m) => m.category === 'consistency').length,
      totalDecisions: records.length,
    };
  }

  /**
   * Generate recommendations for growth
   */
  private static generateRecommendations(
    summary: GapSummary,
    alignmentByValue: ValueAlignment[],
    commitmentAnalysis: CommitmentAnalysis,
    rationalizationPattern: RationalizationPattern | null
  ): string[] {
    const recommendations: string[] = [];

    // Based on biggest gap
    if (summary.biggestGap) {
      recommendations.push(
        `Focus on "${summary.biggestGap.value}" - this showed the largest gap between stated importance and enacted behavior.`
      );
    }

    // Based on commitment analysis
    if (commitmentAnalysis.overallAssessment === 'challenged') {
      recommendations.push(
        `Your commitment was seriously challenged during crisis. Discuss what made honoring it difficult.`
      );
    }

    // Based on phase trends
    const crisisValue = alignmentByValue.find((v) =>
      v.scoresByPhase.find((p) => p.phase === 'crisis' && p.score < -1)
    );
    if (crisisValue) {
      recommendations.push(
        `"${crisisValue.value}" dropped significantly during crisis phase. Consider what triggers this drift.`
      );
    }

    // Based on rationalization pattern
    if (rationalizationPattern?.detected) {
      recommendations.push(
        `Notice the rationalization pattern that emerged: ${rationalizationPattern.description}`
      );
    }

    // Based on volatility
    const volatileValues = alignmentByValue.filter((v) => v.trend === 'volatile');
    if (volatileValues.length > 0) {
      recommendations.push(
        `Values "${volatileValues.map((v) => v.value).join(', ')}" showed inconsistent patterns - worth exploring what caused the swings.`
      );
    }

    return recommendations.slice(0, 5);
  }
}

export default GapAnalyzer;
