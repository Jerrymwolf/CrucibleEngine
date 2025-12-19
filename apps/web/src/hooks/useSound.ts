'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// =============================================================================
// SOUND CONFIGURATION
// =============================================================================

export interface SoundConfig {
  file: string
  volume: number
  duration: number
}

export interface AmbientConfig {
  file: string
  volume: number
  loop: boolean
}

export interface VoiceConfig {
  prefix: string
  count: number
}

/**
 * Complete sound library for CrucibleEngine
 * Organized by category for easy access and management
 */
export const sounds = {
  // UI Interactions - Short feedback sounds
  ui: {
    click: { file: '/sounds/ui/click.mp3', volume: 0.3, duration: 50 },
    hover: { file: '/sounds/ui/hover.mp3', volume: 0.1, duration: 30 },
    select: { file: '/sounds/ui/select.mp3', volume: 0.4, duration: 100 },
    toggle: { file: '/sounds/ui/toggle.mp3', volume: 0.3, duration: 80 },
    focus: { file: '/sounds/ui/focus.mp3', volume: 0.2, duration: 60 },
    error: { file: '/sounds/ui/error.mp3', volume: 0.5, duration: 200 },
    success: { file: '/sounds/ui/success.mp3', volume: 0.4, duration: 300 },
    notification: { file: '/sounds/ui/notification.mp3', volume: 0.5, duration: 400 },
    typing: { file: '/sounds/ui/typing.mp3', volume: 0.15, duration: 40 },
    close: { file: '/sounds/ui/close.mp3', volume: 0.3, duration: 100 },
  },

  // Card interactions
  cards: {
    flip: { file: '/sounds/cards/flip.mp3', volume: 0.35, duration: 150 },
    deal: { file: '/sounds/cards/deal.mp3', volume: 0.3, duration: 200 },
    essential: { file: '/sounds/cards/essential.mp3', volume: 0.4, duration: 250 },
    notCore: { file: '/sounds/cards/not-core.mp3', volume: 0.3, duration: 150 },
    pile: { file: '/sounds/cards/pile.mp3', volume: 0.25, duration: 100 },
  },

  // Dramatic Moments - Longer, more impactful sounds
  dramatic: {
    phaseTransition: { file: '/sounds/dramatic/phase-transition.mp3', volume: 0.6, duration: 2000 },
    decisionConfirm: { file: '/sounds/dramatic/decision-confirm.mp3', volume: 0.5, duration: 800 },
    consequenceReveal: { file: '/sounds/dramatic/consequence-reveal.mp3', volume: 0.5, duration: 600 },
    consequencePositive: { file: '/sounds/dramatic/consequence-positive.mp3', volume: 0.45, duration: 500 },
    consequenceNegative: { file: '/sounds/dramatic/consequence-negative.mp3', volume: 0.5, duration: 600 },
    breakingNews: { file: '/sounds/dramatic/breaking-news.mp3', volume: 0.7, duration: 500 },
    criticalAlert: { file: '/sounds/dramatic/critical-alert.mp3', volume: 0.8, duration: 1000 },
    interventionStart: { file: '/sounds/dramatic/intervention.mp3', volume: 0.6, duration: 500 },
    commitmentSeal: { file: '/sounds/dramatic/seal.mp3', volume: 0.5, duration: 1200 },
    gapReveal: { file: '/sounds/dramatic/gap-reveal.mp3', volume: 0.4, duration: 800 },
    achievement: { file: '/sounds/dramatic/achievement.mp3', volume: 0.5, duration: 1000 },
    roundComplete: { file: '/sounds/dramatic/round-complete.mp3', volume: 0.45, duration: 600 },
  },

  // Signature/Document sounds
  document: {
    signature: { file: '/sounds/document/signature.mp3', volume: 0.35, duration: 400 },
    allSigned: { file: '/sounds/document/all-signed.mp3', volume: 0.4, duration: 500 },
    stamp: { file: '/sounds/document/stamp.mp3', volume: 0.5, duration: 600 },
  },

  // Timer sounds
  timer: {
    tick: { file: '/sounds/timer/tick.mp3', volume: 0.2, duration: 50 },
    warning: { file: '/sounds/timer/warning.mp3', volume: 0.4, duration: 200 },
    urgent: { file: '/sounds/timer/urgent.mp3', volume: 0.5, duration: 150 },
    expired: { file: '/sounds/timer/expired.mp3', volume: 0.6, duration: 500 },
  },

  // Connection sounds
  connection: {
    connected: { file: '/sounds/connection/connected.mp3', volume: 0.4, duration: 300 },
    disconnected: { file: '/sounds/connection/disconnected.mp3', volume: 0.5, duration: 400 },
    reconnecting: { file: '/sounds/connection/reconnecting.mp3', volume: 0.3, duration: 200 },
    playerJoined: { file: '/sounds/connection/player-joined.mp3', volume: 0.35, duration: 250 },
    playerLeft: { file: '/sounds/connection/player-left.mp3', volume: 0.3, duration: 200 },
  },

  // Team/Parish sounds
  team: {
    ready: { file: '/sounds/team/ready.mp3', volume: 0.4, duration: 300 },
    allReady: { file: '/sounds/team/all-ready.mp3', volume: 0.5, duration: 500 },
    vote: { file: '/sounds/team/vote.mp3', volume: 0.35, duration: 150 },
    consensus: { file: '/sounds/team/consensus.mp3', volume: 0.45, duration: 400 },
  },
} as const

