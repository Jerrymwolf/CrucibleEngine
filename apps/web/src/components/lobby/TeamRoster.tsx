'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { colors, PARISHES, type ParishId } from '@crucible/shared/constants'
import { Button } from '@/components/ui/button'
import {
  User,
  UserCheck,
  Loader2,
  Check,
  Crown,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface TeamMember {
  id: string
  name: string
  isReady: boolean
  isCurrentUser?: boolean
  joinedAt?: number
}

export interface TeamRosterProps {
  /** Parish the team belongs to */
  parishId: ParishId
  /** Team members */
  members: TeamMember[]
  /** Maximum team size */
  maxMembers: number
  /** Whether the current user is ready */
  isCurrentUserReady: boolean
  /** Called when ready status changes */
  onToggleReady: () => void
  /** Whether ready toggle is loading */
  isReadyLoading?: boolean
  /** Optional class name */
  className?: string
}

// =============================================================================
// AVATAR COMPONENT
// =============================================================================

interface MemberAvatarProps {
  name: string
  isReady: boolean
  isCurrentUser?: boolean
  parishId: ParishId
  isJoining?: boolean
}

function MemberAvatar({ name, isReady, isCurrentUser, parishId, isJoining }: MemberAvatarProps) {
  const parishColors = colors.parish[parishId.toLowerCase() as keyof typeof colors.parish]
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'text-sm font-semibold transition-all duration-300',
          'border-2',
          isReady ? 'border-green-500/50' : 'border-white/20',
          isJoining && 'animate-pulse'
        )}
        style={{
          backgroundColor: `${parishColors.secondary}80`,
          color: parishColors.accent,
        }}
      >
        {initials}
      </div>

      {/* Ready indicator */}
      {isReady && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5',
            'w-4 h-4 rounded-full',
            'bg-green-500 border-2 border-background',
            'flex items-center justify-center',
            'animate-scale-in'
          )}
        >
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Current user indicator */}
      {isCurrentUser && (
        <div
          className={cn(
            'absolute -top-1 -right-1',
            'w-4 h-4 rounded-full',
            'border-2 border-background',
            'flex items-center justify-center'
          )}
          style={{ backgroundColor: parishColors.primary }}
        >
          <Crown className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MEMBER ROW COMPONENT
// =============================================================================

interface MemberRowProps {
  member: TeamMember
  parishId: ParishId
  index: number
}

function MemberRow({ member, parishId, index }: MemberRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'transition-all duration-300',
        'animate-fade-in-up',
        member.isCurrentUser && 'bg-white/5'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <MemberAvatar
        name={member.name}
        isReady={member.isReady}
        isCurrentUser={member.isCurrentUser}
        parishId={parishId}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              member.isCurrentUser ? 'text-foreground' : 'text-foreground/80'
            )}
          >
            {member.name}
          </span>
          {member.isCurrentUser && (
            <span className="text-xs text-muted-foreground">(You)</span>
          )}
        </div>
        <span
          className={cn(
            'text-xs',
            member.isReady ? 'text-green-400' : 'text-muted-foreground'
          )}
        >
          {member.isReady ? 'Ready' : 'Not ready'}
        </span>
      </div>

      {/* Status icon */}
      {member.isReady ? (
        <UserCheck className="w-4 h-4 text-green-400" />
      ) : (
        <User className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  )
}

// =============================================================================
// EMPTY SLOT COMPONENT
// =============================================================================

interface EmptySlotProps {
  index: number
}

function EmptySlot({ index }: EmptySlotProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'border border-dashed border-white/10',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
        <User className="w-4 h-4 text-muted-foreground/50" />
      </div>
      <span className="text-sm text-muted-foreground/50">Waiting for player...</span>
    </div>
  )
}

// =============================================================================
// TEAM ROSTER COMPONENT
// =============================================================================

/**
 * Team roster showing members and ready states
 *
 * Features:
 * - Real-time member list with join animations
 * - Ready status indicators
 * - Ready toggle button
 * - Empty slot placeholders
 */
export function TeamRoster({
  parishId,
  members,
  maxMembers,
  isCurrentUserReady,
  onToggleReady,
  isReadyLoading = false,
  className,
}: TeamRosterProps) {
  const parish = PARISHES[parishId]
  const parishColors = colors.parish[parishId.toLowerCase() as keyof typeof colors.parish]

  const readyCount = useMemo(
    () => members.filter((m) => m.isReady).length,
    [members]
  )

  const emptySlots = maxMembers - members.length

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 overflow-hidden',
        'bg-gradient-to-b from-white/5 to-transparent',
        className
      )}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-white/10"
        style={{
          background: `linear-gradient(135deg, ${parishColors.secondary}20, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">
              Your Team: {parish.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {readyCount} of {members.length} ready
            </p>
          </div>

          {/* Ready progress ring */}
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-white/10"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={readyCount === members.length ? '#22c55e' : parishColors.primary}
                strokeWidth="3"
                strokeDasharray={`${(readyCount / members.length) * 125.6} 125.6`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">
                {readyCount}/{members.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Member list */}
      <div className="p-3 space-y-2">
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            parishId={parishId}
            index={index}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} index={members.length + i} />
        ))}
      </div>

      {/* Ready button */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20">
        <Button
          onClick={onToggleReady}
          disabled={isReadyLoading}
          className={cn(
            'w-full transition-all duration-300',
            isCurrentUserReady
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-primary hover:bg-primary/90'
          )}
        >
          {isReadyLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : isCurrentUserReady ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Ready!
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              I&apos;m Ready
            </>
          )}
        </Button>

        {readyCount === members.length && members.length > 0 && (
          <p className="text-xs text-center text-green-400 mt-2 animate-fade-in">
            Waiting for other teams...
          </p>
        )}
      </div>
    </div>
  )
}

export default TeamRoster
