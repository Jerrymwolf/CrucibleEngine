/**
 * Session Recording Utilities
 *
 * Types and utilities for recording and playing back simulation sessions.
 * Enables post-session review, training, and analysis.
 *
 * Features:
 * - State snapshot recording
 * - Event-based recording (decisions, interventions, phase changes)
 * - Playback with variable speed
 * - Export/import functionality
 */

// ============================================================================
// TYPES
// ============================================================================

export type RecordingEventType =
  | 'state_snapshot'
  | 'phase_change'
  | 'decision_made'
  | 'decision_confirmed'
  | 'intervention_triggered'
  | 'feed_item'
  | 'resource_change'
  | 'weather_update'
  | 'player_joined'
  | 'player_left'
  | 'cm_directive'
  | 'notable_moment';

export interface RecordingEvent {
  id: string;
  type: RecordingEventType;
  timestamp: number;
  simulationTime: number;
  phase: string;
  data: Record<string, unknown>;
}

export interface DecisionEvent extends RecordingEvent {
  type: 'decision_made' | 'decision_confirmed';
  data: {
    teamId: string;
    teamName: string;
    dilemmaId: string;
    dilemmaTitle: string;
    optionChosen: number;
    optionText: string;
    rationale?: string;
    valuesAtStake: string[];
    valuesAlignment: 'aligned' | 'conflicted' | 'compromised';
  };
}

export interface InterventionEvent extends RecordingEvent {
  type: 'intervention_triggered';
  data: {
    teamId: string;
    teamName: string;
    interventionType: 'flash' | 'moment' | 'mirror';
    triggeredBy: string;
  };
}

export interface PhaseChangeEvent extends RecordingEvent {
  type: 'phase_change';
  data: {
    fromPhase: string;
    toPhase: string;
    triggeredBy: string;
  };
}

export interface FeedItemEvent extends RecordingEvent {
  type: 'feed_item';
  data: {
    feedId: string;
    feedType: string;
    source: string;
    content: string;
    breaking: boolean;
    targetTeams?: string[];
  };
}

export interface StateSnapshot {
  timestamp: number;
  simulationTime: number;
  phase: string;
  teams: {
    id: string;
    parishId: string;
    teamName: string;
    memberCount: number;
    values: string[];
    decisionCount: number;
    ready: boolean;
  }[];
  parishes: {
    id: string;
    status: {
      power: number;
      communications: number;
      roads: number;
      hospital: number;
      port: number;
    };
    morale: number;
    population: number;
    evacuated: number;
  }[];
  weather: {
    category: number;
    trajectory: string;
    hoursToImpact: number;
    certaintyPercent: number;
  };
  resources: {
    generators: number;
    medical: number;
    fuel: number;
    food: number;
    water: number;
    shelter: number;
  };
  globalIntensity: number;
}

export interface SessionRecording {
  id: string;
  version: string;
  sessionCode: string;
  recordedAt: string;
  duration: number; // seconds
  metadata: {
    facilitatorName: string;
    teamCount: number;
    participantCount: number;
    decisionCount: number;
    interventionCount: number;
  };
  initialSnapshot: StateSnapshot;
  events: RecordingEvent[];
  finalSnapshot: StateSnapshot;
}

export interface PlaybackState {
  isPlaying: boolean;
  speed: number;
  currentTime: number;
  currentEventIndex: number;
}

// ============================================================================
// RECORDING CLASS
// ============================================================================

export class SessionRecorder {
  private events: RecordingEvent[] = [];
  private initialSnapshot: StateSnapshot | null = null;
  private recording = false;
  private sessionCode: string;
  private facilitatorName: string;
  private startTime: number = 0;

  constructor(sessionCode: string, facilitatorName: string) {
    this.sessionCode = sessionCode;
    this.facilitatorName = facilitatorName;
  }

  start(initialSnapshot: StateSnapshot): void {
    this.recording = true;
    this.startTime = Date.now();
    this.initialSnapshot = initialSnapshot;
    this.events = [];
  }

  stop(): SessionRecording | null {
    if (!this.recording || !this.initialSnapshot) return null;

    this.recording = false;
    const duration = Math.floor((Date.now() - this.startTime) / 1000);

    // Create final snapshot from last state snapshot event or initial
    const lastSnapshot = this.events
      .filter((e) => e.type === 'state_snapshot')
      .pop();
    const finalSnapshot = lastSnapshot
      ? (lastSnapshot.data as unknown as StateSnapshot)
      : this.initialSnapshot;

    const recording: SessionRecording = {
      id: `recording-${this.sessionCode}-${Date.now()}`,
      version: '1.0.0',
      sessionCode: this.sessionCode,
      recordedAt: new Date().toISOString(),
      duration,
      metadata: {
        facilitatorName: this.facilitatorName,
        teamCount: this.initialSnapshot.teams.length,
        participantCount: this.initialSnapshot.teams.reduce(
          (sum, t) => sum + t.memberCount,
          0
        ),
        decisionCount: this.events.filter(
          (e) => e.type === 'decision_confirmed'
        ).length,
        interventionCount: this.events.filter(
          (e) => e.type === 'intervention_triggered'
        ).length,
      },
      initialSnapshot: this.initialSnapshot,
      events: this.events,
      finalSnapshot,
    };

    return recording;
  }

