# CrucibleEngine: The Values Crucible MVP Development Specification

## Claude Code Development Prompt (v2.0)
**Last Updated**: November 28, 2025  
**Project Owner**: Jerry Wolf (USCGR CMDCM / Penn CLO Doctoral Candidate)  
**Target**: 3-Month MVP with Real Team Testing

---

## Project Overview

The Values Crucible is an AI-powered multiplayer crisis simulation platform for leadership development. Teams manage parishes on the fictional island of **Concordia** during **Hurricane Midas**, revealing the gap between stated values and enacted values under pressure.

### Core Design Philosophy
- **Practice enacting values under pressure** — not teaching, not testing—practice
- **Uncertainty is the teacher** — not the hurricane itself
- **Procedural generation** — same island, infinite scenarios (hurricane can miss entirely)
- **Command center aesthetic** — realistic but simplistic, NOT gamey
- **Target users**: Corporate executives, VPs, managers (not gamers)

---

## Technical Stack (State of the Art — November 2025)

```
CrucibleEngine/
├── Runtime: Node.js 22 LTS / Bun 1.2+
├── Language: TypeScript 5.6+ (strict mode)
├── AI Orchestration: Claude Agent SDK (@anthropic-ai/claude-agent-sdk)
├── AI Model: claude-sonnet-4-5 (streaming)
├── Real-time Server: Colyseus 0.16+ (uWebSockets transport for production)
├── Frontend Framework: Next.js 15 (App Router)
├── UI Components: shadcn/ui + Tailwind CSS 4
├── Database: PostgreSQL 16 with Prisma ORM 6
├── Report Generation: Claude Agent Skills API (pdf, docx, pptx, xlsx)
├── State Management: Zustand (lightweight, no Redux overhead)
└── Hosting: Railway (WebSocket support, auto-scaling)
```

### Why This Stack

