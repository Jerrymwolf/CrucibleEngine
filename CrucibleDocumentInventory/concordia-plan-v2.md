---
title: "Concordia narrative development plan v2 (superseded)"
date: 2026-10-21
type: plan
status: superseded
superseded_by: "[[concordia-parishes-v3]]"
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, plan, lore, superseded]
related:
  - "[[concordia-narrative-plan]]"
  - "[[concordia-parishes-v3]]"
  - "[[crucible-dilemmas-v3]]"
canon_note: "The gaps this plan listed (parish specs, timeline, crisis dilemmas, personas) are filled by [[concordia-parishes-v3]], [[concordia-storm-quarters]] and [[crucible-dilemmas-v3]]. The supply chain it confirmed has changed: Heartland processes the kelp, Haven only ships."
---

# Concordia Narrative Development Plan v2

## What Exists (From Transcript)

| Asset | Status | Gaps |
|-------|--------|------|
| 6 parish structure | ✅ Confirmed | Need specs (population, resources) |
| Supply chain | ✅ Defined | Need timing (hours between steps) |
| Class dynamics | ✅ Established | — |
| Moral architecture | ✅ Framework | Need specific value-tests per parish |
| Watch dilemmas | 5 examples | Need 10 more + consequence chains |
| Personas | Names only | Need full fences |
| Hurricane timeline | Not started | — |
| Crisis dilemmas | Not started | — |
| Recovery dilemmas | Not started | — |

**We are not starting from zero. We're completing a structure that's 40% done.**

---

## Learning Outcomes (What Narrative Must Enable)

From resonant leadership and your dissertation work:

| Outcome | Narrative Requirement |
|---------|----------------------|
| Recognize drift from resonance | Dilemmas must create gradual pressure where "reasonable" choices accumulate into indefensible positions |
| Articulate values under pressure | Characters must force teams to name which value they're prioritizing |
| Notice stated/enacted gap | Decisions must create visible consequences that contradict stated commitments |
| Practice return to attunement | Recovery phase must offer redemption paths, not just punishment |
| Transfer to real contexts | Dilemmas must pattern-match to actual corporate situations |

**Every narrative element must serve at least one outcome.**

---

## Development Sequence

### Phase 1: Lock Geography (30 min)

**What:** Finalize physical Concordia with numbers

| Parish | Population | Meridian % | Ring Road Distance |
|--------|------------|-----------|-------------------|
| Sterling | ? | ? | — |
| Gateway | ? | ? | — |
| Haven | ? | ? | — |
| Summit | ? | ? | — |
| Heartland | ? | ? | — |
| Keystone | ? | ? | — |

**Decisions needed:**
- Total island population (I suggest ~25,000)
- Travel times by road under normal/degraded conditions
- Infrastructure connections (power grid, water, comms)

**Done when:** Numbers locked. No more geography discussion.

---

### Phase 2: Parish Specifications (90 min)

**For each of 6 parishes, specify:**

```
[PARISH]
Population: X (Y% Meridian employees)
Role in chain: [harvest/process/manufacture/ship/power/coordinate]
Key assets: [3-5 specific facilities with capacities]
Resources: generators, medical, fuel, food, water, shelter
Vulnerabilities: [2-3 storm-specific failure modes]
Class character: [who lives here, what they fear, what they want]
Values tested: [which values this parish's dilemmas surface]
```

**Sequence:** Keystone → Haven → Gateway → Heartland → Summit → Sterling

