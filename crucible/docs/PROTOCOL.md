# Crucible session protocol, v1

The wire contract between `crucible-host` and every client (table console, phone, projector, DM console). It implements section 7.3 of `../../CrucibleDocumentInventory/decision-2026-10-21-rts-experience-flow.md`: one protocol, independent of transport, spoken by the LAN host and the cloud host alike. Changing it is a decision; record it there and bump `v` here.

The host is authoritative and the core is deterministic: clients send **intents**, never state; the host assigns every accepted intent the tick at which it applies, re-runs the core from the seed with every input so far, and sends each client a filtered view of each new tick with that tick's state hash. The input log is the session; the run log is a derivation (`RUN_LOG_SCHEMA.md`).

## 1. Transport

Anything that carries reliable, ordered, bidirectional text frames and reports open, closed and error: a WebSocket on a LAN (`ws://192.168.8.1:7878/ws`), a WebSocket over TLS to the cloud (`wss://play.<domain>/ws`), an in-page loopback, a saved file. One frame is one JSON object. Client frames are capped at 64 KB; the host closes a connection that exceeds it. Host frames are usually a few KB; the one exception is a snapshot (`welcome`, `admitted`, `snapshot`), which may reach a few hundred KB because it carries the event history.

## 2. Envelope

```jsonc
{ "v": 1, "type": "state", ... }
```

`v` is the protocol version (this document: 1). `type` names the frame. The host answers a `hello` whose `v` differs with `reload` and closes. Unknown fields are ignored; unknown `type`s are answered with `error { code: "bad_frame" }`.

Two kinds of host frame carry a **`seq`**: `state` and `phase`. They are the replayable stream of the session, numbered from 1 in the order the host emitted them, the same for every client. Every other frame (`welcome`, `lobby`, `admitted`, `waiting`, `snapshot`, `intent_result`, `roster`, `pong`, `reload`, `error`) is unsequenced.

Times: `t` is always a simulation time in signed minutes from landfall (`-4320` is T-72:00), a multiple of `step_minutes` (15). Wall-clock time never appears in a frame except `pong.wall` and the input log's `wall` field.

## 3. Identity

A session has a **code**; every role in it has a **token**. The host generates them when the session is created and they are new for every session.

| Credential | Form | Grants |
|---|---|---|
| `session_code` | 6 characters from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no 0, 1, I, O), case-insensitive | The lobby only |
| table token | 32 hex characters (128 bits), one per parish | That parish's `console` or `phone` seat without the lobby |
| dm token + PIN | 32 hex characters, plus a 4-digit PIN typed at the console | The `dm` role |
| projector token | 32 hex characters | The `projector` role (read-only) |
| `client_id`, `resume_token` | issued by the host in `welcome` / `admitted` | Reconnecting as the same device and seat |

Tokens ride in the URL **fragment**, never the query string, so they stay out of server and proxy logs:

- lobby: `http://<host>:7878/j/G7K2PQ`
- table: `http://<host>:7878/j/G7K2PQ#t=<table_token>`
- projector: `http://<host>:7878/j/G7K2PQ#p=<projector_token>`
- DM: `http://<host>:7878/j/G7K2PQ#dm=<dm_token>` (the PIN is typed)

The client reads the code from the path and the token from the fragment, keeps `client_id`, `resume_token` and the token in local storage, and sends them inside `hello`. The host prints the code, the lobby QR and every link to the terminal at start, and serves the lobby QR at `/join`.

## 4. Roles

| Role | Sends | Receives in `private` | Fog |
|---|---|---|---|
| `console` | `lock_values`, `allocate`, `decide`, `mayday`, `answer_aid`, `declare_hidden`, `repair_send`, `credit_line` | Own parish: open cards, open calls, allocation entries, stock, vote counts, the secret brief, own inputs | Yes |
| `phone` | `personal_pick`, `vote`, `commitment` | Own parish: open cards, own votes and pick | Yes |
| `projector` | `ack`, `ping` only | nothing | No |
| `dm` | Every DM kind (section 9.3), and every console kind with `parish_id` in the payload (entering for a table) | Everything: true state, all six briefs, all open cards and calls, every table's entries and vote counts with their split, seats, clients, flags | No |

All roles may send `ack`, `resync` and `ping`. The seat is the parish, not the device: a parish has one `console` seat and any number of `phone` seats, and a device that comes back with its `client_id` and `resume_token` is the same seat.

