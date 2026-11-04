---
type: spec
date: 2026-11-04
status: proposed
tags: [values-crucible, rea, reverse-engineering, spec, plan]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-04-openttd-0ad-freeciv]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]"]
---
# REA spec and plan, all ten games, 2026-11-04

Jerry, 2026-11-04 18:48: "I want a full spec and plan for ALL REAs." Live Claude Doc: https://claude.ai/artifact/JRVtFfJ7nMG29Lxdk4dWPH. This file started as the full text of that doc. It has since been hardened through a Claudex Loop audit (Codex) and a fact-check against live web pages on 2026-11-04, so it is now ahead of the live doc.

## Summary

We reverse engineer games for one reason: so the Keystone slice and the five-parish game get rules that strategy designers have already tested on millions of players. We then rebuild those rules to serve one purpose: making the gap between stated values and enacted values visible.

The Values Crucible tracks four levels of values (source: Jerry's concept doc, `~/Desktop/Projects/Values Crucible/The Values Crucible.docx`):
- **PV-5:** each person's five values, from their behavioural event interview.
- **TV-5:** the five values each team negotiates.
- **CV:** the company values that leadership states.
- **LV:** what executives actually model under pressure.

Players see only the performance metrics. The values layer stays hidden until the debrief. The metrics are the pressure, not a values level. Every mechanic we take must create a moment where that pressure pulls against a declared value, and leave a logged decision the debrief can point to.

This spec covers all ten reference games. Five have been read so far, all open source or with released source:
- Civ IV and Diplomacy, read on 2026-11-01 and built ([[rea-2026-11-01-civ4-diplomacy-code]]).
- OpenTTD, 0 A.D. and Freeciv, read on 2026-11-04 in step A, giving five cards and nothing built ([[rea-2026-11-04-openttd-0ad-freeciv]]).

The other five have not been touched: Frostpunk 2, Anno 1800, Dune: Spice Wars, Northgard and Rebel Inc: Escalation. All five are closed source, so they need Jerry's own copies, and four of the routes need a Windows PC (FrostKit, Anno 1800, Dune: Spice Wars and the Northgard Editor).

Nothing is built before Jerry's playtest gate (step B). After the gate, every finding becomes a card, and nothing gets built without Jerry's approval on that card.

## Design questions

Every REA session starts from one of these questions, never from a game. Q1 to Q6 come from the audited plan of 3 November ([[audit-2026-11-03-rea-plan]]). Q7 and Q8 are new and close two gaps: delayed effects, and how often dilemmas come up. "Values tension" names the declared value the mechanic puts under pressure, and the debrief trace names the logged decision that shows enactment, compromise or recovery.

| # | Question for Keystone and the five-parish game | Values tension and debrief trace | Answered by | An answer looks like | Status |
|---|---|---|---|---|---|
| Q1 | How does a two-faction vote create tension and legitimacy, not just a winner? | TV-5 against the visible score. Trace: the team's vote (the slice logs one vote per team) against its signed ranks | Frostpunk 2 council | Vote thresholds, how support shifts, what losing a vote costs | Open |
| Q2 | How big are pressure and permission, and how fast do they decay? | CV against LV. Trace: whether the leader uses the board's pressure or permission in line with the stated company values | Frostpunk 2 demands and promises | Demand size, deadline, decay; penalty for a broken promise | Open (boss scorecards are our own design, not yet checked against a game) |
| Q3 | How do supply chains bend under disruption, from kelp to cure to port? | PV-5 and TV-5 (care) against the performance metric. Trace: which shipment goes before people | Anno 1800; OpenTTD | Pay by delivery time, service rating, chain ratios | OpenTTD carded; Anno open |
| Q4 | How do a moving storm and site states force teams to replan? | TV-5 under uncertainty: the "prepare or wait" test in the concept doc. Trace: when the team commits resources against the warning | Dune: Spice Wars, Northgard (storm timing); 0 A.D. (site state only) | Warning lead time, hazard odds, recovery speed | Partly answered: 0 A.D. gives site allegiance, not storm warning |
| Q5 | How does unrest turn into people refusing to work? | PV-5 (respect, compassion) against the shift target. Trace: care or control when the shift falls short | Civ IV, Freeciv, Frostpunk 2 tension | Anger timers, disorder thresholds, martial law | Civ IV built; Freeciv carded; Frostpunk 2 open |
| Q6 | How do deals between teams work: votes, treaties, broken promises? | TV-5 across teams. Trace: a promise made, then kept or broken | Diplomacy; Dune: Spice Wars Landsraad | How a proposal is made, voted and enforced | Diplomacy built; Landsraad open |
| Q7 | How do the delayed effects of aid show up, so caring now pays later and neglect is felt late? | PV-5 over time: drift and recovery. Trace: the turn the cost of neglect lands, then the team's recovery choice (repair, or carry on) | Rebel Inc; OpenTTD rating | Delay before an effect lands, how it decays, reputation drift | Partly answered: OpenTTD gives inertia, not delay; Rebel Inc open |
| Q8 | How often, and on what triggers, should a dilemma interrupt play? | All levels: the Crucible Master's pacing. Trace: the number of values moments per turn | Frostpunk 2 events; Rebel Inc events | Event cooldowns, trigger conditions, how many run at once | Open |

A card's values purpose must name actual declared values: the values deck in `crucible/content/values.json` and each team's signed ranks. It must not assume that care always means PV-5, or that performance always means CV.

**What the engine can and can't trace.** The slice engine logs team orders, one vote per team, and the Crucible Master's levers. It can trace TV-5 directly, with one caveat: each team signs three ranked values in the slice, so that is a three-value approximation of TV-5, labelled as such in the debrief.

The Crucible Master's levers are imposed pressure: the context of a decision, not evidence of anyone's values. LV evidence is the executive players' own decisions under that pressure, and comes from two places:
- The engine log: their team's final calls, orders, and promises kept or broken on the turns after a lever.
- The facilitator's written notes of who argued for what.

PV-5 and CV are per-person and per-company declarations that live in the facilitated session (the participants' PV-5 cards and the values leadership presents). They are not in the engine. The debrief joins PV-5, CV and the LV notes to the engine log by hand. Per-person tracing in the engine is deferred to the five-parish game, and no card may claim it before then.

**Translation rule.** Source games run on different clocks (seconds, days, turns) and have different numbers of factions. Every card converts the source unit into Keystone turns, and the conversion goes in its Formula field. By default, one source decision cycle is one Keystone turn. Faction counts map to Keystone's two teams plus the council. A rule that can't be translated is rejected, not stretched.

## Access records, fact-checked 2026-11-04

Rungs:
1. Open source.
2. An official mod tool, or the game's own data read through the route the publisher's mod system supports.
3. Observing play.
4. Decompiling one formula.

Every claim below was checked against the cited page on 2026-11-04; the F numbers point to the fact-check table. Where a page couldn't settle a claim, it is marked **unresolved**, with the person who settles it.

| Game | Platforms | Lowest rung | Verified route | Licence and tool terms | Questions | Targets | Output |
|---|---|---|---|---|---|---|---|
| Civilization IV | n/a (source) | 1: released core SDK | `CvGameCoreDLL` in github.com/dguenms/beyond-the-sword-sdk | Released SDK | Q5 | Hurry anger, angry population | Built in both engines (2026-11-01) |
| Diplomacy | n/a (source) | 1 | github.com/diplomacy/diplomacy `engine/game.py` | Open source | Q6 | Support strength, cut support | Built in both engines (2026-11-01) |
| OpenTTD | n/a (source) | 1 | `src/economy.cpp`, `src/station_cmd.cpp` @ 611118d | GPL: read for ideas, rebuild clean-room | Q3, Q7 | Delivery time factor, station rating inertia | Cards 2 and 5 |
| 0 A.D. | n/a (source) | 1 | `TerritoryDecay.js`, `Capturable.js` @ 61a3b95 | GPL | Q4 (site state) | Capture points, territory decay | Card 4 |
| Freeciv | n/a (source) | 1 | `common/city.c`, `server/cityturn.c` @ cfa2c92 | GPL | Q5 | Martial law and luxury, disorder counter | Cards 1 and 3 |
| Frostpunk 2 | Game: Windows 10/11 and macOS [F4]. FrostKit: **Windows 10/11 64-bit only, about 100 GB, free** [F3] | 2: FrostKit, the official mod tool [F1] | Policy assets expose "Required Yes Percentage", a voting-behaviour override (`PXVotingBehaviourSet`) and Aye/Hesitant standing thresholds; `PXLaw` types exist [F2]. Promise, demand, tension and event tables are **unresolved** until FrostKit is opened | 11 bit studios user agreement: no explicit decompiling clause found [F5]. **Unresolved:** Jerry reads it in step B | Q1, Q2, Q5, Q8 | Vote thresholds and voting behaviour; promises and demands; tension per event; event triggers and cooldowns | 4 to 6 cards; boss scorecard sizes checked against the game |
| Anno 1800 | **Windows 10 64-bit only**; needs a Ubisoft account [F9] | 2: game data, via the built-in mod loader's route | Data sits in `.rda` archives in `maindata`. Values live in `data/config/export/main/asset/assets.xml`, superseded by later patch archives, so read the highest patch. The mod loader is built into the game [F6]. Units are per field: `CycleTime` in seconds and `Amount` in tonnes in `FactoryBase` [F7]; every other field's unit is recorded from an Anno 1800 example before use. The archives are opened with RDA Explorer, a community tool [F6] | EULA s.1.2 bans reverse engineering, decompiling and disassembling, except through in-product user-content features [F8]. **Rung 4 is barred.** Rung 2 needs Jerry's licence entry to name RDA Explorer explicitly; otherwise Anno stops at rung 3 | Q3 | Chain ratios and cycle times, population needs and unmet-need effects, ship capacity and route timing | 2 to 3 cards for the five-parish chain |
| Dune: Spice Wars | **Windows 10/11 only** [F11] | 3 by default; 2 only if the licence entry allows it | No official editor. The 21 Oct 2026 patch added official mod hooks: data from a modified `cdb` file, `/enableCheats`, `/reloadPak` and `/help`; Shiro doesn't vet community mods [F10]. Reading the `cdb` needs a community tool | Shiro Games EULA: **unresolved**, Jerry checks in step B | Q4, Q6 | Sandstorm and sandworm timing and warning, Landsraad resolution and vote rules | 1 to 2 cards (shape only if rung 3) |
| Northgard | Windows, macOS, Linux; the editor is PC-only [F13] | 2: the official Northgard Editor | `NGEditor/Editor.exe` edits the game's CastleDB data and saves changes as `cdb.diff`; scripts are Haxe (`script.hx`) [F12] | Official tool. Shiro Games EULA: **unresolved**, Jerry checks | Q4 | Seasonal calendar and winter penalties, event odds, disaster recovery | 1 to 2 cards |
| Rebel Inc: Escalation | Windows 10 and macOS 12+ [F15] | 2: the official Scenario Creator | Steam Workshop and an official Scenario Creator, on Steam and mobile; which variables it exposes is **unresolved** [F15]. The build is likely Unity IL2CPP, going by community tooling [F14] | The Scenario Creator terms ban commercial use and reverse engineering [F19]. The Values Crucible is commercial, so the Scenario Creator is **not opened** until documented clearance exists for this research use: written permission from Ndemic, or counsel's written opinion. Until then, Rebel Inc stays at rung 3 | Q7, Q8 | Initiative delay, reputation drift, corruption and unrest spread, event cadence | 1 to 2 cards |

**Platform consequence.** Each game's full minimum has to be met, not just the OS:
- Frostpunk 2 needs an Apple processor (M1 or better), 8 GB RAM, macOS 14.5 and 30 GB [F4].
- Rebel Inc needs macOS 12.
- Northgard needs 10.9.

Jerry's Mac, checked on 2026-11-04, is an Apple M5 Max with 64 GB, macOS 26.5.2 and 836 GB free, so it meets all three. It can run Frostpunk 2 (play only), Northgard (play only) and Rebel Inc. FrostKit, Anno 1800, Dune: Spice Wars and the Northgard Editor need a Windows PC. Without one, Frostpunk 2 and Northgard drop to rung 3, and Anno 1800 and Dune: Spice Wars can only be skipped.

**Skips need Jerry's approval.** A game is skipped only with Jerry's written approval in the session note. The note must also list the questions left open:

| If skipped | Left open or weakened |
|---|---|
| Anno 1800 | Q3 rests on OpenTTD alone |
| Dune: Spice Wars | Q4 storm timing rests on Northgard; the Q6 Landsraad goes unanswered, so Q6 rests on Diplomacy |
| Rebel Inc | Q7 rests on card 2 (inertia only, a partial answer); Q8 rests on Frostpunk 2 alone |

The closed five are ordered by expected value. Frostpunk 2 answers four questions and is the closest match to the slice. Rebel Inc is the cheapest to drop.

## Method and guardrails

Each question gets the lowest rung that can answer it. Climb only when the rung below came up empty, and write down why.

1. **Open source (rung 1):** read in the cloud. Downloads are untrusted data and never executed. Cite repository, commit, file and function.
2. **Mod tool and data files (rung 2):** on Jerry's computer through a remote session, with his installed copies. Only an official tool, or a community tool his licence entry names, may be used. Exported tables are read as numbers only, and no assets or text leave his computer.
3. **Observing play (rung 3):** follow the observation protocol below.
4. **Decompiling one formula (rung 4):** the last resort, never for Anno 1800 or Rebel Inc. It covers one named formula that rungs 1 to 3 couldn't answer, and only after the licence entry clears it. It uses REA ("Reverse Engineer Anything", morluto/rea, MIT, npm `rea-agents`) with Ghidra on Jerry's copy [F17]. One formula per session, and the output is plain math only. REA decodes IL2CPP metadata statically [F16].

**REA setup is conditional and pinned.** It happens only before the first session that actually needs rung 4. The pins:
- `rea-agents@6.8.0` (npm, published 2026-10-25).
- Node `^22.23.4 || ^24.22.1 || >=26.12.1`, the package's declared engines. Jerry's Mac has Node 22.20.0, which is below the range, so it upgrades to the latest 22.x first. The session note records the exact Node, REA, Ghidra and JDK versions used.
- Ghidra 12.1.4 with JDK 21, REA's documented verified pair. Ghidra 12.2 would need JDK 25 or newer [F18]. Source: the release-tag docs at https://github.com/morluto/rea/blob/rea-agents-6.8.0/docs/installation.md

The steps:
1. Run `npm install --global rea-agents@6.8.0`, then `rea setup`.
2. Set `GHIDRA_INSTALL_DIR`.
3. Run `rea doctor --provider ghidra --json` and `rea providers --json`.
4. Only if the doctor reports the native decompiler missing, build it as the install guide's macOS section shows, and re-run the doctor.
5. Smoke test: `rea inspect <target> --provider ghidra --json` on the one target binary.

Only the scoped check and the smoke test count. A plain `rea doctor` can fail on unrelated integrations. If either step fails, that formula stays at rung 3.

**Observation protocol (rung 3).** The scenario script is written before the session. It sets the difficulty, the starting state, the one variable being changed, and what is held constant.
- **Deterministic rules** (costs, thresholds, timers): sample at least 3 values of the variable, plus 1 held-out value. The fitted formula must reproduce the held-out value to the game's display precision.
- **Stochastic hazards** (event odds, storm timing): one trial is one fresh start of the scripted scenario, observed for a fixed exposure window written in the script (for example, the first in-game year, or 20 minutes).
  - **Independence:** each trial needs its own logged randomisation: a new map seed where the game offers one, otherwise a new map or game, plus its save name. A trial that reuses a seed or save is not counted.
  - **Odds:** record whether the event occurs in each window, and report the rate with a Wilson 95% interval.
  - **Timing:** record when it occurs in game seconds or days. Windows where it never occurs are kept as censored observations, not dropped. Report the Kaplan–Meier median and range, converted to Keystone turns (https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm). If more than half the windows are censored, report the timing as "later than the window" only.
  - **Stop rule:** stop at the time box. The result is insufficient evidence if the Wilson half-width is over 15 points, or fewer than 5 events were seen for a timing claim.
- **Insufficient evidence** means the card is held with the shape only. No formula is invented.

**Guardrails.**
- **Copy nothing:** no code, assets, text or names. GPL code is read for ideas only.
- **Clean-room, in practice:** the reader writes the card in plain math, and the builder works only from the card. Source files are never committed, and each claim on a card cites its provenance (game, build, file or table, row).
- **Licence entry first, at rung 2 and above:** before any rung 2 to 4 session, Jerry records a licence entry in the repo note. It covers the game's EULA **and** the terms of each tool used, separately: URL, the relevant clause, date, permitted scope, the tools named, and his decision. If a clause is unclear, or a route needs circumvention (DRM, encryption, or a tool the entry doesn't name), stop at rung 3.
- **Jerry's copies only.**
- **Counsel before any sale.** This is not legal advice. The Rebel Inc commercial-use clause makes this binding for that game.
- **Determinism holds:** rules live in content JSON and the seeded engine.

## The REA card and when it passes

| Field | What it must hold |
|---|---|
| Provenance | Game, edition, build or version, platform, and settings or difficulty; repository and commit for open source |
| Source and evidence | Per claim: file and function, a data table and row, or a play log with its scenario script |
| Formula | Plain math with real values and units per field; the time and faction translation; no code copied |
| Recovered vs adapted | Which constants came from the source, and which are our own tuning, labelled separately |
| Confidence | High only after an interpretation check: a worked example with real values reproduced, or a behaviour check. Otherwise medium (fitted from play) or low. List any unverified fields |
| What the player feels | One sentence |
| Keystone mapping | Content JSON keys and engine function touched |
| Values purpose | The declared value under pressure, the level (PV-5, TV-5, CV, LV), and the logged decision the debrief will show |
| Cost | How many new ideas it adds (see the complexity rule) |
| Prediction | A number with a tolerance on the sim, written before the test |
| Decision | Prototype, adopt, adapt, hold or reject, with a reason |

**Complexity rule.**
- One new idea is one new player-visible element: a number, an order, a meter or a screen.
- Each slice iteration may add at most one.
- The slice carries at most **3** card-added ideas in total. A fourth must replace one.
- Comprehension is a task check, not a recital. In Jerry's playtest, the player uses the new element correctly at least once without prompting, and can say what it does. If either fails, the element is removed.
- Cards 1 (the cordon order) and 3 (the unrest counter) are two ideas, so they ship in separate iterations.

**Two gates per card.**
- **Prototype approval:** Jerry approves the card, and Claude builds it behind a content key.
- **Acceptance:** it stays in the slice only if all four pass criteria below hold.

**Pass criteria.**
1. **Prediction met:** within the written tolerance (default ±5 percentage points of target rate), on seeds 1 to 1000 of `node crucible/slice/sim.mjs 1000`. Claude runs it and logs it.
2. **Invariants hold, on the run matrix sim.mjs actually plays.** That matrix is:
   - Community `nothing` or `careful`, against Meridian `nothing` or `careful`.
   - Community `careful` against Meridian `generous` and `selfish`.
   - The four Crucible Master levers.

   Inactivity is defined per team. Community `nothing` gives no orders. Meridian `nothing` only runs the plant, which is its baseline operation. Three checks:
   - **Idle success:** an idle team meets its target at most 10% of the time. Measured on 2026-11-04 (1000 seeds): both idle 0.6% and 1.0%; idle community against careful Meridian 2.0%; idle Meridian against careful community 7.1%.
   - **Acting beats idling:** against the same opponent, each team's mean index is higher when it acts than when it idles (today 74.1 vs 6.7 for the community, 115.9 vs 83.6 for Meridian). Indexes are compared within a team only, because the two teams' scales differ.
   - **Pressure trade-off survives:** today selfish Meridian beats careful on its own target (64.0% against 61.7%). It costs the community's target (45.4% against 61.2%) and lives (72 against 67 mean people lost). A card must not erase that cost, or the pressure has no moral price.
   - **No dominant line** (enforced once D0 lands): in D0's full matrix, no policy is a team's best response, on its own target rate, to every opposing policy.

   **Step D0**, before any card is built: Claude extends sim.mjs to the full matrix. It logs four things per cell: each team's target rate, the **joint** rate at which both teams meet their targets, mean people lost, and turn-by-turn meter changes. Card-specific predictions (for example, card 2's "both careful teams meet their targets" and "fewer last-turn swings") are tested on those columns, not on the separate team rates:
   - Community: `nothing`, `careful`, `kind` and `selfish`.
   - Meridian: `nothing`, `careful`, `generous` and `selfish`.
   - Levers: none, plus each of the four.

   These claims hold for this matrix and these seeds only.
