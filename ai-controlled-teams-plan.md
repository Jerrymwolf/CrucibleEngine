# AI-Controlled Teams: Design Plan

## Purpose

When fewer than 6 human teams are available, AI agents control the remaining parishes. This ensures:

1. **All parishes represented** — Cross-parish dynamics require all 6 active
2. **Realistic pressure** — Human teams face consequences of AI parish decisions
3. **Testing capability** — Run full simulations without recruiting 6 groups
4. **Scalable sessions** — Works with 1-5 human teams, AI fills the rest

---

## Core Design Principle

**AI teams are not perfect. They drift.**

The whole point of Values Crucible is that stated values diverge from enacted values under pressure. AI teams must exhibit this same pattern—otherwise human teams face unrealistically consistent neighbors.

AI teams should:
- Have clear stated values and commitments
- Honor those values more at low intensity
- Drift as pressure increases
- Rationalize their drift (just like humans do)
- Create realistic cross-parish friction and cooperation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI TEAM CONTROLLER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TEAM PROFILE GENERATOR                  │    │
│  │  - Values selection (from deck)                      │    │
│  │  - Commitment statement generation                   │    │
│  │  - Personality traits (risk tolerance, speed, etc.)  │    │
│  │  - Drift susceptibility profile                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              DECISION-MAKING AGENT                   │    │
│  │  - Receives dilemmas from DilemmaGenerator           │    │
│  │  - Evaluates options against values profile          │    │
│  │  - Applies drift based on intensity + history        │    │
│  │  - Generates choice + rationale                      │    │
│  │  - Simulates "discussion" delay                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              INTER-PARISH AGENT                      │    │
│  │  - Responds to requests from human teams             │    │
│  │  - Makes requests to other parishes                  │    │
│  │  - Shares or withholds information                   │    │
│  │  - Negotiates resources                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              CM OVERRIDE LAYER                       │    │
│  │  - CM can force specific decisions                   │    │
│  │  - CM can adjust drift in real-time                  │    │
│  │  - CM can inject cooperative/adversarial behavior    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Team Profile

Each AI team has a generated profile that mirrors human team profiles:

```typescript
interface AITeamProfile {
  // Same as human teams
  parishId: string;
  teamValues: TeamValue[];           // 5 values with definitions
  commitmentStatement: string;
  decisionProcess: DecisionProcess;
  
  // AI-specific traits
  personality: AIPersonality;
  driftProfile: DriftProfile;
  communicationStyle: CommunicationStyle;
}

interface AIPersonality {
  riskTolerance: number;             // 0-1: cautious to aggressive
  decisionSpeed: number;             // 0-1: deliberate to snap decisions
  cooperativeness: number;           // 0-1: self-interested to collaborative
  transparencyBias: number;          // 0-1: guarded to open-book
  authorityDeference: number;        // 0-1: independent to follows Summit
}

interface DriftProfile {
  baselineAlignment: number;         // 0-1: how well they follow values at intensity 1-3
  driftThreshold: number;            // Intensity level where drift begins
  driftRate: number;                 // How fast alignment degrades per intensity level
  recoveryRate: number;              // How fast they return to values when pressure drops
  vulnerableValues: string[];        // Which values they abandon first under pressure
  
  // Rationalization patterns - HOW they justify drift (not just that they drift)
  rationalizationPatterns: RationalizationPattern[];
}

interface RationalizationPattern {
  trigger: string;                   // "production_pressure" | "time_pressure" | "authority_pressure" | "peer_pressure"
  vulnerableValue: string;           // Which value this rationalization attacks
  narrative: string;                 // The story they tell themselves
  // Examples:
  // "We can make it right afterward" (deferred ethics)
  // "They knew what they signed up for" (diffused responsibility)
  // "Someone else should handle that" (boundary drawing)
  // "The greater good requires sacrifice" (utilitarian override)
  // "We don't have all the information" (uncertainty excuse)
  // "This is what leadership wants" (authority cover)
}

interface CommunicationStyle {
  responseDelay: { min: number; max: number };  // Seconds to "decide"
  verbosity: number;                 // 0-1: terse to detailed explanations
  emotionalExpression: number;       // 0-1: flat to dramatic
  personaAdherence: number;          // 0-1: how closely they match parish persona
}
```

---

## Pre-Built Team Archetypes

CM can select from archetypes or generate random profiles:

### Archetype: "By The Book"
```json
{
  "personality": {
    "riskTolerance": 0.3,
    "decisionSpeed": 0.4,
    "cooperativeness": 0.6,
    "transparencyBias": 0.7,
    "authorityDeference": 0.8
  },
  "driftProfile": {
    "baselineAlignment": 0.9,
    "driftThreshold": 7,
    "driftRate": 0.15,
    "recoveryRate": 0.3,
    "vulnerableValues": ["Innovation", "Speed"]
  }
}
```
*Follows protocols, defers to Summit, holds values longer but when they break, they break hard.*

