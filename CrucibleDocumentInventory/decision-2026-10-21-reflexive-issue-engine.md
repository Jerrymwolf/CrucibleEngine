---
title: Reflexive issue engine (AI-written follow-up dilemmas, DM approved)
type: decision
status: proposed
date: 2026-10-21
deciders: Jerry
tags: [values-crucible, engine, ai, pressure, facilitator]
related: ["[[decision-2026-10-21-rts-experience-flow]]", "[[decision-2026-10-21-engine-allocations-aid]]", "[[decision-2026-10-21-audit-fix-spec]]", "[[reference-2026-10-21-permission-and-pressure]]", "[[crucible-dilemmas-v3]]"]
---

# Reflexive issue engine

## What Jerry asked (2026-10-21)

1. Pressure rises with the storm.
2. The Crucible master can raise the pressure by hand.
3. An AI keeps evaluating the decisions tables make and writes new, reflexive issues from their past choices. Jerry named a tool, "JEV", to help (what it is is still open).

He chose: **the AI runs live and the DM approves each issue before a table sees it, with a pre-written follow-up if the network fails.**

Items 1 and 2 are built in [[decision-2026-10-21-audit-fix-spec]]: decision windows shrink as the storm builds, and the DM's heat lever moves them. This record covers item 3 and how it uses that pressure.

## The rule that does not move

The core stays deterministic. The AI never runs inside `crucible-core`. Everything it produces enters the run as an ordinary input, so `crucible run` and `crucible replay` reproduce a session byte for byte from its log, whether the issues came from the AI or from the fallback.

## Shape

```
tables decide ─► core (deterministic) ─► run log
                                          │
                       host: issue engine reads the log
                                          │
             Claude drafts a follow-up ◄──┘   (or the fallback picks one)
                                          │
                 validator checks it against the effects schema
                                          │
                DM console: preview, edit wording, Release / Skip
                                          │
             host appends input  present_issue {parish, dilemma, deadline}
                                          │
                     core presents it like a scheduled card
```

### 1. The evaluator (runs all session)

After every decision, aid answer, allocation lock or credit line, the host builds a compact digest for each table. The digest holds:
- its stated values and statement;
- each choice, with the table's logged rationale or refusal reason;
- who decided (the table, its phones, or the storm);
- the private phone picks against the table's pick;
- the current pressure level.

The model returns a short reading for the DM only:
- which value is under strain;
- what permission the table seems to have used (outcome minimization, performance-based exception, local normalization, or a situational one);
- what pressure it was under (coercive authority, conditional belonging, enforced silence, shame-related devaluation, or time, scarcity and odds);
- one follow-up question to ask in the debrief.

The reading uses the seven anchors' language for passages, never for people. It is never shown on the wall or on a table's screen.

### 2. The issue writer (once per table per quarter, or when the DM asks)

The writer receives the digest, the canon (parish lore, residents, personas) and the effects schema. It drafts one dilemma that turns a past choice into a present consequence. For example: the crew a table kept working is now exhausted at landfall, or the neighbour it refused is now the one holding the fuel.

