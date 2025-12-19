'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ambientSounds, type AmbientSoundName } from './useSound'

// =============================================================================
// TYPES
// =============================================================================

export interface SoundscapeState {
  currentTrack: AmbientSoundName | null
  isPlaying: boolean
  isFading: boolean
  volume: number
}

export interface UseSoundscapeOptions {
  /** Initial ambient track to play */
  initialTrack?: AmbientSoundName
  /** Whether to auto-start playing */
  autoPlay?: boolean
  /** Default volume (0-1) */
  defaultVolume?: number
  /** Crossfade duration in milliseconds */
  crossfadeDuration?: number
  /** Whether to respect user's reduced motion preference */
  respectReducedMotion?: boolean
}

export interface UseSoundscapeReturn {
  /** Current state of the soundscape */
  state: SoundscapeState
  /** Transition to a new ambient track with crossfade */
  transitionTo: (track: AmbientSoundName, duration?: number) => void
  /** Play the current or specified track */
  play: (track?: AmbientSoundName) => void
  /** Pause the current track */
  pause: () => void
  /** Stop and reset the current track */
  stop: () => void
  /** Set the master volume */
  setVolume: (volume: number) => void
  /** Fade out the current track */
  fadeOut: (duration?: number) => void
  /** Fade in the current track */
  fadeIn: (duration?: number) => void
  /** Check if a track is currently playing */
  isPlaying: boolean
  /** Get the current track name */
  currentTrack: AmbientSoundName | null
}

// =============================================================================
// PHASE TO AMBIENT MAPPING
// =============================================================================

/**
 * Maps game phases to their corresponding ambient tracks
 */
export const phaseAmbientMap: Record<string, AmbientSoundName> = {
  lobby: 'lobby',
  discovery: 'discovery',
  briefing: 'briefing',
  watch: 'stormWatch',
  warning: 'stormWarning',
  approach: 'stormCrisis',
  landfall: 'stormLandfall',
  eye: 'stormLandfall',
  recovery: 'recovery',
  debrief: 'debrief',
}

// =============================================================================
// SOUNDSCAPE MANAGER
// =============================================================================

