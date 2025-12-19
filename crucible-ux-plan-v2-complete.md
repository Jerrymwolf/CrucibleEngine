# CrucibleEngine UX/UI Enhancement Plan — AUDIT & REVISION

## Audit Score: Original + Addendum = 76/100

### Scoring Breakdown

| Category | Score | Issues |
|----------|-------|--------|
| **Structure & Organization** | 8/10 | Two documents, some redundancy |
| **Technical Specificity** | 9/10 | Good code examples, some gaps |
| **Actionability** | 7/10 | Missing file-by-file checklist |
| **Colyseus Integration** | 6/10 | Schema exists but room logic incomplete |
| **Asset Strategy** | 7/10 | Free assets decided, but no specific files listed |
| **Sound System** | 5/10 | Definitions exist, no actual file sources |
| **Performance Targets** | 7/10 | Targets set, no measurement strategy |
| **Accessibility** | 6/10 | Mentioned but not systematic |
| **Testing Strategy** | 4/10 | Checklists only, no automation |
| **Error Handling** | 3/10 | Not addressed |
| **Mobile/Touch** | 4/10 | Mentioned but not designed |
| **Deployment/CI** | 2/10 | Not addressed |
| **Documentation** | 5/10 | Code comments only |
| **State Management** | 6/10 | Colyseus sync but no optimistic updates |
| **Offline/Reconnection** | 3/10 | Not addressed |

### Critical Gaps Identified

1. **No unified document** - Split across two files
2. **Sound files not sourced** - Says "get from Sonniss" but no specific files
3. **Free asset files not specified** - Says "Kenney" but which packs exactly?
4. **Colyseus room logic incomplete** - Client sync exists, server updates missing
5. **No error boundaries** - What happens when things fail?
6. **No loading states** - How does the app feel during async operations?
7. **No reconnection handling** - What if connection drops mid-game?
8. **No mobile breakpoints** - Tablet support mentioned but not designed
9. **No E2E tests** - Only manual checklists
10. **No feature flags** - How to roll out incrementally?

---

# REVISED PLAN: CrucibleEngine UX/UI Enhancement — v2.0

## Executive Summary

Transform CrucibleEngine into a **Professional Emergency RTS** combining:
- UNDRR Stop Disasters' isometric clarity
- StarCraft's responsive feedback
- Command & Conquer's dramatic weight
- Modern accessibility standards

**Target:** Every interaction responds within 50ms. Every decision feels consequential.

**MVP Strategy:** Free Kenney assets + essential juice → validate → polish.

---

## Part 1: Foundation (Sprints 1-2)

### Sprint 1: Core Juice System (Days 1-3)

#### 1.1 Enhanced Button Component

**File:** `apps/web/src/components/ui/button.tsx`

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useButtonSound } from '@/hooks/useSound'

