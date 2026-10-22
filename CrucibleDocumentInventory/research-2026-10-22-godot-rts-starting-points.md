---
title: "Research: open-source Godot starting points for the Crucible"
date: 2026-10-22
type: research
status: proposed
tags: [crucible-engine, research, godot, rts, open-source]
related:
  - "[[decision-2026-10-21-all-godot]]"
  - "[[design-2026-10-21-rts-godot]]"
  - "[[audit-2026-10-21-strategy-game]]"
  - "[[research-2026-10-21-game-engine-for-rts]]"
---

# Research: open-source Godot starting points for the Crucible

Jerry asked (2026-10-22): "There's no GODOT open source RTS ENGINE out there we can use?"

**Short answer:** there is no ready-made Godot RTS *engine* that fits. There are good open-source *parts*, all MIT-licensed, and one complete sample RTS game. None of them has multiplayer built in, and none runs on simultaneous turns, which Jerry chose on 2026-10-21 (see [[audit-2026-10-21-strategy-game]]).

## What exists

| Project | What it is | Licence | Godot | Activity | Multiplayer | Fit for the Crucible |
|---|---|---|---|---|---|---|
| **Open RTS** (lampe-games/godot-open-rts) | A complete small real-time RTS: units, minimap, fog of war, two resources, AI opponents. GDScript. About 1.1k stars. | MIT | 4.3 | Last push January 2025 | None | Good reference for the camera, unit selection, minimap and fog. Its core is real-time combat against an AI, which we do not have; we would throw most of it away. |
| **Hex Strategy Map, free edition** (Dimcairion) | A hex-grid toolkit: A* and Dijkstra pathfinding, reachable tiles, per-player fog. Deterministic logic, no dependencies. | MIT | 4.6+ | Current (asset library edits in 2026) | None ("bring your own netcode"); says the logic suits lockstep and headless servers | Strong fit for a turn-based map. The turn manager, units, minimap and save system are in the paid Pro edition. |
| **OpenCiv3** (C7-Game) | An open remake of Civilization III. | MIT | 4.2+ | Active | Not confirmed | Weak fit. It is written in C#, which complicates the web build, and it is pre-alpha. |
| **netfox** (foxssake) | A Godot networking add-on: timing, rollback, client-server. About 1.1k stars. | MIT | 4.x | Active | Yes, that is what it is | Built for fast action games that need rollback. Simultaneous storm turns do not need rollback; Godot's own WebSocket multiplayer is enough. |

## Recommendation

Build our own game on proven parts rather than fork a whole game:

- the hex map toolkit (free edition) for the island grid, pathfinding and fog;
- Open RTS read as a reference for camera, selection and minimap code, copying only what we need (MIT allows this with the licence notice kept);
- Godot's built-in WebSocket multiplayer for the authoritative host on the Crucible master's laptop.

The parts that make the Crucible different (the storm, two teams per parish, owner-decides votes, yields, the witness log and the debrief) do not exist in any of these projects and would be ours to write either way.

## Limits

- GitHub's own pages could not be read from this session, so star counts and dates come from GitTrend and the Godot asset library, as of 2026-10-22.
- Nobody has opened these projects in Godot 4.7 yet. Open RTS targets 4.3 and may need small fixes.

## Sources

- Open RTS: <https://gittrend.io/repo/lampe-games/godot-open-rts>, <https://lampe-games.itch.io/open-rts>
- Hex Strategy Map, free: <https://dimcairion.itch.io/hex-strategy-map-free>, <https://www.godotengine.org/asset-library/asset/5136>
- OpenCiv3: <https://gittrend.io/repo/C7-Game/OpenCiv3>
- netfox: <https://github.com/foxssake/netfox>
