# Values Crucible: Codebase Audit v2

**Date:** December 15, 2025  
**Files Reviewed:** CrucibleRoom.ts, CrucibleState.ts, AgentOrchestrator.ts, schema.prisma, prisma.ts, package.json

---

## 🚨 BLOCKERS — Answer Before Proceeding

I cannot complete this audit without these files:

| File | Why Critical | Upload Priority |
|------|--------------|-----------------|
| `packages/shared/src/constants/` | Contains PARISHES definition — determines parish update scope | **NOW** |
| `apps/server/src/agents/NarrativeAgent.ts` | May be stubbed or complete — changes AI work estimate by 20+ hours | **NOW** |
| `apps/server/src/agents/ConsequenceAgent.ts` | Same — core game loop depends on this | **NOW** |
| `apps/server/src/agents/ValuesObserver.ts` | Same — ABCD coding implementation | **NOW** |
| `apps/web/app/` | Any existing frontend? Changes scope by 40+ hours | **NOW** |

**⚠️ All estimates below assume these files are STUBBED. If implemented, reduce timeline by 30%.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CRUCIBLE ENGINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    WebSocket     ┌──────────────────────────────┐│
│  │   CM Console │◄──────────────►  │                              ││
│  │   (Missing)  │                  │      CrucibleRoom            ││
│  └──────────────┘                  │      (1,133 lines)           ││
│                                    │                              ││
│  ┌──────────────┐                  │  • Session management   ✅   ││
│  │ Team UI × 6  │◄──────────────►  │  • State sync           ✅   ││
│  │   (Missing)  │                  │  • Decision processing  ✅   ││
│  └──────────────┘                  │  • Simulation tick      ✅   ││
│                                    │  • Weather progression  ✅   ││
│  ┌──────────────┐                  │  • Effect scheduling    ✅   ││
│  │     Map      │◄── reads state   │                              ││
│  │   (Missing)  │                  └───────────┬──────────────────┘│
│  └──────────────┘                              │                   │
│                                                ▼                   │
│                              ┌─────────────────────────────────┐   │
│                              │     AgentOrchestrator           │   │
│                              │     (coordinates 5 agents)      │   │
│                              └───────────┬─────────────────────┘   │
│                                          │                         │
│         ┌────────────────────────────────┼────────────────────┐    │
│         ▼              ▼                 ▼          ▼         ▼    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ ┌──────┐ │
│  │ Narrative  │ │Consequence │ │  Values    │ │Tempest │ │Report│ │
│  │   Agent    │ │   Agent    │ │  Observer  │ │Monitor │ │Agent │ │
│  │    (?)     │ │    (?)     │ │    (?)     │ │  (?)   │ │ (?)  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────┘ └──────┘ │
│       │                                                            │
│       ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Claude API                                │   │
│  │                    (claude-sonnet-4-5-20250929)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL (Prisma)                       │   │
│  │  Sessions │ Teams │ Decisions │ Reflections │ Reports       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Legend:  ✅ = Verified complete   (?) = Exists but unverified
```

---

## Verified Complete (Evidence-Based)

### 1. CrucibleRoom.ts — The Game Server

**Verdict: Production-ready.** 1,133 lines of clean, well-structured code.

| Capability | Lines | Evidence |
|------------|-------|----------|
| Session create/recover | 81-159 | Checks for existing session, reconstructs state |
| Parish initialization | 161-184 | Iterates `PARISHES` constant dynamically |
| 15 message handlers | 186-358 | decision, cm:setIntensity, cm:setPhase, team:ready, etc. |
| Join/leave lifecycle | 361-416 | Proper cleanup, broadcast events |
| Simulation tick loop | 650-701 | 5-sec intervals, weather/resource/effect updates |
| Decision → Consequence chain | 703-750 | Parallel AI calls, effect scheduling |
| Scheduled effects | 857-925 | Ripple (time-delayed) + Conditional triggers |
| Weather state machine | 927-976 | Hurricane approach → conditions escalate |
| Resource consumption | 978-996 | Population-based depletion |

**Code Quality Indicators:**
```typescript
// Consistent auth pattern (line 484-488)
private handleSetIntensity(client: Client, level: number) {
  const metadata = client.userData as ClientMetadata | undefined;
  if (metadata?.role !== 'cm') {
    client.send('error', { message: 'Only Crucible Master can adjust intensity' });
    return;
  }
  // ...
}

