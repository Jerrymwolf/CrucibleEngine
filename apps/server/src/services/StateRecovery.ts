import type { SessionSnapshot } from './SessionPersistence.js';
import {
  CrucibleState,
  TeamState,
  Decision,
  StreamingContent,
} from '../schema/CrucibleState.js';

export class StateRecovery {
  /**
   * Reconstruct Colyseus state from a database snapshot
   * Called when a room is recreated for an existing session
   */
  reconstructState(snapshot: SessionSnapshot, state: CrucibleState): void {
    // Restore session info
    state.sessionId = snapshot.session.id;
    state.sessionCode = snapshot.session.code;
    state.scenarioSeed = snapshot.session.scenarioSeed || '';

    // Map session status to phase
    if (snapshot.session.status === 'active') {
      state.phase.current = 'storm';
    } else if (snapshot.session.status === 'completed') {
      state.phase.current = 'debrief';
    }

    // Calculate simulation time from last activity
    const lastDecisionTime = snapshot.decisions.length > 0
      ? Math.max(...snapshot.decisions.map(d => d.simulationTime))
      : 0;
    const lastContentTime = snapshot.streamingContent.length > 0
      ? Math.max(...snapshot.streamingContent.map(s => s.simulationTime))
      : 0;
    state.simulationTime = Math.max(lastDecisionTime, lastContentTime);

    // Restore teams
    for (const team of snapshot.teams) {
      const teamState = new TeamState();
      teamState.id = team.id;
      teamState.parishId = team.parishId;
      teamState.teamName = team.name;
      teamState.decisionProcess = team.decisionProcess;
      teamState.commitmentStatement = team.commitmentStatement || '';

      for (const value of team.statedValues) {
        teamState.statedValues.push(value);
      }
      for (const participant of team.participants) {
        teamState.members.push(participant.id);
      }

      state.teams.set(team.parishId, teamState);
    }

    // Restore decisions
    for (const dec of snapshot.decisions) {
      const decision = new Decision();
      decision.id = dec.id;
      decision.teamId = dec.teamId;
      decision.categoryId = dec.categoryId;
      decision.decisionTypeId = dec.decisionTypeId;
      decision.choice = dec.choice;
      decision.rationale = dec.rationale || '';
      decision.simulationTime = dec.simulationTime;
      decision.processed = dec.consequencesApplied !== null;

      const team = snapshot.teams.find(t => t.id === dec.teamId);
      if (team) decision.parishId = team.parishId;

      state.decisions.push(decision);
    }

    // Restore streaming content (last 100)
    for (const content of snapshot.streamingContent.slice(-100)) {
      const streamContent = new StreamingContent();
      streamContent.id = content.id;
      streamContent.type = content.type;
      streamContent.source = content.source;
      streamContent.content = content.content;
      streamContent.urgency = content.urgency;
      streamContent.relatedParish = content.relatedParish || '';
      streamContent.breaking = content.breaking;
      streamContent.timestamp = Date.now();

      state.feed.push(streamContent);
    }
  }

  /**
   * Replay consequences from decisions to reconstruct parish state
   */
  replayConsequences(
    snapshot: SessionSnapshot,
    state: CrucibleState,
    applyConsequence: (consequences: unknown) => void
  ): void {
    for (const dec of snapshot.decisions) {
      if (dec.consequencesApplied) {
        applyConsequence(dec.consequencesApplied);
      }
    }
  }
}
