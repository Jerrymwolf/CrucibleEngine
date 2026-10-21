# The session client: table consoles, phones, projector, DM

One self-contained page (`index.html`, built, not committed) carries the four roles of a Values Crucible session: the **table console** on each table's tablet, the **phone** in each participant's pocket, the **projector** on the wall and the **DM console** on the facilitator's laptop. The engine runs as WebAssembly inside the page too, so one device can host a whole session, a rehearsal or the self-check with no server. The page needs no network once built: PixiJS, the engine, the island art and the session's content are inlined.

The engine decides everything. A client only sends intents (a statement, an allocation entry, a decision, an answer to a mayday) and renders the state the host sends back; the host assigns each accepted intent the next tick and re-runs the deterministic core from the seed. Every `state` frame carries the core's `state_hash` for its tick, and the check asserts that every client ends on the host's hash and that the export replays to it.

```bash
cd crucible
cargo build -p crucible-wasm --target wasm32-unknown-unknown --release
node board-rts/build.mjs parish-90                    # writes board-rts/index.html (4 MB)
cargo run -p crucible-host -- --content ./content --session parish-90 --bundle board-rts/index.html   # the LAN host
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node board-rts/check.mjs                                     # the headless check
```

## Roles and how to open each

With **crucible-host** on the LAN (`docs/PROTOCOL.md`), the host prints the links and the DM PIN at start and serves the lobby QR at `/join`. Tokens ride in the URL fragment and never reach a log:

| Role | Link | What it is |
|---|---|---|
| Table console | `http://<host>:7878/j/CODE?role=table&parish=haven#t=<table token>` | The tablet at the table. A bare `…/j/CODE#t=<token>` link asks one question first: the table's tablet, or my own phone. |
| Phone | `http://<host>:7878/j/CODE` (scan the lobby QR, choose Phone and the parish) or `…?role=phone#t=<table token>` | A participant's own device: the private pick, a private vote on every card, the personal commitment. |
| Projector | `http://<host>:7878/j/CODE#p=<projector token>` | The wall: the island, the statements as they lock, the quarter cards, the counters, the debrief sequence. Read-only. |
| DM console | `http://<host>:7878/j/CODE#dm=<dm token>` plus the 4-digit PIN (`?pin=` or typed) | The run sheet rail, the next action with a two-tap confirm, the levers, the exceptions, the export. |
| Printed pack | DM console → *Print pack* (`?role=print&code=CODE#dm=<dm token>`) | Tent cards with the phone QR, parish sheets, resident cards, sealed secret briefs, token sheets, mayday and answer cards, option letters, the values deck, the DM run sheet. |

**Without a server** the same page hosts the session itself. Open `index.html?role=dm` (from `file://` or any static server) and the DM console starts an in-page host; the DM's *Join links & QR* dialog gives every other role its link (`?code=CODE&role=table&parish=…#t=…`, `?role=projector#p=…`), which work in other windows of the same browser (BroadcastChannel) and are what the printed pack carries. A role that finds no host offers *Run on this device instead*, which starts a host in that page (Loopback) for a single-device walk-through. The in-page host persists to local storage, so reloading the DM page resumes the session; `&new=1` starts afresh. Give the DM console its own window, not a background tab: browsers throttle timers in tabs that are not visible, and the in-page host's clock runs on them.

**Rehearsal**: `index.html?role=dm&rehearsal=1&speed=18&seed=42` fills every table with bots that lock values, allocate, vote, decide and answer through the same intent path as a real console, and runs the 90 minutes in about five (`speed` is the tempo multiplier; the DM levers *Fill empty tables* and *Autopilot* do the same by hand, and a real tablet that joins displaces its bot).

## What each screen does

- **Console.** One choice at a time: a queue of what needs the table's attention, sorted by deadline, with a "what to do now" line on every screen. Before the island opens: the brief, the sealed secret brief (opens on the console only), the roster of residents, the 12-card values deck (pick three, in order) and the 140-character Parish Values statement. In Quarter 1: the allocation round, sealed until the lock (send a token to another table or keep it; declare the hidden stock). During play: the dilemma card with its radial deadline and letters A–D, the mayday to answer with its own clock (grant, part, refuse, a reason read on the radio), calls the table may raise, and in Recovery the line of credit and a repair crew. At the debrief: the after-action card (statement, decisions, what the storm decided, the gap). The island behind it shows the table's own parish, fog by communications (a parish out of contact keeps its last report), routes, convoys, the storm.
- **Phone.** Join, the private pick before the table locks, a private vote on each open card (the table decides on the console; the split appears only at the debrief), the personal commitment at the end. Nothing private to the table is ever on a phone.
- **Projector.** Readable at distance: the quarter name and the clock, intensity, the two counters, the six statements appearing as each locks, six table cards, the broadcast feed, the eye and the pause banner, the quarter card and the quarter-close columns as full-screen overlays, and the debrief sequence: counters, the six secrets in the profile's order, the stated-vs-enacted mirror, the credit lines, the replay scrub. Space, arrows or a tap advance it; it advances itself after 25 s until someone takes it over.
- **DM.** The run-sheet rail, the next action (open the island, open the quarter card, start, pause, open the next card, open the debrief, export) with a confirm for the irreversible ones, the six tables with what each is deciding and the live vote counts and split, the roster (admit a waiting tablet, give a seat away), levers (heat and cool ±2 on the intensity curve, swap a scheduled card, flag a moment for the debrief), exceptions (enter a statement, a decision or an answer for a table), the read-aloud text for the phase, the schedule ahead, the feed, the join links and QR, the printed pack, the rehearsal fill and autopilot.

## Transports

