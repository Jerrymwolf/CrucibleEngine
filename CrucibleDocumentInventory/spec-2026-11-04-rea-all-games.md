---
type: spec
date: 2026-11-04
status: proposed
version: v4
tags: [values-crucible, rea, reverse-engineering, spec, plan]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-04-openttd-0ad-freeciv]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]"]
---
# REA spec and plan, all games, 2026-11-04 (v4)

Jerry, 2026-11-04 18:48: "I want a full spec and plan for ALL REAs." The canonical spec is the live Claude Doc: https://claude.ai/artifact/JRVtFfJ7nMG29Lxdk4dWPH. This file is a snapshot of doc v4 (rev 103). The Codex-revised v5 of this file (Claudex Loop, scored 96 at 506fecc; four residual fixes at 534edf8, re-scored by Claude at 83.5) stays in git history; its strengths were merged into v4.

## Summary

We reverse engineer games for one reason: so the Keystone slice and the five-parish game get rules that strategy designers have already tested on millions of players, then rebuilt to serve one purpose: making the gap between stated values and enacted values visible.

This spec covers eleven games: six already read and five still to do. It also gives an in-or-out line for every other reference the records name. The six already read are all open source or have released source: Micropolis (read with REA on 18 October), Civ IV, Diplomacy, OpenTTD, 0 A.D. and Freeciv. The five still to do are closed source: Frostpunk 2, Rebel Inc, Northgard, Dune: Spice Wars and Anno 1800.

Public documents read here in the cloud answer as much as they can first. After your playtest gate, three sessions on your computer cover what's left, in order of question rank, not game. Anno 1800 waits for the five-parish game. Decompiling (rung 4) is possible on your computer only where a licence allows it, and nothing in the plan depends on it. Every finding becomes a card, and nothing gets built without your go.

## Design questions

Every reverse engineering (REA) session starts from one of these questions, never from a game. Q1 to Q6 come from the audited plan of 3 November. Q7 and Q8 are new and close two gaps: delayed effects, and how often dilemmas come up.

| Rank | # | Question | Needed for | Answered by | An answer looks like | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Q1 | How does a two-faction vote create tension and legitimacy, not just a winner? | Slice | Frostpunk 2 council | Vote thresholds, how support shifts, what losing a vote costs | Open |
| 2 | Q2 | How big are pressure and permission, and how fast do they decay? | Slice | Frostpunk 2 demands and promises; Against the Storm's Queen's Impatience | Demand size, deadline, decay; penalty for a broken promise | Open (boss scorecards are our own design, not yet checked against a game) |
| 3 | Q8 | How often, and on what triggers, should a dilemma interrupt play? | Slice | Frostpunk 2 events; Rebel Inc; Paradox event scripts; Left 4 Dead AI Director | Event cooldowns, trigger conditions, how many run at once | Open |
| 4 | Q7 | How do the delayed effects of aid show up, so caring now pays later and neglect is felt late? | Slice | Rebel Inc; OpenTTD rating; Democracy 4 | Delay before an effect lands, how it decays, reputation drift | Partly answered: OpenTTD gives inertia, not delay (card 2); Rebel Inc open |
| 5 | Q4 | How do a moving storm and site states force teams to replan? | Slice and five-parish | Northgard, Dune: Spice Wars; 0 A.D.; Micropolis | Warning lead time, hazard odds, recovery speed | Partly answered: 0 A.D. gives site allegiance, not storm warning (card 4); the Shiro games open |
| 6 | Q6 | How do deals between teams work: votes, treaties, broken promises? | Five-parish | Diplomacy; Dune: Spice Wars Landsraad | How a proposal is made, voted and enforced | Diplomacy in the slice (two teams); Landsraad open |
| 7 | Q3 | How do supply chains bend under disruption, from kelp to cure to port? | Five-parish | Anno 1800; OpenTTD; Micropolis | Pay by delivery time, service rating, chain ratios | OpenTTD carded; Anno open |
| Closes at B | Q5 | How does unrest turn into people refusing to work? | Slice | Civ IV, Freeciv | Anger timers, disorder thresholds, martial law | Closes at B if the Civ IV build passes parity; Freeciv carded |

