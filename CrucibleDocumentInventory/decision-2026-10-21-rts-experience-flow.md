---
title: "Proposal: the RTS experience flow, from the Parish Values statement to the debrief"
date: 2026-10-21
type: decision-record
status: proposed
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, design, rts, ux, multiplayer, networking, remote, session-format, v3]
supersedes_in_part: "[[decision-2026-10-19-nursing-leaders-60min]]"
related:
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[concordia-parishes-v3]]"
  - "[[concordia-storm-quarters]]"
  - "[[crucible-residents-v3]]"
  - "[[crucible-secret-briefs-v3]]"
  - "[[crucible-resource-tokens-v3]]"
  - "[[crucible-calls-for-aid-v3]]"
  - "[[crucible-dilemmas-v3]]"
  - "[[values-crucible-session-90]]"
  - "[[values-crucible-card-deck]]"
  - "[[values-crucible-pre-crisis-discovery]]"
  - "[[values-crucible-during-post-crisis]]"
  - "[[decision-2026-10-18-restart]]"
  - "[[research-2026-10-21-webgl-rts]]"
---

# Proposal: the RTS experience flow

**Asked by:** Jerry Wolf, 2026-10-21: "build a strong RTS process from end to end, from entering their Parish Values statement to the end of the simulation", and later the same day: "it's got to be a dynamic interconnected multiplayer experience."

**Status:** proposed. This record turns the accepted redesign ([[decision-2026-10-21-parish-leadership-redesign]]) and the v3 lore drafts into one end-to-end experience specification: what every table, phone, projector and the facilitator see and do at each minute of the 90, what the engine computes, the RTS mechanics that carry it, the networking model, the failure cases, and what has to be built. Every content choice in it is Jerry's call; the recommendations are marked as such. The DM rules decided on 2026-10-20 stand unchanged: the facilitator shapes the questions with three levers and never overrides a consequence.

**Already decided (not re-argued here):** a real RTS feel rendered with WebGL (PixiJS) and HTML panels; the deterministic Rust core authoritative, running on the facilitator's machine; one offline bundle, no venue internet; Bevy is a later upgrade path; 90 minutes as 15 brief, four 15-minute quarters, 15 debrief; six tables, one parish each; printed option cards plus a private phone vote; the facilitator as DM with heat up, cool down and swap dilemma; it must survive a venue wifi failure; players are executives, not gamers.

**Network (decided 2026-10-21, Jerry: "both"):** in the room, the facilitator laptop is the host on its own travel router and no internet is needed; for remote sessions, the same host runs in the cloud behind TLS. One protocol, one join flow (QR or code), one client bundle; only where the host runs differs (section 7). The cloud mode is built after the local one (section 10).

---

## 1. The experience in one page

| Clock | Phase | Sim window | Each table | The DM | The engine | The projector |
|---|---|---|---|---|---|---|
| 0:00–0:15 | **Brief and Parish Values statement** | paused at T-72:00 | Joins by QR; each person picks 3 values privately; the table ranks 3 and writes its statement; opens its resident cards and sealed secret brief | Frames the gap, hands out packs, narrates the island, locks the room | Receives `teams[].stated_values`; nothing runs yet | Title, island flyover, the deck, statements appearing under each parish as they lock |
| 0:15–0:30 | **Q1 Preparation** | T-72:00 → T-36:00 | Allocation round: keeps or sends resource tokens; one prep dilemma; reads the forecast | Reads the quarter card; voices personas; one required click | Allocations become convoys at the lock tick; prep dilemmas presented and decided; works stock, generator hours and shelter capacity change | Clear skies, cone of uncertainty, tokens rolling along open roads, the Warning at T-48h |
| 0:30–0:45 | **Q2 Approach** | T-36:00 → T-06:00 | One approach dilemma; sends and answers calls for aid; watches routes close | Reads maydays as the asker's persona; heats or cools | Routes cut on schedule; convoys arrive or turn back; grid browns; cell network fails | Rain bands, routes turning red one by one, pings for maydays, the harbour and runway closing |
| 0:45–1:00 | **Q3 Landfall** | T-06:00 → T+06:00 | One landfall dilemma; the eye window for boats and helicopters; decides alone | Narrates the peak and the eye; the only pause he may need | Grid down, isolation everywhere, spillway and surge, the eye as a two-minute window, resident outcomes | The map goes dark parish by parish as comms fail; the eye countdown; the backside |
| 1:00–1:15 | **Q4 Recovery** | T+06:00 → T+48:00 | One recovery dilemma about repair, giving back and credit; sends crews | Reads what the island looks like; marks notable moments | Routes reopen; the dam restarts; the next consignment sails or does not; counters settle | Colour returning, convoys of crews, the doses counter moving, the cutter arriving |
| 1:15–1:30 | **Debrief** | replay | Reads its after-action card; hears all six secrets; pair share; one personal commitment on the phone | Reveals the scoreboard, reads the secrets, asks the one question | `summary.values_gap` over dilemmas, allocations and aid answers; the two counters; residents | The island's two counters, then six after-action cards, then the replay scrub |

The storm is the vehicle; the dilemmas, the tokens and the maydays are the lesson. Everything on every screen exists to make a table spend something and remember why.

---

## 2. The RTS grammar, and how it is adapted for executives

What makes a strategy game feel like one, and what each element is here:

| RTS element | In the Crucible | Where the data comes from |
|---|---|---|
| A map that is the game | The Concordia island art, parish territories tinted by status, one shared projected map and one per table | `concordia.json` positions (to be moved to the v3 art placement), `tick.infrastructure` |
| A running clock with a tempo | Sim ticks of 15 minutes, one every 4 to 14 real seconds depending on the quarter; the clock stops only between quarters | `step_minutes`, host pacing table (section 4) |
| Resource bars | Seven systems per parish plus generator hours, stockpile tokens, works stock, vault stock | `tick.infrastructure`, `generator_hours` (to be exposed), new stockpile state |
| Units moving along routes | Convoys of tokens, tankers, buses, boats, helicopter sorties, the fleet coming home | New: `routes.json` and a convoy model |
| A build phase, then a siege | Q1 allocation is the build phase; Q3 landfall is the siege, every base alone | Existing phases; new allocation inputs |
| Fog of war | A table sees its own parish fully and others only while comms hold; the projector shows the island's emergency broadcast, which also goes dark | `connectivity` events and `communications` levels; host-side filtering |
| Alerts, pings, a minimap | Maydays ping with a radial timer; cascades and route cuts raise alerts; every table console carries a minimap | Run-log events; new mayday and route events |
| An economy with trade | Tokens kept or sent, granted or refused; Haven's fuel and Sterling's generators as the island's currency | New: `resources.json`, aid inputs |
| Windows of opportunity | The last plane at T-30h, the eye from T+0 to T+2h, the Gorge Road before T-12h | `windows[]`, new route cut schedule |
| Objectives with counters | Doses shipped and people safe, both always on screen | New: `tally` module |
| An end-of-match scoreboard | The island's two counters, then each table's stated values beside its enacted ones | `summary.values_gap` extended to allocations and aid answers |

The adaptations that keep it readable to someone who has never played an RTS:

- **No camera, no micro, no hotkeys.** The island is always fully in view; tablets may pinch to zoom but never need to. Nothing requires a fast hand.
- **One verb per moment.** Every console screen has exactly one primary button: *Lock values*, *Lock allocation*, *Raise card*, *Answer the mayday*. Everything else is reading.
- **Words beside every colour.** Status is a colour and a label; routes say "CUT T-18:00", not just red.
- **The quarter is the round.** Fifteen minutes, a card at the start, a reckoning at the end. The clock runs inside the quarter and stops between quarters; the DM never has to manage time by hand.
- **Q1 is the tutorial.** Preparation is the quarter in which every later choice is cheap ([[concordia-storm-quarters]]); it teaches the four verbs with low stakes.
- **The DM narrates every transition.** The screen suggests the words.
- **Paper mirrors glass.** Every dilemma, mayday, token and resident exists on a printed card as well as a screen, so a dead tablet or a dead router loses nothing that matters.

---

## 3. Devices, roles and the input model

Four kinds of client and one printed pack. Every client is the same web bundle served by the host; the role is in the join link. Section 7.1 says how the same roles map onto a remote session.

| Client | Who | Hardware | Verbs (inputs) | Reads |
|---|---|---|---|---|
| **Table console** | One per table; the captain drives, the table decides | A 10-inch tablet in landscape from our kit (recommended), or any laptop as fallback; remotely, the captain's browser shared in the breakout room | Lock values statement; allocate tokens; raise the card (public choice); send a mayday; answer a mayday; declare a hidden reserve | Own parish in full, the island at broadcast resolution, resident cards, the secret brief, the feed, the minimap |
| **Phone** | Every participant | Their own phone, joined from the table's QR | Pick 3 values privately; vote A/B/C/D privately before the table raises its card; one personal commitment at the end | The current dilemma text (so everyone can read it), the clock, the counters |
| **Projector** | The room | The venue projector, driven by a second browser window from the host | None | The island at broadcast resolution, the storm, the clock, convoys, maydays, the two counters, quarter cards, resident updates, the scoreboard |
| **DM console** | The facilitator | The host laptop | The three levers; pause and resume the clock; open the next quarter; manual entry for a table that cannot; flag a notable moment; re-show the QR | Everything, including the true state behind the fog, all six secret briefs, persona lines to read, who has not answered |
| **Printed pack** | One per table | Paper, in a folder | Raised A/B/C/D cards; GRANT / PART / REFUSE cards; the token sheet | Parish card, three or four resident cards, the sealed secret brief, one page per quarter with the dilemma and options, the deck as cards |

