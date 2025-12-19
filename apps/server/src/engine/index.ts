/**
 * Engine Module Exports
 *
 * This module contains the core simulation engine components:
 * - TimeController: Manages simulation time with variable compression
 * - WeatherEngine: Manages hurricane timeline state machine
 * - InfrastructureManager: Manages infrastructure status and cascades
 */

export {
  TimeController,
  createTimeController,
  simulationToRealTime,
  realToSimulationTime,
  formatDuration,
} from './TimeController.js';

export type { TimeControllerEvents } from './TimeController.js';

export {
  WeatherEngine,
  createWeatherEngine,
  getWeatherSeverity,
  canOperateOutdoors,
  canOperateAir,
  canOperateSea,
  interpolateWeather,
} from './WeatherEngine.js';

export type { WeatherEngineEvents } from './WeatherEngine.js';

export {
  InfrastructureManager,
  createInfrastructureManager,
  getStatusLabel,
  getStatusColor,
} from './InfrastructureManager.js';

export type { InfrastructureManagerEvents } from './InfrastructureManager.js';