A question closes, for the game it's needed for, when one of its cards is built (see the build gate), and sessions spend no time on a closed question. Q5 closes when the Civ IV anger build passes the parity test at step B and you confirm it there. Frostpunk 2's tension numbers are read only if a Q1 or Q2 card needs them. Q6 stays open: Diplomacy's joint seawall serves two teams in the slice, and the five-parish game needs deals among more teams. Q7 stays open after card 2 is built: OpenTTD's rating moves slowly but never delays an effect, so S2 still reads Rebel Inc's delays. The ranks above are mine, set before your playtest. After it, you re-rank Q1 to Q8 on a decision card, and only sessions with a ranked, open question run.

## What each game must give us

Each game has a job, a lowest access rung, named targets, and a licence line. The rungs are: 0 = published documents, 1 = open source, 2 = official mod tools or the game's own data files, 3 = observing play, 4 = decompiling one formula. Engines, platforms and tools were checked against live pages on 4 November; the sources are at the end.

| Game | Status | Questions | Lowest rung | Targets | Licence (clause, date checked) | Output |
| --- | --- | --- | --- | --- | --- | --- |
| Micropolis | Done, brief (2026-10-18) | Q3, Q4 cascades | 1 (GPL; read with REA) | Cascade rules | GPL: ideas only | crucible/docs/rea-micropolis-brief.md |
| Civilization IV | Done in both engines (2026-11-01); parity first runs at B | Q5, plus worked tiles and yields (your 26 October pick). Wonders as public goals (subsystems row 12) wait for that row, which is marked Later | 1: released core SDK | CvCity hurry anger; CvCity worked plots and base yields, to check teardown 8b | SDK released for modding: ideas only | Anger timers built; yield check, and a card only if 8b disagrees |
| Diplomacy | Done in both engines (2026-11-01); parity first runs at B | Q6 | 1: open-source engine | Support strength, cut support | Open source: ideas only | Joint seawall, both engines |
| OpenTTD | Read, carded (2026-11-04) | Q3, Q7 | 1 | Delivery time factor, station rating inertia | GPL: ideas only | Cards 2 and 5 |
| 0 A.D. | Read, carded (2026-11-04) | Q4 | 1 | Capture points, territory decay | GPL: ideas only | Card 4 |
| Freeciv | Read, carded (2026-11-04) | Q5 | 1 | Martial law and luxury, disorder counter | GPL: ideas only | Card 1+3 (one idea) |
| Frostpunk 2 | Not started | Q1, Q2, Q8 | 0, then 2: FrostKit 1.0, the official mod kit (Unreal Engine 5; Epic Games Store; Windows 10 or 11 only; 100 GB). Its policy data holds each law's Required Yes Percentage and how delegates vote. The game itself also runs on Mac (macOS 14.5, M1) | Law vote thresholds, delegate voting behaviour, promise and demand data (size, deadline, penalty), event triggers and cooldowns | 11 bit's user agreement (checked 4 November) bars use "in other purpose than private, in particular for commercial purposes", and any "attempt to gain access or modify source code". Before S1, you record whether reading FrostKit's policy data for design research is private use (counsel decides if it's unclear), and you check FrostKit's own terms. Treat rung 4 as barred unless counsel reads clause 4 otherwise | 3 to 5 cards; boss scorecard sizes checked against the game |
| Rebel Inc: Escalation | Not started | Q7, Q8 | 0, then 2: the official Scenario Creator (Unity, IL2CPP build; Windows and Mac). The wiki already documents defaults, which S2 checks in the game: 80 turns of Lack of Stability before reputation falls; insurgency from turn 115 | Initiative delays, reputation drift, corruption's monthly hit to reputation, event cadence | Ndemic's Scenario Creator terms (checked 4 November): "You are not allowed to make commercial use of Scenarios or the Scenario Creator", and no reverse engineering or disassembling. The Scenario Creator is opened only with documented clearance for this research: Ndemic's written permission or counsel's written opinion. Until then, Rebel Inc stays at rungs 0 and 3, and rung 4 is barred | 1 to 2 cards |
| Northgard | Not started | Q4 | 0, then 2: the official Northgard Editor (NGEditor/Editor.exe in the install folder; Windows only), whose Database view shows the game data that cdb.diff mods change; also the in-game Map Editor, script.hx in Haxe, and Steam Workshop. The game itself runs on Windows, Mac and Linux | Seasonal calendar and winter penalties, event odds, disaster recovery | Shiro terms: you check | 1 to 2 cards |
| Dune: Spice Wars | Not started | Q4, Q6 | 0: public wikis and patch notes. The 21 October 2026 patch (v2.2.8.33019) added modding hooks, but there is no official mod kit yet; Shiro's Haxe/Heaps engine (HashLink); Windows only | Sandstorm and sandworm timing and warning, Landsraad resolution rules | Rung 0 only in this plan. Rung 2 (its own data files) would need your check of the Funcom and Shiro terms and its own session. Rung 4 is unlikely: REA lists no HashLink support | 1 to 2 cards |
| Anno 1800 | Not started (five-parish game) | Q3 | 0, then 3: public guides and wikis, then values the game itself shows, such as each building's production time (Windows only). The in-game mod system shows no base values; they sit in assets.xml inside the .rda archives, which open only with community tools | Chain ratios and cycle times, unmet needs, ship capacity and route timing | Ubisoft EULA §1.2 (last updated 01/2023): no reverse engineering, decompiling or derivative works, except content made through game features. So we use public guides and observed play only, and never unpack or decompile its files | 2 to 3 cards for the five-parish chain |