// Persist-before-broadcast pattern (line 447-478)
// 1. PERSIST to database first
await this.persistence.persistDecision({...});
// 2. THEN update Colyseus state  
this.state.decisions.push(decision);
// 3. THEN broadcast to clients
this.broadcast('decisionMade', {...});
```

### 2. CrucibleState.ts — Synchronized State

**Verdict: Complete schema, well-designed.**

All state automatically syncs to connected clients via Colyseus. Key structures:

| Schema | Key Properties | Notes |
|--------|---------------|-------|
| `CrucibleState` | parishes (Map), teams (Map), decisions (Array), feed (Array) | Root state |
| `ParishState` | id, name, resources, status, morale | One per parish |
| `TeamState` | statedValues, commitmentStatement, decisionProcess, ready | Discovery phase data captured |
| `Decision` | choice, rationale, advocatedBy, notableMoment, processed | Full audit trail |
| `HurricaneState` | category, trajectory, certaintyPercent, hoursToImpact | Probabilistic storm tracking |
| `IntensityState` | global (1-10), byTeam (Map), tempestAdvisory | CM control + AI recommendation |

**Design Strength:** Phases already match our 6-hour structure:
```typescript
// 'lobby', 'discovery', 'briefing', 'storm', 'recovery', 'debrief'
```

### 3. schema.prisma — Database Design

**Verdict: Production-ready, properly indexed.**

| Model | Records | Relationships |
|-------|---------|---------------|
| Session | Per game | → Teams, Decisions, StreamingContent, Reflections, Reports |
| Team | Per parish | → Session, Participants, Decisions |
| Participant | Per person | → Team, DecisionAdvocates, Reflections |
| Decision | Per choice | → Session, Team, Advocates + JSON valuesAnalysis |
| Reflection | Debrief | visibility: 'private' / 'team' / 'facilitator' |
| Report | Output | type: 'personal' / 'team' / 'organizational' / 'cm' / 'data' |

**Key Index:** `@@index([sessionId, simulationTime])` — enables timeline reconstruction.

### 4. AgentOrchestrator.ts — AI Coordination

**Verdict: Orchestration complete, individual agents unverified.**

```typescript
// 5 agents coordinated (lines 72-79)
this.narrativeAgent = new NarrativeAgent({ apiKey, model });
this.consequenceAgent = new ConsequenceAgent({ apiKey, model });
this.tempestMonitor = new TempestMonitor({ apiKey, model });
this.valuesObserver = new ValuesObserver({ apiKey, model });
this.reportAgent = new ReportAgent({ apiKey, model });
```

**Reliability Pattern:** Circuit breaker with typed fallbacks
```typescript
async calculateConsequences(decision, state): Promise<ConsequenceResult> {
  return this.circuitBreaker.execute(
    () => this.consequenceAgent.calculateConsequences(decision, state),
    { ...FALLBACK_CONSEQUENCES }  // Graceful degradation
  );
}
```

**Return Types Defined:**
- `ConsequenceResult`: immediate[], ripple[], delayed[], narrativeHooks[]
- `ValuesObservation`: statedValuesAnalysis[], abcd{}, notableMoment, participantDynamics
- `NarrativeContent`: type, source, content, urgency, relatedParish, breaking
- `TempestAssessment`: currentZone (comfort/learning/panic), recommendation, suggestedLever

---

## Gaps Requiring Work

### GAP 1: Frontend UI — **~80 hours**

| Component | Purpose | Complexity | Hours |
|-----------|---------|------------|-------|
| CM Console | Intensity dials, phase control, decision feed, team status | High | 24 |
| Team Interface | Decision forms, rationale input, streaming feed | High | 20 |
| Map Visualization | Parish status, hurricane track, real-time updates | Medium | 16 |
| Discovery Phase | Values selection, ranking, commitment builder | Medium | 10 |
| Debrief UI | Reflection submission, report viewing | Low | 10 |

**Risk:** If apps/web has existing scaffold, reduce by 20-30 hours.

### GAP 2: Individual Agent Implementation — **0-40 hours**

| Agent | If Stubbed | If Complete |
|-------|-----------|-------------|
| NarrativeAgent | 12 hours | 0 |
| ConsequenceAgent | 12 hours | 0 |
| ValuesObserver | 8 hours | 0 |
| TempestMonitor | 4 hours | 0 |
| ReportAgent | 4 hours | 0 |

**Cannot estimate without seeing files.**

### GAP 3: Persona Fences — **16 hours**

Current NarrativeAgent (if implemented) likely generates freely. Need constrained characters:

| Persona | Role | Primary Tension |
|---------|------|-----------------|
| Mayor Chen | Sterling | Community safety vs. economic pressure |
| FEMA Director Hayes | External | Federal protocol vs. local needs |
| CEO Marcus Webb | Summit | Shareholder duty vs. human cost |
| Union Rep Torres | Haven | Worker safety vs. job preservation |
| Dr. Okonkwo | Sterling Hospital | Triage ethics vs. resource limits |

**Work:** Define fence structure, implement in NarrativeAgent prompts.

### GAP 4: Parish Update — **2 hours**

Change from 5 → 6 parishes. Depends entirely on how PARISHES is defined in shared package.

**If simple constant:**
```typescript
export const PARISHES = {
  summit: { id: 'summit', name: 'Summit', ... },
  heartland: { id: 'heartland', name: 'Heartland', ... },
  // ...
};
```
→ 2 hours to update

**If complex with hardcoded references:** Could be 8+ hours.

### GAP 5: Content Library — **20 hours**

| Content Type | Quantity | Hours |
|--------------|----------|-------|
| Watch phase dilemmas | 20 | 8 |
| Crisis phase dilemmas | 20 | 8 |
| Recovery scenarios | 10 | 4 |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Agents are stubbed | 60% | +40 hours | Upload files NOW to confirm |
| Frontend more complex than estimated | 40% | +20 hours | Start with minimal viable UI |
| Colyseus scaling issues | 20% | Playtest fails | Test with 30 concurrent users early |
| Claude API rate limits | 30% | Degraded experience | Circuit breaker already implemented ✅ |
| Parish refactor cascades | 20% | +10 hours | Check all string literals |

---

## Sprint Plan (Dependency-Ordered)

### Week 1: Foundations (40 hours)

```
[BLOCKED until file upload]
├── Verify agent implementations
├── Update PARISHES to 6
└── Review apps/web structure

