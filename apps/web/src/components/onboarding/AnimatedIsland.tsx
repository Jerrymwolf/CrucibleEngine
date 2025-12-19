'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface AnimatedIslandProps {
  className?: string
  /** Animation intensity (0-1) */
  stormIntensity?: number
  /** Whether to animate the storm approach */
  animate?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Animated Concordia Island with approaching hurricane
 *
 * Uses the actual Concordia island image with storm effects overlaid
 * for a cinematic landing page visual.
 */
export function AnimatedIsland({
  className,
  stormIntensity = 0.3,
  animate = true,
}: AnimatedIslandProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={cn(
        'relative w-full aspect-video max-w-2xl mx-auto overflow-hidden rounded-xl',
        'border border-border/50',
        'shadow-2xl shadow-blue-900/20',
        className
      )}
      role="img"
      aria-label="Concordia Island with approaching hurricane"
    >
      {/* Actual Concordia Island Image */}
      <Image
        src="/images/concordia-island.jpeg"
        alt="Concordia Island - A volcanic island with central caldera, showing parishes, airport, and port facilities"
        fill
        className={cn(
          'object-cover',
          'transition-all duration-1000',
          mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        )}
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 672px"
      />

      {/* Dark overlay for better storm visibility */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/30',
          'transition-opacity duration-1000',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Storm clouds approaching from left */}
      <div
        className={cn(
          'absolute top-0 left-0 w-1/2 h-full',
          'bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-transparent',
          'transition-all duration-[3000ms]',
          animate && mounted && 'translate-x-0 opacity-100',
          (!animate || !mounted) && '-translate-x-full opacity-0'
        )}
        style={{
          opacity: mounted ? stormIntensity * 0.8 : 0,
        }}
      >
        {/* Cloud layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-slate-800/60 to-transparent" />
        <div
          className={cn(
            'absolute top-0 left-0 w-3/4 h-3/4',
            'bg-gradient-radial from-slate-600/50 to-transparent',
            'rounded-full blur-xl',
            animate && 'animate-pulse'
          )}
          style={{ animationDuration: '3s' }}
        />
        <div
          className={cn(
            'absolute bottom-1/4 left-1/4 w-1/2 h-1/2',
            'bg-gradient-radial from-slate-700/40 to-transparent',
            'rounded-full blur-lg',
            animate && 'animate-pulse'
          )}
          style={{ animationDuration: '4s', animationDelay: '1s' }}
        />
      </div>

      {/* Hurricane spiral indicator */}
      <div
        className={cn(
          'absolute top-1/4 left-[10%] w-28 h-28',
          'transition-all duration-[4000ms] delay-1000',
          animate && mounted && 'opacity-70 scale-100',
          (!animate || !mounted) && 'opacity-0 scale-50'
        )}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Outer spiral */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="2"
            strokeDasharray="12 6"
            className={cn(animate && 'animate-spin')}
            style={{ animationDuration: '12s', transformOrigin: 'center' }}
          />
          {/* Middle spiral */}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="2"
            strokeDasharray="8 4"
            className={cn(animate && 'animate-spin')}
            style={{
              animationDuration: '8s',
              animationDirection: 'reverse',
              transformOrigin: 'center',
            }}
          />
          {/* Inner spiral */}
          <circle
            cx="50"
            cy="50"
            r="15"
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            className={cn(animate && 'animate-spin')}
            style={{ animationDuration: '5s', transformOrigin: 'center' }}
          />
          {/* Eye of the storm */}
          <circle
            cx="50"
            cy="50"
            r="6"
            fill="rgba(255, 255, 255, 0.7)"
            className="drop-shadow-md"
          />
        </svg>
      </div>

      {/* Parish location markers (subtle) */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'transition-opacity duration-1000 delay-700',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* These approximate positions based on the actual island geography */}
        {/* Keystone - Northwest biotech area */}
        <div className="absolute top-[35%] left-[25%] w-2 h-2 rounded-full bg-purple-400/60 animate-pulse" style={{ animationDuration: '2s' }} />
        {/* Haven - Port area (east) */}
        <div className="absolute top-[45%] right-[20%] w-2 h-2 rounded-full bg-blue-400/60 animate-pulse" style={{ animationDuration: '2.3s' }} />
        {/* Gateway - Airport (southwest) */}
        <div className="absolute bottom-[30%] left-[15%] w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDuration: '2.1s' }} />
        {/* Heartland - Central dam area */}
        <div className="absolute top-[50%] left-[45%] w-2 h-2 rounded-full bg-red-400/60 animate-pulse" style={{ animationDuration: '2.5s' }} />
        {/* Summit - Central peak */}
        <div className="absolute top-[40%] left-[50%] w-2 h-2 rounded-full bg-violet-400/60 animate-pulse" style={{ animationDuration: '2.2s' }} />
        {/* Sterling - Government center (south) */}
        <div className="absolute bottom-[25%] left-[55%] w-2 h-2 rounded-full bg-cyan-400/60 animate-pulse" style={{ animationDuration: '2.4s' }} />
      </div>

      {/* Storm intensity overlay - darkens with intensity */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 15% 35%, hsla(0, 0%, 0%, ${stormIntensity * 0.4}) 0%, transparent 60%)`,
        }}
      />

      {/* Atmospheric glow (blue/purple from storm) */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'bg-gradient-to-t from-blue-500/10 via-transparent to-purple-500/15',
          'mix-blend-screen'
        )}
      />

      {/* Rain effect when storm is intense */}
      {animate && mounted && stormIntensity > 0.2 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: stormIntensity * 0.3,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='24'%3E%3Cline x1='2' y1='0' x2='1' y2='20' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '4px 24px',
            animation: 'rain 0.4s linear infinite',
          }}
        />
      )}

      {/* Lightning flash effect (occasional) */}
      {animate && mounted && stormIntensity > 0.5 && (
        <div
          className="absolute inset-0 pointer-events-none bg-white/5"
          style={{
            animation: 'lightning 8s ease-in-out infinite',
          }}
        />
      )}

      {/* Vignette effect for cinematic look */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/40 via-transparent to-black/20" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* Storm approaching text (subtle) */}
      <div
        className={cn(
          'absolute bottom-4 left-4 text-xs font-mono tracking-wider',
          'text-white/40 uppercase',
          'transition-all duration-1000 delay-[2000ms]',
          animate && mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        )}
      >
        Hurricane Midas Approaching
      </div>

      {/* Keyframes style injection */}
      <style jsx>{`
        @keyframes rain {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -4px 24px;
          }
        }
        @keyframes lightning {
          0%, 89%, 91%, 93%, 100% {
            opacity: 0;
          }
          90%, 92% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}

export default AnimatedIsland
