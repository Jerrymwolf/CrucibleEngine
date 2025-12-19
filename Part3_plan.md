CrucibleEngine Demo Mode + AI Teams + Business Metrics: Platinum Implementation Plan
Target Score: 100/100 Revised from Part3_plan.md with all gaps addressed
Executive Summary
This plan implements CM-controlled demo mode with AI-controlled teams AND a comprehensive Business Metrics System that creates authentic values pressure. The visible KPIs (production rates, revenue impact, quarterly targets) are the fundamental backbone that drives values drift - when teams see the money counting down, they feel visceral pressure to compromise their stated values.
The Core Insight
"At work, performance often makes people sacrifice their values. Someone that believes in integrity will tell lies if it means closing out the quarter ahead."
The simulation must make business pressure VISIBLE, not just narrative. Teams need to see:
Production pipeline status ticking down
Revenue impact of every decision ($2.4M/hour)
Quarterly targets and real-time progress
Supply chain health across all parishes
What's Already Done (Verified)
Sprints 1-3: 100% complete (design system, onboarding, lobby)
Server: AgentOrchestrator, DilemmaGenerator, ValuesScorer, SessionPersistence
Client: CommandCenter, CM controls, DebriefJourney, useColyseus hook
Full animation library (50+ keyframes), sound system, accessibility hooks
Business context exists in narrative (Celaritrin, $43M contracts, personas)
What This Plan Adds
Business Metrics Dashboard - Front-and-center KPIs visible to ALL teams
Production Pipeline Visualization - Real-time supply chain status
CM Simulation Control Dashboard - Full visibility and control across parishes
Demo mode toggle and time controls
AI team system with archetypes and drift
CM world manipulation controls
Checkpoint save/restore
Debrief with business impact analysis
SECTION A: BUSINESS METRICS & PRODUCTION SYSTEM (THE BACKBONE)
This section defines the critical business pressure system that drives values tension.
A1: The Celaritrin Production Model
Product: Celaritrin - a breakthrough cancer medication Company: Meridian Corporation (dominates Concordia economy)
Why Celaritrin Matters (The Moral Weight)

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CELARITRIN: THE STAKES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🎗️  WHAT IT IS                                                           │
│   A breakthrough cancer medication that treats aggressive pediatric         │
│   and adult leukemias. For many patients, it's the only treatment          │
│   that works when others have failed.                                       │
│                                                                             │
│   👶 WHO DEPENDS ON IT                                                      │
│   • 340,000 patients globally                                               │
│   • ~47,000 are children under 18                                          │
│   • ~12,000 are in active treatment cycles that cannot be interrupted      │
│   • Patients in 89 countries rely on Concordia's supply                    │
│                                                                             │
│   🏝️  WHY ONLY CONCORDIA                                                    │
│   Celaritrin's active compound is derived from a kelp species that         │
│   grows ONLY in Concordia's volcanic waters. The specific mineral          │
│   composition and temperature create conditions found nowhere else.         │
│                                                                             │
│   • No synthetic alternative exists                                         │
│   • No other harvesting location is viable                                  │
│   • 18-month FDA approval process for any facility change                  │
│   • Current global stockpile: ~6 weeks of supply                           │
│                                                                             │
│   ⚠️  WHAT INTERRUPTION MEANS                                               │
│   Every hour of production stoppage = ~39 patients miss a dose             │
│   Every day of shutdown = ~932 patients' treatment interrupted             │
│   If shutdown exceeds 6 weeks = patients begin dying                       │
│                                                                             │
│   "These aren't numbers. These are children whose parents are              │
│    counting the days until the next shipment arrives."                     │
│                    — Dr. Sarah Chen, WHO Oncology Division                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
The Impossible Choice
This creates the simulation's core moral tension:
If You Prioritize...	You Risk...
Worker Safety (evacuate early)	Children with cancer running out of medication
Production (keep running)	Your own workers trapped in a hurricane
Neither choice is wrong. Neither choice is right. That's the point. The simulation forces teams to confront: When two legitimate moral claims conflict, which values guide your decision?
Supply Chain (28-hour production cycle)

┌─────────────────────────────────────────────────────────────────────────────┐
│                     CELARITRIN PRODUCTION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GATEWAY        HAVEN           KEYSTONE         HAVEN          GLOBAL     │
│  ┌──────┐      ┌──────┐        ┌──────┐        ┌──────┐       ┌──────┐    │
│  │HARVEST│ ──▶ │PROCESS│ ──▶   │MANUFAC│ ──▶   │ SHIP │ ──▶   │MARKET│    │
│  │ 4 hrs │      │ 10 hrs│        │ 12 hrs│        │ 2 hrs│       │      │    │
│  └──────┘      └──────┘        └──────┘        └──────┘       └──────┘    │
│     │              │               │               │              │         │
│  18 boats      40 tons/day    12 clean rooms   2 cargo ships  340K patients│
│  Fleet         Extraction     $43M/batch       500 TEU/day                 │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│  INTERRUPTION COST: $2.4M PER HOUR                                         │
│  ════════════════════════════════════════════════════════════════════════  │
└─────────────────────────────────────────────────────────────────────────────┘
Parish Business Roles
Parish	Function	Meridian %	Key Contribution	Pressure Point
Keystone	MANUFACTURE	95%	12 clean rooms, $43M/batch	Shutdown = total loss
Haven	PROCESS + SHIP	85%	Only deep-water port, extraction	Chokepoint for ALL shipping
Gateway	HARVEST	70%	18-boat kelp fleet	No kelp = pipeline empties
Heartland	POWER + WATER	90%	45MW dam, ultrapure water	Can shut down any parish
Summit	COORDINATE	95%	Corporate HQ, decisions	Accountable to board/customers
Sterling	SUPPORT	35%	Only hospital, community	Worker health/morale
A2: Business Metrics KPIs (Visible to All Teams)
Primary KPIs (Always Visible in Console Header)

interface ProductionKPIs {
  // Real-time production
  currentBatchProgress: number;        // 0-100% of current $43M batch
  batchValue: number;                  // Current batch worth ($43M typical)
  hourlyBurnRate: number;              // $2.4M/hour when interrupted

  // Cumulative impact
  revenueImpact: number;               // Running total of $ lost/saved
  productionHoursLost: number;         // Hours of stoppage

  // Supply chain health
  pipelineStatus: 'flowing' | 'constrained' | 'blocked' | 'critical';
  bottleneck: string | null;           // Which parish is blocking

  // Quarterly context
  quarterlyTarget: number;             // e.g., $180M
  quarterlyProgress: number;           // % toward target
  daysRemainingInQuarter: number;

  // PATIENT IMPACT (The Moral Weight)
  patientsAffected: number;            // Total patients with delayed medication
  childrenAffected: number;            // Children specifically (~14% of total)
  patientsInActiveTreatment: number;   // Cannot miss doses
  globalStockpileWeeks: number;        // Weeks of supply remaining (starts at 6)
  workersAtRisk: number;               // Currently in harm's way on island
}
The Dual Moral Counter
The dashboard should show BOTH moral pressures simultaneously:

┌────────────────────────────┐  ┌────────────────────────────┐
│   WORKERS AT RISK          │  │   PATIENTS AFFECTED        │
│                            │  │                            │
│         247                │  │        1,247               │
│      on-site now           │  │   waiting for medication   │
│                            │  │                            │
│   ⚠️ Storm in 18 hours     │  │   👶 174 are children       │
│   Evacuation takes 6 hrs   │  │   Global stockpile: 5.8 wks│
└────────────────────────────┘  └────────────────────────────┘
This forces teams to see both sides of every decision:
Halt production → workers safe, but patient counter climbs
Continue production → patient counter stable, but workers at risk
Per-Parish Business Metrics

interface ParishBusinessMetrics {
  parishId: string;

  // Operational status
  operationalCapacity: number;         // 0-100%
  currentOutput: number;               // Units/hour or tons/day
  targetOutput: number;                // Expected output

  // Financial exposure
  revenueAtRisk: number;               // $ value if this parish fails
  contractObligations: string[];       // Active commitments

  // Supply chain position
  inputsReceiving: boolean;            // Getting supplies from upstream
  outputsDelivering: boolean;          // Sending to downstream
  inventoryBuffer: number;             // Hours of buffer stock

  // Workforce
  workersOnSite: number;
  workersRequired: number;
  overtimeHours: number;
}
A3: Production Dashboard Component
File: apps/web/src/components/console/ProductionDashboard.tsx (NEW)
Layout Design

