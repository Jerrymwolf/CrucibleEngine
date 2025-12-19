'use client';

/**
 * ValuesMeaningForm Component
 *
 * For each of the top 3 values, participants define:
 * 1. What this value means to YOU (not dictionary definition)
 * 2. What behaviors show you're living it
 * 3. What it feels like when honored
 * 4. What it feels like when violated
 *
 * Includes a brief pair share at the end.
 *
 * POLISH FEATURES:
 * - Sound effects for form interactions
 * - Smooth card flip transitions
 * - Character count indicators
 * - Visual completion feedback
 * - Enhanced pair share screen
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { VALUES_DECK, type ValueCard } from '@crucible/shared';
import type { ValueMeaning } from '@crucible/shared';
import { usePreCrisisStore } from '@/stores/preCrisisStore';
import { useSound } from '@/hooks/useSound';
import {
  Check,
  ChevronRight,
  Heart,
  AlertTriangle,
  Eye,
  Lightbulb,
  Sparkles,
  Users,
  MessageCircle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ValueMeaningFormData {
  personalDefinition: string;
  livingBehaviors: string[];
  honoredFeeling: string;
  violatedFeeling: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface ValuesMeaningFormProps {
  topFiveValues: string[];
  onComplete: (meanings: Map<string, ValueMeaning>) => void;
}

// Field completion threshold characters
const FIELD_THRESHOLDS = {
  personalDefinition: 10,
  honoredFeeling: 5,
  violatedFeeling: 5,
  behavior: 3,
};

export function ValuesMeaningForm({ topFiveValues, onComplete }: ValuesMeaningFormProps) {
  // Only process top 3 values
  const valuesToDefine = topFiveValues.slice(0, 3);

  // Store
  const { valuesMeaning, setValueMeaning, setCurrentMeaningIndex, completeMeanings } =
    usePreCrisisStore();

  // Sound effects
  const { play: playSound } = useSound();

  // Local state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<ValueMeaningFormData>({
    personalDefinition: '',
    livingBehaviors: ['', '', ''],
    honoredFeeling: '',
    violatedFeeling: '',
  });
  const [showPairShare, setShowPairShare] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  // Get current value
  const currentValueId = valuesToDefine[currentIndex];
  const currentCard = VALUES_DECK.find((c) => c.id === currentValueId);

  // Check if current form is complete
  const isCurrentFormComplete = () => {
    return (
      formData.personalDefinition.trim().length > 10 &&
      formData.livingBehaviors.filter((b) => b.trim()).length >= 2 &&
      formData.honoredFeeling.trim().length > 5 &&
      formData.violatedFeeling.trim().length > 5
    );
  };

  // Save current meaning and advance
  const handleNext = () => {
    if (!currentValueId || !currentCard) return;

    playSound('ui', 'success');

    const meaning: ValueMeaning = {
      value: currentCard.name,
      personalDefinition: formData.personalDefinition.trim(),
      livingBehaviors: formData.livingBehaviors.filter((b) => b.trim()),
      honoredFeeling: formData.honoredFeeling.trim(),
      violatedFeeling: formData.violatedFeeling.trim(),
    };

    setValueMeaning(currentValueId, meaning);

    // Show completion effect
    setShowCompletionEffect(true);
    setTimeout(() => setShowCompletionEffect(false), 500);

    if (currentIndex < valuesToDefine.length - 1) {
      // Transition animation
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setCurrentMeaningIndex(currentIndex + 1);
        setFormData({
          personalDefinition: '',
          livingBehaviors: ['', '', ''],
          honoredFeeling: '',
          violatedFeeling: '',
        });
        setIsTransitioning(false);
      }, 300);
    } else {
      // All done - show pair share
      playSound('dramatic', 'phaseTransition');
      setTimeout(() => setShowPairShare(true), 500);
    }
  };

  // Complete and advance
  const handleComplete = () => {
    playSound('dramatic', 'commitmentSeal');
    completeMeanings();
    onComplete(valuesMeaning.meanings);
  };

  // Calculate field completion percentages
  const getFieldProgress = (value: string, threshold: number) => {
    const length = value.trim().length;
    return Math.min(100, (length / threshold) * 100);
  };

  const behaviorsComplete = formData.livingBehaviors.filter(
    (b) => b.trim().length >= FIELD_THRESHOLDS.behavior
  ).length;

  // Update behavior at index
  const updateBehavior = (index: number, value: string) => {
    setFormData((prev) => {
      const behaviors = [...prev.livingBehaviors];
      behaviors[index] = value;
      return { ...prev, livingBehaviors: behaviors };
    });
  };

  // Progress
  const progress = ((currentIndex + 1) / valuesToDefine.length) * 100;

  // ============================================================================
  // RENDER
  // ============================================================================

  // Pair Share screen
  if (showPairShare) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel max-w-lg text-center space-y-6"
        >
          {/* Animated icon */}
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="h-10 w-10 text-primary" />
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold">Brief Pair Share</h2>
            <p className="text-muted-foreground mt-1">Connect with a partner</p>
          </div>

          {/* Steps with icons */}
          <div className="text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">5</span>
              minutes with a partner
            </div>

            <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-3">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Choose & Share</div>
                  <div className="text-xs text-muted-foreground">Pick ONE value and share what it means to you personally</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <MessageCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Active Listening</div>
                  <div className="text-xs text-muted-foreground">Your partner reflects back—no advice, just understanding</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Switch Roles</div>
                  <div className="text-xs text-muted-foreground">Then let your partner share their value</div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground italic">
              &quot;Often others see our values more clearly than we do ourselves.&quot;
            </p>
          </div>

          <Button onClick={handleComplete} size="lg" className="w-full gap-2">
            <Check className="h-4 w-4" />
            I have completed the pair share
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!currentCard) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 relative">
      {/* Completion effect overlay */}
      <AnimatePresence>
        {showCompletionEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-12 w-12 text-green-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">What Does This Value Mean to You?</h1>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {valuesToDefine.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Value Card with flip animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentValueId}
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl text-center relative overflow-hidden',
              isTransitioning && 'opacity-50'
            )}
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-2 right-2">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="absolute bottom-2 left-2">
                <Heart className="h-6 w-6" />
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative z-10"
            >
              <div className="text-3xl font-bold text-primary mb-2">{currentCard.name}</div>
              <div className="text-sm text-muted-foreground">{currentCard.definition}</div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Form */}
        <div className="space-y-6">
          {/* Personal Definition */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <Lightbulb className="h-4 w-4 text-primary" />
              What does {currentCard.name} mean to YOU?
            </label>
            <p className="text-xs text-muted-foreground">
              Not the dictionary definition—what does it mean in YOUR life?
            </p>
            <Textarea
              value={formData.personalDefinition}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, personalDefinition: e.target.value }))
              }
              placeholder="To me, this value means..."
              className="min-h-[80px]"
            />
          </div>

          {/* Living Behaviors */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <Eye className="h-4 w-4 text-primary" />
              What behaviors show you are living this value?
            </label>
            <p className="text-xs text-muted-foreground">
              List 2-3 specific, observable behaviors
            </p>
            <div className="space-y-2">
              {formData.livingBehaviors.map((behavior, i) => (
                <input
                  key={i}
                  type="text"
                  value={behavior}
                  onChange={(e) => updateBehavior(i, e.target.value)}
                  placeholder={`Behavior ${i + 1}...`}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                />
              ))}
            </div>
          </div>

          {/* Honored Feeling */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <Heart className="h-4 w-4 text-green-500" />
              What does it feel like when this value is honored?
            </label>
            <Textarea
              value={formData.honoredFeeling}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, honoredFeeling: e.target.value }))
              }
              placeholder="When this value is honored, I feel..."
              className="min-h-[60px]"
            />
          </div>

          {/* Violated Feeling */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              What does it feel like when this value is violated?
            </label>
            <Textarea
              value={formData.violatedFeeling}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, violatedFeeling: e.target.value }))
              }
              placeholder="When this value is violated, I feel..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            {valuesToDefine.map((valueId, i) => {
              const card = VALUES_DECK.find((c) => c.id === valueId);
              const isComplete = valuesMeaning.meanings.has(valueId);
              const isCurrent = i === currentIndex;

              return (
                <div
                  key={valueId}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete && <Check className="inline h-3 w-3 mr-1" />}
                  {card?.name || valueId}
                </div>
              );
            })}
          </div>

          <Button onClick={handleNext} disabled={!isCurrentFormComplete()}>
            {currentIndex < valuesToDefine.length - 1 ? (
              <>
                Next Value
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              'Complete'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
