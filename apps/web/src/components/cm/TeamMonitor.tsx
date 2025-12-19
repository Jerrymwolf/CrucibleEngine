'use client';

/**
 * TeamMonitor Component
 *
 * Grid display of all teams with real-time status indicators.
 * Allows facilitators to monitor team health, progress, and engagement.
 *
 * Features:
 * - Team cards with parish info
 * - Member count and ready status
 * - Infrastructure status bars
 * - Per-team intensity controls
 * - Decision count and activity indicators
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Users,
  Zap,
  Radio,
  MapPin,
  Heart,
  Anchor,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PARISHES } from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
}

export interface TeamStatus {
  power: number;
  communications: number;
  roads: number;
  hospital: number;
  port: number;
}

export interface TeamData {
  id: string;
  parishId: string;
  teamName: string;
  members: TeamMember[];
  ready: boolean;
  status: TeamStatus;
  morale: number;
  decisionCount: number;
  lastActivityTime: number;
  currentIntensity: number;
  activeDecision?: string;
}

export interface TeamMonitorProps {
  teams: TeamData[];
  currentPhase: string;
  onIntensityChange: (teamId: string, intensity: number) => void;
  onSelectTeam?: (teamId: string) => void;
  selectedTeamId?: string;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBar({
  label,
  value,
  icon: Icon,
  color = 'primary',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'primary' | 'danger' | 'warning' | 'safe';
}) {
  const getBarColor = () => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function ActivityIndicator({ lastActivityTime }: { lastActivityTime: number }) {
  const minutesAgo = Math.floor((Date.now() - lastActivityTime) / 1000 / 60);

  const getStatus = () => {
    if (minutesAgo < 2) return { color: 'text-green-500', label: 'Active' };
    if (minutesAgo < 5) return { color: 'text-amber-500', label: `${minutesAgo}m ago` };
    return { color: 'text-red-500', label: `${minutesAgo}m ago` };
  };

  const status = getStatus();

  return (
    <div className={cn('flex items-center gap-1 text-xs', status.color)}>
      <Activity className="h-3 w-3" />
      <span>{status.label}</span>
    </div>
  );
}

function TeamCard({
  team,
  parish,
  isSelected,
  currentPhase,
  onIntensityChange,
  onSelect,
}: {
  team: TeamData;
  parish: (typeof PARISHES)[keyof typeof PARISHES];
  isSelected: boolean;
  currentPhase: string;
  onIntensityChange: (intensity: number) => void;
  onSelect: () => void;
}) {
  const { play: playSound } = useSound();
  const [expanded, setExpanded] = useState(false);

  const connectedCount = team.members.filter((m) => m.connected).length;
  const readyCount = team.members.filter((m) => m.ready).length;

  const handleClick = () => {
    playSound('ui', 'click');
    onSelect();
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
    playSound('ui', 'click');
  };

  const showCrisisControls = ['storm', 'recovery', 'briefing'].includes(currentPhase);

  // Calculate overall health
  const avgStatus =
    (team.status.power +
      team.status.communications +
      team.status.roads +
      team.status.hospital +
      team.status.port) /
    5;

  const getHealthColor = () => {
    if (avgStatus >= 70) return 'border-green-500/30';
    if (avgStatus >= 40) return 'border-amber-500/30';
    return 'border-red-500/30';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
        isSelected ? 'border-primary bg-primary/5' : getHealthColor(),
        'hover:shadow-lg'
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{parish.name}</h3>
            <p className="text-xs text-muted-foreground">
              {team.teamName || 'Unnamed Team'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {connectedCount}/{team.members.length}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs mb-3">
          <ActivityIndicator lastActivityTime={team.lastActivityTime} />

          {team.ready ? (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </span>
          ) : (
            <span className="text-muted-foreground">
              {readyCount}/{team.members.length} ready
            </span>
          )}
        </div>

        {/* Decision Count */}
        {showCrisisControls && (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg mb-3">
            <span className="text-xs text-muted-foreground">Decisions</span>
            <span className="text-lg font-bold">{team.decisionCount}</span>
          </div>
        )}

        {/* Infrastructure Status (Mini) */}
        {showCrisisControls && (
          <div className="grid grid-cols-5 gap-1 mb-3">
            {[
              { icon: Zap, value: team.status.power },
              { icon: Radio, value: team.status.communications },
              { icon: MapPin, value: team.status.roads },
              { icon: Heart, value: team.status.hospital },
              { icon: Anchor, value: team.status.port },
            ].map((item, i) => (
              <div
                key={i}
                className={cn(
                  'p-1.5 rounded text-center',
                  item.value >= 70
                    ? 'bg-green-500/10 text-green-500'
                    : item.value >= 40
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-red-500/10 text-red-500'
                )}
              >
                <item.icon className="h-3 w-3 mx-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Morale */}
        {showCrisisControls && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Morale</span>
              <span className="font-mono">{team.morale}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  team.morale >= 70
                    ? 'bg-green-500'
                    : team.morale >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${team.morale}%` }}
              />
            </div>
          </div>
        )}

        {/* Expand Button */}
        <button
          type="button"
          onClick={handleExpand}
          className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{expanded ? 'Less' : 'More'}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
          >
            <div className="p-4 space-y-4">
              {/* Full Status Bars */}
              {showCrisisControls && (
                <div className="space-y-2">
                  <StatusBar
                    label="Power"
                    value={team.status.power}
                    icon={Zap}
                  />
                  <StatusBar
                    label="Comms"
                    value={team.status.communications}
                    icon={Radio}
                  />
                  <StatusBar
                    label="Roads"
                    value={team.status.roads}
                    icon={MapPin}
                  />
                  <StatusBar
                    label="Hospital"
                    value={team.status.hospital}
                    icon={Heart}
                  />
                  <StatusBar
                    label="Port"
                    value={team.status.port}
                    icon={Anchor}
                  />
                </div>
              )}

              {/* Team Intensity Slider */}
              {showCrisisControls && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Team Intensity</span>
                    <span className="font-mono font-bold">
                      {team.currentIntensity}/10
                    </span>
                  </div>
                  <Slider
                    value={[team.currentIntensity]}
                    onValueChange={(v) => onIntensityChange(v[0] ?? 5)}
                    min={1}
                    max={10}
                    step={1}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Members List */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Members</div>
                <div className="space-y-1">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className={!member.connected ? 'text-muted-foreground' : ''}>
                        {member.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {!member.connected && (
                          <span className="text-red-500">Disconnected</span>
                        )}
                        {member.ready && member.connected && (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Decision */}
              {team.activeDecision && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
                  <span className="text-amber-500 font-medium">Deciding: </span>
                  <span className="text-muted-foreground">{team.activeDecision}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamMonitor({
  teams,
  currentPhase,
  onIntensityChange,
  onSelectTeam,
  selectedTeamId,
  className,
}: TeamMonitorProps) {
  const { play: playSound } = useSound();

  // Get all parishes
  const parishes = Object.values(PARISHES);

  // Count totals
  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);
  const connectedMembers = teams.reduce(
    (sum, t) => sum + t.members.filter((m) => m.connected).length,
    0
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Team Status
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {connectedMembers}/{totalMembers} connected
          </span>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parishes.map((parish) => {
          const team = teams.find((t) => t.parishId === parish.id);

          if (!team) {
            // Empty parish slot
            return (
              <div
                key={parish.id}
                className="p-4 rounded-xl border border-dashed border-muted opacity-50"
              >
                <h3 className="font-semibold text-muted-foreground">{parish.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">No team assigned</p>
              </div>
            );
          }

          return (
            <TeamCard
              key={team.id}
              team={team}
              parish={parish}
              isSelected={selectedTeamId === team.id}
              currentPhase={currentPhase}
              onIntensityChange={(intensity) => onIntensityChange(team.parishId, intensity)}
              onSelect={() => onSelectTeam?.(team.id)}
            />
          );
        })}
      </div>

      {/* No Teams Message */}
      {teams.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No teams have joined yet</p>
          <p className="text-xs mt-1">Share the session code to invite participants</p>
        </div>
      )}
    </div>
  );
}

export default TeamMonitor;
