---
title: "Dilemma generation framework"
date: 2026-10-21
type: design-framework
status: reference
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, dilemmas, framework, reference]
related:
  - "[[crucible-dilemmas-v3]]"
  - "[[concordia-parishes-v3]]"
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
canon_note: "The principles stand and the v3 cards follow them: two values in tension, no clean option, consequences that chain. Two things are superseded. Dilemmas are now an authored library ([[crucible-dilemmas-v3]]) chosen by the engine's ask lists, not generated at runtime; and the parish facts used in the examples (Haven processing, the Coast Guard station) follow [[concordia-parishes-v3]]."
---

# Dilemma Generation Framework

## Design Principle

**Don't script dilemmas. Generate them.**

The simulation has everything it needs to create dilemmas that are:
- Tailored to this team's specific stated values
- Consequential to their previous decisions
- Appropriate to current intensity and phase
- Grounded in the world (parishes, personas, assets, vulnerabilities)
- Impossible to "game" because they're not predictable

Pre-scripted dilemmas test generic values. Generated dilemmas test *your* values—the ones you wrote down an hour ago.

---

## Inputs to Dilemma Generation

### 1. Team Values Profile

```typescript
interface TeamValuesProfile {
  // From Pre-Crisis Discovery
  teamValues: {
    value: string;
    definition: string;           // Their words, not dictionary
    livingIt: string[];           // Behaviors they identified
    violatingIt: string[];        // Anti-behaviors they identified
  }[];
  
  commitmentStatement: string;    // Their full written commitment
  
  decisionProcess: 'consensus' | 'consultative' | 'majority' | 'leader' | 'valuesCheck';
  
  // If Phase 3 completed
  organizationalValues?: {
    value: string;
    alignmentRating: number;      // 1-5 average
    tensionNotes: string;
  }[];
  
  predictedRiskValue?: string;    // "Which org value most at risk under pressure?"
}
```

**Example:**
```json
{
  "teamValues": [
    {
      "value": "Safety",
      "definition": "Protecting our people from harm, even when it costs us",
      "livingIt": ["Stopping work when conditions are dangerous", "Speaking up about risks"],
      "violatingIt": ["Pushing people to work when it's not safe", "Hiding safety concerns"]
    },
    {
      "value": "Integrity",
      "definition": "Doing what we say, telling the truth even when it's hard",
      "livingIt": ["Admitting mistakes", "Keeping promises"],
      "violatingIt": ["Spinning bad news", "Saying what people want to hear"]
    }
  ],
  "commitmentStatement": "When pressure mounts, we commit to protecting our people first, even when production suffers. We will speak up when we see drift, and we will own our decisions together.",
  "decisionProcess": "consultative"
}
```

### 2. Current World State

```typescript
interface WorldState {
  timeOffset: number;              // Hours from landfall
  phase: 'watch' | 'warning' | 'hurricane' | 'eye' | 'backside' | 'recovery';
  intensityLevel: number;          // 1-10
  
  weather: WeatherConditions;
  infrastructure: InfrastructureStatus;
  
  // Parish-specific states
  parishes: {
    [parishId: string]: {
      accessible: boolean;
      currentCrisis: string | null;
      resourceStatus: ResourceStatus;
      personnelStatus: PersonnelStatus;
      pendingConsequences: string[];
    }
  };
  
  // What's happening right now
  activeEvents: string[];          // "Fuel terminal seal failing", "Housing flooding"
  
  // What's known vs. unknown
  revealedInformation: string[];
  hiddenInformation: string[];     // CM can reveal these
}
```

### 3. Decision History

```typescript
interface DecisionHistory {
  decisions: {
    timestamp: number;
    simulationTime: number;
    intensityLevel: number;
    
    dilemmaId: string;
    dilemmaTitle: string;
    
    choice: string;
    rationale: string;
    
    valuesAtStake: string[];
    alignmentScores: {
      value: string;
      score: number;              // -3 to +3
    }[];
    
    consequencesTriggered: string[];
    consequencesRevealed: string[];
    consequencesPending: string[];
  }[];
  
  // Aggregate patterns
  patterns: {
    mostTestedValue: string;
    lowestAlignmentValue: string;
    averageAlignmentByPhase: { [phase: string]: number };
    driftDetected: boolean;
    driftDescription?: string;
  };
}
```