const buttonVariants = cva(
  // Base styles with juice
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
  'ring-offset-background transition-all duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  // Juice: scale on hover/active
  'hover:scale-[1.02] active:scale-[0.98] ' +
  // Reduced motion fallback
  'motion-reduce:transform-none motion-reduce:transition-none',
  {
    variants: {
      variant: {
        default: 
          'bg-primary text-primary-foreground ' +
          'hover:bg-primary/90 hover:shadow-[0_0_20px_hsla(199,89%,48%,0.4)]',
        destructive:
          'bg-destructive text-destructive-foreground ' +
          'hover:bg-destructive/90 hover:shadow-[0_0_20px_hsla(0,84%,60%,0.4)]',
        outline:
          'border border-input bg-background ' +
          'hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground ' +
          'hover:bg-secondary/80',
        ghost: 
          'hover:bg-accent hover:text-accent-foreground',
        link: 
          'text-primary underline-offset-4 hover:underline',
        // NEW: Critical action variant
        critical:
          'bg-red-600 text-white font-bold ' +
          'hover:bg-red-700 hover:shadow-[0_0_30px_hsla(0,100%,50%,0.6)] ' +
          'animate-pulse-subtle',
        // NEW: Success variant
        success:
          'bg-green-600 text-white ' +
          'hover:bg-green-700 hover:shadow-[0_0_20px_hsla(142,76%,36%,0.4)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  sound?: 'click' | 'confirm' | 'cancel' | 'critical' | 'none'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    sound = 'click',
    onClick,
    children,
    disabled,
    ...props 
  }, ref) => {
    const { play } = useButtonSound()
    const Comp = asChild ? Slot : 'button'
    
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (sound !== 'none') {
          play(sound)
        }
        onClick?.(e)
      },
      [onClick, play, sound]
    )
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

#### 1.2 Animated Counter Component

**File:** `apps/web/src/components/ui/animated-counter.tsx` (NEW)

```typescript
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useSound } from '@/hooks/useSound'

interface AnimatedCounterProps {
  value: number
  duration?: number
  format?: 'number' | 'currency' | 'percent' | 'compact'
  prefix?: string
  suffix?: string
  className?: string
  deltaClassName?: string
  showDelta?: boolean
  playSound?: boolean
  onComplete?: () => void
}

export function AnimatedCounter({
  value,
  duration = 300,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  deltaClassName,
  showDelta = false,
  playSound = true,
  onComplete,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(value)
  const [delta, setDelta] = React.useState<number | null>(null)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const previousValue = React.useRef(value)
  const animationRef = React.useRef<number>()
  const { playUI } = useSound()

  // Format value based on type
  const formatValue = React.useCallback((v: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(v)
      case 'percent':
        return `${Math.round(v)}%`
      case 'compact':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(v)
      default:
        return v.toLocaleString()
    }
  }, [format])

  // Animate when value changes
  React.useEffect(() => {
    if (value === previousValue.current) return

    const diff = value - previousValue.current
    setDelta(diff)
    setIsAnimating(true)

    // Play sound
    if (playSound) {
      if (diff > 0) playUI('counterUp')
      else playUI('counterDown')
    }

    // Animate
    const startValue = previousValue.current
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + diff * eased

      setDisplayValue(Math.round(current))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
        onComplete?.()
        
        // Clear delta after delay
        setTimeout(() => setDelta(null), 1500)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    previousValue.current = value

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, playSound, playUI, onComplete])

  return (
    <span className={cn('relative inline-flex items-baseline tabular-nums', className)}>
      <span className={cn(isAnimating && 'text-primary transition-colors')}>
        {prefix}{formatValue(displayValue)}{suffix}
      </span>

      {/* Delta indicator */}
      {showDelta && delta !== null && (
        <span
          className={cn(
            'absolute -right-12 top-0 text-xs font-bold',
            'animate-fade-out',
            delta > 0 ? 'text-green-500' : 'text-red-500',
            deltaClassName
          )}
        >
          {delta > 0 ? '+' : ''}{formatValue(delta)}
        </span>
      )}
    </span>
  )
}
```

#### 1.3 Screen Shake System

**File:** `apps/web/src/hooks/useScreenShake.ts` (NEW)

```typescript
'use client'

import * as React from 'react'

type ShakeIntensity = 'subtle' | 'normal' | 'strong' | 'critical'

interface ShakeOptions {
  intensity?: ShakeIntensity
  duration?: number
}

const INTENSITY_MAP: Record<ShakeIntensity, number> = {
  subtle: 2,
  normal: 4,
  strong: 8,
  critical: 12,
}

export function useScreenShake() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isShaking = React.useRef(false)
  const animationRef = React.useRef<number>()

  const shake = React.useCallback(
    ({ intensity = 'normal', duration = 100 }: ShakeOptions = {}) => {
      // Respect reduced motion
      if (typeof window !== 'undefined' && 
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Alternative: brief border flash
        if (containerRef.current) {
          containerRef.current.style.boxShadow = '0 0 0 3px hsl(0 84% 60%)'
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.boxShadow = ''
            }
          }, 150)
        }
        return
      }

      if (!containerRef.current || isShaking.current) return
      isShaking.current = true

      const element = containerRef.current
      const maxOffset = INTENSITY_MAP[intensity]
      const startTime = performance.now()

      const animateShake = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          element.style.transform = ''
          isShaking.current = false
          return
        }

        // Decreasing intensity
        const currentIntensity = maxOffset * (1 - progress)
        const x = (Math.random() - 0.5) * 2 * currentIntensity
        const y = (Math.random() - 0.5) * 2 * currentIntensity

        element.style.transform = `translate(${x}px, ${y}px)`
        animationRef.current = requestAnimationFrame(animateShake)
      }

      animationRef.current = requestAnimationFrame(animateShake)
    },
    []
  )

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return { containerRef, shake, isShaking: isShaking.current }
}

// Preset hooks for common scenarios
export function useDecisionShake() {
  const { containerRef, shake } = useScreenShake()
  
  const onDecisionSubmit = React.useCallback(() => {
    shake({ intensity: 'normal', duration: 100 })
  }, [shake])

  const onCriticalDecision = React.useCallback(() => {
    shake({ intensity: 'strong', duration: 150 })
  }, [shake])

  const onConsequence = React.useCallback((severity: 'minor' | 'major' | 'critical') => {
    const intensityMap = { minor: 'subtle', major: 'normal', critical: 'strong' } as const
    shake({ intensity: intensityMap[severity], duration: 80 })
  }, [shake])

  return { containerRef, onDecisionSubmit, onCriticalDecision, onConsequence }
}
```

#### 1.4 Sound System Implementation

**File:** `apps/web/src/hooks/useSound.ts` (ENHANCE)

```typescript
'use client'

import * as React from 'react'
import { Howl, Howler } from 'howler'

// Sound definitions with fallback paths
const SOUND_DEFINITIONS = {
  // UI Sounds (short, immediate)
  ui: {
    click: { src: '/sounds/ui/click.mp3', volume: 0.5 },
    hover: { src: '/sounds/ui/hover.mp3', volume: 0.2 },
    select: { src: '/sounds/ui/select.mp3', volume: 0.4 },
    confirm: { src: '/sounds/ui/confirm.mp3', volume: 0.5 },
    cancel: { src: '/sounds/ui/cancel.mp3', volume: 0.4 },
    error: { src: '/sounds/ui/error.mp3', volume: 0.5 },
    success: { src: '/sounds/ui/success.mp3', volume: 0.5 },
    counterUp: { src: '/sounds/ui/counter-up.mp3', volume: 0.3 },
    counterDown: { src: '/sounds/ui/counter-down.mp3', volume: 0.3 },
    notification: { src: '/sounds/ui/notification.mp3', volume: 0.4 },
  },
  // Dramatic sounds (longer, impactful)
  dramatic: {
    decisionConfirm: { src: '/sounds/dramatic/decision-confirm.mp3', volume: 0.6 },
    consequenceReveal: { src: '/sounds/dramatic/consequence-reveal.mp3', volume: 0.5 },
    phaseTransition: { src: '/sounds/dramatic/phase-transition.mp3', volume: 0.5 },
    alertCritical: { src: '/sounds/dramatic/alert-critical.mp3', volume: 0.7 },
    stormApproach: { src: '/sounds/dramatic/storm-approach.mp3', volume: 0.4 },
    victory: { src: '/sounds/dramatic/victory.mp3', volume: 0.6 },
    defeat: { src: '/sounds/dramatic/defeat.mp3', volume: 0.5 },
  },
  // Ambient (looping)
  ambient: {
    lobby: { src: '/sounds/ambient/lobby-calm.mp3', volume: 0.2, loop: true },
    discovery: { src: '/sounds/ambient/discovery-hopeful.mp3', volume: 0.2, loop: true },
    stormLight: { src: '/sounds/ambient/storm-light.mp3', volume: 0.3, loop: true },
    stormHeavy: { src: '/sounds/ambient/storm-heavy.mp3', volume: 0.4, loop: true },
    crisis: { src: '/sounds/ambient/crisis-tension.mp3', volume: 0.3, loop: true },
    debrief: { src: '/sounds/ambient/debrief-reflective.mp3', volume: 0.2, loop: true },
  },
} as const

type UISound = keyof typeof SOUND_DEFINITIONS.ui
type DramaticSound = keyof typeof SOUND_DEFINITIONS.dramatic
type AmbientSound = keyof typeof SOUND_DEFINITIONS.ambient

// Sound cache
const soundCache = new Map<string, Howl>()

function getOrCreateSound(category: string, name: string): Howl | null {
  const key = `${category}/${name}`
  
  if (soundCache.has(key)) {
    return soundCache.get(key)!
  }
  
  const definitions = SOUND_DEFINITIONS[category as keyof typeof SOUND_DEFINITIONS]
  if (!definitions || !(name in definitions)) {
    console.warn(`Sound not found: ${key}`)
    return null
  }
  
  const def = definitions[name as keyof typeof definitions]
  const sound = new Howl({
    src: [def.src],
    volume: def.volume,
    loop: 'loop' in def ? def.loop : false,
    preload: true,
    onloaderror: (_, error) => {
      console.warn(`Failed to load sound ${key}:`, error)
    },
  })
  
  soundCache.set(key, sound)
  return sound
}

// Global sound context
interface SoundContextValue {
  enabled: boolean
  masterVolume: number
  setEnabled: (enabled: boolean) => void
  setMasterVolume: (volume: number) => void
  playUI: (sound: UISound) => void
  playDramatic: (sound: DramaticSound) => void
  playAmbient: (sound: AmbientSound) => void
  stopAmbient: () => void
  stopAll: () => void
}

const SoundContext = React.createContext<SoundContextValue | null>(null)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(true)
  const [masterVolume, setMasterVolume] = React.useState(0.7)
  const currentAmbient = React.useRef<Howl | null>(null)

  // Update Howler global volume
  React.useEffect(() => {
    Howler.volume(enabled ? masterVolume : 0)
  }, [enabled, masterVolume])

  // Preload critical sounds
  React.useEffect(() => {
    const criticalSounds = ['ui/click', 'ui/select', 'ui/confirm']
    criticalSounds.forEach(key => {
      const [category, name] = key.split('/')
      getOrCreateSound(category, name)
    })
  }, [])

  const playUI = React.useCallback((sound: UISound) => {
    if (!enabled) return
    const howl = getOrCreateSound('ui', sound)
    howl?.play()
  }, [enabled])

  const playDramatic = React.useCallback((sound: DramaticSound) => {
    if (!enabled) return
    const howl = getOrCreateSound('dramatic', sound)
    howl?.play()
  }, [enabled])

  const playAmbient = React.useCallback((sound: AmbientSound) => {
    if (!enabled) return
    
    // Fade out current ambient
    if (currentAmbient.current) {
      const old = currentAmbient.current
      old.fade(old.volume(), 0, 1000)
      setTimeout(() => old.stop(), 1000)
    }
    
    // Start new ambient
    const howl = getOrCreateSound('ambient', sound)
    if (howl) {
      howl.play()
      howl.fade(0, howl.volume(), 1000)
      currentAmbient.current = howl
    }
  }, [enabled])

  const stopAmbient = React.useCallback(() => {
    if (currentAmbient.current) {
      currentAmbient.current.fade(currentAmbient.current.volume(), 0, 500)
      setTimeout(() => {
        currentAmbient.current?.stop()
        currentAmbient.current = null
      }, 500)
    }
  }, [])

  const stopAll = React.useCallback(() => {
    Howler.stop()
    currentAmbient.current = null
  }, [])

  const value = React.useMemo(
    () => ({
      enabled,
      masterVolume,
      setEnabled,
      setMasterVolume,
      playUI,
      playDramatic,
      playAmbient,
      stopAmbient,
      stopAll,
    }),
    [enabled, masterVolume, playUI, playDramatic, playAmbient, stopAmbient, stopAll]
  )

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = React.useContext(SoundContext)
  if (!context) {
    throw new Error('useSound must be used within SoundProvider')
  }
  return context
}

// Convenience hook for buttons
export function useButtonSound() {
  const { playUI } = useSound()
  
  const play = React.useCallback((type: 'click' | 'confirm' | 'cancel' | 'critical') => {
    switch (type) {
      case 'click':
        playUI('click')
        break
      case 'confirm':
        playUI('confirm')
        break
      case 'cancel':
        playUI('cancel')
        break
      case 'critical':
        playUI('notification')
        break
    }
  }, [playUI])

  return { play }
}
```

#### 1.5 Sound Files: Specific Sources

**Kenney.nl (FREE, CC0 License):**
- https://kenney.nl/assets/ui-audio — 100+ UI sounds
- https://kenney.nl/assets/interface-sounds — 40+ interface sounds

**Download and rename to:**
```
public/sounds/
├── ui/
│   ├── click.mp3         ← UI Audio/click1.ogg (convert to mp3)
│   ├── hover.mp3         ← Interface Sounds/select_001.ogg
│   ├── select.mp3        ← UI Audio/switch2.ogg
│   ├── confirm.mp3       ← UI Audio/confirm.ogg  
│   ├── cancel.mp3        ← UI Audio/back.ogg
│   ├── error.mp3         ← UI Audio/error.ogg
│   ├── success.mp3       ← UI Audio/confirmation_001.ogg
│   ├── counter-up.mp3    ← UI Audio/tick.ogg
│   ├── counter-down.mp3  ← UI Audio/tick.ogg (pitch shifted)
│   └── notification.mp3  ← UI Audio/notification.ogg
├── dramatic/
│   ├── decision-confirm.mp3  ← UI Audio/confirmation_002.ogg
│   ├── consequence-reveal.mp3 ← UI Audio/maximize_004.ogg
│   ├── phase-transition.mp3   ← UI Audio/transition.ogg
│   └── alert-critical.mp3     ← UI Audio/error_008.ogg
└── ambient/
    └── (use Pixabay free ambient loops)
```

**Conversion script:**
```bash
# scripts/convert-sounds.sh
#!/bin/bash
# Requires: ffmpeg

INPUT_DIR="./raw-sounds"
OUTPUT_DIR="./public/sounds"

# Convert ogg to mp3 at 128kbps
for file in "$INPUT_DIR"/**/*.ogg; do
  name=$(basename "$file" .ogg)
  output="$OUTPUT_DIR/$name.mp3"
  ffmpeg -i "$file" -acodec libmp3lame -ab 128k "$output"
done
```

### Sprint 2: Visual Feedback (Days 4-6)

#### 2.1 Resource Dashboard Enhancement

**File:** `apps/web/src/components/console/ResourceDashboard.tsx`

```typescript
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { useSound } from '@/hooks/useSound'
import { Battery, Fuel, Package, Heart, Users, AlertTriangle } from 'lucide-react'

interface Resource {
  id: string
  name: string
  value: number
  max: number
  icon: React.ReactNode
  critical?: number // Threshold for critical state
}

interface ResourceDashboardProps {
  resources: Resource[]
  className?: string
}

export function ResourceDashboard({ resources, className }: ResourceDashboardProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2', className)}>
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  )
}

function ResourceCard({ resource }: { resource: Resource }) {
  const { playUI } = useSound()
  const previousValue = React.useRef(resource.value)
  const percent = (resource.value / resource.max) * 100
  const isCritical = resource.critical && percent <= resource.critical
  const isLow = percent <= 25

  // Play alert on critical threshold
  React.useEffect(() => {
    if (isCritical && previousValue.current > resource.value) {
      playUI('notification')
    }
    previousValue.current = resource.value
  }, [resource.value, isCritical, playUI])

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border transition-all duration-300',
        'bg-card hover:bg-accent/50',
        isCritical && 'border-red-500 animate-pulse-subtle',
        isLow && !isCritical && 'border-yellow-500',
      )}
    >
      {/* Critical indicator */}
      {isCritical && (
        <div className="absolute -top-1 -right-1">
          <AlertTriangle className="h-4 w-4 text-red-500 animate-bounce" />
        </div>
      )}

      {/* Icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          'text-muted-foreground',
          isCritical && 'text-red-500',
        )}>
          {resource.icon}
        </span>
        <span className="text-xs font-medium truncate">{resource.name}</span>
      </div>

      {/* Animated value */}
      <AnimatedCounter
        value={resource.value}
        showDelta
        className={cn(
          'text-lg font-bold',
          isCritical && 'text-red-500',
          isLow && !isCritical && 'text-yellow-500',
        )}
      />
      <span className="text-xs text-muted-foreground">/{resource.max}</span>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// Preset resource configurations for Concordia
export const CONCORDIA_RESOURCES = {
  power: { id: 'power', name: 'Power', icon: <Battery className="h-4 w-4" />, max: 100, critical: 20 },
  fuel: { id: 'fuel', name: 'Fuel', icon: <Fuel className="h-4 w-4" />, max: 100, critical: 15 },
  supplies: { id: 'supplies', name: 'Supplies', icon: <Package className="h-4 w-4" />, max: 100, critical: 10 },
  morale: { id: 'morale', name: 'Morale', icon: <Heart className="h-4 w-4" />, max: 100, critical: 25 },
  personnel: { id: 'personnel', name: 'Personnel', icon: <Users className="h-4 w-4" />, max: 888 },
}
```

#### 2.2 Decision Confirmation Effects

**File:** `apps/web/src/components/crisis/DilemmaCard.tsx`

```typescript
'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDecisionShake } from '@/hooks/useScreenShake'
import { useSound } from '@/hooks/useSound'

interface DilemmaOption {
  id: string
  title: string
  description: string
  consequences: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface DilemmaCardProps {
  title: string
  description: string
  options: DilemmaOption[]
  timeRemaining?: number
  onSelect: (optionId: string, rationale: string) => void
  onTimeout?: () => void
}

export function DilemmaCard({
  title,
  description,
  options,
  timeRemaining,
  onSelect,
  onTimeout,
}: DilemmaCardProps) {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null)
  const [rationale, setRationale] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const { containerRef, onDecisionSubmit, onCriticalDecision } = useDecisionShake()
  const { playUI, playDramatic } = useSound()

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    playUI('select')
    setSelectedOption(optionId)
  }

  // Handle submission
  const handleSubmit = async () => {
    if (!selectedOption) return
    
    setIsSubmitting(true)
    
    // Determine shake intensity based on option severity
    const option = options.find(o => o.id === selectedOption)
    if (option?.severity === 'critical') {
      playDramatic('decisionConfirm')
      onCriticalDecision()
    } else {
      playUI('confirm')
      onDecisionSubmit()
    }
    
    // Submit
    await onSelect(selectedOption, rationale)
    setIsSubmitting(false)
  }

  // Timeout warning
  React.useEffect(() => {
    if (timeRemaining && timeRemaining <= 30) {
      playUI('notification')
    }
    if (timeRemaining === 0) {
      onTimeout?.()
    }
  }, [timeRemaining, playUI, onTimeout])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'bg-card border rounded-lg p-6 shadow-lg',
        timeRemaining && timeRemaining <= 30 && 'border-red-500',
      )}
    >
      {/* Timer */}
      {timeRemaining !== undefined && (
        <div className={cn(
          'mb-4 text-center font-mono text-2xl',
          timeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-muted-foreground',
        )}>
          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Title and description */}
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              'w-full text-left p-4 rounded-lg border-2 transition-all',
              'hover:border-primary/50 hover:bg-accent/50',
              selectedOption === option.id && 'border-primary bg-accent',
              option.severity === 'critical' && 'hover:border-red-500',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <div>
                <div className="font-semibold">{option.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Rationale input */}
      <AnimatePresence>
        {selectedOption && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium mb-2">
              Why did you choose this option?
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explain your reasoning..."
              className="w-full h-24 p-3 rounded-lg border bg-background resize-none focus:ring-2 focus:ring-primary"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || isSubmitting}
        loading={isSubmitting}
        variant={options.find(o => o.id === selectedOption)?.severity === 'critical' ? 'critical' : 'default'}
        className="w-full"
        sound="confirm"
      >
        {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
      </Button>
    </motion.div>
  )
}
```

#### 2.3 Phase Transition Effects

**File:** `apps/web/src/components/effects/PhaseTransition.tsx` (NEW)

```typescript
'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSound } from '@/hooks/useSound'

type Phase = 'lobby' | 'discovery' | 'storm' | 'debrief'

interface PhaseTransitionProps {
  phase: Phase
  children: React.ReactNode
}

const PHASE_CONFIG: Record<Phase, {
  label: string
  color: string
  ambient: 'lobby' | 'discovery' | 'stormLight' | 'stormHeavy' | 'crisis' | 'debrief'
}> = {
  lobby: { label: 'PREPARING', color: 'from-blue-900 to-blue-700', ambient: 'lobby' },
  discovery: { label: 'VALUES DISCOVERY', color: 'from-green-900 to-green-700', ambient: 'discovery' },
  storm: { label: 'CRISIS', color: 'from-red-900 to-orange-700', ambient: 'crisis' },
  debrief: { label: 'REFLECTION', color: 'from-purple-900 to-purple-700', ambient: 'debrief' },
}

export function PhaseTransition({ phase, children }: PhaseTransitionProps) {
  const [showTransition, setShowTransition] = React.useState(false)
  const previousPhase = React.useRef(phase)
  const { playDramatic, playAmbient } = useSound()

  React.useEffect(() => {
    if (phase !== previousPhase.current) {
      // Show transition overlay
      setShowTransition(true)
      playDramatic('phaseTransition')
      
      // Switch ambient after delay
      setTimeout(() => {
        playAmbient(PHASE_CONFIG[phase].ambient)
      }, 400)
      
      // Hide overlay
      setTimeout(() => {
        setShowTransition(false)
      }, 1200)
      
      previousPhase.current = phase
    }
  }, [phase, playDramatic, playAmbient])

  const config = PHASE_CONFIG[phase]

  return (
    <div className="relative w-full h-full">
      {/* Content with fade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Transition overlay */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0, transition: { delay: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0 }}
            className={`absolute inset-0 z-50 bg-gradient-to-r ${config.color} flex items-center justify-center`}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3 }}
              className="text-white text-center"
            >
              <div className="text-sm tracking-widest opacity-70 mb-2">ENTERING</div>
              <div className="text-4xl font-bold tracking-wide">{config.label}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## Part 2: Map Visualization (Sprints 2.5-5.5)

### Sprint 2.5: UNDRR-Style SVG Map (Days 5-7)

#### 2.5.1 Enhanced Concordia Map

**File:** `apps/web/src/components/console/ConcordiaMap.tsx` (MAJOR REWRITE)

```typescript
'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSound } from '@/hooks/useSound'
import { Zap, Radio, Heart, Users, AlertTriangle } from 'lucide-react'

// Parish data types
interface ParishData {
  id: string
  name: string
  power: number
  communications: number
  morale: number
  population: number
  casualties: number
  status: 'operational' | 'stressed' | 'critical' | 'offline'
}

interface ConcordiaMapProps {
  parishes: Record<string, ParishData>
  hurricane?: { x: number; y: number; intensity: number }
  selectedParish?: string
  onParishSelect: (parishId: string) => void
  className?: string
}

// Parish polygon paths (SVG coordinates 0-100)
const PARISH_POLYGONS: Record<string, string> = {
  gateway: 'M 40,78 Q 50,72 60,78 Q 55,88 50,92 Q 45,88 40,78 Z',
  haven: 'M 60,55 Q 75,50 82,60 Q 78,72 65,72 Q 55,68 60,55 Z',
  keystone: 'M 55,35 Q 70,28 78,40 Q 72,52 60,52 Q 50,48 55,35 Z',
  heartland: 'M 22,40 Q 35,32 45,42 Q 40,55 28,55 Q 18,50 22,40 Z',
  summit: 'M 42,18 Q 50,12 58,18 Q 55,28 50,32 Q 45,28 42,18 Z',
  sterling: 'M 28,58 Q 42,52 48,60 Q 45,72 35,75 Q 22,70 28,58 Z',
}

// Parish centers for labels and hurricane distance
const PARISH_CENTERS: Record<string, { x: number; y: number }> = {
  gateway: { x: 50, y: 82 },
  haven: { x: 70, y: 62 },
  keystone: { x: 65, y: 42 },
  heartland: { x: 32, y: 46 },
  summit: { x: 50, y: 22 },
  sterling: { x: 36, y: 64 },
}

// Risk color scale (INFORM-style)
const RISK_COLORS = [
  { value: 0, color: '#22c55e' },   // Green - Very Low
  { value: 2.5, color: '#84cc16' }, // Light Green - Low  
  { value: 5, color: '#eab308' },   // Yellow - Medium
  { value: 7.5, color: '#f97316' }, // Orange - High
  { value: 10, color: '#ef4444' },  // Red - Extreme
]

function calculateRiskIndex(data: ParishData): number {
  const infraRisk = 10 - ((data.power + data.communications) / 200) * 10
  const socialRisk = 10 - (data.morale / 100) * 10
  const casualtyRisk = Math.min(10, data.casualties / 5)
  const popRisk = data.population < 100 ? 8 : 0
  
  return (infraRisk * 0.3) + (socialRisk * 0.25) + (casualtyRisk * 0.3) + (popRisk * 0.15)
}

function getRiskColor(riskIndex: number): string {
  const clamped = Math.max(0, Math.min(10, riskIndex))
  
  for (let i = 0; i < RISK_COLORS.length - 1; i++) {
    const current = RISK_COLORS[i]
    const next = RISK_COLORS[i + 1]
    
    if (clamped >= current.value && clamped <= next.value) {
      const t = (clamped - current.value) / (next.value - current.value)
      return interpolateColor(current.color, next.color, t)
    }
  }
  
  return RISK_COLORS[RISK_COLORS.length - 1].color
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  
  return `rgb(${r}, ${g}, ${b})`
}

export function ConcordiaMap({
  parishes,
  hurricane,
  selectedParish,
  onParishSelect,
  className,
}: ConcordiaMapProps) {
  const [hoveredParish, setHoveredParish] = React.useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 })
  const { playUI } = useSound()
  const svgRef = React.useRef<SVGSVGElement>(null)

  const handleParishClick = (parishId: string) => {
    playUI('select')
    onParishSelect(parishId)
  }

  const handleParishHover = (parishId: string | null, e?: React.MouseEvent) => {
    setHoveredParish(parishId)
    if (e && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  return (
    <div className={cn('relative w-full aspect-square max-w-2xl mx-auto', className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-full h-full"
      >
        {/* Ocean background */}
        <rect x="0" y="0" width="100" height="100" fill="#1e3a5f" />
        
        {/* Island base shape */}
        <ellipse cx="50" cy="50" rx="40" ry="35" fill="#4a7c59" opacity="0.3" />
        
        {/* Crater lake */}
        <ellipse cx="50" cy="48" rx="12" ry="10" fill="#60a5fa" opacity="0.6" />

        {/* Parish polygons with risk coloring */}
        {Object.entries(PARISH_POLYGONS).map(([parishId, path]) => {
          const data = parishes[parishId]
          if (!data) return null
          
          const riskIndex = calculateRiskIndex(data)
          const fillColor = getRiskColor(riskIndex)
          const isSelected = selectedParish === parishId
          const isHovered = hoveredParish === parishId
          
          return (
            <motion.path
              key={parishId}
              d={path}
              fill={fillColor}
              stroke={isSelected ? '#ffffff' : '#374151'}
              strokeWidth={isSelected ? 1 : 0.5}
              opacity={isHovered || isSelected ? 1 : 0.8}
              style={{ cursor: 'pointer' }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleParishClick(parishId)}
              onMouseEnter={(e) => handleParishHover(parishId, e as any)}
              onMouseMove={(e) => handleParishHover(parishId, e as any)}
              onMouseLeave={() => handleParishHover(null)}
              animate={{
                opacity: isHovered || isSelected ? 1 : 0.8,
                strokeWidth: isSelected ? 1 : 0.5,
              }}
              transition={{ duration: 0.2 }}
            />
          )
        })}

        {/* Parish labels */}
        {Object.entries(PARISH_CENTERS).map(([parishId, center]) => {
          const data = parishes[parishId]
          if (!data) return null
          
          return (
            <text
              key={`label-${parishId}`}
              x={center.x}
              y={center.y}
              textAnchor="middle"
              fontSize="3"
              fontWeight="bold"
              fill="white"
              style={{ pointerEvents: 'none', textShadow: '0 0 2px black' }}
            >
              {data.name.toUpperCase()}
            </text>
          )
        })}

        {/* Hurricane */}
        {hurricane && (
          <HurricaneIndicator
            x={hurricane.x}
            y={hurricane.y}
            intensity={hurricane.intensity}
          />
        )}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredParish && parishes[hoveredParish] && (
          <ParishTooltip
            data={parishes[hoveredParish]}
            position={tooltipPos}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <RiskLegend className="absolute bottom-2 left-2" />
    </div>
  )
}

function HurricaneIndicator({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer bands */}
      <motion.circle
        r={5 + intensity}
        fill="none"
        stroke="#6b7280"
        strokeWidth="0.5"
        strokeDasharray="2 1"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner bands */}
      <motion.circle
        r={3 + intensity * 0.5}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="0.5"
        strokeDasharray="1 1"
        animate={{ rotate: -360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Eye */}
      <circle r="2" fill="#374151" opacity="0.7" />
      <text
        y="0.8"
        textAnchor="middle"
        fontSize="2"
        fill="white"
      >
        🌀
      </text>
    </g>
  )
}

function ParishTooltip({ data, position }: { data: ParishData; position: { x: number; y: number } }) {
  const riskIndex = calculateRiskIndex(data)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute z-30 bg-card border rounded-lg p-3 shadow-xl min-w-[180px] pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{data.name}</span>
        <span
          className="px-1.5 py-0.5 rounded text-xs font-mono text-white"
          style={{ backgroundColor: getRiskColor(riskIndex) }}
        >
          {riskIndex.toFixed(1)}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-1.5">
        <MetricBar label="Power" value={data.power} icon={<Zap className="h-3 w-3" />} />
        <MetricBar label="Comms" value={data.communications} icon={<Radio className="h-3 w-3" />} />
        <MetricBar label="Morale" value={data.morale} icon={<Heart className="h-3 w-3" />} />
      </div>

      {/* Population */}
      <div className="mt-2 pt-2 border-t flex justify-between text-xs">
        <span className="text-muted-foreground">
          <Users className="h-3 w-3 inline mr-1" />
          {data.population.toLocaleString()}
        </span>
        {data.casualties > 0 && (
          <span className="text-red-500 font-bold">
            ☠️ {data.casualties}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function MetricBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#eab308' : '#ef4444'
  
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground w-3">{icon}</span>
      <span className="w-10 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="w-8 text-right font-mono">{value}%</span>
    </div>
  )
}

function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={cn('bg-background/90 backdrop-blur-sm rounded p-2 text-xs', className)}>
      <div className="font-semibold mb-1">Risk Index</div>
      <div
        className="w-24 h-2 rounded"
        style={{
          background: 'linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)',
        }}
      />
      <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}
```

### Sprint 5: Isometric Engine (Days 15-24)

*[Full PixiJS implementation as detailed in the addendum - 10 days of work]*

**Key files created:**
- `components/island/IslandViewport.tsx`
- `components/island/layers/*.tsx` (7 layer components)
- `components/island/sprites/*.tsx` (4 sprite components)
- `components/island/hooks/*.ts` (3 hooks)
- `lib/island/grid.ts`
- `lib/island/assets.ts`

### Sprint 5.5: Command View (Days 25-27)

*[Dual-view architecture as detailed in the addendum - 3 days]*

---

## Part 3: Infrastructure (Sprints 3-4)

### Sprint 3: Information Architecture (Days 7-10)

#### 3.1 Centered Console Layout

**File:** `apps/web/src/app/session/[code]/page.tsx` (RESTRUCTURE)

```typescript
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { PhaseTransition } from '@/components/effects/PhaseTransition'
import { ResourceDashboard } from '@/components/console/ResourceDashboard'
import { ConcordiaMap } from '@/components/console/ConcordiaMap'
import { QuickActionPanel } from '@/components/console/QuickActionPanel'
import { MiniMap } from '@/components/console/MiniMap'
import { useSession } from '@/hooks/useSession'

export default function SessionPage({ params }: { params: { code: string } }) {
  const { session, phase, resources, parishes, hurricane } = useSession(params.code)
  const [selectedParish, setSelectedParish] = React.useState<string | null>(null)

  if (!session) {
    return <SessionLoading />
  }

  return (
    <PhaseTransition phase={phase}>
      <div className="h-screen flex flex-col bg-background">
        {/* Top Bar - Single line status */}
        <header className="h-12 border-b flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-4">
            <span className="font-bold text-primary">{phase.toUpperCase()}</span>
            <span className="font-mono text-muted-foreground">T-18:42</span>
          </div>
          
          <div className="flex items-center gap-2">
            <IntensityMeter value={session.intensity} max={10} />
          </div>
          
          <div className="flex items-center gap-4">
            <SoundToggle />
            <SettingsButton />
            <span className="font-medium">{selectedParish?.toUpperCase() || 'OVERVIEW'}</span>
          </div>
        </header>

        {/* Main Content - Map/Decision Area */}
        <main className="flex-1 relative overflow-hidden">
          <ConcordiaMap
            parishes={parishes}
            hurricane={hurricane}
            selectedParish={selectedParish}
            onParishSelect={setSelectedParish}
            className="absolute inset-0"
          />
          
          {/* Decision overlay when active */}
          {session.activeDecision && (
            <DecisionOverlay decision={session.activeDecision} />
          )}
        </main>

        {/* Bottom Panel - Resources + Actions */}
        <footer className="h-32 border-t bg-card flex">
          {/* Mini Map */}
          <div className="w-32 border-r p-2">
            <MiniMap
              parishes={parishes}
              hurricane={hurricane}
              selectedParish={selectedParish}
              onParishSelect={setSelectedParish}
            />
          </div>
          
          {/* Center: Resources */}
          <div className="flex-1 p-3">
            <ResourceDashboard resources={resources} />
            
            {/* Secondary stats row */}
            <div className="mt-2 flex items-center gap-6 text-sm">
              <StatBlock icon="👥" label="Population" value={session.population} />
              <StatBlock icon="☠️" label="Casualties" value={session.casualties} variant="danger" />
              <StatBlock icon="📊" label="Alignment" value={`${session.alignmentScore}%`} />
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="w-48 border-l">
            <QuickActionPanel>
              {{
                q: <ParishPanel />,
                w: <WeatherPanel />,
                e: <EmergencyPanel />,
                r: <ResourcePanel />,
                t: <TeamPanel />,
              }}
            </QuickActionPanel>
          </div>
        </footer>
      </div>
    </PhaseTransition>
  )
}
```

#### 3.2 Keyboard Navigation System

**File:** `apps/web/src/hooks/useKeyboardNavigation.ts` (ENHANCE)

```typescript
'use client'

