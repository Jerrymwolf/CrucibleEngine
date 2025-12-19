'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export type ColorVisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia'

export interface AccessibilitySettings {
  /** Whether reduced motion is preferred */
  reducedMotion: boolean
  /** Whether high contrast is preferred */
  highContrast: boolean
  /** Screen reader announcements enabled */
  announcements: boolean
  /** Color vision deficiency mode */
  colorVisionMode: ColorVisionMode
  /** Focus visible mode - keyboard only or always */
  focusMode: 'keyboard' | 'always'
  /** Large text mode */
  largeText: boolean
  /** Sound enabled (affects both sound and visual alternatives) */
  soundEnabled: boolean
}

export interface LiveRegionOptions {
  /** Politeness level */
  politeness?: 'polite' | 'assertive' | 'off'
  /** Whether to clear previous announcements */
  clearPrevious?: boolean
  /** Delay before announcing (ms) */
  delay?: number
}

export interface UseAccessibilityReturn {
  /** Current accessibility settings */
  settings: AccessibilitySettings
  /** Update a specific setting */
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void
  /** Announce a message to screen readers */
  announce: (message: string, options?: LiveRegionOptions) => void
  /** Focus management helpers */
  focus: {
    /** Trap focus within an element */
    trap: (container: HTMLElement) => () => void
    /** Restore focus to previous element */
    restore: () => void
    /** Save current focus for later restoration */
    save: () => void
  }
  /** Skip to content functionality */
  skipToContent: (contentId?: string) => void
  /** Get appropriate aria-live region props */
  getLiveRegionProps: (politeness?: 'polite' | 'assertive') => {
    'aria-live': 'polite' | 'assertive' | 'off'
    'aria-atomic': boolean
    role: 'status' | 'alert'
  }
  /** Check if user is using keyboard navigation */
  isKeyboardUser: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'crucible-accessibility-settings'

const DEFAULT_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  announcements: true,
  colorVisionMode: 'normal',
  focusMode: 'keyboard',
  largeText: false,
  soundEnabled: true,
}

// =============================================================================
// LIVE REGION MANAGER
// =============================================================================

class LiveRegionManager {
  private politeRegion: HTMLElement | null = null
  private assertiveRegion: HTMLElement | null = null
  private clearTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      this.createRegions()
    }
  }

  private createRegions(): void {
    // Check if regions already exist
    this.politeRegion = document.getElementById('crucible-live-polite')
    this.assertiveRegion = document.getElementById('crucible-live-assertive')

    if (!this.politeRegion) {
      this.politeRegion = document.createElement('div')
      this.politeRegion.id = 'crucible-live-polite'
      this.politeRegion.setAttribute('aria-live', 'polite')
      this.politeRegion.setAttribute('aria-atomic', 'true')
      this.politeRegion.setAttribute('role', 'status')
      this.politeRegion.className = 'sr-only'
      document.body.appendChild(this.politeRegion)
    }

    if (!this.assertiveRegion) {
      this.assertiveRegion = document.createElement('div')
      this.assertiveRegion.id = 'crucible-live-assertive'
      this.assertiveRegion.setAttribute('aria-live', 'assertive')
      this.assertiveRegion.setAttribute('aria-atomic', 'true')
      this.assertiveRegion.setAttribute('role', 'alert')
      this.assertiveRegion.className = 'sr-only'
      document.body.appendChild(this.assertiveRegion)
    }
  }

  announce(
    message: string,
    options: LiveRegionOptions = {}
  ): void {
    const { politeness = 'polite', clearPrevious = true, delay = 0 } = options

    const region =
      politeness === 'assertive' ? this.assertiveRegion : this.politeRegion

    if (!region) return

    const doAnnounce = () => {
      if (clearPrevious) {
        region.textContent = ''
        // Force reflow for screen reader to pick up change
        void region.offsetHeight
      }

      // Use setTimeout(0) to ensure the clear has been processed
      setTimeout(() => {
        region.textContent = message
      }, 50)

      // Clear after 5 seconds to prevent stale announcements
      const existingTimeout = this.clearTimeouts.get(region.id)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      this.clearTimeouts.set(
        region.id,
        setTimeout(() => {
          region.textContent = ''
        }, 5000)
      )
    }

    if (delay > 0) {
      setTimeout(doAnnounce, delay)
    } else {
      doAnnounce()
    }
  }

  clear(politeness: 'polite' | 'assertive' | 'all' = 'all'): void {
    if (politeness === 'all' || politeness === 'polite') {
      if (this.politeRegion) this.politeRegion.textContent = ''
    }
    if (politeness === 'all' || politeness === 'assertive') {
      if (this.assertiveRegion) this.assertiveRegion.textContent = ''
    }
  }
}

// Singleton instance
let liveRegionManager: LiveRegionManager | null = null

function getLiveRegionManager(): LiveRegionManager {
  if (!liveRegionManager && typeof window !== 'undefined') {
    liveRegionManager = new LiveRegionManager()
  }
  return liveRegionManager!
}

// =============================================================================
// FOCUS TRAP UTILITY
// =============================================================================