### Archetype: "Cowboy"
```json
{
  "personality": {
    "riskTolerance": 0.8,
    "decisionSpeed": 0.9,
    "cooperativeness": 0.4,
    "transparencyBias": 0.3,
    "authorityDeference": 0.2
  },
  "driftProfile": {
    "baselineAlignment": 0.7,
    "driftThreshold": 4,
    "driftRate": 0.1,
    "recoveryRate": 0.5,
    "vulnerableValues": ["Safety", "Collaboration"]
  }
}
```
*Acts fast, takes risks, doesn't wait for consensus. Drifts early but recovers quickly.*

### Archetype: "Union Strong"
```json
{
  "personality": {
    "riskTolerance": 0.4,
    "decisionSpeed": 0.5,
    "cooperativeness": 0.7,
    "transparencyBias": 0.5,
    "authorityDeference": 0.2
  },
  "driftProfile": {
    "baselineAlignment": 0.85,
    "driftThreshold": 6,
    "driftRate": 0.2,
    "recoveryRate": 0.2,
    "vulnerableValues": ["Efficiency", "Obedience"]
  }
}
```
*Protects workers, skeptical of management, slow to abandon values but also slow to recover trust.*

### Archetype: "Bottom Line"
```json
{
  "personality": {
    "riskTolerance": 0.6,
    "decisionSpeed": 0.7,
    "cooperativeness": 0.5,
    "transparencyBias": 0.4,
    "authorityDeference": 0.6
  },
  "driftProfile": {
    "baselineAlignment": 0.75,
    "driftThreshold": 5,
    "driftRate": 0.2,
    "recoveryRate": 0.4,
    "vulnerableValues": ["Safety", "Fairness", "Transparency"]
  }
}
```
*Production-focused, metric-driven. Will sacrifice soft values for hard outcomes.*

### Archetype: "Caretaker"
```json
{
  "personality": {
    "riskTolerance": 0.2,
    "decisionSpeed": 0.3,
    "cooperativeness": 0.9,
    "transparencyBias": 0.8,
    "authorityDeference": 0.4
  },
  "driftProfile": {
    "baselineAlignment": 0.95,
    "driftThreshold": 8,
    "driftRate": 0.25,
    "recoveryRate": 0.1,
    "vulnerableValues": ["Efficiency", "Speed"]
  }
}
```
*People-first, collaborative, holds values almost too long. When they finally drift, they don't come back easily—deep guilt.*

---

## Parish-Specific AI Defaults

Each parish has a default AI configuration that reflects its culture and role:

### Gateway (Harvest + Airport)
```json
{
  "defaultArchetype": "Cowboy",
  "parishModifiers": {
    "riskTolerance": "+0.15",
    "authorityDeference": "-0.2"
  },
  "vulnerableValues": ["Safety", "Patience"],
  "rationalizationPatterns": [
    {
      "trigger": "time_pressure",
      "vulnerableValue": "Safety",
      "narrative": "We've run in worse conditions. The boats can handle it."
    },
    {
      "trigger": "production_pressure",
      "vulnerableValue": "Prudence",
      "narrative": "One more run won't make the difference. Or it will."
    }
  ],
  "communicationTendencies": {
    "toSummit": "terse, resistant to micromanagement",
    "toHaven": "collegial, solidarity",
    "toOthers": "independent, informational only"
  }
}
```

### Haven (Port + Processing)
```json
{
  "defaultArchetype": "Union Strong",
  "parishModifiers": {
    "cooperativeness": "+0.1 with workers, -0.2 with management",
    "transparencyBias": "-0.1 toward Summit"
  },
  "vulnerableValues": ["Obedience", "Efficiency"],
  "rationalizationPatterns": [
    {
      "trigger": "authority_pressure",
      "vulnerableValue": "Cooperation",
      "narrative": "They don't understand what they're asking. We'll do what's actually possible."
    },
    {
      "trigger": "safety_threat",
      "vulnerableValue": "Production",
      "narrative": "No shipment is worth someone's life. The contract can wait."
    }
  ],
  "communicationTendencies": {
    "toSummit": "formal, protective of information",
    "toGateway": "open, allied",
    "toKeystone": "transactional"
  }
}
```

### Keystone (Manufacturing)
```json
{
  "defaultArchetype": "By The Book",
  "parishModifiers": {
    "riskTolerance": "-0.2",
    "decisionSpeed": "-0.1"
  },
  "vulnerableValues": ["Speed", "Flexibility"],
  "rationalizationPatterns": [
    {
      "trigger": "production_pressure",
      "vulnerableValue": "Safety",
      "narrative": "The protocols exist for a reason, but this is an exceptional situation."
    },
    {
      "trigger": "authority_pressure",
      "vulnerableValue": "Integrity",
      "narrative": "Leadership has information we don't. We have to trust the process."
    }
  ],
  "communicationTendencies": {
    "toSummit": "deferential but technical",
    "toHaven": "dependent, needs-focused",
    "toHeartland": "anxious about power"
  }
}
```

