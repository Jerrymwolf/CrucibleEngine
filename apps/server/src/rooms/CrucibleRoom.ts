import { Room, Client } from '@colyseus/core';
import { nanoid } from 'nanoid';
import {
  CrucibleState,
  ParishState,
  TeamState,
  Decision,
  StreamingContent,
  CMDirective,
  ResourceState,
  ParishStatus,
  InterventionState,
  DilemmaSnapshot,
  DilemmaOption,
} from '../schema/CrucibleState.js';
import {
  PARISHES,
  generateSessionCode,
  getCurrentWindow,
  HURRICANE_MIDAS,
  type TimelineWindow,
  type ParishIdLower,
} from '@crucible/shared';
import type { DecisionPayload, DirectivePayload } from '@crucible/shared';
import { SessionPersistence } from '../services/SessionPersistence.js';
import { StateRecovery } from '../services/StateRecovery.js';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';
import { getProductionSimulator } from '../services/ProductionSimulator.js';
import { getAITeamController, resetAITeamController } from '../agents/AITeamController.js';
import { selectNextDilemma } from '../services/DilemmaSelector.js';
import { GapAnalyzer } from '../debrief/index.js';
import type {
  ValuesScoreRecord,
  TeamValueDefinition,
  AIArchetypeId,
  Dilemma,
} from '@crucible/shared';
import { PARISH_AI_DEFAULTS } from '@crucible/shared';
import { wsAuth, type AuthenticatedClient } from '../auth/WebSocketAuth.js';
import { authLimiter, messageLimiter, sessionCodeLimiter, getClientIp } from '../middleware/RateLimiter.js';
import { isValidSessionCodeFormat } from '../utils/sessionCode.js';

// Effect types for consequence system
interface ConsequenceEffect {
  parishId: string;
  category: 'resources' | 'population' | 'infrastructure' | 'morale' | 'political';
  description: string;
  magnitude: number;
  visible: boolean;
  affectsTarget?: boolean; // If true, apply to decision.targetParishId instead of source
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

interface ScheduledEffect {
  id: string;
  type: 'ripple' | 'delayed';
  effect: RippleEffect | DelayedEffect;
  triggerSimTime: number;
  decisionId: string;
  condition?: string;
}

interface JoinOptions {
  sessionCode?: string;
  role?: 'team' | 'cm' | 'spectator';
  teamId?: string;
  participantName?: string;
  create?: boolean;
}

interface ClientMetadata {
  participantId: string;
  participantName: string;
  role: 'team' | 'cm' | 'spectator';
  teamId?: string;
  authenticated: boolean;
}

export class CrucibleRoom extends Room<CrucibleState> {
  maxClients = 50; // 5 teams × ~10 members max
  autoDispose = true;

  private simulationInterval: NodeJS.Timeout | null = null;
  private narrativeInterval: NodeJS.Timeout | null = null;

  // Database integration
  private persistence: SessionPersistence;
  private recovery: StateRecovery;
  private dbSessionId: string | null = null;

  // Agent orchestration
  private orchestrator: AgentOrchestrator | null = null;
  private scheduledEffects: ScheduledEffect[] = [];
  private narrativeInProgress = false;
  private tempestInterval: NodeJS.Timeout | null = null;

  // Timeline tracking
  private currentTimelineWindow: TimelineWindow | null = null;
  private previousTimelineWindow: TimelineWindow | null = null;

  // AI Team tracking
  private aiDilemmasPresented: Map<string, string[]> = new Map(); // parishId -> dilemmaIds
  private aiPendingDilemmas: Map<string, Dilemma> = new Map(); // parishId -> current dilemma
  private aiDecisionInterval: NodeJS.Timeout | null = null;

  async onCreate(options: JoinOptions) {
    console.log('CrucibleRoom created with options:', options);

    // Initialize persistence services
    this.persistence = new SessionPersistence();
    this.recovery = new StateRecovery();

    // Initialize state
    this.setState(new CrucibleState());

    // Check for existing session to recover
    if (options.sessionCode) {
      try {
        const snapshot = await this.persistence.loadSession(options.sessionCode);
        if (snapshot) {
          console.log(`Recovering session: ${options.sessionCode}`);
          this.recovery.reconstructState(snapshot, this.state);
          this.dbSessionId = snapshot.session.id;
          this.roomId = this.state.sessionCode;

          // Initialize parishes (recovery will overwrite with saved state)
          this.initializeParishes();

          // Set up message handlers
          this.setupMessageHandlers();

          console.log(`Session recovered: ${this.state.sessionCode}`);
          return;
        }
      } catch (error) {
        console.warn('Session recovery failed, creating new session:', error);
      }
    }

    // Create new session
    this.state.sessionId = nanoid();
    this.state.sessionCode = generateSessionCode();
    this.state.scenarioSeed = nanoid(8);
    this.state.lastUpdate = Date.now();

    // Initialize parishes
    this.initializeParishes();

    // Set up message handlers
    this.setupMessageHandlers();

    // Set room ID to session code for easy joining
    this.roomId = this.state.sessionCode;

    // Persist to database
    try {
      await this.persistence.createSession({
        id: this.state.sessionId,
        code: this.state.sessionCode,
        scenarioSeed: this.state.scenarioSeed,
        crucibleMasterId: options.role === 'cm' ? 'cm' : 'unknown',
      });
      this.dbSessionId = this.state.sessionId;
      console.log(`Session persisted to database: ${this.state.sessionCode}`);
    } catch (error) {
      console.warn('Failed to persist session to database:', error);
    }

    // Initialize agent orchestrator
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (apiKey) {
      this.orchestrator = new AgentOrchestrator({
        apiKey,
        model: process.env['ANTHROPIC_MODEL'] || 'claude-sonnet-4-5-20250929',
      });
    } else {
      console.warn('[CrucibleRoom] ANTHROPIC_API_KEY not set - agents disabled');
    }

    // Set up debug commands (development only)
    this.setupDebugCommands();

    console.log(`Room created with code: ${this.state.sessionCode}`);
  }

  private initializeParishes() {
    for (const [key, parish] of Object.entries(PARISHES)) {
      const parishState = new ParishState();
      parishState.id = parish.id;
      parishState.name = parish.name;

      // Initialize resources
      parishState.resources = new ResourceState();
      parishState.resources.generators = parish.resources.generators;
      parishState.resources.medicalSupplies = parish.resources.medicalSupplies;
      parishState.resources.fuel =
        parish.resources.fuel === 'high' ? 100 : parish.resources.fuel === 'medium' ? 65 : 30;
      parishState.resources.food =
        parish.resources.food === 'high' ? 100 : parish.resources.food === 'medium' ? 65 : 30;
      parishState.resources.water = 100; // Start full
      parishState.resources.shelterCapacity = parish.resources.shelterCapacity;

      // Initialize status
      parishState.status = new ParishStatus();
      parishState.status.populationRemaining = parish.population;

      this.state.parishes.set(parish.id, parishState);
    }
  }