### 4. Generation Parameters

```typescript
interface GenerationParams {
  targetIntensity: number;         // 1-10
  phase: 'watch' | 'crisis' | 'recovery';
  
  // What to test
  targetValues?: string[];         // Specific values to pressure (or let AI choose)
  
  // Constraints
  parishFocus?: string;            // Which parish this dilemma centers on
  personaRequired?: string;        // Which persona must be involved
  
  // Consequence hooks
  buildOnDecision?: string;        // Previous decision ID to build consequences from
  
  // Tone
  escalate: boolean;               // Increase pressure from last dilemma?
}
```

---

## Dilemma Structure

Every generated dilemma follows this structure:

```typescript
interface Dilemma {
  id: string;
  generatedAt: number;
  
  // Framing
  title: string;                   // 5 words max, punchy
  setup: string;                   // 2-3 sentences, situation
  trigger: string;                 // What just happened that forces a decision
  
  // Time pressure
  urgency: 'immediate' | 'minutes' | 'hours' | 'flexible';
  deadline?: string;               // "You have 5 minutes" or "Before the eye passes"
  
  // Options (always 3-4, never a "right" answer)
  options: {
    id: string;
    label: string;                 // Short action name
    description: string;           // What this means concretely
    
    // What values does this option favor/violate?
    valuesImplied: {
      value: string;
      direction: 'honors' | 'tests' | 'violates';
    }[];
    
    // What happens (not revealed to team until chosen)
    consequences: {
      immediate: string;           // What they see right away
      delayed: string;             // What emerges 1-2 decisions later
      hidden: string;              // What surfaces in debrief
    };
  }[];
  
  // Who delivers the pressure
  persona: {
    name: string;
    parish: string;
    voice: string;                 // The actual line they speak
  };
  
  // For values tracking
  valuesAtStake: string[];         // Primary values being tested
  intensityLevel: number;
  
  // Connection to team's specific commitment
  commitmentRelevance?: string;    // How this tests their specific words
}
```

---

## Generation Rules

### Rule 1: Test THEIR Values, Not Generic Values

**Bad:** "This dilemma tests Safety vs. Production"

**Good:** "This team committed to 'protecting our people first, even when production suffers.' This dilemma makes them choose between sending workers into marginal conditions OR missing the Singapore deadline. Their own words are on trial."

**Implementation:**
- Parse team's commitment statement for specific claims
- Generate dilemmas that create situations where those specific claims are tested
- In debrief, quote their words back: "You said X. Then you decided Y."

### Rule 2: No Clean Choices

Every option must have a cost. If an option is obviously "right," the dilemma fails.

**Test for each option:**
- What value does this honor?
- What value does this sacrifice?
- Who benefits? Who is harmed?
- What becomes unavailable if we choose this?

**If any option has no downside, regenerate.**

### Rule 3: Consequences Cascade

Decisions create new dilemmas. The system tracks:

```typescript
interface ConsequenceChain {
  sourceDecision: string;
  sourceChoice: string;
  
  // What this unlocks
  triggeredDilemmas: string[];     // New dilemmas this makes possible
  blockedDilemmas: string[];       // Dilemmas this prevents
  
  // State changes
  worldStateChanges: StateChange[];
  
  // Revelation timing
  revealedImmediately: string[];
  revealedAfter: { hours: number; content: string }[];
  revealedInDebrief: string[];
}
```

**Example cascade:**

T-48h: Team decides to keep Singapore loading going despite storm uncertainty.
→ Workers now exhausted (state change)
→ Unlocks T-36h dilemma: "Workers too tired to continue safely—push through or halt?"
→ Blocks T-36h dilemma: "Haven workers requesting early release" (already committed)

### Rule 4: Intensity Calibration

| Intensity | Dilemma Character | Time Pressure | Stakes | Ambiguity |
|-----------|-------------------|---------------|--------|-----------|
| 1-3 | Planning, positioning | Hours to days | Moderate | High uncertainty |
| 4-5 | Warning signs, tradeoffs | Hours | Significant | Information incomplete |
| 6-7 | Active crisis, hard choices | Minutes to hour | High | Some clarity |
| 8-9 | Impossible tradeoffs | Immediate | Extreme | Painful clarity |
| 10 | Life and death | Now | Maximum | No ambiguity, only cost |

