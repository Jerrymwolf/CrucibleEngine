'use client';

/**
 * Enhanced ResourceDashboard Component
 *
 * Features:
 * - Animated resource bars with smooth transitions
 * - Flash effects on significant changes
 * - Sound cues for critical levels
 * - Pulse animation for danger states
 * - Value change indicators (+/- deltas)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Zap,
  Radio,
  Truck,
  Heart,
  Droplets,
  Utensils,
  Fuel,
  Home,
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Anchor,
  Plane,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ResourceData {
  generators: number;
  generatorsDeployed: number;
  medicalSupplies: string;
  fuel: number;
  food: number;
  water: number;
  shelterUsed: number;
  shelterCapacity: number;
}

interface StatusData {
  power: number;
  communications: number;
  roads: number;
  hospital: number;
  port: number;
  airport: number;
  waterSystem: number;
  populationRemaining: number;
  populationEvacuated: number;
  casualties: number;
  injured: number;
}

interface ResourceDashboardProps {
  resources: ResourceData;
  status: StatusData;
  morale: number;
  parishId: string;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CRITICAL_THRESHOLD = 25;
const WARNING_THRESHOLD = 50;
const CHANGE_THRESHOLD = 5; // Flash if change > 5%

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(value: number): string {
  if (value >= 80) return 'text-green-500';
  if (value >= WARNING_THRESHOLD) return 'text-amber-500';
  if (value >= CRITICAL_THRESHOLD) return 'text-orange-500';
  return 'text-red-500';
}

function getProgressColor(value: number): string {
  if (value >= 80) return '[&>div]:bg-green-500';
  if (value >= WARNING_THRESHOLD) return '[&>div]:bg-amber-500';
  if (value >= CRITICAL_THRESHOLD) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
}

function getMedicalLevel(level: string): { value: number; label: string } {
  switch (level) {
    case 'high':
      return { value: 100, label: 'HIGH' };
    case 'medium':
      return { value: 65, label: 'MED' };
    case 'low':
      return { value: 30, label: 'LOW' };
    default:
      return { value: 0, label: 'NONE' };
  }
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AnimatedProgressBar({
  value,
  previousValue,
  label,
  icon,
  unit = '%',
  showChange = true,
  onCritical,
}: {
  value: number;
  previousValue?: number;
  label: string;
  icon: React.ReactNode;
  unit?: string;
  showChange?: boolean;
  onCritical?: () => void;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [showDelta, setShowDelta] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const prevValueRef = useRef(previousValue ?? value);

  const delta = value - prevValueRef.current;
  const hasSignificantChange = Math.abs(delta) >= CHANGE_THRESHOLD;
  const isCritical = value < CRITICAL_THRESHOLD;

  useEffect(() => {
    // Check for significant changes
    if (hasSignificantChange) {
      setIsFlashing(true);
      setShowDelta(true);

      const flashTimer = setTimeout(() => setIsFlashing(false), 1000);
      const deltaTimer = setTimeout(() => setShowDelta(false), 3000);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(deltaTimer);
      };
    }

    // Check for critical state
    if (isCritical && prevValueRef.current >= CRITICAL_THRESHOLD) {
      onCritical?.();
    }

    prevValueRef.current = value;
  }, [value, hasSignificantChange, isCritical, onCritical]);

  // Animate the display value
  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div
      className={cn(
        'space-y-1 p-2 rounded-lg transition-colors',
        isFlashing && delta < 0 && 'bg-red-500/20',
        isFlashing && delta > 0 && 'bg-green-500/20',
        isCritical && 'animate-pulse-slow'
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-2">
          {/* Delta indicator */}
          <AnimatePresence>
            {showDelta && showChange && delta !== 0 && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={cn(
                  'flex items-center gap-0.5 text-[10px] font-bold',
                  delta > 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {delta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {delta > 0 ? '+' : ''}
                {delta}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Current value */}
          <motion.span
            className={cn('font-mono font-bold', getStatusColor(value))}
            animate={isFlashing ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {displayValue}
            {unit}
          </motion.span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress
          value={displayValue}
          className={cn('h-2', getProgressColor(value))}
        />

        {/* Critical warning overlay */}
        {isCritical && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-end pr-1"
          >
            <AlertTriangle className="h-3 w-3 text-red-500" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PopulationStat({
  value,
  previousValue,
  label,
  colorClass,
  isCritical = false,
}: {
  value: number;
  previousValue?: number;
  label: string;
  colorClass?: string;
  isCritical?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const delta = previousValue !== undefined ? value - previousValue : 0;

  // Animate counting
  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 800;
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
    <div className="text-center">
      <motion.div
        className={cn('text-2xl font-mono', colorClass)}
        animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: isCritical ? Infinity : 0 }}
      >
        {displayValue.toLocaleString()}
      </motion.div>
      <div className="text-xs text-muted-foreground">{label}</div>

      {/* Delta indicator */}
      <AnimatePresence>
        {delta !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'text-[10px] font-bold mt-1',
              delta > 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResourceDashboard({
  resources,
  status,
  morale,
  parishId,
  className,
}: ResourceDashboardProps) {
  const { play: playSound } = useSound();
  const prevStatusRef = useRef<StatusData | null>(null);
  const prevResourcesRef = useRef<ResourceData | null>(null);
  const prevMoraleRef = useRef<number>(morale);

  const medical = getMedicalLevel(resources.medicalSupplies);
  const shelterPercent =
    resources.shelterCapacity > 0
      ? Math.round((resources.shelterUsed / resources.shelterCapacity) * 100)
      : 0;

  // Parish-specific features
  const showPort = parishId === 'haven';
  const showAirport = parishId === 'gateway';

  // Handle critical alerts
  const handleCritical = useCallback(
    (resource: string) => {
      playSound('dramatic', 'criticalAlert');
    },
    [playSound]
  );

  // Track previous values for delta calculations
  useEffect(() => {
    prevStatusRef.current = status;
    prevResourcesRef.current = resources;
    prevMoraleRef.current = morale;
  }, [status, resources, morale]);

  const prevStatus = prevStatusRef.current;
  const prevResources = prevResourcesRef.current;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Infrastructure Status */}
      <div className="panel">
        <h3 className="panel-header flex items-center gap-2">
          Infrastructure Status
          {/* Overall warning indicator */}
          {(status.power < WARNING_THRESHOLD ||
            status.communications < WARNING_THRESHOLD ||
            status.roads < WARNING_THRESHOLD) && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </motion.div>
          )}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <AnimatedProgressBar
            value={status.power}
            previousValue={prevStatus?.power}
            label="Power"
            icon={<Zap className="h-3 w-3" />}
            onCritical={() => handleCritical('power')}
          />
          <AnimatedProgressBar
            value={status.communications}
            previousValue={prevStatus?.communications}
            label="Comms"
            icon={<Radio className="h-3 w-3" />}
            onCritical={() => handleCritical('communications')}
          />
          <AnimatedProgressBar
            value={status.roads}
            previousValue={prevStatus?.roads}
            label="Roads"
            icon={<Truck className="h-3 w-3" />}
            onCritical={() => handleCritical('roads')}
          />
          <AnimatedProgressBar
            value={status.hospital}
            previousValue={prevStatus?.hospital}
            label="Hospital"
            icon={<Heart className="h-3 w-3" />}
            onCritical={() => handleCritical('hospital')}
          />
          <AnimatedProgressBar
            value={status.waterSystem}
            previousValue={prevStatus?.waterSystem}
            label="Water Sys"
            icon={<Droplets className="h-3 w-3" />}
            onCritical={() => handleCritical('waterSystem')}
          />
          {showPort && (
            <AnimatedProgressBar
              value={status.port}
              previousValue={prevStatus?.port}
              label="Port"
              icon={<Anchor className="h-3 w-3" />}
              onCritical={() => handleCritical('port')}
            />
          )}
          {showAirport && (
            <AnimatedProgressBar
              value={status.airport}
              previousValue={prevStatus?.airport}
              label="Airport"
              icon={<Plane className="h-3 w-3" />}
              onCritical={() => handleCritical('airport')}
            />
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="panel">
        <h3 className="panel-header">Resources</h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Generators - special display */}
          <motion.div
            className="p-2 bg-muted/30 rounded-lg"
            animate={
              resources.generatorsDeployed === resources.generators
                ? { borderColor: ['transparent', 'rgb(34 197 94 / 0.5)', 'transparent'] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3 w-3" /> Generators
            </div>
            <div className="text-lg font-mono">
              <motion.span
                key={resources.generatorsDeployed}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  resources.generatorsDeployed === resources.generators
                    ? 'text-green-500'
                    : 'text-foreground'
                )}
              >
                {resources.generatorsDeployed}
              </motion.span>
              <span className="text-muted-foreground">/{resources.generators}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">deployed/total</div>
          </motion.div>

          {/* Medical */}
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Heart className="h-3 w-3" /> Medical
            </div>
            <motion.div
              className={cn('text-lg font-mono', getStatusColor(medical.value))}
              animate={medical.value < 50 ? { opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {medical.label}
            </motion.div>
            <Progress
              value={medical.value}
              className={cn('h-1 mt-1', getProgressColor(medical.value))}
            />
          </div>

          <AnimatedProgressBar
            value={resources.fuel}
            previousValue={prevResources?.fuel}
            label="Fuel"
            icon={<Fuel className="h-3 w-3" />}
            onCritical={() => handleCritical('fuel')}
          />
          <AnimatedProgressBar
            value={resources.food}
            previousValue={prevResources?.food}
            label="Food"
            icon={<Utensils className="h-3 w-3" />}
            onCritical={() => handleCritical('food')}
          />
          <AnimatedProgressBar
            value={resources.water}
            previousValue={prevResources?.water}
            label="Water"
            icon={<Droplets className="h-3 w-3" />}
            onCritical={() => handleCritical('water')}
          />

          {/* Shelter - special display */}
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Home className="h-3 w-3" /> Shelter
            </div>
            <motion.div
              className="text-lg font-mono"
              key={resources.shelterUsed}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {resources.shelterUsed.toLocaleString()}
            </motion.div>
            <div className="text-[10px] text-muted-foreground">
              of {resources.shelterCapacity.toLocaleString()} capacity
            </div>
            <Progress
              value={shelterPercent}
              className={cn(
                'h-1 mt-1',
                shelterPercent > 90
                  ? '[&>div]:bg-red-500'
                  : shelterPercent > 70
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-green-500'
              )}
            />
          </div>
        </div>
      </div>

      {/* Population & Morale */}
      <div className="panel">
        <h3 className="panel-header">Population</h3>
        <div className="grid grid-cols-3 gap-3">
          <PopulationStat
            value={status.populationRemaining}
            previousValue={prevStatus?.populationRemaining}
            label="Remaining"
          />
          <PopulationStat
            value={status.populationEvacuated}
            previousValue={prevStatus?.populationEvacuated}
            label="Evacuated"
            colorClass="text-blue-500"
          />
          <PopulationStat
            value={status.casualties}
            previousValue={prevStatus?.casualties}
            label="Casualties"
            colorClass={status.casualties > 0 ? 'text-red-500' : 'text-muted-foreground'}
            isCritical={status.casualties > 0}
          />
        </div>

        {/* Morale */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Morale
            </span>
            <div className="flex items-center gap-2">
              {/* Morale delta */}
              <AnimatePresence>
                {prevMoraleRef.current !== morale && (
                  <motion.span
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      'text-xs font-bold',
                      morale > prevMoraleRef.current ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {morale > prevMoraleRef.current ? '+' : ''}
                    {morale - prevMoraleRef.current}
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.span
                className={cn('font-mono font-semibold', getStatusColor(morale))}
                animate={morale < CRITICAL_THRESHOLD ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: morale < CRITICAL_THRESHOLD ? Infinity : 0 }}
              >
                {morale}%
              </motion.span>
            </div>
          </div>
          <div className="relative">
            <Progress
              value={morale}
              className={cn('h-3', getProgressColor(morale))}
            />
            {morale < CRITICAL_THRESHOLD && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute right-1 top-1/2 -translate-y-1/2"
              >
                <AlertTriangle className="h-3 w-3 text-red-500" />
              </motion.div>
            )}
          </div>

          {/* Morale status text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'text-xs mt-2 text-center',
              morale >= 80
                ? 'text-green-500'
                : morale >= 50
                ? 'text-amber-500'
                : 'text-red-500'
            )}
          >
            {morale >= 80
              ? 'Community is resilient'
              : morale >= 50
              ? 'Growing concern among residents'
              : morale >= 25
              ? 'Panic spreading through community'
              : 'Community is in crisis'}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

export default ResourceDashboard;
