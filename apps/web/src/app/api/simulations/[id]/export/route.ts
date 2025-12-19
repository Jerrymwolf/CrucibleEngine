/**
 * Session Export API
 *
 * Exports session data for research and analysis.
 * Supports JSON and CSV formats, with optional anonymization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCMLicense } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Inline types for Prisma models (types are generated in server package)
interface ParticipantRecord {
  id: string;
  displayName: string;
  personalValues: string[];
}

interface DecisionRecord {
  id: string;
  decisionTypeId: string;
  simulationTime: number;
  choice: string;
  rationale: string | null;
  valuesAnalysis: unknown;
  notableMoment: boolean | null;
  notableReason: string | null;
}

interface TeamRecord {
  id: string;
  parishId: string;
  name: string;
  isAIControlled: boolean;
  statedValues: string[];
  commitmentStatement: string | null;
  decisionProcess: string;
  participants: ParticipantRecord[];
  decisions: DecisionRecord[];
}

interface StreamingRecord {
  id: string;
  type: string;
  source: string;
  content: string;
  urgency: number;
  relatedParish: string | null;
  breaking: boolean;
  simulationTime: number;
}

interface ProductionRecord {
  simulationTime: number;
  revenueImpact: number;
  patientsAffected: number;
  childrenAffected: number;
  workersAtRisk: number;
  pipelineStatus: string;
}

// ============================================================================
// TYPES
// ============================================================================

interface DecisionExport {
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
  notableMoment: boolean;
  notableReason?: string;
}

interface CodingDecision {
  decisionId: string;
  teamId: string;
  parishId: string;
  isAI: boolean;
  dilemmaId: string;
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

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check CM license
  const authResult = await requireCMLicense();
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.reason },
      { status: 401 }
    );
  }

  const { id: sessionId } = await params;
  const format = req.nextUrl.searchParams.get('format') || 'json';
  const anonymize = req.nextUrl.searchParams.get('anonymize') === 'true';

  try {
    // Load full session data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teams: {
          include: {
            participants: true,
            decisions: {
              orderBy: { simulationTime: 'asc' },
            },
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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this session
    if (session.crucibleMasterId !== authResult.userId && authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only export your own sessions' },
        { status: 403 }
      );
    }

    // Build export data
    const duration = session.completedAt && session.startedAt
      ? (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
      : 0;

    // Build participants list
    const participants = session.teams.flatMap((team: TeamRecord) =>
      team.participants.map((p: ParticipantRecord, idx: number) => ({
        id: anonymize ? `participant-${idx + 1}` : p.id,
        displayName: anonymize ? `Participant ${idx + 1}` : p.displayName,
        teamId: team.id,
        parishId: team.parishId,
        personalValues: p.personalValues,
      }))
    );

    // Build teams list
    const teams = session.teams.map((team: TeamRecord, idx: number) => ({
      id: anonymize ? `team-${idx + 1}` : team.id,
      parishId: team.parishId,
      name: anonymize ? `Team ${idx + 1} (${team.parishId})` : team.name,
      isAI: team.isAIControlled,
      members: team.participants.map((p: ParticipantRecord) => p.id),
      statedValues: team.statedValues,
      commitmentStatement: team.commitmentStatement || '',
      decisionProcess: team.decisionProcess,
      decisions: team.decisions.map((d: DecisionRecord) => mapDecision(d)),
    }));

    // Build production timeline
    const productionTimeline = session.productionSnapshots.map((s: ProductionRecord) => ({
      simulationTime: s.simulationTime,
      revenueImpact: s.revenueImpact,
      patientsAffected: s.patientsAffected,
      childrenAffected: s.childrenAffected,
      workersAtRisk: s.workersAtRisk,
      pipelineStatus: s.pipelineStatus,
    }));

    // Build coding-ready decisions
    const codingReadyDecisions: CodingDecision[] = session.teams.flatMap((team: TeamRecord, teamIdx: number) =>
      team.decisions.map((d: DecisionRecord) => mapForCoding(d, team, anonymize ? `team-${teamIdx + 1}` : team.id))
    );

    const exportData = {
      metadata: {
        sessionId: session.id,
        sessionCode: session.code,
        exportedAt: new Date().toISOString(),
        duration,
        facilitatorId: anonymize ? 'REDACTED' : session.crucibleMasterId,
        scenarioSeed: session.scenarioSeed || '',
        companyName: session.companyName,
        companyValues: session.companyValues,
      },
      participants,
      teams,
      productionTimeline,
      codingReadyDecisions,
      streamingContent: session.streamingContent.map((s: StreamingRecord) => ({
        id: s.id,
        type: s.type,
        source: s.source,
        content: s.content,
        urgency: s.urgency,
        relatedParish: s.relatedParish,
        breaking: s.breaking,
        simulationTime: s.simulationTime,
      })),
    };

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(codingReadyDecisions);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="session-${sessionId}-decisions.csv"`,
        },
      });
    }

    if (format === 'production-csv') {
      const csv = convertProductionToCSV(productionTimeline);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="session-${sessionId}-production.csv"`,
        },
      });
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('[Export] Failed:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapDecision(d: {
  id: string;
  decisionTypeId: string;
  simulationTime: number;
  choice: string;
  rationale: string | null;
  valuesAnalysis: unknown;
  notableMoment: boolean | null;
  notableReason: string | null;
}): DecisionExport {
  const analysis = d.valuesAnalysis as {
    statedValuesAnalysis?: Array<{ value: string; alignment: number }>;
    abcd?: { affect: string; behavior: string; cognition: string; desire: string };
  } | null;

  const alignmentScores: Record<string, number> = {};
  if (analysis?.statedValuesAnalysis) {
    for (const va of analysis.statedValuesAnalysis) {
      alignmentScores[va.value] = va.alignment;
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
    notableMoment: d.notableMoment || false,
    notableReason: d.notableReason || undefined,
  };
}

function mapForCoding(
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
  },
  teamIdOverride?: string
): CodingDecision {
  const analysis = d.valuesAnalysis as {
    statedValuesAnalysis?: Array<{ value: string; alignment: number }>;
    abcd?: { affect: string; behavior: string; cognition: string; desire: string };
  } | null;

  let alignmentScore = 0;
  if (analysis?.statedValuesAnalysis && analysis.statedValuesAnalysis.length > 0) {
    const sum = analysis.statedValuesAnalysis.reduce((acc, va) => acc + va.alignment, 0);
    alignmentScore = sum / analysis.statedValuesAnalysis.length;
  }

  const phase = getPhaseFromTime(d.simulationTime);

  return {
    decisionId: d.id,
    teamId: teamIdOverride || team.id,
    parishId: team.parishId,
    isAI: team.isAIControlled,
    dilemmaId: d.decisionTypeId,
    optionChosen: d.choice,
    rationale: d.rationale || '',
    statedValues: team.statedValues,
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

function getPhaseFromTime(simulationTime: number): string {
  if (simulationTime <= 60) return 'watch';
  if (simulationTime <= 180) return 'crisis';
  return 'recovery';
}

function escapeCSV(value: string | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCSV(decisions: CodingDecision[]): string {
  const headers = [
    'decisionId',
    'teamId',
    'parishId',
    'isAI',
    'dilemmaId',
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
      escapeCSV(d.decisionId),
      escapeCSV(d.teamId),
      escapeCSV(d.parishId),
      d.isAI ? 'true' : 'false',
      escapeCSV(d.dilemmaId),
      escapeCSV(d.optionChosen),
      escapeCSV(d.rationale),
      escapeCSV(d.statedValues.join('; ')),
      d.alignmentScore.toFixed(2),
      escapeCSV(d.abcdAffect),
      escapeCSV(d.abcdBehavior),
      escapeCSV(d.abcdCognition),
      escapeCSV(d.abcdDesire),
      d.simulationTime.toString(),
      escapeCSV(d.phase),
      d.notableMoment ? 'true' : 'false',
      escapeCSV(d.notableReason),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function convertProductionToCSV(
  timeline: Array<{
    simulationTime: number;
    revenueImpact: number;
    patientsAffected: number;
    childrenAffected: number;
    workersAtRisk: number;
    pipelineStatus: string;
  }>
): string {
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
      escapeCSV(t.pipelineStatus),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
