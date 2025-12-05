import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/index.js';

export interface SessionSnapshot {
  session: {
    id: string;
    code: string;
    status: string;
    scenarioSeed: string | null;
    companyName: string | null;
    companyValues: string[];
    crucibleMasterId: string;
    startedAt: Date | null;
  };
  teams: Array<{
    id: string;
    parishId: string;
    name: string;
    statedValues: string[];
    decisionProcess: string;
    commitmentStatement: string | null;
    participants: Array<{
      id: string;
      displayName: string;
      personalValues: string[];
      role: string;
    }>;
  }>;
  decisions: Array<{
    id: string;
    teamId: string;
    categoryId: string;
    decisionTypeId: string;
    choice: string;
    rationale: string | null;
    simulationTime: number;
    consequencesApplied: unknown;
  }>;
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

export class SessionPersistence {
  async createSession(data: {
    id: string;
    code: string;
    scenarioSeed: string;
    crucibleMasterId: string;
    companyName?: string;
    companyValues?: string[];
  }): Promise<void> {
    await prisma.session.create({
      data: {
        id: data.id,
        code: data.code,
        status: 'lobby',
        scenarioSeed: data.scenarioSeed,
        crucibleMasterId: data.crucibleMasterId,
        companyName: data.companyName,
        companyValues: data.companyValues || [],
      },
    });
  }

  async loadSession(sessionCode: string): Promise<SessionSnapshot | null> {
    const session = await prisma.session.findUnique({
      where: { code: sessionCode },
      include: {
        teams: { include: { participants: true } },
        decisions: { orderBy: { simulationTime: 'asc' } },
        streamingContent: { orderBy: { simulationTime: 'asc' }, take: 100 },
      },
    });

    if (!session) return null;

    return {
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        scenarioSeed: session.scenarioSeed,
        companyName: session.companyName,
        companyValues: session.companyValues,
        crucibleMasterId: session.crucibleMasterId,
        startedAt: session.startedAt,
      },
      teams: session.teams.map(t => ({
        id: t.id,
        parishId: t.parishId,
        name: t.name,
        statedValues: t.statedValues,
        decisionProcess: t.decisionProcess,
        commitmentStatement: t.commitmentStatement,
        participants: t.participants.map(p => ({
          id: p.id,
          displayName: p.displayName,
          personalValues: p.personalValues,
          role: p.role,
        })),
      })),
      decisions: session.decisions.map(d => ({
        id: d.id,
        teamId: d.teamId,
        categoryId: d.categoryId,
        decisionTypeId: d.decisionTypeId,
        choice: d.choice,
        rationale: d.rationale,
        simulationTime: d.simulationTime,
        consequencesApplied: d.consequencesApplied,
      })),
      streamingContent: session.streamingContent.map(s => ({
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
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status,
        startedAt: status === 'active' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });
  }

  async persistDecision(data: {
    id: string;
    sessionId: string;
    teamId: string;
    categoryId: string;
    decisionTypeId: string;
    choice: string;
    rationale?: string;
    targetParishId?: string;
    simulationTime: number;
    advocates: Array<{ participantId: string; position: string }>;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.decision.create({
        data: {
          id: data.id,
          sessionId: data.sessionId,
          teamId: data.teamId,
          categoryId: data.categoryId,
          decisionTypeId: data.decisionTypeId,
          choice: data.choice,
          rationale: data.rationale,
          targetParishId: data.targetParishId,
          simulationTime: data.simulationTime,
        },
      });

      if (data.advocates.length > 0) {
        await tx.decisionAdvocate.createMany({
          data: data.advocates.map(a => ({
            decisionId: data.id,
            participantId: a.participantId,
            position: a.position,
          })),
        });
      }
    });
  }

  async updateDecisionAnalysis(decisionId: string, data: {
    valuesAnalysis?: unknown;
    notableMoment?: boolean;
    notableReason?: string;
    consequencesApplied?: unknown;
  }): Promise<void> {
    await prisma.decision.update({
      where: { id: decisionId },
      data: {
        valuesAnalysis: data.valuesAnalysis as Prisma.InputJsonValue,
        notableMoment: data.notableMoment,
        notableReason: data.notableReason,
        consequencesApplied: data.consequencesApplied as Prisma.InputJsonValue,
      },
    });
  }

  async persistStreamingContent(data: {
    id: string;
    sessionId: string;
    type: string;
    source: string;
    content: string;
    urgency: number;
    relatedParish?: string;
    breaking: boolean;
    simulationTime: number;
  }): Promise<void> {
    await prisma.streamingContentRecord.create({ data });
  }

  async upsertTeam(sessionId: string, data: {
    id: string;
    parishId: string;
    name: string;
    statedValues?: string[];
    decisionProcess?: string;
    commitmentStatement?: string;
  }): Promise<void> {
    await prisma.team.upsert({
      where: { sessionId_parishId: { sessionId, parishId: data.parishId } },
      create: {
        id: data.id,
        sessionId,
        parishId: data.parishId,
        name: data.name,
        statedValues: data.statedValues || [],
        decisionProcess: data.decisionProcess || 'consensus',
        commitmentStatement: data.commitmentStatement,
      },
      update: {
        name: data.name,
        statedValues: data.statedValues,
        decisionProcess: data.decisionProcess,
        commitmentStatement: data.commitmentStatement,
      },
    });
  }

  async upsertParticipant(teamId: string, data: {
    id: string;
    displayName: string;
    email?: string;
    personalValues?: string[];
    role?: string;
  }): Promise<void> {
    await prisma.participant.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        teamId,
        displayName: data.displayName,
        email: data.email,
        personalValues: data.personalValues || [],
        role: data.role || 'member',
      },
      update: {
        displayName: data.displayName,
        personalValues: data.personalValues,
        role: data.role,
      },
    });
  }

  async createReflection(data: {
    sessionId: string;
    teamId: string;
    participantName: string;
    content: string;
    visibility: string;
    category: string;
    timestamp: number;
  }): Promise<void> {
    await prisma.reflection.create({
      data: {
        sessionId: data.sessionId,
        teamId: data.teamId,
        participantName: data.participantName,
        content: data.content,
        visibility: data.visibility,
        category: data.category,
        timestamp: BigInt(data.timestamp),
      },
    });
  }
}
