'use client';

/**
 * InterventionPanel Component
 *
 * Panel for triggering values-based interventions during the simulation.
 * Provides quick access to Flash, Moment, and Mirror interventions.
 *
 * Features:
 * - Three intervention types with descriptions
 * - Per-team or global targeting
 * - Usage tracking and recommendations
 * - Cool-down indicators
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Zap,
  Clock,
  Eye,
  Users,
  AlertTriangle,
  ChevronRight,
  History,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// ============================================================================
// TYPES
// ============================================================================

export type InterventionType = 'flash' | 'moment' | 'mirror';

export interface InterventionHistory {
  id: string;
  type: InterventionType;
  teamId: string;
  teamName: string;
  timestamp: number;
  triggered: boolean;
}

export interface TeamOption {
  id: string;
  name: string;
  parishId: string;
  lastIntervention?: number;
  interventionCount: number;
}

export interface InterventionPanelProps {
  teams: TeamOption[];
  history: InterventionHistory[];
  maxInterventions?: number; // Recommended max per session
  onTrigger: (teamIds: string[], type: InterventionType) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INTERVENTION_TYPES: {
  id: InterventionType;
  label: string;
  duration: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
  purpose: string;
}[] = [
  {
    id: 'flash',
    label: 'Flash',
    duration: '10 seconds',
    icon: Zap,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    description: 'Quick values reminder',
    purpose: 'Brief pause to recall stated values before a decision',
  },
  {
    id: 'moment',
    label: 'Moment',
    duration: '2 minutes',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    description: 'Reflection break',
    purpose: 'Team discusses how their recent decisions align with values',
  },
  {
    id: 'mirror',
    label: 'Mirror',
    duration: '3 minutes',
    icon: Eye,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    description: 'Deep reflection',
    purpose: 'Shows the gap between stated values and current actions',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InterventionTypeCard({
  type,
  isSelected,
  onSelect,
}: {
  type: (typeof INTERVENTION_TYPES)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { play: playSound } = useSound();
  const Icon = type.icon;

  const handleSelect = () => {
    playSound('ui', 'click');
    onSelect();
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        'p-4 rounded-xl border-2 text-left transition-all',
        isSelected
          ? `${type.bg} border-${type.color.replace('text-', '')}/40`
          : 'border-border hover:border-muted-foreground/30'
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('p-2 rounded-lg', type.bg)}>
          <Icon className={cn('h-5 w-5', type.color)} />
        </div>
        <div>
          <div className="font-semibold">{type.label}</div>
          <div className="text-xs text-muted-foreground">{type.duration}</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{type.description}</p>
    </button>
  );
}

function TeamSelector({
  teams,
  selectedTeams,
  onToggle,
  onSelectAll,
}: {
  teams: TeamOption[];
  selectedTeams: Set<string>;
  onToggle: (teamId: string) => void;
  onSelectAll: () => void;
}) {
  const { play: playSound } = useSound();

  const handleToggle = (teamId: string) => {
    playSound('ui', 'click');
    onToggle(teamId);
  };

  const handleSelectAll = () => {
    playSound('ui', 'click');
    onSelectAll();
  };

  const allSelected = teams.every((t) => selectedTeams.has(t.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Target Teams</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="text-xs"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => {
          const isSelected = selectedTeams.has(team.id);
          const recentIntervention =
            team.lastIntervention && Date.now() - team.lastIntervention < 300000; // 5 min cooldown

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => handleToggle(team.id)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/30',
                recentIntervention && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox checked={isSelected} />
                <span className="font-medium text-sm">{team.name}</span>
              </div>
              {recentIntervention && (
                <p className="text-xs text-amber-500 mt-1">
                  Recently intervened
                </p>
              )}
              {team.interventionCount > 0 && !recentIntervention && (
                <p className="text-xs text-muted-foreground mt-1">
                  {team.interventionCount} intervention
                  {team.interventionCount !== 1 ? 's' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UsageIndicator({
  used,
  recommended,
}: {
  used: number;
  recommended: number;
}) {
  const percentage = (used / recommended) * 100;
  const isOverUsed = used >= recommended;

  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Session Usage</span>
        <span
          className={cn(
            'text-sm font-medium',
            isOverUsed ? 'text-amber-500' : 'text-foreground'
          )}
        >
          {used} / {recommended}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverUsed ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isOverUsed && (
        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Consider using interventions sparingly
        </p>
      )}
    </div>
  );
}

function HistoryList({ history }: { history: InterventionHistory[] }) {
  const recentHistory = history.slice(-10).reverse();

  if (recentHistory.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No interventions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {recentHistory.map((item) => {
        const type = INTERVENTION_TYPES.find((t) => t.id === item.type);
        const Icon = type?.icon || Clock;
        const timeAgo = Math.floor((Date.now() - item.timestamp) / 1000 / 60);

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/20"
          >
            <Icon className={cn('h-4 w-4', type?.color)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{type?.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {item.teamName}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InterventionPanel({
  teams,
  history,
  maxInterventions = 5,
  onTrigger,
  disabled = false,
  className,
}: InterventionPanelProps) {
  const [selectedType, setSelectedType] = useState<InterventionType>('flash');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const { play: playSound } = useSound();

  const totalUsed = history.length;
  const selectedTypeInfo = INTERVENTION_TYPES.find((t) => t.id === selectedType);

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTeams.size === teams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(teams.map((t) => t.id)));
    }
  };

  const handleTrigger = () => {
    if (selectedTeams.size === 0) return;

    playSound('dramatic', 'interventionStart');
    onTrigger(Array.from(selectedTeams), selectedType);
    setSelectedTeams(new Set());
  };

  const canTrigger = selectedTeams.size > 0 && !disabled;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Values Interventions</span>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <History className="h-4 w-4" />
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {/* Usage Indicator */}
      <UsageIndicator used={totalUsed} recommended={maxInterventions} />

      {/* History (if shown) */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <HistoryList history={history} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intervention Types */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Intervention Type</span>
        <div className="grid grid-cols-3 gap-2">
          {INTERVENTION_TYPES.map((type) => (
            <InterventionTypeCard
              key={type.id}
              type={type}
              isSelected={selectedType === type.id}
              onSelect={() => setSelectedType(type.id)}
            />
          ))}
        </div>
      </div>

      {/* Selected Type Info */}
      {selectedTypeInfo && (
        <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Purpose: </span>
            {selectedTypeInfo.purpose}
          </div>
        </div>
      )}

      {/* Team Selector */}
      {teams.length > 0 && (
        <TeamSelector
          teams={teams}
          selectedTeams={selectedTeams}
          onToggle={handleToggleTeam}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Trigger Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!canTrigger}
        onClick={handleTrigger}
      >
        {selectedTypeInfo && <selectedTypeInfo.icon className="h-5 w-5 mr-2" />}
        Trigger {selectedTypeInfo?.label}
        {selectedTeams.size > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 rounded text-xs">
            {selectedTeams.size} team{selectedTeams.size !== 1 ? 's' : ''}
          </span>
        )}
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>

      {/* Warning for no teams */}
      {teams.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No teams available for interventions</p>
        </div>
      )}
    </div>
  );
}

export default InterventionPanel;