class SoundscapeManager {
  private currentAudio: HTMLAudioElement | null = null
  private nextAudio: HTMLAudioElement | null = null
  private currentTrack: AmbientSoundName | null = null
  private volume: number = 0.3
  private enabled: boolean = true
  private fadeInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Load user preferences
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('crucible-ambient-enabled')
      const savedVolume = localStorage.getItem('crucible-ambient-volume')

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true'
      }
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume)
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('crucible-ambient-enabled', String(enabled))
    }
    if (!enabled) {
      this.stop()
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (typeof window !== 'undefined') {
      localStorage.setItem('crucible-ambient-volume', String(this.volume))
    }
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume
    }
  }

  getVolume(): number {
    return this.volume
  }

  getCurrentTrack(): AmbientSoundName | null {
    return this.currentTrack
  }

  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused
  }

  private createAudio(track: AmbientSoundName): HTMLAudioElement {
    const config = ambientSounds[track]
    const audio = new Audio(config.file)
    audio.loop = config.loop
    audio.volume = 0 // Start at 0 for fade-in
    audio.preload = 'auto'
    return audio
  }

  play(track: AmbientSoundName): void {
    if (!this.enabled || typeof window === 'undefined') return

    // If same track is already playing, do nothing
    if (this.currentTrack === track && this.isPlaying()) {
      return
    }

    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    // Create and play new audio
    this.currentAudio = this.createAudio(track)
    this.currentTrack = track
    this.currentAudio.volume = this.volume

    this.currentAudio.play().catch(() => {
      // Audio play failed - user hasn't interacted with page yet
    })
  }

  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
    }
  }

  resume(): void {
    if (this.currentAudio && this.enabled) {
      this.currentAudio.play().catch(() => {})
    }
  }

  stop(): void {
    this.clearFadeInterval()
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    if (this.nextAudio) {
      this.nextAudio.pause()
      this.nextAudio = null
    }
    this.currentTrack = null
  }

  private clearFadeInterval(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
  }

  fadeOut(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentAudio || this.currentAudio.paused) {
        resolve()
        return
      }

      this.clearFadeInterval()

      const startVolume = this.currentAudio.volume
      const steps = 20
      const stepDuration = duration / steps
      const volumeStep = startVolume / steps
      let currentStep = 0

      this.fadeInterval = setInterval(() => {
        currentStep++
        if (this.currentAudio) {
          this.currentAudio.volume = Math.max(0, startVolume - volumeStep * currentStep)
        }

        if (currentStep >= steps) {
          this.clearFadeInterval()
          if (this.currentAudio) {
            this.currentAudio.pause()
          }
          resolve()
        }
      }, stepDuration)
    })
  }

  fadeIn(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentAudio || !this.enabled) {
        resolve()
        return
      }

      this.clearFadeInterval()

      // Ensure audio is playing
      this.currentAudio.play().catch(() => {
        resolve()
        return
      })

      const targetVolume = this.volume
      const steps = 20
      const stepDuration = duration / steps
      const volumeStep = targetVolume / steps
      let currentStep = 0

      this.currentAudio.volume = 0

      this.fadeInterval = setInterval(() => {
        currentStep++
        if (this.currentAudio) {
          this.currentAudio.volume = Math.min(targetVolume, volumeStep * currentStep)
        }

        if (currentStep >= steps) {
          this.clearFadeInterval()
          resolve()
        }
      }, stepDuration)
    })
  }

  async crossfade(newTrack: AmbientSoundName, duration: number = 2000): Promise<void> {
    if (!this.enabled || typeof window === 'undefined') return

    // If same track, do nothing
    if (this.currentTrack === newTrack) return

    // Create the new audio
    this.nextAudio = this.createAudio(newTrack)
    this.nextAudio.volume = 0

    // Start playing the new audio
    try {
      await this.nextAudio.play()
    } catch {
      // Can't play - user interaction required
      return
    }

    // Perform crossfade
    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = this.volume / steps
    let currentStep = 0

    this.clearFadeInterval()

    this.fadeInterval = setInterval(() => {
      currentStep++

      // Fade out current
      if (this.currentAudio) {
        this.currentAudio.volume = Math.max(0, this.volume - volumeStep * currentStep)
      }

      // Fade in next
      if (this.nextAudio) {
        this.nextAudio.volume = Math.min(this.volume, volumeStep * currentStep)
      }

      if (currentStep >= steps) {
        this.clearFadeInterval()

        // Clean up old audio
        if (this.currentAudio) {
          this.currentAudio.pause()
          this.currentAudio = null
        }

        // Swap to new audio
        this.currentAudio = this.nextAudio
        this.nextAudio = null
        this.currentTrack = newTrack
      }
    }, stepDuration)
  }
}

// Singleton instance
let soundscapeManager: SoundscapeManager | null = null