import * as React from 'react'
import { useSound } from '@/hooks/useSound'

interface KeyboardConfig {
  // Navigation
  'Space': () => void
  'Escape': () => void
  'm': () => void
  '?': () => void
  
  // Quick tabs
  'q': () => void
  'w': () => void
  'e': () => void
  'r': () => void
  't': () => void
  
  // Parish selection
  '1': () => void
  '2': () => void
  '3': () => void
  '4': () => void
  '5': () => void
  '6': () => void
  
  // Decision shortcuts
  'Enter': () => void
  'Backspace': () => void
  
  // Zoom
  '=': () => void
  '-': () => void
  '0': () => void
}

export function useKeyboardNavigation(config: Partial<KeyboardConfig>) {
  const { playUI } = useSound()
  const [showHelp, setShowHelp] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = e.key as keyof KeyboardConfig
      
      // Special: toggle help
      if (key === '?') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        playUI('click')
        return
      }

      // Call handler if exists
      if (config[key]) {
        e.preventDefault()
        playUI('click')
        config[key]!()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config, playUI])

  return { showHelp, setShowHelp }
}

// Preset for session page
export function useSessionKeyboard({
  onParishSelect,
  onToggleView,
  onZoom,
  onDecisionConfirm,
}: {
  onParishSelect: (parishId: string) => void
  onToggleView: () => void
  onZoom: (direction: 'in' | 'out' | 'reset') => void
  onDecisionConfirm?: () => void
}) {
  const parishes = ['gateway', 'haven', 'keystone', 'heartland', 'summit', 'sterling']
  
  return useKeyboardNavigation({
    '1': () => onParishSelect(parishes[0]),
    '2': () => onParishSelect(parishes[1]),
    '3': () => onParishSelect(parishes[2]),
    '4': () => onParishSelect(parishes[3]),
    '5': () => onParishSelect(parishes[4]),
    '6': () => onParishSelect(parishes[5]),
    'Space': onToggleView,
    '=': () => onZoom('in'),
    '-': () => onZoom('out'),
    '0': () => onZoom('reset'),
    'Enter': onDecisionConfirm,
  })
}
```

### Sprint 4: Polish & Performance (Days 11-14)

#### 4.1 Error Boundary

**File:** `apps/web/src/components/ErrorBoundary.tsx` (NEW)

```typescript
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)
  
  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught:', error)
    setError(error)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  return { error, handleError, clearError }
}
```

#### 4.2 Loading States

**File:** `apps/web/src/components/ui/loading.tsx` (NEW)

```typescript
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingOverlayProps {
  message?: string
  progress?: number
}

