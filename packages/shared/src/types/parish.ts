/**
 * Parish-related types
 */

import type { ParishIdLower } from '../constants/concordia.js';

export type ResourceLevel = 'low' | 'medium' | 'high';
export type EvacuationStatus = 'none' | 'voluntary' | 'mandatory' | 'complete';
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'hurricane';
export type HurricaneTrajectory = 'direct' | 'glancing' | 'miss-north' | 'miss-south' | 'stall' | 'unknown';

export interface Position {
  x: number;
  y: number;
}

export interface ResourceState {
  generators: number;
  generatorsDeployed: number;
  medicalSupplies: ResourceLevel;
  fuel: number; // percentage 0-100
  food: number; // percentage 0-100
  water: number; // percentage 0-100
  shelterUsed: number;
  shelterCapacity: number;
}

export interface ParishStatus {
  power: number; // percentage operational 0-100
  communications: number;
  roads: number;
  hospital: number;
  port: number; // Haven only
  airport: number; // Gateway only
  waterSystem: number;
  evacuationOrdered: boolean;
  evacuationStatus: EvacuationStatus;
  populationRemaining: number;
  populationEvacuated: number;
  casualties: number;
  injured: number;
}

export interface ParishState {
  id: ParishIdLower;
  name: string;
  resources: ResourceState;
  status: ParishStatus;
  morale: number; // 0-100
  currentCrisis: string; // Active crisis description
  pendingDecisions: string[];
}

export interface HurricaneState {
  id: string;
  name: string;
  category: number; // 1-5
  latitude: number;
  longitude: number;
  windSpeed: number; // mph
  trajectory: HurricaneTrajectory;
  certaintyPercent: number; // How confident we are 0-100
  hoursToImpact: number; // -1 = unknown/won't impact
  hasLandfall: boolean;
  currentAdvisory: string;
}

export interface WeatherState {
  hurricane: HurricaneState;
  windSpeed: number; // Current local winds
  rainfall: number; // inches/hour
  visibility: number; // percentage 0-100
  conditions: WeatherCondition;
  stormSurge: number; // feet
}
