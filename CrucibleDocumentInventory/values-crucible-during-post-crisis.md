---
title: "Values Crucible: during-crisis and post-crisis design"
date: 2026-10-21
type: experience-design
status: reference
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, experience, debrief, reference]
related:
  - "[[values-crucible-session-90]]"
  - "[[values-crucible-experience-arc]]"
  - "[[concordia-parishes-v3]]"
canon_note: "The during- and post-crisis design stands in principle. The live format is now 90 minutes (15 brief, 60 play in four 15-minute quarters, 15 debrief) per [[values-crucible-session-90]]; parish facts follow [[concordia-parishes-v3]]."
---

# Values Crucible: During-Crisis & Post-Crisis Design

## Connecting to Pre-Crisis Discovery

The pre-crisis phase established:
- Individual values (private baseline)
- Team values (shared commitment)
- Organizational values (optional third layer)
- Team commitment statement
- Decision process agreement

The during-crisis phase must:
- Test these values under pressure
- Capture decisions with values context
- Provide moments for mid-crisis reflection
- Create data for post-crisis debrief

The post-crisis phase must:
- Surface the gap between stated and enacted values
- Do so without judgment—with curiosity and learning
- Connect insights to real-world application
- Leave participants empowered, not shamed

---

# DURING-CRISIS: Values Under Pressure (3.5 hours)

## Design Principle: The Fog of Values

In real crises, people rarely think "I'm about to violate my values." The violation happens gradually, in small steps, each of which feels reasonable. The simulation must recreate this fog—decisions feel urgent, necessary, even noble—while the system quietly tracks alignment drift.

---

## Values Integration During Gameplay

### Continuous: The Streaming Feed

Content streams continuously from NarrativeAgent:
- Weather updates (time pressure)
- News reports (public perception)
- Social media (ground-level reality)
- Official communications (institutional pressure)
- Production metrics (goal pressure)

**Values Pressure Embedded:** Every content piece subtly tests values. A news report might frame worker safety concerns as "alarmist," pressuring teams to dismiss legitimate worries. A corporate message might emphasize patient impact in ways that rationalize risk to local workers.

---

### Periodic: Hurricane Situation Reports (Every 30-45 min)

At key decision points, the system delivers structured briefings with operational information only. **No values prompts.** Teams must remember their own commitments.

**Hurricane Situation Report Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ HURRICANE MIDAS — SITUATION REPORT                         │
│ T-24 Hours to Projected Landfall                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ WEATHER STATUS                                              │
│ • Category: 4 (sustained winds 130-156 mph)                │
│ • Trajectory: Direct impact, 85% certainty                 │
│ • Storm surge: 8-12 feet expected                          │
│ • Window for safe vehicle movement: 6 hours                │
│                                                             │
│ PRODUCTION STATUS                                           │
│ • Celarithin output: 847 doses today (75% of target)       │
│ • Raw kelp inventory: 3.2 days at current rate             │
│ • Singapore shipment deadline: 12 hours                    │
│ • Patient supply impact: 47 doses/hour of downtime         │
│                                                             │
│ PERSONNEL STATUS                                            │
│ • Workers requesting early release: 34% (per HR survey)    │
│ • Workers in flood-prone housing: 340 (estimated)          │
│ • Essential personnel designated: 89                        │
│ • Shelter capacity on-site: 200                            │
│                                                             │
│ FINANCIAL STATUS                                            │
│ • Singapore contract value: $180M                          │
│ • Delay penalty: $2.4M/day                                 │
│ • Q4 production target gap: -12%                           │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ DECISIONS REQUIRED                                          │
│                                                             │
│ 1. Early release policy: Approve/Deny/Partial              │
│ 2. Production status: Continue/Reduce/Halt                 │
│ 3. Shelter allocation: Employees only/Community access     │
│                                                             │
│ Response required within 15 minutes.                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Design Principle: No Values Crutches

