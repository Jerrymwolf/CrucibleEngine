'use client';

/**
 * ProgressJourneyMap Component
 *
 * A visual journey map showing progress through the pre-crisis discovery phases.
 * Replaces a simple progress bar with an engaging, interactive visualization.
 *
 * Design: Three phases (Personal, Team, Briefing) shown as islands connected by paths.
 * Current step highlighted with animation. Completed steps show checkmarks.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  User,
  Users,
  Flag,
  CheckCircle2,
  Circle,
  Sparkles,
  Heart,
  BookOpen,
  Eye,
  FileText,
  Shield,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type JourneyStep =
  | 'quick-sort'
  | 'values-meaning'
  | 'values-story'
  | 'team-gallery'
  | 'team-definitions'
  | 'commitment'
  | 'briefing'
  | 'complete';

export type JourneyPhase = 'personal' | 'team' | 'briefing';

interface StepInfo {
  id: JourneyStep;
  label: string;
  shortLabel: string;
  phase: JourneyPhase;
  icon: React.ReactNode;
  description: string;
  emotionalNote: string;
}

export interface ProgressJourneyMapProps {
  /** Current step in the journey */
  currentStep: JourneyStep;
  /** Steps that have been completed */
  completedSteps: JourneyStep[];
  /** Steps to skip (won't be shown) */
  skippedSteps?: JourneyStep[];
  /** Callback when a completed step is clicked (for review) */
  onStepClick?: (step: JourneyStep) => void;
  /** Team name for display */
  teamName?: string;
  /** Participant name */
  participantName?: string;
  /** Compact mode for mobile */
  compact?: boolean;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

const STEP_CONFIG: StepInfo[] = [
  {
    id: 'quick-sort',
    label: 'Values Sort',
    shortLabel: 'Sort',
    phase: 'personal',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Discover your top 5 values',
    emotionalNote: 'Trust your instincts',
  },
  {
    id: 'values-meaning',
    label: 'Values Meaning',
    shortLabel: 'Meaning',
    phase: 'personal',
    icon: <Heart className="h-4 w-4" />,
    description: 'Define what they mean to you',
    emotionalNote: 'Go deeper',
  },
  {
    id: 'values-story',
    label: 'Values Story',
    shortLabel: 'Story',
    phase: 'personal',
    icon: <BookOpen className="h-4 w-4" />,
    description: 'Share a moment you lived them',
    emotionalNote: 'Be vulnerable',
  },
  {
    id: 'team-gallery',
    label: 'Gallery Walk',
    shortLabel: 'Gallery',
    phase: 'team',
    icon: <Eye className="h-4 w-4" />,
    description: 'See what your team values',
    emotionalNote: 'Find common ground',
  },
  {
    id: 'team-definitions',
    label: 'Team Values',
    shortLabel: 'Define',
    phase: 'team',
    icon: <FileText className="h-4 w-4" />,
    description: 'Define your shared values',
    emotionalNote: 'Build together',
  },
  {
    id: 'commitment',
    label: 'Commitment',
    shortLabel: 'Commit',
    phase: 'team',
    icon: <Shield className="h-4 w-4" />,
    description: 'Seal your team pledge',
    emotionalNote: 'Make it real',
  },
  {
    id: 'briefing',
    label: 'Storm Briefing',
    shortLabel: 'Briefing',
    phase: 'briefing',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Understand the stakes',
    emotionalNote: 'The storm approaches',
  },
];

const PHASE_CONFIG: Record<JourneyPhase, { label: string; icon: React.ReactNode; color: string }> = {
  personal: {
    label: 'Personal Discovery',
    icon: <User className="h-5 w-5" />,
    color: 'from-blue-500/20 to-blue-600/20',
  },
  team: {
    label: 'Team Alignment',
    icon: <Users className="h-5 w-5" />,
    color: 'from-purple-500/20 to-purple-600/20',
  },
  briefing: {
    label: 'Mission Briefing',
    icon: <Flag className="h-5 w-5" />,
    color: 'from-amber-500/20 to-amber-600/20',
  },
};

// =============================================================================
// STEP NODE COMPONENT
// =============================================================================

interface StepNodeProps {
  step: StepInfo;
  status: 'completed' | 'current' | 'upcoming';
  onClick?: () => void;
  compact?: boolean;
  index: number;
}