// Ambient sound configurations
export const ambientSounds = {
  lobby: { file: '/sounds/ambient/office.mp3', volume: 0.2, loop: true },
  discovery: { file: '/sounds/ambient/reflection.mp3', volume: 0.15, loop: true },
  briefing: { file: '/sounds/ambient/tension-low.mp3', volume: 0.2, loop: true },
  stormWatch: { file: '/sounds/ambient/wind-light.mp3', volume: 0.25, loop: true },
  stormWarning: { file: '/sounds/ambient/wind-medium.mp3', volume: 0.3, loop: true },
  stormCrisis: { file: '/sounds/ambient/storm-heavy.mp3', volume: 0.35, loop: true },
  stormLandfall: { file: '/sounds/ambient/storm-intense.mp3', volume: 0.4, loop: true },
  recovery: { file: '/sounds/ambient/aftermath.mp3', volume: 0.25, loop: true },
  debrief: { file: '/sounds/ambient/contemplation.mp3', volume: 0.15, loop: true },
} as const

// Persona voice configurations
export const voiceSounds = {
  frankReeves: { prefix: '/sounds/voice/frank-', count: 10 },
  mariaSantos: { prefix: '/sounds/voice/maria-', count: 10 },
  rosaMendez: { prefix: '/sounds/voice/rosa-', count: 10 },
  kenjiTanaka: { prefix: '/sounds/voice/kenji-', count: 10 },
  marcusWebb: { prefix: '/sounds/voice/marcus-', count: 10 },
  dianaChen: { prefix: '/sounds/voice/diana-', count: 10 },
} as const

// Type exports
export type SoundCategory = keyof typeof sounds
export type UISoundName = keyof typeof sounds.ui
export type CardSoundName = keyof typeof sounds.cards
export type DramaticSoundName = keyof typeof sounds.dramatic
export type DocumentSoundName = keyof typeof sounds.document
export type TimerSoundName = keyof typeof sounds.timer
export type ConnectionSoundName = keyof typeof sounds.connection
export type TeamSoundName = keyof typeof sounds.team
export type AmbientSoundName = keyof typeof ambientSounds
export type PersonaName = keyof typeof voiceSounds

// =============================================================================
// VISUAL CUE ALTERNATIVES (Accessibility)
// =============================================================================

export interface VisualCue {
  type: 'flash' | 'shake' | 'pulse' | 'glow' | 'border' | 'icon'
  color?: string
  duration?: number
  intensity?: 'subtle' | 'normal' | 'strong'
}

/**
 * Maps sounds to visual alternatives for users who can't hear audio
 */
export const visualAlternatives: Record<string, VisualCue> = {
  // UI sounds
  'ui.click': { type: 'flash', intensity: 'subtle', duration: 50 },
  'ui.error': { type: 'shake', color: 'danger', duration: 300 },
  'ui.success': { type: 'glow', color: 'safe', duration: 300 },
  'ui.notification': { type: 'pulse', color: 'info', duration: 400 },

  // Card sounds
  'cards.essential': { type: 'glow', color: 'safe', intensity: 'normal', duration: 250 },
  'cards.notCore': { type: 'border', color: 'muted', duration: 150 },

  // Dramatic sounds
  'dramatic.breakingNews': { type: 'flash', color: 'danger', intensity: 'strong', duration: 500 },
  'dramatic.criticalAlert': { type: 'pulse', color: 'critical', intensity: 'strong', duration: 1000 },
  'dramatic.consequencePositive': { type: 'glow', color: 'safe', duration: 500 },
  'dramatic.consequenceNegative': { type: 'shake', color: 'danger', duration: 600 },
  'dramatic.gapReveal': { type: 'pulse', color: 'warning', duration: 800 },

  // Timer sounds
  'timer.warning': { type: 'pulse', color: 'warning', duration: 200 },
  'timer.urgent': { type: 'flash', color: 'danger', intensity: 'normal', duration: 150 },
  'timer.expired': { type: 'shake', color: 'danger', intensity: 'strong', duration: 500 },

  // Connection sounds
  'connection.connected': { type: 'glow', color: 'safe', duration: 300 },
  'connection.disconnected': { type: 'border', color: 'danger', duration: 400 },
}

