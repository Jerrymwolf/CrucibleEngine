'use client'

/**
 * QuickActionPanel - Stormgate-inspired QWERT Quick Actions
 *
 * Provides rapid access to common console functions via:
 * - Q: Parish overview
 * - W: Weather details
 * - E: Emergency actions
 * - R: Resources
 * - T: Team status
 *
 * Plus number keys 1-6 for direct parish selection.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSound } from '@/hooks/useSound'
import { PARISHES, PARISH_IDS, type ParishId } from '@crucible/shared'
import {
  Map,
  Cloud,
  AlertTriangle,
  Package,
  Users,
  ChevronRight,
  Zap,
  Radio,
  Heart,
  Truck,
  Building,
  Anchor,
  Plane,
  Droplets,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// =============================================================================
// TYPES
// =============================================================================

export type QuickActionTab = 'parish' | 'weather' | 'emergency' | 'resources' | 'team'

interface QuickActionPanelProps {
  /** Currently selected tab */
  activeTab: QuickActionTab
  /** Tab change handler */
  onTabChange: (tab: QuickActionTab) => void
  /** Currently selected parish */
  selectedParish?: string | null
  /** Parish selection handler */
  onParishSelect?: (parishId: string) => void
  /** Current team's parish */
  teamParish?: string
  /** Weather data for display */
  weather?: {
    intensity: number
    conditions: string
    windSpeed: number
  }
  /** Resource summary */
  resources?: {
    power: number
    communications: number
    roads: number
    hospital: number
  }
  /** Team members */
  teamMembers?: { name: string; ready: boolean }[]
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

const TABS: {
  id: QuickActionTab
  key: string
  label: string
  icon: React.ReactNode
  shortLabel: string
}[] = [
  { id: 'parish', key: 'Q', label: 'Parish', icon: <Map className="h-4 w-4" />, shortLabel: 'Par' },
  { id: 'weather', key: 'W', label: 'Weather', icon: <Cloud className="h-4 w-4" />, shortLabel: 'Wea' },
  { id: 'emergency', key: 'E', label: 'Emergency', icon: <AlertTriangle className="h-4 w-4" />, shortLabel: 'Emg' },
  { id: 'resources', key: 'R', label: 'Resources', icon: <Package className="h-4 w-4" />, shortLabel: 'Res' },
  { id: 'team', key: 'T', label: 'Team', icon: <Users className="h-4 w-4" />, shortLabel: 'Tms' },
]

// =============================================================================
// CONTENT PANELS
// =============================================================================

