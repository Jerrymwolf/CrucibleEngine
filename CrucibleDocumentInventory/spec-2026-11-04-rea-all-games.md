---
type: spec
date: 2026-11-04
status: proposed
tags: [values-crucible, rea, reverse-engineering, spec, plan]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-04-openttd-0ad-freeciv]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]"]
---
# REA spec and plan, all ten games, 2026-11-04

Jerry, 2026-11-04 18:48: "I want a full spec and plan for ALL REAs." Live Claude Doc: https://claude.ai/artifact/JRVtFfJ7nMG29Lxdk4dWPH. This file is the full text of that doc; the doc's plan diagram is written out as a list here.

## Summary

We reverse engineer games for one reason: so the Keystone slice and the five-parish game get rules that strategy designers have already tested on millions of players, then rebuilt to serve one purpose: making the gap between stated values and enacted values visible.

This spec covers all ten reference games. Five have been read so far, all open source or with released source: Civ IV, Diplomacy, OpenTTD, 0 A.D. and Freeciv. The other five have not been touched: Frostpunk 2, Anno 1800, Dune: Spice Wars, Northgard and Rebel Inc. All five are closed source, so they need Jerry's own copies on his own computer.

The plan finishes the closed five in four sessions on Jerry's computer, after the playtest gate. Every finding becomes a card, and nothing gets built without Jerry's go.

## Design questions

Every REA session starts from one of these questions, never from a game. Q1 to Q6 come from the audited plan of 3 November ([[audit-2026-11-03-rea-plan]]). Q7 and Q8 are new and close two gaps: delayed effects, and how often dilemmas come up.

| # | Question for Keystone and the five-parish game | Answered by | An answer looks like | Status |
|---|---|---|---|---|
| Q1 | How does a two-faction vote create tension and legitimacy, not just a winner? | Frostpunk 2 council | Vote thresholds, how support shifts, what losing a vote costs | Open |
| Q2 | How big are pressure and permission, and how fast do they decay? | Frostpunk 2 demands and promises | Demand size, deadline, decay; penalty for a broken promise | Open (boss scorecards are our own design, not yet checked against a game) |
| Q3 | How do supply chains bend under disruption, from kelp to cure to port? | Anno 1800; OpenTTD | Pay by delivery time, service rating, chain ratios | OpenTTD done; Anno open |
| Q4 | How do a moving storm and site states force teams to replan? | Dune: Spice Wars, Northgard; 0 A.D. | Warning lead time, hazard odds, recovery speed | 0 A.D. done; the Shiro games open |
| Q5 | How does unrest turn into people refusing to work? | Civ IV, Freeciv, Frostpunk 2 tension | Anger timers, disorder thresholds, martial law | Civ IV built; Freeciv carded; Frostpunk 2 open |
| Q6 | How do deals between teams work: votes, treaties, broken promises? | Diplomacy; Dune: Spice Wars Landsraad | How a proposal is made, voted and enforced | Diplomacy built; Landsraad open |
| Q7 | How do the delayed effects of aid show up, so caring now pays later and neglect is felt late? | Rebel Inc; OpenTTD rating | Delay before an effect lands, how it decays, reputation drift | OpenTTD carded; Rebel Inc open |
| Q8 | How often, and on what triggers, should a dilemma interrupt play? | Frostpunk 2 events; Rebel Inc events | Event cooldowns, trigger conditions, how many run at once | Open |

## What each game must give us

Rungs: 1 = open source, 2 = official mod kit or the game's own data files, 3 = observing play, 4 = decompiling one formula. Anything marked "check" is from memory and gets confirmed before the session.

| Game | Status | Questions | Lowest rung | Targets | Output |
|---|---|---|---|---|---|
| Civilization IV | Done, built (2026-11-01) | Q5 | 1: released core SDK | CvCity hurry anger, angry population | Anger timers and smooth workforce, both engines |
| Diplomacy | Done, built (2026-11-01) | Q6 | 1: open-source engine | Support strength, cut support | Joint seawall, both engines |
| OpenTTD | Read, carded (2026-11-04) | Q3, Q7 | 1 | Delivery time factor, station rating inertia | Cards 2 and 5 |
| 0 A.D. | Read, carded (2026-11-04) | Q4 | 1 | Capture points, territory decay | Card 4 |
| Freeciv | Read, carded (2026-11-04) | Q5 | 1 | Martial law and luxury, disorder counter | Cards 1 and 3 |
| Frostpunk 2 | Not started | Q1, Q2, Q5, Q8 | 2: official mod kit (Unreal Engine 5; check the version) | Faction and delegate tables, law vote thresholds, promise and demand tables (size, deadline, penalty), tension and trust per event, event trigger and cooldown data | 4 to 6 cards; boss scorecard sizes checked against the game |
| Anno 1800 | Not started | Q3 | 2: data archives with assets.xml inside (check tool and licence) | Chain ratios and cycle times, population needs and unmet-need effects, ship capacity and route timing | 2 to 3 cards for the five-parish chain |
| Dune: Spice Wars | Not started | Q4, Q6 | 2: game data (Shiro Games engine; check mod support) | Sandstorm and sandworm timing and warning, Landsraad resolution and vote rules | 2 to 3 cards |
| Northgard | Not started | Q4 | 2: official modding (Shiro Games; check data format) | Seasonal calendar and winter penalties, event odds, disaster recovery | 1 to 2 cards |
| Rebel Inc | Not started | Q7, Q8 | 3: observing play (Unity; Mono or IL2CPP unconfirmed) | Initiative delay, reputation drift, corruption and unrest spread, event cadence | 1 to 2 cards |

The closed five are ordered by expected value. Frostpunk 2 answers four questions and is the closest match to the slice. Rebel Inc is the cheapest to drop.