`src/20-protocol.js` has one `Client` over three transports with the same interface: **Loopback** (the host in this page), **BroadcastChannel** (an in-page host in another window of this browser) and **WebSocket** (crucible-host, `ws://host/ws`, reconnecting 1 s doubling to 30 s). The client says hello with the session code or a token, resumes with `client_id` and `resume_token`, numbers its intents, acks the frames it applies and asks for a `resync` on a gap. One stored identity per session, role and seat (`client.<CODE>.<scope>`), so a DM tab, a projector tab and a table tab in one browser are three devices to the host and a reload resumes the same seat; phones and lobby joins are one identity per tab.

`src/30-host.js` is the in-page host: the same frames, filtering and validation as crucible-host (`docs/PROTOCOL.md`), the input log as the source of truth, `applied_t = horizon + 15`, fog by the content's FAILED threshold, secret briefs only to the owning console and the DM, votes as counts to the console and as the split to the DM, and a determinism guard that compares every already-sent tick's hash after each core re-run.

## The check

`check.mjs` drives every role in headless Chromium (software GPU) and fails on any console error. Scenario A hosts a rehearsal in the DM window (Loopback) with the projector, a table, a phone and a lobby-joined phone in other windows (BroadcastChannel), clicks through the screens as a table would (values and statement, the private pick, an allocation, a decision with a phone vote, a mayday answer, a credit line, a commitment, the debrief steps, the export) and asserts: the golden run `runs/seed-42.run.json` replays in the page to its recorded hash; every client ends on the host's hash and every `state` frame carried the engine's hash for its tick; the export (`run.json`, log version 0.2) replays from seed, inputs and session to the same hash; wrong or late intents are rejected with the protocol's reasons; no secret brief reaches a phone or the projector before the debrief, and a console sees vote counts but never the split; a reload resumes the seat; the printed pack has its sheets and QR codes; `prefers-reduced-motion` stops the CSS animations and caps the map at 24 fps. Scenario B, when `target/{debug,release}/crucible-host` exists (or `--host <binary>`), runs one session over WebSockets against it: five seats joined three ways (token link, lobby, bare link with the role question), statements locked from consoles and entered by the DM, a card decided and voted, a reload, each quarter skipped to its close, the debrief, and the export from `/export` replayed to the host's `/health` hash.

Screenshots of each role at the key moments land in `screens/` (`01-projector-lobby.jpg` … `28-print-pack.jpg`, `ws-01` … `ws-05`), with `screens/metrics.json` (boot stages per page, projector frame rate, hashes, counts). Options: `--speed N` (rehearsal tempo, default 36), `--ws-speed N` (the host's `--speed` for scenario B, default 30), `--no-ws`, `--ws-only`, `--host <binary>`.

## Protocol notes for the host

What the client relies on beyond the letter of `docs/PROTOCOL.md`, and where the two hosts differ:

1. `welcome`, `admitted`, `lobby`, `waiting`, `state`, `phase`, `intent_result`, `roster`, `snapshot`, `error`, `reload` are consumed exactly as specified; `hello` never carries `bundle_hash` (the build hash is not the served page's SHA-256), and a `reload` frame is honoured at most once a minute.
2. The in-page host emits one extension phase, `values_locked` (`{ parish_id, values, statement }`), so a statement appears on the wall and on the DM console the moment a table locks it. crucible-host sends the room nothing for an accepted `lock_values` (only the `intent_result` to the sender), and a lobby intent applies at the next tick, so the wall, the DM's "n/6 locked" count and the other tables learn of a statement with Q1's first `state` frame; the client rebuilds statements from `teams` and the `values_locked` events in `history`. The host should emit the same phase frame (or re-send the horizon's `state` frame) when a statement locks before the clock runs. Its snapshot adds `last_phase` so a late joiner knows the quarter card or the debrief is open; against crucible-host the client infers that from `clock.phase`.
3. `debrief_open` carries the briefs and the order but no `values_gap`; the client computes the mirror from the `decision`, `allocation`, `aid_answer`, `credit_line` and `repair` events it saw, with the core's formula (mean signal per stated value, three decimals).
4. The projector's debrief steps are advanced on the projector (keys, tap, 25 s auto); there is no DM frame for stepping it.
5. crucible-host's links carry the token only (`/j/CODE#t=…`); the client adds `?role=table` or `?role=phone` to the links it prints and shows, and asks the role question on a bare link. A `hello` with a table token and no role is a phone on both hosts.
6. `freeMaydaysPerQuarter` in the profile is not enforced by either host.
7. The in-page host adds to the DM's `private` block (`picks`, `commitments`, `runs`, `last_run_ms`, `errors`, `speed`, `autopilot`) and `late` to a vote's `intent_result`; crucible-host's `clients` carry `waiting_for` and `last_ack`. The client reads both.
8. A `phase` frame carries no `clock` block and no `state` frame follows it, so the client derives `clock.phase` from the frame's kind (`paused` → `paused`, `resumed` → `running`, …) until the next `state` frame. Private views (votes, entries) also travel only in `state` frames: while the clock is paused, a phone's vote reaches the DM's split and the console's count with the next tick.
9. A run log's `session.intensity` is the profile's curve; a heat or cool lever is not in it. The page replays an export with the recorded per-tick intensity (`ticks[].intensity`), as `crucible replay` does.

## Left to do

- Real-hardware frame timing on the projector laptop and the tablets (the check runs on SwiftShader).
- Resident updates and the second gap on the projector beyond the feed line and the people panel.
- A DM-driven projector (step the debrief from the DM console) if the room wants it; a protocol frame would be needed.
- crucible-host announcing a locked statement to the room before the clock runs, and refreshing private views (votes) while paused (protocol notes 2 and 8); the in-page host does both.
- The cloud deployment (`--mode cloud`) once the host has it; the client already takes `wss://`.