function StepNode({ step, status, onClick, compact, index }: StepNodeProps) {
  const isClickable = status === 'completed' && onClick;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        'relative flex flex-col items-center gap-1',
        isClickable && 'cursor-pointer group'
      )}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Step Circle */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-300',
          compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12',
          // Status-based styling
          status === 'completed' && 'bg-green-500/20 text-green-400 border-2 border-green-500/40',
          status === 'current' && 'bg-primary/20 text-primary border-2 border-primary shadow-lg shadow-primary/20',
          status === 'upcoming' && 'bg-muted/50 text-muted-foreground border-2 border-muted',
          // Hover for clickable
          isClickable && 'group-hover:bg-green-500/30 group-hover:scale-105'
        )}
      >
        {status === 'completed' ? (
          <CheckCircle2 className={cn('text-green-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        ) : (
          step.icon
        )}

        {/* Current step pulse animation */}
        {status === 'current' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Step Label */}
      {!compact && (
        <div className="text-center">
          <span
            className={cn(
              'text-[10px] sm:text-xs font-medium block',
              status === 'current' && 'text-primary',
              status === 'completed' && 'text-green-400',
              status === 'upcoming' && 'text-muted-foreground'
            )}
          >
            {step.shortLabel}
          </span>
        </div>
      )}

      {/* Tooltip on hover for completed steps */}
      {isClickable && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            Click to review
          </div>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// CONNECTION LINE COMPONENT
// =============================================================================

interface ConnectionLineProps {
  fromStatus: 'completed' | 'current' | 'upcoming';
  toStatus: 'completed' | 'current' | 'upcoming';
  compact?: boolean;
}

function ConnectionLine({ fromStatus, toStatus, compact }: ConnectionLineProps) {
  const isCompleted = fromStatus === 'completed';
  const isActive = fromStatus === 'completed' || fromStatus === 'current';

  return (
    <div
      className={cn(
        'flex-1 h-0.5 mx-1 rounded-full transition-all duration-500',
        compact ? 'mx-0.5' : 'mx-2',
        isCompleted && 'bg-green-500/50',
        isActive && !isCompleted && 'bg-primary/30',
        !isActive && 'bg-muted/30'
      )}
    >
      {/* Animated progress indicator for active line */}
      {isActive && !isCompleted && (
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '50%' }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

// =============================================================================
// PHASE SECTION COMPONENT
// =============================================================================

interface PhaseSectionProps {
  phase: JourneyPhase;
  steps: StepInfo[];
  currentStep: JourneyStep;
  completedSteps: JourneyStep[];
  onStepClick?: (step: JourneyStep) => void;
  compact?: boolean;
}

function PhaseSection({
  phase,
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  compact,
}: PhaseSectionProps) {
  const config = PHASE_CONFIG[phase];
  const phaseSteps = steps.filter((s) => s.phase === phase);

  if (phaseSteps.length === 0) return null;

  const getStepStatus = (stepId: JourneyStep): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Phase Header */}
      {!compact && (
        <div
          className={cn(
            'flex items-center gap-2 mb-3 px-2 py-1 rounded-lg',
            `bg-gradient-to-r ${config.color}`
          )}
        >
          {config.icon}
          <span className="text-xs font-medium truncate">{config.label}</span>
        </div>
      )}

      {/* Steps Row */}
      <div className="flex items-center">
        {phaseSteps.map((step, index) => {
          const status = getStepStatus(step.id);
          const stepIndex = steps.findIndex((s) => s.id === step.id);

          return (
            <div key={step.id} className="flex items-center flex-1">
              <StepNode
                step={step}
                status={status}
                onClick={status === 'completed' ? () => onStepClick?.(step.id) : undefined}
                compact={compact}
                index={stepIndex}
              />
              {index < phaseSteps.length - 1 && (
                <ConnectionLine
                  fromStatus={status}
                  toStatus={getStepStatus(phaseSteps[index + 1].id)}
                  compact={compact}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// CURRENT STEP INFO PANEL
// =============================================================================

interface CurrentStepPanelProps {
  step: StepInfo;
  progress: { current: number; total: number };
}

function CurrentStepPanel({ step, progress }: CurrentStepPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {step.icon}
            {step.label}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
          <p className="text-xs text-primary/80 mt-2 italic">&quot;{step.emotionalNote}&quot;</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{progress.current}</span>
          <span className="text-muted-foreground">/{progress.total}</span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProgressJourneyMap({
  currentStep,
  completedSteps,
  skippedSteps = [],
  onStepClick,
  teamName,
  participantName,
  compact = false,
  className,
}: ProgressJourneyMapProps) {
  // Filter out skipped steps
  const activeSteps = useMemo(
    () => STEP_CONFIG.filter((step) => !skippedSteps.includes(step.id)),
    [skippedSteps]
  );

  // Get current step info
  const currentStepInfo = activeSteps.find((s) => s.id === currentStep);
  const currentIndex = activeSteps.findIndex((s) => s.id === currentStep);
  const progress = {
    current: completedSteps.length + 1,
    total: activeSteps.length,
  };

  // Group steps by phase
  const phases: JourneyPhase[] = ['personal', 'team', 'briefing'];

  if (compact) {
    // Compact view - single row with all steps
    return (
      <div className={cn('px-4 py-3', className)}>
        <div className="flex items-center gap-1">
          {activeSteps.map((step, index) => {
            const status = completedSteps.includes(step.id)
              ? 'completed'
              : step.id === currentStep
                ? 'current'
                : 'upcoming';

            return (
              <div key={step.id} className="flex items-center">
                <StepNode
                  step={step}
                  status={status}
                  onClick={status === 'completed' ? () => onStepClick?.(step.id) : undefined}
                  compact
                  index={index}
                />
                {index < activeSteps.length - 1 && (
                  <ConnectionLine
                    fromStatus={status}
                    toStatus={
                      completedSteps.includes(activeSteps[index + 1].id)
                        ? 'completed'
                        : activeSteps[index + 1].id === currentStep
                          ? 'current'
                          : 'upcoming'
                    }
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full view with phases
  return (
    <div className={cn('px-4 py-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Pre-Crisis Discovery
          </h2>
          {teamName && (
            <p className="text-xs text-muted-foreground/70">
              {teamName}{participantName && ` - ${participantName}`}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">{progress.current}</span>
          <span className="text-muted-foreground text-sm">/{progress.total}</span>
        </div>
      </div>

      {/* Phase Sections */}
      <div className="flex gap-4">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center flex-1">
            <PhaseSection
              phase={phase}
              steps={activeSteps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={onStepClick}
              compact={compact}
            />
            {/* Phase connector */}
            {index < phases.length - 1 && (
              <div className="w-8 h-0.5 bg-muted/30 mx-2 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Info */}
      {currentStepInfo && currentStep !== 'complete' && (
        <CurrentStepPanel step={currentStepInfo} progress={progress} />
      )}
    </div>
  );
}

export default ProgressJourneyMap;