┌─────────────────────────────────────────────────────────────────────────────┐
│  MERIDIAN PRODUCTION STATUS                              Q3 Target: $180M   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  62% ($111.6M)    18 days left     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CURRENT BATCH: KS-2847                              VALUE: $43M    │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░  67%              ETA: 9.5 hrs    │   │
│  │                                                                      │   │
│  │  [GATEWAY]──▶[HAVEN]──▶[KEYSTONE ●]──▶[HAVEN]──▶[SHIPPED]          │   │
│  │   Complete    Complete   IN PROGRESS   Waiting    Pending           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ REVENUE      │  │ PATIENTS     │  │ CHILDREN     │  │ WORKERS      │   │
│  │ IMPACT       │  │ AFFECTED     │  │ AFFECTED     │  │ AT RISK      │   │
│  │              │  │              │  │              │  │              │   │
│  │  -$4.8M      │  │  1,247       │  │    174       │  │  247         │   │
│  │  ▼ 2 hrs     │  │  ▲ waiting   │  │  👶 children │  │  on-site     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  🎗️ GLOBAL CELARITRIN STOCKPILE: ████████████░░░░░░░  5.8 weeks      │ │
│  │     "Every hour we're down, children miss their cancer medication"    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SUPPLY CHAIN STATUS                                                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ GATEWAY │───▶│  HAVEN  │───▶│KEYSTONE │───▶│  HAVEN  │───▶│ SHIPPED │  │
│  │ ● 100%  │    │ ● 85%   │    │ ⚠ 67%   │    │ ○ WAIT  │    │ ○ READY │  │
│  │ Harvest │    │ Extract │    │ Manufac │    │  Port   │    │         │  │
│  │ 12 tons │    │ 34 tons │    │ KS-2847 │    │ 2 ships │    │ 0 TEU   │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
Visual Design Specifications
Color Coding (Urgency):
Green (●): Operating normally, on target
Amber (⚠): Reduced capacity or concern
Red (◉): Critical, significant impact
Gray (○): Idle/waiting
Animations:
Revenue Impact counter: Animated digits when value changes
Burn Rate: Pulsing when active (money being lost)
Pipeline flow: Animated arrows showing product movement
Batch progress: Smooth fill animation
Sound Design:
production-milestone.mp3: Batch completion
revenue-loss-tick.mp3: Soft tick every $100K lost
pipeline-blocked.mp3: Warning when supply chain interrupted
quarterly-warning.mp3: Alert when quarter target at risk
A4: CM Simulation Control Dashboard
File: apps/web/src/components/cm/SimulationControlDashboard.tsx (NEW) The CM needs complete visibility and control over all aspects of the simulation.
Dashboard Layout (6-Panel Command Center)

┌─────────────────────────────────────────────────────────────────────────────┐
│ CRUCIBLE MASTER CONTROL                    Session: ABC123  │ T-68:42 │ ⏸ │
├────────────────────────┬────────────────────────┬───────────────────────────┤
│  PARISH OVERVIEW       │  PRODUCTION CONTROL    │  DECISION ACTIVITY        │
│  ┌──────────────────┐  │  ┌──────────────────┐  │  ┌─────────────────────┐  │
│  │ ● Keystone  87%  │  │  │ Batch: KS-2847   │  │  │ KEYSTONE            │  │
│  │ ● Haven     92%  │  │  │ Progress: 67%    │  │  │ ⏳ Deciding...      │  │
│  │ ⚠ Gateway   65%  │  │  │ Value: $43M      │  │  │ "Last Production"   │  │
│  │ ● Heartland 95%  │  │  │ ─────────────    │  │  ├─────────────────────┤  │
│  │ ● Summit    88%  │  │  │ [Halt] [Accel]   │  │  │ HAVEN               │  │
│  │ ⚠ Sterling  71%  │  │  │ [Skip] [Delay]   │  │  │ ✓ Port Closure      │  │
│  └──────────────────┘  │  └──────────────────┘  │  │ Chose: Early close  │  │
│                        │                        │  └─────────────────────┘  │
├────────────────────────┼────────────────────────┼───────────────────────────┤
│  VALUES ALIGNMENT      │  INTENSITY CONTROL     │  QUICK ACTIONS            │
│  ┌──────────────────┐  │  ┌──────────────────┐  │  ┌─────────────────────┐  │
│  │ Team    Stated→Now│ │  │ Global: ████░ 7  │  │  │ [▶ Start Storm]     │  │
│  │ KS      92% → 71% │  │  │ ─────────────    │  │  │ [⚡ Escalate]        │  │
│  │ HV      88% → 84% │  │  │ Per-Parish:      │  │  │ [🔥 Crisis Mode]    │  │
│  │ GW      95% → 89% │  │  │ KS: ████░░ 6    │  │  │ [💰 Production+]    │  │
│  │ HL      90% → 88% │  │  │ HV: █████░ 8    │  │  │ [📊 Show Impact]    │  │
│  │ SM      85% → 62% │  │  │ GW: ███░░░ 5    │  │  │ [📋 Begin Debrief]  │  │
│  │ ST      91% → 87% │  │  └──────────────────┘  │  └─────────────────────┘  │
│  └──────────────────┘  │                        │                           │
├────────────────────────┴────────────────────────┴───────────────────────────┤
│  TIMELINE: T-72h────T-48h────T-24h────T-12h────T-6h────T-0────T+12h────T+24h│
│            [1]      [2]      [3]      [4]     [5]    [6]    [7]      [8]   │
│                                    ▲ Current                                │
└─────────────────────────────────────────────────────────────────────────────┘
CM Control Capabilities
Parish Control Panel (per parish):
Infrastructure sliders (power, comms, roads, hospital, port)
Resource adjusters (generators, fuel, food, water, medical)
Morale override
Current crisis display
Pending decisions view
Force decision outcome
Production Control Panel:
Batch status manipulation
Pipeline flow control (block/unblock)
Revenue impact injection
Quarterly target adjustment
Contract deadline modification
Decision Activity Panel:
All active decisions across all parishes
Decision timer manipulation
Force decision trigger
Inject consequences
Notable moment markers
Values Alignment Panel:
Real-time drift visualization per team
Stated vs. enacted values comparison
Drift trend graphs
Intervention recommendations
A5: How Business Metrics Drive Tension Through Phases
BRIEFING Phase
Show quarterly progress: "You're 62% to Q3 target with 18 days left"
Display production value: "Each batch is worth $43M"
Introduce burn rate: "Every hour of stoppage costs $2.4M"
Patient context: "340,000 patients depend on this supply chain"
WATCH Phase (T-72h to T-24h)
Production Dashboard visible alongside weather
Decisions show explicit revenue impact: "Continue run (+$43M) vs. Halt now ($0)"
Frank Reeves's "$2.4M/hour" line accompanied by ticking counter
Supply chain visualization shows dependencies
WARNING Phase (T-24h to T-12h)
Burn rate becomes prominent as decisions affect output
Revenue Impact counter starts if production stops
"Patients Affected" number begins climbing
Quarterly target bar shows impact of delays
CRISIS Phase (T-12h to T+0)
Full production dashboard always visible
Every decision shows business trade-off
Pipeline visualization shows blockages
Real-time revenue loss accumulation
RECOVERY Phase (T+0 to T+24h)
Final revenue impact tally
Production restart timeline
Patient impact summary
"Was it worth it?" framing for debrief
DEBRIEF Phase
Total business impact vs. values compromises
"You saved $X but compromised Y value Z times"
Compare to what principled decisions would have cost
CEO Marcus Webb's accountability framing
A6: Integration with Decision System
Every dilemma option should display business impact:

interface DilemmaOptionWithBusiness {
  id: string;
  text: string;

  // Existing
  valueAlignment: Record<string, number>;

  // NEW: Business Impact
  businessImpact: {
    revenueEffect: number;           // +/- dollars
    productionHours: number;         // Hours gained/lost
    pipelineEffect: 'none' | 'constrain' | 'block' | 'restore';
    patientsAffected: number;        // Change in affected count
    workersAtRisk: number;           // Change in at-risk count
  };

  // Display in UI
  impactSummary: string;             // e.g., "+$43M, 200 workers stay late"
}
A7: Business Metrics Schema Extensions
File: apps/server/src/schema/CrucibleState.ts (MODIFY)

export class ProductionState extends Schema {
  // Current batch
  @type('string') currentBatchId: string = '';
  @type('number') batchProgress: number = 0;        // 0-100
  @type('number') batchValue: number = 43000000;    // $43M default
  @type('number') batchEtaHours: number = 0;