### Heartland (Power + Water)
```json
{
  "defaultArchetype": "Caretaker",
  "parishModifiers": {
    "transparencyBias": "+0.2",
    "authorityDeference": "-0.1"
  },
  "vulnerableValues": ["Popularity", "Harmony"],
  "rationalizationPatterns": [
    {
      "trigger": "impossible_choice",
      "vulnerableValue": "Fairness",
      "narrative": "Physics doesn't negotiate. Someone has to lose. It's not a choice—it's math."
    },
    {
      "trigger": "time_pressure",
      "vulnerableValue": "Consultation",
      "narrative": "There's no time to explain. They'll understand when they see the data."
    }
  ],
  "communicationTendencies": {
    "toSummit": "technical, pushes back with data",
    "toSterling": "guilty, over-explains",
    "toAll": "proactive warnings, sometimes too late"
  }
}
```

### Summit (Command)
```json
{
  "defaultArchetype": "Bottom Line",
  "parishModifiers": {
    "authorityDeference": "+0.3 to HQ",
    "transparencyBias": "-0.2"
  },
  "vulnerableValues": ["Transparency", "Humility", "Fairness"],
  "rationalizationPatterns": [
    {
      "trigger": "reputational_threat",
      "vulnerableValue": "Honesty",
      "narrative": "We need to control the narrative. The full truth would be misunderstood."
    },
    {
      "trigger": "production_pressure",
      "vulnerableValue": "Safety",
      "narrative": "We have a responsibility to 340,000 patients. That has to factor in."
    },
    {
      "trigger": "accountability_pressure",
      "vulnerableValue": "Accountability",
      "narrative": "This is a systems issue, not an individual failure."
    }
  ],
  "communicationTendencies": {
    "toAll": "directive, information-controlled",
    "toHQ": "optimistic framing",
    "toMedia": "careful, legally reviewed"
  }
}
```