3. **Parity**, two separate checks:
   - **Determinism:** on an unchanged engine, `node crucible/slice/golden.mjs` regenerates `crucible/godot/keystone_slice/tests/golden.json` byte-identical (seeds 42, 7 and 4217; true on 2026-11-04).
   - **Intended change:** an accepted card commits a new `golden.json`, with its diff reviewed, plus at least one golden scenario that exercises the new mechanic. Then `godot --headless --script res://tests/run_tests.gd` must print PASS on Jerry's machine, comparing matching JS and Godot states.

   The earlier "600-game red-team" has no harness in the repo and is dropped until one is built.
4. **Jerry accepts it after his playtest.** His notes outrank every persona score.

**Corrections to existing cards** (found in the audit).
- [[rea-2026-11-04-openttd-0ad-freeciv]] says OpenTTD's delivery factor "never drops below 31". At 611118d, `GetTransportedGoodsIncome` falls linearly to `MIN_TIME_FACTOR` = 31, then decays toward 1 along a scaled 1/(x+1) curve (https://github.com/OpenTTD/OpenTTD/blob/611118d/src/economy.cpp). Card 5's 15% floor is therefore our adaptation, not a recovered constant.
- Step A2 retrofits the new Provenance, Recovered vs adapted and Confidence fields onto cards 1 to 5 **and** onto the built Civ IV and Diplomacy mechanics, pinning their upstream commits.
- Card 3's timing doesn't fit the slice. The counter acts at 3, but the slice has only three storm turns, so "next turn's shift at the floor" lands after play ends. Before prototyping, A2 re-times it so the picket lands inside play: warn at 1, act at 2, and the penalty hits the next shift.
- **Late trigger:** if unrest starts at T2, the counter reaches 2 at T3, and no storm turn is left. The picket then hits the recovery phase: the plant's first recovery shift is at the floor, which counts in the recovery score. It never expires silently.
- **Goldens:** A2 adds one golden scenario for each case: triggered by T2, and triggered at T3.

