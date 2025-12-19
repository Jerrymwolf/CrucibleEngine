'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Users,
  Clock,
  Zap,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface FacilitatorFormProps {
  /** Called when form is submitted successfully */
  onSubmit: (data: {
    name: string
    company?: string
    email?: string
    teamSize?: string
  }) => void
  /** Called when back button is clicked */
  onBack: () => void
  /** Additional class names */
  className?: string
}

// =============================================================================
// INFO CARD COMPONENT
// =============================================================================

interface InfoCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function InfoCard({ icon, title, description }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// =============================================================================
// FACILITATOR FORM COMPONENT
// =============================================================================

/**
 * Facilitator (Crucible Master) setup form
 *
 * Features:
 * - Name and company input
 * - Team size selection
 * - Email for session reports
 * - Information cards about CM role
 *
 * @example
 * ```tsx
 * <FacilitatorForm
 *   onSubmit={({ name, company, email, teamSize }) => {
 *     router.push(`/cm/new?name=${name}&company=${company}`)
 *   }}
 *   onBack={() => setView('role-select')}
 * />
 * ```
 */
export function FacilitatorForm({
  onSubmit,
  onBack,
  className,
}: FacilitatorFormProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [teamSize, setTeamSize] = useState<string>('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setIsSubmitting(true)

    try {
      onSubmit({
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        teamSize: teamSize || undefined,
      })
    } catch {
      setError('Failed to create session. Please try again.')
      setIsSubmitting(false)
    }
  }

  const isValid = name.trim().length > 0

  return (
    <div className={cn('w-full max-w-lg mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Create Session
        </h2>
        <p className="text-muted-foreground">
          Set up your Crucible Master console
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div
            className="space-y-2 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <Label htmlFor="cm-name">Your Name</Label>
            <Input
              id="cm-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              disabled={isSubmitting}
              className="input-interactive"
              autoFocus
            />
          </div>

          {/* Company */}
          <div
            className="space-y-2 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <Label htmlFor="cm-company">
              Company/Organization{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="cm-company"
              placeholder="Enter company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={isSubmitting}
              className="input-interactive"
            />
          </div>

          {/* Email */}
          <div
            className="space-y-2 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <Label htmlFor="cm-email">
              Email{' '}
              <span className="text-muted-foreground font-normal">
                (for session reports)
              </span>
            </Label>
            <Input
              id="cm-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="input-interactive"
            />
          </div>

          {/* Team Size */}
          <div
            className="space-y-2 animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <Label htmlFor="cm-team-size">
              Expected Team Size{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <select
              id="cm-team-size"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              disabled={isSubmitting}
              className={cn(
                'w-full h-10 px-3 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                'input-interactive'
              )}
            >
              <option value="">Select size...</option>
              <option value="3-5">3-5 people (1 team)</option>
              <option value="6-12">6-12 people (2 teams)</option>
              <option value="13-18">13-18 people (3 teams)</option>
              <option value="19-24">19-24 people (4 teams)</option>
              <option value="25-30">25-30 people (5-6 teams)</option>
            </select>
          </div>

          {/* Error display */}
          {error && (
            <div className="text-destructive text-sm animate-fade-in">{error}</div>
          )}

          {/* Submit button */}
          <div
            className="pt-2 animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <Button
              type="submit"
              className={cn(
                'w-full btn-interactive',
                'bg-purple-600 hover:bg-purple-700',
                'flex items-center justify-center gap-2'
              )}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Session
                </>
              )}
            </Button>
          </div>

          {/* Back button */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '600ms' }}
          >
            <button
              type="button"
              onClick={onBack}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'text-sm text-muted-foreground hover:text-foreground',
                'transition-colors py-2'
              )}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to role selection
            </button>
          </div>
        </form>

        {/* Info section */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            As Crucible Master, you will:
          </h3>

          <InfoCard
            icon={<Users className="w-4 h-4" />}
            title="Guide Your Teams"
            description="Facilitate discussions and help teams reflect on their decisions"
          />

          <InfoCard
            icon={<Clock className="w-4 h-4" />}
            title="Control the Pace"
            description="Manage simulation timing and trigger phase transitions"
          />

          <InfoCard
            icon={<Zap className="w-4 h-4" />}
            title="Shape the Narrative"
            description="Introduce dilemmas and customize the storm's intensity"
          />

          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-300">
              <strong>Tip:</strong> Session typically takes 60-90 minutes.
              Plan for a brief introduction and debrief discussion.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FacilitatorForm
