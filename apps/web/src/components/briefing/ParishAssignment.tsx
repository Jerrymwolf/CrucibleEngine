'use client';

/**
 * ParishAssignment Component
 *
 * Dramatic reveal of the player's assigned parish with animated map zoom,
 * parish details, and responsibilities briefing.
 *
 * Features:
 * - Map zoom animation to assigned parish
 * - Parish details with population, resources, vulnerabilities
 * - Key stakeholders and responsibilities
 * - Cinematic reveal sequence
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { PARISHES, type ParishId } from '@crucible/shared';
import {
  MapPin,
  Users,
  Zap,
  Droplets,
  Home,
  AlertTriangle,
  ChevronRight,
  Shield,
  Building,
  Factory,
  Anchor,
  Plane,
  Mountain,
  Hospital,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// TYPES
// ============================================================================

export interface ParishAssignmentProps {
  parishId: ParishId;
  teamName: string;
  onContinue: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PARISH_ICONS: Record<string, React.ReactNode> = {
  keystone: <Factory className="h-6 w-6" />,
  haven: <Anchor className="h-6 w-6" />,
  gateway: <Plane className="h-6 w-6" />,
  heartland: <Zap className="h-6 w-6" />,
  summit: <Mountain className="h-6 w-6" />,
  sterling: <Hospital className="h-6 w-6" />,
};

const PARISH_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  keystone: { primary: 'text-purple-500', secondary: 'bg-purple-500/20', glow: 'shadow-purple-500/30' },
  haven: { primary: 'text-blue-500', secondary: 'bg-blue-500/20', glow: 'shadow-blue-500/30' },
  gateway: { primary: 'text-amber-500', secondary: 'bg-amber-500/20', glow: 'shadow-amber-500/30' },
  heartland: { primary: 'text-red-500', secondary: 'bg-red-500/20', glow: 'shadow-red-500/30' },
  summit: { primary: 'text-indigo-500', secondary: 'bg-indigo-500/20', glow: 'shadow-indigo-500/30' },
  sterling: { primary: 'text-teal-500', secondary: 'bg-teal-500/20', glow: 'shadow-teal-500/30' },
};

const RESOURCE_LEVELS: Record<string, { value: number; label: string }> = {
  low: { value: 30, label: 'Limited' },
  medium: { value: 60, label: 'Adequate' },
  high: { value: 90, label: 'Well-Stocked' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AnimatedMap({ parishId, phase }: { parishId: string; phase: 'overview' | 'zoom' | 'focused' }) {
  const parish = Object.values(PARISHES).find((p) => p.id === parishId);
  if (!parish) return null;

  const colors = PARISH_COLORS[parishId] || PARISH_COLORS.sterling;

  return (
    <div className="relative w-full aspect-[4/3] bg-slate-900/50 rounded-xl overflow-hidden border border-white/10">
      {/* Island SVG */}
      <motion.svg
        viewBox="0 0 100 75"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        animate={{
          scale: phase === 'zoom' ? 2 : phase === 'focused' ? 2.5 : 1,
          x: phase !== 'overview' ? `${50 - parish.position.x}%` : '0%',
          y: phase !== 'overview' ? `${37.5 - parish.position.y}%` : '0%',
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Island shape */}
        <path
          d="M 15 35
             Q 10 25, 25 15
             Q 45 5, 70 15
             Q 90 20, 90 40
             Q 92 55, 75 65
             Q 55 75, 35 70
             Q 15 65, 10 50
             Q 8 40, 15 35 Z"
          fill="hsl(217 33% 17%)"
          stroke="hsl(217 33% 25%)"
          strokeWidth="0.5"
        />

        {/* Mountain range */}
        <path
          d="M 40 20 L 45 12 L 50 18 L 55 10 L 60 20"
          fill="none"
          stroke="hsl(217 33% 30%)"
          strokeWidth="0.5"
        />

        {/* Parish markers */}
        {Object.values(PARISHES).map((p) => {
          const isTarget = p.id === parishId;
          const pColors = PARISH_COLORS[p.id] || PARISH_COLORS.sterling;

          return (
            <g key={p.id}>
              {/* Glow effect for target */}
              {isTarget && phase !== 'overview' && (
                <motion.circle
                  cx={p.position.x}
                  cy={p.position.y}
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  className={pColors.primary}
                  strokeWidth="0.5"
                  initial={{ r: 3, opacity: 0 }}
                  animate={{ r: 8, opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <circle
                cx={p.position.x}
                cy={p.position.y}
                r={isTarget && phase !== 'overview' ? 3 : 2}
                className={cn(
                  'fill-current',
                  isTarget ? pColors.primary : 'text-muted-foreground/50'
                )}
              />
              {/* Label */}
              <text
                x={p.position.x}
                y={p.position.y + 6}
                textAnchor="middle"
                className={cn(
                  'text-[3px] font-semibold fill-current',
                  isTarget ? pColors.primary : 'text-muted-foreground/50'
                )}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </motion.svg>

      {/* Targeting overlay */}
      <AnimatePresence>
        {phase === 'focused' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Corner brackets */}
            <div className={cn('absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2', colors.primary.replace('text-', 'border-'))} />
            <div className={cn('absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2', colors.primary.replace('text-', 'border-'))} />
            <div className={cn('absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2', colors.primary.replace('text-', 'border-'))} />
            <div className={cn('absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2', colors.primary.replace('text-', 'border-'))} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceBar({ label, level, icon }: { label: string; level: string; icon: React.ReactNode }) {
  const resourceInfo = RESOURCE_LEVELS[level] || RESOURCE_LEVELS.medium;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-xs">{resourceInfo.label}</span>
      </div>
      <Progress value={resourceInfo.value} className="h-1.5" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ParishAssignment({
  parishId,
  teamName,
  onContinue,
  className,
}: ParishAssignmentProps) {
  const [phase, setPhase] = useState<'intro' | 'zoom' | 'reveal' | 'details'>('intro');
  const { play: playSound } = useSound();

  const parish = PARISHES[parishId];
  const colors = PARISH_COLORS[parish.id] || PARISH_COLORS.sterling;
  const icon = PARISH_ICONS[parish.id] || <Building className="h-6 w-6" />;

  // Animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setPhase('zoom');
        playSound('ui', 'notification');
      }, 2000),
      setTimeout(() => {
        setPhase('reveal');
        playSound('dramatic', 'consequenceReveal');
      }, 4000),
      setTimeout(() => {
        setPhase('details');
        playSound('ui', 'success');
      }, 5500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [playSound]);

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-b from-background to-muted/20 p-6',
        className
      )}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm text-muted-foreground mb-2">
            Team {teamName}
          </div>
          <h1 className="text-3xl font-bold">
            {phase === 'intro' && 'Locating Your Assignment...'}
            {phase === 'zoom' && 'Zeroing In...'}
            {(phase === 'reveal' || phase === 'details') && 'Your Parish'}
          </h1>
        </motion.div>

        {/* Map */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatedMap
            parishId={parish.id}
            phase={phase === 'intro' ? 'overview' : phase === 'zoom' ? 'zoom' : 'focused'}
          />
        </motion.div>

        {/* Parish Reveal */}
        <AnimatePresence>
          {(phase === 'reveal' || phase === 'details') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <motion.div
                className={cn(
                  'inline-flex items-center gap-3 px-6 py-3 rounded-xl border shadow-lg',
                  colors.secondary,
                  colors.glow
                )}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className={colors.primary}>{icon}</div>
                <div className="text-left">
                  <div className={cn('text-2xl font-bold', colors.primary)}>
                    {parish.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {parish.description}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parish Details */}
        <AnimatePresence>
          {phase === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-2 gap-6 mb-8"
            >
              {/* Population & Stats */}
              <motion.div
                className="p-5 bg-card/50 rounded-xl border border-border"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Population & Community
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Population</span>
                    <span className="text-2xl font-mono font-bold">
                      {parish.population.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meridian Employees</span>
                    <span className="font-mono">
                      {parish.meridianPercent}%
                    </span>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{parish.classCharacter.whoLivesHere}&rdquo;
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Resources */}
              <motion.div
                className="p-5 bg-card/50 rounded-xl border border-border"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Available Resources
                </h3>

                <div className="space-y-3">
                  <ResourceBar
                    label="Generators"
                    level={parish.resources.generators >= 15 ? 'high' : parish.resources.generators >= 8 ? 'medium' : 'low'}
                    icon={<Zap className="h-3 w-3" />}
                  />
                  <ResourceBar
                    label="Medical Supplies"
                    level={parish.resources.medicalSupplies}
                    icon={<Hospital className="h-3 w-3" />}
                  />
                  <ResourceBar
                    label="Water"
                    level={parish.resources.water}
                    icon={<Droplets className="h-3 w-3" />}
                  />
                  <ResourceBar
                    label="Shelter Capacity"
                    level={parish.resources.shelterCapacity >= 3000 ? 'high' : parish.resources.shelterCapacity >= 1500 ? 'medium' : 'low'}
                    icon={<Home className="h-3 w-3" />}
                  />
                </div>
              </motion.div>

              {/* Vulnerabilities */}
              <motion.div
                className="md:col-span-2 p-5 bg-red-500/5 rounded-xl border border-red-500/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Known Vulnerabilities
                </h3>

                <div className="flex flex-wrap gap-2">
                  {parish.vulnerabilities.map((vuln, i) => (
                    <motion.span
                      key={vuln}
                      className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-sm text-red-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      {vuln}
                    </motion.span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mt-3 italic">
                  &ldquo;{parish.classCharacter.whatTheyFear}&rdquo;
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Button */}
        <AnimatePresence>
          {phase === 'details' && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                size="lg"
                onClick={() => {
                  playSound('dramatic', 'phaseTransition');
                  onContinue();
                }}
                className={cn(
                  'px-8',
                  'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
                )}
              >
                <span>Review Team Values</span>
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Remind yourselves what you stand for before the storm hits
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ParishAssignment;