  private setupMessageHandlers() {
    // =========================================================================
    // AUTHENTICATION HANDLERS
    // =========================================================================

    // Handle auth message from client
    this.onMessage('auth', async (client, message: {
      type: 'auth';
      clerkToken?: string;
      participantToken?: string;
      sessionCode: string;
      teamId?: string;
      role?: 'participant' | 'spectator';
    }) => {
      const clientIp = getClientIp(client as { req?: { socket?: { remoteAddress?: string } } }, client.sessionId);

      // Rate limit auth attempts
      const authLimit = authLimiter.check(clientIp);
      if (!authLimit.allowed) {
        client.send('auth_failed', {
          reason: 'Too many attempts. Try again later.',
          retryAfter: Math.ceil(authLimit.resetIn / 1000),
        });
        if (authLimit.blocked) {
          client.leave(4029); // Too Many Requests
        }
        return;
      }

      // Validate session code format
      if (!message.sessionCode || !isValidSessionCodeFormat(message.sessionCode)) {
        sessionCodeLimiter.check(clientIp);
        client.send('auth_failed', { reason: 'Invalid session code' });
        return;
      }

      // Authenticate the client
      const authResult = await wsAuth.authenticate(
        client,
        message,
        async (code) => {
          // Validate session exists
          if (code !== this.state.sessionCode) {
            sessionCodeLimiter.check(clientIp);
            return { valid: false };
          }
          return { valid: true, cmUserId: this.state.crucibleMaster || undefined };
        }
      );

      if (!authResult) {
        client.send('auth_failed', { reason: 'Authentication failed' });
        return;
      }

      // Update client metadata
      const metadata = client.userData as ClientMetadata;
      metadata.participantId = authResult.userId;
      metadata.participantName = authResult.userId.startsWith('pt_')
        ? `Participant-${authResult.userId.slice(3, 7)}`
        : authResult.userId;
      metadata.role = authResult.role === 'cm' ? 'cm' : authResult.role === 'spectator' ? 'spectator' : 'team';
      metadata.teamId = authResult.teamId;
      metadata.authenticated = true;

      // Send success
      client.send('auth_success', {
        userId: authResult.userId,
        role: authResult.role,
        teamId: authResult.teamId,
      });

      // Handle authenticated join
      await this.handleAuthenticatedJoin(client, authResult);
    });

    // Handle token refresh for CM users
    this.onMessage('token_refresh', async (client, message: {
      clerkToken: string;
      sessionCode: string;
    }) => {
      const currentAuth = wsAuth.getClient(client.sessionId);
      if (!currentAuth || currentAuth.role !== 'cm') {
        client.send('auth_failed', { reason: 'Not authenticated as CM' });
        return;
      }

      const refreshResult = await wsAuth.authenticate(
        client,
        { type: 'auth', clerkToken: message.clerkToken, sessionCode: message.sessionCode },
        async () => ({ valid: true, cmUserId: currentAuth.userId })
      );

      if (refreshResult) {
        client.send('token_refreshed', {});
      } else {
        client.send('auth_failed', { reason: 'Token refresh failed' });
      }
    });

    // Heartbeat handler for presence tracking
    this.onMessage('heartbeat', (client, _data: { timestamp: number; idle: boolean; lastActivity: number }) => {
      // Heartbeat received - client is alive
      // Presence tracking can be added here later
    });

    // =========================================================================
    // GAME MESSAGE HANDLERS (require authentication)
    // =========================================================================

    // Team decision
    this.onMessage('decision', (client, payload: DecisionPayload) => {
      // Auth check
      if (!wsAuth.requireRole(client.sessionId, ['cm', 'participant'])) {
        client.send('error', { message: 'Unauthorized' });
        return;
      }

      // Rate limit
      const msgLimit = messageLimiter.check(client.sessionId);
      if (!msgLimit.allowed) {
        client.send('rate_limited', { retryAfter: Math.ceil(msgLimit.resetIn / 1000) });
        return;
      }

      this.handleDecision(client, payload);
    });

    // CM: Set global intensity
    this.onMessage('cm:setIntensity', (client, payload: { level: number }) => {
      this.handleSetIntensity(client, payload.level);
    });

    // CM: Set team-specific intensity
    this.onMessage('cm:setTeamIntensity', (client, payload: { teamId: string; level: number }) => {
      this.handleSetTeamIntensity(client, payload.teamId, payload.level);
    });

    // CM: Send directive
    this.onMessage('cm:directive', (client, payload: DirectivePayload) => {
      this.handleDirective(client, payload);
    });

    // CM: Change phase
    this.onMessage('cm:setPhase', (client, payload: { phase: string }) => {
      this.handleSetPhase(client, payload.phase);
    });

    // CM: Pause/resume
    this.onMessage('cm:togglePause', (client) => {
      this.handleTogglePause(client);
    });

    // CM: Trigger intervention (flash check, values moment, commitment mirror)
    this.onMessage('cm:triggerIntervention', (client, payload: {
      teamId: string;
      type: 'flash' | 'moment' | 'mirror';
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role !== 'cm') {
        client.send('error', { message: 'Only CM can trigger interventions' });
        return;
      }

      const team = this.state.teams.get(payload.teamId);
      if (!team) {
        client.send('error', { message: 'Team not found' });
        return;
      }

      // Duration by intervention type
      const durations: Record<string, number> = {
        flash: 10_000,   // 10 seconds
        moment: 120_000, // 2 minutes
        mirror: 180_000, // 3 minutes
      };

      const intervention = new InterventionState();
      intervention.id = `int-${nanoid(8)}`;
      intervention.teamId = payload.teamId;
      intervention.interventionType = payload.type;
      intervention.startedAt = Date.now();
      intervention.expiresAt = Date.now() + durations[payload.type];

      // For mirror type, include the team's commitment
      if (payload.type === 'mirror') {
        intervention.commitmentText = team.commitmentStatement || '';
      }

      // Set intervention (replaces any existing for this team)
      this.state.interventions.set(payload.teamId, intervention);

      console.log(`[CM] Triggered ${payload.type} intervention for team ${team.teamName}`);

      // Auto-clear after duration
      this.clock.setTimeout(() => {
        this.state.interventions.delete(payload.teamId);
        console.log(`[CM] Intervention expired for team ${team.teamName}`);
      }, durations[payload.type]);
    });

    // Team ready status
    this.onMessage('team:ready', (client, payload: { teamId: string; ready: boolean }) => {
      this.handleTeamReady(client, payload.teamId, payload.ready);
    });

    // Team values submission (legacy - just values)
    this.onMessage('team:submitValues', (client, payload: { teamId: string; values: string[] }) => {
      this.handleTeamValues(client, payload.teamId, payload.values);
    });

    // Team discovery data submission (values + commitment + process)
    this.onMessage('team:submitDiscoveryData', (client, payload: {
      teamId: string;
      values: string[];
      commitmentStatement: string;
      decisionProcess: string;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;

      // Verify client belongs to the team
      if (metadata?.teamId !== payload.teamId && metadata?.role !== 'cm') {
        client.send('error', { message: 'You can only submit data for your own team' });
        return;
      }

      const team = this.state.teams.get(payload.teamId);
      if (!team) {
        client.send('error', { message: 'Team not found' });
        return;
      }

      // Update team with all discovery data
      team.statedValues.clear();
      payload.values.forEach(v => team.statedValues.push(v));
      team.commitmentStatement = payload.commitmentStatement;
      team.decisionProcess = payload.decisionProcess;

      console.log(`[Discovery] Team ${team.teamName} submitted: ${payload.values.length} values, process: ${payload.decisionProcess}`);
    });

    // Join team
    this.onMessage('joinTeam', (client, payload: { parishId: string; teamName?: string }) => {
      this.handleJoinTeam(client, payload.parishId, payload.teamName);
    });

    // Pre-Crisis: Submit individual values profile
    this.onMessage('preCrisis:submitIndividualProfile', async (client, payload: {
      participantId: string;
      topFive: string[];
      valueMeanings: Record<string, {
        definition: string;
        livingIt: string[];
        violatingIt: string[];
      }>;
      valuesStory?: string;
      selfIdentifiedValues: string[];
      peerIdentifiedValues: string[];
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (!metadata) {
        client.send('error', { message: 'Client metadata not found' });
        return;
      }

      console.log(`[PreCrisis] Individual profile from ${metadata.participantName}: ${payload.topFive.join(', ')}`);

      // Persist to database if available
      if (this.dbSessionId) {
        try {
          await this.persistence.createPreCrisisProfile({
            sessionId: this.dbSessionId,
            participantId: metadata.participantId,
            participantName: metadata.participantName,
            topFive: payload.topFive,
            valueMeanings: payload.valueMeanings,
            valuesStory: payload.valuesStory,
            selfIdentifiedValues: payload.selfIdentifiedValues,
            peerIdentifiedValues: payload.peerIdentifiedValues,
          });
        } catch (error) {
          console.warn('[PreCrisis] Failed to persist individual profile:', error);
        }
      }

      // Broadcast to team members for gallery walk sync
      if (metadata.teamId) {
        this.clients.forEach(c => {
          const cMeta = c.userData as ClientMetadata | undefined;
          if (cMeta?.teamId === metadata.teamId) {
            c.send('preCrisis:individualProfileSubmitted', {
              participantId: metadata.participantId,
              participantName: metadata.participantName,
              topFive: payload.topFive,
            });
          }
        });
      }

      client.send('preCrisis:individualProfileSaved', { success: true });
    });

    // Pre-Crisis: Submit team values profile
    this.onMessage('preCrisis:submitTeamProfile', async (client, payload: {
      teamId: string;
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
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;

      // Verify client belongs to the team
      if (metadata?.teamId !== payload.teamId && metadata?.role !== 'cm') {
        client.send('error', { message: 'You can only submit data for your own team' });
        return;
      }

      const team = this.state.teams.get(payload.teamId);
      if (!team) {
        client.send('error', { message: 'Team not found' });
        return;
      }

      // Update team state
      team.statedValues.clear();
      payload.statedValues.forEach(v => team.statedValues.push(v));
      team.commitmentStatement = payload.commitmentStatement;
      team.decisionProcess = payload.decisionProcess;

      console.log(`[PreCrisis] Team ${team.teamName} profile: ${payload.statedValues.length} values, commitment signed by ${payload.signatures.length}`);

      // Persist to database if available
      if (this.dbSessionId) {
        try {
          await this.persistence.createTeamCommitment({
            sessionId: this.dbSessionId,
            teamId: payload.teamId,
            teamName: team.teamName,
            statedValues: payload.statedValues,
            valueDefinitions: payload.valueDefinitions,
            commitmentStatement: payload.commitmentStatement,
            decisionProcess: payload.decisionProcess,
            signatures: payload.signatures,
            readAloudAt: payload.readAloudAt,
          });
        } catch (error) {
          console.warn('[PreCrisis] Failed to persist team commitment:', error);
        }
      }

      // Broadcast team profile update
      this.broadcast('preCrisis:teamProfileUpdated', {
        teamId: payload.teamId,
        statedValues: payload.statedValues,
        commitmentStatement: payload.commitmentStatement,
        decisionProcess: payload.decisionProcess,
      });

      client.send('preCrisis:teamProfileSaved', { success: true });
    });

    // Reflection submission (for debrief)
    this.onMessage('reflection:submit', async (client, payload: {
      teamId: string;
      participantName: string;
      content: string;
      visibility: 'private' | 'team' | 'facilitator';
      category: string;
    }) => {
      const { teamId, participantName, content, visibility, category } = payload;

      if (!this.dbSessionId) {
        client.send('error', { message: 'Session not persisted' });
        return;
      }

      try {
        await this.persistence.createReflection({
          sessionId: this.dbSessionId,
          teamId,
          participantName,
          content,
          visibility,
          category,
          timestamp: Date.now(),
        });

        console.log(`[Reflection] ${participantName} submitted ${category} reflection`);

        // Broadcast to relevant parties based on visibility
        if (visibility === 'team') {
          // Send to team members only
          this.clients.forEach(c => {
            const meta = c.userData as ClientMetadata | undefined;
            if (meta?.teamId === teamId && c !== client) {
              c.send('reflection:new', { teamId, participantName, category, visibility });
            }
          });
        } else if (visibility === 'facilitator') {
          // Send to CM only
          this.clients.forEach(c => {
            const meta = c.userData as ClientMetadata | undefined;
            if (meta?.role === 'cm') {
              c.send('reflection:new', { teamId, participantName, category, visibility });
            }
          });
        }
        // 'private' visibility - no broadcast

        client.send('reflection:saved', { category });
      } catch (error) {
        console.error('[Reflection] Failed to save:', error);
        client.send('error', { message: 'Failed to save reflection' });
      }
    });

    // Debrief data request - loads analysis data from database
    this.onMessage('debrief:requestData', async (client, payload: { teamId: string }) => {
      const { teamId } = payload;
      const metadata = client.userData as ClientMetadata | undefined;

      // Verify client belongs to the team or is CM
      if (metadata?.teamId !== teamId && metadata?.role !== 'cm') {
        client.send('error', { message: 'You can only request debrief data for your own team' });
        return;
      }

      console.log(`[Debrief] Requesting data for team ${teamId}`);

      try {
        // Get data from database
        const data = await this.persistence.getDebriefData(teamId);
        if (!data) {
          client.send('debrief:data', { teamId, error: 'No data found for team' });
          return;
        }

        // Get team info from state for additional context
        const team = this.state.teams.get(teamId);

        // Helper to derive phase from simulation time (minutes)
        const getPhase = (simTime: number): 'watch' | 'crisis' | 'recovery' => {
          if (simTime > 180) return 'recovery';
          if (simTime > 60) return 'crisis';
          return 'watch';
        };

        // Build ValuesScoreRecords for GapAnalyzer
        // Include all required fields with defaults for fields we don't have
        const records: ValuesScoreRecord[] = data.decisions
          .filter(d => d.valuesAnalysis !== null) // Only include decisions with analysis
          .map(d => ({
            id: `score-${d.id}`,
            decisionId: d.id,
            teamId,
            simulationTime: d.simulationTime,
            phase: getPhase(d.simulationTime),
            scores: (d.valuesAnalysis?.statedValuesAnalysis || []).map(va => ({
              value: va.value,
              alignment: va.alignment as -3 | -2 | -1 | 0 | 1 | 2 | 3,
              evidence: va.evidence,
              confidence: 80,
            })),
            abcd: d.valuesAnalysis?.abcd || {
              affect: 'unknown',
              behavior: 'unknown',
              cognition: 'unknown',
              desire: 'unknown',
            },
            isNotable: d.notableMoment,
            notableReason: d.notableReason || undefined,
            commitmentAlignment: 'aligned' as const, // Default - not stored
            valuesCheckTriggered: false, // Default - not stored
            meta: {
              scoredAt: Date.now(),
              modelUsed: 'stored',
              confidence: 80,
            },
          }));

        // Run GapAnalyzer to generate full report
        const gapReport = GapAnalyzer.analyze(
          teamId,
          records,
          data.statedValues,
          data.valueDefinitions as TeamValueDefinition[],
          data.commitmentStatement
        );

        // Send complete debrief data to client
        client.send('debrief:data', {
          teamId,
          teamName: team?.teamName || 'Unknown Team',
          valueDefinitions: data.valueDefinitions,
          statedValues: data.statedValues,
          commitmentStatement: data.commitmentStatement,
          decisionProcess: data.decisionProcess,
          decisions: data.decisions,
          gapReport,
        });

        console.log(`[Debrief] Sent data for team ${teamId}: ${data.decisions.length} decisions, ${gapReport.notableMoments.length} notable moments`);
      } catch (error) {
        console.error('[Debrief] Failed to generate report:', error);
        client.send('debrief:data', { teamId, error: 'Failed to generate debrief report' });
      }
    });

    // Transfer reflection submission
    this.onMessage('debrief:submitTransferReflection', async (client, payload: {
      teamId: string;
      participantId: string;
      participantName: string;
      realSituation: string;
      valueTested: string;
      whatYouDid: string;
      pressureTrigger: string;
      committedAction: string;
      valueProtected: string;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;

      // Verify client belongs to the team
      if (metadata?.teamId !== payload.teamId) {
        client.send('error', { message: 'You can only submit reflections for your own team' });
        return;
      }

      if (!this.dbSessionId) {
        client.send('error', { message: 'Session not persisted' });
        return;
      }

      try {
        await this.persistence.createTransferReflection({
          sessionId: this.dbSessionId,
          ...payload,
        });

        console.log(`[Debrief] ${payload.participantName} submitted transfer reflection`);
        client.send('debrief:transferReflectionSaved', { success: true });
      } catch (error) {
        console.error('[Debrief] Failed to save transfer reflection:', error);
        client.send('error', { message: 'Failed to save transfer reflection' });
      }
    });

    // Report generation
    this.onMessage('report:generate', async (client, payload: {
      type: 'team' | 'cm' | 'data';
      teamId?: string;
    }) => {
      const { type, teamId } = payload;
      const metadata = client.userData as ClientMetadata | undefined;

      if (!this.orchestrator) {
        client.send('report:error', { message: 'Report generation not available' });
        return;
      }

      try {
        let report: unknown;

        if (type === 'team' && teamId) {
          report = await this.orchestrator.generateTeamReport(teamId, this.state);
        } else if (type === 'cm') {
          if (metadata?.role !== 'cm') {
            client.send('error', { message: 'Only Crucible Master can generate CM reports' });
            return;
          }
          report = await this.orchestrator.generateCMReport(this.state);
        } else if (type === 'data') {
          if (metadata?.role !== 'cm') {
            client.send('error', { message: 'Only Crucible Master can export data' });
            return;
          }
          report = this.orchestrator.generateDataExport(this.state);
        } else {
          client.send('error', { message: 'Invalid report type or missing teamId' });
          return;
        }

        client.send('report:ready', { type, report });
        console.log(`[Report] Generated ${type} report for ${metadata?.participantName || 'unknown'}`);
      } catch (error) {
        console.error('[Report] Generation failed:', error);
        client.send('report:error', { message: 'Failed to generate report' });
      }
    });

    // CM: Set AI team archetype
    this.onMessage('cm:setAIArchetype', (client, payload: {
      parishId: string;
      archetypeId: string;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role !== 'cm') {
        client.send('error', { message: 'Only CM can modify AI teams' });
        return;
      }

      const team = this.state.teams.get(payload.parishId);
      if (!team || !team.isAI) {
        client.send('error', { message: 'AI team not found' });
        return;
      }

      const validArchetypes = ['by-the-book', 'cowboy', 'union-strong', 'bottom-line', 'caretaker'];
      if (!validArchetypes.includes(payload.archetypeId)) {
        client.send('error', { message: 'Invalid archetype' });
        return;
      }

      // Update AI controller
      const aiController = getAITeamController();
      aiController.initializeTeam(payload.parishId as ParishIdLower, payload.archetypeId as AIArchetypeId);

      // Update team state
      team.aiArchetype = payload.archetypeId;
      team.aiDrift = 0; // Reset drift on archetype change

      console.log(`[CM] Set AI team ${payload.parishId} archetype to ${payload.archetypeId}`);
    });

    // CM: Adjust AI team drift
    this.onMessage('cm:adjustAIDrift', (client, payload: {
      parishId: string;
      driftModifier: number;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role !== 'cm') {
        client.send('error', { message: 'Only CM can modify AI teams' });
        return;
      }

      const team = this.state.teams.get(payload.parishId);
      if (!team || !team.isAI) {
        client.send('error', { message: 'AI team not found' });
        return;
      }

      const aiController = getAITeamController();
      const aiState = aiController.getTeamState(payload.parishId);
      if (aiState) {
        // Manually adjust drift (clamp to 0-1)
        const newDrift = Math.max(0, Math.min(1, aiState.currentDrift + payload.driftModifier));
        aiState.currentDrift = newDrift;
        aiState.currentAlignment = aiState.currentAlignment - payload.driftModifier;
        team.aiDrift = newDrift;

        console.log(`[CM] Adjusted AI team ${payload.parishId} drift by ${payload.driftModifier} to ${newDrift.toFixed(2)}`);
      }
    });

    // CM: Force AI team decision
    this.onMessage('cm:forceAIDecision', (client, payload: {
      parishId: string;
      optionId: string;
      rationale?: string;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role !== 'cm') {
        client.send('error', { message: 'Only CM can force AI decisions' });
        return;
      }

      const team = this.state.teams.get(payload.parishId);
      if (!team || !team.isAI) {
        client.send('error', { message: 'AI team not found' });
        return;
      }

      const pendingDilemma = this.aiPendingDilemmas.get(payload.parishId);
      if (!pendingDilemma) {
        client.send('error', { message: 'No pending dilemma for this AI team' });
        return;
      }

      // Cancel any scheduled decision
      const aiController = getAITeamController();
      aiController.cancelPendingDecision(payload.parishId);

      // Apply the forced decision
      this.applyAIDecision(
        payload.parishId,
        pendingDilemma,
        payload.optionId,
        payload.rationale || 'Decision overridden by Crucible Master'
      );

      console.log(`[CM] Forced AI team ${payload.parishId} decision: ${payload.optionId}`);
    });

    // CM: Trigger dilemma for AI team
    this.onMessage('cm:triggerAIDilemma', (client, payload: {
      parishId: string;
      dilemmaId?: string;
    }) => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role !== 'cm') {
        client.send('error', { message: 'Only CM can trigger AI dilemmas' });
        return;
      }

      const team = this.state.teams.get(payload.parishId);
      if (!team || !team.isAI) {
        client.send('error', { message: 'AI team not found' });
        return;
      }

      this.presentDilemmaToAITeam(payload.parishId as ParishIdLower, payload.dilemmaId);
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`[Room] Client connecting: ${client.sessionId}`);

    // Store initial unauthenticated metadata
    const metadata: ClientMetadata = {
      participantId: '',
      participantName: '',
      role: 'team',
      teamId: undefined,
      authenticated: false,
    };
    client.userData = metadata;

    // Start authentication timeout - client must authenticate within 10s
    wsAuth.startAuthTimeout(client, () => {
      client.send('auth_timeout', { message: 'Authentication timeout' });
      client.leave(4001); // Custom code for auth timeout
    });

    // Request authentication from client
    client.send('auth_required', { sessionCode: this.state.sessionCode });
  }

  onLeave(client: Client, consented: boolean) {
    const metadata = client.userData as ClientMetadata | undefined;
    const auth = wsAuth.getClient(client.sessionId);

    console.log(`[Room] Client left: ${client.sessionId} (consented: ${consented}, authenticated: ${!!auth})`);

    if (metadata && metadata.authenticated) {
      // Remove from team if applicable
      if (metadata.teamId) {
        const team = this.state.teams.get(metadata.teamId);
        if (team) {
          const idx = team.members.indexOf(metadata.participantId);
          if (idx !== -1) {
            team.members.splice(idx, 1);
          }
        }
      }

      // Broadcast leave event
      this.broadcast('playerLeft', {
        participantId: metadata.participantId,
        participantName: metadata.participantName,
      });
    }

    // Clean up auth state
    wsAuth.removeClient(client.sessionId);
  }

  onDispose() {
    console.log(`Room ${this.state.sessionCode} disposing`);

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    if (this.narrativeInterval) {
      clearInterval(this.narrativeInterval);
    }
    this.stopTempestMonitor();
    this.stopAIDecisionLoop();
    resetAITeamController();
  }

  // === Authentication ===

  /**
   * Handle authenticated client join
   * Called after successful WebSocket authentication
   */
  private async handleAuthenticatedJoin(
    client: Client,
    auth: AuthenticatedClient
  ): Promise<void> {
    const metadata = client.userData as ClientMetadata;

    if (auth.role === 'cm') {
      // CM joins as controller
      this.state.crucibleMaster = auth.userId;
      console.log(`[Room] CM joined: ${auth.userId}`);
    } else if (auth.role === 'participant') {
      // Participant - may have a team assignment
      if (auth.teamId) {
        const team = this.state.teams.get(auth.teamId);
        if (team) {
          // Add to team if not already a member
          if (!team.members.includes(auth.userId)) {
            team.members.push(auth.userId);
          }
          metadata.teamId = auth.teamId;
          console.log(`[Room] Participant joined team ${auth.teamId}: ${auth.userId}`);
        }
      } else {
        console.log(`[Room] Participant joined (no team): ${auth.userId}`);
      }
    } else {
      // Spectator - no state changes needed
      console.log(`[Room] Spectator joined: ${auth.userId}`);
    }

    // Broadcast join event (only for authenticated users)
    this.broadcast('playerJoined', {
      participantId: auth.userId,
      participantName: metadata.participantName,
      role: auth.role,
    });
  }

  // === Message Handlers ===

  private async handleDecision(client: Client, payload: DecisionPayload) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (!metadata?.teamId) {
      client.send('error', { message: 'You must be on a team to make decisions' });
      return;
    }

    const team = this.state.teams.get(metadata.teamId);
    if (!team) {
      client.send('error', { message: 'Team not found' });
      return;
    }

    // Create decision record
    const decision = new Decision();
    decision.id = nanoid();
    decision.teamId = metadata.teamId;
    decision.parishId = team.parishId;
    decision.categoryId = payload.categoryId;
    decision.decisionTypeId = payload.decisionTypeId;
    decision.choice = payload.choice;
    decision.rationale = payload.rationale || '';
    decision.targetParishId = payload.targetParishId || '';
    decision.simulationTime = this.state.simulationTime;
    decision.realTime = Date.now();
    decision.advocatedBy.push(metadata.participantId);

    // 1. PERSIST to database first (persist-before-broadcast)
    if (this.dbSessionId) {
      try {
        await this.persistence.persistDecision({
          id: decision.id,
          sessionId: this.dbSessionId,
          teamId: decision.teamId,
          categoryId: decision.categoryId,
          decisionTypeId: decision.decisionTypeId,
          choice: decision.choice,
          rationale: decision.rationale || undefined,
          targetParishId: decision.targetParishId || undefined,
          simulationTime: decision.simulationTime,
          advocates: [{ participantId: metadata.participantId, position: 'for' }],
        });
      } catch (error) {
        console.error('Failed to persist decision:', error);
      }
    }

    // 2. THEN update Colyseus state
    this.state.decisions.push(decision);

    // 3. Clear the current dilemma so next one can be presented
    this.clearTeamDilemma(metadata.teamId);

    // 4. THEN broadcast to clients
    this.broadcast('decisionMade', {
      decisionId: decision.id,
      teamId: decision.teamId,
      parishId: decision.parishId,
      categoryId: decision.categoryId,
      decisionTypeId: decision.decisionTypeId,
      choice: decision.choice,
    });

    console.log(`Decision made by ${team.teamName}: ${decision.decisionTypeId} -> ${decision.choice}`);
  }

  private handleSetIntensity(client: Client, level: number) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (metadata?.role !== 'cm') {
      client.send('error', { message: 'Only Crucible Master can adjust intensity' });
      return;
    }

    const clampedLevel = Math.max(1, Math.min(10, level));
    this.state.intensity.global = clampedLevel;
    this.state.intensity.lastAdjustment = Date.now();

    console.log(`Global intensity set to ${clampedLevel}`);
  }

  private handleSetTeamIntensity(client: Client, teamId: string, level: number) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (metadata?.role !== 'cm') {
      client.send('error', { message: 'Only Crucible Master can adjust intensity' });
      return;
    }

    const clampedLevel = Math.max(1, Math.min(10, level));
    this.state.intensity.byTeam.set(teamId, clampedLevel);
    this.state.intensity.lastAdjustment = Date.now();

    console.log(`Team ${teamId} intensity set to ${clampedLevel}`);
  }