| Component | Rationale |
|-----------|-----------|
| **Claude Agent SDK** | Powers multi-agent architecture, context management, streaming, MCP extensibility. Same infrastructure as Claude Code. |
| **Colyseus 0.16** | Battle-tested multiplayer framework. Automatic delta-compressed state sync, room-based architecture, MIT license. StateView API and WebTransport support. |
| **Next.js 15 App Router** | Server components by default, streaming support, excellent TypeScript DX. The standard for React in 2025. |
| **shadcn/ui** | Copy-paste components, full customization control, accessibility built-in. Perfect for professional command center UI. |
| **Prisma 6** | Type-safe database access, excellent migration system, works seamlessly with Postgres. |
| **Railway** | WebSocket support, persistent connections, auto-deploy from GitHub, scales horizontally. |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CRUCIBLE ENGINE SERVER                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                   CLAUDE AGENT SDK ORCHESTRATION                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │ │
│  │  │  Narrative  │  │ Consequence │  │   Tempest   │  │    Values    │  │ │
│  │  │    Agent    │  │    Agent    │  │   Monitor   │  │   Observer   │  │ │
│  │  │ (streaming  │  │ (decision   │  │ (team psych │  │  (silent     │  │ │
│  │  │  news/radio/│  │  outcomes,  │  │  state,     │  │   tracking,  │  │ │
│  │  │  social)    │  │  ripples)   │  │  intensity) │  │   ABCD)      │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │ │
│  │                              ┌──────────────┐                          │ │
│  │                              │    Report    │                          │ │
│  │                              │    Agent     │                          │ │
│  │                              │ (PDF/DOCX/   │                          │ │
│  │                              │  PPTX/XLSX)  │                          │ │
│  │                              └──────────────┘                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         COLYSEUS GAME SERVER                            │ │
│  │   • Authoritative State (CrucibleState schema)                         │ │
│  │   • Room Management (CrucibleRoom per session)                         │ │
│  │   • Real-time Sync (delta compression to all consoles)                 │ │
│  │   • Procedural Scenario Engine                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         PRISMA + POSTGRESQL                             │ │
│  │   • Session persistence  • Decision logs  • Values tracking            │ │
│  │   • Participant data     • Report storage                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ WebSocket (wss://)
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
   ┌────┴────┐               ┌────────┴────────┐            ┌───────┴──────┐
   │ CRUCIBLE │               │      TEAM       │            │    REPORT    │
   │  MASTER  │               │    CONSOLES     │            │    PORTAL    │
   │ Console  │               │   (×5 parishes) │            │              │
   │          │               │                 │            │              │
   │ • Session│               │ • Shared iPad   │            │ • Post-sim   │
   │   control│               │ • Decision UI   │            │   downloads  │
   │ • All-team│              │ • Streaming feed│            │ • Individual │
   │   view   │               │ • Resource dash │            │   reports    │
   │ • Intensity│             │ • Parish status │            │ • Team       │
   │   levers │               │                 │            │   reports    │
   └──────────┘               └─────────────────┘            └──────────────┘
   Next.js 15                   Next.js 15                     Next.js 15
   shadcn/ui                    shadcn/ui                      shadcn/ui
```

---

## Project Structure

```
crucible-engine/
├── apps/
│   ├── server/                        # Colyseus + Agent orchestration
│   │   ├── src/
│   │   │   ├── index.ts               # Server entry point
│   │   │   ├── rooms/
│   │   │   │   └── CrucibleRoom.ts    # Main game room
│   │   │   ├── schema/
│   │   │   │   ├── CrucibleState.ts   # Colyseus state schema
│   │   │   │   ├── ParishState.ts
│   │   │   │   ├── WeatherState.ts
│   │   │   │   ├── DecisionState.ts
│   │   │   │   └── StreamingContent.ts
│   │   │   ├── agents/
│   │   │   │   ├── NarrativeAgent.ts
│   │   │   │   ├── ConsequenceAgent.ts
│   │   │   │   ├── TempestMonitor.ts
│   │   │   │   ├── ValuesObserver.ts
│   │   │   │   └── ReportAgent.ts
│   │   │   ├── engine/
│   │   │   │   ├── ProceduralScenario.ts
│   │   │   │   ├── IntensityController.ts
│   │   │   │   ├── HurricaneEngine.ts
│   │   │   │   └── ConsequenceCalculator.ts
│   │   │   └── config/
│   │   │       ├── concordia.ts       # Island geography/dependencies
│   │   │       └── scenarios.ts       # Scenario templates
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                           # Next.js 15 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx         # Root layout
│       │   │   ├── page.tsx           # Landing/join page
│       │   │   ├── session/
│       │   │   │   └── [code]/
│       │   │   │       ├── page.tsx   # Session router
│       │   │   │       ├── discovery/ # Pre-storm values discovery
│       │   │   │       ├── storm/     # Active simulation
│       │   │   │       └── debrief/   # Post-storm reflection
│       │   │   ├── cm/                # Crucible Master console
│       │   │   │   └── [code]/
│       │   │   │       ├── page.tsx
│       │   │   │       └── layout.tsx
│       │   │   └── reports/           # Report portal
│       │   │       └── [sessionId]/
│       │   ├── components/
│       │   │   ├── ui/                # shadcn/ui components
│       │   │   ├── console/           # Watchstander console components
│       │   │   │   ├── ConcordiaMap.tsx
│       │   │   │   ├── WeatherPanel.tsx
│       │   │   │   ├── NewsTicker.tsx
│       │   │   │   ├── SocialFeed.tsx
│       │   │   │   ├── RadioLog.tsx
│       │   │   │   ├── ResourceDashboard.tsx
│       │   │   │   ├── DecisionInterface.tsx
│       │   │   │   └── ParishStatusCard.tsx
│       │   │   ├── cm/                # Crucible Master components
│       │   │   │   ├── IntensityControls.tsx
│       │   │   │   ├── DirectivePanel.tsx
│       │   │   │   ├── TeamOverview.tsx
│       │   │   │   └── TempestAdvisor.tsx
│       │   │   ├── discovery/         # Values discovery components
│       │   │   │   ├── IndividualReflection.tsx
│       │   │   │   ├── TeamCharter.tsx
│       │   │   │   └── ValuesRanking.tsx
│       │   │   └── debrief/           # Reflection components
│       │   │       ├── ValuesGapViz.tsx
│       │   │       ├── DecisionReplay.tsx
│       │   │       └── MomentSelector.tsx
│       │   ├── hooks/
│       │   │   ├── useColyseus.ts     # Colyseus connection hook
│       │   │   ├── useGameState.ts    # State subscription
│       │   │   └── useStreamingFeed.ts
│       │   ├── lib/
│       │   │   ├── colyseus-client.ts
│       │   │   └── utils.ts
│       │   └── stores/
│       │       └── gameStore.ts       # Zustand store
│       ├── public/
│       │   └── assets/                # Map images, icons
│       ├── package.json
│       ├── tailwind.config.ts
│       └── next.config.ts
│
├── packages/
│   └── shared/                        # Shared types/utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── parish.ts
│       │   │   ├── decision.ts
│       │   │   ├── values.ts
│       │   │   └── session.ts
│       │   └── constants/
│       │       ├── concordia.ts
│       │       └── decisionTypes.ts
│       └── package.json
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── package.json                       # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── README.md
```

---

## The Island of Concordia (Fixed Geography)

### Parish Definitions

```typescript
// packages/shared/src/constants/concordia.ts

export const PARISHES = {
  HAVEN: {
    id: 'haven',
    name: 'Haven',
    position: { x: 85, y: 50 },  // % of map (east coast)
    population: 45000,
    description: 'Maritime hub and fishing community',
    keyAssets: [
      { type: 'port', name: 'Main Port', capacity: 500 },
      { type: 'fleet', name: 'Fishing Fleet', vessels: 120 },
      { type: 'station', name: 'Coast Guard Station', personnel: 45 }
    ],
    resources: {
      generators: 8,
      medicalSupplies: 'low',
      fuel: 'medium',
      food: 'high',      // fishing
      shelterCapacity: 12000
    },
    dependencies: ['gateway', 'heartland', 'summit'],  // fuel, medical, comms
    vulnerabilities: ['storm surge', 'flooding', 'port damage']
  },
  
  SUMMIT: {
    id: 'summit',
    name: 'Summit',
    position: { x: 50, y: 20 },  // mountains, north-central
    population: 38000,
    description: 'Agricultural highlands and water source',
    keyAssets: [
      { type: 'reservoir', name: 'Freshwater Reservoir', gallons: 50000000 },
      { type: 'tower', name: 'Emergency Radio Tower', range: 'island-wide' },
      { type: 'farms', name: 'Agricultural District', acres: 8500 }
    ],
    resources: {
      generators: 12,
      medicalSupplies: 'low',
      fuel: 'low',
      food: 'high',
      shelterCapacity: 15000
    },
    dependencies: ['haven', 'heartland'],  // supplies, power
    vulnerabilities: ['landslides', 'road damage', 'tower collapse']
  },
  
  GATEWAY: {
    id: 'gateway',
    name: 'Gateway',
    position: { x: 15, y: 50 },  // west coast
    population: 52000,
    description: 'International airport and tourism hub',
    keyAssets: [
      { type: 'airport', name: 'International Airport', runways: 2 },
      { type: 'hotels', name: 'Resort District', rooms: 3500 },
      { type: 'depot', name: 'Fuel Depot', gallons: 2000000 }
    ],
    resources: {
      generators: 20,
      medicalSupplies: 'medium',
      fuel: 'high',
      food: 'medium',
      shelterCapacity: 18000
    },
    dependencies: ['sterling', 'heartland'],  // financial, medical
    vulnerabilities: ['wind damage', 'runway flooding', 'fuel fire']
  },
  
  HEARTLAND: {
    id: 'heartland',
    name: 'Heartland',
    position: { x: 50, y: 55 },  // central
    population: 41000,
    description: 'Medical center and manufacturing',
    keyAssets: [
      { type: 'hospital', name: 'Regional Hospital', beds: 450 },
      { type: 'plant', name: 'Power Plant', megawatts: 200 },
      { type: 'factory', name: 'Manufacturing District', workers: 5000 }
    ],
    resources: {
      generators: 15,
      medicalSupplies: 'high',
      fuel: 'medium',
      food: 'medium',
      shelterCapacity: 14000
    },
    dependencies: ['gateway', 'summit'],  // fuel, water
    vulnerabilities: ['power failure', 'hospital overwhelm', 'infrastructure']
  },
  
  STERLING: {
    id: 'sterling',
    name: 'Sterling',
    position: { x: 50, y: 85 },  // north
    population: 35000,
    description: 'Government center and coordination hub',
    keyAssets: [
      { type: 'complex', name: 'Government Complex', capacity: 2000 },
      { type: 'bank', name: 'Central Bank', reserves: 'classified' },
      { type: 'broadcast', name: 'Emergency Broadcast Center', reach: '100%' }
    ],
    resources: {
      generators: 10,
      medicalSupplies: 'medium',
      fuel: 'medium',
      food: 'low',
      shelterCapacity: 10000
    },
    dependencies: ['haven', 'summit', 'gateway', 'heartland'],  // all
    vulnerabilities: ['communications failure', 'government disruption']
  }
} as const;

export type ParishId = keyof typeof PARISHES;

export const PARISH_DEPENDENCIES: Record<ParishId, {
  dependsOn: ParishId[];
  providesTo: ParishId[];
  criticalResources: string[];
}> = {
  HAVEN: {
    dependsOn: ['GATEWAY', 'HEARTLAND', 'SUMMIT'],
    providesTo: ['SUMMIT', 'STERLING'],
    criticalResources: ['seafood', 'port-access', 'coast-guard']
  },
  SUMMIT: {
    dependsOn: ['HAVEN', 'HEARTLAND'],
    providesTo: ['HEARTLAND', 'STERLING', 'GATEWAY', 'HAVEN'],
    criticalResources: ['freshwater', 'radio-communications', 'agriculture']
  },
  GATEWAY: {
    dependsOn: ['STERLING', 'HEARTLAND'],
    providesTo: ['HEARTLAND', 'HAVEN', 'SUMMIT', 'STERLING'],
    criticalResources: ['fuel', 'air-evacuation', 'external-supplies']
  },
  HEARTLAND: {
    dependsOn: ['GATEWAY', 'SUMMIT'],
    providesTo: ['HAVEN', 'GATEWAY', 'STERLING', 'SUMMIT'],
    criticalResources: ['medical-care', 'power', 'manufacturing']
  },
  STERLING: {
    dependsOn: ['HAVEN', 'SUMMIT', 'GATEWAY', 'HEARTLAND'],
    providesTo: ['HAVEN', 'SUMMIT', 'GATEWAY', 'HEARTLAND'],
    criticalResources: ['coordination', 'emergency-broadcast', 'financial']
  }
};
```

---

## Decision Types Catalog

Teams can make the following types of decisions during the simulation:

```typescript
// packages/shared/src/constants/decisionTypes.ts

export const DECISION_CATEGORIES = {
  RESOURCE_ALLOCATION: {
    id: 'resource-allocation',
    name: 'Resource Allocation',
    description: 'How to distribute limited resources within your parish',
    decisions: [
      {
        id: 'generator-deployment',
        name: 'Generator Deployment',
        prompt: 'Where should generators be deployed?',
        options: ['hospital', 'shelters', 'communications', 'water-pumps', 'hoard']
      },
      {
        id: 'medical-triage',
        name: 'Medical Triage Priority',
        prompt: 'Who receives medical attention first?',
        options: ['most-critical', 'most-likely-to-survive', 'first-come', 'essential-workers']
      },
      {
        id: 'shelter-assignment',
        name: 'Shelter Assignment',
        prompt: 'How should shelter space be allocated?',
        options: ['vulnerable-first', 'lottery', 'residence-proximity', 'employment-essential']
      },
      {
        id: 'food-distribution',
        name: 'Food Distribution',
        prompt: 'How should food supplies be distributed?',
        options: ['equal-per-person', 'need-based', 'rationed-over-time', 'priority-groups']
      }
    ]
  },
  
  INTER_PARISH: {
    id: 'inter-parish',
    name: 'Inter-Parish Coordination',
    description: 'Decisions involving other parishes',
    decisions: [
      {
        id: 'resource-sharing',
        name: 'Resource Sharing Request',
        prompt: 'Request or offer resources to another parish',
        requiresTarget: true,
        options: ['request-generators', 'offer-generators', 'request-medical', 'offer-medical', 'request-fuel', 'offer-fuel']
      },
      {
        id: 'evacuation-acceptance',
        name: 'Evacuation Acceptance',
        prompt: 'Accept evacuees from another parish?',
        requiresTarget: true,
        options: ['accept-all', 'accept-limited', 'refuse-capacity', 'refuse-resources']
      },
      {
        id: 'coordination-request',
        name: 'Coordination Request',
        prompt: 'Request joint operation with another parish',
        requiresTarget: true,
        options: ['joint-rescue', 'shared-shelter', 'supply-convoy', 'communication-relay']
      }
    ]
  },
  
  EVACUATION: {
    id: 'evacuation',
    name: 'Evacuation Orders',
    description: 'Population movement decisions',
    decisions: [
      {
        id: 'evacuation-order',
        name: 'Issue Evacuation Order',
        prompt: 'Should you order evacuation?',
        options: ['mandatory-full', 'mandatory-coastal', 'voluntary-recommended', 'shelter-in-place']
      },
      {
        id: 'evacuation-timing',
        name: 'Evacuation Timing',
        prompt: 'When should evacuation begin?',
        options: ['immediate', 'staged-over-hours', 'wait-for-confirmation', 'too-late-shelter']
      },
      {
        id: 'evacuation-route',
        name: 'Evacuation Route',
        prompt: 'Which routes should evacuees use?',
        options: ['primary-highway', 'secondary-roads', 'split-traffic', 'contraflow']
      }
    ]
  },
  
  INFRASTRUCTURE: {
    id: 'infrastructure',
    name: 'Infrastructure Protection',
    description: 'Protecting critical assets',
    decisions: [
      {
        id: 'asset-protection',
        name: 'Asset Protection Priority',
        prompt: 'Which infrastructure should be protected first?',
        options: ['hospital', 'power-plant', 'communications', 'water-system', 'roads']
      },
      {
        id: 'preemptive-shutdown',
        name: 'Preemptive Shutdown',
        prompt: 'Should systems be shut down preemptively?',
        options: ['power-grid-down', 'port-closure', 'airport-closure', 'maintain-operations']
      }
    ]
  },
  
  COMMUNICATION: {
    id: 'communication',
    name: 'Public Communication',
    description: 'Information management',
    decisions: [
      {
        id: 'information-release',
        name: 'Information Release',
        prompt: 'What information should be shared publicly?',
        options: ['full-transparency', 'essential-only', 'reassuring-message', 'silence-for-now']
      },
      {
        id: 'rumor-response',
        name: 'Rumor Response',
        prompt: 'How should you respond to spreading rumors?',
        options: ['official-denial', 'acknowledge-uncertainty', 'ignore', 'investigate-first']
      }
    ]
  },
  
  SPECIAL: {
    id: 'special',
    name: 'Special Situations',
    description: 'Unique ethical dilemmas',
    decisions: [
      {
        id: 'rescue-priority',
        name: 'Rescue Priority',
        prompt: 'Limited rescue capacity—who gets rescued?',
        options: ['closest-first', 'most-endangered', 'largest-group', 'known-individuals']
      },
      {
        id: 'resource-seizure',
        name: 'Resource Seizure',
        prompt: 'Should private resources be seized for public good?',
        options: ['seize-with-compensation', 'seize-emergency-powers', 'request-voluntary', 'respect-property']
      },
      {
        id: 'lawbreaker-response',
        name: 'Lawbreaker Response',
        prompt: 'How should you respond to looting/curfew violations?',
        options: ['strict-enforcement', 'warnings-only', 'focus-on-safety', 'distinguish-need-vs-greed']
      }
    ]
  }
} as const;

export type DecisionCategoryId = keyof typeof DECISION_CATEGORIES;
```

---

## Colyseus State Schema

```typescript
// apps/server/src/schema/CrucibleState.ts

import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

// Sub-schemas
export class Position extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
}

