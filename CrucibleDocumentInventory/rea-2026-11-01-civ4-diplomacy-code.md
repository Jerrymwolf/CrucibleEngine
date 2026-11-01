---
type: research
date: 2026-11-01
status: in-progress
tags: [values-crucible, rea, reverse-engineering, civ4, diplomacy, keystone-slice]
related: ["[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[teardown-2026-10-26-frostpunk2-diplomacy]]", "[[2026-10-31-keystone-persona-test-build-log]]"]
---

# REA on real game code: Civ IV and Diplomacy, 2026-11-01

Jerry (2026-11-01 17:05): "I don't think we've actually used REA on actual code and games."

He is right. The work on 2026-10-26 built teardowns from wikis. This note covers the first pass that reads real source code.

The aim is to lift the game designer's weakest rubric lines:
- decision density
- interdependence
- score-vs-people tension

Mechanics are reimplemented clean-room. No code is copied.

## Sources read

| Game | Source | What it is |
|---|---|---|
| Civilization IV: Beyond the Sword | github.com/dguenms/beyond-the-sword-sdk (`CvGameCoreDLL`) | Firaxis's published game-core SDK, C++ |
| Diplomacy | github.com/diplomacy/diplomacy (`diplomacy/engine/game.py`) | Open-source engine compliant with the Diplomacy Adjudicator Test Cases (DATC) |

Not yet read are Frostpunk 2, Anno 1800, Dune: Spice Wars and Northgard. They are closed source, so reading them needs Jerry's own installed copies and the REA tool on his computer. Frostpunk 2 has an official mod kit that exposes its law and faction tables.

## Mechanics found, and how they map to Keystone

1. **Hurry anger is a timer.**
   - Code: `CvCity::getHurryPercentAnger`. Forcing labour adds anger that lasts a fixed number of turns.
   - Keystone: night shifts, exposed workers, or keeping the plant ahead of people start a community anger timer. While it runs, some community workers refuse plant shifts. The selfish line therefore costs Meridian itself in later turns, which removes the "every kind act is a gift to the rival" double count without changing the win condition.
2. **Angry citizens don't work, and the effect is continuous.**
   - Code: `CvCity::angryPopulation`, which is `clamp(unhappy - happy, 0, pop)`.
   - Keystone: plant output scales with available workers, and the number available falls smoothly with low trust and with active anger timers. This replaces the trust cliffs at 40 and 60, which the simulation showed never fire.
3. **Support strength, and cut support.**
   - Code: `_strengths` and `_cut_support`. A hold or move has strength 1 plus its supports. A support is cut when the supporting unit is attacked, and you cannot cut support you are giving yourself.
   - Keystone: the T3 seawall and the Low Ward surge need defence strength at or above a threshold. Units from both teams add strength, and neither team can reach the threshold alone. A unit pulled away by another order gives no support.

## Status

The game designer persona is testing these three mechanics in its balance harness, with and without the "beat your own start" win condition. The results will be added here.
