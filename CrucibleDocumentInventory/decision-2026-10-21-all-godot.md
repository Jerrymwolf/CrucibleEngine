---
type: decision
date: 2026-10-21
status: accepted
title: Move the Crucible to Godot, rules included
supersedes: "the 2026-10-18 Rust restart, for the rules and play layers"
related:
  - "[[research-2026-10-21-game-engine-for-rts]]"
  - "[[2026-10-21-audit-fix-cut-b-build-log]]"
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
tags: [crucible, decision, engine, godot, architecture]
---

# Move the Crucible to Godot, rules included

## Decision

Jerry chose "All Godot" on the card "Keep Rust for the rules, or move everything into Godot?" (2026-10-21 19:10). One Godot project will hold the rules, the room's networking and the app, for tablets, laptops and the web.

The Rust code under `crucible/` stays as the reference until the Godot version matches it. Then it retires.

## Why

- **The current board fails the brief.** Jerry played it (2026-10-21 18:57): "not an actual RTS. The values decisions are not clear. The dilemmas aren't real time." See [[rts-fit-verdict]] in project memory.
- **Long term it is an app** (Jerry, 19:01). Godot exports to iPad, Android, Windows, macOS and the web from one project.
- **The rules are changing anyway.** A real RTS needs units moving on roads, roads breaking, and dilemmas that come out of the map. Much of the Rust rule code would have changed regardless.
- **One language, one project.** Godot has built-in networking for the room, and one stack is cheaper to build and to maintain.

## What carries over

- The content: parishes, residents, secret briefs, tokens, calls for aid, dilemmas, values and personas. That covers `crucible/content/*.json` and the v3 lore docs.
- The research and design corpus: the witness framing, the permission and pressure anchors, the valence scale, and the audit findings.
- The contracts, as ideas to port rather than code: deterministic replay from seed and inputs, and a run log that the debrief reads.

## Rules the Godot version keeps

- **Determinism.** One seeded random generator. Whole numbers in all rules and scoring. No physics engine deciding outcomes. Same seed and same inputs give the same game, and replay reproduces a state hash.
- **Witness, not judge.** Values are read from what a table does, never asked as a quiz. The competing values are named when the choice is made, which is new and answers Jerry's "values decisions are not clear".
- **Works without venue Wi-Fi.** The facilitator's device hosts the room on its own network.

## Open

- Whether to build a 10-minute, one-parish RTS slice first. Recommended; the card is with Jerry.
- Godot version: 4.7.x stable today, with 4.8 expected in Q4 2026.
- The CLAUDE.md "Current direction" line was updated with this decision.