  recordEvent(
    type: RecordingEventType,
    simulationTime: number,
    phase: string,
    data: Record<string, unknown>
  ): void {
    if (!this.recording) return;

    const event: RecordingEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      simulationTime,
      phase,
      data,
    };

    this.events.push(event);
  }

  recordDecision(
    teamId: string,
    teamName: string,
    dilemmaId: string,
    dilemmaTitle: string,
    optionChosen: number,
    optionText: string,
    rationale: string | undefined,
    valuesAtStake: string[],
    valuesAlignment: 'aligned' | 'conflicted' | 'compromised',
    simulationTime: number,
    phase: string
  ): void {
    this.recordEvent('decision_confirmed', simulationTime, phase, {
      teamId,
      teamName,
      dilemmaId,
      dilemmaTitle,
      optionChosen,
      optionText,
      rationale,
      valuesAtStake,
      valuesAlignment,
    });
  }

  recordIntervention(
    teamId: string,
    teamName: string,
    interventionType: 'flash' | 'moment' | 'mirror',
    triggeredBy: string,
    simulationTime: number,
    phase: string
  ): void {
    this.recordEvent('intervention_triggered', simulationTime, phase, {
      teamId,
      teamName,
      interventionType,
      triggeredBy,
    });
  }

  recordPhaseChange(
    fromPhase: string,
    toPhase: string,
    triggeredBy: string,
    simulationTime: number
  ): void {
    this.recordEvent('phase_change', simulationTime, toPhase, {
      fromPhase,
      toPhase,
      triggeredBy,
    });
  }

  recordStateSnapshot(snapshot: StateSnapshot): void {
    this.recordEvent('state_snapshot', snapshot.simulationTime, snapshot.phase, snapshot as unknown as Record<string, unknown>);
  }

  isRecording(): boolean {
    return this.recording;
  }

  getEventCount(): number {
    return this.events.length;
  }
}

// ============================================================================
// PLAYBACK CLASS
// ============================================================================

