---
title: "Proposal: a 60-minute live Crucible for the Jefferson Nursing Leaders conference"
date: 2026-10-19
type: decision-record
status: proposed
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, conference, nursing, live-session, dilemmas]
related:
  - "[[decision-2026-10-18-restart]]"
  - "[[2026-10-18-overnight-build-log]]"
  - "[[values-crucible-experience-arc]]"
  - "[[dilemma-generation-framework]]"
  - "[[concordia-all-parishes]]"
---

# Proposal: a 60-minute live Crucible for nursing leaders

**Asked by:** Jerry Wolf, 2026-10-19: get the Crucible running for a one-hour session at a Jefferson Nursing Leaders conference.
**Status:** proposed. Every content choice below is Jerry's call as designer. Engine, browser build and a first board are built (see Built so far); content is still draft.
**Unknowns:** conference date, room size, table count, wifi. Assumed: participants at 6 tables with their own phones, one facilitator laptop on a projector.

## Where the engine stands (checked 2026-10-19 on `claude/crucible-rs-restart`)

| Check | Result |
|---|---|
| `cargo test` | 19 unit, 7 integration, property suite: all green |
| Full seed-42 run, release build | 63 ms for all 481 ticks |
| WebAssembly build of `crucible-core` | Fails only because `rand` pulls `getrandom` with OS entropy; the core never uses it. Fix: `default-features = false` on `rand`. |
| Live play | Not possible yet. `sim::run` is a single batch call; dilemmas are decided by script or by the drift model, never by waiting for a person. |
| CI | Was TypeScript only and red since Dec 2025. Now a single Rust engine job: tests, clippy, content validation, seed-42 determinism and replay. |
| Merged to main | PR #1 squash-merged 2026-10-19. |

The engine is sound and fast. What a room needs that it lacks is a way to pause for human decisions, a short-session content profile, an input path from tables, and a projected live view.

## The 60-minute flow

Six tables, one parish each. Each table is the nursing leadership of the care site in its parish.

| Min | Segment | Room | Engine |
|---|---|---|---|
| 0 to 6 | Frame: "the gap between what we say and what we do under pressure" | Facilitator | Title screen |
| 6 to 12 | Values lock: each table picks and ranks 3 values from a 12-card nursing deck | Table discussion, captain submits | Stated values recorded per parish |
| 12 to 15 | Briefing: Concordia, Hurricane Midas, your site's patients | Projected map | Seeded run starts, paused at T-72h |
| 15 to 24 | Round 1, Watch (T-48h): one dilemma per table | 6 min discuss, lock in | Advances to landfall, decisions land |
| 24 to 35 | Round 2, Landfall (T-0): one site dilemma plus one island-wide dilemma | 8 min | Advances through the crisis; cascades and isolation shown |
| 35 to 43 | Round 3, Recovery (T+36h): one accountability dilemma | 6 min | Advances to end; values gap computed |
| 43 to 57 | Debrief: each table's stated vs enacted gap, projected; pair share; one personal commitment | Facilitator-led | Debrief screen |
| 57 to 60 | Close | | |

Four decisions per table. That is fewer than the 45-dilemma full arc, which is the point: one hour holds four real conversations, not forty rushed ones.

## Recommended build (in order)

1. **Live session mode in the core.** A team mode `live` where a dilemma stays open until a decision arrives. Because a full run costs 63 ms, the simplest correct design is to re-run from the seed with the decisions entered so far and stop at the next open live dilemma. Determinism and replay come for free, and the run log contract does not change shape. This changes `ENGINE_SPEC.md` and needs to be recorded when accepted.
2. **A session profile in content.** `content/sessions/nursing-60.json`: which dilemma ids fire per round, the stop points, the 12-card values deck. Facilitators edit it without a build.
3. **WebAssembly build** so the projected page runs the engine in the browser with no server. Needs the `rand` feature fix above.
4. **Facilitator live page**, built from the existing viewer: round controls, a lock-in panel per table, and the debrief screen.
5. **Phone input (stretch).** Phones need a server: a small room service that holds the decisions and serves a join page by QR code. This is the part most exposed to conference wifi. Built only after 1 to 4 work offline.
6. ~~Rust CI job~~ done 2026-10-19 in PR #1.