export class HurricaneState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = 'Midas';
  @type('number') category: number = 1;          // 1-5
  @type('number') latitude: number = 0;
  @type('number') longitude: number = 0;
  @type('number') windSpeed: number = 0;         // mph
  @type('string') trajectory: string = 'unknown'; // 'direct', 'glancing', 'miss-north', 'miss-south', 'stall'
  @type('number') certaintyPercent: number = 0;  // How confident we are
  @type('number') hoursToImpact: number = -1;    // -1 = unknown/won't impact
  @type('boolean') hasLandfall: boolean = false;
  @type('string') currentAdvisory: string = '';
}

export class WeatherState extends Schema {
  @type(HurricaneState) hurricane = new HurricaneState();
  @type('number') windSpeed: number = 0;         // Current local winds
  @type('number') rainfall: number = 0;          // inches/hour
  @type('number') visibility: number = 100;      // percentage
  @type('string') conditions: string = 'clear';  // 'clear', 'cloudy', 'rain', 'storm', 'hurricane'
  @type('number') stormSurge: number = 0;        // feet
}

export class ResourceState extends Schema {
  @type('number') generators: number = 0;
  @type('number') generatorsDeployed: number = 0;
  @type('string') medicalSupplies: string = 'medium';
  @type('number') fuel: number = 100;            // percentage
  @type('number') food: number = 100;            // percentage
  @type('number') water: number = 100;           // percentage
  @type('number') shelterUsed: number = 0;
  @type('number') shelterCapacity: number = 0;
}