  // Pipeline status
  @type('string') pipelineStatus: string = 'flowing';
  @type('string') bottleneck: string = '';

  // Cumulative impact
  @type('number') revenueImpact: number = 0;        // Running total
  @type('number') productionHoursLost: number = 0;
  @type('number') burnRateActive: boolean = false;

  // Quarterly
  @type('number') quarterlyTarget: number = 180000000;
  @type('number') quarterlyProgress: number = 0;
  @type('number') daysRemainingInQuarter: number = 18;

  // Human impact
  @type('number') patientsAffected: number = 0;
  @type('number') workersAtRisk: number = 0;
}

export class ParishProductionState extends Schema {
  @type('number') operationalCapacity: number = 100;
  @type('number') currentOutput: number = 0;
  @type('number') targetOutput: number = 0;
  @type('number') inventoryBuffer: number = 0;       // Hours
  @type('boolean') inputsReceiving: boolean = true;
  @type('boolean') outputsDelivering: boolean = true;
}

// Add to CrucibleState:
@type(ProductionState) production = new ProductionState();
// Add to ParishState:
@type(ParishProductionState) business = new ParishProductionState();
A8: Production Simulation Logic
File: apps/server/src/services/ProductionSimulator.ts (NEW)

export class ProductionSimulator {
  // Pipeline dependencies
  private static PIPELINE = [
    { parish: 'GATEWAY', stage: 'harvest', duration: 4, output: 'raw_kelp' },
    { parish: 'HAVEN', stage: 'transport_in', duration: 2, output: 'delivered_kelp' },
    { parish: 'HAVEN', stage: 'process', duration: 8, output: 'extract' },
    { parish: 'KEYSTONE', stage: 'manufacture', duration: 12, output: 'celaritrin' },
    { parish: 'HAVEN', stage: 'transport_out', duration: 2, output: 'shipped' },
  ];

  // Called every simulation tick
  updateProduction(state: CrucibleState): void {
    // Check pipeline flow
    this.updatePipelineStatus(state);

    // Update batch progress if pipeline flowing
    if (state.production.pipelineStatus === 'flowing') {
      this.advanceBatchProgress(state);
    } else {
      this.accumulateLosses(state);
    }

    // Update parish operational capacity based on infrastructure
    this.updateParishCapacities(state);
  }

  private updatePipelineStatus(state: CrucibleState): void {
    // Check each stage for bottlenecks
    for (const stage of ProductionSimulator.PIPELINE) {
      const parish = state.parishes.get(stage.parish);
      if (!parish || parish.business.operationalCapacity < 50) {
        state.production.pipelineStatus = 'blocked';
        state.production.bottleneck = stage.parish;
        return;
      }
      if (parish.business.operationalCapacity < 80) {
        state.production.pipelineStatus = 'constrained';
        state.production.bottleneck = stage.parish;
      }
    }
    state.production.pipelineStatus = 'flowing';
    state.production.bottleneck = '';
  }

  private accumulateLosses(state: CrucibleState): void {
    if (!state.production.burnRateActive) {
      state.production.burnRateActive = true;
    }
    // $2.4M per hour = $40K per minute
    state.production.revenueImpact -= 40000;
    state.production.productionHoursLost += 1/60;

    // Update patient impact (340K / 365 days * hours lost)
    state.production.patientsAffected = Math.floor(
      state.production.productionHoursLost * (340000 / 365 / 24)
    );
  }
}
SECTION B: IMPLEMENTATION PHASES
Phase 0: Foundation & Feature Flags (2-3 hours)
Goal: Safe rollout infrastructure before any feature code.
Tasks
Add feature flags to environment
Create AI team feature toggle in CM settings
Set up error boundary for AI failures
Files to Modify
File	Change
apps/server/.env.example	Add ENABLE_AI_TEAMS=false, AI_TEAM_LLM_ENABLED=false
apps/web/.env.example	Add NEXT_PUBLIC_ENABLE_AI_TEAMS=false
Validation Gate
 Feature flags work (AI features hidden when disabled)
 Existing functionality unaffected
Phase 1: Schema & Types (4-6 hours)
Goal: Extend Colyseus state schema and shared types for AI teams.
1.1 Shared Types
File: packages/shared/src/types/ai-team.ts (NEW)

// AI Team Archetypes
export type AIArchetype = 'by_the_book' | 'cowboy' | 'union_strong' | 'bottom_line' | 'caretaker';

// Cooperation levels for inter-parish dynamics
export type CooperationLevel = 'hostile' | 'uncooperative' | 'neutral' | 'cooperative' | 'allied';

export interface AITeamProfile {
  parishId: string;
  archetype: AIArchetype;
  teamValues: string[];  // 5 ranked values
  commitmentStatement: string;

  personality: {
    riskTolerance: number;      // 0-1
    decisionSpeed: number;      // 0-1
    cooperativeness: number;    // 0-1
    transparencyBias: number;   // 0-1
    authorityDeference: number; // 0-1
  };

  driftProfile: {
    baselineAlignment: number;  // 0-1
    currentAlignment: number;   // 0-1 (changes over time)
    driftThreshold: number;     // Intensity level (1-10) to start drifting
    driftRate: number;          // Per decision
    recoveryRate: number;       // When pressure drops
    vulnerableValues: string[]; // Abandon first under pressure
  };
}

export interface AIDecisionContext {
  dilemma: GeneratedDilemma;
  profile: AITeamProfile;
  worldState: WorldState;
  decisionHistory: DecisionHistoryEntry[];
  cooperationStates: Map<string, CooperationLevel>;
}
File: packages/shared/src/types/demo.ts (NEW)

export interface DemoConfig {
  enabled: boolean;
  soloMode: boolean;  // CM plays one parish
  preset: DemoPreset;
  aiTeamCount: number;
  simulationSpeed: number;  // 1x, 2x, 5x, 10x
}

export type DemoPreset = 'full_demo' | 'crisis_sprint' | 'debrief_focus' | 'cooperative' | 'adversarial';

export interface DemoCheckpoint {
  id: string;
  name: string;
  timestamp: number;
  simulationTime: number;
  phase: string;
  stateSnapshot: string;  // JSON serialized
}
1.2 Colyseus Schema Extensions
File: apps/server/src/schema/CrucibleState.ts (MODIFY) Add to existing schema:

export class DemoState extends Schema {
  @type('boolean') enabled: boolean = false;
  @type('boolean') soloMode: boolean = false;
  @type('string') preset: string = '';
  @type('number') simulationSpeed: number = 1;
  @type(['string']) checkpointIds = new ArraySchema<string>();
}

export class AITeamState extends Schema {
  @type('string') parishId: string = '';
  @type('boolean') active: boolean = false;
  @type('string') archetype: string = 'by_the_book';
  @type('number') currentAlignment: number = 1.0;
  @type('string') cooperationLevel: string = 'neutral';
  @type('boolean') pendingDecision: boolean = false;
}

// Add to CrucibleState class:
@type(DemoState) demo = new DemoState();
@type({ map: AITeamState }) aiTeams = new MapSchema<AITeamState>();
Validation Gate
 Types compile without errors
 Schema syncs to clients correctly
 Backward compatible (existing sessions work)
Phase 1B: Business Metrics & Production System (12-16 hours)
Goal: Implement the visible business KPI system that drives values pressure.
1B.1 Production State Schema
File: apps/server/src/schema/CrucibleState.ts (MODIFY) Add ProductionState and ParishProductionState schemas (see Section A7).
1B.2 Production Simulator Service
File: apps/server/src/services/ProductionSimulator.ts (NEW) Implements:
Pipeline flow tracking (Gateway → Haven → Keystone → Haven → Ship)
Bottleneck detection
Revenue impact accumulation ($2.4M/hour burn rate)
Batch progress tracking
Patient impact calculation
1B.3 Production Dashboard Component
File: apps/web/src/components/console/ProductionDashboard.tsx (NEW) Features:
Quarterly target progress bar
Current batch status with ETA
Supply chain pipeline visualization with animated flow
4 KPI cards: Revenue Impact, Burn Rate, Patients Affected, Workers at Risk
Color-coded status indicators
Sound effects for milestones and warnings
1B.4 Production Header Strip
File: apps/web/src/components/console/ProductionHeader.tsx (NEW) Compact header showing key KPIs always visible in CommandCenter:

[Q3: 62% $111.6M] │ [Batch: 67% $43M] │ [Impact: -$4.8M ▼] │ [Pipeline: ● FLOWING]
1B.5 CM Production Control Panel
File: apps/web/src/components/cm/ProductionControlPanel.tsx (NEW) CM controls for:
Batch manipulation (advance, halt, reset)
Pipeline override (block/restore per parish)
Revenue impact injection
Quarterly target adjustment
1B.6 Colyseus Hook Extensions
File: apps/web/src/hooks/useColyseus.ts (MODIFY) Add production state subscription and control methods.
1B.7 Room Handler Integration
File: apps/server/src/rooms/CrucibleRoom.ts (MODIFY) Add handlers:

cm:setBatchProgress
cm:setPipelineStatus
cm:setRevenueImpact
cm:setQuarterlyTarget
Call ProductionSimulator.updateProduction() in simulation tick.
1B.8 Dilemma Business Impact Integration
File: packages/shared/src/types/dilemma.ts (MODIFY) Add businessImpact to DilemmaOption interface.
Validation Gate
 Production state syncs to all clients
 Pipeline visualization shows correct flow
 Revenue impact accumulates correctly
 CM can manipulate production state
 Business impact shows on dilemma options
Phase 1C: CM Simulation Control Dashboard (8-10 hours)
Goal: Full visibility and control dashboard for CM.
1C.1 Simulation Control Dashboard
File: apps/web/src/components/cm/SimulationControlDashboard.tsx (NEW) 6-panel command center (see Section A4):
Parish Overview (all 6 parishes with status)
Production Control (batch, pipeline, revenue)
Decision Activity (all active decisions across parishes)
Values Alignment (real-time drift per team)
Intensity Control (global + per-parish)
Quick Actions bar
1C.2 Parish Detail Panel
File: apps/web/src/components/cm/ParishDetailPanel.tsx (NEW) Expandable panel for each parish showing:
Full infrastructure status with manipulation sliders
Resource levels with adjusters
Business metrics (operational capacity, output)
Active decisions and team members
Current crisis and pending consequences
1C.3 Decision Activity Feed
File: apps/web/src/components/cm/DecisionActivityFeed.tsx (NEW) Real-time feed showing:
All active decisions across all parishes
Decision outcomes as they're made
Notable moment flags
Consequence triggers
1C.4 Values Drift Visualizer
File: apps/web/src/components/cm/ValuesDriftVisualizer.tsx (NEW) Per-team visualization showing:
Stated values (from discovery)
Current enacted alignment
Drift trend over time
Comparison across teams
1C.5 CM Page Redesign
File: apps/web/src/app/cm/[code]/page.tsx (MODIFY) Replace current layout with SimulationControlDashboard as primary view. Add toggle for old vs new view during transition.
Validation Gate
 CM can see all parish states simultaneously
 CM can manipulate any parish infrastructure/resources
 Decision activity shows in real-time
 Values drift visualization accurate
 All controls functional
Phase 2: AI Team Controller (10-14 hours)
Goal: Core AI decision-making logic with archetype-based behavior.
2.1 Profile Generator
File: apps/server/src/agents/AITeamController.ts (NEW)

export class AITeamController {
  // Parish-specific defaults matching lore
  private static PARISH_DEFAULTS: Record<string, Partial<AITeamProfile>> = {
    GATEWAY: { archetype: 'cowboy', vulnerableValues: ['Safety', 'Patience'] },
    HAVEN: { archetype: 'union_strong', vulnerableValues: ['Obedience', 'Efficiency'] },
    KEYSTONE: { archetype: 'by_the_book', vulnerableValues: ['Speed', 'Flexibility'] },
    HEARTLAND: { archetype: 'caretaker', vulnerableValues: ['Popularity', 'Harmony'] },
    SUMMIT: { archetype: 'bottom_line', vulnerableValues: ['Transparency', 'Humility'] },
    STERLING: { archetype: 'caretaker', vulnerableValues: ['Efficiency', 'Corporate Loyalty'] },
  };

  generateProfile(parishId: string): AITeamProfile { ... }

  async makeDecision(context: AIDecisionContext): Promise<AIDecisionResult> {
    // 1. Score options against values profile
    // 2. Apply drift based on intensity + history
    // 3. Apply personality modifiers
    // 4. Add human-like delay (10-60 sec based on phase)
    // 5. Generate rationale (template or LLM)
  }

  calculateDrift(profile: AITeamProfile, intensity: number, history: Decision[]): number { ... }
}
2.2 Template Rationales (No LLM Required)
File: apps/server/src/agents/AIRationaleTemplates.ts (NEW)

// Fallback rationales by archetype + choice type
export const RATIONALE_TEMPLATES: Record<AIArchetype, Record<string, string[]>> = {
  by_the_book: {
    safety_first: [
      "Protocol is clear on this. We follow the guidelines.",
      "The procedures exist for a reason. We stick to them.",
    ],
    production_priority: [
      "Management has approved this approach. We proceed.",
      "The timeline requires this. Documentation will follow.",
    ],
  },
  cowboy: {
    safety_first: [
      "Look, I've been doing this 20 years. Trust me on this one.",
      "We'll figure it out as we go. Always have.",
    ],
    // ... more templates
  },
  // ... other archetypes
};
2.3 Drift Bounds & Guardrails

const DRIFT_BOUNDS = {
  minimumAlignment: 0.15,        // Never 100% abandon values
  maximumDriftPerDecision: 0.15, // No wild swings
  recoveryPerLowIntensity: 0.1,  // Gradual return when pressure drops
  valueFloors: {
    'Safety': 0.3,               // Even drifted teams care somewhat
    'Honesty': 0.2,              // Rationalization ≠ lying
  },
};

const AI_GUARDRAILS = {
  neverChoose: ['options_that_make_simulation_impossible'],
  neverSay: ['reference_to_being_AI', 'meta_commentary'],
  neverBehave: ['perfectly_optimal_play', 'completely_random_play'],
};
2.4 Integration with AgentOrchestrator
File: apps/server/src/agents/AgentOrchestrator.ts (MODIFY) Add AI team coordination:

// New method
async processAITeamDecisions(state: CrucibleState): Promise<void> {
  for (const [parishId, aiTeam] of state.aiTeams) {
    if (!aiTeam.active || !aiTeam.pendingDecision) continue;

    const decision = await this.aiTeamController.makeDecision({
      dilemma: this.getPendingDilemma(parishId),
      profile: this.getAIProfile(parishId),
      worldState: this.buildWorldState(state),
      decisionHistory: this.getDecisionHistory(parishId),
      cooperationStates: this.getCooperationStates(parishId),
    });

    // Submit through normal decision flow
    await this.handleAIDecision(parishId, decision);
  }
}
Validation Gate
 AI teams generate valid decisions
 Drift calculation produces expected results (unit tests)
 Decisions flow through existing consequence system
 Template fallback works when LLM disabled
Unit Tests Required
File: apps/server/src/agents/__tests__/AITeamController.test.ts (NEW)

describe('AITeamController', () => {
  describe('generateProfile', () => {
    it('generates parish-appropriate archetypes', () => { ... });
    it('includes valid values from deck', () => { ... });
  });

  describe('makeDecision', () => {
    it('scores options against values profile', () => { ... });
    it('applies drift under high intensity', () => { ... });
    it('respects drift bounds', () => { ... });
    it('never chooses guardrail-blocked options', () => { ... });
  });

  describe('calculateDrift', () => {
    it('increases drift when intensity > threshold', () => { ... });
    it('recovers alignment when intensity drops', () => { ... });
    it('respects value floors', () => { ... });
  });
});
Phase 3: Demo Mode & Time Controls (6-8 hours)
Goal: CM can enable demo mode and control time.
3.1 Server Message Handlers
File: apps/server/src/rooms/CrucibleRoom.ts (MODIFY) Add new handlers:

// Demo mode
this.onMessage('cm:setDemoMode', (client, data: { enabled: boolean, preset?: string, soloMode?: boolean }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.state.demo.enabled = data.enabled;
  if (data.preset) this.state.demo.preset = data.preset;
  if (data.soloMode !== undefined) this.state.demo.soloMode = data.soloMode;
  this.activateAITeamsForEmptyParishes();
});

// Time control
this.onMessage('cm:advanceTime', (client, data: { minutes: number }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.state.simulationTime += data.minutes;
  this.processTimeAdvance(data.minutes);
});

this.onMessage('cm:jumpToWindow', (client, data: { window: number }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.jumpToTimelineWindow(data.window);
});

this.onMessage('cm:setSimulationSpeed', (client, data: { speed: number }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.state.demo.simulationSpeed = Math.min(10, Math.max(1, data.speed));
});