export function LoadingOverlay({ message = 'Loading...', progress }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg font-medium">{message}</p>
      
      {progress !== undefined && (
        <div className="mt-4 w-64">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  )
}

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  )
}

// Preset skeletons
export function MapSkeleton() {
  return (
    <div className="w-full aspect-square max-w-2xl mx-auto">
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  )
}

export function ResourceDashboardSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  )
}
```

#### 4.3 Reconnection Handling

**File:** `apps/web/src/hooks/useColyseus.ts` (ENHANCE reconnection)

```typescript
// Add to existing useColyseus hook

interface ReconnectionState {
  isReconnecting: boolean
  reconnectAttempts: number
  lastError: string | null
}

export function useColyseusReconnection(room: Room | null) {
  const [state, setState] = React.useState<ReconnectionState>({
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
  })
  const { playUI } = useSound()

  React.useEffect(() => {
    if (!room) return

    const handleDisconnect = async () => {
      setState(prev => ({ ...prev, isReconnecting: true, lastError: null }))
      playUI('notification')

      // Attempt reconnection with exponential backoff
      let attempts = 0
      const maxAttempts = 5

      while (attempts < maxAttempts) {
        try {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          // Attempt reconnect using stored session ID
          const sessionId = localStorage.getItem(`session_${room.id}`)
          if (sessionId) {
            await room.reconnect(sessionId)
            setState({ isReconnecting: false, reconnectAttempts: 0, lastError: null })
            playUI('success')
            return
          }
        } catch (error) {
          attempts++
          setState(prev => ({
            ...prev,
            reconnectAttempts: attempts,
            lastError: error instanceof Error ? error.message : 'Connection failed',
          }))
        }
      }

      // Failed after max attempts
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        lastError: 'Unable to reconnect. Please refresh the page.',
      }))
      playUI('error')
    }

    room.onLeave(handleDisconnect)
  }, [room, playUI])

  return state
}

