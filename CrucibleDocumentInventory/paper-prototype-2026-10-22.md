---
title: "Paper prototype (phase 0): Keystone and Haven"
date: 2026-10-22
type: prototype
status: draft (first cut, untested)
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, prototype, paper, playtest, rts, game-design]
related:
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[design-2026-10-21-rts-godot]]"
  - "[[decision-2026-10-21-rts-flow-and-teams]]"
  - "[[crucible-dilemmas-v3]]"
  - "[[crucible-secret-briefs-v3]]"
---

# Paper prototype (phase 0): Keystone and Haven

Jerry chose "Paper first, then Godot" on 2026-10-22 ([[decision-2026-10-22-strategy-game-audit-answers]], item 8). This is the kit: one hour, two parishes, four teams, Jerry as Crucible master (CM).

- **Printable kit:** `crucible/paper/paper-prototype.html` (21 letter pages), published at <https://claude.ai/artifact/PxQnqphndWTU1oCFvvHc2r>.
- **Status:** first cut. Every number is there for the playtest to break. Names marked placeholder (Pastor Ruth Okafor, Owen Pryce) and all card wording are Jerry's call.

## What it tests

The rules decided on 2026-10-22: simultaneous storm turns, yields with people as the workforce, two meters per parish, promises on slips, prep projects and quarter goals from named leaders, and the community-versus-Meridian split inside one parish.

## Shape

- **Teams:** Keystone community, Keystone Meridian, Haven community, Haven Meridian. Each starts at 30. Most resources at the end wins.
- **Hour:** 10 minutes of setup and stance, about 45 minutes of play (12 storm turns of about 3 minutes, Mission briefs after t3, t6, t9), 10 minutes of debrief.
- **Turn:** CM reads the storm hour; all teams plan for 2 minutes at once; "hands off"; CM resolves in a fixed order and reads one news line.
- **Storm:** Kestrel Reach sails end of t4; Keystone road and coast road close end of t5; Haven road, harbour and grid fail end of t6, with the surge (Waterfront, the Berth and, secretly, Southfield flood); t8 is the eye; groups still stranded at the end of t9 are lost; recovery ship sails end of t12.
- **Yields:** groups at home or at a job earn 1 coin a turn; sheltered groups earn nothing; clean rooms make a dose a turn with a crew and power; cranes earn Haven Meridian 1 per crew; doses aboard pay on sailing.
- **Meters:** community trust and board confidence per parish, start 6. At 3 or below, crews walk off (trust) or Chicago takes 2 coins a turn (confidence), and a leader pressure card is read.
- **Moments:** the eight v3 dilemmas for Keystone and Haven, cut to three or four options each, with the two values at stake named on the card ([[crucible-dilemmas-v3]]).
- **Secrets:** the drainage memo (Keystone Meridian) and the real fuel reserve (Haven Meridian) from [[crucible-secret-briefs-v3]].
- **Randomness:** one six-sided "storm die", standing in for the engine's seeded roll.

## Rough balance (hand count, before any playtest)

| Team | Does nothing | Plays carefully |
|---|---|---|
| Keystone community | about 33 | about 57 |
| Keystone Meridian | about 19 | 45 or more |
| Haven community | about 25 | about 65 |
| Haven Meridian | about 41 | about 50 |

The weakest spot is Haven Meridian, whose income comes mostly from what other teams do. If doing nothing comes within 5 points of active play in the test, raise the flood cost for the cranes or make the recovery ship need Haven fuel.

## After the playtest

Bring back the CM's notes (section 12 of the kit lists ten things to watch). The numbers that survive become the first content JSON for the Godot build and the bot balance gate.