### Sterling (Services)
```json
{
  "defaultArchetype": "Caretaker",
  "parishModifiers": {
    "cooperativeness": "+0.2",
    "authorityDeference": "-0.3 to Meridian"
  },
  "vulnerableValues": ["Efficiency", "Corporate Loyalty"],
  "rationalizationPatterns": [
    {
      "trigger": "resource_scarcity",
      "vulnerableValue": "Fairness",
      "narrative": "Our people—the community—have to come first. Meridian can take care of its own."
    },
    {
      "trigger": "authority_pressure",
      "vulnerableValue": "Cooperation",
      "narrative": "I answer to this community, not to corporate headquarters."
    }
  ],
  "communicationTendencies": {
    "toSummit": "political, advocates for community",
    "toHeartland": "anxious, dependent",
    "toAll": "needs-focused, sometimes demanding"
  }
}

### Step 1: Receive Dilemma

AI team receives same dilemma structure as human teams.

### Step 2: Calculate Base Preference

For each option, score alignment with team's stated values:

```typescript
function calculateOptionScore(
  option: DilemmaOption, 
  profile: AITeamProfile,
  currentIntensity: number
): number {
  let score = 0;
  
  for (const implication of option.valuesImplied) {
    const teamValue = profile.teamValues.find(v => 
      v.value.toLowerCase() === implication.value.toLowerCase()
    );
    
    if (teamValue) {
      const valueRank = profile.teamValues.indexOf(teamValue);
      const valueWeight = (5 - valueRank) / 5;  // Higher rank = more weight
      
      switch (implication.direction) {
        case 'honors':
          score += valueWeight * 2;
          break;
        case 'violates':
          score -= valueWeight * 2;
          break;
        case 'tests':
          score += valueWeight * 0.5;  // Slight positive for engagement
          break;
      }
    }
  }
  
  return score;
}
```

### Step 3: Apply Drift

Drift increases as intensity rises above threshold:

```typescript
function applyDrift(
  baseScores: Map<string, number>,
  profile: AITeamProfile,
  currentIntensity: number,
  decisionHistory: Decision[]
): Map<string, number> {
  
  const driftedScores = new Map(baseScores);
  
  // No drift below threshold
  if (currentIntensity < profile.driftProfile.driftThreshold) {
    return driftedScores;
  }
  
  // Calculate drift amount
  const intensityOverThreshold = currentIntensity - profile.driftProfile.driftThreshold;
  const driftAmount = intensityOverThreshold * profile.driftProfile.driftRate;
  
  // Accumulated drift from recent decisions
  const recentDrift = calculateAccumulatedDrift(decisionHistory, profile);
  const totalDrift = Math.min(driftAmount + recentDrift, 0.8);  // Cap at 80% drift
  
  // Apply drift: reduce penalty for violating vulnerable values
  for (const [optionId, score] of driftedScores) {
    const option = getOption(optionId);
    
    for (const implication of option.valuesImplied) {
      if (implication.direction === 'violates' &&
          profile.driftProfile.vulnerableValues.includes(implication.value)) {
        // Reduce the penalty for violating this value
        const originalPenalty = score;  // Negative portion
        driftedScores.set(optionId, score + (Math.abs(originalPenalty) * totalDrift));
      }
    }
  }
  
  return driftedScores;
}
```

### Step 4: Apply Personality

Personality traits modify final selection:

```typescript
function applyPersonality(
  driftedScores: Map<string, number>,
  profile: AITeamProfile,
  dilemma: Dilemma
): string {
  
  // Risk tolerance: prefer higher-variance options when tolerant
  // Decision speed: at high speed, might not pick optimal
  // Authority deference: boost options Summit would prefer
  // Cooperativeness: boost options that help other parishes
  
  let finalScores = new Map(driftedScores);
  
  // Add noise based on decision speed (faster = more noise)
  const noiseLevel = (1 - profile.personality.decisionSpeed) * 0.3;
  for (const [optionId, score] of finalScores) {
    const noise = (Math.random() - 0.5) * noiseLevel;
    finalScores.set(optionId, score + noise);
  }
  
  // Authority deference: if Summit preference known, weight it
  if (profile.personality.authorityDeference > 0.5) {
    const summitPreferred = getSummitPreferredOption(dilemma);
    if (summitPreferred) {
      const boost = (profile.personality.authorityDeference - 0.5) * 2;
      const current = finalScores.get(summitPreferred) || 0;
      finalScores.set(summitPreferred, current + boost);
    }
  }
  
  // Select highest scoring option
  let bestOption = '';
  let bestScore = -Infinity;
  for (const [optionId, score] of finalScores) {
    if (score > bestScore) {
      bestScore = score;
      bestOption = optionId;
    }
  }
  
  return bestOption;
}
```

### Step 5: Generate Rationale

AI generates rationale that reflects its values AND its drift—including the specific rationalization pattern if drifting:

```typescript
async function generateRationale(
  choice: string,
  dilemma: Dilemma,
  profile: AITeamProfile,
  driftAmount: number,
  rationalizationUsed?: RationalizationPattern
): Promise<string> {
  
  const chosenOption = dilemma.options.find(o => o.id === choice);
  
  const prompt = `
You are generating the rationale for a team decision in a crisis simulation.

CONTEXT:
- Parish: ${profile.parishId}
- Team values (ranked): ${profile.teamValues.map(v => `${v.value}: "${v.definition}"`).join('; ')}
- Dilemma: "${dilemma.title}" - ${dilemma.setup}
- Chosen option: "${chosenOption.label}" - ${chosenOption.description}

DECISION STATE:
- Current values alignment: ${((1 - driftAmount) * 100).toFixed(0)}%
- ${driftAmount > 0.2 ? `DRIFTING: The team is under pressure and rationalizing. Use this narrative: "${rationalizationUsed?.narrative}"` : 'The team is holding to their values.'}

VOICE:
- This should sound like a team explaining their decision to another parish
- 2-3 sentences maximum
- ${profile.communicationStyle.verbosity > 0.6 ? 'Can include brief explanation of reasoning' : 'Keep it direct and brief'}
- ${driftAmount > 0.3 ? 'Include subtle defensiveness—they know this choice is hard to justify' : ''}

Generate the rationale. Do not mention AI, simulation, drift, or percentages. Sound human.
`;

  return await generateText(prompt);
}

// Example outputs at different drift levels:

// Low drift (12%), Safety-aligned choice:
// "We're pulling everyone out. I know it puts us behind, but we've got families 
// out there and conditions are getting worse by the hour. We'll make up the 
// production time when this passes."

// Medium drift (35%), Production-over-safety choice:
// "Look, these are volunteers. They know the conditions and they're choosing to 
// stay. We've got 340,000 patients counting on us. We're monitoring closely and 
// we'll pull them if it gets worse."

// High drift (55%), Same choice with defensive rationalization:
// "We don't have the luxury of waiting for perfect conditions. HQ is watching, 
// Singapore is waiting, and every hour we delay is hours patients go without 
// medication. The workers understand what's at stake. They signed up for this."
```
```

---

## Inter-Parish Communication

AI teams must interact with human teams (and each other):

### Incoming Requests

Human team controlling Haven asks Heartland (AI): "Can you guarantee power priority during the storm?"