function ParishContent({
  selectedParish,
  teamParish,
  onParishSelect,
}: {
  selectedParish?: string | null
  teamParish?: string
  onParishSelect?: (parishId: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Select Parish (1-6)
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PARISH_IDS.map((id, index) => {
          const parish = PARISHES[id as keyof typeof PARISHES]
          const isTeamParish = id === teamParish
          const isSelected = id === selectedParish

          return (
            <Button
              key={id}
              variant={isSelected ? 'default' : isTeamParish ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'justify-start text-xs h-8 px-2',
                isTeamParish && !isSelected && 'border border-primary/50'
              )}
              onClick={() => onParishSelect?.(id)}
            >
              <span className="w-4 h-4 flex items-center justify-center bg-muted rounded text-[10px] font-mono mr-2">
                {index + 1}
              </span>
              <span className="truncate">{parish.name}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function WeatherContent({
  weather,
}: {
  weather?: { intensity: number; conditions: string; windSpeed: number }
}) {
  if (!weather) {
    return <div className="text-sm text-muted-foreground">No weather data</div>
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Current Conditions
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground">Intensity</div>
          <div className="text-lg font-bold">{weather.intensity}/10</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground">Wind</div>
          <div className="text-lg font-bold">{weather.windSpeed} mph</div>
        </div>
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">Status: </span>
        <span className="font-medium">{weather.conditions}</span>
      </div>
    </div>
  )
}

function EmergencyContent() {
  const emergencyActions = [
    { label: 'Issue Evacuation', icon: <AlertTriangle className="h-3.5 w-3.5" />, urgent: true },
    { label: 'Request Mutual Aid', icon: <Truck className="h-3.5 w-3.5" />, urgent: false },
    { label: 'Deploy Generators', icon: <Zap className="h-3.5 w-3.5" />, urgent: false },
    { label: 'Emergency Broadcast', icon: <Radio className="h-3.5 w-3.5" />, urgent: false },
  ]

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Quick Emergency Actions
      </div>
      <div className="space-y-1.5">
        {emergencyActions.map((action) => (
          <Button
            key={action.label}
            variant={action.urgent ? 'destructive' : 'outline'}
            size="sm"
            className="w-full justify-start text-xs h-8"
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
            <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        ))}
      </div>
    </div>
  )
}

function ResourcesContent({
  resources,
}: {
  resources?: { power: number; communications: number; roads: number; hospital: number }
}) {
  const items = resources
    ? [
        { label: 'Power Grid', value: resources.power, icon: <Zap className="h-3.5 w-3.5" /> },
        { label: 'Communications', value: resources.communications, icon: <Radio className="h-3.5 w-3.5" /> },
        { label: 'Roads', value: resources.roads, icon: <Truck className="h-3.5 w-3.5" /> },
        { label: 'Hospital', value: resources.hospital, icon: <Building className="h-3.5 w-3.5" /> },
      ]
    : []

  if (!resources) {
    return <div className="text-sm text-muted-foreground">No resource data</div>
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Infrastructure Status
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="text-xs flex-1">{item.label}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    item.value >= 70 ? 'rgb(34, 197, 94)' :
                    item.value >= 40 ? 'rgb(234, 179, 8)' :
                    'rgb(239, 68, 68)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-mono w-8 text-right">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamContent({
  teamMembers,
}: {
  teamMembers?: { name: string; ready: boolean }[]
}) {
  if (!teamMembers || teamMembers.length === 0) {
    return <div className="text-sm text-muted-foreground">No team members</div>
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Team Members ({teamMembers.length})
      </div>
      <div className="space-y-1.5">
        {teamMembers.map((member, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5"
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                member.ready ? 'bg-green-500' : 'bg-amber-500'
              )}
            />
            <span className="flex-1 truncate">{member.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {member.ready ? 'Ready' : 'Active'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuickActionPanel({
  activeTab,
  onTabChange,
  selectedParish,
  onParishSelect,
  teamParish,
  weather,
  resources,
  teamMembers,
  className,
}: QuickActionPanelProps) {
  const { playUI } = useSound()

  // Handle tab change with sound
  const handleTabChange = React.useCallback(
    (tab: QuickActionTab) => {
      playUI('click')
      onTabChange(tab)
    },
    [onTabChange, playUI]
  )

  // Keyboard shortcuts for QWERT
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const key = e.key.toLowerCase()
      const tabMap: Record<string, QuickActionTab> = {
        q: 'parish',
        w: 'weather',
        e: 'emergency',
        r: 'resources',
        t: 'team',
      }

      if (tabMap[key]) {
        e.preventDefault()
        handleTabChange(tabMap[key])
      }

      // Number keys 1-6 for parish selection
      const num = parseInt(key)
      if (num >= 1 && num <= 6 && onParishSelect) {
        e.preventDefault()
        const parishId = PARISH_IDS[num - 1]
        if (parishId) {
          playUI('select')
          onParishSelect(parishId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTabChange, onParishSelect, playUI])

  return (
    <div className={cn('bg-card/50 backdrop-blur-sm rounded-lg border border-border', className)}>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors',
              'hover:bg-muted/50',
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground'
            )}
          >
            {tab.icon}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-medium hidden sm:inline">{tab.shortLabel}</span>
              <kbd className="text-[8px] px-1 py-0.5 rounded bg-muted font-mono">
                {tab.key}
              </kbd>
            </div>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-3 min-h-[160px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'parish' && (
              <ParishContent
                selectedParish={selectedParish}
                teamParish={teamParish}
                onParishSelect={onParishSelect}
              />
            )}
            {activeTab === 'weather' && <WeatherContent weather={weather} />}
            {activeTab === 'emergency' && <EmergencyContent />}
            {activeTab === 'resources' && <ResourcesContent resources={resources} />}
            {activeTab === 'team' && <TeamContent teamMembers={teamMembers} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Keyboard hint */}
      <div className="px-3 py-1.5 bg-muted/30 border-t border-border text-[9px] text-muted-foreground text-center">
        Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">?</kbd> for all shortcuts
      </div>
    </div>
  )
}

export default QuickActionPanel