(Keystone first because it's new and central to Meridian narrative)

**Done when:** Can generate `concordia.ts` directly from specs.

---

### Phase 3: Persona Fences (60 min)

**6 personas, one primary to each parish:**

| Parish | Persona | Values Tension |
|--------|---------|----------------|
| Keystone | Plant Manager Frank Reeves | Production vs. worker safety |
| Haven | Union Rep Maria Santos | Worker rights vs. job preservation |
| Gateway | Fleet Captain Rosa Mendez | Crew safety vs. harvest pressure |
| Heartland | Chief Engineer Tanaka | System safety vs. demand |
| Summit | CEO Marcus Webb | Shareholder value vs. human cost |
| Sterling | Mayor Diana Chen | Community vs. economic survival |

**Per persona:**
```
Name, title, background (2 sentences)
Speaking style (vocabulary, tone)
Knows: [specific facts]
Does not know: [information gaps]
Primary value + tension
Never says: [2-3 forbidden phrases]
Signature line: [1 example utterance]
```

**Done when:** Can constrain NarrativeAgent to speak only in-character.

---

### Phase 4: Hurricane Midas Timeline (30 min)

**Fixed timeline with decision windows:**

| T-minus | Conditions | Certainty | Decision Type |
|---------|------------|-----------|---------------|
| 72h | Watch issued | 40% | Pre-positioning |
| 48h | Track solidifies | 65% | Early release |
| 24h | Warning issued | 85% | Evacuation |
| 12h | Outer bands | 95% | Last movement |
| 6h | Hurricane conditions | — | Shelter only |
| 0h | Landfall | — | Life safety |
| +6h | Eye/easing | — | Rescue priority |
| +24h | Recovery | — | Accountability |

**For each window:**
- Weather conditions (wind, rain, surge)
- Which infrastructure fails
- What decisions become unavailable
- What new pressures emerge

**Done when:** Weather state machine can be programmed.

---

### Phase 5: Dilemma Library (120 min)

**45 total: 15 Watch, 20 Crisis, 10 Recovery**

**Structure per dilemma:**
```
ID: [phase]-[parish]-[number]
Title: [5 words max]
Setup: [situation in 2 sentences]
Trigger: [intensity level or condition]
Options: [3-4 choices, none purely good]
Values tested: [which values conflict]
Consequence sketch: [what happens for each choice]
Persona involved: [who voices the pressure]
```

**Distribution:**

| Phase | Focus | Example Pattern |
|-------|-------|-----------------|
| Watch (15) | Resource positioning, uncertainty | "Should we X now or wait for better information?" |
| Crisis (20) | Impossible tradeoffs, time pressure | "You can save A or B, not both. 30 seconds." |
| Recovery (10) | Accountability, blame | "The reporter is asking why you..." |

**Done when:** Library covers all parishes, all values, escalating intensity.

---

## Output Artifacts

At end of this work:

| File | Content | Enables |
|------|---------|---------|
| `world-bible.md` | Complete narrative reference | All development |
| `concordia.ts` | Parish specs as code | Server initialization |
| `personas.ts` | Character fences | NarrativeAgent constraints |
| `dilemmas.ts` | Decision library | Scenario content |
| `timeline.ts` | Hurricane progression | Weather state machine |

---

## Working Method

1. **I draft each phase in full** — not templates, actual content
2. **You review with ~5 min response** — approve / revise / redirect
3. **I incorporate and move on** — no circular revision
4. **We complete all 5 phases before any coding** — narrative is the foundation

---

## Phase 1 Start: Geography Numbers

Based on transcript, here's my proposal:

**Total island population: 24,100**

| Parish | Population | Meridian % | Character |
|--------|------------|------------|-----------|
| Sterling | 6,200 | 35% | Densest. Hospital, schools, govt. Service workers, non-Meridian families. Most vulnerable. |
| Gateway | 3,800 | 70% | Harvesters, hospitality. Airport enables evacuation. First to see storm. |
| Haven | 5,400 | 85% | Port workers, processing. Union presence. Storm surge risk. |
| Summit | 2,100 | 95% | Smallest. Executives, scientists. Safest. Decides. |
| Heartland | 3,400 | 90% | Dam operators, utility workers. Essential. Leverage. |
| Keystone | 3,200 | 95% | Technicians, researchers. Clean rooms. Production. |

**Ring road: 42km total**
- Gateway ↔ Sterling: 12km (15 min normal, 45 min degraded)
- Sterling ↔ Haven: 10km (12 min normal, 40 min degraded)
- Haven ↔ Keystone: 8km (10 min normal, 30 min degraded)
- Keystone ↔ Gateway: 12km (15 min normal, 45 min degraded)

**Crater roads (steep, narrow):**
- Ring road ↔ Summit: 4km (8 min normal, impassable in storm)
- Ring road ↔ Heartland: 3km (6 min normal, impassable in storm)
- Summit ↔ Heartland: 2km (4 min normal, flooding risk)

**Infrastructure:**
- Power: Heartland dam → all parishes (Keystone priority, Summit backup generators)
- Water: Heartland reservoir → all parishes (Keystone needs ultrapure)
- Comms: Summit tower (island-wide), Gateway airport (external)

**React with approve/revise to lock this, then I'll draft Keystone parish spec.**
