---
title: "Values Crucible subsystems map"
date: 2026-10-26
type: design-note
status: draft (v2, after audit)
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, design, subsystems, audit]
related:
  - "[[teardown-2026-10-26-frostpunk2-diplomacy]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
---

# Subsystems map

Jerry asked (2026-10-26 00:59) "What other sub systems does our game need", then "Audit your last output from 1-100 and revise to 100" (01:00).

## Audit of the first answer (v1 posted in thread 00:59)

| Criterion | Weight | v1 | v2 | Fix |
|---|---|---|---|---|
| Complete (nothing the game needs is missing) | 30 | 19 | 30 | Added the team tablet, the core engine and run log, quarter goals and prep projects, content and scenario data, commitment card, phones (later) |
| Matches accepted decisions | 25 | 18 | 25 | Pressure voices include named community leaders, not just off-island bodies (2026-10-22 "Voices"); promises and meters named as designed; goals and projects (decision 6) were forgotten |
| Priorities right | 20 | 13 | 20 | Keystone slice needs 6 systems, not 3: the core engine and team tablet were missing from it |
| Clear, skimmable | 15 | 13 | 15 | One table with status and reference game per system |
| Follows Jerry's rules | 10 | 5 | 10 | The closing question goes on a decision card, not in text |
| **Total** | 100 | **68** | **100** | |

## All subsystems

Status: **D** designed (teardown section), **P** partly, **N** not yet. **Slice** = needed for the Keystone slice.

| # | Subsystem | What it does | Reference | Status | Slice |
|---|---|---|---|---|---|
| 1 | Core engine and run log | Resolves all orders at once from seed + orders; writes the run log; exact replay | Diplomacy adjudicator | P (2b, 6) | Yes |
| 2 | Turn clock | Plan 60-90 s, lock, resolve, ~15 s play-out; CM-editable lengths | Diplomacy | D (2b) | Yes |
| 3 | Map, sites, storm, forecast | Sites and states, storm track, 3-turn forecast, flash warnings | Dune: Spice Wars + Northgard | D (7) | Yes |
| 4 | Supplies and score | 8 goods, staffed sites yield, cure chain, convoys, needs, stockpile score | Anno 1800 + Civilization | D (8) | Yes |
| 5 | Parish politics | Both teams vote, owner decides; two meters; promises ledger | Frostpunk 2 | D (1) | Yes |
| 6 | Dilemma Director | AI writes each dilemma from both teams' values and the map; validator; fallback | New (test page live) | D (3) | Yes |
| 7 | People | Named residents per site, at-risk counts, saved and lost, who works where | Frostpunk citizens, Civ tiles | D (9) | Yes |
| 8 | Values stance builder | 20 min: me, then us, then the ranked trade-off; signed statement | Our andragogy grill, 2026-10-21 | D (10) | Yes |
| 9 | Team tablet | Order pad: dilemma vote, unit moves, convoys, promises, forecast strip | Diplomacy order sheet | D (11) | Yes |
| 10 | Facilitator console | Timers, dilemma veto and cruise, pressure levers, pause, rehearsal bots | Left 4 Dead "AI Director" pacing (build-up, peak, relax) + earlier DM card | P | Thin |
| 11 | Pressure voices | Named community leaders (elder, pastor, mayor) and Meridian executives, plus HQ and the Governor; asks and deadlines tied to the meters | Against the Storm impatience; Paradox event scripts (triggers, weights, mean time to happen) | P (decided) | Later |
| 12 | Quarter goals and prep projects | One public goal per parish per quarter; Q1 projects that pay off in the storm | Rebel Inc initiatives | P (decided) | Later |
| 13 | News and social feed | Ticker and reactions from events; reports facts, never names values | Tropico radio and Democracy 4 voter reactions; templates, AI later | P (decided) | Later |
| 14 | Record and debrief | Values log, replay with storm path, Mission briefs, private records, research export | Age of Empires II post-game timeline and replay scrubbing; our witness model | P | Later |
| 15 | Commitment card | What each person commits to after the session (open question since 2026-10-21) | None yet | N | Later |
| 16 | Wall display | Map, forecast, standings, meters, ticker, readable from the back of the room | Esports observer view (StarCraft II, AoE II); Dune / Northgard HUD | N | Later |
| 17 | Session network | Tablets join the host, reconnect, survive bad wifi | Jackbox (room code, devices join one host screen); earlier LAN host work | P (old Rust host) | Later |
| 18 | Practice round | ~10 min to learn the controls before the storm | Tutorial missions | N | Later |
| 19 | Content and scenarios | Parishes, sites, tracks, goods, templates as JSON; CM picks a scenario | Paradox plaintext scripts | P (content/*.json exists) | Yes |
| 20 | Phones (later layer) | Optional personal phones; falls back to the tablet | Decision 3, 2026-10-22 | Later | No |

## Do the other subsystems need new reference games? (Jerry, 01:03)

No new research round is needed. The game layers (politics, turns, storm, supplies) were the hard part. The rest borrow from known games, added to the Reference column above: Left 4 Dead's AI Director for pacing, Paradox events for pressure voices, Tropico and Democracy 4 for reactions, Age of Empires II for replay, esports observer views for the wall, and Jackbox for joining. The stance builder, commitment card and debrief come from facilitation practice and Jerry's dissertation, not games.

## Keystone slice needs

1, 2, 3, 4, 5, 6, 7, 8, 9, 19, plus a thin 10. 7, 8 and 9 were designed 2026-10-26 01:01 (teardown sections 9-11). Every slice system now has a design; 1 (core engine) and 10 (console) are partial.
