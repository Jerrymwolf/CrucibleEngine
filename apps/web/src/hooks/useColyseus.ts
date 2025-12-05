'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Colyseus from 'colyseus.js';
import type { DecisionPayload, DirectivePayload } from '@crucible/shared';

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567';

interface UseColyseusOptions {
  sessionCode: string;
  role: 'team' | 'cm';
  teamId?: string;
  participantName?: string;
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
  parishes: Map<string, ParishSnapshot>;
  teams: Map<string, TeamSnapshot>;
  decisions: DecisionSnapshot[];
  feed: StreamingContentSnapshot[];
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

interface TeamSnapshot {
  id: string;
  parishId: string;
  teamName: string;
  members: string[];
  statedValues: string[];
  decisionProcess: string;
  commitmentStatement: string;
  ready: boolean;
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

interface UseColyseusReturn {
  room: Colyseus.Room | null;
  state: CrucibleStateSnapshot | null;
  connected: boolean;
  connecting: boolean;
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
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

export function useColyseus({
  sessionCode,
  role,
  teamId,
  participantName,
}: UseColyseusOptions): UseColyseusReturn {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [state, setState] = useState<CrucibleStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<Colyseus.Client | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize client
  useEffect(() => {
    clientRef.current = new Colyseus.Client(COLYSEUS_URL);

    return () => {
      room?.leave();
    };
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
        teams.set(key, {
          id: t.id as string,
          parishId: t.parishId as string,
          teamName: t.teamName as string,
          members: Array.from(t.members as ArrayLike<string>),
          statedValues: Array.from(t.statedValues as ArrayLike<string>),
          decisionProcess: t.decisionProcess as string,
          commitmentStatement: t.commitmentStatement as string,
          ready: t.ready as boolean,
        });
      });
    }

    const weather = s.weather as Record<string, unknown>;
    const hurricane = weather.hurricane as Record<string, unknown>;
    const phase = s.phase as Record<string, unknown>;
    const intensity = s.intensity as Record<string, unknown>;

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
      simulationTime: s.simulationTime as number,
    };
  }, []);

  // Connect to room
  const connect = useCallback(async () => {
    if (!clientRef.current || !sessionCode) return;

    try {
      setError(null);
      setConnecting(true);

      const joinedRoom = await clientRef.current.joinOrCreate('crucible', {
        sessionCode,
        role,
        teamId,
        participantName,
      });

      setRoom(joinedRoom);
      setConnected(true);
      setConnecting(false);
      reconnectAttempts.current = 0;

      // State change listener
      joinedRoom.onStateChange((newState) => {
        setState(snapshotState(newState));
      });

      // Disconnection handler
      joinedRoom.onLeave((code) => {
        setConnected(false);

        // Attempt reconnection for unexpected disconnects
        if (code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => connect(), 1000 * reconnectAttempts.current);
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
    }
  }, [sessionCode, role, teamId, participantName, snapshotState]);

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

  // Manual reconnect
  const reconnect = useCallback(async () => {
    await room?.leave();
    reconnectAttempts.current = 0;
    await connect();
  }, [room, connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    room?.leave();
    setRoom(null);
    setState(null);
    setConnected(false);
  }, [room]);

  return {
    room,
    state,
    connected,
    connecting,
    error,
    sendDecision,
    sendDirective,
    setIntensity,
    setTeamIntensity,
    setPhase,
    togglePause,
    joinTeam,
    setTeamReady,
    submitTeamValues,
    reconnect,
    disconnect,
  };
}