Rules of the input model:

1. **Only entries count.** A choice exists when the console records it (or the DM records it from a raised card in fallback). Promises shouted across the room are negotiation, not input.
2. **Public choice, private conviction.** The card the table raises is public and drives the engine. Each person's phone vote is private to the host and appears only in the debrief, as the second gap: what the room privately believed against what the table chose. The console shows how many have voted, never the split (open question 3).
3. **The DM adds, never edits.** Every DM action is an input appended to the log with its tick: an intensity change, a swap, a pause, a manual entry. There is no control that sets a level, undoes a consequence or deletes an input.
4. **Phones are a layer, not a dependency.** With no phones, the session loses the private votes and nothing else.

---

## 4. Tempo: how 120 simulation hours fit in 60 minutes

Each quarter has the same shape: a quarter card with the clock stopped, eleven minutes of play with the clock running, and a close with the clock stopped. The host derives the real seconds per tick from the quarter's sim span, so landfall runs slow in simulation time and dense in events, which is what makes it feel like the peak.

| Quarter | Sim window | Ticks | Card | Play | Close | Real seconds per tick | Human deadline (≈3:00 real) | Mayday answer window (≈2:00 real) |
|---|---|---|---|---|---|---|---|---|
| Q1 Preparation | T-72:00 → T-36:00 | 144 | 1:30 | 11:00 | 2:30 | 4.6 | 39 ticks (≈10 h) | — |
| Q2 Approach | T-36:00 → T-06:00 | 120 | 1:30 | 11:00 | 2:30 | 5.5 | 33 ticks (≈8 h) | 22 ticks |
| Q3 Landfall | T-06:00 → T+06:00 | 48 | 1:30 | 11:00 | 2:30 | 13.8 | 13 ticks (≈3 h) | 9 ticks |
| Q4 Recovery | T+06:00 → T+48:00 | 168 | 1:30 | 11:00 | 2:30 | 3.9 | 46 ticks (≈11 h) | — |

Total 480 ticks, the engine's existing run length. All pacing numbers live in the session profile (`content/sessions/parish-90.json`, section 8.3), not in code, and should be tuned in rehearsal. The DM's *Pause* stops the horizon; the pause is logged. If a quarter overruns, *Skip ahead* plays the remaining ticks at ten times speed with the feed summarising, and any dilemma still open expires at the quarter's end tick.

Deadlines are in ticks, so a decision taken at the deadline is replayable regardless of how long the room actually took. Nothing in the core reads a wall clock; the host maps real time to ticks and records every pause and quarter boundary as an input, so the mapping itself is part of the replayable record.

---

## 5. Phase by phase

### 5.0 Arrival and brief (0:00–0:15), ending in the Parish Values statement

**The room before the start.** Each table has a tent card with the parish name, its QR code and a six-character join code. People sit, scan with the phone's camera app (the page itself never asks for the camera) and land on the phone's join screen; the pre-lobby lets them do their personal three-value pick while they wait, which saves three minutes of the brief. Recommended; it needs the router and host up fifteen minutes before the room opens.

**0:00–0:03, the frame.** The DM: the gap between what we say and what we do under pressure; one island, one company, one cure, one storm; you are the leadership of your parish. Projector: title, then a slow flyover of the island art with the six parishes labelled, then the two counters at their starting values, 0 doses shipped and 24,100 people safe.

**0:03–0:05, the pack.** Tables open their folders: parish card, resident cards, the sealed secret brief (unopened), the option cards, the token sheet. The DM says what each is for in one sentence each. The tablet shows the parish's console in a locked "brief" state with the same parish card.

**0:05–0:11, the Parish Values statement.** Three steps on glass, one conversation at the table.

1. *Personal pick (phones, 60 seconds, private).* Twelve cards from the session deck; tap three. The console shows an anonymous gallery as picks land: value names with a bar for how many at the table chose each (the Values Gallery from [[values-crucible-pre-crisis-discovery]], compressed to a minute).
2. *Table rank (console).* The table drags three values into rank order. The gallery is beside the ranking so the shared ground is visible; the design corpus's rule holds, discovery not negotiation.
3. *The statement (console).* One sentence, at most 140 characters, from a template that can be ignored: "When Midas comes, [Parish] will put ___ before ___, and we will ___." The captain taps *Lock values*. The statement and the three ranked values appear on the projector under the parish. Stated values are public by design; that is what makes the debrief a mirror.

**0:11–0:13, the secret brief.** Tables open the envelope and read silently ([[crucible-secret-briefs-v3]]). The console also shows it, to that table only. The DM says once: "Nobody else sees this until the debrief. You decide what to do with it."

**0:13–0:15, rules of engagement.** Four quarters, fifteen minutes each; the clock runs inside a quarter; one question per table per quarter, answered with a raised card after a private vote; tokens in Q1, maydays in the storm; the two counters; the DM voices the people who report to you. Then: "Lock values and open the island." The projector cuts to the Q1 card.

**Engine.** Nothing has run. `lock_values` writes `teams[].stated_values` (exists) and the statement (new optional `teams[].statement` field in the run log, readers tolerate its absence). Because the drift model is not used for human tables and the gap is computed at the end, a late statement changes nothing in the simulation: a table can lock in Q1 without affecting replay. This is the single most useful property for a late table.

**Failure cases.** A table is late: the DM opens the island anyway; the console accepts the values lock until the debrief, and until then the table's statement slot on the projector reads "not yet stated". A table cannot agree on a statement: the template is the statement, filled with its three values. A participant has no phone: the personal pick is skipped for that person; the gallery shows the rest. Six minutes is tight: the pre-lobby and the rehearsal will tell; the fallback is to move the secret brief to the start of Q1's card time.

### 5.1 Q1 Preparation (0:15–0:30), T-72:00 → T-36:00

**The quarter card (1:30, clock stopped).** Projector: "Quarter 1, Preparation. Midas is Category 3, five hundred miles south-east, 55% likely by T-60h. Everything works. This is the quarter in which every later choice is cheap." The DM reads the card and the public forecast, then taps *Open the quarter*. The clock starts.

**What the table does.**

- *The allocation round, from the opening tick, locking at T-52:00 (about 6:00 into play).* The console's token tray shows the parish's tokens from [[crucible-resource-tokens-v3]]: GEN, FUEL, BOAT, LIFT, SHELTER, MEDIC, COLD, CREW, plus Sterling's FUND and COMMS. Tap a token, choose *Keep* or *Send to…*; the parish list shows each parish's declared needs by quarter from the needs table, and the road it would travel. Negotiation is physical: people walk to other tables. The console shows only this table's pending entries; nobody sees another table's sends until the lock tick. The captain taps *Lock allocation*; a table that has not locked by T-52:00 keeps everything (open question 2 on sealed versus live reveal).
- *The prep dilemma.* Presented staggered between T-60:00 and T-50:00 (3:40 to 6:40 into play), so the DM can reach each table as its card lands and the two T-48h dilemmas of the lore are not on top of the allocation lock; the lore's own times remain the narration. The phone shows the setup and the four options; each person votes privately; the console shows "4 of 5 voted"; the table talks; the captain taps the option and *Raise card*; the physical card goes up at the table at the same moment, the DM glances across the room, and the letter appears on the parish marker on the projector. Deadline about three minutes real; an unanswered dilemma expires at its deadline with the content's inaction option and is marked (open question 4).
- *Hidden reserves.* Haven and Sterling see a *Declare hidden reserve* button nobody else has. Using it adds the tokens to the tray and posts "Haven declares two more FUEL tokens" to the projector.

**What the projector shows.** Clear skies; the storm's symbol far off the south-east edge with a cone of uncertainty drawn from `windows[].certainty`; the routes all green; "4 of 6 tables locked" during the round; at the lock tick, every send on the island departing at once as convoy sprites along open roads, arriving over the next ticks; "Hurricane Warning" at T-48:00 as the sky tint shifts; the fleet returning across the western sea if Gateway recalled it; the quarter closing on T-36:00.

**What the DM does.** One required click (*Open the quarter*). Otherwise: reads persona lines from the console when a table's card lands (Rosa Mendez, Yuki Tanaka, Frank Reeves, Maria Santos, Mayor Chen, Marcus Webb, from [[crucible-dilemmas-v3]]); watches the "who has not answered" strip; may *Pause* to let negotiation finish, which is logged; may *Swap* a table's not-yet-presented dilemma for another eligible one.

**What the engine computes.** At the lock tick, each table's entries become `allocation` inputs: tokens move between stockpiles by convoy; every Q1 convoy arrives, because every route is open. Keeping and sending are scored with the signals in [[crucible-resource-tokens-v3]] and recorded as one allocation decision per table in the values gap. Prep dilemmas are presented at their scheduled ticks and decided when the raised card arrives; their consequences follow the content's `Board` line: works stock, crews at risk, Southfield movers, the hospital's power priority, the Kestrel Reach's loading state, which forecast the island decides on. Weather advances; nothing degrades yet beyond the content's watch rates.

**The close (2:30, clock stopped at T-36:00).** Projector: six columns, one per parish, each table's resident cards with any state change (all still *safe* in Q1 unless a table sent its fleet out or left Caldera alone). The DM reads the changes by name, even when the news is "everyone is safe for now". Then *Open Quarter 2*.

**Failure cases.** A table has not locked its allocation at T-52:00: the engine keeps everything for it; the DM may *Pause* before the lock tick if the room is still negotiating, or record a late sheet manually before the tick. The allocation UI confuses a table: the paper token sheet is the same table in another form; the DM enters it. A table's dilemma lands while it is still negotiating: the deadline is three minutes and the DM may pause; in rehearsal, move the presentation ticks later in the profile.

