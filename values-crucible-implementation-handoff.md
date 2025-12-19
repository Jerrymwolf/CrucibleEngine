V

## Project Overview

**Values Crucible** is a multiplayer crisis simulation that tests leadership values under pressure. Teams manage parishes on Concordia Island during Hurricane Midas while their stated values are tested against their actual decisions.

**Core learning design:** Teams define their values and write commitment statements BEFORE the crisis. During the crisis, AI generates dilemmas tailored to their specific commitments. After the crisis, the gap between stated and enacted values becomes visible and discussable.

---

## Document Inventory

### 📁 CANONICAL DOCUMENTS (Use These)

These are the current, authoritative specifications:

| Document | Purpose | Key Content |
|----------|---------|-------------|
| `values-crucible-experience-summary.md` | **Master overview** | Complete experience arc, timing, design principles |
| `values-crucible-pre-crisis-discovery.md` | **Pre-crisis facilitation** | Values Quick Sort, Team Alignment, Commitment Statement activities |
| `values-crucible-during-post-crisis.md` | **Crisis + Debrief design** | Hurricane briefing format, CM tools, debrief structure |
| `values-crucible-card-deck.md` | **Values content** | 40 values organized by Schwartz circumplex |
| `concordia-all-parishes.md` | **World bible** | All 6 parishes with assets, vulnerabilities, personas, sample dilemmas |
| `concordia-hurricane-timeline.md` | **Weather backbone** | T-72h to T+24h progression, infrastructure cascade, decision windows |
| `dilemma-generation-framework.md` | **AI generation spec** | How to generate dilemmas from team values + world state |

### 📁 REFERENCE DOCUMENTS (Background Context)

These informed the design but aren't implementation specs:

| Document | Purpose | Notes |
|----------|---------|-------|
| `crucible-codebase-audit-final.md` | Existing code assessment | 92/100 backend ready; identified gaps |
| `concordia-plan-v2.md` | Development sequence | The plan we followed |
| `values-crucible-experience-arc.md` | Earlier experience design | Superseded by summary + pre/during/post docs |
| `values-crucible-sota-analysis.md` | Competitive analysis | Market context |
| `concordia-keystone-parish.md` | Single parish detail | Rolled into all-parishes doc |
| `concordia-narrative-plan.md` | Early narrative planning | Superseded |
| `concordia-map-implementation.md` | Map UI specs | Still relevant for frontend |

### 📁 AUDIT DOCUMENTS (Code Context)

| Document | Purpose |
|----------|---------|
| `crucible-codebase-audit.md` | Initial audit |
| `crucible-codebase-audit-v2.md` | Revised audit |
| `crucible-codebase-audit-final.md` | **Final audit with recommendations** |
| `crucible-engine-audit.md` | Engine-specific assessment |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VALUES CRUCIBLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      FRONTEND (Next.js)                       │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  Pre-Crisis UI          │  Crisis UI           │  Debrief UI │   │
│  │  - Card Sort            │  - Parish Dashboard  │  - Timeline │   │
│  │  - Values Definition    │  - Streaming Feed    │  - Gap Vis  │   │
│  │  - Team Alignment       │  - Decision Modal    │  - Reports  │   │
│  │  - Commitment Editor    │  - Hurricane Brief   │             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SIMULATION ENGINE                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  WeatherEngine     │  Captures team values profile            │   │
│  │  - Timeline state  │  - Individual values + definitions       │   │
│  │  - Infrastructure  │  - Team values + commitment              │   │
│  │  - Decision windows│  - Decision process                      │   │
│  │                    │                                          │   │
│  │  ConsequenceEngine │  DilemmaGenerator                        │   │
│  │  - Tracks choices  │  - LLM-powered                           │   │
│  │  - Cascades        │  - Uses team profile + world state       │   │
│  │  - Reveals         │  - Generates tailored dilemmas           │   │
│  │                    │                                          │   │
│  │  ValuesScorer      │  NarrativeAgent                          │   │
│  │  - Real-time ABCD  │  - Persona voices                        │   │
│  │  - Alignment -3/+3 │  - Streaming content                     │   │
│  │  - Gap tracking    │  - World flavor                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       DATA LAYER                              │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  TeamProfile       │  DecisionHistory      │  WorldState     │   │
│  │  - Values          │  - All decisions      │  - Weather      │   │
│  │  - Commitment      │  - Rationales         │  - Infrastructure│  │
│  │  - Org values      │  - Scores             │  - Parish states│   │
│  │  - Process         │  - Consequences       │  - Events       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Sequence

### Phase 1: Data Models & World State (Week 1)

**Goal:** Establish TypeScript types and world initialization

