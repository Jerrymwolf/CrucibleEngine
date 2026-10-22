---
type: design
date: 2026-10-21
status: proposed (revised 2026-10-22 after the strategy-game audit)
title: "Values Crucible: RTS design"
related:
  - "[[decision-2026-10-21-all-godot]]"
  - "[[research-2026-10-21-game-engine-for-rts]]"
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[framing-2026-10-21-audit-fixes]]"
  - "[[2026-10-21-audit-fix-cut-b-build-log]]"
  - "[[decision-2026-10-21-reflexive-issue-engine]]"
  - "[[decision-2026-10-21-rts-flow-and-teams]]"
  - "[[audit-2026-10-21-strategy-game]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[research-2026-10-22-godot-rts-starting-points]]"
tags: [crucible, design, rts, godot]
---

# Values Crucible: RTS design

Written 2026-10-21 for Jerry, revised that evening after the flow and teams grilling, and again on 2026-10-22 after the strategy-game audit. Live, editable version: [Values Crucible: RTS design](https://claude.ai/artifact/YauQmeimoGG85FPkynmYBT). This file is a snapshot of it.

## Summary

The Values Crucible becomes a strategy game played in **storm turns**. Ten teams command the five parishes of Concordia through Hurricane Midas. In each parish, a **community team** speaks for the local people and a **Meridian team** speaks for the company's interests. Every crew, boat, tanker, ambulance and helicopter is a unit the team orders across a live island map. Each turn, all ten teams plan at once for 60 to 90 seconds, then the wall plays out the next storm hours while everyone watches. The dilemmas grow out of what is happening on the map: a reservoir climbing toward 94%, a fishing boat adrift as the eye opens, a terminal crowd while the last plane boards.

When a dilemma fires, it names the two values in tension (for example **COURAGE vs SAFETY**) and must be answered within the turn. Both teams in the parish vote on their tablets, and the team that owns the resources at stake decides. The team holding the most resources at the end wins. Resources grow when they are put to work, and people are part of the workforce, so saving people costs standing now and pays it back later. Hoarding is always tempting, but it is never safe. On values, the engine stays a witness, not a judge. It records what each team did against the stance it built at the start, and the debrief sets the winner's crown beside the people lost.

What changes from the card board:

- **You act on the map.** Teams order units along roads the storm is breaking. No A/B/C menus during play.
- **Values are named in the moment.** Each dilemma says which two values it tests, and where they sit in your team's ranking.
- **Dilemmas come from the map.** They fire from the state of the island and must be answered within the turn.
- **Two teams share each parish.** The community has breadth: many smaller resources. Meridian has depth: fewer, far bigger ones. Whoever owns the resource decides, and the other team's vote shows as advice.
- **The island talks back.** Two meters per parish show how the community and the board feel. Named community and corporate leaders make requests and apply pressure. A news ticker and social posts react to what teams do.
- **Reflection is built in.** A values stance up front, a Mission brief after each quarter, and a final debrief, in a 120-minute session the Crucible master (CM) can re-time.
- **Everything is in Godot** ([[decision-2026-10-21-all-godot|decision record]]), on one tablet per team. Phones come later, as an option.

Jerry set the flow, the teams and the five parishes in a grilling on 2026-10-21, recorded in [[decision-2026-10-21-rts-flow-and-teams|the flow and teams decision]]. He answered the strategy-game audit on 2026-10-21 and 2026-10-22, recorded in [[decision-2026-10-22-strategy-game-audit-answers|the audit answers]]. The decisions still open are in the last section, Risks and open questions.

## Why the card board failed, and the goals that follow

Jerry played the solo board on 2026-10-21 and called it "not an actual RTS", with values decisions that "are not clear" and dilemmas that "aren't real time". The four-advisor audit had already found that the engine read 57 of 96 card options as Capitulating, and that the debrief ran 22 to 25 minutes against 15.

The root cause is that the map was a display. Every decision lived in a menu, the values at stake were hidden until the debrief, and the clock only decided when the next card appeared.

The [[audit-2026-10-21-strategy-game|strategy-game audit]] then compared the first version of this design with Civilization, Frostpunk and Crusader Kings. It scored the spec 54/100 and the plan 62/100. Its biggest finding was that resources only shrank, so a parish that did nothing won. Its answers (storm turns, yields, meters, named leaders, promises, goals and a paper prototype) are folded in below.

| Goal | What it means in the game | How we will know |
| --- | --- | --- |
| A real strategy game | Teams order units on the map. All ten teams plan at once each turn, then the storm and every team's orders play out together | A first-time player issues an order in the practice turn, without help |
| Values clear at the moment | Each dilemma names its two values and shows where they sit in your team's ranking | After a dilemma, a player can say which values were in tension |
| Dilemmas from the map | Dilemmas fire from map state and must be answered within the turn; doing nothing is also a choice | No dilemma arrives without something on the map that caused it |
| A real cost to doing right | The team with the most resources at the end wins, so spending to save people costs standing now and pays back only through later yields | Teams argue about whether to spend, not only how |
| Doing nothing never wins | Resources grow only when they are put to work; idle units and people at risk earn nothing | Across 1,000 seeded bot games, a do-nothing parish never wins |
| Learning, not just playing | Four rounds of doing, reflecting and trying again: the stance, three Mission briefs, the debrief | Each team can name an intent it set and whether it held |
| Readable by executives | No combat, no fast clicking, about 8 units per team at most, plain words, large type | A non-gamer can explain the screen to a colleague after one quarter |
| Witness, not judge | The game shows resources, meters and news in the open, but never scores values during play | The debrief shows evidence; the room draws the conclusion |
| Pressure that is real | Named community and corporate leaders push, harder when their meter falls; Meridian HQ and Sterling's government push too | The debrief can name who pressed, with what authority, and whether the team complied |
| Survives the venue | Runs on the room's own network on one tablet per team; no internet and no phones needed | A full rehearsal runs on a travel router with the venue Wi-Fi off |

## The 120-minute session

The session runs 120 minutes by default:

- a 30-minute front end;
- 56 minutes of play in four 14-minute quarters;
- a 4-minute Mission brief after each of the first three quarters;
- a 22-minute final debrief.

The Crucible master sets every length in setup and can stretch or cut a Mission brief live. Each change is logged, so the replay still matches.

During play the island moves in **storm turns**. Each turn has two parts:

1. **Plan (60 to 90 seconds).** All ten teams plan at once on their tablets. They order units, answer any open moment, send or accept aid, and log promises. The storm is still.
2. **Play out (about 15 seconds).** The host resolves every team's orders together, and the wall plays out the next storm hours. Units move, water rises, routes close, yields come in, and the news reacts.

The island clock runs from T-72h to T+48h. A turn covers more storm hours when little is happening and fewer at landfall. The turn counts below are a first cut, to be set in the paper prototype. The CM sets the planning window.

| Segment | Real minutes | Storm time | Turns | What each team does |
| --- | --- | --- | --- | --- |
| Front end | 0 to 30 | Frozen at T-72h | 1 practice turn | Builds its values stance (below); meets its parish, residents, leaders and sealed brief; picks its first rep; plays a practice turn |
| Q1 Preparation | 30 to 44 | T-72h to T-36h | 9 turns of 4 storm hours | Picks the prep projects its leaders ask for; moves generators, fuel and crews while every road is open; first trades; the first moments fire |
| Mission brief 1 | 44 to 48 | Paused | None | Looks back, gets the next situation report and its quarter goal, sets an intent |
| Q2 Approach | 48 to 62 | T-36h to T-6h | 10 turns of 3 storm hours | Routes close one by one; the last plane, the four tankers and batch 47 compete for time; calls for aid cross the island |
| Mission brief 2 | 62 to 66 | Paused | None | As above |
| Q3 Landfall | 66 to 80 | T-6h to T+6h | 8 turns of 1.5 storm hours | No roads; units shelter or risk it; the eye opens for one turn; the hardest moments fire |
| Mission brief 3 | 80 to 84 | Paused | None | As above |
| Q4 Recovery | 84 to 98 | T+6h to T+48h | 8 turns of about 5 storm hours | Roads reopen; people go back to work and yields recover; who gets power and crews first; credit, blame and the statement |
| Debrief | 98 to 120 | Replay | None | The crown and its cost, me and us and what we did, intents and promises, permission and pressure, commitments |

The CM can also pause between turns for a teaching beat. A pause runs the session long by its length, and the CM console shows the running overrun.

### The front end: a values stance

The stance is built in three steps, about 20 minutes in all.

1. **Me.** Each person picks three values from the deck on a paper stance card (on their phone, once phones are added). They tell their team a 60-second story about a time one of them cost them something.
2. **Us.** The team agrees on three values.
3. **The trade-off.** The team ranks its three values for when they collide, and signs a one-line statement.

The CM tells the room why the game exists, but not how values are read: the island remembers what you do, not what you say; nothing about values is scored during play; we look at it together at the end. The seven anchors appear only in the debrief.

No step links the island to the players' own jobs. The scenario has to resonate on its own, through residents with names and faces and stakes that feel like leadership.

### Mission briefs

After Q1, Q2 and Q3, the storm pauses for 4 minutes.

- **Look back (1.5 minutes).** The tablet replays the team's quarter as facts only, and the standings show on the wall. One question asks about the ranked values, such as "Which of your three got quieter this quarter?"
- **Brief forward (2.5 minutes).** A situation report for the next quarter says what the storm will do and which routes close, and one of the team's leaders gives it the quarter goal. The team then writes one if-then intent, such as "When HQ pushes, we will name the cost out loud first." The intent is pinned to the tablet.

The next quarter marks when an intent is tested, and the debrief shows whether it held. The CM can edit the questions.

## The island as a strategy map

The board is the canon island of Concordia, north up, about 14 km across, drawn as a top-down map you can pan and pinch. Under the art the island is a hex grid, which gives units their paths and teams their fog. It has five parishes, four on the coast and one in the centre:

- **The centre** (name to be chosen). Heartland and Summit merged: Meridian HQ, the kelp works, and the dam with its reservoir, a Meridian asset built on the community's behalf.
- **Sterling**, the whole north tile. The capital, the hospital and the government.
- **Gateway.** The kelp harvest, the airport and the tourists.
- **Keystone.** The plant that makes the cure.
- **Haven.** The port.

Units travel on roads, sea lanes and air routes, and the storm closes them on the schedule in [[concordia-storm-quarters|Hurricane Midas in four quarters]]. The routes are where teams collide: two convoys on one road, or a tanker that has not climbed before the Gorge Road floods. The table is a first cut for the five-parish map, and gets fitted to the redrawn art in the v4 pass.

| Route | Links | Closes | Reopens |
| --- | --- | --- | --- |
| Haven to Keystone coast road | The port and the plant | T-24h, flooded at the surge creek | T+24h |
| South Switchbacks | Keystone to the centre; Caldera's only road out | T-18h, landslide | T+36h |
| Gateway to Sterling coast road | Gateway's people to the capital's shelters | T-18h, debris then water | T+24h |
| Gorge Road | Sterling to the centre, beside the river | T-12h, floods with the first release | T+12h |
| Sterling to Haven road | The capital and the port | T-6h, under surge | T+24h |
| River bridges | The centre and Sterling | If the spillway opens | T+12h, when the release ends |
| Runway at Gateway | The only fixed-wing link | T-24h, 45 mph | T+12h, one lane, medevac |
| Meridian helicopters | Air anywhere, 6 seats, based at HQ | Above 40 mph; open again in the eye | T+6h |
| Harbour departures | Ships out of Haven | T-30h | T+36h for the next consignment |

What the map shows:

- **Hazard zones grow and shrink.** Surge fills Haven's yard, Southfield and the Mole; the river and the spillway fill Riverside and the lower campus. Anything inside a hazard zone is at risk and the people counter shows it.
- **Wind bands sweep across.** Above 40 mph nothing flies; above 85 mph the cranes stand down; in the eye, everything at sea or in the air can move for one turn.
- **Fog is radio, not darkness.** A team sees its own parish's sites and units exactly. Other parishes' units are visible as icons, but their sites show only the last radio report. When the cell network fails at T-12h, reports from other parishes slow down.

## Units and orders

Each parish has two pools of units, and each team commands its own.

- **Community units have breadth:** many smaller things, such as boats, crews, ambulances, volunteers and shelters.
- **Meridian units have depth:** fewer, far bigger assets, such as helicopters, the generator fleet, the plant, the dam and money.

Units are the resource tokens of [[crucible-resource-tokens-v3|the v3 token draft]] turned into things that move: a GEN token is a generator on a truck, a FUEL token is a tanker. The table below is a first cut for Jerry to correct. The v4 content pass sets each team's starting units, what each is worth in the standings, and what each earns per turn.

| Parish | Community units and sites | Meridian units and sites |
| --- | --- | --- |
| Gateway | 3 rescue boats, 1 medic team, the Mole (fleet shelter), the Strand hotels (shelter) | The last plane and the runway, the kelp fleet, 1 generator, 1 tanker |
| The centre | 3 heavy crews, 1 water tanker, the dam shelter | The dam gate, the kelp works, 3 dam generators, 2 helicopters, the fund, HQ's hidden reserve |
| Keystone | 1 medic team (EMTs), the plant basement (shelter), Caldera's households | The clean rooms, the cold vault, the reefer convoy, 3 generators, 1 tanker |
| Haven | 1 longshore crew, the union hall (shelter) | 4 tankers (2 hidden), 2 tugs, the berth and the *Kestrel Reach*, the fuel terminal and Tank 3 |
| Sterling | 2 ambulance teams, 1 fire crew, 1 police boat, the hospital, the school shelters, the broadcast and the evacuation order | 2 generators, 1 tanker, the Meridian office tower |

Orders a team can give its own units:

1. **Move.** Tap a unit, tap a place. The route shows how many turns it takes, and turns red if the storm will close it first.
2. **Deliver.** Send a generator, tanker or crew to a site, yours or another parish's. Arriving there hands it over.
3. **Rescue.** Send a boat, truck or helicopter to people in a hazard zone; it picks up as many as it holds and brings them to the nearest open shelter.
4. **Clear.** Send a crew to a blocked road; it reopens after a set number of turns if the wind allows.
5. **Hold.** Park a unit somewhere safe. A unit left in a hazard zone can be damaged or lost, with its crew counted at risk.
6. **Pull a lever.** Tap a site and choose its action, such as "open the gate at 94%" or "sail with what is aboard". Levers are where most dilemmas land.
7. **Start a project.** Tap a project a leader has asked for and assign the units and resources it needs. It finishes after a set number of turns.

Orders are given in the planning window and carried out in the play-out, for every team at once. A unit keeps following its last order across turns, so a team spends its time deciding, not steering. Each team works on its own tablet. Both tablets in a parish show the whole parish and every unit in it, but a team can order only the units it owns. Tapping the other team's unit offers to ask for it. Nobody is assigned a role: each team organizes itself around its tablet, and the rep breaks ties.

## Needs, people and resources

The island keeps the two counters from canon v3, always on screen: **doses shipped** (starts at 0; the world needs 170,000 this week) and **people safe** (starts at 24,100). Every order a team gives moves one counter or the other, and often both in opposite directions. That is the engine of every dilemma.

**People are on the map.** Each population at risk is a marker with a headcount and a face from [[crucible-residents-v3|the resident cards]]: Riverside's 2,000 under the gorge, Southfield's Block C, the 300 in Gateway's terminal, Caldera's 140 households, the two-man watch on the *Pacific Harvester*. When a hazard zone reaches a marker, its people leave the safe count. They come back when a unit brings them to a shelter with room. They do not come back if they are lost.

**Doses are a chain you can see.** Kelp trucks run from Gateway to the centre's works, concentrate runs to Keystone, the reefer convoy runs doses to Haven's berth. This runs by itself while roads, power and crews hold. Each break shows on the map as a stalled link. Doses count as shipped only when the *Kestrel Reach* sails with them aboard. Nothing ships by itself, which closes the round-2 audit gap where doses shipped automatically and hoarding could win.

**Shelter is a capacity, not a token.** Every shelter shows places left (Sterling's schools 2,400, Gateway's Strand 2,000 when opened, Haven's union hall 800, Keystone's basement 400, the centre's dam 300, and Meridian HQ's bunker 500, which opens only if the centre's Meridian team opens it). A full shelter turns a rescue away. An unopened one is a choice.

**Yields: resources grow when they work.** At the end of every turn, each team earns resources from what is still working: staffed, undamaged assets, such as a running plant, a fleet safe in port or an open clinic, and its people who are safe and able to work. People are the workforce. A neighbourhood evacuated in time goes back to work in Recovery; one that was lost does not. So spending to save people costs standing now and pays back later. An idle unit or people left at risk earn nothing, and doing nothing never wins. Yield rates are set in the paper prototype and checked by the balance gate.

**Two meters per parish.** Each tablet shows its parish's two meters every turn.

- **Community trust** moves with how residents are treated: people rescued or left behind, shelters opened or kept shut, promises kept or broken. Low trust means volunteers stop coming, so community yields drop.
- **Board confidence** moves with how Meridian's assets and output are protected: doses shipped, and the plant and fleet kept safe. Low confidence brings Meridian's leaders down on the Meridian team.

The meters show how stakeholders react, not values. Values stay hidden until the debrief.

**Named leaders.** Each parish has a small cast of named leaders. Community leaders, such as an elder, a pastor or the mayor, speak to the community team. Meridian executives, such as the regional VP or the CEO in Chicago, speak to the Meridian team. Leaders bring the prep projects and the quarter goals as requests, and when their meter falls they press harder. The cast for each parish is content, for Jerry to write in the v4 pass.

**Prep projects and quarter goals.**

- In Q1, leaders ask for preparation projects, such as sandbagging the port, pre-positioning fuel or opening a shelter. A project costs resources now and protects people and assets later.
- Each quarter, each parish gets one public goal from its leaders, tied to the storm phase, such as "keep the hospital powered through landfall". Meeting it earns a yield bonus.

**Keep, give, lend or trade.** Sending a generator to another parish means a truck leaves and drives there, and every team can see it go. When it sends, the owner picks one of three:

- **Gift:** it leaves your standing for good and joins theirs.
- **Loan:** it comes back after the need passes, if the storm spares it.
- **Trade:** an offer on the map, such as "our generator for your tanker". When the other side accepts, both move together.

**Promises are logged.** A team can type a promise on its tablet, such as "We'll send a fuel truck to Haven by hour 12", and the receiving parish confirms it. The engine watches whether it is kept, and never forces it. Kept and broken promises reach the news ticker and the receiving parish's community trust, and they come back in the debrief. Spoken promises that nobody logs leave no record. Haven's two hidden tankers and HQ's reserve stay off the map until revealed, and revealing them is logged.

**Most resources wins.** Every resource has a value, and the team holding the most at the end of Q4 wins. The standings show live on the wall and again at each Mission brief. Resources used up saving people, such as fuel burned, doses given or a boat lost in the eye, are gone, and only yields replace them. That is the designed temptation: helping costs standing, and hoarding is always on offer, but a parish that only hoards earns little. The debrief puts the people lost beside the winner's crown. How doses, money and people count toward standing is set in the v4 content pass.

## Moments from the map

A dilemma is now a **moment**: something on the map reaches a point where a parish must choose, and two of its values pull opposite ways. The 24 dilemmas in [[crucible-dilemmas-v3|the v3 dilemma draft]] become 24 moments, about five per parish once the v4 pass refits them, keeping their stories, personas and consequences. What changes is how they arrive and how they are answered.

```mermaid
flowchart LR
  A[Map changes<br/>storm, routes, other teams, your units] --> B[Moment fires<br/>two values named, answer this turn]
  B --> C[Teams act<br/>both teams vote, the owner orders]
  C --> D[Turn plays out<br/>engine reads what the units did]
  D --> E[Logged<br/>for the debrief, no value score shown]
  E -. what happened changes the map, and the next moment .-> A
  P([leaders and authority push here]) -.-> B
```

A moment opens from the map and closes back into it. What the units did becomes the state that fires the next moment, for this team or another.

**How a moment fires.** Each moment has a trigger written as a map condition, not a time. The engine checks triggers at the end of every play-out, so a moment opens at the start of the next planning window. The reservoir reaching 94% fires the centre's gate moment, whenever that happens. If the centre's Meridian team sent its generators away and the dam's controls are on one unit, it fires earlier. A moment that cannot happen does not fire: if Gateway brought the *Pacific Harvester* in before T-36h, there is no boat adrift in the eye.

**What both teams see.** A banner across the top of both tablets in the parish, and the map zooms to the place:

- the two values in tension, in large type: **COURAGE vs SAFETY**;
- where each value sits in each team's ranking, if it is one of its three;
- who decides: which team owns the resources at stake;
- the persona's line, read aloud by the CM if they choose (Rosa Mendez: "I'm asking you, not telling you. That's new for me.");
- any push that is under way, and from whom (the regional VP: "Hold the ship for batch 47.");
- the deadline: this turn, or two turns for the biggest moments, and what happens if nobody acts.

**How a parish answers.** Each team votes on its tablet for the move it would make. Without phones, the team votes by show of hands and whoever holds the tablet enters the count. Both teams' votes show on both tablets.

- **Who decides.** The team that owns the resources at stake decides and sends the units. The other team's vote is advice.
- **Moments that need both.** If a moment needs both kinds of resource, each team decides its own part.
- **Ties.** A tied vote inside a team goes to that quarter's rep. The role passes to someone new each quarter.

Tapping a suggested move selects the units, and the team still sends them. A team can also do something no suggestion named, and the engine reads that too. When the turn plays out, whatever the units are doing is the answer. Doing nothing is recorded as "the storm decided" and carries no value reading.

**Votes stay private.** The tablets show vote counts, never names. When phones are added, each person votes privately, and in the debrief their own phone shows their stance, their votes and the moments where their team went the other way. Until then, a person's record is their own stance card beside their team's moves, which they can open by QR code after the session.

| Moment | Fires when | Values | Who decides |
| --- | --- | --- | --- |
| The *Harvester* in the eye (Gateway) | The *Harvester* is adrift and the eye opens | Courage vs safety | The community, on where its boats go; Meridian, on whether its helicopter flies |
| 94, 97, 99 (the centre) | The reservoir reaches 94% | Courage vs duty | Meridian owns the dam gate; the community decides whether to clear Riverside first |
| The last plane (Gateway) | 45 seats are left and more than 45 people are in the terminal | Fairness vs loyalty | Meridian, which owns the plane |
| Southfield (Keystone) | Block C floods while the skeleton crew holds the clean rooms | Respect vs duty | Meridian, on the clean rooms and the reefer convoy; the community, on its medics and the basement shelter |
| Four tankers (Haven) | Tankers are idle at the terminal and more than two parishes have asked for fuel | Honesty vs stewardship | Meridian, which owns the tankers |
| A call for aid (any) | Another team asks for a unit you hold | Set by the request, such as loyalty vs compassion | The owner, as a gift, a loan or a trade |
| A push from authority (any) | A named leader, Meridian HQ or Sterling's government pushes a team | Set by the push | The team pushed; this counts as pressure |

Moments chain. The water from the centre's dam gate is the water in Riverside when Sterling's "thirty officers" moment fires. What one team did a turn ago changes what the next team faces.

## Reading values from actions

The engine is a witness. It reads what a team did, never what it said it would do, and it places each moment on the dissertation's seven anchors. It never places a person or a team. The rules from the audit fixes (cut A and cut B) carry over unchanged.

| Anchor | Reading | In the game |
| --- | --- | --- |
| +3 | Heroic | A costly act for others, against pressure, with your own people at risk |
| +2 | Exemplifying | Serving a value at a real cost to your parish |
| +1 | Striving | Serving a value when it costs you little |
| 0 | Minimum Organizational Expectations | Doing what the role requires, and no more |
| -1 | Faltering | Letting a value slip with no one pushing |
| -2 | Capitulating | Giving way to a named pressure (only ever read where a pressure voice was active) |
| -3 | Villainous | Harming others for your own gain, knowingly |

**How a moment is read.** Each moment's content lists outcome rules, for example "two or more boats reached the *Harvester* before T+1:30". When the deadline turn plays out, the engine matches the units' actual state to a rule and records one reading per value tested. Moves outside the moment are read by standing rules, such as sending a generator another parish needs before you do, keeping a tanker nobody else needs, or revealing hidden stock.

**Rules kept from the audit fixes:**

- One reading per value per moment: the strongest signal, with ties going negative.
- Silence when the deadline passes is "the storm decided" and carries no reading.
- **Pressure comes from authority.** Pressure means a push from someone with authority over the team: one of its named leaders, Meridian HQ on a Meridian team, Sterling's government on a community, or a scripted voice from off the map. A push between peer teams is logged as persuasion, not pressure. Capitulating (−2) is read only under pressure.
- Complying with a coercer reads 0 at most on the value the coercer invokes.
- A send that costs the sender nothing it needs reads Striving (+1) at most. A gift, a loan and a trade cost different amounts, and the kind of send is part of the reading.
- Each team is read only on the decisions it owned. The rep's tie-breaks are logged.
- A move the engine refused says why on screen and is not read.

**During play, no value scores.** The resource standings, the meters and the news are public, because they are the game. Value readings are not. When a moment closes, the tablet shows one plain line of fact, such as "Logged: three boats went to Southfield; the *Harvester* waits for the sky." Readings appear only in the debrief, after each team has placed its own hardest moment on the scale first (decision D7). Whether to also show which value a move served, at the moment it happens, is an open question for Jerry.

**What is logged.**

- every order, with the turn it applies on;
- the state of the map when each moment fired;
- each team's vote and which team decided (and each person's vote, once phones are added);
- each rep's tie-breaks;
- every gift, loan and trade;
- every logged promise, and whether it was kept;
- both meters, every turn;
- every push, with its authority, and any permission the CM gave;
- every news line and social post shown;
- each Mission brief intent;
- every timing change the CM made;
- the seed.

That is enough to replay the whole session exactly.

## Ten teams, one island

Ten teams play on one shared island at the same time: a community team and a Meridian team in each of the five parishes. At the nurses session (about 60 people) that is 6 per team. At Penn CLO in March 2027 (about 30 people) it is 3 per team. No team can win alone. Each parish holds links the others need, and each team in a parish needs the other team's resources.

- **Two teams, one parish.** Both teams see the whole parish and vote on every moment, and the owner of the resources at stake decides. The community's breadth meets Meridian's depth, and the back-and-forth between them is the point.
- **Authority has faces.** Named community leaders and Meridian executives push their own teams, and push harder when their meter falls. Meridian HQ, the centre's Meridian team, can order the other four Meridian teams. Sterling's government can order communities, for example with the evacuation order or a curfew. All of these count as pressure. Scripted voices from off the map, such as the board in Chicago or Marcus Webb, still push too.
- **Calls for aid are pings on the map.** A team taps a place and asks for a kind of unit, such as "a generator to the hospital", with one line of reason. The ping appears on every map and flashes on the tablets of teams that hold that kind of unit. Answering means sending a unit as a gift, a loan or a trade. Arrival depends on the route still being open, as in [[crucible-calls-for-aid-v3|the calls-for-aid draft]].
- **Everyone sees the units move.** A tanker leaving Haven, or HQ's helicopters parked while Sterling's hospital pings, shows on every tablet and on the wall. Keeping is as public as giving.
- **The news reacts.** A ticker across the top of the wall and a feed of social posts report what teams did and how people reacted, such as "Haven turns away Keystone's request for fuel." In the first build these are templates in the content files, filled from game events, so they work offline and replay exactly. Claude-written lines can come later through the reflexive issue engine, with the templates kept as the fallback. The news never names a value or judges a choice.
- **Talk is free, and promises are logged.** Teams can walk over and negotiate. Trades made on the map are enforced. Promises are not, but a logged promise is watched, and keeping or breaking it makes the news.
- **Roads are shared.** The Switchbacks and the river bridges carry one convoy at a time, so two teams that both need the Gorge Road in the same turn have to sort out who goes first.
- **Empty seats are filled by bots.** A missing team is run by a bot that plays its side's interest by the book: a Meridian bot preserves resources, and a community bot spends them on people. A team that joins later takes over from its bot.

## The Crucible master

The facilitator, the Crucible master (CM), runs the room from a laptop that also hosts the game. The CM shapes the experience but never overrides an outcome: the engine decides what the storm and the units do.

| Lever | What it does | Logged |
| --- | --- | --- |
| Set the clock | Sets every segment length and the planning window in setup; stretches or cuts a Mission brief live | Yes |
| Edit the questions | Changes the stance prompts and the Mission brief questions | Yes |
| Pause and resume | Holds the game between turns for a teaching beat; tablets show "Paused by the Crucible master" | Yes |
| Heat and cool | Moves the storm's intensity curve up or down a step, which shortens or lengthens the planning window by about 15 seconds | Yes |
| Voice a persona or leader | Reads a persona's or leader's line into a moment (Rosa Mendez, Yuki Tanaka, Frank Reeves) | Yes |
| Send pressure | Fires a scripted message from a leader or from off the map at one team, such as the board in Chicago demanding the ship sail | Yes, as pressure |
| Give permission | Tells a team, in the voice of authority, that it may break a rule ("You have the Governor's cover") | Yes, as permission |
| Hold a headline | Holds or rewords a news line before it shows | Yes |
| Flag a moment | Marks a moment for the debrief | Yes |
| Fill a seat | Hands an empty or stuck team to a bot, or back to people | Yes |

The CM screen shows all five parishes and ten teams at once: each parish's open moments, both teams' votes, the units, the meters, open calls for aid and promises, the standings, the news queue, and the running clock against 120 minutes. A one-page run card covers the session for a CM who has never seen the game. A rehearsal mode runs all ten teams with bots at high speed, so the CM can practise in 5 minutes.

## The debrief

The final debrief is 22 minutes, stepped by the CM and built on a replay of the island. Much of the reflecting has already happened in the Mission briefs, so the debrief ties them together.

1. **The storm again, and the crown (4 minutes).** The wall replays T-72h to T+48h in about 90 seconds. Then come the final standings: the winning team is crowned, and beside the crown the wall shows the people lost across the island.
2. **Place your hardest moment (3 minutes).** Each team places its own hardest moment on the seven anchors before seeing the engine's reading.
3. **Me, us, and what we did (6 minutes).** Each tablet shows the team's ranked stance beside what its moves read, moment by moment. Each person holds it against their own stance card.
4. **Intents and promises (3 minutes).** Each team sees its three Mission brief intents and its logged promises, and whether each one held.
5. **Permission and pressure (4 minutes).** For each moment where authority pushed or gave permission, the team sees what it did and the question "What would it have taken to say it out loud?" The wall shows only the room's pattern by kind of pressure.
6. **Commit (2 minutes).** Each person writes a private if-then commitment on the back of their stance card (on their phone, once phones are added). What happens to it after the session is an open question.

Nothing in the debrief ranks teams on values. A team's record stays on its tablet, a person's record stays with them, and the wall shows patterns across the room. The only ranking is the resource crown, and the debrief puts its cost right beside it.

## Screens

Three screens in the first build, and a fourth later. Every screen is built for a reader who has never played a strategy game: large type, plain words, one thing asking for attention at a time.

| Screen | Device | Who | What it shows |
| --- | --- | --- | --- |
| Team | One tablet per team (ten in all), landscape, about 11 inches | The team, organizing itself | The island centred on its parish; its own units and the other team's; the planning timer; the moment banner with the two values, the ranking and the deadline; both teams' votes; both meters; its leaders' requests, projects and quarter goal; its pinned intent; calls for aid and promises; the standings |
| Wall | Projector, 1080p | The whole room | The whole island, every unit moving as each turn plays out, the storm, routes closing, the counters, the live standings, the news ticker across the top and a feed of social posts, and the room's pattern in the debrief; never a team's or a person's record |
| Crucible master | Laptop, also the host | The CM | All five parishes and ten teams at a glance: moments, votes, meters, levers, the news queue, persona and leader lines to read, the clock, the run card |
| Phone (later, optional) | Each participant's own phone, in the browser | One person | Their stance picks, a private vote on each moment, their own record in the debrief, and their private commitment. If a phone drops, its vote falls back to the tablet |

Readability rules for executives:

- Text is at least 22 px on the wall and 16 px on the tablet; values in a moment banner are the largest words on the screen.
- Colour always means the same thing: a parish's colour for its units, red only for danger, the accent only for the current moment.
- No numbers the team cannot act on, apart from the standings and the two meters. A unit shows where it is going and when it will arrive; a site shows what it holds and what it needs.
- Every tap gives a visible result within half a second, and a refused order says why in words.

## Technical design in Godot

One Godot 4.7 project, written in GDScript, builds every screen. The facilitator's laptop is the single source of truth. It resolves every turn, and every other device draws what it sends.

```mermaid
flowchart LR
  subgraph H[Host laptop + CM console]
    S[Simulation<br/>storm turns, one seed, whole numbers]
    K[Content as data<br/>units, moments, leaders, news, rules]
    L[Run log<br/>every order and vote, replayable]
  end
  H <-->|orders in, each turn out| R[Travel router<br/>room network, no internet]
  R <--> T[Ten team tablets<br/>orders out, state in]
  R --> W[Wall projector<br/>island, standings, news]
  R -.-> Ph[Phones, later<br/>optional; fall back to tablets]
```

Only the host decides anything. Tablets (and later phones) send orders and votes in, and get the island's state back, so a dropped tablet loses nothing.

**Determinism.**

- The host resolves each turn's play-out in fixed steps of one storm minute, with every team's orders applied together in a fixed order. Positions are hexes and whole metres, time is whole storm minutes, and all rules use whole numbers.
- One seeded random generator lives on the host, and only the host draws from it.
- No physics engine decides an outcome. Units follow the hex and road graph, not collisions.
- Every order is stamped with the turn it applies on, and the host hashes the state at the end of every turn. The same seed and the same orders give the same game, and a replay must reproduce the final hash.

**Built on.** The map grid, pathfinding and fog come from the free, MIT-licensed Hex Strategy Map toolkit. Camera, selection and minimap code is borrowed from Open RTS where it helps ([[research-2026-10-22-godot-rts-starting-points|research note]]). The storm, the two-team rules, yields, meters, promises, the news, the readings and the debrief are ours to write.

**Networking without venue Wi-Fi.**

- The facilitator brings a travel router. Every device joins its network; no internet is used.
- Godot's built-in multiplayer runs over WebSockets, so native apps and browsers can join the same game.
- Tablets send orders during planning and receive the state as each turn plays out, drawing smooth motion between updates. A tablet that drops reconnects and resumes from the current turn.

**Devices.** The simplest path for the conference is the web build: the host serves it on the room's network and every tablet opens one address in its browser, with nothing to install. Phones join the same way when they are added. Godot's single-threaded web export (the default since 4.3) needs no special server settings. Native iPad and Android apps come later from the same project, since an iPad app needs Apple signing from a Mac.

**Testing.** Godot runs headless in the cloud workspace, which was verified on 2026-10-21. Each change runs:

- unit tests on the rules;
- a determinism test, running the same seed and orders twice and comparing hashes;
- a golden replay;
- a full bot session of all ten teams at high speed;
- a balance tournament, in which bots play 1,000 seeded games and a do-nothing parish must never win;
- screenshots of each screen at key moments.

Frame rate on a real classroom tablet is measured by hand at each milestone, because nothing in the cloud can stand in for one.

## What carries over

Most of the work so far is story, research and rules, and almost all of it carries over. What does not carry over is the card loop and the code that runs it.

| Carries over | From | How it is used |
| --- | --- | --- |
| The world: parishes, routes, populations, personas | `concordia-parishes-v3.md`, `concordia-storm-quarters.md` | The map, the route schedule, the persona lines |
| 24 dilemmas with options, signals and consequences | `crucible-dilemmas-v3.md` | Rewritten as 24 moments with triggers and outcome rules |
| Residents, secret briefs, tokens, calls for aid | The other `crucible-*-v3.md` drafts | People markers, sealed briefs, units, aid pings |
| Values deck (40 values), seven anchors, permission and pressure | `crucible/content/values.json`, the dissertation | The stance card, the debrief scale, pressure logging |
| Audit rules (cut A and cut B) | The two build logs | Reading rules, unchanged |
| Session shape, debrief steps, CM levers | `values-crucible-session-90.md`, the cut A debrief | Session clock, debrief, CM console (reworked for 120 minutes and Mission briefs) |
| Island art | `crucible/board/concordia-1400.jpg` | The map's base layer, redrawn at higher resolution for the wall |
| Hex Strategy Map (free) and Open RTS | The research note of 2026-10-22 | Map grid, pathfinding and fog; camera, selection and minimap |
| Rust engine and board code | `crucible/` | Reference only, until Godot matches it; then retired |

The content files in `crucible/content/*.json` were never converted to v3. They are converted once, straight into the Godot project's data folder, rather than twice.

Canon v3 had six parishes and one table per parish. [[decision-2026-10-21-rts-flow-and-teams|The flow and teams decision]] cuts it to five parishes with two teams each. The v3 drafts therefore need one v4 pass, covering the merged centre parish, Sterling as the capital, each team's units, and the 24 dilemmas rewritten for two teams, before they become moments. The audit answers add more for that pass: each parish's named leaders, the prep projects and quarter goals, the news and social templates, and yield rates.

## Build plan

The build now starts on paper. Phase 0 tests the new rules with people before any Godot code is written. Each later phase ends in a gate that can be checked rather than argued. Phase 2 is the first time Jerry plays anything on screen, and it is the go or no-go for the whole direction.

| Phase | What gets built | Gate |
| --- | --- | --- |
| 0. Paper prototype | Printed hex map, tokens and a one-page rule sheet; Jerry runs it for an hour with 4 to 6 people | The community-vs-Meridian conflict feels real, and the new rules survive an hour of play |
| 1. Foundations | Godot project on the hex toolkit, storm turns, units, yields, meters, run log, bots | Same seed twice gives the same hash; in 1,000 bot games, doing nothing never wins |
| 2. One parish you can play | One parish with both teams, storm, routes, 4 moments, leaders and meters; bots run the rest | Jerry plays 10 minutes and says it feels like a real strategy game |
| 3. The whole island | All five parishes and ten teams, 24 moments, aid, promises, news, goals, standings, readings | A full bot session runs clean, every reading rule has a test, the balance gate still holds |
| 4. The room | Ten team tablets, the wall with its news ticker, and the CM console on the room's own network | Ten tablets play a full session on a travel router with the venue Wi-Fi off |
| 5. The debrief | Replay and the crown, your hardest moment, me and us and what we did, intents, promises, pressure | The debrief fits in 22 minutes in a timed rehearsal |
| 6. Playtest and polish | A group of non-gamers plays the full 120 minutes; fix what they trip on | The group plays start to finish without help from the builder |
| 7. Phones (later, optional) | Stance, private votes and each person's record on their own phone, falling back to the tablet | 60 phones load-tested on the router; pulling a phone never stalls a turn |

How long each phase takes depends on the conference date, which is still open. The order does not: nothing is coded before the paper prototype plays, and nothing networked is built before one parish plays well on one screen.

## Risks and open questions

The biggest risk is that a strategy game buries the reflection it exists for: teams busy managing units have no time to argue about values. Storm turns answer most of it, since every turn starts with a pause to plan. The design also keeps few units, orders that carry across turns, and a Mission brief after every quarter. The paper prototype and phase 2 test it before much is built.

| Risk | Why it matters | Fallback |
| --- | --- | --- |
| Too busy to reflect | The point is the values conversation, not the clicking | A planning pause every turn, few units, orders that carry across turns, three Mission briefs, a CM pause between any turns |
| Winning teaches hoarding | A public resource race could reward the opposite of the lesson | Yields make care pay back later; the balance gate proves a do-nothing parish never wins; the crown is always shown beside the people lost |
| One team in a parish dominates | The other team stops voting and the tension dies | The owner rule splits real power both ways; the rotating rep; each team's own leaders and meter; the CM can voice the quieter side's residents |
| Too much to read | Meters, leaders, news, goals and promises crowd the tablet | One thing asks for attention at a time; the news lives on the wall, not the tablet; the paper prototype shows what can go |
| Turns feel like a board game | The storm stops feeling live | A play-out on the wall every turn, a planning timer the CM can shorten, the heat lever |
| Executives who do not play games freeze | A team that cannot act learns nothing | The practice turn, suggested moves on every moment, a CM who can drive for a team |
| Tablets too slow for the map | A stuttering map reads as broken | The compatibility renderer, fewer effects, frame rate measured on the real tablet at every phase |
| Venue network trouble | The session dies with the Wi-Fi | Own travel router; only ten tablets in the first build; tablets reconnect and resume the current turn; the host keeps the clock |
| Phones overload the router later | Votes arrive late and turns stall | Phones are optional and fall back to the tablet; a load test with 60 phones before they ship |
| Readings feel like grades | The witness model fails if teams feel judged | No value scores during play; one reading per moment; each team places its own moment first |
| The news reads as a verdict | A headline can sound like judgment | News reports facts and reactions only; Jerry reviews the templates; the CM can hold any line |
| Rebuild takes longer than the conference allows | No game on the day | The conference date sets the scope; the card board still runs as a fallback |

Decisions for Jerry. Each will come as a card with a recommendation:

- [x] **The flow, teams and map.** The flow, stance, Mission briefs, 120-minute default, two teams per parish, owner decides, most resources wins, gift, loan or trade, rotating reps, pressure from authority, and five parishes were all decided on 2026-10-21. See the flow and teams decision.
- [x] **The strategy-game audit.** Storm turns, yields with people as the workforce, tablet-first with phones later and no assigned roles, two live meters, a news ticker and social posts, logged promises, quarter goals and prep projects from named leaders, and paper first were decided on 2026-10-21 and 2026-10-22. See the audit answers.
- [x] **Where the code starts.** The free hex map toolkit and Godot's WebSocket multiplayer, borrowing Open RTS code where it helps (2026-10-22).
- [ ] **Conference date and room.** The nurses session is about 60 people and Penn CLO (March 2027) about 30. What are the date, the room and the tablets?
- [ ] **The centre parish's name.**
- [ ] **After the session.** Recommended: a reminder each person saves to their own calendar for 30 days later. The other options are nothing, a partner, or a CM follow-up.
- [ ] **Starting resources and yields.** Which units each team in each parish starts with, what each is worth in the standings, and what each earns per turn. The paper prototype sets first numbers.
- [ ] **Named leaders.** The cast for each parish and what they ask for. Content, so Jerry's call.
- [ ] **Pressure sources.** Keep Meridian HQ and Sterling's government as sources of pressure beside the named leaders (current), or leaders only?
- [ ] **Which parish for the phase 2 slice?** Recommended: Keystone with both teams, since the clean rooms (Meridian) against Block C (community) is the sharpest owner-decides moment.
- [ ] **Value feedback during play.** Show only the fact of what happened (recommended), or also which value the move served?
- [ ] **What teams can see of each other.** Every unit visible (recommended), or only your own parish plus radio reports?
- [ ] **Phone page, when phones come.** A small plain web page served by the host is lighter on phones than a Godot web build. Is that an acceptable exception to "all Godot"?
- [ ] **Moment content.** The 24 v3 dilemmas need a v4 rewrite for five parishes and two teams, with triggers and outcome rules. Jerry reviews each parish's set, since content is his call.
- [ ] **The reflexive issue engine.** Build it in phase 3, or after the conference? It could also write the news.
