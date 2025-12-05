import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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
          safe: 'hsl(142, 76%, 36%)',
          warning: 'hsl(38, 92%, 50%)',
          danger: 'hsl(0, 84%, 60%)',
          critical: 'hsl(0, 100%, 50%)',
          info: 'hsl(199, 89%, 48%)',
        },
        // Parish colors
        parish: {
          haven: 'hsl(199, 89%, 48%)', // Blue - maritime
          summit: 'hsl(142, 76%, 36%)', // Green - agriculture
          gateway: 'hsl(38, 92%, 50%)', // Amber - tourism
          heartland: 'hsl(0, 84%, 60%)', // Red - medical/power
          sterling: 'hsl(265, 89%, 48%)', // Purple - government
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'breaking-flash': {
          '0%, 100%': { backgroundColor: 'hsl(0, 84%, 60%)' },
          '50%': { backgroundColor: 'hsl(0, 100%, 50%)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'breaking-flash': 'breaking-flash 1s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
