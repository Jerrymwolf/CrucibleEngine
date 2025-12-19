/**
 * Pre-Crisis Components
 *
 * Components for the pre-crisis values discovery phase (2-2.5 hours)
 *
 * Phase 1: Personal Values Discovery (45 min)
 * - ValuesQuickSort: Timed 3-round card sort
 * - ValuesMeaningForm: Define what top values mean personally
 * - ValuesStoryCapture: Share a values-driven story with triad
 *
 * Phase 2: Team Values Alignment (60 min)
 * - TeamValuesGallery: Silent gallery walk with claim animation
 * - TeamDefinitionsDialog: Define team values together
 * - CommitmentEditor: Draft commitment, sign, read aloud
 * - DecisionProcessPicker: Choose decision-making process
 *
 * Phase 3: Organizational Integration (Optional - 30 min)
 * - OrgValuesMapping: Map org values to team values
 *
 * Phase 4: Scenario Briefing (15 min)
 * - ScenarioBriefing: Stakes, emotional anchor, parish assignment
 */

// Personal Values Discovery
export { ValuesQuickSort, type ValuesQuickSortProps } from './ValuesQuickSort.js';
export { ValuesMeaningForm, type ValuesMeaningFormProps } from './ValuesMeaningForm.js';
export { ValuesStoryCapture, type ValuesStoryCaptureProps } from './ValuesStoryCapture.js';

// Team Values Alignment
export { TeamValuesGallery, type TeamValuesGalleryProps } from './TeamValuesGallery.js';
export { TeamDefinitionsDialog, type TeamDefinitionsDialogProps } from './TeamDefinitionsDialog.js';
export { CommitmentEditor, type CommitmentEditorProps } from './CommitmentEditor.js';
// export { DecisionProcessPicker, type DecisionProcessPickerProps } from './DecisionProcessPicker.js';

// Organizational Integration
// export { OrgValuesMapping, type OrgValuesMappingProps } from './OrgValuesMapping.js';

// Scenario Briefing
export { ScenarioBriefing, type ScenarioBriefingProps } from './ScenarioBriefing.js';

// Full Pre-Crisis Flow Orchestrator
export { PreCrisisFlow, type PreCrisisFlowProps, type PreCrisisStep } from './PreCrisisFlow.js';

// Progress and Transitions
export { ProgressJourneyMap, type ProgressJourneyMapProps, type JourneyStep, type JourneyPhase } from './ProgressJourneyMap.js';
export { PhaseTransition, type PhaseTransitionProps, type TransitionType } from './PhaseTransition.js';