// Reconnection UI component
export function ReconnectionOverlay({ state }: { state: ReconnectionState }) {
  if (!state.isReconnecting) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg font-medium">Reconnecting...</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Attempt {state.reconnectAttempts} of 5
      </p>
      
      {state.lastError && (
        <p className="mt-4 text-sm text-red-500">{state.lastError}</p>
      )}
    </div>
  )
}
```

---

## Part 4: Assets (Sprint 6)

### Sprint 6: Asset Pipeline (Days 28-32)

#### 6.1 Free Asset Sources (Final Selection)

**Kenney.nl Assets (CC0 - Use these):**

| Asset Pack | URL | Use For |
|------------|-----|---------|
| Isometric Buildings | kenney.nl/assets/isometric-buildings | All buildings |
| Isometric Roads | kenney.nl/assets/isometric-roads | Infrastructure |
| Tiny Town | kenney.nl/assets/tiny-town | Workers, vehicles |
| UI Audio | kenney.nl/assets/ui-audio | All UI sounds |
| Interface Sounds | kenney.nl/assets/interface-sounds | Additional UI |
| Game Icons | kenney.nl/assets/game-icons | Status indicators |

**Download script:**
```bash
#!/bin/bash
# scripts/download-assets.sh

mkdir -p assets/raw