**Also named in the records.** Every other reference gets an in or out line, so none is quietly dropped.

| Reference (where named) | Question | In or out |
| --- | --- | --- |
| Paradox event scripts (18 October record, the dilemma format anchor) | Q8 | In: the official modding wiki's event documentation, read in the cloud (rung 0); the event files themselves only from your own copy, if you own a Paradox game |
| Left 4 Dead AI Director (subsystems row 10) | Q8 pacing | In: published design talks only |
| Against the Storm, Queen's Impatience (26 October research) | Q2 | In: public wiki only |
| Democracy 4 (18 October record) | Q7 | In only if Q7 is still open after S2 and you own it: its plaintext policy data at rung 2, after the licence check, about 15 minutes added to the next session |
| Hearts of Iron IV (26 October research) | Q4 | Out for the slice; five-parish weather only |
| Civilization V and VI | Q3, Q5 | Out: Civ IV already covers worked tiles at rung 1, and Civ VI never released its core source, per player reports |
| This Is the Police, Frostpunk 1, Emergency, Company of Heroes 2, Tropico, Age of Empires II, StarCraft II, Open RTS (MIT; camera and selection already borrowed), Widelands (architecture reference for authoritative state and replay), Into the Breach, Jackbox | Theme, units, UX | Out: design references, no numbers needed |

## Method and guardrails

Each question gets the lowest access rung that can answer it. We climb a rung only when the one below has come up empty, and we write down why.

