'use client';

/**
 * DecisionTimeline Component
 *
 * Visual reconstruction of team decisions through the crisis.
 * Shows the journey from watch phase through crisis to recovery,
 * highlighting notable moments and values alignment.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DilemmaPhase } from '@crucible/shared';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface DecisionTimelineProps {
  teamName: string;
  decisions: TimelineDecision[];
  onSelectDecision?: (decisionId: string) => void;
}

export interface TimelineDecision {
  id: string;
  timestamp: number; // Simulation time in seconds
  phase: DilemmaPhase;
  title: string;
  choice: string;
  rationale?: string;
  isNotable: boolean;
  notableCategory?: 'gap' | 'consistency' | 'conflict' | 'growth';
  notableReason?: string;
  valuesAlignment: 'positive' | 'neutral' | 'negative';
  consequences?: string[];
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface PhaseMarkerProps {
  phase: DilemmaPhase;
  isActive: boolean;
}

function PhaseMarker({ phase, isActive }: PhaseMarkerProps) {
  const phaseConfig = {
    watch: { label: 'Watch Phase', color: 'bg-yellow-500', icon: Eye },
    crisis: { label: 'Crisis Phase', color: 'bg-red-500', icon: Zap },
    recovery: { label: 'Recovery Phase', color: 'bg-blue-500', icon: CheckCircle2 },
  };

  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
      isActive ? `${config.color} text-white` : 'bg-muted text-muted-foreground'
    )}>
      <Icon className="h-4 w-4" />
      {config.label}
    </div>
  );
}

interface DecisionCardProps {
  decision: TimelineDecision;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}

function DecisionCard({ decision, isExpanded, onToggle, onSelect }: DecisionCardProps) {
  // Format simulation time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(Math.abs(seconds) / 3600);
    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
    const sign = seconds >= 0 ? '+' : '-';
    return `T${sign}${hours}h ${minutes}m`;
  };

  // Get alignment styling
  const getAlignmentStyle = () => {
    switch (decision.valuesAlignment) {
      case 'positive':
        return 'border-l-green-500 bg-green-500/5';
      case 'negative':
        return 'border-l-red-500 bg-red-500/5';
      default:
        return 'border-l-muted bg-muted/20';
    }
  };

  // Get notable indicator
  const getNotableIndicator = () => {
    if (!decision.isNotable) return null;

    switch (decision.notableCategory) {
      case 'gap':
        return (
          <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            Gap
          </span>
        );
      case 'consistency':
        return (
          <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Strong
          </span>
        );
      case 'conflict':
        return (
          <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
            <Zap className="h-3 w-3" />
            Conflict
          </span>
        );
      case 'growth':
        return (
          <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Growth
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border-l-4 rounded-r-lg p-4 cursor-pointer transition-colors',
        getAlignmentStyle()
      )}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(decision.timestamp)}
            </span>
            {getNotableIndicator()}
          </div>
          <h4 className="font-semibold">{decision.title}</h4>
        </div>
        <button
          type="button"
          className="p-1 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Choice */}
      <p className="text-sm mt-2">
        Chose: <span className="font-medium">&ldquo;{decision.choice}&rdquo;</span>
      </p>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t space-y-3">
              {/* Rationale */}
              {decision.rationale && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    Team Rationale
                  </div>
                  <p className="text-sm italic">&ldquo;{decision.rationale}&rdquo;</p>
                </div>
              )}

              {/* Notable Reason */}
              {decision.isNotable && decision.notableReason && (
                <div className={cn(
                  'p-3 rounded-lg',
                  decision.notableCategory === 'gap' ? 'bg-red-500/10' :
                  decision.notableCategory === 'consistency' ? 'bg-green-500/10' :
                  'bg-muted/50'
                )}>
                  <div className="text-xs font-semibold mb-1">Why Notable</div>
                  <p className="text-sm">{decision.notableReason}</p>
                </div>
              )}

              {/* Consequences */}
              {decision.consequences && decision.consequences.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    Consequences
                  </div>
                  <ul className="text-sm space-y-1">
                    {decision.consequences.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">→</span>
                        {c}
                      </li>
                    ))}
                  </ul>
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

