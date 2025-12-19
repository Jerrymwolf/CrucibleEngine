'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { PARISHES, PARISH_IDS, type ParishId } from '@crucible/shared/constants'
import { ParishCard } from './ParishCard'
import { TeamRoster, type TeamMember } from './TeamRoster'
import { Loader2, Users, Clock } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface ParishTeamData {
  parishId: ParishId
  members: TeamMember[]
}

export interface WaitingRoomProps {
  /** Current user's selected parish */
  selectedParish: ParishId | null
  /** All parish team data */
  parishTeams: Record<ParishId, TeamMember[]>
  /** Maximum players per team */
  maxPlayersPerTeam: number
  /** Current user's ID */
  currentUserId: string
  /** Whether the current user is ready */
  isCurrentUserReady: boolean
  /** Total ready count across all teams */
  totalReadyCount: number
  /** Total player count */
  totalPlayerCount: number
  /** Whether a parish is being joined */
  isJoiningParish?: boolean
  /** Whether ready status is being updated */
  isUpdatingReady?: boolean
  /** Called when a parish is selected */
  onSelectParish: (parishId: ParishId) => void
  /** Called when ready status is toggled */
  onToggleReady: () => void
  /** Optional class name */
  className?: string
}

// =============================================================================
// PROGRESS INDICATOR COMPONENT
// =============================================================================

interface GlobalProgressProps {
  readyCount: number
  totalCount: number
}

function GlobalProgress({ readyCount, totalCount }: GlobalProgressProps) {
  const percentage = totalCount > 0 ? (readyCount / totalCount) * 100 : 0
  const isAllReady = readyCount === totalCount && totalCount > 0

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* Progress bar */}
      <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            isAllReady ? 'bg-green-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status text */}
      <div className="flex items-center gap-2 text-muted-foreground">
        {isAllReady ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-green-400" />
            <span className="text-green-400 font-medium">
              All players ready! Starting soon...
            </span>
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />
            <span>
              Waiting for all teams to ready up...{' '}
              <span className="font-medium text-foreground">
                {readyCount}/{totalCount} ready
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// WAITING ROOM COMPONENT
// =============================================================================

/**
 * Main lobby waiting room component
 *
 * Features:
 * - Parish selection grid
 * - Team roster when parish selected
 * - Global ready progress
 * - Real-time updates
 */
export function WaitingRoom({
  selectedParish,
  parishTeams,
  maxPlayersPerTeam,
  currentUserId,
  isCurrentUserReady,
  totalReadyCount,
  totalPlayerCount,
  isJoiningParish = false,
  isUpdatingReady = false,
  onSelectParish,
  onToggleReady,
  className,
}: WaitingRoomProps) {
  // Get team members for selected parish
  const selectedTeamMembers = useMemo(() => {
    if (!selectedParish) return []
    return (parishTeams[selectedParish] || []).map((m) => ({
      ...m,
      isCurrentUser: m.id === currentUserId,
    }))
  }, [selectedParish, parishTeams, currentUserId])

  // Calculate which parishes the user can select
  const canSelectParish = useCallback(
    (parishId: ParishId) => {
      // Can always select currently selected parish
      if (parishId === selectedParish) return true
      // Can't join if already in a parish (would need to leave first)
      if (selectedParish !== null) return false
      // Can't join if full
      const members = parishTeams[parishId] || []
      return members.length < maxPlayersPerTeam
    },
    [selectedParish, parishTeams, maxPlayersPerTeam]
  )

  return (
    <div className={cn('min-h-screen', className)}>
      {/* Page header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Choose Your Parish
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Each community on Concordia Island needs your leadership. Select a parish to join
          your team.
        </p>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Parish grid */}
          <div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {PARISH_IDS.map((parishId, index) => {
                const members = parishTeams[parishId] || []
                return (
                  <div
                    key={parishId}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ParishCard
                      parishId={parishId}
                      playerCount={members.length}
                      maxPlayers={maxPlayersPerTeam}
                      isSelected={selectedParish === parishId}
                      canSelect={canSelectParish(parishId)}
                      onSelect={onSelectParish}
                    />
                  </div>
                )
              })}
            </div>

            {/* Global progress */}
            <GlobalProgress
              readyCount={totalReadyCount}
              totalCount={totalPlayerCount}
            />
          </div>

          {/* Team roster sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {selectedParish ? (
              <TeamRoster
                parishId={selectedParish}
                members={selectedTeamMembers}
                maxMembers={maxPlayersPerTeam}
                isCurrentUserReady={isCurrentUserReady}
                onToggleReady={onToggleReady}
                isReadyLoading={isUpdatingReady}
              />
            ) : (
              <div
                className={cn(
                  'rounded-xl border border-dashed border-white/20',
                  'p-8 text-center',
                  'bg-gradient-to-b from-white/5 to-transparent'
                )}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Select a Parish
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click on a parish card to join that team and see your teammates.
                </p>
              </div>
            )}

            {/* Session info */}
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                <span>Session typically takes 60-90 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay when joining */}
      {isJoiningParish && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card rounded-xl p-6 flex items-center gap-3 shadow-xl animate-scale-in">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-medium">Joining parish...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WaitingRoom
