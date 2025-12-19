'use client';

/**
 * ProductionHeader Component
 *
 * Compact header bar showing key production metrics at a glance.
 * Always visible during crisis phase to maintain awareness of business pressure.
 *
 * Displays:
 * - Q3 Progress percentage
 * - Revenue impact (positive or negative)
 * - Workers at risk count
 * - Patients affected count
 * - Global stockpile status
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Users,
  Heart,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Package,
} from 'lucide-react';

interface ProductionHeaderProps {
  production: {
    quarterlyTarget: number;
    quarterlyProgress: number;
    revenueImpact: number;
    burnRateActive: boolean;
    patientsAffected: number;
    childrenAffected: number;
    workersAtRisk: number;
    workersEvacuated: number;
    globalStockpileWeeks: number;
    pipelineStatus: 'flowing' | 'blocked' | 'degraded';
    bottleneck: string;
  };
  className?: string;
}

function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return `${value / 1e9 >= 0 ? '' : '-'}$${(Math.abs(value) / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${value >= 0 ? '' : '-'}$${(Math.abs(value) / 1e6).toFixed(1)}M`;
  }
  return `${value >= 0 ? '' : '-'}$${(Math.abs(value) / 1e3).toFixed(0)}K`;
}

export function ProductionHeader({ production, className }: ProductionHeaderProps) {
  const quarterlyPercent = (production.quarterlyProgress / production.quarterlyTarget) * 100;
  const isLosing = production.burnRateActive && production.revenueImpact < 0;

  return (
    <div
      className={cn(
        'bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-2',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 text-sm flex-wrap">
        {/* Q3 Progress */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <span className="text-slate-400">Q3:</span>
          <span
            className={cn(
              'font-mono font-medium',
              quarterlyPercent >= 70
                ? 'text-emerald-400'
                : quarterlyPercent >= 50
                ? 'text-amber-400'
                : 'text-red-400'
            )}
          >
            {quarterlyPercent.toFixed(0)}%
          </span>
          <span className="text-slate-500 text-xs hidden sm:inline">
            ({formatCompactCurrency(production.quarterlyProgress)})
          </span>
        </div>

        {/* Pipeline Status Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              production.pipelineStatus === 'flowing'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-red-900/50 text-red-400'
            )}
            animate={
              production.pipelineStatus !== 'flowing' ? { opacity: [1, 0.6, 1] } : {}
            }
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <Package className="h-3 w-3" />
            {production.pipelineStatus === 'flowing' ? (
              'FLOWING'
            ) : (
              <>BLOCKED</>
            )}
          </motion.div>
        </div>

        {/* Revenue Impact */}
        <motion.div
          className={cn(
            'flex items-center gap-2',
            isLosing ? 'text-red-400' : production.revenueImpact > 0 ? 'text-green-400' : 'text-slate-400'
          )}
          animate={isLosing ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: isLosing ? Infinity : 0 }}
        >
          {isLosing ? (
            <>
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              <TrendingDown className="h-3 w-3" />
            </>
          ) : production.revenueImpact > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : null}
          <span className="font-mono">
            {production.revenueImpact !== 0
              ? formatCompactCurrency(production.revenueImpact)
              : '$0'}
          </span>
        </motion.div>

        {/* Workers at Risk */}
        <div className="flex items-center gap-2">
          <Users
            className={cn(
              'h-4 w-4',
              production.workersAtRisk > 0 ? 'text-amber-400' : 'text-slate-500'
            )}
          />
          <span
            className={cn(
              'font-mono',
              production.workersAtRisk > 0 ? 'text-amber-400' : 'text-slate-500'
            )}
          >
            {production.workersAtRisk}
          </span>
          <span className="text-slate-500 text-xs hidden md:inline">at risk</span>
        </div>

        {/* Patients Affected */}
        <div className="flex items-center gap-2">
          <Heart
            className={cn(
              'h-4 w-4',
              production.patientsAffected > 0 ? 'text-rose-400' : 'text-slate-500'
            )}
          />
          <span
            className={cn(
              'font-mono',
              production.patientsAffected > 0 ? 'text-rose-400' : 'text-slate-500'
            )}
          >
            {production.patientsAffected.toLocaleString()}
          </span>
          <span className="text-slate-500 text-xs hidden md:inline">
            patients ({production.childrenAffected} children)
          </span>
        </div>

        {/* Stockpile */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Stockpile:</span>
          <span
            className={cn(
              'font-mono',
              production.globalStockpileWeeks >= 4
                ? 'text-slate-300'
                : production.globalStockpileWeeks >= 2
                ? 'text-amber-400'
                : 'text-red-400'
            )}
          >
            {production.globalStockpileWeeks.toFixed(1)}w
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProductionHeader;
