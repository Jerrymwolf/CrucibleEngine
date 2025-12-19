/**
 * Pre-Crisis Store
 *
 * Manages state for the pre-crisis values discovery phase:
 * - Personal values quick sort (3 rounds, timed)
 * - Values meaning exercise
 * - Values story capture
 * - Team values alignment
 * - Team commitment with signatures
 */

import { create } from 'zustand';
import type {
  QuickSortResult,
  ValueMeaning,
  ValuesStory,
  TeamValueDefinition,
  DecisionProcess,
} from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

export type PreCrisisPhase =
  | 'quick-sort'
  | 'values-meaning'
  | 'values-story'
  | 'team-gallery'
  | 'team-definitions'
  | 'commitment'
  | 'decision-process'
  | 'org-values'
  | 'briefing'
  | 'complete';

export type QuickSortRound = 1 | 2 | 3;

export interface QuickSortState {
  /** Current round (1-3) */
  currentRound: QuickSortRound;
  /** Cards in each pile by round */
  piles: {
    essential: string[];
    important: string[];
    notCore: string[];
  };
  /** Selected top 5 (after round 3) */
  topFive: string[];
  /** Timing per round */
  roundTimings: [number, number, number];
  /** Cards that made it to essential pile */
  cardsConsidered: string[];
  /** Whether sort is complete */
  complete: boolean;
}

export interface ValuesMeaningState {
  /** Meanings captured for top 3 values */
  meanings: Map<string, ValueMeaning>;
  /** Current value being defined */
  currentValueIndex: number;
  /** Whether all meanings are complete */
  complete: boolean;
}

export interface ValuesStoryState {
  /** Story text */
  storyText: string;
  /** Self-identified values */
  selfIdentifiedValues: string[];
  /** Peer-identified values (from triad) */
  peerIdentifiedValues: string[];
  /** Whether story is complete */
  storyComplete: boolean;
  /** Whether triad is complete */
  triadComplete: boolean;
}

export interface TeamAlignmentState {
  /** Team members' profiles visible in gallery */
  memberProfiles: Map<
    string,
    {
      participantId: string;
      participantName: string;
      topFive: string[];
      revealed: boolean;
    }
  >;
  /** Selected team values */
  selectedTeamValues: string[];
  /** Team value definitions */
  definitions: TeamValueDefinition[];
  /** Commitment text */
  commitmentText: string;
  /** Decision process */
  decisionProcess: DecisionProcess;
  /** Signatures (participant IDs) */
  signatures: string[];
  /** When read aloud */
  readAloudAt: number | null;
  /** Whether alignment is complete */
  complete: boolean;
}

interface PreCrisisState {
  // Current phase
  phase: PreCrisisPhase;
  participantId: string | null;
  participantName: string | null;
  teamId: string | null;

  // Quick Sort
  quickSort: QuickSortState;

  // Values Meaning
  valuesMeaning: ValuesMeaningState;

  // Values Story
  valuesStory: ValuesStoryState;

  // Team Alignment
  teamAlignment: TeamAlignmentState;

  // Org Values (optional)
  orgValues: {
    enabled: boolean;
    values: string[];
    alignmentRatings: Map<string, number>;
    extensionCommitment: string;
    complete: boolean;
  };

  // Actions
  setParticipant: (id: string, name: string, teamId: string) => void;
  setPhase: (phase: PreCrisisPhase) => void;

  // Quick Sort Actions
  setQuickSortRound: (round: QuickSortRound) => void;
  addToPile: (pile: 'essential' | 'important' | 'notCore', cardId: string) => void;
  removeFromPile: (pile: 'essential' | 'important' | 'notCore', cardId: string) => void;
  setTopFive: (values: string[]) => void;
  setRoundTiming: (round: QuickSortRound, timeMs: number) => void;
  completeQuickSort: () => void;

  // Values Meaning Actions
  setValueMeaning: (value: string, meaning: ValueMeaning) => void;
  setCurrentMeaningIndex: (index: number) => void;
  completeMeanings: () => void;

  // Values Story Actions
  setStoryText: (text: string) => void;
  setSelfIdentifiedValues: (values: string[]) => void;
  setPeerIdentifiedValues: (values: string[]) => void;
  completeStory: () => void;
  completeTriad: () => void;

  // Team Alignment Actions
  addMemberProfile: (
    participantId: string,
    participantName: string,
    topFive: string[]
  ) => void;
  revealMember: (participantId: string) => void;
  setSelectedTeamValues: (values: string[]) => void;
  addTeamDefinition: (definition: TeamValueDefinition) => void;
  updateTeamDefinition: (index: number, definition: TeamValueDefinition) => void;
  setCommitmentText: (text: string) => void;
  setDecisionProcess: (process: DecisionProcess) => void;
  addSignature: (participantId: string) => void;
  setReadAloud: () => void;
  completeTeamAlignment: () => void;

  // Org Values Actions
  enableOrgValues: (values: string[]) => void;
  setOrgAlignmentRating: (value: string, rating: number) => void;
  setOrgExtensionCommitment: (text: string) => void;
  completeOrgValues: () => void;

