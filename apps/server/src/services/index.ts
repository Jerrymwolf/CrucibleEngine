/**
 * Services Index
 *
 * Core services for the Crucible simulation engine
 */

// Dilemma Selection and Generation
export {
  selectNextDilemma,
  getDilemmasForParish,
  getDilemmasByLearningOutcome,
  getDilemmasByPersona,
  getDilemmaCounts,
  validateDilemmaLibrary,
  getDilemmaCoverage,
} from './DilemmaSelector.js';

export {
  DilemmaGenerator,
  getDilemmaGenerator,
} from './DilemmaGenerator.js';

// Values Scoring
export {
  ValuesScorer,
  getValuesScorer,
} from './ValuesScorer.js';

// Session Persistence
export {
  SessionPersistence,
} from './SessionPersistence.js';

// State Recovery
export {
  StateRecovery,
} from './StateRecovery.js';

// Production Simulation
export {
  ProductionSimulator,
  getProductionSimulator,
} from './ProductionSimulator.js';

// Data Export
export {
  ExportService,
} from './ExportService.js';