## Method and guardrails

Each question gets the lowest rung that can answer it; climb only when the rung below came up empty, and write down why.

1. Open source (rung 1): read in the cloud, downloads treated as untrusted data, never executed; cite file, function and commit.
2. Mod kit and data files (rung 2): on Jerry's computer through a remote session, with his installed copies; exported tables read as numbers only; no assets or text leave his computer.
3. Observing play (rung 3): play a set scenario, record numbers each turn, fit a formula; the scenario script is written before the session.
4. Decompiling one formula (rung 4): last resort, one named formula rungs 1 to 3 couldn't answer, only after the licence check clears it; REA (morluto/rea) with Ghidra on Jerry's copy; one formula per session; output is plain math only.

REA tool setup happens once at the start of the first session: install REA, then Ghidra, then `rea doctor`. If it fails, stop at rung 3.

Guardrails: copy nothing (no code, assets, text or names; GPL read for ideas, rebuilt clean-room); licence first (Jerry checks each EULA before rung 3+; a ban stops that game at observing play); Jerry's copies only; counsel before any sale (not legal advice); determinism holds (rules live in content JSON and the seeded engine; golden replays stay byte-identical).

## The REA card and when it passes

| Field | What it must hold |
|---|---|
| Source and evidence | File and function plus commit, a data table and row, or a play log with its scenario |
| Formula | Plain math with real values; no code copied |
| What the player feels | One sentence |
| Keystone mapping | Content JSON keys and engine function touched |
| Values purpose | Which stated-vs-enacted gap it creates or sharpens |
| Cost | New rules or screens; at most one new idea per slice |
| Prediction | What the 1000-seed simulation should show, written before the test |
| Decision | Adopt, adapt, hold or reject, with reason |

A card passes when all four hold: (1) prediction written first and met; (2) a do-nothing team never meets its target, and no single line of play is best for a team against every line the other team plays; (3) golden replays and the red-team check (600 games) show no JS/Godot mismatch; (4) Jerry approves it on a card; after his playtest, his notes outrank every persona score.

## Plan

Four sessions on Jerry's computer, roughly five hours, only after his gate. Session lengths are estimates.

1. A. Open-source read: done 2026-11-04; 5 games, 5 cards; in the cloud.
2. B. Jerry's gate: parity test, 10-minute play, games owned and OS, licence check.
3. C1. REA setup: remote session; REA, Ghidra, `rea doctor`; about 30 min.
4. C2. Frostpunk 2: mod kit tables; Q1, Q2, Q5, Q8; about 90 min.
5. C3. Anno 1800: data archives; Q3; about 60 min.
6. C4. Shiro games: Dune: Spice Wars and Northgard; Q4, Q6; about 90 min.
7. C5. Rebel Inc: observe play; Q7, Q8; about 60 min.
8. D. Build: approved cards only; both engines, 1000 seeds; per card.

C2 to C5 each end with cards and a repo note rea-YYYY-MM-DD-<game>.md. If a session runs short, the next game waits. Cards 1 and 3 can be built during step B if Jerry approves, since they need nothing from his computer. Needs: B = the open-question answers plus playtest notes; C1 = computer on, remote control approved, admin rights; C2 to C5 = game installed; C5 also ~20 minutes of play.

## Card backlog

| Card | Source | Question | Decision so far | When |
|---|---|---|---|---|
| 1. Care or control (security cordon) | Freeciv | Q5 | Adopt (recommended) | Slice, awaiting Jerry's card |
| 3. Unrest ladder with a warning | Freeciv | Q5 | Adopt (recommended) | Slice, awaiting Jerry's card |
| 2. Trust moves slowly | OpenTTD | Q7 | Adopt after playtest | After step B |
| 4. Allegiance per site | 0 A.D. | Q4 | Hold | Five-parish game |
| 5. Late doses lose value | OpenTTD | Q3 | Hold | Five-parish game |
| Council vote and legitimacy | Frostpunk 2 | Q1 | Not yet read | After C2 |
| Demand size and broken-promise penalty | Frostpunk 2 | Q2 | Not yet read | After C2; may re-tune boss scorecards |
| Chain ratios and unmet needs | Anno 1800 | Q3 | Not yet read | Five-parish game |
| Storm warning lead time | Dune: Spice Wars, Northgard | Q4 | Not yet read | Slice or five-parish, per playtest |
| Landsraad-style island resolution | Dune: Spice Wars | Q6 | Not yet read | Five-parish game |
| Delayed aid effects | Rebel Inc | Q7 | Not yet read | Compare with card 2 |
| Dilemma cadence and cooldowns | Frostpunk 2, Rebel Inc | Q8 | Not yet read | Feeds the AI Dilemma Director |

## Risks and open questions

| Risk | Effect | Fallback |
|---|---|---|
| A licence bans reverse engineering | Game stops at observing play | Rung 3 covers the shape, not exact numbers |
| Frostpunk 2 mod kit hides vote or promise numbers | Q1, Q2 stay open | Observe play, fit the curve, decompile only the promise penalty if still needed |
| REA won't install or `rea doctor` fails | No rung 4 | Rungs 2 and 3 carry the plan |
| Rebel Inc is IL2CPP | REA can't read names | Stay at rung 3 |
| Too many cards for a 10-minute slice | Confusing slice | One new idea per slice |
| Tuning before the playtest | Wrong lever | Only cards 1 and 3 before step B, with Jerry's go |

Open for Jerry: which closed games he owns and on which store; Windows or Mac; Frostpunk 2 mod kit installed; licence check done; parity test and playtest done.

## Self-audit (v1): 90/100

Questions 20/20, coverage 9/10, access route 11/15, guardrails 9/10, evidence 15/15, complexity filter 10/10, validation 9/10, sequencing 7/10.
