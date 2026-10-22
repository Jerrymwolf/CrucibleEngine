---
title: "Paper prototype (phase 0): Keystone and Haven"
date: 2026-10-22
type: prototype
status: draft (revision 2, ledger-checked, not yet played)
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

- **Printable kit:** `crucible/paper/paper-prototype.html` (19 letter pages), published at <https://claude.ai/artifact/PxQnqphndWTU1oCFvvHc2r>.
- **Balance ledger:** `crucible/paper/balance_ledger.py`, a seeded turn-by-turn ledger of the printed rules (`python3 crucible/paper/balance_ledger.py`; byte-identical output on every run).
- **Status:** revision 2 after Jerry's "audit 1-100 and revise to 100" (see below). Not yet played by people. Names marked placeholder (Pastor Ruth Okafor, Owen Pryce) and all card wording are Jerry's call.

## What it tests

The rules decided on 2026-10-22: simultaneous storm turns, yields with people as the workforce, two meters per parish, promises on slips, prep projects and quarter goals from named leaders, and the community-versus-Meridian split inside one parish.

## Shape

- **Teams:** Keystone community, Keystone Meridian, Haven community, Haven Meridian. Each starts at 30. Most resources at the end wins.
- **Hour:** 10 minutes of setup and stance, about 45 minutes of play (12 storm turns of about 3 minutes, Mission briefs after t3, t6, t9), 10 minutes of debrief.
- **Turn:** CM reads the storm hour; all teams plan for 90 seconds at once (2 minutes in t1-t2 and t7); "hands off"; CM resolves in a fixed order, reads how the town reacts, and reads one news line.
- **Storm:** Kestrel Reach sails end of t4; Keystone road and coast road close end of t5; Haven road, harbour and grid fail end of t6, with the surge (Waterfront, the Berth and, secretly, Southfield flood); t8 is the eye; a peak roll at the end of t7 loses each stranded group on 1-2; in the eye each truck or the tug brings one group out; groups still stranded at the end of t9 are lost (−5 coins); the cutter Resolute lands 3 fuel at Haven at t10; recovery ship sails end of t12.
- **Yields:** groups at home or at a job earn 1 coin a turn; sheltered groups earn nothing; clean rooms make a dose a turn with a crew and power; cranes work only with a ship at the berth (t1-t4, t10-t12) and earn Haven Meridian 2 per group; doses aboard pay Keystone Meridian 6 (Kestrel Reach) or 5 (recovery ship), and Haven Meridian 1.
- **Meters:** community trust and board confidence per parish, start 6. At 3 or below, crews walk off (trust) or Chicago takes 2 coins a turn (confidence), and a leader pressure card is read.
- **Moments:** the eight v3 dilemmas for Keystone and Haven, cut to three or four options each, with the two values at stake and the resource costs on the card ([[crucible-dilemmas-v3]]). How the meters react is on a CM-only table, read after the choice.
- **Secrets:** the drainage memo (Keystone Meridian) and the real fuel reserve (Haven Meridian) from [[crucible-secret-briefs-v3]].
- **Randomness:** one six-sided "storm die", standing in for the engine's seeded roll.

## Balance (seeded ledger, 1,000 games per line)

| Team | All careful | This team does nothing | Wins doing nothing |
|---|---|---|---|
| Keystone community | 68 | 61 | 0 of 1,000 |
| Keystone Meridian | 68 | 27 | 0 of 1,000 |
| Haven community | 73 | 63 | 0 of 1,000 |
| Haven Meridian | 63 | 48 | 0 of 1,000 |

"Careful" is one scripted way to play; hoarding, side deals and broken promises are not modelled. The closest call is Keystone community (7 points), whose do-nothing score rests on Keystone Meridian spending trucks to rescue it.

## Audit, 2026-10-22 (Jerry: "Audit your last output from 1-100 and revise to 100")

| Dimension | Weight | First cut | Revision 2 |
|---|---|---|---|
| Rules complete and consistent | 20 | 14 | 19 |
| Playable in an hour; CM load | 15 | 12 | 14 |
| Values learning; witness model | 15 | 13 | 15 |
| Balance evidence | 15 | 9 | 14 |
| Fidelity to the 2026-10-22 decisions | 15 | 13 | 15 |
| Print and screen production | 10 | 9 | 10 |
| Clear to executives | 10 | 8 | 9 |
| **Total** | **100** | **78** | **96** |

What the audit found and what changed:

1. **Balance was a hand count, and it was wrong.** The ledger showed a community team that did nothing beat careful play (the eye rescue was free), the Meridian teams finished 25 to 35 points behind, and the recovery ship never loaded because the island ran out of fuel. Fixed with a peak roll, one rescue per vehicle, lost group −5, dose prices 6 and 5, cranes earn only with a ship in, and 3 relief fuel at t10.
2. **Rules gaps.** No adjacency list, no job capacity, no rule for walking through floods. Added.
3. **Meter numbers printed on the moment cards** turned choices into arithmetic. Moved to a CM-only reaction table; the cards keep the values at stake and the resource costs.
4. **Timing was optimistic.** Planning set to 90 seconds (2 minutes while learning and at t7); teams keep their own coins; the CM reads Tank 3 before Southfield at t7.
5. **A judging label in the debrief** ("capitulating") broke the witness model. Replaced with a question.
6. **Print:** three sections spilled a few lines onto extra pages. Fixed or labelled as two-page sections; 21 pages became 19.

The last 4 points need people: only Jerry's playtest can show whether 90 seconds is enough, whether the moments feel like trade-offs, and whether the winner feels the win was worth having.

## After the playtest

Bring back the CM's notes (section 12 of the kit lists ten things to watch). The numbers that survive become the first content JSON for the Godot build and the bot balance gate.
