---
type: decision
date: 2026-10-21
revision: 2
status: proposed
title: Audit fix spec and plan
supersedes: []
related:
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[decision-2026-10-21-rts-experience-flow]]"
  - "[[decision-2026-10-21-engine-allocations-aid]]"
  - "[[reference-2026-10-21-permission-and-pressure]]"
  - "[[values-crucible-session-90]]"
source: "Advisor panel audit, https://claude.ai/artifact/CNfhFiCekWbeof3o2CdfYH"
self_audit: "v1 57/100, v2 95/100 (see Appendix A)"
tags: [crucible, scoring, debrief, permission-and-pressure, spec, plan]
---

# Audit fix spec and plan

The advisor panel (UX and UI, mechanics, adult values learning, permission
and pressure) found that the story and screens work but **the scoring rewards
the wrong behavior**. This record turns the audit into a spec and a gated plan.
It changes [[ENGINE_SPEC]] and [[RUN_LOG_SCHEMA]]; this record is the decision
that covers those changes (section C).

**Canon.** Jerry's dissertation, summarized in
[[reference-2026-10-21-permission-and-pressure]]. Seven anchors: Heroic (+3),
Exemplifying (+2), Striving (+1), Minimum Organizational Expectations (0),
Faltering (−1), Capitulating (−2), Villainous (−3). The mortal middle is −1 to
+1. **Ratings place moments, never people.**