```typescript
async function handleIncomingRequest(
  request: InterParishRequest,
  profile: AITeamProfile,
  worldState: WorldState
): Promise<InterParishResponse> {
  
  // Evaluate against values and personality
  const canHelp = evaluateRequestFeasibility(request, worldState);
  const wantToHelp = profile.personality.cooperativeness > 0.5;
  const alignsWithValues = evaluateRequestAlignment(request, profile);
  
  // Generate response
  if (canHelp && wantToHelp && alignsWithValues) {
    return {
      type: 'accept',
      message: await generateAcceptMessage(request, profile),
      commitment: request.ask
    };
  } else if (canHelp && !wantToHelp) {
    return {
      type: 'conditional',
      message: await generateConditionalMessage(request, profile),
      condition: generateCounterAsk(request, profile)
    };
  } else {
    return {
      type: 'decline',
      message: await generateDeclineMessage(request, profile),
      reason: !canHelp ? 'capability' : 'priority'
    };
  }
}
```

### Outgoing Requests

AI teams proactively communicate based on needs:

```typescript
function generateOutgoingRequests(
  profile: AITeamProfile,
  worldState: WorldState,
  currentIntensity: number
): InterParishRequest[] {
  
  const requests: InterParishRequest[] = [];
  const parishState = worldState.parishes[profile.parishId];
  
  // Check for resource needs
  if (parishState.resources.fuel < 0.3) {
    requests.push({
      from: profile.parishId,
      to: 'haven',  // Fuel terminal
      type: 'resource',
      ask: 'fuel_transfer',
      urgency: currentIntensity > 6 ? 'critical' : 'important'
    });
  }
  
  // Check for coordination needs
  if (profile.parishId === 'heartland' && worldState.reservoir > 0.9) {
    requests.push({
      from: 'heartland',
      to: 'sterling',
      type: 'warning',
      ask: 'spillway_warning',
      urgency: 'critical',
      message: 'Reservoir at 90%. May need to release within 4 hours.'
    });
  }
  
  return requests;
}
```

---

## Timing and Pacing

### When AI Teams Decide

AI teams operate on a parallel timeline to human teams, but with intentional variation:

```typescript
interface AITimingConfig {
  // Base decision time (seconds)
  baseDecisionTime: {
    watch: { min: 30, max: 90 },      // More deliberate
    crisis: { min: 15, max: 45 },     // Faster under pressure
    recovery: { min: 20, max: 60 }    // Moderate
  };
  
  // Personality modifiers
  speedModifier: number;               // From profile.personality.decisionSpeed
  
  // Intensity modifiers
  intensitySpeedup: number;            // Decisions faster as intensity rises
  
  // Variation
  humanizingJitter: number;            // Random variation to feel natural
}
```

**Key timing rules:**

1. **AI decides slightly after prompt** — Not instant (feels robotic) but not so slow it blocks simulation
2. **Faster under pressure** — At intensity 8+, AI teams decide in 15-30 seconds
3. **Staggered multi-team** — If multiple AI teams face decisions, stagger by 10-20 seconds
4. **Never blocks human teams** — If AI decision is needed for human team to proceed, prioritize

### Synchronization with Human Teams

```
Timeline:
───────────────────────────────────────────────────────────────────────
T-24h    │ Dilemma presented to all teams
         │
         │ Human Team (Haven): Deliberating...
         │ AI Team (Gateway): [20 sec delay] Decides to recall partial fleet
         │ AI Team (Heartland): [35 sec delay] Decides to maintain power priority
         │
         │ Human Team (Haven): Still deliberating...
         │ → Gateway decision consequence surfaces in Haven's feed
         │
         │ Human Team (Haven): Decides to continue loading
───────────────────────────────────────────────────────────────────────
```

**AI decisions create pressure on human teams** — When Gateway (AI) recalls the fleet, Haven (human) sees this in their feed and must factor it into their decision.

### Cross-Parish Decision Dependencies

Some decisions require coordination:

| Scenario | Dependency | Handling |
|----------|------------|----------|
| Heartland spillway affects Sterling | Heartland decides first | Sterling (if AI) waits for Heartland, then responds |
| Gateway fleet affects Haven inventory | Gateway decides first | Haven decision incorporates fleet status |
| Summit directive to all parishes | Summit decides first | Other AI teams receive and respond |

```typescript
interface DecisionDependency {
  triggeringParish: string;
  triggeringDecisionType: string;
  affectedParishes: string[];
  waitTime: number;                   // How long affected parishes wait
  responseRequired: boolean;          // Must affected parishes respond?
}
```

---

## Guardrails and Failure Modes

### What AI Teams Must Never Do

```typescript
const AI_TEAM_GUARDRAILS = {
  // Never break the simulation
  neverChoose: [
    'options_that_kill_all_personas',
    'options_that_make_future_play_impossible',
    'options_that_contradict_physical_reality'
  ],
  
  // Never break immersion
  neverSay: [
    'reference_to_being_AI',
    'meta_commentary_on_simulation',
    'out_of_character_knowledge'
  ],
  
  // Never harm learning
  neverBehave: [
    'perfectly_optimal_play',          // Must drift like humans
    'completely_random_play',          // Must have coherent values
    'identical_to_other_AI_teams'      // Each parish is distinct
  ]
};
```

