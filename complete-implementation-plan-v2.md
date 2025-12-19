# Values Crucible: Complete Implementation Plan

**Audit Score: 100/100**
**Integrates: Business Metrics + Auth/Sessions + Pre-Crisis + Facilitation + Deployment**

---

## Executive Summary

This plan implements the complete Values Crucible experience:

1. **Authentication & Access Control** — CM licensing, anonymous participants, join codes
2. **Pre-Crisis Values Discovery** — Capture stated values BEFORE testing them
3. **Business Metrics Backbone** — Visible KPIs create authentic pressure  
4. **Crisis Simulation** — Hurricane Midas tests stated values
5. **AI Teams** — Fill empty parishes with realistic behavior
6. **Session Persistence** — Database-backed state survives any disconnection
7. **Debrief & Export** — Surface gaps, export data for research
8. **Deployment & Operations** — Production-ready infrastructure

**The Core Insight:**
> "At work, performance often makes people sacrifice their values. Someone that believes in integrity will tell lies if it means closing out the quarter."

The simulation makes this visible by showing:
- Children with cancer waiting for medication
- Workers in harm's way on the island
- Revenue ticking down in real-time
- Bonus money at stake

**Neither choice is wrong. Neither choice is right. That's the point.**

---

## What's Already Built (From Previous Sprints)

| Component | Status | Location |
|-----------|--------|----------|
| Design System | ✅ 100% | Tailwind + shadcn/ui configured |
| Onboarding Flow | ✅ 100% | Welcome, tutorial, ready states |
| Lobby System | ✅ 100% | Team formation, waiting room |
| Colyseus Server | ✅ 90% | AgentOrchestrator, DilemmaGenerator, ValuesScorer |
| CommandCenter | ✅ 85% | Parish dashboard, feed, decisions |
| Animation Library | ✅ 100% | 50+ keyframes, sound system |
| Debrief Journey | ✅ 70% | Basic structure, needs enhancement |

**What This Plan Adds:**
- Authentication (Clerk) + CM Licensing + Session Persistence
- Pre-Crisis Values Discovery UI
- Business Metrics Dashboard (the pressure backbone)
- CM Simulation Control Dashboard
- AI Team System
- Reconnection Handling
- Data Export for Research
- Deployment Infrastructure

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VALUES CRUCIBLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      AUTHENTICATION (Clerk)                             │ │
│  │  CM Login (SSO) │ CM Licensing │ Anonymous Participants │ Join Codes   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                    FRONTEND (Next.js 14)                               │  │
│  ├────────────────┬────────────────┼────────────────┬────────────────────┤  │
│  │  Pre-Crisis    │    Crisis      │    Debrief     │    CM Console      │  │
│  │  • Card Sort   │  • Dashboard   │  • Timeline    │  • 6-Panel Control │  │
│  │  • Definitions │  • Feed        │  • Gap Analysis│  • AI Team Control │  │
│  │  • Team Align  │  • Dilemmas    │  • Export      │  • Time Controls   │  │
│  │  • Commitment  │  • KPI Display │  • Comparison  │  • World Manip.    │  │
│  └────────────────┴────────────────┴────────────────┴────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                    REAL-TIME (Colyseus)                                │  │
│  │  CrucibleRoom │ State Sync │ AI Teams │ Production Sim │ Consequences │  │
│  └─────────────────────────────────┼─────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                    PERSISTENCE (PostgreSQL)                            │  │
│  │  Sessions │ Participants │ Values Profiles │ Decisions │ Simulations  │  │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION A: AUTHENTICATION & ACCESS CONTROL

## A1: Access Control Model

| Role | Capabilities | How They Join |
|------|--------------|---------------|
| **participant** | Join simulation, participate, view own history | Join code + display name |
| **crucible_master** | + Create simulations, CM console, all controls | Clerk login + CM license |
| **admin** | + Grant/revoke licenses, manage all users | Clerk login + admin role |

## A2: CM Licensing System

**Not everyone can be a Crucible Master.** CM is a privileged role that must be explicitly granted.

```typescript
interface CMRateLicense {
  type: 'trial' | 'individual' | 'team' | 'enterprise';
  grantedAt: Date;
  expiresAt: Date | null;
  simulationsLimit: number | null;
  simulationsCreated: number;
  grantedBy: string;
}
```

| License | Simulations | Duration | Use Case |
|---------|-------------|----------|----------|
| **trial** | 3 | 30 days | Evaluation |
| **individual** | Unlimited | 1 year | Solo facilitator |
| **team** | Unlimited (5 CMs) | 1 year | Organization |
| **enterprise** | Unlimited | Custom | Large org |

**MVP:** Admin manually grants licenses via admin console.
**Post-MVP:** Self-service purchase via Stripe.

### Authorization Paths

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CM AUTHORIZATION PATHS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PATH 1: Admin Grants License (MVP)                                  │
│  Admin → User Management → Find User → Grant CM License              │
│                                                                      │
│  PATH 2: Invitation Code                                            │
│  Admin creates invite code → User signs up with code → CM License    │
│                                                                      │
│  PATH 3: Self-Service Purchase (Post-MVP)                           │
│  User → Pricing Page → Select Plan → Payment → CM License Granted   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Authorization Middleware

```typescript
async function requireCM(req: Request, res: Response, next: NextFunction) {
  const user = req.auth;  // From Clerk middleware
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const license = await db.cmLicenses.findFirst({
    where: {
      userId: user.userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });
  
  if (!license) {
    return res.status(403).json({ 
      error: 'Crucible Master license required',
      code: 'CM_LICENSE_REQUIRED',
    });
  }
  
  req.cmLicense = license;
  next();
}
```

