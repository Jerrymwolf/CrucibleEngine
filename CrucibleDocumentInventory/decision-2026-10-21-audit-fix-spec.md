---
type: decision
date: 2026-10-21
status: proposed
title: Audit fix spec and plan
supersedes: []
related:
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[decision-2026-10-21-rts-experience-flow]]"
  - "[[decision-2026-10-21-engine-allocations-aid]]"
  - "[[reference-2026-10-21-permission-and-pressure]]"
source: "Advisor panel audit, https://claude.ai/artifact/CNfhFiCekWbeof3o2CdfYH"
tags: [crucible, scoring, debrief, permission-and-pressure, spec, plan]
---

# Audit fix spec and plan

The advisor panel (UX and UI, mechanics, adult values learning, permission
and pressure) found that the story and screens work but **the scoring rewards
the wrong behavior**. This record turns the audit into a spec and a phased
plan. It changes [[ENGINE_SPEC]] and [[RUN_LOG_SCHEMA]]; this record is the
decision that covers those changes.

Canon for every term below: Jerry's dissertation, summarized in
[[reference-2026-10-21-permission-and-pressure]]. The seven anchors are
Heroic (+3), Exemplifying (+2), Striving (+1), Minimum Organizational
Expectations (0), Faltering (−1), Capitulating (−2), Villainous (−3). The
mortal middle is −1 to +1. **Ratings place moments, never people.**

## Decisions

Each was put to Jerry as a card. Rows marked *pending* use the recommended
option until he answers; the spec changes if he picks otherwise.

| # | Question | Recommended | Status |
|---|---|---|---|
| D1 | How a storm-decided card or silent mayday is scored | Capitulating (−2), marked "the storm decided"; its effects still play out | pending |
| D2 | What the wall shows about each table's values | Room pattern on the wall; each table's evidence only on its own console | pending |
| D3 | How far to recode the deck | Full recode into the mortal middle; +3 only with a real cost; coerced compliance capped at −2 with the coercer named | pending |
| D4 | When tables see the Authority charter clause | During play, as a permission to strive | pending |
| D5 | How pressure rises | Storm curve: windows ~180 / 140 / 90 s, recovery back to 150 s; heat and cool shift ±20 s | pending |
| D6 | What must land before the conference | All five phases, in order, each gated by a rehearsal | pending |

## Design principles

1. **The engine scores the answer, never the weather.** Only a table's chosen
   act carries a values rating. What the clock decides is recorded as its own
   kind of moment (D1).
2. **No free virtue.** A move rates Exemplifying or Heroic only when it costs
   the table something it can see: tokens, people at risk, time, or standing
   with HQ.
3. **Coerced is not coercer.** Complying under coercion is Capitulating at
   worst. Villainous is reserved for a table that itself coerces, deceives or
   abandons with full knowledge. The coercer is named on the card.
4. **Pressure is a cost on holding firm.** It rises with the storm and peaks
   at landfall, and the DM's levers change it.
5. **Choices must move the world.** Counters diverge with how tables play, and
   the wall shows the mid-storm trajectory, not just the end state.
6. **Evidence, not a score.** The debrief shows moments placed on the seven
   anchors and the reasons tables logged. No means, no red-green ranking.
7. **Reflection before revelation.** The two practitioner questions come
   before anyone sees other tables' secrets.

## Spec

### S1. Scoring (`crucible-core`: `values.rs`, `controller.rs`, `tally.rs`)

- **S1.1 Decision provenance.** Every decision record gets
  `source: chosen | storm | dm_entered`. A card that expires is `storm`. A
  mayday with no answer is `storm`, shown as "no answer (the storm decided)",
  never as REFUSE.
- **S1.2 Storm rating (D1).** A `storm` decision emits one signal per value
  the card tests, at −2 (or as D1 resolves), tagged `storm`. The default
  option's effects still apply; its values signals do not.
- **S1.3 Combine by strongest, not sum.** Per move and per value, keep the
  signal with the largest magnitude (ties go to the negative), so a move
  cannot stack chips.
- **S1.4 Caps on cost-free moves.** Allocation keeps rate 0 (Minimum
  Organizational Expectations). Credit lines, declares and repair sends each
  emit at most one signal per value per quarter, and none above +1 unless the
  move spends a token the table needed for its own open need.
- **S1.5 Rejected moves never score.** An option whose moves the engine
  rejects (declaring fuel the table does not hold) records the rejection and
  no values signal.
- **S1.6 Mirror output.** Replace per-table signed means with an evidence
  list per stated value: each moment, its anchor, its source, and the logged
  reason. Flag any stated value with fewer than two chosen moments as "not
  tested".

### S2. Deck recode (`crucible/content/dilemmas.json`, `values.json`)

Content only; no Rust. Done against the permission and pressure advisor's
per-dilemma coding table.

- **S2.1** Most options move to −1, 0 or +1. Target: no more than one ±3 per
  card, and every +3 carries a visible cost in the option text and effects.
- **S2.2** Compliance with Chicago, the Governor, the security chief or the
  board rates −2 at most. Keep the four genuine −3s. Each such card names its
  coercer in a new `pressure` field: `{ form, actor }`.
- **S2.3** `form` uses the dissertation's four social forms (coercive
  authority, conditional belonging, enforced silence, shame-related
  devaluation) plus `situational` (time, scarcity, odds, named residents).
- **S2.4** Fix drifted mappings: integrity is not contract-keeping, respect is
  not deference to the Governor, no stewardship credit for signing a false
  sentence. Rewrite the four hindsight debrief lines.