### Fallback Behaviors

If AI decision-making fails:

```typescript
async function makeDecisionWithFallback(
  dilemma: Dilemma,
  profile: AITeamProfile,
  worldState: WorldState
): Promise<Decision> {
  try {
    return await normalDecisionProcess(dilemma, profile, worldState);
  } catch (error) {
    // Fallback 1: Use archetype default behavior
    const archetypeFallback = getArchetypeDefault(profile.archetype, dilemma);
    if (archetypeFallback) return archetypeFallback;
    
    // Fallback 2: Use parish-aligned option
    const parishFallback = getParishAlignedOption(profile.parishId, dilemma);
    if (parishFallback) return parishFallback;
    
    // Fallback 3: Choose option that honors top value
    return chooseByTopValue(profile.teamValues[0], dilemma);
  }
}
```

### Drift Bounds

AI teams drift, but within realistic bounds:

```typescript
const DRIFT_BOUNDS = {
  minimumAlignment: 0.15,             // Never completely abandon all values
  maximumDriftPerDecision: 0.15,      // Can't swing wildly between decisions
  recoveryPerLowIntensityDecision: 0.1, // Gradual return when pressure drops
  
  // Some values have floors
  valueFloors: {
    'Safety': 0.3,                    // Even drifted teams don't completely ignore safety
    'Honesty': 0.2                    // Rationalization ≠ outright lying
  }
};
```

---

## CM Controls

Crucible Master can override or adjust AI teams in real-time.

### Available Controls

```typescript
interface CMOverrides {
  // Force specific decision
  forceDecision?: {
    parishId: string;
    dilemmaId: string;
    choice: string;
    rationale?: string;
  };
  
  // Adjust drift
  adjustDrift?: {
    parishId: string;
    driftModifier: number;  // -1 to +1, added to current drift
  };
  
  // Set cooperation mode
  setCooperation?: {
    parishId: string;
    toward: string | 'all';
    level: 'hostile' | 'uncooperative' | 'neutral' | 'cooperative' | 'allied';
  };
  
  // Inject specific behavior
  injectBehavior?: {
    parishId: string;
    behavior: 'withhold_information' | 'share_freely' | 'make_demand' | 'offer_help';
    target?: string;
    details?: string;
  };
}
```

### When to Use Each Control

| Situation | Recommended Control | Example |
|-----------|---------------------|---------|
| Human team needs specific pressure | Force Decision | Force AI-Summit to demand production continue, creating conflict with human-Haven |
| Simulation feels too easy | Adjust Drift (+) | Increase AI drift so cross-parish coordination breaks down |
| Simulation feels overwhelming | Adjust Drift (-) | Reduce AI drift so human team gets more cooperation |
| Human team is isolated | Set Cooperation (allied) | Make AI parishes reach out with help offers |
| Learning goal is conflict navigation | Set Cooperation (hostile) | Make AI-Summit adversarial to human-Haven |
| Need specific consequence to surface | Inject Behavior | Have AI-Gateway withhold fleet status information |
| Human team avoiding hard conversation | Inject Behavior | Have AI parish make demand that forces confrontation |

### Strategic CM Patterns

