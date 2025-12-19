'use client';

/**
 * PreCrisisFlow Component
 *
 * Orchestrates the full pre-crisis experience (2-2.5 hours):
 * 1. Personal Values Discovery (45 min) - QuickSort, Meaning, Story
 * 2. Team Values Alignment (60 min) - Gallery, Definitions, Commitment
 * 3. Scenario Briefing (15 min) - Stakes and emotional anchor
 *
 * Design Principle: Private → Shared → Public progression.
 * Build psychological safety gradually.
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// LOCALSTORAGE PERSISTENCE
// ============================================================================

const STORAGE_PREFIX = 'crucible:discovery';

function getStorageKey(type: 'individual' | 'team' | 'step', sessionCode: string, id: string) {
  return `${STORAGE_PREFIX}:${type}:${sessionCode}:${id}`;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[Discovery] Failed to save to localStorage:', e);
  }
}

function loadFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn('[Discovery] Failed to load from localStorage:', e);
    return null;
  }
}

function clearDiscoveryStorage(sessionCode: string, participantId: string, teamId: string): void {
  try {
    localStorage.removeItem(getStorageKey('individual', sessionCode, participantId));
    localStorage.removeItem(getStorageKey('team', sessionCode, teamId));
    localStorage.removeItem(getStorageKey('step', sessionCode, participantId));
  } catch (e) {
    console.warn('[Discovery] Failed to clear localStorage:', e);
  }
}
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TeamValueDefinition, ParishIdLower, ValuesStory, DecisionProcess } from '@crucible/shared';
import type { ValueMeaning } from '@crucible/shared';

// Local types for UI submission (simpler than full shared types)
export interface IndividualValuesSubmission {
  participantId: string;
  topFive: string[];
  valueMeanings: Record<string, {
    definition: string;
    livingIt: string[];
    violatingIt: string[];
  }>;
  valuesStory?: string;
  selfIdentifiedValues: string[];
  peerIdentifiedValues: string[];
  submittedAt: number;
}

export interface TeamValuesSubmission {
  teamId: string;
  statedValues: string[];
  valueDefinitions: TeamValueDefinition[];
  commitmentStatement: string;
  decisionProcess: string;
  signatures: string[];
  readAloudAt?: number;
  submittedAt: number;
}

import { ChevronLeft, CheckCircle2 } from 'lucide-react';

// Import pre-crisis components
import { ValuesQuickSort } from './ValuesQuickSort';
import { ValuesMeaningForm } from './ValuesMeaningForm';
import { ValuesStoryCapture } from './ValuesStoryCapture';
import { TeamValuesGallery, type ParticipantValues } from './TeamValuesGallery';
import { TeamDefinitionsDialog } from './TeamDefinitionsDialog';
import { CommitmentEditor } from './CommitmentEditor';
import { ScenarioBriefing } from './ScenarioBriefing';
import { ProgressJourneyMap, type JourneyStep } from './ProgressJourneyMap';

// ============================================================================
// TYPES
// ============================================================================

export interface PreCrisisFlowProps {
  /** Session code for localStorage keying */
  sessionCode: string;
  /** Current participant info */
  participantId: string;
  participantName: string;
  /** Team info */
  teamId: string;
  teamName: string;
  parishId: string;
  parishName: string;
  /** All team participants for gallery */
  teamParticipants: Array<{
    participantId: string;
    name: string;
    topFive?: string[];
    valuesSubmitted?: boolean;
  }>;
  /** Callbacks for data submission */
  onSubmitIndividualValues: (profile: IndividualValuesSubmission) => void;
  onSubmitTeamValues: (profile: TeamValuesSubmission) => void;
  onReady: () => void;
  /** Skip modes for shorter sessions */
  skipPersonalStory?: boolean;
  skipGalleryWalk?: boolean;
  /** Existing data (for reconnection) */
  existingIndividualProfile?: IndividualValuesSubmission | null;
  existingTeamProfile?: TeamValuesSubmission | null;
}

type PreCrisisStep =
  | 'quick-sort'
  | 'values-meaning'
  | 'values-story'
  | 'team-gallery'
  | 'team-definitions'
  | 'commitment'
  | 'briefing'
  | 'complete';

interface StepConfig {
  id: PreCrisisStep;
  label: string;
  phase: 'personal' | 'team' | 'briefing';
  description: string;
}

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