**Source documents:**
- `concordia-all-parishes.md` → Parish types, persona types
- `concordia-hurricane-timeline.md` → WeatherState, InfrastructureStatus types
- `values-crucible-card-deck.md` → Values enum/data
- `dilemma-generation-framework.md` → TeamValuesProfile, Decision, Dilemma types

**Deliverables:**
```
src/types/
  parish.ts          # Parish, Asset, Vulnerability, Resource
  persona.ts         # Persona with voice constraints
  weather.ts         # WeatherState, timeline progression
  values.ts          # Value, TeamValuesProfile, AlignmentScore
  dilemma.ts         # Dilemma, Option, Consequence
  decision.ts        # Decision, DecisionHistory

src/data/
  parishes.ts        # All 6 parishes initialized
  personas.ts        # All 6 personas with fences
  weather-timeline.ts # Full T-72h to T+24h progression
  values-deck.ts     # 40 values with Schwartz categorization
```

---

### Phase 2: Pre-Crisis Experience (Week 2)

**Goal:** Build values discovery UI and data capture

**Source documents:**
- `values-crucible-pre-crisis-discovery.md` → All activities, facilitation scripts
- `values-crucible-card-deck.md` → Card data and circumplex structure

**Deliverables:**
```
src/components/pre-crisis/
  ValuesQuickSort.tsx       # Drag-drop card sort (3 rounds)
  ValuesMeaningForm.tsx     # Definition + behaviors + feelings
  ValuesStoryCapture.tsx    # Story writing + peer reflection
  TeamValuesGallery.tsx     # Anonymous gallery → claim → visualize
  TeamDefinitionsDialog.tsx # Collaborative definition building
  CommitmentEditor.tsx      # Write, read aloud, sign
  DecisionProcessPicker.tsx # Select team process
  OrgValuesMapping.tsx      # Optional Phase 3

src/hooks/
  useTeamProfile.ts         # Manages team values state
  useValuesCapture.ts       # Handles all pre-crisis data

src/stores/
  teamProfileStore.ts       # Persists team profile for simulation
```

**Key UX requirements:**
- Card sort must be timed (3 min round 1, 4 min round 2, 3 min round 3)
- Gallery should animate claim reveals
- Commitment must support read-aloud mode
- All data captured for debrief comparison

---

### Phase 3: Weather Engine & World State (Week 3)

**Goal:** Time-based simulation with infrastructure cascade

**Source documents:**
- `concordia-hurricane-timeline.md` → Full timeline with all states
- `concordia-all-parishes.md` → Parish dependencies, vulnerabilities

**Deliverables:**
```
src/engine/
  WeatherEngine.ts          # Manages timeline progression
  InfrastructureManager.ts  # Tracks failures, access, resources
  WorldStateManager.ts      # Aggregates all state
  TimeController.ts         # Compression, pause, accelerate

src/engine/weather/
  timeline.ts               # WeatherState[] progression
  infrastructure.ts         # Failure cascade logic
  access.ts                 # Parish accessibility calculations
```

**Key behaviors:**
- Time compression varies by intensity (50:1 → 15:1 → 20:1)
- Infrastructure failures cascade (dam → power → clean rooms)
- Decision windows open and close on schedule
- CM can override timeline, inject events

---

### Phase 4: Dilemma Generation (Week 4)

**Goal:** AI-powered dilemma generation from team profile + world state

**Source documents:**
- `dilemma-generation-framework.md` → Complete generation spec
- `concordia-all-parishes.md` → 18 example dilemmas for few-shot

**Deliverables:**
```
src/engine/dilemma/
  DilemmaGenerator.ts       # LLM-powered generation
  ConsequenceEngine.ts      # Tracks and reveals consequences
  ValuesScorer.ts           # Real-time ABCD scoring
  DilemmaValidator.ts       # Quality checks before presenting

src/prompts/
  dilemma-system.txt        # System prompt for generator
  dilemma-examples.json     # 18 example dilemmas formatted
  scoring-system.txt        # System prompt for scorer
```

