---
type: audit
date: 2026-11-03
status: proposed
tags: [values-crucible, rea, reverse-engineering, plan, audit, keystone-slice]
related: ["[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[teardown-2026-10-26-frostpunk2-diplomacy]]", "[[decision-2026-11-02-boss-set-scorecards]]"]
---

# Audit of the REA plan, 2026-11-03

Jerry asked at 21:23: "How much did we reverse engineer? I think you're ignoring this part." At 21:25 he followed up: "Hold on, audit our REA plan."

## What we have actually reverse engineered

| Game | How | What we took | Status |
|---|---|---|---|
| Civilization IV | Its released source code, the game core SDK | Worker anger that lasts several turns; a workforce that shrinks smoothly as trust falls | In both engines |
| Diplomacy | The open-source engine code | Support strength: the seawall holds only if both teams back it | In both engines |
| Frostpunk 2, Anno 1800, Dune: Spice Wars, Northgard | Wikis and reviews only | The design teardowns | No code or data read |

So the four games Jerry picked on 2026-10-26 have not been examined at all. The boss scorecards are our own design, built from his dissertation, not taken from any game. The REA tool itself has never been run.

## The plan as it stood (v1)

1. Read open-source games here: Freeciv, OpenTTD and 0 A.D.
2. Later, run REA on Jerry's computer against Frostpunk 2, then Anno 1800.
3. Rebuild whatever we find clean-room in Keystone.

## Audit of v1: 43 / 100

| Criterion | Weight | Score | Finding |
|---|---|---|---|
| Starts from design questions | 20 | 6 | It starts from games we can open, not from what Keystone needs. Freeciv and OpenTTD answer questions nobody asked yet. |
| Fits the games Jerry chose | 10 | 3 | None of the open-source picks is one of his four games. They are stand-ins, and the plan doesn't say what each stands in for. |
| Access route is realistic | 15 | 6 | We hadn't checked what REA needs. Frostpunk 2 is an Unreal Engine 5 game, so decompiling it means a huge native binary in Ghidra. Its official mod kit already exposes the law, faction and trust tables, and that data is what we actually want. |
| Legal and ethical guardrails | 10 | 4 | None are written down. Two records already set the rules: [[decision-2026-10-18-rea-reference-games-rust]] (an end-user licence can ban reverse engineering; rebuild rules, never code) and [[decision-2026-10-26-rts-to-reverse-engineer]] (use REA only for one formula at a time). The plan ignored both. Open-source code is GPL, so we read it for ideas and never copy it. |
| Evidence standard per finding | 15 | 8 | The Civ IV pass was good: function, formula, rebuild, simulation. But there is no required format, so findings can come back as vibes. |
| Filter against complexity | 10 | 3 | Nothing stops us bolting on mechanics. Players are executives in a roughly 10-minute slice, so every mechanic must earn a values moment. |
| Validation | 10 | 7 | We have the 1000-seed simulation and five personas, but no prediction written before a test, and the personas are Claude grading Claude. |
| Sequencing against the playtest gate | 10 | 6 | Jerry hasn't played the slice yet. Reverse engineering more systems first risks tuning blind. |

## The plan, revised (v2)

### 1. Start from questions, not games

Each question names the game that answers it best, the access route, and what would count as an answer.

| # | Design question for Keystone | Best source | Route | An answer looks like |
|---|---|---|---|---|
| Q1 | How should a two-faction vote create tension and legitimacy, not just a winner? | Frostpunk 2 council and factions | Official mod kit data tables, and observing play | Vote thresholds, how support shifts, what a lost vote costs |
| Q2 | How do pressure and permission arrive, and how big are they? It checks our boss scorecards against a game tuned on millions of players | Frostpunk 2 faction demands, promises, trust and tension | Mod kit tables (demands, deadlines, penalties) | Size, deadline and decay of a demand; the penalty for a broken promise |
| Q3 | How should supply chains and convoys bend under disruption, along the chain from kelp to cure to port? | Anno 1800; OpenTTD as the open-source stand-in | OpenTTD code here; Anno's data files on Jerry's computer | Payment by delivery time, how service quality changes supply, the chain ratios |
| Q4 | How should a moving storm and changing site states force replanning? | Dune: Spice Wars and Northgard; 0 A.D. territory decay as a stand-in | 0 A.D. code here; the others by observing play | Warning lead time, hazard odds, how fast things recover |
| Q5 | How should unrest turn into people refusing to work? | Civ IV (done); Freeciv; Frostpunk 2 tension | Freeciv code here | City disorder rules and thresholds |
| Q6 | How should deals between teams work: votes, treaties, broken promises? | Diplomacy (done); Dune: Spice Wars Landsraad | Observing play | How a resolution is proposed, voted and enforced |

### 2. Access ladder: always take the lowest rung that answers the question

1. Open-source code (Freeciv, OpenTTD, 0 A.D.): read here, and rebuild clean-room.
2. Official mod kits and the game's own data files (Frostpunk 2 mod kit, Anno 1800 data): on Jerry's computer, from his own copies.
3. Observing play: play, record the numbers, and fit the formula.
4. REA decompiling: only for one named formula that rungs 1 to 3 couldn't answer, and only on a copy Jerry owns, after the licence check.

### 3. Guardrails

- **Copy nothing:** no code, assets or text. We record numbers and rules in plain math, and the notes cite the file and function they came from.
- **Licence check:** before anything above rung 2, Jerry checks each game's end-user licence. If it bans reverse engineering, we stop at rung 3.
- **Before the app ships:** this note is not legal advice. If the app is ever sold, a short check with intellectual-property counsel comes first.

### 4. One REA card per mechanic

Every finding must fill in these fields. A finding that can't fill them doesn't get built.

- **Source and evidence:** the file and function, or the data table, or the play log.
- **Formula:** written in plain math, with the real values.
- **What the player feels:** in one sentence.
- **Keystone mapping:** which content keys and which engine function it touches.
- **Values purpose:** which gap between stated and enacted values it creates or sharpens.
- **Cost:** new rules or screens. An executive can absorb at most one new idea per slice.
- **Prediction and decision:** what we expect the simulation to show, written before the test, then adopt, adapt or reject.

### 5. Validation

1. Write the prediction down.
2. Run 1000 seeds.
3. Check the two invariants: a team that does nothing never meets its target, and no line dominates.
4. Get the persona re-scores.
5. **Jerry's playtest is the real test.** The personas only filter ideas before it.

### 6. Order and time box

| Step | Where | Scope | Time box |
|---|---|---|---|
| A. Now, in parallel | Here | Q3 (OpenTTD), Q4 (0 A.D.), Q5 (Freeciv): REA cards only, nothing built | About 2 hours |
| B. Jerry's gate | His computer | Parity test, then play the slice for 10 minutes. His notes reorder Q1 to Q6 | Jerry |
| C. REA session | His computer, through a remote session | Check REA works (`rea doctor`, Ghidra), then the Frostpunk 2 mod kit tables for Q1 and Q2, then Anno 1800 data for Q3. Decompile only one formula if it's still needed | One session |
| D. Build | Here | Only the cards that pass the filter, in both engines, with golden replays and the simulation | Per card |

## Audit of v2: 92 / 100

The 8 points still missing need facts only Jerry has:

- Which of the four games he owns, and on which computer (Windows or Mac).
- Whether the Frostpunk 2 mod kit is installed.
- The licence check.
- His playtest notes, which set the order of the questions.
