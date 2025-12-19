/**
 * Hurricane Timeline Types
 * Defines the progression of Hurricane Midas and weather state machine
 */

import type { ParishIdLower } from '../constants/concordia.js';

export type TimelinePhase = 'watch' | 'warning' | 'approach' | 'landfall' | 'eye' | 'recovery';
export type Visibility = 'clear' | 'reduced' | 'poor' | 'zero';

export interface TimelineWeather {
  /** Wind speed in mph */
  windMph: number;
  /** Rainfall in inches per hour */
  rainfallInchesPerHour: number;
  /** Storm surge in feet */
  stormSurgeFeet: number;
  /** Visibility conditions */
  visibility: Visibility;
}

export interface TimelineInfrastructureState {
  /** Which parish roads are passable */
  roadsPassable: ParishIdLower[];
  /** Which parishes have power */
  powerAvailable: ParishIdLower[];
  /** Which parishes have communications */
  commsOperational: ParishIdLower[];
}

export interface TimelineWindow {
  /** Unique identifier (e.g., 'watch-72', 'landfall-0') */
  id: string;
  /** Phase category */
  phase: TimelinePhase;
  /** Hours relative to landfall (negative = before, positive = after) */
  tMinusHours: number;
  /** Human-readable label */
  label: string;
  /** Storm certainty percentage (null = 100% certain) */
  certaintyPercent: number | null;
  /** Type of decisions available in this window */
  decisionType: string;
  /** Weather conditions */
  weather: TimelineWeather;
  /** Infrastructure availability */
  infrastructureState: TimelineInfrastructureState;
  /** Actions that become impossible in this window */
  unavailableActions: string[];
  /** New pressures that emerge */
  emergingPressures: string[];
  /** Key narrative moments for this window */
  narrativeBeats: string[];
}

export interface HurricaneProfile {
  /** Unique identifier */
  id: string;
  /** Hurricane name */
  name: string;
  /** Saffir-Simpson category */
  category: 1 | 2 | 3 | 4 | 5;
  /** Ordered timeline windows */
  windows: TimelineWindow[];
}