**Generation inputs:**
1. Team values profile (from pre-crisis)
2. Current world state (weather, infrastructure)
3. Decision history (what they've already chosen)
4. Target intensity (from timeline)
5. Optional: parish focus, persona required, build-on-decision

**Generation rules (from framework):**
- No clean choices (every option has a cost)
- Test THEIR specific values and commitment language
- Consequences cascade from previous decisions
- Persona voice creates emotional pressure
- Intensity-appropriate stakes and time pressure

---

### Phase 5: Crisis UI (Week 5)

**Goal:** Real-time simulation interface

**Source documents:**
- `values-crucible-during-post-crisis.md` → Hurricane briefing format, no values prompts
- `concordia-all-parishes.md` → Parish dashboards, assets to display
- `concordia-hurricane-timeline.md` → What information shows when

**Deliverables:**
```
src/components/crisis/
  ParishDashboard.tsx       # Main team view
  StreamingFeed.tsx         # NarrativeAgent content
  HurricaneBriefing.tsx     # Situation reports (PURE OPERATIONAL)
  DilemmaModal.tsx          # Decision interface
  DecisionCapture.tsx       # Choice + rationale recording
  MetricsDashboard.tsx      # KPIs, dollars, headcount (with deception layer)
  
src/components/crisis/cm/
  CMConsole.tsx             # Crucible Master controls
  IntensityControl.tsx      # Adjust pacing
  EventInjector.tsx         # Trigger events
  ValuesCheckIn.tsx         # Optional intervention tool
```

**Critical UX requirement:**
Hurricane briefings are PURE OPERATIONAL DATA:
- Weather status
- Production status
- Personnel status
- Financial status
- Decisions required

**NO values prompts. NO commitment reminders. NO "consider the ethical implications."**

Teams must remember their own values. That's the practice.

---

### Phase 6: Narrative Agent (Week 5-6)

**Goal:** AI-powered content generation with persona voices

**Source documents:**
- `concordia-all-parishes.md` → All 6 persona fences
- `concordia-hurricane-timeline.md` → Sample NarrativeAgent content per phase

**Deliverables:**
```
src/engine/narrative/
  NarrativeAgent.ts         # Main content generator
  PersonaVoice.ts           # Enforces persona constraints
  ContentStream.ts          # Streaming to UI

src/prompts/
  persona-fences/
    frank-reeves.txt        # Keystone plant manager
    maria-santos.txt        # Haven union rep
    rosa-mendez.txt         # Gateway fleet captain
    yuki-tanaka.txt         # Heartland chief engineer
    marcus-webb.txt         # Summit CEO
    diana-chen.txt          # Sterling mayor
```

**Persona fence structure (per persona):**
- Background (2 sentences)
- Speaking style (vocabulary, tone)
- Knows (specific facts)
- Does not know (information gaps)
- Primary value + tension
- Never says (forbidden phrases)
- Signature lines (examples)

---

### Phase 7: Debrief & Values Gap Analysis (Week 6)

**Goal:** Post-crisis reflection and learning capture

**Source documents:**
- `values-crucible-during-post-crisis.md` → Full debrief structure
- `dilemma-generation-framework.md` → Scoring and evidence generation

**Deliverables:**
```
src/components/debrief/
  DecisionTimeline.tsx      # Scrolling timeline with all decisions
  ValuesGapReport.tsx       # Stated vs enacted visualization
  AlignmentChart.tsx        # -3 to +3 by phase
  CommitmentMirror.tsx      # Their words vs their actions
  RationalizationCascade.tsx # 6-step drift pattern
  TransferReflection.tsx    # Personal commitment capture

src/engine/debrief/
  GapAnalyzer.ts            # Generates per-team reports
  PatternDetector.ts        # Identifies drift patterns
  EvidenceGenerator.ts      # Creates quotes for gap analysis
```

**Key debrief outputs:**
- Timeline with decisions, consequences, notable moments
- Per-value alignment scores across phases (visual charts)
- Specific gap callouts: "You said X. Then you decided Y."
- Pattern summary: "Your biggest gap was [VALUE] during [PHASE]"
- Comparison to commitment statement

---

## Key Design Principles for Implementation

### 1. No Values Crutches During Crisis

The simulation does NOT prompt teams about values during the hurricane. Briefings show:
- KPIs
- Dollars
- Deadlines
- Headcount
- Weather

Teams must remember their own commitment. The CM can intervene, but it's a choice, not scaffolding.

### 2. Dilemmas Test THEIR Values

Don't generate generic dilemmas. Generate dilemmas that use their specific language:

**If they wrote:** "We commit to protecting our people first"

**Generate:** A dilemma where "our people" is ambiguous (employees? families? contractors? community?) and protection has a real cost.

### 3. Consequences Cascade

Decision at T-48h → consequence at T-24h → new dilemma at T-18h

The system tracks what they chose and builds on it. Nothing feels arbitrary.

### 4. The Gap Is Data, Not Judgment

Debrief surfaces the gap between stated and enacted values without shaming. Framing:
- "What happened?"
- "What can we learn?"
- "What will we do differently?"

### 5. Leave People Better Than You Found Them

From BEI methodology: Every participant should leave feeling clearer about their values and proud of exploring them, even if the simulation revealed gaps.

---

## File Reading Order for Claude Code

When starting implementation, read documents in this order:

### Understanding the Experience
1. `values-crucible-experience-summary.md` — Overall flow and timing
2. `values-crucible-pre-crisis-discovery.md` — How values are established
3. `values-crucible-during-post-crisis.md` — Crisis and debrief design

### Understanding the World
4. `concordia-all-parishes.md` — Complete world bible
5. `concordia-hurricane-timeline.md` — Weather and infrastructure progression

### Understanding the AI Systems
6. `dilemma-generation-framework.md` — How dilemmas are generated
7. `values-crucible-card-deck.md` — Values content

### Understanding Existing Code
8. `crucible-codebase-audit-final.md` — What's already built (92/100 backend)

---

## TypeScript Type Summary

Key types to implement (detailed specs in source documents):

```typescript
// From values-crucible-pre-crisis-discovery.md
interface TeamValuesProfile {
  individualProfiles: IndividualValuesProfile[];
  teamValues: TeamValue[];
  commitmentStatement: string;
  decisionProcess: DecisionProcess;
  organizationalValues?: OrgValueMapping[];
}

// From concordia-all-parishes.md
interface Parish {
  id: string;
  name: string;
  population: number;
  meridianPercentage: number;
  role: SupplyChainRole;
  assets: Asset[];
  resources: Resource[];
  vulnerabilities: Vulnerability[];
  classCharacter: ClassCharacter;
  valuesTested: string[];
  coreQuestion: string;
}

interface Persona {
  name: string;
  title: string;
  parish: string;
  background: string;
  speakingStyle: string;
  knows: string[];
  doesNotKnow: string[];
  primaryValue: string;
  valueTension: string;
  neverSays: string[];
  signatureLines: string[];
}

// From concordia-hurricane-timeline.md
interface WeatherState {
  timeOffset: number;
  phase: SimulationPhase;
  intensityLevel: number;
  winds: WindConditions;
  rain: RainConditions;
  surge: SurgeConditions;
  visibility: Visibility;
  infrastructure: InfrastructureStatus;
  parishAccess: Record<string, boolean>;
  decisionWindows: Record<string, WindowStatus>;
}

// From dilemma-generation-framework.md
interface Dilemma {
  id: string;
  title: string;
  setup: string;
  trigger: string;
  urgency: Urgency;
  deadline?: string;
  options: DilemmaOption[];
  persona: PersonaVoice;
  valuesAtStake: string[];
  intensityLevel: number;
  commitmentRelevance?: string;
}

interface Decision {
  timestamp: number;
  simulationTime: number;
  intensityLevel: number;
  dilemmaId: string;
  choice: string;
  rationale: string;
  valuesAtStake: string[];
  alignmentScores: AlignmentScore[];
  consequencesTriggered: string[];
}
```

---

## Questions Claude Code Should Ask

Before implementing, clarify:

1. **Existing codebase location?** — Where is the current 92/100 backend code?
2. **LLM provider?** — Anthropic Claude? Which model for generation?
3. **Real-time requirements?** — WebSocket? Server-sent events?
4. **Deployment target?** — Vercel? Self-hosted? 
5. **Database?** — PostgreSQL? SQLite? In-memory for MVP?
6. **Authentication?** — How do teams/players authenticate?
7. **CM interface priority?** — Is Crucible Master console in scope for MVP?

---

## Success Criteria

MVP is complete when:

1. ✅ Teams can complete pre-crisis values discovery (all activities)
2. ✅ Team profile (values, commitment, process) is captured and persisted
3. ✅ Hurricane timeline progresses with infrastructure cascade
4. ✅ Dilemmas are generated from team profile + world state
5. ✅ Decisions are captured with rationale
6. ✅ Values alignment is scored in real-time
7. ✅ Consequences cascade to future dilemmas
8. ✅ Debrief shows timeline, gap analysis, commitment comparison
9. ✅ Personas speak in constrained, authentic voices
10. ✅ No values prompts during crisis—teams practice without crutches

---

## Document Locations

All documents are in `/mnt/user-data/outputs/`:

```
/mnt/user-data/outputs/
├── values-crucible-experience-summary.md      # START HERE
├── values-crucible-pre-crisis-discovery.md
├── values-crucible-during-post-crisis.md
├── values-crucible-card-deck.md
├── concordia-all-parishes.md
├── concordia-hurricane-timeline.md
├── dilemma-generation-framework.md
├── crucible-codebase-audit-final.md
└── [other reference documents]
```

Copy these to your project's `/docs` folder for Claude Code access.
