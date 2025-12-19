'use client';

/**
 * DilemmaPresenter Component
 *
 * Cinematic presentation of dilemmas with:
 * - Typewriter text reveal for persona dialogue
 * - Animated persona avatar
 * - Staggered option card reveals
 * - Impact preview on hover
 * - Team voting indicators
 * - Sound effects throughout
 *
 * Replaces the simpler DilemmaModal with a more dramatic experience.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import type { Dilemma, DilemmaOption, PersonaId } from '@crucible/shared';
import { PERSONAS } from '@crucible/shared';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamVote {
  odayerId: string;
  playerName: string;
  optionId: string | null;
  timestamp: number;
}

export interface DilemmaPresenterProps {
  dilemma: Dilemma;
  onDecide: (optionId: string, rationale: string) => void;
  teamVotes?: TeamVote[];
  currentPlayerId?: string;
  timeLimit?: number;
  onTimeExpired?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PARISH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  keystone: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  haven: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  gateway: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  heartland: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  summit: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  sterling: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypewriterText({
  text,
  onComplete,
  speed = 30,
}: {
  text: string;
  onComplete?: () => void;
  speed?: number;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-2 h-5 bg-primary ml-1 align-middle"
        />
      )}
    </span>
  );
}

function PersonaAvatar({
  personaId,
  speaking,
}: {
  personaId: PersonaId;
  speaking: boolean;
}) {
  const persona = PERSONAS[personaId];
  if (!persona) return null;

  const colors = PARISH_COLORS[persona.parishId] || PARISH_COLORS.sterling;

  return (
    <motion.div
      className={cn(
        'relative w-20 h-20 rounded-full border-4 flex items-center justify-center',
        colors.bg,
        colors.border
      )}
      animate={speaking ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.5, repeat: speaking ? Infinity : 0 }}
    >
      <User className={cn('h-10 w-10', colors.text)} />

      {/* Speaking indicator */}
      {speaking && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          <MessageCircle className="h-3 w-3 text-primary-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}

function ValueImpactIndicator({
  value,
  impact,
}: {
  value: string;
  impact: number;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground capitalize">{value.replace(/-/g, ' ')}</span>
      <div className="flex items-center gap-1">
        {impact > 0 && <TrendingUp className="h-3 w-3 text-green-500" />}
        {impact < 0 && <TrendingDown className="h-3 w-3 text-red-500" />}
        {impact === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
        <span className={cn(
          'font-mono',
          impact > 0 && 'text-green-500',
          impact < 0 && 'text-red-500',
          impact === 0 && 'text-muted-foreground'
        )}>
          {impact > 0 ? '+' : ''}{impact}
        </span>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  disabled,
  voteCount,
  totalVotes,
}: {
  option: DilemmaOption;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  disabled: boolean;
  voteCount: number;
  totalVotes: number;
}) {
  const letterLabels = ['A', 'B', 'C', 'D'];
  const { play: playSound } = useSound();

  const handleClick = () => {
    if (!disabled) {
      playSound('ui', 'select');
      onSelect();
    }
  };

  const handleMouseEnter = () => {
    onHover(true);
    playSound('ui', 'hover');
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHover(false)}
      disabled={disabled}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.15 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden',
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-muted hover:border-muted-foreground/50 bg-card/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Vote progress bar (background) */}
      {totalVotes > 0 && (
        <motion.div
          className="absolute inset-0 bg-primary/5"
          initial={{ width: 0 }}
          animate={{ width: `${(voteCount / totalVotes) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      )}

      <div className="relative flex items-start gap-4">
        {/* Letter badge */}
        <motion.div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {letterLabels[index]}
        </motion.div>

        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="font-semibold mb-1">{option.label}</div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-2">{option.description}</p>

          {/* Impact preview (shown on hover or selection) */}
          <AnimatePresence>
            {(isHovered || isSelected) && option.valueAlignment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2 border-t border-border/50 space-y-1"
              >
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Potential Impact:
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(option.valueAlignment).map(([value, impact]) => (
                    <ValueImpactIndicator key={value} value={value} impact={impact} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Consequence hint */}
          {option.consequenceSketch && (
            <p className="text-xs text-muted-foreground/70 italic mt-2">
              {option.consequenceSketch.immediate}
            </p>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0"
          >
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </motion.div>
        )}

        {/* Vote count badge */}
        {voteCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 px-2 py-0.5 bg-primary/20 rounded-full text-xs font-semibold"
          >
            {voteCount} vote{voteCount !== 1 ? 's' : ''}
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

function TeamVotingIndicator({
  votes,
  currentPlayerId,
}: {
  votes: TeamVote[];
  currentPlayerId?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1">
        {votes.map((vote) => (
          <motion.div
            key={vote.odayerId}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
              vote.optionId
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
              vote.odayerId === currentPlayerId && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            title={`${vote.playerName}${vote.optionId ? ' has voted' : ' waiting'}`}
          >
            {vote.playerName.charAt(0).toUpperCase()}
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-2">
        {votes.filter((v) => v.optionId).length}/{votes.length} voted
      </span>
    </div>
  );
}

function CountdownTimer({
  seconds,
  onExpired,
}: {
  seconds: number;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const { play: playSound } = useSound();

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpired?.();
          return 0;
        }
        if (prev === 30) playSound('timer', 'warning');
        if (prev === 10) playSound('timer', 'urgent');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpired, playSound]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 30;
  const isCritical = remaining <= 10;

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        isCritical && 'bg-red-500/20 text-red-500',
        isUrgent && !isCritical && 'bg-amber-500/20 text-amber-500',
        !isUrgent && 'bg-muted/50 text-muted-foreground'
      )}
      animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
    >
      <Clock className="h-4 w-4" />
      <span className="font-mono font-bold">
        {minutes}:{secs.toString().padStart(2, '0')}
      </span>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DilemmaPresenter({
  dilemma,
  onDecide,
  teamVotes = [],
  currentPlayerId,
  timeLimit,
  onTimeExpired,
  className,
}: DilemmaPresenterProps) {
  const [phase, setPhase] = useState<'intro' | 'options' | 'confirm'>('intro');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [textComplete, setTextComplete] = useState(false);
  const { play: playSound } = useSound();

  // Get persona info
  const primaryPersonaId = Array.isArray(dilemma.personaId)
    ? dilemma.personaId[0]
    : dilemma.personaId;
  const persona = PERSONAS[primaryPersonaId];
  const colors = persona ? PARISH_COLORS[persona.parishId] || PARISH_COLORS.sterling : PARISH_COLORS.sterling;

  // Calculate vote counts per option
  const voteCounts = dilemma.options.reduce((acc, opt) => {
    acc[opt.id] = teamVotes.filter((v) => v.optionId === opt.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Play sound on mount
  useEffect(() => {
    playSound('dramatic', 'breakingNews');
  }, [playSound]);

  // Handle text completion
  const handleTextComplete = useCallback(() => {
    setTextComplete(true);
    setTimeout(() => setPhase('options'), 500);
  }, []);

  // Handle option selection
  const handleSelectOption = useCallback((optionId: string) => {
    setSelectedOptionId(optionId);
    playSound('ui', 'select');
  }, [playSound]);

  // Handle continue to confirmation
  const handleContinue = useCallback(() => {
    if (selectedOptionId) {
      setPhase('confirm');
      playSound('ui', 'notification');
    }
  }, [selectedOptionId, playSound]);

  // Handle final submission
  const handleSubmit = useCallback(() => {
    if (selectedOptionId && rationale.trim().length >= 10) {
      playSound('dramatic', 'decisionConfirm');
      onDecide(selectedOptionId, rationale.trim());
    }
  }, [selectedOptionId, rationale, onDecide, playSound]);

  const selectedOption = dilemma.options.find((o) => o.id === selectedOptionId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border bg-background shadow-2xl"
      >
        {/* Header with persona and timer */}
        <div className={cn('p-4 border-b', colors.bg, colors.border)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PersonaAvatar
                personaId={primaryPersonaId}
                speaking={phase === 'intro' && !textComplete}
              />
              <div>
                <div className={cn('font-bold text-lg', colors.text)}>
                  {persona?.name || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {persona?.title || ''}
                </div>
              </div>
            </div>

            {timeLimit && (
              <CountdownTimer seconds={timeLimit} onExpired={onTimeExpired} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {/* Intro Phase: Typewriter text */}
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Values at stake badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-500 font-semibold">
                    Values at stake: {dilemma.valuesTested.join(', ')}
                  </span>
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl font-bold">{dilemma.title}</h2>

                {/* Typewriter setup text */}
                <div className="p-4 bg-muted/30 rounded-xl border">
                  <p className="text-lg leading-relaxed">
                    <TypewriterText
                      text={dilemma.setup}
                      onComplete={handleTextComplete}
                      speed={25}
                    />
                  </p>
                </div>

                {/* Signature line */}
                {persona?.signatureLine && textComplete && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm italic text-muted-foreground text-right"
                  >
                    &ldquo;{persona.signatureLine}&rdquo;
                  </motion.p>
                )}

                {/* Skip button */}
                {!textComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTextComplete(true);
                      setPhase('options');
                    }}
                    className="text-muted-foreground"
                  >
                    Skip intro
                  </Button>
                )}
              </motion.div>
            )}

            {/* Options Phase */}
            {phase === 'options' && (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">What will you do?</h3>

                  {/* Notable moment badge for pivotal decisions */}
                  {dilemma.narrativeWeight === 'pivotal' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-500">
                        Pivotal Decision
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Team voting indicator */}
                {teamVotes.length > 0 && (
                  <TeamVotingIndicator
                    votes={teamVotes}
                    currentPlayerId={currentPlayerId}
                  />
                )}

                {/* Option cards */}
                <div className="space-y-3">
                  {dilemma.options.map((option, index) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      index={index}
                      isSelected={selectedOptionId === option.id}
                      isHovered={hoveredOptionId === option.id}
                      onSelect={() => handleSelectOption(option.id)}
                      onHover={(hovering) => setHoveredOptionId(hovering ? option.id : null)}
                      disabled={false}
                      voteCount={voteCounts[option.id] || 0}
                      totalVotes={teamVotes.length}
                    />
                  ))}
                </div>

                {/* Continue button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedOptionId}
                    size="lg"
                    className="px-8"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Confirm Phase */}
            {phase === 'confirm' && selectedOption && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Confirm Your Decision</h3>
                  <p className="text-sm text-muted-foreground">
                    Explain your team&apos;s reasoning. This will be recorded for the debrief.
                  </p>
                </div>

                {/* Selected option summary */}
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                  <div className="text-xs text-primary font-semibold mb-1">
                    You chose:
                  </div>
                  <div className="font-semibold text-lg">{selectedOption.label}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedOption.description}
                  </p>
                </div>

                {/* Rationale input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Why did you choose this?
                  </label>
                  <Textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="We chose this because..."
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum 10 characters required</span>
                    <span>{rationale.length}/500</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setPhase('options')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={rationale.trim().length < 10}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Decision
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DilemmaPresenter;