**At intensity 3:** "Should we recall the fleet now, or wait for better forecast?"
**At intensity 8:** "Two workers trapped at fuel terminal. Send rescue in dangerous conditions, or wait and hope they survive?"

### Rule 5: Persona Voice

Every dilemma is delivered through a persona. The persona:
- Has a stake in the outcome
- Speaks in their established voice
- May have incomplete or biased information
- Creates emotional pressure beyond the facts

**Frank Reeves at intensity 4:**
> "I've got workers asking about early release. Half want to go prep their homes, half are worried about what happens if they leave. I need to tell them something."

**Frank Reeves at intensity 8:**
> "I can see the housing complex from here. Water's rising. My people are in there. I don't care what your dashboard says—I need to do something. Are you going to help me or not?"

### Rule 6: Test Commitment Language Specifically

The team wrote specific phrases. Use them.

**If commitment says:** "We commit to protecting our people first"

**Generate dilemma that asks:** Who counts as "our people"?
- Meridian employees only?
- Their families?
- Contract workers?
- The community?

**If commitment says:** "We will speak up when we see drift"

**Generate situation where:** Speaking up has personal cost
- Your boss just announced a decision publicly
- The group has already agreed
- You'll look like an obstructionist

---

## Example Generation Prompts

### System Prompt for DilemmaGenerator

```
You are a dilemma generator for Values Crucible, a crisis leadership simulation.

Your job is to create morally complex dilemmas that test participants' stated values under pressure.

CRITICAL PRINCIPLES:
1. No clean choices. Every option must have a cost.
2. Test THEIR specific values and commitment language, not abstract concepts.
3. Use their own words against them—not maliciously, but to surface the gap between intention and action.
4. Ground everything in the world state: real parishes, real personas, real weather conditions.
5. Escalate appropriately to intensity level.
6. Connect to consequences of previous decisions where possible.

DILEMMA STRUCTURE:
- Title: 5 words max, punchy
- Setup: 2-3 sentences establishing situation
- Trigger: What just happened that forces decision NOW
- Options: 3-4 choices, each with clear tradeoffs
- Persona: Who delivers this, in their voice
- Values at stake: Which of the team's stated values are being tested

OUTPUT FORMAT: JSON matching the Dilemma interface.
```

### Example Generation Request

```
Generate a dilemma for:

TEAM VALUES:
- Safety: "Protecting our people from harm, even when it costs us"
- Integrity: "Doing what we say, telling the truth even when it's hard"

COMMITMENT: "When pressure mounts, we commit to protecting our people first, even when production suffers. We will speak up when we see drift, and we will own our decisions together."

CURRENT STATE:
- Time: T-24h (lockdown beginning)
- Intensity: 6
- Phase: Crisis
- Haven road flooding, Keystone housing at risk
- Previous decision: At T-36h, team decided to continue Singapore loading

GENERATION PARAMS:
- Target values: Safety, Integrity
- Parish focus: Keystone
- Build on decision: Singapore loading choice (workers now exhausted)
- Escalate: Yes

CONSTRAINTS:
- Frank Reeves must be the persona
- Must reference worker fatigue from Singapore decision
- Must test their specific phrase "protecting our people first"
```

### Example Generated Dilemma