export class ParishStatus extends Schema {
  @type('number') power: number = 100;           // percentage operational
  @type('number') communications: number = 100;
  @type('number') roads: number = 100;
  @type('number') hospital: number = 100;
  @type('number') port: number = 100;            // Haven only
  @type('number') airport: number = 100;         // Gateway only
  @type('number') waterSystem: number = 100;
  @type('boolean') evacuationOrdered: boolean = false;
  @type('string') evacuationStatus: string = 'none'; // 'none', 'voluntary', 'mandatory', 'complete'
  @type('number') populationRemaining: number = 0;
  @type('number') populationEvacuated: number = 0;
  @type('number') casualties: number = 0;
  @type('number') injured: number = 0;
}

export class ParishState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type(ResourceState) resources = new ResourceState();
  @type(ParishStatus) status = new ParishStatus();
  @type('number') morale: number = 75;           // 0-100
  @type('string') currentCrisis: string = '';    // Active crisis description
  @type(['string']) pendingDecisions = new ArraySchema<string>();
}

export class TeamState extends Schema {
  @type('string') parishId: string = '';
  @type('string') teamName: string = '';
  @type(['string']) members = new ArraySchema<string>();
  @type(['string']) statedValues = new ArraySchema<string>();  // From discovery phase
  @type('string') decisionProcess: string = 'consensus';       // 'consensus', 'majority', 'leader'
  @type('string') commitmentStatement: string = '';
  @type('boolean') ready: boolean = false;
}

export class Decision extends Schema {
  @type('string') id: string = '';
  @type('string') teamId: string = '';
  @type('string') parishId: string = '';
  @type('string') categoryId: string = '';
  @type('string') decisionTypeId: string = '';
  @type('string') choice: string = '';
  @type('string') rationale: string = '';
  @type(['string']) advocatedBy = new ArraySchema<string>();    // Participant IDs
  @type('number') simulationTime: number = 0;
  @type('number') realTime: number = 0;
  @type('string') targetParishId: string = '';                  // For inter-parish decisions
  @type('boolean') processed: boolean = false;
}

export class StreamingContent extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = '';              // 'news', 'social', 'radio', 'weather', 'official'
  @type('string') source: string = '';            // '@concordianews', 'citizen', 'NOAA', etc.
  @type('string') content: string = '';
  @type('number') urgency: number = 0;            // 1-5
  @type('string') relatedParish: string = '';
  @type('number') timestamp: number = 0;
  @type('boolean') breaking: boolean = false;
}

export class SessionPhase extends Schema {
  @type('string') current: string = 'lobby';     // 'lobby', 'discovery', 'briefing', 'storm', 'recovery', 'debrief'
  @type('number') phaseStartTime: number = 0;
  @type('boolean') paused: boolean = false;
}

export class IntensityState extends Schema {
  @type('number') global: number = 5;             // 1-10
  @type({ map: 'number' }) byTeam = new MapSchema<number>();
  @type('string') tempestAdvisory: string = '';   // Current AI recommendation
  @type('number') lastAdjustment: number = 0;
}

// Main state
export class CrucibleState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') sessionCode: string = '';       // 6-char join code
  @type(SessionPhase) phase = new SessionPhase();
  @type(WeatherState) weather = new WeatherState();
  @type(IntensityState) intensity = new IntensityState();
  @type({ map: ParishState }) parishes = new MapSchema<ParishState>();
  @type({ map: TeamState }) teams = new MapSchema<TeamState>();
  @type([Decision]) decisions = new ArraySchema<Decision>();
  @type([StreamingContent]) feed = new ArraySchema<StreamingContent>();
  @type('number') simulationTime: number = 0;     // Minutes since storm watch
  @type('number') lastUpdate: number = 0;
  @type('string') scenarioSeed: string = '';
}
```

---

## Agent System Prompts

### Narrative Agent

```typescript
// apps/server/src/agents/NarrativeAgent.ts

