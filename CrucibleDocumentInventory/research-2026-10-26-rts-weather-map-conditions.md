---
title: "Research: strategy games where weather and map conditions change"
date: 2026-10-26
type: research-note
status: done
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, research, rts, weather, map, reverse-engineering]
related:
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
  - "[[teardown-2026-10-26-frostpunk2-diplomacy]]"
---

# Strategy games with weather and changing map conditions

**Asked (Jerry, 2026-10-26 00:54):** "Let's actually research RTSs how about ones with weather. Other map conditions that change."

**Why it matters:** Hurricane Midas is the third player. The map has to change under the teams (roads flood, the port closes, power fails), with enough warning that a choice made early pays off or hurts later. Neither Frostpunk 2 nor Diplomacy models that on a map.

## Shortlist

| Game | What changes on the map | Also has | Gaps for us | Fit |
|---|---|---|---|---|
| **Dune: Spice Wars** (Shiro Games, 2022) | Sandstorms circle the map counterclockwise (never the centre); sandworms strike a marked area and units must reach rock; scouts see storms coming | Real-time on a region map; the **Landsraad** council votes on three resolutions each round, with votes earned by holding villages and spent with Influence; multiplayer | Combat-heavy; one player per faction | **Best whole fit:** moving weather + region map + council votes + multiplayer |
| **Northgard** (Shiro Games, 2018) | Seasons: winter cuts food; disasters are **announced on a calendar about 3 months ahead** (Blizzard: production -50%, firewood x2; Earthquake: up to 3 buildings damaged; Rats: eat food not in silos; Frozen sea: no boats in winter) | Territory-by-territory map; multiplayer | No politics or votes | Best model for a **forecast calendar** and prep that pays off |
| **Against the Storm** (Eremite, 2023) | Season cycle Drizzle, Clearance, Storm; Storm raises Hostility | Two clocks: **Reputation** (win) vs **Queen's Impatience** (lose at 14 points, rising every minute): an off-board voice pressing you | Single player; city builder | Best model for **off-board pressure as a clock** |
| **Emergency** series (Sixteen Tons, 1998-2023) | Disaster missions in real time | You order fire, EMS, police and technical units on a map; co-op for up to 4 in Emergency 5 / 20 | No economy, values or politics | Best model for **ordering response units on the map** |
| **Company of Heroes 2** (Relic, 2013) | ColdTech: blizzards, exposure (units must warm up or freeze), deep snow slows, ice breaks under heavy units | Tight real-time unit control | Pure combat | Best model for **weather that makes ground lethal or impassable** |
| **Hearts of Iron IV** (Paradox, 2016) | Per-province weather (rain, mud, snow, storms) changes movement and supply | Plaintext scripts ship for modding (no RE needed); large multiplayer | Huge, slow to learn | Reference for **per-region weather rules** |
| Frostpunk 2 (already chosen) | Whiteouts on a forecast countdown | Council, promises, trust/tension | No moving weather on the map | Keep for parish politics |

## What to borrow

1. **Dune: Spice Wars storms:** the hurricane as a moving hazard with a visible track across the 5 parishes; units caught in it are damaged; units on high ground or in shelter are safe. Sandworm rule = flash-flood warning on one site: move or lose it.
2. **Northgard calendar:** each storm turn shows what is coming 2-3 turns out (road closes, surge at the port, power cut), so prep projects make sense.
3. **Against the Storm clocks:** Meridian HQ impatience as a rising clock that low board confidence speeds up; community trust as the counterweight.
4. **Emergency units:** buses, crews, generators, boats as units you send to a site, with travel time over roads the storm can close.
5. **CoH2 ground:** sites change state (dry, flooded, cut off); some units can't cross some states.

## REA note

Northgard and Dune: Spice Wars run on Shiro Games' own Haxe-based tech; whether REA reads them well is untested. Their rules are well documented by wikis, so REA is not needed for the design. Hearts of Iron IV ships its rules as plaintext.

## Sources

- Northgard disasters: https://northgard.fandom.com/wiki/Disasters ; https://en.wikipedia.org/wiki/Northgard
- Dune: Spice Wars sandstorms: https://dunespicewars.fandom.com/wiki/Sandstorms ; Landsraad: https://www.gameskinny.com/h97t2/dune-spice-wars-landsraad-voting-system-explained ; https://store.steampowered.com/app/1605220
- Against the Storm: https://wiki.hoodedhorse.com/Against_the_Storm/Queen%27s_Impatience ; https://en.wikipedia.org/wiki/Against_the_Storm_(video_game)
- Emergency: https://www.gamepressure.com/games/emergency-series/z55 ; https://www.sixteen-tons.de/en/classics/ ; https://www.co-optimus.com/game/4963/pc/emergency-20.html
- Company of Heroes 2 ColdTech: https://gamesbeat.com/in-company-of-heroes-2-blizzards-may-kill-you-before-the-enemy-does/
- Hearts of Iron IV weather: https://forum.paradoxplaza.com/forum/threads/hearts-of-iron-iv-28th-development-diary-weather-terrain.885969/
