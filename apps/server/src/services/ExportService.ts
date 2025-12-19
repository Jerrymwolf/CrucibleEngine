/**
 * ExportService
 *
 * Exports session data for research and analysis.
 * Supports JSON and CSV formats, with optional anonymization.
 */

import { prisma } from '../lib/prisma.js';

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ParticipantExport {
  id: string;
  displayName: string;
  teamId: string;
  parishId: string;
  individualValues: {
    topFive: string[];
    valueMeanings: Record<
      string,
      {
        definition: string;
        livingIt: string[];
        violatingIt: string[];
      }
    >;
  } | null;
}

export interface TeamExport {
  id: string;
  parishId: string;
  name: string;
  isAI: boolean;
  members: string[];
  teamValues: Array<{
    value: string;
    teamDefinition: string;
    livingIt: string[];
    violatingIt: string[];
  }>;
  commitmentStatement: string;
  decisionProcess: string;
  decisions: DecisionExport[];
}

export interface DecisionExport {
  id: string;
  dilemmaId: string;
  simulationTime: number;
  choice: string;
  rationale: string;
  alignmentScores: Record<string, number>;
  abcd: {
    affect: string;
    behavior: string;
    cognition: string;
    desire: string;
  };
  businessImpact: {
    revenueImpact?: number;
    patientsAffected?: number;
    workersAtRisk?: number;
  };
  notableMoment: boolean;
  notableReason?: string;
}

export interface ProductionTimelineEntry {
  simulationTime: number;
  revenueImpact: number;
  patientsAffected: number;
  childrenAffected: number;
  workersAtRisk: number;
  pipelineStatus: string;
}

export interface CodingDecision {
  decisionId: string;
  teamId: string;
  parishId: string;
  isAI: boolean;
  dilemmaId: string;
  dilemmaTitle: string;
  optionChosen: string;
  rationale: string;
  statedValues: string[];
  alignmentScore: number;
  abcdAffect: string;
  abcdBehavior: string;
  abcdCognition: string;
  abcdDesire: string;
  simulationTime: number;
  phase: string;
  notableMoment: boolean;
  notableReason: string;
}

export interface SessionExport {
  metadata: {
    sessionId: string;
    sessionCode: string;
    exportedAt: string;
    duration: number;
    facilitatorId: string;
    scenarioSeed: string;
    companyName: string | null;
    companyValues: string[];
  };
  participants: ParticipantExport[];
  teams: TeamExport[];
  productionTimeline: ProductionTimelineEntry[];
  codingReadyDecisions: CodingDecision[];
  streamingContent: Array<{
    id: string;
    type: string;
    source: string;
    content: string;
    urgency: number;
    relatedParish: string | null;
    breaking: boolean;
    simulationTime: number;
  }>;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export class ExportService {
  /**
   * Export full session data as JSON
   */
  async exportFullSession(sessionId: string): Promise<SessionExport> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teams: {
          include: {
            participants: {
              include: {
                preCrisisProfile: true,
              },
            },
            decisions: {
              orderBy: { simulationTime: 'asc' },
            },
            commitment: true,
          },
        },
        streamingContent: {
          orderBy: { simulationTime: 'asc' },
        },
        productionSnapshots: {
          orderBy: { simulationTime: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const duration = session.completedAt && session.startedAt
      ? (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
      : 0;

    // Build participants list
    const participants: ParticipantExport[] = session.teams.flatMap((team) =>
      team.participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        teamId: team.id,
        parishId: team.parishId,
        individualValues: p.preCrisisProfile
          ? {
              topFive: p.preCrisisProfile.topFiveValues,
              valueMeanings: p.preCrisisProfile.valueMeanings as Record<
                string,
                { definition: string; livingIt: string[]; violatingIt: string[] }
              >,
            }
          : null,
      }))
    );

    // Build teams list
    const teams: TeamExport[] = session.teams.map((team) => ({
      id: team.id,
      parishId: team.parishId,
      name: team.name,
      isAI: team.isAIControlled,
      members: team.participants.map((p) => p.id),
      teamValues: (team.commitment?.values as TeamExport['teamValues']) || [],
      commitmentStatement: team.commitment?.commitmentText || team.commitmentStatement || '',
      decisionProcess: team.commitment?.decisionProcess || team.decisionProcess,
      decisions: team.decisions.map((d) => this.mapDecision(d)),
    }));

    // Build production timeline
    const productionTimeline: ProductionTimelineEntry[] = session.productionSnapshots.map((s) => ({
      simulationTime: s.simulationTime,
      revenueImpact: s.revenueImpact,
      patientsAffected: s.patientsAffected,
      childrenAffected: s.childrenAffected,
      workersAtRisk: s.workersAtRisk,
      pipelineStatus: s.pipelineStatus,
    }));

    // Build coding-ready decisions
    const codingReadyDecisions: CodingDecision[] = session.teams.flatMap((team) =>
      team.decisions.map((d) => this.mapForCoding(d, team))
    );

    // Build streaming content
    const streamingContent = session.streamingContent.map((s) => ({
      id: s.id,
      type: s.type,
      source: s.source,
      content: s.content,
      urgency: s.urgency,
      relatedParish: s.relatedParish,
      breaking: s.breaking,
      simulationTime: s.simulationTime,
    }));

    return {
      metadata: {
        sessionId: session.id,
        sessionCode: session.code,
        exportedAt: new Date().toISOString(),
        duration,
        facilitatorId: session.crucibleMasterId,
        scenarioSeed: session.scenarioSeed || '',
        companyName: session.companyName,
        companyValues: session.companyValues,
      },
      participants,
      teams,
      productionTimeline,
      codingReadyDecisions,
      streamingContent,
    };
  }