1. **Published documents (rung 0).** Official modding guides, patch notes and community wikis, which I read here in the cloud before any session. Examples: the Frostpunk 2 policy creation guide on mod.io, Northgard's "How to mod" page, and the Rebel Inc wiki's Scenario Creator page. A session on your computer only checks what these can't settle.
2. **Open source (rung 1).** I read the code here in the cloud. Downloads are treated as untrusted data and never executed, and every finding cites the file, function and commit.
3. **Official mod tools and data files (rung 2).** These run on your computer through a remote session, using your own installed copies. Exported tables are read as numbers only, and no assets or text leave your computer.
4. **Observing play (rung 3).** Before the session I write one fixed scenario per question: difficulty, map, start state and the exact choices. For a fixed rule we log at least 3 values (5 for a delay or decay curve), and a formula is accepted only if it predicts a held-out run to within 10%. For a chance event we use fresh seeded runs over a fixed window, report the rate with a Wilson 95% interval, and keep windows that end early (censored) in the count. The evidence is insufficient if the interval is wider than ±15 points or fewer than 5 events are seen; then the card records the shape, not the numbers.
5. **Decompiling one formula (rung 4).** This is a last resort and never planned ahead. It needs a passed card that names one formula rungs 0 to 3 couldn't answer, and a licence check that allows it.

**The REA tool (morluto/rea) is set up only when rung 4 is actually needed.**

- **Version.** We pin `rea-agents@6.8.0`, the current npm release (25 October 2026).
- **What it needs.** Ghidra 12.1.x with a 64-bit full JDK 21 or newer; it is verified with Ghidra 12.1.4 and JDK 21. Node.js 22.23.4 or later on the 22 line, 24.22.1 or later on the 24 line, or 26.12.1 or later. Your Mac has 22.20.0.
- **Where it runs.** Ghidra runs on Linux, or on a Mac with an Intel or Apple chip; on an Apple chip its native decompiler may need building first. On Windows x64 the route is experimental and read-only, but it takes native programs and DLLs.
- **Checks before use.** We run `rea doctor --provider ghidra --json` and `rea providers --json`, which are read-only, then one smoke test on the target: `rea inspect <target> --provider ghidra --json`. We stop if any of them fails. A plain `rea doctor` checks every integration, so it can fail on tools we don't use.

So rung 4 is possible on your computer where a licence allows it, and nothing in this plan depends on it.

**Guardrails, all binding:**