// =============================================================================
// SOUND MANAGER
// =============================================================================

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map()
  private enabled: boolean = true
  private masterVolume: number = 0.7
  private categoryVolumes: Record<string, number> = {
    ui: 0.5,
    cards: 0.5,
    dramatic: 0.7,
    document: 0.5,
    timer: 0.5,
    connection: 0.5,
    team: 0.5,
    ambient: 0.3,
    voice: 0.8,
  }

  constructor() {
    // Check for user preference
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('crucible-sound-enabled')
      const savedMasterVolume = localStorage.getItem('crucible-master-volume')
      const savedCategoryVolumes = localStorage.getItem('crucible-category-volumes')

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true'
      }
      if (savedMasterVolume !== null) {
        this.masterVolume = parseFloat(savedMasterVolume)
      }
      if (savedCategoryVolumes !== null) {
        try {
          this.categoryVolumes = { ...this.categoryVolumes, ...JSON.parse(savedCategoryVolumes) }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('crucible-sound-enabled', String(enabled))
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (typeof window !== 'undefined') {
      localStorage.setItem('crucible-master-volume', String(this.masterVolume))
    }
  }

  getMasterVolume(): number {
    return this.masterVolume
  }

  setCategoryVolume(category: string, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume))
    if (typeof window !== 'undefined') {
      localStorage.setItem('crucible-category-volumes', JSON.stringify(this.categoryVolumes))
    }
  }

  getCategoryVolume(category: string): number {
    return this.categoryVolumes[category] ?? 1
  }

  private getAudio(file: string): HTMLAudioElement {
    let audio = this.audioCache.get(file)
    if (!audio) {
      audio = new Audio(file)
      audio.preload = 'auto'
      this.audioCache.set(file, audio)
    }
    return audio
  }

  play(file: string, baseVolume: number, category: string): void {
    if (!this.enabled || typeof window === 'undefined') return

    try {
      const audio = this.getAudio(file)
      const categoryVolume = this.getCategoryVolume(category)
      audio.volume = baseVolume * categoryVolume * this.masterVolume
      audio.currentTime = 0
      audio.play().catch(() => {
        // Audio play failed - usually due to user not interacting with page yet
        // This is expected behavior, silently ignore
      })
    } catch {
      // Audio not supported or file not found
    }
  }

  preload(files: string[]): void {
    if (typeof window === 'undefined') return
    files.forEach((file) => this.getAudio(file))
  }

  stopAll(): void {
    this.audioCache.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
  }
}

// Singleton instance
let soundManager: SoundManager | null = null

function getSoundManager(): SoundManager {
  if (!soundManager) {
    soundManager = new SoundManager()
  }
  return soundManager
}

// =============================================================================
// HOOKS
// =============================================================================

export interface UseSoundOptions {
  enabled?: boolean
  volume?: number
  onVisualCue?: (cue: VisualCue) => void
}

export interface UseSoundReturn {
  // Play functions by category
  playUI: (sound: UISoundName) => void
  playCard: (sound: CardSoundName) => void
  playDramatic: (sound: DramaticSoundName) => void
  playDocument: (sound: DocumentSoundName) => void
  playTimer: (sound: TimerSoundName) => void
  playConnection: (sound: ConnectionSoundName) => void
  playTeam: (sound: TeamSoundName) => void

  // Generic play function
  play: (category: SoundCategory, sound: string) => void

  // Control functions
  setEnabled: (enabled: boolean) => void
  isEnabled: boolean
  setMasterVolume: (volume: number) => void
  masterVolume: number
  setCategoryVolume: (category: string, volume: number) => void
  getCategoryVolume: (category: string) => number
  stopAll: () => void
  preload: (category?: SoundCategory) => void
}

/**
 * Hook for playing one-shot sounds in CrucibleEngine
 *
 * @example
 * ```tsx
 * const { playUI, playDramatic } = useSound()
 *
 * // In event handlers:
 * onClick={() => playUI('click')}
 * onDecisionConfirm={() => playDramatic('decisionConfirm')}
 * ```
 */
