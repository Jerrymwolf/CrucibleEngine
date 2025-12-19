'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface TutorialStep {
  /** Unique identifier for the step */
  id: string
  /** Title of the tutorial step */
  title: string
  /** Description/content of the step */
  description: string
  /** Optional element selector to highlight */
  targetSelector?: string
  /** Position of tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Optional image or illustration */
  image?: string
  /** Whether this step is skippable */
  skippable?: boolean
  /** Custom action button text */
  actionText?: string
  /** Callback when this step is completed */
  onComplete?: () => void
}

interface TutorialOverlayProps {
  /** Tutorial steps to display */
  steps: TutorialStep[]
  /** Whether the tutorial is active */
  isOpen: boolean
  /** Called when tutorial is completed or dismissed */
  onClose: () => void
  /** Called with each step completion */
  onStepComplete?: (stepId: string, stepIndex: number) => void
  /** Starting step index */
  startAt?: number
  /** Whether to allow skipping the entire tutorial */
  allowSkip?: boolean
  /** Storage key for remembering completion */
  storageKey?: string
}

// =============================================================================
// SPOTLIGHT COMPONENT
// =============================================================================

interface SpotlightProps {
  targetRect: DOMRect | null
  padding?: number
}

function Spotlight({ targetRect, padding = 8 }: SpotlightProps) {
  if (!targetRect) return null

  const spotlightStyle = {
    left: targetRect.left - padding,
    top: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  }

  return (
    <>
      {/* Semi-transparent overlay with cutout */}
      <div
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          background: `radial-gradient(
            ellipse ${spotlightStyle.width + 100}px ${spotlightStyle.height + 100}px
            at ${spotlightStyle.left + spotlightStyle.width / 2}px ${spotlightStyle.top + spotlightStyle.height / 2}px,
            transparent 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.8) 100%
          )`,
        }}
      />

      {/* Spotlight border glow */}
      <div
        className="fixed z-40 pointer-events-none rounded-lg"
        style={{
          ...spotlightStyle,
          boxShadow: '0 0 0 4px hsl(199, 89%, 48%), 0 0 20px 4px hsla(199, 89%, 48%, 0.3)',
        }}
      />
    </>
  )
}

// =============================================================================
// TOOLTIP COMPONENT
// =============================================================================

interface TooltipProps {
  step: TutorialStep
  targetRect: DOMRect | null
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  allowSkip: boolean
  isLastStep: boolean
}