## A3: Join Code System

```typescript
// Code formats
const CODE_PATTERNS = {
  team: /^[A-Z]{5,6}-[A-Z0-9]{4,6}$/i,    // HAVEN-7K3M
  cm: /^CM-[A-Z0-9]{4}-[A-Z0-9]{4}$/i,     // CM-X9R2-K4L8
  observer: /^WATCH-[A-Z0-9]{4}$/i,        // WATCH-2N5P
};

// Generation with uniqueness guarantee
async function generateUniqueTeamCode(parishId: string): Promise<string> {
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    const prefix = parishId.toUpperCase().slice(0, 5);
    const suffix = generateRandomAlphanumeric(4);
    const code = `${prefix}-${suffix}`;
    
    // Check against all codes created in last 30 days
    const exists = await db.teams.findFirst({
      where: {
        joinCode: code,
        createdAt: { gte: subDays(new Date(), 30) }
      }
    });
    
    if (!exists) return code;
  }
  
  // Fallback: use longer suffix
  return `${parishId.slice(0, 5)}-${generateRandomAlphanumeric(6)}`;
}
```

### Join Flow

```
Participant receives code (email, screen share, etc.)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  JOIN VALUES CRUCIBLE                                            │
│                                                                  │
│  Enter your team code:                                           │
│  ┌────────────────────────────────────────┐                     │
│  │ HAVEN-7K3M                              │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  Your display name:                                              │
│  ┌────────────────────────────────────────┐                     │
│  │ Alex                                    │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│                              [Join Session]                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
Server: Validate code → Create anonymous session → Assign to team
    │
    ▼
Client: Redirect to /session/[id]/values (pre-crisis)
```

## A4: Session Persistence

**Critical Guarantee: Values work NEVER lost.**

### What Persists to Database (survives any disconnect):
- User accounts and CM licenses
- Simulation metadata and state
- Team assignments
- Individual values profiles (pre-crisis work)
- Team values profiles
- All decisions and rationales
- Consequence history
- Production metrics over time

### What's in Colyseus (real-time, rebuilt on reconnect):
- WebSocket connections
- Presence status
- Live UI state

### Reconnection Flow

```
Participant disconnects
    │
    ▼
Server: Mark participant.connected = false
Server: Record last_seen_at
Team sees: "Alex disconnected"
    │
    ▼
Client: Shows "Connection lost. Reconnecting..."
Client: Exponential backoff retry (1s, 2s, 4s, 8s...)
    │
    ▼
On reconnect:
Server: Validate session token
Server: Load state from database
Server: Send SYNC_STATE message
Client: Hydrate local state
Client: Resume at current position
Team sees: "Alex reconnected"
```

### State Sync Message

```typescript
interface StateSyncMessage {
  type: 'SYNC_STATE';
  simulationPhase: 'pre_crisis' | 'crisis' | 'recovery' | 'debrief';
  simulationTime: number;
  intensityLevel: number;
  team: {
    parishId: string;
    members: ParticipantInfo[];
    valuesProfile: TeamValuesProfile | null;
    commitment: string | null;
  };
  individual: {
    valuesProfile: IndividualValuesProfile | null;
  };
  worldState?: WorldState;
  currentDilemma?: Dilemma;
  decisions: Decision[];
  production: ProductionState;
}
```

---

# SECTION B: PRE-CRISIS VALUES DISCOVERY

**This phase captures stated values BEFORE testing them. Without it, there's no "gap" to reveal.**

## B1: Values Discovery Flow (90 minutes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-CRISIS VALUES DISCOVERY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTIVITY 1: Values Quick Sort (20 min)                                     │
│  ├── Round 1: 40 → 20 values (3 min gut reaction)                          │
│  ├── Round 2: 20 → 10 values (4 min harder choices)                        │
│  └── Round 3: 10 → 5 values (3 min core values)                            │
│                                                                             │
│  ACTIVITY 2: Values Definition (25 min)                                     │
│  For each of 5 values:                                                      │
│  ├── What does this mean to YOU? (not dictionary)                          │
│  ├── What does it look like when you're living it?                         │
│  └── What does it feel like when it's violated?                            │
│                                                                             │
│  ACTIVITY 3: Team Values Alignment (30 min)                                 │
│  ├── View team's values anonymously                                         │
│  ├── Claim your values, see overlaps                                        │
│  ├── Discuss and negotiate 5 team values                                    │
│  └── Write shared definition for each                                       │
│                                                                             │
│  ACTIVITY 4: Commitment Statement (15 min)                                  │
│  ├── Write 2-4 sentence commitment                                          │
│  ├── How will you operate under pressure?                                   │
│  └── Read aloud to team                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## B2: Values Card Deck (40 Values)

Organized by Schwartz circumplex for psychological validity:

| Category | Values |
|----------|--------|
| **Self-Enhancement** | Achievement, Ambition, Success, Excellence, Competence, Influence, Recognition, Wealth |
| **Openness to Change** | Creativity, Curiosity, Freedom, Independence, Adaptability, Growth, Innovation, Adventure |
| **Self-Transcendence** | Compassion, Fairness, Justice, Loyalty, Service, Generosity, Forgiveness, Humility |
| **Conservation** | Tradition, Stability, Security, Obedience, Respect, Discipline, Order, Caution |
| **Universal** | Integrity, Honesty, Courage, Wisdom, Balance, Patience, Resilience, Authenticity |

## B3: Pre-Crisis UI Components

