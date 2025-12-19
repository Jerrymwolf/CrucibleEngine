'use client';

/**
 * TeamDefinitionsDialog Component
 *
 * Phase 2.2: Team Values Alignment - Define Together
 *
 * For each team value, teams collaboratively define:
 * 1. What does this value mean to US? (not dictionary definition)
 * 2. What behaviors show we're LIVING it?
 * 3. What behaviors show we're NOT living it?
 *
 * This creates behavioral anchors for the debrief gap analysis.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCountdown } from '@/hooks/useTimer';
import type { TeamValueDefinition } from '@crucible/shared';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Timer,
  Sparkles,
  Users,
  Plus,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamDefinitionsDialogProps {
  teamValues: string[];
  teamName: string;
  onComplete: (definitions: TeamValueDefinition[]) => void;
}

interface ValueDefinitionForm {
  value: string;
  teamDefinition: string;
  livingIt: string[];
  violatingIt: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFINITION_TIME_PER_VALUE = 3 * 60; // 3 minutes per value
const MIN_BEHAVIORS = 2; // Minimum behaviors for each category

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface BehaviorInputProps {
  behaviors: string[];
  onAdd: (behavior: string) => void;
  onRemove: (index: number) => void;
  type: 'living' | 'violating';
  placeholder: string;
}

function BehaviorInput({ behaviors, onAdd, onRemove, type, placeholder }: BehaviorInputProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim() && behaviors.length < 5) {
      onAdd(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const isLiving = type === 'living';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isLiving ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <span className="font-semibold">
          {isLiving ? "What does LIVING this value look like?" : "What does VIOLATING this value look like?"}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLiving
          ? "Describe specific behaviors that show your team is honoring this value."
          : "Describe specific behaviors that would show your team is NOT living this value."}
      </p>

      {/* Existing behaviors */}
      <div className="space-y-2">
        {behaviors.map((behavior, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-start gap-2 p-2 rounded-lg',
              isLiving ? 'bg-green-500/10' : 'bg-red-500/10'
            )}
          >
            <span
              className={cn('text-sm flex-1', isLiving ? 'text-green-500' : 'text-red-500')}
            >
              {behavior}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add new behavior */}
      {behaviors.length < 5 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-muted/50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!input.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{behaviors.length}/5 behaviors</span>
        {behaviors.length < MIN_BEHAVIORS && (
          <span className="text-yellow-500">(need at least {MIN_BEHAVIORS})</span>
        )}
      </div>
    </div>
  );
}

interface ValueProgressProps {
  values: string[];
  currentIndex: number;
  completedIndices: Set<number>;
}