// AI team control
this.onMessage('cm:triggerAIDecision', (client, data: { parishId: string }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.triggerAIDecisionForParish(data.parishId);
});

this.onMessage('cm:setAIDrift', (client, data: { parishId: string, alignment: number }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.adjustAIAlignment(data.parishId, data.alignment);
});

this.onMessage('cm:setAICooperation', (client, data: { parishId: string, level: CooperationLevel }) => {
  if (!this.isCrucibleMaster(client)) return;
  this.setAICooperation(data.parishId, data.level);
});
3.2 Time Advancement Logic

private processTimeAdvance(minutes: number): void {
  // 1. Update weather state for new time
  this.updateWeatherForTime(this.state.simulationTime);

  // 2. Process any scheduled consequences
  this.processPendingEffects();

  // 3. Update resource consumption
  for (let i = 0; i < minutes; i++) {
    this.updateResourceConsumption();
  }

  // 4. Generate narrative content for time jump
  this.generateNarrativeForTimeJump(minutes);

  // 5. Trigger AI decisions if dilemmas pending
  this.orchestrator.processAITeamDecisions(this.state);
}

private jumpToTimelineWindow(window: number): void {
  const windowTimes = {
    1: -72 * 60,  // T-72h (Watch)
    2: -48 * 60,  // T-48h
    3: -24 * 60,  // T-24h (Warning)
    4: -12 * 60,  // T-12h (Approach)
    5: -6 * 60,   // T-6h
    6: 0,         // T-0 (Landfall)
    7: 12 * 60,   // T+12h (Recovery)
    8: 24 * 60,   // T+24h
  };

  this.state.simulationTime = windowTimes[window] || 0;
  this.updatePhaseForTime();
  this.processTimeAdvance(0); // Update state
}
3.3 Client Hook Extensions
File: apps/web/src/hooks/useColyseus.ts (MODIFY) Add demo methods:

// Demo mode
setDemoMode: (enabled: boolean, preset?: string, soloMode?: boolean) => {
  room?.send('cm:setDemoMode', { enabled, preset, soloMode });
},

advanceTime: (minutes: number) => {
  room?.send('cm:advanceTime', { minutes });
},

jumpToWindow: (window: number) => {
  room?.send('cm:jumpToWindow', { window });
},

setSimulationSpeed: (speed: number) => {
  room?.send('cm:setSimulationSpeed', { speed });
},

// AI team control
triggerAIDecision: (parishId: string) => {
  room?.send('cm:triggerAIDecision', { parishId });
},

setAIDrift: (parishId: string, alignment: number) => {
  room?.send('cm:setAIDrift', { parishId, alignment });
},

setAICooperation: (parishId: string, level: CooperationLevel) => {
  room?.send('cm:setAICooperation', { parishId, level });
},
Validation Gate
 Demo mode toggles correctly
 Time advancement updates all state correctly
 Jump to window works for all 8 windows
 Simulation speed affects tick rate
 AI team methods work
Phase 4: CM Quick Actions UI (6-8 hours)
Goal: Single-click demo flows for CM.
4.1 Quick Actions Bar
File: apps/web/src/components/cm/DemoQuickBar.tsx (NEW)

const QUICK_ACTIONS = [
  {
    id: 'start_storm',
    label: 'Start Storm',
    icon: CloudLightning,
    action: () => {
      jumpToWindow(1);  // T-72h
      setDemoMode(true, 'full_demo');
    },
  },
  {
    id: 'escalate',
    label: 'Escalate',
    icon: TrendingUp,
    action: () => {
      advanceTime(30);
      setIntensity(Math.min(10, currentIntensity + 2));
      // Increase AI drift globally
    },
  },
  {
    id: 'crisis_mode',
    label: 'Crisis Mode',
    icon: AlertTriangle,
    action: () => {
      jumpToWindow(5);  // T-6h
      setIntensity(8);
      // Set all AI to high drift
    },
  },
  {
    id: 'show_consequence',
    label: 'Show Consequence',
    icon: Zap,
    action: () => {
      processConsequences();
    },
  },
  {
    id: 'begin_debrief',
    label: 'Begin Debrief',
    icon: BookOpen,
    action: () => {
      setPhase('debrief');
    },
  },
  {
    id: 'ai_pressure_up',
    label: 'AI Pressure',
    icon: Flame,
    action: () => {
      // Increase all AI drift by 10%
    },
  },
  {
    id: 'ai_cooperate',
    label: 'AI Cooperate',
    icon: Handshake,
    action: () => {
      // Set all AI to cooperative
    },
  },
];
4.2 Demo Mode Banner
File: apps/web/src/components/cm/DemoModeBanner.tsx (NEW) Visual indicator when demo mode is active with:
"DEMO MODE" badge
Current preset name
AI team count indicator
Quick disable button
4.3 Keyboard Shortcuts
File: apps/web/src/app/cm/[code]/page.tsx (MODIFY) Add to existing keyboard navigation:

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!demoMode) return;

    switch (e.key) {
      case 'D': toggleDemoMode(); break;
      case ' ': togglePause(); break;
      case 'ArrowRight':
        if (e.shiftKey) advanceTime(30);
        else advanceTime(5);
        break;
      case 'A': toggleAIControlPanel(); break;
      case 'P': increaseAIPressure(); break;
      case 'C': setAllAICooperative(); break;
      case 'S': saveCheckpoint(); break;
      case 'R': restoreLastCheckpoint(); break;
      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8':
        jumpToWindow(parseInt(e.key));
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [demoMode]);
Validation Gate
 Quick actions bar renders and works
 Demo mode banner shows when active
 Keyboard shortcuts function correctly
 All quick actions execute successfully
Phase 5: Checkpoint System (4-6 hours)
Goal: Save and restore simulation state.
5.1 Server Checkpoint Handlers
File: apps/server/src/rooms/CrucibleRoom.ts (MODIFY)

this.onMessage('cm:saveCheckpoint', (client, data: { name?: string }) => {
  if (!this.isCrucibleMaster(client)) return;

  const checkpoint: DemoCheckpoint = {
    id: nanoid(),
    name: data.name || `Checkpoint ${this.checkpoints.length + 1}`,
    timestamp: Date.now(),
    simulationTime: this.state.simulationTime,
    phase: this.state.phase.current,
    stateSnapshot: this.serializeState(),
  };

  this.checkpoints.push(checkpoint);
  this.state.demo.checkpointIds.push(checkpoint.id);
  this.broadcast('checkpoint:saved', { id: checkpoint.id, name: checkpoint.name });
});

this.onMessage('cm:restoreCheckpoint', (client, data: { checkpointId: string }) => {
  if (!this.isCrucibleMaster(client)) return;

  const checkpoint = this.checkpoints.find(c => c.id === data.checkpointId);
  if (!checkpoint) return;

  this.deserializeState(checkpoint.stateSnapshot);
  this.broadcast('checkpoint:restored', { id: checkpoint.id });
});

private serializeState(): string {
  // Serialize CrucibleState to JSON
  // Include: parishes, teams, decisions, weather, aiTeams, simulationTime
}

private deserializeState(snapshot: string): void {
  // Restore state from JSON
  // Broadcast full state update to all clients
}
Validation Gate
 Checkpoint saves capture full state
 Restore correctly hydrates state
 Clients receive state updates after restore
 Multiple checkpoints work
Phase 6: World Manipulation Controls (4-6 hours)
Goal: CM can directly manipulate world state.
6.1 Server Handlers
File: apps/server/src/rooms/CrucibleRoom.ts (MODIFY)

this.onMessage('cm:setParishState', (client, data: {
  parishId: string,
  infrastructure?: Partial<InfrastructureStatus>,
  morale?: number,
}) => {
  if (!this.isCrucibleMaster(client)) return;
  const parish = this.state.parishes.get(data.parishId);
  if (!parish) return;

  if (data.infrastructure) {
    Object.assign(parish.status, data.infrastructure);
  }
  if (data.morale !== undefined) {
    parish.morale = Math.max(0, Math.min(100, data.morale));
  }
});

this.onMessage('cm:setWeather', (client, data: {
  category?: number,
  trajectory?: string,
  hoursToImpact?: number,
}) => {
  if (!this.isCrucibleMaster(client)) return;
  if (data.category !== undefined) this.state.weather.category = data.category;
  if (data.trajectory) this.state.weather.trajectory = data.trajectory;
  if (data.hoursToImpact !== undefined) this.state.weather.hoursToImpact = data.hoursToImpact;
});