function createFocusTrap(container: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ')

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      // Tab
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Focus first element
  const focusable = getFocusableElements()
  if (focusable.length > 0) {
    focusable[0].focus()
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing accessibility features in CrucibleEngine
 *
 * Provides:
 * - Live region announcements for screen readers
 * - Focus management (trap, save, restore)
 * - System preference detection (reduced motion, high contrast)
 * - User preference persistence
 * - Keyboard navigation detection
 *
 * @example
 * ```tsx
 * const { announce, settings, skipToContent } = useAccessibility()
 *
 * // Announce to screen readers
 * announce('New dilemma available', { politeness: 'assertive' })
 *
 * // Skip to main content
 * skipToContent('main-content')
 * ```
 */
export function useAccessibility(): UseAccessibilityReturn {
  // Load saved settings or detect system preferences
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS

    // Try to load saved settings
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      } catch {
        // Invalid JSON, use defaults
      }
    }

    // Detect system preferences
    return {
      ...DEFAULT_SETTINGS,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: more)').matches,
    }
  })

  // Track keyboard vs mouse usage
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)
  const savedFocusRef = useRef<HTMLElement | null>(null)

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: more)')

    const handleReducedMotion = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, reducedMotion: e.matches }))
    }

    const handleHighContrast = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }))
    }

    reducedMotionQuery.addEventListener('change', handleReducedMotion)
    highContrastQuery.addEventListener('change', handleHighContrast)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotion)
      highContrastQuery.removeEventListener('change', handleHighContrast)
    }
  }, [])

  // Track keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
        document.body.classList.add('keyboard-user')
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
      document.body.classList.remove('keyboard-user')
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Apply settings to document
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Apply classes to body for CSS targeting
    document.body.classList.toggle('reduced-motion', settings.reducedMotion)
    document.body.classList.toggle('high-contrast', settings.highContrast)
    document.body.classList.toggle('large-text', settings.largeText)
    document.body.dataset.colorVision = settings.colorVisionMode

    // Save settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Update a specific setting
  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Announce to screen readers
  const announce = useCallback(
    (message: string, options?: LiveRegionOptions) => {
      if (!settings.announcements) return
      getLiveRegionManager()?.announce(message, options)
    },
    [settings.announcements]
  )

  // Focus management
  const focus = {
    trap: useCallback((container: HTMLElement) => {
      return createFocusTrap(container)
    }, []),

    save: useCallback(() => {
      savedFocusRef.current = document.activeElement as HTMLElement
    }, []),

    restore: useCallback(() => {
      if (savedFocusRef.current && savedFocusRef.current.focus) {
        savedFocusRef.current.focus()
        savedFocusRef.current = null
      }
    }, []),
  }

  // Skip to content
  const skipToContent = useCallback((contentId: string = 'main-content') => {
    const element = document.getElementById(contentId)
    if (element) {
      element.setAttribute('tabindex', '-1')
      element.focus()
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Get live region props
  const getLiveRegionProps = useCallback(
    (politeness: 'polite' | 'assertive' = 'polite') => ({
      'aria-live': politeness as 'polite' | 'assertive' | 'off',
      'aria-atomic': true as const,
      role: (politeness === 'assertive' ? 'alert' : 'status') as 'status' | 'alert',
    }),
    []
  )

  return {
    settings,
    updateSetting,
    announce,
    focus,
    skipToContent,
    getLiveRegionProps,
    isKeyboardUser,
  }
}

// =============================================================================
// PRE-BUILT ANNOUNCEMENT HELPERS
// =============================================================================

/**
 * Pre-built announcement messages for common game events
 */
export const gameAnnouncements = {
  // Lobby
  playerJoined: (name: string, team: string) => `${name} joined ${team}`,
  playerLeft: (name: string) => `${name} left the session`,
  teamReady: (team: string) => `${team} is ready`,
  allTeamsReady: () => 'All teams ready. Starting discovery phase.',

  // Discovery
  cardSorted: (value: string, pile: 'essential' | 'not-core') =>
    `${value} placed in ${pile === 'essential' ? 'essential' : 'not core'} pile`,
  roundComplete: (round: number, total: number) =>
    `Round ${round} of ${total} complete`,
  commitmentSigned: (remaining: number) =>
    remaining > 0
      ? `Signed. ${remaining} signature${remaining === 1 ? '' : 's'} remaining`
      : 'All signatures complete. Ready to seal commitment.',
  commitmentSealed: () => 'Commitment sealed. Entering storm briefing.',

  // Crisis
  phaseChanged: (phase: string) => `Phase changed to ${phase}`,
  dilemmaPresented: (title: string, optionCount: number) =>
    `New dilemma: ${title}. ${optionCount} options available.`,
  optionSelected: (option: string) => `Selected: ${option}`,
  decisionConfirmed: (choice: string) => `Decision confirmed: ${choice}`,
  consequenceApplied: (effect: string) => `Consequence: ${effect}`,
  resourceChanged: (resource: string, newLevel: number, direction: 'up' | 'down') =>
    `${resource} ${direction === 'up' ? 'increased' : 'decreased'} to ${newLevel} percent`,
  breakingNews: (headline: string) => `Breaking news: ${headline}`,
  interventionStarted: (type: string, duration: number) =>
    `${type} intervention started. ${duration} seconds to reflect.`,
  timerWarning: (secondsRemaining: number) =>
    `${secondsRemaining} seconds remaining`,

  // Debrief
  gapRevealed: (value: string, stated: number, enacted: number) =>
    `Gap revealed for ${value}. Stated: ${stated} percent. Enacted: ${enacted} percent.`,
  chapterChanged: (chapter: number, title: string) =>
    `Chapter ${chapter}: ${title}`,

  // Connection
  connecting: () => 'Connecting to session...',
  connected: () => 'Connected successfully',
  disconnected: () => 'Connection lost. Attempting to reconnect.',
  reconnected: () => 'Reconnected successfully',
  reconnectFailed: (attempt: number, max: number) =>
    `Reconnection attempt ${attempt} of ${max} failed`,
}

export default useAccessibility
