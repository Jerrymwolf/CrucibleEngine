---
title: "Rules teardown: Frostpunk 2 + Diplomacy, mapped onto Concordia"
date: 2026-10-26
type: design-note
status: draft (v2, after audit)
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, design, reverse-engineering, frostpunk-2, diplomacy, ai-dilemmas, godot]
related:
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[decision-2026-10-21-reflexive-issue-engine]]"
  - "[[paper-prototype-2026-10-22]]"
  - "[[audit-2026-10-26-teardown]]"
  - "[[research-2026-10-26-rts-weather-map-conditions]]"
---

# Rules teardown: Frostpunk 2 + Diplomacy

> **v3, 2026-10-26 00:57.** Jerry chose Dune: Spice Wars + Northgard as the storm-and-map reference. Added section 7 (map, storm track, forecast calendar, units, site states).
>
> **v4, 2026-10-26 00:58.** Jerry chose Anno 1800 + Civilization for supplies. Added section 8.

> **v2, 2026-10-26.** Revised after the 1-100 audit ([[audit-2026-10-26-teardown]], v1 63, v2 100). Changes: dilemmas per parish built from both teams' values; storm-turn sequence (section 2b); win condition; dilemma cadence; timing fix; validator; 40-template offline fallback; data shapes (section 6).

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
| **Trust and Tension** | Trust = faith in the leader; Tension = city-wide unrest from shortages and divisive laws. High tension makes delegates more likely to back laws that raise the leader's authority | **Community trust** and **board confidence** (decision 4). Low trust cuts yields; low confidence brings Meridian executive pressure. Our adaptation, not Frostpunk's: there is no third meter. Storm intensity does Tension's job by making "emergency" orders available and easier to justify, which is the pressure the debrief examines |
| **Workforce and districts** | Districts need workers, heat, food, materials; shortages raise tension | Yields with people as workforce (decision 2). Saved people and working assets earn each storm turn |
| **Whiteouts** | Forecast countdown, prepare, then the storm hits and drains stockpiles | Storm turns with a visible forecast (Q1 prep, Q2 approach, Q3 landfall, Q4 recovery). Prep projects pay off when the storm lands |
| **Faction asks** | Factions bring demands that become pressure if ignored | Named in-world leaders (elder, pastor, mayor; Meridian executives) deliver asks, goals and pressure (2026-10-22 "Voices") |
| **Winning by stockpile** (our rule, 2026-10-21) | Frostpunk 2 has no score; survival is the goal | The team with the most resources left at the end wins, shown live. This is the pull against spending on people, and yields (saved people earn) are the counter-pull. Every dilemma must put both on the table |

Not taken: Frostpunk 2's research tree, frostland expeditions, city-building grid. Too much to learn in 120 minutes.

## 2. Diplomacy: the turn between the 10 teams

