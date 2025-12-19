'use client';

/**
 * ValuesQuickSort Component
 *
 * A timed 3-round card sorting exercise for personal values discovery.
 *
 * Round 1 (3 min): Sort 40 cards into Essential / Important / Not Core (max 10 Essential)
 * Round 2 (4 min): Narrow Essential pile to exactly 5 values
 * Round 3 (3 min): Rank the 5 values by priority ("when two conflict, which wins?")
 *
 * GAMIFICATION FEATURES:
 * - Sound effects for card sorts, completions, warnings
 * - Card flip animations
 * - Pile depth effects
 * - Celebration particles on round completion
 * - Keyboard shortcuts (A/S/D for sorting, Arrow keys for ranking)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { VALUES_DECK, type ValueCard } from '@crucible/shared';
import { useTimer, QUICK_SORT_TIMERS, formatTime } from '@/hooks/useTimer';
import { usePreCrisisStore } from '@/stores/preCrisisStore';
import { useSound } from '@/hooks/useSound';
import {
  ArrowUp,
  ArrowDown,
  Timer,
  AlertCircle,
  Check,
  Sparkles,
  Trophy,
  Keyboard,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type SortPile = 'essential' | 'important' | 'notCore' | 'unsorted';
type Round = 1 | 2 | 3;

interface CardPosition {
  cardId: string;
  pile: SortPile;
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface ValuesQuickSortProps {
  onComplete: (result: {
    topFive: string[];
    roundTimings: [number, number, number];
    cardsConsidered: string[];
  }) => void;
}

export function ValuesQuickSort({ onComplete }: ValuesQuickSortProps) {
  // Store
  const {
    quickSort,
    setQuickSortRound,
    addToPile,
    setTopFive,
    setRoundTiming,
    completeQuickSort,
  } = usePreCrisisStore();

  // Sound effects
  const { play: playSound } = useSound();

  // Local state
  const [currentRound, setCurrentRound] = useState<Round>(1);
  const [cardPositions, setCardPositions] = useState<Map<string, SortPile>>(() => {
    const map = new Map<string, SortPile>();
    VALUES_DECK.forEach((card) => map.set(card.id, 'unsorted'));
    return map;
  });
  const [rankedFive, setRankedFive] = useState<string[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [showInstructions, setShowInstructions] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastSortedPile, setLastSortedPile] = useState<SortPile | null>(null);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);

  // Refs for keyboard handling
  const containerRef = useRef<HTMLDivElement>(null);

  // Get round duration
  const getRoundDuration = (round: Round) => {
    switch (round) {
      case 1:
        return QUICK_SORT_TIMERS.round1;
      case 2:
        return QUICK_SORT_TIMERS.round2;
      case 3:
        return QUICK_SORT_TIMERS.round3;
    }
  };

  // Timer
  const timer = useTimer({
    mode: 'countdown',
    duration: getRoundDuration(currentRound),
    warningThreshold: 30,
    onComplete: () => {
      // Auto-advance when time runs out
      playSound('ui', 'notification');
      handleRoundComplete();
    },
    onWarning: () => {
      // Play warning sound when time is running low
      playSound('ui', 'error');
    },
  });

  // Count cards in each pile
  const pileCount = useCallback(
    (pile: SortPile) => {
      let count = 0;
      cardPositions.forEach((p) => {
        if (p === pile) count++;
      });
      return count;
    },
    [cardPositions]
  );

  // Get cards in a pile
  const getCardsInPile = useCallback(
    (pile: SortPile): ValueCard[] => {
      const cardIds: string[] = [];
      cardPositions.forEach((p, id) => {
        if (p === pile) cardIds.push(id);
      });
      return cardIds
        .map((id) => VALUES_DECK.find((c) => c.id === id))
        .filter((c): c is ValueCard => c !== undefined);
    },
    [cardPositions]
  );

  // Move card to pile
  const moveCardToPile = useCallback(
    (cardId: string, pile: SortPile) => {
      // Round 1: max 10 essential
      if (currentRound === 1 && pile === 'essential' && pileCount('essential') >= 10) {
        playSound('ui', 'error');
        return;
      }

      setCardPositions((prev) => {
        const next = new Map(prev);
        next.set(cardId, pile);
        return next;
      });

      // Track last sorted pile for visual feedback
      setLastSortedPile(pile);
      setTimeout(() => setLastSortedPile(null), 300);

      // Play pile-specific sound
      if (pile === 'essential') {
        playSound('ui', 'success');
      } else if (pile === 'important') {
        playSound('ui', 'select');
      } else if (pile === 'notCore') {
        playSound('ui', 'click');
      }

      // Hide keyboard hint after first sort
      if (showKeyboardHint) {
        setShowKeyboardHint(false);
      }

      // Update store
      if (pile !== 'unsorted') {
        addToPile(pile, cardId);
      }
    },
    [currentRound, pileCount, addToPile, playSound, showKeyboardHint]
  );

  // Handle round completion
  const handleRoundComplete = useCallback(() => {
    const elapsed = Date.now() - roundStartTime;
    setRoundTiming(currentRound, elapsed);

    // Show celebration effect
    setShowCelebration(true);
    playSound('dramatic', 'decisionConfirm');
    setTimeout(() => setShowCelebration(false), 1500);

    if (currentRound === 1) {
      // Move to round 2
      setTimeout(() => {
        setCurrentRound(2);
        setRoundStartTime(Date.now());
        timer.reset(QUICK_SORT_TIMERS.round2);
        setShowInstructions(true);
      }, 800);
    } else if (currentRound === 2) {
      // Get essential cards as initial ranking
      const essentialCards = getCardsInPile('essential');
      if (essentialCards.length === 5) {
        setTimeout(() => {
          setRankedFive(essentialCards.map((c) => c.id));
          setCurrentRound(3);
          setRoundStartTime(Date.now());
          timer.reset(QUICK_SORT_TIMERS.round3);
          setShowInstructions(true);
        }, 800);
      }
    } else if (currentRound === 3) {
      // Complete!
      playSound('dramatic', 'commitmentSeal');
      setTimeout(() => {
        const result = {
          topFive: rankedFive,
          roundTimings: quickSort.roundTimings,
          cardsConsidered: quickSort.cardsConsidered,
        };
        setTopFive(rankedFive);
        completeQuickSort();
        onComplete(result);
      }, 1000);
    }
  }, [
    currentRound,
    roundStartTime,
    timer,
    getCardsInPile,
    rankedFive,
    quickSort,
    setRoundTiming,
    setTopFive,
    completeQuickSort,
    onComplete,
    playSound,
  ]);

  // Check if round can advance
  const canAdvance = useCallback(() => {
    if (currentRound === 1) {
      // All cards must be sorted
      return pileCount('unsorted') === 0;
    } else if (currentRound === 2) {
      // Exactly 5 essential
      return pileCount('essential') === 5;
    } else {
      // Ranking complete (all 5 are ranked)
      return rankedFive.length === 5;
    }
  }, [currentRound, pileCount, rankedFive]);

  // Move in ranking
  const moveUp = (index: number) => {
    if (index === 0) return;
    playSound('ui', 'select');
    setRankedFive((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= rankedFive.length - 1) return;
    playSound('ui', 'select');
    setRankedFive((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      return next;
    });
  };

  // Keyboard shortcuts for Round 1 sorting
  useEffect(() => {
    if (showInstructions || currentRound !== 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const unsortedCards = getCardsInPile('unsorted');
      if (unsortedCards.length === 0) return;

      const topCard = unsortedCards[0];
      if (!topCard) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          moveCardToPile(topCard.id, 'essential');
          break;
        case 's':
          e.preventDefault();
          moveCardToPile(topCard.id, 'important');
          break;
        case 'd':
          e.preventDefault();
          moveCardToPile(topCard.id, 'notCore');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInstructions, currentRound, getCardsInPile, moveCardToPile]);

  // Start timer when instructions dismissed
  const startRound = () => {
    playSound('dramatic', 'phaseTransition');
    setShowInstructions(false);
    setRoundStartTime(Date.now());
    timer.start();
  };

  // Get value card by ID
  const getCard = (id: string) => VALUES_DECK.find((c) => c.id === id);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Instructions overlay
  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel max-w-lg text-center space-y-6"
        >
          <div className="text-4xl font-bold">Round {currentRound}</div>

          {currentRound === 1 && (
            <>
              <p className="text-lg">
                Sort all 40 values into three piles:
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                  <div className="font-semibold text-green-400">Essential</div>
                  <div className="text-muted-foreground">Max 10 cards</div>
                  <div className="mt-2 text-xs flex items-center justify-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-green-500/20 rounded text-green-400 font-mono">A</kbd>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <div className="font-semibold text-yellow-400">Important</div>
                  <div className="text-muted-foreground">Matter to you</div>
                  <div className="mt-2 text-xs flex items-center justify-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-400 font-mono">S</kbd>
                  </div>
                </div>
                <div className="p-3 bg-gray-500/20 rounded-lg border border-gray-500/30">
                  <div className="font-semibold text-gray-400">Not Core</div>
                  <div className="text-muted-foreground">Can let go</div>
                  <div className="mt-2 text-xs flex items-center justify-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-500/20 rounded text-gray-400 font-mono">D</kbd>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Keyboard className="h-3 w-3" />
                <span>Use keyboard shortcuts for faster sorting!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You have <span className="font-bold text-primary">{formatTime(QUICK_SORT_TIMERS.round1)}</span> to sort all cards.
                Trust your gut—first instinct is often right.
              </p>
            </>
          )}

          {currentRound === 2 && (
            <>
              <p className="text-lg">
                Narrow your Essential pile to exactly 5 values.
              </p>
              <p className="text-sm text-muted-foreground">
                You have <span className="font-bold text-primary">{formatTime(QUICK_SORT_TIMERS.round2)}</span>.
                These are the values that define who you are at your core.
              </p>
            </>
          )}

          {currentRound === 3 && (
            <>
              <p className="text-lg">
                Rank your 5 values by priority.
              </p>
              <p className="text-sm text-muted-foreground">
                When two values conflict, which wins?
                <br />
                You have <span className="font-bold text-primary">{formatTime(QUICK_SORT_TIMERS.round3)}</span>.
              </p>
            </>
          )}

          <Button onClick={startRound} size="lg" className="w-full">
            Start Round {currentRound}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Celebration overlay component
  const CelebrationOverlay = () => (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Trophy className="h-16 w-16 text-yellow-400" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white"
            >
              Round {currentRound} Complete!
            </motion.div>
            {/* Sparkle particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * 100,
                  y: Math.sin((i / 12) * Math.PI * 2) * 100,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1, delay: i * 0.05 }}
              >
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Round 1: Full card sort
  if (currentRound === 1) {
    return (
      <div className="min-h-screen p-4 space-y-4 relative" ref={containerRef}>
        <CelebrationOverlay />

        {/* Header with timer */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Round 1: Quick Sort</h2>
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg transition-all',
              timer.isWarning ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-muted'
            )}
          >
            <Timer className="h-5 w-5" />
            {timer.formatted}
          </div>
        </div>

        <Progress value={timer.progress * 100} className="h-2" />

        {/* Keyboard shortcuts hint */}
        <AnimatePresence>
          {showKeyboardHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-4 p-2 bg-primary/10 rounded-lg text-sm"
            >
              <Keyboard className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-green-500/20 rounded text-green-400 font-mono mx-1">A</kbd> Essential
                <kbd className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-400 font-mono mx-1">S</kbd> Important
                <kbd className="px-1.5 py-0.5 bg-gray-500/20 rounded text-gray-400 font-mono mx-1">D</kbd> Not Core
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Unsorted pile */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Unsorted ({pileCount('unsorted')})
            </div>
            <div className="h-[60vh] overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-lg">
              <AnimatePresence>
                {getCardsInPile('unsorted').map((card) => (
                  <ValueCardComponent
                    key={card.id}
                    card={card}
                    onSelect={(pile) => moveCardToPile(card.id, pile)}
                    showPileButtons
                    essentialDisabled={pileCount('essential') >= 10}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Target piles */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-4">
            {/* Essential */}
            <div className="space-y-2">
              <div className={cn(
                'text-sm font-medium text-green-400 transition-all',
                lastSortedPile === 'essential' && 'scale-110'
              )}>
                Essential ({pileCount('essential')}/10)
              </div>
              <div className={cn(
                'min-h-[60vh] p-2 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2 transition-all',
                lastSortedPile === 'essential' && 'ring-2 ring-green-400 shadow-lg shadow-green-500/30'
              )}>
                <AnimatePresence>
                  {getCardsInPile('essential').map((card) => (
                    <ValueCardComponent
                      key={card.id}
                      card={card}
                      onRemove={() => moveCardToPile(card.id, 'unsorted')}
                      compact
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Important */}
            <div className="space-y-2">
              <div className={cn(
                'text-sm font-medium text-yellow-400 transition-all',
                lastSortedPile === 'important' && 'scale-110'
              )}>
                Important ({pileCount('important')})
              </div>
              <div className={cn(
                'min-h-[60vh] p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2 transition-all',
                lastSortedPile === 'important' && 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30'
              )}>
                <AnimatePresence>
                  {getCardsInPile('important').map((card) => (
                    <ValueCardComponent
                      key={card.id}
                      card={card}
                      onRemove={() => moveCardToPile(card.id, 'unsorted')}
                      compact
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Not Core */}
            <div className="space-y-2">
              <div className={cn(
                'text-sm font-medium text-gray-400 transition-all',
                lastSortedPile === 'notCore' && 'scale-110'
              )}>
                Not Core ({pileCount('notCore')})
              </div>
              <div className={cn(
                'min-h-[60vh] p-2 bg-gray-500/10 border border-gray-500/30 rounded-lg space-y-2 transition-all',
                lastSortedPile === 'notCore' && 'ring-2 ring-gray-400 shadow-lg shadow-gray-500/30'
              )}>
                <AnimatePresence>
                  {getCardsInPile('notCore').map((card) => (
                    <ValueCardComponent
                      key={card.id}
                      card={card}
                      onRemove={() => moveCardToPile(card.id, 'unsorted')}
                      compact
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Advance button */}
        <div className="flex justify-end">
          <Button onClick={handleRoundComplete} disabled={!canAdvance()}>
            {canAdvance() ? 'Continue to Round 2' : `Sort ${pileCount('unsorted')} more cards`}
          </Button>
        </div>
      </div>
    );
  }

  // Round 2: Narrow to 5
  if (currentRound === 2) {
    const essentialCards = getCardsInPile('essential');
    const importantCards = getCardsInPile('important');

    return (
      <div className="min-h-screen p-4 space-y-4">
        {/* Header with timer */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Round 2: Narrow to 5</h2>
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
              timer.isWarning ? 'bg-red-500/20 text-red-400' : 'bg-muted'
            )}
          >
            <Timer className="h-5 w-5" />
            {timer.formatted}
          </div>
        </div>

        <Progress value={timer.progress * 100} className="h-2" />

        {/* Instructions */}
        <div
          className={cn(
            'flex items-center gap-2 p-3 rounded-lg text-sm',
            essentialCards.length === 5
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          )}
        >
          {essentialCards.length === 5 ? (
            <>
              <Check className="h-4 w-4" />
              Perfect! You have exactly 5 essential values.
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              {essentialCards.length > 5
                ? `Remove ${essentialCards.length - 5} cards from Essential`
                : `Add ${5 - essentialCards.length} more cards to Essential`}
            </>
          )}
        </div>

        {/* Card areas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Essential */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-400">
              Essential ({essentialCards.length}/5)
            </div>
            <div className="min-h-[50vh] p-2 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
              <AnimatePresence>
                {essentialCards.map((card) => (
                  <ValueCardComponent
                    key={card.id}
                    card={card}
                    onRemove={() => moveCardToPile(card.id, 'important')}
                    actionLabel="→ Important"
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Important (can promote back) */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-yellow-400">
              Important ({importantCards.length})
            </div>
            <div className="min-h-[50vh] p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
              <AnimatePresence>
                {importantCards.map((card) => (
                  <ValueCardComponent
                    key={card.id}
                    card={card}
                    onSelect={() =>
                      essentialCards.length < 5 && moveCardToPile(card.id, 'essential')
                    }
                    actionLabel="← Essential"
                    disabled={essentialCards.length >= 5}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Advance button */}
        <div className="flex justify-end">
          <Button onClick={handleRoundComplete} disabled={!canAdvance()}>
            {canAdvance() ? 'Continue to Ranking' : 'Select exactly 5 values'}
          </Button>
        </div>
      </div>
    );
  }

  // Round 3: Rank the 5
  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Header with timer */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Round 3: Rank Your Values</h2>
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
            timer.isWarning ? 'bg-red-500/20 text-red-400' : 'bg-muted'
          )}
        >
          <Timer className="h-5 w-5" />
          {timer.formatted}
        </div>
      </div>

      <Progress value={timer.progress * 100} className="h-2" />

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        When two values conflict, which wins? Your #1 value is your ultimate priority.
      </p>

      {/* Ranking */}
      <div className="max-w-lg mx-auto space-y-3">
        {rankedFive.map((cardId, index) => {
          const card = getCard(cardId);
          if (!card) return null;

          return (
            <motion.div
              key={cardId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border',
                index === 0 && 'bg-primary/20 border-primary'
              )}
            >
              <span
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                  index === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>

              <div className="flex-1">
                <div className="font-semibold">{card.name}</div>
                <div className="text-xs text-muted-foreground">{card.definition}</div>
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveDown(index)}
                  disabled={index === rankedFive.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Complete button */}
      <div className="flex justify-center pt-4">
        <Button onClick={handleRoundComplete} size="lg" className="px-8">
          Complete Values Sort
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// VALUE CARD COMPONENT
// ============================================================================

interface ValueCardProps {
  card: ValueCard;
  onSelect?: (pile: SortPile) => void;
  onRemove?: () => void;
  showPileButtons?: boolean;
  compact?: boolean;
  actionLabel?: string;
  disabled?: boolean;
  essentialDisabled?: boolean;
}

function ValueCardComponent({
  card,
  onSelect,
  onRemove,
  showPileButtons,
  compact,
  actionLabel,
  disabled,
  essentialDisabled,
}: ValueCardProps) {
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="p-2 bg-background/50 rounded border text-sm cursor-pointer hover:bg-background/80"
        onClick={onRemove}
      >
        <div className="font-medium">{card.name}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3 bg-background rounded-lg border space-y-2"
    >
      <div>
        <div className="font-semibold">{card.name}</div>
        <div className="text-xs text-muted-foreground">{card.definition}</div>
      </div>

      {showPileButtons && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
            onClick={() => onSelect?.('essential')}
            disabled={essentialDisabled}
          >
            Essential
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30"
            onClick={() => onSelect?.('important')}
          >
            Important
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30"
            onClick={() => onSelect?.('notCore')}
          >
            Not Core
          </Button>
        </div>
      )}

      {actionLabel && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => (onRemove ? onRemove() : onSelect?.('essential'))}
          disabled={disabled}
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
