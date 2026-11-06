---
title: "Proposal: engine inputs, the allocation round, calls for aid, routes, residents and the doses tally"
date: 2026-10-21
type: decision-record
status: proposed
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, engine, determinism, allocations, calls-for-aid, routes, residents, scoring, v3]
supersedes_in_part: "[[decision-2026-10-18-restart]]"
related:
  - "[[decision-2026-10-21-rts-experience-flow]]"
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[decision-2026-10-19-nursing-leaders-60min]]"
  - "[[crucible-resource-tokens-v3]]"
  - "[[crucible-calls-for-aid-v3]]"
  - "[[crucible-dilemmas-v3]]"
  - "[[crucible-residents-v3]]"
  - "[[crucible-secret-briefs-v3]]"
  - "[[concordia-parishes-v3]]"
  - "[[concordia-storm-quarters]]"
---

# Proposal: engine inputs, the allocation round, calls for aid, routes, residents and the doses tally

**Asked by:** the build list in [[decision-2026-10-21-rts-experience-flow]] (sections 4, 8 and 10): the engine half of the must-haves, built on 2026-10-21 on branch `claude/nursing-leaders-session-paejj1` in three commits after the v3 content conversion.

**Status:** proposed. The mechanics are implemented, tested and documented in `crucible/docs/ENGINE_SPEC.md` (amendment of 2026-10-21) and `crucible/docs/RUN_LOG_SCHEMA.md` (version 0.2). The scoring tables, the AI holder's rule, the silence rule, the token-loss rule, the default answer window and the personas added with the v3 content are **defaults pending Jerry's confirmation** (section 12). The DM rules of 2026-10-20 stand: three levers, no overriding a consequence.

**What this supersedes:** the road model of the 2026-10-18 specification (a parish was isolated when the road physics said so). Roads are now authored routes with cut and reopen times from the canon ([[concordia-storm-quarters]]). Everything else in the earlier spec stands.

---

## 1. In one paragraph

The engine now takes what the tables and the facilitator do as ordered records, re-runs from the seed with them, and produces a log whose every tick carries a hash. A session profile schedules each table's four cards and the maydays; when a table lets a deadline pass, the storm applies the card's default option and the gap records that the storm decided. The preparation allocation round locks at the profile's tick: sends become convoys over the open roads, keeps and sends are scored by the proposed tables in [[crucible-resource-tokens-v3]]. Calls for aid ([[crucible-calls-for-aid-v3]]) are raised, answered by a human card, by the AI rule or by silence, and their tokens travel, arrive, turn back or are lost by the route table. Resident groups and cards ([[crucible-residents-v3]]) move through the cards' effects and the storm's own hazards, the doses tally runs from production to the next consignment, and two counters, doses shipped and people safe, sit on every tick. Content is data: every number in this record comes from `crucible/content/*.json`, and the Rust carries the rules.

## 2. Inputs as ordered records

An input is `{t, seq, kind, ...}`. Records are sorted by `(t, seq)` and applied at the first tick whose time is at or after `t`, after the storm's effects and hazards for that tick and before its decisions. An input that cannot apply is logged as `rejected` with the reason and changes nothing.

| `kind` | Fields | Effect | Rejected when |
|---|---|---|---|
| `lock_values` | `parish_id`, `values[]`, `statement?` | The table's stated values (and its one line) from that tick on; logged `values_locked`. | never |
| `allocate` | `parish_id`, `token`, `to` (a parish or `keep`), `count` | A preparation-round entry, held until the lock. | after the lock; the run has no lock; the table lacks the tokens |
| `decide` | `parish_id`, `dilemma_id`, `option_id`, `rationale?` | The table's answer to its open card; before presentation it waits for the card. | the card was already decided |
| `mayday` | `parish_id`, `call_id` | The asker raises a call from `aid.json`. | the call is open or answered; the parish is not its asker |
| `answer_aid` | `parish_id`, `call_id`, `answer`, `count?`, `reason?` | The holder's card: `grant`, `refuse`, or `part` with a count. | the call is not open; the parish is not its holder; the answer is not one the call allows |
| `declare_hidden` | `parish_id` | The hidden reserve goes on the sheet. | nothing is hidden |
| `repair_send` | `parish_id`, `token`, `to`, `count` | Recovery: a token to another parish's repair. | the table lacks the tokens |
| `credit_line` | `parish_id`, `to`, `text` | Recovery: a line of credit naming another table's people. | never |
| `swap_dilemma` | `parish_id`, `from`, `to` | The DM swaps a scheduled card not yet presented, or an open card (same deadline). | `from` is neither scheduled nor open; `to` is unknown or used |

