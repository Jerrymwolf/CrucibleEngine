'use client';

/**
 * ProductionDashboard Component
 *
 * Displays Celaritrin production metrics - the core business pressure mechanism.
 * Shows the dual moral counters (patients vs workers) that create authentic values tension.
 *
 * Features:
 * - Quarterly revenue progress tracking
 * - Real-time batch progress
 * - Pipeline status with bottleneck indication
 * - Dual moral counters (workers at risk vs patients affected)
 * - Revenue burn rate animation
 * - Stockpile depletion tracking
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Users,
  Heart,
  DollarSign,
  Activity,
  Package,
  TrendingDown,
  Clock,
  Beaker,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ProductionDashboardProps {
  production: {
    currentBatchId: string;
    batchProgress: number;
    batchValue: number;
    batchEtaHours: number;
    pipelineStatus: 'flowing' | 'blocked' | 'degraded';
    bottleneck: string;
    revenueImpact: number;
    productionHoursLost: number;
    burnRateActive: boolean;
    quarterlyTarget: number;
    quarterlyProgress: number;
    daysRemainingInQuarter: number;
    patientsAffected: number;
    childrenAffected: number;
    workersAtRisk: number;
    workersEvacuated: number;
    globalStockpileWeeks: number;
  };
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getQuarterlyColor(percent: number): string {
  if (percent >= 90) return 'text-green-500';
  if (percent >= 70) return 'text-amber-500';
  if (percent >= 50) return 'text-orange-500';
  return 'text-red-500';
}

function getProgressClass(percent: number): string {
  if (percent >= 90) return '[&>div]:bg-green-500';
  if (percent >= 70) return '[&>div]:bg-amber-500';
  if (percent >= 50) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
}

function getStockpileColor(weeks: number): string {
  if (weeks >= 5) return 'text-green-500';
  if (weeks >= 3) return 'text-amber-500';
  if (weeks >= 1) return 'text-orange-500';
  return 'text-red-500';
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AnimatedCounter({
  value,
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

function MoralCounter({
  value,
  label,
  sublabel,
  icon: Icon,
  colorClass,
  animate = false,
}: {
  value: number;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  colorClass: string;
  animate?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        'rounded-lg p-3 text-center border',
        colorClass.includes('amber')
          ? 'bg-amber-900/30 border-amber-700'
          : 'bg-rose-900/30 border-rose-700'
      )}
      animate={animate ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1.5, repeat: animate ? Infinity : 0 }}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', colorClass)} />
      </div>
      <motion.div
        className={cn('text-2xl font-bold font-mono', colorClass)}
        key={value}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
      >
        <AnimatedCounter value={value} />
      </motion.div>
      <div className={cn('text-xs', colorClass.replace('500', '300'))}>{label}</div>
      {sublabel && <div className="text-xs text-slate-500">{sublabel}</div>}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductionDashboard({ production, className }: ProductionDashboardProps) {
  const prevRevenueRef = useRef(production.revenueImpact);

  const quarterlyPercent = (production.quarterlyProgress / production.quarterlyTarget) * 100;

  // Track if revenue is actively dropping
  const isLosing = production.burnRateActive && production.revenueImpact < 0;

  useEffect(() => {
    prevRevenueRef.current = production.revenueImpact;
  }, [production.revenueImpact]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quarterly Progress */}
      <div className="panel">
        <h3 className="panel-header flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          Q3 Revenue Target
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn('font-mono font-bold', getQuarterlyColor(quarterlyPercent))}>
              {formatCurrency(production.quarterlyProgress)} / {formatCurrency(production.quarterlyTarget)}
            </span>
          </div>
          <Progress value={quarterlyPercent} className={cn('h-3', getProgressClass(quarterlyPercent))} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{quarterlyPercent.toFixed(1)}% complete</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {production.daysRemainingInQuarter} days remaining
            </span>
          </div>
        </div>
      </div>

      {/* Current Batch */}
      <div className="panel">
        <h3 className="panel-header flex items-center gap-2">
          <Beaker className="h-4 w-4 text-amber-400" />
          Current Batch
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-amber-400 font-mono">{production.currentBatchId}</span>
            <span className="text-white font-mono">{formatCurrency(production.batchValue)}</span>
          </div>
          <Progress
            value={production.batchProgress}
            className="h-2 [&>div]:bg-amber-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{production.batchProgress.toFixed(1)}%</span>
            <span>ETA: {production.batchEtaHours.toFixed(1)} hours</span>
          </div>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="panel">
        <h3 className="panel-header flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          Pipeline Status
        </h3>
        <motion.div
          className={cn(
            'rounded-lg p-3 text-center font-medium',
            production.pipelineStatus === 'flowing'
              ? 'bg-green-900/30 text-green-400 border border-green-700'
              : production.pipelineStatus === 'blocked'
              ? 'bg-red-900/30 text-red-400 border border-red-600'
              : 'bg-amber-900/30 text-amber-400 border border-amber-700'
          )}
          animate={
            production.pipelineStatus !== 'flowing' ? { opacity: [1, 0.7, 1] } : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
        >
          {production.pipelineStatus === 'flowing' ? (
            <span className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              Pipeline Flowing
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              BLOCKED at {production.bottleneck.toUpperCase()}
            </span>
          )}
        </motion.div>
      </div>

      {/* Dual Moral Counters - THE CORE VALUES PRESSURE */}
      <div className="panel">
        <h3 className="panel-header">Human Impact</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Workers at Risk */}
          <MoralCounter
            value={production.workersAtRisk}
            label="Workers at Risk"
            sublabel={`${production.workersEvacuated} evacuated`}
            icon={Users}
            colorClass="text-amber-400"
            animate={production.workersAtRisk > 0}
          />

          {/* Patients Affected */}
          <MoralCounter
            value={production.patientsAffected}
            label="Patients Affected"
            sublabel={`${production.childrenAffected} children`}
            icon={Heart}
            colorClass="text-rose-400"
            animate={production.patientsAffected > 0}
          />
        </div>
      </div>

      {/* Revenue Impact - Only shown when losing money */}
      <AnimatePresence>
        {isLosing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="panel"
          >
            <motion.div
              className="bg-red-900/50 border border-red-600 rounded-lg p-3 text-center"
              animate={{ opacity: [1, 0.8, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm font-medium">Revenue Loss</span>
              </div>
              <div className="text-2xl font-bold text-red-400 font-mono">
                -{formatCurrency(Math.abs(production.revenueImpact))}
              </div>
              <div className="text-xs text-red-300 mt-1">
                {production.productionHoursLost.toFixed(1)} hours lost
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Stockpile */}
      <div className="panel">
        <h3 className="panel-header">Global Celaritrin Stockpile</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Remaining Supply</span>
          <motion.span
            className={cn('font-mono font-bold text-lg', getStockpileColor(production.globalStockpileWeeks))}
            animate={production.globalStockpileWeeks < 3 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: production.globalStockpileWeeks < 3 ? Infinity : 0 }}
          >
            {production.globalStockpileWeeks.toFixed(1)} weeks
          </motion.span>
        </div>
        <Progress
          value={(production.globalStockpileWeeks / 6) * 100}
          className={cn(
            'h-2 mt-2',
            production.globalStockpileWeeks >= 5
              ? '[&>div]:bg-green-500'
              : production.globalStockpileWeeks >= 3
              ? '[&>div]:bg-amber-500'
              : '[&>div]:bg-red-500'
          )}
        />
        {production.globalStockpileWeeks < 3 && (
          <p className="text-xs text-red-400 mt-2 text-center">
            Critical: Supply running low worldwide
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductionDashboard;