  /**
   * Export anonymized session data (strips PII)
   */
  async exportAnonymized(sessionId: string): Promise<SessionExport> {
    const full = await this.exportFullSession(sessionId);

    // Anonymize participants
    const participantIdMap = new Map<string, string>();
    full.participants.forEach((p, i) => {
      participantIdMap.set(p.id, `participant-${i + 1}`);
    });

    // Anonymize team names
    const teamIdMap = new Map<string, string>();
    full.teams.forEach((t, i) => {
      teamIdMap.set(t.id, `team-${i + 1}`);
    });

    return {
      ...full,
      metadata: {
        ...full.metadata,
        facilitatorId: 'REDACTED',
      },
      participants: full.participants.map((p, i) => ({
        ...p,
        id: `participant-${i + 1}`,
        displayName: `Participant ${i + 1}`,
        teamId: teamIdMap.get(p.teamId) || p.teamId,
      })),
      teams: full.teams.map((t, i) => ({
        ...t,
        id: `team-${i + 1}`,
        name: `Team ${i + 1} (${t.parishId})`,
        members: t.members.map((m) => participantIdMap.get(m) || m),
      })),
      codingReadyDecisions: full.codingReadyDecisions.map((d) => ({
        ...d,
        teamId: teamIdMap.get(d.teamId) || d.teamId,
      })),
    };
  }