Scripted and recorded decisions take precedence over a `decide` for the same card, which is what makes replay exact. Because an input at tick *t* never touches a tick before *t*, the log of a run with the inputs so far is a byte-exact prefix of the run with one more input; the board therefore keeps no state of its own and re-runs the engine from the seed on every action, as the live mode of 2026-10-20 already did.

`until` stops a run after a tick; the log then carries `until`, the calls still open and the human cards still pending.

## 3. The session schedule and the storm's default

The core reads four things from a session profile (`content/sessions/parish-90.json`): `ask` per parish as `{dilemmaId, presentT, deadlineTicks}`, `maydays` as `{callId, t, answerTicks}`, `allocation.lockT`, and the `intensity` curve. Profiles stay outside the content hash.

- A scheduled card is presented at the first tick at or after `presentT` on which the parish has no open card; its deadline is that tick plus `deadlineTicks` ticks. A parish with a schedule gets no random dilemmas.
- When a human card's deadline passes undecided, the storm applies the card's `defaultOptionId` from [[crucible-dilemmas-v3]] (the first option when none is named). The decision is logged with `expired: true` and `decided_by: "storm"`, keeps the team's controller, applies the option's effects and counts in the values gap like any other decision. This is the rule the RTS flow asked for: not deciding is a decision, and the debrief can show which ones the storm made.
- Intensity precedence: a scripted curve, then the profile's curve, then each timeline window's suggested intensity, then the old phase mapping.

## 4. The allocation round

Sheets start from the stockpiles in `resources.json`; Haven's and Sterling's hidden reserves sit off the sheet until the table declares them (or a card's effect does). Entries are held until the lock, and only entries count, as the canon says. At the lock:

1. Every send becomes a convoy over the shortest open road path; in preparation the roads are open and the token arrives.
2. Each human table is scored by the signal tables in `resources.json`, copied from [[crucible-resource-tokens-v3]] (section 9 below). A table that wrote nothing keeps everything and is scored `keepEverything`.
3. The records enter the values gap with `kind: "allocation"`.

AI tables keep everything and are not scored; a drift rule for AI allocations is left for later (section 14).

A delivered token applies its effect from `resources.json`: GEN adds generator hours, FUEL adds fuel hours, SHELTER adds places, COLD adds a cold bay, CREW adds a repair crew that mends roads and power through the recovery windows, WATER lifts the water level. `repair_send` and `credit_line` are the recovery actions, scored by `repairSend` and `creditLine`.

## 5. Calls for aid

- **Raising.** A call is raised by the profile's `maydays`, by a card option's `raisesCall`, or by a `mayday` input from the asker. Its deadline is the earlier of the call's `windowClosesT` and `t + answerTicks × 15 min` (the profile's `answerTicks`, else the call's, else 22 ticks).
- **Answering.** A human holder answers by card: `grant`, `refuse`, or `part` with a count where the call allows it. An AI holder answers at half the window by one rule: grant when the route is open and the count still leaves it its own listed needs from this quarter on; part when the route is open and it holds more than its needs; otherwise refuse.
- **Silence.** At the deadline an unanswered call takes the call's `silenceAnswer`, logged with `controller: "silence"` and scored. Not answering is an answer.
- **Delivery.** A granted token travels as a convoy over the call's route (or the shortest open road path when the call names none). When the route is already cut at the answer, the answer is logged `delivered: false` and the token is lost for the quarter, as the canon rules say. When a route is cut under a convoy, the convoy turns back and the token returns to the sender's sheet at the end of the quarter. The call's `delivered` effects (the ICU patients sheltered, the terminal's forty people moved) apply on arrival, never on the promise.
- **Cards that answer calls.** A dilemma option with `answersCall` closes the call unscored and without the call's effects; the card carries its own.
- **Scoring.** Only the answer is scored, by the call's own signal table, and enters the gap with `kind: "aid"`.

## 6. Routes and convoys