## Plan

Each step has an owner, a time box and a hard stop. Every time box ends with each question marked answered, held or rejected; nothing carries on automatically.

| Step | Owner | Where | Scope | Time box | Done when |
|---|---|---|---|---|---|
| A. Open-source read | Claude | Cloud | OpenTTD, 0 A.D., Freeciv: 5 cards, nothing built | Done 2026-11-04 | [[rea-2026-11-04-openttd-0ad-freeciv]] |
| A2. Card retrofit | Claude | Here | New card fields on cards 1 to 5 and the Civ IV and Diplomacy mechanics; fix the OpenTTD floor; pin commits | 90 min | Cards updated, nothing built |
| B. Jerry's gate | Jerry | His computer | Godot parity PASS; a 10-minute play of the **unchanged** slice; which games he owns, on which store and OS; whether he has a Windows PC; licence entries (game and tool) for every closed game; approval for any skip | Jerry's pace | His notes set the build order and reorder Q1 to Q8 |
| C1. Frostpunk 2 | Claude, with Jerry at the PC | Windows PC (FrostKit) | Policy and voting tables, then promise, demand, tension and event tables; Q1, Q2, Q5, Q8 | 90 min, hard stop | Cards, plus `rea-YYYY-MM-DD-frostpunk2.md` |
| C2. Anno 1800 | Claude, with Jerry | Windows PC | `assets.xml` from the highest patch, if RDA Explorer is named in the licence entry; Q3 | 60 min, hard stop | Cards, plus repo note |
| C3a. Northgard | Claude, with Jerry | Windows PC (editor) | CastleDB seasons, events and disasters; Q4 | 45 min, hard stop | Cards, plus repo note |
| C3b. Dune: Spice Wars | Claude, with Jerry | Windows PC | Rung 3 storm and Landsraad observation (rung 2 only if the licence entry allows); Q4, Q6 | 60 min, hard stop | Shape cards, plus repo note; odds likely insufficient evidence in one session |
| C4. Rebel Inc | Claude, with Jerry | Mac or PC | Observation; the Scenario Creator only with documented clearance; Q7, Q8 | 60 min, plus about 20 min of play | Cards, plus repo note, or the skip approval and open questions |
| C5. Rung 4, only if needed | Claude, with Jerry | His computer | Pinned REA setup, then one named formula | 30 min setup plus 60 min per formula | One formula in plain math, or held |
| D0. Sim matrix | Claude | Here | Add community `selfish` and `kind` lines to sim.mjs | 60 min | Full best-response table logged |
| D. Build | Claude builds; Jerry approves and accepts | Here | Approved cards only, in the order gate B sets; one new idea per iteration; at most 3 in the slice | Per card: at most 2 build-and-retest cycles (about 3 hours); then hold or reject | Pass criteria 1 to 4 met, or held or rejected with a reason |

