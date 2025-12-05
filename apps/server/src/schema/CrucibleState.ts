import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

/**
 * Position on the map (percentage based)
 */
export class Position extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
}

/**
 * Hurricane tracking state
 */
export class HurricaneState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = 'Midas';
  @type('number') category: number = 1; // 1-5
  @type('number') latitude: number = 0;
  @type('number') longitude: number = 0;
  @type('number') windSpeed: number = 0; // mph
  @type('string') trajectory: string = 'unknown'; // 'direct', 'glancing', 'miss-north', 'miss-south', 'stall'
  @type('number') certaintyPercent: number = 0; // How confident we are
  @type('number') hoursToImpact: number = -1; // -1 = unknown/won't impact
  @type('boolean') hasLandfall: boolean = false;
  @type('string') currentAdvisory: string = '';
}

/**
 * Weather conditions state
 */
export class WeatherState extends Schema {
  @type(HurricaneState) hurricane = new HurricaneState();
  @type('number') windSpeed: number = 0; // Current local winds
  @type('number') rainfall: number = 0; // inches/hour
  @type('number') visibility: number = 100; // percentage
  @type('string') conditions: string = 'clear'; // 'clear', 'cloudy', 'rain', 'storm', 'hurricane'
  @type('number') stormSurge: number = 0; // feet
}

/**
 * Resource tracking for a parish
 */
export class ResourceState extends Schema {
  @type('number') generators: number = 0;
  @type('number') generatorsDeployed: number = 0;
  @type('string') medicalSupplies: string = 'medium';
  @type('number') fuel: number = 100; // percentage
  @type('number') food: number = 100; // percentage
  @type('number') water: number = 100; // percentage
  @type('number') shelterUsed: number = 0;
  @type('number') shelterCapacity: number = 0;
}

/**
 * Parish infrastructure status
 */
export class ParishStatus extends Schema {
  @type('number') power: number = 100; // percentage operational
  @type('number') communications: number = 100;
  @type('number') roads: number = 100;
  @type('number') hospital: number = 100;
  @type('number') port: number = 100; // Haven only
  @type('number') airport: number = 100; // Gateway only
  @type('number') waterSystem: number = 100;
  @type('boolean') evacuationOrdered: boolean = false;
  @type('string') evacuationStatus: string = 'none'; // 'none', 'voluntary', 'mandatory', 'complete'
  @type('number') populationRemaining: number = 0;
  @type('number') populationEvacuated: number = 0;
  @type('number') casualties: number = 0;
  @type('number') injured: number = 0;
}

/**
 * Full state for a single parish
 */
export class ParishState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type(ResourceState) resources = new ResourceState();
  @type(ParishStatus) status = new ParishStatus();
  @type('number') morale: number = 75; // 0-100
  @type('string') currentCrisis: string = ''; // Active crisis description
  @type(['string']) pendingDecisions = new ArraySchema<string>();
}

/**
 * Team state (one team per parish)
 */
export class TeamState extends Schema {
  @type('string') id: string = '';
  @type('string') parishId: string = '';
  @type('string') teamName: string = '';
  @type(['string']) members = new ArraySchema<string>(); // Participant IDs
  @type(['string']) statedValues = new ArraySchema<string>(); // From discovery phase
  @type('string') decisionProcess: string = 'consensus'; // 'consensus', 'majority', 'leader'
  @type('string') commitmentStatement: string = '';
  @type('boolean') ready: boolean = false;
}

/**
 * Decision record
 */
export class Decision extends Schema {
  @type('string') id: string = '';
  @type('string') teamId: string = '';
  @type('string') parishId: string = '';
  @type('string') categoryId: string = '';
  @type('string') decisionTypeId: string = '';
  @type('string') choice: string = '';
  @type('string') rationale: string = '';
  @type(['string']) advocatedBy = new ArraySchema<string>(); // Participant IDs
  @type('number') simulationTime: number = 0;
  @type('number') realTime: number = 0;
  @type('string') targetParishId: string = ''; // For inter-parish decisions
  @type('boolean') processed: boolean = false;
  @type('boolean') notableMoment: boolean = false; // Values Observer analysis
  @type('string') notableReason: string = '';
}

/**
 * Streaming content (news, social, radio)
 */
export class StreamingContent extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = ''; // 'news', 'social', 'radio', 'weather', 'official'
  @type('string') source: string = ''; // '@concordianews', 'citizen', 'NOAA', etc.
  @type('string') content: string = '';
  @type('number') urgency: number = 0; // 1-5
  @type('string') relatedParish: string = '';
  @type('number') timestamp: number = 0;
  @type('boolean') breaking: boolean = false;
}

/**
 * Session phase tracking
 */
export class SessionPhase extends Schema {
  @type('string') current: string = 'lobby'; // 'lobby', 'discovery', 'briefing', 'storm', 'recovery', 'debrief'
  @type('number') phaseStartTime: number = 0;
  @type('boolean') paused: boolean = false;
}

/**
 * Intensity control state
 */
export class IntensityState extends Schema {
  @type('number') global: number = 5; // 1-10
  @type({ map: 'number' }) byTeam = new MapSchema<number>();
  @type('string') tempestAdvisory: string = ''; // Current AI recommendation
  @type('number') lastAdjustment: number = 0;
}

/**
 * CM Directive
 */
export class CMDirective extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = '';
  @type('string') content: string = '';
  @type(['string']) targetTeams = new ArraySchema<string>(); // Empty = all teams
  @type('boolean') isBinding: boolean = false;
  @type('number') timestamp: number = 0;
}

/**
 * Main Crucible State - the root schema synchronized to all clients
 */
export class CrucibleState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') sessionCode: string = ''; // 6-char join code
  @type(SessionPhase) phase = new SessionPhase();
  @type(WeatherState) weather = new WeatherState();
  @type(IntensityState) intensity = new IntensityState();
  @type({ map: ParishState }) parishes = new MapSchema<ParishState>();
  @type({ map: TeamState }) teams = new MapSchema<TeamState>();
  @type([Decision]) decisions = new ArraySchema<Decision>();
  @type([StreamingContent]) feed = new ArraySchema<StreamingContent>();
  @type([CMDirective]) directives = new ArraySchema<CMDirective>();
  @type('number') simulationTime: number = 0; // Minutes since storm watch
  @type('number') lastUpdate: number = 0;
  @type('string') scenarioSeed: string = '';
}