`routes.json` names the sixteen routes with mode, travel and degraded times, `cutT`, `reopenT` and `eyeOpen`; card effects may move a cut or a reopening. A parish is isolated when no open road route touches it. A convoy follows the shortest open road path (Dijkstra over travel times, degraded times once the wind reaches 45 mph), arrives at the first tick at or after its travel time, and is checked for arrival before a cut at the same tick, so a tanker that reaches Gateway as the causeway goes is counted home.

## 7. Residents and the two counters

Groups are count buckets over six states, `safe`, `sheltered`, `at_risk`, `rescued`, `injured`, `lost`; the named cards from [[crucible-residents-v3]] are single people with one state. Card options, call deliveries and the storm's own hazards (gated by flags the decisions set) move them and log `resident_state` with a narrative. `people_safe` is the island's population less those at risk, injured and lost; `doses_shipped` is the doses that have left Haven. Both counters sit on every tick with the rest (`vault_doses`, `aboard`, `at_risk`, `injured`, `lost`), so the projector can run them live.

## 8. The doses tally

From `production.json`: Keystone produces while its power and water hold and its concentrate lasts; the consignment less batch 47 loads at Haven while the port stands; the ship sails at its hour, or later when a card holds it (A2), and carries whatever is aboard; the vault runs on its battery when Keystone is dark with no generator and spoils when it runs out; the next consignment sails or is missed at T+36h on the state of the port, Keystone's power and the Haven road. A dose effect moves doses between the vault, the ship, a held batch and the shipped total; what no pool takes is logged `doses_lost` with the decision that lost it.

## 9. How the new records enter the values gap (proposed, to be tuned)

The gap already averaged each stated value's signal over the parish's decisions. It now averages over every record of the parish, each with a `kind`:

| `kind` | `dilemma_id` | `option_id` | Who |
|---|---|---|---|
| `dilemma` | the card id | the option | the team's controller, or `decided_by: "storm"` |
| `allocation` | `allocate:<TOKEN>` | `send:<parish>` | human tables at the lock |
| `allocation` | `allocate:keep` | `keep` or `keep_everything` | one aggregated record per table |
| `allocation` | `declare_hidden` | `declare` | the table that declared |
| `aid` | the call id | the answer | `human`, `ai` or `silence` |
| `repair` | `repair:<TOKEN>` | `send:<parish>` | the sender |
| `credit` | `credit:<parish>` | `credit` | the writer |

Allocation signals (`resources.json` SIGNALS, from [[crucible-resource-tokens-v3]]), summed per value and clamped to -3..3:

| Rule | When | Signals |
|---|---|---|
| `sendNeededBeforeYou` | the receiver lists the token before the sender does | service +2, fairness +1, compassion +1 |
| `sendGreatestNeed` | the receiver has the greatest listed need for the token | fairness +2, stewardship +1 |
| `sendLastNeeded` | the sender gives its last token of a kind it lists | courage +2, service +2, safety -1 |
| `keepNeededByLandfall` | a kept token the table lists by landfall | preparedness +1, stewardship +1 |
| `keepUnneededWhileListed` | a kept token the table does not list while another parish does | fairness -2, compassion -1, loyalty +1 |
| `keepEverything` | the table wrote nothing | loyalty +2, fairness -2, service -2 |
| `declareHidden` | the hidden reserve goes on the sheet | honesty +2, candor +1 |
| `fundToAsked` | a FUND token to a parish the table also asked something of | fairness 0, integrity -1 |
| `repairSend` | a recovery token to another parish's repair | service +2, stewardship +1 |
| `creditLine` | a line of credit naming another table's people | recognition +2, respect +1 |

Aid answers carry the per-call tables in `aid.json`, from the sixteen calls in [[crucible-calls-for-aid-v3]]. The exact conditions are in `crucible-core/src/resources.rs` (`score_send`, `lock`) and `aid.rs`.

## 10. Determinism, the hash and the run log

