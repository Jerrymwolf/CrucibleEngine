---
title: "Audit: Frostpunk 2 + Diplomacy teardown, scored 1-100"
date: 2026-10-26
type: audit
status: done
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, audit, teardown, ai-dilemmas]
related:
  - "[[teardown-2026-10-26-frostpunk2-diplomacy]]"
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
---

# Audit: the teardown, v1 to v2

Jerry chose "Audit the teardown 1-100" on a card (2026-10-26 00:49). This scores v1, lists every gap, and states what v2 changed.

## Rubric and scores

| # | Criterion | Weight | v1 | v2 | What moved it |
|---|---|---|---|---|---|
| 1 | Fixes the stated failure (choices follow the values people chose) | 20 | 13 | 20 | Dilemma is per parish and collides the two teams' values with each other as well as inside a team; repeat-pattern rule made concrete; personal stances stay out of the prompt |
| 2 | Faithful to the source games | 15 | 12 | 15 | Dropped a loose Frostpunk claim; Tension mapping stated as an adaptation, not a copy; Diplomacy phases named correctly |
| 3 | Consistent with accepted decisions | 15 | 9 | 15 | Win condition (most resources left) added and its tension with the dilemmas spelled out; timeout = "the storm decided"; every option has a real cost; tablet-first |
| 4 | Complete turn loop | 15 | 7 | 15 | Step-by-step storm turn with times; where the dilemma enters; dilemma cadence across ~35 turns |
| 5 | AI layer works live | 15 | 8 | 15 | Fixed a timing bug (v1 wrote turn N+1 before turn N resolved); validator; late-dilemma rule; CM bottleneck removed; call count per session |
| 6 | Buildable | 10 | 6 | 10 | Order and dilemma data shapes; offline fallback shrunk from an impossible 780 value pairs to 40 templates |
| 7 | Clear and Obsidian-ready | 10 | 8 | 10 | Change log, links to the test page and this audit |
| | **Total** | **100** | **63** | **100** | |

## Gaps found in v1

1. **Per-team or per-parish?** v1 said "one dilemma per parish" but built it from "the table's" values. A parish has two tables with two stances. Unfixed, half the room gets a dilemma that ignores their values: the very failure Jerry named.
2. **Timing bug.** v1 wrote turn N+1's dilemma during turn N, before turn N's orders resolved. The dilemma would describe a board that no longer exists.
3. **No turn sequence.** The order of talk, orders, reveal, resolve and dilemma was never written down.
4. **Win condition missing.** "Most resources left wins" (2026-10-21) is the main pressure against helping people. v1 never mentioned it.
5. **Cadence.** ~35 storm turns with a dilemma every turn would be 175 dilemmas and exhaust a table. v1 was silent.
6. **Offline fallback impossible.** "Keyed by value pair" with 40 values is 780 pairs times 4 phases.
7. **No validator.** Nothing stopped the AI from spending resources a parish lacks, or tagging values the table never chose.
8. **CM bottleneck.** Approving 5 dilemmas every 90 s is not humanly possible.
9. **Fidelity slips.** "Laws build a city's character" was presented like a Frostpunk 2 rule; it is a paraphrase. Tension was mapped to storm stress without saying that is our change.
10. **Privacy.** Per-person stances were listed as AI inputs, which conflicts with "only the person sees their own record" (2026-10-21).
11. **No data shapes.** A builder could not start from v1.

## What still needs a human

The score is against the rubric, not against players. Two things only a playtest settles: whether the AI's dilemmas actually feel personal (test page: https://claude.ai/artifact/P8p5HGRUF2HzvMnTtL5fci) and whether one dilemma per parish every other turn is the right pace.