  // Get compiled data
  getQuickSortResult: () => QuickSortResult;
  getValuesStory: () => ValuesStory;
  getTeamCommitment: () => {
    values: TeamValueDefinition[];
    commitmentText: string;
    decisionProcess: DecisionProcess;
    signatures: string[];
    readAloudAt: number | null;
  };

  // Reset
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialQuickSort: QuickSortState = {
  currentRound: 1,
  piles: {
    essential: [],
    important: [],
    notCore: [],
  },
  topFive: [],
  roundTimings: [0, 0, 0],
  cardsConsidered: [],
  complete: false,
};

const initialValuesMeaning: ValuesMeaningState = {
  meanings: new Map(),
  currentValueIndex: 0,
  complete: false,
};

const initialValuesStory: ValuesStoryState = {
  storyText: '',
  selfIdentifiedValues: [],
  peerIdentifiedValues: [],
  storyComplete: false,
  triadComplete: false,
};

const initialTeamAlignment: TeamAlignmentState = {
  memberProfiles: new Map(),
  selectedTeamValues: [],
  definitions: [],
  commitmentText: '',
  decisionProcess: 'consensus',
  signatures: [],
  readAloudAt: null,
  complete: false,
};

// ============================================================================
// STORE
// ============================================================================

export const usePreCrisisStore = create<PreCrisisState>((set, get) => ({
  phase: 'quick-sort',
  participantId: null,
  participantName: null,
  teamId: null,
  quickSort: { ...initialQuickSort },
  valuesMeaning: { ...initialValuesMeaning },
  valuesStory: { ...initialValuesStory },
  teamAlignment: { ...initialTeamAlignment },
  orgValues: {
    enabled: false,
    values: [],
    alignmentRatings: new Map(),
    extensionCommitment: '',
    complete: false,
  },

  // Participant
  setParticipant: (id, name, teamId) =>
    set({ participantId: id, participantName: name, teamId }),

  // Phase
  setPhase: (phase) => set({ phase }),

  // Quick Sort Actions
  setQuickSortRound: (round) =>
    set((state) => ({
      quickSort: { ...state.quickSort, currentRound: round },
    })),

  addToPile: (pile, cardId) =>
    set((state) => {
      const newPiles = { ...state.quickSort.piles };
      // Remove from other piles first
      for (const p of ['essential', 'important', 'notCore'] as const) {
        newPiles[p] = newPiles[p].filter((id) => id !== cardId);
      }
      // Add to target pile
      newPiles[pile] = [...newPiles[pile], cardId];

      // Track cards considered (those that made it to essential)
      const cardsConsidered =
        pile === 'essential' && !state.quickSort.cardsConsidered.includes(cardId)
          ? [...state.quickSort.cardsConsidered, cardId]
          : state.quickSort.cardsConsidered;

      return {
        quickSort: {
          ...state.quickSort,
          piles: newPiles,
          cardsConsidered,
        },
      };
    }),

  removeFromPile: (pile, cardId) =>
    set((state) => ({
      quickSort: {
        ...state.quickSort,
        piles: {
          ...state.quickSort.piles,
          [pile]: state.quickSort.piles[pile].filter((id) => id !== cardId),
        },
      },
    })),

  setTopFive: (values) =>
    set((state) => ({
      quickSort: { ...state.quickSort, topFive: values },
    })),

  setRoundTiming: (round, timeMs) =>
    set((state) => {
      const timings = [...state.quickSort.roundTimings] as [number, number, number];
      timings[round - 1] = timeMs;
      return {
        quickSort: { ...state.quickSort, roundTimings: timings },
      };
    }),

  completeQuickSort: () =>
    set((state) => ({
      quickSort: { ...state.quickSort, complete: true },
      phase: 'values-meaning',
    })),

  // Values Meaning Actions
  setValueMeaning: (value, meaning) =>
    set((state) => {
      const meanings = new Map(state.valuesMeaning.meanings);
      meanings.set(value, meaning);
      return {
        valuesMeaning: { ...state.valuesMeaning, meanings },
      };
    }),

  setCurrentMeaningIndex: (index) =>
    set((state) => ({
      valuesMeaning: { ...state.valuesMeaning, currentValueIndex: index },
    })),

  completeMeanings: () =>
    set((state) => ({
      valuesMeaning: { ...state.valuesMeaning, complete: true },
      phase: 'values-story',
    })),

  // Values Story Actions
  setStoryText: (text) =>
    set((state) => ({
      valuesStory: { ...state.valuesStory, storyText: text },
    })),

  setSelfIdentifiedValues: (values) =>
    set((state) => ({
      valuesStory: { ...state.valuesStory, selfIdentifiedValues: values },
    })),

  setPeerIdentifiedValues: (values) =>
    set((state) => ({
      valuesStory: { ...state.valuesStory, peerIdentifiedValues: values },
    })),

  completeStory: () =>
    set((state) => ({
      valuesStory: { ...state.valuesStory, storyComplete: true },
    })),

  completeTriad: () =>
    set((state) => ({
      valuesStory: { ...state.valuesStory, triadComplete: true },
      phase: 'team-gallery',
    })),

  // Team Alignment Actions
  addMemberProfile: (participantId, participantName, topFive) =>
    set((state) => {
      const profiles = new Map(state.teamAlignment.memberProfiles);
      profiles.set(participantId, {
        participantId,
        participantName,
        topFive,
        revealed: false,
      });
      return {
        teamAlignment: { ...state.teamAlignment, memberProfiles: profiles },
      };
    }),

  revealMember: (participantId) =>
    set((state) => {
      const profiles = new Map(state.teamAlignment.memberProfiles);
      const profile = profiles.get(participantId);
      if (profile) {
        profiles.set(participantId, { ...profile, revealed: true });
      }
      return {
        teamAlignment: { ...state.teamAlignment, memberProfiles: profiles },
      };
    }),

  setSelectedTeamValues: (values) =>
    set((state) => ({
      teamAlignment: { ...state.teamAlignment, selectedTeamValues: values },
    })),

  addTeamDefinition: (definition) =>
    set((state) => ({
      teamAlignment: {
        ...state.teamAlignment,
        definitions: [...state.teamAlignment.definitions, definition],
      },
    })),

  updateTeamDefinition: (index, definition) =>
    set((state) => {
      const definitions = [...state.teamAlignment.definitions];
      definitions[index] = definition;
      return {
        teamAlignment: { ...state.teamAlignment, definitions },
      };
    }),

  setCommitmentText: (text) =>
    set((state) => ({
      teamAlignment: { ...state.teamAlignment, commitmentText: text },
    })),

  setDecisionProcess: (process) =>
    set((state) => ({
      teamAlignment: { ...state.teamAlignment, decisionProcess: process },
    })),

  addSignature: (participantId) =>
    set((state) => ({
      teamAlignment: {
        ...state.teamAlignment,
        signatures: state.teamAlignment.signatures.includes(participantId)
          ? state.teamAlignment.signatures
          : [...state.teamAlignment.signatures, participantId],
      },
    })),

  setReadAloud: () =>
    set((state) => ({
      teamAlignment: { ...state.teamAlignment, readAloudAt: Date.now() },
    })),

  completeTeamAlignment: () =>
    set((state) => ({
      teamAlignment: { ...state.teamAlignment, complete: true },
      phase: state.orgValues.enabled ? 'org-values' : 'briefing',
    })),

  // Org Values Actions
  enableOrgValues: (values) =>
    set((state) => ({
      orgValues: { ...state.orgValues, enabled: true, values },
    })),

  setOrgAlignmentRating: (value, rating) =>
    set((state) => {
      const ratings = new Map(state.orgValues.alignmentRatings);
      ratings.set(value, rating);
      return {
        orgValues: { ...state.orgValues, alignmentRatings: ratings },
      };
    }),

  setOrgExtensionCommitment: (text) =>
    set((state) => ({
      orgValues: { ...state.orgValues, extensionCommitment: text },
    })),

  completeOrgValues: () =>
    set((state) => ({
      orgValues: { ...state.orgValues, complete: true },
      phase: 'briefing',
    })),

  // Get compiled data
  getQuickSortResult: () => {
    const { quickSort } = get();
    return {
      topFive: quickSort.topFive,
      roundTimings: quickSort.roundTimings,
      cardsConsidered: quickSort.cardsConsidered,
      totalTime: quickSort.roundTimings.reduce((a, b) => a + b, 0),
    };
  },

  getValuesStory: () => {
    const { valuesStory } = get();
    return {
      storyText: valuesStory.storyText,
      selfIdentifiedValues: valuesStory.selfIdentifiedValues,
      peerIdentifiedValues: valuesStory.peerIdentifiedValues,
      alignmentFlag:
        valuesStory.peerIdentifiedValues.length > 0 &&
        !valuesStory.selfIdentifiedValues.some((v) =>
          valuesStory.peerIdentifiedValues.includes(v)
        ),
    };
  },

  getTeamCommitment: () => {
    const { teamAlignment } = get();
    return {
      values: teamAlignment.definitions,
      commitmentText: teamAlignment.commitmentText,
      decisionProcess: teamAlignment.decisionProcess,
      signatures: teamAlignment.signatures,
      readAloudAt: teamAlignment.readAloudAt,
    };
  },

  // Reset
  reset: () =>
    set({
      phase: 'quick-sort',
      participantId: null,
      participantName: null,
      teamId: null,
      quickSort: { ...initialQuickSort },
      valuesMeaning: { ...initialValuesMeaning },
      valuesStory: { ...initialValuesStory },
      teamAlignment: { ...initialTeamAlignment },
      orgValues: {
        enabled: false,
        values: [],
        alignmentRatings: new Map(),
        extensionCommitment: '',
        complete: false,
      },
    }),
}));
