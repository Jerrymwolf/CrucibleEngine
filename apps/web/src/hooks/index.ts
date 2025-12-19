// =============================================================================
// HOOKS INDEX
// =============================================================================

// Sound System
export {
  useSound,
  sounds,
  ambientSounds,
  voiceSounds,
  visualAlternatives,
} from './useSound'
export type {
  SoundCategory,
  AmbientSoundName,
  UseSoundOptions,
  UseSoundReturn,
  VisualCue,
} from './useSound'

export {
  useSoundscape,
  usePhaseAmbient,
  phaseAmbientMap,
} from './useSoundscape'
export type {
  SoundscapeState,
  UseSoundscapeOptions,
  UseSoundscapeReturn,
} from './useSoundscape'

// Accessibility
export {
  useAccessibility,
  gameAnnouncements,
} from './useAccessibility'
export type {
  ColorVisionMode,
  AccessibilitySettings,
  LiveRegionOptions,
  UseAccessibilityReturn,
} from './useAccessibility'

export {
  useKeyboardNavigation,
  defaultShortcuts,
  groupShortcutsByCategory,
  formatKeyForDisplay,
} from './useKeyboardNavigation'
export type {
  KeyboardShortcut,
  NavigationMode,
  UseKeyboardNavigationOptions,
  UseKeyboardNavigationReturn,
  KeyboardShortcutsOverlayProps,
} from './useKeyboardNavigation'

// Screen Effects
export { useScreenShake, useDecisionShake } from './useScreenShake'
export type { ShakeIntensity, ShakeOptions } from './useScreenShake'
