---
type: build-log
date: 2026-10-31
status: built-untested-in-godot
tags: [values-crucible, keystone-slice, godot, persona-test, phase-2]
related: ["[[2026-10-27-keystone-slice-build-log]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[design-2026-10-21-rts-godot]]"]
---

# Keystone slice: adversarial persona test, 2026-10-31

Jerry asked: "Have various personas adversarially test this and recursively self improve until it scores 90 or greater, then I will try it."

Five tester personas read the code, ran the JS engine and scored the slice against their own rubrics. Each round of fixes was followed by a re-score. Nobody ran Godot: this environment will not run the Godot binary, so every GDScript change is syntax-checked (gdtoolkit) and parity-checked by reading only.

## Scores

| Persona | Lens | R1 | R2 | R3 | Latest |
|---|---|---|---|---|---|
| Godot engineer | compiles, parity, runtime | 84 | 90 | | 90 |
| Red team | hostile AI JSON, inputs, replay, keys | 85 | 94 | | 94 |
| Exec player (CNO) | first-time clarity, stakes | 54 | 79 | 83 | 87 |
| Facilitator | values learning, witness, debrief | 55 | 80 | 84 | 87 |
| Game designer | decisions, exploits, tension | 45 | 67 | 68 | 68 (ceiling set by the win condition) |

## What changed

- **Rules (both engines):**
  - **Consent:** an order the other team pays for runs only if that team votes for it, otherwise the standing plan runs.
  - **Fuel:** the owner pays fuel, even on a lent unit.
  - **Idle blame:** a rescue unit is blamed for idling only if people it could reach were still waiting.
  - **Generator:** it cannot power two things.
  - **Saves:** they respect a closed road.
  - **Cold store:** a new `cold_store` effect stops the plant's stored doses from spoiling.
  - **Plant licence:** community trust counts double in the plant licence.
- **Witness checks on Claude's moments:**
  - **Words:** judging words are matched by stem, and non-Latin lookalike letters are rejected.
  - **Orders:**
    - An order that is free and only helps is dropped.
    - So is an order that saves N people for less than N/10 in goods, doses or meter points.
  - **Default:** the default must be the deciding team's own order.
  - **Collision:** if both teams' #1 values match, the collision is filled from the next-ranked value.
- **Prepared moments:**
  - **Fit to the board:** board-aware variants and template slots, so the text matches the board.
  - **Value tags:** tags are authored per value, including openness values.
  - **Selfish options:** they now cost board confidence.
  - **Flash warning:** it comes a turn ahead, and its advice is accurate.
- **Godot screens:**
  - **Layout:** fits 1600x900, keeps scroll position, Lock sits at the top.
  - **Standing preview:** each order shows "Standing now: X% → Y%".
  - **Labels:** plain labels, a turn 1 "Start here" coach, and a map that stays big while you give orders.
  - **Turn report and debrief:**
    - The turn report shows residents first.
    - The debrief puts the standings beside the number who died and quotes each team's statement.
    - It shows how each call was made, plus each team's unit orders, three reflection prompts and a saved Monday commitment.
- **Setup:**
  - **Default:** play the community, with a bot as Meridian.
  - **API key:** a key-test button checks it, and a key taken from the environment is never saved.
  - **Saved settings:** they are versioned.
- **Parity:** the hash is over UTF-8, truncation counts code points, and numbers given as text are parsed the same way in both engines.

## Measured (1000 seeds, prepared moments, random votes)

| community | meridian | community wins | meridian wins |
|---|---|---|---|
| nothing | nothing | 18.8% | 80.6% |
| nothing | careful | 2.3% | 96.5% |
| careful | nothing | 90.8% | 8.8% |
| careful | careful | 54.4% | 43.0% |

- When Meridian always votes the company option, it gains about 22 win points (it wins about 65% of games).

## Open: the win condition (Jerry's call)

The game designer's remaining points come from one structural fact. In a race between two teams in one parish, any humane act counts twice: the giver loses resources and the rival gains them. This cannot be tuned away while "most resources left relative to the other team" is the win condition.

There are two coherent options:

- **Keep the race.** The lesson becomes "every humane act is a gift to your rival", and the debrief must name it.
- **Beat your own start.** Each team wins if it ends above its starting resources, so both teams can win. The designer estimates about +8 points. This changes what the game teaches.

## Left undone

- **Godot not run:** first job on Jerry's machine is `godot --headless --script res://tests/run_tests.gd` (must print PASS), then F5.
- **Recovery turns:** they have no choices yet, and the arc is front-loaded in T1. The designer says this is needed for 90 on that rubric.
- **Debrief:** it lists each team's unit orders but does not yet read them against the signed values.
- **Browser twin:** `crucible/slice/keystone-slice.html` did not get the console layout fixes.
