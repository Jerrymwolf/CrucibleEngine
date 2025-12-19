'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import {
  AnimatedIsland,
  RoleSelection,
  ParticipantForm,
  FacilitatorForm,
  TutorialOverlay,
  presetTutorials,
  type UserRole,
} from '@/components/onboarding'
import { SkipLink } from '@/components/ui/SkipLink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpCircle, ArrowRight, Sparkles } from 'lucide-react'
import { AuthHeader } from '@/components/ui/AuthHeader'

// =============================================================================
// TYPES
// =============================================================================

type OnboardingView = 'landing' | 'role-select' | 'participant-form' | 'facilitator-form'

// =============================================================================
// QUICK JOIN COMPONENT
// =============================================================================

interface QuickJoinProps {
  onJoin: (code: string) => void
}

function QuickJoin({ onJoin }: QuickJoinProps) {
  const [code, setCode] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 6) {
      onJoin(code.toUpperCase())
    }
  }

  return (
    <div className="text-center">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Already have a code? Enter here
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex items-center justify-center gap-2 animate-fade-in"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD12"
            maxLength={6}
            className="w-28 text-center font-mono tracking-wider"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            disabled={code.length !== 6}
            className="flex items-center gap-1"
          >
            Go
            <ArrowRight className="w-3 h-3" />
          </Button>
        </form>
      )}
    </div>
  )
}

// =============================================================================
// LANDING HERO COMPONENT
// =============================================================================

interface LandingHeroProps {
  onGetStarted: () => void
  onQuickJoin: (code: string) => void
}

function LandingHero({ onGetStarted, onQuickJoin }: LandingHeroProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Atmospheric effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-8">
        {/* Logo */}
        <div
          className={cn(
            'flex justify-center transition-all duration-1000',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          )}
        >
          <Logo variant="full" size="xl" linkToHome={false} priority />
        </div>

        {/* Animated Island */}
        <div
          className={cn(
            'transition-all duration-1000 delay-300',
            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          <AnimatedIsland
            className="shadow-2xl shadow-blue-500/10"
            stormIntensity={0.4}
            animate={mounted}
          />
        </div>

        {/* Tagline */}
        <div
          className={cn(
            'text-center transition-all duration-1000 delay-500',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <h1 className="text-2xl md:text-3xl font-light text-foreground/90 mb-2 italic">
            &ldquo;When the storm hits, what will you stand for?&rdquo;
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            An AI-powered crisis simulation that reveals the gap between your stated values
            and your actions under pressure.
          </p>
        </div>

        {/* CTA Buttons */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-center gap-4',
            'transition-all duration-1000 delay-700',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <Button
            size="lg"
            onClick={onGetStarted}
            className={cn(
              'min-w-[200px] h-14 text-lg',
              'bg-primary hover:bg-primary/90',
              'btn-interactive btn-primary-glow',
              'flex items-center gap-2'
            )}
          >
            <Sparkles className="w-5 h-5" />
            Get Started
          </Button>
        </div>

        {/* Quick Join */}
        <div
          className={cn(
            'transition-all duration-1000 delay-900',
            mounted ? 'opacity-100' : 'opacity-0'
          )}
        >
          <QuickJoin onJoin={onQuickJoin} />
        </div>
      </div>

      {/* Auth header - top right */}
      <div
        className={cn(
          'absolute top-6 right-6 z-20',
          'transition-all duration-1000 delay-1000',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        <AuthHeader />
      </div>

      {/* Help link */}
      <div
        className={cn(
          'absolute bottom-8 right-8',
          'transition-all duration-1000 delay-1000',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Learn more about The Values Crucible"
        >
          <HelpCircle className="w-4 h-4" />
          What is this?
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function HomePage() {
  const router = useRouter()
  const [view, setView] = useState<OnboardingView>('landing')
  const [showTutorial, setShowTutorial] = useState(false)
  const [, setQuickJoinCode] = useState<string | null>(null)

  // Check if user has seen the tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('crucible-landing-tutorial')
    if (!hasSeenTutorial) {
      // Delay tutorial start for dramatic effect
      const timer = setTimeout(() => {
        setShowTutorial(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleGetStarted = useCallback(() => {
    setView('role-select')
  }, [])

  const handleQuickJoin = useCallback((code: string) => {
    setQuickJoinCode(code)
    setView('participant-form')
  }, [])

  const handleRoleSelect = useCallback((role: UserRole) => {
    if (role === 'participant') {
      setView('participant-form')
    } else {
      setView('facilitator-form')
    }
  }, [])

  const handleBack = useCallback(() => {
    if (view === 'participant-form' || view === 'facilitator-form') {
      setView('role-select')
      setQuickJoinCode(null)
    } else if (view === 'role-select') {
      setView('landing')
    }
  }, [view])

  const handleParticipantSubmit = useCallback(
    (data: { code: string; name: string; email?: string }) => {
      const params = new URLSearchParams({
        name: data.name,
        ...(data.email && { email: data.email }),
      })
      router.push(`/session/${data.code}?${params.toString()}`)
    },
    [router]
  )

  const handleFacilitatorSubmit = useCallback(
    (data: { name: string; company?: string; email?: string; teamSize?: string }) => {
      const params = new URLSearchParams({
        name: data.name,
        ...(data.company && { company: data.company }),
        ...(data.email && { email: data.email }),
        ...(data.teamSize && { teamSize: data.teamSize }),
      })
      router.push(`/cm/new?${params.toString()}`)
    },
    [router]
  )

  // Render based on current view
  const renderView = () => {
    switch (view) {
      case 'landing':
        return (
          <LandingHero
            onGetStarted={handleGetStarted}
            onQuickJoin={handleQuickJoin}
          />
        )

      case 'role-select':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full">
              <RoleSelection onSelect={handleRoleSelect} />
              <div className="text-center mt-8">
                <button
                  onClick={handleBack}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to home
                </button>
              </div>
            </div>
          </div>
        )

      case 'participant-form':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <ParticipantForm
              onSubmit={handleParticipantSubmit}
              onBack={handleBack}
              // TODO: Add actual validation once API is ready
              validateCode={async (code) => {
                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 500))
                // For now, accept any 6-character code
                return {
                  valid: code.length === 6,
                  sessionInfo: code.length === 6
                    ? { name: 'Demo Session', participantCount: 4 }
                    : undefined,
                }
              }}
            />
          </div>
        )

      case 'facilitator-form':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <FacilitatorForm
              onSubmit={handleFacilitatorSubmit}
              onBack={handleBack}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* Skip link for accessibility */}
      <SkipLink targetId="main-content" />

      {/* Main content */}
      <main id="main-content" className="bg-background text-foreground">
        {renderView()}
      </main>

      {/* Tutorial overlay */}
      <TutorialOverlay
        steps={presetTutorials.landing}
        isOpen={showTutorial && view === 'landing'}
        onClose={() => setShowTutorial(false)}
        storageKey="crucible-landing-tutorial"
        allowSkip
      />
    </>
  )
}
