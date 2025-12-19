# Concordia Narrative Development Plan

## Objective

Produce a complete world bible that directly generates:
- `concordia.ts` — Parish definitions, dependencies, resources
- `personas.ts` — Character fences for AI agents
- `dilemmas.ts` — Decision library for all phases
- Agent prompt context — Grounding for Narrative/Consequence/Values agents

---

## Existing Assets

**Source:** Transcript from earlier session + uploaded `concordia.ts`

| Asset | Content | Usable? |
|-------|---------|---------|
| Meridian BioSciences | Cancer drug company, Celarithin, 340K patients | ✅ Ready |
| Supply chain | Kelp → Thalassarin → Celarithin → Global | ✅ Ready |
| 6 parishes | Summit, Heartland, Sterling, Gateway, Haven, Keystone | ✅ Names + roles |
| Geography | Crater island, ring road, elevation dynamics | ✅ Concept |
| Class dynamics | Executives isolated, workers exposed | ✅ Concept |
| Dilemma examples | 12 examples across Watch/Crisis/Recovery | ✅ Starting points |
| Rationalization cascade | 6-step moral drift pattern | ✅ Ready |
| Existing concordia.ts | 5 parishes, generic framing | ⚠️ Replace |

---

## Deliverables

### D1: Geography & Infrastructure
**What:** Physical Concordia—distances, terrain, travel times, infrastructure connections  
**Enables:** Consequence timing, evacuation logistics, resource movement  
**Format:** Prose description + schematic diagram  
**Time:** 45 minutes

**Acceptance criteria:**
- [ ] Crater dimensions and elevation profile
- [ ] Ring road distance (total + between parishes)
- [ ] Travel times by vehicle under normal/degraded conditions
- [ ] Power grid topology (who feeds whom)
- [ ] Water system (reservoir → distribution)
- [ ] Communications infrastructure (tower locations, dependencies)

---

### D2: Parish Specifications (×6)
**What:** Complete definition for each parish  
**Enables:** Direct generation of `concordia.ts`  
**Format:** Structured specification per parish  
**Time:** 90 minutes (15 min each)

**Per-parish specification:**

```
PARISH NAME
├── Location: Position on island, elevation, terrain
├── Population: Total, demographic breakdown
├── Meridian Role: % workforce, function in supply chain
├── Key Assets:
│   ├── [Asset 1]: Name, capacity, criticality
│   ├── [Asset 2]: ...
│   └── [Asset 3]: ...
├── Resources:
│   ├── Generators: Count, deployment priority
│   ├── Medical: Level (low/medium/high), specialty
│   ├── Fuel: Storage capacity, burn rate
│   ├── Food: Days of supply, source
│   ├── Water: Source, storage, dependency
│   └── Shelter: Capacity, locations
├── Dependencies:
│   ├── Receives: What, from whom
│   └── Provides: What, to whom
├── Vulnerabilities: Storm-specific failure modes
├── Class Character: Who lives here, power dynamics
└── Story Role: What this parish represents thematically
```

**Sequence:** Summit → Heartland → Keystone → Haven → Gateway → Sterling

---

### D3: Persona Fences (×6-8)
**What:** Constrained AI characters with defined knowledge, values, and behaviors  
**Enables:** NarrativeAgent generates authentic, bounded content  
**Format:** Fence structure per persona  
**Time:** 60 minutes (8-10 min each)

**Fence structure:**

```
PERSONA NAME
├── Identity: Name, title, age, background
├── Location: Primary parish, mobility
├── Speaking Style: Vocabulary, tone, cadence
├── Knowledge Boundary:
│   ├── Knows: [specific facts they have access to]
│   └── Does Not Know: [information they lack]
├── Values Tension:
│   ├── Primary Value: What they fight for
│   ├── Tension With: What it conflicts with
│   └── Breaking Point: When they compromise
├── Behavioral Constraints:
│   ├── Never Says: [forbidden phrases/positions]
│   ├── Always Considers: [consistent concerns]
│   └── Tone Range: [emotional boundaries]
├── Relationships: Key connections to other personas
├── Arc Potential: How pressure might change them
└── Signature Lines: 2-3 example utterances
```