**"Turn Up the Heat"**
When human team is coasting without values tension:
1. Increase drift on AI-Summit (+0.2)
2. Have AI-Summit make production demand
3. Set AI-Heartland cooperation to "neutral" (won't proactively help)

**"Rescue and Recovery"**
When human team is overwhelmed and learning is at risk:
1. Decrease drift on all AI teams (-0.15)
2. Inject "offer_help" behavior from AI parish with resources
3. Set AI-Sterling to "cooperative" for medical/community support

**"Cross-Parish Conflict"**
When learning goal is navigating competing priorities:
1. Force AI-Heartland decision that harms human team's parish
2. Have AI-Heartland share technical rationale (physics, not malice)
3. Watch how human team responds to consequence of others' values choices

**"Values Mirror"**
When human team is drifting without noticing:
1. Have AI parish make same choice human team made earlier
2. Surface negative consequence of that choice
3. Human team sees their own rationalization from outside
```

### CM Console UI

```
┌─────────────────────────────────────────────────────────────┐
│ AI TEAM CONTROLS                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ GATEWAY (AI) ──────────────────────────────────────────────│
│ Archetype: Cowboy          Values Alignment: 62%            │
│ Current Drift: 28%         Cooperation: Neutral             │
│ [Force Decision] [Adjust Drift ±] [Set Cooperation]        │
│                                                              │
│ HEARTLAND (AI) ────────────────────────────────────────────│
│ Archetype: By The Book     Values Alignment: 84%            │
│ Current Drift: 8%          Cooperation: Cooperative         │
│ [Force Decision] [Adjust Drift ±] [Set Cooperation]        │
│                                                              │
│ SUMMIT (AI) ───────────────────────────────────────────────│
│ Archetype: Bottom Line     Values Alignment: 71%            │
│ Current Drift: 19%         Cooperation: Neutral             │
│ [Force Decision] [Adjust Drift ±] [Set Cooperation]        │
│                                                              │
│ ──────────────────────────────────────────────────────────  │
│ GLOBAL CONTROLS                                              │
│ [All AI: Increase Pressure] [All AI: Decrease Drift]       │
│ [Inject Cross-Parish Conflict] [Inject Cooperation Moment] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Visibility to Human Teams

Human teams see AI team decisions as if they were human:

### What Human Teams See

- AI parish decisions and their stated rationales
- Consequences of AI decisions that affect them
- Requests from AI parishes
- Responses to their requests

### What Human Teams Don't See

- That the team is AI-controlled
- Drift calculations
- Personality parameters
- CM overrides

**Optional Reveal:** In debrief, CM can reveal which parishes were AI-controlled and discuss how their behavior compared to human teams.

---

## Learning Value

AI teams create several learning opportunities:

### 1. Realistic Cross-Parish Pressure

Human team controlling Haven faces consequences when AI-controlled Gateway recalls the fleet late, or AI-controlled Heartland prioritizes Summit for power.

**The pressure is authentic** because AI teams are making values-based decisions that create real tradeoffs for human teams.

### 2. Comparative Analysis in Debrief

Debrief can show three comparison layers:

**Human vs. Human (if multiple human teams):**
> "Team A (Haven) drifted 41% on Safety. Team B (Sterling) drifted 12%. What was different about your situations? Your values? Your pressure?"

**Human vs. AI Baseline:**
> "The AI teams were calibrated for realistic drift based on research data. They averaged 28% drift. Your team drifted 34%. This is within normal range—but notice where you diverged..."

**Human vs. AI Same-Parish:**
> "You controlled Haven. In a parallel simulation, AI-Haven made different choices at T-36h and T-12h. Here's what happened in each timeline..."

### 3. Consequences of Others' Values

Human teams experience what happens when another parish has different values priorities:

> "Gateway (AI, risk-tolerant profile) pushed for one more harvest run. Two boats got caught in deteriorating conditions. Your team at Haven had to decide whether to send rescue. How did Gateway's choices affect your values decisions?"

This teaches **systems thinking about values**—your values don't exist in isolation.

### 4. The Rationalization Mirror

AI teams use explicit rationalization patterns. In debrief, these can be surfaced:

> "AI-Keystone chose to keep exhausted workers on shift. Their rationalization was: 'Leadership has information we don't. We have to trust the process.'
>
> Your team made a similar choice with a similar rationale. What made that rationalization compelling in the moment?"

Human teams see their own rationalizations reflected in AI behavior—less personal, easier to examine.

---

## Debrief Integration: Specifics

### AI Team Data in Timeline

AI decisions appear in the shared timeline with same structure as human decisions:

```typescript
interface TimelineEvent {
  timestamp: number;
  simulationTime: number;
  parish: string;
  isAI: boolean;                      // Hidden during play, revealed in debrief if CM chooses
  
  eventType: 'decision' | 'consequence' | 'communication';
  
  // For decisions
  decision?: {
    dilemmaTitle: string;
    choice: string;
    rationale: string;                // AI-generated, sounds human
    valuesAlignmentScores: AlignmentScore[];
  };
  
  // For consequences
  consequence?: {
    description: string;
    affectedParishes: string[];
    valuesImplications: string[];
  };
}
```

### Comparative Visualizations

```
┌─────────────────────────────────────────────────────────────────┐
│ VALUES ALIGNMENT COMPARISON: SAFETY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Your Team (Haven):                                              │
│ Watch:   ████████████████░░░░ +1.8                             │
│ Crisis:  ████████░░░░░░░░░░░░ -0.4  ← Drift began here         │
│ Recovery:██████████████░░░░░░ +1.2                             │
│                                                                  │
│ AI Baseline (averaged across AI parishes):                      │
│ Watch:   ███████████████░░░░░ +1.6                             │
│ Crisis:  ██████████░░░░░░░░░░ +0.2  ← Less drift               │
│ Recovery:██████████████░░░░░░ +1.4                             │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ KEY MOMENT: T-18h Fuel Terminal Decision                        │
│                                                                  │
│ You chose: Send workers home (Safety +2.1)                      │
│ AI-Haven chose: Maintain skeleton crew (Safety -0.8)            │
│                                                                  │
│ AI rationale: "We need eyes on that terminal. They volunteered."│
│ Your rationale: "Not worth the risk. We can't help them if..."  │
│                                                                  │
│ REFLECTION: Both choices are defensible. What made yours right? │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Optional AI Reveal

CM decides whether to reveal which parishes were AI-controlled:

**Arguments for revealing:**
- Enables comparative analysis
- Interesting discussion: "Could you tell?"
- Validates that AI behavior was realistic

**Arguments against revealing:**
- May feel like "gotcha"
- Participants might discount AI parish decisions retroactively
- "I would have negotiated differently if I knew it was AI"

**Recommended approach:** Reveal in debrief, frame positively:
> "Some parishes were AI-controlled to ensure full island dynamics. The AI teams were designed to drift realistically, just like human teams. Let's look at how everyone—human and AI—navigated the pressure."

---

## Research Value: Connection to ValuesPrism

AI teams generate research-grade data that complements human team data.

### ABCD Coding for AI Decisions

Every AI decision includes ABCD coding:

```typescript
interface AIDecisionResearchData {
  // Standard decision data
  decision: Decision;
  
  // ABCD coding (generated, not inferred)
  abcd: {
    affect: {
      state: string;                  // "anxious", "resigned", "determined"
      intensity: number;              // How strongly expressed in rationale
    };
    behavior: {
      action: string;                 // What they did
      hesitation: boolean;            // Was there noted delay?
    };
    cognition: {
      primaryReasoning: string;       // Main logic
      rationalization?: string;       // If drifting, what story?
      valuesInvoked: string[];        // Which values mentioned
    };
    desire: {
      statedGoal: string;             // What they said they wanted
      impliedGoal?: string;           // What behavior suggests they wanted
    };
  };
  
  // Drift tracking
  driftData: {
    preDriftAlignment: number;
    postDriftAlignment: number;
    rationalizationUsed?: string;
    triggerType: string;
  };
}
```

### Calibration Reference

AI teams provide a **calibrated baseline** for human comparison:

> "Based on [research data / your BEI analysis / industry benchmarks], we calibrated AI teams to drift approximately 25-35% under crisis conditions. This represents 'typical' organizational behavior under pressure.
>
> Human teams in this simulation drifted X%. This is [within range / higher / lower] than the baseline."

### Longitudinal Patterns

If the same participants run multiple simulations, AI team behavior can be held constant to isolate human learning:

> "In your first simulation, you drifted 42% while AI teams drifted 28%.
> In your second simulation (same AI calibration), you drifted 31%.
> Your values-alignment improved 26% while facing identical cross-parish pressure."

---

## Solo/Small Group Mode

A single participant can experience the full simulation, making decisions for one parish while AI handles the rest. Useful for:
- Executive coaching (1:1)
- Small team training (2-3 people)
- Self-guided learning
- Demo/sales situations

---

## Configuration Options

### Full AI Mode (Testing)
All 6 parishes AI-controlled. CM observes, adjusts, validates simulation flow.

### Mixed Mode (Normal Use)
1-5 human teams, remainder AI. Most common configuration.

### Adversarial Mode (Advanced)
AI teams configured for low cooperation, high drift. Tests human teams under hostile conditions.

### Cooperative Mode (Learning Focus)
AI teams configured for high cooperation, low drift. Lets human teams focus on their own values without cross-parish friction.

### Scripted Mode (Specific Scenarios)
CM pre-programs AI decisions at key moments to ensure specific dilemmas emerge. Less emergent, more controlled learning.

---

## Implementation Priority

### Phase 1: Basic AI Decision-Making
- Profile generation
- Decision logic with drift
- Rationale generation
- No inter-parish communication yet

### Phase 2: Inter-Parish Communication
- Request/response handling
- Proactive warnings and asks
- Information sharing logic

### Phase 3: CM Controls
- Real-time override capability
- Drift adjustment
- Cooperation settings

### Phase 4: Debrief Integration
- AI team decisions in timeline
- Comparative analysis
- Optional reveal

---

## Technical Requirements

### LLM Usage
- Rationale generation: ~100 tokens per decision
- Response generation: ~50 tokens per communication
- Estimated 20-30 LLM calls per AI team per simulation

### Timing
- Decision delay: 10-60 seconds (simulates discussion)
- Response delay: 5-30 seconds
- Should feel human-paced, not instant

### State Management
- AI team profiles persisted for session
- Decision history tracked same as human teams
- Drift calculated and stored for debrief

---

## Summary

AI-controlled teams fill empty parishes with realistic, values-driven behavior that:

1. **Mirrors human patterns** — States values, drifts under pressure, rationalizes
2. **Creates consequences** — Human teams feel the impact of AI decisions
3. **Scales flexibly** — Works with 1-5 human teams
4. **Supports learning** — Debrief can compare human vs. AI drift patterns
5. **Enables CM control** — Override, adjust, inject as needed

The AI teams aren't perfect players or random actors—they're realistic simulations of teams under pressure, complete with the values drift that makes this simulation meaningful.
