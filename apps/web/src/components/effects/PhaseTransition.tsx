'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSoundscape, phaseAmbientMap } from '@/hooks/useSoundscape'
import { useSound } from '@/hooks/useSound'

// =============================================================================
// TYPES
// =============================================================================

export type GamePhase =
  | 'lobby'
  | 'discovery'
  | 'briefing'
  | 'watch'
  | 'warning'
  | 'approach'
  | 'landfall'
  | 'eye'
  | 'recovery'
  | 'debrief'

interface PhaseTransitionProps {
  /** Current game phase */
  phase: GamePhase
  /** Previous phase (for transition direction) */
  previousPhase?: GamePhase
  /** Duration of the transition overlay in ms */
  duration?: number
  /** Children to render (the main content) */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Whether to show phase name during transition */
  showPhaseName?: boolean
  /** Whether to crossfade ambient audio */
  crossfadeAudio?: boolean
}

// =============================================================================
// PHASE CONFIGURATION
// =============================================================================

const phaseConfig: Record<
  GamePhase,
  {
    name: string
    color: string
    bgGradient: string
    icon?: string
  }
> = {
  lobby: {
    name: 'Waiting Room',
    color: 'text-blue-400',
    bgGradient: 'from-blue-900/80 to-slate-900/80',
  },
  discovery: {
    name: 'Values Discovery',
    color: 'text-purple-400',
    bgGradient: 'from-purple-900/80 to-slate-900/80',
  },
  briefing: {
    name: 'Storm Briefing',
    color: 'text-amber-400',
    bgGradient: 'from-amber-900/80 to-slate-900/80',
  },
  watch: {
    name: 'Storm Watch',
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-900/80 to-slate-900/80',
  },
  warning: {
    name: 'Storm Warning',
    color: 'text-orange-400',
    bgGradient: 'from-orange-900/80 to-slate-900/80',
  },
  approach: {
    name: 'Storm Approaching',
    color: 'text-red-400',
    bgGradient: 'from-red-900/80 to-slate-900/80',
  },
  landfall: {
    name: 'Landfall',
    color: 'text-red-500',
    bgGradient: 'from-red-950/90 to-slate-900/90',
  },
  eye: {
    name: 'Eye of the Storm',
    color: 'text-slate-300',
    bgGradient: 'from-slate-800/80 to-slate-900/80',
  },
  recovery: {
    name: 'Recovery',
    color: 'text-green-400',
    bgGradient: 'from-green-900/80 to-slate-900/80',
  },
  debrief: {
    name: 'Debrief',
    color: 'text-blue-300',
    bgGradient: 'from-blue-950/80 to-slate-900/80',
  },
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.5, ease: 'easeIn' as const },
  },
}

const textVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: 0.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.3, ease: 'easeIn' as const },
  },
}

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.6,
      delay: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    scaleX: 0,
    transition: { duration: 0.2 },
  },
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PhaseTransition - Visual transition effect between game phases
 *
 * Features:
 * - Smooth fade overlay with phase-specific colors
 * - Phase name display during transition
 * - Ambient audio crossfading
 * - Respects reduced motion preference
 *
 * @example
 * ```tsx
 * <PhaseTransition
 *   phase={gamePhase}
 *   previousPhase={prevPhase}
 *   crossfadeAudio
 * >
 *   <GameContent />
 * </PhaseTransition>
 * ```
 */
export function PhaseTransition({
  phase,
  previousPhase,
  duration = 2000,
  children,
  className,
  showPhaseName = true,
  crossfadeAudio = true,
}: PhaseTransitionProps) {
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [displayPhase, setDisplayPhase] = React.useState<GamePhase>(phase)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  // Sound management
  const { transitionTo } = useSoundscape()
  const { playDramatic } = useSound()

  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Handle phase changes
  React.useEffect(() => {
    if (phase === displayPhase) return

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Start transition
    setIsTransitioning(true)

    // Play transition sound
    playDramatic('phaseTransition')

    // Crossfade ambient audio
    if (crossfadeAudio) {
      const ambientTrack = phaseAmbientMap[phase]
      if (ambientTrack) {
        transitionTo(ambientTrack, prefersReducedMotion ? 0 : 1500)
      }
    }

    // End transition after duration
    timeoutRef.current = setTimeout(() => {
      setDisplayPhase(phase)
      setIsTransitioning(false)
    }, prefersReducedMotion ? 100 : duration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [phase, displayPhase, duration, crossfadeAudio, transitionTo, playDramatic, prefersReducedMotion])

  const config = phaseConfig[phase]

  return (
    <div className={cn('relative', className)}>
      {/* Main content */}
      {children}

      {/* Transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key={`transition-${phase}`}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'fixed inset-0 z-[100] flex flex-col items-center justify-center',
              'bg-gradient-to-b backdrop-blur-sm',
              config.bgGradient
            )}
          >
            {showPhaseName && (
              <>
                {/* Decorative line above */}
                <motion.div
                  variants={lineVariants}
                  className="w-24 h-0.5 bg-white/30 mb-6 origin-center"
                />

                {/* Phase name */}
                <motion.h1
                  variants={textVariants}
                  className={cn(
                    'text-4xl md:text-6xl font-bold tracking-wider uppercase',
                    config.color
                  )}
                >
                  {config.name}
                </motion.h1>

                {/* Decorative line below */}
                <motion.div
                  variants={lineVariants}
                  className="w-24 h-0.5 bg-white/30 mt-6 origin-center"
                />

                {/* Loading indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                  <div
                    className="w-2 h-2 rounded-full bg-white/50 animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-white/50 animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// SIMPLE FADE TRANSITION (for lighter-weight usage)
// =============================================================================

interface FadeTransitionProps {
  /** Whether to show the content */
  show: boolean
  /** Duration in ms */
  duration?: number
  /** Children to render */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Simple fade transition wrapper
 */
export function FadeTransition({
  show,
  duration = 300,
  children,
  className,
}: FadeTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration / 1000 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PhaseTransition
