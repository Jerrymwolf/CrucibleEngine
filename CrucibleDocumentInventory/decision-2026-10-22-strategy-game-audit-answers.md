---
title: "Decision: answers to the strategy-game audit (storm turns, yields, tablet-first, meters, promises, goals, paper first)"
date: 2026-10-22
type: decision-record
status: accepted
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, design, rts, game-design, audit]
supersedes_in_part:
  - "[[design-2026-10-21-rts-godot]]"
  - "[[decision-2026-10-21-rts-flow-and-teams]]"
related:
  - "[[audit-2026-10-21-strategy-game]]"
  - "[[research-2026-10-22-godot-rts-starting-points]]"
  - "[[decision-2026-10-21-all-godot]]"
  - "[[framing-2026-10-21-audit-fixes]]"
---

# Decision: answers to the strategy-game audit

Jerry asked on 2026-10-21 to "audit the spec and plan based on how actually RTS games play like Civilization". The audit, [[audit-2026-10-21-strategy-game]], scored the spec 54/100 and the build plan 62/100. Jerry answered its decisions on cards and in messages in the thread "Audit fix spec and plan", from 2026-10-21 21:40 to 2026-10-22 09:56 UTC. [[design-2026-10-21-rts-godot]] is revised to match.

## 1. The clock: simultaneous storm turns

Chosen on a card on 2026-10-21 at 21:40. The Crucible is not real time.

- Every team plans at the same time for 60 to 90 seconds.
- Then the island plays out 3 storm hours on the wall while everyone watches.
- Units still move on the map and the storm still feels live, but each choice gets a real conversation.

A quarter of 14 minutes holds about 8 to 10 turns. The Crucible master (CM) sets the planning window.

## 2. Yields, with people as the workforce

Chosen on a card on 2026-10-22 at 09:45. This fixes the audit's biggest finding: resources only shrank, so a parish that did nothing won.

- Each storm turn, a parish earns resources from what is still working: assets that are staffed and undamaged, and people who are safe and able to work.
- Spending to save people costs now and pays back later. A neighbourhood evacuated in time returns to work in the Recovery quarter.
- "Most resources at the end wins" stays. The temptation to hoard stays, but doing nothing no longer wins.
- The balance gate (decision 7) proves it: across 1,000 seeded bot games, a do-nothing parish must never win.

## 3. Tablet-first; phones later; no assigned roles

Jerry: "I am unsure about connecting phones. It adds a whole layer of complexity to the operation, but it could be powerful as well." Chosen on a card on 2026-10-22 at 09:49: tablet-first, phones added later.

- **The first build runs on one tablet per team.** The tablet does everything, including team votes.
- **Phones come later as an optional layer.** If a phone drops, its role and vote fall back to the tablet. The network protocol plans for phones from day one, so adding them is not a rebuild.
- **Stand-ins until phones arrive:**
  - each person's values pick in the stance goes on a paper card;
  - each person's private debrief record is read through a QR code after the session.
- **No assigned roles.** Jerry: "Or don't complicate it with roles, and let the team work it out?" The team organizes itself around the tablet. Only the rotating rep who breaks ties stays (see [[decision-2026-10-21-rts-flow-and-teams]], item 14).
  - How each team organizes itself is material for the debrief.
  - The CM may hand out a printed card of suggested jobs; the game does not need it.

## 4. Two live meters, a news ticker and social reactions

Chosen on 2026-10-22 at 09:52. Jerry: "recommended, plus a running news report across the top of the screen reactive and generated from the choices people are making, generated social media reactions, etc to enhance realism".

- **Two meters per parish, shown on the tablet every turn.**
  - Community trust moves with how residents are treated. Low trust means volunteers stop coming, so yields drop.
  - Board confidence moves with how Meridian's assets are protected. Low confidence means corporate leaders lean on the Meridian team (see item 7).
  - The meters measure how stakeholders react, not values. Values stay hidden until the debrief, so the witness model holds.
- **A news ticker across the top of the wall, plus social media posts,** reacting to what teams actually do.
  - In the first build they are templates in the content JSON, filled from game events (for example, "Haven turns away Keystone's request for fuel"). They work offline and replay exactly.
  - Claude-written lines can come later through the reflexive issue engine (record on branch `claude/nursing-leaders-session-paejj1`), with the templates kept as the fallback.
  - The news reports facts and reactions only. It never names a value or judges a choice.

## 5. Promises between parishes: logged, tracked and reported

Chosen on a card on 2026-10-22 at 09:53.

- A team can type a promise on its tablet ("We'll send a fuel truck to Haven by hour 12"). The receiving parish confirms it.
- The engine watches whether the promise is kept, and never forces it.
- Kept and broken promises reach the news ticker and the receiving parish's community trust, and they come back in the debrief.
- Spoken promises that nobody logs leave no record.

## 6. Quarter goals and storm-prep projects

Chosen on a card on 2026-10-22 at 09:53.

- **Preparation projects in Q1**, such as sandbagging the port, pre-positioning fuel or opening a shelter. Each costs resources now and protects people and assets later.
- **One public goal per parish per quarter**, tied to the storm phase (for example, "keep the hospital powered through landfall"). Meeting it earns a yield bonus.

## 7. Projects, goals and pressure come from named leaders

Jerry, 2026-10-22 09:54: "Those projects and the pressure should be from local community leaders and corporate leaders."

- Each parish has a small cast of named leaders:
  - community leaders, such as an elder, a pastor or the mayor, speak to the community team;
  - Meridian executives, such as the regional VP or the CEO in Chicago, speak to the Meridian team.
- These leaders bring the prep projects and quarter goals as requests.
- When a meter drops, the same leaders press harder. Low trust brings the community leaders; low board confidence brings the corporate leaders.
- A push from one of these leaders counts as pressure from authority and can read as Capitulating (−2).
- The earlier rule still stands: the Meridian HQ team and Sterling's government can also apply pressure ([[decision-2026-10-21-rts-flow-and-teams]], item 15). Jerry may replace it with the leaders alone.

## 8. The build plan: paper first, then Godot

Chosen on a card on 2026-10-22 at 09:56.

1. **Phase 0: a printable paper prototype.** A hex map, tokens and a one-page rule sheet. Jerry runs it for about an hour with 4 to 6 people to feel the community-versus-Meridian conflict and test the new rules.
2. **Godot phases** start only after phase 0, building on the free Hex Strategy Map toolkit and Godot's WebSocket multiplayer, with Open RTS code borrowed where useful ([[research-2026-10-22-godot-rts-starting-points]]).
3. **A balance gate:** bots play 1,000 seeded games; doing nothing must never win.
4. **Phase 2 gate unchanged:** Jerry plays one parish for 10 minutes and decides go or no-go.
5. **Phones** move to a late, optional phase.

## Still open

- The centre parish's name.
- What happens to each person's commitment after the session (recommended: a reminder they save to their own calendar for 30 days later).
- Starting resources for each team, and yield rates; phase 0 and the balance gate will set first numbers.
- The cast of named leaders for each parish (content, Jerry's call).
- The v4 content pass on the `crucible-*-v3.md` drafts.