- **S2.5** Defaults are no longer chosen for virtue; with S1.2 they carry no
  option signal anyway. Pick the default that is most plausible for an
  institution that does nothing.
- **S2.6** Add 3 to 4 live pressure moments where HQ or another table applies
  one of the four social forms during play (for example, HQ makes aid
  conditional on silence about a shortfall).
- **S2.7** Widen deck coverage so candor, courage, duty, integrity and respect
  are each tested at least twice per table.

### S3. Consequences (`residents.rs`, `resources.rs`, `routes.rs`, `content/residents.json`)

- **S3.1 Conditional rescues.** A resident group is rescued only if a route is
  open, a boat or crew is assigned, and its parish answered the relevant
  mayday or card. Otherwise its risk accumulates.
- **S3.2 Needs bite.** At each quarter boundary an unmet need costs people
  safe or doses. Shelter places and cold bays written in allocation are read.
- **S3.3 Doses reflect choices.** Vault stock no longer ships automatically at
  the end; shipping needs an open route and a decision in recovery.
- **S3.4 Trajectory counters.** Add `lowest_people_safe` and
  `people_hours_at_risk` to state and the run log, and put them on the wall.
- **S3.5 Thin cards move counters.** Haven's four cards and the recovery cards
  for Gateway, Haven, Summit and Sterling each move at least one counter.
- **S3.6 Acceptance.** Over 200 seeds, hoarding, giving and random play end
  with clearly different counters, and deliberate play differs from random
  bots by more than noise.

### S4. Debrief (`board-rts/src/72-ui-projector.js`, `70-ui-table.js`, `71-ui-phone.js`, `73-ui-dm.js`)

New order, DM-advanced (no auto-advance):

1. **Counters and trajectory** (wall): what happened to the island, including
   the lowest point.
2. **Your moments** (each table's console, private, D2): each stated value,
   its moments on the seven anchors, chosen apart from storm, with the
   reasons the table logged.
3. **The two questions** (wall, consoles, DM read-aloud): *What made
   compromise acceptable? What made resistance costly?* Tables talk before
   anything else is revealed.
4. **Permission and pressure** (wall): the room's pattern, naming each
   pressure by form and actor, situational pressure apart from social. The
   Authority clause appears here as "who used it".
5. **The gap** (console): private phone votes against the table's card, as a
   table-level count, no names.
6. **Secrets** (wall): the sealed briefs.
7. **Credit lines and replay** (wall).
8. **Commitment** (phone): an implementation intention, "When ___ happens, I
   will ___", stored on the phone only and **never exported**.

The prepared debrief and "later" lines bundled with each card are shown in
step 2.

### S5. UX blockers (`board-rts`)

- Keep a decided card or sent mayday answer on screen with "Locked in: B"
  until the next item arrives.
- Sticky footer for the primary button at 1280×800 and 1024×768.
- Projector text floor of 22 to 28 px; fewer words per card.
- Touch targets at least 44 px. Relabel "Declare 2 FUEL", "phones may vote",
  "Enter / Seat", "+2.5 over 2", "LINE OF CREDIT" and the token
  abbreviations.
- A mayday never asks for a token the table does not hold, and never shows
  "00:00 left".
- Late moves are rejected as "expired", not "not open"; rejected allocations
  and late phone votes say so.
- On reconnect, show who must act now. Refresh the DM roster on join, not on
  the first tick.
- Authority charter clause visible on the table console during play (D4).

### S6. Pacing (`content/sessions/parish-90.json`, `controller.rs`, `inputs.rs`)

- **S6.1** Decision windows follow D5 by quarter. Heat and cool shift open and
  future windows by 20 s, logged as DM inputs so replay stays exact.
- **S6.2** Each quarter's cards open together after the quarter brief, not
  staggered, so the turn is synchronous. Cards and maydays do not overlap.

## Plan

Each phase ends with the same gate: `cargo test`, two identical runs per seed,
CLI replay of a browser export to the same hash, and a bot rehearsal
(`?role=dm&rehearsal=1&speed=18`) reviewed against the phase's acceptance.

| Phase | Work | Acceptance |
|---|---|---|
| 1. Scoring | S1, plus S2.2 and S2.4 (the recode that the scoring rules depend on) | A silent table never outscores an answering one on any value; no allocation keep or credit line mints above +1; coerced compliance never −3 |
| 2. Deck | S2.1, S2.3, S2.5 to S2.7 | Per-dilemma coding table regenerated; ≤1 ±3 per card; each tested value hit ≥2 times per table |
| 3. Consequences | S3 | S3.6 holds over 200 seeds |
| 4. Debrief | S4 | Rehearsal walks all 8 steps; no score or ranking on the wall; commitment absent from the export |
| 5. UX blockers | S5 | Re-run the UX advisor's checks at 1024×768 and on the projector |
| 6. Pacing | S6 | Window lengths match D5 in the log; heat changes a deadline |
| 7. Re-audit | Same four advisor lenses, same seeds | Each of the audit's seven blockers closed or explained |

Phases 4 and 5 touch only the front end and can run beside phases 2 and 3.
Phase 1 must land first, because everything else reads its signals.

## Open after this record

- The per-dilemma coding table lives in the advisor's working files; it should
  be committed beside this record before phase 2.
- [[reference-2026-10-21-permission-and-pressure]] is waiting on Jerry's
  approval to be pushed from the "Nursing leaders 1-hour session" thread.
- Conference date is still unknown, so phases are ordered, not dated.
