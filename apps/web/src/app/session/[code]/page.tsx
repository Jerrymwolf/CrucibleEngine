'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useColyseus } from '@/hooks/useColyseus';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PARISHES } from '@crucible/shared';
import { Loader2, Users, AlertCircle, Check, Map, Radio, FileText, Gauge } from 'lucide-react';
import { Logo } from '@/components/Logo';

// Console components
import { ConcordiaMap } from '@/components/console/ConcordiaMap';
import { WeatherPanel } from '@/components/console/WeatherPanel';
import { ResourceDashboard } from '@/components/console/ResourceDashboard';
import { DecisionInterface } from '@/components/console/DecisionInterface';
import { SocialFeed } from '@/components/console/SocialFeed';
import { NewsTicker } from '@/components/console/NewsTicker';

// Discovery components
import { ValuesDiscovery, type ValuesDiscoveryData } from '@/components/discovery/ValuesDiscovery';

// Debrief components
import { DecisionReview } from '@/components/debrief/DecisionReview';
import { ValuesAlignment } from '@/components/debrief/ValuesAlignment';
import { ReflectionPrompt } from '@/components/debrief/ReflectionPrompt';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  const participantName = searchParams.get('name') || 'Participant';

  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const {
    room,
    connected,
    connecting,
    error,
    state,
    joinTeam,
    setTeamReady,
    sendDecision,
    submitTeamValues,
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Connection Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Lobby phase - parish selection
  if (state?.phase.current === 'lobby') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Logo variant="icon" size="sm" />
              <div>
                <h1 className="text-lg font-semibold">The Values Crucible</h1>
                <p className="text-xs text-muted-foreground">
                  Session: <span className="font-mono text-primary">{code}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Welcome, {participantName}</p>
          </header>

          {/* Parish Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Select Your Parish</h2>
            <p className="text-center text-muted-foreground text-sm">
              Choose the parish your team will manage during the crisis
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(PARISHES).map((parish) => {
                const team = getTeamForParish(parish.id);
                const isSelected = selectedParish === parish.id || currentTeamId === parish.id;
                const memberCount = team?.members.length || 0;

                return (
                  <button
                    key={parish.id}
                    onClick={() => handleJoinTeam(parish.id)}
                    className={`panel text-left transition-all hover:border-primary ${
                      isSelected ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{parish.name}</h3>
                        <p className="text-sm text-muted-foreground">{parish.description}</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Pop: {parish.population.toLocaleString()} | Generators: {parish.resources.generators}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ready Button */}
          {currentTeamId && (
            <div className="text-center space-y-4">
              <Button size="lg" onClick={handleReady} className="px-8">
                I'm Ready
              </Button>
              <p className="text-sm text-muted-foreground">
                Waiting for Crucible Master to start the session...
              </p>
            </div>
          )}

          {/* Connection Status */}
          <div className="text-center text-xs text-muted-foreground">
            {connected ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-status-safe" />
                Connected
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-status-warning animate-pulse" />
                Reconnecting...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Discovery phase - values discovery
  if (state?.phase.current === 'discovery') {
    return (
      <ValuesDiscovery
        teamId={currentTeamId || ''}
        teamName={currentTeam?.teamName || ''}
        parishName={parishInfo?.name || ''}
        onSubmitValues={(data: ValuesDiscoveryData) => {
          if (currentTeamId && room) {
            // Send all discovery data to server
            room.send('team:submitDiscoveryData', {
              teamId: currentTeamId,
              values: data.values,
              commitmentStatement: data.commitmentStatement,
              decisionProcess: data.decisionProcess,
            });
          }
        }}
        onReady={() => {
          if (currentTeamId) {
            setTeamReady(currentTeamId, true);
          }
        }}
        existingValues={currentTeam?.statedValues || []}
        isReady={currentTeam?.ready || false}
      />
    );
  }

  // Storm phase - full console
  if (state?.phase.current === 'storm' || state?.phase.current === 'recovery') {
    // Convert feed to expected format
    const feedItems = state.feed.map((f) => ({
      id: f.id,
      type: f.type,
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

    return (
      <div className="min-h-screen bg-background flex flex-col">
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
                    connected ? 'bg-status-safe' : 'bg-status-warning animate-pulse'
                  }`}
                />
                {connected ? 'Live' : 'Reconnecting'}
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
                  <DecisionInterface
                    parishId={currentTeamId || ''}
                    onSubmitDecision={sendDecision}
                    disabled={!connected || state.phase.paused}
                  />
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

            {/* Right Column - Resources (collapsible on mobile) */}
            <div className="col-span-1 lg:col-span-3">
              <ScrollArea className="h-[calc(100vh-180px)]">
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

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Debrief: {parishInfo?.name}</h1>
            <p className="text-muted-foreground">
              The storm has passed. Reflect on your team&apos;s decisions and values alignment.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Decision Timeline */}
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
