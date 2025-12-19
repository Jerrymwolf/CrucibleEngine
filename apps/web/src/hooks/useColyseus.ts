'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Colyseus from 'colyseus.js';
import { useAuth } from '@clerk/nextjs';
import type { DecisionPayload, DirectivePayload } from '@crucible/shared';
import { getParticipantToken, recordSessionJoin } from '@/lib/sessionTokens';

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567';

interface UseColyseusOptions {
  sessionCode: string;
  role: 'team' | 'cm' | 'spectator';
  teamId?: string;
  participantName?: string;
}

/** Auth status for WebSocket connection */
export type AuthStatus = 'pending' | 'authenticating' | 'authenticated' | 'failed';

interface InterventionSnapshot {
  id: string;
  teamId: string;
  interventionType: 'flash' | 'moment' | 'mirror';
  startedAt: number;
  expiresAt: number;
  commitmentText: string;
}

interface ProductionSnapshot {
  currentBatchId: string;
  batchProgress: number;
  batchValue: number;
  batchEtaHours: number;
  pipelineStatus: 'flowing' | 'blocked' | 'degraded';
  bottleneck: string;
  revenueImpact: number;
  productionHoursLost: number;
  burnRateActive: boolean;
  quarterlyTarget: number;
  quarterlyProgress: number;
  daysRemainingInQuarter: number;
  patientsAffected: number;
  childrenAffected: number;
  workersAtRisk: number;
  workersEvacuated: number;
  globalStockpileWeeks: number;
}

interface CrucibleStateSnapshot {
  sessionId: string;
  sessionCode: string;
  phase: {
    current: string;
    phaseStartTime: number;
    paused: boolean;
  };
  weather: {
    hurricane: {
      name: string;
      category: number;
      trajectory: string;
      certaintyPercent: number;
      hoursToImpact: number;
      hasLandfall: boolean;
      currentAdvisory: string;
    };
    windSpeed: number;
    rainfall: number;
    visibility: number;
    conditions: string;
    stormSurge: number;
  };
  intensity: {
    global: number;
    byTeam: Map<string, number>;
    tempestAdvisory: string;
  };
  production: ProductionSnapshot;
  parishes: Map<string, ParishSnapshot>;
  teams: Map<string, TeamSnapshot>;
  decisions: DecisionSnapshot[];
  feed: StreamingContentSnapshot[];
  interventions: Map<string, InterventionSnapshot>;
  simulationTime: number;
}

interface ParishSnapshot {
  id: string;
  name: string;
  resources: {
    generators: number;
    generatorsDeployed: number;
    medicalSupplies: string;
    fuel: number;
    food: number;
    water: number;
    shelterUsed: number;
    shelterCapacity: number;
  };
  status: {
    power: number;
    communications: number;
    roads: number;
    hospital: number;
    port: number;
    airport: number;
    waterSystem: number;
    evacuationOrdered: boolean;
    evacuationStatus: string;
    populationRemaining: number;
    populationEvacuated: number;
    casualties: number;
    injured: number;
  };
  morale: number;
  currentCrisis: string;
}

interface DilemmaOptionSnapshot {
  id: string;
  label: string;
  description: string;
}

interface DilemmaSnapshot {
  id: string;
  title: string;
  setupNarrative: string;
  presenterPersona: string;
  presentedAt: number;
  expiresAt: number;
  options: DilemmaOptionSnapshot[];
}

interface TeamSnapshot {
  id: string;
  parishId: string;
  teamName: string;
  members: string[];
  statedValues: string[];
  decisionProcess: string;
  commitmentStatement: string;
  ready: boolean;
  currentDilemma: DilemmaSnapshot | null;
}

interface DecisionSnapshot {
  id: string;
  teamId: string;
  parishId: string;
  categoryId: string;
  decisionTypeId: string;
  choice: string;
  rationale: string;
  simulationTime: number;
  realTime: number;
  valuesAnalysis?: {
    value: string;
    alignment: number;
    evidence: string;
  }[];
  notableMoment?: boolean;
  notableReason?: string;
}

