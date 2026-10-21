---
title: Reflexive issue engine (JEV reads each choice, Claude writes follow-ups, DM approves)
type: decision
status: proposed
date: 2026-10-21
deciders: Jerry
tags: [values-crucible, engine, ai, pressure, facilitator, jev]
related: ["[[decision-2026-10-21-rts-experience-flow]]", "[[decision-2026-10-21-engine-allocations-aid]]", "[[decision-2026-10-21-audit-fix-spec]]", "[[reference-2026-10-21-permission-and-pressure]]", "[[crucible-dilemmas-v3]]"]
---

# Reflexive issue engine

## What Jerry asked and decided (2026-10-21)

| # | Ask | Status |
|---|---|---|
| 1 | Pressure rises with the storm | Built in [[decision-2026-10-21-audit-fix-spec]]: decision windows shrink to about 95 s at landfall |
| 2 | The Crucible master raises pressure by hand | Built there too: the DM's heat lever moves windows about 20 s. This record adds its effect on the writer (section 6) |
| 3 | An AI keeps evaluating decisions and writes new, reflexive issues from past choices | This record |
| 4 | Use JEV to help | JEV is the evaluator (section 2) |
| 5 | A cruise-control setting for when the DM walks away | Section 5 |

Jerry's choice on where the AI runs: **live, the DM approves each issue, and a pre-written follow-up plays if the network fails.**

## Rules that do not move

1. **Determinism.** No model runs inside `crucible-core`. Every model output that changes play enters the run as a logged input, so `crucible run` and `crucible replay` reproduce a session byte for byte from its log, with no network.
2. **Content is data.** Prompts, question wording, bounds, thresholds and fallback cards live in `content/` (`issue-engine.json`, `followups.json`), not in Rust or TypeScript.
3. **Ratings place passages, not people.** No model reading appears on the wall or on a table's screen. The DM sees readings as words, never numbers.
4. **The engine's deterministic scoring is the record.** Model readings are a second witness.
5. **Nothing confidential goes into a prompt.** The BEI codebook and calibration material stay out. Prompts carry only the final anchor names and the published permission and pressure definitions in [[reference-2026-10-21-permission-and-pressure]].

## Shape

```
tables act ─► core (deterministic) ─► run log
                                        │
                      host: digest per table
                                        │
            JEV reads the digest (typed answers, < 1 s)
                                        │
            jev_reading input logged ─► DM panel (words only)
                                        │
        once per table per quarter, or on "Write one now":
        Claude drafts a follow-up from the digest + readings
        (or the fallback library supplies one)
                                        │
        validator: schema, references, bounds
                                        │
        JEV gate (cruise only) ─► DM panel: Release / Edit wording / Skip
                                        │
        present_issue input logged ─► core presents it like a scheduled card
```

## 1. The digest

After every `decide`, `answer_aid`, allocation lock, `repair_send` or `credit_line`, the host builds one digest per table from the run log:
- the table's stated values and statement;
- each choice so far, with its logged rationale or refusal reason;
- who decided it (the table, its phones, or the storm);
- the private phone picks against the table's pick;
- the current pressure (storm intensity plus DM heat) and the quarter.

What goes into the digest depends on the **privacy setting**, which the DM sets before the session:
- **Choices only** (the default) sends choice ids and who decided them.
- **With reasons** also sends rationales and refusal reasons. It needs a line in the session brief telling players that their typed reasons go to an outside AI service.

Phone picks are always sent as counts, never per person.

## 2. JEV, the evaluator

JEV is TypeSafe AI's "System One" model, launched in September 2026. It is a hosted API (`POST https://api.typesafe.ai/v1/systemone`, TypeScript SDK `@typesafe-ai/sdk`, key in `TYPESAFE_API_KEY`). It returns typed answers and no text:
- **Choice:** up to 255 options, with probabilities.
- **Score:** an ordered scale of 2 to 10 levels described in words.
- **Noul:** a yes/no probability.

Vendor figures:
- 70 to 500 ms per call;
- $0.042 per million input tokens, output free;
- a 64k-token context;
- 67.8% aggregate accuracy on TypeSafe's own benchmark, against model-made labels.

None of these has been measured here.

On every digest the host asks:

| Question | Type | Use |
|---|---|---|
| Where does the latest passage sit on the value it tested? | Score, 7 levels using the anchors' published descriptions | Picks the value the follow-up presses on, shown in words |
| Which permission form shows? | Choice: outcome minimization / performance-based exception / local normalization / situational / none | DM reading and debrief question |
| Which pressure was the table under? | Choice: coercive authority / conditional belonging / enforced silence / shame-related devaluation / time / scarcity / odds / none | DM reading and debrief question |
| Did the table comply with an off-board coercer? | Noul | Flags Capitulating, not Villainous, for the debrief |
| Which fallback follow-up best answers this choice? | Choice over the entries in `followups.json` whose conditions hold | Fallback pick and a seed for the writer |