The total for C1 to C4 is about 6 hours on Jerry's computer. These are estimates; if a session runs short, the next game waits. Prerequisites:
- **B:** the parity run, playtest notes and licence entries.
- **C:** the computer is on, remote control is approved, he has admin rights, and the game is installed.
- **C1:** FrostKit (about 100 GB) is downloaded first.

## Card backlog

| Card | Source | Question | Decision so far | When |
|---|---|---|---|---|
| 1. Care or control (security cordon) | Freeciv | Q5 | Prototype recommended | After gate B, in the order it sets |
| 3. Unrest ladder with a warning | Freeciv | Q5 | Prototype recommended | A separate iteration from card 1 |
| 2. Trust moves slowly | OpenTTD | Q7 | Prototype after playtest | After step B |
| 4. Allegiance per site | 0 A.D. | Q4 | Hold | Five-parish game |
| 5. Late doses lose value | OpenTTD | Q3 | Hold; the floor is an adaptation | Five-parish game |
| Council vote and legitimacy | Frostpunk 2 | Q1 | Not yet read | After C1 |
| Demand size and broken-promise penalty | Frostpunk 2 | Q2 | Not yet read | After C1; may re-tune boss scorecards |
| Chain ratios and unmet needs | Anno 1800 | Q3 | Not yet read | Five-parish game |
| Storm warning lead time | Northgard, Dune: Spice Wars | Q4 | Not yet read | Slice or five-parish, per playtest |
| Landsraad-style island resolution | Dune: Spice Wars | Q6 | Not yet read | Five-parish game |
| Delayed aid effects | Rebel Inc | Q7 | Not yet read | Compare with card 2 |
| Dilemma cadence and cooldowns | Frostpunk 2, Rebel Inc | Q8 | Not yet read | Feeds the AI Dilemma Director and the Crucible Master's pacing |