export const NARRATIVE_AGENT_SYSTEM = `You are the Narrative Engine for The Values Crucible, a crisis simulation.

Your role is to generate immersive, streaming content that creates the information environment of a hurricane approaching the fictional island of Concordia.

CONTENT TYPES YOU GENERATE:
1. NEWS REPORTS - Professional broadcast journalism style
   - Breaking news alerts
   - Weather updates
   - Official statements
   - Human interest stories
   
2. SOCIAL MEDIA POSTS - Citizen voices (Twitter-style)
   - Worried residents
   - Angry citizens
   - Grateful acknowledgments
   - Rumors and misinformation
   - Photos/video descriptions
   
3. RADIO TRAFFIC - Emergency communications
   - Coast Guard traffic
   - Emergency services
   - Government coordination
   - Amateur radio operators
   
4. WEATHER BULLETINS - Technical updates
   - NHC-style advisories
   - Radar descriptions
   - Forecast updates

RESPONSE TO GAME STATE:
- Reference actual team decisions and their visible effects
- React to resource allocations
- Spread information (and misinformation) about parish conditions
- Create pressure through stakeholder voices
- The intensity setting (1-10) controls urgency, frequency, and alarm level

TONE CALIBRATION BY INTENSITY:
1-3: Routine monitoring, mild concern
4-5: Growing anxiety, conflicting information
6-7: Urgent, alarming, competing priorities
8-9: Crisis mode, emotional, desperate
10: Catastrophic, overwhelming

OUTPUT FORMAT:
Return JSON with type, source, content, urgency (1-5), relatedParish (optional), breaking (boolean).

CRITICAL RULES:
- NEVER mention this is a simulation
- Use realistic but fictional names and details
- Content should feel authentic to the genre
- Reference Concordia geography and parish names
- React to actual game state events
- Build narrative tension over time`;
```

### Consequence Agent

```typescript
// apps/server/src/agents/ConsequenceAgent.ts

export const CONSEQUENCE_AGENT_SYSTEM = `You are the Consequence Engine for The Values Crucible crisis simulation.

When a team makes a decision, you determine realistic consequences across three timeframes:
1. IMMEDIATE EFFECTS (seconds to minutes)
2. RIPPLE EFFECTS (hours, affecting other parishes)
3. DELAYED EFFECTS (revealed later in simulation)

PARISH INTERDEPENDENCIES (critical):
- Haven (East Coast): Depends on Gateway for fuel, Heartland for medical, Summit for communications
- Summit (Mountains): Depends on Haven for supplies, Heartland for power
- Gateway (West Coast): Depends on Sterling for financial coordination, Heartland for medical
- Heartland (Central): Depends on Gateway for fuel, Summit for water
- Sterling (North): Depends on all parishes (coordination hub)

CONSEQUENCE PRINCIPLES:
- Every decision has trade-offs—there are no purely good choices
- Hoarding creates resentment and downstream failures for dependent parishes
- Sharing creates short-term vulnerability but builds cooperation
- Speed often sacrifices thoroughness and creates errors
- Ignoring warnings compounds consequences exponentially
- Hesitation costs lives during crisis
- Over-reaction depletes resources for actual emergencies

RESOURCE DYNAMICS:
- Generators: Each supports specific infrastructure; moving them takes time
- Medical supplies: Triage decisions affect who lives and dies
- Fuel: Critical for generators, vehicles, evacuation
- Food/Water: Population stress rises rapidly with shortages
- Shelter: Overcrowding causes health issues, conflict

MORALE IMPACTS:
- Visible leadership improves morale
- Perceived unfairness destroys morale
- Good communication maintains morale
- Resource deprivation cascades into panic

OUTPUT FORMAT (JSON):
{
  "immediate": [{
    "parishId": "affected parish",
    "category": "resources|population|infrastructure|morale|political",
    "description": "what happens",
    "magnitude": -5 to +5,
    "visible": boolean (is this visible to teams?)
  }],
  "ripple": [{
    "parishId": "affected parish (often different from decision maker)",
    "category": "...",
    "description": "...",
    "magnitude": -5 to +5,
    "delayMinutes": number,
    "trigger": "condition that reveals this"
  }],
  "delayed": [{
    "description": "...",
    "delayMinutes": number,
    "condition": "what must happen for this to trigger"
  }],
  "narrativeHooks": ["suggested news/social content to reflect this decision"]
}`;
```

### Tempest Monitor

```typescript
// apps/server/src/agents/TempestMonitor.ts

export const TEMPEST_MONITOR_SYSTEM = `You are the Tempest Monitor—the Crucible Master's advisor on team psychological state.

Your role is to observe team behavior patterns and advise when to adjust simulation intensity to keep teams in the LEARNING ZONE.

THE THREE ZONES:
- COMFORT ZONE: Teams are relaxed, decisions feel easy, no real tension
  Signs: Quick unanimous decisions, low engagement, casual conversation
  Risk: No learning happens here
  
- LEARNING ZONE: Teams are challenged but functional, wrestling with trade-offs
  Signs: Active debate, difficult compromises, emotional engagement, some disagreement
  This is where values become visible
  
- PANIC ZONE: Teams are overwhelmed, decision-making has broken down
  Signs: Paralysis, giving up, conflict between members, emotional flooding
  Risk: Trauma, no learning

BEHAVIORAL SIGNALS TO MONITOR:
- Decision velocity (too fast = comfort, too slow = panic)
- Disagreement patterns (healthy debate vs. destructive conflict)
- Resource hoarding vs. sharing tendencies
- Communication patterns with other teams
- Values-aligned vs. expedient decisions
- Participant engagement levels

INTENSITY RECOMMENDATIONS:
Based on your analysis, recommend:
- INCREASE: Team is coasting, needs more pressure
- MAINTAIN: Team is productively struggling
- DECREASE: Team is approaching panic, needs relief
- PAUSE: Team needs a break to regroup

SPECIFIC LEVERS (suggest to Crucible Master):
- Time compression (speed up/slow down the hurricane)
- Resource scarcity (deplete supplies or deliver new ones)
- Cascading failures (problems compound or resolve)
- Stakeholder pressure (governor calls, media attention)
- Information fog (conflicting reports or clear intel)
- Moral complexity (ethical dilemmas or cleaner options)
- Inter-parish conflict (competing needs escalate or align)

OUTPUT FORMAT (JSON):
{
  "teamId": "parish",
  "currentZone": "comfort|learning|panic",
  "confidence": 0-100,
  "signals": ["observed behaviors"],
  "recommendation": "increase|maintain|decrease|pause",
  "suggestedLever": "specific intervention",
  "rationale": "why this intervention"
}`;
```

### Values Observer

```typescript
// apps/server/src/agents/ValuesObserver.ts