[Can start now]
├── CM Console scaffold (React + Tailwind)
│   └── Layout, routing, auth stub
└── Team Interface scaffold
    └── Layout, routing, team selection
```

### Week 2: Core Loop (40 hours)

```
[Depends on: Week 1 scaffolds]
├── CM Console: Intensity dial component
├── CM Console: Phase control buttons  
├── CM Console: Decision feed (read from Colyseus state)
├── Team UI: Decision submission form
└── Team UI: Streaming content display

[Parallel]
└── Implement/verify ConsequenceAgent
```

### Week 3: Map & Narrative (40 hours)

```
[Depends on: Colyseus connection working]
├── Map: Static parish layout (SVG or Canvas)
├── Map: Status indicators (power, morale, resources)
├── Map: Hurricane position overlay
└── Map: Real-time state binding

[Parallel]
├── Implement/verify NarrativeAgent
└── Define 5 persona fences
```

### Week 4: Discovery Phase (32 hours)

```
[Depends on: Team UI scaffold]
├── Values selection interface
├── Ranking mechanism (drag-drop or number)
├── Commitment statement builder
├── Decision process selector
└── Team ready flow

[Parallel]
└── Implement/verify ValuesObserver
```

### Week 5: Content & Polish (40 hours)

```
[Depends on: Core loop working]
├── Write 20 Watch phase dilemmas
├── Write 20 Crisis phase dilemmas
├── Implement persona-constrained generation
└── Sound design integration (ambient, alerts)
```

### Week 6: Integration Testing (32 hours)

```
├── End-to-end flow: Discovery → Storm → Debrief
├── 2-person playtest (you + 1)
├── Bug fixes from playtest
└── CM facilitator guide draft
```

### Week 7-8: Full Playtest Cycle (40 hours)

```
├── 5-person internal playtest
├── Collect feedback
├── Iteration on pain points
├── Balance adjustments (intensity curves, timing)
└── Participant quick-start guide
```

**Total: ~260 hours to playable MVP**

At 20 hours/week = 13 weeks  
At 30 hours/week = 9 weeks  
At 40 hours/week = 7 weeks

---

## Immediate Next Actions

| # | Action | Owner | Deliverable |
|---|--------|-------|-------------|
| 1 | Upload agent files | Jerry | NarrativeAgent.ts, ConsequenceAgent.ts, ValuesObserver.ts, TempestMonitor.ts |
| 2 | Upload shared constants | Jerry | packages/shared/src/constants/ |
| 3 | Upload web app structure | Jerry | apps/web/app/ directory listing |
| 4 | Set target playtest date | Jerry | Date for first 5-person session |
| 5 | Begin CM Console scaffold | Claude | React component structure |

---

## Conclusion

**What you have:** A working real-time multiplayer game server with database persistence, AI orchestration, and sophisticated state management. This is not a prototype — it's production infrastructure.

**What you need:** UI to expose it, content to fill it, and testing to prove it.

**Confidence level:** 85% that MVP is achievable in 8-10 weeks with focused effort, contingent on agent implementation status.

**Single biggest unknown:** Are the 5 AI agents implemented or stubbed? This swings the estimate by 40 hours.
