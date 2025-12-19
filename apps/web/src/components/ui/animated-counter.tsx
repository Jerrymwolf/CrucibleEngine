'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useSound } from '@/hooks/useSound'

interface AnimatedCounterProps {
  /** The target value to animate to */
  value: number
  /** Animation duration in milliseconds */
  duration?: number
  /** Number formatting style */
  format?: 'number' | 'currency' | 'percent' | 'compact'
  /** Prefix to display before the value */
  prefix?: string
  /** Suffix to display after the value */
  suffix?: string
  /** Additional CSS classes */
  className?: string
  /** Show the delta (+/-) when value changes */
  showDelta?: boolean
  /** Play sound effects on value change */
  playSound?: boolean
  /** Color the value based on positive/negative delta */
  colorDelta?: boolean
}

/**
 * AnimatedCounter - Smoothly animates between number values
 *
 * Features:
 * - Ease-out cubic animation for natural feel
 * - Optional delta indicators (+/-) that fade out
 * - Sound effects on value changes
 * - Multiple format options (number, currency, percent, compact)
 * - Respects reduced motion preference
 *
 * @example
 * ```tsx
 * <AnimatedCounter
 *   value={population}
 *   format="compact"
 *   showDelta
 *   prefix="Pop: "
 * />
 * ```
 */
export function AnimatedCounter({
  value,
  duration = 300,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  showDelta = false,
  playSound = true,
  colorDelta = false,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(value)
  const [delta, setDelta] = React.useState<number | null>(null)
  const previousValue = React.useRef(value)
  const animationRef = React.useRef<number>()
  const { playUI } = useSound()

  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const formatValue = React.useCallback(
    (v: number): string => {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(v)
        case 'percent':
          return `${Math.round(v)}%`
        case 'compact':
          return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(v)
        default:
          return v.toLocaleString()
      }
    },
    [format]
  )

  React.useEffect(() => {
    if (value === previousValue.current) return

    const diff = value - previousValue.current
    setDelta(diff)

    // Play appropriate sound
    if (playSound) {
      playUI(diff > 0 ? 'success' : 'error')
    }

    // If reduced motion, just set the value directly
    if (prefersReducedMotion) {
      setDisplayValue(value)
      previousValue.current = value
      setTimeout(() => setDelta(null), 1500)
      return
    }

    const startValue = previousValue.current
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + diff * eased))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        // Clear delta after animation + display time
        setTimeout(() => setDelta(null), 1500)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    previousValue.current = value

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, playSound, playUI, prefersReducedMotion])

  const deltaColor =
    delta !== null && colorDelta
      ? delta > 0
        ? 'text-green-400'
        : 'text-red-400'
      : ''

  return (
    <span
      className={cn(
        'relative inline-flex items-baseline tabular-nums',
        deltaColor,
        className
      )}
    >
      <span>
        {prefix}
        {formatValue(displayValue)}
        {suffix}
      </span>

      {showDelta && delta !== null && (
        <span
          className={cn(
            'absolute -right-12 text-xs font-bold animate-fade-out',
            delta > 0 ? 'text-green-500' : 'text-red-500'
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {delta > 0 ? '+' : ''}
          {formatValue(delta)}
        </span>
      )}
    </span>
  )
}

/**
 * StatCounter - A variant designed for dashboard stat displays
 * Includes label and icon support
 */
interface StatCounterProps extends AnimatedCounterProps {
  label: string
  icon?: React.ReactNode
}

export function StatCounter({
  label,
  icon,
  className,
  ...props
}: StatCounterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <AnimatedCounter {...props} className="text-xl font-bold" />
    </div>
  )
}

export default AnimatedCounter
