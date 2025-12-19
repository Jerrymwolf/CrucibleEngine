'use client'

import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import {
  Wifi,
  WifiOff,
  Users,
  Copy,
  Check,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

// =============================================================================
// TYPES
// =============================================================================

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected'

export interface LobbyHeaderProps {
  /** Session code */
  sessionCode: string
  /** Total number of connected participants */
  participantCount: number
  /** Connection status */
  connectionStatus: ConnectionStatus
  /** Whether sound is enabled */
  soundEnabled?: boolean
  /** Called when sound toggle is clicked */
  onToggleSound?: () => void
  /** Called when settings is clicked */
  onOpenSettings?: () => void
  /** Optional class name */
  className?: string
}

// =============================================================================
// CONNECTION INDICATOR COMPONENT
// =============================================================================

interface ConnectionIndicatorProps {
  status: ConnectionStatus
}

function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          color: 'text-green-400',
          bgColor: 'bg-green-400',
          animate: false,
        }
      case 'connecting':
        return {
          icon: Wifi,
          label: 'Connecting...',
          color: 'text-amber-400',
          bgColor: 'bg-amber-400',
          animate: true,
        }
      case 'reconnecting':
        return {
          icon: Wifi,
          label: 'Reconnecting...',
          color: 'text-amber-400',
          bgColor: 'bg-amber-400',
          animate: true,
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Disconnected',
          color: 'text-red-400',
          bgColor: 'bg-red-400',
          animate: false,
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            config.bgColor,
            config.animate && 'animate-pulse'
          )}
        />
        {config.animate && (
          <div
            className={cn(
              'absolute inset-0 w-2 h-2 rounded-full animate-ping',
              config.bgColor,
              'opacity-75'
            )}
          />
        )}
      </div>
      <Icon className={cn('w-4 h-4', config.color)} />
      <span className={cn('text-sm hidden sm:inline', config.color)}>
        {config.label}
      </span>
    </div>
  )
}

// =============================================================================
// SESSION CODE COMPONENT
// =============================================================================

interface SessionCodeDisplayProps {
  code: string
}

function SessionCodeDisplay({ code }: SessionCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [code])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        Session:
      </span>
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-white/5 hover:bg-white/10 border border-white/10',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-label={`Copy session code ${code}`}
      >
        <span className="font-mono font-semibold tracking-wider text-foreground">
          {code}
        </span>
        {copied ? (
          <Check className="w-4 h-4 text-green-400 animate-scale-in" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

// =============================================================================
// LOBBY HEADER COMPONENT
// =============================================================================

/**
 * Header for the lobby screen
 *
 * Features:
 * - Logo display
 * - Session code with copy functionality
 * - Participant count
 * - Connection status indicator
 * - Sound toggle
 * - Settings access
 */
export function LobbyHeader({
  sessionCode,
  participantCount,
  connectionStatus,
  soundEnabled = true,
  onToggleSound,
  onOpenSettings,
  className,
}: LobbyHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        'bg-background/80 backdrop-blur-md',
        'border-b border-border/50',
        className
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left section: Logo and session code */}
          <div className="flex items-center gap-4">
            <Logo variant="icon" size="sm" linkToHome={false} />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <SessionCodeDisplay code={sessionCode} />
          </div>

          {/* Right section: Status and controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Participant count */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                {participantCount}
                <span className="hidden sm:inline"> connected</span>
              </span>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Connection status */}
            <ConnectionIndicator status={connectionStatus} />

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Sound toggle */}
            {onToggleSound && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSound}
                className="w-9 h-9"
                aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            )}

            {/* Settings */}
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                className="w-9 h-9"
                aria-label="Open settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default LobbyHeader
