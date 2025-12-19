'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  type NavigationMode,
  defaultShortcuts,
  formatKeyForDisplay,
  groupShortcutsByCategory,
  type KeyboardShortcut,
} from '@/hooks/useKeyboardNavigation'

// =============================================================================
// TYPES
// =============================================================================

export interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Current navigation mode */
  mode?: NavigationMode
  /** Additional custom shortcuts to display */
  customShortcuts?: Omit<KeyboardShortcut, 'handler'>[]
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Overlay displaying available keyboard shortcuts
 *
 * Shows shortcuts grouped by category based on the current navigation mode.
 * Triggered by pressing '?' key.
 *
 * @example
 * ```tsx
 * const { showHelp, toggleHelp, mode } = useKeyboardNavigation()
 *
 * return (
 *   <>
 *     <KeyboardShortcutsOverlay
 *       isOpen={showHelp}
 *       onClose={toggleHelp}
 *       mode={mode}
 *     />
 *     <YourContent />
 *   </>
 * )
 * ```
 */
export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
  mode = 'default',
  customShortcuts = [],
}: KeyboardShortcutsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and escape handling
  useEffect(() => {
    if (!isOpen) return

    // Focus the close button when opened
    closeButtonRef.current?.focus()

    // Handle escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === overlayRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  // Combine default shortcuts with mode-specific and custom shortcuts
  const allShortcuts = [
    ...defaultShortcuts.default,
    ...(mode !== 'default' ? defaultShortcuts[mode] : []),
    ...customShortcuts,
  ]

  const groupedShortcuts = groupShortcutsByCategory(
    allShortcuts as KeyboardShortcut[]
  )

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-auto bg-card border border-border rounded-lg shadow-xl animate-scale-in"
        role="document"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur">
          <h2
            id="keyboard-shortcuts-title"
            className="text-lg font-semibold text-foreground"
          >
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
            aria-label="Close keyboard shortcuts"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid gap-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-medium text-muted-foreground bg-background border border-border rounded">
                      {formatKeyForDisplay(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Mode indicator */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Current mode:{' '}
              <span className="font-medium text-foreground capitalize">
                {mode}
              </span>
              <span className="mx-2">|</span>
              Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">?</kbd> to
              toggle this overlay
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// KEYBOARD KEY COMPONENT
// =============================================================================

export interface KeyProps {
  /** The key to display */
  children: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Styled keyboard key component for inline display
 *
 * @example
 * ```tsx
 * <p>Press <Key>A</Key> to sort as essential</p>
 * ```
 */
export function Key({ children, size = 'md' }: KeyProps) {
  const sizeClasses = {
    sm: 'px-1 py-0.5 text-xs min-w-[1.25rem]',
    md: 'px-1.5 py-0.5 text-sm min-w-[1.5rem]',
    lg: 'px-2 py-1 text-base min-w-[2rem]',
  }

  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono font-medium text-muted-foreground bg-background border border-border rounded shadow-sm ${sizeClasses[size]}`}
    >
      {formatKeyForDisplay(children)}
    </kbd>
  )
}

export default KeyboardShortcutsOverlay