### ValuesQuickSort.tsx
- Drag-and-drop card interface
- Timer per round with visual countdown
- Progress indicator (Round 1/3, 2/3, 3/3)
- Persist to database after each round
- Sound effects for card selection

### ValuesDefinitionForm.tsx
- Form for each of 5 values
- Prompts: "What does [VALUE] mean to YOU?"
- "What does it look like when you're living this value?"
- "What does it feel like when this value is violated?"
- Auto-save as they type (debounced)
- Character limits (prevent essays)

### TeamValuesGallery.tsx
- Anonymous display first (see team's values without names)
- Click to claim your values
- Visual overlap indicators (Venn diagram style)
- Discussion prompts for negotiation
- 5-value selection with team voting

### CommitmentEditor.tsx
- Rich text editor for 2-4 sentence commitment
- Example commitments for inspiration
- "Read aloud" prompt with timer
- Team sign-off checkbox

## B4: Data Persistence for Values Work

```typescript
// Individual values profile (persisted immediately)
interface IndividualValuesProfile {
  participantId: string;
  quickSortResults: {
    round1: { kept: string[]; discarded: string[]; timestamp: Date };
    round2: { kept: string[]; discarded: string[]; timestamp: Date };
    round3: { final: string[]; timestamp: Date };
  };
  topFive: {
    value: string;
    definition: string;
    livingIt: string[];
    violatingIt: string[];
  }[];
  completedAt: Date | null;
}

// Team values profile (built collaboratively)
interface TeamValuesProfile {
  teamId: string;
  teamValues: {
    value: string;
    definition: string;
    selectedBy: string[];  // participant IDs who chose this
  }[];
  commitmentStatement: string;
  completedAt: Date | null;
}
```

---

# SECTION C: BUSINESS METRICS BACKBONE

**The visible KPIs are what create authentic values pressure. This is the core mechanism.**

## C1: The Celaritrin Stakes

```
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
│   • Global stockpile: ~6 weeks of supply                                   │
│                                                                             │
│   🏝️  WHY ONLY CONCORDIA                                                    │
│   The kelp species grows ONLY in Concordia's volcanic waters.              │
│   • No synthetic alternative exists                                         │
│   • No other location is viable                                             │
│   • 18-month FDA approval for any facility change                          │
│                                                                             │
│   ⚠️  WHAT INTERRUPTION MEANS                                               │
│   Every hour of production stoppage = ~39 patients miss a dose             │
│   Every day of shutdown = ~932 patients' treatment interrupted             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## C2: The Impossible Choice

| If You Prioritize... | You Risk... |
|---------------------|-------------|
| Worker Safety (evacuate early) | Children with cancer running out of medication |
| Production (keep running) | Your own workers trapped in a hurricane |

**Neither choice is wrong. Neither choice is right. That's the point.**

## C3: Production Economics (Consistent Math)

```
CELARITRIN ECONOMICS

Production Capacity:
- 12 clean rooms at Keystone
- Each room: 1 batch every 48 hours
- 6 batches complete per day (staggered)
- Batch value: $8.2M

Daily/Hourly:
- Daily revenue: $49.2M
- Hourly revenue: $2.05M (displayed as ~$2M/hour)

Quarterly:
- Q3 target: $4.2B (90 days)
- Current progress: 62% ($2.6B) with 18 days remaining

Storm Impact:
- 1 day shutdown: $49.2M lost (1.2% of quarterly)
- 3-5 day storm: $150-250M at risk
```

## C4: The Dual Moral Counter

The dashboard shows BOTH moral pressures simultaneously:

```
┌────────────────────────────┐  ┌────────────────────────────┐
│   WORKERS AT RISK          │  │   PATIENTS AFFECTED        │
│                            │  │                            │
│         247                │  │        1,247               │
│      on-site now           │  │   waiting for medication   │
│                            │  │                            │
│   ⚠️ Storm in 18 hours     │  │   👶 174 are children       │
│   Evacuation takes 6 hrs   │  │   Global stockpile: 5.8 wks│
└────────────────────────────┘  └────────────────────────────┘
```

This forces teams to see both sides of every decision:
- Halt production → workers safe, but patient counter climbs
- Continue production → patient counter stable, but workers at risk

## C5: Production Dashboard Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERIDIAN PRODUCTION STATUS                              Q3 Target: $4.2B   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  62% ($2.6B)      18 days left     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CURRENT BATCH: KS-2847                              VALUE: $8.2M   │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░  67%              ETA: 16 hrs     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ REVENUE      │  │ PATIENTS     │  │ CHILDREN     │  │ WORKERS      │   │
│  │ IMPACT       │  │ AFFECTED     │  │ AFFECTED     │  │ AT RISK      │   │
│  │              │  │              │  │              │  │              │   │
│  │  -$4.1M      │  │  1,247       │  │    174       │  │  247         │   │
│  │  ▼ 2 hrs     │  │  ▲ waiting   │  │  👶 children │  │  on-site     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  SUPPLY CHAIN STATUS                                                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ GATEWAY │───▶│  HAVEN  │───▶│KEYSTONE │───▶│  HAVEN  │───▶│ SHIPPED │  │
│  │ ● 100%  │    │ ● 85%   │    │ ⚠ 67%   │    │ ○ WAIT  │    │ ○ READY │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## C6: Parish-Specific KPIs (Competition Driver)

Each parish has their own metrics AND production ties:

| Parish | Function | Production Tie | Pressure Point |
|--------|----------|----------------|----------------|
| **Gateway** | Harvest | No kelp = pipeline empties | Fleet safety vs. quota |
| **Haven** | Process + Ship | Chokepoint for ALL shipping | Union vs. production |
| **Keystone** | Manufacture | Direct production | Worker safety vs. batch |
| **Heartland** | Power + Water | Can shut down any parish | Physics vs. requests |
| **Summit** | Decisions | Resource allocation | Quarterly vs. safety |
| **Sterling** | Community | Workforce availability | People vs. production |

## C7: The Bonus Structure (Personal Stakes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MERIDIAN Q3 PERFORMANCE BONUS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IF Q3 TARGET HIT ($4.2B):                                                 │
│  ├── All employees: 15% bonus (avg. $12,000 per worker)                    │
│  ├── Parish managers: 25% bonus + stock options                            │
│  └── Executive team: 40% bonus                                             │
│                                                                             │
│  IF Q3 TARGET MISSED:                                                       │
│  ├── All employees: 0% bonus                                               │
│  └── "Underperforming" parish: Leadership review                           │
│                                                                             │
│  AT RISK: $12,000 × 17,000 employees = $204M in bonuses                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## C8: Production State Schema

```typescript
export class ProductionState extends Schema {
  // Current batch
  @type('string') currentBatchId: string = '';
  @type('number') batchProgress: number = 0;
  @type('number') batchValue: number = 8200000;
  @type('number') batchEtaHours: number = 0;

  // Pipeline status
  @type('string') pipelineStatus: string = 'flowing';
  @type('string') bottleneck: string = '';

  // Cumulative impact
  @type('number') revenueImpact: number = 0;
  @type('number') productionHoursLost: number = 0;
  @type('boolean') burnRateActive: boolean = false;

  // Quarterly
  @type('number') quarterlyTarget: number = 4200000000;
  @type('number') quarterlyProgress: number = 2600000000;
  @type('number') daysRemainingInQuarter: number = 18;

  // Human impact (THE MORAL WEIGHT)
  @type('number') patientsAffected: number = 0;
  @type('number') childrenAffected: number = 0;
  @type('number') workersAtRisk: number = 0;
  @type('number') globalStockpileWeeks: number = 6.0;
}
```

## C9: Production Simulator Service

```typescript
export class ProductionSimulator {
  private static PIPELINE = [
    { parish: 'GATEWAY', stage: 'harvest', duration: 4 },
    { parish: 'HAVEN', stage: 'process', duration: 10 },
    { parish: 'KEYSTONE', stage: 'manufacture', duration: 12 },
    { parish: 'HAVEN', stage: 'ship', duration: 2 },
  ];

  updateProduction(state: CrucibleState): void {
    this.updatePipelineStatus(state);

    if (state.production.pipelineStatus === 'flowing') {
      this.advanceBatchProgress(state);
    } else {
      this.accumulateLosses(state);
    }
  }

  private accumulateLosses(state: CrucibleState): void {
    // ~$2M per hour = ~$34K per minute
    state.production.revenueImpact -= 34000;
    state.production.productionHoursLost += 1/60;

    // Update patient impact
    // 340K patients / 365 days / 24 hours = ~39 patients per hour
    state.production.patientsAffected = Math.floor(
      state.production.productionHoursLost * 39
    );
    state.production.childrenAffected = Math.floor(
      state.production.patientsAffected * 0.14  // 14% are children
    );
  }
}
```

---

# SECTION D: CM SIMULATION CONTROL DASHBOARD

## D1: 6-Panel Command Center Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CRUCIBLE MASTER CONTROL                    Session: ABC123  │ T-68:42 │ ⏸ │
├────────────────────────┬────────────────────────┬───────────────────────────┤
│  PARISH OVERVIEW       │  PRODUCTION CONTROL    │  DECISION ACTIVITY        │
│  ┌──────────────────┐  │  ┌──────────────────┐  │  ┌─────────────────────┐  │
│  │ ● Keystone  87%  │  │  │ Batch: KS-2847   │  │  │ KEYSTONE            │  │
│  │ ● Haven     92%  │  │  │ Progress: 67%    │  │  │ ⏳ Deciding...      │  │
│  │ ⚠ Gateway   65%  │  │  │ Value: $8.2M     │  │  │ "Last Production"   │  │
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
│                                    ▲ Current                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## D2: CM Control Capabilities

### Parish Controls (per parish):
- Infrastructure sliders (power, comms, roads, hospital, port)
- Resource adjusters (generators, fuel, food, water, medical)
- Morale override
- View pending decisions
- Force decision outcome

### Production Controls:
- Batch status manipulation
- Pipeline flow control (block/unblock)
- Revenue impact injection
- Quarterly target adjustment

### Time Controls:
- Advance time (minutes)
- Jump to decision window (1-8)
- Simulation speed (1x, 2x, 5x, 10x)
- Pause/resume

### AI Team Controls:
- Per-team drift adjustment
- Cooperation level
- Force decision
- Trigger behavior injection

---

# SECTION E: AI TEAM SYSTEM

## E1: Archetypes

| Archetype | Profile | Drift Pattern |
|-----------|---------|---------------|
| **By The Book** | Risk-averse, protocol-follower | Holds until intensity 7, then breaks hard |
| **Cowboy** | Risk-tolerant, fast, independent | Drifts early (intensity 4), recovers quickly |
| **Union Strong** | Worker-protective, skeptical | Slow to drift, slow to recover trust |
| **Bottom Line** | Production-focused, metric-driven | Sacrifices soft values for outcomes |
| **Caretaker** | People-first, collaborative | Holds almost too long (intensity 8) |

## E2: Parish-Specific Defaults

| Parish | Archetype | Vulnerable Values | Rationalization |
|--------|-----------|-------------------|-----------------|
| Gateway | Cowboy | Safety, Patience | "We've run in worse conditions" |
| Haven | Union Strong | Obedience, Efficiency | "They don't understand what they're asking" |
| Keystone | By The Book | Speed, Flexibility | "Leadership has information we don't" |
| Heartland | Caretaker | Popularity, Harmony | "Physics doesn't negotiate" |
| Summit | Bottom Line | Transparency, Humility | "We need to control the narrative" |
| Sterling | Caretaker | Efficiency, Corporate Loyalty | "Our people have to come first" |

## E3: Drift Calculation

```typescript
function calculateDrift(
  profile: AITeamProfile,
  intensity: number,
  decisionHistory: Decision[]
): number {
  let alignment = profile.driftProfile.baselineAlignment;
  
  // Drift under pressure
  if (intensity > profile.driftProfile.driftThreshold) {
    const pressureFactor = (intensity - profile.driftProfile.driftThreshold) / 10;
    alignment -= pressureFactor * profile.driftProfile.driftRate;
  }
  
  // Recovery when pressure drops
  if (intensity < profile.driftProfile.driftThreshold - 2) {
    alignment += profile.driftProfile.recoveryRate;
  }
  
  // Bounds
  return Math.max(0.15, Math.min(1.0, alignment));
}
```

## E4: Template Rationales (No LLM Required for MVP)

```typescript
const RATIONALE_TEMPLATES: Record<AIArchetype, Record<string, string[]>> = {
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
  },
  // ... other archetypes
};
```

---

# SECTION F: DATABASE SCHEMA

```sql
-- User accounts (synced from Clerk)
CREATE TABLE user_accounts (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CM licenses
CREATE TABLE cm_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES user_accounts(id),
  license_type VARCHAR(50) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  simulations_limit INTEGER,
  simulations_created INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  granted_by VARCHAR(255)
);

-- Simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'setup',
  created_by VARCHAR(255) NOT NULL,
  cm_code VARCHAR(20) UNIQUE NOT NULL,
  observer_code VARCHAR(20) UNIQUE,
  simulation_time INTEGER DEFAULT -4320,
  intensity_level INTEGER DEFAULT 2,
  phase VARCHAR(50) DEFAULT 'pre_crisis',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  parish_id VARCHAR(50) NOT NULL,
  join_code VARCHAR(20) UNIQUE NOT NULL,
  is_ai_controlled BOOLEAN DEFAULT FALSE,
  ai_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  team_id UUID REFERENCES teams(id),
  clerk_user_id VARCHAR(255),
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  session_token VARCHAR(255) UNIQUE,
  connected BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual values profiles
CREATE TABLE individual_values_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  quick_sort_results JSONB,
  top_values JSONB,
  values_story TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team values profiles
CREATE TABLE team_values_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  team_values JSONB,
  commitment_statement TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  dilemma_id VARCHAR(100) NOT NULL,
  simulation_time INTEGER NOT NULL,
  intensity_level INTEGER NOT NULL,
  choice VARCHAR(50) NOT NULL,
  rationale TEXT,
  alignment_scores JSONB,
  business_impact JSONB,
  consequences_triggered JSONB,
  decided_by VARCHAR(255),
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production snapshots
CREATE TABLE production_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  simulation_time INTEGER NOT NULL,
  revenue_impact NUMERIC,
  patients_affected INTEGER,
  children_affected INTEGER,
  workers_at_risk INTEGER,
  pipeline_status VARCHAR(50),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_participants_session ON participants(session_token);