On a draft, in cruise only:

| Question | Type | Use |
|---|---|---|
| Is this draft fit to show executives unreviewed? | Noul, release at 0.9 or above | Cruise gate (section 5) |

**Debrief questions are templates, not model text.** `issue-engine.json` holds one debrief question per permission form and per pressure form, worded on the dissertation's two practitioner questions. JEV's choices pick which template the DM sees.

Each set of answers is logged as a `jev_reading` input carrying the model version and the raw answers. It changes no core state, so replay never calls JEV.

Rules:
- **Pin the version** (for example `jev-1.13.0`) in `issue-engine.json`.
- **Player text is untrusted state.** It is fenced and labelled as the table's words to be judged. A reading never changes a score or releases anything outside cruise.
- **Timeout.** Each call gets 2 s with one retry and backoff on 429 or 529 errors. On a miss, the panel shows "no reading" and the fallback is picked from flags alone.
- **Disagreement is a prompt.** When JEV's Score and the engine's rating differ by two anchors or more, the DM panel marks it as a debrief moment.

## 3. Claude, the writer

**When it writes.**
- Once per table per quarter, prepared during the quarter's first decision window so it is ready for the second.
- On demand when the DM taps **Write one now**.

**What it receives.**
- The digest and JEV's latest readings.
- The canon: the parish lore, residents and personas from `content/`.
- The effects schema.
- The fallback seed JEV picked.

**Its job.** It drafts one dilemma, in the existing `Dilemma` shape, that turns a past choice into a present consequence. For example: the crew a table kept working is exhausted at landfall, or the neighbour it refused now holds the fuel.