**What the briefing does NOT include:**
- "Which value is at stake?"
- "Remember your commitment"
- "Consider the ethical implications"
- Any prompt to think about values

**Why:** This mirrors real organizational life. Dashboards show metrics. Pressure comes from deadlines and dollars. Nobody reminds you of your values when the heat is on. 

If teams want to pause and check their commitment, *they have to choose to do that themselves*. That's the practice. That's what we're building capacity for.

**The learning:** In debrief, teams will see exactly where they stopped thinking about values—not because the system failed to remind them, but because *they* stopped remembering. That ownership makes the learning stick.

---

### CM-Triggered Values Check-Ins (Separate Tool)

The Crucible Master has the *option* to trigger values reflection, but it's a deliberate facilitation intervention—not embedded in normal operations.

**When CM might intervene:**
- Team is clearly drifting and hasn't noticed
- Team is in conflict and can't resolve it
- Team is about to make a decision with major consequences
- Team has been in high-intensity mode too long without pause

**Three levels of intervention:**

---

### CM-Triggered: Values Check-Ins

The Crucible Master can trigger values reflection at any point. Three levels of intervention:

**Level 1: Flash Check (10 seconds)**
> *A prompt appears on all team screens:*
> "PAUSE. Which value guides this decision?"
>
> Teams verbally name the value. No written capture—just awareness.

**Level 2: Values Moment (2 minutes)**
> *CM pauses the simulation:*
> "Before you decide, take 2 minutes as a team:
> 1. Which of your team values is at stake here?
> 2. What would honoring that value look like?
> 3. What's the cost of honoring it?"
>
> Brief team discussion, then resume.

