'use client';

/**
 * ValuesCheckIn Component (Enhanced)
 *
 * CM intervention tool for values check-ins during crisis.
 * Three levels:
 * 1. Flash Check (10 sec): Quick pause to name the value at stake
 * 2. Values Moment (2 min): Deeper reflection on value, action, cost
 * 3. Commitment Mirror (3 min): Show their commitment and compare to current direction
 *
 * Target: 3-5 check-ins per simulation maximum. Overuse reduces impact.
 *
 * Enhancements:
 * - Sound effects for each level
 * - Breathing room with dramatic pacing
 * - Improved animations with gravitas
 * - Typewriter text for impact
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CMInterventionLevel } from '@crucible/shared';
import {
  Pause,
  Heart,
  FileText,
  Clock,
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ValuesCheckInProps {
  level: CMInterventionLevel;
  teamCommitment?: string;
  teamValues?: string[];
  onComplete: () => void;
  onCapture?: (response: ValuesCheckInResponse) => void;
}

export interface ValuesCheckInResponse {
  level: CMInterventionLevel;
  namedValue?: string;
  honoringLooksLike?: string;
  costOfHonoring?: string;
  alignmentReflection?: string;
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DURATION_BY_LEVEL: Record<CMInterventionLevel, number> = {
  flash: 10,
  moment: 120,
  mirror: 180,
};

const LEVEL_CONFIG: Record<
  CMInterventionLevel,
  {
    bg: string;
    border: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    sound: string;
  }
> = {
  flash: {
    bg: 'from-amber-500/30 via-amber-600/20 to-amber-700/10',
    border: 'border-amber-500/50',
    icon: <Pause className="h-10 w-10" />,
    title: 'PAUSE',
    subtitle: 'A moment of reflection',
    sound: 'interventionStart',
  },
  moment: {
    bg: 'from-blue-500/30 via-blue-600/20 to-blue-700/10',
    border: 'border-blue-500/50',
    icon: <Heart className="h-10 w-10" />,
    title: 'VALUES MOMENT',
    subtitle: 'Deep reflection on what matters',
    sound: 'interventionStart',
  },
  mirror: {
    bg: 'from-purple-500/30 via-purple-600/20 to-purple-700/10',
    border: 'border-purple-500/50',
    icon: <FileText className="h-10 w-10" />,
    title: 'COMMITMENT MIRROR',
    subtitle: 'Face the words you chose',
    sound: 'commitmentSeal',
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypewriterText({
  text,
  speed = 40,
  delay = 0,
  onComplete,
  className,
}: {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const startTimer = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, speed, delay, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

function BreathingIndicator({ seconds }: { seconds: number }) {
  const phase = Math.floor(seconds / 4) % 3;
  const labels = ['Breathe in...', 'Hold...', 'Breathe out...'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center text-sm text-muted-foreground"
    >
      <motion.div
        animate={{
          scale: phase === 0 ? [1, 1.2] : phase === 2 ? [1.2, 1] : 1.2,
        }}
        transition={{ duration: 4 }}
        className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/20"
      />
      <span>{labels[phase]}</span>
    </motion.div>
  );
}

function CountdownTimer({
  seconds,
  isWarning,
}: {
  seconds: number;
  isWarning: boolean;
}) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 font-mono text-lg',
        isWarning && 'text-amber-500',
        seconds <= 10 && 'text-red-500'
      )}
      animate={seconds <= 10 ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: seconds <= 10 ? Infinity : 0 }}
    >
      <Clock className="h-5 w-5" />
      <span className="font-bold">{formatTime(seconds)}</span>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValuesCheckIn({
  level,
  teamCommitment,
  teamValues,
  onComplete,
  onCapture,
}: ValuesCheckInProps) {
  const [timeRemaining, setTimeRemaining] = useState(DURATION_BY_LEVEL[level]);
  const [step, setStep] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [response, setResponse] = useState<Partial<ValuesCheckInResponse>>({
    level,
    timestamp: Date.now(),
  });
  const { play: playSound } = useSound();

  const config = LEVEL_CONFIG[level];
  const isWarning = timeRemaining <= 30;

  // Play intro sound
  useEffect(() => {
    playSound('dramatic', config.sound as 'interventionStart' | 'commitmentSeal');

    // Delay content reveal for dramatic effect
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, [playSound, config.sound]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    // Warning sound at 30 seconds
    if (timeRemaining === 30) {
      playSound('timer', 'warning');
    }

    // Final countdown sound
    if (timeRemaining <= 5 && timeRemaining > 0) {
      playSound('timer', 'tick');
    }

    return () => clearInterval(timer);
  }, [timeRemaining, playSound]);

  // Handle completion
  const handleComplete = useCallback(() => {
    if (onCapture && Object.keys(response).length > 2) {
      onCapture(response as ValuesCheckInResponse);
    }
    playSound('ui', 'success');
    onComplete();
  }, [onCapture, onComplete, response, playSound]);

  // ============================================================================
  // RENDER: FLASH CHECK (10 seconds)
  // ============================================================================

  if (level === 'flash') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      >
        {/* Radial pulse effect */}
        <motion.div
          animate={{
            scale: [1, 2],
            opacity: [0.3, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute w-64 h-64 rounded-full bg-amber-500/20"
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn(
            'relative max-w-md w-full p-10 rounded-3xl border-2 bg-gradient-to-b text-center',
            config.bg,
            config.border
          )}
        >
          {/* Icon with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="relative mb-8"
          >
            <div className="absolute inset-0 blur-xl bg-amber-500/30 rounded-full" />
            <div className="relative text-amber-500">{config.icon}</div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-2 tracking-tight"
          >
            {config.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground mb-8"
          >
            {config.subtitle}
          </motion.p>

          {/* Question with typewriter */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-medium mb-8"
              >
                <TypewriterText
                  text="Which value guides this decision?"
                  speed={50}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer with dramatic styling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <CountdownTimer seconds={timeRemaining} isWarning={isWarning} />
          </motion.div>

          {/* Instruction */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-muted-foreground italic"
          >
            Name the value aloud with your team.
          </motion.p>

          {/* Breathing indicator */}
          {timeRemaining > 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.5 }}
              className="mt-6"
            >
              <BreathingIndicator seconds={DURATION_BY_LEVEL.flash - timeRemaining} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // ============================================================================
  // RENDER: VALUES MOMENT (2 minutes)
  // ============================================================================

  if (level === 'moment') {
    const momentSteps = [
      {
        question: 'Which of your team values is at stake here?',
        placeholder: 'e.g., Safety, Integrity, Courage...',
        field: 'namedValue' as const,
      },
      {
        question: 'What would honoring that value look like?',
        placeholder: 'Describe the action that honors this value...',
        field: 'honoringLooksLike' as const,
      },
      {
        question: "What's the cost of honoring it?",
        placeholder: 'What do you risk or sacrifice by honoring this value?',
        field: 'costOfHonoring' as const,
      },
    ];

    const currentStep = momentSteps[step];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'max-w-lg w-full p-8 rounded-3xl border-2 bg-gradient-to-b',
            config.bg,
            config.border
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-blue-500"
              >
                {config.icon}
              </motion.div>
              <div>
                <h2 className="font-bold text-lg">{config.title}</h2>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
            <CountdownTimer seconds={timeRemaining} isWarning={isWarning} />
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {momentSteps.map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className={cn(
                  'h-1.5 flex-1 rounded-full origin-left',
                  i < step
                    ? 'bg-primary'
                    : i === step
                    ? 'bg-primary/50'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              {/* Question with typewriter */}
              <h3 className="text-xl font-semibold">
                {showContent ? (
                  <TypewriterText text={currentStep.question} speed={30} />
                ) : (
                  currentStep.question
                )}
              </h3>

              {/* Value selection chips */}
              {currentStep.field === 'namedValue' && teamValues && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-2"
                >
                  {teamValues.map((value, idx) => (
                    <motion.button
                      key={value}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      type="button"
                      onClick={() => {
                        setResponse((prev) => ({ ...prev, namedValue: value }));
                        playSound('ui', 'select');
                        if (step < momentSteps.length - 1) {
                          setTimeout(() => setStep(step + 1), 300);
                        }
                      }}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all',
                        response.namedValue === value
                          ? 'bg-primary text-primary-foreground scale-105 shadow-lg'
                          : 'bg-muted hover:bg-muted/80 hover:scale-102'
                      )}
                    >
                      {value}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Textarea for other fields */}
              {currentStep.field !== 'namedValue' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Textarea
                    value={(response[currentStep.field] as string) || ''}
                    onChange={(e) =>
                      setResponse((prev) => ({
                        ...prev,
                        [currentStep.field]: e.target.value,
                      }))
                    }
                    placeholder={currentStep.placeholder}
                    className="min-h-[120px] text-lg"
                  />
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3 mt-8"
          >
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setStep(step - 1);
                  playSound('ui', 'click');
                }}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                playSound('ui', 'click');
                if (step < momentSteps.length - 1) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={!response[currentStep.field]}
              className="flex-1 gap-2"
            >
              {step < momentSteps.length - 1 ? (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                'Return to Decision'
              )}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ============================================================================
  // RENDER: COMMITMENT MIRROR (3 minutes)
  // ============================================================================

  if (level === 'mirror') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'max-w-xl w-full p-8 rounded-3xl border-2 bg-gradient-to-b',
            config.bg,
            config.border
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-purple-500"
              >
                {config.icon}
              </motion.div>
              <div>
                <h2 className="font-bold text-lg">{config.title}</h2>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
            <CountdownTimer seconds={timeRemaining} isWarning={isWarning} />
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="commitment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">
                  Before the crisis began, your team made this commitment:
                </p>

                {/* Commitment display with dramatic reveal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative p-8 bg-background/50 rounded-2xl border"
                >
                  {/* Decorative seal */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute -top-4 -right-4 w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center"
                  >
                    <Sparkles className="h-6 w-6 text-purple-500" />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl leading-relaxed italic"
                  >
                    &ldquo;
                    {showContent ? (
                      <TypewriterText
                        text={teamCommitment || 'No commitment statement available'}
                        speed={25}
                      />
                    ) : (
                      teamCommitment || 'No commitment statement available'
                    )}
                    &rdquo;
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  <Button
                    onClick={() => {
                      setStep(1);
                      playSound('ui', 'click');
                    }}
                    className="w-full"
                    size="lg"
                  >
                    Reflect on Alignment
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="reflection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold">
                  <TypewriterText
                    text="How does your current direction align with this commitment?"
                    speed={30}
                  />
                </h3>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Textarea
                    value={response.alignmentReflection || ''}
                    onChange={(e) =>
                      setResponse((prev) => ({
                        ...prev,
                        alignmentReflection: e.target.value,
                      }))
                    }
                    placeholder="Consider your current discussion and the path you're leaning toward..."
                    className="min-h-[140px] text-lg"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex gap-3"
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(0);
                      playSound('ui', 'click');
                    }}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleComplete} className="flex-1">
                    Return to Decision
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}

export default ValuesCheckIn;