Steps 1 to 4 give a session that works with no network: table captains call their choice and the facilitator enters it. Phones are layered on top, not depended on.

## Content proposal: nursing leadership on Concordia (for Jerry to decide)

Keep the island, the storm, the parishes and the infrastructure model. Reframe each parish team around its care site. Concordia General Hospital in Sterling (120 beds, 18 ICU, the island's only surgery and ER, per [[concordia-all-parishes]]) is the center of gravity. Meridian BioSciences still makes Celarithin, so the drug supply chain becomes a patient-care problem rather than a revenue one.

| Parish | Care site the table leads | Pressure it carries |
|---|---|---|
| Sterling | Concordia General Hospital, nursing administration | Census, staffing, triage, the ICU on generators |
| Heartland | Rural clinic and dialysis unit below the dam | Power priority, evacuation of fragile patients |
| Summit | Meridian executive health clinic | Privilege, bunker access, who gets the best care |
| Keystone | Plant occupational health | Worker safety vs production, Celarithin supply |
| Haven | Port clinic serving union families | Trust, communication, who hears the truth first |
| Gateway | Airport and tourist urgent care | Evacuation seats, visitors vs residents |

### Seed dilemmas (sketches, not final)

Each tests two values against each other. Value ids should come from the 12-card deck once Jerry picks it.

1. **Ride-out team roster** (Sterling, Watch). The storm team must lock in for 72 hours. Three of your most experienced ICU nurses have children at home and no one to take them. Mandate them, accept volunteers only and run thin, or bring families into the hospital. *Duty to patients vs care for staff.*
2. **Evacuate the NICU now or shelter in place** (Sterling, Watch). Transfer by air carries its own risk and the window closes in 6 hours. *Safety vs certainty; courage vs caution.*
3. **Dialysis schedule** (Heartland, Watch). Run everyone early and short, or keep full sessions for the sickest and send others home. *Fairness vs clinical judgement.*
4. **Celarithin rationing** (Keystone, Watch). Stock covers five days of normal use; the plant may be down for weeks. Ration now and tell patients, or keep normal dosing and hope. *Honesty vs reassurance.*
5. **Generator choice** (Sterling or Heartland, Landfall). One generator left: ICU ventilators or the dialysis unit. Reframes the existing `crisis-heartland-02`. *Equity vs maximizing lives.*
6. **Crisis standards of care** (Sterling, Landfall). Physicians ask nursing to implement crisis triage. Reframes `crisis-sterling-02`. *Duty to every patient vs stewardship of scarce care.*
7. **The executive's family** (Summit, Landfall). A Meridian board member asks for his mother to be moved ahead of the transfer list. *Fairness vs loyalty to the organization.*
8. **Island-wide: share nurses across parishes** (all tables, Landfall). Sterling is drowning; sending your nurses leaves your own site exposed. *Collective good vs responsibility to your own.*
9. **Gateway evacuation seats** (Gateway, Landfall). Eight helicopter seats: tourists with return tickets, or two of your own long-term patients and their aides. Reframes `crisis-gateway-01`. *Fairness vs obligation.*
10. **The generator gap** (all, Recovery). A patient died in the 11 minutes between generator failure and backup. Reframes the existing Sterling generator-gap aftermath. Defend the protocol, accept responsibility, or name the night supervisor. *Accountability vs protecting your people.*
11. **What we tell the families** (Haven, Recovery). The incident review will take months. Disclose what you know now, or wait for findings. *Candor vs institutional caution.*
12. **Staff recovery** (all, Recovery). Census is back. Grant the ride-out team a week off, or keep them on the schedule because the floor needs them. *Care for staff vs continuity.*

Real-world anchors worth checking before the session (from memory, not verified here): Memorial Medical Center after Hurricane Katrina (2005) for shelter-in-place and triage under failing power, and the IV fluid shortages after Hurricane Maria (2017) and Hurricane Helene (2024) disrupted Baxter plants, for the Celarithin thread. Both are familiar to nurse leaders, which helps the debrief land and also means facts must be right.

## Decided so far

- 2026-10-20, Jerry: **input is option cards plus a private phone vote.** Tables raise A/B/C/D cards at once for the public choice; each person votes privately on a phone first. The debrief adds a second gap, private conviction against the table's public choice ("you knew, and didn't say"). Build the offline card-and-laptop version first; phones layer on top, so bad wifi only loses the private votes.
- 2026-10-20, Jerry: **a virtual game board on the existing Concordia island art** (`Concordia.png`, 2048 px). Parishes are territories on the real island; storm rings, outages, isolation and decision tokens are drawn over it.
- 2026-10-20, Jerry: **frame it like a live Dungeons and Dragons game.** The facilitator is the Dungeon Master (the corpus's Crucible Master): narrates, voices personas as NPCs, works the intensity dial from a private DM screen. The engine is the rulebook and dice; tables are the parties. 
- 2026-10-20, Jerry: **the DM shapes the questions; the dice decide the consequences.** Before a choice the DM controls which dilemma lands where and when, the heat (intensity and clock), and which persona presses whom. After a choice the engine alone resolves what it sets off. Every DM move is logged beside the decisions and can be shown in the debrief, and replay stays exact because DM moves are recorded inputs.
- 2026-10-20, Jerry asked that this stay facilitator friendly. Design response: the session runs on a prepared arc by default, so the DM's only required move is "next"; each turn the screen suggests the next move and shows the persona's lines to read aloud; levers are limited to three (heat up, cool down, swap dilemma); a rehearsal mode replays the session beforehand; a one-page printed DM card covers the flow.
- 2026-10-19, Jerry: retire the TypeScript CI jobs. CI now runs only the Rust engine job (tests, clippy, content validation, seed-42 determinism and replay). The TypeScript code stays in the repo, unchecked.

## Built so far (2026-10-20, branch `claude/nursing-leaders-session-paejj1`)

- Live mode, session profile (`RunConfig.ask`) and the browser build of the engine; spec amendments in `crucible/docs/ENGINE_SPEC.md`.
- `crucible/content/sessions/nursing-60.json`: a draft that asks each table four existing dilemmas (one Watch, two Landfall, one Recovery). These are the corporate-frame dilemmas, used until the nursing ones are written.
- `crucible/board/`: the offline live board on the Concordia art, published as a claude.ai Artifact. Four decision beats show all six tables' questions at once, because the engine accepts a table's choice before its dilemma appears; that keeps the room on one clock instead of ten separate pauses.
- Found while building: with the 12-card deck, the 24 drafted questions rarely test candor, courage, duty, integrity or respect, so tables that pick those see "not tested" in the debrief. The nursing dilemmas should be written to test the deck.
- Found while building: on the island art the dense city grid is in the north and the industrial district in the south, while the content puts Sterling (hospital, government) in the south and Summit (executives) in the north.

## Questions for Jerry

1. Conference date and room: how many tables, phones allowed, wifi?
2. ~~Input path~~ decided 2026-10-20: cards plus private vote. DM power decided 2026-10-20 (shapes questions, never consequences).
3. Content: reframe parishes around care sites as above, or keep the Meridian corporate frame?
4. The art places the city north and industry south; move the parishes to match the art, or keep the content positions?
5. Which 12 values go in the nursing deck? Candidates from `values.json`: safety, fairness, candor, courage, accountability, compassion, integrity, loyalty, stewardship, respect, honesty, duty.
