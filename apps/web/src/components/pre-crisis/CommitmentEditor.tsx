'use client';

/**
 * CommitmentEditor Component
 *
 * Creates the team commitment statement with:
 * - Team values summary
 * - Commitment text editor
 * - Decision process selection
 * - Digital signatures
 * - Read aloud ceremony
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { TeamValueDefinition, DecisionProcess } from '@crucible/shared';
import { usePreCrisisStore } from '@/stores/preCrisisStore';
import { useSound } from '@/hooks/useSound';
import {
  Check,
  Pen,
  Users,
  Scale,
  Crown,
  Target,
  Mic,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Shield,
  Heart,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  hasSigned: boolean;
}

// ============================================================================
// DECISION PROCESS OPTIONS
// ============================================================================

const DECISION_PROCESSES: {
  id: DecisionProcess;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'consensus',
    label: 'Consensus',
    description: 'Everyone must agree before taking action',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 'consultative',
    label: 'Consultative',
    description: 'Leader decides after gathering input from all',
    icon: <Scale className="h-5 w-5" />,
  },
  {
    id: 'majority',
    label: 'Majority Vote',
    description: '50%+ carries the decision',
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: 'leader',
    label: 'Designated Leader',
    description: 'One person has final decision authority',
    icon: <Crown className="h-5 w-5" />,
  },
  {
    id: 'valuesCheck',
    label: 'Values Check',
    description: 'Always name the value at stake before deciding',
    icon: <Sparkles className="h-5 w-5" />,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export interface CommitmentEditorProps {
  teamValues: TeamValueDefinition[];
  teamMembers: TeamMember[];
  participantId: string;
  onComplete: (data: {
    commitmentText: string;
    decisionProcess: DecisionProcess;
    signatures: string[];
    readAloudAt: number | null;
  }) => void;
}

export function CommitmentEditor({
  teamValues,
  teamMembers,
  participantId,
  onComplete,
}: CommitmentEditorProps) {
  // Store
  const {
    teamAlignment,
    setCommitmentText,
    setDecisionProcess,
    addSignature,
    setReadAloud,
    completeTeamAlignment,
  } = usePreCrisisStore();

  // Sound effects
  const { play: playSound } = useSound();

  // Local state
  const [step, setStep] = useState<'draft' | 'process' | 'sign' | 'ceremony'>('draft');
  const [commitmentDraft, setCommitmentDraft] = useState(
    teamAlignment.commitmentText ||
      'When pressure mounts and we face difficult decisions, we commit to...'
  );
  const [selectedProcess, setSelectedProcess] = useState<DecisionProcess>(
    teamAlignment.decisionProcess || 'consensus'
  );
  const [signatures, setSignatures] = useState<Set<string>>(
    new Set(teamAlignment.signatures)
  );
  const [ceremonyStarted, setCeremonyStarted] = useState(false);
  const [readAloudComplete, setReadAloudComplete] = useState(false);
  const [showSealAnimation, setShowSealAnimation] = useState(false);

  // Check if current user has signed
  const hasSigned = signatures.has(participantId);

  // Check if all members have signed
  const allSigned = teamMembers.every((m) => signatures.has(m.id));

  // Handle signing
  const handleSign = () => {
    playSound('ui', 'success');
    setSignatures((prev) => new Set([...prev, participantId]));
    addSignature(participantId);
  };

  // Handle completing the ceremony
  const handleCeremonyComplete = () => {
    playSound('dramatic', 'commitmentSeal');
    setShowSealAnimation(true);
    setTimeout(() => {
      setReadAloud();
      setReadAloudComplete(true);
      setShowSealAnimation(false);
    }, 1500);
  };

  // Handle final completion
  const handleComplete = () => {
    playSound('dramatic', 'phaseTransition');
    setCommitmentText(commitmentDraft);
    setDecisionProcess(selectedProcess);
    completeTeamAlignment();
    onComplete({
      commitmentText: commitmentDraft,
      decisionProcess: selectedProcess,
      signatures: Array.from(signatures),
      readAloudAt: teamAlignment.readAloudAt,
    });
  };

  // Handle step navigation
  const goToStep = (newStep: typeof step, direction: 'forward' | 'back' = 'forward') => {
    if (direction === 'forward') {
      playSound('ui', 'success');
    } else {
      playSound('ui', 'toggle');
    }
    setStep(newStep);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Step 1: Draft commitment
  if (step === 'draft') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="h-8 w-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold">Team Commitment</h1>
            <p className="text-muted-foreground">
              Create a commitment that captures how your team will uphold these values
            </p>
          </motion.div>

          {/* Values Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Your Team Values
            </h3>
            <div className="space-y-2">
              {teamValues.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium">{v.value}</span>
                    {v.teamDefinition && (
                      <span className="text-sm text-muted-foreground">
                        {' '}
                        — {v.teamDefinition}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Commitment Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <label className="flex items-center gap-2 font-medium">
              <Pen className="h-4 w-4 text-primary" />
              Your Commitment Statement
            </label>
            <Textarea
              value={commitmentDraft}
              onChange={(e) => setCommitmentDraft(e.target.value)}
              placeholder="When pressure mounts and we face difficult decisions, we commit to..."
              className="min-h-[150px] text-lg focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground">Suggestions:</span>
              {[
                { text: '+ Speak up about drift', addition: ' We will speak up when we see drift from our values, even when it is uncomfortable.' },
                { text: '+ Prioritize over pressure', addition: ' We will prioritize [value] over short-term pressure.' },
                { text: '+ Name the value', addition: ' We will name the value at stake before every major decision.' },
              ].map(({ text, addition }) => (
                <motion.button
                  key={text}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                  onClick={() => {
                    playSound('ui', 'select');
                    setCommitmentDraft((prev) => prev + addition);
                  }}
                >
                  {text}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-3 bg-muted/30 rounded-lg text-sm space-y-2 border border-border"
          >
            <p className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              A good commitment is:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Specific enough to be testable (you could fail at it)</li>
              <li>Written the way you would say it, not corporate language</li>
              <li>Something you are willing to be held accountable for</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => {
                setCommitmentText(commitmentDraft);
                goToStep('process', 'forward');
              }}
              className="w-full gap-2"
              disabled={commitmentDraft.trim().length < 20}
            >
              Continue to Decision Process
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 2: Decision process
  if (step === 'process') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">How Will You Decide?</h1>
            <p className="text-muted-foreground">
              Choose the decision-making process your team will use during the crisis
            </p>
          </div>

          {/* Process Options */}
          <div className="space-y-3">
            {DECISION_PROCESSES.map((process) => (
              <label
                key={process.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                  selectedProcess === process.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <input
                  type="radio"
                  name="decisionProcess"
                  value={process.id}
                  checked={selectedProcess === process.id}
                  onChange={() => setSelectedProcess(process.id)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    selectedProcess === process.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {process.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{process.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {process.description}
                  </div>
                </div>
                {selectedProcess === process.id && (
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </label>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('draft')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => {
                setDecisionProcess(selectedProcess);
                setStep('sign');
              }}
              className="flex-1"
            >
              Continue to Signatures
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Signatures
  if (step === 'sign') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Sign Your Commitment</h1>
            <p className="text-muted-foreground">
              Each team member signs to affirm their commitment
            </p>
          </div>

          {/* Commitment Display */}
          <div className="p-6 bg-muted/30 rounded-xl border space-y-4">
            <div className="text-center text-sm text-muted-foreground uppercase tracking-wide">
              Team Commitment
            </div>
            <p className="text-lg leading-relaxed">{commitmentDraft}</p>
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">
                Decision Process: <span className="font-medium">{selectedProcess}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Signatures</h3>
              <span className="text-sm text-muted-foreground">
                {signatures.size} of {teamMembers.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {teamMembers.map((member) => {
                const memberSigned = signatures.has(member.id);
                const isCurrentUser = member.id === participantId;

                return (
                  <div
                    key={member.id}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      memberSigned
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-dashed border-muted-foreground/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {member.name}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (you)
                            </span>
                          )}
                        </div>
                        {memberSigned ? (
                          <div className="flex items-center gap-1 text-sm text-green-500">
                            <Check className="h-3 w-3" />
                            Signed
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Awaiting signature
                          </div>
                        )}
                      </div>

                      {isCurrentUser && !memberSigned && (
                        <Button size="sm" onClick={handleSign}>
                          <Pen className="h-3 w-3 mr-1" />
                          Sign
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('process')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => setStep('ceremony')}
              className="flex-1"
              disabled={!allSigned}
            >
              {allSigned ? 'Continue to Ceremony' : `Waiting for ${teamMembers.length - signatures.size} more`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Read Aloud Ceremony
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Seal animation overlay */}
      <AnimatePresence>
        {showSealAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-2xl shadow-amber-500/50"
            >
              <Shield className="h-16 w-16 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute mt-48 text-xl font-bold text-amber-400"
            >
              SEALED
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          {!ceremonyStarted ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Mic className="h-12 w-12 text-primary" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold"
              >
                The Commitment Ceremony
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground"
              >
                Your team has signed the commitment. Now it is time to make it real.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg text-sm text-left border border-primary/20"
              >
                <p>
                  <span className="font-semibold">Instructions:</span> Choose one person
                  to read the commitment aloud, OR read it together as a team.
                </p>
                <p className="mt-2 text-muted-foreground italic">
                  This moment matters. Speaking your commitment aloud makes it more than
                  words on a screen.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={() => {
                    playSound('dramatic', 'phaseTransition');
                    setCeremonyStarted(true);
                  }}
                  size="lg"
                  className="gap-2"
                >
                  <Mic className="h-4 w-4" />
                  Begin Reading
                </Button>
              </motion.div>
            </motion.div>
          ) : !readAloudComplete ? (
            <motion.div
              key="ceremony"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <motion.div
                className="p-8 bg-gradient-to-b from-primary/20 to-primary/5 rounded-2xl border-2 border-primary/30 shadow-lg shadow-primary/10"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center text-sm text-primary uppercase tracking-widest mb-6 font-semibold"
                >
                  Team Commitment
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl leading-relaxed text-center"
                >
                  {commitmentDraft}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 pt-6 border-t border-primary/20"
                >
                  <div className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide">
                    Signed by
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teamMembers.map((member, index) => (
                      <motion.span
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="px-3 py-1 bg-background/50 rounded-full text-sm border border-primary/20"
                      >
                        {member.name}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
                <Button onClick={handleCeremonyComplete} size="lg" className="px-8 gap-2">
                  <Check className="h-4 w-4" />
                  We Have Read It Aloud
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <Check className="h-12 w-12 text-green-500" />
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold"
              >
                Commitment Sealed
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground"
              >
                You have your values. You have your commitment.
                <br />
                Now you will practice living them when it gets hard.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button onClick={handleComplete} size="lg" className="px-8 gap-2">
                  Continue to Briefing
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