function Tooltip({
  step,
  targetRect,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  allowSkip,
  isLastStep,
}: TooltipProps) {
  const position = step.position || 'bottom'

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || position === 'center') {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const tooltipWidth = 320
    const tooltipHeight = 200
    const gap = 16

    switch (position) {
      case 'top':
        return {
          left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2)),
          top: Math.max(16, targetRect.top - tooltipHeight - gap),
        }
      case 'bottom':
        return {
          left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2)),
          top: Math.min(window.innerHeight - tooltipHeight - 16, targetRect.bottom + gap),
        }
      case 'left':
        return {
          left: Math.max(16, targetRect.left - tooltipWidth - gap),
          top: Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)),
        }
      case 'right':
        return {
          left: Math.min(window.innerWidth - tooltipWidth - 16, targetRect.right + gap),
          top: Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)),
        }
      default:
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }

  return (
    <div
      className={cn(
        'fixed z-50 w-80 p-6 rounded-xl',
        'bg-card border border-border shadow-xl',
        'animate-scale-in'
      )}
      style={getTooltipStyle()}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {/* Close button */}
      {allowSkip && (
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Image (if provided) */}
      {step.image && (
        <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-video">
          <img
            src={step.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        <h3
          id="tutorial-title"
          className="text-lg font-semibold text-foreground"
        >
          {step.title}
        </h3>
        <p
          id="tutorial-description"
          className="text-sm text-muted-foreground leading-relaxed"
        >
          {step.description}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 my-4">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              index === currentStep
                ? 'bg-primary w-4'
                : index < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <span className="text-xs text-muted-foreground">
          {currentStep + 1} of {totalSteps}
        </span>

        <Button
          size="sm"
          onClick={onNext}
          className="flex items-center gap-1"
        >
          {isLastStep ? (
            <>
              <Check className="w-4 h-4" />
              {step.actionText || 'Done'}
            </>
          ) : (
            <>
              {step.actionText || 'Next'}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// TUTORIAL OVERLAY COMPONENT
// =============================================================================

/**
 * Interactive tutorial overlay system for onboarding users
 *
 * Features:
 * - Step-by-step guided tour
 * - Element highlighting with spotlight effect
 * - Flexible tooltip positioning
 * - Progress indicators
 * - Skip functionality
 * - Local storage persistence
 *
 * @example
 * ```tsx
 * const tutorialSteps: TutorialStep[] = [
 *   {
 *     id: 'welcome',
 *     title: 'Welcome to The Values Crucible',
 *     description: 'This simulation will challenge your values under pressure.',
 *     position: 'center',
 *   },
 *   {
 *     id: 'code-input',
 *     title: 'Enter Your Code',
 *     description: 'Enter the 6-character session code provided by your facilitator.',
 *     targetSelector: '#session-code-input',
 *     position: 'bottom',
 *   },
 * ]
 *
 * <TutorialOverlay
 *   steps={tutorialSteps}
 *   isOpen={showTutorial}
 *   onClose={() => setShowTutorial(false)}
 *   storageKey="crucible-tutorial-completed"
 * />
 * ```
 */
export function TutorialOverlay({
  steps,
  isOpen,
  onClose,
  onStepComplete,
  startAt = 0,
  allowSkip = true,
  storageKey,
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(startAt)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const step = steps[currentStep]

  // Update target element rect
  useEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setTargetRect(null)
      return
    }

    const updateRect = () => {
      const element = document.querySelector(step.targetSelector!)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    updateRect()

    // Update on resize/scroll
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [isOpen, step?.targetSelector, currentStep])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowSkip) {
        handleSkip()
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext()
      }
      if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep, allowSkip])

  const handleNext = useCallback(() => {
    if (step?.onComplete) {
      step.onComplete()
    }
    onStepComplete?.(step.id, currentStep)

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Tutorial complete
      if (storageKey) {
        localStorage.setItem(storageKey, 'true')
      }
      onClose()
    }
  }, [currentStep, step, steps.length, onStepComplete, storageKey, onClose])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
    onClose()
  }, [storageKey, onClose])

  if (!isOpen || !step) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={allowSkip ? handleSkip : undefined}
      />

      {/* Spotlight on target element */}
      {step.targetSelector && <Spotlight targetRect={targetRect} />}

      {/* Tutorial tooltip */}
      <Tooltip
        step={step}
        targetRect={targetRect}
        currentStep={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        allowSkip={allowSkip}
        isLastStep={currentStep === steps.length - 1}
      />
    </>
  )
}

// =============================================================================
// PRESET TUTORIALS
// =============================================================================

/**
 * Pre-defined tutorial steps for common flows
 */
export const presetTutorials = {
  landing: [
    {
      id: 'welcome',
      title: 'Welcome to The Values Crucible',
      description:
        'An AI-powered simulation that reveals the gap between your stated values and actions under pressure. In the next 60-90 minutes, you will face a Category 4 hurricane and make decisions that test what you truly stand for.',
      position: 'center' as const,
    },
    {
      id: 'roles',
      title: 'Choose Your Role',
      description:
        'Participants join teams to face dilemmas together. Crucible Masters facilitate the simulation and guide reflection.',
      position: 'center' as const,
    },
  ],

  lobby: [
    {
      id: 'parish-select',
      title: 'Join a Parish',
      description:
        'Select a parish to join. Each parish represents a different community on Concordia Island with unique challenges and resources.',
      targetSelector: '.parish-grid',
      position: 'top' as const,
    },
    {
      id: 'team-roster',
      title: 'Your Team',
      description:
        'Once you select a parish, you will see your teammates here. Coordinate with them throughout the simulation.',
      targetSelector: '.team-roster',
      position: 'left' as const,
    },
    {
      id: 'ready-up',
      title: 'Ready Up',
      description:
        'Click the Ready button when you are prepared to begin. The simulation starts when all teams are ready.',
      targetSelector: '.ready-button',
      position: 'top' as const,
    },
  ],

  discovery: [
    {
      id: 'values-intro',
      title: 'Discover Your Values',
      description:
        'Before the storm, you will explore and articulate your team\'s core values. This creates a benchmark to compare against your actions during the crisis.',
      position: 'center' as const,
    },
    {
      id: 'quick-sort',
      title: 'Quick Sort',
      description:
        'Sort value cards into Essential or Not Core piles. Trust your instincts - there are no wrong answers.',
      position: 'center' as const,
      actionText: 'Start Sorting',
    },
  ],

  crisis: [
    {
      id: 'command-center',
      title: 'Command Center',
      description:
        'This is your crisis command center. Monitor the map, track resources, and make critical decisions as Hurricane Midas approaches.',
      position: 'center' as const,
    },
    {
      id: 'dilemmas',
      title: 'Face Dilemmas',
      description:
        'Characters from your parish will present you with difficult choices. Each decision has consequences that ripple through the community.',
      targetSelector: '.decision-panel',
      position: 'left' as const,
    },
    {
      id: 'resources',
      title: 'Manage Resources',
      description:
        'Track your parish resources here. Decisions affect these meters, and running low has serious consequences.',
      targetSelector: '.resources-panel',
      position: 'left' as const,
    },
  ],
}

export default TutorialOverlay