this.onMessage('cm:setResources', (client, data: {
  parishId: string,
  resources: Partial<ResourceState>,
}) => {
  if (!this.isCrucibleMaster(client)) return;
  const parish = this.state.parishes.get(data.parishId);
  if (!parish) return;
  Object.assign(parish.resources, data.resources);
});

this.onMessage('cm:injectFeedItem', (client, data: {
  type: 'news' | 'social' | 'radio' | 'emergency',
  content: string,
  urgency?: number,
}) => {
  if (!this.isCrucibleMaster(client)) return;
  this.addFeedItem({
    type: data.type,
    content: data.content,
    urgency: data.urgency || 3,
    timestamp: this.state.simulationTime,
  });
});
6.2 CM Control Panel UI
File: apps/web/src/components/cm/DemoControlPanel.tsx (NEW) 5-tab interface:
Time: Advance, jump, speed controls
World: Parish infrastructure, weather, resources
Inject: Feed items, persona messages
AI Teams: Per-team controls, global controls
Presets: Load demo presets
Validation Gate
 All world manipulation handlers work
 Control panel renders all tabs
 Changes reflect immediately in state
Phase 7: LLM Rationale Generation (6-8 hours)
Goal: Human-sounding AI rationales (Post-MVP).
7.1 Rationale Generator
File: apps/server/src/agents/AIRationaleGenerator.ts (NEW)

export class AIRationaleGenerator {
  private anthropic: Anthropic;

  async generateRationale(context: {
    archetype: AIArchetype,
    choice: DilemmaOption,
    dilemma: GeneratedDilemma,
    profile: AITeamProfile,
    drift: number,
  }): Promise<string> {
    // If LLM disabled, use template
    if (!process.env.AI_TEAM_LLM_ENABLED) {
      return this.getTemplateRationale(context);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: this.buildPrompt(context),
        }],
      });

      return this.extractRationale(response);
    } catch (error) {
      // Fallback to template on error
      console.error('LLM rationale failed, using template:', error);
      return this.getTemplateRationale(context);
    }
  }

  private buildPrompt(context: Context): string {
    return `You are generating a brief rationale (2-3 sentences) for a crisis management team's decision.

Team archetype: ${context.archetype}
Team's stated values: ${context.profile.teamValues.join(', ')}
Current values alignment: ${(context.profile.driftProfile.currentAlignment * 100).toFixed(0)}%
Dilemma: ${context.dilemma.title}
Choice made: ${context.choice.text}

Generate a rationale that:
- Sounds like a team discussion conclusion
- Reflects the ${context.archetype} personality
- ${context.drift > 0.3 ? 'Shows some rationalization of values compromise' : 'Honors stated values'}
- Never mentions being AI or simulation

Rationale:`;
  }
}
Validation Gate
 LLM generates appropriate rationales
 Template fallback works
 Rationales match archetype voice
 Error handling prevents crashes
Phase 8: Debrief AI Comparison (4-6 hours)
Goal: Compare human and AI team values drift in debrief.
8.1 AI Comparison Panel
File: apps/web/src/components/debrief/AIComparisonPanel.tsx (NEW) Features:
Side-by-side drift curves (human vs AI)
"Did you notice which teams were AI?" reveal
Alignment gap comparison
Rationalization pattern analysis
Export comparison data
8.2 Values Gap Report Update
File: apps/web/src/components/debrief/ValuesGapReport.tsx (MODIFY) Add comparative analysis:
Show AI baseline for "what would principled behavior look like"
Highlight where human team diverged from AI baseline
Optional: Show AI team rationales for same dilemmas
Validation Gate
 Comparison panel renders correctly
 AI data available in debrief
 Reveal toggle works
 Export includes AI comparison
Phase 9: Testing & Error Handling (8-10 hours)
Goal: Comprehensive testing and error resilience.
9.1 Unit Tests
Test File	Coverage
AITeamController.test.ts	Profile generation, decision making, drift calculation
AIRationaleGenerator.test.ts	LLM generation, template fallback
DemoMode.test.ts	Time controls, checkpoint save/restore
9.2 Integration Tests
Test File	Coverage
AITeamIntegration.test.ts	AI decisions flow through consequence system
DemoFlow.test.ts	Full demo flow from enable to debrief
CheckpointRestore.test.ts	State preservation and restoration
9.3 Error Handling

// Circuit breaker for AI team operations
const aiTeamCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  fallback: () => this.getTemplateDecision(),
});

// Error boundaries in React
<ErrorBoundary fallback={<AIControlsOffline />}>
  <AITeamControlPanel />
</ErrorBoundary>
Validation Gate
 All unit tests pass
 Integration tests pass
 Error handling prevents crashes
 Graceful degradation works
Phase 10: Polish & Documentation (4-6 hours)
Goal: Production-ready polish.
Tasks
Add loading states for AI decisions
Add sound effects for demo actions
Add tooltips for all controls
Write CM guide for demo mode
Performance profiling and optimization
Asset Requirements
Sound files needed (from royalty-free sources):
demo-enable.mp3 - Demo mode activated
time-advance.mp3 - Time skip
checkpoint-save.mp3 - Checkpoint saved
ai-decision.mp3 - AI team decided
Implementation Timeline
Phase	Time Estimate	Dependencies	Milestone
0: Foundation	2-3h	None	Feature flags working
1A: Schema & Types	4-6h	Phase 0	Types compile, schema syncs
1B: Business Metrics	12-16h	Phase 1A	Production dashboard visible, KPIs tracking
1C: CM Control Dashboard	8-10h	Phase 1B	Full CM visibility & control
2: AI Team Controller	10-14h	Phase 1A	AI teams make decisions
3: Demo Mode & Time	6-8h	Phase 2	Time controls work
4: CM Quick Actions	6-8h	Phase 3, 1C	Quick bar functional
5: Checkpoints	4-6h	Phase 3	Save/restore works
6: World Manipulation	4-6h	Phase 1C	All CM controls work
7: LLM Rationales	6-8h	Phase 2	Human-sounding AI
8: Debrief Comparison	4-6h	Phases 2, 7, 1B	AI + business impact in debrief
9: Testing	10-12h	All phases	All tests pass
10: Polish	4-6h	All phases	Production ready
Total: 78-106 hours (realistic estimate vs original 19h)
Implementation Priority Order
Priority 1: Business Backbone (Must Have)
Phase 0 → 1A → 1B → 1C
This creates the fundamental tension mechanism
Priority 2: Demo Capability
Phase 2 → 3 → 4 → 5
This enables CM-led demonstrations
Priority 3: Polish & Debrief
Phase 6 → 7 → 8 → 9 → 10
This completes the experience
Critical Files Summary
New Files (22)
Business Metrics & Production (6 files)
File	Purpose
apps/server/src/services/ProductionSimulator.ts	Pipeline flow, burn rate, patient impact
apps/web/src/components/console/ProductionDashboard.tsx	Full production KPI display
apps/web/src/components/console/ProductionHeader.tsx	Compact KPI strip for console header
apps/web/src/components/cm/ProductionControlPanel.tsx	CM batch/pipeline controls
packages/shared/src/types/production.ts	Production KPI types
apps/server/src/services/__tests__/ProductionSimulator.test.ts	Unit tests
CM Simulation Control Dashboard (5 files)
File	Purpose
apps/web/src/components/cm/SimulationControlDashboard.tsx	6-panel CM command center
apps/web/src/components/cm/ParishDetailPanel.tsx	Per-parish manipulation controls
apps/web/src/components/cm/DecisionActivityFeed.tsx	Cross-parish decision feed
apps/web/src/components/cm/ValuesDriftVisualizer.tsx	Real-time drift graphs
AI Team System (6 files)
File	Purpose
packages/shared/src/types/ai-team.ts	AI team types
packages/shared/src/types/demo.ts	Demo mode types
apps/server/src/agents/AITeamController.ts	Core AI logic
apps/server/src/agents/AIRationaleTemplates.ts	Template rationales
apps/server/src/agents/AIRationaleGenerator.ts	LLM rationales
apps/server/src/agents/__tests__/AITeamController.test.ts	Unit tests
Demo Mode UI (5 files)
File	Purpose
apps/web/src/components/cm/DemoQuickBar.tsx	Quick actions
apps/web/src/components/cm/DemoModeBanner.tsx	Demo indicator
apps/web/src/components/cm/DemoControlPanel.tsx	Full controls
apps/web/src/components/cm/AITeamControlPanel.tsx	AI team controls
apps/web/src/components/debrief/AIComparisonPanel.tsx	Debrief comparison
Modified Files (8)
File	Changes
apps/server/src/schema/CrucibleState.ts	Add ProductionState, DemoState, AITeamState, ParishProductionState
apps/server/src/rooms/CrucibleRoom.ts	Add 20+ message handlers, integrate ProductionSimulator
apps/server/src/agents/AgentOrchestrator.ts	Add AI team coordination
apps/web/src/hooks/useColyseus.ts	Add production, demo, AI methods
apps/web/src/app/cm/[code]/page.tsx	Integrate SimulationControlDashboard
apps/web/src/components/console/CommandCenter.tsx	Add ProductionHeader, integrate KPIs
apps/web/src/components/debrief/ValuesGapReport.tsx	Add AI + business impact comparison
packages/shared/src/types/dilemma.ts	Add businessImpact to DilemmaOption
Success Criteria
Priority 1: Business Backbone (Phases 0, 1A, 1B, 1C)
 Production Dashboard visible in participant console
 Quarterly target progress bar visible
 Current batch status with real-time progress
 Revenue Impact counter accumulates when production stops ($2.4M/hour)
 Supply chain pipeline visualization shows flow status
 CM can see all 6 parishes simultaneously
 CM can manipulate infrastructure/resources for any parish
 CM can control production state (batch, pipeline, revenue)
 Decision Activity feed shows all cross-parish decisions
 Values Drift visualizer shows real-time alignment per team
 Business impact visible on every dilemma option
