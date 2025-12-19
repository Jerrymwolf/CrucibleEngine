'use client';

/**
 * WeatherPanel Component (Enhanced)
 *
 * Displays hurricane and weather information with:
 * - Animated hurricane category display
 * - Trajectory visualization with certainty indicator
 * - Real-time countdown with urgency indicators
 * - Current conditions with animated icons
 * - Storm surge warning with visual escalation
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Progress } from '@/components/ui/progress';
import {
  CloudRain,
  Wind,
  Eye,
  Waves,
  AlertTriangle,
  Target,
  Clock,
  Thermometer,
  Compass,
  CloudLightning,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface HurricaneData {
  name: string;
  category: number;
  trajectory: string;
  certaintyPercent: number;
  hoursToImpact: number;
  hasLandfall: boolean;
  currentAdvisory: string;
}

interface WeatherData {
  hurricane: HurricaneData;
  windSpeed: number;
  rainfall: number;
  visibility: number;
  conditions: string;
  stormSurge: number;
}

export interface WeatherPanelProps {
  weather: WeatherData;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCategoryColor(category: number): string {
  switch (category) {
    case 1:
      return 'text-amber-400';
    case 2:
      return 'text-amber-500';
    case 3:
      return 'text-orange-500';
    case 4:
      return 'text-red-500';
    case 5:
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

function getCategoryBgColor(category: number): string {
  switch (category) {
    case 1:
      return 'bg-amber-400/20 border-amber-400/50';
    case 2:
      return 'bg-amber-500/20 border-amber-500/50';
    case 3:
      return 'bg-orange-500/20 border-orange-500/50';
    case 4:
      return 'bg-red-500/20 border-red-500/50';
    case 5:
      return 'bg-red-600/20 border-red-600/50';
    default:
      return 'bg-muted/20 border-muted/50';
  }
}

function getTrajectoryInfo(trajectory: string): { label: string; severity: 'low' | 'medium' | 'high'; description: string } {
  switch (trajectory) {
    case 'direct':
      return { label: 'DIRECT HIT', severity: 'high', description: 'Eye expected to pass directly over island' };
    case 'glancing':
      return { label: 'GLANCING BLOW', severity: 'medium', description: 'Eye will pass nearby with significant impact' };
    case 'miss-north':
      return { label: 'PASSING NORTH', severity: 'low', description: 'Storm tracking north of island' };
    case 'miss-south':
      return { label: 'PASSING SOUTH', severity: 'low', description: 'Storm tracking south of island' };
    case 'stall':
      return { label: 'STALLED', severity: 'medium', description: 'Storm movement has stopped - prolonged impact likely' };
    default:
      return { label: 'UNCERTAIN', severity: 'medium', description: 'Track forecast confidence is low' };
  }
}

function getConditionsLabel(conditions: string): { label: string; icon: React.ReactNode } {
  switch (conditions) {
    case 'clear':
      return { label: 'Clear Skies', icon: <Eye className="h-4 w-4" /> };
    case 'cloudy':
      return { label: 'Overcast', icon: <CloudRain className="h-4 w-4" /> };
    case 'rain':
      return { label: 'Rain', icon: <CloudRain className="h-4 w-4" /> };
    case 'storm':
      return { label: 'Tropical Storm', icon: <CloudLightning className="h-4 w-4" /> };
    case 'hurricane':
      return { label: 'Hurricane Conditions', icon: <CloudLightning className="h-4 w-4" /> };
    default:
      return { label: conditions, icon: <CloudRain className="h-4 w-4" /> };
  }
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AnimatedCategory({ category }: { category: number }) {
  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center w-20 h-20 rounded-full border-4',
        getCategoryBgColor(category)
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      {/* Rotating ring for high categories */}
      {category >= 3 && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed border-current opacity-30"
          style={{ borderColor: 'currentColor' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Category number */}
      <div className="text-center">
        <div className={cn('text-3xl font-bold', getCategoryColor(category))}>
          {category}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          CAT
        </div>
      </div>

      {/* Pulse effect for Cat 4+ */}
      {category >= 4 && (
        <motion.div
          className="absolute inset-0 rounded-full bg-red-500"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function CountdownTimer({ hours, hasLandfall }: { hours: number; hasLandfall: boolean }) {
  const [flash, setFlash] = useState(false);

  // Flash effect for critical countdown
  useEffect(() => {
    if (hours <= 6 && hours > 0) {
      const interval = setInterval(() => setFlash((f) => !f), 1000);
      return () => clearInterval(interval);
    }
  }, [hours]);

  if (hasLandfall) {
    return (
      <motion.div
        className="text-center p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
        <div className="text-xl font-bold text-red-500">LANDFALL</div>
        <div className="text-xs text-red-400">Hurricane is making landfall</div>
      </motion.div>
    );
  }

  if (hours === -1) {
    return (
      <div className="text-center p-4 bg-muted/30 rounded-lg">
        <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
        <div className="text-lg font-mono">--:--</div>
        <div className="text-xs text-muted-foreground">No impact expected</div>
      </div>
    );
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return (
    <div className={cn(
      'text-center p-4 rounded-lg transition-colors',
      hours <= 6 && 'bg-red-500/20 border border-red-500/50',
      hours <= 12 && hours > 6 && 'bg-orange-500/20 border border-orange-500/50',
      hours <= 24 && hours > 12 && 'bg-amber-500/20 border border-amber-500/50',
      hours > 24 && 'bg-muted/30'
    )}>
      <Clock className={cn(
        'h-5 w-5 mx-auto mb-2',
        hours <= 6 && 'text-red-500',
        hours <= 12 && hours > 6 && 'text-orange-500',
        hours <= 24 && hours > 12 && 'text-amber-500',
        hours > 24 && 'text-muted-foreground'
      )} />

      <div className="flex items-center justify-center gap-2">
        {days > 0 && (
          <>
            <motion.span
              className="text-2xl font-mono font-bold"
              animate={hours <= 24 ? { opacity: flash ? 0.7 : 1 } : {}}
            >
              {days}d
            </motion.span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <motion.span
          className={cn(
            'text-2xl font-mono font-bold',
            hours <= 6 && 'text-red-500',
            hours <= 12 && hours > 6 && 'text-orange-500',
            hours <= 24 && hours > 12 && 'text-amber-500'
          )}
          animate={hours <= 12 ? { opacity: flash ? 0.7 : 1 } : {}}
        >
          {remainingHours}h
        </motion.span>
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        {hours <= 6 ? 'IMMINENT IMPACT' : hours <= 12 ? 'PREPARE NOW' : hours <= 24 ? 'Final preparations' : 'Until impact'}
      </div>
    </div>
  );
}

function TrajectoryDisplay({ trajectory, certainty }: { trajectory: string; certainty: number }) {
  const info = getTrajectoryInfo(trajectory);

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      info.severity === 'high' && 'bg-red-500/10 border-red-500/50',
      info.severity === 'medium' && 'bg-amber-500/10 border-amber-500/50',
      info.severity === 'low' && 'bg-green-500/10 border-green-500/50'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Target className={cn(
          'h-4 w-4',
          info.severity === 'high' && 'text-red-500',
          info.severity === 'medium' && 'text-amber-500',
          info.severity === 'low' && 'text-green-500'
        )} />
        <span className="font-bold">{info.label}</span>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {info.description}
      </p>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Forecast confidence</span>
          <span className="font-mono">{certainty}%</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              certainty >= 80 && 'bg-green-500',
              certainty >= 50 && certainty < 80 && 'bg-amber-500',
              certainty < 50 && 'bg-red-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${certainty}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

function ConditionCard({
  icon,
  label,
  value,
  unit,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit: string;
  warning?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        'p-3 rounded-lg',
        warning ? 'bg-red-500/10 border border-red-500/30' : 'bg-muted/30'
      )}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={cn(
        'text-xl font-mono font-semibold',
        warning && 'text-red-500'
      )}>
        {value}
        <span className="text-sm text-muted-foreground ml-1">{unit}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeatherPanel({ weather, className }: WeatherPanelProps) {
  const { play: playSound } = useSound();
  const conditionsInfo = getConditionsLabel(weather.conditions);
  const [prevCategory, setPrevCategory] = useState(weather.hurricane.category);

  // Play sound when category changes
  useEffect(() => {
    if (weather.hurricane.category !== prevCategory) {
      if (weather.hurricane.category > prevCategory) {
        playSound('dramatic', 'criticalAlert');
      }
      setPrevCategory(weather.hurricane.category);
    }
  }, [weather.hurricane.category, prevCategory, playSound]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hurricane Header */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Hurricane {weather.hurricane.name}</h3>
            <p className="text-xs text-muted-foreground">
              {weather.conditions === 'hurricane' ? 'Active hurricane conditions' : 'Approaching storm system'}
            </p>
          </div>
          <AnimatedCategory category={weather.hurricane.category} />
        </div>

        {/* Countdown Timer */}
        <CountdownTimer
          hours={weather.hurricane.hoursToImpact}
          hasLandfall={weather.hurricane.hasLandfall}
        />
      </div>

      {/* Trajectory */}
      <div className="panel">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Compass className="h-4 w-4 text-muted-foreground" />
          Projected Track
        </h4>
        <TrajectoryDisplay
          trajectory={weather.hurricane.trajectory}
          certainty={weather.hurricane.certaintyPercent}
        />
      </div>

      {/* Current Conditions */}
      <div className="panel">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          {conditionsInfo.icon}
          Current: {conditionsInfo.label}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <ConditionCard
            icon={<Wind className="h-3 w-3" />}
            label="Wind Speed"
            value={weather.windSpeed}
            unit="mph"
            warning={weather.windSpeed >= 100}
          />
          <ConditionCard
            icon={<CloudRain className="h-3 w-3" />}
            label="Rainfall"
            value={weather.rainfall.toFixed(1)}
            unit="in/hr"
            warning={weather.rainfall >= 3}
          />
          <ConditionCard
            icon={<Eye className="h-3 w-3" />}
            label="Visibility"
            value={weather.visibility}
            unit="%"
            warning={weather.visibility <= 20}
          />
          <ConditionCard
            icon={<Waves className="h-3 w-3" />}
            label="Storm Surge"
            value={weather.stormSurge}
            unit="ft"
            warning={weather.stormSurge >= 8}
          />
        </div>
      </div>

      {/* Advisory */}
      <AnimatePresence>
        {weather.hurricane.currentAdvisory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel"
          >
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Latest Advisory
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {weather.hurricane.currentAdvisory}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WeatherPanel;