- **Copy nothing.** No code, assets, text or names leave a game. GPL code is read for ideas and rebuilt clean-room.
- **Licence first.** You check a game's licence and any mod-kit terms before we do anything beyond reading public documents and open-source code. The session note records the game's licence and each tool's terms separately, each with its clause, link and date. If either is unclear, we stop at rung 3.
  - Official tools (FrostKit, the Northgard Editor, Rebel Inc's Scenario Creator) are used only as their terms allow.
  - Unpacking game files with a community tool needs a check first. The tool must come from its own repository, at a pinned version.
  - Decompiling always needs a check.
  - Watching play needs none.
- **Known now.** Ubisoft's licence for Anno 1800 bans reverse engineering, so Anno stays at public guides and observed play, and its files are never unpacked or decompiled. REA is MIT-licensed; its disclaimer says it is for "software you own or are authorized to examine", and it grants no licence for Hopper, IDA or JEB.
- **Your copies only.** Nothing comes from piracy or asset-rip sites.
- **Counsel before sale.** If the app is ever sold, we get a short intellectual-property review first. This spec is not legal advice.
- **Determinism holds.** Every rule we build lives in content JSON and the seeded engine, and the same seed always gives a byte-identical replay. A card that changes the rules changes golden.json only through a reviewed regeneration.

## The REA card and when it passes

Every finding goes on a card. If a card has an empty field, it isn't built.

| Field | What it must hold |
| --- | --- |
| Source and evidence | Open source: file, function and commit. Closed game: game version and build, store, platform and mod-kit version; the asset path or table and row; and a SHA-256 of the file read (only the hash leaves your computer). Play log: scenario script, difficulty, number of runs and the held-out run's error. Published document (rung 0): URL, date read, page revision and the exact line quoted. A number from a community wiki also needs a second source, or a check in the game, before a card uses it |
| Rung and licence | Rung used, why the rung below didn't answer, and the licence line |
| Formula | Plain math with real values and units, converted to Keystone turns; a formula that can't be translated is rejected. No code copied. Recovered or adapted: whether the numbers are the game's own or our adaptation, and which. Confidence: high (source or data file), medium (held-out play within 10%), or low (shape only) |
| What the player feels | One sentence |
| Keystone mapping | Content JSON keys and the engine function it touches |
| Values purpose | Which gap between stated and enacted values it creates or sharpens |
| Cost | Passes only if the facilitator can explain it in one sentence an executive can repeat back, it adds at most one number to the planning screen and no new screen, and the slice still fits in 10 minutes. The slice takes at most three card-added ideas, and each must be used correctly in the playtest without prompting. Cards that only work together count as one idea only if together they add one decision and one number |
| Prediction | A metric, today's value and a pass range, written before the test. Example: generous Meridian makes its target in 49.4% of games against the careful community now, and 52 to 58% after |
| Decision | Adopt, adapt, hold or reject, with the reason |

Each card is tried first in the JavaScript engine on a branch. It passes there when rules 1 to 3 hold; then you approve or reject it (rule 5). Rule 4 is the build check: it runs after an approved card is ported to Godot, and the card counts as built only when it prints PASS.

1. The 1000-seed run lands inside the prediction's pass range, and the run reports how often the new mechanic fires. At least one bot line must use it; a mechanic that never fires fails.
2. A team that does nothing makes its target in under 10% of seeds, against every line the other team plays. That's the 2 November rule; today's worst case is 7.9%. The card raises no do-nothing rate by more than 2 points, and the second community line must also keep every do-nothing rate under 10%.
3. No new or wider dominance. A line is dominant when it is best for its team against every active line of the other team. The card makes no line dominant that wasn't dominant before. Where a line already dominates, its lead over its team's next-best line grows by at most 2 points against any line of the other team. If a dominant line is the intended temptation (for example, Meridian's selfish lean), the card says so and you decide. Lines are the named bot policies in `crucible/slice/sim.mjs`, and doing nothing is not a line. Each team needs at least two active lines. The community has only one today, so a second line (for example, "sandbag first") is added, and this baseline grid is measured, before any card is tried.
4. Godot parity: `tests/run_tests.gd` first regenerates golden.json byte-identically from the current rules, then, with the card in, a reviewed, regenerated golden.json plus at least one new golden game prints PASS on all of them (seeds 42, 7, 4217 and the new seeds). Godot can't run in this cloud environment, so this runs on your computer, or in a CI job with headless Godot if you approve one.
5. You approve it on a card. After your playtest, your notes outrank every persona score.

## Plan

Your gate plus three sessions on your computer comes to about 4 hours: 45 + 90 + 45 + 60 minutes. A rung 3 fallback is extra: one session of about 90 minutes per question, booked only when a lower rung comes up empty. Anno 1800 waits for the five-parish game. The sessions follow the question rank, not the game, and the session lengths are my estimates.

Plan diagram (in the doc): A Read in the cloud (done) → B Your gate → S1 Frostpunk 2 → S2 Rebel Inc → S3 Northgard → D Build, rolling → S4 Anno 1800 (five-parish). Rung 4 (REA) is a standalone, as-needed step.

**B, your gate (about 45 minutes):** I run the Godot parity test on your computer, and it must print PASS. Then you play the slice for 10 minutes and answer the open questions below, except the licence question, which is answered before each session. If parity fails, we fix that first. If the playtest is a no-go, the sessions wait and we re-rank Q1 to Q8 from your notes. Each session ends with cards and a repo note named `rea-YYYY-MM-DD-<game>.md`. If a session runs short, the next game waits. While you do B, I add the second community line, measure the baseline grid and re-time card 3, then try card 1+3 in the JavaScript engine. If you approve it, its Godot port goes through the parity test at the start of S1.

**Your computer is an Apple-silicon Mac (chosen 4 November), so this is the plan:** FrostKit and the Northgard Editor are Windows only, so S1 and S3 become rung 0 plus observed play under the rung 3 protocol, one question per session of about 90 minutes. On an Intel Mac, Frostpunk 2 doesn't run, so S1 stays at rung 0. S2 is unchanged: the Scenario Creator runs on Mac, once it's cleared. S4 uses public guides only. You also chose (4 November) to study Mac and iOS versions, for observed play only (rung 3): iOS apps are encrypted and their store terms bar decompiling. Checked 4 November: Northgard is on the App Store (Playdigious port), so S3's observed play can use an iPad; Rebel Inc. began on iOS (December 2018), and its mobile version can be watched alongside Escalation on the Mac; Frostpunk 2 runs natively on the Mac. Dune: Spice Wars and Anno 1800 have no Mac or iOS version (Dune runs only through CrossOver or Parallels, which we don't rely on), so they stay at rung 0. That makes up to about 7.5 hours on an Apple-silicon Mac and about 3 on an Intel Mac.

What each session needs from you:

- **Before any session:** Claude signed in on that computer, connected for Remote Control, with admin rights. Before B, also Godot 4.3 or newer (the standard build, not .NET) and a copy of this repo; I run the parity test over Remote Control, `godot --headless --script res://tests/run_tests.gd` from crucible/godot/keystone_slice. Before each session, you read that game's licence (FrostKit's terms before S1), and I record the clause, link and date in the games table.
- **Before S1:** FrostKit installed from the Epic Games Store. It's free, but it's Windows 10 or 11 only and 100 GB, so start the download a day ahead. Update Frostpunk 2 first.
- **S2 and S3:** the game installed and opened once.
- **S2:** the Scenario Creator is opened only with the clearance recorded in the games table. If it isn't cleared, or doesn't show a value we need, you play a second session of about 90 minutes, booked only then. It follows the rung 3 protocol: five runs of one short fixed scenario.

