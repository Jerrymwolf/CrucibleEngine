'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export type KeyboardShortcut = {
  /** Key or key combination (e.g., 'a', 'ctrl+s', 'shift+?') */
  key: string
  /** Handler function */
  handler: (event: KeyboardEvent) => void
  /** Description for help overlay */
  description: string
  /** Category for grouping in help overlay */
  category?: string
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean
  /** Whether shortcut is currently active */
  enabled?: boolean
}

export type NavigationMode = 'default' | 'lobby' | 'quickSort' | 'crisis' | 'debrief'

export interface UseKeyboardNavigationOptions {
  /** Current navigation mode */
  mode?: NavigationMode
  /** Whether keyboard navigation is enabled */
  enabled?: boolean
}

export interface UseKeyboardNavigationReturn {
  /** Register a keyboard shortcut */
  registerShortcut: (shortcut: KeyboardShortcut) => () => void
  /** Unregister a shortcut by key */
  unregisterShortcut: (key: string) => void
  /** Get all registered shortcuts */
  getShortcuts: () => KeyboardShortcut[]
  /** Show/hide help overlay */
  showHelp: boolean
  /** Toggle help overlay */
  toggleHelp: () => void
  /** Current navigation mode */
  mode: NavigationMode
  /** Set navigation mode */
  setMode: (mode: NavigationMode) => void
}

// =============================================================================
// KEY PARSING
// =============================================================================

interface ParsedKey {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

function parseKey(keyString: string): ParsedKey {
  const parts = keyString.toLowerCase().split('+')
  const key = parts.pop() || ''

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  }
}

function matchesKey(event: KeyboardEvent, parsed: ParsedKey): boolean {
  const eventKey = event.key.toLowerCase()

  // Handle special keys
  const keyMatch =
    eventKey === parsed.key ||
    event.code.toLowerCase() === `key${parsed.key}` ||
    event.code.toLowerCase() === `digit${parsed.key}` ||
    event.code.toLowerCase() === parsed.key

  const modifiersMatch =
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta

  return keyMatch && modifiersMatch
}

// =============================================================================
// DEFAULT SHORTCUTS BY MODE
// =============================================================================