const STEPS: StepConfig[] = [
  {
    id: 'quick-sort',
    label: 'Values Sort',
    phase: 'personal',
    description: 'Identify your top 5 values',
  },
  {
    id: 'values-meaning',
    label: 'Values Meaning',
    phase: 'personal',
    description: 'Define what your values mean to you',
  },
  {
    id: 'values-story',
    label: 'Values Story',
    phase: 'personal',
    description: 'Share a moment you acted from your values',
  },
  {
    id: 'team-gallery',
    label: 'Gallery Walk',
    phase: 'team',
    description: 'See what your team values',
  },
  {
    id: 'team-definitions',
    label: 'Team Values',
    phase: 'team',
    description: 'Define your team values together',
  },
  {
    id: 'commitment',
    label: 'Commitment',
    phase: 'team',
    description: 'Make your team commitment',
  },
  {
    id: 'briefing',
    label: 'Briefing',
    phase: 'briefing',
    description: 'Understand the stakes',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PreCrisisFlow({
  sessionCode,
  participantId,
  participantName,
  teamId,
  teamName,
  parishId,
  parishName,
  teamParticipants,
  onSubmitIndividualValues,
  onSubmitTeamValues,
  onReady,
  skipPersonalStory = false,
  skipGalleryWalk = false,
  existingIndividualProfile,
  existingTeamProfile,
}: PreCrisisFlowProps) {
  // Determine starting step based on existing data
  const getInitialStep = (): PreCrisisStep => {
    if (existingTeamProfile?.commitmentStatement) return 'briefing';
    if (existingTeamProfile?.valueDefinitions?.length) return 'commitment';
    if (existingIndividualProfile?.topFive?.length === 5) {
      return skipGalleryWalk ? 'team-definitions' : 'team-gallery';
    }
    return 'quick-sort';
  };

  const [currentStep, setCurrentStep] = useState<PreCrisisStep>(getInitialStep());

  // Individual profile data
  const [topFive, setTopFive] = useState<string[]>(
    existingIndividualProfile?.topFive || []
  );
  const [valueMeanings, setValueMeanings] = useState<
    Record<string, { definition: string; livingIt: string[]; violatingIt: string[] }>
  >(existingIndividualProfile?.valueMeanings || {});
  const [valuesStory, setValuesStory] = useState<{
    story: string;
    valuesDemonstrated: string[];
    peerIdentifiedValues: string[];
  } | null>(null);

  // Team profile data
  const [teamValues, setTeamValues] = useState<string[]>(
    existingTeamProfile?.statedValues || []
  );
  const [teamDefinitions, setTeamDefinitions] = useState<TeamValueDefinition[]>(
    existingTeamProfile?.valueDefinitions || []
  );
  const [commitment, setCommitment] = useState<string>(
    existingTeamProfile?.commitmentStatement || ''
  );
  const [decisionProcess, setDecisionProcess] = useState<string>(
    existingTeamProfile?.decisionProcess || 'consensus'
  );
  const [signatures, setSignatures] = useState<string[]>([]);

  // Track if we've restored from localStorage
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  // Restore progress from localStorage on mount
  useEffect(() => {
    if (restoredFromStorage || !sessionCode) return;

    // Try to restore individual profile
    const savedIndividual = loadFromStorage<{
      topFive: string[];
      valueMeanings: Record<string, { definition: string; livingIt: string[]; violatingIt: string[] }>;
    }>(getStorageKey('individual', sessionCode, participantId));

    if (savedIndividual) {
      if (savedIndividual.topFive?.length) setTopFive(savedIndividual.topFive);
      if (savedIndividual.valueMeanings) setValueMeanings(savedIndividual.valueMeanings);
      console.log('[Discovery] Restored individual profile from localStorage');
    }

    // Try to restore team profile
    const savedTeam = loadFromStorage<{
      teamValues: string[];
      teamDefinitions: TeamValueDefinition[];
      commitment: string;
      decisionProcess: string;
    }>(getStorageKey('team', sessionCode, teamId));

    if (savedTeam) {
      if (savedTeam.teamValues?.length) setTeamValues(savedTeam.teamValues);
      if (savedTeam.teamDefinitions?.length) setTeamDefinitions(savedTeam.teamDefinitions);
      if (savedTeam.commitment) setCommitment(savedTeam.commitment);
      if (savedTeam.decisionProcess) setDecisionProcess(savedTeam.decisionProcess);
      console.log('[Discovery] Restored team profile from localStorage');
    }

    // Restore step (need to check after activeSteps is calculated)
    const savedStep = loadFromStorage<PreCrisisStep>(getStorageKey('step', sessionCode, participantId));
    if (savedStep) {
      // Validate step is still valid
      const validSteps: PreCrisisStep[] = ['quick-sort', 'values-meaning', 'values-story', 'team-gallery', 'team-definitions', 'commitment', 'briefing', 'complete'];
      if (validSteps.includes(savedStep)) {
        setCurrentStep(savedStep);
        console.log('[Discovery] Restored step from localStorage:', savedStep);
      }
    }

    setRestoredFromStorage(true);
  }, [sessionCode, participantId, teamId, restoredFromStorage]);

  // Save individual progress to localStorage
  useEffect(() => {
    if (!restoredFromStorage || !sessionCode) return;
    saveToStorage(getStorageKey('individual', sessionCode, participantId), {
      topFive,
      valueMeanings,
    });
  }, [topFive, valueMeanings, sessionCode, participantId, restoredFromStorage]);

  // Save team progress to localStorage
  useEffect(() => {
    if (!restoredFromStorage || !sessionCode) return;
    saveToStorage(getStorageKey('team', sessionCode, teamId), {
      teamValues,
      teamDefinitions,
      commitment,
      decisionProcess,
    });
  }, [teamValues, teamDefinitions, commitment, decisionProcess, sessionCode, teamId, restoredFromStorage]);

  // Save current step to localStorage
  useEffect(() => {
    if (!restoredFromStorage || !sessionCode) return;
    saveToStorage(getStorageKey('step', sessionCode, participantId), currentStep);
  }, [currentStep, sessionCode, participantId, restoredFromStorage]);

  // Get active steps (filtering skipped ones)
  const activeSteps = STEPS.filter((step) => {
    if (skipPersonalStory && step.id === 'values-story') return false;
    if (skipGalleryWalk && step.id === 'team-gallery') return false;
    return true;
  });

  const currentStepIndex = activeSteps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / activeSteps.length) * 100;

  // Navigation
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStep(activeSteps[nextIndex].id);
    }
  }, [currentStepIndex, activeSteps]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(activeSteps[prevIndex].id);
    }
  }, [currentStepIndex, activeSteps]);

  // Step completion handlers
  const handleQuickSortComplete = useCallback(
    (result: { topFive: string[]; roundTimings: [number, number, number]; cardsConsidered: string[] }) => {
      setTopFive(result.topFive);
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleMeaningComplete = useCallback(
    (meaningsMap: Map<string, ValueMeaning>) => {
      // Convert Map to Record for our state
      const meanings: Record<string, { definition: string; livingIt: string[]; violatingIt: string[] }> = {};
      meaningsMap.forEach((val, key) => {
        meanings[key] = {
          definition: val.personalDefinition,
          livingIt: val.livingBehaviors,
          violatingIt: [], // ValueMeaning doesn't have violatingIt, derive from feelings
        };
      });
      setValueMeanings(meanings);

      // Submit individual profile
      const profile: IndividualValuesSubmission = {
        participantId,
        topFive,
        valueMeanings: meanings,
        valuesStory: valuesStory?.story,
        selfIdentifiedValues: topFive,
        peerIdentifiedValues: valuesStory?.peerIdentifiedValues || [],
        submittedAt: Date.now(),
      };
      onSubmitIndividualValues(profile);

      goToNextStep();
    },
    [participantId, topFive, valuesStory, onSubmitIndividualValues, goToNextStep]
  );

  const handleStoryComplete = useCallback(
    (story: ValuesStory) => {
      setValuesStory({
        story: story.storyText,
        valuesDemonstrated: story.selfIdentifiedValues,
        peerIdentifiedValues: story.peerIdentifiedValues,
      });
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleGalleryComplete = useCallback(
    (selectedValues: string[]) => {
      setTeamValues(selectedValues);
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleDefinitionsComplete = useCallback(
    (definitions: TeamValueDefinition[]) => {
      setTeamDefinitions(definitions);
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleCommitmentComplete = useCallback(
    (data: {
      commitmentText: string;
      decisionProcess: DecisionProcess;
      signatures: string[];
      readAloudAt: number | null;
    }) => {
      setCommitment(data.commitmentText);
      setDecisionProcess(data.decisionProcess);
      setSignatures(data.signatures);

      // Submit team profile
      const profile: TeamValuesSubmission = {
        teamId,
        statedValues: teamValues,
        valueDefinitions: teamDefinitions,
        commitmentStatement: data.commitmentText,
        decisionProcess: data.decisionProcess,
        signatures: data.signatures,
        readAloudAt: data.readAloudAt ?? undefined,
        submittedAt: Date.now(),
      };
      onSubmitTeamValues(profile);

      goToNextStep();
    },
    [teamId, teamValues, teamDefinitions, onSubmitTeamValues, goToNextStep]
  );

  const handleBriefingComplete = useCallback(() => {
    // Clear localStorage on successful completion
    clearDiscoveryStorage(sessionCode, participantId, teamId);
    setCurrentStep('complete');
    onReady();
  }, [sessionCode, participantId, teamId, onReady]);

  // Convert participants to gallery format
  const galleryParticipants: ParticipantValues[] = teamParticipants
    .filter((p) => p.topFive && p.topFive.length > 0)
    .map((p) => ({
      participantId: p.participantId,
      participantName: p.name,
      topFive: p.topFive || [],
    }));

  // Calculate completed steps for journey map
  const completedSteps: JourneyStep[] = activeSteps
    .slice(0, currentStepIndex)
    .map((s) => s.id as JourneyStep);

  // Build skipped steps list
  const skippedSteps: JourneyStep[] = [];
  if (skipPersonalStory) skippedSteps.push('values-story');
  if (skipGalleryWalk) skippedSteps.push('team-gallery');

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Journey Map Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b">
        <ProgressJourneyMap
          currentStep={currentStep as JourneyStep}
          completedSteps={completedSteps}
          skippedSteps={skippedSteps}
          teamName={teamName}
          participantName={participantName}
          onStepClick={(step) => {
            // Allow reviewing completed steps
            const stepIndex = activeSteps.findIndex((s) => s.id === step);
            if (stepIndex >= 0 && stepIndex < currentStepIndex) {
              setCurrentStep(step as PreCrisisStep);
            }
          }}
          className="max-w-4xl mx-auto"
        />
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {/* Quick Sort */}
          {currentStep === 'quick-sort' && (
            <motion.div
              key="quick-sort"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ValuesQuickSort
                onComplete={handleQuickSortComplete}
              />
            </motion.div>
          )}

          {/* Values Meaning */}
          {currentStep === 'values-meaning' && (
            <motion.div
              key="values-meaning"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ValuesMeaningForm
                topFiveValues={topFive}
                onComplete={handleMeaningComplete}
              />
            </motion.div>
          )}

          {/* Values Story */}
          {currentStep === 'values-story' && (
            <motion.div
              key="values-story"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ValuesStoryCapture
                topFiveValues={topFive}
                onComplete={handleStoryComplete}
              />
            </motion.div>
          )}

          {/* Team Gallery */}
          {currentStep === 'team-gallery' && (
            <motion.div
              key="team-gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TeamValuesGallery
                participants={galleryParticipants}
                onComplete={handleGalleryComplete}
                teamName={teamName}
              />
            </motion.div>
          )}

          {/* Team Definitions */}
          {currentStep === 'team-definitions' && (
            <motion.div
              key="team-definitions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TeamDefinitionsDialog
                teamValues={teamValues.length > 0 ? teamValues : topFive.slice(0, 5)}
                teamName={teamName}
                onComplete={handleDefinitionsComplete}
              />
            </motion.div>
          )}

          {/* Commitment */}
          {currentStep === 'commitment' && (
            <motion.div
              key="commitment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CommitmentEditor
                teamValues={teamDefinitions}
                teamMembers={teamParticipants.map((p) => ({
                  id: p.participantId,
                  name: p.name,
                  hasSigned: false,
                }))}
                participantId={participantId}
                onComplete={handleCommitmentComplete}
              />
            </motion.div>
          )}

          {/* Briefing */}
          {currentStep === 'briefing' && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ScenarioBriefing
                assignedParish={parishId as ParishIdLower}
                teamName={teamName}
                onReady={handleBriefingComplete}
              />
            </motion.div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <div>
                <h2 className="text-2xl font-bold">Pre-Crisis Complete</h2>
                <p className="text-muted-foreground mt-2">
                  You have your values. You have your commitment.
                  <br />
                  Now you&apos;ll practice living them when it gets hard.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for the Crucible Master to begin the simulation...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Footer */}
      {currentStep !== 'complete' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goToPrevStep}
              disabled={currentStepIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="text-sm text-center">
              <span className="font-medium">
                {activeSteps[currentStepIndex]?.label}
              </span>
              <br />
              <span className="text-xs text-muted-foreground">
                {activeSteps[currentStepIndex]?.description}
              </span>
            </div>

            <div className="w-[80px]" /> {/* Spacer for alignment */}
          </div>
        </footer>
      )}
    </div>
  );
}

export type { PreCrisisStep };
