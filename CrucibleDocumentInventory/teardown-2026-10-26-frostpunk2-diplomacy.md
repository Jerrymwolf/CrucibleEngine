---
title: "Rules teardown: Frostpunk 2 + Diplomacy, mapped onto Concordia"
date: 2026-10-26
type: design-note
status: draft
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, design, reverse-engineering, frostpunk-2, diplomacy, ai-dilemmas, godot]
related:
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[decision-2026-10-21-reflexive-issue-engine]]"
  - "[[paper-prototype-2026-10-22]]"
---

# Rules teardown: Frostpunk 2 + Diplomacy

## 0. Why the paper version failed (Jerry, 2026-10-26 00:44)

> "The choices weren't dynamic related to the values people chose. Ai can do that better at speed."

The paper deck was fixed. A table could sign "Safety, then Loyalty, then Fairness" and the cards that followed had no idea. So the moment of choice never pushed on *their* values, and the debrief had nothing personal to show.

**Design rule from this:** every dilemma is written for one table, from that table's own ranked values, at that moment on the map. Frostpunk 2 gives us the political machine; Diplomacy gives us the turn; an AI Dilemma Director (section 3) is the new part neither game has.

## 1. Frostpunk 2: the inside of a parish

| Frostpunk 2 loop | How it works there | Concordia version |
|---|---|---|
| **Council vote** | 100 delegates split among factions; a law needs 51. Delegates vote by ideology, and by Trust in the Steward for "rule" laws | Both parish teams (community, Meridian) vote on every order. Owner of the resource decides (already decided 2026-10-21). Vote split shows on the wall |
| **Factions with ideologies** | Each faction holds a worldview; laws are tagged with the ideology they serve, so alignment predicts the vote | Each team's **signed values stance** is its ideology. Every option the AI writes is tagged with which of the table's ranked values it honours and which it costs |
| **Negotiation by promise** | To win votes you promise a faction a future law or build; fulfil it and that group's relation and overall Trust rise, break it and they fall | Logged promises (decision 5, 2026-10-22): typed on the tablet, the other side confirms, engine tracks, kept/broken moves the receiver's trust and hits the ticker |
| **Trust and Tension** | Trust = faith in the leader; Tension = city-wide unrest from shortages and divisive laws. High tension makes authoritarian laws pass easier | **Community trust** and **board confidence** (decision 4). Low trust cuts yields; low confidence brings Meridian executive pressure. Storm stress plays the Tension role, making "emergency" options easier to justify, which is exactly the pressure the debrief examines |
| **Workforce and districts** | Districts need workers, heat, food, materials; shortages raise tension | Yields with people as workforce (decision 2). Saved people and working assets earn each storm turn |
| **Whiteouts** | Forecast countdown, prepare, then the storm hits and drains stockpiles | Storm turns with a visible forecast (Q1 prep, Q2 approach, Q3 landfall, Q4 recovery). Prep projects pay off when the storm lands |
| **Faction asks** | Factions bring demands that become pressure if ignored | Named in-world leaders (elder, pastor, mayor; Meridian executives) deliver asks, goals and pressure (2026-10-22 "Voices") |

Not taken: Frostpunk 2's research tree, frostland expeditions, city-building grid. Too much to learn in 120 minutes.

## 2. Diplomacy: the turn between the 10 teams

| Diplomacy rule | How it works there | Concordia version |
|---|---|---|
| **Negotiation phase** | Open talk; any promise can be broken | Planning window (60-90 s). Teams can walk to other tables. Only logged promises are tracked |
| **Secret written orders** | Each power writes orders privately | Each parish's two teams submit orders on their tablet; nobody sees others' until reveal |
| **Simultaneous reveal and adjudication** | All orders resolve at once by fixed rules; no dice | All orders reveal on the wall, then 3 storm hours play out (~15 s). The engine resolves deterministically from seed + orders |
| **Support and convoy** | One unit helps another's move | Cross-parish gift, loan or trade (map-enforced), decided 2026-10-21 |
| **Standoff** | Equal force into one space bounces; nobody gets it | Two parishes claiming the same scarce asset (e.g. the dam's spare capacity, a relief flight slot) with equal claim: neither gets it this turn. Forces talk |

Reference code: open-source Diplomacy adjudicators (DATC test cases) for the order-resolution pattern; no reverse engineering needed.

## 3. The AI Dilemma Director (the fix for section 0)

**Job:** each storm turn, write one dilemma per parish that makes that parish collide two of *its own* ranked values, using what is actually on the map.

**Inputs (per parish, per turn):** signed values stance (3 ranked values + statement, per person and per team); map state (units, assets, people at risk, meters, stockpiles); last 3 choices and which value each served; open promises; storm phase and intensity; the leader voice due this turn.

**Output (typed JSON, validated before use):**
- situation (2-3 sentences, one named resident with a face);
- 2-3 orders, each with resource cost, who owns the call (community or Meridian), yield effect, and the value tags `{honours: [...], costs: [...]}` from the table's own list;
- deadline = end of this planning window;
- leader voice line and news-ticker line for each outcome.

**Rules it follows:**
- The two values in tension must come from the table's ranking; higher storm intensity means it targets the top-ranked value.
- After a table sacrifices a value, a later dilemma tests whether that becomes a pattern (Frostpunk's "laws build a city's character").
- It names the competing values at the moment of choice (Jerry 2026-10-21) but never scores or judges (witness model).
- Pressure only from off-board voices (audit rule 2026-10-21).

**Speed:** dilemmas for turn N+1 are written during turn N's play-out and planning (75-105 s budget, 5 parallel calls). That is well within one Claude call each.

**Determinism:** the AI never runs inside the engine. Its output enters the run log as an input, so `replay` reproduces the game without calling the AI.

**CM control:** the CM can release, edit or skip each one; cruise control auto-releases validated ones (decision 2026-10-21).

**Offline fallback:** a content library in `crucible/content/` keyed by value pair (e.g. Safety x Loyalty) and storm phase, filled from map slots. Still personal to the table's values, just less specific to the moment.

## 4. Where REA earns its keep

Only on a copy of Frostpunk 2 that Jerry owns, and only where the community wikis are silent: e.g. exactly how much a broken promise drops Trust, or how Tension accumulates per shortage. One formula per question; we reimplement from understanding. Diplomacy needs none (open source).

## 5. First build slice (proposed)

One parish (Keystone), both teams, 3 storm turns, AI-written dilemmas from a typed-in values stance, two meters, one promise. Goal: Jerry plays 10 minutes and feels the dilemma was written *for his values*. Go/no-go before anything else is built.

## Sources

- Frostpunk 2 council, voting, promises, trust: https://frostpunk-2.game-vault.net/wiki/Council ; https://en.wikipedia.org/wiki/Frostpunk_2
- Diplomacy rules and adjudication (DATC): standard Avalon Hill rulebook; open-source adjudicators
- REA capabilities: https://github.com/morluto/rea