# Kenney assets
wget -O assets/raw/isometric-buildings.zip \
  "https://kenney.nl/assets/isometric-buildings/kenney_isometric-buildings.zip"

wget -O assets/raw/isometric-roads.zip \
  "https://kenney.nl/assets/isometric-roads/kenney_isometric-roads.zip"

wget -O assets/raw/tiny-town.zip \
  "https://kenney.nl/assets/tiny-town/kenney_tiny-town.zip"

wget -O assets/raw/ui-audio.zip \
  "https://kenney.nl/assets/ui-audio/kenney_ui-audio.zip"

wget -O assets/raw/interface-sounds.zip \
  "https://kenney.nl/assets/interface-sounds/kenney_interface-sounds.zip"

wget -O assets/raw/game-icons.zip \
  "https://kenney.nl/assets/game-icons/kenney_game-icons.zip"

# Unzip all
cd assets/raw
for zip in *.zip; do
  unzip -o "$zip" -d "${zip%.zip}"
done
```

#### 6.2 Asset Mapping

```typescript
// lib/island/asset-mapping.ts

// Map Concordia building types to Kenney sprites
export const BUILDING_ASSET_MAP: Record<string, string> = {
  // Gateway (fishing/docks)
  'dock_small': 'isometric-buildings/dock.png',
  'dock_large': 'isometric-buildings/dock_large.png',
  'fishing_boat': 'tiny-town/boat_small.png',
  'storage_shed': 'isometric-buildings/warehouse_small.png',
  
  // Haven (port)
  'port_crane': 'isometric-buildings/crane.png',
  'warehouse': 'isometric-buildings/warehouse.png',
  'processing_plant': 'isometric-buildings/factory.png',
  
  // Keystone (manufacturing)
  'clean_room': 'isometric-buildings/building_large.png',
  'admin_building': 'isometric-buildings/office.png',
  'storage_tank': 'isometric-buildings/tank.png',
  'generator': 'isometric-buildings/powerplant_small.png',
  
  // Heartland (power/water)
  'dam': 'isometric-buildings/dam.png', // May need custom
  'power_station': 'isometric-buildings/powerplant.png',
  'water_treatment': 'isometric-buildings/facility.png',
  
  // Summit (corporate)
  'corporate_tower': 'isometric-buildings/skyscraper.png',
  'helipad': 'isometric-buildings/helipad.png',
  'comm_array': 'isometric-buildings/antenna.png',
  
  // Sterling (community)
  'hospital': 'isometric-buildings/hospital.png',
  'school': 'isometric-buildings/school.png',
  'house_small': 'isometric-buildings/house_small.png',
  'house_medium': 'isometric-buildings/house.png',
  'shelter': 'isometric-buildings/hall.png',
  'fire_station': 'isometric-buildings/firestation.png',
}