**Baseline.** Code and content on branch `claude/nursing-leaders-session-paejj1`
(PR #2) at `d83ae22`. Numbers below marked *measured* were counted from that
content; the rest are the audit's.

## Decisions

Each was put to Jerry as a card. Rows marked *pending* use the recommended
option; the spec section named in the last column changes if he picks
otherwise.

| # | Question | Assumed (recommended) | If he picks otherwise | Status |
|---|---|---|---|---|
| D1 | How a storm-decided card or silent mayday is rated | Capitulating (−2), marked "the storm decided"; effects still play | S1.2 takes −1 or no rating; nothing else moves | pending |
| D2 | What the wall shows about each table's values | Room pattern on the wall; each table's evidence only on its own console | S4 steps 2 and 4 swap screens | pending |
| D3 | How far to recode the deck | Full recode into the mortal middle | "Worst only" drops S2.1 and S2.5; "keep" drops S2 except S2.2 | pending |
| D4 | When tables see the Authority charter clause | During play | S5.9 dropped; S4 step 4 reveals it instead | pending |
| D5 | How pressure rises | Storm curve, ~180 / 140 / 95 / 150 s, heat and cool ±20 s | S6.1 table changes | pending |
| D6 | What must land before the conference | All phases, in order | Phases 3 and 6 become stretch; the legacy profile ships for them (Plan, rollback) | pending |

## Design principles

1. **The engine rates the answer, never the weather.** Only a table's chosen
   act carries an option's values. What the clock decides is its own kind of
   moment (D1).
2. **No free virtue.** A move rates +2 or +3 only when it costs the table
   something it can see: tokens it needs, people at risk, time, or standing
   with HQ. Heroic needs extraordinary conditions or substantial cost.
3. **Coerced is not coercer.** Complying under coercion is Capitulating at
   worst. Villainous is kept for a table that itself coerces, deceives or
   abandons with full knowledge. The coercer is named on the card.
4. **Pressure is a cost on holding firm.** It rises with the storm, peaks at
   landfall, eases in recovery, and the DM's levers move it.
5. **Choices move the world.** Counters diverge with how tables play, and the
   wall shows the low point, not just the end state.
6. **Evidence, not a score.** Moments placed on the seven anchors, with the
   reasons tables logged. No means, no ranking, no red and green.
7. **Own it, then ask, then reveal.** A table sees its own moments, then
   answers the two questions, and only then sees other tables' secrets.

## Spec

Each item has an id, the files it touches, and a check that proves it.

### S1. Rating (`crucible-core`: `values.rs`, `controller.rs`, `aid.rs`, `resources.rs`, `sim.rs`, `state.rs`)

| Id | Requirement | Check |
|---|---|---|
| S1.1 | Every decision record carries `decided_by`: `table`, `storm` or `dm`. The field exists today only on `Evidence` as `"storm"`; move it onto `DecisionRecord` and set it everywhere a record is made (`sim.rs`, `aid.rs`, `resources.rs`). A mayday with no answer is `storm` and is labeled "no answer (the storm decided)", never REFUSE. | Unit test per record kind |
| S1.2 | A `storm` record emits one signal per value the card tests, at −2 (D1), not the default option's `valueAlignment`. The default option's effects still apply. | Test: a silent run's records carry only −2 signals |
| S1.3 | **One signal per value per moment.** A moment is a card, a mayday, the allocation round, or a quarter's credit lines and repair sends. Within a moment keep the largest magnitude per value; on a tie keep the negative. Today each move is its own record, so many cost-free moves dilute or inflate the mean (30 credit lines moved respect from −3.0 to +0.87). | Test: 30 credit lines in one quarter give one piece of evidence |
| S1.4 | Cost-free moves are capped. An allocation keep rates 0. Credit lines, declares and repair sends rate at most +1, unless the move spends a token the table's own open need required, which may rate +2. No cost-free move rates +3. | Property test over all allocation and aid inputs |
| S1.5 | A move the engine rejects (declaring fuel the table does not hold) records the rejection and no signal, even when its option is accepted. | Test from the audit's exploit |
| S1.6 | `values_gap` stops computing a mean. It returns, per stated value, the evidence list (moment, anchor, `decided_by`, logged reason, `pressure`) and a `tested` flag: false when fewer than two `table` moments touched the value. `enacted_score` is removed. | Schema test; debrief reads no mean |

### S2. Deck recode (`crucible/content/dilemmas.json`, `values.json`; content only)

| Id | Requirement | Check |
|---|---|---|
| S2.1 | Most options move into −1..+1. At most one ±3 per card; every +3 has a visible cost in its text and effects. *Measured:* 35 of 96 v3 options carry a ±3 today. | Validator in `validate.rs` fails a card with two ±3s or a costless +3 (`costTag` required) |
| S2.2 | Compliance with a coercer (Chicago, the Governor, the security chief, the board) rates −2 at most. Known cases: prep-sterling B, approach-heartland D, approach-sterling B, landfall-heartland C, and the rest of the nine in the coding table. Keep genuine −3s where the table itself coerces or deceives (approach-keystone B, landfall-keystone A). *Measured:* 18 −3 signals today. | Coding table diff reviewed by Jerry |
| S2.3 | New per-option field `pressure: { form, actor }`. `form` is one of the dissertation's four social forms (`coercive_authority`, `conditional_belonging`, `enforced_silence`, `shame_devaluation`) or `situational` (time, scarcity, odds, named residents). | Validator: every option rated ≤ −2 names a pressure |
| S2.4 | Fix drifted mappings: integrity is not contract-keeping; respect is not deference to the Governor; no stewardship for signing a false sentence. Rewrite the four hindsight debrief lines. | Listed diffs |
| S2.5 | Defaults are picked as what an institution does by doing nothing, not for virtue (S1.2 strips their values anyway). Known virtue defaults: prep-gateway c, prep-keystone c, prep-haven b, approach-gateway c, approach-haven b, approach-summit a, landfall-gateway a, landfall-keystone b, landfall-haven b. *Measured:* 21 of 24 defaults carry a +2 or +3 on some value. | Coding table |
| S2.6 | Add three or four live pressure moments where HQ or another table applies a social form during play (for example, HQ makes aid conditional on silence about a shortfall). | Each form enacted at least once per session |
| S2.7 | Coverage: candor, courage, duty, integrity and respect are each tested at least twice per table over the session. | Validator counts per parish |
| S2.8 | **Two-coder method.** Two independent coders rate every option on the seven anchors from the dissertation definitions. Exact agreement ≥ 80% and every disagreement within one anchor; Jerry settles the rest. The table is committed as `crucible/content/coding/dilemmas-anchors-v4.csv` beside the content. | Agreement figures in the commit message |

### S3. Consequences (`residents.rs`, `resources.rs`, `routes.rs`, `tally.rs`, `content/residents.json`)

| Id | Requirement | Check |
|---|---|---|
| S3.1 | Resident rescues become conditional: a group is rescued only if a route is open, a boat or crew is assigned, and its parish answered the relevant mayday or card. Otherwise its risk accumulates each tick. Today groups are rescued on a fixed schedule, so people safe ends at 24,092 to 24,097 of 24,100 whatever tables do. | 200-seed sweep (S3.6) |
| S3.2 | Needs bite at each quarter boundary: an unmet need costs people safe or doses. Shelter places and cold bays set in allocation are read. | Unit test per need |
| S3.3 | The "next consignment" in `tally.rs` ships only after a recovery decision to send it, not automatically from the vault. | Hoard run no longer ships the most doses |
| S3.4 | Trajectory counters `lowest_people_safe` and `people_hours_at_risk` in state, run log and wall. | Schema test |
| S3.5 | Haven's four cards and the recovery cards of Gateway, Haven, Summit and Sterling each move at least one counter. | Validator |
| S3.6 | Five bot policies (silent, hoard, give, random, deliberate) over 200 seeds each: silent is worst on people safe; hoard and give differ in doses by more than two standard deviations; deliberate beats random on people-hours at risk by more than two standard deviations. | A new `crucible sweep` CLI command (the CLI has run, replay, validate and summary today); its report is committed |

### S4. Debrief (`board-rts/src/72-ui-projector.js`, `70-ui-table.js`, `71-ui-phone.js`, `73-ui-dm.js`, `parish-90.json`)

DM-advanced, no auto-advance. Fifteen minutes in total.

| Step | Screen | Content | Minutes |
|---|---|---|---|
| 1 | Wall | The island: counters and the low point | 1 |
| 2 | Each console, private (D2) | **Your moments.** Each stated value, its moments on the seven anchors, chosen apart from storm, with the reasons the table logged and the card's prepared debrief line. Untested values say so. | 3 |
| 3 | Wall, consoles, DM read-aloud | **The two questions.** What made compromise acceptable? What made resistance costly? Tables talk. | 4 |
| 4 | Wall | **Permission and pressure in this room.** Where pressure won and where tables held, by form and actor; situational pressure apart from social forms; who invoked the Authority clause (D4). No table is named against a rating. | 2 |
| 5 | Console | **The gap.** Private phone votes against the table's card, as counts, no names. | 1 |
| 6 | Wall | **Secrets.** The sealed briefs. | 2 |
| 7 | Wall | **Credit lines and replay.** | 1 |
| 8 | Phone | **Commitment.** "When ___ happens, I will ___." Stays on the phone; never sent to the host or exported. | 1 |

S4.1: the projector mirror's per-table bars are deleted. S4.2: the phone
commitment no longer travels to the host (today `30-host.js` and
`session.rs` both handle it). S4.3: the DM read-aloud text and the one-page DM
card are rewritten to this order.

### S5. UX blockers (`board-rts`)

| Id | Requirement |
|---|---|
| S5.1 | A decided card or sent mayday answer stays on screen as "Locked in: B" until the next item arrives |
| S5.2 | Sticky footer for the primary button at 1280×800 and 1024×768 |
| S5.3 | Projector text floor 22 px (body) to 28 px (headlines); fewer words per card |
| S5.4 | Touch targets ≥ 44 px |
| S5.5 | Relabel "Declare 2 FUEL", "phones may vote", "Enter / Seat", "+2.5 over 2", "LINE OF CREDIT" and the token abbreviations |
| S5.6 | A mayday never asks for a token the table does not hold, and never shows "00:00 left" |
| S5.7 | Late moves are rejected as "expired", not "not open"; rejected allocations and late phone votes say so on screen |
| S5.8 | On reconnect, show who must act now; the DM roster refreshes on join, not on the first tick |
| S5.9 | The Authority charter clause is on the table console during play (D4) |

Check: the UX advisor's script re-run at 1024×768 and on a 1920×1080
projector capture; all of S5 pass.

### S6. Pacing (`content/sessions/parish-90.json`, `controller.rs`, host `session.rs`)

Each quarter has 660 s of play; the host maps its ticks onto them, so a tick
lasts 4.6 s in prep, 5.5 s in approach, 13.75 s at landfall and 3.9 s in
recovery. Today's `humanDeadlineTicks` (39, 33, 13, 46) all come out at about
180 s, which is why pressure never rises.

| Quarter | Card window | `humanDeadlineTicks` | Mayday window | `maydayAnswerTicks` | Heat/cool step |
|---|---|---|---|---|---|
| Prep | ~180 s | 39 (unchanged) | none | none | 4 ticks (18 s) |
| Approach | ~140 s | 25 | ~100 s | 18 | 4 ticks (22 s) |
| Landfall | ~95 s | 7 | ~70 s | 5 | 1 tick (14 s) |
| Recovery | ~150 s | 38 | ~100 s | 26 | 5 ticks (20 s) |

S6.1: heat and cool, already logged as inputs, also shift the deadline of
cards and maydays opened after them by the step above. Open windows are not
changed. S6.2: within a quarter all six tables' cards open at the same tick,
right after the quarter brief (today `presentT` is staggered per parish), and
no mayday opens while a table's card is open.

Check: the run log shows the windows above; a heat input shortens the next
window.

### S7. Room operations

| Id | Requirement |
|---|---|
| S7.1 | Printed option cards (`74-ui-print.js`) are regenerated from the recoded deck and never print a rating |
| S7.2 | The DM card adds: one browser window per device (three WebGL pages in one browser fell below 1 fps), and how to read "the storm decided" aloud without blame |
| S7.3 | The offline path stays: everything ships in the laptop host bundle; nothing in S1 to S6 needs the internet |

## C. Contract changes

Recorded here, applied to [[ENGINE_SPEC]] and [[RUN_LOG_SCHEMA]] in phase 1.

- `DecisionRecord`: add `decided_by` and `moment_id`; add `pressure` from the
  option.
- `ValuesGapRow`: remove `enacted_score`; add `tested`; `Evidence` gains
  `anchor`, `reason` and `pressure`.
- State and log: add `lowest_people_safe` and `people_hours_at_risk`.
- `dilemmas.json`: add `pressure` and `costTag` per option.
- Bump the run log's `version` field. Old exports no longer replay to the same
  hash; regenerate `docs/sample-run.json` and the golden hashes in tests in
  the same commit.

Determinism holds: none of this reads the wall clock or adds an RNG draw. The
DM's heat already enters as a logged input.

## Plan

**Gate for every phase:** `cargo test`; `crucible run --seed N` twice
byte-identical; a browser export replays in the CLI to the same hash; a bot
rehearsal (`?role=dm&rehearsal=1&speed=18`) checked against the phase's
acceptance; a build-log entry. Work continues on the PR #2 lineage.

| Phase | Scope | Size | Depends on | Acceptance |
|---|---|---|---|---|
| 1. Rating | S1, section C | M | none | A silent table never beats an answering one on any value; no cost-free move above +1 |
| 2. Deck | S2 | L | 1; the coding table; D3 | S2 validators pass; agreement figures met; Jerry signs off the diff |
| 3. Consequences | S3 | L | 1 | S3.6 sweep holds |
| 4. Debrief | S4 | M | 1 | A rehearsal walks the eight steps inside 15 minutes; no mean or ranking anywhere; commitment absent from the host log |
| 5. UX and room | S5, S7 | M | none | S5 check passes; print pack regenerated |
| 6. Pacing | S6 | S | 1 | Window table matches the log |
| 7. Re-audit | Same four advisor lenses, same seeds | M | 1 to 6 | Each of the audit's seven blockers closed or explained in writing |

Phases 4 and 5 run beside phases 2 and 3. Phase 1 lands first because
everything reads its records.

**Rollback.** Before phase 1, copy today's profile and content to
`sessions/parish-90-legacy.json` and `content/legacy/`. If phase 3 or 6 is not
ready by the conference (D6), the session runs on the new rating and debrief
with the legacy consequences and pacing.

**Risks.**

| Risk | Mitigation |
|---|---|
| Recode makes every option feel the same | Keep the heavy effects the audit praised (Summit's order 2,865 people, A5 600, Keystone's landfall ±17,250 doses); costs carry the drama, ratings stay honest |
| Conditional rescues make counters swing too far | Tune in the S3.6 sweep; cap one table's swing at a fixed share of island total |
| Landfall windows of ~95 s are too short for six executives | Rehearse with humans in phase 7; heat and cool give the DM ±14 s |
| −2 for storm defaults reads as blame | Read-aloud places the moment, not the people (S7.2); D1 can move to −1 without other changes |
| Coding table and dissertation note are blocked on Jerry's card in the advisor thread | Phase 2 cannot start without them; phases 1, 3 to 6 can |

**Out of scope.** Island art versus parish data positions; the cloud relay;
the network rehearsal on venue hardware (its own thread).

## Traceability

Every audit finding and where it is answered.

| Audit finding | Spec |
|---|---|
| Blocker 1: storm defaults and mayday silence score as virtue | S1.1, S1.2, S2.5 |
| Blocker 2: counters converge; hoarding wins doses | S3.1 to S3.4, S3.6 |
| Blocker 3: signed score per table on the wall | S1.6, S4 (D2), S4.1 |
| Blocker 4: cost-free moves mint +2 and +3 | S1.3, S1.4 |
| Blocker 5: decided card vanishes | S5.1 |
| Blocker 6: primary button below the fold | S5.2 |
| Blocker 7: projector text under 14 px | S5.3 |
| Interdependence thin; allocation moves nothing | S3.2, S3.5 |
| Heat and cool do nothing for human tables | S6.1 |
| Staggered clock, overlapping cards and maydays | S6.2 |
| Options score when their moves are rejected | S1.5 |
| Silence shows as REFUSE | S1.1 |
| DM roster stale; silent rejections; "not open" | S5.7, S5.8 |
| Mayday asks for tokens not held; "00:00 left" | S5.6 |
| Reconnect leaves people uninformed | S5.8 |
| Small text and controls; misread labels | S5.3 to S5.5 |
| Three WebGL pages in one browser | S7.2 |
| Two questions missing | S4 step 3 |
| Secrets before ownership; 25 s auto-advance | S4 order, no auto-advance |
| Commitment not private; no scaffolding | S4 step 8, S4.2 |
| Prepared debrief lines unused | S4 step 2 |
| Vote gap only on the voter's phone | S4 step 5 |
| Bots and deliberate play within noise | S3.6 |
| Coerced rated as coercer | S2.2, S2.3 |
| Pressure never rises | S6.1 |
| Four social forms only in card text | S2.3, S2.6 |
| Game's own pressures unnamed | S2.3 (`situational`), S4 step 4 |
| Debrief hides logged reasons | S1.6, S4 step 2 |
| Deck is learnable | S2.1, S2.8 |
| Drifted value mappings; hindsight lines | S2.4 |
| Authority clause withheld | D4, S5.9 |
| Values rarely tested (candor, courage, duty, integrity, respect) | S2.7 |

## Appendix A. Self-audit

Jerry asked for a 1 to 100 audit of this spec and a revision to 100.

| Criterion | Points | v1 | v2 | What v2 changed |
|---|---|---|---|---|
| Covers every audit finding, traceably | 20 | 15 | 20 | Traceability table; added WebGL windows, print pack, value coverage |
| Faithful to the dissertation | 15 | 11 | 10 | +2-coder method, pressure forms per option, cost rule for Heroic; **−5 held back**: the spec has not been checked against the dissertation text itself, only the audit's summary |
| Precise and testable | 15 | 9 | 15 | Every item has an id and a check; "moment" defined; bot policies and thresholds named |
| Grounded in the real code and content | 10 | 4 | 10 | Verified against PR #2: `decided_by` already exists on `Evidence`; the mirror is a mean in `values.rs`, not a sum; deadlines are ticks scaled per quarter; deck counts measured |
| Determinism and contracts | 10 | 3 | 10 | Section C lists every schema change, the version bump and golden-hash regeneration |
| Learning design | 10 | 7 | 10 | Fixed the order to own, ask, reveal; 15-minute budget per step; commitment never leaves the phone |
| Room operations | 10 | 3 | 10 | DM card, print pack, offline, one window per device |
| Plan: order, size, risks, rollback | 10 | 5 | 10 | Sizes, dependencies, risk table, legacy profile as rollback |
| **Total** | **100** | **57** | **95** | |

The last five points need the dissertation definitions note, which waits on
Jerry's card in the advisor thread. Once it is in the repo, check S1.2, S1.4,
S2.2 and S2.3 against its exact wording and close the gap.