### 5.2 Q2 Approach (0:30–0:45), T-36:00 → T-06:00

**The quarter card.** Projector: "Quarter 2, Approach. Rain bands at T-36h. The harbour closes to departures at T-30h, the runway at T-24h. Roads start to go at T-24h." The route table of [[concordia-storm-quarters]] is read as a forecast, not a certainty: the card lists what the public forecast expects to close and when. *Open the quarter.*

**What the table does.**

- *The approach dilemma*, landing on the lore's schedule between T-36:00 and T-24:00 (Keystone's batch 47 first, Summit's and Heartland's at T-24h). Same ritual: phones vote, table talks, card up.
- *Calls for aid.* Two kinds. Scripted maydays from [[crucible-calls-for-aid-v3]] land as a ping on the holder's console with the asker's persona line (read by the DM), the token asked for, the route, and the route's current state; the holder has about two minutes and answers with GRANT, PART or REFUSE on the console, raising the matching card. Free maydays: any table may tap *Send a mayday*, pick a kind and a parish that holds it, and the host routes it; each table has three free maydays per storm quarter so the channel stays scarce. The asker is told the answer, never the reason; the reason is chosen from a short list on the console and kept for the debrief.
- *Watching the routes.* The console's minimap shows each segment green, amber (degraded, slower), or red with "CUT T-24:00". A convoy on a segment that cuts turns back and the token returns to the sender; a boat at sea when the harbour closes is at risk. A table that sends after the cut is told "no route" before it sends, if its comms are up; if they are not, the console shows the route as last known and the convoy may depart into a closed road. That is the fog doing its work.

**What the projector shows.** Rain bands as drifting particles over the eastern sea; the storm's rings growing; the cone narrowing; the harbour and runway icons closing with a stamp; the ring road segments turning amber then red in the content's order; convoy sprites along the roads with their kind glyph; maydays as expanding rings on the asker's parish with a thin arc to the holder and a radial timer; the answer landing as a GRANT or REFUSE tag; "Cell network down" at T-12:00, after which parishes on the broadcast view begin to grey out one by one with "last report" stamps; brownouts at T-06:00.

**What the DM does.** Reads each mayday to the holder in the asker's voice ("Have you asked the people who'll actually be doing this what they think?"). Heats a quiet table (*Heat up* raises intensity from the next tick, shortening the cadence) or cools a flooded one. Makes sure Sterling is asked at least twice, as the aid document requires; the profile schedules this, the DM can *Swap* a mayday in.

**What the engine computes.** Routes cut on the authored schedule (section 8.3): harbour T-30h, last flight T-30h, runway and the Haven–Keystone road T-24h, the Switchbacks and Gateway–Summit T-18h, the Gorge Road T-12h, Sterling–Haven T-06h. Convoys advance one segment at a time at the content's degraded travel times; a convoy whose next segment is cut turns back, and the token is lost for the quarter as the aid document says. Grant, part and refuse are scored with the call's signals and join the values gap; a granted token lost to the weather still scores as granted. The works, the vault, the Kestrel Reach's sailing at T-30h with 96,000 or 120,000 doses, generator hours and shelter counts move by the content's `Board` lines. Degradation and connectivity run as today; the comms source fails as the cell network goes.

**The close (T-06:00).** Resident cards: Priya Nair on or off the plane, the Albrechts, Dmitri Volkov, Sam Oyelaran's family in or out of Caldera, Riverside clearing or not. Doses: the Kestrel Reach sailed, or did not. The DM reads the names. *Open Quarter 3.*

**Failure cases.** A holder does not answer in two minutes: the call expires as REFUSE-by-silence, marked as such and scored as a refusal (the aid document scores only the answer); the DM voices the asker's second line first. Two tables negotiate a trade across the room that the consoles do not know about: it is a promise; only a mayday and an answer count. A mayday arrives while a table is mid-dilemma: the console stacks them, the mayday on top with its shorter timer; the DM may pause.

### 5.3 Q3 Landfall (0:45–1:00), T-06:00 → T+06:00

**The quarter card.** Projector: "Quarter 3, Landfall. Peak at T-2h: 120 mph sustained, gusts to 145, eight to ten feet of surge at Haven. The eye passes from T+0 to T+2h: two hours in which boats and helicopters can move and people believe it is over. Then the backside." *Open the quarter.* The clock now runs at about fourteen seconds per tick; each tick carries more events than any in Q1.

**What the table does.**

- *The landfall dilemma*, landing on the lore's schedule between T-03:00 and T-01:00 with deadlines before the eye, except Gateway's, which lands in the eye itself: Southfield flooding while the skeleton crew holds the rooms; 94, 97 or 99 percent; Tank 3 and two workers in the terminal control room; thirty officers and the water in Riverside; the bunker door; boats into the eye for the *Harvester* or for Southfield.
- *The eye.* At T+00:00 the console shows "EYE: 2:00 remaining" counting down in real time. The scripted eye calls (L1 boats for Southfield, L2 a helicopter for the Harvester, L7 fuel by air for the dam) land at the eye's opening; an answer that comes after the window closes cannot be delivered. This is the quarter's set piece and the clearest RTS moment in the session: a window, a timer, a choice.
- *Alone.* Every parish is isolated; the console's view of the island is the last report from each parish, stamped and greyed. Only the radio calls (L3, Summit asks Heartland to warn before opening the gate) are always deliverable, because they travel by radio.

**What the projector shows.** The storm's core over the island, spiral arms turning, surge drawn as a rising tide line over Haven's yard and Southfield's flat; the broadcast view mostly dark, each parish a grey tile with "last report T-03:15" except the one still transmitting; the eye as a sudden clearing of the storm overlay with stars and the countdown; convoys of boats across the south-west point and a helicopter sortie from the headland; the backside arriving from the opposite direction; the two counters moving in large type. The DM console alone shows the true state underneath.

**What the DM does.** Narrates the peak from the card ("the Harvester breaks her mooring with a two-man watch aboard"; "the hospital's generator fails for eleven minutes at T-1h"); reads the eye calls in the askers' voices; otherwise stays out of the way. The one DM move most likely here is *Pause* during the eye if the room needs ten more seconds to decide; it is logged like every other move.

**What the engine computes.** Peak degradation with the crisis rates; the dam goes to emergency shutdown and the grid fails island-wide by T-2h; backup generator hours drain and the hospital gaps; the spillway state from Heartland's choices and the L3 answer floods Riverside and the lower campus or does not; Southfield floods from T-4h; Tank 3 holds or does not; eye-window convoys succeed only if they depart and arrive within the window; resident cards move to *at risk*, *rescued*, *injured* or *lost* according to the choices and aid outcomes that the cards name as deciding them. The people counter falls and partly recovers.

**The close (T+06:00).** The heaviest reading of the session: six columns, the cards that changed. The DM reads every name. *Open Quarter 4.*

**Failure cases.** A table freezes: the deadline expires with the inaction option; the DM voices the persona asking again before it does. The projector's dark map alarms the room: that is the design; the DM says so on the card. The venue's wifi fails here, of all places: the host is local and keeps running; see section 7.

### 5.4 Q4 Recovery (1:00–1:15), T+06:00 → T+48:00

**The quarter card.** Projector: "Quarter 4, Recovery. Tropical-storm conditions at T+6h, cleanup weather by T+12h, clear by T+24h. Roads reopen: Haven–Summit at T+6h, the runway and the Gorge Road at T+12h, the ring road at T+24h, the Switchbacks at T+36h. The dam restarts at 60% at T+12h. The cutter Resolute arrives at T+14h." The card says in one line what the quarter is about: repair, giving back, credit, and the first questions. *Open the quarter.* Intensity falls from 6 to 3; the tempo is fast and the mood is lighter by design.

**What the table does.**

- *The recovery dilemma*, landing on the lore's schedule from T+12:00 (Gateway, Heartland) to T+36:00 (Sterling): who gets power first when the dam restarts; whose crews clear whose road; the batch nobody can certify; whether the report names the order; what the island says to the press and what Chicago says over it; who is thanked, in whose name. The content is written so that giving back and credit are the choices, not only blame.
- *The repair round.* Any table may send any token it still holds to another parish; routes reopen on schedule, so most deliveries succeed, and CREW tokens become the quarter's currency: a crew on Riverside's pumps or the Switchbacks is the chance to give back what was refused. Each table also writes one line of credit naming another table's people (a crew, a captain, a nurse), to be read aloud at the debrief ([[values-crucible-session-90]]). Sends score as `service` and `stewardship`; a credit line scores as recognition given rather than taken.
- *Watching the counters.* At T+36:00, if the port, the plant, the works and the roads are back, the next consignment sails and the doses counter jumps; if not, it does not, and the reliability clause sits on the screen.

**What the projector shows.** Colour returning to the broadcast view as comms come back parish by parish; routes turning amber then green; convoys of crews; the dam's output climbing; the cutter at Haven; the doses counter's jump or its absence at T+36:00; the final people-safe figure settling. The quarter closes on T+48:00 with the island whole and the counts final.

**What the DM does.** Reads the recovery card; flags notable moments (*Flag* writes a marker into the log that the debrief lists by time); starts thinking about the order in which to read the secrets.

**What the engine computes.** Repair rates; connectivity restored as sources recover; routes reopen; recovery dilemmas decided; repair sends delivered over reopened routes and credit lines recorded; the next consignment's conditions evaluated at T+36:00; the final summary: `values_gap` over dilemmas, allocations and aid answers, the two counters, resident final states, per-parish outcomes, the state hash.

**The close.** Resident cards one last time, then *Open the debrief*.

### 5.5 Debrief (1:15–1:30)

