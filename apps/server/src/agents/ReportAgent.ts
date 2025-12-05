import Anthropic from '@anthropic-ai/sdk';
import type { CrucibleState } from '../schema/CrucibleState.js';
import { REPORT_PROMPTS } from './prompts/index.js';

interface AgentConfig {
  apiKey: string;
  model?: string;
}

export interface TeamReportContent {
  summary: string;
  decisionsAnalysis: {
    totalDecisions: number;
    notableMoments: string[];
    keyChoices: { decision: string; impact: string }[];
  };
  valuesAnalysis: {
    statedValues: string[];
    consistencyScore: number;
    gapsIdentified: string[];
    strengthsObserved: string[];
  };
  recommendations: string[];
}

export interface CMReportContent {
  sessionSummary: string;
  teamPerformance: { teamId: string; summary: string; score: number }[];
  facilitationNotes: string[];
  suggestedDebriefTopics: string[];
}

export class ReportAgent {
  private client: Anthropic;
  private model: string;

  constructor(config: AgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  async generateTeamReport(
    teamId: string,
    state: CrucibleState
  ): Promise<TeamReportContent> {
    const team = state.teams.get(teamId);
    const decisions = Array.from(state.decisions).filter(d => d.teamId === teamId);
    const parish = state.parishes.get(teamId);

    const prompt = REPORT_PROMPTS.TEAM_REPORT
      .replace('{{TEAM_NAME}}', team?.teamName || teamId)
      .replace('{{STATED_VALUES}}', JSON.stringify(team?.statedValues ? Array.from(team.statedValues) : []))
      .replace('{{DECISIONS}}', JSON.stringify(decisions.map(d => ({
        id: d.id,
        categoryId: d.categoryId,
        decisionTypeId: d.decisionTypeId,
        choice: d.choice,
        rationale: d.rationale,
        simulationTime: d.simulationTime,
      }))))
      .replace('{{PARISH_STATE}}', JSON.stringify(parish ? {
        name: parish.name,
        morale: parish.morale,
        resources: {
          fuel: parish.resources.fuel,
          food: parish.resources.food,
          water: parish.resources.water,
          generators: parish.resources.generators,
        },
        status: {
          power: parish.status.power,
          communications: parish.status.communications,
          casualties: parish.status.casualties,
          populationRemaining: parish.status.populationRemaining,
        },
      } : {}));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      return JSON.parse(text);
    } catch {
      console.error('[ReportAgent] Failed to parse team report JSON:', text);
      return {
        summary: 'Unable to generate report summary.',
        decisionsAnalysis: {
          totalDecisions: decisions.length,
          notableMoments: [],
          keyChoices: [],
        },
        valuesAnalysis: {
          statedValues: team?.statedValues ? Array.from(team.statedValues) : [],
          consistencyScore: 0,
          gapsIdentified: [],
          strengthsObserved: [],
        },
        recommendations: ['Report generation encountered an error. Please try again.'],
      };
    }
  }

  async generateCMReport(state: CrucibleState): Promise<CMReportContent> {
    const teams = Array.from(state.teams.values()).map(t => ({
      id: t.id,
      teamName: t.teamName,
      parishId: t.parishId,
      statedValues: Array.from(t.statedValues),
      memberCount: t.members.length,
    }));

    const allDecisions = Array.from(state.decisions).map(d => ({
      id: d.id,
      teamId: d.teamId,
      categoryId: d.categoryId,
      choice: d.choice,
      simulationTime: d.simulationTime,
      notableMoment: d.notableMoment,
    }));

    const parishes = Array.from(state.parishes.values()).map(p => ({
      id: p.id,
      name: p.name,
      morale: p.morale,
      casualties: p.status.casualties,
      populationRemaining: p.status.populationRemaining,
    }));

    const prompt = REPORT_PROMPTS.CM_REPORT
      .replace('{{TEAMS}}', JSON.stringify(teams))
      .replace('{{DECISIONS}}', JSON.stringify(allDecisions))
      .replace('{{PARISHES}}', JSON.stringify(parishes))
      .replace('{{FEED}}', JSON.stringify(state.feed.slice(-50).map(f => ({
        type: f.type,
        source: f.source,
        content: f.content,
        breaking: f.breaking,
      }))));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      return JSON.parse(text);
    } catch {
      console.error('[ReportAgent] Failed to parse CM report JSON:', text);
      return {
        sessionSummary: 'Unable to generate session summary.',
        teamPerformance: teams.map(t => ({ teamId: t.id, summary: 'Report unavailable', score: 5 })),
        facilitationNotes: ['Report generation encountered an error.'],
        suggestedDebriefTopics: ['Overall team performance', 'Key decisions made'],
      };
    }
  }

  generateDataExport(state: CrucibleState): object {
    return {
      sessionId: state.sessionId,
      sessionCode: state.sessionCode,
      exportedAt: new Date().toISOString(),
      simulationTime: state.simulationTime,
      weather: {
        conditions: state.weather.conditions,
        windSpeed: state.weather.windSpeed,
        hurricane: {
          name: state.weather.hurricane.name,
          category: state.weather.hurricane.category,
          hasLandfall: state.weather.hurricane.hasLandfall,
        },
      },
      teams: Array.from(state.teams.values()).map(t => ({
        id: t.id,
        parishId: t.parishId,
        teamName: t.teamName,
        statedValues: Array.from(t.statedValues),
        decisionProcess: t.decisionProcess,
        commitmentStatement: t.commitmentStatement,
        memberCount: t.members.length,
      })),
      decisions: Array.from(state.decisions).map(d => ({
        id: d.id,
        teamId: d.teamId,
        parishId: d.parishId,
        categoryId: d.categoryId,
        decisionTypeId: d.decisionTypeId,
        choice: d.choice,
        rationale: d.rationale,
        simulationTime: d.simulationTime,
        realTime: d.realTime,
        notableMoment: d.notableMoment,
        notableReason: d.notableReason,
      })),
      parishes: Array.from(state.parishes.values()).map(p => ({
        id: p.id,
        name: p.name,
        finalMorale: p.morale,
        resources: {
          fuel: p.resources.fuel,
          food: p.resources.food,
          water: p.resources.water,
          generators: p.resources.generators,
          generatorsDeployed: p.resources.generatorsDeployed,
          medicalSupplies: p.resources.medicalSupplies,
          shelterUsed: p.resources.shelterUsed,
          shelterCapacity: p.resources.shelterCapacity,
        },
        status: {
          power: p.status.power,
          communications: p.status.communications,
          roads: p.status.roads,
          hospital: p.status.hospital,
          port: p.status.port,
          airport: p.status.airport,
          waterSystem: p.status.waterSystem,
          populationRemaining: p.status.populationRemaining,
          populationEvacuated: p.status.populationEvacuated,
          casualties: p.status.casualties,
          injured: p.status.injured,
        },
      })),
      feed: state.feed.map(f => ({
        id: f.id,
        type: f.type,
        source: f.source,
        content: f.content,
        urgency: f.urgency,
        relatedParish: f.relatedParish,
        breaking: f.breaking,
        timestamp: f.timestamp,
      })),
    };
  }
}
