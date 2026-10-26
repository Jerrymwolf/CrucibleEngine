---
title: "Decision: which game to reverse engineer for the rebuild"
date: 2026-10-26
type: decision-record
status: accepted
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, reverse-engineering, rea, godot, strategy-games]
related:
  - "[[decision-2026-10-18-rea-reference-games-rust]]"
  - "[[decision-2026-10-21-all-godot]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[paper-prototype-2026-10-22]]"
---

# Decision: which game to reverse engineer

**Asked (Jerry, 2026-10-26 00:36):** "We built a paper version that just doesn't work. I think we need to build from scratch reverse engineering a RTS. https://github.com/morluto/rea. Which one most fits our context?" Clarified 00:37: REA is the skill; find the best game to reverse engineer with it.

**Status:** accepted. Jerry chose "Frostpunk 2 + Diplomacy" on the decision card, 2026-10-26 00:43. Paper prototype failed because "the choices weren't dynamic related to the values people chose. Ai can do that better at speed" (Jerry 00:44). See [[teardown-2026-10-26-frostpunk2-diplomacy]].

## What REA can and cannot do (checked 2026-10-26)

REA (Reverse Engineer Anything) is an MCP server for agents. It disassembles native binaries (Ghidra/Hopper/IDA), reads .NET CIL, decodes Unity IL2CPP metadata (type and method names, versions 24-39), extracts Godot PCK archives (formats 2-4), maps JS/Electron modules, and observes runtime behaviour. Its showcases each recover a single formula. It does not export an engine. So the target is the game whose **rules** best match our spec; we reimplement those rules clean-room in Godot (mechanics are not copyrightable; code and assets are; many EULAs forbid decompiling, so REA is for narrow formulas only).

## Our spec, as the yardstick

5 parishes x 2 teams (community, Meridian) voting on shared decisions; owner of the resource decides. Simultaneous storm turns. Yields with people as workforce. Two meters (community trust, board confidence). Promises logged, kept/broken feed trust. Quarter goals and prep projects. Named in-world leaders apply pressure. News ticker. Tablet-first, ~60 players, offline-capable, deterministic replay.

## Candidates

| Game | Matches | Misses | REA tractability |
|---|---|---|---|
| **Frostpunk 2** (11 bit, 2024, Unreal Engine 5) | Districts ~ parishes; council of factions votes on every law (51 of 100); promises to factions for votes, kept = trust up, broken = trust down; Trust and Tension meters; people as workforce; whiteouts ~ storm turns; moral laws | Single player; real-time-with-pause | Low (UE5 native), but council/trust/tension rules are well documented on community wikis |
| **Rebel Inc** (Ndemic, Unity) | Region map, stability, reputation, income tied to stability, delayed initiatives | No factions, votes or promises; single player | Medium-high: Unity, Mono or IL2CPP; REA decodes both |
| **Diplomacy** (open-source adjudicators) | Simultaneous secret orders, reveal, resolve; 7 players; unenforced spoken promises | No economy, meters or values layer | Not needed: source is open |
| Frostpunk 1 | Hope/Discontent, promises with deadlines, workforce, storm finale | No factions voting; single player | Low (proprietary Liquid engine) |
| Real-time RTS (StarCraft, Age of Empires, Open RTS) | Map units, minimap, camera | Twitch combat works against deliberation; already ruled out by the storm-turns clock | Open RTS is MIT; camera/selection already borrowed |

## Recommendation

**Frostpunk 2 + Diplomacy.** Frostpunk 2's council, promise, trust/tension and workforce loops are the inside of a parish almost one to one (factions = community and Meridian teams). Diplomacy's order-reveal-resolve turn is the outside: how 10 teams act at once with unenforced talk between them. Rebel Inc is the fallback if Jerry wants REA to pull exact numeric formulas from a binary.

## Next steps (once Jerry picks)

1. Learn what failed in the paper prototype; re-check the pick against it.
2. Write a rules teardown of the chosen game(s): each loop, its inputs, outputs and timing, mapped to parish terms.
3. Only where a number matters and the wiki is silent, scope one REA question to one formula on a copy Jerry owns.
4. Rebuild the rules in Godot from the teardown, not from decompiled code.

## Sources

- REA README, "What you can analyze": https://github.com/morluto/rea
- Frostpunk 2 council, trust, promises: https://frostpunk-2.game-vault.net/wiki/Council ; https://en.wikipedia.org/wiki/Frostpunk_2
- Prior analysis of REA and Rebel Inc/Frostpunk/Paradox: [[decision-2026-10-18-rea-reference-games-rust]]
