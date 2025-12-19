'use client';

/**
 * DecisionReplay Component
 *
 * Dramatic step-by-step replay of team decisions during debrief.
 * Unlike the timeline view, this component walks through each decision
 * with cinematic animations and emotional framing.
 *
 * Features:
 * - Auto-play or manual step-through
 * - Dramatic reveal of each decision
 * - Context reminders (what was happening)
 * - Consequence visualization
 * - "In the moment" vs "Looking back" framing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import type { DilemmaPhase } from '@crucible/shared';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Users,
  MessageSquare,
  Zap,
  Eye,
  CloudLightning,
  Heart,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface ReplayDecision {
  id: string;
  timestamp: number; // Simulation time in seconds
  phase: DilemmaPhase;
  title: string;
  personaName?: string;
  personaRole?: string;
  setup: string; // The situation description
  options: string[];
  chosenOption: number; // Index of chosen option
  rationale: string;
  consequences: ReplayConsequence[];
  valuesAtStake: string[];
  valuesAlignment: 'aligned' | 'conflicted' | 'compromised';
  isNotable: boolean;
  notableReason?: string;
}

export interface ReplayConsequence {
  type: 'immediate' | 'ripple' | 'delayed';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface DecisionReplayProps {
  teamName: string;
  decisions: ReplayDecision[];
  onComplete?: () => void;
  autoPlaySpeed?: number; // ms per decision, 0 = manual only
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PHASE_CONFIG = {
  watch: {
    label: 'Watch Phase',
    icon: Eye,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    description: 'The storm was distant. Time felt abundant.',
  },
  crisis: {
    label: 'Crisis Phase',
    icon: CloudLightning,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    description: 'Every second mattered. Pressure mounted.',
  },
  recovery: {
    label: 'Recovery Phase',
    icon: Heart,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    description: 'The storm passed. Now, the reckoning.',
  },
};

const ALIGNMENT_CONFIG = {
  aligned: {
    label: 'Values Aligned',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'This decision honored your stated values.',
  },
  conflicted: {
    label: 'Values Conflicted',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'This decision forced a trade-off between values.',
  },
  compromised: {
    label: 'Values Compromised',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: 'This decision contradicted your stated values.',
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function PhaseIndicator({ phase }: { phase: DilemmaPhase }) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', config.color)}>
      <Icon className="h-5 w-5" />
      <span className="font-semibold">{config.label}</span>
    </div>
  );
}

function TimeDisplay({ timestamp }: { timestamp: number }) {
  const hours = Math.floor(Math.abs(timestamp) / 3600);
  const minutes = Math.floor((Math.abs(timestamp) % 3600) / 60);
  const sign = timestamp >= 0 ? '+' : '-';
  const timeStr = `T${sign}${hours}h ${minutes}m`;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="font-mono text-sm">{timeStr}</span>
    </div>
  );
}

function ContextCard({
  decision,
  isVisible,
}: {
  decision: ReplayDecision;
  isVisible: boolean;
}) {
  const phaseConfig = PHASE_CONFIG[decision.phase];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'p-6 rounded-xl border-2',
            phaseConfig.bgColor,
            phaseConfig.borderColor
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <PhaseIndicator phase={decision.phase} />
            <TimeDisplay timestamp={decision.timestamp} />
          </div>

          <p className="text-sm text-muted-foreground italic mb-4">
            {phaseConfig.description}
          </p>

          {decision.personaName && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-background/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{decision.personaName}</div>
                {decision.personaRole && (
                  <div className="text-sm text-muted-foreground">
                    {decision.personaRole}
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 className="text-xl font-bold mb-2">{decision.title}</h3>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SetupNarration({
  setup,
  isVisible,
}: {
  setup: string;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="p-6 bg-muted/30 rounded-xl"
        >
          <p className="text-lg leading-relaxed">{setup}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OptionsReveal({
  options,
  chosenIndex,
  isRevealed,
  isChoiceRevealed,
}: {
  options: string[];
  chosenIndex: number;
  isRevealed: boolean;
  isChoiceRevealed: boolean;
}) {
  return (
    <AnimatePresence>
      {isRevealed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-3"
        >
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            The Options
          </div>
          {options.map((option, index) => {
            const isChosen = index === chosenIndex;
            const showAsChosen = isChoiceRevealed && isChosen;
            const showAsNotChosen = isChoiceRevealed && !isChosen;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: showAsNotChosen ? 0.4 : 1,
                  x: 0,
                  scale: showAsChosen ? 1.02 : 1,
                }}
                transition={{
                  duration: 0.3,
                  delay: 0.6 + index * 0.15,
                }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  showAsChosen
                    ? 'border-primary bg-primary/10'
                    : showAsNotChosen
                      ? 'border-muted bg-muted/20'
                      : 'border-muted bg-muted/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      showAsChosen
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </div>
                  <p className="text-sm">{option}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChoiceReveal({
  decision,
  isVisible,
}: {
  decision: ReplayDecision;
  isVisible: boolean;
}) {
  const alignmentConfig = ALIGNMENT_CONFIG[decision.valuesAlignment];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 300 }}
          className="space-y-4"
        >
          {/* Your Choice */}
          <div className="p-6 bg-primary/5 border-2 border-primary rounded-xl">
            <div className="text-sm font-semibold text-primary mb-2">
              Your Team Chose
            </div>
            <p className="text-lg font-bold">
              &ldquo;{decision.options[decision.chosenOption]}&rdquo;
            </p>
          </div>

          {/* Rationale */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-semibold">Team Rationale</span>
            </div>
            <p className="text-sm italic">&ldquo;{decision.rationale}&rdquo;</p>
          </div>

          {/* Values Alignment */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'p-4 rounded-lg',
              alignmentConfig.bgColor
            )}
          >
            <div className={cn('font-semibold mb-1', alignmentConfig.color)}>
              {alignmentConfig.label}
            </div>
            <p className="text-sm text-muted-foreground">
              {alignmentConfig.description}
            </p>
            {decision.valuesAtStake.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {decision.valuesAtStake.map((value) => (
                  <span
                    key={value}
                    className="px-2 py-0.5 bg-background/50 rounded text-xs font-medium"
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Notable Marker */}
          {decision.isNotable && decision.notableReason && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg"
            >
              <div className="flex items-center gap-2 text-amber-500 font-semibold mb-1">
                <Target className="h-4 w-4" />
                Notable Moment
              </div>
              <p className="text-sm">{decision.notableReason}</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConsequencesReveal({
  consequences,
  isVisible,
}: {
  consequences: ReplayConsequence[];
  isVisible: boolean;
}) {
  const getConsequenceStyle = (impact: ReplayConsequence['impact']) => {
    switch (impact) {
      case 'positive':
        return 'border-green-500 bg-green-500/10 text-green-500';
      case 'negative':
        return 'border-red-500 bg-red-500/10 text-red-500';
      default:
        return 'border-muted bg-muted/30 text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && consequences.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              What Followed
            </span>
          </div>
          {consequences.map((consequence, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className={cn(
                'p-4 rounded-lg border-l-4',
                getConsequenceStyle(consequence.impact)
              )}
            >
              <div className="text-xs font-semibold uppercase mb-1">
                {consequence.type === 'immediate'
                  ? 'Immediate'
                  : consequence.type === 'ripple'
                    ? 'Ripple Effect'
                    : 'Delayed Impact'}
              </div>
              <p className="text-sm text-foreground">{consequence.description}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlaybackControls({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  currentIndex,
  totalCount,
  canGoBack,
  canGoForward,
}: {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={!canGoBack}
      >
        <SkipBack className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={!canGoBack}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="default"
        size="icon"
        onClick={onPlayPause}
        className="w-12 h-12"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-0.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!canGoForward}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          // Skip to end
          for (let i = currentIndex; i < totalCount - 1; i++) {
            onNext();
          }
        }}
        disabled={!canGoForward}
      >
        <SkipForward className="h-5 w-5" />
      </Button>

      <div className="ml-4 text-sm text-muted-foreground">
        Decision {currentIndex + 1} of {totalCount}
      </div>
    </div>
  );
}

function ProgressBar({
  decisions,
  currentIndex,
  onSelectDecision,
}: {
  decisions: ReplayDecision[];
  currentIndex: number;
  onSelectDecision: (index: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {decisions.map((decision, index) => {
        const phaseConfig = PHASE_CONFIG[decision.phase];
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <button
            key={decision.id}
            type="button"
            onClick={() => onSelectDecision(index)}
            className={cn(
              'h-2 flex-1 rounded-full transition-all',
              isCurrent
                ? phaseConfig.borderColor.replace('border-', 'bg-')
                : isPast
                  ? 'bg-muted-foreground/50'
                  : 'bg-muted'
            )}
            title={`Decision ${index + 1}: ${decision.title}`}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ReplayStage =
  | 'context'
  | 'setup'
  | 'options'
  | 'choice'
  | 'consequences'
  | 'transition';

export function DecisionReplay({
  teamName,
  decisions,
  onComplete,
  autoPlaySpeed = 0,
  className,
}: DecisionReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<ReplayStage>('context');
  const [isPlaying, setIsPlaying] = useState(autoPlaySpeed > 0);
  const { play: playSound } = useSound();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentDecision = decisions[currentIndex];
  const isLastDecision = currentIndex === decisions.length - 1;
  const isFirstDecision = currentIndex === 0;

  // Stage progression
  const stages: ReplayStage[] = [
    'context',
    'setup',
    'options',
    'choice',
    'consequences',
    'transition',
  ];

  const advanceStage = useCallback(() => {
    const currentStageIndex = stages.indexOf(stage);

    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1];
      setStage(nextStage);

      // Play sounds for dramatic moments
      if (nextStage === 'choice') {
        playSound('dramatic', 'decisionConfirm');
      } else if (nextStage === 'consequences') {
        playSound('dramatic', 'consequenceReveal');
      }
    } else {
      // Move to next decision
      if (!isLastDecision) {
        setCurrentIndex((prev) => prev + 1);
        setStage('context');
        playSound('ui', 'click');
      } else {
        setIsPlaying(false);
        onComplete?.();
      }
    }
  }, [stage, stages, isLastDecision, playSound, onComplete]);

  const goBack = useCallback(() => {
    const currentStageIndex = stages.indexOf(stage);

    if (currentStageIndex > 0) {
      setStage(stages[currentStageIndex - 1]);
    } else if (!isFirstDecision) {
      setCurrentIndex((prev) => prev - 1);
      setStage('consequences');
    }
    playSound('ui', 'click');
  }, [stage, stages, isFirstDecision, playSound]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && autoPlaySpeed > 0) {
      timerRef.current = setTimeout(advanceStage, autoPlaySpeed);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, autoPlaySpeed, advanceStage, stage, currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        advanceStage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'p') {
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceStage, goBack]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
    playSound('ui', 'toggle');
  };

  const handleSelectDecision = (index: number) => {
    setCurrentIndex(index);
    setStage('context');
    playSound('ui', 'select');
  };

  if (!currentDecision) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">No decisions to replay.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Reliving the Storm</h2>
        <p className="text-muted-foreground">
          Team {teamName}&apos;s journey through the crisis
        </p>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        decisions={decisions}
        currentIndex={currentIndex}
        onSelectDecision={handleSelectDecision}
      />

      {/* Main Content */}
      <div className="min-h-[500px] space-y-6">
        {/* Context */}
        <ContextCard
          decision={currentDecision}
          isVisible={stage === 'context' || stage !== 'transition'}
        />

        {/* Setup */}
        <SetupNarration
          setup={currentDecision.setup}
          isVisible={stages.indexOf(stage) >= stages.indexOf('setup')}
        />

        {/* Options */}
        <OptionsReveal
          options={currentDecision.options}
          chosenIndex={currentDecision.chosenOption}
          isRevealed={stages.indexOf(stage) >= stages.indexOf('options')}
          isChoiceRevealed={stages.indexOf(stage) >= stages.indexOf('choice')}
        />

        {/* Choice & Rationale */}
        <ChoiceReveal
          decision={currentDecision}
          isVisible={stages.indexOf(stage) >= stages.indexOf('choice')}
        />

        {/* Consequences */}
        <ConsequencesReveal
          consequences={currentDecision.consequences}
          isVisible={stages.indexOf(stage) >= stages.indexOf('consequences')}
        />
      </div>

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onPrevious={goBack}
        onNext={advanceStage}
        currentIndex={currentIndex}
        totalCount={decisions.length}
        canGoBack={!isFirstDecision || stages.indexOf(stage) > 0}
        canGoForward={!isLastDecision || stage !== 'consequences'}
      />

      {/* Keyboard Hints */}
      <div className="text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
              Space
            </kbd>{' '}
            or{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
              &rarr;
            </kbd>{' '}
            to advance
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
              &larr;
            </kbd>{' '}
            to go back
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">P</kbd>{' '}
            to play/pause
          </span>
        </span>
      </div>
    </div>
  );
}

export default DecisionReplay;