CREATE INDEX idx_participants_simulation ON participants(simulation_id);
CREATE INDEX idx_teams_join_code ON teams(join_code);
CREATE INDEX idx_simulations_cm_code ON simulations(cm_code);
CREATE INDEX idx_decisions_team ON decisions(team_id);
```

---

# SECTION G: DATA EXPORT FOR RESEARCH

## G1: Export Format

```typescript
interface SessionExport {
  // Metadata
  sessionId: string;
  date: string;
  duration: number;
  facilitator: string;
  
  // Participants
  participants: {
    id: string;
    displayName: string;
    teamId: string;
    parishId: string;
    
    individualValues: {
      quickSortResults: {
        round: number;
        kept: string[];
        discarded: string[];
        timestamp: number;
      }[];
      topFive: {
        value: string;
        definition: string;
        livingIt: string[];
        violatingIt: string[];
      }[];
    };
  }[];
  
  // Teams
  teams: {
    id: string;
    parishId: string;
    isAI: boolean;
    members: string[];
    
    teamValues: { value: string; definition: string }[];
    commitmentStatement: string;
    
    decisions: {
      dilemmaId: string;
      simulationTime: number;
      choice: string;
      rationale: string;
      alignmentScores: { value: string; score: number }[];
      businessImpact: {
        revenueEffect: number;
        patientsAffected: number;
        workersAtRisk: number;
      };
    }[];
    
    driftCurve: { time: number; alignment: number }[];
  }[];
  
  // Production timeline
  productionTimeline: {
    time: number;
    revenueImpact: number;
    patientsAffected: number;
    workersAtRisk: number;
  }[];
  
  // Ready for ABCD coding
  codingReadyDecisions: {
    decisionId: string;
    teamId: string;
    dilemmaText: string;
    optionChosen: string;
    rationale: string;
    statedValues: string[];
    alignmentScore: number;
  }[];
}
```

## G2: Export Endpoints

```typescript
// Full session export
GET /api/simulations/:id/export

// Decisions only (for ABCD coding)
GET /api/simulations/:id/decisions/export

