'use client';

/**
 * ParishDashboard Component
 *
 * The main crisis-phase interface for teams managing their parish.
 * Shows ONLY operational data - no values reminders or hints.
 *
 * Design principle: Teams must remember their own values during crisis.
 * This is the practice.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  ParishIdLower,
  ParishState,
  WeatherState,
  TimelineWindow,
} from '@crucible/shared';
import {
  AlertTriangle,
  Wind,
  Droplets,
  Zap,
  Radio,
  Car,
  Building2,
  Users,
  Package,
  Clock,
  Gauge,
  Activity,
  Ship,
  Plane,
  Heart,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ParishDashboardProps {
  parishState: ParishState;
  weatherState: WeatherState;
  currentWindow: TimelineWindow;
  simulationTime: number;
  intensityLevel: number;
  pendingDilemmaCount: number;
  onViewDilemma: () => void;
  productionStatus?: {
    dosesProduced: number;
    dosesTarget: number;
    inventoryDays: number;
    productionStatus: 'normal' | 'reduced' | 'stopped';
  };
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'critical' | 'neutral';
  subtitle?: string;
}

function MetricCard({ label, value, icon, status, subtitle }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-500 bg-green-500/10 border-green-500/30',
    warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    critical: 'text-red-500 bg-red-500/10 border-red-500/30',
    neutral: 'text-muted-foreground bg-muted/30 border-muted',
  };

  return (
    <div className={cn('p-3 rounded-lg border', statusColors[status])}>
      <div className="flex items-center gap-2 mb-1">
        <span className="opacity-70">{icon}</span>
        <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs opacity-60 mt-0.5">{subtitle}</div>}
    </div>
  );
}

interface StatusBarProps {
  label: string;
  value: number;
  max?: number;
  showPercentage?: boolean;
}

function StatusBar({ label, value, max = 100, showPercentage = true }: StatusBarProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const status = percentage > 70 ? 'good' : percentage > 30 ? 'warning' : 'critical';

  const barColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(status === 'critical' && 'text-red-500')}>
          {showPercentage ? `${Math.round(percentage)}%` : `${value}/${max}`}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColors[status])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ParishDashboard({
  parishState,
  weatherState,
  currentWindow,
  simulationTime,
  intensityLevel,
  pendingDilemmaCount,
  onViewDilemma,
  productionStatus,
}: ParishDashboardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Format simulation time
  const formatSimTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const sign = hours >= 0 ? '+' : '';
    return `T${sign}${hours}h ${minutes}m`;
  };

  // Get hurricane status
  const getHurricaneStatus = () => {
    const h = weatherState.hurricane;
    if (h.hoursToImpact < 0) return 'No direct threat';
    if (h.hoursToImpact <= 6) return 'IMMINENT';
    if (h.hoursToImpact <= 24) return `${Math.round(h.hoursToImpact)}h to impact`;
    return `${Math.round(h.hoursToImpact / 24)}d to potential impact`;
  };

  // Get intensity color
  const getIntensityColor = (level: number) => {
    if (level >= 8) return 'text-red-500';
    if (level >= 6) return 'text-orange-500';
    if (level >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4 p-4">
      {/* Header with Parish Name and Time */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{parishState.name}</h1>
          <p className="text-sm text-muted-foreground">
            {currentWindow.label} Phase
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg">{formatSimTime(simulationTime)}</span>
          </div>
          <div className={cn('text-sm font-semibold', getIntensityColor(intensityLevel))}>
            Intensity: {intensityLevel}/10
          </div>
        </div>
      </div>

      {/* Pending Decisions Alert */}
      {pendingDilemmaCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onViewDilemma}
          className="w-full p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              <span className="font-semibold text-red-500">
                {pendingDilemmaCount} Decision{pendingDilemmaCount > 1 ? 's' : ''} Required
              </span>
            </div>
            <span className="text-sm text-red-400">Click to respond →</span>
          </div>
        </motion.button>
      )}

      {/* Weather & Hurricane Status */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Wind className="h-4 w-4" />
            Hurricane {weatherState.hurricane.name}
          </h2>
          <span className={cn(
            'text-sm font-bold px-2 py-0.5 rounded',
            weatherState.hurricane.hoursToImpact <= 6
              ? 'bg-red-500/20 text-red-500'
              : weatherState.hurricane.hoursToImpact <= 24
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-muted text-muted-foreground'
          )}>
            Category {weatherState.hurricane.category}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Status</div>
            <div className="font-semibold">{getHurricaneStatus()}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Wind Speed</div>
            <div className="font-semibold">{weatherState.hurricane.windSpeed} mph</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Trajectory</div>
            <div className="font-semibold capitalize">{weatherState.hurricane.trajectory.replace('-', ' ')}</div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground italic">
          {weatherState.hurricane.currentAdvisory}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Population"
          value={parishState.status.populationRemaining.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          status={parishState.status.populationRemaining < 1000 ? 'warning' : 'neutral'}
          subtitle={`${parishState.status.populationEvacuated.toLocaleString()} evacuated`}
        />
        <MetricCard
          label="Morale"
          value={`${parishState.morale}%`}
          icon={<Heart className="h-4 w-4" />}
          status={parishState.morale < 30 ? 'critical' : parishState.morale < 60 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Casualties"
          value={parishState.status.casualties}
          icon={<Activity className="h-4 w-4" />}
          status={parishState.status.casualties > 0 ? 'critical' : 'good'}
          subtitle={`${parishState.status.injured} injured`}
        />
        <MetricCard
          label="Current Winds"
          value={`${weatherState.windSpeed} mph`}
          icon={<Wind className="h-4 w-4" />}
          status={weatherState.windSpeed > 100 ? 'critical' : weatherState.windSpeed > 50 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Infrastructure Status */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Infrastructure
        </h2>

        <div className="grid gap-2">
          <StatusBar label="Power Grid" value={parishState.status.power} />
          <StatusBar label="Communications" value={parishState.status.communications} />
          <StatusBar label="Roads" value={parishState.status.roads} />
          <StatusBar label="Hospital" value={parishState.status.hospital} />
          <StatusBar label="Water System" value={parishState.status.waterSystem} />
          {parishState.id === 'haven' && (
            <StatusBar label="Port Operations" value={parishState.status.port} />
          )}
          {parishState.id === 'gateway' && (
            <StatusBar label="Airport Operations" value={parishState.status.airport} />
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Resources
        </h2>

        <div className="grid gap-2">
          <StatusBar label="Fuel Reserves" value={parishState.resources.fuel} />
          <StatusBar label="Food Supplies" value={parishState.resources.food} />
          <StatusBar label="Water Supplies" value={parishState.resources.water} />
          <StatusBar
            label="Shelter Capacity"
            value={parishState.resources.shelterUsed}
            max={parishState.resources.shelterCapacity}
            showPercentage={false}
          />
          <StatusBar
            label="Generators"
            value={parishState.resources.generatorsDeployed}
            max={parishState.resources.generators}
            showPercentage={false}
          />
        </div>
      </div>

      {/* Production Status (if Meridian facility) */}
      {productionStatus && (
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-3">
          <h2 className="font-semibold flex items-center gap-2 text-primary">
            <Building2 className="h-4 w-4" />
            Meridian Production
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Daily Target</div>
              <div className="font-semibold">
                {productionStatus.dosesProduced.toLocaleString()} / {productionStatus.dosesTarget.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Inventory Buffer</div>
              <div className="font-semibold">{productionStatus.inventoryDays} days</div>
            </div>
          </div>

          <div className={cn(
            'text-sm font-semibold px-2 py-1 rounded inline-block',
            productionStatus.productionStatus === 'normal'
              ? 'bg-green-500/20 text-green-500'
              : productionStatus.productionStatus === 'reduced'
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-red-500/20 text-red-500'
          )}>
            Production: {productionStatus.productionStatus.toUpperCase()}
          </div>

          <p className="text-xs text-muted-foreground">
            340,000 patients depend on daily shipments. Current inventory covers{' '}
            {productionStatus.inventoryDays} days of disruption.
          </p>
        </div>
      )}

      {/* Current Crisis */}
      {parishState.currentCrisis && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h2 className="font-semibold flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            Active Crisis
          </h2>
          <p className="text-sm">{parishState.currentCrisis}</p>
        </div>
      )}
    </div>
  );
}