## Card backlog

There are five cards so far, all from source code. Cards 1 and 3 merge into one idea, since the slice takes one new idea at a time. The closed games should add roughly 8 to 14 more cards. The "When" column is my recommendation; you decide each card on a decision card. Card 3 can't fire as written: trust starts at 60 and, with a careful community, never falls below 55 after the first turn, so its "below 40 for 3 turns" trigger fired in 0 of 5000 simulated games. Before card 1+3 is tried, card 3 is re-timed to act on a fall in trust (for example, 10 points across two turns) or its penalty lands in recovery, and its prediction is rewritten first.

| Card | Source | Question | Decision so far | When |
| --- | --- | --- | --- | --- |
| 1+3. Care or control, with its unrest warning (one idea: one decision, one number) | Freeciv | Q5 | Adopt as one idea once card 3 is re-timed (recommended) | Slice, awaiting your card |
| 2. Trust moves slowly | OpenTTD | Q7 | Adopt after playtest | After step B |
| 4. Allegiance per site | 0 A.D. | Q4 | Hold | Five-parish game |
| 5. Late doses lose value | OpenTTD | Q3 | Hold | Five-parish game |
| Second community bot line ("sandbag first") | Our own; needed by pass rule 3 | All | Required before any card is tested | First, before any card |
| Council vote and legitimacy | Frostpunk 2 | Q1 | Not yet read | After S1 |
| Demand size and broken-promise penalty | Frostpunk 2; Against the Storm | Q2 | Not yet read | After S1; may re-tune the boss scorecards |
| Dilemma cadence and cooldowns | Frostpunk 2, Rebel Inc, Paradox | Q8 | Not yet read | After S1 and S2; feeds the AI Dilemma Director |
| Delayed aid effects | Rebel Inc; Democracy 4 | Q7 | Not yet read | After S2; compare with card 2 |
| Storm warning lead time | Northgard, Dune: Spice Wars | Q4 | Not yet read | Slice or five-parish, depending on your playtest |
| Landsraad-style island resolution | Dune: Spice Wars | Q6 | Not yet read | Five-parish game |
| Chain ratios and unmet needs | Anno 1800 | Q3 | Not yet read | Five-parish game |