export const defaultShortcuts: Record<NavigationMode, Omit<KeyboardShortcut, 'handler'>[]> = {
  default: [
    { key: '?', description: 'Show keyboard shortcuts', category: 'Global' },
    { key: 'escape', description: 'Close modal/overlay', category: 'Global' },
  ],

  lobby: [
    { key: '1', description: 'Select Keystone parish', category: 'Lobby' },
    { key: '2', description: 'Select Haven parish', category: 'Lobby' },
    { key: '3', description: 'Select Gateway parish', category: 'Lobby' },
    { key: '4', description: 'Select Heartland parish', category: 'Lobby' },
    { key: '5', description: 'Select Summit parish', category: 'Lobby' },
    { key: '6', description: 'Select Sterling parish', category: 'Lobby' },
    { key: 'r', description: 'Toggle ready status', category: 'Lobby' },
  ],

  quickSort: [
    { key: 'a', description: 'Sort to Essential pile', category: 'Quick Sort' },
    { key: 's', description: 'Skip card (return to deck)', category: 'Quick Sort' },
    { key: 'd', description: 'Sort to Not Core pile', category: 'Quick Sort' },
    { key: 'space', description: 'Flip card for definition', category: 'Quick Sort' },
  ],

  crisis: [
    { key: 'm', description: 'Focus map panel', category: 'Crisis Console' },
    { key: 'd', description: 'Focus decisions panel', category: 'Crisis Console' },
    { key: 'r', description: 'Focus resources panel', category: 'Crisis Console' },
    { key: 'n', description: 'Focus news feed', category: 'Crisis Console' },
    { key: '1', description: 'Select option 1', category: 'Decisions' },
    { key: '2', description: 'Select option 2', category: 'Decisions' },
    { key: '3', description: 'Select option 3', category: 'Decisions' },
    { key: '4', description: 'Select option 4', category: 'Decisions' },
    { key: 'enter', description: 'Confirm selection', category: 'Decisions' },
  ],

  debrief: [
    { key: 'arrowleft', description: 'Previous chapter', category: 'Debrief' },
    { key: 'arrowright', description: 'Next chapter', category: 'Debrief' },
    { key: 'enter', description: 'Expand/collapse details', category: 'Debrief' },
  ],
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing keyboard navigation and shortcuts in CrucibleEngine
 *
 * Provides:
 * - Mode-based shortcut management
 * - Help overlay toggling
 * - Shortcut registration/unregistration
 * - Key combination parsing
 *
 * @example
 * ```tsx
 * const { registerShortcut, toggleHelp, setMode } = useKeyboardNavigation({
 *   mode: 'crisis',
 *   enabled: true,
 * })
 *
 * useEffect(() => {
 *   const unregister = registerShortcut({
 *     key: 'ctrl+s',
 *     handler: () => saveProgress(),
 *     description: 'Save progress',
 *     category: 'General',
 *   })
 *
 *   return unregister
 * }, [registerShortcut])
 * ```
 */
export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const { mode: initialMode = 'default', enabled = true } = options

  const [mode, setMode] = useState<NavigationMode>(initialMode)
  const [showHelp, setShowHelp] = useState(false)
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map())

  // Toggle help overlay
  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev)
  }, [])

  // Register a shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current.set(shortcut.key.toLowerCase(), {
      ...shortcut,
      enabled: shortcut.enabled ?? true,
    })

    return () => {
      shortcutsRef.current.delete(shortcut.key.toLowerCase())
    }
  }, [])

  // Unregister a shortcut
  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key.toLowerCase())
  }, [])

  // Get all shortcuts
  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values())
  }, [])

  // Handle keydown events
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Still allow escape
        if (event.key !== 'Escape') {
          return
        }
      }

      // Check for help shortcut (? key)
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault()
        toggleHelp()
        return
      }

      // Check for escape to close help
      if (event.key === 'Escape') {
        if (showHelp) {
          event.preventDefault()
          setShowHelp(false)
          return
        }
      }

      // Check registered shortcuts
      for (const shortcut of shortcutsRef.current.values()) {
        if (!shortcut.enabled) continue

        const parsed = parseKey(shortcut.key)
        if (matchesKey(event, parsed)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, showHelp, toggleHelp])

  // Register default help shortcut
  useEffect(() => {
    return registerShortcut({
      key: '?',
      handler: () => toggleHelp(),
      description: 'Show keyboard shortcuts',
      category: 'Global',
    })
  }, [registerShortcut, toggleHelp])

  return {
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
    showHelp,
    toggleHelp,
    mode,
    setMode,
  }
}

// =============================================================================
// KEYBOARD SHORTCUTS OVERLAY COMPONENT PROPS
// =============================================================================

export interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Current navigation mode */
  mode: NavigationMode
  /** Additional shortcuts to display */
  customShortcuts?: KeyboardShortcut[]
}

/**
 * Helper to group shortcuts by category
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Record<string, KeyboardShortcut[]> {
  return shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || 'General'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>
  )
}

/**
 * Format a key for display
 */
export function formatKeyForDisplay(key: string): string {
  const parts = key.split('+')
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case 'ctrl':
      case 'control':
        return 'Ctrl'
      case 'alt':
        return 'Alt'
      case 'shift':
        return 'Shift'
      case 'meta':
      case 'cmd':
      case 'command':
        return '⌘'
      case 'enter':
        return '↵'
      case 'escape':
        return 'Esc'
      case 'space':
        return 'Space'
      case 'arrowleft':
        return '←'
      case 'arrowright':
        return '→'
      case 'arrowup':
        return '↑'
      case 'arrowdown':
        return '↓'
      case 'tab':
        return 'Tab'
      case 'backspace':
        return '⌫'
      case 'delete':
        return 'Del'
      default:
        return part.toUpperCase()
    }
  })

  return formatted.join(' + ')
}

export default useKeyboardNavigation