**Cast:**
1. Marcus Webb — Meridian CEO (Summit)
2. Mayor Diana Chen — Island government (Sterling)  
3. Carlos Torres — Union rep (Haven)
4. Dr. Adaeze Okonkwo — Hospital chief (Heartland)
5. Frank Reeves — Plant manager (Keystone)
6. Lieutenant Commander Sarah Park — Coast Guard (Haven)
7. Optional: FEMA liaison, news reporter

---

### D4: Hurricane Midas Timeline
**What:** Storm progression with trigger points  
**Enables:** Weather state machine, intensity calibration  
**Format:** Hour-by-hour timeline with decision windows  
**Time:** 30 minutes

**Structure:**

```
T-72h: Storm watch issued
       └── Certainty: 40%, Category: 2, Trajectory: Uncertain
       └── Decision window: Pre-positioning

T-48h: Track solidifies
       └── Certainty: 65%, Category: 3, Trajectory: Direct/Glancing
       └── Decision window: Early release, evacuation prep

T-24h: Warning issued
       └── Certainty: 85%, Category: 4, Trajectory: Confirmed
       └── Decision window: Mandatory evacuation, shutdown

T-12h: Outer bands arrive
       └── Conditions: Degrading, travel dangerous
       └── Decision window: Last chance evacuation

T-6h: Hurricane conditions
       └── Conditions: Full storm, no movement possible
       └── Decision window: Shelter decisions only

T+0: Landfall (or near-miss)
       └── Conditions: Peak crisis
       └── Decision window: Life-safety only

T+6h: Eye passage / conditions easing
       └── Conditions: Assessment possible
       └── Decision window: Rescue prioritization

T+24h: Recovery begins
       └── Conditions: Aftermath visible
       └── Decision window: Accountability, resource allocation
```

---

### D5: Dilemma Library
**What:** 40+ decision scenarios across phases  
**Enables:** Gameplay content, consequence chains  
**Format:** Structured dilemma cards  
**Time:** 120 minutes

**Dilemma structure:**

```
DILEMMA ID: [phase]-[number]
├── Phase: Watch / Crisis / Recovery
├── Title: Short name
├── Setup: Situation description (2-3 sentences)
├── Pressure: Why decide now
├── Options: 3-4 choices (none purely good)
├── Values Tested: Which values conflict
├── Consequences:
│   ├── Option A → Immediate / Ripple / Delayed
│   ├── Option B → ...
│   └── Option C → ...
├── Parish Affected: Primary + secondary
├── Intensity Trigger: When this appears (intensity level)
└── Persona Involvement: Who voices pressure
```

**Distribution:**
- Watch phase: 15 dilemmas (resource positioning, early release, uncertainty)
- Crisis phase: 20 dilemmas (life-safety, triage, impossible choices)
- Recovery phase: 10 dilemmas (accountability, blame, what now)

---

### D6: Code Artifacts
**What:** Generated TypeScript from narrative  
**Enables:** Direct codebase update  
**Format:** Ready-to-commit files  
**Time:** 60 minutes

**Files:**
- `packages/shared/src/constants/concordia.ts` — Full 6-parish rewrite
- `apps/server/src/agents/prompts/personas.ts` — Fence definitions
- `apps/server/src/agents/prompts/dilemmas.ts` — Dilemma library
- `apps/server/src/agents/prompts/world.ts` — Shared world context

---

## Sequence

```
D1: Geography (45 min)
 │
 ├─► D2: Parishes (90 min) ─────────────────────────────────────┐
 │                                                               │
 ├─► D3: Personas (60 min) ──────┐                              │
 │                                │                              │
 └─► D4: Timeline (30 min) ──────┼─► D5: Dilemmas (120 min) ────┼─► D6: Code (60 min)
                                  │                              │
                                  └──────────────────────────────┘

Total: ~7 hours working time
```

**Dependencies:**
- Parishes need geography (distances affect consequences)
- Personas need parishes (characters are placed)
- Dilemmas need all three (scenarios reference locations, people, timing)
- Code needs everything (synthesis)

---

## Working Method

For each deliverable:

1. **I draft** — Complete section based on transcript + logic
2. **You react** — Approve / revise / redirect
3. **I finalize** — Incorporate feedback
4. **Move to next** — No backtracking unless critical

Target: Complete D1-D5 in this session, D6 as immediate follow-up.

---

## Start

**D1: Geography & Infrastructure**

Ready to draft the physical Concordia—crater dimensions, ring road, infrastructure topology?