function getSoundscapeManager(): SoundscapeManager {
  if (!soundscapeManager) {
    soundscapeManager = new SoundscapeManager()
  }
  return soundscapeManager
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing ambient/background audio in CrucibleEngine
 *
 * Provides smooth crossfading between different ambient tracks based on game phase.
 *
 * @example
 * ```tsx
 * const { transitionTo, setVolume, isPlaying } = useSoundscape({
 *   initialTrack: 'lobby',
 *   autoPlay: true,
 * })
 *
 * // When phase changes:
 * useEffect(() => {
 *   const ambientTrack = phaseAmbientMap[phase]
 *   if (ambientTrack) {
 *     transitionTo(ambientTrack)
 *   }
 * }, [phase, transitionTo])
 * ```
 */
export function useSoundscape(options: UseSoundscapeOptions = {}): UseSoundscapeReturn {
  const {
    initialTrack,
    autoPlay = false,
    defaultVolume = 0.3,
    crossfadeDuration = 2000,
    respectReducedMotion = true,
  } = options

  const [state, setState] = useState<SoundscapeState>(() => ({
    currentTrack: getSoundscapeManager().getCurrentTrack(),
    isPlaying: getSoundscapeManager().isPlaying(),
    isFading: false,
    volume: getSoundscapeManager().getVolume(),
  }))

  const managerRef = useRef<SoundscapeManager>(getSoundscapeManager())

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Update state when manager state changes
  const updateState = useCallback(() => {
    const manager = managerRef.current
    setState({
      currentTrack: manager.getCurrentTrack(),
      isPlaying: manager.isPlaying(),
      isFading: false,
      volume: manager.getVolume(),
    })
  }, [])

  // Initialize with default volume
  useEffect(() => {
    const manager = managerRef.current
    manager.setVolume(defaultVolume)
  }, [defaultVolume])

  // Auto-play initial track
  useEffect(() => {
    if (autoPlay && initialTrack && !prefersReducedMotion) {
      const manager = managerRef.current
      manager.play(initialTrack)
      updateState()
    }
  }, [autoPlay, initialTrack, prefersReducedMotion, updateState])

  // Transition to a new track with crossfade
  const transitionTo = useCallback(
    async (track: AmbientSoundName, duration: number = crossfadeDuration) => {
      const manager = managerRef.current

      // Skip if reduced motion is preferred and respectReducedMotion is true
      if (respectReducedMotion && prefersReducedMotion) {
        // Instant switch instead of crossfade
        manager.stop()
        manager.play(track)
        updateState()
        return
      }

      setState((prev) => ({ ...prev, isFading: true }))
      await manager.crossfade(track, duration)
      updateState()
    },
    [crossfadeDuration, prefersReducedMotion, respectReducedMotion, updateState]
  )

  // Play a track (or resume current)
  const play = useCallback(
    (track?: AmbientSoundName) => {
      const manager = managerRef.current
      if (track) {
        manager.play(track)
      } else {
        manager.resume()
      }
      updateState()
    },
    [updateState]
  )

  // Pause current track
  const pause = useCallback(() => {
    const manager = managerRef.current
    manager.pause()
    updateState()
  }, [updateState])

  // Stop and reset
  const stop = useCallback(() => {
    const manager = managerRef.current
    manager.stop()
    updateState()
  }, [updateState])

  // Set volume
  const setVolume = useCallback(
    (volume: number) => {
      const manager = managerRef.current
      manager.setVolume(volume)
      updateState()
    },
    [updateState]
  )

  // Fade out
  const fadeOut = useCallback(
    async (duration: number = 1000) => {
      const manager = managerRef.current
      setState((prev) => ({ ...prev, isFading: true }))
      await manager.fadeOut(duration)
      updateState()
    },
    [updateState]
  )

  // Fade in
  const fadeIn = useCallback(
    async (duration: number = 1000) => {
      const manager = managerRef.current
      setState((prev) => ({ ...prev, isFading: true }))
      await manager.fadeIn(duration)
      updateState()
    },
    [updateState]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't stop on unmount - allow ambient to persist across navigation
      // Manager is a singleton and will be reused
    }
  }, [])

  return {
    state,
    transitionTo,
    play,
    pause,
    stop,
    setVolume,
    fadeOut,
    fadeIn,
    isPlaying: state.isPlaying,
    currentTrack: state.currentTrack,
  }
}

// =============================================================================
// PHASE-AWARE HOOK
// =============================================================================

/**
 * Hook that automatically manages ambient audio based on game phase
 *
 * @example
 * ```tsx
 * // In your main game component:
 * usePhaseAmbient(gamePhase)
 * ```
 */
export function usePhaseAmbient(phase: string | null): UseSoundscapeReturn {
  const soundscape = useSoundscape({
    autoPlay: false,
    crossfadeDuration: 2000,
  })

  useEffect(() => {
    if (!phase) return

    const ambientTrack = phaseAmbientMap[phase]
    if (ambientTrack) {
      soundscape.transitionTo(ambientTrack)
    }
  }, [phase, soundscape])

  return soundscape
}

export default useSoundscape
