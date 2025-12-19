'use client'

/**
 * ConsoleHeader - Stormgate-inspired Top Bar
 *
 * Displays:
 * - Crisis phase/name
 * - Simulation timer (T+XX:XX)
 * - Storm intensity meter
 * - Sound/settings toggles
 * - Current parish name
 * - Connection status
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSound } from '@/hooks/useSound'
import {
  Volume2,
  VolumeX,
  Settings,
  Pause,
  Play,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// =============================================================================
// TYPES
// =============================================================================

export interface ConsoleHeaderProps {
  /** Current phase name */
  phaseName: string
  /** Simulation time in minutes */
  simulationTime: number
  /** Storm intensity (0-10) */
  intensity: number
  /** Current parish name */
  parishName: string
  /** Whether connected to server */
  connected: boolean
  /** Whether simulation is paused */
  paused?: boolean
  /** Sound toggle handler */
  onToggleSound?: () => void
  /** Settings click handler */
  onOpenSettings?: () => void
  /** Sound enabled state */
  soundEnabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function IntensityMeter({ value, max = 10 }: { value: number; max?: number }) {
  const percentage = (value / max) * 100
  const color =
    value <= 3 ? 'bg-green-500' :
    value <= 6 ? 'bg-amber-500' :
    value <= 8 ? 'bg-orange-500' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Intensity</span>
      <div className="relative w-20 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-[1px]">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="w-px h-full bg-background/30"
            />
          ))}
        </div>
      </div>
      <span className={cn(
        'text-xs font-mono font-bold min-w-[2ch]',
        value >= 8 && 'text-red-500 animate-pulse'
      )}>
        {value}
      </span>
    </div>
  )
}

function SimulationTimer({ minutes }: { minutes: number }) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  const formatted = hours > 0
    ? `T+${hours}:${mins.toString().padStart(2, '0')}`
    : `T+${mins}`

  return (
    <div className="flex items-center gap-1.5 font-mono">
      <span className="text-xs text-muted-foreground">SIM</span>
      <span className="text-sm font-bold tabular-nums tracking-tight">
        {formatted}
      </span>
    </div>
  )
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className={cn(
          'w-2 h-2 rounded-full',
          connected ? 'bg-green-500' : 'bg-red-500'
        )}
        animate={connected ? {} : { opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {connected ? 'Live' : 'Reconnecting'}
      </span>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ConsoleHeader({
  phaseName,
  simulationTime,
  intensity,
  parishName,
  connected,
  paused = false,
  onToggleSound,
  onOpenSettings,
  soundEnabled = true,
  className,
}: ConsoleHeaderProps) {
  const { playUI } = useSound()

  const handleSoundToggle = React.useCallback(() => {
    playUI('click')
    onToggleSound?.()
  }, [onToggleSound, playUI])

  const handleSettingsClick = React.useCallback(() => {
    playUI('click')
    onOpenSettings?.()
  }, [onOpenSettings, playUI])

  return (
    <header
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2',
        'bg-card/80 backdrop-blur-sm border-b border-border',
        'sticky top-0 z-50',
        className
      )}
    >
      {/* Left section: Phase and Timer */}
      <div className="flex items-center gap-4">
        {/* Phase badge */}
        <div className="flex items-center gap-2">
          {paused && (
            <motion.div
              className="flex items-center gap-1 text-amber-500"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Pause className="h-4 w-4" />
            </motion.div>
          )}
          <span className="text-sm font-semibold uppercase tracking-wider">
            {phaseName}
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Timer */}
        <SimulationTimer minutes={simulationTime} />
      </div>

      {/* Center section: Intensity */}
      <div className="hidden md:flex items-center">
        <IntensityMeter value={intensity} />
      </div>

      {/* Right section: Parish, controls, connection */}
      <div className="flex items-center gap-3">
        {/* Parish name */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground">Managing</span>
          <span className="text-sm font-semibold">{parishName}</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Sound toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSoundToggle}
          aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSettingsClick}
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Connection status */}
        <ConnectionIndicator connected={connected} />
      </div>
    </header>
  )
}

export default ConsoleHeader