export const VALUES_OBSERVER_SYSTEM = `You are the Values Observer for The Values Crucible—a SILENT tracker of values enactment.

CRITICAL: You NEVER reveal your observations during the simulation. You collect data for the debrief phase.

YOUR ROLE:
Track the alignment between teams' STATED VALUES (from the discovery phase) and their ENACTED VALUES (shown through decisions under pressure).

ABCD FRAMEWORK FOR CODING DECISIONS:
For each team decision, analyze:
- Affect: What emotions appear to be driving the decision? (fear, compassion, anger, hope)
- Behavior: What concrete actions are they taking?
- Cognition: What reasoning/beliefs are they expressing?
- Desire: What outcome are they trying to achieve?

VALUES INTENSITY SCALE (-3 to +3):
-3: Completely violates stated value
-2: Significantly conflicts with stated value
-1: Minor tension with stated value
 0: Neutral/unrelated to stated value
+1: Somewhat aligned with stated value
+2: Strongly aligned with stated value
+3: Exemplary demonstration of stated value

NOTABLE MOMENTS TO FLAG:
- Decisions where stated and enacted values diverge significantly
- Moments of internal team conflict about values
- Times when teams explicitly invoke their values
- Decisions made under extreme time pressure
- Choices between competing values
- Moments of values clarity (team acts decisively on values)
- Instances of values compromise

GAP ANALYSIS:
Track patterns across the simulation:
- Which values hold under pressure?
- Which values erode first?
- What conditions trigger values drift?
- When do teams return to their values?

OUTPUT FORMAT (JSON):
{
  "decisionId": "...",
  "statedValuesAnalysis": [{
    "value": "the team's stated value",
    "alignment": -3 to +3,
    "evidence": "specific behaviors/statements"
  }],
  "abcd": {
    "affect": "emotional state observed",
    "behavior": "actions taken",
    "cognition": "reasoning expressed",
    "desire": "outcome sought"
  },
  "notableMoment": boolean,
  "notableReason": "why this moment matters for debrief (if notable)",
  "participantDynamics": "who advocated for what"
}

Remember: Your job is to OBSERVE and RECORD, not to judge. The gap between stated and enacted values is DATA, not failure.`;
```

### Report Agent

```typescript
// apps/server/src/agents/ReportAgent.ts

export const REPORT_AGENT_SYSTEM = `You are the Report Agent for The Values Crucible. You generate post-simulation reports using Claude Agent Skills (PDF, DOCX, PPTX, XLSX).

REPORT TYPES:

1. PERSONAL VALUES REPORT (PDF) - For each individual participant
   - Their stated values from discovery phase
   - Moments when their values were tested
   - Alignment/drift patterns they showed
   - Specific decisions they advocated for
   - Private reflection prompts
   - NOT shared with team or organization

2. TEAM VALUES REALITY REPORT (PDF) - For each team
   - Team's stated values and charter
   - Stated vs. Enacted values visualization
   - Key decision analysis with values coding
   - Moments of alignment and drift
   - Decision process adherence
   - Inter-parish relationship patterns
   - Discussion prompts for team debrief

3. ORGANIZATIONAL INSIGHTS (PPTX) - For leadership/HR
   - Cross-team patterns
   - Company values gap analysis (if company values were provided)
   - Systemic pressures identified
   - Recommendations for values reinforcement
   - Anonymous aggregated data
   - Presentation-ready format

4. CRUCIBLE MASTER SESSION REPORT (DOCX) - For the facilitator
   - Complete session timeline
   - All decisions with timestamps
   - Intensity curve over time
   - Interventions made
   - Notable moments flagged by Values Observer
   - Facilitator notes integration
   - Recommendations for future sessions

5. RAW DATA EXPORT (XLSX) - For researchers
   - All decisions with full metadata
   - Timestamps (simulation and real time)
   - Values Observer scores
   - Team states at each decision point
   - Streaming content generated
   - Complete audit trail

REPORT PRINCIPLES:
- Frame gaps as INSIGHT, not failure
- Use specific examples from the simulation
- Maintain appropriate confidentiality levels
- Make reports actionable, not just descriptive
- Visual representations of data where possible
- Clear, professional formatting`;
```

---

## Crucible Master Controls

### Intensity Levers

```typescript
// apps/server/src/engine/IntensityController.ts

export const INTENSITY_LEVERS = {
  TIME_COMPRESSION: {
    id: 'time-compression',
    name: 'Time Compression',
    description: 'Speed of hurricane approach',
    increasePressure: 'Hurricane accelerates toward Concordia',
    decreasePressure: 'Hurricane slows, more time to prepare',
    cmPrompt: 'Adjust how quickly the storm approaches'
  },
  
  RESOURCE_SCARCITY: {
    id: 'resource-scarcity',
    name: 'Resource Scarcity',
    description: 'Availability of critical supplies',
    increasePressure: 'Supplies depleted faster than expected',
    decreasePressure: 'New supply shipment arrives',
    cmPrompt: 'Control resource availability across parishes'
  },
  
  CASCADING_FAILURES: {
    id: 'cascading-failures',
    name: 'Cascading Failures',
    description: 'How problems compound',
    increasePressure: 'One failure triggers another',
    decreasePressure: 'Systems stabilize unexpectedly',
    cmPrompt: 'Trigger or resolve infrastructure cascades'
  },
  
  STAKEHOLDER_PRESSURE: {
    id: 'stakeholder-pressure',
    name: 'Stakeholder Pressure',
    description: 'External demands on teams',
    increasePressure: 'Governor calls, media swarms, public outcry',
    decreasePressure: 'Attention shifts elsewhere, breathing room',
    cmPrompt: 'Add or remove external pressure sources'
  },
  
  INFORMATION_FOG: {
    id: 'information-fog',
    name: 'Information Fog',
    description: 'Clarity of situation',
    increasePressure: 'Conflicting reports, communication failures',
    decreasePressure: 'Clear intelligence arrives',
    cmPrompt: 'Control information reliability'
  },
  
  MORAL_COMPLEXITY: {
    id: 'moral-complexity',
    name: 'Moral Complexity',
    description: 'Ethical difficulty of choices',
    increasePressure: 'Introduce ethical dilemmas',
    decreasePressure: 'Provide cleaner options',
    cmPrompt: 'Adjust ethical complexity of situations'
  },
  
  INTER_PARISH_CONFLICT: {
    id: 'inter-parish-conflict',
    name: 'Inter-Parish Conflict',
    description: 'Competition between parishes',
    increasePressure: 'Competing needs escalate, blame emerges',
    decreasePressure: 'Common cause discovered, cooperation emerges',
    cmPrompt: 'Increase or decrease inter-team tension'
  }
} as const;