**Every draft must:**
- test one or two of the table's own stated values;
- offer three or four options, most rated in the Mortal Middle (−1, 0, +1);
- carry Heroic (+3) only on an option whose text names a real cost, and Villainous (−3) only where the table itself destroys others' conditions;
- apply pressure only through an off-board voice (HQ, the Governor's office, a resident, a persona), never by scripting another real table to shame or silence this one;
- name the coercer in the card when an option is compliance under coercion, and rate that compliance −2 at most;
- carry a `defaultOptionId`, which the audit fixes score as "the storm decided" with no rating.

The option ratings are the model's proposal. The DM sees them on the draft, and the validator enforces the rules above.

**Model and budget.** The model is set in `issue-engine.json`, defaulting to `claude-sonnet-5-5` for speed. A draft has 45 s to come back. A slower draft, or a draft that fails validation twice, falls back to the follow-up JEV picked.

## 4. The validator (Rust, in `crucible-core::validate`, shared with `crucible validate`)

The validator:
1. Parses the draft into `Dilemma` and runs the same reference checks as content.
2. Checks bounds per option, all from `issue-engine.json`. Manual-mode defaults match the largest effects already written in the deck: at most 600 people moved between states, at most 17,250 doses moved, at most 2 tokens and 1 route change, and no `atT` past the end of the next quarter.
3. Applies the rating rules from section 3: at most one ±3 per draft, a cost phrase present on any +3, and no −3 on an option tagged as compliance. It also runs the content rules from audit cut B (commit d550db3 on `claude/project-thread-lt1euh`): a social pressure tag must list the values the actor appeals to in `invokes`; the option that yields rates 0 at most on those values; and a send rates +1 at most unless the sender needed the token. The writer's prompt states these rules, so a draft rarely fails on them.
4. Gives back a list of errors, which goes to the writer once. A second failure falls back.

## 5. The DM's Issues panel and cruise control

**Manual mode (default).** The panel shows:
- one card per draft, with the table, the past choice it answers, the text, the options, their proposed ratings and their effects;
- **Release**, **Edit wording** and **Skip** buttons (editing changes text only, never effects or ratings);
- **Write one now** for any table;
- the latest JEV reading per table, in words, with its debrief question;
- the pressure control, beside the issues. Today this is the lever row's small "Heat +2" and "Cool −2" buttons (`board-rts/src/73-ui-dm.js`). Each tap moves intensity ±2 and shortens or lengthens windows that open afterwards by the quarter's `heatStepTicks` (about 14 to 22 s). It also changes the infrastructure decay rate and is logged as a `lever` input. This panel relabels the buttons **Raise pressure** and **Ease pressure** and makes them full-size. Each press also tells the writer to apply an off-board pressure voice to the next draft (section 6), so pressure rises in the story as well as on the clock.

A released issue is presented at the table's next free moment: the first tick on which it has no open card or call.

**Cruise.** One tap turns cruise on, and one tap takes the DM back to manual.
- **Issues.** A draft releases on its own only if it passes the validator under the cruise bounds and JEV's gate scores 0.9 or above. Cruise bounds are half the manual ones, and a draft may not put a new named resident at risk. Each table gets at most one cruise release per quarter. A draft that misses the gate is replaced by its fallback, which also passes the validator, and with no fallback it is skipped.
- **Pressure.** It follows the storm's curve. The heat lever holds where the DM left it and makes no automatic moves.
- **Clock.** Cards, maydays and quarter changes run as scheduled. Cruise never pauses or ends the session, and it never starts the debrief.
- **Projector.** A small "on cruise" mark shows, so the room knows the facilitator is away.
- **Return.** When the DM switches back, the panel lists everything released while they were away, each with the table's answer, ready to bring into the debrief.

## 6. Pressure feeds the writer

The current pressure is the storm intensity plus the DM's heat, and it shapes each draft:

| Pressure | What the writer does |
|---|---|
| Low (prep) | A setup with time to think and a cost that lands later |
| Rising (approach, or heat raised) | Three options, one cost named up front, a voice of authority on the line |
| Peak (landfall, or heat at maximum) | Brings back a named resident the table already affected, with the shortest window |
| Recovery | A repair or reckoning: someone the table helped or refused asks what happens now |

The decision window itself comes from the pacing fix. An AI card gets the same window as a written card in that quarter, and the heat lever moves both.

## 7. Fallback library

`content/followups.json` holds pre-written follow-ups. Each one carries:
- a condition over existing options and flags (for example `prep-keystone = B`);
- a quarter;
- a full dilemma that passes the validator.

The target is two per written dilemma (48 in all), drafted by Claude and finalized by Jerry, because content is his call. The fallback plays:
- when there is no network;
- when either model misses its timeout;
- when a draft fails validation twice;
- when cruise rejects a draft.

A venue with no internet still gets reflexive follow-ups. They are less tailored and come with no readings.

## Engine changes (after the audit-fix branch lands)

- **`inputs.rs`.** Three new input kinds:
  - `present_issue { parish_id, dilemma, deadline_ticks, source: "ai" | "fallback" | "dm", released_by: "dm" | "cruise" }`. The full dilemma travels in the input, so the log is self-contained and the content hash is unchanged. The core presents it at the parish's next free tick, like a scheduled card, and scores it with the same rules. An invalid one is logged `rejected` and changes nothing.
  - `jev_reading { parish_id, model, answers }` and `dm_mode { mode: "manual" | "cruise" }`, logged with `core: false` (the host's existing pattern for `self_place`). The run log carries them and replay reproduces them, but they never enter the core's state or its hash.
- **`validate.rs`.** Draft validation and bounds, callable from the host.
- **`RUN_LOG_SCHEMA.md` and `ENGINE_SPEC.md`.** An amendment for the three input kinds. This is a contract change, and this record is its decision.
- **`crucible-host`.** A new `issues` module holding the digest builder, the JEV and Claude clients, the queue, the cruise gate, the fallback picker, and the protocol messages `issue_draft`, `issue_release`, `issue_skip`, `jev_reading` and `dm_mode` (added to `PROTOCOL.md`). API keys come from the host's config on the facilitator's laptop, never from the page or the repo.
- **`board-rts`.** The DM's Issues panel and the projector's cruise mark. Tables see an AI issue exactly like any other card.

## Tests

- Replay of a run with `present_issue`, `jev_reading` and `dm_mode` inputs is byte-identical and needs no network.
- The prefix property holds with issues inserted mid-run.
- The validator rejects drafts over the bounds, with two ±3s, with −3 on compliance, or with a broken reference.
- Cruise releases only gated drafts, at most one per table per quarter, and never pauses the clock.
- A bot rehearsal with **recorded** JEV and Claude responses (fixtures in `tests/fixtures/issues/`), so CI needs no keys.
- One live rehearsal with real keys before the conference, measuring JEV and Claude latency on real digests.

## Open

- **A TypeSafe key.** JEV is waitlisted. Jerry asked on 2026-10-21 whether he has one.
- **The privacy default.** "Choices only" is proposed. Jerry decides whether reasons may be sent.
- **The fallback library.** 48 follow-ups to draft and for Jerry to approve.
- **JEV accuracy on this task.** It is unmeasured. Before relying on it, score 50 passages from rehearsal logs both by hand and with JEV.

## Consequences

- Tables meet the consequences of their own choices, which is the reflexive loop the audit found missing.
- The DM controls every word executives see, except in cruise, where tighter bounds and the gate stand in.
- Determinism, replay and offline play still hold. Offline, the session loses only the tailoring and the readings.
- Cost: one JEV call per action, a few cents per session at the published price (about 300 calls of 3,000 tokens), plus one Claude draft per table per quarter. The DM gains one more panel to watch.

## Sources

- [How to Use Jev: a practical guide to TypeSafe's System One model (DEV)](https://dev.to/valyuai/how-to-use-jev-a-practical-guide-to-typesafes-system-one-model-g5e)
- [TypeSafe Jev review: the AI model that doesn't generate text (Kingy AI)](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/)
