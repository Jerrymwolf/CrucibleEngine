'use client';

/**
 * RationalizationCascade Component
 *
 * Visualizes the 6-step rationalization drift pattern with dramatic animations.
 * Shows how small justifications can lead to significant values drift.
 *
 * The 6-Step Drift:
 * 1. "The threat probably won't materialize" → Justify not preparing
 * 2. "Our people need/want to help" → Justify not sending home
 * 3. "We're serving something bigger" → Justify risk for distant benefit
 * 4. "Someone else should handle that" → Justify limiting responsibility
 * 5. "We have obligations to stakeholders" → Justify economics over safety
 * 6. "We'll make it right afterward" → Justify present harm with future remedy
 *
 * Each step feels reasonable. The destination is indefensible.
 * The drift happens without anyone noticing.
 *
 * Enhanced with:
 * - Dramatic step-by-step reveal animation
 * - Sound effects for emotional impact
 * - Visual cascade showing the "drift" journey
 * - Animated connections between steps
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Eye,
  MessageCircle,
  Play,
  Pause,
  SkipForward,
  ArrowDown,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface RationalizationCascadeProps {
  detected: boolean;
  steps: RationalizationStep[];
  peakIntensity?: number;
  description?: string;
  mode?: 'static' | 'animated'; // animated = step-by-step reveal
  onComplete?: () => void;
  className?: string;
}

export interface RationalizationStep {
  stepNumber: number;
  label: string;
  description: string;
  detected: boolean;
  evidence?: string;
  decisionContext?: string;
  timestamp?: number; // When this rationalization occurred
  intensity?: 1 | 2 | 3; // How strong the rationalization was
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEP_DEFINITIONS: {
  label: string;
  description: string;
  justification: string;
  color: string;
  emoji: string;
}[] = [
  {
    label: 'Denial of threat',
    description: 'Minimize or dismiss the risk',
    justification: '"The threat probably won\'t materialize"',
    color: 'from-yellow-500/20 to-yellow-600/10',
    emoji: '🙈',
  },
  {
    label: 'Appeal to benefit',
    description: 'Frame risk as opportunity',
    justification: '"Our people need the income / want to help"',
    color: 'from-yellow-600/20 to-orange-500/10',
    emoji: '🤝',
  },
  {
    label: 'Higher purpose',
    description: 'Invoke mission to justify risk',
    justification: '"We\'re serving something bigger"',
    color: 'from-orange-500/20 to-orange-600/10',
    emoji: '🎯',
  },
  {
    label: 'Diffusion of responsibility',
    description: 'Shift accountability elsewhere',
    justification: '"Someone else should handle that"',
    color: 'from-orange-600/20 to-red-500/10',
    emoji: '👉',
  },
  {
    label: 'Economic necessity',
    description: 'Prioritize business obligations',
    justification: '"We have obligations to stakeholders"',
    color: 'from-red-500/20 to-red-600/10',
    emoji: '💰',
  },
  {
    label: 'Future remedy',
    description: 'Promise to fix later',
    justification: '"We\'ll make it right afterward"',
    color: 'from-red-600/20 to-red-700/10',
    emoji: '🔮',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CascadeStep({
  step,
  definition,
  index,
  isVisible,
  isExpanded,
  onToggle,
  isLast,
}: {
  step: RationalizationStep;
  definition: (typeof STEP_DEFINITIONS)[0];
  index: number;
  isVisible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const isDetected = step.detected;
  const { play: playSound } = useSound();

  const handleToggle = () => {
    onToggle();
    playSound('ui', 'click');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{
            duration: 0.5,
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
          className="relative"
        >
          {/* Connecting Line */}
          {!isLast && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: '40px' }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className={cn(
                'absolute left-5 top-full w-0.5',
                isDetected ? 'bg-gradient-to-b from-yellow-500 to-orange-500' : 'bg-muted'
              )}
            />
          )}

          {/* Step Card */}
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'w-full text-left rounded-xl border-2 transition-all',
              isDetected
                ? 'border-yellow-500/50 hover:border-yellow-500'
                : 'border-muted/50 hover:border-muted opacity-50',
              isExpanded && 'ring-2 ring-primary/20'
            )}
          >
            <div
              className={cn(
                'p-4 rounded-xl bg-gradient-to-r',
                isDetected ? definition.color : 'from-muted/30 to-muted/20'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Step Number Circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg',
                    isDetected
                      ? 'bg-yellow-500 text-yellow-950'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.stepNumber}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{step.label}</span>
                    {isDetected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs bg-yellow-500/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-semibold"
                      >
                        Detected
                      </motion.span>
                    )}
                    {step.intensity && step.intensity >= 2 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-semibold',
                          step.intensity === 3
                            ? 'bg-red-500/30 text-red-600 dark:text-red-400'
                            : 'bg-orange-500/30 text-orange-600 dark:text-orange-400'
                        )}
                      >
                        {step.intensity === 3 ? 'Strong' : 'Moderate'}
                      </motion.span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {definition.description}
                  </p>

                  <p className="text-sm italic mt-2 text-foreground/80">
                    {definition.justification}
                  </p>
                </div>

                {/* Expand Indicator */}
                {isDetected && step.evidence && (
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 transition-transform shrink-0',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </div>

              {/* Expanded Evidence */}
              <AnimatePresence>
                {isExpanded && isDetected && step.evidence && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-yellow-500/30">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                            From Your Decisions
                          </div>
                          <p className="text-sm italic">
                            &ldquo;{step.evidence}&rdquo;
                          </p>
                          {step.decisionContext && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Context: {step.decisionContext}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* Arrow Between Steps */}
          {!isLast && isDetected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center py-2"
            >
              <ArrowDown className="h-5 w-5 text-yellow-500/50" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DriftMeter({ detectedCount }: { detectedCount: number }) {
  const percentage = (detectedCount / 6) * 100;

  const getColor = () => {
    if (percentage >= 66) return 'bg-red-500';
    if (percentage >= 33) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getLabel = () => {
    if (percentage >= 66) return 'Significant Drift';
    if (percentage >= 33) return 'Moderate Drift';
    if (percentage > 0) return 'Minor Drift';
    return 'No Drift Detected';
  };

  return (
    <div className="p-4 bg-muted/30 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Drift Intensity</span>
        <span className="text-sm text-muted-foreground">
          {detectedCount}/6 steps detected
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full', getColor())}
        />
      </div>
      <div className="text-center mt-2">
        <span className={cn(
          'text-sm font-medium',
          percentage >= 66 ? 'text-red-500' :
          percentage >= 33 ? 'text-orange-500' :
          percentage > 0 ? 'text-yellow-500' :
          'text-green-500'
        )}>
          {getLabel()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RationalizationCascade({
  detected,
  steps,
  peakIntensity,
  description,
  mode = 'static',
  onComplete,
  className,
}: RationalizationCascadeProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<number>(mode === 'animated' ? 0 : 6);
  const [isPlaying, setIsPlaying] = useState(mode === 'animated');
  const { play: playSound } = useSound();

  const detectedCount = steps.filter((s) => s.detected).length;

  // Auto-reveal steps in animated mode
  useEffect(() => {
    if (mode !== 'animated' || !isPlaying) return;

    if (visibleSteps < steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps((prev) => {
          const nextStep = prev + 1;
          // Play sound for detected steps
          if (steps[prev]?.detected) {
            playSound('dramatic', 'consequenceReveal');
          } else {
            playSound('ui', 'click');
          }
          return nextStep;
        });
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // Animation complete
      setIsPlaying(false);
      onComplete?.();
    }
  }, [mode, isPlaying, visibleSteps, steps, playSound, onComplete]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
    playSound('ui', 'toggle');
  };

  const handleSkip = () => {
    setVisibleSteps(steps.length);
    setIsPlaying(false);
    playSound('ui', 'click');
  };

  const handleRestart = () => {
    setVisibleSteps(0);
    setIsPlaying(true);
    playSound('ui', 'click');
  };

  // Not detected - show educational version
  if (!detected || detectedCount < 2) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <h2 className="text-3xl font-bold">The Rationalization Cascade</h2>
          <p className="text-lg text-muted-foreground mt-2">
            How drift happens without anyone noticing
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-green-500/10 border-2 border-green-500/30 rounded-xl"
        >
          <div className="flex items-center gap-3 text-green-500 mb-3">
            <CheckCircle2 className="h-6 w-6" />
            <span className="text-xl font-bold">No Significant Pattern Detected</span>
          </div>
          <p className="text-muted-foreground">
            Your team did not show a significant rationalization cascade pattern.
            This is worth celebrating - but also worth understanding for future reference.
          </p>
        </motion.div>

        <div className="p-6 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">The 6-Step Drift (Educational)</h3>
          </div>
          <p className="text-muted-foreground mb-6">
            Under pressure, well-meaning teams often follow this pattern. Each step feels
            reasonable in isolation. The destination is indefensible.
          </p>

          <div className="space-y-4">
            {STEP_DEFINITIONS.map((definition, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r',
                  definition.color
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold">{index + 1}</span>
                </div>
                <div>
                  <div className="font-bold">{definition.label}</div>
                  <div className="text-sm text-muted-foreground">{definition.description}</div>
                  <div className="text-sm italic mt-1">{definition.justification}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Pattern detected - show analysis
  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center">
        <h2 className="text-3xl font-bold">The Rationalization Cascade</h2>
        <p className="text-lg text-muted-foreground mt-2">
          How drift happens without anyone noticing
        </p>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl"
      >
        <div className="flex items-center gap-3 text-yellow-500 mb-3">
          <AlertTriangle className="h-6 w-6" />
          <span className="text-xl font-bold">Pattern Detected</span>
        </div>
        <p className="text-foreground">
          {description || `We detected ${detectedCount} of 6 rationalization steps in your decision patterns.`}
        </p>
        {peakIntensity && (
          <p className="text-sm text-muted-foreground mt-2">
            Peak intensity reached: Step {peakIntensity} - {STEP_DEFINITIONS[peakIntensity - 1]?.label}
          </p>
        )}
      </motion.div>

      {/* Drift Meter */}
      <DriftMeter detectedCount={detectedCount} />

      {/* Playback Controls (animated mode) */}
      {mode === 'animated' && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {visibleSteps === 0 ? 'Start' : 'Resume'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={visibleSteps >= steps.length}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Show All
          </Button>
          {visibleSteps >= steps.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
            >
              Replay
            </Button>
          )}
        </div>
      )}

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-muted/30 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong className="text-foreground">Why this matters:</strong> This pattern is common
              under pressure and doesn&apos;t reflect bad intentions. Each step feels reasonable
              in the moment.
            </p>
            <p>
              Noticing the pattern is the first step to interrupting it. In future situations,
              recognizing these justifications as they emerge can help you pause and reconsider.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Steps Visualization */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <CascadeStep
            key={step.stepNumber}
            step={step}
            definition={STEP_DEFINITIONS[index]}
            index={index}
            isVisible={mode === 'static' || index < visibleSteps}
            isExpanded={expandedStep === index}
            onToggle={() => setExpandedStep(expandedStep === index ? null : index)}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      {/* Reflection Prompt */}
      <AnimatePresence>
        {(mode === 'static' || visibleSteps >= steps.length) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-lg">Reflection Questions</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  1
                </span>
                <span className="text-muted-foreground">
                  At which step did you first feel the pull toward rationalization?
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  2
                </span>
                <span className="text-muted-foreground">
                  What would have helped you notice the drift earlier?
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  3
                </span>
                <span className="text-muted-foreground">
                  How might you catch yourself at Step 1 next time?
                </span>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RationalizationCascade;