Build gate: "built" means the card has passed in the JavaScript engine and you've approved it, it's ported to Godot with a reviewed, regenerated golden.json and new golden seeds, within at most two build-and-retest cycles (about 3 hours), the parity test prints PASS, and the build log has an entry.

## Risks and open questions

| Risk | Effect | Fallback |
| --- | --- | --- |
| A licence bans reverse engineering (already true for Anno 1800) | That game stays at rungs 0, 2 (official tools) and 3 | Rungs 0 and 3 give the shape of an answer, without the exact numbers |
| FrostKit doesn't expose the promise or demand numbers | Q2 stays partly open | Observe play using the rung 3 protocol, in its own session of about 90 minutes; the vote thresholds are already confirmed in its policy data |
| Your computer is a Mac | No FrostKit, Northgard Editor, Anno 1800 or Dune: Spice Wars; on an Intel Mac, no Frostpunk 2 either | Follow the Mac branch in the plan |
| The Scenario Creator doesn't show a delay we need | Q7 keeps its shape but loses the number | Observe play with a set script, in its own session of about 90 minutes. Rung 4 isn't available: Ndemic's terms forbid reverse engineering or disassembling "in relation to, Rebel Inc. Scenarios or the Scenario Creator" |
| REA's scoped check or its smoke test fails on your computer | No rung 4 | Nothing depends on rung 4 |
| Too many cards for executives in a 10-minute slice | The slice gets confusing | The cost rule: one decision and one number per idea, at most three ideas in the slice, each used correctly without prompting in the playtest |
| Tuning before your playtest | Effort spent on the wrong lever | Only card 1+3 is tried during step B, in JavaScript, after the second community line and the baseline grid. It is built only with your go |

Only you can answer these:

