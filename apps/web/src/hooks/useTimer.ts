/**
 * useTimer Hook
 *
 * Provides countdown timer functionality for timed activities in the pre-crisis phase.
 * Features:
 * - Countdown and count-up modes
 * - Pause/resume
 * - Callbacks for completion and warnings
 * - Progress calculation
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type TimerMode = 'countdown' | 'countup';

export interface UseTimerOptions {
  /** Timer mode: countdown from duration or countup from 0 */
  mode?: TimerMode;
  /** Initial duration in seconds (for countdown) or max duration (for countup) */
  duration: number;
  /** Auto-start the timer */
  autoStart?: boolean;
  /** Callback when timer completes */
  onComplete?: () => void;
  /** Warning threshold in seconds (triggers onWarning) */
  warningThreshold?: number;
  /** Callback when warning threshold is reached */
  onWarning?: () => void;
  /** Tick interval in ms (default 100 for smooth progress) */
  tickInterval?: number;
}

export interface UseTimerReturn {
  /** Current time in seconds */
  time: number;
  /** Time in milliseconds for precise display */
  timeMs: number;
  /** Formatted time string (mm:ss or hh:mm:ss) */
  formatted: string;
  /** Whether timer is running */
  isRunning: boolean;
  /** Whether timer has completed */
  isComplete: boolean;
  /** Whether warning threshold has been reached */
  isWarning: boolean;
  /** Progress from 0 to 1 */
  progress: number;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Reset the timer */
  reset: (newDuration?: number) => void;
  /** Toggle pause/resume */
  toggle: () => void;
  /** Set time directly (for recovery) */
  setTime: (seconds: number) => void;
  /** Get elapsed time in ms */
  getElapsedMs: () => number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTimer(options: UseTimerOptions): UseTimerReturn {
  const {
    mode = 'countdown',
    duration,
    autoStart = false,
    onComplete,
    warningThreshold,
    onWarning,
    tickInterval = 100,
  } = options;

  // State
  const [timeMs, setTimeMs] = useState(mode === 'countdown' ? duration * 1000 : 0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  // Refs for callbacks (to avoid stale closures)
  const onCompleteRef = useRef(onComplete);
  const onWarningRef = useRef(onWarning);
  const warningFiredRef = useRef(false);

  // Update refs
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onWarningRef.current = onWarning;
  }, [onComplete, onWarning]);

  // Timer logic
  useEffect(() => {
    if (!isRunning || isComplete) return;

    const intervalId = setInterval(() => {
      setTimeMs((prev) => {
        const newTime = mode === 'countdown' ? prev - tickInterval : prev + tickInterval;

        // Check for completion (countdown reaches 0 or countup reaches duration)
        if (mode === 'countdown' && newTime <= 0) {
          setIsRunning(false);
          setIsComplete(true);
          onCompleteRef.current?.();
          return 0;
        }

        if (mode === 'countup' && newTime >= duration * 1000) {
          setIsRunning(false);
          setIsComplete(true);
          onCompleteRef.current?.();
          return duration * 1000;
        }

        // Check for warning threshold (countdown only)
        if (
          mode === 'countdown' &&
          warningThreshold &&
          !warningFiredRef.current &&
          newTime <= warningThreshold * 1000
        ) {
          setIsWarning(true);
          warningFiredRef.current = true;
          onWarningRef.current?.();
        }

        return newTime;
      });
    }, tickInterval);

    return () => clearInterval(intervalId);
  }, [isRunning, isComplete, mode, duration, warningThreshold, tickInterval]);

  // Time in seconds
  const time = Math.floor(timeMs / 1000);

  // Progress (0 to 1)
  const progress = mode === 'countdown'
    ? 1 - timeMs / (duration * 1000)
    : timeMs / (duration * 1000);

  // Formatted time
  const formatted = formatTime(time);

  // Actions
  const start = useCallback(() => {
    if (!isComplete) {
      setIsRunning(true);
    }
  }, [isComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isComplete) {
      setIsRunning(true);
    }
  }, [isComplete]);

  const reset = useCallback((newDuration?: number) => {
    const dur = newDuration ?? duration;
    setTimeMs(mode === 'countdown' ? dur * 1000 : 0);
    setIsRunning(false);
    setIsComplete(false);
    setIsWarning(false);
    warningFiredRef.current = false;
  }, [duration, mode]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      resume();
    }
  }, [isRunning, pause, resume]);

  const setTimeManually = useCallback((seconds: number) => {
    setTimeMs(seconds * 1000);
  }, []);

  const getElapsedMs = useCallback(() => {
    return mode === 'countdown' ? (duration * 1000) - timeMs : timeMs;
  }, [mode, duration, timeMs]);

  return {
    time,
    timeMs,
    formatted,
    isRunning,
    isComplete,
    isWarning,
    progress,
    start,
    pause,
    resume,
    reset,
    toggle,
    setTime: setTimeManually,
    getElapsedMs,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format seconds as mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds as mm:ss.ms
 */
export function formatTimePrecise(ms: number): string {
  const absMs = Math.abs(ms);
  const m = Math.floor(absMs / 60000);
  const s = Math.floor((absMs % 60000) / 1000);
  const tenths = Math.floor((absMs % 1000) / 100);

  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

// ============================================================================
// PRESET TIMERS
// ============================================================================

/**
 * Quick Sort round timers
 */
export const QUICK_SORT_TIMERS = {
  round1: 180, // 3 minutes
  round2: 240, // 4 minutes
  round3: 180, // 3 minutes
} as const;

/**
 * Values Meaning timer
 */
export const VALUES_MEANING_TIMER = 900; // 15 minutes total

/**
 * Values Story timers
 */
export const VALUES_STORY_TIMERS = {
  individualReflection: 600, // 10 minutes
  triadShare: 150, // 2.5 minutes per person
  pairShare: 300, // 5 minutes
} as const;

/**
 * Team Alignment timers
 */
export const TEAM_ALIGNMENT_TIMERS = {
  gallery: 300, // 5 minutes
  definitions: 900, // 15 minutes
  commitment: 480, // 8 minutes
} as const;

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * useCountdown - Simplified countdown hook
 */
export function useCountdown(
  seconds: number,
  options?: Omit<UseTimerOptions, 'mode' | 'duration'>
): UseTimerReturn {
  return useTimer({
    ...options,
    mode: 'countdown',
    duration: seconds,
  });
}

/**
 * useStopwatch - Simplified count-up hook
 */
export function useStopwatch(
  maxSeconds?: number,
  options?: Omit<UseTimerOptions, 'mode' | 'duration'>
): UseTimerReturn {
  return useTimer({
    ...options,
    mode: 'countup',
    duration: maxSeconds ?? 99999,
  });
}