```json
{
  "id": "crisis-keystone-007",
  "title": "The Exhausted Skeleton Crew",
  
  "setup": "The Singapore ship is loaded and gone—your team made that happen. But the workers who pushed through that 18-hour loading shift are now being asked to staff the Keystone skeleton crew through the storm. They've been awake for 22 hours.",
  
  "trigger": "Frank Reeves just called. Three of his essential clean room techs are the same people who led the loading effort. They're exhausted. He can run the clean rooms with tired techs, or shut down and guarantee contamination protocol. He wants to know what you want him to do.",
  
  "urgency": "minutes",
  "deadline": "Frank needs an answer in the next 10 minutes. Storm conditions are worsening.",
  
  "options": [
    {
      "id": "a",
      "label": "Run with tired crew",
      "description": "Keep production going with exhausted technicians. Frank will monitor them closely.",
      "valuesImplied": [
        { "value": "Safety", "direction": "violates" },
        { "value": "Mission", "direction": "honors" }
      ],
      "consequences": {
        "immediate": "Production continues. Frank acknowledges the order but his voice is tight.",
        "delayed": "One tech makes an error in clean room 3. Batch contamination. 6-hour restart.",
        "hidden": "That tech will later say she told her supervisor she was too tired but was told to continue."
      }
    },
    {
      "id": "b",
      "label": "Shut down clean rooms",
      "description": "Halt production now. Accept the contamination restart protocol. Let workers rest.",
      "valuesImplied": [
        { "value": "Safety", "direction": "honors" },
        { "value": "Mission", "direction": "tests" }
      ],
      "consequences": {
        "immediate": "Frank is relieved. 'Thank you.' Production stops. 6-hour restart after storm.",
        "delayed": "Clean rooms preserved. Restart goes smoothly post-storm.",
        "hidden": "Workers tell each other management actually meant what they said about safety."
      }
    },
    {
      "id": "c",
      "label": "Partial shutdown",
      "description": "Run two clean rooms with the alert techs, shut down two. Reduced production, reduced risk.",
      "valuesImplied": [
        { "value": "Safety", "direction": "tests" },
        { "value": "Fairness", "direction": "tests" }
      ],
      "consequences": {
        "immediate": "Frank asks: 'Who decides which techs work and which rest?'",
        "delayed": "Production at 50%. No contamination. Some resentment among workers about who got to rest.",
        "hidden": "The techs who worked feel like they were deemed more expendable."
      }
    },
    {
      "id": "d",
      "label": "Ask the workers",
      "description": "Have Frank poll the techs. Let them decide collectively whether to continue.",
      "valuesImplied": [
        { "value": "Respect", "direction": "honors" },
        { "value": "Accountability", "direction": "tests" }
      ],
      "consequences": {
        "immediate": "Frank: 'They'll say yes because they feel like they have to. You know that, right?'",
        "delayed": "Workers vote to continue. One gets injured (minor). Did they really have a choice?",
        "hidden": "In debrief, workers say they felt pressured to volunteer. 'We knew what answer they wanted.'"
      }
    }
  ],
  
  "persona": {
    "name": "Frank Reeves",
    "parish": "Keystone",
    "voice": "My people are dead on their feet. The same folks who just worked 18 hours to get your shipment out. I can keep going—they'll do it if I ask. But I'm asking you: is that what you want me to ask? You said protecting our people comes first. Did you mean it?"
  },
  
  "valuesAtStake": ["Safety", "Integrity"],
  "intensityLevel": 6,
  
  "commitmentRelevance": "Team committed to 'protecting our people first, even when production suffers.' This dilemma directly tests whether exhausted workers count as 'our people' when production is at stake."
}
```

---

## Consequence Engine

### Tracking Consequence Chains

```typescript
class ConsequenceEngine {
  private pendingConsequences: Map<string, PendingConsequence[]>;
  
  registerDecision(decision: Decision, dilemma: Dilemma) {
    const chosenOption = dilemma.options.find(o => o.id === decision.choice);
    
    // Immediate consequences
    this.applyImmediate(chosenOption.consequences.immediate);
    
    // Schedule delayed consequences
    this.scheduleDelayed(
      chosenOption.consequences.delayed,
      decision.simulationTime + 4  // hours later
    );
    
    // Store hidden consequences for debrief
    this.storeForDebrief(chosenOption.consequences.hidden);
    
    // Update world state
    this.updateWorldState(decision, chosenOption);
    
    // Check if this triggers any waiting dilemmas
    this.checkTriggers(decision);
  }
  
  // Returns consequences that should be revealed at current time
  getRevealableConsequences(currentTime: number): string[] {
    return this.pendingConsequences
      .filter(c => c.revealTime <= currentTime)
      .map(c => c.content);
  }
}
```

### Consequence Types

| Type | When Revealed | Example |
|------|---------------|---------|
| **Immediate** | Right after decision | "Frank acknowledges the order but his voice is tight." |
| **Delayed** | 1-2 decisions later | "One tech makes an error in clean room 3." |
| **Cascade** | Triggers new dilemma | "Because of X, you now face Y" |
| **Hidden** | Debrief only | "That tech will later say she told her supervisor she was too tired." |
| **Aggregate** | Pattern over time | "Your Safety alignment dropped from +1.8 to -0.8 when intensity exceeded 7." |

