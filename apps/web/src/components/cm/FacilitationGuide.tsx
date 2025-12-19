'use client';

/**
 * FacilitationGuide Component
 *
 * Contextual prompts and tips for facilitators during the simulation.
 * Provides real-time guidance based on team behavior and game state.
 *
 * Features:
 * - Automatic tip detection based on game patterns
 * - Pacing indicators (too fast/slow)
 * - Value drift alerts
 * - Suggested interventions
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Lightbulb,
  X,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Eye,
  Zap,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// ============================================================================
// TYPES
// ============================================================================

export interface FacilitationTip {
  id: string;
  type: 'suggestion' | 'warning' | 'insight' | 'pacing';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  teamId?: string;
  teamName?: string;
  suggestedAction?: {
    label: string;
    action: 'trigger_flash' | 'trigger_moment' | 'trigger_mirror' | 'send_directive' | 'adjust_intensity';
    params?: Record<string, unknown>;
  };
  dismissable: boolean;
  timestamp: number;
}

export interface TeamAnalysis {
  teamId: string;
  teamName: string;
  decisionCount: number;
  averageDecisionTime: number; // seconds
  valueConflicts: number;
  statedValues: string[];
  enactedValueScore: Record<string, number>;
  lastDecisionTime: number;
  interventionsReceived: number;
}

export interface PacingStatus {
  status: 'too_slow' | 'good' | 'too_fast';
  averageDecisionTime: number;
  expectedDecisionTime: number;
  suggestion?: string;
}

export interface FacilitationGuideProps {
  teams: TeamAnalysis[];
  currentPhase: string;
  simulationTime: number; // minutes
  globalIntensity: number;
  onTriggerIntervention: (teamId: string, type: 'flash' | 'moment' | 'mirror') => void;
  onAdjustIntensity: (delta: number) => void;
  className?: string;
}

// ============================================================================
// TIP GENERATION LOGIC
// ============================================================================

function generateTips(
  teams: TeamAnalysis[],
  currentPhase: string,
  simulationTime: number,
  globalIntensity: number
): FacilitationTip[] {
  const tips: FacilitationTip[] = [];
  const now = Date.now();

  // Only generate tips during active phases
  if (!['storm', 'recovery'].includes(currentPhase)) {
    return tips;
  }

  teams.forEach((team) => {
    // Check for value conflicts
    if (team.valueConflicts >= 3) {
      tips.push({
        id: `conflict-${team.teamId}-${now}`,
        type: 'suggestion',
        priority: 'high',
        title: 'Values Drift Detected',
        message: `Team ${team.teamName} has made ${team.valueConflicts} decisions that conflict with their stated values. Consider triggering a "Moment" intervention to help them reflect.`,
        teamId: team.teamId,
        teamName: team.teamName,
        suggestedAction: {
          label: 'Trigger Moment',
          action: 'trigger_moment',
          params: { teamId: team.teamId },
        },
        dismissable: true,
        timestamp: now,
      });
    }

    // Check for fast decision-making
    if (team.averageDecisionTime < 30 && team.decisionCount >= 3) {
      tips.push({
        id: `fast-${team.teamId}-${now}`,
        type: 'pacing',
        priority: 'medium',
        title: 'Rapid Decisions',
        message: `Team ${team.teamName} is deciding very quickly (avg ${Math.round(team.averageDecisionTime)}s). They may be rushing without full consideration.`,
        teamId: team.teamId,
        teamName: team.teamName,
        suggestedAction: {
          label: 'Flash Check-in',
          action: 'trigger_flash',
          params: { teamId: team.teamId },
        },
        dismissable: true,
        timestamp: now,
      });
    }

    // Check for slow decision-making
    if (team.averageDecisionTime > 180 && team.decisionCount >= 2) {
      tips.push({
        id: `slow-${team.teamId}-${now}`,
        type: 'pacing',
        priority: 'low',
        title: 'Deliberate Pace',
        message: `Team ${team.teamName} is taking longer than average to decide (avg ${Math.round(team.averageDecisionTime / 60)}min). Consider if they need a nudge.`,
        teamId: team.teamId,
        teamName: team.teamName,
        dismissable: true,
        timestamp: now,
      });
    }

    // Check for inactivity
    const timeSinceLastDecision = (now - team.lastDecisionTime) / 1000 / 60; // minutes
    if (timeSinceLastDecision > 10 && currentPhase === 'storm') {
      tips.push({
        id: `inactive-${team.teamId}-${now}`,
        type: 'warning',
        priority: 'medium',
        title: 'Team Inactive',
        message: `Team ${team.teamName} hasn't made a decision in ${Math.round(timeSinceLastDecision)} minutes. They may be stuck or disengaged.`,
        teamId: team.teamId,
        teamName: team.teamName,
        suggestedAction: {
          label: 'Send Nudge',
          action: 'send_directive',
          params: { teamId: team.teamId, type: 'nudge' },
        },
        dismissable: true,
        timestamp: now,
      });
    }

    // Check for intervention frequency
    if (team.interventionsReceived === 0 && team.decisionCount >= 5) {
      tips.push({
        id: `no-intervention-${team.teamId}-${now}`,
        type: 'insight',
        priority: 'low',
        title: 'No Interventions Yet',
        message: `Team ${team.teamName} has made ${team.decisionCount} decisions without any values check-in. Consider a brief intervention.`,
        teamId: team.teamId,
        teamName: team.teamName,
        suggestedAction: {
          label: 'Quick Flash',
          action: 'trigger_flash',
          params: { teamId: team.teamId },
        },
        dismissable: true,
        timestamp: now,
      });
    }
  });

  // Global intensity tips
  if (globalIntensity >= 8 && currentPhase === 'storm') {
    tips.push({
      id: `high-intensity-${now}`,
      type: 'warning',
      priority: 'medium',
      title: 'High Intensity',
      message: 'Global intensity is very high. Teams may feel overwhelmed. Watch for signs of frustration.',
      suggestedAction: {
        label: 'Lower Intensity',
        action: 'adjust_intensity',
        params: { delta: -2 },
      },
      dismissable: true,
      timestamp: now,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}

function calculatePacing(teams: TeamAnalysis[]): PacingStatus {
  if (teams.length === 0) {
    return { status: 'good', averageDecisionTime: 0, expectedDecisionTime: 60 };
  }

  const overallAvg = teams.reduce((sum, t) => sum + t.averageDecisionTime, 0) / teams.length;
  const expectedTime = 60; // 1 minute expected per decision

  if (overallAvg < 30) {
    return {
      status: 'too_fast',
      averageDecisionTime: overallAvg,
      expectedDecisionTime: expectedTime,
      suggestion: 'Teams are moving quickly. Consider slowing intensity or adding complexity.',
    };
  } else if (overallAvg > 120) {
    return {
      status: 'too_slow',
      averageDecisionTime: overallAvg,
      expectedDecisionTime: expectedTime,
      suggestion: 'Teams seem stuck. Consider issuing directives or raising intensity.',
    };
  }

  return {
    status: 'good',
    averageDecisionTime: overallAvg,
    expectedDecisionTime: expectedTime,
  };
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TipCard({
  tip,
  onDismiss,
  onAction,
}: {
  tip: FacilitationTip;
  onDismiss: () => void;
  onAction: () => void;
}) {
  const { play: playSound } = useSound();

  const typeConfig = {
    suggestion: {
      icon: Lightbulb,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    insight: {
      icon: Eye,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    pacing: {
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
    },
  };

  const config = typeConfig[tip.type];
  const Icon = config.icon;

  const handleAction = () => {
    playSound('ui', 'click');
    onAction();
  };

  const handleDismiss = () => {
    playSound('ui', 'click');
    onDismiss();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'p-4 rounded-xl border transition-colors',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bg)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm">{tip.title}</h4>
            {tip.dismissable && (
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {tip.teamName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {tip.teamName}
            </p>
          )}

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {tip.message}
          </p>

          {tip.suggestedAction && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={handleAction}
            >
              {tip.suggestedAction.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PacingIndicator({ pacing }: { pacing: PacingStatus }) {
  const config = {
    too_fast: {
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Fast Pace',
    },
    good: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      label: 'Good Pace',
    },
    too_slow: {
      icon: TrendingDown,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      label: 'Slow Pace',
    },
  };

  const { icon: Icon, color, bg, label } = config[pacing.status];

  return (
    <div className={cn('p-3 rounded-lg', bg)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className={cn('text-sm font-medium', color)}>{label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Avg: {Math.round(pacing.averageDecisionTime)}s per decision
      </p>
      {pacing.suggestion && (
        <p className="text-xs text-muted-foreground mt-1">{pacing.suggestion}</p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FacilitationGuide({
  teams,
  currentPhase,
  simulationTime,
  globalIntensity,
  onTriggerIntervention,
  onAdjustIntensity,
  className,
}: FacilitationGuideProps) {
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const { play: playSound } = useSound();

  // Generate tips based on current state
  const allTips = useMemo(
    () => generateTips(teams, currentPhase, simulationTime, globalIntensity),
    [teams, currentPhase, simulationTime, globalIntensity]
  );

  // Filter out dismissed tips
  const activeTips = useMemo(
    () => allTips.filter((tip) => !dismissedTips.has(tip.id)),
    [allTips, dismissedTips]
  );

  // Calculate pacing
  const pacing = useMemo(() => calculatePacing(teams), [teams]);

  // Play notification sound for new high-priority tips
  useEffect(() => {
    const highPriorityTips = activeTips.filter((t) => t.priority === 'high');
    if (highPriorityTips.length > 0 && tipsEnabled) {
      playSound('ui', 'notification');
    }
  }, [activeTips.length, tipsEnabled, playSound]);

  const handleDismiss = (tipId: string) => {
    setDismissedTips((prev) => new Set([...prev, tipId]));
  };

  const handleAction = (tip: FacilitationTip) => {
    if (!tip.suggestedAction) return;

    const { action, params } = tip.suggestedAction;

    switch (action) {
      case 'trigger_flash':
      case 'trigger_moment':
      case 'trigger_mirror':
        if (params?.teamId) {
          const interventionType = action.replace('trigger_', '') as 'flash' | 'moment' | 'mirror';
          onTriggerIntervention(params.teamId as string, interventionType);
        }
        break;
      case 'adjust_intensity':
        if (params?.delta) {
          onAdjustIntensity(params.delta as number);
        }
        break;
      case 'send_directive':
        // This would need a callback prop to handle
        break;
    }

    // Dismiss the tip after action
    handleDismiss(tip.id);
  };

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
    playSound('ui', 'click');
  };

  // Don't show during non-active phases
  if (!['storm', 'recovery', 'briefing'].includes(currentPhase)) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Facilitation Guide</span>
          {activeTips.length > 0 && (
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {activeTips.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={tipsEnabled}
              onCheckedChange={setTipsEnabled}
              id="tips-toggle"
            />
            <label htmlFor="tips-toggle" className="text-xs text-muted-foreground">
              Tips
            </label>
          </div>
          <button
            type="button"
            onClick={() => setDismissedTips(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Pacing Indicator */}
            <PacingIndicator pacing={pacing} />

            {/* Tips */}
            {tipsEnabled && activeTips.length > 0 ? (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {activeTips.slice(0, 5).map((tip) => (
                    <TipCard
                      key={tip.id}
                      tip={tip}
                      onDismiss={() => handleDismiss(tip.id)}
                      onAction={() => handleAction(tip)}
                    />
                  ))}
                </AnimatePresence>
                {activeTips.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{activeTips.length - 5} more tips
                  </p>
                )}
              </div>
            ) : tipsEnabled ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All teams are on track</p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tips disabled</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FacilitationGuide;
