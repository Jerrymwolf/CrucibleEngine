'use client';

/**
 * PhaseTransition Component
 *
 * Cinematic transition screens between major phases:
 * - Lobby -> Discovery: "Your journey begins"
 * - Discovery -> Briefing: "Values established. Now, the storm."
 * - Briefing -> Storm: "Hurricane watch issued"
 *
 * Features dramatic animations, sound effects, and atmospheric visuals.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Compass,
  Shield,
  CloudLightning,
  AlertTriangle,
  Heart,
  Users,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type TransitionType =
  | 'lobby-to-discovery'
  | 'discovery-to-briefing'
  | 'briefing-to-storm'
  | 'storm-to-recovery'
  | 'recovery-to-debrief';

export interface PhaseTransitionProps {
  type: TransitionType;
  onComplete: () => void;
  teamName?: string;
  duration?: number; // Override default duration in ms
}

// ============================================================================
// TRANSITION CONFIGS
// ============================================================================

interface TransitionConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
  iconColor: string;
  glowColor: string;
  particles?: boolean;
  defaultDuration: number;
}

const TRANSITIONS: Record<TransitionType, TransitionConfig> = {
  'lobby-to-discovery': {
    title: 'Your Journey Begins',
    subtitle: 'Discover what you truly value',
    icon: <Compass className="h-16 w-16" />,
    bgGradient: 'from-primary/20 via-background to-purple-500/10',
    iconColor: 'text-primary',
    glowColor: 'shadow-primary/30',
    particles: true,
    defaultDuration: 3500,
  },
  'discovery-to-briefing': {
    title: 'Values Established',
    subtitle: 'Now, the storm approaches',
    icon: <Shield className="h-16 w-16" />,
    bgGradient: 'from-green-500/10 via-background to-amber-500/10',
    iconColor: 'text-green-500',
    glowColor: 'shadow-green-500/30',
    particles: true,
    defaultDuration: 4000,
  },
  'briefing-to-storm': {
    title: 'Hurricane Watch Issued',
    subtitle: 'Every decision now matters',
    icon: <CloudLightning className="h-16 w-16" />,
    bgGradient: 'from-amber-500/20 via-background to-red-500/20',
    iconColor: 'text-amber-500',
    glowColor: 'shadow-amber-500/40',
    particles: false,
    defaultDuration: 4500,
  },
  'storm-to-recovery': {
    title: 'The Storm Has Passed',
    subtitle: 'Now we count the cost',
    icon: <Heart className="h-16 w-16" />,
    bgGradient: 'from-red-500/10 via-background to-blue-500/10',
    iconColor: 'text-red-400',
    glowColor: 'shadow-red-400/30',
    particles: false,
    defaultDuration: 4000,
  },
  'recovery-to-debrief': {
    title: 'Time for Reflection',
    subtitle: 'What did you learn about yourself?',
    icon: <Users className="h-16 w-16" />,
    bgGradient: 'from-blue-500/10 via-background to-purple-500/10',
    iconColor: 'text-blue-400',
    glowColor: 'shadow-blue-400/30',
    particles: true,
    defaultDuration: 3500,
  },
};

// ============================================================================
// PARTICLE COMPONENT
// ============================================================================

function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className={cn('absolute w-1 h-1 rounded-full', color)}
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 10,
            opacity: 0,
          }}
          animate={{
            y: -10,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PhaseTransition({
  type,
  onComplete,
  teamName,
  duration,
}: PhaseTransitionProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const { play: playSound } = useSound();
  const config = TRANSITIONS[type];
  const totalDuration = duration || config.defaultDuration;

  useEffect(() => {
    // Play transition sound
    playSound('dramatic', 'phaseTransition');

    // Phase timing
    const enterDuration = 800;
    const exitDuration = 600;
    const holdDuration = totalDuration - enterDuration - exitDuration;

    const enterTimer = setTimeout(() => setPhase('hold'), enterDuration);
    const exitTimer = setTimeout(() => setPhase('exit'), enterDuration + holdDuration);
    const completeTimer = setTimeout(onComplete, totalDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [totalDuration, onComplete, playSound]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br',
          config.bgGradient
        )}
      >
        {/* Background particles */}
        {config.particles && <FloatingParticles color={config.iconColor} />}

        {/* Content container */}
        <motion.div
          className="text-center space-y-6 px-4 max-w-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase === 'enter' || phase === 'hold' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Icon with glow */}
          <motion.div
            className={cn(
              'w-32 h-32 mx-auto rounded-full flex items-center justify-center',
              'bg-background/50 backdrop-blur-sm border border-white/10',
              'shadow-2xl',
              config.glowColor
            )}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.2 }}
          >
            <motion.div
              className={config.iconColor}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {config.icon}
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl sm:text-5xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {config.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {config.subtitle}
          </motion.p>

          {/* Team name if provided */}
          {teamName && (
            <motion.div
              className="pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span className="text-sm text-muted-foreground/70">Team</span>
              <span className="ml-2 text-sm font-semibold">{teamName}</span>
            </motion.div>
          )}

          {/* Progress indicator */}
          <motion.div
            className="pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.div
              className="h-1 bg-muted rounded-full overflow-hidden w-48 mx-auto"
            >
              <motion.div
                className={cn('h-full rounded-full',
                  config.iconColor.replace('text-', 'bg-')
                )}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: (totalDuration - 800) / 1000, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Storm-specific lightning effect */}
        {type === 'briefing-to-storm' && (
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
            transition={{ duration: 0.5, delay: 1.5 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default PhaseTransition;
