---
type: decision
date: 2026-11-05
status: accepted
deciders: Jerry Wolf
tags: [crucible, art-direction, engine, concordia]
supersedes: "[[decision-2026-10-21-all-godot]] (engine tooling only; Summer is built on Godot 4)"
related: "[[decision-2026-11-02-boss-set-scorecards]], [[ui-rulebook-2026-11-05]]"
---

# Art direction and engine after the phase 2 no-go

## Context
At 17:05 on 2026-11-05, Jerry played the Keystone slice on his Mac and gave it a **NO-GO**: "Looks like a bad dashboard, not a video game." The rules engine is fine; the presentation is what failed.

## Decisions (Jerry, 2026-11-05)
1. **Engine: Summer Engine** ("I think summer engine CLI is the way"). Summer is an AI game engine built on Godot 4, so the existing GDScript rules and the parity test carry over.
   - Installed on Jerry's Mac: Summer 0.8.3, free, signed in.
   - Work happens on a copy at `Values Crucible/summer-keystone`. The copy passes the parity test, 18 checks and 0 failures.
2. **Canon map:** the island image Jerry uploaded, saved at `crucible/art/canon/concordia-map-2026-11-05.jpg`. It shows a round island on a ring road:
   - centre: a crater lake with the dam on its north rim
   - north: the capital, on a river
   - west: resorts and the airport
   - east: the container port
   - south: industry
   
   Claude's parish reading (pending Jerry's confirmation): Sterling north, Gateway west, Haven east, Keystone south, and Meridian/dam in the centre ("Heartland"). `crucible/content/concordia.json` still has the old 6-parish positions and must be updated.
3. **Look: a Google-Earth-like zoom over a low-poly polygon island.** The camera zooms from orbit, to a district, to the street, with the storm drawn on the map. Jerry: "Love that art direction."
   - Concept frames (Higgsfield, gpt_image_2_6, high quality, built from the canon map): jobs d99f2596 (orbit), f3382c44 (district), b8fb7223 (street).
4. **Faces:** painted portraits for the people who speak. Jerry: "The images of the people were good."
   - Pastor Ruth Okafor: 70af45c8
   - Dana Kell: 62f3fdd7
   - Inés Reyes: b5b5a18a

## Guardrails kept
- Original art only: no Civilization or other games' assets, looks or characters.
- Record every asset's licence, and skip any asset without clear commercial-use terms.
- Ask before any paid AI generation.
- Determinism and content-as-data are unchanged.
- Never edit `golden.json` or rule values.

## Next
Build the game on the island, step by step. Each step gets a screenshot for Jerry:
1. The zoomable island.
2. Keystone Turn 1 on the map: units you drag, the storm moving, and a face that speaks when a moment pops at its site.
3. Wire the existing rules engine to it.
4. Jerry plays again for a go/no-go.
