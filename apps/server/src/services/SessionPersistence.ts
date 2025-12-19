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

  // ============================================================================
  // PRE-CRISIS PERSISTENCE
  // ============================================================================

  async createPreCrisisProfile(data: {
    sessionId: string;
    participantId: string;
    participantName: string;
    topFive: string[];
    valueMeanings: Record<string, {
      definition: string;
      livingIt: string[];
      violatingIt: string[];
    }>;
    valuesStory?: string;
    selfIdentifiedValues: string[];
    peerIdentifiedValues: string[];
  }): Promise<void> {
    // Check for significant misalignment between self and peer identified values
    const selfSet = new Set(data.selfIdentifiedValues);
    const peerNotInSelf = data.peerIdentifiedValues.filter(v => !selfSet.has(v));
    const alignmentFlag = peerNotInSelf.length >= 2; // Flag if peers see 2+ different values

    await prisma.preCrisisProfile.upsert({
      where: { participantId: data.participantId },
      create: {
        participantId: data.participantId,
        participantName: data.participantName,
        topFiveValues: data.topFive,
        valueMeanings: data.valueMeanings as Prisma.InputJsonValue,
        storyText: data.valuesStory,
        selfIdentifiedValues: data.selfIdentifiedValues,
        peerIdentifiedValues: data.peerIdentifiedValues,
        alignmentFlag,
        roundTimings: [],
        cardsConsidered: [],
      },
      update: {
        participantName: data.participantName,
        topFiveValues: data.topFive,
        valueMeanings: data.valueMeanings as Prisma.InputJsonValue,
        storyText: data.valuesStory,
        selfIdentifiedValues: data.selfIdentifiedValues,
        peerIdentifiedValues: data.peerIdentifiedValues,
        alignmentFlag,
      },
    });
  }

  async createTeamCommitment(data: {
    sessionId: string;
    teamId: string;
    teamName: string;
    statedValues: string[];
    valueDefinitions: Array<{
      value: string;
      teamDefinition: string;
      livingIt: string[];
      violatingIt: string[];
    }>;
    commitmentStatement: string;
    decisionProcess: string;
    signatures: string[];
    readAloudAt?: number;
  }): Promise<void> {
    await prisma.teamCommitment.upsert({
      where: { teamId: data.teamId },
      create: {
        teamId: data.teamId,
        sessionId: data.sessionId,
        values: data.valueDefinitions as Prisma.InputJsonValue,
        commitmentText: data.commitmentStatement,
        decisionProcess: data.decisionProcess,
        signatures: data.signatures,
        readAloudAt: data.readAloudAt ? new Date(data.readAloudAt) : null,
        orgValues: [],
      },
      update: {
        values: data.valueDefinitions as Prisma.InputJsonValue,
        commitmentText: data.commitmentStatement,
        decisionProcess: data.decisionProcess,
        signatures: data.signatures,
        readAloudAt: data.readAloudAt ? new Date(data.readAloudAt) : null,
      },
    });

    // Also update the Team record for Colyseus state recovery
    await prisma.team.update({
      where: { id: data.teamId },
      data: {
        statedValues: data.statedValues,
        commitmentStatement: data.commitmentStatement,
        decisionProcess: data.decisionProcess,
      },
    }).catch(() => {
      // Team might not exist in DB yet if created only in Colyseus
      // This is okay - TeamCommitment is the authoritative source
    });
  }

  async getTeamCommitment(teamId: string): Promise<{
    values: unknown;
    commitmentText: string;
    decisionProcess: string;
    signatures: string[];
    readAloudAt: Date | null;
  } | null> {
    const commitment = await prisma.teamCommitment.findUnique({
      where: { teamId },
    });
    if (!commitment) return null;
    return {
      values: commitment.values,
      commitmentText: commitment.commitmentText,
      decisionProcess: commitment.decisionProcess,
      signatures: commitment.signatures,
      readAloudAt: commitment.readAloudAt,
    };
  }

  async getPreCrisisProfiles(participantIds: string[]): Promise<Array<{
    participantId: string;
    participantName: string;
    topFiveValues: string[];
    valueMeanings: unknown;
    storyText: string | null;
    selfIdentifiedValues: string[];
    peerIdentifiedValues: string[];
  }>> {
    const profiles = await prisma.preCrisisProfile.findMany({
      where: { participantId: { in: participantIds } },
    });
    return profiles.map(p => ({
      participantId: p.participantId,
      participantName: p.participantName,
      topFiveValues: p.topFiveValues,
      valueMeanings: p.valueMeanings,
      storyText: p.storyText,
      selfIdentifiedValues: p.selfIdentifiedValues,
      peerIdentifiedValues: p.peerIdentifiedValues,
    }));
  }

  // ============================================================================
  // PRODUCTION SNAPSHOTS
  // ============================================================================

  async createProductionSnapshot(data: {
    sessionId: string;
    simulationTime: number;
    revenueImpact: number;
    productionHoursLost: number;
    quarterlyProgress: number;
    pipelineStatus: string;
    patientsAffected: number;
    childrenAffected: number;
    workersAtRisk: number;
    workersEvacuated: number;
    globalStockpileWeeks: number;
  }): Promise<void> {
    await prisma.productionSnapshot.create({ data });
  }

  // ============================================================================
  // DEBRIEF DATA RETRIEVAL
  // ============================================================================

  /**
   * ValuesObservation stored in DB - matches AgentOrchestrator output
   */
  private static parseValuesObservation(json: unknown): {
    statedValuesAnalysis: Array<{ value: string; alignment: number; evidence: string }>;
    abcd: { affect: string; behavior: string; cognition: string; desire: string };
  } | null {
    if (!json || typeof json !== 'object') return null;
    const obj = json as Record<string, unknown>;
    return {
      statedValuesAnalysis: (obj.statedValuesAnalysis as Array<{ value: string; alignment: number; evidence: string }>) || [],
      abcd: (obj.abcd as { affect: string; behavior: string; cognition: string; desire: string }) || {
        affect: 'unknown',
        behavior: 'unknown',
        cognition: 'unknown',
        desire: 'unknown',
      },
    };
  }

  async getDebriefData(teamId: string): Promise<{
    valueDefinitions: Array<{
      value: string;
      teamDefinition: string;
      livingIt: string[];
      violatingIt: string[];
    }>;
    statedValues: string[];
    commitmentStatement: string;
    decisionProcess: string;
    decisions: Array<{
      id: string;
      choice: string;
      rationale: string;
      simulationTime: number;
      valuesAnalysis: {
        statedValuesAnalysis: Array<{ value: string; alignment: number; evidence: string }>;
        abcd: { affect: string; behavior: string; cognition: string; desire: string };
      } | null;
      notableMoment: boolean;
      notableReason: string | null;
    }>;
  } | null> {
    const commitment = await this.getTeamCommitment(teamId);
    if (!commitment) return null;

    const decisions = await prisma.decision.findMany({
      where: { teamId },
      orderBy: { simulationTime: 'asc' },
    });

    // Parse the values JSON from commitment
    const valueDefinitions = (commitment.values as Array<{
      value: string;
      teamDefinition: string;
      livingIt: string[];
      violatingIt: string[];
    }>) || [];

    // Extract just the value names for GapAnalyzer
    const statedValues = valueDefinitions.map(v => v.value);

    return {
      valueDefinitions,
      statedValues,
      commitmentStatement: commitment.commitmentText,
      decisionProcess: commitment.decisionProcess,
      decisions: decisions.map(d => ({
        id: d.id,
        choice: d.choice,
        rationale: d.rationale || '',
        simulationTime: d.simulationTime,
        valuesAnalysis: SessionPersistence.parseValuesObservation(d.valuesAnalysis),
        notableMoment: d.notableMoment || false,
        notableReason: d.notableReason,
      })),
    };
  }

  async createTransferReflection(data: {
    sessionId: string;
    teamId: string;
    participantId: string;
    participantName: string;
    realSituation: string;
    valueTested: string;
    whatYouDid: string;
    pressureTrigger: string;
    committedAction: string;
    valueProtected: string;
  }): Promise<void> {
    await prisma.reflection.create({
      data: {
        sessionId: data.sessionId,
        teamId: data.teamId,
        participantName: data.participantName,
        content: JSON.stringify({
          realSituation: data.realSituation,
          valueTested: data.valueTested,
          whatYouDid: data.whatYouDid,
          pressureTrigger: data.pressureTrigger,
          committedAction: data.committedAction,
          valueProtected: data.valueProtected,
        }),
        visibility: 'facilitator',
        category: 'transfer',
        timestamp: BigInt(Date.now()),
      },
    });
  }
}
