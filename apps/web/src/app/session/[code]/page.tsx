'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConnectionLostOverlay } from '@/components/ui/ConnectionLostOverlay';
import { useColyseus } from '@/hooks/useColyseus';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PARISHES, PARISH_IDS, type ParishId } from '@crucible/shared/constants';
import { Loader2, Users, AlertCircle, Check, Map, Radio, FileText, Gauge, Clock } from 'lucide-react';

// Lobby components
import {
  LobbyHeader,
  WaitingRoom,
  type TeamMember,
  type ConnectionStatus,
} from '@/components/lobby';
import { Logo } from '@/components/Logo';

// Console components
import { ConcordiaMap } from '@/components/console/ConcordiaMap';
import { WeatherPanel } from '@/components/console/WeatherPanel';
import { ResourceDashboard } from '@/components/console/ResourceDashboard';
import { DecisionInterface } from '@/components/console/DecisionInterface';
import { DilemmaInterface } from '@/components/console/DilemmaInterface';
import { ProductionDashboard } from '@/components/console/ProductionDashboard';
import { SocialFeed } from '@/components/console/SocialFeed';
import { NewsTicker } from '@/components/console/NewsTicker';

// Pre-Crisis Discovery components
import {
  PreCrisisFlow,
  type IndividualValuesSubmission,
  type TeamValuesSubmission,
} from '@/components/pre-crisis/PreCrisisFlow';

// Debrief components
import { DecisionReview } from '@/components/debrief/DecisionReview';
import { ValuesAlignment } from '@/components/debrief/ValuesAlignment';
import { ReflectionPrompt } from '@/components/debrief/ReflectionPrompt';
import { DecisionTimeline, type TimelineDecision } from '@/components/debrief/DecisionTimeline';
import { ValuesGapReport, type ValueData, type PhaseData, type NotableMomentSummary } from '@/components/debrief/ValuesGapReport';
import { RationalizationCascade, type RationalizationStep } from '@/components/debrief/RationalizationCascade';
import { TransferReflection, type TransferReflectionData } from '@/components/debrief/TransferReflection';

// Crisis components
import { ValuesCheckIn } from '@/components/crisis/ValuesCheckIn';
import type { DilemmaPhase, CMInterventionLevel } from '@crucible/shared';

// Helper for rationalization step descriptions
function getRationalizationDescription(step: number): string {
  const descriptions: Record<number, string> = {
    1: 'Minimize or dismiss the risk',
    2: 'Frame risk as opportunity',
    3: 'Invoke mission to justify risk',
    4: 'Shift accountability elsewhere',
    5: 'Prioritize business obligations',
    6: 'Promise to fix later',
  };
  return descriptions[step] || 'Unknown step';
}

// Types for server debrief data
interface DebriefData {
  teamId: string;
  teamName: string;
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
  gapReport: {
    teamId: string;
    summary: {
      overallAlignment: number;
      biggestGap: { value: string; averageScore: number } | null;
      strongestAlignment: { value: string; averageScore: number } | null;
      gapMomentCount: number;
      consistencyMomentCount: number;
      totalDecisions: number;
    };
    alignmentByPhase: Array<{
      phase: DilemmaPhase;
      averageAlignment: number;
      decisionCount: number;
    }>;
    alignmentByValue: Array<{
      value: string;
      teamDefinition: string;
      averageScore: number;
      scoresByPhase: Array<{ phase: DilemmaPhase; score: number }>;
      trend: 'improving' | 'declining' | 'stable' | 'volatile';
      lowestPoint?: { decisionId: string; score: number; context: string };
    }>;
    notableMoments: Array<{
      decisionId: string;
      timestamp: number;
      phase: DilemmaPhase;
      category: 'gap' | 'consistency' | 'conflict' | 'growth';
      title: string;
      description: string;
      valuesInvolved: string[];
    }>;
    rationalizationPattern: {
      detected: boolean;
      steps: Array<{
        step: number;
        label: string;
        detected: boolean;
        evidence?: string;
        decisionContext?: string;
      }>;
      description: string;
      peakIntensity?: number;
    } | null;
  };
  error?: string;
}

function SessionPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  const participantName = searchParams.get('name') || 'Participant';

  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const [lobbyWaitTime, setLobbyWaitTime] = useState(0);
  const [debriefData, setDebriefData] = useState<DebriefData | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefTimeout, setDebriefTimeout] = useState(false);
  const debriefTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    room,
    connected,
    connecting,
    connectionExhausted,
    error,
    state,
    authStatus,
    authError,
    joinTeam,
    setTeamReady,
    sendDecision,
    submitTeamValues,
    reconnect,
  } = useColyseus({
    sessionCode: code,
    role: 'team',
    participantName,
  });

  const { updateFromSnapshot, setCurrentTeam, currentTeamId } = useGameStore();

  // Update store when state changes
  useEffect(() => {
    if (state) {
      updateFromSnapshot(state);
    }
  }, [state, updateFromSnapshot]);

  // Track lobby wait time
  useEffect(() => {
    if (state?.phase.current !== 'lobby') {
      setLobbyWaitTime(0);
      return;
    }

    const interval = setInterval(() => {
      setLobbyWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state?.phase.current]);

  // Request debrief data when entering debrief phase
  useEffect(() => {
    if (state?.phase.current === 'debrief' && currentTeamId && room && !debriefData && !debriefLoading && !debriefTimeout) {
      setDebriefLoading(true);
      room.send('debrief:requestData', { teamId: currentTeamId });

      // 30 second timeout
      debriefTimeoutRef.current = setTimeout(() => {
        setDebriefLoading(false);
        setDebriefTimeout(true);
        console.warn('[Debrief] Request timed out after 30 seconds');
      }, 30000);
    }

    return () => {
      if (debriefTimeoutRef.current) {
        clearTimeout(debriefTimeoutRef.current);
      }
    };
  }, [state?.phase.current, currentTeamId, room, debriefData, debriefLoading, debriefTimeout]);

  // Listen for debrief data response
  useEffect(() => {
    if (!room) return;

    const handleDebriefData = (data: DebriefData) => {
      // Clear timeout on success
      if (debriefTimeoutRef.current) {
        clearTimeout(debriefTimeoutRef.current);
        debriefTimeoutRef.current = null;
      }
      setDebriefLoading(false);
      setDebriefTimeout(false);
      if (!data.error) {
        setDebriefData(data);
      } else {
        console.error('[Debrief] Error:', data.error);
      }
    };

    room.onMessage('debrief:data', handleDebriefData);

    return () => {
      room.onMessage('debrief:data', () => {}); // Remove listener
    };
  }, [room]);

  // Handle parish selection and team join
  const handleJoinTeam = (parishId: string) => {
    setSelectedParish(parishId);
    joinTeam(parishId);
    setCurrentTeam(parishId);
  };

  // Mark team as ready
  const handleReady = () => {
    if (currentTeamId) {
      setTeamReady(currentTeamId, true);
    }
  };

  // Get team for a parish
  const getTeamForParish = (parishId: string) => {
    return state?.teams.get(parishId);
  };

  // Get current team and parish data
  const currentTeam = currentTeamId ? state?.teams.get(currentTeamId) : null;
  // Use team's parishId for lookup (clearer semantics, future-proof)
  const currentParish = currentTeam?.parishId
    ? state?.parishes.get(currentTeam.parishId)
    : null;
  const parishInfo = currentTeam?.parishId
    ? Object.values(PARISHES).find((p) => p.id === currentTeam.parishId)
    : null;

  // Loading state
  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Logo variant="icon" size="lg" linkToHome={false} />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-muted-foreground">Connecting to session {code}...</span>
          </div>
        </div>
      </div>
    );
  }

  // Auth/connection error state
  if (error || authError) {
    const isAuthError = authStatus === 'failed';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">
            {isAuthError ? 'Authentication Failed' : 'Connection Error'}
          </h2>
          <p className="text-muted-foreground">
            {authError || error?.message}
          </p>
          {isAuthError && (
            <p className="text-sm text-muted-foreground">
              This may happen if the session code is invalid or has expired.
            </p>
          )}
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Connection exhausted - show overlay with manual reconnect
  if (connectionExhausted) {
    return (
      <ConnectionLostOverlay
        onReconnect={reconnect}
        onGoHome={() => router.push('/')}
        reconnecting={connecting}
      />
    );
  }

  // Lobby phase - parish selection
  if (state?.phase.current === 'lobby') {
    // Build parish teams data for WaitingRoom component
    const parishTeams: Record<ParishId, TeamMember[]> = {} as Record<ParishId, TeamMember[]>;
    let totalPlayerCount = 0;
    let totalReadyCount = 0;

    PARISH_IDS.forEach((parishId) => {
      const team = state?.teams.get(parishId);
      const members: TeamMember[] = [];

      if (team) {
        team.members.forEach((memberId, idx) => {
          // Check if this member is ready (if team has readyMembers set)
          const isReady = team.ready || false; // For now, use team-level ready
          members.push({
            id: memberId,
            name: memberId === participantName ? participantName : `Player ${idx + 1}`,
            isReady,
            isCurrentUser: memberId === participantName,
            joinedAt: Date.now() - idx * 1000, // Approximate join order
          });
          totalPlayerCount++;
          if (isReady) totalReadyCount++;
        });
      }

      parishTeams[parishId] = members;
    });

    // Determine connection status
    const connectionStatus: ConnectionStatus = connected
      ? 'connected'
      : connecting
        ? 'connecting'
        : 'reconnecting';

    // Check if current user is ready
    const isCurrentUserReady = currentTeam?.ready || false;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        {/* Lobby Header */}
        <LobbyHeader
          sessionCode={code}
          connectionStatus={connectionStatus}
          participantCount={totalPlayerCount}
          onToggleSound={() => {
            // Sound toggle - will integrate with useSound hook later
            console.log('Sound toggled');
          }}
          onOpenSettings={() => {
            // Settings click - will show settings modal later
            console.log('Settings clicked');
          }}
        />

        {/* Waiting Room with Parish Selection */}
        <WaitingRoom
          selectedParish={(currentTeamId || selectedParish) as ParishId | null}
          parishTeams={parishTeams}
          maxPlayersPerTeam={5}
          currentUserId={participantName}
          isCurrentUserReady={isCurrentUserReady}
          totalReadyCount={totalReadyCount}
          totalPlayerCount={totalPlayerCount}
          onSelectParish={(parishId) => handleJoinTeam(parishId)}
          onToggleReady={handleReady}
        />

        {/* Waiting for CM indicator - shows after 60 seconds */}
        {currentTeamId && lobbyWaitTime > 60 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
              <span className="text-muted-foreground">
                Waiting for facilitator... ({Math.floor(lobbyWaitTime / 60)}:{(lobbyWaitTime % 60).toString().padStart(2, '0')})
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Discovery phase - full pre-crisis flow
  if (state?.phase.current === 'discovery') {
    // Build team participants array from state
    const teamParticipants = currentTeam?.members.map((memberId, idx) => ({
      participantId: memberId,
      name: `Participant ${idx + 1}`, // TODO: Get real names from client metadata
      topFive: undefined as string[] | undefined,
      valuesSubmitted: false,
    })) || [];

    // Add self if not in the list
    const selfInList = teamParticipants.some(p => p.name === participantName);
    if (!selfInList) {
      teamParticipants.push({
        participantId: 'self',
        name: participantName,
        topFive: undefined,
        valuesSubmitted: false,
      });
    }

    return (
      <PreCrisisFlow
        sessionCode={code}
        participantId={participantName} // Using name as ID for now
        participantName={participantName}
        teamId={currentTeamId || ''}
        teamName={currentTeam?.teamName || ''}
        parishId={currentTeam?.parishId || ''}
        parishName={parishInfo?.name || ''}
        teamParticipants={teamParticipants}
        onSubmitIndividualValues={(profile: IndividualValuesSubmission) => {
          if (room) {
            room.send('preCrisis:submitIndividualProfile', {
              participantId: profile.participantId,
              topFive: profile.topFive,
              valueMeanings: profile.valueMeanings,
              valuesStory: profile.valuesStory,
              selfIdentifiedValues: profile.selfIdentifiedValues,
              peerIdentifiedValues: profile.peerIdentifiedValues,
            });
          }
        }}
        onSubmitTeamValues={(profile: TeamValuesSubmission) => {
          if (currentTeamId && room) {
            room.send('preCrisis:submitTeamProfile', {
              teamId: currentTeamId,
              statedValues: profile.statedValues,
              valueDefinitions: profile.valueDefinitions,
              commitmentStatement: profile.commitmentStatement,
              decisionProcess: profile.decisionProcess,
              signatures: profile.signatures,
              readAloudAt: profile.readAloudAt,
            });
          }
        }}
        onReady={() => {
          if (currentTeamId) {
            setTeamReady(currentTeamId, true);
          }
        }}
        existingIndividualProfile={null}
        existingTeamProfile={null}
      />
    );
  }

  // Storm phase - full console
  if (state?.phase.current === 'storm' || state?.phase.current === 'recovery') {
    // Convert feed to expected format
    const feedItems = state.feed.map((f) => ({
      id: f.id,
      type: f.type as 'social' | 'news' | 'radio' | 'weather' | 'official',
      source: f.source,
      content: f.content,
      urgency: f.urgency,
      relatedParish: f.relatedParish,
      timestamp: f.timestamp,
      breaking: f.breaking,
    }));

    // News items for ticker
    const newsItems = feedItems
      .filter((f) => f.type === 'news' || f.breaking)
      .map((f) => ({
        id: f.id,
        content: f.content,
        breaking: f.breaking,
        timestamp: f.timestamp,
      }));

    // Convert parishes for map
    const parishesForMap: Record<string, {
      id: string;
      power: number;
      communications: number;
      morale: number;
      populationRemaining: number;
      casualties: number;
    }> = {};
    state.parishes.forEach((parish, id) => {
      parishesForMap[id] = {
        id,
        power: parish.status.power,
        communications: parish.status.communications,
        morale: parish.morale,
        populationRemaining: parish.status.populationRemaining,
        casualties: parish.status.casualties,
      };
    });

    // Check for active intervention for this team
    const activeIntervention = currentTeamId
      ? state.interventions?.get(currentTeamId)
      : undefined;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Values Check-In Intervention Overlay */}
        {activeIntervention && (
          <ValuesCheckIn
            level={activeIntervention.interventionType as CMInterventionLevel}
            teamCommitment={activeIntervention.commitmentText || currentTeam?.commitmentStatement}
            teamValues={currentTeam?.statedValues ? [...currentTeam.statedValues] : undefined}
            onComplete={() => {
              // Intervention will auto-clear on server, nothing needed here
            }}
          />
        )}

        {/* Top Bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold">{parishInfo?.name || 'Parish'} Command</h1>
              <span className="text-xs text-muted-foreground font-mono">
                T+{state.simulationTime} min
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Intensity: {state.intensity.global}/10</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    authStatus === 'authenticated' && connected
                      ? 'bg-status-safe'
                      : authStatus === 'authenticating'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-status-warning animate-pulse'
                  }`}
                />
                {authStatus === 'authenticated' && connected
                  ? 'Live'
                  : authStatus === 'authenticating'
                  ? 'Authenticating...'
                  : 'Reconnecting'}
              </div>
            </div>
          </div>

          {/* News Ticker */}
          <NewsTicker items={newsItems} />
        </header>

        {/* Main Content */}
        <div className="flex-1 p-2 md:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Left Column - Map & Weather (hidden on mobile, shown via tabs) */}
            <div className="hidden lg:block lg:col-span-4 space-y-4">
              <ConcordiaMap
                parishes={parishesForMap}
                selectedParish={currentTeamId}
                className="h-[300px]"
              />
              <WeatherPanel
                weather={{
                  hurricane: {
                    name: state.weather.hurricane.name,
                    category: state.weather.hurricane.category,
                    trajectory: state.weather.hurricane.trajectory,
                    certaintyPercent: state.weather.hurricane.certaintyPercent,
                    hoursToImpact: state.weather.hurricane.hoursToImpact,
                    hasLandfall: state.weather.hurricane.hasLandfall,
                    currentAdvisory: state.weather.hurricane.currentAdvisory,
                  },
                  windSpeed: state.weather.windSpeed,
                  rainfall: state.weather.rainfall,
                  visibility: state.weather.visibility,
                  conditions: state.weather.conditions,
                  stormSurge: state.weather.stormSurge,
                }}
              />
            </div>

            {/* Center Column - Decision Interface & Feed (full width on mobile) */}
            <div className="col-span-1 lg:col-span-5 space-y-4">
              <Tabs defaultValue="decisions" className="h-full flex flex-col">
                <TabsList className="w-full">
                  <TabsTrigger value="decisions" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Decisions
                  </TabsTrigger>
                  <TabsTrigger value="feed" className="flex-1">
                    <Radio className="h-4 w-4 mr-2" />
                    Feed
                  </TabsTrigger>
                  <TabsTrigger value="map" className="flex-1 lg:hidden">
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="decisions" className="flex-1 mt-4">
                  {/* Show DilemmaInterface if team has active dilemma, otherwise show waiting state */}
                  {currentTeam?.currentDilemma?.id ? (
                    <DilemmaInterface
                      dilemma={{
                        id: currentTeam.currentDilemma.id,
                        title: currentTeam.currentDilemma.title,
                        setupNarrative: currentTeam.currentDilemma.setupNarrative,
                        presenterPersona: currentTeam.currentDilemma.presenterPersona,
                        presentedAt: currentTeam.currentDilemma.presentedAt,
                        expiresAt: currentTeam.currentDilemma.expiresAt,
                        options: Array.from(currentTeam.currentDilemma.options || []).map(o => ({
                          id: o.id,
                          label: o.label,
                          description: o.description,
                        })),
                      }}
                      parishId={currentTeamId || ''}
                      onSubmitDecision={sendDecision}
                      disabled={!connected || state.phase.paused}
                    />
                  ) : (
                    <div className="panel text-center py-12">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Awaiting Situation</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        The next decision point will be presented shortly.
                        Review your resources and monitor the situation.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="feed" className="flex-1 mt-4">
                  <div className="panel h-full">
                    <h2 className="panel-header">Live Updates</h2>
                    <SocialFeed items={feedItems} />
                  </div>
                </TabsContent>

                <TabsContent value="map" className="flex-1 mt-4 lg:hidden">
                  <ConcordiaMap
                    parishes={parishesForMap}
                    selectedParish={currentTeamId}
                    className="h-full min-h-[400px]"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Resources & Production (collapsible on mobile) */}
            <div className="col-span-1 lg:col-span-3">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-4 pr-2">
                  {/* Production Dashboard - The business pressure */}
                  <ProductionDashboard
                    production={{
                      currentBatchId: state.production.currentBatchId,
                      batchProgress: state.production.batchProgress,
                      batchValue: state.production.batchValue,
                      batchEtaHours: state.production.batchEtaHours,
                      pipelineStatus: state.production.pipelineStatus as 'flowing' | 'blocked' | 'degraded',
                      bottleneck: state.production.bottleneck,
                      revenueImpact: state.production.revenueImpact,
                      productionHoursLost: state.production.productionHoursLost,
                      burnRateActive: state.production.burnRateActive,
                      quarterlyTarget: state.production.quarterlyTarget,
                      quarterlyProgress: state.production.quarterlyProgress,
                      daysRemainingInQuarter: state.production.daysRemainingInQuarter,
                      patientsAffected: state.production.patientsAffected,
                      childrenAffected: state.production.childrenAffected,
                      workersAtRisk: state.production.workersAtRisk,
                      workersEvacuated: state.production.workersEvacuated,
                      globalStockpileWeeks: state.production.globalStockpileWeeks,
                    }}
                  />

                  {/* Parish Resource Dashboard */}
                  {currentParish && (
                    <ResourceDashboard
                      parishId={currentTeamId || ''}
                      resources={{
                        generators: currentParish.resources.generators,
                        generatorsDeployed: currentParish.resources.generatorsDeployed,
                        medicalSupplies: currentParish.resources.medicalSupplies,
                        fuel: currentParish.resources.fuel,
                        food: currentParish.resources.food,
                        water: currentParish.resources.water,
                        shelterUsed: currentParish.resources.shelterUsed,
                        shelterCapacity: currentParish.resources.shelterCapacity,
                      }}
                      status={{
                        power: currentParish.status.power,
                        communications: currentParish.status.communications,
                        roads: currentParish.status.roads,
                        hospital: currentParish.status.hospital,
                        port: currentParish.status.port,
                        airport: currentParish.status.airport,
                        waterSystem: currentParish.status.waterSystem,
                        populationRemaining: currentParish.status.populationRemaining,
                        populationEvacuated: currentParish.status.populationEvacuated,
                        casualties: currentParish.status.casualties,
                        injured: currentParish.status.injured,
                      }}
                      morale={currentParish.morale}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Paused Overlay */}
        {state.phase.paused && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="panel text-center">
              <h2 className="text-2xl font-bold mb-2">Simulation Paused</h2>
              <p className="text-muted-foreground">
                The Crucible Master has paused the simulation.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Briefing phase
  if (state?.phase.current === 'briefing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-2xl text-center space-y-6">
          <h2 className="text-2xl font-bold">Storm Briefing</h2>
          <div className="text-left space-y-4 text-sm">
            <p>
              <strong>Situation:</strong> Hurricane {state.weather.hurricane.name} is
              approaching Concordia. Your team is responsible for managing{' '}
              <strong>{parishInfo?.name}</strong>.
            </p>
            <p>
              <strong>Your Parish:</strong> {parishInfo?.description}. Population:{' '}
              {parishInfo?.population.toLocaleString()}.
            </p>
            <p>
              <strong>Your Values:</strong>{' '}
              {currentTeam?.statedValues.length
                ? currentTeam.statedValues.join(', ')
                : 'Not yet defined'}
            </p>
            <p>
              <strong>Decision Process:</strong> {currentTeam?.decisionProcess || 'Consensus'}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Waiting for Crucible Master to begin the simulation...
          </p>
        </div>
      </div>
    );
  }

  // Debrief phase
  if (state?.phase.current === 'debrief') {
    const teamDecisions = state.decisions.filter((d) => d.teamId === currentTeamId);

    // Show loading state while fetching debrief data from server
    if (debriefLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading debrief analysis...</p>
          </div>
        </div>
      );
    }

    // Show timeout state with retry option
    if (debriefTimeout) {
      const retryDebriefLoad = () => {
        setDebriefTimeout(false);
        setDebriefLoading(false);
        setDebriefData(null);
      };

      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="panel max-w-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Debrief Load Failed</h2>
            <p className="text-muted-foreground">
              Could not load debrief analysis. The server may be processing other requests.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={retryDebriefLoad}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Use server data if available, otherwise use fallbacks
    const serverDecisions = debriefData?.decisions || [];

    // Transform decisions to timeline format using server data
    const timelineDecisions: TimelineDecision[] = serverDecisions.map((d) => {
      // Determine phase based on simulation time (rough mapping)
      let phase: DilemmaPhase = 'watch';
      if (d.simulationTime > 180) phase = 'recovery';
      else if (d.simulationTime > 60) phase = 'crisis';

      // Determine alignment from server values analysis
      let alignment: 'positive' | 'neutral' | 'negative' = 'neutral';
      const valuesAnalysis = d.valuesAnalysis?.statedValuesAnalysis || [];
      if (valuesAnalysis.length > 0) {
        const avgAlignment = valuesAnalysis.reduce((sum, v) => sum + v.alignment, 0) / valuesAnalysis.length;
        if (avgAlignment > 0.5) alignment = 'positive';
        else if (avgAlignment < -0.5) alignment = 'negative';
      }

      // Find matching Colyseus decision for additional fields
      const colyseusDecision = teamDecisions.find((cd) => cd.id === d.id);

      return {
        id: d.id,
        timestamp: d.simulationTime * 60, // Convert to seconds
        phase,
        title: colyseusDecision?.decisionTypeId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Decision',
        choice: d.choice,
        rationale: d.rationale,
        isNotable: d.notableMoment || false,
        notableCategory: d.notableReason?.includes('gap') ? 'gap' as const :
                         d.notableReason?.includes('consistency') ? 'consistency' as const :
                         d.notableReason?.includes('conflict') ? 'conflict' as const :
                         d.notableReason?.includes('growth') ? 'growth' as const : undefined,
        notableReason: d.notableReason || undefined,
        valuesAlignment: alignment,
      };
    });

    // Use server gap report data for values
    const gapReport = debriefData?.gapReport;
    const valuesData: ValueData[] = gapReport?.alignmentByValue?.map((va) => ({
      value: va.value,
      definition: va.teamDefinition || `Team definition for ${va.value}`,
      averageScore: va.averageScore,
      byPhase: va.scoresByPhase?.map((sp) => ({ phase: sp.phase, score: sp.score })) || [],
      trend: va.trend,
      lowestPoint: va.lowestPoint ? { context: va.lowestPoint.context, score: va.lowestPoint.score } : undefined,
    })) || [];

    // Use server phase data
    const phaseData: PhaseData[] = gapReport?.alignmentByPhase?.map((ap) => ({
      phase: ap.phase,
      averageAlignment: ap.averageAlignment,
      decisionCount: ap.decisionCount,
    })) || [];

    // Use server notable moments
    const notableMoments: NotableMomentSummary[] = gapReport?.notableMoments?.map((nm) => ({
      title: nm.title,
      phase: nm.phase,
      category: nm.category,
      description: nm.description,
    })) || [];

    // Use server summary data
    const overallAlignment = gapReport?.summary?.overallAlignment || 0;
    const biggestGap = gapReport?.summary?.biggestGap
      ? { value: gapReport.summary.biggestGap.value, score: gapReport.summary.biggestGap.averageScore }
      : undefined;
    const strongestAlignment = gapReport?.summary?.strongestAlignment
      ? { value: gapReport.summary.strongestAlignment.value, score: gapReport.summary.strongestAlignment.averageScore }
      : undefined;

    // Use server rationalization pattern data
    const rationalizationPattern = gapReport?.rationalizationPattern;
    const rationalizationSteps: RationalizationStep[] = rationalizationPattern?.steps?.map((s) => ({
      stepNumber: s.step,
      label: s.label,
      description: getRationalizationDescription(s.step),
      detected: s.detected,
      evidence: s.evidence,
      decisionContext: s.decisionContext,
    })) || [
      { stepNumber: 1, label: 'Denial of threat', description: 'Minimize or dismiss the risk', detected: false },
      { stepNumber: 2, label: 'Appeal to benefit', description: 'Frame risk as opportunity', detected: false },
      { stepNumber: 3, label: 'Higher purpose', description: 'Invoke mission to justify risk', detected: false },
      { stepNumber: 4, label: 'Diffusion of responsibility', description: 'Shift accountability elsewhere', detected: false },
      { stepNumber: 5, label: 'Economic necessity', description: 'Prioritize business obligations', detected: false },
      { stepNumber: 6, label: 'Future remedy', description: 'Promise to fix later', detected: false },
    ];

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Debrief: {parishInfo?.name}</h1>
            <p className="text-muted-foreground">
              The storm has passed. Reflect on your team&apos;s decisions and values alignment.
            </p>
          </header>

          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="timeline">Decision Timeline</TabsTrigger>
              <TabsTrigger value="gap-report">Values Gap Report</TabsTrigger>
              <TabsTrigger value="cascade">Rationalization Cascade</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Decision Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <div className="panel">
                <DecisionTimeline
                  teamName={currentTeam?.teamName || 'Your Team'}
                  decisions={timelineDecisions}
                />
              </div>
            </TabsContent>

            {/* Values Gap Report Tab */}
            <TabsContent value="gap-report" className="space-y-6">
              <div className="panel">
                <ValuesGapReport
                  teamName={currentTeam?.teamName || 'Your Team'}
                  commitmentText={currentTeam?.commitmentStatement || 'No commitment recorded'}
                  values={valuesData}
                  phaseData={phaseData}
                  notableMoments={notableMoments}
                  overallAlignment={overallAlignment}
                  biggestGap={biggestGap}
                  strongestAlignment={strongestAlignment}
                />
              </div>
            </TabsContent>

            {/* Rationalization Cascade Tab */}
            <TabsContent value="cascade" className="space-y-6">
              <div className="panel">
                <RationalizationCascade
                  detected={rationalizationPattern?.detected || rationalizationSteps.some(s => s.detected)}
                  steps={rationalizationSteps}
                  peakIntensity={rationalizationPattern?.peakIntensity}
                  description={rationalizationPattern?.description}
                />
              </div>
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="space-y-6">
              <div className="panel">
                <TransferReflection
                  teamName={currentTeam?.teamName || 'Your Team'}
                  teamValues={currentTeam?.statedValues ? [...currentTeam.statedValues] : []}
                  participantName={participantName}
                  onSubmit={(reflection: TransferReflectionData) => {
                    room?.send('debrief:submitTransferReflection', {
                      teamId: currentTeamId,
                      ...reflection,
                    });
                  }}
                />
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Decision Review */}
                <div className="lg:col-span-2 panel">
                  <DecisionReview
                    decisions={state.decisions}
                    teamId={currentTeamId || ''}
                    statedValues={currentTeam?.statedValues || []}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Values Alignment */}
                  <div className="panel">
                    <ValuesAlignment
                      statedValues={currentTeam?.statedValues || []}
                      decisions={teamDecisions}
                    />
                  </div>

                  {/* Final Stats */}
                  <div className="panel">
                    <h3 className="font-semibold text-lg mb-4">Final Status</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Population</span>
                        <div className="text-xl font-bold">
                          {currentParish?.status.populationRemaining.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Evacuated</span>
                        <div className="text-xl font-bold text-status-safe">
                          {currentParish?.status.populationEvacuated.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Casualties</span>
                        <div className="text-xl font-bold text-destructive">
                          {currentParish?.status.casualties}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Decisions Made</span>
                        <div className="text-xl font-bold">
                          {teamDecisions.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reflection */}
                  <div className="panel">
                    <ReflectionPrompt
                      teamId={currentTeamId || ''}
                      participantName={participantName}
                      onSubmit={(reflection) => {
                        room?.send('reflection:submit', {
                          teamId: currentTeamId,
                          participantName,
                          ...reflection,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Default/connecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <ErrorBoundary>
      <SessionPageContent />
    </ErrorBoundary>
  );
}
