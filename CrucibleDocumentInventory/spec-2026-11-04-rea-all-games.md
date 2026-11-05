---
type: spec
date: 2026-11-04
status: proposed
version: v5-mac.2
tags: [values-crucible, rea, reverse-engineering, spec, plan]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-04-openttd-0ad-freeciv]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[decision-2026-10-18-rea-reference-games-rust]]"]
---
# REA spec and plan, all games, 2026-11-04 (v5-mac)

Jerry, 2026-11-04 18:48: "I want a full spec and plan for ALL REAs." The canonical spec is the live Claude Doc: https://claude.ai/artifact/JRVtFfJ7nMG29Lxdk4dWPH. This file started as a snapshot of doc v4 (rev 103) and was revised on Jerry's Mac to v5-mac (Astra 95/100 at fd94988) and synced back into the Claude Doc (rev 150) the same evening. On 5 November the repo file moved ahead again (v5-mac.1, pending a sync): it records Jerry's licence decision and drops the Rebel Inc Scenario Creator. Jerry picked Democracy 4 as its replacement (card, 5 November 14:45). v5-mac applies Astra's 2026-11-04 score-only audit of v4 (76/100) and records today's Godot parity PASS. The Codex-revised v5 of this file (Claudex Loop, scored 96 at 506fecc; four residual fixes at 534edf8, re-scored by Claude at 83.5) stays in git history; its strengths were merged into v4.

## Summary

We reverse engineer games for one reason: so the Keystone slice and the five-parish game get rules that strategy designers have already tested on millions of players, then rebuilt to serve one purpose: making the gap between stated values and enacted values visible.

This spec covers eleven games: six already read and five still to do. It also gives an in-or-out line for every other reference the records name. The six already read are all open source or have released source: Micropolis (read with REA on 18 October), Civ IV, Diplomacy, OpenTTD, 0 A.D. and Freeciv. The five still to do are closed source: Frostpunk 2, Rebel Inc, Northgard, Dune: Spice Wars and Anno 1800.

Public documents read here in the cloud answer as much as they can first. After the playtest gate, sessions address only the remaining ranked questions. The number of sessions depends on the evidence gaps and permitted access routes. Anno 1800 waits for the five-parish game. Decompiling (rung 4) is possible on your computer only where a licence allows it, and nothing in the plan depends on it. Every finding becomes a card, and nothing gets built without your go.

## Design questions

Every reverse engineering (REA) session starts from one of these questions, never from a game. Q1 to Q6 come from the audited plan of 3 November. Q7 and Q8 are new and close two gaps: delayed effects, and how often dilemmas come up.

