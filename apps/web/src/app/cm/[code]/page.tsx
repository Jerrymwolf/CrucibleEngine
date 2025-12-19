'use client';

/**
 * Crucible Master Console Page
 *
 * The facilitator dashboard for managing and monitoring the simulation.
 * Refactored to use modular components from the cm component library.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useColyseus } from '@/hooks/useColyseus';
import { useGameStore } from '@/stores/gameStore';
import { PARISHES } from '@crucible/shared';
import { Loader2, AlertCircle, CloudLightning, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/Logo';

// Import CM components
import {
  ControlDeck,
  type PhaseId,
  TeamMonitor,
  type TeamData,
  InterventionPanel,
  type InterventionHistory,
  type TeamOption,
  NarrativeQueue,
  type FeedItem,
  SessionRecovery,
  type ConnectionStatus,
  FacilitationGuide,
  type TeamAnalysis,
} from '@/components/cm';

function CrucibleMasterPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  const cmName = searchParams.get('name') || 'Crucible Master';

  const {
    connected,
    connecting,
    error,
    state,
    authStatus,
    authError,
    setPhase,
    setIntensity,
    setTeamIntensity,
    togglePause,
    sendDirective,
    triggerIntervention,
    reconnect,
  } = useColyseus({
    sessionCode: code,
    role: 'cm',
    participantName: cmName,
  });

  // Local state
  const [interventionHistory, setInterventionHistory] = useState<InterventionHistory[]>([]);
  const [pendingFeedItems, setPendingFeedItems] = useState<FeedItem[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastConnectedTime, setLastConnectedTime] = useState<number | undefined>();
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();

  const { updateFromSnapshot } = useGameStore();

  // Update store when state changes
  useEffect(() => {
    if (state) {
      updateFromSnapshot(state);
    }
  }, [state, updateFromSnapshot]);

  // Track connection time
  useEffect(() => {
    if (connected) {
      setLastConnectedTime(Date.now());
      setReconnectAttempt(0);
    }
  }, [connected]);

  // Derive connection status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (connected) return 'connected';
    if (connecting) return 'connecting';
    if (error) return 'failed';
    if (reconnectAttempt > 0) return 'reconnecting';
    return 'disconnected';
  }, [connected, connecting, error, reconnectAttempt]);

  // Transform teams for components
  const teamsArray = useMemo(() => {
    if (!state?.teams) return [];
    return Array.from(state.teams.values());
  }, [state?.teams]);

  // Transform teams for TeamMonitor
  const teamMonitorData: TeamData[] = useMemo(() => {
    return teamsArray.map((team) => {
      const parishState = state?.parishes.get(team.parishId);
      const teamIntensity = state?.intensity.byTeam.get(team.parishId) ?? state?.intensity.global ?? 5;

      // Get decision count for this team from decisions array
      const teamDecisions = state?.decisions.filter((d) => d.teamId === team.id) || [];

      return {
        id: team.id,
        parishId: team.parishId,
        teamName: team.teamName || PARISHES[team.parishId as keyof typeof PARISHES]?.name || team.parishId,
        // members is string[] in TeamSnapshot, convert to expected format
        members: team.members.map((memberName: string, index: number) => ({
          id: `${team.id}-member-${index}`,
          name: memberName,
          connected: true,
          ready: team.ready,
        })),
        ready: team.ready,
        status: parishState?.status || {
          power: 100,
          communications: 100,
          roads: 100,
          hospital: 100,
          port: 100,
        },
        morale: parishState?.morale || 100,
        decisionCount: teamDecisions.length,
        lastActivityTime: Date.now() - Math.random() * 300000, // Placeholder
        currentIntensity: teamIntensity,
        activeDecision: undefined,
      };
    });
  }, [teamsArray, state?.parishes, state?.intensity, state?.decisions]);

  // Transform teams for InterventionPanel
  const interventionTeams: TeamOption[] = useMemo(() => {
    return teamsArray.map((team) => ({
      id: team.id,
      name: team.teamName || PARISHES[team.parishId as keyof typeof PARISHES]?.name || team.parishId,
      parishId: team.parishId,
      interventionCount: interventionHistory.filter((h) => h.teamId === team.id).length,
      lastIntervention: interventionHistory
        .filter((h) => h.teamId === team.id)
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp,
    }));
  }, [teamsArray, interventionHistory]);

  // Transform teams for FacilitationGuide
  const facilitationTeams: TeamAnalysis[] = useMemo(() => {
    return teamsArray.map((team) => {
      const teamDecisions = state?.decisions.filter((d) => d.teamId === team.id) || [];
      return {
        teamId: team.id,
        teamName: team.teamName || PARISHES[team.parishId as keyof typeof PARISHES]?.name || team.parishId,
        decisionCount: teamDecisions.length,
        averageDecisionTime: 60, // Placeholder - would need actual timing data
        valueConflicts: 0, // Placeholder - would need actual conflict tracking
        statedValues: team.statedValues || [],
        enactedValueScore: {},
        lastDecisionTime: Date.now() - Math.random() * 300000, // Placeholder
        interventionsReceived: interventionHistory.filter((h) => h.teamId === team.id).length,
      };
    });
  }, [teamsArray, interventionHistory, state?.decisions]);

  // Transform feed items
  const feedItems: FeedItem[] = useMemo(() => {
    if (!state?.feed) return [];
    return state.feed.map((item) => ({
      id: item.id,
      type: item.type as FeedItem['type'],
      source: item.source,
      content: item.content,
      timestamp: item.timestamp || Date.now(),
      breaking: item.breaking,
      approved: true,
    }));
  }, [state?.feed]);

  // Handlers
  const handlePhaseChange = (phase: PhaseId) => {
    setPhase(phase);
  };

  const handleIntensityChange = (intensity: number) => {
    setIntensity(intensity);
  };

  const handleTeamIntensityChange = (teamId: string, intensity: number) => {
    setTeamIntensity(teamId, intensity);
  };

  const handleTriggerIntervention = (teamIds: string[], type: 'flash' | 'moment' | 'mirror') => {
    teamIds.forEach((teamId) => {
      triggerIntervention(teamId, type);

      // Track in local history
      const team = teamsArray.find((t) => t.id === teamId);
      setInterventionHistory((prev) => [
        ...prev,
        {
          id: `${teamId}-${Date.now()}`,
          type,
          teamId,
          teamName: team?.teamName || teamId,
          timestamp: Date.now(),
          triggered: true,
        },
      ]);
    });
  };

  const handleInjectFeed = (item: Omit<FeedItem, 'id' | 'timestamp' | 'approved'>) => {
    sendDirective({
      type: item.type,
      targetTeams: item.targetTeams || [],
      content: item.content,
    });
  };

  const handleApproveFeed = (itemId: string) => {
    setPendingFeedItems((prev) => prev.filter((item) => item.id !== itemId));
    // Would send approval to server
  };

  const handleRejectFeed = (itemId: string) => {
    setPendingFeedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleReconnect = () => {
    setReconnectAttempt((prev) => prev + 1);
    reconnect?.();
  };

  const handleTransfer = (newCmName: string) => {
    // Would implement CM transfer logic
    console.log('Transfer to:', newCmName);
  };

  const handleExit = () => {
    router.push('/');
  };

  // Auth error state - show if not authorized for this session
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">{authError}</p>
          <p className="text-sm text-muted-foreground">
            You may not have permission to access this session.
          </p>
          <Button onClick={() => router.push('/cm')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (connecting && reconnectAttempt === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Logo variant="icon" size="lg" linkToHome={false} />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-muted-foreground">Connecting as Crucible Master...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state (only show if not trying to reconnect)
  if (error && reconnectAttempt === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Connection Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => router.push('/cm')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const currentPhase = (state?.phase.current || 'lobby') as PhaseId;
  const isPaused = state?.phase.paused || false;
  const globalIntensity = state?.intensity.global || 5;
  const simulationTime = state?.simulationTime || 0;

  // Count total participants
  let totalParticipants = 0;
  state?.teams.forEach((team) => {
    totalParticipants += team.members.length;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="icon" size="sm" priority={true} />
            <span className="font-semibold">Crucible Master Console</span>
            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
              {code}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation Time */}
            <div className="text-sm text-muted-foreground">
              T+{simulationTime} min
            </div>

            {/* Connection Status */}
            <SessionRecovery
              status={connectionStatus}
              reconnectAttempt={reconnectAttempt}
              maxReconnectAttempts={5}
              lastConnectedTime={lastConnectedTime}
              sessionCode={code}
              onReconnect={handleReconnect}
              onTransfer={handleTransfer}
              onExit={handleExit}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto p-2 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Controls */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4">
            {/* Control Deck */}
            <div className="panel">
              <ControlDeck
                currentPhase={currentPhase}
                isPaused={isPaused}
                simulationTime={simulationTime}
                globalIntensity={globalIntensity}
                onPhaseChange={handlePhaseChange}
                onTogglePause={togglePause}
                onIntensityChange={handleIntensityChange}
              />
            </div>

            {/* Facilitation Guide */}
            <div className="panel">
              <FacilitationGuide
                teams={facilitationTeams}
                currentPhase={currentPhase}
                simulationTime={simulationTime}
                globalIntensity={globalIntensity}
                onTriggerIntervention={(teamId, type) => handleTriggerIntervention([teamId], type)}
                onAdjustIntensity={(delta) => handleIntensityChange(globalIntensity + delta)}
              />
            </div>

            {/* Intervention Panel */}
            <div className="panel">
              <InterventionPanel
                teams={interventionTeams}
                history={interventionHistory}
                maxInterventions={5}
                onTrigger={handleTriggerIntervention}
                disabled={isPaused}
              />
            </div>
          </div>

          {/* Main Content - Team Overview */}
          <div className="md:col-span-1 lg:col-span-6 space-y-4">
            {/* Team Monitor */}
            <div className="panel">
              <TeamMonitor
                teams={teamMonitorData}
                currentPhase={currentPhase}
                onIntensityChange={handleTeamIntensityChange}
                onSelectTeam={setSelectedTeamId}
                selectedTeamId={selectedTeamId}
              />
            </div>

            {/* Weather Status */}
            <div className="panel">
              <h2 className="panel-header flex items-center gap-2">
                <CloudLightning className="h-4 w-4" />
                Hurricane Midas
              </h2>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <div className="text-2xl font-bold">
                    {state?.weather.hurricane.category || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Trajectory</span>
                  <div className="text-lg font-semibold capitalize">
                    {state?.weather.hurricane.trajectory || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Hours to Impact</span>
                  <div className="text-lg font-semibold">
                    {state?.weather.hurricane.hoursToImpact === -1
                      ? 'Unknown'
                      : state?.weather.hurricane.hoursToImpact}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Certainty</span>
                  <div className="text-lg font-semibold">
                    {state?.weather.hurricane.certaintyPercent || 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Feed & Narrative */}
          <div className="md:col-span-2 lg:col-span-3 space-y-4">
            {/* Tempest Advisory */}
            <div className="panel">
              <h2 className="panel-header flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Tempest Advisory
              </h2>
              <p className="text-sm text-muted-foreground">
                {state?.intensity.tempestAdvisory || 'No advisory at this time.'}
              </p>
            </div>

            {/* Narrative Queue */}
            <div className="panel">
              <NarrativeQueue
                feedItems={feedItems}
                pendingItems={pendingFeedItems}
                onApprove={handleApproveFeed}
                onReject={handleRejectFeed}
                onInject={handleInjectFeed}
                teams={interventionTeams.map((t) => ({ id: t.id, name: t.name }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CrucibleMasterPage() {
  return (
    <ErrorBoundary>
      <CrucibleMasterPageContent />
    </ErrorBoundary>
  );
}