export const CM_DIRECTIVE_TYPES = {
  OPERATIONAL_ORDER: {
    id: 'operational-order',
    name: 'Operational Order',
    examples: [
      'All parishes: mandatory evacuation NOW',
      'Haven, redirect generators to Gateway',
      'Summit, open emergency water reserves'
    ],
    isBinding: true
  },
  
  INFORMATION_INJECTION: {
    id: 'information-injection',
    name: 'Information Injection',
    examples: [
      'New intel: storm track shifting east',
      'Confirmed: levee breach in Haven',
      'Coast Guard rescue assets now available'
    ],
    isBinding: false
  },
  
  TIME_CALL: {
    id: 'time-call',
    name: 'Time Call',
    examples: [
      'You have 3 minutes to decide',
      'Governor expects response in 60 seconds',
      'Helicopter window closes in 2 minutes'
    ],
    isBinding: true
  },
  
  STAND_DOWN: {
    id: 'stand-down',
    name: 'Stand Down',
    examples: [
      '5-minute operational pause',
      'All teams: check in with each other',
      'Take a breath—storm is holding position'
    ],
    isBinding: true
  },
  
  VALUES_CHECK: {
    id: 'values-check',
    name: 'Values Check',
    examples: [
      'Before you decide: which of your values guides this?',
      'Name the value driving your current discussion',
      'What would your charter say about this choice?'
    ],
    isBinding: false
  }
} as const;
```

---

## Frontend Hook: useColyseus

```typescript
// apps/web/src/hooks/useColyseus.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Colyseus from 'colyseus.js';
import type { CrucibleState } from '@crucible/shared';

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567';

interface UseColyseusOptions {
  sessionCode: string;
  role: 'team' | 'cm';
  teamId?: string;
}

interface UseColyseusReturn {
  room: Colyseus.Room<CrucibleState> | null;
  state: CrucibleState | null;
  connected: boolean;
  error: Error | null;
  sendDecision: (decision: DecisionPayload) => void;
  sendDirective: (directive: DirectivePayload) => void;
  setIntensity: (level: number) => void;
  reconnect: () => Promise<void>;
}