| Rank | # | Question | Needed for | Answered by | An answer looks like | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Q1 | How does a two-faction vote create tension and legitimacy, not just a winner? | Slice | Frostpunk 2 council | Vote thresholds, how support shifts, what losing a vote costs | Open |
| 2 | Q2 | How big are pressure and permission, and how fast do they decay? | Slice | Frostpunk 2 demands and promises; Against the Storm's Queen's Impatience | Demand size, deadline, decay; penalty for a broken promise | Open (boss scorecards are our own design, not yet checked against a game) |
| 3 | Q8 | How often, and on what triggers, should a dilemma interrupt play? | Slice | Frostpunk 2 events; Paradox event scripts; Left 4 Dead AI Director; Rebel Inc (public wiki); alternate: RimWorld storytellers (public wiki) | Event cooldowns, trigger conditions, how many run at once | Open |
| 4 | Q7 | How do the delayed effects of aid show up, so caring now pays later and neglect is felt late? | Slice | OpenTTD rating; Micropolis evaluation; Rebel Inc (public wiki); Democracy 4 (Jerry's pick, 5 November; rung 0, Positech modding guide); alternate Liberal Crime Squad | Delay before an effect lands, how it decays, reputation drift | Partly answered: OpenTTD gives inertia, not delay (card 2); Democracy 4 is the chosen replacement source |
| 5 | Q4 | How do a moving storm and site states force teams to replan? | Slice and five-parish | Northgard, Dune: Spice Wars; 0 A.D.; Micropolis | Warning lead time, hazard odds, recovery speed | Partly answered: 0 A.D. gives site allegiance, not storm warning (card 4); the Shiro games open |
| 6 | Q6 | How do deals between teams work: votes, treaties, broken promises? | Five-parish | Diplomacy; Dune: Spice Wars Landsraad | How a proposal is made, voted and enforced | Diplomacy in the slice (two teams); Landsraad open |
| 7 | Q3 | How do supply chains bend under disruption, from kelp to cure to port? | Five-parish | Anno 1800; OpenTTD; Micropolis | Pay by delivery time, service rating, chain ratios | OpenTTD carded; Anno open |
| Re-rank at B | Q5 | How does unrest turn into people refusing to work? | Slice | Civ IV, Freeciv | Anger timers, disorder thresholds, martial law | Open: Godot parity passes (945c874); at B Jerry establishes which requirements are satisfied and which are deferred |

Jerry closes a question only when its decision record addresses every item in “An answer looks like,” identifies the supporting evidence and accepted implementation, and explicitly defers any remaining scope. Building one card does not automatically close its question. At B, Jerry decides whether the validated Civ IV anger implementation sufficiently answers Q5 for the slice; cards 1+3 remain on hold unless he identifies a remaining gap. Frostpunk 2's tension numbers are read only if a Q1 or Q2 card needs them. Q6 stays open: Diplomacy's joint seawall serves two teams in the slice, and the five-parish game needs deals among more teams. Q7 stays open after card 2 is built: OpenTTD supplies inertia, while effect-onset delay remains unverified. S2 is cancelled, and Rebel Inc remains at rung 0. After B, the assistant researches the ranked Q7 gaps using Democracy 4 (Jerry's pick, 5 November), with the owner, deliverable and time limit recorded before starting. The ranks above are mine, set before your playtest. After it, you re-rank Q1 to Q8 on a decision card, and only sessions with a ranked, open question run.

## What each game must give us

Each game has a job, a lowest access rung, named targets, and a licence line. The rungs are: 0 = published documents, 1 = open source, 2 = official mod tools or the game's own data files, 3 = observing play, 4 = decompiling one formula. Engines, platforms and tools were checked against live pages on 4 November; the sources are at the end.

| Game | Status | Questions | Lowest rung | Targets | Licence (clause, date checked) | Output |
| --- | --- | --- | --- | --- | --- | --- |
| Micropolis | Done, brief (2026-10-18); Q7 read added 5 November | Q3, Q4 cascades; Q7 score lag | 1 (GPL-3 with the Micropolis release's added terms; MicropolisCore @ bd6e12e) | Cascade rules; evaluation lag: `evaluate.cpp` moves the city score halfway to its new value each evaluation (`cityScore = (cityScore + z) / 2`) | GPL: ideas only | crucible/docs/rea-micropolis-brief.md |
| Civilization IV | Implemented in JS and ported to Godot; Godot parity PASS on 2026-11-04 at commit 945c874 (seeds 42, 7, 4217) | Q5, plus worked tiles and yields (your 26 October pick). Wonders as public goals (subsystems row 12) wait for that row, which is marked Later | 1: released core SDK | CvCity hurry anger; CvCity worked plots and base yields, to check teardown 8b | SDK released for modding: ideas only | Anger timers implemented, and Godot parity passes; not yet accepted as built until Jerry's baseline playtest. The assistant must complete and record the yield check before declaring that scope complete |
| Diplomacy | Implemented in JS and ported to Godot; Godot parity PASS on 2026-11-04 at commit 945c874 (seeds 42, 7, 4217) | Q6 | 1: open-source engine | Support strength, cut support | Open source: ideas only | Joint seawall, both engines |
| OpenTTD | Read, carded (2026-11-04) | Q3, Q7 | 1 | Delivery time factor, station rating inertia | GPL: ideas only | Cards 2 and 5 |
| 0 A.D. | Read, carded (2026-11-04) | Q4 | 1 | Capture points, territory decay | GPL: ideas only | Card 4 |
| Freeciv | Read, carded (2026-11-04) | Q5 | 1 | Martial law and luxury, disorder counter | GPL: ideas only | Cards 1+3: proposed bundle; idea count unverified |
| Frostpunk 2 | Not started | Q1, Q2, Q8 | Active Mac route: 0, then 3 after clearance. Frostpunk 2 runs on Mac; FrostKit 1.0 is a Windows-only alternative outside this execution plan. Its public policy documentation can be studied at rung 0. Any future FrostKit session requires a separately specified Windows route and clearance. | Law vote thresholds, delegate voting behaviour, promise and demand data (size, deadline, penalty), event triggers and cooldowns | 11 bit's user agreement (checked 4 November) bars use "in other purpose than private, in particular for commercial purposes", and any "attempt to gain access or modify source code". Before Mac S1, record whether the planned observation is permitted under the applicable game and store terms; consult counsel if unclear. FrostKit’s terms require review only if a separate Windows route is added. Treat rung 4 as barred unless counsel reads clause 4 otherwise | 3 to 5 cards; boss scorecard sizes checked against the game |
| Rebel Inc: Escalation | Public documents only (decided 5 November) | Q7, Q8 | 0 only: the Rebel Inc wiki and lawfully published play. The wiki documents defaults: 80 turns of Lack of Stability before reputation falls; insurgency from turn 115. The Scenario Creator is dropped | Initiative delays, reputation drift, corruption's monthly hit to reputation, event cadence, as documented | Jerry, 5 November 2026: "Skip the clearance then and find something else to use." Ndemic's Scenario Creator terms (checked 4 November) bar commercial use and reverse engineering, so the Scenario Creator isn't used and rung 4 is barred. Jerry picked Democracy 4 as its replacement on 5 November (its group-by-group trust maps onto our community trust meter); alternates Liberal Crime Squad and the RimWorld storytellers | Wiki defaults only, as a cross-check |
| Liberal Crime Squad | Alternate to Democracy 4 (added 5 November) | Q7 | 1 (GPL-2.0; github.com/Kamal-Sadek/Liberal-Crime-Squad @ fb1ca39) | Monthly updates in `src/monthly/monthly.cpp`, `passmonth()` @ fb1ca39: public interest is halved using integer division. Background liberal influence contributes to the month's influence before being multiplied by 0.66 and truncated to an integer. Only AM radio and cable news use the public-mood comparison to request a one-point decrease or increase; equality requests an increase. Other non-skipped issues use randomized influence-balance rules. These observations establish monthly updating and decay; an aid-onset delay still requires an action-to-update trace. | GPL-2.0: ideas only, rebuilt in plain math | Candidate card: monthly influence and decay; aid-onset delay unverified |
| RimWorld storytellers | Alternate to Democracy 4 (added 5 November) | Q8 | 0: the RimWorld Wiki's storyteller pages, which quote the game's own settings | Cassandra Classic: the major-threat cycle starts on day 11, alternating 4.6-day On and 6-day Off phases, with 1 or 2 major threats per On phase at least 1.9 days apart; minor events every 4.8 days on average. Phoebe Chillax: 8 days On, 8 Off, 1 per cycle | Public wiki only; no copy and no game files | 1 card: dilemma cadence |
| Northgard | Not started | Q4 | Active Mac route: 0, then 3 after clearance. Northgard runs on Mac. The Windows-only Northgard Editor (NGEditor/Editor.exe) is excluded from this execution plan; its public documentation remains available at rung 0. Any future editor session requires a separately specified Windows route and clearance. | Seasonal calendar and winter penalties, event odds, disaster recovery | Shiro terms: you check | 1 to 2 cards |
| Dune: Spice Wars | Not started | Q4, Q6 | 0: public wikis and patch notes. The 21 October 2026 patch (v2.2.8.33019) added modding hooks, but there is no official mod kit yet; Shiro's Haxe/Heaps engine (HashLink); Windows only | Sandstorm and sandworm timing and warning, Landsraad resolution rules | Rung 0 only in this plan. Rung 2 (its own data files) would need your check of the Funcom and Shiro terms and its own session. Rung 4 is unlikely: REA lists no HashLink support | 1 to 2 cards |
| Anno 1800 | Not started (five-parish game) | Q3 | Active Mac route: 0 only, using public guides, wikis and lawfully published gameplay. Local observation of the Windows game is outside this execution plan and would require a separately specified route and clearance. Its archives are not unpacked and its files are not decompiled. | Chain ratios and cycle times, unmet needs, ship capacity and route timing | Ubisoft EULA §1.2 (last updated 01/2023): no reverse engineering, decompiling or derivative works, except content made through game features. So we use public guides and observed play only, and never unpack or decompile its files | 2 to 3 cards for the five-parish chain |

**Also named in the records.** Every other reference gets an in or out line, so none is quietly dropped.

| Reference (where named) | Question | In or out |
| --- | --- | --- |
| Paradox event scripts (18 October record, the dilemma format anchor) | Q8 | In: the official modding wiki's event documentation, read in the cloud (rung 0); the event files themselves only from your own copy, if you own a Paradox game |
| Left 4 Dead AI Director (subsystems row 10) | Q8 pacing | In: published design talks only |
| Against the Storm, Queen's Impatience (26 October research) | Q2 | In: public wiki only |
| Democracy 4 (18 October record) | Q7 | In: Jerry's pick to replace Rebel Inc (decision card, 5 November 14:45). Jerry owns no copy, so the active route starts at rung 0: Positech's official modding guide documents policy CSVs, implementation duration and effect inertia (https://www.positech.co.uk/democracy4/modding.html). Democracy 4 is Windows-only (https://www.positech.co.uk/democracy4/). Rung 2 remains on HOLD until ownership, applicable terms and a lawful, verified route to the identified build's game files on this Mac are recorded. Once those prerequisites are met, allow 15 minutes for initial data inspection and record unresolved findings as HOLD. Mapping voter-group approval onto community trust is a proposed adaptation requiring validation. |
| Hearts of Iron IV (26 October research) | Q4 | Out for the slice; five-parish weather only |
| Civilization V and VI | Q3, Q5 | Out: Civ IV already covers worked tiles at rung 1, and Civ VI never released its core source, per player reports |
| This Is the Police, Frostpunk 1, Emergency, Company of Heroes 2, Tropico, Age of Empires II, StarCraft II, Open RTS (MIT; camera and selection already borrowed), Widelands (architecture reference for authoritative state and replay), Into the Breach, Jackbox | Theme, units, UX | Out: design references, no numbers needed |

## Method and guardrails

Each question gets the lowest access rung that can answer it. We climb a rung only when the one below has come up empty, and we write down why.

1. **Published documents (rung 0).** Official modding guides, patch notes and community wikis, which I read here in the cloud before any session. Examples: the Frostpunk 2 policy creation guide on mod.io, Northgard's "How to mod" page, the Rebel Inc wiki, and the RimWorld Wiki's storyteller pages. A session on your computer only checks what these can't settle.
2. **Open source (rung 1).** I read the code here in the cloud. Downloads are treated as untrusted data and never executed, and every finding cites the file, function and commit.
3. **Official mod tools and data files (rung 2).** These run on your computer through a remote session, using your own installed copies. Exported tables are read as numbers only, and no assets or text leave your computer.
4. **Observing play (rung 3).** Before collection, the assistant specifies the game build, scenario, difficulty, map, start state, choices, measured outputs, sample count and 90-minute limit. Record whether seeds can actually be controlled; repeated loads of one save are not independent runs. For fixed rules, collect at least 3 fitting values, or 5 for a delay or decay curve, plus separate held-out observations. Before fitting, preregister the measured outputs, held-out cases, relative-error calculation and an absolute tolerance, in the output’s units, for zero-valued observations. Accept a fixed-rule formula only if every preregistered held-out nonzero observation has absolute relative error no greater than 10%, and every held-out zero observation falls within the preregistered absolute tolerance. Otherwise record HOLD. Do not change tolerances after inspecting held-out results. For chance events, define one binary outcome per complete fixed observation window and report its Wilson 95% interval. Preserve early-ended runs with their duration and termination reason; do not count unknown outcomes as completed windows. If censoring occurs, use a preregistered suitable method or withhold the numerical probability. Require at least 5 event-positive windows and interval half-width no greater than 15 percentage points. At the time limit, insufficient evidence produces HOLD or a qualitative finding; collection is not extended merely to obtain a passing result.
5. **Decompiling one formula (rung 4).** This is a last resort and never planned ahead. It needs a research request approved by Jerry that names one unresolved formula, documents why the applicable lower rungs failed, records clearance for the proposed method, and sets a time limit. The research request is separate from the implementation card, which cannot pass until the missing evidence exists. The assistant stops on failed prerequisites or budget expiry and records HOLD.

**The REA tool (morluto/rea) is set up only when rung 4 is actually needed.**

- **Version.** We pin `rea-agents@6.8.0`, the current npm release (25 October 2026).
- **What it needs.** Ghidra 12.1.x with a 64-bit full JDK 21 or newer; it is verified with Ghidra 12.1.4 and JDK 21. Node.js 22.23.4 or later on the 22 line, 24.22.1 or later on the 24 line, or 26.12.1 or later. Your Mac has 22.20.0.
- **Where it runs.** Ghidra runs on Linux, or on a Mac with an Intel or Apple chip; on an Apple chip its native decompiler may need building first. On Windows x64 the route is experimental and read-only, but it takes native programs and DLLs.
- **Checks before use.** We run `rea doctor --provider ghidra --json` and `rea providers --json`, which are read-only, then one smoke test on the target: `rea inspect <target> --provider ghidra --json`. We stop if any of them fails. A plain `rea doctor` checks every integration, so it can fail on tools we don't use.

So rung 4 is possible on your computer where a licence allows it, and nothing in this plan depends on it.

**Guardrails, all binding:**

- **Independent implementation.** Do not incorporate third-party code, assets or expressive text into Crucible. Record provenance references and factual measurements separately. Work described as clean-room requires a named reader, a plain-language specification, and an implementer who has not accessed the original implementation; record that separation. Otherwise describe the work as independent reimplementation, without claiming clean-room separation.
- **Licence first.** You check a game's licence and any mod-kit terms before we do anything beyond reading public documents and open-source code. The session note records the game's licence and each tool's terms separately, each with its clause, link and date. If permission for the intended activity is unclear, that activity stops. Continue only with public documents until the applicable game, store and tool terms, and any required permission or legal interpretation, are recorded.
  - Official tools (FrostKit, the Northgard Editor) are used only as their terms allow. Rebel Inc's Scenario Creator is dropped (5 November).
  - Unpacking game files with a community tool needs a check first. The tool must come from its own repository, at a pinned version.
  - Decompiling always needs a check.
  - Observing Jerry’s installed copy requires review of the applicable terms for the intended research use. Lawfully published gameplay material may be studied at rung 0.
- **Jerry's licence decision (5 November 2026).** Jerry said: "Skip the clearance then and find something else to use. The rest of the licenses are good, as long as you don't exactly steal their look and characters." This records his project approval and closes the Scenario Creator route. The activity-specific terms records required by "Licence first" remain open; any conflicting restriction must be resolved or the affected route excluded. Three lines hold:
  - Ideas and mechanics only, rebuilt in plain math.
  - Never paste proprietary code.
  - Open-source code is used only under its licence terms.

  Explicit bans still hold: Anno 1800's no-reverse-engineering clause, and the Scenario Creator, which is dropped. This is not legal advice; counsel before any sale still applies.
- **Known now.** Ubisoft's licence for Anno 1800 bans reverse engineering, so Anno stays at public guides and observed play, and its files are never unpacked or decompiled. REA is MIT-licensed; its disclaimer says it is for "software you own or are authorized to examine", and it grants no licence for Hopper, IDA or JEB.
- **Your copies only.** Nothing comes from piracy or asset-rip sites.
- **Counsel before sale.** If the app is ever sold, we get a short intellectual-property review first. This spec is not legal advice.
- **Determinism holds.** Every rule we build lives in content JSON and the seeded engine. Identical engine and content versions, initial state, seed and ordered inputs must reproduce identical serialized replay state. A card that changes the rules changes golden.json only through a reviewed regeneration.

## The REA card and when it passes

The assistant maintains a card for every finding, including previously implemented Civ IV and Diplomacy findings and the existing source-study backlog. Before an experiment or closure decision, reconcile each card against this schema, linking its source revision, applicable terms, adaptation, baseline, prediction and validation evidence. Mark inapplicable fields explicitly with a reason. Existing implementation does not exempt a finding from this review.

| Field | What it must hold |
| --- | --- |
| Source and evidence | Open source: file, function and commit. Closed game: game version and build, store, platform and mod-kit version; the asset path or table and row; and a SHA-256 of the file read (only the hash leaves your computer). Play log: scenario script, difficulty, number of runs and the held-out run's error. Published document (rung 0): URL, date read, page revision and the exact line quoted. A number from a community wiki also needs a second source, or a check in the game, before a card uses it |
| Rung and licence | Rung used, why the rung below didn't answer, and the licence line |
| Formula | Plain math with real values and units, converted to Keystone turns; a formula that can't be translated is rejected. No code copied. Recovered or adapted: whether the numbers are the game's own or our adaptation, and which. Confidence is assigned separately to the recovered rule and the Keystone adaptation. High confidence requires pinned evidence plus a traced active code path or selected configuration; a file’s existence alone is insufficient. Held-out observations may support medium confidence within their tested conditions. Unverified applicability or qualitative evidence remains low confidence. Findings from different editions or platforms are not pooled without a documented equivalence check. |
| What the player feels | One sentence |
| Keystone mapping | Content JSON keys and the engine function it touches |
| Values purpose | Name the declared value, the competing operational incentive, and two feasible actions with different consequences. Identify the decision-log evidence and debrief prompt that will reveal enactment or compromise. Before testing, specify what Jerry must be able to identify from the replay. A change in bot target rates alone does not demonstrate this values purpose. |
| Cost | Passes only if the facilitator can explain it in one sentence an executive can repeat back, it adds at most one number to the planning screen and no new screen, and the slice still fits in 10 minutes. The slice takes at most three card-added ideas. After each candidate changes the playable build, Jerry conducts a separate 10-minute acceptance playtest and records whether the added idea was understood and used correctly without prompting. The earlier baseline playtest cannot satisfy this requirement. Failure places the candidate on HOLD. Cards that only work together count as one idea only if together they add one decision and one number |
| Prediction | A metric, today's value and a pass range, written before the test. Example: generous Meridian makes its target in 49.4% of games against the careful community now, and 52 to 58% after |
| Decision | Adopt, adapt, hold or reject, with the reason |

Each card is tried first in the JavaScript engine on a branch. It passes there when rules 1 to 3 hold; then you approve or reject it (rule 5). Rule 4 is the build check: it runs after an approved card is ported to Godot, and the card counts as built only when it prints PASS.

1. The 1000-seed run lands inside the prediction's pass range, and the run reports how often the new mechanic fires. At least one bot line must use it; a mechanic that never fires fails.
2. A team that does nothing makes its target in under 10% of seeds, against every line the other team plays. That's the 2 November rule; today's worst case is 7.9%. The card raises no do-nothing rate by more than 2 points, and the second community line must also keep every do-nothing rate under 10%.
3. No new or wider dominance. A line is dominant when it is best for its team against every active line of the other team. The card makes no line dominant that wasn't dominant before. Where a line already dominates, its lead over its team's next-best line grows by at most 2 points against any line of the other team. Declare any intended dominant temptation before testing. That declaration does not waive the prohibition on new dominance or the two-percentage-point growth limit. A deliberate exception requires a separate Jerry decision and remains a failed criterion under this rubric, not a PASS. Lines are the named bot policies in `crucible/slice/sim.mjs`, and doing nothing is not a line. Each team needs at least two active lines. The community has only one today, so a second line (for example, "sandbag first") is added, and this baseline grid is measured, before any card is tried.
4. Godot parity: measured PASS on 2026-11-04 at commit 945c874, on the Apple M5 Max (64 GB, macOS 26.5.2) with Godot 4.7.2.stable.official. Command, run from `crucible/godot/keystone_slice`: `godot --headless --script res://tests/run_tests.gd`. Output: `18 checks, 0 failures` and `PASS`, exit status 0. That is 6 checks per seed (2 RNG, 3 turn states including the state hash, and 1 standings) for seeds 42, 7 and 4217. Two parse errors that Godot 4.7.2 rejected were fixed first, as renames and typing only, with no rule change (e4c51a8, f7603f8, 945c874). `node crucible/slice/golden.mjs` generates fixtures; `tests/run_tests.gd` consumes them. Unchanged rules must regenerate byte-identically (true on 2026-11-04). An approved rule change requires review of changed expectations and a new golden case that exercises the mechanic. Every baseline and added case must pass on the Mac or an approved headless CI runner before acceptance, and each run records the tested commit, content and fixture hashes, runtime, command, output and exit status.
5. You approve it on a card. After your playtest, your notes outrank every persona score.

## Plan

The four-hour estimate describes the inactive Windows route. Use the conditional Mac estimate below and recalculate it after B. A rung 3 fallback is extra: one session of about 90 minutes per question, booked only when a lower rung comes up empty. Anno 1800 waits for the five-parish game. The sessions follow the question rank, not the game, and the session lengths are my estimates.

Plan: completed source studies → B baseline gate → Jerry’s ranked open-question queue → targeted research → candidate experiment → approval, Godot parity and acceptance playtest. The assistant owns outstanding public-document checks, including Dune and the Civ IV yield check; these are not marked complete by the earlier source studies. S1–S3 identify game resources, not a mandatory execution order. Anno remains deferred to the five-parish gate. Each research task names its owner, question, deliverable and time limit before starting.

**B, the baseline gate:** The assistant first repairs and verifies parity on an identified baseline commit. Jerry then plays that unchanged baseline for 10 minutes and records comprehension, decision pressure, visible consequences, debrief usefulness, and go/no-go. Jerry re-ranks the open questions and identifies any remaining Q5 gap. Until those results are recorded, card experiments and rule tuning wait. After a go decision, the assistant adds the second community policy, measures the complete baseline grid and tests only candidates serving Jerry’s priorities. Every research session ends with cards and a dated repo note. Parity repair time is additional to the original 45-minute gate estimate.

**Your computer is an Apple-silicon Mac (chosen 4 November), so this is the plan:** FrostKit and the Northgard Editor are Windows only, so S1 and S3 become rung 0 plus observed play under the rung 3 protocol, one question per session of about 90 minutes. On an Intel Mac, Frostpunk 2 doesn't run, so S1 stays at rung 0. S2 is dropped (5 November): Rebel Inc stays at public documents. Jerry picked Democracy 4 as its replacement (5 November), studied at rung 0 from Positech's public modding guide; alternates Liberal Crime Squad and the RimWorld storytellers. Its research time is scoped separately and needs nothing from the Mac. S4 uses public guides only. You also chose (4 November) to study Mac and iOS versions, for observed play only (rung 3): iOS apps are encrypted and their store terms bar decompiling. Checked 4 November: Northgard is on the App Store (Playdigious port), so S3's observed play can use an iPad; Frostpunk 2 runs natively on the Mac. Dune: Spice Wars and Anno 1800 have no Mac or iOS version (Dune runs only through CrossOver or Parallels, which we don't rely on), so they stay at rung 0. The conditional Mac base estimate is 45 minutes for B, plus 90 minutes for each ranked, unresolved Frostpunk 2 question requiring local observation, up to three, plus 90 minutes for Northgard Q4 if local observation is required. The total is 6.75 hours only when all four observation sessions are selected and eligible. Check ownership, applicable terms, installed build and successful launch independently for each game. An unavailable game remains at rung 0 without blocking the other game's eligible sessions. If neither game is available, this base schedule contains only B. Democracy 4 research is scoped and estimated separately. This excludes public-document research, installations, licence clearance, parity repair, implementation and acceptance retests. This is not an upper bound on total work.

What each session needs from you:

- **Before any session:** A working local Claude Code session with the project accessible and, if used, Remote Control connected. Jerry operates game and editor interfaces unless a separate computer-use connection has been configured and tested. Administrator rights are not a standing session prerequisite. Before B, also Godot 4.3 or newer (the standard build, not .NET) and a copy of this repo; I run the parity test over Remote Control, `godot --headless --script res://tests/run_tests.gd` from crucible/godot/keystone_slice. Before each session, you read that game's licence (including terms for any tool actually used; FrostKit is excluded from the Mac plan), and I record the clause, link and date in the games table.
- **Before S1 on the selected Mac:** Confirm ownership, applicable terms, installed Frostpunk 2 build and successful launch. Use public documents and cleared observation. FrostKit installation is excluded from this Mac plan.
- **S3:** the game installed and opened once.
- **S2 (dropped 5 November):** no Rebel Inc session. Its replacement is Democracy 4 (Jerry's pick, 5 November), studied from public documents; alternates Liberal Crime Squad and the RimWorld storytellers. The open-source and public-wiki alternates need nothing from your Mac.

## Card backlog

There are five cards so far, all from source code. Cards 1 and 3 are a proposed bundle. The slice permits at most three card-added ideas in total, introduced one at a time. Count this bundle as one idea only after demonstrating that it adds one decision and one displayed number. The closed games should add roughly 8 to 14 more cards. The "When" column is my recommendation; you decide each card on a decision card. Card 3 can't fire as written: trust starts at 60 and, with a careful community, never falls below 55 after the first turn, so its "below 40 for 3 turns" trigger fired in 0 of 5000 simulated games. Before card 1+3 is tried, card 3 is re-timed to act on a fall in trust (for example, 10 points across two turns) or its penalty lands in recovery, and its prediction is rewritten first.

| Card | Source | Question | Decision so far | When |
| --- | --- | --- | --- | --- |
| 1+3. Care or control, with its unrest warning (proposed bundle) | Freeciv | Q5 | Hold pending a confirmed Q5 gap at B; re-time card 3 before a trial; idea count remains subject to the cost gate | After B, only if Jerry selects it |
| 2. Trust moves slowly | OpenTTD | Q7 | Adopt after playtest | After step B |
| 4. Allegiance per site | 0 A.D. | Q4 | Hold | Five-parish game |
| 5. Late doses lose value | OpenTTD | Q3 | Hold | Five-parish game |
| Second community bot line ("sandbag first") | Our own; needed by pass rule 3 | All | Required before any card is tested | First, before any card |
| Council vote and legitimacy | Frostpunk 2 | Q1 | Not yet read | After S1 |
| Demand size and broken-promise penalty | Frostpunk 2; Against the Storm | Q2 | Not yet read | After S1; may re-tune the boss scorecards |
| Dilemma cadence and cooldowns | Frostpunk 2, Paradox; Democracy 4 or the RimWorld alternate | Q8 | Not yet read | After S1; feeds the AI Dilemma Director |
| Delayed aid effects | Democracy 4 (Jerry's pick); Micropolis; Rebel Inc wiki as a cross-check | Q7 | Not yet read | After B; compare with card 2 |
| Storm warning lead time | Northgard, Dune: Spice Wars | Q4 | Not yet read | Slice or five-parish, depending on your playtest |
| Landsraad-style island resolution | Dune: Spice Wars | Q6 | Not yet read | Five-parish game |
| Chain ratios and unmet needs | Anno 1800 | Q3 | Not yet read | Five-parish game |

Build gate: the assistant owns implementation, validation records and the build log; Jerry owns adoption and human acceptance. “Built” requires a complete card, passing JS criteria, Jerry’s approval, reviewed Godot fixtures, passing parity, and the post-change complexity and values-purpose playtest. Stop after two build-and-retest cycles or three hours, whichever comes first. If any requirement remains unmet, record HOLD, the failed requirement, evidence and next decision needed. The candidate remains outside the accepted baseline. Further work requires a separately recorded scope and budget decision.

## Risks and open questions

| Risk | Effect | Fallback |
| --- | --- | --- |
| A licence restricts the proposed research activity | The restricted method is blocked; official-tool status creates no automatic exception | Use public documents. Resume another method only after its permission and scope are recorded |
| FrostKit doesn't expose the promise or demand numbers | Q2 stays partly open | Observe play using the rung 3 protocol, in its own session of about 90 minutes; the vote thresholds are already confirmed in its policy data |
| Your computer is a Mac | No FrostKit, Northgard Editor, Anno 1800 or Dune: Spice Wars; on an Intel Mac, no Frostpunk 2 either | Follow the Mac branch in the plan |
| Public sources don't give a delay we need | Q7 keeps its shape but loses the number | Use Democracy 4 (Jerry's pick), or the open-source alternates' constants (Liberal Crime Squad, Micropolis; rung 1). Rebel Inc stays at rung 0; rung 4 is barred by Ndemic's terms |
| REA's scoped check or its smoke test fails on your computer | No rung 4 | Nothing depends on rung 4 |
| Too many cards for executives in a 10-minute slice | The slice gets confusing | The cost rule: one decision and one number per idea, at most three ideas in the slice, each used correctly without prompting in the playtest |
| Tuning before the baseline playtest | Effort spent on an unconfirmed problem | No card experiment or rule tuning during B. After Jerry records go/no-go and priorities, establish the expanded baseline grid before testing a candidate |

Only you can answer these:

- [ ] Answered 4 November: the M5 Max MacBook Pro only, no Windows PC, so the Mac branch of the plan applies. On an Apple-silicon Mac you can run Frostpunk 2, Northgard and Rebel Inc (with its Scenario Creator), but not FrostKit, the Northgard Editor, Anno 1800 or Dune: Spice Wars. On an Intel Mac, Frostpunk 2 doesn't run either.
- [x] Jerry records the owned edition and store, or “not owned,” for Frostpunk 2, Rebel Inc, Northgard, Dune: Spice Wars, Anno 1800, Democracy 4 and any proposed Paradox title. Before a local session, the assistant also records the installed build and successful launch. An unconfirmed or unavailable title remains at rung 0; no purchase or alternative platform is assumed. Checked 5 November: this Mac has no Steam or Epic launcher, and none of these games is installed. Jerry confirmed on 5 November that he owns none of them, so Frostpunk 2 and Northgard also stay at rung 0, and no session runs on his Mac after B.
- [x] Jerry's 5 November project decision is recorded. The Rebel Inc Scenario Creator is dropped, and its clearance process is closed.
- [ ] Before any selected local research activity, the assistant records the applicable game, store and tool terms with clause, URL and date; Jerry records the decision for that activity. An unresolved restriction keeps that activity on HOLD. Jerry may instead retain a public-document or permitted open-source route.
- [x] Godot parity PASS at 945c874: Godot 4.7.2 on the M5 Max; 18 checks, 0 failures; exit 0.
- [ ] Jerry completes the 10-minute baseline playtest and records observations, go/no-go and revised question priorities.
- [ ] Do you confirm the rest of the in-or-out list? Rebel Inc was decided on 5 November: kept, at public documents only. The replacement is Democracy 4 (Jerry's card, 5 November); alternates Liberal Crime Squad and the RimWorld storytellers.

## Audit log

The independent auditor scored v1 at 64, against my own self-score of 90. It found pass rules that today's slice already fails, two wrong access facts, and a licence check at the wrong rung. v2 applied its 28 fixes and scored 85.5; most of what was left came from fixes that clashed once combined. v3 applied its 12 round-2 fixes and 11 smaller corrections. The v4 snapshot incorporated those corrections. v5-mac (Astra 76 → 92 → 95, commit fd94988) is synced to the Claude Doc at rev 150. On 5 November, Jerry's licence decision and the dropped Scenario Creator were recorded in the repo, ahead of the Claude Doc pending a sync. He picked Democracy 4 as the Rebel Inc replacement the same day (v5-mac.2).

| Version | Scorer | Score | Note |
| --- | --- | --- | --- |
| v1 | Claude (self) | 90 | Too generous |
| v1 | Independent Claude auditor, max effort | 64 | Fact-checked 19 claims: 14 against live pages, 5 against the repo and a re-run of the 1000-seed simulation |
| v2 | Independent Claude auditor, round 2 | 85.5 | All 28 fixes landed; 12 defects remained (8.5 points), mostly where fixes combined |
| v3 | Independent Claude auditor, round 3 | 89.5 | Round 3 scored v3 at 89.5 and listed 8 defects; v4 applies them, projected 94 |
| v1 snapshot | Codex (gpt-6-astra, max) via Claudex Loop on your Mac | 60 in round 1 | Revised its own repo copy over 5 rounds: 60, 75, 86, 93, 96 (commit 506fecc). Claude re-scored the final copy (534edf8) at 83.5; its strengths are merged into v4 |

Still open for Jerry: the 10-minute baseline playtest, and confirming the rest of the in-or-out list. His licence decision was recorded on 5 November. He owns none of the closed games (5 November), so S1 and S3 stay at rung 0, and he picked Democracy 4 to replace Rebel Inc.

## Sources

All checked 2026-11-04. Added in v4: [Ndemic legal terms](https://www.ndemiccreations.com/en/59-legal-information-for-rebel-inc-scenario-creator), [Frostpunk 2 user agreement](https://store.steampowered.com/eula/1601580_eula_0), [Dune: Spice Wars patch, 21 Oct 2026](https://steamdb.info/patchnotes/26100697/), [rea-agents 6.8.0 on npm](https://www.npmjs.com/package/rea-agents/v/6.8.0). Earlier:

- [FrostKit on the Epic Games Store](https://store.epicgames.com/p/frostkit?lang=en-US)
- [Frostpunk 2 policy creation guide](https://mod.io/g/frostpunk2/r/policy-creation-guide)
- [Frostpunk 2 on Steam](https://store.steampowered.com/app/1601580/Frostpunk_2/)
- [Rebel Inc on SteamDB](https://steamdb.info/app/1088790/info/)
- Added 5 November: [Liberal Crime Squad (GPL-2.0), monthly.cpp @ fb1ca39](https://github.com/Kamal-Sadek/Liberal-Crime-Squad/blob/fb1ca39/src/monthly/monthly.cpp)
- [MicropolisCore evaluate.cpp @ bd6e12e](https://github.com/SimHacker/MicropolisCore/blob/bd6e12e/packages/micropolis-engine/src/evaluate.cpp)
- [RimWorld Wiki: Cassandra Classic](https://rimworldwiki.com/wiki/Cassandra_Classic)
- [RimWorld Wiki: Phoebe Chillax](https://rimworldwiki.com/wiki/Phoebe_Chillax)
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