- Every tick carries `state_hash`; the last equals `summary.state_hash`. The hashed state now covers infrastructure, morale, isolation, fired rules, every record above, stock, hidden reserves, cut routes, convoys, counters, groups, cards, flags, answered calls and the doses.
- `replay` feeds back the seed, the teams, the recorded decisions, the recorded intensity curve, the inputs, the session and `until`, and names the first tick whose hash differs.
- The run log is version 0.2; a v0.1 reader that tolerates unknown fields and event kinds still reads it. New event kinds: `route_cut`, `route_reopened`, `convoy_departed`, `convoy_arrived`, `convoy_turned_back`, `token_returned`, `allocation`, `values_locked`, `credit_line`, `mayday`, `aid_answer`, `aid_expired`, `resident_state`, `ship_sailed`, `consignment_missed`, `doses_lost`, `chance`, `rejected`. New top-level fields: `inputs`, `session`, `until`, `open_calls`; `teams[].statement`.
- The committed seed-42 run is now a golden file (`tests/determinism.rs`). It changed with this work (v3 content, new fields) and was regenerated deliberately; its state hash is `a92f76cb9c72…`.

## 11. The browser build and the CLI

The WASM request gains `inputs`, `until` and `session` (an embedded profile id such as `parish-90`, a whole profile object, or a run log's `session` block); `crucible_content(name)` hands out an embedded content or session file and `crucible_version()` reports the engine version, log version, content hash, embedded files, sessions and exports. `crucible_run` with only a seed behaves as before, so the boards built on it keep working. The CLI gains `run --inputs <file> --until <t> --session <id|path>`.

## 12. Defaults pending Jerry's confirmation

1. The ten allocation signal tables and the per-call aid tables (section 9). The canon marks them "proposed, to be tuned after Jerry's review"; the engine applies them as written.
2. The AI holder's rule (grant when it can spare after its own listed needs and the route is open; part when it holds more than its needs; else refuse) and the half-window timing.
3. Silence at the deadline takes the call's `silenceAnswer` and is scored.
4. A granted token whose route is already cut is lost for the quarter; one turned back under way returns at the quarter's end.
5. The default answer window of 22 ticks (5.5 hours) when neither the profile nor the call sets one; the degraded-road threshold of 45 mph.
6. The storm's default option when a human card's deadline passes, and that the storm's decision counts in the gap.
7. The characters added with the v3 content: Dr. Okonkwo, Sgt. Whitlock, Chicago and Lt. Cdr. Park; Tanaka is Yuki. They are personas in `personas.json` and lines in the calls; nothing in the engine depends on their names.

## 13. What the tests prove

- `tests/board.rs`, ten scenarios on the parish-90 profile: a session run with inputs is byte-identical and replays to the same hash; every tick carries a hash and the last is the summary's; later inputs never change the past; the allocation lock scores and delivers (Haven's fuel to Summit: service +2, fairness +3, compassion +1; Sterling keeping everything: loyalty +2) and rejects entries after the lock; A1 granted, A5 refused, A6 answered by silence, every answer after its mayday; the storm decides Gateway's preparation card at its deadline with the default option and a decision after that is rejected; L8 granted in the eye turns back when the road goes and the MEDIC returns at the quarter's end; recovery sends and credit lines are scored; the counters follow the residents and the doses; the DM can swap a scheduled card.
- `tests/properties.rs`: for random seeds and input sets, the counters stay within the population and `people_safe` equals the population less at risk, injured and lost; stock never goes negative; every tick is hashed and the last hash is the summary's; every answer follows its call; no convoy arrives over a route cut beneath it; replay reproduces the hash.
- `tests/determinism.rs`: the golden seed-42 run matches byte for byte and replays.
- Unit tests beside the code: routes open, close and reopen in the eye as authored; a convoy turns back when its route is cut; the ship sails with the consignment less batch 47, or carries it when held; a vault removal nobody takes is lost; the default intensity follows the timeline.

## 14. Left undone

- AI tables do not allocate or declare; they keep everything unscored. A drift rule for AI sends would let a six-table AI run exercise the round.
- The profile's secret briefs, optional maydays, free maydays per quarter, answer reasons, credit-line templates and the debrief question are read by the board, not the core; the core sees only the schedule, the maydays, the lock and the intensity curve.
- Lines of credit are scored flat by `creditLine`; the text is kept, not read.
- Calibration is first cut: the hazards, the token effects and the production numbers are the canon's, untested against a real table.
- `content.rs`, `sim.rs`, `log.rs` and `state.rs` exceed the spec's 400-line guideline; splitting them is owed.
- The replay viewer does not yet draw convoys, residents or counters; the RTS board is the other half of the build list.
