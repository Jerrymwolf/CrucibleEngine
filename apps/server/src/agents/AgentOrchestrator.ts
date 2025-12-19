import { NarrativeAgent } from './NarrativeAgent.js';
import { ConsequenceAgent } from './ConsequenceAgent.js';
import { TempestMonitor } from './TempestMonitor.js';
import { ValuesObserver } from './ValuesObserver.js';
import { ReportAgent, TeamReportContent, CMReportContent } from './ReportAgent.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import type { CrucibleState, Decision } from '../schema/CrucibleState.js';

interface OrchestratorConfig {
  apiKey: string;
  model?: string;
}

// Type definitions for agent return types
interface ConsequenceEffect {
  parishId: string;
  category: 'resources' | 'population' | 'infrastructure' | 'morale' | 'political';
  description: string;
  magnitude: number;
  visible: boolean;
}

interface RippleEffect extends ConsequenceEffect {
  delayMinutes: number;
  trigger: string;
}

interface DelayedEffect {
  description: string;
  delayMinutes: number;
  condition: string;
}

interface ConsequenceResult {
  immediate: ConsequenceEffect[];
  ripple: RippleEffect[];
  delayed: DelayedEffect[];
  narrativeHooks: string[];
}

interface ValuesObservation {
  decisionId: string;
  statedValuesAnalysis: Array<{ value: string; alignment: number; evidence: string }>;
  abcd: { affect: string; behavior: string; cognition: string; desire: string };
  notableMoment: boolean;
  notableReason?: string;
  participantDynamics: string;
}

interface NarrativeContent {
  type: 'news' | 'social' | 'radio' | 'weather' | 'official' | 'character';
  source: string;
  content: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedParish?: string;
  breaking: boolean;
}

interface TempestAssessment {
  teamId: string;
  currentZone: 'comfort' | 'learning' | 'panic';
  confidence: number;
  signals: string[];
  recommendation: 'increase' | 'maintain' | 'decrease' | 'pause';
  suggestedLever: string;
  rationale: string;
}

// Fallback values when circuit is open
const FALLBACK_CONSEQUENCES: ConsequenceResult = {
  immediate: [],
  ripple: [],
  delayed: [],
  narrativeHooks: ['System processing decision...'],
};

const FALLBACK_OBSERVATION: ValuesObservation = {
  decisionId: '',
  statedValuesAnalysis: [],
  abcd: { affect: 'unknown', behavior: 'unknown', cognition: 'unknown', desire: 'unknown' },
  notableMoment: false,
  participantDynamics: '',
};

const FALLBACK_NARRATIVE: NarrativeContent[] = [{
  type: 'news' as const,
  source: 'Concordia Emergency Network',
  content: 'Monitoring situation across all parishes. Updates to follow.',
  urgency: 2,
  breaking: false,
}];

export class AgentOrchestrator {
  private narrativeAgent: NarrativeAgent;
  private consequenceAgent: ConsequenceAgent;
  private tempestMonitor: TempestMonitor;
  private valuesObserver: ValuesObserver;
  private reportAgent: ReportAgent;
  private circuitBreaker: CircuitBreaker;

  constructor(config: OrchestratorConfig) {
    const { apiKey, model } = config;

    this.narrativeAgent = new NarrativeAgent({ apiKey, model });
    this.consequenceAgent = new ConsequenceAgent({ apiKey, model });
    this.tempestMonitor = new TempestMonitor({ apiKey, model });
    this.valuesObserver = new ValuesObserver({ apiKey, model });
    this.reportAgent = new ReportAgent({ apiKey, model });
    this.circuitBreaker = new CircuitBreaker();

    console.log('[AgentOrchestrator] Initialized with all agents');
  }

  async calculateConsequences(
    decision: Decision,
    state: CrucibleState
  ): Promise<ConsequenceResult> {
    return this.circuitBreaker.execute(
      () => this.consequenceAgent.calculateConsequences(decision, state),
      { ...FALLBACK_CONSEQUENCES, narrativeHooks: [`Processing: ${decision.choice}`] }
    );
  }

  async analyzeDecision(
    decision: Decision,
    state: CrucibleState
  ): Promise<ValuesObservation> {
    return this.circuitBreaker.execute(
      () => this.valuesObserver.analyzeDecision(decision, state),
      { ...FALLBACK_OBSERVATION, decisionId: decision.id }
    );
  }

  async generateNarrative(state: CrucibleState): Promise<NarrativeContent[]> {
    return this.circuitBreaker.execute(
      () => this.narrativeAgent.generateContent(state),
      FALLBACK_NARRATIVE
    );
  }

  async assessAllTeams(state: CrucibleState): Promise<{
    assessments: TempestAssessment[];
    overallAdvisory: string;
  }> {
    return this.circuitBreaker.execute(
      () => this.tempestMonitor.assessAllTeams(state),
      { assessments: [], overallAdvisory: 'Assessment temporarily unavailable' }
    );
  }

  recordDecision(teamId: string, timestamp: number): void {
    this.tempestMonitor.recordDecision(teamId, timestamp);
  }

  async generateTeamReport(
    teamId: string,
    state: CrucibleState
  ): Promise<TeamReportContent> {
    return this.circuitBreaker.execute(
      () => this.reportAgent.generateTeamReport(teamId, state),
      {
        summary: 'Report generation temporarily unavailable.',
        decisionsAnalysis: { totalDecisions: 0, notableMoments: [], keyChoices: [] },
        valuesAnalysis: { statedValues: [], consistencyScore: 0, gapsIdentified: [], strengthsObserved: [] },
        recommendations: ['Please try again later.'],
      }
    );
  }

  async generateCMReport(state: CrucibleState): Promise<CMReportContent> {
    return this.circuitBreaker.execute(
      () => this.reportAgent.generateCMReport(state),
      {
        sessionSummary: 'Report generation temporarily unavailable.',
        teamPerformance: [],
        facilitationNotes: [],
        suggestedDebriefTopics: ['Please try again later.'],
      }
    );
  }

  generateDataExport(state: CrucibleState): object {
    return this.reportAgent.generateDataExport(state);
  }

  isHealthy(): boolean {
    return !this.circuitBreaker.isOpen();
  }
}