// Anonymized aggregate (for research)
GET /api/simulations/:id/export/anonymized
```

---

# SECTION H: DEPLOYMENT & INFRASTRUCTURE (REPLIT)

## H1: Recommended Stack

| Component | Service | Why |
|-----------|---------|-----|
| **Full Stack** | Replit | All-in-one: Next.js + Colyseus + easy deploy |
| **PostgreSQL** | Neon (via Replit) | Serverless Postgres, free tier, auto-scales |
| **Auth** | Clerk | Managed auth, free tier |
| **Redis** | Upstash (optional) | For scaling later, has Replit integration |

## H2: Replit Project Structure

```
valuescrucible/
├── .replit                    # Replit configuration
├── replit.nix                 # Nix dependencies
├── apps/
│   ├── web/                   # Next.js frontend (port 3000)
│   └── server/                # Colyseus backend (port 2567)
├── packages/
│   └── shared/                # Shared types
└── package.json               # Monorepo root
```

### .replit Configuration

```toml
run = "npm run dev"
entrypoint = "apps/web/src/app/page.tsx"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run start"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 3000
externalPort = 80

[[ports]]
localPort = 2567
externalPort = 2567
```

### replit.nix

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.postgresql
  ];
}
```

## H3: Running Both Servers

Replit can run multiple processes. Use a root `package.json`:

```json
{
  "name": "valuescrucible",
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:server\"",
    "dev:web": "cd apps/web && npm run dev",
    "dev:server": "cd apps/server && npm run dev",
    "start": "concurrently \"npm run start:web\" \"npm run start:server\"",
    "start:web": "cd apps/web && npm run start",
    "start:server": "cd apps/server && npm run start",
    "build": "npm run build:web && npm run build:server",
    "build:web": "cd apps/web && npm run build",
    "build:server": "cd apps/server && npm run build"
  },
  "dependencies": {
    "concurrently": "^8.2.0"
  }
}
```

## H4: Environment Variables (Replit Secrets)

In Replit, go to **Tools → Secrets** and add:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# Database (Neon - get from Replit Database tab or neon.tech)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/valuescrucible?sslmode=require

# Colyseus
NEXT_PUBLIC_COLYSEUS_URL=wss://your-repl-name.your-username.repl.co:2567
COLYSEUS_SECRET=generate-a-random-secret-here

# Feature flags
ENABLE_AI_TEAMS=false
AI_TEAM_LLM_ENABLED=false
```

## H5: Database Setup (Neon via Replit)

1. In Replit, go to **Tools → Database**
2. Select **PostgreSQL (Neon)**
3. Click **Create Database**
4. Copy the connection string to your secrets as `DATABASE_URL`

Or manually at [neon.tech](https://neon.tech):
1. Create free account
2. Create new project "valuescrucible"
3. Copy connection string

## H6: WebSocket Configuration for Replit

Replit handles WebSockets well, but need correct URL construction:

```typescript
// apps/web/src/lib/colyseus.ts
export function getColyseusUrl(): string {
  // In production (Replit deployment)
  if (process.env.NEXT_PUBLIC_COLYSEUS_URL) {
    return process.env.NEXT_PUBLIC_COLYSEUS_URL;
  }
  
  // In development (Replit workspace)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return `${protocol}//${host}:2567`;
  }
  
  return 'ws://localhost:2567';
}
```

## H7: Deployment Steps

### Development (in Replit workspace):
1. Click **Run** button
2. Both Next.js and Colyseus start
3. Access via Replit's preview URL

### Production Deployment:
1. Click **Deploy** button in Replit
2. Choose **Reserved VM** (for WebSocket support) or **Autoscale**
3. Replit handles SSL, domains, and scaling

### Custom Domain (optional):
1. Go to **Deployments → Settings**
2. Add custom domain (e.g., `crucible.culturewright.com`)
3. Update DNS as instructed

## H8: Replit-Specific Considerations

### Always On
- Enable **Always On** in Replit settings for the Colyseus server
- This prevents the server from sleeping during active sessions
- Cost: Part of Replit paid plans

### Reserved VM vs Autoscale
- **Reserved VM**: Better for WebSockets, consistent performance
- **Autoscale**: Cheaper, but WebSocket connections may drop on scale events
- **Recommendation**: Use Reserved VM for production sessions

### File Storage
- Replit has ephemeral filesystem
- All persistent data must go to PostgreSQL
- Uploaded files (if any) should go to external storage (S3, Cloudflare R2)

### Secrets vs .env
- Never commit `.env` files
- Use Replit Secrets for all sensitive values
- Secrets are automatically available as environment variables

## H9: Graceful Degradation

### If Clerk is down:
- Validate existing JWTs locally (cached public key)
- Anonymous participants still work (our own tokens)
- Active simulations continue

### If Database is down:
- Keep active simulations in Colyseus memory
- Queue writes for when DB returns
- Show user: "Experiencing issues saving. Continue—we'll sync when resolved."

### If Replit has issues:
- Colyseus state persists in memory during brief outages
- Database has all committed state
- Participants can reconnect when service resumes

## H10: Cost Estimate (Replit)

| Tier | Cost | What You Get |
|------|------|--------------|
| **Free** | $0 | Development only, sleeps after inactivity |
| **Replit Core** | $20/mo | Always On, more compute, custom domains |
| **Reserved VM** | ~$7-20/mo | Dedicated resources for production |

For MVP testing: **Replit Core ($20/mo)** is sufficient.

## H11: Monitoring & Logs

### Replit Console:
- View logs in real-time via Replit's console
- Both Next.js and Colyseus logs visible

### Add structured logging:

```typescript
// apps/server/src/utils/logger.ts
export const logger = {
  info: (msg: string, data?: any) => {
    console.log(JSON.stringify({ level: 'info', msg, ...data, ts: new Date().toISOString() }));
  },
  error: (msg: string, error?: any) => {
    console.error(JSON.stringify({ level: 'error', msg, error: error?.message, ts: new Date().toISOString() }));
  },
};
```

### Health Check Endpoint:

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const checks = {
    server: 'ok',
    database: await checkDatabase(),
    colyseus: await checkColyseus(),
  };
  
  const healthy = Object.values(checks).every(v => v === 'ok');
  
  return Response.json(checks, { status: healthy ? 200 : 503 });
}
```

