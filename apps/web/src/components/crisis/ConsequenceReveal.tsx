'use client';

/**
 * ConsequenceReveal Component
 *
 * Dramatic reveal of decision consequences with:
 * - Card flip animation showing outcome
 * - Consequence type indication (immediate, ripple, delayed)
 * - Affected parish pulse on map
 * - Resource/metric change animations
 * - Notable moment highlighting
 *
 * Animation sequence:
 * 1. Card appears with decision summary
 * 2. "Processing..." overlay
 * 3. Card flips to reveal consequence type
 * 4. Consequence details fade in
 * 5. Impact metrics animate
 * 6. Notable moment badge (if applicable)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// TYPES
// ============================================================================

export type ConsequenceType = 'immediate' | 'ripple' | 'delayed';
export type ConsequenceSeverity = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface MetricChange {
  name: string;
  previousValue: number;
  newValue: number;
  unit?: string;
}

export interface ConsequenceData {
  type: ConsequenceType;
  severity: ConsequenceSeverity;
  title: string;
  description: string;
  affectedParishes: string[];
  metricChanges: MetricChange[];
  narrativeText?: string;
  isNotableMoment?: boolean;
  notableMomentReason?: string;
}

export interface ConsequenceRevealProps {
  decision: {
    optionLabel: string;
    rationale: string;
  };
  consequence: ConsequenceData;
  onComplete: () => void;
  onParishPulse?: (parishId: string) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSEQUENCE_STYLES: Record<ConsequenceType, { icon: React.ReactNode; color: string; label: string }> = {
  immediate: {
    icon: <Zap className="h-6 w-6" />,
    color: 'text-red-500 bg-red-500/20 border-red-500/50',
    label: 'IMMEDIATE EFFECT',
  },
  ripple: {
    icon: <ArrowRight className="h-6 w-6" />,
    color: 'text-amber-500 bg-amber-500/20 border-amber-500/50',
    label: 'RIPPLE EFFECT',
  },
  delayed: {
    icon: <Clock className="h-6 w-6" />,
    color: 'text-blue-500 bg-blue-500/20 border-blue-500/50',
    label: 'DELAYED CONSEQUENCE',
  },
};

const SEVERITY_STYLES: Record<ConsequenceSeverity, { icon: React.ReactNode; color: string; bgGlow: string }> = {
  positive: {
    icon: <CheckCircle2 className="h-8 w-8" />,
    color: 'text-green-500',
    bgGlow: 'shadow-green-500/30',
  },
  negative: {
    icon: <XCircle className="h-8 w-8" />,
    color: 'text-red-500',
    bgGlow: 'shadow-red-500/30',
  },
  neutral: {
    icon: <MinusCircle className="h-8 w-8" />,
    color: 'text-blue-500',
    bgGlow: 'shadow-blue-500/30',
  },
  mixed: {
    icon: <AlertTriangle className="h-8 w-8" />,
    color: 'text-amber-500',
    bgGlow: 'shadow-amber-500/30',
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MetricChangeDisplay({ change, delay }: { change: MetricChange; delay: number }) {
  const delta = change.newValue - change.previousValue;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
    >
      <span className="text-sm font-medium">{change.name}</span>

      <div className="flex items-center gap-3">
        {/* Previous value */}
        <span className="text-sm text-muted-foreground font-mono">
          {change.previousValue}{change.unit || '%'}
        </span>

        {/* Arrow with color */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring' }}
        >
          {isPositive && <TrendingUp className="h-4 w-4 text-green-500" />}
          {isNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
          {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
        </motion.div>

        {/* New value with animation */}
        <motion.span
          className={cn(
            'text-sm font-mono font-bold',
            isPositive && 'text-green-500',
            isNegative && 'text-red-500',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
        >
          {change.newValue}{change.unit || '%'}
        </motion.span>

        {/* Delta badge */}
        <motion.span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded font-mono',
            isPositive && 'bg-green-500/20 text-green-500',
            isNegative && 'bg-red-500/20 text-red-500',
            !isPositive && !isNegative && 'bg-muted text-muted-foreground'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.4 }}
        >
          {delta > 0 ? '+' : ''}{delta}
        </motion.span>
      </div>
    </motion.div>
  );
}

function FlipCard({
  front,
  back,
  isFlipped,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
}) {
  return (
    <div className="relative h-full" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

function NotableMomentBadge({ reason }: { reason?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
      className="absolute -top-3 -right-3 z-10"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-amber-500 rounded-full blur-md animate-pulse" />

        {/* Badge */}
        <div className="relative flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold">Notable Moment</span>
        </div>
      </div>

      {/* Reason tooltip */}
      {reason && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute top-full right-0 mt-2 px-3 py-2 bg-card border rounded-lg shadow-lg text-xs max-w-[200px]"
        >
          {reason}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConsequenceReveal({
  decision,
  consequence,
  onComplete,
  onParishPulse,
  className,
}: ConsequenceRevealProps) {
  const [phase, setPhase] = useState<'decision' | 'processing' | 'reveal' | 'details'>('decision');
  const { play: playSound } = useSound();

  const typeStyle = CONSEQUENCE_STYLES[consequence.type];
  const severityStyle = SEVERITY_STYLES[consequence.severity];

  // Animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setPhase('processing');
        playSound('ui', 'notification');
      }, 1500),
      setTimeout(() => {
        setPhase('reveal');
        playSound('dramatic', 'consequenceReveal');
        // Trigger parish pulse
        consequence.affectedParishes.forEach((parishId, i) => {
          setTimeout(() => onParishPulse?.(parishId), i * 200);
        });
      }, 3000),
      setTimeout(() => {
        setPhase('details');
        if (consequence.severity === 'positive') {
          playSound('dramatic', 'consequencePositive');
        } else if (consequence.severity === 'negative') {
          playSound('dramatic', 'consequenceNegative');
        }
      }, 4500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [consequence, onParishPulse, playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md',
        className
      )}
    >
      <div className="w-full max-w-xl">
        {/* Main card container */}
        <div className="relative h-[400px]">
          {/* Notable moment badge */}
          {consequence.isNotableMoment && phase === 'details' && (
            <NotableMomentBadge reason={consequence.notableMomentReason} />
          )}

          <FlipCard
            isFlipped={phase === 'reveal' || phase === 'details'}
            front={
              /* Front: Decision summary */
              <div className="h-full p-6 bg-card border rounded-2xl shadow-xl flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Your Decision
                  </h3>
                  <div className="text-2xl font-bold mb-4">
                    {decision.optionLabel}
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{decision.rationale}&rdquo;
                  </p>
                </div>

                {/* Processing overlay */}
                <AnimatePresence>
                  {phase === 'processing' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/80 rounded-2xl flex items-center justify-center"
                    >
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                        />
                        <div className="text-lg font-semibold">Processing...</div>
                        <div className="text-sm text-muted-foreground">
                          Calculating consequences
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            }
            back={
              /* Back: Consequence reveal */
              <div className={cn(
                'h-full p-6 bg-card border rounded-2xl shadow-2xl flex flex-col',
                severityStyle.bgGlow
              )}>
                {/* Consequence type badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold self-start mb-4',
                    typeStyle.color
                  )}
                >
                  {typeStyle.icon}
                  {typeStyle.label}
                </motion.div>

                {/* Severity icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className={cn('mb-4', severityStyle.color)}
                >
                  {severityStyle.icon}
                </motion.div>

                {/* Consequence title */}
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl font-bold mb-2"
                >
                  {consequence.title}
                </motion.h3>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground mb-4"
                >
                  {consequence.description}
                </motion.p>

                {/* Affected parishes */}
                {consequence.affectedParishes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground mb-4"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>
                      Affected: {consequence.affectedParishes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                    </span>
                  </motion.div>
                )}

                {/* Narrative text */}
                {consequence.narrativeText && phase === 'details' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="p-3 bg-muted/30 rounded-lg text-sm italic border-l-2 border-primary"
                  >
                    {consequence.narrativeText}
                  </motion.div>
                )}
              </div>
            }
          />
        </div>

        {/* Metric changes (shown in details phase) */}
        <AnimatePresence>
          {phase === 'details' && consequence.metricChanges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 space-y-2"
            >
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Impact on Resources
              </h4>
              {consequence.metricChanges.map((change, index) => (
                <MetricChangeDisplay
                  key={change.name}
                  change={change}
                  delay={0.6 + index * 0.1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue button */}
        <AnimatePresence>
          {phase === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-6 text-center"
            >
              <Button onClick={onComplete} size="lg" className="px-8">
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ConsequenceReveal;
