/**
 * CrucibleEngine Design Token System
 *
 * Platinum-tier design system for video game UX/UI
 * Based on 2025 AAA game standards and accessibility requirements
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export const colors = {
  // Primary Palette (Cyan - Command Center aesthetic)
  primary: {
    50: 'hsl(199, 89%, 95%)',
    100: 'hsl(199, 89%, 85%)',
    200: 'hsl(199, 89%, 70%)',
    300: 'hsl(199, 89%, 58%)',
    400: 'hsl(199, 89%, 48%)', // PRIMARY ACTION
    500: 'hsl(199, 89%, 40%)',
    600: 'hsl(199, 89%, 32%)',
    700: 'hsl(199, 89%, 24%)',
    800: 'hsl(199, 89%, 16%)',
    900: 'hsl(199, 89%, 8%)',
  },

  // Background Scale (Dark theme)
  background: {
    base: 'hsl(222, 47%, 11%)',
    elevated: 'hsl(222, 47%, 14%)',
    surface: 'hsl(222, 47%, 17%)',
    overlay: 'hsl(222, 47%, 20%)',
  },

  // Foreground Scale
  foreground: {
    primary: 'hsl(210, 40%, 98%)',
    secondary: 'hsl(210, 40%, 80%)',
    muted: 'hsl(210, 40%, 60%)',
    disabled: 'hsl(210, 40%, 40%)',
  },

  // Semantic Status Colors
  status: {
    safe: {
      bg: 'hsl(142, 76%, 12%)',
      border: 'hsl(142, 76%, 25%)',
      text: 'hsl(142, 76%, 65%)',
      solid: 'hsl(142, 76%, 36%)',
      glow: 'hsla(142, 76%, 50%, 0.3)',
    },
    warning: {
      bg: 'hsl(38, 92%, 12%)',
      border: 'hsl(38, 92%, 30%)',
      text: 'hsl(38, 92%, 65%)',
      solid: 'hsl(38, 92%, 50%)',
      glow: 'hsla(38, 92%, 50%, 0.3)',
    },
    danger: {
      bg: 'hsl(0, 84%, 12%)',
      border: 'hsl(0, 84%, 30%)',
      text: 'hsl(0, 84%, 65%)',
      solid: 'hsl(0, 84%, 60%)',
      glow: 'hsla(0, 84%, 50%, 0.4)',
    },
    critical: {
      bg: 'hsl(0, 100%, 10%)',
      border: 'hsl(0, 100%, 40%)',
      text: 'hsl(0, 100%, 70%)',
      solid: 'hsl(0, 100%, 50%)',
      glow: 'hsla(0, 100%, 50%, 0.5)',
    },
    info: {
      bg: 'hsl(199, 89%, 12%)',
      border: 'hsl(199, 89%, 30%)',
      text: 'hsl(199, 89%, 65%)',
      solid: 'hsl(199, 89%, 48%)',
      glow: 'hsla(199, 89%, 48%, 0.3)',
    },
  },

  // Parish Identity Colors
  parish: {
    keystone: {
      primary: 'hsl(280, 60%, 50%)',
      secondary: 'hsl(280, 40%, 30%)',
      accent: 'hsl(280, 70%, 60%)',
    },
    haven: {
      primary: 'hsl(210, 70%, 50%)',
      secondary: 'hsl(210, 50%, 30%)',
      accent: 'hsl(210, 80%, 60%)',
    },
    gateway: {
      primary: 'hsl(38, 80%, 50%)',
      secondary: 'hsl(38, 60%, 30%)',
      accent: 'hsl(38, 90%, 60%)',
    },
    heartland: {
      primary: 'hsl(0, 70%, 50%)',
      secondary: 'hsl(0, 50%, 30%)',
      accent: 'hsl(0, 80%, 60%)',
    },
    summit: {
      primary: 'hsl(260, 60%, 50%)',
      secondary: 'hsl(260, 40%, 30%)',
      accent: 'hsl(260, 70%, 60%)',
    },
    sterling: {
      primary: 'hsl(180, 50%, 45%)',
      secondary: 'hsl(180, 35%, 28%)',
      accent: 'hsl(180, 60%, 55%)',
    },
  },

  // Emotional States (backgrounds, overlays)
  emotion: {
    tension: 'hsla(0, 70%, 20%, 0.1)',
    calm: 'hsla(210, 50%, 20%, 0.1)',
    revelation: 'hsla(45, 80%, 30%, 0.1)',
    gravity: 'hsla(0, 0%, 0%, 0.3)',
    urgency: 'hsla(38, 92%, 30%, 0.15)',
  },

  // Accessibility Alternatives (Colorblind safe)
  accessible: {
    protanopia: {
      danger: 'hsl(45, 100%, 50%)',
      safe: 'hsl(210, 100%, 50%)',
      warning: 'hsl(30, 100%, 60%)',
    },
    deuteranopia: {
      danger: 'hsl(30, 100%, 50%)',
      safe: 'hsl(240, 100%, 60%)',
      warning: 'hsl(60, 100%, 50%)',
    },
    tritanopia: {
      danger: 'hsl(350, 100%, 50%)',
      safe: 'hsl(160, 100%, 40%)',
      warning: 'hsl(20, 100%, 55%)',
    },
  },
} as const

// =============================================================================
// SPACING SCALE (4px base unit)
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px', // Minimum touch target
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
} as const

// =============================================================================
// TYPOGRAPHY SCALE
// =============================================================================

export const typography = {
  fonts: {
    display: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },

  sizes: {
    'display-1': {
      size: '72px',
      lineHeight: '1.1',
      weight: 700,
      letterSpacing: '-0.02em',
    },
    'display-2': {
      size: '56px',
      lineHeight: '1.15',
      weight: 700,
      letterSpacing: '-0.02em',
    },
    'display-3': {
      size: '48px',
      lineHeight: '1.2',
      weight: 600,
      letterSpacing: '-0.01em',
    },
    'heading-1': {
      size: '36px',
      lineHeight: '1.25',
      weight: 600,
      letterSpacing: '-0.01em',
    },
    'heading-2': {
      size: '28px',
      lineHeight: '1.3',
      weight: 600,
      letterSpacing: '0',
    },
    'heading-3': {
      size: '22px',
      lineHeight: '1.35',
      weight: 600,
      letterSpacing: '0',
    },
    'heading-4': {
      size: '18px',
      lineHeight: '1.4',
      weight: 600,
      letterSpacing: '0',
    },
    'body-lg': {
      size: '18px',
      lineHeight: '1.6',
      weight: 400,
      letterSpacing: '0',
    },
    body: {
      size: '16px',
      lineHeight: '1.6',
      weight: 400,
      letterSpacing: '0',
    },
    'body-sm': {
      size: '14px',
      lineHeight: '1.5',
      weight: 400,
      letterSpacing: '0',
    },
    caption: {
      size: '12px',
      lineHeight: '1.4',
      weight: 500,
      letterSpacing: '0.02em',
    },
    overline: {
      size: '11px',
      lineHeight: '1.3',
      weight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    },
  },
} as const

// =============================================================================
// ANIMATION / MOTION TOKENS
// =============================================================================

export const motion = {
  // Duration scale
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    deliberate: '800ms',
    cinematic: '1200ms',
    dramatic: '2000ms',
  },

  // Easing curves
  easing: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    dramatic: 'cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'cubic-bezier(0.45, 0, 0.55, 1)',
  },

  // Stagger delays for choreographed animations
  stagger: {
    fast: 30, // ms between items
    normal: 50,
    slow: 100,
    dramatic: 150,
  },

  // Predefined animation configs
  presets: {
    fadeIn: {
      duration: '200ms',
      easing: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    },
    slideUp: {
      duration: '300ms',
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    scaleIn: {
      duration: '200ms',
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    shake: {
      duration: '300ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    pulse: {
      duration: '1000ms',
      easing: 'ease-in-out',
    },
    glow: {
      duration: '500ms',
      easing: 'ease-in-out',
    },
  },
} as const

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  alert: 900,
  cinematic: 1000, // Full-screen takeovers
} as const

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  // Elevation shadows
  sm: '0 1px 2px hsla(0, 0%, 0%, 0.3)',
  md: '0 4px 6px hsla(0, 0%, 0%, 0.3)',
  lg: '0 10px 15px hsla(0, 0%, 0%, 0.3)',
  xl: '0 20px 25px hsla(0, 0%, 0%, 0.4)',
  '2xl': '0 25px 50px hsla(0, 0%, 0%, 0.5)',

  // Glow shadows (for status indicators)
  glow: {
    primary: '0 0 20px hsla(199, 89%, 48%, 0.4)',
    danger: '0 0 20px hsla(0, 84%, 50%, 0.4)',
    safe: '0 0 20px hsla(142, 76%, 50%, 0.3)',
    warning: '0 0 20px hsla(38, 92%, 50%, 0.3)',
    critical: '0 0 30px hsla(0, 100%, 50%, 0.5)',
  },

  // Inner shadows
  inner: 'inset 0 2px 4px hsla(0, 0%, 0%, 0.3)',
  innerLg: 'inset 0 4px 8px hsla(0, 0%, 0%, 0.4)',

  // Focus ring
  focus: '0 0 0 2px hsla(199, 89%, 48%, 0.5)',
  focusOffset: '0 0 0 4px hsla(199, 89%, 48%, 0.3)',
} as const

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const

// =============================================================================
// BREAKPOINTS (Responsive)
// =============================================================================

export const breakpoints = {
  mobile: '375px',
  mobileLg: '428px',
  tablet: '768px',
  tabletLg: '1024px',
  desktop: '1280px',
  desktopLg: '1536px',
  ultrawide: '1920px',
} as const

// =============================================================================
// COMPONENT STATE TOKENS
// =============================================================================

export const componentStates = {
  default: {
    opacity: 1,
    scale: 1,
    cursor: 'default',
  },
  hover: {
    opacity: 1,
    scale: 1.02,
    cursor: 'pointer',
    transition: '100ms ease-out',
  },
  focus: {
    opacity: 1,
    scale: 1,
    ring: '2px',
    ringOffset: '2px',
    cursor: 'default',
  },
  active: {
    opacity: 1,
    scale: 0.98,
    cursor: 'pointer',
    transition: '50ms ease-in',
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
    cursor: 'not-allowed',
    filter: 'grayscale(30%)',
  },
  loading: {
    opacity: 0.7,
    cursor: 'wait',
    animation: 'pulse 1s infinite',
  },
  error: {
    borderColor: 'hsl(0, 84%, 60%)',
    animation: 'shake 300ms',
  },
  success: {
    borderColor: 'hsl(142, 76%, 36%)',
    animation: 'checkIn 300ms',
  },
} as const

// =============================================================================
// ACCESSIBILITY TOKENS
// =============================================================================

export const accessibility = {
  // Minimum touch target size (44x44px per WCAG)
  minTouchTarget: '44px',

  // Focus indicators
  focusRing: {
    width: '2px',
    offset: '2px',
    color: 'hsl(199, 89%, 48%)',
  },

  // Reduced motion preferences
  reducedMotion: {
    duration: '0ms',
    animation: 'none',
  },

  // High contrast mode
  highContrast: {
    borderWidth: '2px',
    fontWeight: 600,
  },

  // Screen reader only styles
  srOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  },
} as const

// =============================================================================
// GAME-SPECIFIC TOKENS
// =============================================================================

export const gameTokens = {
  // Tension levels (0-10)
  tensionColors: {
    0: colors.status.safe.solid,
    2: colors.status.safe.text,
    4: colors.status.warning.text,
    6: colors.status.warning.solid,
    8: colors.status.danger.solid,
    10: colors.status.critical.solid,
  },

  // Hurricane phases
  phases: {
    lobby: { color: colors.primary[400], tension: 0 },
    discovery: { color: colors.primary[300], tension: 1 },
    briefing: { color: colors.status.warning.text, tension: 3 },
    watch: { color: colors.status.warning.solid, tension: 4 },
    warning: { color: colors.status.danger.text, tension: 6 },
    approach: { color: colors.status.danger.solid, tension: 8 },
    landfall: { color: colors.status.critical.solid, tension: 10 },
    recovery: { color: colors.status.warning.text, tension: 5 },
    debrief: { color: colors.primary[400], tension: 2 },
  },

  // Resource bar thresholds
  resourceThresholds: {
    critical: 20,
    low: 40,
    moderate: 60,
    good: 80,
    full: 100,
  },

  // Infrastructure status
  infrastructureThresholds: {
    failed: 20,
    degraded: 50,
    operational: 80,
    optimal: 100,
  },
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorToken = typeof colors
export type SpacingToken = typeof spacing
export type TypographyToken = typeof typography
export type MotionToken = typeof motion
export type ZIndexToken = typeof zIndex
export type ShadowToken = typeof shadows
export type RadiiToken = typeof radii
export type BreakpointToken = typeof breakpoints
export type ComponentStateToken = typeof componentStates
export type AccessibilityToken = typeof accessibility
export type GameToken = typeof gameTokens

// Parish color key type for type safety (see concordia.ts for canonical ParishId)
export type ParishColorKey = keyof typeof colors.parish

// Status type
export type StatusLevel = keyof typeof colors.status

// Phase type
export type GamePhase = keyof typeof gameTokens.phases