Every drafted issue must:
- test one or two of the table's own stated values;
- offer three or four options, mostly in the Mortal Middle (−1, 0, +1), with Heroic (+3) only where a real cost is written into the option;
- apply pressure through an off-board voice (HQ, the Governor's office, a resident, a persona), never by scripting another real table to shame or silence this one;
- use only effects the validator accepts, with bounded sizes (for example no option moves more than a set number of people or doses), so an AI card cannot swing the island beyond what a written card could;
- carry a `defaultOptionId` that the scoring fixes treat as "the storm decided", with no rating.

### 3. The validator (Rust, shared with `crucible validate`)

The validator parses the draft into the existing `Dilemma` shape and runs the same reference checks as content, plus the bounds above. A draft that fails goes back to the model once with the errors. A second failure falls back to a pre-written follow-up.

### 4. The DM's control

The DM console gains an **Issues** panel with:
- a card for each draft, showing the table, the past choice it answers, the text, the options and their effects;
- **Release**, **Edit wording** and **Skip** buttons (editing changes text only, never effects);
- a **Write one now** button for any table;
- the evaluator's latest reading per table.

The panel sits beside the existing heat lever, so the DM raises pressure and releases issues from one place.

### 4a. Cruise control (Jerry, 2026-10-21)

The DM can switch the panel to **Cruise** when they have to step away. One tap turns it on, and one tap takes the DM back to manual.

While Cruise is on:
- **Issues.** Drafts that pass the validator release on their own at the next quiet moment for that table, at most one per table per quarter. A draft that fails twice is replaced by its pre-written fallback, and with no fallback it is skipped.
- **Pressure.** It follows the storm's curve alone. The heat lever holds where the DM left it and makes no automatic jumps.
- **Tighter bounds.** Effects are capped at half the manual limit, and no new named resident is put at risk without a written fallback behind it, because nobody is reading first.
- **Clock.** Cards, maydays and quarter changes run as scheduled. Cruise never pauses or ends the session by itself.
- **Projector.** A small "on cruise" mark shows, so the room knows the facilitator is away.

When the DM returns, the panel lists everything that was released while they were away, with each table's answer. The DM can then bring any of it into the debrief.

The switch is logged as a `dm_mode` input, so replay shows what was released automatically and what the DM approved.

### 5. Pressure feeds the writer

The current intensity (the storm's curve plus the DM's heat) is passed to the writer:

| Pressure | What the writer does |
|---|---|
| Low | Writes setups with time to think |
| Rising | Narrows the options and names a cost |
| Peak | Brings back a named resident the table already affected, with a short window |

The decision window itself comes from the pacing fix, so an AI card is never slower than a written one.

### 6. Fallback (offline or a model failure)

`content/followups.json` holds pre-written follow-ups keyed to flags and past options that already exist in the content (for example `if prep-keystone = B`). When the model is unreachable, slow (over a set number of seconds) or fails validation twice, the host offers the DM the matching fallback instead. Sessions at a venue with no internet still get reflexive follow-ups, just fewer and less tailored ones.

## Engine changes (after the audit fixes land)

- New input `dm_mode { mode: "manual" | "cruise" }`, logged only. It changes no state, and the host uses it to decide who releases issues.
- New input `present_issue { parish_id, dilemma, deadline_ticks, source: "ai" | "fallback" | "dm", released_by: "dm" | "cruise" }` in `inputs.rs`. The full dilemma travels inside the input, so the log is self-contained and the content hash is unchanged.
- The core presents it at the first tick where the parish has no open card, exactly like a scheduled card, and scores it with the same rules.
- `RUN_LOG_SCHEMA.md` records the new input kind. That is a contract change, so this record is its decision.
- Host side: an `issues` module that holds the model client, the digest, the queue, the fallback picker and the DM protocol messages (`issue_draft`, `issue_release`, `issue_skip`).
- Board side: the DM's Issues panel. Tables see an AI issue exactly like any other card.

## Open

- **JEV.** Jerry chose "Something else" and has not yet named it. Its slot is the evaluator or the writer, depending on what it is.
- **The API key at the venue.** It lives only on the facilitator's laptop, in the host's config, never in the page or the repo.
- **Model and latency budget.** A draft must reach the DM within the quarter's quiet time. The fallback covers misses.
- **Privacy.** Rationales and phone picks leave the room when they are sent to the model. That needs a line in the session brief, or a setting that sends only the table's choices.

## Consequences

- Tables meet consequences of their own choices, which is the reflexive loop the audit found missing.
- The DM keeps control of every word executives see.
- Replay, determinism and offline play are unchanged.
- Cost: a model call per draft and per reading, and one more panel for the DM to watch.
