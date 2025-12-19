'use client';

/**
 * StormApproach Component
 *
 * Dramatic briefing screen showing Hurricane Midas approaching Concordia.
 * Features animated storm visualization, countdown, and tension-building narrative.
 *
 * Displayed during the briefing phase before the crisis begins.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  CloudLightning,
  Wind,
  AlertTriangle,
  Radio,
  Clock,
  MapPin,
  Waves,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface StormApproachProps {
  hurricaneName: string;
  category: number;
  hoursToImpact: number;
  trajectory: 'direct' | 'glancing' | 'miss-north' | 'miss-south' | 'stall';
  windSpeed: number;
  onContinue: () => void;
  className?: string;
}

interface BriefingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  alert?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORM_FACTS = [
  'Category 4+ hurricanes have sustained winds over 130 mph',
  'Storm surge can reach 15-20 feet above normal tide',
  'Power outages can last weeks after major hurricanes',
  'Evacuation routes become impassable 6-12 hours before landfall',
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AnimatedStormIcon({ category }: { category: number }) {
  return (
    <div className="relative w-40 h-40 mx-auto">
      {/* Outer rotating rings */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-amber-500/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-4 rounded-full border-2 border-amber-500/40"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-8 rounded-full border-2 border-red-500/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center icon */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
          <CloudLightning className="h-10 w-10 text-white" />
        </div>
      </motion.div>

      {/* Category indicator */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 rounded-full text-white text-sm font-bold"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        CAT {category}
      </motion.div>
    </div>
  );
}

function CountdownDisplay({ hours }: { hours: number }) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return (
    <div className="flex items-center justify-center gap-4">
      {days > 0 && (
        <div className="text-center">
          <motion.div
            className="text-4xl font-mono font-bold text-amber-500"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {days}
          </motion.div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Days</div>
        </div>
      )}
      <div className="text-center">
        <motion.div
          className={cn(
            'text-4xl font-mono font-bold',
            hours <= 24 ? 'text-red-500' : 'text-amber-500'
          )}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {remainingHours}
        </motion.div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Hours</div>
      </div>
      <div className="text-muted-foreground text-2xl">until impact</div>
    </div>
  );
}

function BriefingCard({
  step,
  index,
  isActive,
}: {
  step: BriefingStep;
  index: number;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isActive ? 1 : 0.5, x: 0 }}
      transition={{ delay: index * 0.2 }}
      className={cn(
        'p-4 rounded-lg border transition-all',
        isActive
          ? step.alert
            ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
            : 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10'
          : 'bg-muted/30 border-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            isActive
              ? step.alert
                ? 'bg-red-500/20 text-red-500'
                : 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {step.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.content}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StormApproach({
  hurricaneName,
  category,
  hoursToImpact,
  trajectory,
  windSpeed,
  onContinue,
  className,
}: StormApproachProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const { play: playSound } = useSound();

  const trajectoryLabel = {
    direct: 'DIRECT HIT EXPECTED',
    glancing: 'GLANCING BLOW',
    'miss-north': 'PASSING NORTH',
    'miss-south': 'PASSING SOUTH',
    stall: 'STALLED - UNCERTAINTY HIGH',
  }[trajectory];

  const briefingSteps: BriefingStep[] = [
    {
      id: 'storm',
      title: `Hurricane ${hurricaneName}`,
      icon: <CloudLightning className="h-5 w-5" />,
      content: `A Category ${category} hurricane with sustained winds of ${windSpeed} mph is approaching Concordia Island.`,
    },
    {
      id: 'trajectory',
      title: 'Projected Path',
      icon: <MapPin className="h-5 w-5" />,
      content: `Current models indicate: ${trajectoryLabel}. Certainty increases as the storm approaches.`,
      alert: trajectory === 'direct',
    },
    {
      id: 'timeline',
      title: 'Time Remaining',
      icon: <Clock className="h-5 w-5" />,
      content: `Estimated ${hoursToImpact} hours until impact. Conditions will deteriorate in the hours leading up to landfall.`,
      alert: hoursToImpact <= 24,
    },
    {
      id: 'comms',
      title: 'Communications',
      icon: <Radio className="h-5 w-5" />,
      content: 'Emergency broadcast systems are active. Maintain radio contact with all parishes.',
    },
  ];

  // Auto-advance through briefing steps
  useEffect(() => {
    if (currentStep < briefingSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        playSound('ui', 'notification');
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      // All steps shown, enable continue
      setTimeout(() => setShowContinue(true), 500);
    }
  }, [currentStep, briefingSteps.length, playSound]);

  // Rotate storm facts
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % STORM_FACTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Play dramatic sound on mount
  useEffect(() => {
    playSound('dramatic', 'phaseTransition');
  }, [playSound]);

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-b from-background via-amber-950/10 to-red-950/20 p-6',
        className
      )}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-500 text-sm font-semibold mb-4"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="h-4 w-4" />
            HURRICANE WATCH ISSUED
          </motion.div>
          <h1 className="text-4xl font-bold mb-2">Storm Briefing</h1>
          <p className="text-muted-foreground">
            Prepare your team for what lies ahead
          </p>
        </motion.div>

        {/* Storm Visualization */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatedStormIcon category={category} />
        </motion.div>

        {/* Countdown */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <CountdownDisplay hours={hoursToImpact} />
        </motion.div>

        {/* Briefing Steps */}
        <div className="space-y-4 mb-8">
          {briefingSteps.map((step, index) => (
            <BriefingCard
              key={step.id}
              step={step}
              index={index}
              isActive={index <= currentStep}
            />
          ))}
        </div>

        {/* Storm Fact Ticker */}
        <motion.div
          className="bg-muted/30 rounded-lg p-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Waves className="h-4 w-4" />
            <AnimatePresence mode="wait">
              <motion.span
                key={factIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {STORM_FACTS[factIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Continue Button */}
        <AnimatePresence>
          {showContinue && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Button
                size="lg"
                onClick={() => {
                  playSound('dramatic', 'phaseTransition');
                  onContinue();
                }}
                className="bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white px-8"
              >
                <span>Continue to Parish Assignment</span>
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Your team will be assigned to protect a parish
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient wind indicator */}
        <motion.div
          className="fixed bottom-4 right-4 flex items-center gap-2 text-muted-foreground/50 text-xs"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Wind className="h-4 w-4" />
          <span>Winds picking up...</span>
        </motion.div>
      </div>
    </div>
  );
}

export default StormApproach;