- [ ] Answered 4 November: the M5 Max MacBook Pro only, no Windows PC, so the Mac branch of the plan applies. On an Apple-silicon Mac you can run Frostpunk 2, Northgard and Rebel Inc (with its Scenario Creator), but not FrostKit, the Northgard Editor, Anno 1800 or Dune: Spice Wars. On an Intel Mac, Frostpunk 2 doesn't run either.
- [ ] Which of Frostpunk 2, Rebel Inc, Northgard, Dune: Spice Wars, Anno 1800, Democracy 4 and any Paradox game (Crusader Kings III, Stellaris, Victoria 3) do you own, and on which store?
- [ ] Will you read each game's licence before its session and FrostKit's terms before S1, record whether FrostKit research counts as private use under 11 bit's agreement, and seek Ndemic's written permission (or counsel's opinion) for the Scenario Creator? I'll record each clause, link and date in the games table.
- [ ] Does the Godot parity test print PASS, and what did your 10-minute playtest show?
- [ ] Do you confirm the in-or-out list, including keeping Rebel Inc? It was the design anchor on 18 October.

## Audit log

The independent auditor scored v1 at 64, against my own self-score of 90. It found pass rules that today's slice already fails, two wrong access facts, and a licence check at the wrong rung. v2 applied its 28 fixes and scored 85.5; most of what was left came from fixes that clashed once combined. v3 applied its 12 round-2 fixes and 11 smaller corrections. This version, v4, applies the 8 round-3 defects and 10 smaller corrections, and is now the canonical spec; the repo file is a snapshot of it.

| Version | Scorer | Score | Note |
| --- | --- | --- | --- |
| v1 | Claude (self) | 90 | Too generous |
| v1 | Independent Claude auditor, max effort | 64 | Fact-checked 19 claims: 14 against live pages, 5 against the repo and a re-run of the 1000-seed simulation |
| v2 | Independent Claude auditor, round 2 | 85.5 | All 28 fixes landed; 12 defects remained (8.5 points), mostly where fixes combined |
| v3 | Independent Claude auditor, round 3 | 89.5 | Round 3 scored v3 at 89.5 and listed 8 defects; v4 applies them, projected 94 |
| v1 snapshot | Codex (gpt-6-astra, max) via Claudex Loop on your Mac | 60 in round 1 | Revised its own repo copy over 5 rounds: 60, 75, 86, 93, 96 (commit 506fecc). Claude re-scored the final copy (534edf8) at 83.5; its strengths are merged into v4 |

To get above 95, the auditor needs two answers from you: which computer (Windows, Apple-silicon Mac or Intel Mac), and which games you own on which store. That takes it to 96. Your licence reading, a Godot PASS, your playtest notes and your confirmation of the in-or-out list lift it the rest of the way to 100.

## Sources

All checked 2026-11-04. Added in v4: [Ndemic legal terms](https://www.ndemiccreations.com/en/59-legal-information-for-rebel-inc-scenario-creator), [Frostpunk 2 user agreement](https://store.steampowered.com/eula/1601580_eula_0), [Dune: Spice Wars patch, 21 Oct 2026](https://steamdb.info/patchnotes/26100697/), [rea-agents 6.8.0 on npm](https://www.npmjs.com/package/rea-agents/v/6.8.0). Earlier:

- [FrostKit on the Epic Games Store](https://store.epicgames.com/p/frostkit?lang=en-US)
- [Frostpunk 2 policy creation guide](https://mod.io/g/frostpunk2/r/policy-creation-guide)
- [Frostpunk 2 on Steam](https://store.steampowered.com/app/1601580/Frostpunk_2/)
- [Rebel Inc on SteamDB](https://steamdb.info/app/1088790/info/)
- [Rebel Inc Scenario Creator wiki](https://rebelinc.wiki.gg/wiki/Scenario_Creator)
- [Northgard: how to mod](https://northgard.net/map-editor/how-to-mod/)
- [Dune: Spice Wars on Steam](https://store.steampowered.com/app/1605220/)
- [Heaps engine](https://heaps.io/about.html)
- [Ubisoft EULA](https://www.ubisoft.com/legal/documents/eula/en-US)
- [Anno 1800 RDA Explorer](https://github.com/anno-mods/RDAExplorer) (where the data sits; not used)
- [REA (morluto/rea)](https://github.com/morluto/rea)
- [REA on Windows](https://github.com/morluto/rea/blob/main/docs/windows-ghidra-p0.md)
- [Civ IV SDK](https://github.com/dguenms/beyond-the-sword-sdk)
- [Ndemic: Rebel Inc PC and Mac FAQ](https://www.ndemiccreations.com/en/55-rebel-inc-escalation-pc-faqs)
- [Northgard on Steam](https://store.steampowered.com/app/466560/Northgard/)
- [Anno 1800 on Steam](https://store.steampowered.com/app/916440/Anno_1800/)
- [Anno 1800 mod tutorial](https://mod.io/g/anno-1800/r/tutorial-1-my-first-mod)
- [REA installation](https://github.com/morluto/rea/blob/main/docs/installation.md)
- [Heaps and HashLink](https://heaps.io/documentation/fullstack.html)
- [FrostKit 1.0 patch notes](https://steamdb.info/patchnotes/18380952/)
- [Civ V SDK tasks](https://modiki.civfanatics.com/index.php/Basic_DLL_tasks)
- [Civ VI source discussion](https://steamcommunity.com/app/289070/discussions/0/6171700864785205192/)
- [Northgard now on iOS (Playdigious)](https://playdigious.com/news/northgard-is-now-available-on-ios)
- [Rebel Inc. (Wikipedia: iOS, December 2018)](https://en.wikipedia.org/wiki/Rebel_Inc._(video_game))
- [Dune: Spice Wars on Apple-silicon Macs](https://www.applegamingwiki.com/wiki/Dune:_Spice_Wars)
