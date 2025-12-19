'use client';

/**
 * ControlDeck Component
 *
 * Central control panel for facilitators to manage simulation phases,
 * intensity levels, and global settings.
 *
 * Features:
 * - Phase navigation with visual timeline
 * - Global intensity slider with descriptions
 * - Pause/Resume controls
 * - Session timer display
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Play,
  Pause,
  Gauge,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { INTENSITY_LEVELS } from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

export type PhaseId = 'lobby' | 'discovery' | 'briefing' | 'storm' | 'recovery' | 'debrief';

export interface Phase {
  id: PhaseId;
  label: string;
  description: string;
  icon: React.ReactNode;
  estimatedDuration: string;
}

export interface ControlDeckProps {
  currentPhase: PhaseId;
  isPaused: boolean;
  simulationTime: number; // minutes
  globalIntensity: number;
  onPhaseChange: (phase: PhaseId) => void;
  onTogglePause: () => void;
  onIntensityChange: (intensity: number) => void;
  isProcessing?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PHASES: Phase[] = [
  {
    id: 'lobby',
    label: 'Lobby',
    description: 'Teams forming and joining',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '5-10 min',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    description: 'Values exploration and commitment',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '20-30 min',
  },
  {
    id: 'briefing',
    label: 'Briefing',
    description: 'Hurricane approach and preparation',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '10-15 min',
  },
  {
    id: 'storm',
    label: 'Storm',
    description: 'Active crisis decision-making',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '45-60 min',
  },
  {
    id: 'recovery',
    label: 'Recovery',
    description: 'Aftermath and consequences',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '15-20 min',
  },
  {
    id: 'debrief',
    label: 'Debrief',
    description: 'Reflection and learning',
    icon: <Circle className="h-4 w-4" />,
    estimatedDuration: '30-45 min',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function PhaseTimeline({
  phases,
  currentPhase,
  onSelect,
}: {
  phases: Phase[];
  currentPhase: PhaseId;
  onSelect: (phase: PhaseId) => void;
}) {
  const { play: playSound } = useSound();
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);

  const handleSelect = (phase: Phase) => {
    playSound('ui', 'click');
    onSelect(phase.id);
  };

  return (
    <div className="space-y-1">
      {phases.map((phase, index) => {
        const isActive = phase.id === currentPhase;
        const isCompleted = index < currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => handleSelect(phase)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
              isActive
                ? 'bg-primary/20 border border-primary/40'
                : 'hover:bg-muted/50 border border-transparent',
              isCompleted && 'opacity-60'
            )}
          >
            {/* Status Icon */}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-green-500/20 text-green-500',
                isUpcoming && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isActive ? (
                <span>{index + 1}</span>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* Phase Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-medium text-sm',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {phase.label}
                </span>
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded"
                  >
                    Active
                  </motion.span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {phase.description}
              </p>
            </div>

            {/* Duration */}
            <div className="text-xs text-muted-foreground shrink-0">
              {phase.estimatedDuration}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function IntensityControl({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const { play: playSound } = useSound();
  const level = INTENSITY_LEVELS[value as keyof typeof INTENSITY_LEVELS];

  const handleChange = (newValue: number[]) => {
    const intensity = newValue[0] ?? 5;
    onChange(intensity);
  };

  const getIntensityColor = () => {
    if (value <= 3) return 'text-green-500';
    if (value <= 6) return 'text-amber-500';
    return 'text-red-500';
  };

  const getIntensityBg = () => {
    if (value <= 3) return 'from-green-500/20 to-green-500/5';
    if (value <= 6) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-gradient-to-b border transition-colors',
        getIntensityBg(),
        value >= 8 ? 'border-red-500/30' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className={cn('h-5 w-5', getIntensityColor())} />
          <span className="font-semibold">Global Intensity</span>
        </div>
        <div className={cn('text-3xl font-bold', getIntensityColor())}>{value}</div>
      </div>

      <Slider
        value={[value]}
        onValueChange={handleChange}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        className="mb-3"
      />

      <AnimatePresence mode="wait">
        {level && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-1"
          >
            <div className={cn('text-sm font-medium', getIntensityColor())}>
              {level.name}
            </div>
            <p className="text-xs text-muted-foreground">{level.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {value >= 8 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 rounded text-xs text-red-400"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>High intensity may overwhelm teams</span>
        </motion.div>
      )}
    </div>
  );
}

function SessionTimer({ minutes }: { minutes: number }) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-sm text-muted-foreground">Session Time</div>
        <div className="text-xl font-mono font-bold">
          {hours > 0 && `${hours}h `}
          {mins}m
        </div>
      </div>
    </div>
  );
}

function PauseControl({
  isPaused,
  onToggle,
  disabled,
}: {
  isPaused: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { play: playSound } = useSound();

  const handleToggle = () => {
    playSound('dramatic', 'phaseTransition');
    onToggle();
  };

  return (
    <Button
      variant={isPaused ? 'default' : 'secondary'}
      size="lg"
      className={cn(
        'w-full',
        isPaused && 'bg-amber-500 hover:bg-amber-600 text-white'
      )}
      onClick={handleToggle}
      disabled={disabled}
    >
      {isPaused ? (
        <>
          <Play className="h-5 w-5 mr-2" />
          Resume Simulation
        </>
      ) : (
        <>
          <Pause className="h-5 w-5 mr-2" />
          Pause Simulation
        </>
      )}
    </Button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ControlDeck({
  currentPhase,
  isPaused,
  simulationTime,
  globalIntensity,
  onPhaseChange,
  onTogglePause,
  onIntensityChange,
  isProcessing = false,
  className,
}: ControlDeckProps) {
  const { play: playSound } = useSound();
  const [confirmPhase, setConfirmPhase] = useState<PhaseId | null>(null);

  const canPause = ['storm', 'recovery'].includes(currentPhase);

  const handlePhaseSelect = (phase: PhaseId) => {
    if (phase === currentPhase) return;

    // Ask for confirmation before changing phase
    setConfirmPhase(phase);
  };

  const confirmPhaseChange = () => {
    if (confirmPhase) {
      playSound('dramatic', 'phaseTransition');
      onPhaseChange(confirmPhase);
      setConfirmPhase(null);
    }
  };

  const cancelPhaseChange = () => {
    setConfirmPhase(null);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Session Timer */}
      <SessionTimer minutes={simulationTime} />

      {/* Pause Control (only during active phases) */}
      {canPause && (
        <PauseControl
          isPaused={isPaused}
          onToggle={onTogglePause}
          disabled={isProcessing}
        />
      )}

      {/* Paused Indicator */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-lg text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-500">
              <Pause className="h-5 w-5" />
              <span className="font-semibold">Simulation Paused</span>
            </div>
            <p className="text-xs text-amber-400/80 mt-1">
              All team activity is on hold
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase Timeline */}
      <div className="panel">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Session Phase
        </h2>
        <PhaseTimeline
          phases={PHASES}
          currentPhase={currentPhase}
          onSelect={handlePhaseSelect}
        />
      </div>

      {/* Intensity Control (only during crisis phases) */}
      {['storm', 'recovery', 'briefing'].includes(currentPhase) && (
        <IntensityControl
          value={globalIntensity}
          onChange={onIntensityChange}
          disabled={isPaused || isProcessing}
        />
      )}

      {/* Phase Change Confirmation */}
      <AnimatePresence>
        {confirmPhase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={cancelPhaseChange}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="panel max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-semibold">Change Phase?</h3>
              </div>

              <p className="text-muted-foreground mb-6">
                Are you sure you want to change from{' '}
                <span className="font-semibold text-foreground">
                  {PHASES.find((p) => p.id === currentPhase)?.label}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {PHASES.find((p) => p.id === confirmPhase)?.label}
                </span>
                ? This will affect all teams.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={cancelPhaseChange}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmPhaseChange}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ControlDeck;
