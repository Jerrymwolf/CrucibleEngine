'use client';

/**
 * NotableMomentBadge Component
 *
 * Visual indicator for decisions that significantly tested team values.
 * Used in:
 * - DilemmaPresenter (for pivotal decisions)
 * - ConsequenceReveal (for notable outcomes)
 * - Decision Timeline (in debrief)
 *
 * Features:
 * - Animated glow effect
 * - Optional tooltip with reason
 * - Different sizes for different contexts
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, Star, AlertTriangle, Heart, Shield } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type NotableMomentType =
  | 'pivotal'      // Major decision point
  | 'values-gap'   // Action contradicted stated values
  | 'sacrifice'    // Difficult trade-off made
  | 'leadership'   // Strong values-aligned action
  | 'turning-point'; // Changed the course of events

export interface NotableMomentBadgeProps {
  type: NotableMomentType;
  reason?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MOMENT_CONFIG: Record<NotableMomentType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  glowColor: string;
}> = {
  pivotal: {
    icon: <Sparkles className="h-full w-full" />,
    label: 'Pivotal Decision',
    color: 'text-amber-400',
    bgColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
    glowColor: 'shadow-amber-500/50',
  },
  'values-gap': {
    icon: <AlertTriangle className="h-full w-full" />,
    label: 'Values Gap',
    color: 'text-red-400',
    bgColor: 'bg-gradient-to-r from-red-500 to-pink-500',
    glowColor: 'shadow-red-500/50',
  },
  sacrifice: {
    icon: <Heart className="h-full w-full" />,
    label: 'Sacrifice Made',
    color: 'text-purple-400',
    bgColor: 'bg-gradient-to-r from-purple-500 to-violet-500',
    glowColor: 'shadow-purple-500/50',
  },
  leadership: {
    icon: <Shield className="h-full w-full" />,
    label: 'Values Leadership',
    color: 'text-green-400',
    bgColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
    glowColor: 'shadow-green-500/50',
  },
  'turning-point': {
    icon: <Star className="h-full w-full" />,
    label: 'Turning Point',
    color: 'text-blue-400',
    bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    glowColor: 'shadow-blue-500/50',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1',
    icon: 'h-3 w-3',
    text: 'text-[10px]',
    iconOnly: 'w-6 h-6',
  },
  md: {
    badge: 'px-3 py-1.5',
    icon: 'h-4 w-4',
    text: 'text-xs',
    iconOnly: 'w-8 h-8',
  },
  lg: {
    badge: 'px-4 py-2',
    icon: 'h-5 w-5',
    text: 'text-sm',
    iconOnly: 'w-10 h-10',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotableMomentBadge({
  type,
  reason,
  size = 'md',
  showLabel = true,
  animate = true,
  className,
}: NotableMomentBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = MOMENT_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Glow effect */}
      {animate && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full blur-md',
            config.bgColor
          )}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Badge */}
      <motion.div
        initial={animate ? { scale: 0, rotate: -10 } : undefined}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.05 }}
        className={cn(
          'relative flex items-center gap-1.5 rounded-full text-white font-semibold shadow-lg',
          config.bgColor,
          config.glowColor,
          showLabel ? sizeConfig.badge : sizeConfig.iconOnly,
          !showLabel && 'justify-center'
        )}
      >
        <span className={cn(config.color, sizeConfig.icon)}>
          {config.icon}
        </span>
        {showLabel && (
          <span className={sizeConfig.text}>{config.label}</span>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && reason && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-card border rounded-lg shadow-xl text-xs max-w-[200px] whitespace-normal"
          >
            <div className="font-semibold mb-1">{config.label}</div>
            <p className="text-muted-foreground">{reason}</p>

            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-l border-t rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VARIANT EXPORTS
// ============================================================================

export function PivotalBadge(props: Omit<NotableMomentBadgeProps, 'type'>) {
  return <NotableMomentBadge type="pivotal" {...props} />;
}

export function ValuesGapBadge(props: Omit<NotableMomentBadgeProps, 'type'>) {
  return <NotableMomentBadge type="values-gap" {...props} />;
}

export function SacrificeBadge(props: Omit<NotableMomentBadgeProps, 'type'>) {
  return <NotableMomentBadge type="sacrifice" {...props} />;
}

export function LeadershipBadge(props: Omit<NotableMomentBadgeProps, 'type'>) {
  return <NotableMomentBadge type="leadership" {...props} />;
}

export function TurningPointBadge(props: Omit<NotableMomentBadgeProps, 'type'>) {
  return <NotableMomentBadge type="turning-point" {...props} />;
}

export default NotableMomentBadge;