  private handleDirective(client: Client, payload: DirectivePayload) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (metadata?.role !== 'cm') {
      client.send('error', { message: 'Only Crucible Master can send directives' });
      return;
    }

    const directive = new CMDirective();
    directive.id = nanoid();
    directive.type = payload.type;
    directive.content = payload.content;
    directive.isBinding = ['operational-order', 'time-call', 'stand-down'].includes(payload.type);
    directive.timestamp = Date.now();

    if (payload.targetTeams) {
      for (const teamId of payload.targetTeams) {
        directive.targetTeams.push(teamId);
      }
    }

    this.state.directives.push(directive);

    // Broadcast directive
    this.broadcast('directiveIssued', {
      directiveId: directive.id,
      type: directive.type,
      content: directive.content,
      targetTeams: payload.targetTeams || [],
      isBinding: directive.isBinding,
    });

    console.log(`CM Directive: ${directive.type} - ${directive.content}`);
  }

  private handleSetPhase(client: Client, phase: string) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (metadata?.role !== 'cm') {
      client.send('error', { message: 'Only Crucible Master can change phase' });
      return;
    }

    const validPhases = ['lobby', 'discovery', 'briefing', 'storm', 'recovery', 'debrief'];
    if (!validPhases.includes(phase)) {
      client.send('error', { message: 'Invalid phase' });
      return;
    }

