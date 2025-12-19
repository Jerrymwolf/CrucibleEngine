'use client';

/**
 * GapRevelation Component
 *
 * Dramatic, emotional revelation of the gap between stated and enacted values.
 * This is the "mirror moment" - where teams confront how their actions
 * compared to their commitments.
 *
 * Animation Sequence:
 * T+0ms:    Value name types in
 * T+500ms:  "Your #1 stated value" fades in
 * T+1000ms: Stated bar fills (left to right, 800ms)
 * T+2000ms: Pause for emphasis
 * T+2500ms: Enacted bar fills (slower, 1200ms)
 * T+4000ms: "GAP" badge pulses in
 * T+4500ms: Quote types in (typewriter, 40ms/char)
 * T+7000ms: Evidence items fade in (staggered 300ms)
 *
 * Sound design:
 * - Stated bar: Confident tone rising
 * - Enacted bar: Descending tone (if gap)
 * - Gap reveal: Low resonant tone
 * - Evidence items: Soft clicks
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Quote,
  TrendingDown,
  Shield,
  Heart,
  Users,
  Scale,
  Target,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface GapValue {
  id: string;
  name: string;
  definition: string;
  rank: number; // 1 = top stated value
  statedScore: number; // 0-100, how important they said it was
  enactedScore: number; // 0-100, how much they actually demonstrated it
  reflection: string; // AI-generated narrative about the gap
  evidence: GapEvidence[];
  icon?: 'shield' | 'heart' | 'users' | 'scale' | 'target' | 'lightbulb';
}

export interface GapEvidence {
  timestamp: number; // Simulation time
  decision: string;
  impact: number; // Negative impact on this value
  context: string;
}

export interface GapRevelationProps {
  teamName: string;
  values: GapValue[];
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALUE_ICONS = {
  shield: Shield,
  heart: Heart,
  users: Users,
  scale: Scale,
  target: Target,
  lightbulb: Lightbulb,
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypewriterText({
  text,
  delay = 0,
  speed = 40,
  onComplete,
  className,
}: {
  text: string;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, delay, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-5 bg-foreground ml-0.5"
        />
      )}
    </span>
  );
}

function AnimatedProgressBar({
  value,
  delay = 0,
  duration = 800,
  color = 'bg-primary',
  label,
  onComplete,
}: {
  value: number;
  delay?: number;
  duration?: number;
  color?: string;
  label?: string;
  onComplete?: () => void;
}) {
  const controls = useAnimationControls();
  const [showValue, setShowValue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await controls.start({
        width: `${value}%`,
        transition: { duration: duration / 1000, ease: 'easeOut' },
      });
      setShowValue(true);
      onComplete?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, duration, controls, onComplete]);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <AnimatePresence>
            {showValue && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-bold"
              >
                {value}%
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
      <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={controls}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}

function GapBadge({
  gap,
  isVisible,
}: {
  gap: number;
  isVisible: boolean;
}) {
  const isLargeGap = gap > 30;
  const isMediumGap = gap > 15;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg',
            isLargeGap
              ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500/50'
              : isMediumGap
                ? 'bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/50'
                : 'bg-green-500/20 text-green-500 ring-2 ring-green-500/50'
          )}
        >
          {isLargeGap && <AlertTriangle className="h-5 w-5" />}
          {isLargeGap ? (
            <span>
              GAP: {gap}%
            </span>
          ) : isMediumGap ? (
            <span>
              Gap: {gap}%
            </span>
          ) : (
            <span>
              Aligned ({gap}% gap)
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EvidenceCard({
  evidence,
  index,
  isVisible,
}: {
  evidence: GapEvidence;
  index: number;
  isVisible: boolean;
}) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(Math.abs(seconds) / 3600);
    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
    const sign = seconds >= 0 ? '+' : '-';
    return `T${sign}${hours}h`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.3, duration: 0.4 }}
          className="flex items-start gap-3 p-3 bg-red-500/5 border-l-2 border-red-500/50 rounded-r-lg"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {formatTime(evidence.timestamp)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              &ldquo;{evidence.decision}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {evidence.context}
            </p>
          </div>
          <div className="text-red-500 font-bold text-sm">
            -{evidence.impact}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ValueRevelation({
  value,
  isActive,
  onStageComplete,
}: {
  value: GapValue;
  isActive: boolean;
  onStageComplete: (stage: string) => void;
}) {
  const [stage, setStage] = useState<
    'name' | 'rank' | 'stated' | 'enacted' | 'gap' | 'reflection' | 'evidence' | 'complete'
  >('name');
  const { play: playSound } = useSound();
  const Icon = value.icon ? VALUE_ICONS[value.icon] : Shield;

  const gap = value.statedScore - value.enactedScore;

  useEffect(() => {
    if (!isActive) {
      setStage('name');
      return;
    }

    // Stage progression timers
    const timers: NodeJS.Timeout[] = [];

    // Name → Rank
    timers.push(
      setTimeout(() => {
        setStage('rank');
      }, 500)
    );

    // Rank → Stated
    timers.push(
      setTimeout(() => {
        setStage('stated');
        playSound('ui', 'notification');
      }, 1500)
    );

    // Stated → Enacted
    timers.push(
      setTimeout(() => {
        setStage('enacted');
        if (gap > 20) {
          playSound('dramatic', 'consequenceReveal');
        }
      }, 3000)
    );

    // Enacted → Gap
    timers.push(
      setTimeout(() => {
        setStage('gap');
        if (gap > 30) {
          playSound('dramatic', 'gapReveal');
        }
      }, 5000)
    );

    // Gap → Reflection
    timers.push(
      setTimeout(() => {
        setStage('reflection');
      }, 6000)
    );

    // Reflection → Evidence
    timers.push(
      setTimeout(() => {
        setStage('evidence');
      }, 9000)
    );

    // Evidence → Complete
    timers.push(
      setTimeout(() => {
        setStage('complete');
        onStageComplete('complete');
      }, 12000)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive, gap, playSound, onStageComplete]);

  const stageIndex = (s: typeof stage) => {
    const stages = ['name', 'rank', 'stated', 'enacted', 'gap', 'reflection', 'evidence', 'complete'];
    return stages.indexOf(s);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Value Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
        >
          <Icon className="h-8 w-8 text-primary" />
        </motion.div>

        <h2 className="text-4xl font-bold mb-2">
          <TypewriterText text={value.name} speed={60} />
        </h2>

        <AnimatePresence>
          {stageIndex(stage) >= stageIndex('rank') && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg text-muted-foreground"
            >
              Your #{value.rank} stated value
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bars */}
      <div className="max-w-xl mx-auto space-y-6">
        {/* Stated Bar */}
        <AnimatePresence>
          {stageIndex(stage) >= stageIndex('stated') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AnimatedProgressBar
                value={value.statedScore}
                delay={0}
                duration={800}
                color="bg-primary"
                label="What You Stated"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enacted Bar */}
        <AnimatePresence>
          {stageIndex(stage) >= stageIndex('enacted') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AnimatedProgressBar
                value={value.enactedScore}
                delay={500}
                duration={1200}
                color={gap > 30 ? 'bg-red-500' : gap > 15 ? 'bg-amber-500' : 'bg-green-500'}
                label="What You Enacted"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gap Badge */}
        <div className="text-center py-4">
          <GapBadge gap={gap} isVisible={stageIndex(stage) >= stageIndex('gap')} />
        </div>
      </div>

      {/* Reflection Quote */}
      <AnimatePresence>
        {stageIndex(stage) >= stageIndex('reflection') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-6 bg-muted/30 rounded-xl"
          >
            <Quote className="h-8 w-8 text-muted-foreground/50 mb-4" />
            <p className="text-lg leading-relaxed italic">
              <TypewriterText text={value.reflection} speed={30} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence */}
      <AnimatePresence>
        {stageIndex(stage) >= stageIndex('evidence') && value.evidence.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wide">
                Key Moments That Created This Gap
              </span>
            </div>
            <div className="space-y-2">
              {value.evidence.map((ev, index) => (
                <EvidenceCard
                  key={`${ev.timestamp}-${index}`}
                  evidence={ev}
                  index={index}
                  isVisible={true}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GapRevelation({
  teamName,
  values,
  onComplete,
  className,
}: GapRevelationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(true);
  const { play: playSound } = useSound();

  const currentValue = values[currentIndex];
  const isLastValue = currentIndex === values.length - 1;
  const isFirstValue = currentIndex === 0;

  // Sort values by gap size (largest gap first for impact)
  const sortedValues = [...values].sort((a, b) => {
    const gapA = a.statedScore - a.enactedScore;
    const gapB = b.statedScore - b.enactedScore;
    return gapB - gapA;
  });

  const handleStageComplete = (stage: string) => {
    if (stage === 'complete') {
      setIsRevealing(false);
    }
  };

  const handleNext = () => {
    if (!isLastValue) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealing(true);
      playSound('ui', 'click');
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (!isFirstValue) {
      setCurrentIndex((prev) => prev - 1);
      setIsRevealing(true);
      playSound('ui', 'click');
    }
  };

  const handleSkip = () => {
    setIsRevealing(false);
  };

  if (values.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">No values data available.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">The Gap Between</h1>
        <p className="text-xl text-muted-foreground">
          What {teamName} Said &amp; What {teamName} Did
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-2">
        {values.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setCurrentIndex(index);
              setIsRevealing(true);
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              index === currentIndex
                ? 'bg-primary scale-125'
                : index < currentIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Value Revelation */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <ValueRevelation
            key={currentValue.id}
            value={currentValue}
            isActive={isRevealing}
            onStageComplete={handleStageComplete}
          />
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={isFirstValue}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous Value
        </Button>

        <div className="flex gap-2">
          {isRevealing && (
            <Button variant="outline" onClick={handleSkip}>
              Skip Animation
            </Button>
          )}
          <Button onClick={handleNext}>
            {isLastValue ? 'Continue' : 'Next Value'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Value Counter */}
      <div className="text-center text-sm text-muted-foreground">
        Value {currentIndex + 1} of {values.length}
      </div>
    </div>
  );
}

export default GapRevelation;