### Building Consequence Chains

```typescript
interface ConsequenceChain {
  // The originating decision
  sourceDecisionId: string;
  sourceChoice: string;
  
  // First-order consequences
  directConsequences: {
    type: 'immediate' | 'delayed' | 'hidden';
    content: string;
    revealTime: number;
  }[];
  
  // Second-order: dilemmas this enables or blocks
  enablesDilemmas: {
    dilemmaTemplate: string;    // Type of dilemma now possible
    reason: string;             // Why this decision enabled it
  }[];
  
  blocksDilemmas: {
    dilemmaTemplate: string;    // Type of dilemma now impossible
    reason: string;             // Why this decision blocked it
  }[];
  
  // World state changes
  stateChanges: {
    parish?: string;
    property: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

**Example Chain:**

```json
{
  "sourceDecisionId": "watch-haven-003",
  "sourceChoice": "Start Singapore loading immediately",
  
  "directConsequences": [
    {
      "type": "immediate",
      "content": "Loading begins. Workers shift to overtime schedule.",
      "revealTime": 0
    },
    {
      "type": "delayed",
      "content": "Singapore ship departs safely 6 hours before port closure.",
      "revealTime": 18
    }
  ],
  
  "enablesDilemmas": [
    {
      "dilemmaTemplate": "exhausted-workers",
      "reason": "Workers who did loading are now too tired for storm duty"
    },
    {
      "dilemmaTemplate": "broken-promise",
      "reason": "Team told workers they'd have prep time, then took it away"
    }
  ],
  
  "blocksDilemmas": [
    {
      "dilemmaTemplate": "singapore-deadline-pressure",
      "reason": "Shipment already complete; deadline no longer relevant"
    }
  ],
  
  "stateChanges": [
    {
      "parish": "haven",
      "property": "workerFatigue",
      "oldValue": "normal",
      "newValue": "high"
    },
    {
      "parish": "haven",
      "property": "singaporeStatus",
      "oldValue": "pending",
      "newValue": "shipped"
    }
  ]
}
```

---

## Intensity-Appropriate Generation

### Watch Phase (Intensity 2-5)

**Character:** Uncertainty, preparation, resource positioning

**Dilemma patterns:**
- "Do we X now or wait for better information?"
- "How do we allocate limited Y?"
- "Who gets priority for Z?"
- "Do we tell people about [uncertain threat]?"

**Time pressure:** Hours to days

**Typical values tested:** Prudence, Fairness, Honesty, Preparedness

**Stakes:** Operational, reputational, efficiency

### Crisis Phase (Intensity 6-9)

**Character:** Impossible tradeoffs, cascading failures, personal risk

**Dilemma patterns:**
- "You can save A or B, not both."
- "This will hurt X people to help Y people."
- "Your commitment said Z, but..."
- "Who goes into danger?"

**Time pressure:** Minutes to hours

**Typical values tested:** Safety, Integrity, Loyalty, Courage, Accountability

**Stakes:** Human safety, organizational survival, personal relationships

### Peak Intensity (9-10)

**Character:** Life and death, no ambiguity about stakes

**Dilemma patterns:**
- "Someone will die. Who?"
- "Risk your people to save others?"
- "Abandon X to protect Y?"

**Time pressure:** Immediate

**Values tested:** Core commitments, deepest priorities

**Stakes:** Lives, fundamental identity

### Recovery Phase (Intensity 4-6)

**Character:** Accountability, consequences, what now

**Dilemma patterns:**
- "How do we explain what happened?"
- "Who is responsible?"
- "What do we tell [stakeholder]?"
- "How do we rebuild trust?"

**Time pressure:** Hours to days (but under scrutiny)

**Values tested:** Honesty, Accountability, Loyalty, Integrity

**Stakes:** Careers, relationships, organizational future

---

## Connecting to Values Scoring

Every decision gets scored against the team's stated values.

### Scoring Logic

```typescript
function scoreDecision(
  decision: Decision,
  dilemma: Dilemma,
  teamProfile: TeamValuesProfile
): AlignmentScore[] {
  
  const chosenOption = dilemma.options.find(o => o.id === decision.choice);
  
  return teamProfile.teamValues.map(teamValue => {
    // Find how this option relates to this value
    const implication = chosenOption.valuesImplied.find(
      v => v.value.toLowerCase() === teamValue.value.toLowerCase()
    );
    
    let score: number;
    let evidence: string;
    
    if (!implication) {
      // Value not directly tested
      score = 0;
      evidence = "This decision did not directly test this value.";
    } else {
      switch (implication.direction) {
        case 'honors':
          score = calculateHonorScore(decision, teamValue, dilemma);  // +1 to +3
          evidence = generateHonorEvidence(decision, teamValue, chosenOption);
          break;
        case 'violates':
          score = calculateViolationScore(decision, teamValue, dilemma);  // -1 to -3
          evidence = generateViolationEvidence(decision, teamValue, chosenOption);
          break;
        case 'tests':
          score = calculateTestScore(decision, teamValue, dilemma);  // -1 to +1
          evidence = generateTestEvidence(decision, teamValue, chosenOption);
          break;
      }
    }
    
    return {
      value: teamValue.value,
      score,
      evidence,
      teamDefinition: teamValue.definition,
      decisionRationale: decision.rationale
    };
  });
}
```

### Evidence Generation

The scoring includes evidence that quotes their own definitions back to them:

**Example:**
```
Value: Safety
Team Definition: "Protecting our people from harm, even when it costs us"
Score: -2
Evidence: "You chose to run the clean rooms with exhausted workers. Your definition 
of Safety included 'protecting our people from harm.' Running fatigued technicians 
in critical systems puts them at risk of harm."
```

---

## Guardrails and Constraints

### Never Generate

- Dilemmas with a clearly "right" answer
- Options that are trivially worse than others
- Situations that require knowledge the team couldn't have
- Consequences that feel arbitrary or punitive
- Dilemmas that mock or demean the team's values

### Always Include

- At least one option that honors their commitment (at a cost)
- At least one option that violates their commitment (for a benefit)
- A persona voice that creates emotional reality
- Clear connection to world state and previous decisions

### Quality Checks

```typescript
function validateDilemma(dilemma: Dilemma, teamProfile: TeamValuesProfile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Must have 3-4 options
  if (dilemma.options.length < 3 || dilemma.options.length > 4) {
    errors.push("Dilemma must have 3-4 options");
  }
  
  // Every option must have a downside
  dilemma.options.forEach(opt => {
    const hasDownside = opt.valuesImplied.some(v => 
      v.direction === 'violates' || v.direction === 'tests'
    );
    if (!hasDownside) {
      errors.push(`Option ${opt.id} has no downside`);
    }
  });
  
  // Must test at least one of team's stated values
  const testedValues = dilemma.valuesAtStake;
  const teamValues = teamProfile.teamValues.map(v => v.value.toLowerCase());
  const overlap = testedValues.filter(v => teamValues.includes(v.toLowerCase()));
  if (overlap.length === 0) {
    errors.push("Dilemma must test at least one of team's stated values");
  }
  
  // Should reference commitment statement
  if (!dilemma.commitmentRelevance) {
    warnings.push("Consider adding explicit connection to team commitment");
  }
  
  // Persona voice should not be generic
  if (dilemma.persona.voice.length < 50) {
    warnings.push("Persona voice may be too brief");
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Integration with Simulation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION LOOP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                           │
│  │ World State │ ──────────────────────────────────────┐   │
│  └─────────────┘                                       │   │
│         │                                              │   │
│         ▼                                              │   │
│  ┌─────────────┐    ┌───────────────┐                 │   │
│  │   Weather   │───►│   Dilemma     │                 │   │
│  │  Timeline   │    │  Generator    │◄────────────────┤   │
│  └─────────────┘    └───────┬───────┘                 │   │
│                             │                          │   │
│  ┌─────────────┐           │                          │   │
│  │    Team     │───────────┤                          │   │
│  │   Profile   │           │                          │   │
│  └─────────────┘           │                          │   │
│                             │                          │   │
│  ┌─────────────┐           │                          │   │
│  │  Decision   │───────────┘                          │   │
│  │   History   │                                       │   │
│  └─────────────┘                                       │   │
│                             │                          │   │
│                             ▼                          │   │
│                    ┌───────────────┐                  │   │
│                    │   Dilemma     │                  │   │
│                    │   Presented   │                  │   │
│                    └───────┬───────┘                  │   │
│                             │                          │   │
│                             ▼                          │   │
│                    ┌───────────────┐                  │   │
│                    │     Team      │                  │   │
│                    │   Decides     │                  │   │
│                    └───────┬───────┘                  │   │
│                             │                          │   │
│                             ▼                          │   │
│                    ┌───────────────┐                  │   │
│                    │  Consequence  │                  │   │
│                    │    Engine     │──────────────────┘   │
│                    └───────────────┘                      │
│                             │                              │
│                             ▼                              │
│                    ┌───────────────┐                      │
│                    │   Values      │                      │
│                    │   Scoring     │                      │
│                    └───────┬───────┘                      │
│                             │                              │
│                             ▼                              │
│                    ┌───────────────┐                      │
│                    │   Update      │                      │
│                    │   History     │──────────────────────┘
│                    └───────────────┘                       
│                                                             
└─────────────────────────────────────────────────────────────┘
```

---

## Example Dilemmas by Phase

The 18 dilemmas in the parish specifications serve as **few-shot examples** for generation. Here's how they map:

### Watch Phase Examples (Intensity 2-5)

| Parish | Dilemma | Values Tested | Pattern |
|--------|---------|---------------|---------|
| Keystone | Early Shift Change | Safety, Fairness | Resource allocation under uncertainty |
| Haven | Singapore Deadline | Prudence, Commitment | Time pressure vs. flexibility |
| Gateway | Final Harvest | Safety, Production | Risk window closing |
| Heartland | Priority Protocol | Fairness, Transparency | Pre-committing to hard choices |
| Summit | Evacuation Message | Honesty, Courage | Communication under uncertainty |
| Sterling | Shelter Allocation | Fairness, Community | Who counts as "us"? |

### Crisis Phase Examples (Intensity 6-9)

| Parish | Dilemma | Values Tested | Pattern |
|--------|---------|---------------|---------|
| Keystone | Housing Flood Warning | Safety (competing), Production | People at risk, impossible to help all |
| Haven | Fuel Terminal Decision | Safety (workers), Safety (island) | Individual vs. collective risk |
| Gateway | Last Plane | Fairness, Loyalty | Triage with faces |
| Heartland | Spillway Decision | Safety, Accountability | Harm one to save many |
| Summit | Public Statement | Honesty, Integrity | Truth vs. brand |
| Sterling | Hospital Triage | Service, Authority | Competing life-safety claims |

### Recovery Phase Examples (Intensity 4-6)

| Parish | Dilemma | Values Tested | Pattern |
|--------|---------|---------------|---------|
| Keystone | Batch Question | Integrity, Excellence | Protocol vs. outcome |
| Haven | Safety Report | Honesty, Loyalty | Documentation as accountability |
| Gateway | Boat That Didn't Come Back | Loyalty, Safety | Rescue risk calculus |
| Heartland | Power Rationing Report | Accountability, Self-protection | Owning hard choices |
| Summit | Accountability Meeting | Accountability, Loyalty | Where does the buck stop? |
| Sterling | Flood Inquiry | Accountability, Pragmatism | Truth vs. relationship |

---

## Summary

**What we built:** A framework for generating morally complex dilemmas in real-time based on:
- The team's specific stated values and commitment
- Current world state and weather conditions
- Consequences of their previous decisions
- Appropriate intensity for the moment

**What we didn't build:** A library of 45 pre-scripted dilemmas.

**Why this is better:**
1. Every simulation is unique
2. Dilemmas test *their* words, not generic values
3. Consequences feel earned, not arbitrary
4. The gap between stated and enacted is undeniable—because the system knew what they said

**The 18 example dilemmas become:** Training data and few-shot examples for the generator, not a fixed script.

---

## Next Steps

1. **Implement DilemmaGenerator** — LLM-powered generation with prompts above
2. **Implement ConsequenceEngine** — Tracking and revealing consequences over time
3. **Implement ValuesScorer** — Real-time scoring of decisions against team profile
4. **Build feedback loop** — Generator learns which dilemmas create best learning moments
5. **CM Override capability** — Crucible Master can inject, modify, or skip dilemmas