    this.state.phase.current = phase;
    this.state.phase.phaseStartTime = Date.now();

    // Start/stop simulation based on phase
    if (phase === 'storm') {
      this.initializeAITeams();
      this.startSimulation();
      this.startAIDecisionLoop();
    } else if (phase !== 'recovery') {
      this.stopSimulation();
      this.stopAIDecisionLoop();
    }

    console.log(`Phase changed to: ${phase}`);
  }

  private handleTogglePause(client: Client) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (metadata?.role !== 'cm') {
      client.send('error', { message: 'Only Crucible Master can pause/resume' });
      return;
    }

    this.state.phase.paused = !this.state.phase.paused;
    console.log(`Simulation ${this.state.phase.paused ? 'paused' : 'resumed'}`);
  }

  private handleTeamReady(client: Client, teamId: string, ready: boolean) {
    const metadata = client.userData as ClientMetadata | undefined;

    // Security: Verify client belongs to the team or is CM
    if (metadata?.teamId !== teamId && metadata?.role !== 'cm') {
      client.send('error', { message: 'You can only mark your own team as ready' });
      console.warn(`[Security] Client ${client.sessionId} attempted to mark team ${teamId} ready without authorization`);
      return;
    }

    const team = this.state.teams.get(teamId);
    if (!team) {
      client.send('error', { message: 'Team not found' });
      return;
    }

    team.ready = ready;
    console.log(`Team ${team.teamName} ready: ${ready} (set by ${metadata?.participantName || 'unknown'})`);
  }

  private handleTeamValues(client: Client, teamId: string, values: string[]) {
    const team = this.state.teams.get(teamId);
    if (!team) {
      client.send('error', { message: 'Team not found' });
      return;
    }

    team.statedValues.clear();
    for (const value of values) {
      team.statedValues.push(value);
    }

    console.log(`Team ${team.teamName} values: ${values.join(', ')}`);
  }

  private handleJoinTeam(client: Client, parishId: string, teamName?: string) {
    const metadata = client.userData as ClientMetadata | undefined;
    if (!metadata) {
      client.send('error', { message: 'Client metadata not found' });
      return;
    }

    // Check if team exists for this parish
    let team = this.state.teams.get(parishId);

    if (!team) {
      // Create new team
      team = new TeamState();
      team.id = parishId; // Use parish ID as team ID
      team.parishId = parishId;
      team.teamName = teamName || `Team ${parishId.charAt(0).toUpperCase() + parishId.slice(1)}`;
      this.state.teams.set(parishId, team);
    }

    // Add member if not already present
    if (!team.members.includes(metadata.participantId)) {
      team.members.push(metadata.participantId);
    }

    // Update client metadata
    metadata.teamId = parishId;
    client.userData = metadata;

    console.log(`${metadata.participantName} joined team ${team.teamName}`);
  }

  // === Simulation Control ===

  private startSimulation() {
    if (this.simulationInterval) return;

    console.log('Starting simulation loop');

    // Simulation tick every 5 seconds (represents 1 minute simulation time)
    this.simulationInterval = setInterval(() => {
      if (!this.state.phase.paused) {
        this.simulationTick();
      }
    }, 5000);

    // Start TempestMonitor for psychological state tracking
    this.startTempestMonitor();
  }

  private stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.stopTempestMonitor();
  }

  private async simulationTick() {
    this.state.simulationTime += 1;
    this.state.lastUpdate = Date.now();

    console.log(`[Tick] T+${this.state.simulationTime}`);

    try {
      // 1. Process unprocessed decisions
      await this.processNewDecisions();

      // 2. Process scheduled effects (ripple/delayed)
      this.processPendingEffects();

      // 3. Generate narrative (every 3 ticks, ~15 sec)
      if (this.state.simulationTime % 3 === 0 && !this.narrativeInProgress) {
        this.generateNarrativeContent(); // Fire-and-forget
      }

      // 4. Update weather based on simulation time
      this.updateWeatherState();

      // 5. Update resource consumption
      this.updateResourceConsumption();

      // 6. Update production metrics (revenue, patients, workers)
      getProductionSimulator().update(this.state);

      // 7. Persist production snapshot (every 10 ticks for analysis)
      if (this.dbSessionId && this.state.simulationTime % 10 === 0) {
        this.persistence.createProductionSnapshot({
          sessionId: this.dbSessionId,
          simulationTime: this.state.simulationTime,
          revenueImpact: this.state.production.revenueImpact,
          productionHoursLost: this.state.production.productionHoursLost,
          quarterlyProgress: this.state.production.quarterlyProgress,
          pipelineStatus: this.state.production.pipelineStatus,
          patientsAffected: this.state.production.patientsAffected,
          childrenAffected: this.state.production.childrenAffected,
          workersAtRisk: this.state.production.workersAtRisk,
          workersEvacuated: this.state.production.workersEvacuated,
          globalStockpileWeeks: this.state.production.globalStockpileWeeks,
        }).catch(err => console.error('[Tick] Failed to persist production snapshot:', err));
      }

      // 8. Present dilemmas to human teams (every 6 ticks = 30 seconds real time)
      const DILEMMA_INTERVAL_TICKS = 6;
      if (this.state.simulationTime % DILEMMA_INTERVAL_TICKS === 0) {
        this.presentDilemmasToHumanTeams();
      }

      // 9. Sync AI team drift state
      this.syncAITeamDrift();

      // 10. Check for simulation end conditions
      if (this.shouldEndSimulation()) {
        this.endSimulation();
      }

    } catch (error) {
      console.error('[Tick] Error:', error);
    }
  }

  /**
   * Check if simulation should end based on timeline
   */
  private shouldEndSimulation(): boolean {
    const currentWindow = getCurrentWindow(this.state.simulationTime);
    // End after reaching recovery phase and 120 minutes total (2 hour session)
    // Recovery phase starts at tMinusHours +24, which maps to ~90 simulation minutes
    // We end 30 minutes into recovery, giving teams time to see aftermath
    const MAX_SIMULATION_MINUTES = 120;
    return currentWindow.phase === 'recovery' &&
           this.state.simulationTime >= MAX_SIMULATION_MINUTES;
  }

  /**
   * Transition simulation to debrief phase
   */
  private endSimulation(): void {
    console.log('[SIMULATION] Ending, transitioning to debrief');
    this.state.phase.current = 'debrief';
    this.state.phase.phaseStartTime = Date.now();
    this.stopSimulation();
    this.stopAIDecisionLoop();
    this.broadcast('simulation:ended', {
      simulationTime: this.state.simulationTime,
      finalPhase: 'debrief',
    });
  }

  private async processNewDecisions() {
    if (!this.orchestrator) return;

    const unprocessed = Array.from(this.state.decisions).filter(d => !d.processed);

    for (const decision of unprocessed) {
      console.log(`[Consequence] Processing decision ${decision.id}: ${decision.choice}`);

      // Run ConsequenceAgent and ValuesObserver in parallel
      const [consequences, observation] = await Promise.all([
        this.orchestrator.calculateConsequences(decision, this.state),
        this.orchestrator.analyzeDecision(decision, this.state),
      ]);

      // Apply immediate effects (with cross-parish support)
      this.applyImmediateEffects(consequences.immediate, decision);

      // Schedule ripple/delayed effects
      this.scheduleEffects(consequences.ripple, consequences.delayed, decision.id);

      // Record for TempestMonitor
      this.orchestrator.recordDecision(decision.teamId, Date.now());

      // Persist to database
      if (this.dbSessionId) {
        try {
          await this.persistence.updateDecisionAnalysis(decision.id, {
            consequencesApplied: consequences,
            valuesAnalysis: observation,
            notableMoment: observation.notableMoment,
            notableReason: observation.notableReason,
          });
        } catch (error) {
          console.error('[Consequence] Failed to persist analysis:', error);
        }
      }

      // Notify of notable moments
      if (observation.notableMoment) {
        this.broadcast('notableMoment', {
          decisionId: decision.id,
          teamId: decision.teamId,
          reason: observation.notableReason,
        });
      }

      decision.processed = true;
    }
  }

  private applyImmediateEffects(effects: ConsequenceEffect[], decision?: Decision) {
    for (const effect of effects) {
      // Determine target parish: use targetParishId for cross-parish effects
      let targetParishId = effect.parishId;
      if (effect.affectsTarget && decision?.targetParishId) {
        targetParishId = decision.targetParishId;
      }

      const parish = this.state.parishes.get(targetParishId);
      if (!parish) {
        console.warn(`[Effect] Parish not found: ${targetParishId}`);
        continue;
      }

      console.log(`[Effect] Applying to ${targetParishId}: ${effect.category} (${effect.magnitude})${effect.affectsTarget ? ' [cross-parish]' : ''}`);

      const delta = effect.magnitude * 5; // -25 to +25%
      const desc = effect.description.toLowerCase();

      switch (effect.category) {
        case 'resources':
          this.applyResourceEffect(parish, desc, delta);
          break;

        case 'infrastructure':
          this.applyInfrastructureEffect(parish, desc, delta);
          break;

        case 'morale':
          parish.morale = Math.max(0, Math.min(100, parish.morale + delta));
          break;

        case 'population':
          if (effect.magnitude < 0) {
            parish.status.casualties += Math.abs(effect.magnitude);
          } else if (desc.includes('evacuate')) {
            const count = Math.abs(effect.magnitude) * 100;
            parish.status.populationEvacuated += count;
            parish.status.populationRemaining -= count;
          }
          break;

        case 'political':
          // Store for debrief - no immediate state change
          break;
      }

      // Broadcast visible effects to clients
      if (effect.visible) {
        this.broadcast('effectApplied', {
          parishId: targetParishId,
          sourceParishId: effect.affectsTarget ? effect.parishId : undefined,
          category: effect.category,
          description: effect.description,
          magnitude: effect.magnitude,
          crossParish: effect.affectsTarget || false,
        });
      }
    }
  }

  private applyResourceEffect(parish: ParishState, desc: string, delta: number) {
    if (desc.includes('fuel')) {
      parish.resources.fuel = Math.max(0, Math.min(100, parish.resources.fuel + delta));
    }
    if (desc.includes('food')) {
      parish.resources.food = Math.max(0, Math.min(100, parish.resources.food + delta));
    }
    if (desc.includes('water')) {
      parish.resources.water = Math.max(0, Math.min(100, parish.resources.water + delta));
    }
    if (desc.includes('generator')) {
      const change = delta > 0 ? 1 : -1;
      parish.resources.generators = Math.max(0, parish.resources.generators + change);
    }
    if (desc.includes('medical') || desc.includes('medicine')) {
      const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
      const currentIdx = levels.indexOf(parish.resources.medicalSupplies as 'low' | 'medium' | 'high');
      const newIdx = Math.max(0, Math.min(2, currentIdx + Math.sign(delta)));
      parish.resources.medicalSupplies = levels[newIdx];
    }
    if (desc.includes('shelter')) {
      parish.resources.shelterUsed = Math.max(0,
        Math.min(parish.resources.shelterCapacity, parish.resources.shelterUsed + Math.abs(delta) * 100)
      );
    }
  }

  private applyInfrastructureEffect(parish: ParishState, desc: string, delta: number) {
    if (desc.includes('power') || desc.includes('electric')) {
      parish.status.power = Math.max(0, Math.min(100, parish.status.power + delta));
    }
    if (desc.includes('comm') || desc.includes('radio') || desc.includes('phone')) {
      parish.status.communications = Math.max(0, Math.min(100, parish.status.communications + delta));
    }
    if (desc.includes('road') || desc.includes('highway') || desc.includes('bridge')) {
      parish.status.roads = Math.max(0, Math.min(100, parish.status.roads + delta));
    }
    if (desc.includes('hospital') || desc.includes('medical facility')) {
      parish.status.hospital = Math.max(0, Math.min(100, parish.status.hospital + delta));
    }
    if (desc.includes('water system') || desc.includes('pumping')) {
      parish.status.waterSystem = Math.max(0, Math.min(100, parish.status.waterSystem + delta));
    }
    if (desc.includes('port') || desc.includes('harbor')) {
      parish.status.port = Math.max(0, Math.min(100, parish.status.port + delta));
    }
    if (desc.includes('airport') || desc.includes('runway')) {
      parish.status.airport = Math.max(0, Math.min(100, parish.status.airport + delta));
    }
  }

  private scheduleEffects(
    ripple: RippleEffect[],
    delayed: DelayedEffect[],
    decisionId: string
  ) {
    for (const effect of ripple) {
      this.scheduledEffects.push({
        id: nanoid(),
        type: 'ripple',
        effect,
        triggerSimTime: this.state.simulationTime + effect.delayMinutes,
        decisionId,
      });
    }

    for (const effect of delayed) {
      this.scheduledEffects.push({
        id: nanoid(),
        type: 'delayed',
        effect,
        triggerSimTime: this.state.simulationTime + effect.delayMinutes,
        decisionId,
        condition: effect.condition,
      });
    }
  }

  private processPendingEffects() {
    const currentTime = this.state.simulationTime;
    const ready = this.scheduledEffects.filter(e => e.triggerSimTime <= currentTime);

    for (const scheduled of ready) {
      // Check condition for delayed effects
      if (scheduled.type === 'delayed' && scheduled.condition) {
        if (!this.evaluateCondition(scheduled.condition)) {
          continue; // Condition not met, check again next tick
        }
      }

      // Apply the effect
      const ripple = scheduled.effect as RippleEffect;
      if (ripple.parishId) {
        this.applyImmediateEffects([{
          parishId: ripple.parishId,
          category: ripple.category,
          description: ripple.description,
          magnitude: ripple.magnitude,
          visible: true,
        }]);
      }

      // Remove from scheduled
      const idx = this.scheduledEffects.indexOf(scheduled);
      if (idx > -1) this.scheduledEffects.splice(idx, 1);
    }
  }

  private evaluateCondition(condition: string): boolean {
    const lower = condition.toLowerCase();

    for (const [, parish] of this.state.parishes) {
      if (lower.includes('power') && lower.includes('< 50') && parish.status.power < 50) return true;
      if (lower.includes('power') && lower.includes('< 25') && parish.status.power < 25) return true;
      if (lower.includes('casualties') && lower.includes('> 10') && parish.status.casualties > 10) return true;
      if (lower.includes('morale') && lower.includes('< 30') && parish.morale < 30) return true;
    }

    return false;
  }

  private updateWeatherState() {
    // Get current timeline window from Hurricane Midas
    const window = getCurrentWindow(this.state.simulationTime);

    // Track window transitions
    if (this.currentTimelineWindow?.id !== window.id) {
      this.previousTimelineWindow = this.currentTimelineWindow;
      this.currentTimelineWindow = window;

      // Broadcast window transition
      if (this.previousTimelineWindow) {
        console.log(`[Timeline] Window transition: ${this.previousTimelineWindow.id} → ${window.id}`);
        this.broadcast('timelineWindowChanged', {
          previousWindow: this.previousTimelineWindow.id,
          currentWindow: window.id,
          phase: window.phase,
          label: window.label,
          narrativeBeats: window.narrativeBeats,
          emergingPressures: window.emergingPressures,
          unavailableActions: window.unavailableActions,
        });
      }
    }

    const hurricane = this.state.weather.hurricane;

    // Update hurricane state from timeline
    hurricane.id = HURRICANE_MIDAS.id;
    hurricane.name = HURRICANE_MIDAS.name;
    hurricane.category = HURRICANE_MIDAS.category;
    hurricane.windSpeed = window.weather.windMph;
    hurricane.hoursToImpact = Math.abs(window.tMinusHours);
    hurricane.certaintyPercent = window.certaintyPercent ?? 100;
    hurricane.hasLandfall = window.phase === 'landfall' || window.tMinusHours > 0;
    hurricane.currentAdvisory = `${window.label} - ${window.decisionType}`;

    // Map timeline phases to weather conditions
    const phaseToCondition: Record<string, string> = {
      watch: window.weather.windMph > 20 ? 'cloudy' : 'clear',
      warning: 'rain',
      approach: window.weather.windMph > 80 ? 'hurricane' : 'storm',
      landfall: 'hurricane',
      eye: 'storm',
      recovery: window.weather.windMph > 30 ? 'rain' : 'cloudy',
    };
    this.state.weather.conditions = phaseToCondition[window.phase] || 'clear';

    // Update weather values from timeline window
    this.state.weather.windSpeed = window.weather.windMph;
    this.state.weather.rainfall = window.weather.rainfallInchesPerHour;
    this.state.weather.stormSurge = window.weather.stormSurgeFeet;

    // Update visibility based on timeline
    const visibilityMap: Record<string, number> = {
      clear: 100,
      reduced: 60,
      poor: 30,
      zero: 5,
    };
    this.state.weather.visibility = visibilityMap[window.weather.visibility] ?? 100;

    // Update parish infrastructure based on timeline window
    this.updateInfrastructureFromTimeline(window);
  }

  /**
   * Update parish infrastructure state based on current timeline window
   */
  private updateInfrastructureFromTimeline(window: TimelineWindow) {
    for (const [parishId, parish] of this.state.parishes) {
      const id = parishId as ParishIdLower;

      // Roads passability
      const roadsPassable = window.infrastructureState.roadsPassable.includes(id);
      if (!roadsPassable && parish.status.roads > 10) {
        // Degrade roads if timeline says they're not passable
        parish.status.roads = Math.max(10, parish.status.roads - 5);
      }

      // Power availability
      const powerAvailable = window.infrastructureState.powerAvailable.includes(id);
      if (!powerAvailable && parish.status.power > 0) {
        // Degrade power if timeline says unavailable
        parish.status.power = Math.max(0, parish.status.power - 10);
      } else if (powerAvailable && parish.status.power < 50) {
        // Slowly restore if backup generators working
        parish.status.power = Math.min(50, parish.status.power + 2);
      }

      // Communications availability
      const commsAvailable = window.infrastructureState.commsOperational.includes(id);
      if (!commsAvailable && parish.status.communications > 0) {
        parish.status.communications = Math.max(0, parish.status.communications - 15);
      } else if (commsAvailable && parish.status.communications < 50) {
        parish.status.communications = Math.min(50, parish.status.communications + 5);
      }
    }
  }

  private updateResourceConsumption() {
    // Gradual resource depletion during storm
    for (const [, parish] of this.state.parishes) {
      // Fuel depletes faster if generators running
      if (parish.resources.generatorsDeployed > 0) {
        parish.resources.fuel = Math.max(0, parish.resources.fuel - 0.1 * parish.resources.generatorsDeployed);
      }

      // Food/water deplete based on population
      const consumptionRate = parish.status.populationRemaining / 100000;
      parish.resources.food = Math.max(0, parish.resources.food - consumptionRate * 0.05);
      parish.resources.water = Math.max(0, parish.resources.water - consumptionRate * 0.08);

      // Morale drops if resources low
      if (parish.resources.food < 20 || parish.resources.water < 20) {
        parish.morale = Math.max(0, parish.morale - 0.5);
      }
    }
  }

  private async generateNarrativeContent() {
    if (!this.orchestrator || this.narrativeInProgress) return;

    this.narrativeInProgress = true;

    try {
      console.log('[Narrative] Generating content...');
      const contents = await this.orchestrator.generateNarrative(this.state);

      for (const content of contents) {
        const id = nanoid();

        // Persist to database
        if (this.dbSessionId) {
          try {
            await this.persistence.persistStreamingContent({
              id,
              sessionId: this.dbSessionId,
              type: content.type,
              source: content.source,
              content: content.content,
              urgency: content.urgency,
              relatedParish: content.relatedParish,
              breaking: content.breaking,
              simulationTime: this.state.simulationTime,
            });
          } catch (error) {
            console.error('[Narrative] Failed to persist content:', error);
          }
        }

        // Add to state
        this.addStreamingContent({ ...content, id });
      }
    } catch (error) {
      console.error('[Narrative] Generation failed:', error);
    } finally {
      this.narrativeInProgress = false;
    }
  }

  private startTempestMonitor() {
    if (this.tempestInterval || !this.orchestrator) return;

    this.tempestInterval = setInterval(async () => {
      if (this.state.phase.paused) return;
      if (this.state.teams.size === 0) return;

      try {
        const { assessments, overallAdvisory } =
          await this.orchestrator!.assessAllTeams(this.state);

        this.state.intensity.tempestAdvisory = overallAdvisory;

        // Send detailed assessments to CM only
        this.clients.forEach(client => {
          const metadata = client.userData as { role?: string } | undefined;
          if (metadata?.role === 'cm') {
            client.send('tempestAssessments', { assessments, overallAdvisory });
          }
        });
      } catch (error) {
        console.error('[TempestMonitor] Assessment failed:', error);
      }
    }, 60000); // Every 60 seconds
  }

  private stopTempestMonitor() {
    if (this.tempestInterval) {
      clearInterval(this.tempestInterval);
      this.tempestInterval = null;
    }
  }

  // === AI Team Methods ===

  /**
   * Initialize AI teams for empty parishes when storm phase starts
   */
  private initializeAITeams(): void {
    const allParishes: ParishIdLower[] = ['keystone', 'haven', 'gateway', 'heartland', 'summit', 'sterling'];
    const occupiedParishes = new Set(
      Array.from(this.state.teams.values()).map(t => t.parishId)
    );

    const aiController = getAITeamController();

    for (const parishId of allParishes) {
      if (!occupiedParishes.has(parishId)) {
        // Get default archetype for this parish
        const defaults = PARISH_AI_DEFAULTS[parishId];
        const archetypeId = defaults?.defaultArchetype || 'by-the-book';

        // Initialize AI state
        const aiState = aiController.initializeTeam(parishId, archetypeId);

        // Create team in Colyseus state
        const team = new TeamState();
        team.id = `ai-${parishId}`;
        team.parishId = parishId;
        team.teamName = `AI: ${parishId.charAt(0).toUpperCase() + parishId.slice(1)}`;
        team.isAI = true;
        team.aiArchetype = archetypeId;
        team.aiDrift = 0;
        team.aiCooperation = aiState.cooperationLevel;

        // Set default values from parish config
        if (defaults?.defaultValues) {
          for (const value of defaults.defaultValues) {
            team.statedValues.push(value);
          }
        }

        team.commitmentStatement = `We, the ${team.teamName} team, commit to upholding our values during this crisis.`;
        team.ready = true;

        this.state.teams.set(parishId, team);
        this.aiDilemmasPresented.set(parishId, []);

        console.log(`[AITeam] Created AI team for ${parishId} with archetype: ${archetypeId}`);
      }
    }

    console.log(`[AITeam] Initialized ${allParishes.length - occupiedParishes.size} AI teams`);
  }

  /**
   * Start the AI decision loop
   */
  private startAIDecisionLoop(): void {
    if (this.aiDecisionInterval) return;

    // Check for AI decisions every 30 seconds
    this.aiDecisionInterval = setInterval(() => {
      if (this.state.phase.paused) return;
      this.processAITeamDilemmas();
    }, 30000);

    // Also run immediately
    this.processAITeamDilemmas();
  }

  /**
   * Stop the AI decision loop
   */
  private stopAIDecisionLoop(): void {
    if (this.aiDecisionInterval) {
      clearInterval(this.aiDecisionInterval);
      this.aiDecisionInterval = null;
    }

    // Cancel all pending AI decisions
    const aiController = getAITeamController();
    for (const [parishId, team] of this.state.teams) {
      if (team.isAI) {
        aiController.cancelPendingDecision(parishId);
      }
    }
  }

  /**
   * Process dilemmas for all AI teams
   */
  private processAITeamDilemmas(): void {
    for (const [parishId, team] of this.state.teams) {
      if (!team.isAI) continue;

      // Skip if team already has a pending dilemma
      if (this.aiPendingDilemmas.has(parishId)) continue;

      // Present a new dilemma to this AI team
      this.presentDilemmaToAITeam(parishId as ParishIdLower);
    }
  }

  /**
   * Present a dilemma to an AI team and schedule their decision
   */
  private presentDilemmaToAITeam(parishId: ParishIdLower, specificDilemmaId?: string): void {
    const team = this.state.teams.get(parishId);
    if (!team || !team.isAI) return;

    const presentedIds = this.aiDilemmasPresented.get(parishId) || [];
    const previousDecisionIds = Array.from(this.state.decisions)
      .filter(d => d.parishId === parishId)
      .map(d => d.decisionTypeId);

    // Select a dilemma
    const selection = selectNextDilemma({
      parishId,
      intensity: this.getEffectiveIntensity(parishId),
      simulationTime: this.state.simulationTime,
      previousDecisionIds,
      presentedDilemmaIds: presentedIds,
    });

    if (!selection) {
      console.log(`[AITeam] No available dilemmas for ${parishId}`);
      return;
    }

    const dilemma = selection.dilemma;

    // Mark as presented
    presentedIds.push(dilemma.id);
    this.aiDilemmasPresented.set(parishId, presentedIds);
    this.aiPendingDilemmas.set(parishId, dilemma);

    console.log(`[AITeam] Presented dilemma "${dilemma.title}" to ${parishId}`);

    // Broadcast to CM
    this.clients.forEach(client => {
      const metadata = client.userData as ClientMetadata | undefined;
      if (metadata?.role === 'cm') {
        client.send('aiTeamDilemma', {
          parishId,
          dilemma: {
            id: dilemma.id,
            title: dilemma.title,
            setup: dilemma.setup,
            options: dilemma.options.map(o => ({
              id: o.id,
              label: o.label,
              description: o.description,
            })),
          },
        });
      }
    });

    // Schedule AI decision
    const aiController = getAITeamController();
    aiController.scheduleDecision(
      parishId,
      dilemma,
      this.getEffectiveIntensity(parishId),
      this.state,
      (result) => {
        this.applyAIDecision(parishId, dilemma, result.optionId, result.rationale);

        // Update drift in team state
        team.aiDrift = result.newDrift;

        // Broadcast decision to CM
        this.clients.forEach(client => {
          const metadata = client.userData as ClientMetadata | undefined;
          if (metadata?.role === 'cm') {
            client.send('aiTeamDecided', {
              parishId,
              dilemmaId: dilemma.id,
              optionId: result.optionId,
              rationale: result.rationale,
              drift: result.newDrift,
              rationalizationUsed: result.rationalizationUsed,
            });
          }
        });
      }
    );
  }

  /**
   * Apply an AI team's decision to the game state
   */
  private applyAIDecision(
    parishId: string,
    dilemma: Dilemma,
    optionId: string,
    rationale: string
  ): void {
    const team = this.state.teams.get(parishId);
    if (!team) return;

    // Clear pending dilemma
    this.aiPendingDilemmas.delete(parishId);

    // Find the chosen option
    const option = dilemma.options.find(o => o.id === optionId);
    if (!option) {
      console.error(`[AITeam] Option ${optionId} not found in dilemma ${dilemma.id}`);
      return;
    }

    // Create decision record
    const decision = new Decision();
    decision.id = nanoid();
    decision.teamId = team.id;
    decision.parishId = parishId;
    decision.categoryId = 'ai-decision';
    decision.decisionTypeId = dilemma.id;
    decision.choice = option.label;
    decision.rationale = rationale;
    decision.simulationTime = this.state.simulationTime;
    decision.realTime = Date.now();
    decision.advocatedBy.push('AI');

    // Add to state
    this.state.decisions.push(decision);

    // Persist to database
    if (this.dbSessionId) {
      this.persistence.persistDecision({
        id: decision.id,
        sessionId: this.dbSessionId,
        teamId: decision.teamId,
        categoryId: decision.categoryId,
        decisionTypeId: decision.decisionTypeId,
        choice: decision.choice,
        rationale: decision.rationale,
        simulationTime: decision.simulationTime,
        advocates: [{ participantId: 'AI', position: 'for' }],
      }).catch(err => console.error('[AITeam] Failed to persist decision:', err));
    }

    // Broadcast decision
    this.broadcast('decisionMade', {
      decisionId: decision.id,
      teamId: decision.teamId,
      parishId: decision.parishId,
      categoryId: decision.categoryId,
      decisionTypeId: decision.decisionTypeId,
      choice: decision.choice,
      isAI: true,
    });

    console.log(`[AITeam] ${parishId} decided on ${dilemma.title}: ${option.label}`);
  }

  /**
   * Sync AI team drift from controller to Colyseus state
   */
  private syncAITeamDrift(): void {
    const aiController = getAITeamController();

    for (const [parishId, team] of this.state.teams) {
      if (!team.isAI) continue;

      const aiState = aiController.getTeamState(parishId);
      if (aiState) {
        // Calculate drift based on current intensity
        aiController.calculateDrift(
          parishId,
          this.getEffectiveIntensity(parishId),
          aiState.decisionCount
        );

        // Sync to Colyseus state
        team.aiDrift = aiState.currentDrift;
        team.aiCooperation = aiState.cooperationLevel;
      }
    }
  }

  // === Human Team Dilemma Delivery ===

  /**
   * Present dilemmas to human teams that don't currently have one
   */
  private presentDilemmasToHumanTeams(): void {
    for (const [teamId, team] of this.state.teams) {
      // Skip AI teams (handled separately)
      if (team.isAI) continue;

      // Skip if team already has an active dilemma
      if (team.currentDilemma?.id) continue;

      // Get context for dilemma selection
      const previousDecisionIds = Array.from(this.state.decisions)
        .filter(d => d.teamId === teamId)
        .map(d => d.decisionTypeId);

      const presentedDilemmaIds = Array.from(team.presentedDilemmaIds);

      const context = {
        parishId: team.parishId.toLowerCase() as ParishIdLower,
        intensity: this.getEffectiveIntensity(teamId),
        simulationTime: this.state.simulationTime,
        previousDecisionIds,
        presentedDilemmaIds,
      };

      const result = selectNextDilemma(context);
      if (result) {
        this.presentDilemmaToHumanTeam(team, result.dilemma);
      }
    }
  }

  /**
   * Present a dilemma to a human team by populating their currentDilemma state
   */
  private presentDilemmaToHumanTeam(team: TeamState, dilemma: Dilemma): void {
    const snapshot = new DilemmaSnapshot();
    snapshot.id = dilemma.id;
    snapshot.title = dilemma.title;
    snapshot.setupNarrative = dilemma.setup;
    snapshot.presenterPersona = Array.isArray(dilemma.personaId)
      ? dilemma.personaId[0]
      : dilemma.personaId;
    snapshot.presentedAt = this.state.simulationTime;
    snapshot.expiresAt = 0; // No expiration for now

    // Add options to the snapshot
    for (const opt of dilemma.options) {
      const option = new DilemmaOption();
      option.id = opt.id;
      option.label = opt.label;
      option.description = opt.description;
      snapshot.options.push(option);
    }

    // Set the dilemma on the team
    team.currentDilemma = snapshot;
    team.presentedDilemmaIds.push(dilemma.id);

    console.log(`[DILEMMA] Presented "${dilemma.title}" to team ${team.teamName}`);
  }

  /**
   * Clear the current dilemma from a team (called after decision is made)
   */
  private clearTeamDilemma(teamId: string): void {
    const team = this.state.teams.get(teamId);
    if (team && team.currentDilemma) {
      team.currentDilemma = null;
      console.log(`[DILEMMA] Cleared dilemma for team ${team.teamName}`);
    }
  }

  private setupDebugCommands() {
    if (process.env['NODE_ENV'] !== 'development') return;

    this.onMessage('debug:tick', () => {
      console.log('[Debug] Manual tick triggered');
      this.simulationTick();
    });

    this.onMessage('debug:narrative', async () => {
      console.log('[Debug] Manual narrative triggered');
      await this.generateNarrativeContent();
    });

    this.onMessage('debug:weather', (_, payload: { conditions?: string; hoursToImpact?: number }) => {
      if (payload.conditions) this.state.weather.conditions = payload.conditions;
      if (payload.hoursToImpact !== undefined) {
        this.state.weather.hurricane.hoursToImpact = payload.hoursToImpact;
      }
    });

    this.onMessage('debug:intensity', (_, payload: { level: number }) => {
      this.state.intensity.global = Math.max(1, Math.min(10, payload.level));
    });
  }

  // === Utility Methods ===

  public addStreamingContent(content: {
    id?: string;
    type: string;
    source: string;
    content: string;
    urgency: number;
    relatedParish?: string;
    breaking?: boolean;
  }) {
    const streamContent = new StreamingContent();
    streamContent.id = content.id || nanoid();
    streamContent.type = content.type;
    streamContent.source = content.source;
    streamContent.content = content.content;
    streamContent.urgency = content.urgency;
    streamContent.relatedParish = content.relatedParish || '';
    streamContent.breaking = content.breaking || false;
    streamContent.timestamp = Date.now();

    this.state.feed.push(streamContent);

    // Keep feed manageable (last 100 items)
    // Batch removal is more efficient than repeated shift() - O(n) vs O(n²)
    if (this.state.feed.length > 100) {
      const excess = this.state.feed.length - 100;
      this.state.feed.splice(0, excess);
    }
  }

  public getEffectiveIntensity(teamId: string): number {
    const teamIntensity = this.state.intensity.byTeam.get(teamId);
    return teamIntensity ?? this.state.intensity.global;
  }
}