interface StreamingContentSnapshot {
  id: string;
  type: string;
  source: string;
  content: string;
  urgency: number;
  relatedParish: string;
  timestamp: number;
  breaking: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseColyseusReturn {
  room: Colyseus.Room | null;
  state: CrucibleStateSnapshot | null;
  connected: boolean;
  connecting: boolean;
  /** Detailed connection status for UI */
  connectionStatus: ConnectionStatus;
  /** True when all reconnection attempts have been exhausted */
  connectionExhausted: boolean;
  /** WebSocket authentication status */
  authStatus: AuthStatus;
  /** Auth-specific error message */
  authError: string | null;
  /** Current reconnection attempt number */
  reconnectAttempt: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  error: Error | null;
  sendDecision: (decision: DecisionPayload) => void;
  sendDirective: (directive: DirectivePayload) => void;
  setIntensity: (level: number) => void;
  setTeamIntensity: (teamId: string, level: number) => void;
  setPhase: (phase: string) => void;
  togglePause: () => void;
  joinTeam: (parishId: string, teamName?: string) => void;
  setTeamReady: (teamId: string, ready: boolean) => void;
  submitTeamValues: (teamId: string, values: string[]) => void;
  triggerIntervention: (teamId: string, type: 'flash' | 'moment' | 'mirror') => void;
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

export function useColyseus({
  sessionCode,
  role,
  teamId,
  participantName,
}: UseColyseusOptions): UseColyseusReturn {
  // Clerk auth for CM users
  const { getToken, isSignedIn } = useAuth();

  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [state, setState] = useState<CrucibleStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [authError, setAuthError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [connectionExhausted, setConnectionExhausted] = useState(false);

  const clientRef = useRef<Colyseus.Client | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;

  // Exponential backoff calculation: 1s, 2s, 4s, 8s, 16s
  const getBackoffDelay = useCallback((attempt: number): number => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    // Add jitter (0-500ms) to prevent thundering herd
    return delay + Math.random() * 500;
  }, []);

  // Clear any pending reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Initialize client
  useEffect(() => {
    clientRef.current = new Colyseus.Client(COLYSEUS_URL);

    return () => {
      room?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert Colyseus state to plain object snapshot
  const snapshotState = useCallback((colyseusState: unknown): CrucibleStateSnapshot | null => {
    if (!colyseusState) return null;

    const s = colyseusState as Record<string, unknown>;

    // Convert MapSchema to Map
    const parishes = new Map<string, ParishSnapshot>();
    const parishesMap = s.parishes as Map<string, unknown> | undefined;
    if (parishesMap) {
      parishesMap.forEach((parish: unknown, key: string) => {
        const p = parish as Record<string, unknown>;
        const resources = p.resources as Record<string, unknown>;
        const status = p.status as Record<string, unknown>;
        parishes.set(key, {
          id: p.id as string,
          name: p.name as string,
          resources: {
            generators: resources.generators as number,
            generatorsDeployed: resources.generatorsDeployed as number,
            medicalSupplies: resources.medicalSupplies as string,
            fuel: resources.fuel as number,
            food: resources.food as number,
            water: resources.water as number,
            shelterUsed: resources.shelterUsed as number,
            shelterCapacity: resources.shelterCapacity as number,
          },
          status: {
            power: status.power as number,
            communications: status.communications as number,
            roads: status.roads as number,
            hospital: status.hospital as number,
            port: status.port as number,
            airport: status.airport as number,
            waterSystem: status.waterSystem as number,
            evacuationOrdered: status.evacuationOrdered as boolean,
            evacuationStatus: status.evacuationStatus as string,
            populationRemaining: status.populationRemaining as number,
            populationEvacuated: status.populationEvacuated as number,
            casualties: status.casualties as number,
            injured: status.injured as number,
          },
          morale: p.morale as number,
          currentCrisis: p.currentCrisis as string,
        });
      });
    }

    const teams = new Map<string, TeamSnapshot>();
    const teamsMap = s.teams as Map<string, unknown> | undefined;
    if (teamsMap) {
      teamsMap.forEach((team: unknown, key: string) => {
        const t = team as Record<string, unknown>;

        // Serialize currentDilemma if present
        let currentDilemma: DilemmaSnapshot | null = null;
        const dilemma = t.currentDilemma as Record<string, unknown> | null | undefined;
        if (dilemma && dilemma.id) {
          const dilemmaOptions = dilemma.options as ArrayLike<unknown> | undefined;
          currentDilemma = {
            id: dilemma.id as string,
            title: dilemma.title as string,
            setupNarrative: dilemma.setupNarrative as string,
            presenterPersona: dilemma.presenterPersona as string,
            presentedAt: dilemma.presentedAt as number,
            expiresAt: dilemma.expiresAt as number,
            options: dilemmaOptions ? Array.from(dilemmaOptions).map((opt) => {
              const o = opt as Record<string, unknown>;
              return {
                id: o.id as string,
                label: o.label as string,
                description: o.description as string,
              };
            }) : [],
          };
        }

        teams.set(key, {
          id: t.id as string,
          parishId: t.parishId as string,
          teamName: t.teamName as string,
          members: Array.from(t.members as ArrayLike<string>),
          statedValues: Array.from(t.statedValues as ArrayLike<string>),
          decisionProcess: t.decisionProcess as string,
          commitmentStatement: t.commitmentStatement as string,
          ready: t.ready as boolean,
          currentDilemma,
        });
      });
    }

    const weather = s.weather as Record<string, unknown>;
    const hurricane = weather.hurricane as Record<string, unknown>;
    const phase = s.phase as Record<string, unknown>;
    const intensity = s.intensity as Record<string, unknown>;
    const prod = s.production as Record<string, unknown>;

    return {
      sessionId: s.sessionId as string,
      sessionCode: s.sessionCode as string,
      phase: {
        current: phase.current as string,
        phaseStartTime: phase.phaseStartTime as number,
        paused: phase.paused as boolean,
      },
      weather: {
        hurricane: {
          name: hurricane.name as string,
          category: hurricane.category as number,
          trajectory: hurricane.trajectory as string,
          certaintyPercent: hurricane.certaintyPercent as number,
          hoursToImpact: hurricane.hoursToImpact as number,
          hasLandfall: hurricane.hasLandfall as boolean,
          currentAdvisory: hurricane.currentAdvisory as string,
        },
        windSpeed: weather.windSpeed as number,
        rainfall: weather.rainfall as number,
        visibility: weather.visibility as number,
        conditions: weather.conditions as string,
        stormSurge: weather.stormSurge as number,
      },
      intensity: {
        global: intensity.global as number,
        byTeam: new Map(intensity.byTeam as Map<string, number>),
        tempestAdvisory: intensity.tempestAdvisory as string,
      },
      production: {
        currentBatchId: prod.currentBatchId as string,
        batchProgress: prod.batchProgress as number,
        batchValue: prod.batchValue as number,
        batchEtaHours: prod.batchEtaHours as number,
        pipelineStatus: prod.pipelineStatus as 'flowing' | 'blocked' | 'degraded',
        bottleneck: prod.bottleneck as string,
        revenueImpact: prod.revenueImpact as number,
        productionHoursLost: prod.productionHoursLost as number,
        burnRateActive: prod.burnRateActive as boolean,
        quarterlyTarget: prod.quarterlyTarget as number,
        quarterlyProgress: prod.quarterlyProgress as number,
        daysRemainingInQuarter: prod.daysRemainingInQuarter as number,
        patientsAffected: prod.patientsAffected as number,
        childrenAffected: prod.childrenAffected as number,
        workersAtRisk: prod.workersAtRisk as number,
        workersEvacuated: prod.workersEvacuated as number,
        globalStockpileWeeks: prod.globalStockpileWeeks as number,
      },
      parishes,
      teams,
      decisions: Array.from(s.decisions as ArrayLike<unknown>).map((d) => {
        const dec = d as Record<string, unknown>;
        return {
          id: dec.id as string,
          teamId: dec.teamId as string,
          parishId: dec.parishId as string,
          categoryId: dec.categoryId as string,
          decisionTypeId: dec.decisionTypeId as string,
          choice: dec.choice as string,
          rationale: dec.rationale as string,
          simulationTime: dec.simulationTime as number,
          realTime: dec.realTime as number,
          valuesAnalysis: dec.valuesAnalysis as { value: string; alignment: number; evidence: string }[] | undefined,
          notableMoment: dec.notableMoment as boolean | undefined,
          notableReason: dec.notableReason as string | undefined,
        };
      }),
      feed: Array.from(s.feed as ArrayLike<unknown>).map((f) => {
        const feed = f as Record<string, unknown>;
        return {
          id: feed.id as string,
          type: feed.type as string,
          source: feed.source as string,
          content: feed.content as string,
          urgency: feed.urgency as number,
          relatedParish: feed.relatedParish as string,
          timestamp: feed.timestamp as number,
          breaking: feed.breaking as boolean,
        };
      }),
      interventions: (() => {
        const interventions = new Map<string, InterventionSnapshot>();
        const interventionsMap = s.interventions as Map<string, unknown> | undefined;
        if (interventionsMap) {
          interventionsMap.forEach((intervention: unknown, key: string) => {
            const i = intervention as Record<string, unknown>;
            interventions.set(key, {
              id: i.id as string,
              teamId: i.teamId as string,
              interventionType: i.interventionType as 'flash' | 'moment' | 'mirror',
              startedAt: i.startedAt as number,
              expiresAt: i.expiresAt as number,
              commitmentText: i.commitmentText as string,
            });
          });
        }
        return interventions;
      })(),
      simulationTime: s.simulationTime as number,
    };
  }, []);

  // Connect to room with exponential backoff reconnection and WebSocket auth
  const connect = useCallback(async (isReconnect = false) => {
    if (!clientRef.current || !sessionCode) return;

    try {
      setError(null);
      setAuthError(null);
      setConnecting(true);
      setAuthStatus('pending');
      setConnectionStatus(isReconnect ? 'reconnecting' : 'connecting');

      // Join room - auth happens via message exchange after connection
      const joinedRoom = await clientRef.current.joinOrCreate('crucible', {
        sessionCode: sessionCode.toUpperCase(),
      });

      setRoom(joinedRoom);
      clearReconnectTimeout();

      // =======================================================================
      // AUTHENTICATION MESSAGE HANDLERS
      // =======================================================================

      // Server requests authentication
      joinedRoom.onMessage('auth_required', async () => {
        console.log('[Colyseus] Auth required, sending credentials...');
        setAuthStatus('authenticating');

        try {
          if (role === 'cm' && isSignedIn) {
            // CM uses Clerk JWT
            const clerkToken = await getToken();
            joinedRoom.send('auth', {
              type: 'auth',
              clerkToken,
              sessionCode: sessionCode.toUpperCase(),
            });
          } else if (role === 'spectator') {
            // Spectator just needs session code
            joinedRoom.send('auth', {
              type: 'auth',
              sessionCode: sessionCode.toUpperCase(),
              role: 'spectator',
            });
          } else {
            // Participant uses anonymous token
            const participantToken = getParticipantToken();
            joinedRoom.send('auth', {
              type: 'auth',
              participantToken: participantToken.id,
              sessionCode: sessionCode.toUpperCase(),
              teamId,
            });
          }
        } catch (err) {
          console.error('[Colyseus] Auth error:', err);
          setAuthStatus('failed');
          setAuthError('Failed to authenticate');
          setError(new Error('Failed to authenticate'));
          setConnectionStatus('disconnected');
        }
      });

      // Authentication successful
      joinedRoom.onMessage('auth_success', (data: { userId: string; role: string; teamId?: string }) => {
        console.log('[Colyseus] Authenticated as:', data.role);
        setAuthStatus('authenticated');
        setAuthError(null);
        setConnected(true);
        setConnecting(false);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        setReconnectAttempt(0);

        // Record session join for participants
        if (role === 'team') {
          recordSessionJoin(sessionCode.toUpperCase());
        }
      });

      // Authentication failed
      joinedRoom.onMessage('auth_failed', (data: { reason: string; retryAfter?: number }) => {
        console.error('[Colyseus] Auth failed:', data.reason);
        setAuthStatus('failed');
        setAuthError(data.reason || 'Authentication failed');
        setConnected(false);
        setConnecting(false);
        setConnectionStatus('disconnected');

        if (data.retryAfter) {
          setError(new Error(`${data.reason}. Retry in ${data.retryAfter}s`));
        } else {
          setError(new Error(data.reason || 'Authentication failed'));
        }
      });

      // Authentication timeout
      joinedRoom.onMessage('auth_timeout', () => {
        console.error('[Colyseus] Auth timeout');
        setAuthStatus('failed');
        setAuthError('Authentication timeout');
        setConnected(false);
        setConnecting(false);
        setConnectionStatus('disconnected');
        setError(new Error('Authentication timeout'));
      });

      // Token refresh needed (for CM users with expiring JWTs)
      joinedRoom.onMessage('token_refresh_needed', async () => {
        console.log('[Colyseus] Token refresh needed');
        if (isSignedIn && role === 'cm') {
          try {
            const newToken = await getToken({ skipCache: true });
            joinedRoom.send('token_refresh', {
              clerkToken: newToken,
              sessionCode: sessionCode.toUpperCase(),
            });
          } catch (err) {
            console.error('[Colyseus] Token refresh failed:', err);
          }
        }
      });

      // Token refresh result
      joinedRoom.onMessage('token_refreshed', () => {
        console.log('[Colyseus] Token refreshed successfully');
      });

      // Rate limited
      joinedRoom.onMessage('rate_limited', (data: { retryAfter: number }) => {
        console.warn(`[Colyseus] Rate limited. Retry in ${data.retryAfter}s`);
        setError(new Error(`Rate limited. Retry in ${data.retryAfter}s`));
      });

      // =======================================================================
      // STATE AND CONNECTION HANDLERS
      // =======================================================================

      // State change listener
      joinedRoom.onStateChange((newState) => {
        setState(snapshotState(newState));
      });

      // Disconnection handler with exponential backoff
      joinedRoom.onLeave((code) => {
        setConnected(false);
        setConnectionStatus('disconnected');
        setAuthStatus('pending');

        // Attempt reconnection for unexpected disconnects (not clean close)
        // Don't reconnect on auth failures (4001, 4029)
        if (code !== 1000 && code !== 4001 && code !== 4029 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setReconnectAttempt(reconnectAttempts.current);
          setConnectionStatus('reconnecting');

          const delay = getBackoffDelay(reconnectAttempts.current);
          console.log(`[Colyseus] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(true);
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionExhausted(true);
          setError(new Error('Connection lost. Maximum reconnection attempts reached.'));
          setConnectionStatus('disconnected');
        }
      });

      // Error handler
      joinedRoom.onError((code, message) => {
        setError(new Error(`Room error ${code}: ${message}`));
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
      setConnected(false);
      setConnecting(false);
      setAuthStatus('pending');

      // Retry connection on failure (if within limits)
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        setReconnectAttempt(reconnectAttempts.current);
        setConnectionStatus('reconnecting');

        const delay = getBackoffDelay(reconnectAttempts.current);
        console.log(`[Colyseus] Retrying connection in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect(true);
        }, delay);
      } else {
        setConnectionStatus('disconnected');
      }
    }
  }, [sessionCode, role, teamId, isSignedIn, getToken, snapshotState, getBackoffDelay, clearReconnectTimeout]);

  // Initial connection
  useEffect(() => {
    if (sessionCode) {
      connect();
    }
  }, [sessionCode, connect]);

  // Send team decision
  const sendDecision = useCallback(
    (decision: DecisionPayload) => {
      if (!room) return;
      room.send('decision', decision);
    },
    [room]
  );

  // CM: Send directive
  const sendDirective = useCallback(
    (directive: DirectivePayload) => {
      if (!room || role !== 'cm') return;
      room.send('cm:directive', directive);
    },
    [room, role]
  );

  // CM: Set global intensity
  const setIntensity = useCallback(
    (level: number) => {
      if (!room || role !== 'cm') return;
      room.send('cm:setIntensity', { level });
    },
    [room, role]
  );

  // CM: Set team-specific intensity
  const setTeamIntensity = useCallback(
    (teamId: string, level: number) => {
      if (!room || role !== 'cm') return;
      room.send('cm:setTeamIntensity', { teamId, level });
    },
    [room, role]
  );

  // CM: Change phase
  const setPhase = useCallback(
    (phase: string) => {
      if (!room || role !== 'cm') return;
      room.send('cm:setPhase', { phase });
    },
    [room, role]
  );

  // CM: Toggle pause
  const togglePause = useCallback(() => {
    if (!room || role !== 'cm') return;
    room.send('cm:togglePause');
  }, [room, role]);

  // CM: Trigger values intervention
  const triggerIntervention = useCallback(
    (teamId: string, type: 'flash' | 'moment' | 'mirror') => {
      if (!room || role !== 'cm') return;
      room.send('cm:triggerIntervention', { teamId, type });
    },
    [room, role]
  );

  // Join team
  const joinTeam = useCallback(
    (parishId: string, teamName?: string) => {
      if (!room) return;
      room.send('joinTeam', { parishId, teamName });
    },
    [room]
  );

  // Set team ready status
  const setTeamReady = useCallback(
    (teamId: string, ready: boolean) => {
      if (!room) return;
      room.send('team:ready', { teamId, ready });
    },
    [room]
  );

  // Submit team values
  const submitTeamValues = useCallback(
    (teamId: string, values: string[]) => {
      if (!room) return;
      room.send('team:submitValues', { teamId, values });
    },
    [room]
  );

  // Manual reconnect (resets attempts)
  const reconnect = useCallback(async () => {
    clearReconnectTimeout();
    setConnectionExhausted(false);
    await room?.leave();
    reconnectAttempts.current = 0;
    setReconnectAttempt(0);
    setError(null);
    await connect(false);
  }, [room, connect, clearReconnectTimeout]);

  // Disconnect (clean disconnect, no reconnect)
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    room?.leave(true); // Clean/consented leave
    setRoom(null);
    setState(null);
    setConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
    setReconnectAttempt(0);
  }, [room, clearReconnectTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);

  return {
    room,
    state,
    connected,
    connecting,
    connectionStatus,
    connectionExhausted,
    authStatus,
    authError,
    reconnectAttempt,
    maxReconnectAttempts,
    error,
    sendDecision,
    sendDirective,
    setIntensity,
    setTeamIntensity,
    setPhase,
    togglePause,
    triggerIntervention,
    joinTeam,
    setTeamReady,
    submitTeamValues,
    reconnect,
    disconnect,
  };
}