## Risks and open questions

| Risk | Effect | Fallback |
|---|---|---|
| A licence or tool's terms ban the route, or are unclear | That game stops at rung 3 | Rung 3 covers the shape, not exact numbers |
| Jerry has no Windows PC | FrostKit, Anno 1800, Dune and the Northgard Editor are out | Frostpunk 2 and Northgard by observation on the Mac; Anno and Dune skipped, with approval and their open questions recorded |
| FrostKit doesn't expose promise or tension numbers | Q2 stays open | Observe play and fit the curve. Decompile the promise penalty only if the licence clears it |
| The REA scoped check or smoke test fails | No rung 4 | Rungs 2 and 3 carry the plan |
| No documented clearance for the Scenario Creator | Q7 and Q8 rest on observation | Observation protocol, or skip with approval |
| Hazard odds need more trials than a session allows | Q4 odds stay open | Hold with the shape only; use Northgard's editor data for the odds |
| Too many cards for a 10-minute slice | Confusing slice | One idea per iteration, 3 in total, task-checked |
| Tuning before the playtest | Wrong lever | Nothing is built before gate B |

Open for Jerry, all in step B:
- Which closed games he owns, on which store.
- Whether he has a Windows PC.
- Licence entries, covering the game and each tool, for Frostpunk 2, Anno 1800 (RDA Explorer), the two Shiro games, and Rebel Inc. For the Scenario Creator, documented clearance (from Ndemic or counsel) is needed before it is opened.
- Whether his Mac meets each game's minimum macOS.
- The parity test and playtest.