export class SessionPlayer {
  private recording: SessionRecording;
  private state: PlaybackState;
  private onStateChange: (snapshot: StateSnapshot, event?: RecordingEvent) => void;
  private onPlaybackComplete: () => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    recording: SessionRecording,
    onStateChange: (snapshot: StateSnapshot, event?: RecordingEvent) => void,
    onPlaybackComplete: () => void
  ) {
    this.recording = recording;
    this.onStateChange = onStateChange;
    this.onPlaybackComplete = onPlaybackComplete;
    this.state = {
      isPlaying: false,
      speed: 1,
      currentTime: 0,
      currentEventIndex: 0,
    };
  }

  play(): void {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.startPlayback();
  }

  pause(): void {
    this.state.isPlaying = false;
    this.stopPlayback();
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.5, Math.min(4, speed));
    if (this.state.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  seekTo(time: number): void {
    this.state.currentTime = Math.max(0, Math.min(this.recording.duration, time));

    // Find the event index for this time
    const targetTimestamp =
      new Date(this.recording.recordedAt).getTime() + time * 1000;
    let eventIndex = 0;
    for (let i = 0; i < this.recording.events.length; i++) {
      if (this.recording.events[i].timestamp <= targetTimestamp) {
        eventIndex = i + 1;
      } else {
        break;
      }
    }
    this.state.currentEventIndex = eventIndex;

    // Find the most recent state snapshot
    const snapshot = this.getSnapshotAtTime(time);
    this.onStateChange(snapshot);
  }

  skipToPhase(phase: string): void {
    const phaseEvent = this.recording.events.find(
      (e) => e.type === 'phase_change' && (e.data as PhaseChangeEvent['data']).toPhase === phase
    );
    if (phaseEvent) {
      const time =
        (phaseEvent.timestamp - new Date(this.recording.recordedAt).getTime()) / 1000;
      this.seekTo(time);
    }
  }

  skipToDecision(decisionIndex: number): void {
    const decisions = this.recording.events.filter(
      (e) => e.type === 'decision_confirmed'
    );
    if (decisions[decisionIndex]) {
      const time =
        (decisions[decisionIndex].timestamp -
          new Date(this.recording.recordedAt).getTime()) /
        1000;
      this.seekTo(time);
    }
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  getDuration(): number {
    return this.recording.duration;
  }

  getRecording(): SessionRecording {
    return this.recording;
  }

  private startPlayback(): void {
    const interval = 1000 / this.state.speed;

    this.intervalId = setInterval(() => {
      this.tick();
    }, interval);
  }

  private stopPlayback(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    if (!this.state.isPlaying) return;

    this.state.currentTime += 1;

    if (this.state.currentTime >= this.recording.duration) {
      this.pause();
      this.onPlaybackComplete();
      return;
    }

    // Process events that should have occurred
    const targetTimestamp =
      new Date(this.recording.recordedAt).getTime() + this.state.currentTime * 1000;

    while (
      this.state.currentEventIndex < this.recording.events.length &&
      this.recording.events[this.state.currentEventIndex].timestamp <= targetTimestamp
    ) {
      const event = this.recording.events[this.state.currentEventIndex];
      const snapshot = this.getSnapshotAtTime(this.state.currentTime);
      this.onStateChange(snapshot, event);
      this.state.currentEventIndex++;
    }
  }

  private getSnapshotAtTime(time: number): StateSnapshot {
    const targetTimestamp = new Date(this.recording.recordedAt).getTime() + time * 1000;

    // Find the most recent state snapshot before this time
    const stateSnapshots = this.recording.events.filter(
      (e) => e.type === 'state_snapshot' && e.timestamp <= targetTimestamp
    );

    if (stateSnapshots.length > 0) {
      return stateSnapshots[stateSnapshots.length - 1].data as unknown as StateSnapshot;
    }

    return this.recording.initialSnapshot;
  }
}

// ============================================================================
// EXPORT/IMPORT UTILITIES
// ============================================================================

export function exportRecording(recording: SessionRecording): string {
  return JSON.stringify(recording, null, 2);
}

export function importRecording(json: string): SessionRecording {
  const recording = JSON.parse(json) as SessionRecording;

  // Validate required fields
  if (!recording.id || !recording.sessionCode || !recording.events) {
    throw new Error('Invalid recording format');
  }

  return recording;
}

export function downloadRecording(recording: SessionRecording): void {
  const json = exportRecording(recording);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crucible-recording-${recording.sessionCode}-${recording.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadRecording(file: File): Promise<SessionRecording> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const recording = importRecording(reader.result as string);
        resolve(recording);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================================================
// ANALYSIS UTILITIES
// ============================================================================

export interface RecordingAnalysis {
  totalDecisions: number;
  decisionsPerTeam: Record<string, number>;
  averageDecisionTime: number;
  interventionCount: number;
  interventionsPerTeam: Record<string, number>;
  phaseDurations: Record<string, number>;
  valuesAlignment: {
    aligned: number;
    conflicted: number;
    compromised: number;
  };
  keyMoments: RecordingEvent[];
}

export function analyzeRecording(recording: SessionRecording): RecordingAnalysis {
  const decisions = recording.events.filter(
    (e) => e.type === 'decision_confirmed'
  ) as DecisionEvent[];
  const interventions = recording.events.filter(
    (e) => e.type === 'intervention_triggered'
  ) as InterventionEvent[];
  const phaseChanges = recording.events.filter(
    (e) => e.type === 'phase_change'
  ) as PhaseChangeEvent[];

  // Decisions per team
  const decisionsPerTeam: Record<string, number> = {};
  decisions.forEach((d) => {
    decisionsPerTeam[d.data.teamName] =
      (decisionsPerTeam[d.data.teamName] || 0) + 1;
  });

  // Interventions per team
  const interventionsPerTeam: Record<string, number> = {};
  interventions.forEach((i) => {
    interventionsPerTeam[i.data.teamName] =
      (interventionsPerTeam[i.data.teamName] || 0) + 1;
  });

  // Phase durations
  const phaseDurations: Record<string, number> = {};
  for (let i = 0; i < phaseChanges.length; i++) {
    const phase = phaseChanges[i].data.fromPhase;
    const startTime = i === 0 ? 0 : phaseChanges[i - 1].simulationTime;
    const endTime = phaseChanges[i].simulationTime;
    phaseDurations[phase] = endTime - startTime;
  }

  // Values alignment
  const valuesAlignment = { aligned: 0, conflicted: 0, compromised: 0 };
  decisions.forEach((d) => {
    valuesAlignment[d.data.valuesAlignment]++;
  });

  // Key moments (notable moments and breaking news)
  const keyMoments = recording.events.filter(
    (e) =>
      e.type === 'notable_moment' ||
      (e.type === 'feed_item' && (e.data as FeedItemEvent['data']).breaking)
  );

  // Average decision time (rough estimate based on simulation time gaps)
  let totalDecisionTime = 0;
  for (let i = 1; i < decisions.length; i++) {
    totalDecisionTime +=
      decisions[i].simulationTime - decisions[i - 1].simulationTime;
  }
  const averageDecisionTime =
    decisions.length > 1
      ? Math.round(totalDecisionTime / (decisions.length - 1))
      : 0;

  return {
    totalDecisions: decisions.length,
    decisionsPerTeam,
    averageDecisionTime,
    interventionCount: interventions.length,
    interventionsPerTeam,
    phaseDurations,
    valuesAlignment,
    keyMoments,
  };
}