export function DecisionTimeline({
  teamName,
  decisions,
  onSelectDecision,
}: DecisionTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState<DilemmaPhase | 'all'>('all');
  const [filterNotable, setFilterNotable] = useState(false);

  // Group decisions by phase
  const groupedDecisions = {
    watch: decisions.filter((d) => d.phase === 'watch'),
    crisis: decisions.filter((d) => d.phase === 'crisis'),
    recovery: decisions.filter((d) => d.phase === 'recovery'),
  };

  // Apply filters
  const filteredDecisions = decisions.filter((d) => {
    if (filterPhase !== 'all' && d.phase !== filterPhase) return false;
    if (filterNotable && !d.isNotable) return false;
    return true;
  });

  // Stats
  const totalDecisions = decisions.length;
  const notableCount = decisions.filter((d) => d.isNotable).length;
  const gapCount = decisions.filter((d) => d.notableCategory === 'gap').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Decision Timeline</h2>
        <p className="text-muted-foreground">Team {teamName}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg text-center">
          <div className="text-2xl font-bold">{totalDecisions}</div>
          <div className="text-xs text-muted-foreground">Total Decisions</div>
        </div>
        <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-500">{groupedDecisions.watch.length}</div>
          <div className="text-xs text-muted-foreground">Watch Phase</div>
        </div>
        <div className="p-4 bg-red-500/10 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-500">{groupedDecisions.crisis.length}</div>
          <div className="text-xs text-muted-foreground">Crisis Phase</div>
        </div>
        <div className="p-4 bg-blue-500/10 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-500">{groupedDecisions.recovery.length}</div>
          <div className="text-xs text-muted-foreground">Recovery Phase</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'watch', 'crisis', 'recovery'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setFilterPhase(phase)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filterPhase === phase
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {phase === 'all' ? 'All Phases' : `${phase.charAt(0).toUpperCase()}${phase.slice(1)}`}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterNotable}
            onChange={(e) => setFilterNotable(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Notable only ({notableCount})</span>
        </label>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No decisions match the current filters.
          </div>
        ) : (
          <>
            {/* Watch Phase */}
            {(filterPhase === 'all' || filterPhase === 'watch') &&
              groupedDecisions.watch.filter(d => !filterNotable || d.isNotable).length > 0 && (
              <div className="space-y-3">
                <PhaseMarker phase="watch" isActive={filterPhase === 'watch'} />
                <div className="space-y-3 ml-2 border-l-2 border-yellow-500/30 pl-4">
                  {groupedDecisions.watch
                    .filter(d => !filterNotable || d.isNotable)
                    .map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      isExpanded={expandedId === decision.id}
                      onToggle={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
                      onSelect={() => onSelectDecision?.(decision.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Crisis Phase */}
            {(filterPhase === 'all' || filterPhase === 'crisis') &&
              groupedDecisions.crisis.filter(d => !filterNotable || d.isNotable).length > 0 && (
              <div className="space-y-3">
                <PhaseMarker phase="crisis" isActive={filterPhase === 'crisis'} />
                <div className="space-y-3 ml-2 border-l-2 border-red-500/30 pl-4">
                  {groupedDecisions.crisis
                    .filter(d => !filterNotable || d.isNotable)
                    .map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      isExpanded={expandedId === decision.id}
                      onToggle={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
                      onSelect={() => onSelectDecision?.(decision.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recovery Phase */}
            {(filterPhase === 'all' || filterPhase === 'recovery') &&
              groupedDecisions.recovery.filter(d => !filterNotable || d.isNotable).length > 0 && (
              <div className="space-y-3">
                <PhaseMarker phase="recovery" isActive={filterPhase === 'recovery'} />
                <div className="space-y-3 ml-2 border-l-2 border-blue-500/30 pl-4">
                  {groupedDecisions.recovery
                    .filter(d => !filterNotable || d.isNotable)
                    .map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      isExpanded={expandedId === decision.id}
                      onToggle={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
                      onSelect={() => onSelectDecision?.(decision.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
