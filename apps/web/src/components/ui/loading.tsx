'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// SPINNER COMPONENT
// =============================================================================

interface SpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-12 w-12 border-4',
}

/**
 * Simple spinner component for inline loading states
 *
 * @example
 * ```tsx
 * <Spinner size="md" />
 * ```
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </span>
  )
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean
  /** Loading message to display */
  message?: string
  /** Progress percentage (0-100), if known */
  progress?: number
  /** Whether to blur the background */
  blur?: boolean
  /** Additional CSS classes */
  className?: string
  /** Children to render behind the overlay */
  children?: React.ReactNode
}

/**
 * Full-screen loading overlay for page/section transitions
 * Respects reduced motion preference
 *
 * @example
 * ```tsx
 * <LoadingOverlay visible={isLoading} message="Loading session...">
 *   <SessionContent />
 * </LoadingOverlay>
 * ```
 */
export function LoadingOverlay({
  visible,
  message = 'Loading...',
  progress,
  blur = true,
  className,
  children,
}: LoadingOverlayProps) {
  if (!visible && !children) return null

  return (
    <div className={cn('relative', className)}>
      {children}
      {visible && (
        <div
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center',
            'bg-background/80',
            blur && 'backdrop-blur-sm'
          )}
          role="alert"
          aria-busy="true"
          aria-live="polite"
        >
          <Spinner size="xl" className="text-primary" />

          {message && (
            <p className="mt-4 text-sm font-medium text-foreground">{message}</p>
          )}

          {progress !== undefined && (
            <div className="mt-4 w-48">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-center text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

interface SkeletonProps {
  /** Width of the skeleton (CSS value or Tailwind class) */
  width?: string
  /** Height of the skeleton (CSS value or Tailwind class) */
  height?: string
  /** Whether this is a circular skeleton (for avatars) */
  circle?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton loader for content placeholders
 * Uses shimmer animation that respects reduced motion
 *
 * @example
 * ```tsx
 * <Skeleton width="100%" height="1rem" />
 * <Skeleton circle width="40px" height="40px" />
 * ```
 */
export function Skeleton({
  width,
  height,
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-muted',
        circle ? 'rounded-full' : 'rounded-md',
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
      aria-hidden="true"
    />
  )
}

// =============================================================================
// LOADING CARD
// =============================================================================

interface LoadingCardProps {
  /** Number of text lines to show */
  lines?: number
  /** Whether to show an avatar skeleton */
  showAvatar?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Pre-composed loading card with skeleton content
 *
 * @example
 * ```tsx
 * <LoadingCard lines={3} showAvatar />
 * ```
 */
export function LoadingCard({
  lines = 3,
  showAvatar = false,
  className,
}: LoadingCardProps) {
  return (
    <div className={cn('p-4 rounded-lg bg-card border border-border', className)}>
      <div className="flex items-start gap-3">
        {showAvatar && <Skeleton circle width="40px" height="40px" />}
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="1rem" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton
              key={i}
              width={i === lines - 2 ? '40%' : '100%'}
              height="0.875rem"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// RECONNECTION INDICATOR
// =============================================================================

interface ReconnectionIndicatorProps {
  /** Current connection status */
  status: 'connecting' | 'reconnecting' | 'disconnected' | 'connected'
  /** Current retry attempt (for reconnecting) */
  attempt?: number
  /** Maximum retry attempts */
  maxAttempts?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Connection status indicator with retry information
 *
 * @example
 * ```tsx
 * <ReconnectionIndicator
 *   status="reconnecting"
 *   attempt={2}
 *   maxAttempts={5}
 * />
 * ```
 */
export function ReconnectionIndicator({
  status,
  attempt,
  maxAttempts = 5,
  className,
}: ReconnectionIndicatorProps) {
  if (status === 'connected') return null

  const statusConfig = {
    connecting: {
      message: 'Connecting to server...',
      icon: <Spinner size="sm" className="text-primary" />,
      bgColor: 'bg-primary/10 border-primary/30',
    },
    reconnecting: {
      message: `Reconnecting... (${attempt || 1}/${maxAttempts})`,
      icon: <Spinner size="sm" className="text-amber-500" />,
      bgColor: 'bg-amber-500/10 border-amber-500/30',
    },
    disconnected: {
      message: 'Connection lost. Please refresh the page.',
      icon: (
        <svg
          className="h-4 w-4 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      bgColor: 'bg-red-500/10 border-red-500/30',
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'border shadow-lg',
        config.bgColor,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {config.icon}
      <span className="text-sm font-medium">{config.message}</span>
    </div>
  )
}

export default LoadingOverlay
