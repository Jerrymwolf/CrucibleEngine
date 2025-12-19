'use client';

/**
 * ValuesStoryCapture Component
 *
 * Values Story exercise with triad witnessing:
 * 1. Individual Reflection (10 min): Write about a moment you acted from your values
 * 2. Triad Witnessing (10 min): Share in groups of 3, peers identify values they heard
 *
 * Adapted from BEI methodology—not just "tell a story" but careful framing to surface
 * pride, not shame.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { VALUES_DECK } from '@crucible/shared';
import type { ValuesStory } from '@crucible/shared';
import { useTimer, VALUES_STORY_TIMERS, formatTime } from '@/hooks/useTimer';
import { usePreCrisisStore } from '@/stores/preCrisisStore';
import { useSound } from '@/hooks/useSound';
import {
  BookOpen,
  Users,
  Timer,
  Heart,
  Check,
  ChevronRight,
  Sparkles,
  Eye,
  PenLine,
} from 'lucide-react';

// ============================================================================
// COMPONENT
// ============================================================================

export interface ValuesStoryCaptureProps {
  topFiveValues: string[];
  onComplete: (story: ValuesStory) => void;
}

export function ValuesStoryCapture({ topFiveValues, onComplete }: ValuesStoryCaptureProps) {
  // Store
  const {
    valuesStory,
    setStoryText,
    setSelfIdentifiedValues,
    setPeerIdentifiedValues,
    completeStory,
    completeTriad,
  } = usePreCrisisStore();

  // Sound effects
  const { play: playSound } = useSound();

  // Local state
  const [step, setStep] = useState<'intro' | 'write' | 'select' | 'triad-intro' | 'triad' | 'peer-values' | 'complete'>('intro');
  const [storyText, setLocalStoryText] = useState(valuesStory.storyText || '');
  const [selectedSelfValues, setSelectedSelfValues] = useState<string[]>(valuesStory.selfIdentifiedValues || []);
  const [selectedPeerValues, setSelectedPeerValues] = useState<string[]>(valuesStory.peerIdentifiedValues || []);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Timer for writing phase
  const writeTimer = useTimer({
    mode: 'countdown',
    duration: VALUES_STORY_TIMERS.individualReflection,
    warningThreshold: 60,
    onComplete: () => {
      playSound('ui', 'notification');
      // Auto-advance when time runs out
      if (step === 'write') {
        handleStoryComplete();
      }
    },
    onWarning: () => {
      playSound('dramatic', 'criticalAlert');
    },
  });

  // Timer for triad share
  const triadTimer = useTimer({
    mode: 'countdown',
    duration: VALUES_STORY_TIMERS.triadShare * 3, // 2.5 min per person x 3
    warningThreshold: 60,
    onComplete: () => {
      playSound('ui', 'notification');
    },
    onWarning: () => {
      playSound('dramatic', 'criticalAlert');
    },
  });

  // Handle story completion
  const handleStoryComplete = () => {
    playSound('ui', 'success');
    setStoryText(storyText);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('select');
      setIsTransitioning(false);
    }, 300);
  };

  // Handle self values selection
  const handleSelfValuesComplete = () => {
    playSound('ui', 'success');
    setSelfIdentifiedValues(selectedSelfValues);
    completeStory();
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('triad-intro');
      setIsTransitioning(false);
    }, 300);
  };

  // Handle peer values
  const handlePeerValuesComplete = () => {
    playSound('dramatic', 'commitmentSeal');
    setPeerIdentifiedValues(selectedPeerValues);
    completeTriad();

    const story: ValuesStory = {
      storyText,
      selfIdentifiedValues: selectedSelfValues,
      peerIdentifiedValues: selectedPeerValues,
      alignmentFlag: selectedPeerValues.length > 0 &&
        !selectedSelfValues.some((v) => selectedPeerValues.includes(v)),
    };

    onComplete(story);
  };

  // Toggle value selection
  const toggleValue = (valueId: string, list: 'self' | 'peer') => {
    if (list === 'self') {
      const isSelected = selectedSelfValues.includes(valueId);
      if (isSelected) {
        playSound('ui', 'toggle');
        setSelectedSelfValues((prev) => prev.filter((v) => v !== valueId));
      } else if (selectedSelfValues.length < 3) {
        playSound('ui', 'select');
        setSelectedSelfValues((prev) => [...prev, valueId]);
      }
    } else {
      const isSelected = selectedPeerValues.includes(valueId);
      if (isSelected) {
        playSound('ui', 'toggle');
        setSelectedPeerValues((prev) => prev.filter((v) => v !== valueId));
      } else if (selectedPeerValues.length < 3) {
        playSound('ui', 'select');
        setSelectedPeerValues((prev) => [...prev, valueId]);
      }
    }
  };

  // Get value card
  const getCard = (id: string) => VALUES_DECK.find((c) => c.id === id);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Introduction
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg text-center space-y-6"
        >
          {/* Animated icon */}
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BookOpen className="h-10 w-10 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold"
          >
            Your Values Story
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-left space-y-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20"
          >
            <p className="text-sm">
              Think of a moment when you acted from your values—a time you are{' '}
              <span className="font-semibold text-primary">proud</span> of.
            </p>
            <p className="text-sm text-muted-foreground">
              This is not about a time you struggled or failed. This is about a time
              when you showed up as the person you want to be.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-muted/30 rounded-lg text-sm"
          >
            <div className="font-semibold mb-2 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              Prompts to consider:
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-left">
              <li>What was the situation?</li>
              <li>What pressure were you facing?</li>
              <li>What did you do?</li>
              <li>What value guided your action?</li>
              <li>How did it feel?</li>
            </ul>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground"
          >
            You will have <span className="font-bold text-primary">{formatTime(VALUES_STORY_TIMERS.individualReflection)}</span> to write.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => {
                playSound('dramatic', 'phaseTransition');
                setStep('write');
                writeTimer.start();
              }}
              size="lg"
              className="w-full gap-2"
            >
              <PenLine className="h-4 w-4" />
              Begin Writing
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Writing phase
  if (step === 'write') {
    const wordCount = storyText.split(/\s+/).filter(Boolean).length;
    const minWords = 10;
    const targetWords = 100;
    const wordProgress = Math.min(100, (wordCount / targetWords) * 100);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header with timer */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PenLine className="h-5 w-5 text-primary" />
              Write Your Story
            </h2>
            <motion.div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
                writeTimer.isWarning ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-muted'
              )}
              animate={writeTimer.isWarning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.5, repeat: writeTimer.isWarning ? Infinity : 0 }}
            >
              <Timer className="h-5 w-5" />
              {writeTimer.formatted}
            </motion.div>
          </div>

          <Progress value={writeTimer.progress * 100} className="h-2" />

          {/* Prompt reminder */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg text-sm border border-primary/20"
          >
            <span className="font-medium">Remember:</span> A moment you acted from your
            values—a time you are proud of.
          </motion.div>

          {/* Story textarea */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Textarea
              value={storyText}
              onChange={(e) => setLocalStoryText(e.target.value)}
              placeholder="Set the scene... What was happening? What pressure were you facing? What did you do? What value guided you? How did it feel?"
              className="min-h-[400px] text-lg leading-relaxed focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </motion.div>

          {/* Word count and progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-sm font-medium',
                wordCount >= minWords ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {wordCount} words
              </span>
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${wordProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {wordCount >= targetWords && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="h-4 w-4 text-green-400" />
                </motion.div>
              )}
            </div>
            <Button
              onClick={handleStoryComplete}
              disabled={storyText.trim().length < 50}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Select self-identified values
  if (step === 'select') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Eye className="h-8 w-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold">Which Values Guided You?</h1>
            <p className="text-muted-foreground">
              Select up to 3 values that you see in your story
            </p>
          </motion.div>

          {/* Story summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-muted/30 rounded-lg max-h-32 overflow-y-auto border border-border"
          >
            <p className="text-sm italic text-muted-foreground">&quot;{storyText.slice(0, 300)}...&quot;</p>
          </motion.div>

          {/* Value selection - show top 5 plus some others */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Your Top Values
              </div>
              <div className="flex flex-wrap gap-2">
                {topFiveValues.map((valueId, index) => {
                  const card = getCard(valueId);
                  if (!card) return null;
                  const isSelected = selectedSelfValues.includes(valueId);

                  return (
                    <motion.button
                      key={valueId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleValue(valueId, 'self')}
                      className={cn(
                        'px-4 py-2 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {isSelected && <Check className="inline h-4 w-4 mr-1" />}
                      {card.name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-sm font-medium mb-2 text-muted-foreground">Other Values</div>
              <div className="flex flex-wrap gap-2">
                {VALUES_DECK.filter((c) => !topFiveValues.includes(c.id))
                  .slice(0, 15)
                  .map((card, index) => {
                    const isSelected = selectedSelfValues.includes(card.id);

                    return (
                      <motion.button
                        key={card.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + index * 0.02 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleValue(card.id, 'self')}
                        disabled={!isSelected && selectedSelfValues.length >= 3}
                        className={cn(
                          'px-3 py-1 rounded-full text-sm border transition-all',
                          isSelected
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border hover:border-primary/50',
                          !isSelected && selectedSelfValues.length >= 3 && 'opacity-50'
                        )}
                      >
                        {card.name}
                      </motion.button>
                    );
                  })}
              </div>
            </motion.div>
          </div>

          {/* Selected count with visual feedback */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < selectedSelfValues.length
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
                animate={i < selectedSelfValues.length ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.2 }}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {selectedSelfValues.length}/3 selected
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={handleSelfValuesComplete}
              className="w-full"
              disabled={selectedSelfValues.length === 0}
            >
              Continue to Triad Sharing
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Triad introduction
  if (step === 'triad-intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg text-center space-y-6"
        >
          {/* Animated icon with three dots representing triad */}
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center relative"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="h-10 w-10 text-primary" />
            {/* Three dots around the icon */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary rounded-full"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                style={{
                  top: `${50 - 45 * Math.cos((i * 2 * Math.PI) / 3 - Math.PI / 2)}%`,
                  left: `${50 + 45 * Math.sin((i * 2 * Math.PI) / 3 - Math.PI / 2)}%`,
                }}
              />
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold"
          >
            Triad Witnessing
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-left space-y-4 p-4 bg-muted/30 rounded-lg border border-border"
          >
            <p className="font-semibold">Find two other people to form a group of 3.</p>
            <p className="text-sm text-muted-foreground">
              Each person shares their story for 2.5 minutes. The listeners do NOT give
              advice or share similar stories—they simply reflect back the{' '}
              <span className="text-primary font-medium">values they heard</span>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg text-sm"
          >
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Why This Matters
            </div>
            <p className="text-muted-foreground">
              Often others see our values more clearly than we do ourselves. When someone
              witnesses your story and names what they see, it deepens your own understanding.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground"
          >
            Total time: <span className="font-bold text-primary">{formatTime(VALUES_STORY_TIMERS.triadShare * 3)}</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => {
                playSound('dramatic', 'phaseTransition');
                setStep('triad');
                triadTimer.start();
              }}
              size="lg"
              className="w-full gap-2"
            >
              <Users className="h-4 w-4" />
              Begin Triad Sharing
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Triad sharing (timer display)
  if (step === 'triad') {
    // Calculate which person is sharing (roughly)
    const totalSeconds = VALUES_STORY_TIMERS.triadShare * 3;
    const perPersonSeconds = totalSeconds / 3;
    const elapsedSeconds = totalSeconds - triadTimer.time;
    const currentPerson = Math.min(2, Math.floor(elapsedSeconds / perPersonSeconds));

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center p-4"
      >
        <div className="max-w-lg w-full text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Triad Sharing in Progress
            </h1>
            <p className="text-muted-foreground">
              Share your story. Listen deeply. Reflect back the values you hear.
            </p>
          </motion.div>

          {/* Big timer with pulse on warning */}
          <motion.div
            className={cn(
              'text-7xl font-mono font-bold',
              triadTimer.isWarning ? 'text-red-400' : 'text-primary'
            )}
            animate={triadTimer.isWarning ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: triadTimer.isWarning ? Infinity : 0 }}
          >
            {triadTimer.formatted}
          </motion.div>

          <Progress value={triadTimer.progress * 100} className="h-3" />

          {/* Instructions with active state */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all',
                  currentPerson === i
                    ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/30 border-transparent'
                )}
              >
                <div className="font-semibold mb-1">Person {i + 1}</div>
                <div className={cn(
                  currentPerson === i ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {i === 0 ? 'Share story' : 'Listen & witness'}
                </div>
                {currentPerson === i && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2"
                  >
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Speaking
                    </span>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-muted/30 rounded-lg text-sm text-left border border-border"
          >
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Listener Guidelines:
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No advice or suggestions</li>
              <li>No sharing your own similar story</li>
              <li>Simply reflect: &quot;I heard [value] in your story when you...&quot;</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => {
                playSound('ui', 'success');
                setStep('peer-values');
              }}
              size="lg"
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Sharing Complete
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Peer values capture
  if (step === 'peer-values') {
    const hasOverlap = selectedPeerValues.some((v) => selectedSelfValues.includes(v));
    const hasNewInsights = selectedPeerValues.some((v) => !selectedSelfValues.includes(v));

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Heart className="h-8 w-8 text-green-400" />
            </motion.div>
            <h1 className="text-2xl font-bold">What Values Did Others See?</h1>
            <p className="text-muted-foreground">
              Select the values your triad members identified in your story
            </p>
          </motion.div>

          {/* Value selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-400" />
                Values They Named
              </div>
              <div className="flex flex-wrap gap-2">
                {VALUES_DECK.slice(0, 30).map((card, index) => {
                  const isSelected = selectedPeerValues.includes(card.id);
                  const isInSelfValues = selectedSelfValues.includes(card.id);

                  return (
                    <motion.button
                      key={card.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.01 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleValue(card.id, 'peer')}
                      disabled={!isSelected && selectedPeerValues.length >= 3}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm border transition-all',
                        isSelected
                          ? 'border-green-500 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                          : 'border-border hover:border-green-500/50',
                        isInSelfValues && !isSelected && 'ring-1 ring-primary/30',
                        !isSelected && selectedPeerValues.length >= 3 && 'opacity-50'
                      )}
                    >
                      {card.name}
                      {isInSelfValues && <span className="ml-1 text-primary/50">•</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Selected count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < selectedPeerValues.length
                    ? 'bg-green-400'
                    : 'bg-muted'
                )}
                animate={i < selectedPeerValues.length ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.2 }}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {selectedPeerValues.length}/3 selected
            </span>
          </motion.div>

          {/* Comparison */}
          <AnimatePresence>
            {selectedPeerValues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-muted/30 rounded-lg border border-border overflow-hidden"
              >
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Comparison
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">You identified:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedSelfValues.map((id) => (
                        <span key={id} className="px-2 py-0.5 bg-primary/20 rounded text-xs border border-primary/30">
                          {getCard(id)?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">They identified:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPeerValues.map((id) => (
                        <span key={id} className="px-2 py-0.5 bg-green-500/20 rounded text-xs border border-green-500/30">
                          {getCard(id)?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Insight message */}
                {(hasOverlap || hasNewInsights) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 pt-4 border-t border-border"
                  >
                    {hasOverlap && hasNewInsights ? (
                      <p className="text-sm text-amber-400 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Some values align, and you gained new insights from your peers!
                      </p>
                    ) : hasOverlap ? (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Your peers confirmed what you already knew about yourself.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-400 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Your peers saw different values—a gift of perspective!
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground italic"
          >
            &quot;Often others see our values more clearly than we do ourselves.&quot;
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handlePeerValuesComplete}
              className="w-full gap-2"
              size="lg"
            >
              <Check className="h-4 w-4" />
              Complete Values Story
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return null;
}