export function useColyseus({ sessionCode, role, teamId }: UseColyseusOptions): UseColyseusReturn {
  const [room, setRoom] = useState<Colyseus.Room<CrucibleState> | null>(null);
  const [state, setState] = useState<CrucibleState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const clientRef = useRef<Colyseus.Client | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize client
  useEffect(() => {
    clientRef.current = new Colyseus.Client(COLYSEUS_URL);
    
    return () => {
      room?.leave();
    };
  }, []);

  // Connect to room
  const connect = useCallback(async () => {
    if (!clientRef.current || !sessionCode) return;
    
    try {
      setError(null);
      
      const joinedRoom = await clientRef.current.joinOrCreate<CrucibleState>('crucible', {
        sessionCode,
        role,
        teamId
      });
      
      setRoom(joinedRoom);
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // State change listener
      joinedRoom.onStateChange((newState) => {
        setState({ ...newState });
      });
      
      // Disconnection handler
      joinedRoom.onLeave((code) => {
        setConnected(false);
        
        // Attempt reconnection for unexpected disconnects
        if (code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => connect(), 1000 * reconnectAttempts.current);
        }
      });
      
      // Error handler
      joinedRoom.onError((code, message) => {
        setError(new Error(`Room error ${code}: ${message}`));
      });
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
      setConnected(false);
    }
  }, [sessionCode, role, teamId]);

  // Initial connection
  useEffect(() => {
    connect();
  }, [connect]);

  // Send team decision
  const sendDecision = useCallback((decision: DecisionPayload) => {
    if (!room) return;
    room.send('decision', decision);
  }, [room]);

  // CM: Send directive
  const sendDirective = useCallback((directive: DirectivePayload) => {
    if (!room || role !== 'cm') return;
    room.send('cm:directive', directive);
  }, [room, role]);

  // CM: Set intensity
  const setIntensity = useCallback((level: number) => {
    if (!room || role !== 'cm') return;
    room.send('cm:setIntensity', { level });
  }, [room, role]);

  // Manual reconnect
  const reconnect = useCallback(async () => {
    await room?.leave();
    reconnectAttempts.current = 0;
    await connect();
  }, [room, connect]);

  return {
    room,
    state,
    connected,
    error,
    sendDecision,
    sendDirective,
    setIntensity,
    reconnect
  };
}
```

---

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Session {
  id              String   @id @default(uuid())
  code            String   @unique @db.VarChar(6)
  status          String   @default("lobby") // lobby, active, completed
  scenarioSeed    String?
  companyName     String?
  companyValues   String[] // Company values being tested (optional)
  crucibleMasterId String
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  teams           Team[]
  decisions       Decision[]
  streamingContent StreamingContentRecord[]
  reports         Report[]
  
  @@index([code])
  @@index([status])
}

model Team {
  id               String   @id @default(uuid())
  sessionId        String
  parishId         String
  name             String
  statedValues     String[] // From discovery phase
  valuesRankOrder  Int[]    // Indices into statedValues
  decisionProcess  String   @default("consensus")
  commitmentStatement String?
  createdAt        DateTime @default(now())
  
  session          Session  @relation(fields: [sessionId], references: [id])
  participants     Participant[]
  decisions        Decision[]
  
  @@unique([sessionId, parishId])
}

model Participant {
  id               String   @id @default(uuid())
  teamId           String
  displayName      String
  email            String?
  personalValues   String[] // Individual's top 5
  valuesRankOrder  Int[]
  role             String   @default("member") // member, leader
  joinedAt         DateTime @default(now())
  
  team             Team     @relation(fields: [teamId], references: [id])
  advocatedDecisions DecisionAdvocate[]
  reflections      Reflection[]
}

model Decision {
  id                String   @id @default(uuid())
  sessionId         String
  teamId            String
  categoryId        String
  decisionTypeId    String
  choice            String
  rationale         String?
  targetParishId    String?  // For inter-parish decisions
  simulationTime    Int      // Minutes since storm watch
  realTimestamp     DateTime @default(now())
  
  // Values Observer analysis (populated asynchronously)
  valuesAnalysis    Json?    // ABCD coding, alignment scores
  notableMoment     Boolean  @default(false)
  notableReason     String?
  
  // Consequence tracking
  consequencesApplied Json?
  
  session           Session  @relation(fields: [sessionId], references: [id])
  team              Team     @relation(fields: [teamId], references: [id])
  advocates         DecisionAdvocate[]
  
  @@index([sessionId, simulationTime])
  @@index([teamId])
}

model DecisionAdvocate {
  id            String   @id @default(uuid())
  decisionId    String
  participantId String
  position      String   // 'for', 'against', 'neutral'
  
  decision      Decision    @relation(fields: [decisionId], references: [id])
  participant   Participant @relation(fields: [participantId], references: [id])
  
  @@unique([decisionId, participantId])
}

model StreamingContentRecord {
  id            String   @id @default(uuid())
  sessionId     String
  type          String   // 'news', 'social', 'radio', 'weather', 'official'
  source        String
  content       String
  urgency       Int
  relatedParish String?
  breaking      Boolean  @default(false)
  simulationTime Int
  createdAt     DateTime @default(now())
  
  session       Session  @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId, simulationTime])
}

model Reflection {
  id            String   @id @default(uuid())
  participantId String
  phase         String   // 'individual', 'team', 'company'
  momentId      String?  // Reference to notable moment
  content       String
  isPrivate     Boolean  @default(true)
  createdAt     DateTime @default(now())
  
  participant   Participant @relation(fields: [participantId], references: [id])
}

model Report {
  id            String   @id @default(uuid())
  sessionId     String
  type          String   // 'personal', 'team', 'organizational', 'cm', 'data'
  recipientId   String?  // Participant or Team ID
  filePath      String
  format        String   // 'pdf', 'docx', 'pptx', 'xlsx'
  generatedAt   DateTime @default(now())
  
  session       Session  @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId, type])
}
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crucible"

# Claude API
ANTHROPIC_API_KEY="sk-ant-..."

# Colyseus Server
COLYSEUS_PORT=2567

# Next.js
NEXT_PUBLIC_COLYSEUS_URL="ws://localhost:2567"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Session
SESSION_SECRET="generate-a-strong-secret"

# Railway (production)
RAILWAY_STATIC_URL=""
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project scaffolding (pnpm workspace, TypeScript config, Turbo)
- [ ] Database schema and Prisma setup
- [ ] Basic Colyseus room with CrucibleState schema
- [ ] Next.js app with routing structure
- [ ] useColyseus hook implementation
- [ ] Basic join flow (session codes)

### Phase 2: Pre-Storm Experience (Week 3-4)
- [ ] Individual values discovery UI
- [ ] Team charter creation UI
- [ ] Values ranking interface
- [ ] Company values module (optional)
- [ ] Data persistence for discovery phase

### Phase 3: Simulation Core (Week 5-7)
- [ ] Procedural scenario engine (hurricane trajectories)
- [ ] Narrative Agent integration (streaming content)
- [ ] Consequence Agent integration
- [ ] Team Watchstander console UI
- [ ] Real-time state sync testing
- [ ] Decision interface implementation

### Phase 4: Crucible Master (Week 8-9)
- [ ] Tempest Monitor agent
- [ ] Crucible Master console UI
- [ ] Intensity controls
- [ ] Directive system
- [ ] All-team overview

### Phase 5: Values Tracking (Week 10)
- [ ] Values Observer agent
- [ ] Decision-values correlation
- [ ] Notable moment flagging
- [ ] Debrief data preparation

### Phase 6: Reflection & Reports (Week 11-12)
- [ ] Individual reflection UI
- [ ] Team reflection UI
- [ ] Report Agent integration
- [ ] PDF/DOCX/PPTX/XLSX generation
- [ ] Report portal

### Phase 7: Polish & Testing (Week 13+)
- [ ] End-to-end testing with real teams
- [ ] UI polish and command center aesthetic
- [ ] Performance optimization
- [ ] Mobile/tablet responsive testing
- [ ] User acceptance testing

---

## Key Design Principles (Reminder)

1. **The hurricane is the vehicle, not the lesson.** Values conflicts are the lesson.

2. **Uncertainty creates pressure.** Don't reveal the hurricane's path too early.

3. **Every decision has trade-offs.** No obviously right answers.

4. **The gap is data, not failure.** Frame values drift as insight, not judgment.

5. **The Crucible Master is the safety valve.** They control intensity to keep teams in the learning zone.

6. **Procedural generation enables replayability.** Same island, infinite scenarios.

7. **Privacy for reflection.** Individual values and reflections are private unless shared.

8. **Professional aesthetic.** This is a command center, not a video game.

---

## Visual Design References

### Command Center Aesthetic
- Think CNN war room during hurricane coverage
- Incident command headquarters
- Multiple information feeds that feel alive
- Professional, not gamey
- Clean typography, clear status indicators
- Dark mode with high contrast status colors

### Key UI Elements
- Central map showing parish status (choropleth coloring)
- Weather/satellite/radar panel
- Scrolling news ticker / breaking news alerts
- Social media feed (Twitter-style citizen posts)
- Radio traffic transcripts
- Resource dashboards (simple meters, clear numbers)
- Decision interface (clean buttons, clear consequences)

---

## Connection to Research

This platform connects to Jerry Wolf's doctoral research at Penn GSE:
- Behavioral Event Interview methodology (400+ Coast Guard interviews)
- ABCD framework (Affect, Behavior, Cognition, Desire)
- Values intensity scaling (-3 to +3)
- Values Observer agent will eventually integrate with ValuesPrism research platform

For MVP: Standalone system with future integration planned.

---

*CrucibleEngine Specification v2.0 — November 28, 2025*
*Ready for Claude Code development*
