'use client';

/**
 * DebriefJourney Component
 *
 * Main orchestrator for the post-crisis debrief experience.
 * Guides participants through 5 chapters of reflection:
 *
 * 1. The Story - Replay of decisions (DecisionReplay)
 * 2. The Gap - Stated vs enacted values (GapRevelation)
 * 3. The Drift - Rationalization cascade (RationalizationCascade)
 * 4. The Mirror - Commitment comparison (CommitmentComparison)
 * 5. The Transfer - Real-life application (TransferReflection)
 *
 * Design principle: Cinematic, revelatory experience for learning.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import {
  Play,
  TrendingDown,
  AlertTriangle,
  FileText,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Heart,
  Target,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type DebriefChapter =
  | 'intro'
  | 'story'
  | 'gap'
  | 'drift'
  | 'mirror'
  | 'transfer'
  | 'complete';

export interface DebriefJourneyProps {
  teamName: string;
  children: React.ReactNode;
  currentChapter: DebriefChapter;
  onChapterChange: (chapter: DebriefChapter) => void;
  isChapterComplete?: boolean;
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHAPTERS: {
  id: DebriefChapter;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  duration: string;
}[] = [
  {
    id: 'story',
    title: 'The Story',
    subtitle: 'Replay your journey through the crisis',
    icon: <Play className="h-5 w-5" />,
    color: 'text-blue-500',
    duration: '~15 min',
  },
  {
    id: 'gap',
    title: 'The Gap',
    subtitle: 'Discover the distance between words and actions',
    icon: <TrendingDown className="h-5 w-5" />,
    color: 'text-red-500',
    duration: '~15 min',
  },
  {
    id: 'drift',
    title: 'The Drift',
    subtitle: 'Understand how small steps led you here',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-amber-500',
    duration: '~10 min',
  },
  {
    id: 'mirror',
    title: 'The Mirror',
    subtitle: 'Face your commitment, word by word',
    icon: <FileText className="h-5 w-5" />,
    color: 'text-purple-500',
    duration: '~15 min',
  },
  {
    id: 'transfer',
    title: 'The Transfer',
    subtitle: 'Carry these insights into real life',
    icon: <Target className="h-5 w-5" />,
    color: 'text-green-500',
    duration: '~20 min',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ChapterNav({
  currentChapter,
  completedChapters,
  onNavigate,
}: {
  currentChapter: DebriefChapter;
  completedChapters: Set<DebriefChapter>;
  onNavigate: (chapter: DebriefChapter) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-4">
      {CHAPTERS.map((chapter, index) => {
        const isActive = currentChapter === chapter.id;
        const isComplete = completedChapters.has(chapter.id);
        const isPast = CHAPTERS.findIndex((c) => c.id === currentChapter) > index;

        return (
          <button
            key={chapter.id}
            onClick={() => onNavigate(chapter.id)}
            disabled={!isComplete && !isActive && !isPast}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : isComplete
                ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                : isPast
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <span className={cn(isActive && chapter.color)}>{chapter.icon}</span>
            )}
            <span className="hidden sm:inline">{chapter.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChapterIntro({
  chapter,
  onStart,
}: {
  chapter: (typeof CHAPTERS)[0];
  onStart: () => void;
}) {
  const { play: playSound } = useSound();

  useEffect(() => {
    playSound('dramatic', 'phaseTransition');
  }, [playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="max-w-lg w-full text-center space-y-6"
      >
        {/* Chapter icon with glow */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative mx-auto w-24 h-24"
        >
          <div className={cn('absolute inset-0 rounded-full blur-xl', chapter.color.replace('text-', 'bg-'), 'opacity-30')} />
          <div className={cn('relative w-full h-full rounded-full bg-muted flex items-center justify-center', chapter.color)}>
            {chapter.icon}
          </div>
        </motion.div>

        {/* Chapter number */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-bold text-muted-foreground tracking-widest"
        >
          CHAPTER {CHAPTERS.findIndex((c) => c.id === chapter.id) + 1}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-bold tracking-tight"
        >
          {chapter.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-muted-foreground"
        >
          {chapter.subtitle}
        </motion.p>

        {/* Duration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-muted-foreground"
        >
          Estimated time: {chapter.duration}
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            size="lg"
            onClick={() => {
              playSound('ui', 'click');
              onStart();
            }}
            className="gap-2"
          >
            Begin
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function JourneyIntro({
  teamName,
  onStart,
}: {
  teamName: string;
  onStart: () => void;
}) {
  const { play: playSound } = useSound();

  useEffect(() => {
    playSound('dramatic', 'phaseTransition');
  }, [playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto text-center space-y-8 py-12"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
      >
        <BookOpen className="h-10 w-10 text-primary" />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-4xl font-bold mb-2">The Debrief</h1>
        <p className="text-xl text-muted-foreground">Team {teamName}</p>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-lg text-muted-foreground leading-relaxed"
      >
        The storm has passed. Now comes the harder work: understanding what happened,
        why it happened, and what it means for who you want to be.
      </motion.p>

      {/* Chapter preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid gap-3"
      >
        {CHAPTERS.map((chapter, index) => (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg text-left"
          >
            <div className={cn('w-10 h-10 rounded-full bg-muted flex items-center justify-center', chapter.color)}>
              {chapter.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{chapter.title}</div>
              <div className="text-sm text-muted-foreground">{chapter.subtitle}</div>
            </div>
            <div className="text-xs text-muted-foreground">{chapter.duration}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-sm text-muted-foreground italic"
      >
        This is for learning, not judgment. Every team faces gaps under pressure.
        Noticing them is the first step to closing them.
      </motion.p>

      {/* Start button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <Button
          size="lg"
          onClick={() => {
            playSound('ui', 'click');
            onStart();
          }}
          className="gap-2"
        >
          Begin the Journey
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function JourneyComplete({ teamName, onFinish }: { teamName: string; onFinish?: () => void }) {
  const { play: playSound } = useSound();

  useEffect(() => {
    playSound('dramatic', 'commitmentSeal');
  }, [playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto text-center space-y-8 py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative mx-auto w-24 h-24"
      >
        <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse" />
        <div className="relative w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
          <Sparkles className="h-12 w-12 text-green-500" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-4xl font-bold mb-2">Journey Complete</h1>
        <p className="text-xl text-muted-foreground">Team {teamName}</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-lg text-muted-foreground leading-relaxed"
      >
        You&apos;ve done the hard work of reflection. The insights you&apos;ve gained today
        aren&apos;t just about a simulation - they&apos;re about who you choose to be
        when pressure mounts and values are tested.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-6 bg-primary/10 rounded-xl border border-primary/30"
      >
        <Heart className="h-8 w-8 text-primary mx-auto mb-4" />
        <p className="italic text-lg">
          &ldquo;The gap between our values and our actions is where growth lives.
          May you close it, one decision at a time.&rdquo;
        </p>
      </motion.div>

      {onFinish && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button size="lg" onClick={onFinish}>
            Complete Debrief
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DebriefJourney({
  teamName,
  children,
  currentChapter,
  onChapterChange,
  isChapterComplete = false,
  onComplete,
  className,
}: DebriefJourneyProps) {
  const [completedChapters, setCompletedChapters] = useState<Set<DebriefChapter>>(new Set());
  const [showChapterIntro, setShowChapterIntro] = useState(true);
  const { play: playSound } = useSound();

  const currentChapterIndex = CHAPTERS.findIndex((c) => c.id === currentChapter);
  const currentChapterData = CHAPTERS[currentChapterIndex];

  // Mark chapter complete when isChapterComplete becomes true
  useEffect(() => {
    if (isChapterComplete && currentChapter !== 'intro' && currentChapter !== 'complete') {
      setCompletedChapters((prev) => new Set([...prev, currentChapter]));
    }
  }, [isChapterComplete, currentChapter]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < CHAPTERS.length) {
      setShowChapterIntro(true);
      onChapterChange(CHAPTERS[nextIndex].id);
      playSound('ui', 'click');
    } else {
      onChapterChange('complete');
    }
  }, [currentChapterIndex, onChapterChange, playSound]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentChapterIndex - 1;
    if (prevIndex >= 0) {
      setShowChapterIntro(false);
      onChapterChange(CHAPTERS[prevIndex].id);
      playSound('ui', 'click');
    }
  }, [currentChapterIndex, onChapterChange, playSound]);

  const handleNavigate = useCallback(
    (chapter: DebriefChapter) => {
      setShowChapterIntro(false);
      onChapterChange(chapter);
      playSound('ui', 'click');
    },
    [onChapterChange, playSound]
  );

  // Intro screen
  if (currentChapter === 'intro') {
    return (
      <div className={cn('min-h-screen p-4', className)}>
        <JourneyIntro
          teamName={teamName}
          onStart={() => {
            setShowChapterIntro(true);
            onChapterChange('story');
          }}
        />
      </div>
    );
  }

  // Complete screen
  if (currentChapter === 'complete') {
    return (
      <div className={cn('min-h-screen p-4', className)}>
        <JourneyComplete teamName={teamName} onFinish={onComplete} />
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {/* Chapter intro overlay */}
      <AnimatePresence>
        {showChapterIntro && currentChapterData && (
          <ChapterIntro
            chapter={currentChapterData}
            onStart={() => setShowChapterIntro(false)}
          />
        )}
      </AnimatePresence>

      {/* Navigation bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <ChapterNav
          currentChapter={currentChapter}
          completedChapters={completedChapters}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Chapter content */}
      <div className="flex-1 p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChapter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentChapterIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Chapter {currentChapterIndex + 1} of {CHAPTERS.length}
          </div>

          <Button
            onClick={goToNext}
            disabled={!isChapterComplete}
            className="gap-2"
          >
            {currentChapterIndex === CHAPTERS.length - 1 ? 'Complete' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DebriefJourney;
