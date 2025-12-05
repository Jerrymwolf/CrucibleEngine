'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useColyseus } from '@/hooks/useColyseus';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PARISHES, INTENSITY_LEVELS, DIRECTIVE_TYPES } from '@crucible/shared';
import {
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Users,
  Gauge,
  Radio,
  CloudLightning,
  MessageSquare,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function CrucibleMasterPage() {
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
    setPhase,
    setIntensity,
    setTeamIntensity,
    togglePause,
    sendDirective,
  } = useColyseus({
    sessionCode: code,
    role: 'cm',
    participantName: cmName,
  });

  // Directive form state
  const [directiveType, setDirectiveType] = useState<string>('');
  const [directiveContent, setDirectiveContent] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const { updateFromSnapshot } = useGameStore();

  // Update store when state changes
  useEffect(() => {
    if (state) {
      updateFromSnapshot(state);
    }
  }, [state, updateFromSnapshot]);

  // Loading state
  if (connecting) {
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

  const currentPhase = state?.phase.current || 'lobby';
  const isPaused = state?.phase.paused || false;
  const globalIntensity = state?.intensity.global || 5;
  const simulationTime = state?.simulationTime || 0;

  // Count total participants
  let totalParticipants = 0;
  state?.teams.forEach((team) => {
    totalParticipants += team.members.length;
  });

  // Get teams as array
  const teamsArray = state?.teams ? Array.from(state.teams.values()) : [];

  // Phase buttons config
  const phases = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'discovery', label: 'Discovery' },
    { id: 'briefing', label: 'Briefing' },
    { id: 'storm', label: 'Storm' },
    { id: 'recovery', label: 'Recovery' },
    { id: 'debrief', label: 'Debrief' },
  ];

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

            {/* Pause/Play */}
            {(currentPhase === 'storm' || currentPhase === 'recovery') && (
              <Button
                variant={isPaused ? 'default' : 'secondary'}
                size="sm"
                onClick={() => togglePause()}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}

            {/* Connection Status */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-status-safe' : 'bg-status-warning animate-pulse'
                }`}
              />
              {connected ? 'Connected' : 'Reconnecting'}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-2 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Phase & Controls */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4">
            {/* Phase Control */}
            <div className="panel">
              <h2 className="panel-header">Session Phase</h2>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <Button
                    key={phase.id}
                    variant={currentPhase === phase.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setPhase(phase.id)}
                  >
                    {phase.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Intensity Control */}
            <div className="panel">
              <h2 className="panel-header flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Global Intensity
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{globalIntensity}</span>
                  <span className="text-sm text-muted-foreground">
                    {INTENSITY_LEVELS[globalIntensity as keyof typeof INTENSITY_LEVELS]?.name}
                  </span>
                </div>
                <Slider
                  value={[globalIntensity]}
                  onValueChange={(value) => setIntensity(value[0] ?? 5)}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  {INTENSITY_LEVELS[globalIntensity as keyof typeof INTENSITY_LEVELS]?.description}
                </p>
              </div>
            </div>

            {/* Participants Count */}
            <div className="panel">
              <h2 className="panel-header flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
              </h2>
              <div className="text-3xl font-bold">{totalParticipants}</div>
              <div className="text-sm text-muted-foreground">
                across {teamsArray.length} team{teamsArray.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Directive Panel */}
            <div className="panel">
              <h2 className="panel-header flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Send Directive
              </h2>
              <div className="space-y-3">
                <Select value={directiveType} onValueChange={setDirectiveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Directive type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIVE_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-1">
                  {teamsArray.map((team) => (
                    <Button
                      key={team.id}
                      size="sm"
                      variant={selectedTeams.includes(team.id) ? 'default' : 'outline'}
                      onClick={() => toggleTeamSelection(team.id)}
                    >
                      {team.teamName || team.parishId}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant={selectedTeams.length === teamsArray.length ? 'default' : 'outline'}
                    onClick={() => setSelectedTeams(teamsArray.map(t => t.id))}
                  >
                    All
                  </Button>
                </div>

                <Textarea
                  placeholder="Directive content..."
                  value={directiveContent}
                  onChange={(e) => setDirectiveContent(e.target.value)}
                  rows={3}
                />

                <Button
                  className="w-full"
                  disabled={!directiveType || selectedTeams.length === 0 || !directiveContent.trim()}
                  onClick={() => {
                    sendDirective({
                      type: directiveType,
                      targetTeams: selectedTeams,
                      content: directiveContent,
                    });
                    setDirectiveContent('');
                    setDirectiveType('');
                    setSelectedTeams([]);
                  }}
                >
                  Send Directive
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content - Team Overview */}
          <div className="md:col-span-1 lg:col-span-6 space-y-4">
            {/* Parish/Team Grid */}
            <div className="panel">
              <h2 className="panel-header">Team Status</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(PARISHES).map((parish) => {
                  const team = state?.teams.get(parish.id);
                  const parishState = state?.parishes.get(parish.id);
                  const teamIntensity = state?.intensity.byTeam.get(parish.id) ?? state?.intensity.global ?? 5;

                  return (
                    <div
                      key={parish.id}
                      className="p-3 rounded-lg border border-border bg-background/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{parish.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {team?.teamName || 'No team'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{team?.members.length || 0}</span>
                        </div>
                      </div>

                      {parishState && (
                        <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">Power</span>
                            <div className="font-mono">{parishState.status.power}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comms</span>
                            <div className="font-mono">{parishState.status.communications}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Morale</span>
                            <div className="font-mono">{parishState.morale}%</div>
                          </div>
                        </div>
                      )}

                      {/* Team Intensity Slider */}
                      {team && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Team Intensity</span>
                            <span className="font-mono">{teamIntensity}/10</span>
                          </div>
                          <Slider
                            value={[teamIntensity]}
                            onValueChange={(value) => setTeamIntensity(parish.id, value[0] ?? 5)}
                            min={1}
                            max={10}
                            step={1}
                            className="h-1"
                          />
                        </div>
                      )}

                      {team?.ready && (
                        <div className="mt-2 text-xs text-status-safe">Ready</div>
                      )}
                    </div>
                  );
                })}
              </div>
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

          {/* Right Sidebar - Feed & Tempest */}
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

            {/* Live Feed */}
            <div className="panel flex-1">
              <h2 className="panel-header">Live Feed</h2>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {state?.feed.slice(-20).reverse().map((item) => (
                    <div
                      key={item.id}
                      className={`text-xs p-2 rounded ${
                        item.breaking ? 'bg-destructive/20 border border-destructive' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="uppercase">{item.type}</span>
                        <span>{item.source}</span>
                      </div>
                      <p className="mt-1">{item.content}</p>
                    </div>
                  ))}
                  {(!state?.feed || state.feed.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No feed items yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