**1:15–1:17, the island.** Projector: the two counters against their baselines. Doses shipped against the 170,000 the world needed this week and against what the island would have shipped with no storm (120,000, 96,000 or none of the Singapore consignment, and whether the next one sailed); people safe against 24,100, with the at-risk, injured and lost counts beneath. Under the counters, the replay scrub: the DM drags the island's timeline from T-72h to T+48h in twenty seconds and the room watches the true state it could not see during landfall. No table is ranked against another (open question 6).

**1:17–1:21, the secrets.** The DM reads all six aloud in the order the briefs document gives (Sterling, Summit, Haven, Keystone, Heartland, Gateway) while the projector shows, for each, the decisions that secret touched and what the table did at each. Then the one question: which secret, had it been on the table at T-72h, would have changed the most decisions?

**1:21–1:26, the mirror.** Each console shows its table's after-action card: the three stated values and the statement at the top; beneath, a bar per value from betrayed to lived across every choice that tested it, with evidence chips (which dilemma, which allocation, which mayday answer, which repair send, each with its signal); the second gap, "on 3 of 4 questions the private majority at this table differed from the card you raised", as counts only, never names; the resident cards' final states; the DM's moves. The projector shows all six cards at once. The DM gives tables three minutes with their own card and asks the corpus's question: where did we act against what we wrote at minute eight, and what was the pressure; then one sentence from each table to the room ([[values-crucible-during-post-crisis]], [[values-crucible-session-90]]).

**1:26–1:28, the credit lines.** Each table reads the line of credit it wrote in the repair round, naming another table's people; the projector shows the named card as it is read. Here the debrief turns from what went wrong to what people did well, in that order, as the corpus asks.

**1:28–1:30, the commitment and the close.** Each phone shows its owner's private votes beside the table's choices, privately, and one field: "The next time I feel [this pressure], I will [this action] to stay aligned with [this value]." It stays on the phone; the host stores it only if the participant taps *Keep a copy for me*, and then only against their anonymous client id. The DM closes: the gap is data, not judgment.

**Engine.** `summary.values_gap` is extended so each row's evidence carries its kind (dilemma, allocation, aid, repair or credit), and the island counters and residents sit in `summary`. The second gap is computed by the host from the private votes, which never enter the core.

**Failure cases.** The debrief is short: what gives, in order, is the replay scrub, three of the six secrets (the other three are read at the tables from the consoles), and the credit lines read by the DM instead of the tables; what never gives is the counters, the mirror and the commitment. A table's card shows "not tested" for a stated value: the v3 dilemmas are written so that every deck value is tested at least three times ([[crucible-dilemmas-v3]]); if the deck changes, the content must follow.

---

## 6. Screen by screen

Wireframes are described, not drawn to pixel. All consoles share one layout grammar: map on the left, the one primary action on the right, the clock and counters along the top, the feed at the bottom.

### 6.1 Phone

```
JOIN                          PERSONAL PICK (60 s)            PRIVATE VOTE
┌──────────────────────┐      ┌──────────────────────┐        ┌──────────────────────┐
│ VALUES CRUCIBLE      │      │ Pick the 3 values    │        │ T-33:15  HEARTLAND   │
│ Gateway Parish       │      │ you lead by.  0:42   │        │ Warn Riverside now   │
│                      │      │ ┌────────┐┌────────┐ │        │ Reservoir at 87% ... │
│ Join code  G7K2PQ    │      │ │SAFETY  ││FAIRNESS│ │        │ (setup, scrollable)  │
│ [ Scan worked. Join ]│      │ │ ✓      ││        │ │        │                      │
│                      │      │ └────────┘└────────┘ │        │ [A] Tell the Council │
│ Your name (optional) │      │ ┌────────┐┌────────┐ │        │     everything now   │
│ [__________________] │      │ │CANDOR  ││COURAGE │ │        │ [B] Warn, no reason  │
│                      │      │ ...12 cards...       │        │ [C] Wait for 94%     │
│ Private. Your votes  │      │ [ Lock my 3 (2 of 3)]│        │ [D] Wait for 97%     │
│ stay with you until  │      └──────────────────────┘        │ Your vote is private.│
│ the debrief.         │                                      │ [   Vote B   ]       │
└──────────────────────┘                                      └──────────────────────┘

MAYDAY (holder's phones)      WAITING                         DEBRIEF, PERSONAL
┌──────────────────────┐      ┌──────────────────────┐        ┌──────────────────────┐
│ ⚠ Mayday from Summit │      │ T-20:45              │        │ You and your table   │
│ asks STERLING: LIFT  │      │ Doses 96,000         │        │ Q1 you B · table B   │
│ x2, the helicopters  │      │ People safe 23,410   │        │ Q2 you A · table C   │
│ for the ICU. 1:48    │      │ Your table is talking│        │ Q3 you A · table A   │
│ Route: air, closes   │      │ Nothing to do here.  │        │ Q4 you C · table C   │
│ T-24:00              │      │ Watch the room map.  │        │ Next time I feel ___ │
│ (table answers on    │      └──────────────────────┘        │ I will ___ to stay   │
│  the console)        │                                      │ aligned with ___     │
└──────────────────────┘                                      │ [Keep a copy for me] │
                                                              └──────────────────────┘
```

The phone never carries the primary action for the table; it carries the person's private act and a readable copy of whatever the table is reading.

### 6.2 Table console (tablet, landscape)