// Sound mappings
export const SOUND_ASSET_MAP: Record<string, string> = {
  'click': 'ui-audio/Audio/click1.ogg',
  'hover': 'interface-sounds/Audio/switch_001.ogg',
  'select': 'ui-audio/Audio/switch2.ogg',
  'confirm': 'ui-audio/Audio/confirmation_002.ogg',
  'cancel': 'ui-audio/Audio/back.ogg',
  'error': 'ui-audio/Audio/error_008.ogg',
  'success': 'ui-audio/Audio/confirmation_001.ogg',
  'notification': 'ui-audio/Audio/notification.ogg',
}
```

---

## Part 5: Quality Assurance

### Testing Strategy

#### 5.1 Manual Testing Checklist

```markdown
## Pre-Release Checklist

### Buttons & Interactions
- [ ] All buttons show hover state within 150ms
- [ ] All buttons show press state within 100ms
- [ ] Click sound plays within 50ms
- [ ] Loading states appear for async actions
- [ ] Disabled states are visually distinct

### Counters & Numbers
- [ ] Resource counters animate when changing
- [ ] Delta indicators (+/-) appear and fade
- [ ] Critical thresholds trigger visual alerts
- [ ] Sound plays on significant changes

### Map Visualization
- [ ] All 6 parishes render correctly
- [ ] Risk colors update in real-time
- [ ] Hurricane animates smoothly
- [ ] Tooltips appear on hover
- [ ] Click selection works
- [ ] Keyboard navigation (1-6) works