| Diplomacy rule | How it works there | Concordia version |
|---|---|---|
| **Negotiation phase** | Open talk; any promise can be broken | Planning window (60-90 s). Teams can walk to other tables. Only logged promises are tracked |
| **Secret written orders** | Each power writes orders privately | Each parish's two teams submit orders on their tablet; nobody sees others' until reveal |
| **Simultaneous reveal and adjudication** | All orders resolve at once by fixed rules; no dice | All orders reveal on the wall, then 3 storm hours play out (~15 s). The engine resolves deterministically from seed + orders |
| **Support and convoy** | One unit helps another's move | Cross-parish gift, loan or trade (map-enforced), decided 2026-10-21 |
| **Standoff** | Equal force into one space bounces; nobody gets it | Two parishes claiming the same scarce asset (e.g. the dam's spare capacity, a relief flight slot) with equal claim: neither gets it this turn. Forces talk |

### 2b. One storm turn, step by step

1. **Reveal dilemmas** (0 s). Each parish's dilemma, written after the last turn resolved, appears on both of its tablets.
2. **Plan and talk** (60-90 s, CM-editable). Teams vote on the dilemma, set routine orders (move units, run projects, send gifts, loans or trades) and may log promises. Both teams see each other's votes; the owner of each resource makes the final call.
3. **Lock orders** (end of window). An unanswered dilemma takes no value reading: "the storm decided" (2026-10-21 rule), and its default consequence plays out.
4. **Resolve** (instant). The engine resolves every order at once from seed + orders: costs, standoffs, storm damage, yields, meters, promise checks. The new state is known before anything animates.
5. **Play out on the wall** (~15 s). Three storm hours animate; the news ticker and leader lines run.
6. **Write next dilemmas** (starts at step 4). The director writes from the resolved state while step 5 plays. See section 3, Timing.

**Cadence:** about 35 storm turns in a session. Not every turn has a dilemma. Default is one per parish every other turn in Q1, Q2 and Q4, and every turn in Q3 (landfall), roughly 20 per parish per session. Routine turns are for moving units and keeping promises. CM-editable.

Reference code: open-source Diplomacy adjudicators (DATC test cases) for the order-resolution pattern; no reverse engineering needed.

## 3. The AI Dilemma Director (the fix for section 0)

**Job:** when a parish's dilemma is due, write one dilemma for that parish that forces a collision between values *these players signed*, using what is actually on the map.

**Whose values:** a parish has two teams and two signed stances. The dilemma names two values in collision, chosen in this order of preference:
1. the community team's top value against the Meridian team's top value (the fight is between the tables);
2. otherwise, two values from one team's ranking (the fight is inside the table).
Each order then shows, for *each* team, which of its values it honours and which it costs. Both tablets see the same dilemma, each read through its own stance.

**Inputs:** both teams' ranked values and signed statements (team level only; personal stances never leave the person's device, 2026-10-21 safety rule); resolved map state (units, assets, people at risk, meters, stockpiles, standings); each team's last three choices and their value tags; open promises; storm phase and intensity; the leader voice due this turn.

**Rules it follows:**
- Every order has a real cost (D1-D7, 2026-10-21) and at least one order spends resources that would help the stockpile win.
- At intensity 3-4 the collision must include a team's #1 value.
- **Repeat pattern:** if a team costs the same value in two dilemmas running, the next dilemma for that parish offers a cheap way to cost it a third time. The debrief can show whether it became a habit.
- It names the competing values at the moment of choice (Jerry 2026-10-21) but never scores or judges (witness model).
- Pressure only from named off-board voices (audit rule 2026-10-21).

**Validator (in the engine, before release):** every cost exists in that parish's stock; every value tag is in that team's ranking; owner is the actual owner of the resource spent; 2-3 orders; text within length limits. A dilemma that fails is rewritten once, then replaced by the fallback.

