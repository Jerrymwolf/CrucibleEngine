'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  CloudLightning,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface ParticipantFormProps {
  /** Called when form is submitted successfully */
  onSubmit: (data: { code: string; name: string; email?: string }) => void
  /** Called when back button is clicked */
  onBack: () => void
  /** Optional function to validate session code against server */
  validateCode?: (code: string) => Promise<{
    valid: boolean
    sessionInfo?: { name?: string; participantCount?: number }
  }>
  /** Additional class names */
  className?: string
}

type CodeValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

// =============================================================================
// CODE INPUT COMPONENT
// =============================================================================

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  validationState: CodeValidationState
  disabled?: boolean
}

function CodeInput({ value, onChange, validationState, disabled }: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.padEnd(6, '').split('')

  const handleChange = (index: number, char: string) => {
    // Only allow alphanumeric
    const sanitized = char.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!sanitized && char !== '') return

    const newChars = [...chars]
    newChars[index] = sanitized
    const newValue = newChars.join('').slice(0, 6)
    onChange(newValue)

    // Auto-advance to next input
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
    onChange(pastedText)

    // Focus the input after the pasted content
    const nextIndex = Math.min(pastedText.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={chars[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-2xl font-mono font-bold',
            'bg-muted border-2 rounded-lg',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Validation states
            validationState === 'idle' && 'border-border',
            validationState === 'validating' && 'border-primary/50',
            validationState === 'valid' && 'border-green-500 bg-green-500/10',
            validationState === 'invalid' && 'border-destructive bg-destructive/10 animate-shake'
          )}
          aria-label={`Session code character ${index + 1}`}
        />
      ))}
    </div>
  )
}

// =============================================================================
// PARTICIPANT FORM COMPONENT
// =============================================================================

/**
 * Participant join form with session code validation
 *
 * Features:
 * - 6-character code input with auto-advance
 * - Real-time code validation (debounced)
 * - Session info preview when valid
 * - Email field for debrief report (optional)
 * - Animated validation states
 *
 * @example
 * ```tsx
 * <ParticipantForm
 *   onSubmit={({ code, name, email }) => {
 *     router.push(`/session/${code}?name=${name}`)
 *   }}
 *   onBack={() => setView('role-select')}
 *   validateCode={async (code) => {
 *     const response = await fetch(`/api/session/${code}/validate`)
 *     return response.json()
 *   }}
 * />
 * ```
 */
export function ParticipantForm({
  onSubmit,
  onBack,
  validateCode,
  className,
}: ParticipantFormProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [validationState, setValidationState] = useState<CodeValidationState>('idle')
  const [sessionInfo, setSessionInfo] = useState<{
    name?: string
    participantCount?: number
  } | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Validate code when it changes (debounced)
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode)
      setError('')
      setSessionInfo(null)

      // Clear previous timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }

      if (newCode.length < 6) {
        setValidationState('idle')
        return
      }

      // Debounce validation
      setValidationState('validating')
      validationTimeoutRef.current = setTimeout(async () => {
        if (validateCode) {
          try {
            const result = await validateCode(newCode)
            if (result.valid) {
              setValidationState('valid')
              setSessionInfo(result.sessionInfo || null)
            } else {
              setValidationState('invalid')
              setError('Session not found or has ended')
            }
          } catch {
            setValidationState('invalid')
            setError('Unable to validate session code')
          }
        } else {
          // No validation function provided, assume valid
          setValidationState('valid')
        }
      }, 500)
    },
    [validateCode]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (code.length !== 6) {
      setError('Please enter a valid 6-character session code')
      return
    }

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (validationState !== 'valid' && validateCode) {
      setError('Please wait for code validation')
      return
    }

    setIsSubmitting(true)

    try {
      onSubmit({
        code: code.toUpperCase(),
        name: name.trim(),
        email: email.trim() || undefined,
      })
    } catch {
      setError('Failed to join session. Please try again.')
      setIsSubmitting(false)
    }
  }

  const isValid = code.length === 6 && name.trim() && validationState === 'valid'

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Join Session
        </h2>
        <p className="text-muted-foreground">
          Enter your session code to join your team
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Code */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Label className="text-center block">Session Code</Label>
          <CodeInput
            value={code}
            onChange={handleCodeChange}
            validationState={validationState}
            disabled={isSubmitting}
          />

          {/* Validation indicator */}
          <div className="h-6 flex items-center justify-center">
            {validationState === 'validating' && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking code...
              </span>
            )}
            {validationState === 'valid' && (
              <span className="flex items-center gap-2 text-sm text-green-500 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {sessionInfo?.name || 'Session found'}
                {sessionInfo?.participantCount !== undefined && (
                  <span className="text-muted-foreground">
                    ({sessionInfo.participantCount} joined)
                  </span>
                )}
              </span>
            )}
            {validationState === 'invalid' && (
              <span className="flex items-center gap-2 text-sm text-destructive animate-fade-in">
                <XCircle className="w-4 h-4" />
                {error || 'Invalid code'}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <Label htmlFor="participant-name">Your Name</Label>
          <Input
            id="participant-name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            disabled={isSubmitting}
            className="input-interactive"
          />
        </div>

        {/* Email (optional) */}
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Label htmlFor="participant-email">
            Email{' '}
            <span className="text-muted-foreground font-normal">
              (optional - for debrief report)
            </span>
          </Label>
          <Input
            id="participant-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="input-interactive"
          />
        </div>

        {/* Error display */}
        {error && validationState !== 'invalid' && (
          <div className="flex items-center gap-2 text-destructive text-sm animate-fade-in">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <Button
            type="submit"
            className={cn(
              'w-full btn-interactive btn-primary-glow',
              'flex items-center justify-center gap-2'
            )}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <CloudLightning className="w-4 h-4" />
                Enter the Storm
              </>
            )}
          </Button>
        </div>

        {/* Back button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
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
    </div>
  )
}

export default ParticipantForm