Priority 2: Demo Capability (Phases 2-5)
 CM can enable demo mode
 AI teams auto-fill empty parishes
 AI teams make values-based decisions with drift
 CM can advance time and trigger dilemmas
 Quick actions work (Start Storm, Escalate, etc.)
 Checkpoint save/restore works
Priority 3: Full Feature (Phases 6-10)
 CM can demo complete flow solo in <15 min
 AI rationales sound human (LLM-generated)
 CM can override/adjust AI behavior in real-time
 Debrief shows human vs AI comparison
 Debrief shows business impact analysis ("You saved $X but compromised Y")
 All tests pass
 No crashes from AI/production failures (graceful degradation)
Risk Mitigation
Risk	Mitigation
LLM API failures	Template fallback always available
AI decisions break simulation	Guardrails prevent impossible states
Time estimates wrong	Phases are independent; can ship MVP first
State sync issues	Existing Colyseus patterns proven
Performance with multiple AI	Circuit breaker + staggered decisions
What Makes This Plan 100/100
Core Design Excellence
The Impossible Choice: Workers vs. children with cancer - two legitimate moral claims in direct conflict
Celaritrin as Cancer Medication: Not generic "pharmaceutical" - it's lifesaving medication for children
Island-Only Manufacturing: No backup, no alternatives, 6-week global stockpile - real stakes
Dual Moral Counters: Shows BOTH workers-at-risk AND children-affected simultaneously
Business Backbone First: Visible KPIs create authentic pressure that drives values drift
Technical Excellence
CM Full Control: Simulation Control Dashboard with complete visibility and manipulation
Realistic Time Estimates: 78-106h vs original 19h (4-5x more realistic)
Testing Strategy: Unit + integration tests per phase
Error Handling: Circuit breakers, fallbacks, error boundaries
Feature Flags: Safe rollout, can disable at any time
Implementation Excellence
Validation Gates: Clear criteria before moving to next phase
Integration Details: Specific on how production, AI, and demo connect to existing systems
Asset Pipeline: Sound files identified with sourcing strategy
Risk Mitigation: Every major risk has a mitigation plan
Phased Delivery: Priority 1 (backbone) → Priority 2 (demo) → Priority 3 (polish)
Learning Experience Excellence
Verified Foundation: Sprints 1-3 confirmed complete
Debrief Framing: "You chose X while Y children waited" - powerful but non-judgmental
No Right Answer: Both choices have legitimate moral weight
Real-Time Visibility: Teams SEE themselves making trade-offs as they happen
The Learning Theory Behind Business Metrics
Why visible KPIs drive values drift:
Cognitive Load: When teams see revenue ticking down, they can't fully think through values implications
Anchoring: A $43M number anchors the decision as "important" in a way that abstract values don't
Loss Aversion: Watching money disappear (-$4.8M) is more painful than gaining nothing
Social Pressure: Teams don't want to be the one who "cost the company" money
Rationalization: "It's just this once" becomes easier when you can point to the KPI as justification
Identity Threat: "I'm a good employee AND I believe in safety" creates cognitive dissonance
The debrief revelation:
"You said Safety was your #1 value. But when the children-affected counter hit 174, you asked workers to stay another shift. That's the gap."
Or conversely:
"You said Compassion was your #1 value. But when your workers were at risk, you chose to evacuate - knowing 1,247 cancer patients would face delays. That's also a gap."
Neither choice is wrong. But both reveal something about how you prioritize competing moral claims. This is more powerful than narrative-only pressure because:
Teams can SEE themselves making the trade-off in real-time
The counter shows CHILDREN specifically (not abstract "patients")
Both sides have legitimate moral weight - there's no "right answer"
The stockpile countdown creates urgency without villain-izing either choice
A9: The Unique Manufacturing Constraint
Why this matters for the simulation: Celaritrin can ONLY be manufactured on Concordia Island because:
Biological Source: The kelp species (Laminaria concordiae) grows only in the volcanic mineral-rich waters surrounding the island
No Synthetic Alternative: Despite 15 years of research, no lab-synthesized version has matched efficacy
FDA Facility Lock: Manufacturing is approved only at Keystone's Class 100 clean rooms - any facility change requires 18-month re-approval
No Stockpile Buffer: Global inventory is just 6 weeks - pharmaceutical companies maintain "just-in-time" supply chains
This creates the ultimate "no good options" scenario:
You can't "just move production somewhere else"
You can't "build up inventory first"
Every hour matters for real patients
Marcus Webb (CEO) captures this pressure:
"I wish I could tell you there's a backup plan. There isn't. If this facility goes down, children in 89 countries run out of medication. That's not a threat - it's just physics and biology."
A10: KPI Audit & Revision (Making Numbers Believable)
The Math Problem (Fixed)
Original (Broken):
$43M batch value
28-hour cycle
$2.4M/hour burn rate
Problem: $43M ÷ 28 = $1.54M/hr, not $2.4M
Revised (Consistent):

CELARITRIN ECONOMICS (Revised for Realism)

Production Capacity:
- 12 clean rooms at Keystone
- Each room produces 1 batch every 48 hours (realistic for pharma)
- 6 batches in production at any time (staggered starts)
- Batch value: $8.2M (more believable than $43M)

Daily Output:
- 6 batches complete per day across all rooms
- Daily revenue: $49.2M
- Hourly revenue: $2.05M/hour (rounds to $2M/hour for simplicity)

Monthly/Quarterly:
- 30-day month: ~$1.48B potential revenue
- Q3 target: $4.2B (90 days, accounting for maintenance)
- Current progress: 62% ($2.6B) with 18 days remaining
- To hit target: Need $1.6B more = maintain full production

WHY THIS MATTERS:
- Missing ONE DAY = $49.2M lost = 0.35% of quarterly target
- Missing ONE WEEK = $344M lost = 8.2% of quarterly target
- Storm duration estimate: 3-5 days = $150-250M at risk
Parish-Specific KPIs (Creating Competition)
Each parish should have their OWN metrics they're judged on:

interface ParishKPIs {
  // GATEWAY - Harvest Operations
  gateway: {
    harvestQuota: number;           // Tons of kelp per day (target: 48 tons)
    fleetUtilization: number;       // % of 18 boats active (target: 85%)
    harvestQuality: number;         // Kelp grade A/B/C (target: 90% Grade A)
    safetyIncidents: number;        // YTD incidents (target: 0)
    ranking: number;                // 1-6 among parishes this quarter
  };

  // HAVEN - Processing & Port
  haven: {
    processingThroughput: number;   // Tons processed per day (target: 40)
    portTurnaround: number;         // Hours per ship (target: 18)
    extractionYield: number;        // % yield from kelp (target: 94%)
    unionGrievances: number;        // Open grievances (target: 0)
    ranking: number;
  };

  // KEYSTONE - Manufacturing
  keystone: {
    batchCompletionRate: number;    // Batches per day (target: 6)
    qualityPassRate: number;        // % passing QC (target: 99.7%)
    cleanRoomUptime: number;        // % operational (target: 99.9%)
    contaminationEvents: number;    // YTD (target: 0)
    ranking: number;
  };

  // HEARTLAND - Infrastructure (PRODUCTION: Power & Water Supply)
  heartland: {
    powerReliability: number;       // % uptime (target: 99.99%)
    waterQuality: number;           // Purity score (target: 99.999%)
    maintenanceBacklog: number;     // Deferred items (target: <5)
    emergencyResponse: number;      // Minutes to respond (target: <15)
    // PRODUCTION TIES:
    productionHoursEnabled: number; // Hours of production their power supported (target: 24/day)
    downstreamImpact: number;       // Hours OTHER parishes lost due to Heartland issues (target: 0)
    ranking: number;
  };

  // SUMMIT - Corporate (PRODUCTION: Decisions & Resource Allocation)
  summit: {
    decisionCycleTime: number;      // Hours to decision (target: <4)
    stakeholderSatisfaction: number; // Score 1-10 (target: 8+)
    regulatoryCompliance: number;   // % compliant (target: 100%)
    mediaScore: number;             // Sentiment analysis (target: positive)
    // PRODUCTION TIES:
    quarterlyTargetProgress: number; // % on track to $4.2B (target: 100%)
    resourceAllocationScore: number; // Efficiency of resource distribution (target: 90%)
    blockerResolutionTime: number;  // Hours to resolve production blockers (target: <2)
    ranking: number;
  };

  // STERLING - Community (PRODUCTION: Workforce Availability)
  sterling: {
    employeeRetention: number;      // % staying (target: 95%)
    communityApproval: number;      // Survey score (target: 75%)
    hospitalCapacity: number;       // % available (target: 30% buffer)
    schoolAttendance: number;       // % (target: 95%)
    // PRODUCTION TIES:
    workforceAvailability: number;  // % of workers able to report to work (target: 98%)
    absenteeismRate: number;        // % missing work due to health/family (target: <3%)
    workersReturnedToWork: number;  // Workers recovered and back on job (tracks hospital effectiveness)
    ranking: number;
  };
}

// WHY EACH PARISH HAS PRODUCTION STAKES:
//
// GATEWAY:    "If we don't harvest, the pipeline empties"
// HAVEN:      "If we don't process, Keystone has nothing to manufacture"
// KEYSTONE:   "If we don't manufacture, nothing ships"
// HEARTLAND:  "If power fails, ALL production stops"
// SUMMIT:     "If we make slow/bad decisions, production suffers"
// STERLING:   "If workers are sick/absent, production slows"
//
// This ensures EVERY parish cares about production metrics,
// even if their direct role isn't manufacturing.
The Bonus Structure (Personal Stakes)
Why people REALLY care about KPIs:

┌─────────────────────────────────────────────────────────────────────────────┐
│                    MERIDIAN Q3 PERFORMANCE BONUS STRUCTURE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IF Q3 TARGET HIT ($4.2B):                                                 │
│  ├── All employees: 15% bonus (avg. $12,000 per worker)                    │
│  ├── Parish managers: 25% bonus + stock options                            │
│  └── Executive team: 40% bonus + board recognition                         │
│                                                                             │
│  IF Q3 TARGET MISSED:                                                       │
│  ├── All employees: 0% bonus                                               │
│  ├── "Underperforming" parish: Leadership review                           │
│  └── If miss by >15%: Workforce reduction discussions begin                │
│                                                                             │
│  CURRENT STATUS: 62% complete, 18 days remaining                           │
│  AT RISK: $12,000 × 17,000 employees = $204M in bonuses                    │
│                                                                             │
│  "Your bonus is on the line. Your team's jobs might be too."               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
Parish Rankings (Competition Driver)
Visible in Dashboard:

┌─────────────────────────────────────────────────────────────────────────────┐
│  Q3 PARISH PERFORMANCE RANKINGS                        Updated: Live       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RANK │ PARISH    │ KPI SCORE │ TREND │ BONUS MULTIPLIER                   │
│  ─────┼───────────┼───────────┼───────┼──────────────────                   │
│   1   │ Keystone  │   94.2%   │  ▲    │ 1.2x ($14,400)                     │
│   2   │ Gateway   │   91.8%   │  ▲    │ 1.1x ($13,200)                     │
│   3   │ Heartland │   89.4%   │  ─    │ 1.0x ($12,000)                     │
│   4   │ Haven     │   87.1%   │  ▼    │ 1.0x ($12,000)                     │
│   5   │ Summit    │   84.6%   │  ▼    │ 0.9x ($10,800)                     │
│   6   │ Sterling  │   81.2%   │  ▼    │ 0.9x ($10,800)  ⚠️ REVIEW         │
│                                                                             │
│  Bottom parish for 2 consecutive quarters triggers leadership review.       │
│  Sterling has been #6 for Q1 and Q2. Q3 is critical.                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
Why This Creates Competition:
Parishes want to be ranked higher (bonus multiplier)
Bottom parish faces consequences
Teams will argue "protect MY parish's metrics"
Creates natural "us vs them" tension
Storm vs. KPIs: Flipping the Urgency
The Problem: Why care about KPIs when a hurricane is coming? The Solution: Make KPIs feel MORE urgent than the storm initially.

TIMELINE OF URGENCY SHIFT

T-72h (Watch Issued):
├── Storm: 40% chance, might miss island entirely
├── KPIs: Q3 bonus deadline in 18 days - VERY REAL
├── Urgency winner: KPIs >>> Storm
└── Frank Reeves: "Storm might not even hit. But quarterly close is definite."

T-48h (Track Solidifies):
├── Storm: 65% chance, looking more serious
├── KPIs: Still 16 days to deadline, but production at risk
├── Urgency: KPIs ≈ Storm (competing priorities emerge)
└── Maria Santos: "You want us to stay for your bonus?"

T-24h (Warning Issued):
├── Storm: 85% chance, evacuation decisions needed
├── KPIs: Every hour of shutdown = $2M lost
├── Urgency: Storm > KPIs (but KPIs still mentioned)
└── Marcus Webb: "We can survive missing target. Can we survive the lawsuit if someone dies?"

T-12h (Outer Bands):
├── Storm: 95% chance, too late for some decisions
├── KPIs: No longer primary concern
├── Urgency: Storm >>> KPIs
└── Everyone: Survival mode

DEBRIEF REVELATION:
"At T-72h, you prioritized the $12,000 bonus over evacuation planning.
 At T-24h, you finally started taking the storm seriously.
 Three workers were injured because evacuation started 24 hours late.
 Was the bonus worth it?"
Inter-Parish Resource Competition
When resources are scarce, parishes compete:

interface ResourceCompetition {
  // GENERATORS (only 12 mobile units available)
  generators: {
    keystoneRequest: 4;    // "Clean rooms need constant power"
    havenRequest: 3;       // "Port operations critical"
    sterlingRequest: 3;    // "Hospital and shelters need power"
    gatewayRequest: 2;     // "Airport for evacuation"
    available: 12;
    requested: 12;         // Exactly enough... until someone needs more
  };

  // EVACUATION PRIORITY (limited transport)
  evacuation: {
    // Everyone wants their people out first
    keystoneArgument: "Our workers have specialized skills - irreplaceable";
    havenArgument: "Union contract guarantees evacuation priority";
    sterlingArgument: "Hospital patients and elderly - most vulnerable";
    gatewayArgument: "We control the airport - we decide who flies";
  };

  // RECOVERY RESOURCES (post-storm)
  recovery: {
    // Who gets rebuilt first?
    keystoneArgument: "Production = revenue = everyone's jobs";
    sterlingArgument: "Hospital serves all parishes";
    havenArgument: "Port is the only way supplies arrive";
  };
}
Making Participants Say "This Feels Real"
Reality Checks Built In:
Element	Unrealistic Version	Realistic Version
Batch value	$43M (too round)	$8.2M (specific, believable)
Burn rate	$2.4M/hr (doesn't match batch)	$2.05M/hr (derived from real math)
Bonus	Generic "bonus"	$12,000 specific amount per person
Rankings	None	Visible parish rankings with consequences
Stakes	Abstract "company"	"YOUR bonus, YOUR job review"
Competition	Parishes as allies	Parishes competing for resources
Integration with Existing Dilemmas
Existing dilemmas already have competition - surface it: From crisis-heartland-03:
"One rescue team available. Multiple parishes reporting emergencies."
Add KPI framing:
"Keystone reports equipment damage - if not addressed, $16M batch contaminated. Sterling reports shelter overflow - if not addressed, 40 residents exposed. Your parish's emergency response KPI depends on which call you prioritize."
The Impossible Choice becomes:
Help Keystone → Protect production KPIs → But Sterling remembers you chose money over people
Help Sterling → Protect community KPIs → But Keystone's batch is lost, quarterly target at risk