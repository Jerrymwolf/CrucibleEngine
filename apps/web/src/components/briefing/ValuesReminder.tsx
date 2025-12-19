'use client';

/**
 * ValuesReminder Component
 *
 * An overlay that reminds the team of their stated values and commitment
 * before the crisis begins. Creates a moment of reflection and anchoring.
 *
 * Features:
 * - Display of team's core values
 * - Their commitment statement
 * - Emotional anchoring moment
 * - "This is what you said mattered" framing
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Heart,
  Shield,
  Sparkles,
  Quote,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamValue {
  name: string;
  definition: string;
}

export interface ValuesReminderProps {
  teamName: string;
  values: TeamValue[];
  commitment: string;
  onContinue: () => void;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ValueCard({
  value,
  index,
  isVisible,
}: {
  value: TeamValue;
  index: number;
  isVisible: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ delay: index * 0.3, duration: 0.5, type: 'spring' }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-primary/20 shadow-lg">
        {/* Value number badge */}
        <motion.div
          className="absolute -top-3 -left-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={isVisible ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ delay: index * 0.3 + 0.2, type: 'spring', stiffness: 200 }}
        >
          {index + 1}
        </motion.div>

        {/* Value name */}
        <h3 className="text-xl font-bold text-primary mb-2 pl-4">
          {value.name}
        </h3>

        {/* Definition */}
        <p className="text-muted-foreground text-sm italic">
          &ldquo;{value.definition}&rdquo;
        </p>
      </div>
    </motion.div>
  );
}

function FloatingHeart({ delay }: { delay: number }) {
  const randomX = Math.random() * 100;

  return (
    <motion.div
      className="absolute text-primary/20"
      style={{ left: `${randomX}%` }}
      initial={{ y: '100%', opacity: 0 }}
      animate={{
        y: '-100%',
        opacity: [0, 0.5, 0],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <Heart className="h-4 w-4" />
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValuesReminder({
  teamName,
  values,
  commitment,
  onContinue,
  className,
}: ValuesReminderProps) {
  const [phase, setPhase] = useState<'values' | 'commitment' | 'ready'>('values');
  const [visibleValues, setVisibleValues] = useState(0);
  const { play: playSound } = useSound();

  // Reveal values one by one
  useEffect(() => {
    if (phase === 'values' && visibleValues < values.length) {
      const timer = setTimeout(() => {
        setVisibleValues((prev) => prev + 1);
        playSound('ui', 'notification');
      }, 1200);
      return () => clearTimeout(timer);
    } else if (phase === 'values' && visibleValues >= values.length) {
      // All values shown, move to commitment
      const timer = setTimeout(() => {
        setPhase('commitment');
        playSound('dramatic', 'commitmentSeal');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, visibleValues, values.length, playSound]);

  // Move to ready phase after showing commitment
  useEffect(() => {
    if (phase === 'commitment') {
      const timer = setTimeout(() => {
        setPhase('ready');
        playSound('ui', 'success');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, playSound]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-hidden',
        className
      )}
    >
      {/* Floating hearts background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <FloatingHeart key={i} delay={i * 0.8} />
        ))}
      </div>

      <div className="h-full overflow-y-auto py-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Sparkles className="h-4 w-4" />
              Before the Storm
            </motion.div>

            <h1 className="text-3xl font-bold mb-2">Remember Who You Are</h1>
            <p className="text-muted-foreground">
              Team {teamName}, these are the values you chose to guide you
            </p>
          </motion.div>

          {/* Values Display */}
          <div className="space-y-4 mb-10">
            {values.map((value, index) => (
              <ValueCard
                key={value.name}
                value={value}
                index={index}
                isVisible={index < visibleValues}
              />
            ))}
          </div>

          {/* Commitment Section */}
          <AnimatePresence>
            {(phase === 'commitment' || phase === 'ready') && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-10"
              >
                {/* Divider with icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/30" />
                  <motion.div
                    className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Shield className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/30" />
                </div>

                {/* Commitment */}
                <motion.div
                  className="relative p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl border border-primary/20"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {/* Quote icon */}
                  <Quote className="absolute top-4 left-4 h-8 w-8 text-primary/20" />

                  <div className="text-center pt-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Your Commitment
                    </h3>
                    <p className="text-lg leading-relaxed text-foreground/90">
                      {commitment}
                    </p>
                  </div>

                  {/* Seal effect */}
                  <motion.div
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Reminder text */}
                <motion.p
                  className="text-center text-sm text-muted-foreground mt-8 italic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  When the pressure mounts, remember: this is what you said mattered.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue Button */}
          <AnimatePresence>
            {phase === 'ready' && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Button
                    size="lg"
                    onClick={() => {
                      playSound('dramatic', 'phaseTransition');
                      onContinue();
                    }}
                    className="bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white px-8 shadow-lg shadow-red-500/20"
                  >
                    <span>Enter the Storm</span>
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>

                <motion.p
                  className="text-xs text-muted-foreground mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Hurricane Midas is approaching. Every decision matters.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ValuesReminder;