  /**
   * Export decisions as CSV for ABCD coding
   */
  exportToCSV(decisions: CodingDecision[]): string {
    const headers = [
      'decisionId',
      'teamId',
      'parishId',
      'isAI',
      'dilemmaId',
      'dilemmaTitle',
      'optionChosen',
      'rationale',
      'statedValues',
      'alignmentScore',
      'abcdAffect',
      'abcdBehavior',
      'abcdCognition',
      'abcdDesire',
      'simulationTime',
      'phase',
      'notableMoment',
      'notableReason',
    ];

    const rows = decisions.map((d) =>
      [
        this.escapeCSV(d.decisionId),
        this.escapeCSV(d.teamId),
        this.escapeCSV(d.parishId),
        d.isAI ? 'true' : 'false',
        this.escapeCSV(d.dilemmaId),
        this.escapeCSV(d.dilemmaTitle),
        this.escapeCSV(d.optionChosen),
        this.escapeCSV(d.rationale),
        this.escapeCSV(d.statedValues.join('; ')),
        d.alignmentScore.toFixed(2),
        this.escapeCSV(d.abcdAffect),
        this.escapeCSV(d.abcdBehavior),
        this.escapeCSV(d.abcdCognition),
        this.escapeCSV(d.abcdDesire),
        d.simulationTime.toString(),
        this.escapeCSV(d.phase),
        d.notableMoment ? 'true' : 'false',
        this.escapeCSV(d.notableReason),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export production timeline as CSV
   */
  exportProductionTimelineToCSV(timeline: ProductionTimelineEntry[]): string {
    const headers = [
      'simulationTime',
      'revenueImpact',
      'patientsAffected',
      'childrenAffected',
      'workersAtRisk',
      'pipelineStatus',
    ];

    const rows = timeline.map((t) =>
      [
        t.simulationTime.toString(),
        t.revenueImpact.toFixed(2),
        t.patientsAffected.toString(),
        t.childrenAffected.toString(),
        t.workersAtRisk.toString(),
        this.escapeCSV(t.pipelineStatus),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get list of all sessions for export selection
   */
  async listExportableSessions(userId: string): Promise<
    Array<{
      id: string;
      code: string;
      status: string;
      createdAt: Date;
      teamCount: number;
      decisionCount: number;
    }>
  > {
    const sessions = await prisma.session.findMany({
      where: {
        crucibleMasterId: userId,
        status: { in: ['completed', 'active'] },
      },
      include: {
        _count: {
          select: {
            teams: true,
            decisions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      code: s.code,
      status: s.status,
      createdAt: s.createdAt,
      teamCount: s._count.teams,
      decisionCount: s._count.decisions,
    }));
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapDecision(d: {
    id: string;
    decisionTypeId: string;
    simulationTime: number;
    choice: string;
    rationale: string | null;
    valuesAnalysis: unknown;
    consequencesApplied: unknown;
    notableMoment: boolean | null;
    notableReason: string | null;
  }): DecisionExport {
    const analysis = d.valuesAnalysis as {
      statedValuesAnalysis?: Array<{ value: string; alignment: number }>;
      abcd?: { affect: string; behavior: string; cognition: string; desire: string };
    } | null;

    const consequences = d.consequencesApplied as {
      immediate?: Array<{
        category: string;
        magnitude: number;
      }>;
    } | null;

    // Calculate alignment scores from analysis
    const alignmentScores: Record<string, number> = {};
    if (analysis?.statedValuesAnalysis) {
      for (const va of analysis.statedValuesAnalysis) {
        alignmentScores[va.value] = va.alignment;
      }
    }

    // Extract business impact from consequences
    const businessImpact: DecisionExport['businessImpact'] = {};
    if (consequences?.immediate) {
      for (const effect of consequences.immediate) {
        if (effect.category === 'resources') {
          businessImpact.revenueImpact = effect.magnitude * 1000000;
        }
        if (effect.category === 'population') {
          businessImpact.patientsAffected = Math.abs(effect.magnitude) * 10;
        }
      }
    }

    return {
      id: d.id,
      dilemmaId: d.decisionTypeId,
      simulationTime: d.simulationTime,
      choice: d.choice,
      rationale: d.rationale || '',
      alignmentScores,
      abcd: analysis?.abcd || {
        affect: 'unknown',
        behavior: 'unknown',
        cognition: 'unknown',
        desire: 'unknown',
      },
      businessImpact,
      notableMoment: d.notableMoment || false,
      notableReason: d.notableReason || undefined,
    };
  }

  private mapForCoding(
    d: {
      id: string;
      decisionTypeId: string;
      simulationTime: number;
      choice: string;
      rationale: string | null;
      valuesAnalysis: unknown;
      notableMoment: boolean | null;
      notableReason: string | null;
    },
    team: {
      id: string;
      parishId: string;
      isAIControlled: boolean;
      statedValues: string[];
      commitment: { values: unknown } | null;
    }
  ): CodingDecision {
    const analysis = d.valuesAnalysis as {
      statedValuesAnalysis?: Array<{ value: string; alignment: number }>;
      abcd?: { affect: string; behavior: string; cognition: string; desire: string };
    } | null;

    // Calculate overall alignment score
    let alignmentScore = 0;
    if (analysis?.statedValuesAnalysis && analysis.statedValuesAnalysis.length > 0) {
      const sum = analysis.statedValuesAnalysis.reduce((acc, va) => acc + va.alignment, 0);
      alignmentScore = sum / analysis.statedValuesAnalysis.length;
    }

    // Get stated values
    const commitmentValues = team.commitment?.values as Array<{ value: string }> | null;
    const statedValues = commitmentValues?.map((v) => v.value) || team.statedValues;

    // Determine phase from simulation time
    const phase = this.getPhaseFromTime(d.simulationTime);

    return {
      decisionId: d.id,
      teamId: team.id,
      parishId: team.parishId,
      isAI: team.isAIControlled,
      dilemmaId: d.decisionTypeId,
      dilemmaTitle: d.decisionTypeId, // Would need dilemma library lookup for actual title
      optionChosen: d.choice,
      rationale: d.rationale || '',
      statedValues,
      alignmentScore,
      abcdAffect: analysis?.abcd?.affect || 'unknown',
      abcdBehavior: analysis?.abcd?.behavior || 'unknown',
      abcdCognition: analysis?.abcd?.cognition || 'unknown',
      abcdDesire: analysis?.abcd?.desire || 'unknown',
      simulationTime: d.simulationTime,
      phase,
      notableMoment: d.notableMoment || false,
      notableReason: d.notableReason || '',
    };
  }

  private getPhaseFromTime(simulationTime: number): string {
    if (simulationTime <= 60) return 'watch';
    if (simulationTime <= 180) return 'crisis';
    return 'recovery';
  }

  private escapeCSV(value: string | undefined | null): string {
    if (value === undefined || value === null) return '""';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

// Singleton instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}
