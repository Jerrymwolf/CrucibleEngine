---
type: spec
date: 2026-11-04
status: proposed
tags: [values-crucible, rea, reverse-engineering, spec, plan]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-04-openttd-0ad-freeciv]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]"]
---

# REA spec and plan, all ten games, 2026-11-04

Jerry, 2026-11-04 18:48: "I want a full spec and plan for ALL REAs."

- The live version is the Claude Doc at https://claude.ai/artifact/JRVtFfJ7nMG29Lxdk4dWPH.
- This file is a repo snapshot of it.
- Self-audit: 90/100.

## Questions

| Q | Question |
|---|---|
| Q1 | How should a two-faction vote create tension and legitimacy? |
| Q2 | How big are pressure and permission, and how do they decay? |
| Q3 | How should supply chains bend under disruption? |
| Q4 | How should storm and site states force replanning? |
| Q5 | How should unrest turn into refusing work? |
| Q6 | How should deals between teams work? |
| Q7 (new) | How should the delayed effects of aid work? |
| Q8 (new) | What should set dilemma cadence and triggers? |

## Games

Access rungs: 1 is open source, 2 is mod kit or data files, 3 is observed play, 4 is decompiling one formula.

| Game | Status | Questions | Rung |
|---|---|---|---|
| Civ IV | Built | Q5 | 1 |
| Diplomacy | Built | Q6 | 1 |
| OpenTTD | Carded | Q3, Q7 | 1 |
| 0 A.D. | Carded | Q4 | 1 |
| Freeciv | Carded | Q5 | 1 |
| Frostpunk 2 | Open | Q1, Q2, Q5, Q8 | 2 (mod kit) |
| Anno 1800 | Open | Q3 | 2 (data archives) |
| Dune: Spice Wars | Open | Q4, Q6 | 2 |
| Northgard | Open | Q4 | 2 |
| Rebel Inc | Open | Q7, Q8 | 3 (observed play) |

The engine and file formats for the closed games are from memory and must be confirmed on Jerry's computer.

## Plan

1. **A.** Read the open-source games. Done on 2026-11-04.
2. **B.** Jerry's gate:
   - parity test and 10-minute playtest
   - which games he owns, and on which OS
   - licence check
3. **C1.** Set up REA on Jerry's computer over remote control (`rea doctor`, Ghidra), about 30 minutes.
4. **C2.** Frostpunk 2 mod kit, about 90 minutes.
5. **C3.** Anno 1800 data, about 60 minutes.
6. **C4.** Dune: Spice Wars and Northgard, about 90 minutes.
7. **C5.** Rebel Inc, observed play, about 60 minutes.
8. **D.** Build approved cards only, in both engines, with golden replays and 1000 seeds.

## Card rules

**Card fields:**
- source and evidence
- formula
- what the player feels
- Keystone mapping
- values purpose
- cost
- prediction
- decision

**A card passes when all of these hold:**
- the prediction was written before the test and was met
- a team that does nothing never meets its target
- no line is best against every opposing line
- JS/Godot parity holds (golden replays and the red team)
- Jerry approves it on a card

**Guardrails:**
- copy nothing
- check the licence before rung 3 or higher
- use Jerry's own copies only
- see counsel before any sale
- keep determinism
