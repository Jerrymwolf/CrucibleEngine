import { create } from 'zustand';

interface ParishState {
  id: string;
  name: string;
  resources: {
    generators: number;
    generatorsDeployed: number;
    medicalSupplies: string;
    fuel: number;
    food: number;
    water: number;
    shelterUsed: number;
    shelterCapacity: number;
  };
  status: {
    power: number;
    communications: number;
    roads: number;
    hospital: number;
    port: number;
    airport: number;
    waterSystem: number;
    evacuationOrdered: boolean;
    evacuationStatus: string;
    populationRemaining: number;
    populationEvacuated: number;
    casualties: number;
    injured: number;
  };
  morale: number;
  currentCrisis: string;
}

interface TeamState {
  id: string;
  parishId: string;
  teamName: string;
  members: string[];
  statedValues: string[];
  decisionProcess: string;
  commitmentStatement: string;
  ready: boolean;
}

interface StreamingContent {
  id: string;
  type: string;
  source: string;
  content: string;
  urgency: number;
  relatedParish: string;
  timestamp: number;
  breaking: boolean;
}

interface GameState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  sessionCode: string | null;
  role: 'team' | 'cm' | null;
  participantId: string | null;
  participantName: string | null;
  currentTeamId: string | null;

  // Session state
  phase: string;
  paused: boolean;
  simulationTime: number;

  // Weather
  hurricane: {
    name: string;
    category: number;
    trajectory: string;
    certaintyPercent: number;
    hoursToImpact: number;
    hasLandfall: boolean;
    currentAdvisory: string;
  };
  conditions: string;
  windSpeed: number;
  rainfall: number;
  visibility: number;
  stormSurge: number;

  // Intensity
  globalIntensity: number;
  teamIntensities: Map<string, number>;
  tempestAdvisory: string;

  // Parishes and Teams
  parishes: Map<string, ParishState>;
  teams: Map<string, TeamState>;

  // Feed
  feed: StreamingContent[];

  // Actions
  setConnectionState: (connected: boolean, connecting: boolean) => void;
  setSessionInfo: (code: string, role: 'team' | 'cm', participantId: string, participantName: string) => void;
  setCurrentTeam: (teamId: string | null) => void;
  updateFromSnapshot: (snapshot: unknown) => void;
  addFeedItem: (item: StreamingContent) => void;
  reset: () => void;
}

const initialHurricane = {
  name: 'Midas',
  category: 1,
  trajectory: 'unknown',
  certaintyPercent: 0,
  hoursToImpact: -1,
  hasLandfall: false,
  currentAdvisory: '',
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial connection state
  connected: false,
  connecting: false,
  sessionCode: null,
  role: null,
  participantId: null,
  participantName: null,
  currentTeamId: null,

  // Initial session state
  phase: 'lobby',
  paused: false,
  simulationTime: 0,

  // Initial weather
  hurricane: initialHurricane,
  conditions: 'clear',
  windSpeed: 0,
  rainfall: 0,
  visibility: 100,
  stormSurge: 0,

  // Initial intensity
  globalIntensity: 5,
  teamIntensities: new Map(),
  tempestAdvisory: '',

  // Initial data
  parishes: new Map(),
  teams: new Map(),
  feed: [],

  // Actions
  setConnectionState: (connected, connecting) => set({ connected, connecting }),

  setSessionInfo: (code, role, participantId, participantName) =>
    set({
      sessionCode: code,
      role,
      participantId,
      participantName,
    }),

  setCurrentTeam: (teamId) => set({ currentTeamId: teamId }),

  updateFromSnapshot: (snapshot) => {
    if (!snapshot) return;

    const s = snapshot as Record<string, unknown>;
    const phase = s.phase as Record<string, unknown>;
    const weather = s.weather as Record<string, unknown>;
    const hurricane = weather.hurricane as Record<string, unknown>;
    const intensity = s.intensity as Record<string, unknown>;

    set({
      phase: phase.current as string,
      paused: phase.paused as boolean,
      simulationTime: s.simulationTime as number,
      hurricane: {
        name: hurricane.name as string,
        category: hurricane.category as number,
        trajectory: hurricane.trajectory as string,
        certaintyPercent: hurricane.certaintyPercent as number,
        hoursToImpact: hurricane.hoursToImpact as number,
        hasLandfall: hurricane.hasLandfall as boolean,
        currentAdvisory: hurricane.currentAdvisory as string,
      },
      conditions: weather.conditions as string,
      windSpeed: weather.windSpeed as number,
      rainfall: weather.rainfall as number,
      visibility: weather.visibility as number,
      stormSurge: weather.stormSurge as number,
      globalIntensity: intensity.global as number,
      teamIntensities: new Map(intensity.byTeam as Map<string, number>),
      tempestAdvisory: intensity.tempestAdvisory as string,
      parishes: s.parishes as Map<string, ParishState>,
      teams: s.teams as Map<string, TeamState>,
      feed: s.feed as StreamingContent[],
    });
  },

  addFeedItem: (item) =>
    set((state) => ({
      feed: [...state.feed.slice(-99), item], // Keep last 100 items
    })),

  reset: () =>
    set({
      connected: false,
      connecting: false,
      sessionCode: null,
      role: null,
      participantId: null,
      participantName: null,
      currentTeamId: null,
      phase: 'lobby',
      paused: false,
      simulationTime: 0,
      hurricane: initialHurricane,
      conditions: 'clear',
      windSpeed: 0,
      rainfall: 0,
      visibility: 100,
      stormSurge: 0,
      globalIntensity: 5,
      teamIntensities: new Map(),
      tempestAdvisory: '',
      parishes: new Map(),
      teams: new Map(),
      feed: [],
    }),
}));