```
┌─ GATEWAY PARISH COUNCIL ── Q2 APPROACH ── T-24:00 ── Int 6 ── Doses 96,000 ── People 23,410 ─┐
│ ┌────────────────────────────────┐ ┌─────────────────────────────────────────────────────┐ │
│ │  island (PixiJS)               │ │ YOUR QUESTION                           deadline 2:10│ │
│ │  own parish: full bars         │ │ The last plane                                       │ │
│ │  P C R W H A  gen 36h          │ │ 45 seats at T-30h. In the terminal: 32 Meridian ...  │ │
│ │  others: last report stamps    │ │ Rosa Mendez: "My husband is in that terminal..."     │ │
│ │  routes: green/amber/CUT       │ │ [A] Residents first   [B] Medical need first         │ │
│ │  convoys, pings, storm, cone   │ │ [C] Honour the block  [D] First come                 │ │
│ │  ─ minimap inset ─             │ │ 4 of 5 have voted privately                          │ │
│ └────────────────────────────────┘ │ [        RAISE CARD  B        ]  (captain confirms)  │ │
│ ┌────────────────────────────────┐ └─────────────────────────────────────────────────────┘ │
│ │ YOUR PARISH                    │ ┌───────────────────────┐ ┌───────────────────────────┐ │
│ │ Tokens: GEN1 FUEL0 BOAT3 LIFT0 │ │ MAYDAYS  (3 left)     │ │ YOUR PEOPLE               │ │
│ │ SHELTER2 MEDIC1   [Send a      │ │ ▸ From Keystone: BOAT │ │ Tomás Reyes      at sea   │ │
│ │ mayday]                        │ │   x2 for Southfield   │ │ Priya Nair       deciding │ │
│ │ Routes: →Summit CUT T-18:00    │ │   eye only  [Answer]  │ │ Albrecht family  terminal │ │
│ │         →Keystone open, 45 min │ │ ▸ To Haven: FUEL x1   │ │ Walter Finch     at home  │ │
│ └────────────────────────────────┘ │   GRANTED, arriving   │ │ [Secret brief]  [Parish]  │ │
│ FEED  T-24:15 Runway closed · T-24:00 Haven–Keystone road under water · Keystone faces ...   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

Screens by phase, same frame: **Brief** (parish card, gallery, rank, statement, *Lock values*); **Allocation** (token tray with Keep/Send per token, the needs table, the pending list, *Lock allocation*); **Play** (above); **Mayday answer** (the call's text, the route's state as this table knows it, GRANT / PART (slider) / REFUSE with a reason list, *Answer*); **Quarter close** (this table's resident cards with changes highlighted; no action); **After-action card** (section 5.5).

### 6.3 Projector (broadcast view)

```
┌─ VALUES CRUCIBLE ── QUARTER 3 · LANDFALL ── T+00:30 ── EYE 1:35 ──────── DOSES 96,000 · PEOPLE 22,880 ─┐
│                                                                                                      │
│      the island at full width; parishes as grey tiles with "last report T-03:15"                     │
│      except Summit, still transmitting; storm core, arms, surge line; the eye as a clearing;         │
│      a boat convoy rounding the south-west point; a helicopter sortie from the headland;             │
│      pings: KEYSTONE asks GATEWAY: BOAT x2 ... GRANTED                                               │
│                                                                                                      │
│  ┌ GATEWAY ─ card B ┐ ┌ HEARTLAND ─ deciding ┐ ┌ KEYSTONE ─ card C ┐ ┌ HAVEN ─ card A ┐ ...         │
│  FEED  T+00:15 Eye over Concordia. Boats and aircraft can move until T+02:00 ...                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Other projector states: **Title and flyover**; **Statements** (six parishes, each with its three values and sentence as they lock); **Quarter card** (full screen, the DM's words); **Quarter close** (six columns of resident cards with state changes); **Scoreboard** (the two counters and baselines, then six after-action cards, then the replay scrub).

### 6.4 DM console (host laptop)

```
┌─ DM ── Q2 APPROACH ── T-24:00 ── running 5.5 s/tick ── 6:10 of play left ── [Pause] [Skip ahead] ─┐
│ TABLES                               LEVERS                      NEXT UP                            │
│ Gateway   deciding (2:10)  5/5 voted  [Heat up] [Cool down]      T-24:00 Summit: Who holds the pen  │
│ Heartland raised B         4/4        storm now 6, next 6        T-24:00 Heartland: Warn Riverside  │
│ Keystone  mayday open →Haven 1:12     [Swap dilemma ▾]           T-20:00 A4 Heartland asks Summit   │
│ Haven     answering Keystone 1:12     [Swap mayday ▾]            T-18:00 Gateway–Summit road cuts   │
│ Summit    deciding (2:40)  3/6 voted                                                                 │
│ Sterling  OFFLINE 0:40 (last seen T-25:00)  [Enter from raised card ▾]  [Re-show QR]                 │
│ READ ALOUD  Maria Santos to Haven: "You want my people on the crane in forty-knot gusts ..."          │
│ TRUE STATE (not on the projector)  island map with real levels, routes, convoys, secret briefs tab   │
│ [Flag notable moment]  [Manual allocation ▾]  Session G7K2PQ · 23 devices · router OK · 184 inputs   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The one-page printed DM run-sheet lists the required clicks for the whole session, twelve in all: *Open the island*, *Open Q1*, *Open Q2*, *Open Q3*, *Open Q4*, *Open the debrief*, and the six *Next* taps between resident readings; everything else is optional.

---

## 7. The networking model

Jerry's answer on 2026-10-21 was "both": in the room, the facilitator laptop hosts on its own travel router with no internet; for remote sessions, the same host runs in the cloud. This section specifies one system that does both: one protocol, one join flow, one client bundle, one input-log format, and one host binary that runs in either place. A session can even move from one host to the other part-way, because the authority is a seed plus an ordered log (7.6).

### 7.1 Two deployments, one system

| | In the room (default) | Remote (option) |
|---|---|---|
| Where the host runs | `crucible-host` on the facilitator laptop, `--mode lan` | The same binary in a container on one small cloud machine, `--mode cloud` |
| Network | A travel router we bring, own SSID, no uplink; venue internet never needed | The participants' own internet; the host behind TLS at a fixed name such as `play.<our-domain>` |
| Addresses | `http://192.168.8.1:7878/` and `ws://` (plain HTTP on a LAN address; 7.7 says what that implies) | `https://play.<our-domain>/` and `wss://` |
| Sessions per host | One, started when the binary starts | Many, created by a signed-in facilitator |
| Join | QR on the table tent, or the join code on the projector | QR or link sent to each table captain ahead, or the join code read out on the call |
| The projector | A visible second window on the host laptop | A broadcast page each participant opens, and the DM's screen-share |
| The DM console | A browser window on the host laptop | A browser anywhere, signed in |
| Session log | The laptop's disk, mirrored to the projector window | A persistent volume on the server, exported to the facilitator at the end |
| Fallback | Phone hotspot; venue wifi; single-device mode | A warm standby; migration to a local host when the room is physical (7.6) |

**In the room.** The host serves `http://<laptop-ip>:7878/` over the router's wifi, embeds the client bundle, art and content, runs the core natively, and writes the session log to disk. A pocket router of the GL.iNet class with its own DHCP, preconfigured with the SSID "Crucible", carries forty devices. The survey confirms such routers run with no uplink at all, and warns that client isolation must be switched off and the device count tested on the specific router before the session ([[research-2026-10-21-webgl-rts]]). The laptop is wired to the router if it has a port; otherwise it is wireless like everyone else. Venue wifi is never the plan: hotel and conference networks isolate clients from each other, so the tables could not reach a host on it even when it is up.

**Remote.** Each table is a breakout room in the organisation's own video call; the system carries no voice or video. The table captain opens the console in a browser and shares it in the breakout, or each person at the table opens a view-only copy of the console (the `console` role with a view-only flag; one device holds the controls and hands them over with a tap). Everyone has the phone role on their own phone or in a second tab. The broadcast page replaces the projector; the DM narrates in the main room and screen-shares the broadcast between quarters. Persona lines, quarter cards and resident readings are also pushed as text to every console, so a remote table that loses the DM's audio loses nothing the engine needs. The printed pack becomes a pack the console shows: the secret brief appears on the owning table's console at 0:11 and nowhere else; the option and aid cards are buttons. Section 7.8 has the hosting of this mode.

**Hybrid (some tables in the room, some remote).** Cloud mode. The room's tables reach the cloud host over the venue internet or a tethered hotspot. A hybrid session depends on the room's internet by definition; that dependency is rehearsed at the venue, and the room's half can fall back to a local host (7.6) if it fails.

**Fallback chain in the room, in order.**

1. The router fails: the facilitator's phone hotspot becomes the LAN; the host rebinds, regenerates the QR with the new address, the DM taps *Re-show QR* and the tables rescan (under a minute; phone hotspots cap clients, so a spare router beats a hotspot).
2. The venue's wifi exists and permits peer traffic: the host joins it and serves as before; never the plan, sometimes the rescue.
3. No network at all: **single-device mode**. The same bundle runs the core as WebAssembly inside the host's browser, the way the current board does. The room plays on raised cards and paper token sheets on the quarter rhythm of [[values-crucible-session-90]] (narration, dilemma, second move, consequences, "next"); the DM enters every choice and allocation; phones are gone, so private votes are gone. Nothing else is lost. The printed pack is what makes this fallback whole.

**Fallback for a remote session.** The cloud host is the single point of failure and is treated as one: a health check, a warm standby at a second provider or region, and the input log replicated to it every few seconds, so the facilitator can repoint the session name within minutes and the tables reconnect with the tokens they already hold.

### 7.2 Host-authoritative, not lockstep

Two ways to run a deterministic multiplayer simulation: every client runs the core and exchanges inputs (lockstep), or one host runs it and clients send intents and receive state (host-authoritative). This design is **host-authoritative with deterministic replay**, for five reasons.

1. **Fog and secrets.** Lockstep gives every client every input and the whole state; a table console would hold the other five secret briefs and every sealed allocation. The host must filter per client anyway, so the host must be the authority.
2. **Weak clients.** Phones and tablets on wifi drop and sleep. In lockstep, the slowest device stalls the room; here it stalls nobody.
3. **It is what the engine already is.** Live mode re-runs from the seed with the decisions entered so far; the whole mechanism is "no hidden session state" ([[decision-2026-10-19-nursing-leaders-60min]], engine spec amendment of 2026-10-20). Host-authoritative is that mechanism with a network in front of it.
4. **Replay and research.** One ordered input log on the host is the session. Replay from seed plus inputs reproduces the state hash; the dissertation's instrument requirement is met by construction.
5. **Recovery.** A lost client needs a snapshot; a lost host needs the input log and sixty milliseconds. Neither needs the other clients.

The RTS networking survey ([[research-2026-10-21-webgl-rts]]) recommends an input-only lockstep relay in which every client also runs the core and reports a hash per tick. This record keeps the rules of that recommendation that matter here: commands, never state, travel from client to host; the host assigns the tick at which an input applies; the run log is the command log; a desync never ends the session; the seat is the parish, not the device. It departs in one place: the host alone runs the core, and clients receive a filtered view. Fog of war, sealed allocations and the secret briefs are the reason; a client that holds every input holds every secret, and a phone that must run the core to display a vote is a phone that fails more often. The survey's per-tick hash is kept where it does work: the core exposes a hash every tick, the host sends it with every `state` frame, and the projector's mirror, the restore path and any console that chooses to verify compare against it.

The cost is that clients are thin: they render what the host sends and cannot predict ahead. At one tick per four to fourteen seconds, with sub-50 ms latency on the LAN or a few hundred milliseconds across the internet, nobody will notice.

### 7.3 The protocol

One protocol, independent of transport, spoken by both hosts and by every client. The transport contract is small: reliable, ordered, bidirectional frames and connection-state events (open, closed, error). Anything that provides this can carry the protocol: a WebSocket on a LAN, a WebSocket over TLS to the cloud, an in-page loopback, a saved file.

**Envelope.** Every frame is one JSON object `{ v: 1, type, ...fields }`. `v` is the protocol version. The host refuses a client whose `v` or `bundle_hash` does not match its own and tells it to reload, so a stale cached client never plays. Frames are capped at 64 KB. JSON is enough at this volume; a binary encoding would be an optimisation nobody needs.

**Identity.** A session has a code; every role in it has a token. The host generates codes and tokens when the session is created, and they are new for every session.

- `session_code`: six characters from a 32-symbol alphabet without ambiguous glyphs (about 30 bits). It is typed, read aloud or scanned. Alone, it grants only the lobby.
- `table_token`: 128 bits, one per parish, carried in a QR or a link. It grants that parish's `console` or `phone` role without the lobby.
- `dm_token`: 128 bits, plus a PIN typed at the console; in cloud mode, behind the facilitator's sign-in as well.
- `projector_token`: 128 bits; read-only.
- `client_id` and `resume_token`: issued by the host in `welcome`, kept by the client, used to reconnect as the same device.

Tokens ride in the URL fragment (`/j/G7K2PQ#t=...`), never the query string, so they stay out of server and proxy logs; the client sends them inside `hello`.

**Join flow, identical in both modes.**

1. Scan the QR with the phone's camera app, open the link, or type the code at the landing page. The page itself never asks for the camera; on a LAN address the browser would not grant it.
2. With a table token: `hello`, then `welcome` with the role and the parish. The first device at a table to tap *This is the table console* takes the controls; the DM can reassign them.
3. With a code alone: `hello`, then `lobby`; the device picks a parish and asks for `console` or `phone`; a free seat is granted at once, a held seat waits for the DM's *Admit*. The seat is the parish; it never expires during the session; a device that comes back is the same seat.

**Messages, client to host.**

- `hello { v, bundle_hash, session_code, token?, client_id?, resume_token?, last_seq? }`
- `claim_seat { parish, role }` from the lobby
- `intent { client_seq, kind, payload }` (kinds in 7.4)
- `ack { seq }`
- `resync { from_seq }`
- `ping`

**Messages, host to client.**

- `welcome { client_id, resume_token, role, parish?, phase, clock, snapshot }`
- `lobby { seats: [{ parish, console_held, phones }] }`, then `admitted { role, parish }` or `waiting { reason }`
- `state { seq, t, hash, public, private? }` once per tick, carrying that tick's events; `private` is present only for `console`, `phone` and `dm`
- `intent_result { client_seq, status: accepted | rejected, reason?, input_seq?, applied_t? }`
- `phase { seq, kind: values_open | island_open | quarter_open | quarter_close | paused | resumed | debrief_open, payload }`
- `reload { reason }`, `error { code, message }`, `pong`

**Roles and what they may send.** `console` sends `lock_values`, `allocate`, `decide`, `mayday`, `answer_aid`, `declare_hidden`, `repair_send`, `credit_line`; `phone` sends `personal_pick`, `vote`, `commitment`; `dm` sends the DM kinds and `admit`, `reassign`, `manual_decide`, `manual_allocate`; `projector` sends only `ack` and `ping`. An `observer` role (silent; sees the broadcast view and, if the facilitator allows, the DM's true-state map) is reserved for co-facilitators and researchers in remote sessions; it is a later item.

### 7.4 The input log and the host loop

The **input log** is the authority. Each entry: `{seq, t, wall, source: {client_id, parish, role}, kind, payload}`. `seq` is the host's receipt order; `t` is the sim tick at which the input applies; `wall` is the wall-clock time of receipt, kept for research and excluded from anything the core sees. Kinds that enter the core: `lock_values`, `allocate`, `decide`, `mayday`, `answer_aid`, `declare_hidden`, `repair_send`, `credit_line`, and the DM's `heat`, `cool`, `swap`, `manual_decide`, `manual_allocate`. Kinds the host records but the core never sees: `personal_pick`, `vote`, `commitment`, `admit`, `reassign`, `pause`, `resume`, `open_quarter`, `skip_ahead`, `flag`.

The host loop:

- While the clock runs, every `seconds_per_tick`, the horizon advances one tick. The host re-runs the core from the seed with every core-bound input so far and `until = horizon`, then sends every client the new tick's public events and each table's clients their private view. A native run of 481 ticks costs about 60 ms; the browser WebAssembly build is slower but still well under a tick.
- When an intent arrives, the host validates it against the current state (right role and parish, dilemma open, deadline not passed at the tick it will apply to, token unspent, holder really holds the kind, one answer per call), assigns it the next tick, appends it, re-runs, and replies `intent_result {accepted, input_seq, applied_t}` or `{rejected, reason}`. The client shows "locked" immediately and "recorded at T-24:15" when the tick lands.
- Within a tick, inputs apply in `seq` order before the engine's decision step, so the core's own ordering stays deterministic and the host's receipt order is the only tie-breaker. The core never reads a clock.

Nothing is stored anywhere but the log and the content. The run log is a derivation and is regenerated on every rerun.

### 7.5 Sync, reconnect and late joins

- **Snapshot.** `welcome` carries a client's role, parish, and a snapshot: the latest tick at that client's resolution, the compact public event history (so a late console's feed and minimap trail are complete), its table's private state (open dilemma, stockpile, pending entries, secret brief, votes count), and the session phase and clock parameters.
- **Deltas.** Every tick, `state {seq, t, hash, public, private}` with the tick's events. Clients acknowledge; a client that sees a gap in `seq` asks for a resync and gets a full snapshot.
- **Reconnect.** Clients keep `client_id`, `resume_token` and the table token in local storage and retry with exponential backoff. On reconnect, `hello {client_id, resume_token, last_seq}` returns the events since `last_seq` if still buffered, otherwise a snapshot. Intents made while offline queue on the client with their `client_seq` and are re-sent; the host de-duplicates on `(client_id, client_seq)`; an intent whose deadline passed is rejected as `expired` and the console says "the storm decided". A phone vote cast offline and flushed late is recorded with `late: true`; it still counts for the second gap, marked.
- **Late joins.** A console joining in Q2 gets the full snapshot and plays from there; its Q1 allocation is "keep everything" unless the DM entered a sheet for it. A phone joining mid-quarter gets the current dilemma and may vote until the table raises its card.
- **Clock on clients.** Clients never run the clock. They render the host's `t` and count deadlines down from `deadline_t` using the host's `seconds_per_tick`, re-anchored by every tick message, so a client cannot drift more than one tick.

### 7.6 Host persistence, restore and migration

The host appends every input to `sessions/<date>-<code>/input-log.jsonl` as it is accepted, and writes `session.json` (seed, profile id, roster, codes and tokens, device list) at start. The projector window and every console keep a live mirror of the public portion of the log in local storage. If the laptop dies, `crucible-host --restore <dir>` on the same or a spare machine re-runs from the seed, re-shows the QR and resumes the clock at the saved horizon; tables rescan and are back inside a minute. If the disk is lost too, the projector's mirror restores everything but the private votes. At the end, `export.zip` holds the input log, the final run log, the votes keyed by anonymous client id, and the DM's flags: the research record.

Both hosts write the same `input-log.jsonl` and `session.json`, so a session can move. The DM taps *Export now* on a cloud host, starts a local host with `--restore` on the exported directory and re-shows the QR; devices reconnect with the tokens they already hold. The reverse works the same way when a room wants remote observers later. The warm standby of 7.1 is this mechanism running continuously.

### 7.7 Security: in the room and in the cloud

**In both modes.** Tokens are random, per role and per session. The host sends a client only what its role and parish may see, so a Gateway phone cannot vote for Haven and a console cannot read another table's brief, because the data never reaches it. Secret briefs and vote tallies live on the host and go only to the owning table's console and the DM: in hosted modes the client bundle carries no secrets (the single-device fallback embeds them, as the current board does, and relies on the room). Every intent is validated against role, parish, phase and state; frames are schema-checked and size-capped; connections per session are capped; join-code attempts are rate-limited per address and per session; the lobby admits nothing to a held seat without the DM. No account and no name are required of a participant; identity is the anonymous client id and whatever a person chooses to type.

**In the room.** Two facts from the survey shape the LAN ([[research-2026-10-21-webgl-rts]]). First, `http://192.168.x.x` is not a secure browser context: no service worker, no PWA install, no WebGPU, no in-page camera. So the client renders with WebGL, the host serves the whole bundle on every load (it is one file), and the QR is read by the phone's camera app, not by the page. Second, HTTPS on a LAN would mean installing a certificate on every guest's phone, which is not acceptable; the LAN runs plain HTTP and `ws://`. The traffic never leaves a router that has no uplink. The one place this matters more is the DM console, whose PIN travels in the clear on the LAN; that is why the DM token is also required and both change every session.

**In the cloud.** Everything is TLS: `https://` and `wss://`, with certificates issued and renewed automatically by the proxy in front of the host. The facilitator signs in to create a session and to hold the DM role (a passkey or a one-time email link; a per-facilitator secret key is acceptable for the first remote sessions); tables never sign in. Session data at rest sits on an encrypted volume, is scoped to the facilitator who created the session, is exportable only to them, and is deleted at a fixed retention (recommend seven days after the session, or at once after export if the facilitator asks). The server keeps no participant names unless typed, no email addresses, no device identifiers beyond the random client id, and no third-party analytics; server logs record codes and client ids, never tokens. The region is chosen per client organisation when data residency matters. Abuse controls: connection and message limits per session, rate limits on the landing page, and sessions that cannot be joined once the debrief closes.

### 7.8 Cloud mode: how it is hosted and how the remote room runs

The cloud host is the same binary with `--mode cloud`. It sits behind a TLS proxy, holds many sessions in memory, writes each session's log to its own directory on a persistent volume, and exposes a small facilitator area: create a session, print or send its QR codes and links, see who has joined, export the log, delete the session. Deployment is one container on one small virtual machine (the binary and its sessions need a fraction of a core and well under a gigabyte), a reverse proxy that handles certificates, a persistent volume with daily snapshots, a health endpoint, and the warm standby of 7.1 once remote sessions are routine; a managed container service works the same way. The money is negligible. What costs is the operational habit, and that is why this mode follows the local one in the build order (section 10).

The remote room, step by step. The facilitator creates the session the day before and sends each table captain a link (the table's QR as a link) with the parish name and the breakout-room assignment. The organisation runs its own video call. At 0:00 the DM opens the island on the broadcast page and shares it; captains open their consoles in their breakout rooms and share them; everyone else opens the same table link on their phone for the phone role. The session then runs as in the room, with the DM's voice on the call and the text of every persona line on every console. A remote table negotiates by its own means (the call's chat, or the facilitator moving people between breakouts); only entries count, as in the room. At the end the facilitator exports the session; the broadcast page shows the scoreboard, each console its after-action card, and each phone its personal card.

### 7.9 Swappable transport

The client speaks the protocol of 7.3 through a transport interface: `connect(target)`, `send(frame)`, `onFrame`, `onStateChange`. Implementations: **WebSocket** (the default; `ws://` on a LAN, `wss://` to the cloud, chosen by the join URL's scheme, with reconnect and backoff); **Loopback** (single-device mode: the core as WebAssembly in the same page, the current board's path, with the host logic running in-page); **Replay** (feeds a saved session to the client for the debrief scrub and for reviewing a session afterwards). A relay or peer-to-peer transport could be added behind the same interface and is not planned; the survey's warning about WebRTC on venue networks stands. The host side mirrors this: `--mode lan` and `--mode cloud` differ in binding, TLS, session count and sign-in, not in a single protocol frame.

---

## 8. Mapping the mechanics onto the engine

### 8.1 What exists today and what is new

| Mechanic | In the core today | New engine work (proposed) |
|---|---|---|
| Parish Values statement | `teams[].stated_values`, ranked; `summary.values_gap` | Optional `teams[].statement` in the run log (text only; no effect on the simulation) |
| Clock and tempo | 15-minute ticks, T-72h to T+48h; `live` halt mode | `RunConfig.until` horizon: run to a tick and stop without halting on pending human dilemmas; `live` stays for single-device beat mode |
| Storm front, cone, rings, surge | `weather.hurricane_position`, `wind_kts`, `surge_ft`, `rain_in_per_hour`, `windows[].certainty` | None in the core; the cone is drawn from certainty by the client. Content: move the eye to T+0 to T+2h as [[concordia-storm-quarters]] asks |
| Resource bars | `tick.infrastructure` (seven systems), `morale`, `isolated` | Expose `generator_hours` and `connected` per system as optional tick fields; add stockpiles, works stock and vault stock |
| Fog of war | `connectivity` events, `communications` levels | None in the core; the host filters each client's view by its parish's comms state and stamps "last report" |
| Dilemmas and deadlines | `dilemma_presented`, `deadline_t`, `pending`, `decision` with `controller: human`, `ask`, `expired` | `ask` entries become `{dilemma_id, present_t, deadline_ticks}` so the profile schedules presentation and sets human deadlines; content gains `defaultOptionId` (the inaction option) used on expiry instead of `options[0]` |
| Allocation round | Nothing | `allocate` input; per-parish stockpiles from `resources.json`; keep/send effects on generator hours, shelter places, boats, medics, cold bays, crews; convoys at the lock tick; signals per the tokens document; one `allocation` decision record per table in the gap |
| Calls for aid | Nothing | `mayday` and `answer_aid` inputs; scripted calls from `aid.json` with their routes, windows and signals; `mayday`, `aid_answer`, `aid_expired` events; answers scored into the gap; a token lost to the weather still scored as granted |
| Repair round and credit lines | Nothing | `repair_send` input (any held token to any parish over reopened routes) scored `service` and `stewardship`; `credit_line` input scored as recognition given; both in the gap and read at the debrief |
| Routes and convoys | Per-parish `roads` level; crater roads close at 65 mph wind or 2 in/h rain; `isolation` events | `routes.json`: segments including air and sea lanes, each with an authored cut and reopen schedule (first cut) or physics thresholds (later); `route.rs` with per-segment state and convoy movement at the content's travel times; `route_cut`, `route_reopened`, `convoy_departed`, `convoy_turned_back`, `convoy_arrived` events; isolation derived from segments |
| The two counters | `production.json` holds old economics only | `tally.rs`: doses (Keystone makes 1,000 an hour while power, water, concentrate and crew hold; the vault holds five days and spoils four hours after its power fails without a COLD bay; the Kestrel Reach sails at T-30h with what is aboard; the next consignment at T+36h if port, plant, works and roads are back) and people (population minus the groups in an active hazard who have not been moved or rescued, less the injured and lost); `tick.counters`, `summary.counters` |
| Resident cards | Nothing | `residents.json`: each card's group, hazard, hazard quarter and the inputs that decide it; a state machine safe, at risk, rescued, injured, lost; `resident_state` events at the ticks they change; `summary.residents` |
| Secret briefs, hidden reserves | Nothing | `declare_hidden` input adding tokens to a stockpile with the document's signals; the brief text itself is session content, not core state |
| DM levers | Intensity curve as input (heat, cool) | `swap` as a recorded input that replaces a not-yet-presented dilemma or scheduled mayday; pause, resume and quarter boundaries live in the host's log, not the core |
| Private votes and the second gap | Nothing | Host and client only; votes never enter the core; the export carries them anonymously |
| Fewer than six tables | `controller: ai` drift model decides dilemmas | AI parishes answer maydays by a simple rule (grant when surplus and the route is open, refuse under pressure) and keep all tokens unless the profile says otherwise |
| Scoreboard | `summary.values_gap`, `per_parish` | Evidence rows carry a `kind` (dilemma, allocation, aid, repair or credit); counters and residents in `summary`; the state hash covers stockpiles, routes, convoys, counters and resident states |

### 8.2 Determinism rules for the new inputs

- All inputs reach the core as one list sorted by `(t, seq)`; the core applies a tick's inputs in that order before its decision step.
- Convoy movement, route cuts, production and resident transitions draw no randomness; they are functions of state and content. The chance outcomes written into the dilemmas' Board lines (a 60% find, a 30% lost truck) draw from the one seeded RNG with the draw count logged, as today; if a later design wants chance on the routes, it draws the same way.
- The state hash gains stockpiles, segment states, live convoys, counters and resident states, so replay proves the whole session, not only the dilemmas.
- The core exposes its state hash at every tick, not only in the summary, so the host can send it with each `state` frame and the projector mirror, the restore path and any verifying client can compare.
- Property tests to add: a convoy never arrives over a segment that was cut while it was on it; counters stay within 0 and their maxima; every `aid_answer` references a prior `mayday`; every `resident_state` change names a deciding input or route event; replay reproduces the hash for random input sets.

### 8.3 New content files (data, never Rust)

| File | Holds | Source document |
|---|---|---|
| `content/resources.json` | Token kinds, starting counts per parish, hidden reserves, the needs table by quarter, keep/send signals, effects on engine state | [[crucible-resource-tokens-v3]] |
| `content/routes.json` | Segments (five ring road, two crater roads, the river bridges, the runway, the helipad lanes, the harbour, the south-west sea lane), travel times normal and degraded, authored cut and reopen ticks, eye-only flags | [[concordia-storm-quarters]], `concordia.json` ring and crater roads |
| `content/aid.json` | The fifteen scripted calls with asker, holder, token, route, window, signals per answer, persona line | [[crucible-calls-for-aid-v3]] |
| `content/residents.json` | Twenty-three cards and their groups, hazards and deciding inputs | [[crucible-residents-v3]] |
| `content/dilemmas.json` (v3 entries) | The twenty-four cards with `defaultOptionId`, signals by deck id, `Board` effects as structured fields | [[crucible-dilemmas-v3]] |
| `content/sessions/parish-90.json` (named `nursing-90` in [[values-crucible-session-90]]; one profile, Jerry's name) | Roster, deck, quarters and pacing, scheduled presentations and maydays, mayday allowance, reason lists, the credit-line signal, the DM's read-aloud lines | this record, [[values-crucible-session-90]] |
| `content/concordia.json` (positions, populations) | Parish positions moved to the art's placement; v3 populations; Yuki Tanaka | [[concordia-parishes-v3]] |

Changing `ENGINE_SPEC.md` and `RUN_LOG_SCHEMA.md` for the new inputs, events and summary fields is a decision; this record proposes it and the amendment should be written when the engine work is accepted.

### 8.4 The host crate and the client bundle

- `crates/crucible-host`: a Rust binary with `--mode lan` and `--mode cloud`; HTTP and WebSocket server, TLS-fronted in cloud mode; embeds the client bundle and art; serves content by role (secret briefs only to the owning table); runs the core natively; session log, restore and export; join codes, tokens and QR; per-client filtering; facilitator sign-in and many sessions per process in cloud mode. The survey's alternative, a Node process serving the same bundle with the WebAssembly core, would speak the same protocol and is acceptable; the single binary is recommended because it needs nothing installed on the facilitator's laptop and deploys unchanged to the cloud. New dependencies (an HTTP server, WebSocket, TLS, QR encoding) need their reason stated in a comment, as the spec requires.
- `board/` becomes the client: PixiJS v8 for the island scene (sea and island sprite, territory tints, route polylines with status, convoy sprites along segments, parish markers with bars and letter tokens, mayday rings and arcs with radial timers, storm rings, arms and rain-band particles, a surge shoreline tint, fog veils with stamps, labels) and HTML over the canvas for every card, list and button, so text stays real text for readers and screen readers. One bundle, four roles, one transport interface. PixiJS runs in WebGL mode, because WebGPU is unavailable on a LAN address; the projector is a visible window, never a background tab, because browsers throttle timers there; the island's camera is one render group; the counters are bitmap text ([[research-2026-10-21-webgl-rts]]). Target 60 fps on a mid-range tablet; respect reduced motion; light and dark themes as today.

---

## 9. Failure and recovery catalogue

| What goes wrong | What the room sees | What the system does | What the DM does |
|---|---|---|---|
| A table arrives late | Its parish shows "not yet stated" | Values can be locked any time before the debrief without affecting the run; Q1 allocation defaults to keep everything | Opens the island on time; enters a paper sheet for the table before T-52:00 if it arrives in Q1 |
| A table cannot agree on its statement | The template | The template with its three values is accepted as the statement | Says "the template is enough" |
| The router dies mid-quarter | Consoles freeze on their last state with "reconnecting; use your printed cards" | Host keeps running locally; consoles resync when the network returns; offline intents flush, late ones are marked | Switches to the phone hotspot or spare router, re-shows the QR; meanwhile enters raised cards manually |
| The host laptop dies | Everything freezes | `--restore` from the session directory on a spare machine; replay from seed; QR re-shown | One minute of narration; tables rescan |
| A tablet dies | One table loses its console | Any phone at that table can be promoted to console with the DM's approval; or the DM enters for the table | Promotes a phone or enters the raised card |
| The projector dies | The room loses the shared map | Nothing changes in the engine; consoles carry the minimap and feed | Narrates; tables look at their consoles |
| A table does not answer a dilemma | Deadline reaches zero | The content's inaction option applies, marked `expired`; the debrief shows "the storm decided" | Voices the persona pressing once before the deadline |
| A holder does not answer a mayday | Timer reaches zero | Refuse-by-silence, marked; scored as a refusal | Reads the asker's second line first |
| A table sends aid into a cut road | Convoy turns back | Token returns to sender, lost for the quarter; event in the feed | Nothing; it is the lesson |
| The DM taps Heat up twice | Intensity jumps four | Cool down is the inverse; every move is logged and listed in the debrief | Cools; says nothing |
| The DM opens the next quarter early | Confirm dialog: "3 tables are still deciding" | Open dilemmas expire at the quarter's end tick; nothing is undone | Confirms or waits |
| The DM swaps the wrong dilemma | Nothing yet visible | Swap applies only to a not-yet-presented item and can be swapped back before presentation | Swaps back |
| A quarter overruns | Real clock in the DM rail turns amber | Skip ahead plays remaining ticks at 10x | Taps Skip ahead at the quarter's planned end |
| Fewer than six tables | Empty parishes | The drift model plays them, including a simple mayday rule | Sets the roster before the brief |
| Phones not allowed or absent | No private votes | Everything else unchanged | Skips the personal pick |
| A remote participant's connection drops | Their console or phone shows "reconnecting" | The seat is held; a snapshot on return; offline intents flushed, late ones marked | Nothing; the captain speaks for the table meanwhile |
| The cloud host is unreachable | Every remote client reconnecting | The health check fails the session over to the warm standby; tokens unchanged; tables reconnect | Narrates for two minutes; if the standby is also gone, closes on the call and reschedules; the log to the last replicated input is kept |
| A hybrid room loses its internet | The room's consoles freeze; remote tables continue | The room's half can be served by a local host restored from the exported log; the remote half cannot | Chooses room-only or remote-only and says so |
| The facilitator's laptop dies in cloud mode | Nothing visible to the tables | The host is in the cloud; any browser with the sign-in and the PIN becomes the DM console | Signs in on a phone or a borrowed laptop |
| A participant is distressed by the landfall reading | | | Pauses the clock; the pause is logged; the design corpus's stance applies: leave people better than you found them |

---

## 10. Build list

Must-have for the first session, in build order. Sizes are rough: S under a day, M a few days, L a week or more.

1. **Core: `until` horizon, scheduled presentation and default option (S).** Lets the host run the clock without halting; the profile schedules each table's four dilemmas and sets deadlines in ticks.
2. **Core: routes and convoys with an authored cut schedule (M).** `routes.json`, `route.rs`, convoy events, isolation from segments. Physics-derived cuts come later; the authored schedule matches the lore and is enough for the first session.
3. **Core: allocation and calls for aid (L).** Stockpiles, `allocate`, `mayday`, `answer_aid`, `declare_hidden`, signals into the gap, AI mayday rule. Includes the spec and schema amendments.
4. **Core: the two counters and resident cards (M).** `tally.rs`, `residents.json`, counters and residents in ticks and summary, extended state hash and property tests.
5. **Host: `crucible-host` (L).** Serving, sessions, join codes and QR, validation, input log, per-client filtering, snapshot and resync, restore, export.
6. **Client: the table console (L).** Brief and values lock, allocation, play view with the PixiJS island, mayday send and answer, resident cards and secret brief, quarter close, after-action card.
7. **Client: phone, projector and DM roles (M).** Join, personal pick, private vote, personal debrief; the broadcast view, quarter cards, resident update, scoreboard and replay scrub; the DM rail, levers, exceptions, run-sheet.
8. **Content v3 converted to data (M, content work).** Dilemmas, aid, tokens, residents, routes, positions, the session profile; `crucible validate` extended to the new files.
9. **Printed pack generator and single-device fallback (S).** The table sheets exist in basic form; extend to resident cards, secret briefs, token sheets, mayday cards; keep the Loopback transport working so the current board path is the fallback.
10. **Rehearsal mode and a scripted demo session (S).** Fill every table at random, run the whole 90 minutes in five, check the pacing tables.

Second tier, for remote sessions, after the first in-room session has run (Jerry's "both", section 7):

11. **Cloud mode of `crucible-host` (M).** `--mode cloud`: TLS behind a managed proxy, facilitator sign-in, many sessions per process, a persistent volume, retention and deletion, export, a health endpoint, deployment scripts for one small virtual machine.
12. **The remote room in the client (M).** Lobby and admission, view-only console copies with a controls handover, the broadcast page for every participant, every persona line and quarter card as text on the console, the pack shown on screen, link-based invitations.
13. **Migration between hosts and a warm standby (S).** Export mid-session, `--restore` on the other host, re-show of QR codes, the standby's log replication.

Later, in no particular order: physics-derived route cuts; promise tracking in negotiation (a console action "we promise Summit one GEN", checked against the lock); a narrative feed with persona voices generated at the host; the full pre-crisis discovery arc for longer formats (values story, meaning exercise, commitment statement with signatures); multi-session analytics; audio and ambient sound; camera zoom and pan on tablets; Bevy for the island scene.

---

## 11. Open questions for Jerry, each with a recommended answer

1. **Local host or cloud relay?** *Answered 2026-10-21, Jerry: both.* The local host on a travel router is the default for in-room sessions; the same host runs in the cloud for remote sessions; one protocol and one join flow (section 7). Two details remain, with recommendations: the cloud provider and region (recommend one small virtual machine behind a managed TLS proxy, in the client organisation's region, with a second provider as the warm standby), and whether the system carries voice (recommend no: remote sessions ride the organisation's own video call, and every persona line reaches the console as text).
2. **Allocation reveal: sealed until the lock tick, or live as tables enter?** Recommend sealed. It makes the negotiation matter, gives the room one synchronised moment when every convoy departs, and yields a clean values signal: what was promised against what was sent.
3. **Does a table see its own private vote split after it raises its card?** Recommend no; counts only during play, the split only in the debrief, as decided on 2026-10-20. Showing the split live would turn the private vote into a poll and dissolve the second gap.
4. **An unanswered dilemma applies which option?** Recommend a content-designated default per card, the option the persona would have taken alone, as [[values-crucible-session-90]] puts it, applied at the deadline and marked "the storm decided", in place of the engine's current first option; abdication is a values signal of its own.
5. **The deck: keep the twelve-card session deck or widen it?** Recommend keeping twelve for the first session, because the v3 dilemmas are written to test exactly those twelve; widen only together with the content.
6. **Does the scoreboard rank tables?** Recommend no ranking anywhere. The island's two counters are shared; each table's card is its own mirror. A leaderboard would poison the debrief for executives who are not gamers. If Jerry wants a prize at all, the Fishbanks precedent in the survey offers the one that fits: a vote by the room for the table that most lived its statement, announced after the mirror, never a number.
7. **Table console hardware: our tablets or their laptops?** Recommend six 10-inch tablets in the kit in landscape kiosk mode, identical for every table, with laptops as the fallback.
8. **Who enters the public choice: the table on its console or the DM from the raised card?** Recommend the table enters and the card is still raised; the lore documents currently say the DM enters, which becomes the fallback. One click per table saves the DM thirty entries a session.
9. **Should the Parish Values statements be shown publicly on the projector at lock?** Recommend yes; stated values are the public half of the gap, and seeing the other five statements raises every table's stakes.
10. **How much death on the people counter?** Recommend that named residents can be lost only through a small number of content-authored outcomes, never by chance, and at most one card per table in a session; the counter should mostly move through at-risk and rescued. This is tone, and it is Jerry's call.
11. **Fewer than six tables: AI parishes or merged parishes?** Recommend AI parishes with the drift model and the simple mayday rule, so the island stays whole and the maydays still have holders.
12. **Who owns the pacing numbers?** Recommend the session profile, tuned in rehearsal, with the lore's "When" times as narration rather than presentation ticks.
13. **Debrief order: the gap before the secrets ([[values-crucible-session-90]]) or the secrets before the mirror (this record)?** Recommend the secrets first, so every table reads its card knowing all six and the "secret touched" chips mean something; the session-90 order is the fallback when the secrets run long.

---

## 12. What this changes in earlier records

- The board flow in [[decision-2026-10-19-nursing-leaders-60min]] (values lock, briefing, four decision beats shown all at once, reveal, play forward, debrief) is superseded by the quarter structure here. Its engine, DM rules and the card-and-phone input decision stand.
- The "one offline page" decision is kept in spirit: one offline bundle, served by one host binary on a LAN we bring, with the single-page board as the fallback inside it.
- `ENGINE_SPEC.md` and `RUN_LOG_SCHEMA.md` will need the amendments listed in section 8 when the engine work is accepted; that amendment is a separate decision record.
- The lore documents' lines "the DM enters each sheet" and "the DM enters the answer" become fallbacks if open question 8 is decided as recommended.
- [[values-crucible-session-90]] and this record agree on the clock, the deck, one dilemma per table per quarter, the allocation round, the calls for aid, the two counters and the resident readings. They differ in three places, all for Jerry: the session-90 rhythm advances the engine once per quarter on the DM's "next", while this record runs a live clock inside each quarter with dilemmas and maydays landing on the lore's schedule, and the session-90 rhythm becomes the single-device fallback here (7.1); this record adds the Parish Values statement sentence to the values lock and reads the packs before it; and this record adopts the session-90 repair round and credit lines in Q4, reads the credit lines in the debrief's close, and reads the secrets before the mirror rather than after the gap (open question 13).
- The network decision of 2026-10-21 ("both") is recorded here rather than in a separate record; section 7 is its specification.
