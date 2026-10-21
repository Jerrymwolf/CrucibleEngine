---
type: audit
date: 2026-10-21
status: proposed
title: "Values Crucible: strategy-game audit"
related:
  - "[[design-2026-10-21-rts-godot]]"
  - "[[decision-2026-10-21-rts-flow-and-teams]]"
  - "[[decision-2026-10-21-all-godot]]"
tags: [crucible, audit, rts, game-design]
---

# Values Crucible: strategy-game audit

Written 2026-10-21 for Jerry. Live, editable version: [Values Crucible: strategy-game audit](https://claude.ai/artifact/97zrt5EbqM8R16RrS7gr6j). This file is a snapshot of it.

## Verdict

This audit checks the [[design-2026-10-21-rts-godot|RTS design]] and its build plan, as revised after the grilling on 2026-10-21, against how commercial strategy games actually play.

**The spec scores 54 out of 100, and the build plan scores 62 out of 100.**

The spec has the hard parts right: play happens on the map, the dilemmas come out of the map, consequences chain from one parish to the next, and the storm acts as a clock. What it lacks is what makes Civilization, Frostpunk and Crusader Kings hard to put down:

- an economy that grows;
- goals you can see yourself getting closer to;
- screens that tell you what needs you now and what a choice will cost before you make it;
- something for every player's hands to do.

The plan builds the right things in the right order. It never builds the economy on paper first, never tunes the balance, and puts the first real playtest last.

The five fixes that matter most:

1. **Give the island an economy that grows.** Each parish produces every turn, and its people are its workforce. Today resources only shrink, so the team that does nothing keeps the most and wins. With yields, saving people protects next turn's income, and "most resources wins" becomes a real strategy problem instead of a reward for hiding.
2. **Decide between real time and simultaneous turns.** Civilization's multiplayer runs on simultaneous turns with a turn timer, and that may suit 60 executives better than continuous real time. This is your call (card below).
3. **Give every person a role.** Six people around one tablet means one player and five spectators. Strategy games are one player, one empire. Roles on the phones (logistics, rescue, envoy, treasurer) put hands on the game.
4. **Add a "needs you now" queue and consequence previews.** Civilization always shows the next thing that needs a decision, and what each option will do before you commit.
5. **Add stakeholder meters.** Community trust and board confidence react to what a team does, the way Frostpunk's Hope and Discontent do. Teams get feedback during play from the story itself, without a values score.

## Civilization is not an RTS

This matters for the brief. Civilization is a **turn-based 4X** game: explore, expand, exploit, exterminate. Every player plans a turn, then the turn resolves. In multiplayer, all players take their turns at once under a turn timer. An **RTS** such as StarCraft or Age of Empires never stops: speed of hand matters, and players manage dozens of units by the second. That is the wrong skill to test in executives.

When you say "plays like Civilization", the likely meaning is the strategy-game feel: a map you read at a glance, an economy you grow, choices whose trade-offs you can see, and the pull of "one more turn". The Crucible should be judged against the games that deliver that feel and are closest to its subject, a society under a crisis clock.

| Game | Kind | What it teaches the Crucible |
| --- | --- | --- |
| Civilization VI and VII | Turn-based 4X | Yields shown on the map; a "next action" prompt; previews before you commit; deals on a trade screen; several ways to win. Gathering Storm adds disasters, floods and dams, and Civ VII adds crises at the end of each age |
| Frostpunk and Frostpunk 2 | City survival on a storm clock | People are the workforce; Hope and Discontent meters; laws with moral cost; a council of factions that votes, where promises made for votes are remembered |
| Crusader Kings III | Real-time with pause | Character traits as stated values; stress builds when a ruler acts against their traits; events offer choices tied to personality |
| Europa Universalis and other Paradox games | Real-time with pause | Speed controls and pause; event pop-ups with two or three options; a ledger and map modes (lenses) |
| StarCraft and Age of Empires | Classic RTS | Gather, build, expand; a minimap; control groups. Mostly what to avoid: speed of hand and constant unit control |

## Scorecard

The spec is scored on ten dimensions of strategy-game play, each out of 10 and weighted equally. Total: **54 out of 100**.

| Dimension | Score | Evidence from the spec | What the best games do |
| --- | --- | --- | --- |
| Play happens on the map | 8 | Units are ordered on roads, sea lanes and air routes, and the storm closes them | Civ: everything you do is a thing on a tile |
| An economy that grows | 3 | Resources only shrink: they are spent, lent or lost. Nothing is produced per turn, and nothing is built | Civ and RTS: gather, build, grow. Frostpunk: workers feed production |
| Goals and victory | 5 | One condition: most resources at the end. Doing nothing keeps the most | Civ: several victory types; Civ VII: milestones along legacy paths in each age |
| Information you can read | 5 | Route arrival times turn red; the counters are on screen; there are no yields, previews or map lenses | Civ: yields on tiles, combat previews, lenses; Paradox: map modes and a ledger |
| What needs me now | 4 | A moment banner and aid pings, with no single queue of pending decisions | Civ: the next-action prompt and a notification stack |
| Choices with visible trade-offs | 7 | Moments name two values and show the countdown and the cost of inaction | Frostpunk: laws show what they cost before you sign |
| Deals and diplomacy | 6 | Gift, loan or trade on the map; spoken promises are not tracked | Civ: a trade screen, and memory of broken promises; Frostpunk 2: votes traded for promises |
| Pacing and pull | 5 | Four quarters and three Mission briefs, with no short-term goals inside a quarter | Civ: something finishes every few turns. RTS campaigns: objectives per mission |
| Hands on the game | 3 | Six people share one tablet; the phones only vote | One player, one empire. Crew games such as Artemis give each person a station |
| Emergent story and consequence chains | 8 | Dam to Riverside, roads that close, moments that cannot fire once avoided | Civ Gathering Storm: floods and dams; Crusader Kings: stories that come out of the systems |

The build plan scores **62 out of 100**. It earns credit for its gated phases, the phase 2 go or no-go, deterministic tests and bot sessions. It loses points for:

- no paper prototype of the economy;
- no balance and tuning phase;
- a first human playtest that waits until phase 6.

## Findings and fixes for the spec

The findings are ranked by how much each one changes the game. Each fix keeps your decisions from the grilling intact unless the finding says otherwise.

### 1. Resources only shrink, so the team that does nothing wins

Today every resource can only be spent, lent or lost. Under "most resources wins", a team that parks everything somewhere safe and lets the storm decide finishes richest. Silence carries no value reading, so passivity costs it nothing. No strategy game works like this. In Civilization, every city produces every turn. In Frostpunk, your people are the workforce that keeps the city alive.

**Fix: yields.** Each parish produces every turn: kelp, doses, power, fuel, money. Production depends on two things:

- people who are safe and able to work;
- sites that still have power and crews.

Residents lost in the storm, a dark hospital or a flooded plant all cut the yield. Saving people then protects future income, and hoarding a generator while the plant goes dark costs more than it saves. "Most resources wins" stays, but it becomes a real strategy question. The temptation also gets sharper: helping another parish costs you now, and only sometimes pays you back later.

### 2. Continuous real time may be the wrong clock for 60 executives

Civilization's multiplayer runs on simultaneous turns: everyone plans at once under a turn timer, then the turn resolves for all. Paradox games and Frostpunk run in real time but can be paused, and players change speed. Pure real time rewards speed of hand, which is a different skill from leading.

**Options:**

- **(a) Keep real time.** Moments pause only their own parish.
- **(b) Simultaneous storm turns.** Each turn covers 3 storm hours and gives about 60 to 90 seconds to plan. Every team then watches its orders resolve together on the wall.
- **(c) Real time with a few freezes.** The CM freezes the whole island at each landfall moment.

Option (b) gives deliberation time inside the clock. It also makes a dramatic shared moment on the wall at each resolution, and it is simpler to keep deterministic. It still feels like a storm, because the timer never waits for anyone.

### 3. Six people, one tablet, five spectators

Every strategy game gives each player an empire to run. At 6 per team, one person drives and five watch. That is the fastest way to lose an executive's attention.

**Fix: roles on the phones,** as crew games like Artemis Spaceship Bridge Simulator give each player a station:

- **Commander:** drives the tablet.
- **Logistics:** fuel, generators and roads.
- **Rescue:** people at risk and shelters.
- **Envoy:** walks to other teams and makes deals on the phone's trade screen.
- **Treasurer:** standings and yields.
- **Rep:** breaks ties, and the role rotates each quarter.

Each role sees its own lens and can act within it. At 3 per team (Penn CLO), roles combine.

### 4. Nothing says what needs you now, or what a choice will cost

Civilization always shows the next decision waiting and previews outcomes before you commit. **Fix:**

- **A "needs you now" queue** on every tablet: moments, aid requests, idle units and routes about to close, oldest first.
- **A consequence preview** on every lever and big order, for example: "Open the gate now: Riverside floods in 3 hours, about 2,000 people at risk, the plant keeps power."
- **Map lenses:** people at risk, routes and time, and resources. One tap switches the map's colouring, like Civilization's lenses and Paradox's map modes.

### 5. Teams get no feedback from the world until the debrief

You decided to hide value readings during play, and this audit agrees. But strategy games always let the world react. Frostpunk shows Hope and Discontent. Civilization shows loyalty and amenities.

**Fix: two stakeholder meters per parish.**

- **Community trust,** which the community team must keep up.
- **Board confidence,** which the Meridian team must keep up.

Both move with what teams do, and both change play. Low trust means volunteers stop showing up, so the community team has fewer crews. Low confidence means HQ freezes the fund. This is the world reacting, not the engine judging values, so it fits the witness rule.

### 6. Promises are free and forgotten

You ruled that spoken promises are not enforced, and they should stay unenforced. But Civilization remembers broken promises, and in Frostpunk 2 a promise made for a council vote that you later break costs you that faction's trust.

**Fix: let a team log a promise on the map.** For example: "We'll send a tanker to the hospital by T-12h." The game never forces it. When the deadline passes, it shows whether the promise was kept, moves community trust or board confidence, and gives the debrief a clean piece of evidence.

### 7. No short goals inside a quarter

Civilization pulls you through with something finishing every few turns. RTS campaigns hand out objectives per mission, and Civ VII sets milestones along legacy paths.

**Fix: two or three objectives per team at each Mission brief,** with yields as rewards. For example: "Get two generators to the hospital before T-24h." Some objectives pull against the team's stated values, which is a natural way to make a moment cost something.

### 8. Q1 has nothing lasting to build

Civilization has a tech tree and a build queue. Frostpunk makes you build before the storm hits.

**Fix: preparation projects** that cost resources now and pay off later:

- sandbag Riverside;
- harden the hospital's power;
- pre-stage boats at the Mole;
- reinforce the dam's spillway.

This makes Q1 a real planning phase. It also sharpens the resource race: invest in prevention, or hoard.

### 9. The end screen is a crown, not a story

Civilization ends with graphs of every civilization's score over time and a timeline replay.

**Fix: the debrief's crown step shows two lines per team over the whole storm,** resources held and people safe, side by side. A team that won while its people line fell will see it without anyone saying a word.

## Findings and fixes for the build plan

Strategy studios find the fun on paper and in spreadsheets before they write the engine. Then they tune the balance with thousands of simulated games, and put the game in front of real players as early as they can. The plan's six gated phases are sound, but they skip those three habits.

| Finding | Why it matters | Fix |
| --- | --- | --- |
| No paper prototype | The economy, the yields and the win rule are untested ideas; code is the slowest way to find out they don't work | **New phase 0:** a tabletop version of one parish and one quarter, with tokens, a timer and a spreadsheet for yields, played by Jerry and 5 others in an afternoon |
| The clock is undecided | Real time and simultaneous turns need different host loops, screens and tests | Decide before phase 1 (card below) |
| No balance phase | Without tuning, one strategy, probably hoarding, dominates and the lesson collapses | **New phase between 3 and 4:** bot tournaments over 1,000 seeds, measured against targets: doing nothing never wins; the median team helps another parish at least twice; no parish wins more than a third of the time |
| The phase 2 gate tests feel, not the loop | "Feels like an RTS" can pass while the economy is broken | Gate on both: Jerry says it feels like a strategy game, and he can say what he is trying to grow, what threatens it, and what he would do next turn |
| The first human playtest is in phase 6 | Problems found by non-gamers at the end are the costliest to fix | A small group plays after phase 3, and again after phase 5 |
| Roles and phones arrive late | If phones become role stations, the phone page becomes a full client | Move the phone roles into phase 4's scope and its load test |

## What the design already gets right

- **The map is the game.** Orders go to units on roads, and the storm breaks the roads. That matches Civilization's rule that everything is a thing on a tile.
- **Dilemmas come out of the systems.** The dam at 94% floods Riverside, which fires Sterling's next moment. That is how Crusader Kings and Gathering Storm generate stories, and it is the hardest part to get right.
- **The storm is a clock.** Like Frostpunk's coming whiteout, it gives every decision a deadline nobody can argue with.
- **Values are named at the moment of choice, but never graded during play.** This is close to Crusader Kings, which shows when an option goes against a character's traits. Keeping readings hidden until the debrief is right for a learning game.
- **Two teams, one parish, owner decides.** This is a cleaner version of Frostpunk 2's council, where factions vote and trade support.
- **Deterministic replay.** The debrief replay works like Civilization's end-of-game timeline, and it doubles as the test suite.

## Decisions for Jerry, and sources

These come as cards, one at a time, each with a recommendation:

- [ ] **The clock:** real time, simultaneous storm turns, or real time with freezes. Recommended: simultaneous storm turns.
- [ ] **Yields:** parishes produce every turn and people are the workforce. Recommended: yes.
- [ ] **Roles on the phones** for every person. Recommended: yes.
- [ ] **Stakeholder meters:** community trust and board confidence. Recommended: yes.
- [ ] **Logged promises**, tracked but not enforced. Recommended: yes.
- [ ] **Objectives and preparation projects.** Recommended: yes, both.
- [ ] **Plan changes:** phase 0 on paper, a balance phase, earlier playtests. Recommended: yes.

Fixes 4 (the queue, previews and lenses) and 9 (the end graphs) are interface work with no design trade-off, so they go straight into the spec unless you object.

**Limits of this audit.** The comparisons come from published descriptions of these games and long-standing genre knowledge. Nothing here was measured on players. The scores are judgement against the ten dimensions above, not data.

**Sources:**

- [Civilization VII ages (CivFanatics)](https://civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-ages/)
- [Ages in Civilization VII (Civilization Wiki)](<https://civilization.fandom.com/wiki/Age_(Civ7)>)
- [Revolts, a Civ VII crisis (Civilization Wiki)](<https://civilization.fandom.com/wiki/Revolts_(Civ7)>)
- [Civ VI multiplayer turn modes (CivFanatics forum)](https://forums.civfanatics.com/threads/multiplayer-hybrid-and-sequential.571748)
- [Frostpunk 2's council (PCGamesN)](https://www.pcgamesn.com/frostpunk-2/council)
- [Frostpunk 2 laws and voting (Dexerto)](https://www.dexerto.com/gaming/frostpunk-2-council-best-laws-to-pass-first-2908202)
- [Crusader Kings III stress (Guild Order wiki)](https://guildorder.com/games/ck3/wiki/stress-and-ruler-lifespan)
- [How Crusader Kings III improves on its predecessor (bit-tech)](https://www.bit-tech.net/features/gaming/pc/how-crusader-kings-iii-improves-upon-its-predecessor/1)