export function useSound(options: UseSoundOptions = {}): UseSoundReturn {
  const { onVisualCue } = options
  const [isEnabled, setIsEnabled] = useState(() => getSoundManager().isEnabled())
  const [masterVolume, setMasterVolumeState] = useState(() => getSoundManager().getMasterVolume())

  // Play a sound from a specific category
  const play = useCallback(
    (category: SoundCategory, soundName: string) => {
      const manager = getSoundManager()
      const categoryConfig = sounds[category] as Record<string, SoundConfig>
      const soundConfig = categoryConfig[soundName]

      if (!soundConfig) {
        console.warn(`Sound not found: ${category}.${soundName}`)
        return
      }

      manager.play(soundConfig.file, soundConfig.volume, category)

      // Trigger visual cue for accessibility
      if (onVisualCue) {
        const cueKey = `${category}.${soundName}`
        const cue = visualAlternatives[cueKey]
        if (cue) {
          onVisualCue(cue)
        }
      }
    },
    [onVisualCue]
  )

  // Category-specific play functions
  const playUI = useCallback((sound: UISoundName) => play('ui', sound), [play])
  const playCard = useCallback((sound: CardSoundName) => play('cards', sound), [play])
  const playDramatic = useCallback((sound: DramaticSoundName) => play('dramatic', sound), [play])
  const playDocument = useCallback((sound: DocumentSoundName) => play('document', sound), [play])
  const playTimer = useCallback((sound: TimerSoundName) => play('timer', sound), [play])
  const playConnection = useCallback((sound: ConnectionSoundName) => play('connection', sound), [play])
  const playTeam = useCallback((sound: TeamSoundName) => play('team', sound), [play])

  // Control functions
  const setEnabled = useCallback((enabled: boolean) => {
    getSoundManager().setEnabled(enabled)
    setIsEnabled(enabled)
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    getSoundManager().setMasterVolume(volume)
    setMasterVolumeState(volume)
  }, [])

  const setCategoryVolume = useCallback((category: string, volume: number) => {
    getSoundManager().setCategoryVolume(category, volume)
  }, [])

  const getCategoryVolume = useCallback((category: string) => {
    return getSoundManager().getCategoryVolume(category)
  }, [])

  const stopAll = useCallback(() => {
    getSoundManager().stopAll()
  }, [])

  const preload = useCallback((category?: SoundCategory) => {
    const manager = getSoundManager()
    if (category) {
      const categoryConfig = sounds[category] as Record<string, SoundConfig>
      const files = Object.values(categoryConfig).map((s) => s.file)
      manager.preload(files)
    } else {
      // Preload all sounds
      const allFiles: string[] = []
      Object.values(sounds).forEach((categoryConfig) => {
        Object.values(categoryConfig as Record<string, SoundConfig>).forEach((s) => {
          allFiles.push(s.file)
        })
      })
      manager.preload(allFiles)
    }
  }, [])

  return {
    playUI,
    playCard,
    playDramatic,
    playDocument,
    playTimer,
    playConnection,
    playTeam,
    play,
    setEnabled,
    isEnabled,
    setMasterVolume,
    masterVolume,
    setCategoryVolume,
    getCategoryVolume,
    stopAll,
    preload,
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for button click sounds
 * Automatically plays click sound on button interactions
 */
export function useButtonSound() {
  const { playUI } = useSound()

  const onClick = useCallback(() => {
    playUI('click')
  }, [playUI])

  const onHover = useCallback(() => {
    playUI('hover')
  }, [playUI])

  return { onClick, onHover }
}

/**
 * Hook for form input sounds
 */
export function useInputSound() {
  const { playUI } = useSound()

  const onFocus = useCallback(() => {
    playUI('focus')
  }, [playUI])

  const onError = useCallback(() => {
    playUI('error')
  }, [playUI])

  const onSuccess = useCallback(() => {
    playUI('success')
  }, [playUI])

  return { onFocus, onError, onSuccess }
}

/**
 * Hook for card sorting sounds
 */
export function useCardSound() {
  const { playCard } = useSound()

  return {
    flip: useCallback(() => playCard('flip'), [playCard]),
    deal: useCallback(() => playCard('deal'), [playCard]),
    essential: useCallback(() => playCard('essential'), [playCard]),
    notCore: useCallback(() => playCard('notCore'), [playCard]),
    pile: useCallback(() => playCard('pile'), [playCard]),
  }
}

export default useSound
