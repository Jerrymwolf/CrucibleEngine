'use client';

/**
 * ValuesGapReport Component
 *
 * Shows the gap between stated values and enacted behavior.
 * Uses visual charts to display alignment by value and phase.
 *
 * Design principle: For learning, not judgment.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DilemmaPhase } from '@crucible/shared';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ValuesGapReportProps {
  teamName: string;
  commitmentText: string;
  values: ValueData[];
  phaseData: PhaseData[];
  notableMoments: NotableMomentSummary[];
  overallAlignment: number;
  biggestGap?: { value: string; score: number };
  strongestAlignment?: { value: string; score: number };
}

export interface ValueData {
  value: string;
  definition: string;
  averageScore: number;
  byPhase: { phase: DilemmaPhase; score: number }[];
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  lowestPoint?: { context: string; score: number };
}

export interface PhaseData {
  phase: DilemmaPhase;
  averageAlignment: number;
  decisionCount: number;
}

export interface NotableMomentSummary {
  title: string;
  phase: DilemmaPhase;
  category: 'gap' | 'consistency' | 'conflict' | 'growth';
  description: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AlignmentBarProps {
  value: number;
  label?: string;
  showLabel?: boolean;
}

function AlignmentBar({ value, label, showLabel = true }: AlignmentBarProps) {
  // Convert -3 to +3 scale to percentage (0-100)
  const percentage = ((value + 3) / 6) * 100;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="space-y-1">
      {showLabel && label && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn(
            'font-mono',
            isPositive && 'text-green-500',
            isNegative && 'text-red-500',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}>
            {value > 0 ? '+' : ''}{value.toFixed(1)}
          </span>
        </div>
      )}
      <div className="h-3 bg-muted rounded-full overflow-hidden relative">
        {/* Center line at 50% (neutral) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/20" />

        {/* Value bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(percentage - 50)}%` }}
          className={cn(
            'absolute top-0 bottom-0 rounded-full',
            isPositive && 'bg-green-500 left-1/2',
            isNegative && 'bg-red-500 right-1/2',
            !isPositive && !isNegative && 'bg-muted-foreground left-1/2'
          )}
          style={{
            [isNegative ? 'right' : 'left']: '50%',
            transformOrigin: isNegative ? 'right' : 'left',
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

interface TrendIndicatorProps {
  trend: ValueData['trend'];
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  const configs = {
    improving: { icon: TrendingUp, color: 'text-green-500', label: 'Improving' },
    declining: { icon: TrendingDown, color: 'text-red-500', label: 'Declining' },
    stable: { icon: Minus, color: 'text-muted-foreground', label: 'Stable' },
    volatile: { icon: Activity, color: 'text-orange-500', label: 'Volatile' },
  };

  const config = configs[trend];
  const Icon = config.icon;

  return (
    <span className={cn('flex items-center gap-1 text-xs', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

interface PhaseChartProps {
  phaseData: PhaseData[];
}

function PhaseChart({ phaseData }: PhaseChartProps) {
  const phaseConfig = {
    watch: { label: 'Watch', color: 'bg-yellow-500' },
    crisis: { label: 'Crisis', color: 'bg-red-500' },
    recovery: { label: 'Recovery', color: 'bg-blue-500' },
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Alignment by Phase</h4>
      <div className="grid gap-3">
        {phaseData.map((phase) => {
          const config = phaseConfig[phase.phase];
          return (
            <div key={phase.phase} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', config.color)} />
                  {config.label} ({phase.decisionCount} decisions)
                </span>
                <span className={cn(
                  'font-mono',
                  phase.averageAlignment > 0 && 'text-green-500',
                  phase.averageAlignment < 0 && 'text-red-500'
                )}>
                  {phase.averageAlignment > 0 ? '+' : ''}{phase.averageAlignment.toFixed(1)}
                </span>
              </div>
              <AlignmentBar value={phase.averageAlignment} showLabel={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValuesGapReport({
  teamName,
  commitmentText,
  values,
  phaseData,
  notableMoments,
  overallAlignment,
  biggestGap,
  strongestAlignment,
}: ValuesGapReportProps) {
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Values Gap Report</h2>
        <p className="text-muted-foreground">Team {teamName}</p>
      </div>

      {/* Commitment Reference */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="text-xs font-semibold text-primary mb-2">Your Commitment</div>
        <p className="italic">&ldquo;{commitmentText}&rdquo;</p>
      </div>

      {/* Overall Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg text-center">
          <div className={cn(
            'text-3xl font-bold',
            overallAlignment > 0 && 'text-green-500',
            overallAlignment < 0 && 'text-red-500'
          )}>
            {overallAlignment > 0 ? '+' : ''}{overallAlignment.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">Overall Alignment</div>
        </div>

        {biggestGap && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <div className="text-xl font-bold text-red-500">{biggestGap.value}</div>
            <div className="text-sm text-muted-foreground">
              Biggest Gap ({biggestGap.score > 0 ? '+' : ''}{biggestGap.score.toFixed(1)})
            </div>
          </div>
        )}

        {strongestAlignment && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <div className="text-xl font-bold text-green-500">{strongestAlignment.value}</div>
            <div className="text-sm text-muted-foreground">
              Strongest (+{strongestAlignment.score.toFixed(1)})
            </div>
          </div>
        )}
      </div>

      {/* Phase Chart */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <PhaseChart phaseData={phaseData} />
      </div>

      {/* Values Detail */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alignment by Value</h3>

        <div className="space-y-3">
          {values.map((value, index) => (
            <motion.div
              key={value.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-muted/30 rounded-lg border cursor-pointer"
              onClick={() => setExpandedValue(expandedValue === value.value ? null : value.value)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{value.value}</span>
                    <TrendIndicator trend={value.trend} />
                  </div>
                  <AlignmentBar value={value.averageScore} showLabel={false} />
                </div>
                <div className={cn(
                  'text-lg font-mono font-bold',
                  value.averageScore > 0 && 'text-green-500',
                  value.averageScore < 0 && 'text-red-500'
                )}>
                  {value.averageScore > 0 ? '+' : ''}{value.averageScore.toFixed(1)}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedValue === value.value && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t space-y-4"
                >
                  {/* Definition */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Your Definition
                    </div>
                    <p className="text-sm italic">&ldquo;{value.definition}&rdquo;</p>
                  </div>

                  {/* By Phase */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      Score by Phase
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {value.byPhase.map((phase) => (
                        <div key={phase.phase} className="text-center p-2 bg-muted/50 rounded">
                          <div className={cn(
                            'text-sm font-bold',
                            phase.score > 0 && 'text-green-500',
                            phase.score < 0 && 'text-red-500'
                          )}>
                            {phase.score > 0 ? '+' : ''}{phase.score.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{phase.phase}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lowest Point */}
                  {value.lowestPoint && value.lowestPoint.score < 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-500 mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        Lowest Point ({value.lowestPoint.score})
                      </div>
                      <p className="text-sm">{value.lowestPoint.context}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Notable Moments Summary */}
      {notableMoments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notable Moments</h3>

          <div className="space-y-3">
            {notableMoments.map((moment, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-l-4',
                  moment.category === 'gap' && 'border-l-red-500 bg-red-500/5',
                  moment.category === 'consistency' && 'border-l-green-500 bg-green-500/5',
                  moment.category === 'conflict' && 'border-l-orange-500 bg-orange-500/5',
                  moment.category === 'growth' && 'border-l-blue-500 bg-blue-500/5'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {moment.category === 'gap' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {moment.category === 'consistency' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {moment.category === 'conflict' && <Activity className="h-4 w-4 text-orange-500" />}
                  {moment.category === 'growth' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                  <span className="font-semibold">{moment.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">({moment.phase})</span>
                </div>
                <p className="text-sm text-muted-foreground">{moment.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note about purpose */}
      <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          This report shows patterns in your decision-making relative to your stated values.
          The goal is learning and self-awareness, not assessment. Every team faces gaps
          under pressure - noticing them is the first step to closing them.
        </p>
      </div>
    </div>
  );
}