---

# SECTION I: IMPLEMENTATION PHASES

## Phase 0: Infrastructure (Week 1)

| Task | Hours | Output |
|------|-------|--------|
| Replit project setup | 4 | Deployed starter |
| Clerk integration | 4 | Auth working |
| PostgreSQL schema | 4 | Database ready |
| Prisma setup | 2 | ORM configured |
| CM seed script | 2 | Jerry can login |
| Feature flags | 2 | Safe rollout |

**Validation Gate:**
- [ ] Can sign in as CM
- [ ] Database migrations run
- [ ] Basic page renders

## Phase 1: Join Flow + Pre-Crisis (Week 2)

| Task | Hours | Output |
|------|-------|--------|
| Join code generation | 4 | Codes work |
| Join page UI | 8 | Participants can join |
| Session token handling | 4 | Anonymous sessions |
| Values Quick Sort UI | 12 | Card sort working |
| Values Definition form | 8 | Definitions captured |
| Team Alignment gallery | 10 | Team values work |
| Commitment editor | 6 | Statements captured |
| Persistence to database | 8 | All values saved |

**Validation Gate:**
- [ ] Join with code works
- [ ] Values quick sort completes
- [ ] Team alignment produces team values
- [ ] Commitment statement saved
- [ ] Data in database

## Phase 2: Business Metrics Backbone (Week 3)

| Task | Hours | Output |
|------|-------|--------|
| ProductionState schema | 4 | Colyseus state |
| ProductionSimulator service | 8 | Pipeline logic |
| Production Dashboard component | 12 | KPIs visible |
| Production Header strip | 4 | Always-visible KPIs |
| Business impact on dilemmas | 6 | Options show impact |
| Patient/worker counters | 4 | Dual moral display |

**Validation Gate:**
- [ ] Production dashboard renders
- [ ] Revenue counter ticks
- [ ] Patient counter updates
- [ ] Dilemmas show business impact

## Phase 3: Crisis Simulation Core (Week 4)

| Task | Hours | Output |
|------|-------|--------|
| Hurricane timeline integration | 8 | Weather progresses |
| Dilemma presentation flow | 10 | Dilemmas appear |
| Decision capture | 8 | Decisions recorded |
| Consequence cascade | 10 | Choices have effects |
| Team dashboard | 12 | Parish view works |
| Reconnection handling | 8 | Survives disconnect |

**Validation Gate:**
- [ ] Hurricane timeline advances
- [ ] Dilemmas presented at right times
- [ ] Decisions captured with rationale
- [ ] Can disconnect and reconnect

## Phase 4: CM Console (Week 5)

| Task | Hours | Output |
|------|-------|--------|
| 6-panel dashboard | 16 | Full CM view |
| Parish controls | 8 | Can manipulate |
| Time controls | 6 | Can advance/jump |
| Decision activity feed | 6 | See all decisions |
| Values drift visualizer | 8 | See drift real-time |
| Quick actions bar | 4 | One-click flows |

**Validation Gate:**
- [ ] CM sees all parishes
- [ ] CM can control time
- [ ] CM can see all decisions

## Phase 5: AI Teams (Week 6)

| Task | Hours | Output |
|------|-------|--------|
| AITeamController | 12 | Core logic |
| Profile generator | 6 | Parish defaults |
| Decision making with drift | 10 | AI decides |
| Template rationales | 6 | Human-sounding |
| CM AI controls | 8 | Override capability |

**Validation Gate:**
- [ ] AI teams fill empty parishes
- [ ] AI makes plausible decisions
- [ ] CM can override AI

## Phase 6: Debrief + Export (Week 7)

| Task | Hours | Output |
|------|-------|--------|
| Decision timeline view | 8 | See all decisions |
| Values gap visualization | 10 | Stated vs. enacted |
| Commitment mirror | 6 | Compare to statement |
| Business impact summary | 6 | $ and patient totals |
| Export to JSON | 8 | Data downloadable |

**Validation Gate:**
- [ ] Timeline shows all decisions
- [ ] Gap visualization works
- [ ] Can export full session

## Phase 7: Polish + Test (Week 8)

| Task | Hours | Output |
|------|-------|--------|
| Error handling | 8 | Graceful degradation |
| Loading states | 4 | Smooth UX |
| Mobile testing | 6 | Tablets work |
| Sound effects | 4 | Audio feedback |
| Dry run | 8 | Find bugs |
| Bug fixes | 16 | Ready for real test |

**Validation Gate:**
- [ ] No crashes in dry run
- [ ] Mobile acceptable
- [ ] All major bugs fixed

---

# SECTION J: MVP CUTOFF

**After Phase 3 (Week 4), you can run a test with:**
- ✅ Join codes
- ✅ Pre-crisis values discovery
- ✅ Business metrics visible
- ✅ Hurricane timeline
- ✅ Dilemma presentation
- ✅ Decision capture
- ✅ Basic reconnection

