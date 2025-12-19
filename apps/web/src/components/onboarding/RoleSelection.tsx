'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Users, Shield, ArrowRight } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'participant' | 'facilitator'

interface RoleSelectionProps {
  /** Called when a role is selected */
  onSelect: (role: UserRole) => void
  /** Additional class names */
  className?: string
}

interface RoleCardProps {
  role: UserRole
  icon: React.ReactNode
  title: string
  description: string
  details: string[]
  badge: string
  isSelected: boolean
  isOther: boolean
  onSelect: () => void
}

// =============================================================================
// ROLE CARD COMPONENT
// =============================================================================

function RoleCard({
  role,
  icon,
  title,
  description,
  details,
  badge,
  isSelected,
  isOther,
  onSelect,
}: RoleCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex flex-col items-center p-6 rounded-xl',
        'bg-card border-2 transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Default state
        'border-border hover:border-primary/50',
        // Selected state
        isSelected && 'border-primary scale-105 shadow-lg shadow-primary/20',
        // Other card fading
        isOther && !isHovered && 'opacity-50 scale-95',
        // Hover effects
        !isSelected && !isOther && 'hover:scale-102 hover:shadow-md',
        // 3D tilt effect container
        'transform-gpu perspective-1000'
      )}
      style={{
        transform: isHovered && !isSelected
          ? 'rotateY(-2deg) rotateX(2deg) scale(1.02)'
          : undefined,
      }}
      aria-pressed={isSelected}
      data-shortcut={role === 'participant' ? '1' : '2'}
    >
      {/* Glow effect on hover/select */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
          'bg-gradient-to-br',
          role === 'participant'
            ? 'from-primary/20 to-blue-500/10'
            : 'from-purple-500/20 to-violet-500/10',
          (isHovered || isSelected) && 'opacity-100'
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-4',
            'transition-all duration-300',
            role === 'participant'
              ? 'bg-primary/10 text-primary'
              : 'bg-purple-500/10 text-purple-400',
            isSelected && role === 'participant' && 'bg-primary/20',
            isSelected && role === 'facilitator' && 'bg-purple-500/20'
          )}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">{description}</p>

        {/* Details list */}
        <ul className="text-xs text-muted-foreground space-y-1 mb-4">
          {details.map((detail, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-primary">-</span>
              {detail}
            </li>
          ))}
        </ul>

        {/* Badge */}
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            'bg-muted text-muted-foreground'
          )}
        >
          {badge}
        </span>

        {/* Arrow indicator */}
        <ArrowRight
          className={cn(
            'absolute right-4 top-1/2 -translate-y-1/2',
            'w-5 h-5 text-primary opacity-0 transition-all duration-300',
            'translate-x-2',
            (isHovered || isSelected) && 'opacity-100 translate-x-0'
          )}
        />
      </div>
    </button>
  )
}

// =============================================================================
// ROLE SELECTION COMPONENT
// =============================================================================

/**
 * Role selection screen for choosing between Participant and Crucible Master
 *
 * Features:
 * - Two animated cards with hover effects
 * - 3D tilt on hover
 * - Keyboard shortcuts (1 for Participant, 2 for Facilitator)
 * - Accessible focus management
 *
 * @example
 * ```tsx
 * <RoleSelection
 *   onSelect={(role) => {
 *     if (role === 'participant') {
 *       showParticipantForm()
 *     } else {
 *       showFacilitatorForm()
 *     }
 *   }}
 * />
 * ```
 */
export function RoleSelection({ onSelect, className }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleSelect = (role: UserRole) => {
    setSelectedRole(role)
    // Small delay for visual feedback before transitioning
    setTimeout(() => {
      onSelect(role)
    }, 200)
  }

  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Choose Your Role
        </h2>
        <p className="text-muted-foreground">
          Select how you want to participate in the simulation
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <RoleCard
            role="participant"
            icon={<Users className="w-8 h-8" />}
            title="Participant"
            description="Join your team and face dilemmas together"
            details={[
              'Join with a session code',
              'Face realistic dilemmas',
              'Discover your values under pressure',
            ]}
            badge="3-30 people per session"
            isSelected={selectedRole === 'participant'}
            isOther={selectedRole === 'facilitator'}
            onSelect={() => handleSelect('participant')}
          />
        </div>

        <div
          className="animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          <RoleCard
            role="facilitator"
            icon={<Shield className="w-8 h-8" />}
            title="Crucible Master"
            description="Facilitate the simulation and guide teams"
            details={[
              'Create and manage sessions',
              'Control simulation pace',
              'Guide team reflections',
            ]}
            badge="1 per session"
            isSelected={selectedRole === 'facilitator'}
            isOther={selectedRole === 'participant'}
            onSelect={() => handleSelect('facilitator')}
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="keyboard-hint text-center mt-6">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">1</kbd> or{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">2</kbd> to select
      </p>
    </div>
  )
}

export default RoleSelection
