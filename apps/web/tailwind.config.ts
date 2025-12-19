import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // =======================================================================
      // COLORS
      // =======================================================================
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: 'hsl(199, 89%, 95%)',
          100: 'hsl(199, 89%, 85%)',
          200: 'hsl(199, 89%, 70%)',
          300: 'hsl(199, 89%, 58%)',
          400: 'hsl(199, 89%, 48%)',
          500: 'hsl(199, 89%, 40%)',
          600: 'hsl(199, 89%, 32%)',
          700: 'hsl(199, 89%, 24%)',
          800: 'hsl(199, 89%, 16%)',
          900: 'hsl(199, 89%, 8%)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Status colors for command center aesthetic
        status: {
          safe: {
            DEFAULT: 'hsl(142, 76%, 36%)',
            bg: 'hsl(142, 76%, 12%)',
            border: 'hsl(142, 76%, 25%)',
            text: 'hsl(142, 76%, 65%)',
          },
          warning: {
            DEFAULT: 'hsl(38, 92%, 50%)',
            bg: 'hsl(38, 92%, 12%)',
            border: 'hsl(38, 92%, 30%)',
            text: 'hsl(38, 92%, 65%)',
          },
          danger: {
            DEFAULT: 'hsl(0, 84%, 60%)',
            bg: 'hsl(0, 84%, 12%)',
            border: 'hsl(0, 84%, 30%)',
            text: 'hsl(0, 84%, 65%)',
          },
          critical: {
            DEFAULT: 'hsl(0, 100%, 50%)',
            bg: 'hsl(0, 100%, 10%)',
            border: 'hsl(0, 100%, 40%)',
            text: 'hsl(0, 100%, 70%)',
          },
          info: {
            DEFAULT: 'hsl(199, 89%, 48%)',
            bg: 'hsl(199, 89%, 12%)',
            border: 'hsl(199, 89%, 30%)',
            text: 'hsl(199, 89%, 65%)',
          },
        },
        // Parish colors with full palette
        parish: {
          keystone: {
            DEFAULT: 'hsl(280, 60%, 50%)',
            secondary: 'hsl(280, 40%, 30%)',
            accent: 'hsl(280, 70%, 60%)',
          },
          haven: {
            DEFAULT: 'hsl(210, 70%, 50%)',
            secondary: 'hsl(210, 50%, 30%)',
            accent: 'hsl(210, 80%, 60%)',
          },
          gateway: {
            DEFAULT: 'hsl(38, 80%, 50%)',
            secondary: 'hsl(38, 60%, 30%)',
            accent: 'hsl(38, 90%, 60%)',
          },
          heartland: {
            DEFAULT: 'hsl(0, 70%, 50%)',
            secondary: 'hsl(0, 50%, 30%)',
            accent: 'hsl(0, 80%, 60%)',
          },
          summit: {
            DEFAULT: 'hsl(260, 60%, 50%)',
            secondary: 'hsl(260, 40%, 30%)',
            accent: 'hsl(260, 70%, 60%)',
          },
          sterling: {
            DEFAULT: 'hsl(180, 50%, 45%)',
            secondary: 'hsl(180, 35%, 28%)',
            accent: 'hsl(180, 60%, 55%)',
          },
        },
        // Emotional state colors
        emotion: {
          tension: 'hsla(0, 70%, 20%, 0.1)',
          calm: 'hsla(210, 50%, 20%, 0.1)',
          revelation: 'hsla(45, 80%, 30%, 0.1)',
          gravity: 'hsla(0, 0%, 0%, 0.3)',
          urgency: 'hsla(38, 92%, 30%, 0.15)',
        },
      },

      // =======================================================================
      // BORDER RADIUS
      // =======================================================================
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },

      // =======================================================================
      // FONT FAMILY
      // =======================================================================
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },

      // =======================================================================
      // FONT SIZE (Typography scale)
      // =======================================================================
      fontSize: {
        'display-1': ['72px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-2': ['56px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-3': ['48px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-1': ['36px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-2': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['22px', { lineHeight: '1.35', fontWeight: '600' }],
        'heading-4': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em' }],
        overline: ['11px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.1em' }],
      },

      // =======================================================================
      // SPACING (Extended for game UI)
      // =======================================================================
      spacing: {
        '11': '44px', // Minimum touch target
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        '34': '136px',
        '38': '152px',
        '42': '168px',
        '46': '184px',
        '50': '200px',
      },

      // =======================================================================
      // BOX SHADOW (Elevation + Glow)
      // =======================================================================
      boxShadow: {
        'glow-primary': '0 0 20px hsla(199, 89%, 48%, 0.4)',
        'glow-danger': '0 0 20px hsla(0, 84%, 50%, 0.4)',
        'glow-safe': '0 0 20px hsla(142, 76%, 50%, 0.3)',
        'glow-warning': '0 0 20px hsla(38, 92%, 50%, 0.3)',
        'glow-critical': '0 0 30px hsla(0, 100%, 50%, 0.5)',
        'inner-md': 'inset 0 2px 4px hsla(0, 0%, 0%, 0.3)',
        'inner-lg': 'inset 0 4px 8px hsla(0, 0%, 0%, 0.4)',
        focus: '0 0 0 2px hsla(199, 89%, 48%, 0.5)',
        'focus-offset': '0 0 0 4px hsla(199, 89%, 48%, 0.3)',
      },

      // =======================================================================
      // TRANSITION TIMING
      // =======================================================================
      transitionDuration: {
        instant: '0ms',
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
        deliberate: '800ms',
        cinematic: '1200ms',
        dramatic: '2000ms',
      },

      // =======================================================================
      // TRANSITION TIMING FUNCTION (Easing)
      // =======================================================================
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'ease-in-expo': 'cubic-bezier(0.4, 0.0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        dramatic: 'cubic-bezier(0.16, 1, 0.3, 1)',
        smooth: 'cubic-bezier(0.45, 0, 0.55, 1)',
      },

      // =======================================================================
      // KEYFRAMES (Animation Library)
      // =======================================================================
      keyframes: {
        // === BASIC ANIMATIONS ===
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px hsla(199, 89%, 48%, 0.3)' },
          '50%': { boxShadow: '0 0 25px hsla(199, 89%, 48%, 0.6)' },
        },

        // === ENTRANCE ANIMATIONS ===
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-in-bounce': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },

        // === EXIT ANIMATIONS ===
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'slide-out-left': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },

        // === ATTENTION ANIMATIONS ===
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'breaking-flash': {
          '0%, 100%': { backgroundColor: 'hsl(0, 84%, 60%)' },
          '50%': { backgroundColor: 'hsl(0, 100%, 50%)' },
        },
        'critical-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px hsla(0, 100%, 50%, 0.4)',
            borderColor: 'hsl(0, 100%, 50%)',
          },
          '50%': {
            boxShadow: '0 0 40px hsla(0, 100%, 50%, 0.7)',
            borderColor: 'hsl(0, 100%, 60%)',
          },
        },

        // === GAME-SPECIFIC ANIMATIONS ===
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'card-deal': {
          '0%': { transform: 'translateY(-100px) rotate(-10deg)', opacity: '0' },
          '50%': { transform: 'translateY(5px) rotate(2deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        'card-to-pile': {
          '0%': { transform: 'translateX(0) translateY(0) rotate(0deg) scale(1)' },
          '50%': { transform: 'translateX(var(--pile-x, 100px)) translateY(-50px) rotate(10deg) scale(0.9)' },
          '100%': { transform: 'translateX(var(--pile-x, 200px)) translateY(var(--pile-y, 0)) rotate(var(--pile-rotate, 5deg)) scale(0.85)' },
        },
        'decision-confirm': {
          '0%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.05)' },
          '30%': { transform: 'scale(1)', boxShadow: '0 0 0 0 hsla(199, 89%, 48%, 0.7)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 20px hsla(199, 89%, 48%, 0)' },
        },
        'consequence-reveal': {
          '0%': { transform: 'rotateY(0deg)', backfaceVisibility: 'hidden' },
          '100%': { transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' },
        },
        'parish-pulse': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--pulse-color, hsla(199, 89%, 48%, 0.7))' },
          '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 15px var(--pulse-color, hsla(199, 89%, 48%, 0))' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--pulse-color, hsla(199, 89%, 48%, 0))' },
        },
        'bar-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width, 100%)' },
        },
        'counter-tick': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-100%)' },
          '50.01%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'typewriter': {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },

        // === PHASE TRANSITION ANIMATIONS ===
        'cinematic-fade': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'storm-approach': {
          '0%': {
            backgroundPosition: '0% 50%',
            filter: 'brightness(1)',
          },
          '50%': {
            backgroundPosition: '100% 50%',
            filter: 'brightness(0.8)',
          },
          '100%': {
            backgroundPosition: '0% 50%',
            filter: 'brightness(1)',
          },
        },
        'wipe-right': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        'wipe-down': {
          '0%': { clipPath: 'inset(0 0 100% 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },

        // === TICKER/MARQUEE ANIMATION ===
        slide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },

        // === SIGNATURE/DRAWING ANIMATION ===
        'draw-path': {
          '0%': { strokeDashoffset: 'var(--path-length, 1000)' },
          '100%': { strokeDashoffset: '0' },
        },
        'seal-stamp': {
          '0%': { transform: 'scale(2) rotate(-10deg)', opacity: '0' },
          '50%': { transform: 'scale(0.95) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },

        // === SHIMMER/LOADING ANIMATIONS ===
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },

        // === CHECK/SUCCESS ANIMATION ===
        'check-in': {
          '0%': { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(0deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },

      // =======================================================================
      // ANIMATION (Named animations)
      // =======================================================================
      animation: {
        // Basic
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',

        // Entrance
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-fast': 'fade-in 100ms ease-out',
        'fade-in-slow': 'fade-in 500ms ease-out',
        'fade-in-up': 'fade-in-up 300ms ease-out',
        'fade-in-down': 'fade-in-down 300ms ease-out',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'slide-in-left': 'slide-in-left 300ms ease-out',
        'slide-in-up': 'slide-in-up 300ms ease-out',
        'slide-in-down': 'slide-in-down 300ms ease-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in-bounce': 'scale-in-bounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Exit
        'fade-out': 'fade-out 200ms ease-in',
        'slide-out-right': 'slide-out-right 200ms ease-in',
        'slide-out-left': 'slide-out-left 200ms ease-in',
        'scale-out': 'scale-out 200ms ease-in',

        // Attention
        shake: 'shake 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        wiggle: 'wiggle 500ms ease-in-out',
        bounce: 'bounce 500ms ease-in-out',
        'breaking-flash': 'breaking-flash 1s ease-in-out infinite',
        'critical-pulse': 'critical-pulse 1.5s ease-in-out infinite',

        // Game-specific
        'card-flip': 'card-flip 600ms ease-in-out',
        'card-deal': 'card-deal 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'card-to-pile': 'card-to-pile 500ms ease-out',
        'decision-confirm': 'decision-confirm 800ms ease-out',
        'consequence-reveal': 'consequence-reveal 600ms ease-in-out',
        'parish-pulse': 'parish-pulse 1s ease-out',
        'bar-fill': 'bar-fill 800ms ease-out forwards',
        'counter-tick': 'counter-tick 300ms ease-out',

        // Phase transitions
        'cinematic-fade': 'cinematic-fade 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'storm-approach': 'storm-approach 30s linear infinite',
        'wipe-right': 'wipe-right 500ms ease-out forwards',
        'wipe-down': 'wipe-down 500ms ease-out forwards',

        // Ticker
        slide: 'slide 20s linear infinite',

        // Signature
        'draw-path': 'draw-path 1s ease-out forwards',
        'seal-stamp': 'seal-stamp 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Loading
        shimmer: 'shimmer 2s linear infinite',
        'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',

        // Success
        'check-in': 'check-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // =======================================================================
      // Z-INDEX SCALE
      // =======================================================================
      zIndex: {
        dropdown: '100',
        sticky: '200',
        fixed: '300',
        'modal-backdrop': '400',
        modal: '500',
        popover: '600',
        tooltip: '700',
        toast: '800',
        alert: '900',
        cinematic: '1000',
      },

      // =======================================================================
      // SCREENS (Breakpoints)
      // =======================================================================
      screens: {
        mobile: '375px',
        'mobile-lg': '428px',
        tablet: '768px',
        'tablet-lg': '1024px',
        desktop: '1280px',
        'desktop-lg': '1536px',
        ultrawide: '1920px',
      },

      // =======================================================================
      // BACKDROP BLUR
      // =======================================================================
      backdropBlur: {
        xs: '2px',
      },

      // =======================================================================
      // ASPECT RATIO
      // =======================================================================
      aspectRatio: {
        'card': '2.5 / 3.5',
        'wide': '16 / 9',
        'ultra': '21 / 9',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
