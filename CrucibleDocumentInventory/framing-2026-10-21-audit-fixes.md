---
type: framing
date: 2026-10-21
status: proposed
title: How we frame the audit's problems and fixes
related:
  - "[[decision-2026-10-21-audit-fix-spec]]"
  - "[[reference-2026-10-21-permission-and-pressure]]"
source: "Advisor panel audit, https://claude.ai/artifact/CNfhFiCekWbeof3o2CdfYH"
self_audit: "framing v2 52/100, framing v3 97/100"
tags: [crucible, framing, permission-and-pressure, eli5]
---

# How we frame the audit's problems and fixes

Jerry asked for a 1 to 100 audit of how the problems and fixes were framed, a
revision to 100, and a plain-language (ELI5) explanation of each choice. The
spec, [[decision-2026-10-21-audit-fix-spec]], says *what* to build. This note
says *why*, in one picture.

## 1. The reframe in one line

**The engine has been acting as a judge. It should act as a witness.**

The game's job is not to grade leaders. Its job is to put them under real
pressure, record what they did and why, and hand that record back so they can
see their own moment of faltering or striving. Every flaw the audit found is a
place where the engine judged when it should have witnessed, or where the
pressure was not real enough to be worth witnessing.

## 2. The chain the game has to complete

The lesson only lands if every link holds. A broken link anywhere means the
debrief has nothing true to show.

| Link | What must be true | Where it breaks today | Smallest fix that mends it |
|---|---|---|---|
| 1. **Stakes** | What a table does changes what happens to its people | Rescues run on a fixed schedule; people safe ends near 24,100 whatever tables do | Rescues depend on routes, boats and answers (S3.1); the wall shows the low point (S3.4) |
| 2. **Pressure** | Holding to a value costs more as the storm builds | Every window is about 180 s; coercion only lives in card text | Windows shrink to landfall (S6.1); off-board voices apply the four social forms live (S2.6) |
| 3. **Permission** | Each choice offers a reasonable voice to falter and one to strive | Cards carry both, but the Authority clause (a permission to strive) is hidden | Show the clause in play (D4); every card keeps both voices (S2.9) |
| 4. **Choice** | The hard option is genuinely hard, not obviously right | The hero option reads as obvious by quarter two; silence beats answering for three tables | Every option has a real cost in its text (S2.1, D3); the clock never earns virtue (S1.2, D1) |
| 5. **Witness** | The record says what the table chose, what the clock chose, and why | Storm defaults, cost-free moves and rejected moves all mint ratings; reasons are logged but hidden | Rate only chosen acts (S1.2 to S1.5); keep reasons with each moment (S1.6) |
| 6. **Reflection** | People own their moment before they compare | A signed score per table on the wall; secrets before ownership; the two questions missing | Private evidence first, then the two questions, then reveals (S4, D2, D7) |
| 7. **Commitment** | Each person leaves with one specific next move | A bare text box that is exported despite "private" | An if-then commitment that never leaves the phone (S4 step 8) |

## 3. What the earlier framing got wrong

1. **It named symptoms as the problem.** "The scoring rewards the wrong
   behavior" is a symptom. The cause is the engine acting as judge: it put a
   number on things no table chose (the clock, bookkeeping) and then ranked
   tables by the numbers.
2. **It treated consequences as a mechanics bug.** Converging counters are a
   learning problem. Without stakes there is no pressure, and without pressure
   there is nothing to falter under. Consequences are link 1 of the lesson,
   not a separate lens.
3. **It started from the audit's list, not from the learner.** The question
   to start from is what a nurse executive should walk out with: *the moment
   I faltered, what made it feel acceptable, what made holding firm costly,
   and what I will do next time.* Every fix is now traced to a link that
   serves that outcome.
4. **It mistook the deck problem for a numbers problem.** Ratings are hidden
   during play: tables see "storm decided" tags and their choices, and the
   mirror appears only on the after-action card
   (`board-rts/src/70-ui-table.js`). So tables learn the hero option from the
   *wording*, not the numbers. Recoding numbers makes the record honest;
   rewriting options so each one costs something makes the dilemma real. Both
   are needed (D3 re-asked).