## Fact-check, 2026-11-04

Every claim the earlier version marked "check", plus the platforms and the REA tool, checked against live pages.

| # | Claim | Finding | Verdict | Source |
|---|---|---|---|---|
| F1 | Frostpunk 2 has an official mod kit | FrostKit: a free official modding tool, out of beta as 1.0, on Steam Workshop and mod.io | Confirmed | https://store.epicgames.com/p/frostkit ; https://mod.io/g/frostpunk2/r |
| F2 | FrostKit exposes law vote thresholds | Policy assets carry "Required Yes Percentage", a voting-behaviour override and Aye/Hesitant standing thresholds; `PXLaw` types exist | Confirmed for votes; promise and tension tables not yet confirmed | https://mod.io/g/frostpunk2/r/policy-creation-guide |
| F3 | FrostKit runs where the game runs | FrostKit is Windows 10/11 64-bit only, about 100 GB | Corrected: rung 2 needs a Windows PC | https://store.epicgames.com/p/frostkit |
| F4 | Frostpunk 2 platforms | Steam lists Windows 10/11 and macOS. The Mac minimum is an Apple processor (M1), 8 GB RAM, macOS 14.5 and 30 GB | Confirmed; Jerry's M5 Max meets it | https://store.steampowered.com/app/1601580/Frostpunk_2/ |
| F5 | Frostpunk 2 licence | The 11 bit studios user agreement bans tampering with source code; no explicit decompiling clause or mod-tool exception found in the fetch | Unresolved: Jerry reads it in full | https://store.steampowered.com/eula/1601580_eula_0 |
| F6 | Anno 1800 data is in archives with `assets.xml` | `.rda` archives in `maindata`; values in `data/config/export/main/asset/assets.xml`; RDA Explorer (a community tool) opens them; the mod loader is built into the game | Confirmed | https://anno1800.fandom.com/wiki/Modding ; https://github.com/lysannschlegel/RDAExplorer ; https://github.com/jakobharder/anno1800-mod-loader |
| F7 | Anno 1800 units | Units are per field: `CycleTime` in seconds, `FactoryBase` `Amount` in tonnes. The wiki's kilogram claim is dropped, because that page mixes in Anno 2070 material | Corrected: record units per field from Anno 1800 examples | https://github.com/anno-mods/modding-guide/blob/main/hier0nimus-tutorials/03-making-new-production-chain/readme.md |
| F8 | Anno 1800 licence | EULA s.1.2 bans reverse engineering, decompiling and disassembling, except through in-product user-content features | Corrected: rung 4 barred | https://store.steampowered.com/eula/916440_eula_0 |
| F9 | Anno 1800 platform | Windows 10 64-bit only; needs a Ubisoft account | Corrected: Windows PC required | https://store.steampowered.com/app/916440/Anno_1800/ |
| F10 | Dune: Spice Wars mod support | No official editor. Shiro staff earlier said they weren't working on mod support. The 21 Oct 2026 patch added official mod hooks (modified `cdb` file, `/enableCheats`, `/reloadPak`); Shiro doesn't vet community mods | Corrected: rung 3 by default; rung 2 only with a licence entry | https://steamcommunity.com/app/1605220/announcements/ ; https://steamcommunity.com/app/1605220/discussions/0/3271310323764305480/ |
| F11 | Dune: Spice Wars platform | Windows 10/11 only | Corrected: Windows PC required | https://store.steampowered.com/app/1605220/Dune_Spice_Wars/ |
| F12 | Northgard official modding and data format | The official Northgard Editor edits CastleDB data, saving it as `cdb.diff`; scripts in Haxe; map editor and Workshop | Confirmed | https://northgard.net/map-editor/how-to-mod/ ; https://northgard.fandom.com/wiki/Northgard_Editor |
| F13 | Northgard platform | Windows, macOS, Linux; the editor is PC-only | Confirmed, with a caveat | https://store.steampowered.com/app/466560/Northgard/ |
| F14 | Rebel Inc is Mono or IL2CPP | Community tooling targets BepInEx for IL2CPP, which points to an IL2CPP build | Likely IL2CPP (community source) | https://www.unknowncheats.me/forum/unity/444926-rebels-inc-escalation-trainer.html |
| F15 | Rebel Inc platforms and mods | Windows 10 and macOS 12+; Steam Workshop and an official Scenario Creator, on Steam and mobile; the FAQ doesn't list the editable variables | Corrected: rung 2 exists; variables unresolved | https://store.steampowered.com/app/1088790/Rebel_Inc_Escalation/ ; https://www.ndemiccreations.com/en/58-rebel-inc-scenario-creator-help-and-faq |
| F16 | REA can't read names in IL2CPP | REA decodes IL2CPP metadata statically (versions 24, 27, 29, 31, 39) and .NET assemblies | Corrected | https://github.com/morluto/rea ; https://github.com/morluto/rea/blob/main/docs/il2cpp-metadata.md |
| F17 | REA is morluto/rea with Ghidra | REA ("Reverse Engineer Anything"): MIT licence, npm `rea-agents`; providers include Ghidra, Hopper, IDA, Rizin | Confirmed | https://github.com/morluto/rea |
| F18 | `rea doctor` checks readiness | `rea doctor --provider ghidra --json` and `rea providers --json`; verified with Ghidra 12.1.4 and JDK 21 (Ghidra 12.2 needs JDK 25+); Node 22.23.4+ or 24.22.1+; global CLI via `npm install --global rea-agents` | Confirmed; pin `rea-agents@6.8.0` and use the scoped check; `inspect` is a documented command | https://github.com/morluto/rea/blob/main/docs/installation.md ; https://github.com/morluto/rea/blob/main/docs/cli.md ; https://www.npmjs.com/package/rea-agents |
| F19 | Tool terms beyond the game EULA | The Rebel Inc Scenario Creator terms ban commercial use and reverse engineering | New: a licence entry is needed per tool | https://www.ndemiccreations.com/en/59-legal-information-for-rebel-inc-scenario-creator |

## Audit history

- Self-audit (v1): 90/100. It was not independent.
- Claudex Loop: Codex (gpt-6-astra, max reasoning effort) scored each version against the 8-criterion rubric of [[audit-2026-11-03-rea-plan]]. v1: 60/100. v2: 75/100. v3: 86/100. v4: 93/100. v5 (this version): see the commit log.
