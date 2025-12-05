/**
 * Intensity Controls and Crucible Master Levers
 */

export const INTENSITY_LEVERS = {
  TIME_COMPRESSION: {
    id: 'time-compression',
    name: 'Time Compression',
    description: 'Speed of hurricane approach',
    increasePressure: 'Hurricane accelerates toward Concordia',
    decreasePressure: 'Hurricane slows, more time to prepare',
    cmPrompt: 'Adjust how quickly the storm approaches',
  },

  RESOURCE_SCARCITY: {
    id: 'resource-scarcity',
    name: 'Resource Scarcity',
    description: 'Availability of critical supplies',
    increasePressure: 'Supplies depleted faster than expected',
    decreasePressure: 'New supply shipment arrives',
    cmPrompt: 'Control resource availability across parishes',
  },

  CASCADING_FAILURES: {
    id: 'cascading-failures',
    name: 'Cascading Failures',
    description: 'How problems compound',
    increasePressure: 'One failure triggers another',
    decreasePressure: 'Systems stabilize unexpectedly',
    cmPrompt: 'Trigger or resolve infrastructure cascades',
  },

  STAKEHOLDER_PRESSURE: {
    id: 'stakeholder-pressure',
    name: 'Stakeholder Pressure',
    description: 'External demands on teams',
    increasePressure: 'Governor calls, media swarms, public outcry',
    decreasePressure: 'Attention shifts elsewhere, breathing room',
    cmPrompt: 'Add or remove external pressure sources',
  },

  INFORMATION_FOG: {
    id: 'information-fog',
    name: 'Information Fog',
    description: 'Clarity of situation',
    increasePressure: 'Conflicting reports, communication failures',
    decreasePressure: 'Clear intelligence arrives',
    cmPrompt: 'Control information reliability',
  },

  MORAL_COMPLEXITY: {
    id: 'moral-complexity',
    name: 'Moral Complexity',
    description: 'Ethical difficulty of choices',
    increasePressure: 'Introduce ethical dilemmas',
    decreasePressure: 'Provide cleaner options',
    cmPrompt: 'Adjust ethical complexity of situations',
  },

  INTER_PARISH_CONFLICT: {
    id: 'inter-parish-conflict',
    name: 'Inter-Parish Conflict',
    description: 'Competition between parishes',
    increasePressure: 'Competing needs escalate, blame emerges',
    decreasePressure: 'Common cause discovered, cooperation emerges',
    cmPrompt: 'Increase or decrease inter-team tension',
  },
} as const;

export type IntensityLeverId = keyof typeof INTENSITY_LEVERS;
export type IntensityLever = (typeof INTENSITY_LEVERS)[IntensityLeverId];

export const CM_DIRECTIVE_TYPES = {
  OPERATIONAL_ORDER: {
    id: 'operational-order',
    name: 'Operational Order',
    examples: [
      'All parishes: mandatory evacuation NOW',
      'Haven, redirect generators to Gateway',
      'Summit, open emergency water reserves',
    ],
    isBinding: true,
  },

  INFORMATION_INJECTION: {
    id: 'information-injection',
    name: 'Information Injection',
    examples: [
      'New intel: storm track shifting east',
      'Confirmed: levee breach in Haven',
      'Coast Guard rescue assets now available',
    ],
    isBinding: false,
  },

  TIME_CALL: {
    id: 'time-call',
    name: 'Time Call',
    examples: [
      'You have 3 minutes to decide',
      'Governor expects response in 60 seconds',
      'Helicopter window closes in 2 minutes',
    ],
    isBinding: true,
  },

  STAND_DOWN: {
    id: 'stand-down',
    name: 'Stand Down',
    examples: [
      '5-minute operational pause',
      'All teams: check in with each other',
      'Take a breath—storm is holding position',
    ],
    isBinding: true,
  },

  VALUES_CHECK: {
    id: 'values-check',
    name: 'Values Check',
    examples: [
      'Before you decide: which of your values guides this?',
      'Name the value driving your current discussion',
      'What would your charter say about this choice?',
    ],
    isBinding: false,
  },
} as const;

export type CMDirectiveTypeId = keyof typeof CM_DIRECTIVE_TYPES;
export type CMDirectiveType = (typeof CM_DIRECTIVE_TYPES)[CMDirectiveTypeId];

/**
 * Intensity level descriptions
 */
export const INTENSITY_LEVELS = {
  1: { name: 'Calm', description: 'Routine operations, minimal stress' },
  2: { name: 'Alert', description: 'Heightened awareness, some concern' },
  3: { name: 'Concerned', description: 'Growing tension, decisions matter' },
  4: { name: 'Anxious', description: 'Pressure building, time is short' },
  5: { name: 'Stressed', description: 'Difficult trade-offs, competing priorities' },
  6: { name: 'Urgent', description: 'High pressure, mistakes have consequences' },
  7: { name: 'Critical', description: 'Crisis mode, every second counts' },
  8: { name: 'Severe', description: 'Overwhelming demands, triage required' },
  9: { name: 'Extreme', description: 'Near breaking point, desperate measures' },
  10: { name: 'Catastrophic', description: 'Total crisis, survival mode' },
} as const;

export type IntensityLevel = keyof typeof INTENSITY_LEVELS;