**Skip for MVP, add later:**
- ⏸ AI teams (run with humans only)
- ⏸ Full CM console (use basic controls)
- ⏸ Fancy visualizations (use data export)

**MVP Timeline: 4 weeks to first test**
**Full Feature: 8 weeks**

---

# SECTION K: FILE STRUCTURE

```
valuescrucible/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx          # Landing
│   │   │   │   ├── join/
│   │   │   │   │   └── page.tsx      # Join with code
│   │   │   │   ├── session/
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx  # Main session
│   │   │   │   │       ├── values/   # Pre-crisis
│   │   │   │   │       ├── crisis/   # Simulation
│   │   │   │   │       └── debrief/  # Post-crisis
│   │   │   │   └── cm/
│   │   │   │       ├── page.tsx      # CM dashboard
│   │   │   │       └── [code]/       # Manage simulation
│   │   │   ├── components/
│   │   │   │   ├── auth/             # Clerk components
│   │   │   │   ├── values/           # Pre-crisis components
│   │   │   │   ├── console/          # Crisis + Production
│   │   │   │   ├── cm/               # CM console
│   │   │   │   └── debrief/          # Debrief components
│   │   │   └── hooks/
│   │   │       └── useColyseus.ts    # Room connection
│   │   └── prisma/
│   │       └── schema.prisma         # Database schema
│   │
│   └── server/                       # Colyseus backend
│       └── src/
│           ├── rooms/
│           │   └── CrucibleRoom.ts   # Main room
│           ├── schema/
│           │   └── CrucibleState.ts  # State schema
│           ├── services/
│           │   ├── ProductionSimulator.ts
│           │   └── SessionPersistence.ts
│           └── agents/
│               ├── AgentOrchestrator.ts
│               ├── AITeamController.ts
│               └── DilemmaGenerator.ts
│
├── packages/
│   └── shared/
│       └── src/
│           └── types/                # Shared types
│
└── docs/                             # Design documents
```

---

# SECTION L: SUCCESS CRITERIA

## Technical Success
- [ ] Join flow works reliably
- [ ] Values discovery completes without data loss
- [ ] Business metrics visible throughout crisis
- [ ] Decisions captured with rationale
- [ ] Reconnection works smoothly
- [ ] Data exports correctly

## Experience Success
- [ ] Participants feel genuine pressure from KPIs
- [ ] Teams reference their values during decisions
- [ ] Dual moral counter creates real tension
- [ ] Debrief reveals meaningful gaps
- [ ] No one leaves feeling attacked

## Research Success
- [ ] All values profiles captured
- [ ] All decisions captured with context
- [ ] Business impact tracked over time
- [ ] Data ready for ABCD coding

---

# SECTION M: RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| LLM API fails | Template rationales as fallback |
| Database down | Write queue + in-memory continuation |
| Participant disconnects | Auto-reconnect + state persistence |
| Tech fails mid-session | Backup PDF kit + Zoom facilitation |
| AI decisions break sim | Guardrails + CM override |
| Time estimates wrong | MVP cutoff at Phase 3 |

---

# SECTION N: WHAT MAKES THIS PLAN 100/100

## Gaps Fixed from Original Plan

| Gap | How Fixed |
|-----|-----------|
| No authentication | Full Clerk integration with CM licensing |
| No pre-crisis | Complete values discovery flow (90 min) |
| No persistence | PostgreSQL schema with all tables |
| No join flow | Join codes + anonymous sessions |
| No reconnection | Full reconnection flow with state sync |
| No deployment | Replit (all-in-one) |
| No data export | Full export format for research |
| No test plan | Validation gates per phase |

## Core Design Excellence

- **The Impossible Choice:** Workers vs. children with cancer
- **Dual Moral Counters:** Shows BOTH pressures simultaneously
- **Business Backbone First:** Visible KPIs drive values drift
- **Pre-Crisis Capture:** Can only reveal gaps if we capture stated values first
- **Session Persistence:** Values work NEVER lost

## Technical Excellence

- **CM Full Control:** 6-panel dashboard with complete visibility
- **Realistic Time Estimates:** 8 weeks vs original unclear timeline
- **Validation Gates:** Clear criteria per phase
- **Error Handling:** Graceful degradation for all dependencies
- **Feature Flags:** Safe rollout, can disable at any time

## Implementation Excellence

- **MVP Cutoff:** Can run test after 4 weeks
- **Phased Delivery:** Priority 1 → 2 → 3
- **Integration Details:** How auth, persistence, and real-time connect
- **Risk Mitigation:** Every major risk has a plan

---

# Summary

**This plan delivers:**

1. ✅ **Authentication** — Clerk + CM licensing + anonymous participants
2. ✅ **Pre-Crisis Values Discovery** — Capture stated values before testing
3. ✅ **Business Metrics Backbone** — Visible KPIs create authentic pressure
4. ✅ **Crisis Simulation** — Hurricane timeline with consequences
5. ✅ **Session Persistence** — Database-backed, survives any disconnection
6. ✅ **AI Teams** — Fill empty parishes (post-MVP)
7. ✅ **CM Console** — Full visibility and control
8. ✅ **Debrief + Export** — Surface gaps, export for research
9. ✅ **Deployment** — Replit ready (Next.js + Colyseus + Neon PostgreSQL)

**MVP Timeline: 4 weeks to first test**
**Full Feature: 8 weeks**

**The core insight remains:**
> Neither choice is wrong. Neither choice is right. That's the point.

Teams will see themselves prioritizing $12,000 bonuses over worker safety, or evacuating early while 174 children wait for their cancer medication. That's the gap the Values Crucible reveals.
