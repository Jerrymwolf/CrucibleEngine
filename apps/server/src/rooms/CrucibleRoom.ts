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
} from '../schema/CrucibleState.js';
import { PARISHES, generateSessionCode } from '@crucible/shared';
import type { DecisionPayload, DirectivePayload } from '@crucible/shared';
import { SessionPersistence } from '../services/SessionPersistence.js';
import { StateRecovery } from '../services/StateRecovery.js';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';

// Effect types for consequence system
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
  role: 'team' | 'cm';
  teamId?: string;
  participantName?: string;
  create?: boolean;
}

interface ClientMetadata {
  participantId: string;
  participantName: string;
  role: 'team' | 'cm';
  teamId?: string;
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
    // Team decision
    this.onMessage('decision', (client, payload: DecisionPayload) => {
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
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`Client ${client.sessionId} joined as ${options.role}`);

    // Store client metadata
    const metadata: ClientMetadata = {
      participantId: nanoid(),
      participantName: options.participantName || `Participant-${client.sessionId.slice(0, 4)}`,
      role: options.role,
      teamId: options.teamId,
    };

    client.userData = metadata;

    // Broadcast join event
    this.broadcast('playerJoined', {
      participantId: metadata.participantId,
      participantName: metadata.participantName,
      role: options.role,
    });
  }

  onLeave(client: Client, consented: boolean) {
    const metadata = client.userData as ClientMetadata | undefined;
    console.log(`Client ${client.sessionId} left (consented: ${consented})`);

    if (metadata) {
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

    // 3. THEN broadcast to clients
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
      this.startSimulation();
    } else if (phase !== 'recovery') {
      this.stopSimulation();
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

    } catch (error) {
      console.error('[Tick] Error:', error);
    }
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

      // Apply immediate effects
      this.applyImmediateEffects(consequences.immediate);

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

  private applyImmediateEffects(effects: ConsequenceEffect[]) {
    for (const effect of effects) {
      const parish = this.state.parishes.get(effect.parishId);
      if (!parish) {
        console.warn(`[Effect] Parish not found: ${effect.parishId}`);
        continue;
      }

      console.log(`[Effect] Applying to ${effect.parishId}: ${effect.category} (${effect.magnitude})`);

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
          parishId: effect.parishId,
          category: effect.category,
          description: effect.description,
          magnitude: effect.magnitude,
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
    const hurricane = this.state.weather.hurricane;

    // Progress hurricane toward island (0.1 hours per tick = 6 min per tick)
    if (hurricane.hoursToImpact > 0) {
      hurricane.hoursToImpact = Math.max(0, hurricane.hoursToImpact - 0.1);
    }

    // Increase certainty as storm approaches
    if (hurricane.hoursToImpact < 24) {
      hurricane.certaintyPercent = Math.min(95, hurricane.certaintyPercent + 0.5);
    }

    // Update conditions based on proximity
    if (hurricane.hoursToImpact <= 0 && hurricane.trajectory === 'direct') {
      this.state.weather.conditions = 'hurricane';
      this.state.weather.windSpeed = hurricane.windSpeed;
      hurricane.hasLandfall = true;
    } else if (hurricane.hoursToImpact < 6) {
      this.state.weather.conditions = 'hurricane';
      this.state.weather.windSpeed = hurricane.windSpeed * 0.7;
    } else if (hurricane.hoursToImpact < 12) {
      this.state.weather.conditions = 'storm';
      this.state.weather.windSpeed = 45;
      this.state.weather.rainfall = 2;
    } else if (hurricane.hoursToImpact < 24) {
      this.state.weather.conditions = 'rain';
      this.state.weather.windSpeed = 25;
      this.state.weather.rainfall = 1;
    } else if (hurricane.hoursToImpact < 48) {
      this.state.weather.conditions = 'cloudy';
      this.state.weather.windSpeed = 15;
    }

    // Update visibility based on conditions
    switch (this.state.weather.conditions) {
      case 'hurricane': this.state.weather.visibility = 20; break;
      case 'storm': this.state.weather.visibility = 40; break;
      case 'rain': this.state.weather.visibility = 60; break;
      case 'cloudy': this.state.weather.visibility = 80; break;
      default: this.state.weather.visibility = 100;
    }

    // Update storm surge based on trajectory and proximity
    if (hurricane.trajectory === 'direct' && hurricane.hoursToImpact < 6) {
      this.state.weather.stormSurge = hurricane.category * 2;
    } else if (hurricane.trajectory === 'glancing' && hurricane.hoursToImpact < 6) {
      this.state.weather.stormSurge = hurricane.category;
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