function ValueProgress({ values, currentIndex, completedIndices }: ValueProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {values.map((value, index) => (
        <motion.div
          key={value}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
            index === currentIndex
              ? 'bg-primary text-primary-foreground'
              : completedIndices.has(index)
                ? 'bg-green-500/20 text-green-500'
                : 'bg-muted text-muted-foreground'
          )}
          animate={{
            scale: index === currentIndex ? 1.05 : 1,
          }}
        >
          {completedIndices.has(index) && <CheckCircle2 className="h-3 w-3" />}
          <span className="truncate max-w-[80px]">{value}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamDefinitionsDialog({
  teamValues,
  teamName,
  onComplete,
}: TeamDefinitionsDialogProps) {
  const [step, setStep] = useState<'intro' | 'define' | 'review'>('intro');
  const [currentValueIndex, setCurrentValueIndex] = useState(0);
  const [definitions, setDefinitions] = useState<ValueDefinitionForm[]>(
    teamValues.map((value) => ({
      value,
      teamDefinition: '',
      livingIt: [],
      violatingIt: [],
    }))
  );
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());

  const currentValue = teamValues[currentValueIndex];
  const currentDefinition = definitions[currentValueIndex];

  // Timer for each value definition
  const timer = useCountdown(DEFINITION_TIME_PER_VALUE, {
    autoStart: false,
    onComplete: () => {
      // Auto-advance if current definition is valid
      if (isCurrentDefinitionValid()) {
        handleNext();
      }
    },
  });

  // Check if current definition is valid
  const isCurrentDefinitionValid = useCallback(() => {
    const def = definitions[currentValueIndex];
    return (
      def.teamDefinition.trim().length >= 10 &&
      def.livingIt.length >= MIN_BEHAVIORS &&
      def.violatingIt.length >= MIN_BEHAVIORS
    );
  }, [definitions, currentValueIndex]);

  // Update definition
  const updateDefinition = useCallback(
    (updates: Partial<ValueDefinitionForm>) => {
      setDefinitions((prev) => {
        const newDefs = [...prev];
        newDefs[currentValueIndex] = { ...newDefs[currentValueIndex], ...updates };
        return newDefs;
      });
    },
    [currentValueIndex]
  );

  // Add/remove behaviors
  const addLivingBehavior = useCallback(
    (behavior: string) => {
      updateDefinition({ livingIt: [...currentDefinition.livingIt, behavior] });
    },
    [updateDefinition, currentDefinition.livingIt]
  );

  const removeLivingBehavior = useCallback(
    (index: number) => {
      updateDefinition({ livingIt: currentDefinition.livingIt.filter((_, i) => i !== index) });
    },
    [updateDefinition, currentDefinition.livingIt]
  );

  const addViolatingBehavior = useCallback(
    (behavior: string) => {
      updateDefinition({ violatingIt: [...currentDefinition.violatingIt, behavior] });
    },
    [updateDefinition, currentDefinition.violatingIt]
  );

  const removeViolatingBehavior = useCallback(
    (index: number) => {
      updateDefinition({
        violatingIt: currentDefinition.violatingIt.filter((_, i) => i !== index),
      });
    },
    [updateDefinition, currentDefinition.violatingIt]
  );

  // Navigation
  const handleStart = () => {
    setStep('define');
    timer.start();
  };

  const handleNext = () => {
    if (isCurrentDefinitionValid()) {
      setCompletedIndices((prev) => new Set([...prev, currentValueIndex]));

      if (currentValueIndex < teamValues.length - 1) {
        setCurrentValueIndex((prev) => prev + 1);
        timer.reset();
        timer.start();
      } else {
        setStep('review');
        timer.reset();
      }
    }
  };

  const handlePrevious = () => {
    if (currentValueIndex > 0) {
      setCurrentValueIndex((prev) => prev - 1);
      timer.reset();
      timer.start();
    }
  };

  const handleEditValue = (index: number) => {
    setCurrentValueIndex(index);
    setStep('define');
    timer.reset();
    timer.start();
  };

  const handleComplete = () => {
    // Convert to TeamValueDefinition format
    const finalDefinitions: TeamValueDefinition[] = definitions.map((def) => ({
      value: def.value,
      teamDefinition: def.teamDefinition,
      livingIt: def.livingIt,
      violatingIt: def.violatingIt,
    }));
    onComplete(finalDefinitions);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen p-4">
      <AnimatePresence mode="wait">
        {/* Introduction */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto space-y-6 text-center"
          >
            <div className="space-y-2">
              <BookOpen className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-3xl font-bold">Define Your Team Values</h1>
              <p className="text-muted-foreground">Team {teamName}</p>
            </div>

            <div className="p-6 bg-muted/30 rounded-xl space-y-4 text-left">
              <p className="text-lg">
                Now that you&apos;ve selected your 5 team values, it&apos;s time to define what they mean to
                <span className="font-semibold text-primary"> your team specifically</span>.
              </p>

              <div className="space-y-3">
                <p className="text-muted-foreground">For each value, you&apos;ll answer:</p>

                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>What does this value mean to US? (not dictionary definition)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>What behaviors show we&apos;re LIVING it?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>What behaviors show we&apos;re NOT living it?</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-500">
                  <strong>Why this matters:</strong> During the simulation, we&apos;ll hold you
                  accountable to YOUR definitions, not ours. Be specific and honest about what
                  these values really mean to your team.
                </p>
              </div>
            </div>

            {/* Values Preview */}
            <div className="flex flex-wrap justify-center gap-2">
              {teamValues.map((value) => (
                <span key={value} className="px-3 py-1 bg-primary/20 text-primary rounded-full">
                  {value}
                </span>
              ))}
            </div>

            <Button onClick={handleStart} size="lg" className="w-full">
              Begin Definitions
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Define Each Value */}
        {step === 'define' && (
          <motion.div
            key="define"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Progress and Timer */}
            <div className="space-y-4">
              <ValueProgress
                values={teamValues}
                currentIndex={currentValueIndex}
                completedIndices={completedIndices}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Value {currentValueIndex + 1} of {teamValues.length}
                </span>
                <div className="flex items-center gap-2 text-lg font-mono">
                  <Timer className="h-5 w-5 text-muted-foreground" />
                  <span className={cn(timer.time < 60 && 'text-yellow-500')}>
                    {formatTime(timer.time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Value */}
            <div className="text-center">
              <motion.h2
                key={currentValue}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl font-bold text-primary"
              >
                {currentValue}
              </motion.h2>
            </div>

            {/* Definition Form */}
            <motion.div
              key={`form-${currentValueIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Team Definition */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-5 w-5 text-primary" />
                  What does &ldquo;{currentValue}&rdquo; mean to your team?
                </label>
                <p className="text-sm text-muted-foreground">
                  Not the dictionary definition. What does it mean when YOUR team lives this value?
                </p>
                <Textarea
                  value={currentDefinition.teamDefinition}
                  onChange={(e) => updateDefinition({ teamDefinition: e.target.value })}
                  placeholder={`To our team, ${currentValue} means...`}
                  className="min-h-[100px]"
                />
                {currentDefinition.teamDefinition.trim().length > 0 &&
                  currentDefinition.teamDefinition.trim().length < 10 && (
                    <p className="text-xs text-yellow-500">Please write at least 10 characters</p>
                  )}
              </div>

              {/* Living Behaviors */}
              <BehaviorInput
                behaviors={currentDefinition.livingIt}
                onAdd={addLivingBehavior}
                onRemove={removeLivingBehavior}
                type="living"
                placeholder={`e.g., "We speak up when we disagree, even with leaders"`}
              />

              {/* Violating Behaviors */}
              <BehaviorInput
                behaviors={currentDefinition.violatingIt}
                onAdd={addViolatingBehavior}
                onRemove={removeViolatingBehavior}
                type="violating"
                placeholder={`e.g., "We stay silent to avoid conflict"`}
              />
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentValueIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <Button onClick={handleNext} disabled={!isCurrentDefinitionValid()}>
                {currentValueIndex === teamValues.length - 1 ? 'Review All' : 'Next Value'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Review All Definitions */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-3xl font-bold">Review Your Definitions</h1>
              <p className="text-muted-foreground">
                Make sure these accurately reflect what your team agreed on.
              </p>
            </div>

            {/* All Definitions */}
            <div className="space-y-4">
              {definitions.map((def, index) => (
                <motion.div
                  key={def.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-muted/30 rounded-xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-primary">{def.value}</h3>
                    <Button variant="ghost" size="sm" onClick={() => handleEditValue(index)}>
                      Edit
                    </Button>
                  </div>

                  <p className="text-sm italic">&ldquo;{def.teamDefinition}&rdquo;</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm font-semibold text-green-500">
                        <CheckCircle2 className="h-4 w-4" />
                        Living It
                      </div>
                      <ul className="space-y-1">
                        {def.livingIt.map((b, i) => (
                          <li key={i} className="text-sm text-muted-foreground pl-4">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm font-semibold text-red-500">
                        <XCircle className="h-4 w-4" />
                        Violating It
                      </div>
                      <ul className="space-y-1">
                        {def.violatingIt.map((b, i) => (
                          <li key={i} className="text-sm text-muted-foreground pl-4">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Confirm */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-center">
                These definitions will be used to evaluate your decisions during the simulation.
                <br />
                <span className="text-primary font-semibold">
                  You&apos;ll be held to YOUR words, not ours.
                </span>
              </p>
            </div>

            <Button onClick={handleComplete} size="lg" className="w-full">
              Confirm Definitions
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