**Timing:** writing starts the moment turn N resolves (step 4), so the director sees the real board. Play-out (~15 s) plus a dilemma-free routine turn usually covers it. If a dilemma is still not ready 20 s into the planning window, the fallback is used for that turn and the AI dilemma is discarded (never shown late, which would shorten a team's deadline unfairly). Five parishes write in parallel.

**Volume:** about 20 dilemmas per parish, 100 per session, plus rewrites. Each is one Claude call on the default tier.

**Determinism:** the AI never runs inside the engine. Its output enters the run log as an input, so `replay` reproduces the game without calling the AI.

**CM control:** cruise control is the default. Each released dilemma shows on the CM screen with a 10-second veto; the CM can pin, edit or skip any parish's next dilemma at any time (decision 2026-10-21, adjusted for volume).

**Offline fallback:** the 40 values sit in four families in `values.json` (openness to change, self-enhancement, conservation, self-transcendence). 10 family pairs x 4 storm phases = 40 templates in `crucible/content/`, with slots filled from the map and the teams' actual value names. Less sharp than the AI, still built from the table's values.

**Test page:** https://claude.ai/artifact/P8p5HGRUF2HzvMnTtL5fci (`crucible/viewer/dilemma-director.html`), one moment, two stances, dilemmas side by side.

## 4. Where REA earns its keep

Only on a copy of Frostpunk 2 that Jerry owns, and only where the community wikis are silent: e.g. exactly how much a broken promise drops Trust, or how Tension accumulates per shortage. One formula per question; we reimplement from understanding. Diplomacy needs none (open source).

## 5. First build slice (proposed)

One parish (Keystone), both teams, 3 storm turns, AI-written dilemmas from a typed-in values stance, two meters, one promise. Goal: Jerry plays 10 minutes and feels the dilemma was written *for his values*. Go/no-go before anything else is built.

## 6. Data shapes (first cut)

```json
{"dilemma": {"id": "d-keystone-t07", "parish": "keystone", "turn": 7,
  "collision": [{"team": "community", "value": "safety"}, {"team": "meridian", "value": "excellence"}],
  "title": "...", "situation": "...", "resident": "...",
  "voice": {"who": "Dana Kell, Meridian VP Operations", "line": "..."},
  "orders": [{"id": "o1", "label": "...", "owner": "meridian",
    "cost": {"bus": 2, "technicians": 6}, "yield_next": {"doses": -4000, "residents_safe": 140},
    "tags": {"community": {"honours": ["safety"], "costs": []}, "meridian": {"honours": [], "costs": ["excellence"]}},
    "news": "..."}],
  "default_order": "o2", "source": "ai|fallback", "model": "pinned id", "validator": "pass"}}
```

```json
{"order": {"turn": 7, "parish": "keystone", "team": "meridian", "kind": "dilemma|move|project|gift|loan|trade|promise",
  "ref": "o1", "votes": {"community": "o2", "meridian": "o1"}, "final_call_by": "meridian"}}
```

Both go into the run log as inputs, which is what makes replay exact.

## 7. The map and the storm (Dune: Spice Wars + Northgard)

### 7a. Map: parishes split into sites (Diplomacy provinces, Dune regions)

Five parishes, four around the edge and one in the centre (2026-10-21). Each has 3-4 **sites**; units move site to site along roads. First cut, names from current lore; Jerry owns the canon:

| Parish | Sites (first cut) | Who owns what |
|---|---|---|
| Sterling (north) | Capitol, General Hospital, Old Town, Heliport | Government and hospital: community; heliport: shared |
| Heartland (centre, name pending) | Meridian HQ, the Dam, Pump Station, Crater Road | Dam and HQ: Meridian (built for the community) |
| Gateway | Kelp Beds, Airport, Beach Hotels, Fishers' Quay | Kelp and airport: Meridian; quay: community |
| Keystone | Biotech Plant, Low Ward, St. Brendan's, Tech Housing | Plant: Meridian; ward and church: community |
| Haven | Port, Cold Store, Harbour Town, Breakwater | Port and cold store: Meridian; town: community |

Roads link sites inside a parish and link neighbouring parishes through the centre and along the coast. The ring road and crater roads already exist in `concordia.json` (`CRATER_ROADS`).

### 7b. Site states (Company of Heroes 2 ground, Dune hazards)

Each site is in one state at a time; the engine changes it at resolve:

- **Dry**: normal.
- **Flooded**: road units cannot enter; boats can; people there are at risk each turn.
- **Cut off**: roads in or out closed; only boats or the helicopter reach it.
- **Dark**: power out; facilities stop and yields from it are zero unless a generator is there.
- **Wrecked**: assets destroyed; needs a repair project in Q4.

### 7c. The storm track (Dune sandstorms)

Hurricane Midas is drawn on the wall as a moving eye with an outer band. Each storm turn it advances along a track stored in `crucible/content/timeline.json`. Sites under the band take damage by intensity: rising chance of Flooded, Cut off or Dark, decided by the seeded RNG so replay is exact. Units in a site under the eyewall that are not in shelter are lost. The track is fixed per scenario seed; the CM can pick one of several tracks at setup.

### 7d. Forecast calendar (Northgard)

A strip across the top of every tablet and the wall shows the next 3 storm turns: which sites the band will reach, surge warnings at coastal sites, and planned power cuts. Accuracy falls with distance: next turn certain, two out likely, three out possible. Prep projects in Q1 (sandbags, moving people, fuelling generators) target sites named on the calendar, so teams can see why prep pays.

### 7e. Flash warnings (Dune sandworms)

Once or twice a quarter, one site gets a one-turn warning: "Breakwater fails next turn" or "Dam spillway opens in 3 hours". Units and people there must move now or be lost. These are the sharpest prompts for the Dilemma Director: the dilemma is written around the warned site.

### 7f. Units (Emergency series, light)

Each parish starts with a handful of units, owned by one team: buses, trucks, boats, work crews, generators, medical teams; Sterling holds the island's one helicopter. A unit moves one road link per storm turn (two on the ring road while dry). Sending a unit is an order; units can be lent across parishes as gift, loan or trade (2026-10-21).

### 7g. How it feeds the rest

- **Yields:** dry, powered, staffed sites earn; flooded, dark or wrecked sites don't. Saved people return to work in Q4.
- **Dilemmas:** the director always places a dilemma at a site that is warned, flooded or cut off, so the map makes the moral problem.
- **Meters:** people lost at community sites drop community trust; lost Meridian output drops board confidence.
- **Debrief:** the replay shows the storm track over the choices, so tables see what they knew when they chose.

## 8. Supplies (Anno 1800 + Civilization)

### 8a. Goods (first cut, values in content JSON)

| Good | Made at | Mostly owned by | Used for |
|---|---|---|---|
| Food | Fishers' Quay, Harbour Town, Cold Store (stores it) | Community | Feeding people at every site each turn |
| Water | Pump Station (needs Dam power) | Meridian (built for the community) | People; the Biotech Plant needs ultrapure water |
| Power | The Dam; mobile generators | Meridian | Keeps sites from going Dark |
| Fuel | Port, Airport | Shared | Moving units, running generators |
| Kelp | Kelp Beds | Meridian | Raw input for the cure |
| Cure doses | Biotech Plant | Meridian | Shipped from the Port for Funds; also saves lives |
| Funds | Shipping doses; Meridian HQ | Meridian | Buying help from off-island; trades |
| Volunteers | Every community site | Community | Staffing sites; crews |

### 8b. People work sites (Civilization worked tiles)

Every site has staff slots. Each turn a staffed site yields its goods; an empty or Dark site yields nothing. Residents are the workforce: people moved to shelter stop working until it is safe, people lost never come back, and people saved return to work in Q4. That is the "yields with people as workforce" rule (decision 2, 2026-10-22) made concrete: saving people costs now and earns later.

### 8c. Production chain across parishes (Anno 1800)

Kelp Beds (Gateway) -> Biotech Plant (Keystone, needs Power + Water from Heartland) -> Port (Haven) -> Funds. Each link is a different parish, so the most valuable chain on the island depends on four parishes cooperating, exactly when the storm makes each one want to hoard.

### 8d. Goods physically move (Anno shipping)

Goods between parishes travel as convoys (truck, boat) along the map's roads and sea lanes, one link per storm turn. Gifts, loans and trades (2026-10-21) are convoys too. A convoy entering a Flooded or Cut-off site stops; under the eyewall it is lost. A loan comes back if the storm spares it. The forecast calendar tells teams when a route is about to close.

### 8e. Needs (Anno population needs)

Each turn every populated site consumes food and water. Unmet needs drop community trust; missed dose shipments drop board confidence. Food in the Cold Store is safe from flooding; food left at a site that floods is lost (Northgard silos).

### 8f. Score

Each team's stockpile is the sum of the goods it owns at a fixed value per good (set in content JSON, shown on the wall). The highest stockpile wins (2026-10-21). Because yields only flow from staffed sites and moving goods, a team that hoards and lets people go loses its workforce and falls behind by Q4; the ledger (`crucible/paper/balance_ledger.py` style) must confirm do-nothing never wins.

## Sources

- Frostpunk 2 council, voting, promises, trust: https://frostpunk-2.game-vault.net/wiki/Council ; https://en.wikipedia.org/wiki/Frostpunk_2
- Diplomacy rules and adjudication (DATC): standard Avalon Hill rulebook; open-source adjudicators
- REA capabilities: https://github.com/morluto/rea
- Storm and map references: [[research-2026-10-26-rts-weather-map-conditions]]