## 5. HTTP endpoints

| Method and path | Returns |
|---|---|
| `GET /`, `GET /j/{code}` | The client bundle (`text/html`). `/j/{code}` with an unknown code is a 404 page. |
| `GET /join` | The lobby QR as `image/svg+xml` (encodes `<public_url>/j/<CODE>`). |
| `GET /join/{parish}.svg?dm=<dm_token>` | That table's QR with its token. DM only (403 otherwise). |
| `GET /links?dm=<dm_token>` | JSON `{ code, public_url, lobby, tables: {parish: url}, projector, dm }`. DM only. |
| `GET /export?dm=<dm_token>` | The run log at the current horizon (`run.json`); also writes it to the session directory. DM only. |
| `GET /health` | JSON `{ ok, code, phase, t, seq, clients }`. |
| `GET /ws` | The WebSocket. |

The LAN host runs plain `http://` and `ws://` (section 7.7 of the decision record: a LAN address is not a secure context and a certificate on every guest phone is not acceptable). The cloud host sits behind a TLS proxy; the frames are identical.

## 6. Join flow

Identical in both deployments.

1. The device opens the link (QR scanned by the phone's camera app, or the code typed at the landing page) and connects to `/ws`.
2. It sends `hello`.
   - With a **table token** and `role: "console"`: the console seat is granted if it is free, or held by a device that is not connected (a dead tablet is replaced by the next device at that table). If a connected device holds it, the host answers `waiting { reason: "console_held" }` and keeps the connection; the DM's `reassign` turns it into `admitted`. With `role: "phone"` (the default) the seat is granted at once.
   - With the **dm token** and the right `pin`: `welcome` as `dm`. A wrong PIN is `error { code: "bad_pin" }`.
   - With the **projector token**: `welcome` as `projector`.
   - With a **code only**: `lobby { seats }`. The device then sends `claim_seat { parish, role }`: a phone seat or a free console seat is granted at once (`admitted`); a console seat held by a connected device is `waiting { reason: "console_held" }` until the DM's `admit` or `reassign`.
   - With `client_id` and `resume_token`: the same seat as before, whatever its state, as `welcome`.
3. `welcome` and `admitted` carry a full snapshot (section 8). From then on the client receives `state` and `phase` frames and sends intents.

## 7. Frames

### 7.1 Client to host

```jsonc
{ "v": 1, "type": "hello",
  "session_code": "G7K2PQ",         // required without a token; checked when given
  "token": "<32 hex>",              // table, dm or projector token (optional)
  "role": "console",                // with a table token: "console" or "phone" (default "phone")
  "pin": "4821",                    // with the dm token
  "client_id": "c_…", "resume_token": "<32 hex>",   // reconnecting as the same device
  "last_seq": 118,                  // highest seq the client applied (optional; see 10)
  "bundle_hash": "<64 hex>",        // optional: the hash of the page the client runs (see 12)
  "name": "Haven captain" }         // optional label; never required, never verified

{ "v": 1, "type": "claim_seat", "parish": "haven", "role": "console" }

{ "v": 1, "type": "intent", "client_seq": 7, "kind": "decide",
  "payload": { "dilemma_id": "v3-prep-haven", "option_id": "a", "rationale": "The port stays open." } }

{ "v": 1, "type": "ack", "seq": 120 }
{ "v": 1, "type": "resync", "from_seq": 118 }
{ "v": 1, "type": "ping" }
```

`client_seq` is the client's own counter, increasing per device. The host de-duplicates on `(client_id, client_seq)` and answers a repeat with the original result, so a client may re-send every unanswered intent after a reconnect.

### 7.2 Host to client

```jsonc
{ "v": 1, "type": "welcome", "client_id": "c_…", "resume_token": "<32 hex>", "role": "console", "parish": "haven",
  "bundle_hash": "<64 hex>", "snapshot": { … } }                          // section 8; the answer to hello, and sent again unasked
                                                                          // when the DM's reassign or admit changes this device's role

{ "v": 1, "type": "lobby", "seats": [ { "parish": "haven", "name": "Haven", "console": "free", "phones": 2 } ] }
                                      // console: "free" | "held" (a connected device) | "offline" (held by a disconnected device)
{ "v": 1, "type": "admitted", "role": "console", "parish": "haven", "client_id": "c_…", "resume_token": "<32 hex>", "snapshot": { … } }
{ "v": 1, "type": "waiting", "reason": "console_held", "parish": "haven" }
{ "v": 1, "type": "snapshot", "snapshot": { … } }                        // answer to a resync the buffer cannot serve

{ "v": 1, "type": "state", "seq": 121, "t": -3600, "hash": "<64 hex>",
  "clock": { "phase": "running", "quarter": 0, "running": true, "seconds_per_tick": 4.583, "horizon_t": -3600, "quarter_end_t": -2160 },
  "public": { … },                                                       // section 9.1
  "private": { … } }                                                     // console, phone, dm only; section 9.2

{ "v": 1, "type": "phase", "seq": 122, "t": -2160, "kind": "quarter_close", "payload": { "quarter": 0, "id": "prep", "title": "Quarter 1: Preparation" } }

{ "v": 1, "type": "intent_result", "client_seq": 7, "status": "accepted", "input_seq": 41, "applied_t": -3585 }
{ "v": 1, "type": "intent_result", "client_seq": 7, "status": "rejected", "reason": "expired", "message": "the deadline T-45:00 passed" }

{ "v": 1, "type": "roster", "seats": [ … as lobby … ], "clients": [ { "client_id": "c_…", "role": "phone", "parish": "haven", "connected": true, "name": "…" } ] }   // dm only, on every change

{ "v": 1, "type": "reload", "reason": "protocol version 2 is not 1" }
{ "v": 1, "type": "error", "code": "bad_token", "message": "…" }
{ "v": 1, "type": "pong", "wall": "2026-10-21T14:03:22.118Z" }
```

Error codes: `no_such_session`, `bad_token`, `bad_pin`, `bad_frame`, `frame_too_large`, `rate_limited`, `not_welcome` (an intent before `hello` succeeded), `too_many_connections`, `unknown_client` (a `client_id` the host does not know with a `resume_token` that does not match: the device must join afresh).

## 8. The snapshot

Everything a client needs to render from nothing: carried by `welcome`, `admitted` and `snapshot`.

```jsonc
{
  "seq": 121, "t": -3600, "hash": "<64 hex>",                 // the last sequenced frame this snapshot covers; 0 before any
  "session": {
    "code": "G7K2PQ", "profile": "parish-90", "seed": 42, "content_hash": "<64 hex>", "engine": "0.1.0", "log_version": "0.2",
    "step_minutes": 15, "t_start": -4320, "t_end": 2880,
    "roster": ["gateway", "heartland", "keystone", "haven", "summit", "sterling"],        // human tables
    "parishes": [ { "id": "haven", "name": "Haven", "population": 4800, "position": { "x": 70, "y": 50 }, "role": "port" } ],
    "windows": [ … as RUN_LOG_SCHEMA windows … ],
    "quarters": [ { "index": 0, "id": "prep", "title": "Quarter 1: Preparation", "from_t": -4320, "to_t": -2160, "phase": "watch",
                    "card_seconds": 90, "play_seconds": 660, "close_seconds": 150, "human_deadline_ticks": 39, "mayday_answer_ticks": null,
                    "second_move": "allocation", "card": "Midas is Category 3…", "seconds_per_tick": 4.583 } ],
    "values_deck": ["safety", "fairness", …], "values_to_pick": 3,
    "statement_template": "When Midas comes, {parish} will put ___ before ___, and we will ___.",
    "answer_reasons": ["We need it ourselves", …], "credit_prompt": "…", "commitment": "…", "debrief_question": "…"
  },
  "clock": { "phase": "running", "quarter": 0, "running": true, "seconds_per_tick": 4.583, "horizon_t": -3600, "quarter_end_t": -2160 },
  "teams": [ { "parish_id": "haven", "controller": "human", "stated_values": ["service", "honesty", "fairness"], "statement": "…" } ],
  "tick": { … the public view of the tick at horizon_t, section 9.1 … },
  "history": [ { "t": -4320, "event": { "kind": "window_transition", … } }, … ],   // feed-worthy public events so far, filtered as section 9.3, oldest first
  "history_truncated": false,                                             // true when only the most recent 400 are included
  "private": { … }                                                        // section 9.2; absent for the projector
}
```

`clock.phase` is one of `lobby`, `island`, `quarter_open`, `running`, `paused`, `quarter_close`, `debrief`. `quarter` is the 0-based index into `session.quarters`, or `null` before the first quarter opens. `horizon_t` is the last tick the host has computed. Clients never run the clock: they render `t` and count deadlines down from `deadline_t` with `seconds_per_tick`, re-anchored by every `state` frame, so a client cannot drift more than one tick. `seconds_per_tick` is the quarter's `play_seconds` divided by its ticks, divided by the host's `--speed` (1.0 in the room).

`history` holds events of these kinds: `window_transition`, `cascade`, `isolation`, `connectivity` (lost and restored only), `dilemma_presented`, `decision`, `route_cut`, `route_reopened`, `convoy_departed`, `convoy_arrived`, `convoy_turned_back`, `token_returned`, `allocation`, `values_locked`, `credit_line`, `mayday`, `aid_answer`, `aid_expired`, `resident_state`, `ship_sailed`, `consignment_missed`, `doses_lost`, `rejected` (own parish only). `degradation`, `consequence` and `chance` are left out of the history; they arrive in `state` frames.

## 9. The state frame and what each client sees

One `state` frame per tick, the same `seq`, `t` and `hash` for everyone; `public` and `private` differ per client.

### 9.1 `public`: the tick

The run log's tick (`RUN_LOG_SCHEMA.md`) with its per-parish maps reduced to the parishes this client may see, plus `fogged`:

```jsonc
{ "t": -3600, "window_id": "watch-60", "phase": "watch", "intensity": 4,
  "weather": { "wind_kts": 30, "wind_mph": 35, "rain": "light", "rain_in_per_hour": 0.1, "surge_ft": 0, "hurricane_position": { "x": 120, "y": 60 } },
  "counters": { "doses_shipped": 0, "people_safe": 24100, "vault_doses": 18250, "aboard": 0, "at_risk": 0, "injured": 0, "lost": 0 },
  "routes_cut": [], "state_hash": "<64 hex>",
  "infrastructure": { "haven": { "power": 100, … } },   // only visible parishes
  "morale": { "haven": 80 }, "isolated": [], "stock": { "haven": { "FUEL": 4, … } },
  "fogged": ["summit"],                                  // parishes out of contact for this client this tick; [] for projector and dm
  "events": [ … filtered, section 9.3 … ] }
```

### 9.2 `private`

**console**
```jsonc
{ "parish": "haven",
  "secret_brief": "Private to the Port Authority board. …",          // console and dm only; never a phone, never another table
  "pending": [ { "t": -3600, "dilemma_id": "v3-prep-haven", "title": "…", "setup": "…", "deadline_t": -3015,
                 "options": [ { "id": "a", "label": "…", "description": "…" } ] } ],   // own open cards (RUN_LOG_SCHEMA pending)
  "calls": [ { "call_id": "A3", "role": "holder", "asker": "keystone", "holder": "haven", "opened_t": -1500, "deadline_t": -1170,
               "token": "FUEL", "count": 1, "ask": "…", "line": "…", "persona_id": "…",
               "answers": { "grant": { "label": "GRANT" }, "refuse": { "label": "REFUSE" }, "part": { "label": "PART", "count": 1 } } } ],
                                                                     // open calls this table must answer (role holder) or is waiting on (role asker)
  "entries": [ { "token": "FUEL", "to": "summit", "count": 1, "seq": 12, "t": -4005 } ],   // own allocation entries before the lock (sealed to others)
  "stock": { "FUEL": 4, "GEN": 2 },
  "votes": { "v3-prep-haven": 4 },                                   // how many phones have voted on each open card; never the split
  "inputs": [ { "seq": 12, "t": -4005, "kind": "allocate", "payload": { … }, "by": "console" } ] }   // this table's accepted inputs, oldest first
```

**phone**
```jsonc
{ "parish": "haven", "pending": [ … as console … ],
  "my_votes": { "v3-prep-haven": "a" }, "my_pick": ["service", "candor", "safety"], "my_commitment": "…" }
```

**dm**
```jsonc
{ "briefs": { "haven": "…", "summit": "…", … },
  "pending": [ … every table's open cards … ], "calls": [ … every open call … ],
  "entries": { "haven": [ … ] }, "stock": { "haven": { … } },
  "votes": { "haven": { "v3-prep-haven": { "count": 4, "split": { "a": 3, "c": 1 } } } },
  "seats": [ … as lobby … ], "clients": [ … as roster … ],
  "flags": [ { "seq": 50, "t": -3000, "text": "Sterling argued ten minutes about the garages", "parish": "sterling" } ],
  "intensity_offset": 2,                                              // the sum of heat (+2) and cool (−2) so far
  "log_len": 61 }
```

### 9.3 Filtering rules

The host sends a client only what its role and parish may see. The data never reaches a client that may not see it.

- **Secret briefs** go to the owning table's `console` and to the `dm`, in `private.secret_brief` / `private.briefs`, and to everyone in the `debrief_open` phase frame. Never in a `state` frame's `public`, never to a phone, never to the projector before the debrief.
- **Allocation entries** before the lock are private to the owning table and the DM. At the lock the core emits public `allocation` events.
- **Private votes** never leave the host except as counts to the owning console and as counts and split to the DM. The export carries them keyed by anonymous `client_id`.
- **Fog** applies to `console` and `phone`. A table always sees its own parish. It sees another parish `Q` at a tick only while both can talk: `infrastructure[P].communications` and `infrastructure[Q].communications` are both above the content's FAILED threshold (`INFRASTRUCTURE_THRESHOLDS.FAILED` in `infrastructure.json`, 20) at that tick. A parish whose communications have failed is out of contact and sees only itself. A parish it cannot see is omitted from `infrastructure`, `morale`, `isolated` and `stock` and listed in `fogged`; the client keeps showing its last report, stamped with the tick it last saw.
- **Events** in a fogged client's frame: an event is kept when it has no `parish_id` (island-wide: `window_transition`, routes, convoys, the ship, the doses), when its `parish_id` is a visible parish, or when its kind is radio or public by design: `mayday`, `aid_answer`, `aid_expired`, `values_locked`, `decision`, `allocation`, `credit_line`, `token_returned`. `degradation`, `cascade`, `connectivity`, `isolation`, `dilemma_presented`, `consequence`, `resident_state` and `chance` of a fogged parish are dropped. `rejected` events are private: a table sees its own, the DM sees all, the projector none.
- **Projector** receives every public field with no fog and no `private`. **DM** receives everything.

## 10. Acks, resync and reconnect

- Clients `ack { seq }` the frames they apply; the host uses acks only for its connection view (the DM's roster).
- A client that sees a gap in `seq` sends `resync { from_seq }` with the last seq it applied. The host answers with every buffered sequenced frame whose `seq` is greater, in order, filtered for that client; or, when the buffer cannot serve it, with one `snapshot` frame.
- The first frame on a connection is always the answer to `hello` (`welcome`, `lobby`, `waiting`, `reload` or `error`); the `roster` and `lobby` broadcasts a join causes go to the other devices. A `welcome` can also arrive unasked: when the DM's `reassign` or `admit` gives a console seat away, the former holder receives a new `welcome` with `role: "phone"` and a fresh snapshot, and drops its console view.
- A disconnected client reconnects with `hello { client_id, resume_token, last_seq }`. The answer is `welcome` with a full snapshot; the client applies it and discards its stale view (snapshots are small enough at one tick per four seconds). `last_seq` is accepted and ignored: a client that wants the frames it missed sends `resync { from_seq }` after the welcome and gets them in order. Then it re-sends every intent that has no `intent_result` yet, with its original `client_seq`; the host de-duplicates. An intent whose deadline passed while the device was offline is rejected `expired`: the console says "the storm decided". A phone vote flushed after its table raised the card is recorded with `late: true` and still counts for the second gap, marked.
- Clients retry with exponential backoff (1 s doubling to 30 s) and keep `client_id`, `resume_token` and the role token in local storage.
- Late joins: a console joining in Q2 gets the snapshot and plays from there; its Q1 allocation was "keep everything" unless the DM entered a sheet for it. A phone joining mid-quarter sees the open card and may vote until the table raises its card.

## 11. Intents

### 11.1 Apply tick and results

The host computes ticks up to its **horizon** `h`. An accepted intent is appended to the input log with `t = h + step_minutes`: the next tick the host will compute, when the clock next advances. `intent_result { accepted, input_seq, applied_t }` means "recorded, and it applies at `applied_t`". The client shows "locked" at once and "recorded at T-24:15" when the tick lands. Within a tick, inputs apply in `input_seq` order before the engine's decision step.

The host validates what it can against the current state and rejects with a `reason`:

| `reason` | When |
|---|---|
| `bad_role` | The kind is not allowed for the sender's role |
| `no_seat` | A console kind from a client with no parish |
| `unknown_kind`, `bad_payload` | Not a kind, or fields missing or malformed |
| `unknown_parish` | `parish_id` (DM entering for a table) or `to` names no parish |
| `session_over` | The horizon is `t_end`; nothing can apply |
| `bad_phase` | A DM control that does not fit the phase (`start` in the lobby, `open_quarter` after the last quarter) |
| `not_open` | `decide` for a card not open for that table; `answer_aid` for a call not open with that table as holder |
| `expired` | The card's or call's `deadline_t` is before `applied_t` |
| `after_lock` | `allocate` when `applied_t` is past the profile's lock tick |
| `not_asker` | `mayday` for a call this parish does not ask, or one already raised |
| `lacks_tokens` | `allocate` or `repair_send` for more of a token than the sheet holds, pending sends included |
| `unknown_option`, `unknown_call`, `unknown_dilemma`, `unknown_token`, `bad_answer`, `bad_values` | The id or value is not in the content or the deck |

The core remains the authority: an input it cannot apply at its tick (the card was decided by the storm at the same tick, the allocation lock passed) is a `rejected` event in that tick, visible to the owning table and the DM, and changes nothing.

### 11.2 Console kinds (and the DM entering for a table)

The payload is the core input's fields (`ENGINE_SPEC.md`, amendment of 2026-10-21, `inputs.rs`) without `kind`; the host fills `parish_id` from the seat. The DM sends the same kinds with `parish_id` in the payload.

| `kind` | payload |
|---|---|
| `lock_values` | `{ values: [3 deck ids], statement? }` |
| `allocate` | `{ token, to: <parish> or "keep", count }` |
| `decide` | `{ dilemma_id, option_id, rationale? }` |
| `mayday` | `{ call_id }` |
| `answer_aid` | `{ call_id, answer: "grant" or "part" or "refuse", count?, reason? }` |
| `declare_hidden` | `{}` |
| `repair_send` | `{ token, to, count }` |
| `credit_line` | `{ to, text }` |

### 11.3 Phone kinds (recorded, never seen by the core)

| `kind` | payload |
|---|---|
| `personal_pick` | `{ values: [3 deck ids] }` |
| `vote` | `{ dilemma_id, option_id }` |
| `commitment` | `{ text }` |

### 11.4 DM kinds

| `kind` | payload | Effect |
|---|---|---|
| `open_island` | `{}` | lobby → island; phase `island_open` |
| `open_quarter` | `{}` | Opens the next quarter card with the clock stopped: phase `quarter_open` |
| `start` (alias `resume`) | `{}` | Runs the clock from the quarter card or a pause: phase `resumed` |
| `pause` | `{}` | Stops the clock: phase `paused` |
| `advance` | `{ ticks }` | Advances the horizon by `ticks` at once (never past the quarter's end), one `state` frame per tick; for rehearsal and for a DM who wants one more tick |
| `skip_ahead` | `{}` | Advances to the quarter's end; open cards expire at their deadlines on the way |
| `heat`, `cool` | `{}` | Intensity +2 / −2 from the next tick on, clamped to 1..10, on top of the profile's curve |
| `swap` | `{ parish_id, from, to }` | The core's `swap_dilemma`: replaces a scheduled or open card |
| `admit` | `{ client_id }` | Grants a waiting `claim_seat` |
| `reassign` | `{ parish_id, client_id }` | Gives the parish's console seat to that connected client (a phone promoted, a replacement tablet); the former holder becomes a phone |
| `flag` | `{ text, parish_id? }` | A notable moment, recorded for the debrief |
| `debrief` | `{}` | After the last quarter closes: phase `debrief_open` with every brief |
| `export` | `{}` | Writes `run.json`, `votes.json` and `flags.json` to the session directory |

Reaching a quarter's last tick stops the clock and emits `quarter_close`. Every DM action is appended to the input log; there is no control that sets a level, undoes a consequence or deletes an input.

## 12. Phase frames and the bundle

`phase { seq, t, kind, payload }` kinds and payloads:

| `kind` | payload |
|---|---|
| `values_open` | `{ values_deck, values_to_pick, statement_template }` (emitted once when the session is created) |
| `island_open` | `{}` |
| `quarter_open` | `{ quarter, id, title, from_t, to_t, seconds_per_tick, card, human_deadline_ticks, mayday_answer_ticks, second_move }` |
| `resumed` | `{ quarter, seconds_per_tick }` |
| `paused` | `{ quarter }` |
| `quarter_close` | `{ quarter, id, title }` |
| `debrief_open` | `{ secret_order, briefs: { parish: text }, debrief_question, commitment }` |

`welcome.bundle_hash` is the SHA-256 of the page the host serves. A client that knows its own build's hash may send it in `hello`; when it differs from the host's, the host answers `reload` so a stale cached page never plays. The hard check is `v`.

## 13. The input log, restore and export

The host appends every accepted intent and every clock step to `sessions/<date>-<CODE>/input-log.jsonl` as it happens, one line each:

```jsonc
{ "seq": 41, "t": -3585, "wall": "2026-10-21T14:03:22.118Z", "source": { "client_id": "c_…", "parish": "haven", "role": "console" },
  "kind": "decide", "payload": { "dilemma_id": "v3-prep-haven", "option_id": "a" }, "core": true }
{ "seq": 42, "t": -3585, "wall": "…", "source": { "role": "host" }, "kind": "tick", "payload": {}, "core": false }
```

`seq` is the host's receipt order; `t` is the tick the entry applies to (for `tick`, the new horizon); `wall` is kept for research and never reaches the core; `core` says whether the core sees the kind. Core kinds: the console kinds, `swap`, `heat`, `cool`. Recorded only: the phone kinds and `open_island`, `open_quarter`, `start`, `pause`, `advance`, `skip_ahead`, `admit`, `reassign`, `flag`, `debrief`, `export`, `tick`.

`session.json` (written at creation) holds the code, the seed, the profile id, the content hash, the roster, the tokens, the PIN and the public URL; `clients.json` holds the devices and their resume tokens. `crucible-host --restore <dir>` reloads all three, re-runs the core to the saved horizon, resumes **paused** at it, prints the QR again, and the devices reconnect with the tokens they hold. Both deployments write the same files, so a session can move between hosts.

Export writes `run.json` (the run log at the current horizon, `RUN_LOG_SCHEMA.md` 0.2), `votes.json` and `flags.json` to the session directory. `crucible replay run.json --content ./content` reproduces `summary.state_hash`; the host's last `state.hash` equals it.

## 14. The per-tick hash

Every `state` frame carries `hash`, the core's `state_hash` for that tick (what `HashedState` covers is in `ENGINE_SPEC.md`). It is the same for every client whatever it may see. The projector's mirror, the restore path and any console that chooses to verify compare against it; the integration test asserts that the exported run log replays to the host's final hash.

## 15. Deployments and the seam

`--mode lan` (now): one session per process, created at start, plain HTTP on the LAN address, the bundle read from `--bundle`, the session directory on the laptop. `--mode cloud` (later, build item 11): the same binary behind a TLS proxy, many sessions per process created by a signed-in facilitator, a persistent volume, retention and a health endpoint. The server keeps sessions in a registry keyed by code so that the cloud mode adds a creation API and sign-in, never a frame. Today `--mode cloud` exits with a message.

## 16. Where this differs from the decision record (7.3), and why

1. `welcome` always carries a full snapshot; `last_seq` deltas are served by `resync`. One recovery path is less to get wrong on a phone that slept.
2. Frames from clients are capped at 64 KB; the host's snapshot frames may exceed it, with the history capped at the most recent 400 events.
3. `claim_seat` is answered with `admitted` carrying a snapshot, so the lobby path and the token path end in the same place.
4. DM kinds `advance`, `skip_ahead`, `open_island`, `debrief` and `export` are added: rehearsal, overruns and the end of the session need them. `manual_decide` and `manual_allocate` are the console kinds sent by the DM with `parish_id`.
5. With a table token, a console seat whose holder is disconnected is taken by the next device that asks; only a seat held by a connected device waits for the DM.
6. `heat` and `cool` are ±2 on the profile's curve, as the DM console description reads ("Heat up twice: intensity jumps four").
7. Fog is keyed to the content's FAILED threshold for communications (`INFRASTRUCTURE_THRESHOLDS.FAILED`, 20), not to zero: a parish whose communications the engine calls failed is out of contact, which is how the cascade rules already read the number.
8. `hello.last_seq` does not make the host push a delta; the client asks with `resync` after the `welcome`. One path for catching up.
9. A device whose console seat the DM gives away gets a second, unasked `welcome` as a phone, so no device keeps a console view it no longer holds.