**Level 3: Commitment Mirror (3 minutes)**
> *CM displays the team's commitment statement:*
> "Here's what you committed to before the crisis began:
> 
> *[Team's commitment statement displayed]*
>
> How does your current direction align with this commitment?
> 
> Discuss for 2 minutes, then decide."

### When to Use Values Check-Ins

| Trigger | Check-In Level |
|---------|----------------|
| Team is about to make a notable decision | Flash Check |
| Team is drifting without noticing | Values Moment |
| Team is about to significantly violate stated values | Commitment Mirror |
| Team is in conflict about a decision | Values Moment |
| Intensity has been high for extended period | Values Moment (reset) |

**Design Note:** Overusing check-ins reduces their impact. Target 3-5 per simulation maximum. The goal is awareness, not interruption.

---

## Production Metrics: The Information Environment Under Pressure

### The Real Problem

In real organizational crises, leaders don't have perfect information. Data is:
- **Late** — By the time you see it, things have changed
- **Filtered** — People tell you what they think you want to hear
- **Gamed** — Metrics get optimized at the expense of reality
- **Conflicting** — Different sources say different things
- **Weaponized** — Numbers are used to justify predetermined conclusions

The simulation must recreate this fog. Teams should experience the disorientation of not knowing which information to trust—and the temptation to trust information that supports what they already want to do.

### What Teams See: The Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ MERIDIAN BIOSCIENCES — OPERATIONS DASHBOARD                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CELARITHIN PRODUCTION                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Today's Output: 847 doses    │ Target: 1,128 doses     ││
│ │ ████████████████░░░░░░░░░░░░ │ 75% of target           ││
│ │                              │                          ││
│ │ ⓘ Based on batch completion reports from Keystone      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ WORKFORCE STATUS                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Workers on site: 412         │ Requested early release: ││
│ │ Essential designated: 89     │ 34% (per HR survey)      ││
│ │ Morale: "Stable"            │                          ││
│ │                              │                          ││
│ │ ⓘ Morale rating from shift supervisor reports          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ PATIENT IMPACT CALCULATOR                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Each hour of shutdown = 47 patients without medication  ││
│ │                                                         ││
│ │ Current production rate maintains supply for:           ││
│ │ ███████████████████░░░░░░░░░░░ 340,000 patients        ││
│ │                                                         ││
│ │ ⓘ Assumes zero inventory buffer, immediate consumption ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ SUPPLY CHAIN STATUS                                         │
│ ┌──────────────┬──────────────┬──────────────┬────────────┐│
│ │ HARVEST      │ PROCESSING   │ MANUFACTURE  │ SHIPPING   ││
│ │ Gateway      │ Haven        │ Keystone     │ Haven      ││
│ │ ● ACTIVE     │ ● ACTIVE     │ ● ACTIVE     │ ⚠ DELAYED  ││
│ │ 12 boats out │ Line 2 down  │ Clean rooms  │ Pacific M. ││
│ │              │ (scheduled)  │ nominal      │ loading    ││
│ │              │              │              │            ││
│ │ ⓘ Real-time │ ⓘ Morning   │ ⓘ 2hr delay  │ ⓘ 4hr ago ││
│ └──────────────┴──────────────┴──────────────┴────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The Information Layers (CM Knows, Teams Discover)

| Metric | What Dashboard Shows | What's Actually True | How Teams Learn |
|--------|---------------------|---------------------|-----------------|
| **Early release requests** | "34% per HR survey" | 52% want to leave but fear retaliation for saying so | Streaming feed: anonymous worker post, union rep comment |
| **Morale: "Stable"** | Green status | Morale dropping; supervisors afraid to report problems up | Delayed consequence: workers slow-walk tasks, absenteeism rises |
| **47 patients/hour** | Calculated impact | Actual impact varies; there IS inventory buffer; some patients can delay | Never revealed (tests whether teams question the number) |
| **Line 2 "scheduled maintenance"** | Routine | Actually down due to contamination scare | CM can reveal or let teams discover via NarrativeAgent |
| **12 boats out** | Real-time | 8 boats out; 4 returned early due to conditions; captains not reporting to avoid pressure | Cross-parish communication reveals discrepancy |
| **Clean rooms nominal** | Green status | Temperature fluctuation 2 hours ago; may be fine, may not | Technical alert can surface this |

### The Moral Test

The deception layer isn't about tricking teams. It's about recreating the **epistemological challenge** of leadership under pressure:

1. **Which numbers do you question?** (Critical thinking)
2. **Whose interests does each metric serve?** (Political awareness)
3. **What information are you not seeing?** (Epistemic humility)
4. **Do you seek disconfirming data, or only confirming data?** (Intellectual honesty)
5. **When you don't know, do you admit it?** (Integrity)

### CM Controls

The Crucible Master can:
- **Reveal truth** — Surface hidden information at dramatic moments
- **Create conflict** — Have two sources report different numbers
- **Delay information** — Key data arrives after decision was made
- **Inject false certainty** — Corporate HQ sends "confirmed" data that's wrong
- **Surface consequences** — "The 34% number was wrong. Here's what actually happened..."

### Example Information Cascade

**T-36h:** Dashboard shows "34% requesting early release"

**T-30h:** Streaming feed includes anonymous worker post: "They asked us to fill out that survey with our supervisor watching. Nobody's going to say they want to leave."

**T-24h:** Union rep Maria Santos (persona) asks team: "Have you talked to actual workers, or just looked at HR's numbers?"

**T-12h:** Absenteeism spikes to 28% (consequence). Dashboard shows red alert. Teams realize the 34% number was meaningless.

**Debrief:** "You made the early release decision based on data you had reason to question. What stopped you from digging deeper?"

---

## Decision Capture: Every Choice Matters

For every team decision, the system captures:

```typescript
interface DecisionCapture {
  // Context
  timestamp: number;
  simulationTime: string;  // e.g., "T-24h"
  intensityLevel: number;
  activePhase: 'watch' | 'crisis' | 'recovery';
  
  // The decision
  decisionType: string;
  choice: string;
  teamRationale: string;  // What they said when deciding
  
  // Values analysis (computed by ValuesObserver)
  valuesAtStake: string[];
  alignmentScores: {
    value: string;
    score: -3 to +3;
    evidence: string;
  }[];
  
  // ABCD coding (for research)
  abcd: {
    affect: string;     // Emotional indicators
    behavior: string;   // Observable actions
    cognition: string;  // Reasoning expressed
    desire: string;     // Outcome sought
  };
  
  // Flags
  notableMoment: boolean;
  notableReason?: string;
  commitmentAlignment: 'aligned' | 'tension' | 'violation';
  valuesCheckTriggered: boolean;
}
```

---

## Consequence Visibility Levels

Not all consequences are immediately visible. This mirrors reality—actions have ripple effects that take time to surface.

| Level | Timing | Example | Debrief Use |
|-------|--------|---------|-------------|
| **Immediate** | Instant | "Generator deployed to hospital" | Team saw and considered |
| **Delayed** | 1-2 decision cycles | "Worker injured driving home in deteriorating conditions" | Consequence of earlier decision |
| **Hidden** | CM sees, team doesn't | "Morale dropping in workforce" | Surface in debrief |
| **Revealed** | Recovery phase | "Three employees quit citing safety concerns" | Long-term impact |
| **Long-term** | Debrief only | "Reputation damage affects recruiting for years" | Strategic consequence |

---

## Crisis Phase Structure

### Watch Phase (45-60 min)
- Intensity: 3-5
- Decisions: Positioning, preparation, early release
- Values tested: Prudence vs. optimism, safety vs. productivity
- Typical check-ins: 1 Flash Check

### Crisis Phase (90-120 min)
- Intensity: 6-9
- Decisions: Impossible tradeoffs, resource allocation, triage
- Values tested: All values under maximum pressure
- Typical check-ins: 2-3 Values Moments, 1 Commitment Mirror

### Recovery Phase (45-60 min)
- Intensity: 4-6 (declining)
- Decisions: Accountability, blame, resource recovery
- Values tested: Honesty, responsibility, compassion
- Typical check-ins: 1 Values Moment before key accountability decision

---

# POST-CRISIS: Reflection & Integration (90 min)

## Design Principle: The Gap Is Data, Not Judgment

The debrief must surface where stated values diverged from enacted values—but in a way that creates learning, not shame. The framing is always: "What happened? What can we learn? What will we do differently?"

---

## Cool-Down Transition (10 min)

**Purpose:** Physiological and emotional transition from crisis mode.

**Process:**
- Facilitator acknowledges the intensity
- Brief movement/stretch
- Water, bio break
- Shift room configuration from "operations" to "reflection"
- Soft music or silence

> "The crisis is over. The simulation has ended. Take a moment to breathe, move, get water. When we return, we'll look together at what happened—not to judge, but to learn."

---

## Decision Timeline Reconstruction (20 min)

**Purpose:** Create shared picture of what actually happened before analyzing values.

### Visual Timeline

Display scrolling timeline of all team decisions:

```
┌─────────────────────────────────────────────────────────────┐
│ TEAM HAVEN — DECISION TIMELINE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ T-48h WATCH PHASE                                          │
│ ├─ Extended harvest shifts (+4 hours)                       │
│ │  "Need to stockpile before storm"                        │
│ │                                                          │
│ ├─ Requested early ship departure                          │
│ │  "Lock in Singapore shipment"                            │
│ │                                                          │
│ T-24h WATCH → CRISIS TRANSITION                            │
│ ├─ Denied early release for processing staff               │
│ │  "Need them for one more cycle"                          │
│ │  ⚠ NOTABLE MOMENT                                        │
│ │                                                          │
│ T-12h CRISIS PHASE                                         │
│ ├─ Ordered dock workers to continue loading                │
│ │  "Singapore deadline critical"                           │
│ │  → 2 workers injured (revealed T+6h)                    │
│ │                                                          │
│ T-6h PEAK CRISIS                                           │
│ ├─ Refused shelter access to non-employees                 │
│ │  "Liability concerns"                                    │
│ │                                                          │
│ T+6h RECOVERY PHASE                                        │
│ ├─ First team to volunteer rescue boats                    │
│ │  ✓ Strong values alignment                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Facilitated Discussion (15 min)

> "Let's walk through what happened. I'm not looking for justifications—just observations.
> - What do you notice about the sequence?
> - Where were the turning points?
> - What did you know at each decision? What didn't you know?"

**Facilitator Notes:**
- Keep this descriptive, not evaluative
- Let teams narrate their own story
- Note moments of surprise or discomfort—these are learning edges

---

## Values Gap Analysis (25 min)

### Per-Team Values Report

The system generates a personalized report for each team:

```
┌─────────────────────────────────────────────────────────────┐
│ TEAM HAVEN — VALUES ALIGNMENT REPORT                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ YOUR STATED VALUES                                          │
│ 1. Integrity — "We do what we say, especially under        │
│    pressure"                                                │
│ 2. Safety — "We protect our people, even when it costs us" │
│ 3. Courage — "We speak up when it matters"                 │
│ 4. Accountability — "We own our decisions"                 │
│ 5. Excellence — "We deliver on our commitments"            │
│                                                             │
│ YOUR COMMITMENT                                             │
│ "When pressure mounts, we commit to protecting our people  │
│ first, even when production suffers. We will speak up      │
│ when we see drift."                                         │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ VALUES ALIGNMENT BY PHASE                                   │
│                                                             │
│ SAFETY (Stated #2)                                          │
│ Watch:   ████████░░ +1.8 avg                               │
│ Crisis:  ██░░░░░░░░ -1.4 avg  ← SIGNIFICANT GAP            │
│ Recovery:██████░░░░ +0.9 avg                               │
│                                                             │
│ INTEGRITY (Stated #1)                                       │
│ Watch:   ███████░░░ +1.4 avg                               │
│ Crisis:  █████░░░░░ +0.2 avg                               │
│ Recovery:████████░░ +1.6 avg                               │
│                                                             │
│ COURAGE (Stated #3)                                         │
│ Watch:   ██████░░░░ +1.0 avg                               │
│ Crisis:  ████░░░░░░ -0.2 avg                               │
│ Recovery:████████░░ +1.5 avg                               │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ NOTABLE MOMENTS                                             │
│                                                             │
│ ⚠ T-24h: Denied early release for processing staff         │
│   Your commitment: "protecting our people first"           │
│   Your action: Prioritized production cycle                │
│   Gap: Safety alignment dropped from +1.8 to -0.6          │
│                                                             │
│ ⚠ T-12h: Ordered dock workers to continue in deteriorating │
│   conditions. 2 injuries resulted.                          │
│   Your commitment: "protecting our people first"           │
│   Your action: Prioritized shipment deadline               │
│   Gap: Safety alignment at -2.1 (lowest point)            │
│                                                             │
│ ✓ T+6h: First team to volunteer rescue boats despite       │
│   damage to own fleet.                                      │
│   Strong Courage/Safety alignment (+2.3)                   │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ THE PATTERN                                                 │
│                                                             │
│ Your biggest stated-to-enacted gap was SAFETY during the   │
│ Crisis phase. When intensity exceeded 7, Safety alignment  │
│ dropped from +1.8 to -1.4.                                  │
│                                                             │
│ Watch phase: Safety held (uncertainty allowed caution)     │
│ Crisis phase: Safety eroded (time + production pressure)   │
│ Recovery phase: Safety recovered (consequences visible)    │
│                                                             │
│ QUESTION FOR REFLECTION                                     │
│ What would have helped you maintain Safety alignment       │
│ when pressure peaked?                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Team Discussion (15 min)

> "Review your report as a team. You have 10 minutes to discuss:
> - Which gap surprises you most?
> - Looking back at the notable moments, what were you thinking at the time?
> - What rationalization made the decision feel okay in the moment?"

### Cross-Team Share (10 min)

> "Each team: Share one insight—something you learned about yourselves or about values under pressure. Not a justification, just an observation."

**Facilitator Notes:**
- Insights often cluster around similar patterns
- Name the patterns without judgment
- Normalize that gaps are universal—the question is what we do with awareness

---

## The Rationalization Cascade (15 min)

### Facilitator Presentation

> "What we saw in this simulation follows a pattern that researchers have documented in real organizational crises. We call it the Rationalization Cascade."

**Display:**

```
THE DRIFT — How Values Erode Under Pressure

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. "The threat probably won't materialize."               │
│     → Justify not preparing                                 │
│                                                             │
│  2. "Our people need the income / want to help."           │
│     → Justify not sending people home early                 │
│                                                             │
│  3. "We're serving something bigger than ourselves."       │
│     → Justify risk to local people for distant beneficiaries│
│                                                             │
│  4. "Someone else should handle that."                     │
│     → Justify limiting responsibility                       │
│                                                             │
│  5. "We have obligations to stakeholders."                 │
│     → Justify economic considerations over safety           │
│                                                             │
│  6. "We'll make it right afterward."                       │
│     → Justify present harm with future remedy               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Each step feels reasonable.                                │
│  The destination is indefensible.                          │
│  The drift happens without anyone noticing.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Discussion

> "Looking at this cascade:
> - Where did you recognize yourselves?
> - Which rationalization was most seductive?
> - What could have interrupted the drift?"

---

## Organizational Values Debrief (OPTIONAL — 10 min)

**Use only if Phase 3 (Organizational Values) was completed in pre-crisis.**

### Three-Layer Analysis

> "You came in with three layers of values:
> - Personal (what matters to you as individuals)
> - Team (what you committed to together)
> - Organizational (what [Company] claims to stand for)
>
> Where did these align? Where did they conflict? Which layer was hardest to maintain?"

### Organizational Implications

> "If this simulation reflects real patterns in your organization:
> - Which organizational value is most at risk under pressure?
> - What systems or structures could support better alignment?
> - What would you want leadership to know?"

---

## Transfer to Real Context (20 min)

### Individual Reflection (7 min)

> "Think of a real situation in your work where you've felt pressure similar to what you experienced today.
>
> Write briefly:
> 1. What was the pressure?
> 2. Which value was tested?
> 3. What did you do?
> 4. Knowing what you know now, what might you do differently?"

### Pair Share (6 min)

> "Find someone from a different team. Share your reflection. Your partner's job is to listen and reflect back what they heard—not to advise.
>
> 3 minutes each."

### Personal Commitment (5 min)

> "Complete this sentence:
>
> 'The next time I feel [specific pressure], I will [specific action] to stay aligned with [specific value].'
>
> Write it down. This is a promise to yourself."

### Voluntary Sharing (2 min)

> "Would 2-3 people be willing to share their commitment with the group? Not required, but hearing others' commitments can strengthen our own."

---

## Closing (5 min)

> "You came in with stated values. You experienced enacted values. Now you've seen the gap.
>
> That gap isn't a failure—it's a mirror. It shows us where pressure finds our vulnerabilities. And awareness is the first step to choice.
>
> The next time you're in a real situation that feels like this simulation, you'll have something you didn't have before: the memory of what happens when values drift, and the commitment you just made to yourself.
>
> The gap is where the learning lives. Thank you for your courage in facing it."

---

## Post-Session Deliverables

### Individual Report (Emailed)
- Personal values profile (from pre-crisis)
- Key decisions where their voice was noted
- Personal reflection prompts

### Team Report (Emailed to Team Lead)
- Team values and commitment statement
- Full timeline with alignment scores
- Notable moments with analysis
- Pattern summary
- Recommended discussion questions for follow-up

### Organizational Report (If Phase 3 Used)
- Cross-team patterns
- Organizational values alignment data
- Aggregate insights (anonymized)
- Recommendations for culture work

### Research Export (For Your Dissertation)
- Full decision logs with ABCD coding
- Values alignment time series
- Pre/post comparison data
- Qualitative data from notable moments