5. **It under-used permission.** The dissertation's path runs through
   permission *and* pressure, but the spec mostly turned pressure dials.
   Permission now has its own link and requirement (S2.9).
6. **It framed the conference cut by build phases.** "Which phases ship" is a
   build question. The learner question is "what is the smallest version in
   which every link holds?" (D6 re-asked).
7. **It let the engine have the last word on meaning.** The dissertation codes
   behavior in context. A table that places its own hardest moment on the
   scale before seeing the engine's reading is doing the reflection the
   session exists for (D7, new).
8. **It used builder language.** Ticks, signals, schema and anchors are fine
   in the spec, not in the framing. Section 4 is in plain words.

## 4. The choices, explained simply

Each choice is a card in the thread. Recommended answer first.

**D1. When time runs out on a card, what goes in the record?**
Like a referee who blows the whistle when a player doesn't move: it's not a
foul, but everyone sees the player didn't move. *Recommended:* no rating, just
the label "the storm decided", and the debrief asks the table about it.
*Instead:* call it giving up (−2), or call it a small slip (−1).

**D2. What goes on the big screen at the end?**
A report card read out loud makes people defensive; a private one makes them
think. *Recommended:* the big screen shows what happened across the whole
room; each table sees its own record only on its own tablet. *Instead:* put
every table's record on the big screen (no scores), or keep today's red and
green bars.

**D3. How do we make hard choices actually hard?** *(re-asked)*
If one answer on a quiz is clearly the nice one, everyone picks it and nobody
learns. *Recommended:* rewrite the options so every one costs something real,
and re-rate them honestly, with most landing in the ordinary middle.
*Instead:* re-rate the numbers only, or change only the worst cases.

**D4. When do tables learn they're allowed to act?**
Telling someone "you could have gone through that door" only after the game
feels like a trick. *Recommended:* show the Authority clause during play.
*Instead:* reveal it in the debrief.

**D5. How should the clock feel through the storm?**
Like a storm: calm at first, frantic at landfall, a breath in recovery.
*Recommended:* about 3 minutes per card at prep, 2⅓ at approach, 1½ at
landfall, 2½ in recovery, and the DM's heat and cool nudge it by about 20 s.
*Instead:* tighter every quarter to the end, or flat unless the DM pushes.

**D6. What's the smallest version that still teaches?** *(re-asked)*
A bridge with one plank missing is not a shorter bridge; nobody gets across.
*Recommended:* first mend every link at a basic level (honest record,
rescues that depend on choices, landfall pressure, the new debrief, the worst
screen problems), then build out the rest as time allows. *Instead:* build
every phase in order, or fix the scoring only.

**D7. Who says what a moment meant?** *(new)*
A coach asks "how do you think that went?" before giving their view.
*Recommended:* each table picks its hardest moment and places it on the scale
first, then sees the engine's reading next to it. *Instead:* show the engine's
reading only, or show no scale at all, just what happened.

## 5. Self-audit of the framing

| Criterion | Points | v2 | v3 | What changed |
|---|---|---|---|---|
| Names root causes, not symptoms | 20 | 12 | 20 | Judge versus witness; consequences as a learning cause |
| One causal model ties the problems together | 15 | 5 | 15 | The seven-link chain; every fix mapped to a link |
| Starts from the learner's outcome | 15 | 6 | 15 | The walk-out outcome is the test every fix answers to |
| True to the dissertation's concepts | 15 | 10 | 12 | Permission gets its own link; context-based reading via D7. **−3 held back** until the definitions note can be checked word for word |
| Proportionate fixes; cheapest effective fix weighed | 15 | 8 | 15 | Wording versus numbers; minimum unbroken chain before full build |
| Choices are real trade-offs | 10 | 7 | 10 | D3 and D6 re-asked around the learner; D7 added |
| Plain language | 10 | 4 | 10 | ELI5 for every choice |
| **Total** | **100** | **52** | **97** | |

The last three points need the dissertation definitions note, which waits on
Jerry's card in the advisor thread.
