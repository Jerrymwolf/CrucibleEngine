'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { colors, PARISHES, type ParishId } from '@crucible/shared/constants'
import {
  Factory,
  Anchor,
  Plane,
  Zap,
  Building2,
  Hospital,
  Users,
  MapPin,
  CheckCircle2,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface ParishCardProps {
  /** Parish identifier */
  parishId: ParishId
  /** Number of players currently in this parish */
  playerCount: number
  /** Maximum players allowed */
  maxPlayers: number
  /** Whether this parish is currently selected by the user */
  isSelected?: boolean
  /** Whether the user can select this parish */
  canSelect?: boolean
  /** Called when the card is clicked */
  onSelect?: (parishId: ParishId) => void
  /** Optional class name */
  className?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PARISH_ICONS: Record<ParishId, typeof Factory> = {
  KEYSTONE: Factory,
  HAVEN: Anchor,
  GATEWAY: Plane,
  HEARTLAND: Zap,
  SUMMIT: Building2,
  STERLING: Hospital,
}

const PARISH_COLOR_CLASSES: Record<ParishId, { bg: string; border: string; glow: string }> = {
  KEYSTONE: {
    bg: 'from-purple-900/40 to-purple-950/60',
    border: 'border-purple-500/30 hover:border-purple-400/60',
    glow: 'shadow-purple-500/20',
  },
  HAVEN: {
    bg: 'from-blue-900/40 to-blue-950/60',
    border: 'border-blue-500/30 hover:border-blue-400/60',
    glow: 'shadow-blue-500/20',
  },
  GATEWAY: {
    bg: 'from-amber-900/40 to-amber-950/60',
    border: 'border-amber-500/30 hover:border-amber-400/60',
    glow: 'shadow-amber-500/20',
  },
  HEARTLAND: {
    bg: 'from-red-900/40 to-red-950/60',
    border: 'border-red-500/30 hover:border-red-400/60',
    glow: 'shadow-red-500/20',
  },
  SUMMIT: {
    bg: 'from-violet-900/40 to-violet-950/60',
    border: 'border-violet-500/30 hover:border-violet-400/60',
    glow: 'shadow-violet-500/20',
  },
  STERLING: {
    bg: 'from-cyan-900/40 to-cyan-950/60',
    border: 'border-cyan-500/30 hover:border-cyan-400/60',
    glow: 'shadow-cyan-500/20',
  },
}

// =============================================================================
// CAPACITY INDICATOR COMPONENT
// =============================================================================

interface CapacityIndicatorProps {
  current: number
  max: number
  parishId: ParishId
}

function CapacityIndicator({ current, max, parishId }: CapacityIndicatorProps) {
  const parish = colors.parish[parishId.toLowerCase() as keyof typeof colors.parish]

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2.5 h-2.5 rounded-full transition-all duration-300',
            i < current
              ? 'scale-100 opacity-100'
              : 'scale-75 opacity-40 bg-muted'
          )}
          style={{
            backgroundColor: i < current ? parish.primary : undefined,
            boxShadow: i < current ? `0 0 8px ${parish.primary}40` : undefined,
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1 font-mono">
        {current}/{max}
      </span>
    </div>
  )
}

// =============================================================================
// PARISH CARD COMPONENT
// =============================================================================

/**
 * Parish selection card for the lobby
 *
 * Features:
 * - Parish-specific coloring and icons
 * - Player capacity indicators
 * - Hover effects with glow
 * - Selected state with badge
 * - Full state with overlay
 * - Accessibility support
 */
export function ParishCard({
  parishId,
  playerCount,
  maxPlayers,
  isSelected = false,
  canSelect = true,
  onSelect,
  className,
}: ParishCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const parish = PARISHES[parishId]
  const Icon = PARISH_ICONS[parishId]
  const colorClasses = PARISH_COLOR_CLASSES[parishId]
  const parishColors = colors.parish[parishId.toLowerCase() as keyof typeof colors.parish]

  const isFull = playerCount >= maxPlayers
  const isDisabled = !canSelect || (isFull && !isSelected)

  const handleClick = useCallback(() => {
    if (isDisabled) return
    onSelect?.(parishId)
  }, [isDisabled, onSelect, parishId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-xl',
        'border-2 transition-all duration-300',
        'cursor-pointer select-none',
        'min-h-[200px] p-4',
        // Background gradient
        'bg-gradient-to-br',
        colorClasses.bg,
        // Border
        colorClasses.border,
        // Hover effects
        !isDisabled && 'hover:scale-[1.02] hover:shadow-xl',
        !isDisabled && isHovered && colorClasses.glow,
        // Selected state
        isSelected && 'ring-2 ring-offset-2 ring-offset-background scale-[1.02]',
        isSelected && `shadow-xl ${colorClasses.glow}`,
        // Disabled state
        isDisabled && 'opacity-60 cursor-not-allowed',
        // Focus state
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
        className
      )}
      style={{
        // Use CSS custom property for dynamic ring color
        '--ring-color': isSelected ? parishColors.primary : undefined,
      } as React.CSSProperties}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      aria-label={`${parish.name} parish, ${playerCount} of ${maxPlayers} players${isSelected ? ', selected' : ''}${isFull ? ', full' : ''}`}
    >
      {/* Background pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header with icon and name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg transition-all duration-300',
                'bg-black/20 backdrop-blur-sm'
              )}
              style={{
                boxShadow: isHovered || isSelected ? `0 0 16px ${parishColors.primary}40` : undefined,
              }}
            >
              <Icon
                className="w-5 h-5 transition-colors duration-300"
                style={{ color: parishColors.primary }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {parish.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                Pop: {parish.population.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Selected badge */}
          {isSelected && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full',
                'text-xs font-medium animate-scale-in',
                'bg-black/30 backdrop-blur-sm'
              )}
              style={{ color: parishColors.accent }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Your Team
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {parish.description}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer with capacity */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">Team</span>
          </div>
          <CapacityIndicator
            current={playerCount}
            max={maxPlayers}
            parishId={parishId}
          />
        </div>
      </div>

      {/* Full overlay */}
      {isFull && !isSelected && (
        <div
          className={cn(
            'absolute inset-0 z-20',
            'flex items-center justify-center',
            'bg-black/60 backdrop-blur-sm',
            'animate-fade-in'
          )}
        >
          <div className="px-4 py-2 rounded-lg bg-black/40 border border-white/10">
            <span className="text-sm font-medium text-muted-foreground">
              Team Full
            </span>
          </div>
        </div>
      )}

      {/* Joining animation pulse */}
      {playerCount > 0 && playerCount < maxPlayers && !isSelected && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full animate-pulse"
            style={{
              background: `linear-gradient(90deg, transparent, ${parishColors.primary}40, transparent)`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default ParishCard
