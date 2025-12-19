'use client'

import * as React from 'react'

type ShakeIntensity = 'subtle' | 'normal' | 'strong' | 'critical'

const INTENSITY_MAP: Record<ShakeIntensity, number> = {
  subtle: 2,
  normal: 4,
  strong: 8,
  critical: 12,
}

interface ShakeOptions {
  intensity?: ShakeIntensity
  duration?: number
}

/**
 * Hook for adding screen shake effects to a container element
 * Respects prefers-reduced-motion by falling back to a border flash
 *
 * @example
 * ```tsx
 * const { containerRef, shake } = useScreenShake()
 *
 * return (
 *   <div ref={containerRef}>
 *     <button onClick={() => shake({ intensity: 'strong' })}>
 *       Trigger Shake
 *     </button>
 *   </div>
 * )
 * ```
 */
export function useScreenShake() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isShaking = React.useRef(false)
  const animationRef = React.useRef<number>()

  const shake = React.useCallback(
    ({ intensity = 'normal', duration = 100 }: ShakeOptions = {}) => {
      // Respect reduced motion preference with visual fallback
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        if (containerRef.current) {
          containerRef.current.style.boxShadow = '0 0 0 3px hsl(0 84% 60%)'
          setTimeout(() => {
            if (containerRef.current) containerRef.current.style.boxShadow = ''
          }, 150)
        }
        return
      }

      if (!containerRef.current || isShaking.current) return
      isShaking.current = true

      const element = containerRef.current
      const maxOffset = INTENSITY_MAP[intensity]
      const startTime = performance.now()

      const animateShake = (currentTime: number) => {
        const progress = (currentTime - startTime) / duration
        if (progress >= 1) {
          element.style.transform = ''
          isShaking.current = false
          return
        }

        // Decay intensity over time
        const currentIntensity = maxOffset * (1 - progress)
        const offsetX = (Math.random() - 0.5) * 2 * currentIntensity
        const offsetY = (Math.random() - 0.5) * 2 * currentIntensity
        element.style.transform = `translate(${offsetX}px, ${offsetY}px)`

        animationRef.current = requestAnimationFrame(animateShake)
      }

      animationRef.current = requestAnimationFrame(animateShake)
    },
    []
  )

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return { containerRef, shake }
}

/**
 * Specialized hook for decision-related screen shake effects
 * Provides pre-configured shake functions for common decision scenarios
 *
 * @example
 * ```tsx
 * const { containerRef, onDecisionSubmit, onCriticalDecision } = useDecisionShake()
 *
 * return (
 *   <div ref={containerRef}>
 *     <button onClick={onDecisionSubmit}>Submit Decision</button>
 *     <button onClick={onCriticalDecision}>Critical Action!</button>
 *   </div>
 * )
 * ```
 */
export function useDecisionShake() {
  const { containerRef, shake } = useScreenShake()

  return {
    containerRef,
    shake,
    onDecisionSubmit: React.useCallback(
      () => shake({ intensity: 'normal', duration: 100 }),
      [shake]
    ),
    onCriticalDecision: React.useCallback(
      () => shake({ intensity: 'strong', duration: 150 }),
      [shake]
    ),
    onCatastrophicEvent: React.useCallback(
      () => shake({ intensity: 'critical', duration: 200 }),
      [shake]
    ),
    onSubtleFeedback: React.useCallback(
      () => shake({ intensity: 'subtle', duration: 80 }),
      [shake]
    ),
  }
}

export type { ShakeIntensity, ShakeOptions }