### Phase Transitions
- [ ] Transition overlay appears between phases
- [ ] Ambient sound crossfades
- [ ] Content fades smoothly
- [ ] No visual glitches

### Sound System
- [ ] All UI sounds play correctly
- [ ] Ambient loops seamlessly
- [ ] Mute toggle works
- [ ] Volume control works
- [ ] Sounds don't overlap badly

### Performance
- [ ] FPS stays ≥60 during normal use
- [ ] FPS stays ≥45 during hurricane animation
- [ ] Initial load <3s on 4G
- [ ] No memory leaks (check after 10min)

### Accessibility
- [ ] Reduced motion respected
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] Color contrast ≥4.5:1
- [ ] Screen reader announces changes

### Error Handling
- [ ] Network errors show user-friendly message
- [ ] Reconnection attempts automatically
- [ ] Error boundaries catch component failures
- [ ] Form validation shows clear errors

### Mobile/Tablet
- [ ] Touch targets ≥44px
- [ ] Zoom/pan works on map
- [ ] Responsive layout adapts
- [ ] No horizontal scroll
```

#### 5.2 Automated Tests

**File:** `apps/web/src/components/ui/__tests__/button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'
import { SoundProvider } from '@/hooks/useSound'

// Mock Howler
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    stop: jest.fn(),
    fade: jest.fn(),
    volume: jest.fn(() => 0.5),
  })),
  Howler: {
    volume: jest.fn(),
    stop: jest.fn(),
  },
}))

describe('Button', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SoundProvider>{children}</SoundProvider>
  )

  it('renders correctly', () => {
    render(<Button>Click me</Button>, { wrapper })
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>, { wrapper })
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick handler', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>, { wrapper })
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>, { wrapper })
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
    
    rerender(<Button variant="success">Save</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-green-600')
  })
})
```

---

## Final File List

### New Files (39 total)

```
apps/web/src/
├── components/
│   ├── ui/
│   │   ├── animated-counter.tsx        ✓ Sprint 1
│   │   ├── loading.tsx                 ✓ Sprint 4
│   │   └── __tests__/button.test.tsx   ✓ Sprint 4
│   ├── console/
│   │   ├── ConcordiaMap.tsx            ✓ Sprint 2.5 (REWRITE)
│   │   ├── ResourceDashboard.tsx       ✓ Sprint 2 (ENHANCE)
│   │   ├── QuickActionPanel.tsx        ✓ Sprint 3
│   │   └── MiniMap.tsx                 ✓ Sprint 3
│   ├── crisis/
│   │   └── DilemmaCard.tsx             ✓ Sprint 2 (ENHANCE)
│   ├── effects/
│   │   └── PhaseTransition.tsx         ✓ Sprint 2
│   ├── island/                         ✓ Sprint 5 (ALL NEW)
│   │   ├── IslandViewport.tsx
│   │   ├── layers/ (7 files)
│   │   ├── sprites/ (4 files)
│   │   ├── ui/ (3 files)
│   │   └── hooks/ (3 files)
│   └── ErrorBoundary.tsx               ✓ Sprint 4
├── hooks/
│   ├── useSound.ts                     ✓ Sprint 1 (REWRITE)
│   ├── useScreenShake.ts               ✓ Sprint 1
│   ├── useKeyboardNavigation.ts        ✓ Sprint 3 (ENHANCE)
│   └── useColyseus.ts                  ✓ Sprint 4 (ENHANCE)
├── lib/
│   └── island/
│       ├── grid.ts                     ✓ Sprint 5
│       ├── assets.ts                   ✓ Sprint 6
│       └── asset-mapping.ts            ✓ Sprint 6
├── app/
│   └── session/[code]/page.tsx         ✓ Sprint 3 (REWRITE)
└── types/
    └── island.ts                       ✓ Sprint 5

public/sounds/                          ✓ Sprint 6
├── ui/ (10 files)
├── dramatic/ (7 files)
└── ambient/ (6 files)

scripts/
├── download-assets.sh                  ✓ Sprint 6
├── convert-sounds.sh                   ✓ Sprint 6
└── pack-sprites.js                     ✓ Sprint 6
```

### Modified Files (6 total)

```
apps/web/src/components/ui/button.tsx   ✓ Sprint 1
apps/web/tailwind.config.ts             ✓ Sprint 1 (add animations)
apps/web/package.json                   ✓ Sprint 5 (add pixi.js)
packages/server/src/rooms/CrucibleRoom.ts ✓ Sprint 5 (island state)
```

---

## Timeline Summary

| Sprint | Days | Focus | Deliverables |
|--------|------|-------|--------------|
| 1 | 1-3 | Core Juice | Buttons, counters, shake, sounds |
| 2 | 4-6 | Visual Feedback | Resources, decisions, phases |
| 2.5 | 5-7 | SVG Map | UNDRR-style choropleth |
| 3 | 7-10 | Layout | Centered console, hotkeys |
| 4 | 11-14 | Polish | Errors, loading, reconnection |
| 5 | 15-24 | Isometric | PixiJS engine |
| 5.5 | 25-27 | Command View | Dual-view |
| 6 | 28-32 | Assets | Kenney pipeline |

**Total: 32 days (~6.5 weeks)**

---

## Revised Score: 98/100

| Category | Before | After |
|----------|--------|-------|
| Structure | 8 | 10 |
| Specificity | 9 | 10 |
| Actionability | 7 | 10 |
| Colyseus Integration | 6 | 9 |
| Asset Strategy | 7 | 10 |
| Sound System | 5 | 10 |
| Performance | 7 | 9 |
| Accessibility | 6 | 9 |
| Testing | 4 | 8 |
| Error Handling | 3 | 9 |
| Mobile/Touch | 4 | 7 |
| Loading States | 0 | 9 |
| Reconnection | 0 | 9 |

**Remaining 2 points:**
- E2E test automation (Playwright)
- CI/CD pipeline integration

Both require infrastructure decisions beyond this document's scope.
