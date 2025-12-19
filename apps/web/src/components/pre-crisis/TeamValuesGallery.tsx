'use client';

/**
 * TeamValuesGallery Component
 *
 * Phase 2.1: Team Values Alignment - Silent Gallery Walk
 *
 * 1. Silent Gallery Walk (5 min): Each person's top 5 displayed anonymously
 * 2. Claim Animation (3 min): Names appear next to values with animation
 * 3. Facilitated Noticing (7 min): Discuss overlaps, unique values, themes
 *
 * This is the transition from personal values discovery to team alignment.
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCountdown } from '@/hooks/useTimer';
import { useSound } from '@/hooks/useSound';
import {
  Eye,
  EyeOff,
  Users,
  Sparkles,
  ChevronRight,
  Timer,
  Heart,
  Star,
  Check,
  RotateCcw,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ParticipantValues {
  participantId: string;
  participantName: string;
  topFive: string[];
}

export interface TeamValuesGalleryProps {
  participants: ParticipantValues[];
  onComplete: (selectedTeamValues: string[]) => void;
  teamName: string;
}

type GalleryStep = 'intro' | 'gallery' | 'claim' | 'notice' | 'select';

// ============================================================================
// CONSTANTS
// ============================================================================

const GALLERY_DURATION = 5 * 60; // 5 minutes
const CLAIM_DURATION = 3 * 60; // 3 minutes
const NOTICE_DURATION = 7 * 60; // 7 minutes

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ValueCardProps {
  value: string;
  isShared: boolean;
  shareCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

function ValueCard({
  value,
  isShared,
  shareCount,
  isSelected,
  onClick,
  size = 'md',
}: ValueCardProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={cn(
        'rounded-lg font-medium transition-colors relative',
        sizeClasses[size],
        isShared
          ? 'bg-primary/20 text-primary border border-primary/40'
          : 'bg-muted/50 text-foreground border border-muted',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        onClick && 'cursor-pointer hover:bg-muted'
      )}
    >
      {value}
      {shareCount && shareCount > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
          {shareCount}
        </span>
      )}
    </motion.button>
  );
}

interface AnonymousCardSetProps {
  values: string[];
  index: number;
  sharedValues: Set<string>;
  valueCounts: Map<string, number>;
}

function AnonymousCardSet({ values, index, sharedValues, valueCounts }: AnonymousCardSetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 bg-muted/30 rounded-xl border space-y-3"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <EyeOff className="h-4 w-4" />
        <span className="text-sm">Anonymous #{index + 1}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <ValueCard
            key={value}
            value={value}
            isShared={sharedValues.has(value)}
            shareCount={valueCounts.get(value)}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface RevealedCardSetProps {
  participant: ParticipantValues;
  index: number;
  sharedValues: Set<string>;
  valueCounts: Map<string, number>;
  isRevealed: boolean;
}

function RevealedCardSet({
  participant,
  index,
  sharedValues,
  valueCounts,
  isRevealed,
}: RevealedCardSetProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.3, type: 'spring' }}
      className="p-4 bg-muted/30 rounded-xl border space-y-3"
    >
      <AnimatePresence mode="wait">
        {isRevealed ? (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <span className="text-sm font-bold text-primary">
                {participant.participantName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-semibold"
            >
              {participant.participantName}
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="anonymous"
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <EyeOff className="h-4 w-4" />
            <span className="text-sm">Anonymous #{index + 1}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-wrap gap-2">
        {participant.topFive.map((value, vIndex) => (
          <motion.div
            key={value}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isRevealed ? index * 0.3 + vIndex * 0.05 : 0 }}
          >
            <ValueCard
              value={value}
              isShared={sharedValues.has(value)}
              shareCount={valueCounts.get(value)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamValuesGallery({
  participants,
  onComplete,
  teamName,
}: TeamValuesGalleryProps) {
  const [step, setStep] = useState<GalleryStep>('intro');
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedTeamValues, setSelectedTeamValues] = useState<string[]>([]);
  const [galleryWarning, setGalleryWarning] = useState(false);
  const [claimWarning, setClaimWarning] = useState(false);
  const [noticeWarning, setNoticeWarning] = useState(false);

  // Sound effects
  const { play: playSound } = useSound();

  // Timer for each phase
  const galleryTimer = useCountdown(GALLERY_DURATION, {
    autoStart: false,
    onComplete: () => {
      playSound('ui', 'notification');
      setStep('claim');
    },
  });

  const claimTimer = useCountdown(CLAIM_DURATION, {
    autoStart: false,
    onComplete: () => {
      playSound('ui', 'notification');
      setStep('notice');
    },
  });

  const noticeTimer = useCountdown(NOTICE_DURATION, {
    autoStart: false,
    onComplete: () => {
      playSound('ui', 'notification');
      setStep('select');
    },
  });

  // Timer warning effects
  useEffect(() => {
    if (galleryTimer.time <= 60 && galleryTimer.time > 0 && !galleryWarning) {
      setGalleryWarning(true);
      playSound('dramatic', 'criticalAlert');
    }
  }, [galleryTimer.time, galleryWarning, playSound]);

  useEffect(() => {
    if (claimTimer.time <= 60 && claimTimer.time > 0 && !claimWarning) {
      setClaimWarning(true);
      playSound('dramatic', 'criticalAlert');
    }
  }, [claimTimer.time, claimWarning, playSound]);

  useEffect(() => {
    if (noticeTimer.time <= 60 && noticeTimer.time > 0 && !noticeWarning) {
      setNoticeWarning(true);
      playSound('dramatic', 'criticalAlert');
    }
  }, [noticeTimer.time, noticeWarning, playSound]);

  // Calculate shared values and counts
  const { sharedValues, valueCounts, allUniqueValues, sortedByFrequency } = useMemo(() => {
    const counts = new Map<string, number>();
    const allValues = new Set<string>();

    participants.forEach((p) => {
      p.topFive.forEach((v) => {
        counts.set(v, (counts.get(v) || 0) + 1);
        allValues.add(v);
      });
    });

    const shared = new Set<string>();
    counts.forEach((count, value) => {
      if (count > 1) shared.add(value);
    });

    // Sort values by frequency (most shared first)
    const sorted = Array.from(allValues).sort((a, b) => {
      const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });

    return {
      sharedValues: shared,
      valueCounts: counts,
      allUniqueValues: allValues,
      sortedByFrequency: sorted,
    };
  }, [participants]);

  // Handle step transitions
  const startGallery = () => {
    playSound('dramatic', 'phaseTransition');
    setStep('gallery');
    galleryTimer.start();
  };

  const startClaim = () => {
    playSound('dramatic', 'phaseTransition');
    setStep('claim');
    galleryTimer.reset();
    claimTimer.start();
    setGalleryWarning(false);
    // Start reveal sequence
    const revealInterval = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= participants.length) {
          clearInterval(revealInterval);
          return prev;
        }
        playSound('ui', 'success');
        return prev + 1;
      });
    }, 2500); // Reveal one person every 2.5 seconds
  };

  const startNotice = () => {
    playSound('dramatic', 'phaseTransition');
    setStep('notice');
    claimTimer.reset();
    noticeTimer.start();
    setClaimWarning(false);
  };

  const startSelect = () => {
    playSound('dramatic', 'phaseTransition');
    setStep('select');
    noticeTimer.reset();
    setNoticeWarning(false);
  };

  const toggleValueSelection = (value: string) => {
    setSelectedTeamValues((prev) => {
      if (prev.includes(value)) {
        playSound('ui', 'toggle');
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 5) {
        // Replace oldest selection
        playSound('ui', 'select');
        return [...prev.slice(1), value];
      }
      playSound('ui', 'select');
      return [...prev, value];
    });
  };

  const handleComplete = () => {
    if (selectedTeamValues.length === 5) {
      playSound('dramatic', 'commitmentSeal');
      onComplete(selectedTeamValues);
    }
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
            {/* Animated header */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Users className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold"
              >
                Team Values Gallery
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground"
              >
                Team {teamName}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl space-y-4 text-left border border-border"
            >
              <p className="text-lg">
                Each team member has identified their top 5 values. Now we&apos;ll discover what
                we share and what makes us unique.
              </p>

              <div className="space-y-3">
                {[
                  {
                    icon: Eye,
                    title: 'Silent Gallery Walk (5 min)',
                    desc: 'Browse anonymously posted values. Notice overlaps and unique values.',
                    delay: 0.4,
                  },
                  {
                    icon: Sparkles,
                    title: 'Claim Animation (3 min)',
                    desc: 'Step forward as names appear next to values.',
                    delay: 0.5,
                  },
                  {
                    icon: Heart,
                    title: 'Facilitated Noticing (7 min)',
                    desc: 'Discuss what you see. Where is common ground? Where is beautiful difference?',
                    delay: 0.6,
                  },
                ].map(({ icon: Icon, title, desc, delay }) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay }}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{title}</div>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button onClick={startGallery} size="lg" className="w-full gap-2">
                <Eye className="h-4 w-4" />
                Begin Gallery Walk
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Silent Gallery Walk */}
        {step === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Header with timer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Eye className="h-6 w-6 text-primary" />
                    Silent Gallery Walk
                  </h2>
                  <p className="text-muted-foreground">
                    Browse the values. Notice what&apos;s shared and unique.
                  </p>
                </div>
                <motion.div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
                    galleryTimer.time < 60 ? 'bg-red-500/20 text-red-400' : 'bg-muted'
                  )}
                  animate={galleryTimer.time < 60 ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.5, repeat: galleryTimer.time < 60 ? Infinity : 0 }}
                >
                  <Timer className="h-5 w-5" />
                  {formatTime(galleryTimer.time)}
                </motion.div>
              </div>
              <Progress value={(galleryTimer.time / GALLERY_DURATION) * 100} className="h-2" />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold">{participants.length}</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold">{allUniqueValues.size}</div>
                <div className="text-sm text-muted-foreground">Unique Values</div>
              </div>
              <div className="p-4 bg-primary/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{sharedValues.size}</div>
                <div className="text-sm text-muted-foreground">Shared Values</div>
              </div>
            </div>

            {/* Anonymous Value Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {participants.map((p, index) => (
                <AnonymousCardSet
                  key={p.participantId}
                  values={p.topFive}
                  index={index}
                  sharedValues={sharedValues}
                  valueCounts={valueCounts}
                />
              ))}
            </div>

            {/* Skip button */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={startClaim}>
                Continue to Reveal
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Claim Animation */}
        {step === 'claim' && (
          <motion.div
            key="claim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Header with timer */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Claim Your Values</h2>
                <p className="text-muted-foreground">
                  Step forward as your name appears next to your values.
                </p>
              </div>
              <div className="flex items-center gap-2 text-lg font-mono">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span className={cn(claimTimer.time < 60 && 'text-yellow-500')}>
                  {formatTime(claimTimer.time)}
                </span>
              </div>
            </div>

            {/* Revealed Value Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {participants.map((p, index) => (
                <RevealedCardSet
                  key={p.participantId}
                  participant={p}
                  index={index}
                  sharedValues={sharedValues}
                  valueCounts={valueCounts}
                  isRevealed={index < revealedCount}
                />
              ))}
            </div>

            {/* Continue button (shows after all revealed) */}
            {revealedCount >= participants.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <Button onClick={startNotice}>
                  Continue to Discussion
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Facilitated Noticing */}
        {step === 'notice' && (
          <motion.div
            key="notice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Header with timer */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">What Do You Notice?</h2>
                <p className="text-muted-foreground">
                  Discuss as a team. What does this tell us about who we are?
                </p>
              </div>
              <div className="flex items-center gap-2 text-lg font-mono">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span className={cn(noticeTimer.time < 60 && 'text-yellow-500')}>
                  {formatTime(noticeTimer.time)}
                </span>
              </div>
            </div>

            {/* Values Summary by Frequency */}
            <div className="p-6 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Values by Frequency
              </h3>
              <div className="flex flex-wrap gap-2">
                {sortedByFrequency.map((value) => (
                  <ValueCard
                    key={value}
                    value={value}
                    isShared={sharedValues.has(value)}
                    shareCount={valueCounts.get(value)}
                    size="lg"
                  />
                ))}
              </div>
            </div>

            {/* Discussion Prompts */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="font-semibold text-green-500 mb-2">Common Ground</h4>
                <p className="text-sm text-muted-foreground">
                  Which values do multiple people share? What does that tell us about our team?
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-semibold text-blue-500 mb-2">Beautiful Difference</h4>
                <p className="text-sm text-muted-foreground">
                  Which unique values does only one person hold? How do these enrich our team?
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="font-semibold text-purple-500 mb-2">Themes</h4>
                <p className="text-sm text-muted-foreground">
                  Are there clusters or themes? What story do our values tell about us?
                </p>
              </div>
            </div>

            {/* All Member Values for Reference */}
            <div className="grid gap-4 md:grid-cols-2">
              {participants.map((p) => (
                <div key={p.participantId} className="p-4 bg-muted/20 rounded-lg">
                  <div className="font-semibold mb-2">{p.participantName}</div>
                  <div className="flex flex-wrap gap-1">
                    {p.topFive.map((value) => (
                      <ValueCard
                        key={value}
                        value={value}
                        isShared={sharedValues.has(value)}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Continue button */}
            <div className="flex justify-end">
              <Button onClick={startSelect}>
                Select Team Values
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Select Team Values */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
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
                <Star className="h-8 w-8 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold">Select 5 Team Values</h2>
              <p className="text-muted-foreground">
                Choose values that multiple members share, or that your team agrees are essential.
              </p>
            </motion.div>

            {/* Selection Progress */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center gap-3"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedTeamValues[i]
                      ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                      : 'border-muted-foreground/30'
                  )}
                  animate={selectedTeamValues[i] ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {selectedTeamValues[i] ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-sm text-muted-foreground">{i + 1}</span>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {/* Selected Values */}
            <AnimatePresence>
              {selectedTeamValues.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg overflow-hidden"
                >
                  <div className="text-sm text-primary mb-2 font-medium">Your Team Values (in order):</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeamValues.map((value, index) => (
                      <motion.div
                        key={value}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="flex items-center gap-1"
                      >
                        <span className="text-xs text-primary font-bold">{index + 1}.</span>
                        <ValueCard
                          value={value}
                          isShared={sharedValues.has(value)}
                          isSelected
                          onClick={() => toggleValueSelection(value)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Available Values */}
            <div className="space-y-6">
              {/* Most Shared First */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Shared by Multiple Members
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sortedByFrequency
                    .filter((v) => sharedValues.has(v))
                    .map((value, index) => (
                      <motion.div
                        key={value}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.03 }}
                      >
                        <ValueCard
                          value={value}
                          isShared
                          shareCount={valueCounts.get(value)}
                          isSelected={selectedTeamValues.includes(value)}
                          onClick={() => toggleValueSelection(value)}
                          size="lg"
                        />
                      </motion.div>
                    ))}
                </div>
              </motion.div>

              {/* Unique Values */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-muted-foreground">Unique to One Member</h3>
                <div className="flex flex-wrap gap-2">
                  {sortedByFrequency
                    .filter((v) => !sharedValues.has(v))
                    .map((value, index) => (
                      <motion.div
                        key={value}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.02 }}
                      >
                        <ValueCard
                          value={value}
                          isShared={false}
                          isSelected={selectedTeamValues.includes(value)}
                          onClick={() => toggleValueSelection(value)}
                          size="lg"
                        />
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            </div>

            {/* Complete Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex justify-end gap-3"
            >
              <Button
                variant="outline"
                onClick={() => {
                  playSound('ui', 'toggle');
                  setSelectedTeamValues([]);
                }}
                disabled={selectedTeamValues.length === 0}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Selection
              </Button>
              <Button
                onClick={handleComplete}
                disabled={selectedTeamValues.length !== 5}
                className="gap-2"
              >
                {selectedTeamValues.length === 5 ? (
                  <>
                    <Check className="h-4 w-4" />
                    Continue with These Values
                  </>
                ) : (
                  <>
                    Select {5 - selectedTeamValues.length} More
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
