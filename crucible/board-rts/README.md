# Command board (WebGL)

The rendering foundation for the six-table session: the Concordia island as a command-center map, drawn with PixiJS on WebGL, driven by the engine running as WebAssembly in the same page. One self-contained file, no network once built, works from `file://`. It leaves `board/` (the SVG live board) untouched.

```bash
cd crucible
cargo build -p crucible-wasm --target wasm32-unknown-unknown --release
node board-rts/build.mjs nursing-60          # writes board-rts/index.html (2.6 MB, not committed)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node board-rts/check.mjs   # headless check, screenshots, frame times
```

`build.mjs` inlines the vendored PixiJS (`vendor/pixi.min.js`, MIT, version printed at build), the engine's `.wasm`, the island art (`../board/concordia-1400.jpg`, read by path) and the session's content: parishes, the ring and crater road segments exactly as the engine reads them, the timeline windows, personas, values and dilemma titles. It refuses to build if any road segment names an unknown parish.

## What renders

- **Island and sea.** The art under a cool tint; the sea takes the art's own sea colour sampled at load, with a command grid, radar rings and a vignette that hides the art's square edge. The shoreline is traced from the image at load (sea-pixel classification on 120 bearings) so territories stop at the water.
- **Territories.** Six parish sectors in the six parish colours, the crater as Heartland, with name, role tag, five system bars (P C R W H), an `ISOLATED` chip, hover tooltip and a pulsing selection outline. Click inspects a parish in the side panel; double-click focuses the camera.
- **Routes.** The content's ring road (five arcs between the ring parishes), one access spur per parish and the two crater roads. A piece is open under the same rule as `connectivity::roads_step`: both ends' `roads` level above FAILED, crater roads also closed at 65 mph wind (`stormPassable: false`) or 2 in/h rain (`floodRisk`). Cut pieces turn red and dashed and say so in words, `CUT T-06:30`, stamped with the tick the cut began. Cuts and reopenings are derived events in the alert feed.
- **Convoys.** Mock units that travel the open route between parishes (BFS over the engine's edges), stop at a barrier and turn back when a piece on their path is cut, with the token returning to the sender.
- **Storm.** Hurricane Midas from `weather.hurricane_position` each tick: spiral bands that spin with the wind, a rain shield that darkens the island beneath, the front ring, an eye once the wind reaches hurricane force, wind streaks, the track so far and (facilitator only) the forecast track. Position and wind interpolate between ticks.
- **Pings.** Expanding rings on damage (a system drops 8 points in a tick), failure, isolation and maydays; a mayday draws the thin arc from the asker to the holder. The minimap mirrors them.
- **HUD.** Top bar: quarter, window label, simulation clock, phase chip, intensity meter, the two counters (doses shipped, people safe), six resource tiles (island averages in the facilitator view, the table's own numbers in a table view, plus tokens held), and the quarter clock (15:00 countdown, start/reset). Right: the alert feed. Left: the parish panel. Bottom dock: quarter jump, play, to next quarter, speed (including **Room pace**, the session's real tempo per quarter from the experience flow), scrub bar, broadcast fog, view selector, fit, help.

## Views and fog of war

`?view=facilitator` (default) or `?view=<parishId>` (also `#<parishId>`) chooses the client. Each of the six tables runs its own client; the host projector runs the facilitator view.

Fog follows communications, as the experience flow specifies. A table always sees its own parish and sees another only while both can talk (`communications` above FAILED on both sides). A parish out of contact keeps showing its last report, dimmed and stamped `LAST REPORT T-05:45`, on the map and in the panel. Radio traffic (maydays and answers) always arrives; everything else in the feed is filtered to parishes in contact. The facilitator sees the true state; **Broadcast fog** (key F) switches the projector to the island's emergency broadcast, where a parish goes dark while its own comms are down. `?fog=0` starts with fog off.

## The state stream seam

The renderer never reads the run log directly. Everything enters through one call:

```js
session.ingest({ type: 'snapshot', snapshot, opts })   // the whole visible state at one tick
session.ingest({ type: 'event', event, opts })         // one thing that happened during it
session.ingest({ type: 'batch', items })               // several, in order
```

`World.applySnapshot` and `World.applyEvent` are the only readers; the renderer and HUD listen to the world. The local build is the **Loopback** transport of the experience flow (section 7.9): `LocalRunSource` turns the run log into snapshots and events and the local clock feeds them in. A LAN host or a cloud relay replaces that by calling `window.__crucible.external(true)` (stops the local clock) and then `window.__crucible.ingest(...)` with the host's frames; `session.transport.send(intent)` is the stub where intents will go. `history(i)` gives a late joiner the events that still matter; a snapshot may carry `last_report` for parishes already out of contact. `check.mjs` exercises this path headless.

Snapshot shape (from `RUN_LOG_SCHEMA.md` plus derived fields): `seq, t, phase, window_id, window_label, quarter, intensity, weather, storm, forecast, parishes{levels, morale, isolated}, routes{pieceId: open}, route_cut_at, counters, tokens`.

## Geography

Territories follow canon v3 (`concordia-parishes-v3.md`): Summit on the north-west bank, Sterling on the north-east, Haven on the east coast, Keystone in the south, Gateway in the west, Heartland in the crater. The content's `position` values still describe the older placement, so the board keeps its own sector table (`GEO` in `template.html`) keyed by parish id, and maps engine coordinates (the hurricane position) with `toWorld`. When `concordia.json` positions move to the art's placement, `GEO` can be derived from them.

## Mock layer

The engine has no allocation round, calls for aid, convoys, repair crews, token ledger or counters yet. `buildMock()` invents them so the visuals can be shown: deterministic from the run seed (mulberry32), every event tagged `mock: true` and marked `MOCK` in the feed and the panel, nothing feeding back into the engine. It emits an allocation round in Preparation, maydays and answers in Approach and Landfall, repair crews in Recovery, convoys checked against the route status each tick, a token ledger and the two counters. Delete the section when the core emits the real events (experience flow, section 8).

## Parameters and keys

`?view=`, `?fog=0`, `?t=<sim minutes>` (start tick), `?seed=`, `?autoplay=1`, `?lite=1` (no vignette or rain shield, fewer streaks, for weak integrated GPUs), `?aa=0` (no multisampling).

Space play/pause · 1–4 jump to quarter · [ ] speed · drag or arrows/WASD pan · wheel or +/- zoom · H fit · click inspect, double-click focus, Esc clear · F broadcast fog · M hide the HUD for a clean projection. The help panel (?) shows the live frame time.

## Measured

`check.mjs` runs Chromium headless at 1920×1080 on a software GPU (SwiftShader), which is the only GPU in the build container. It confirms the page boots from `file://` with no console errors (seed 42, 481 ticks, the same state hash as `runs/seed-42.run.json`), takes the three screenshots in `screens/` (preparation, landfall, recovery) plus a table view, exercises the ingest seam, and writes `screens/metrics.json`.

Frame time in that container is rasterization-bound: about 250 ms per frame in software, with the page's own work (script plus draw submission) at under 2 ms per frame (`cpuMs`). On a laptop with any hardware GPU the page's cost is that 2 ms; the 60 fps target at 1920×1080 has not been measured on real hardware and should be checked on the projector laptop with the `?` panel. `?lite=1&aa=0` is the fallback if it struggles.

## Left to do

- Intents (allocation, mayday, answer, repair) and the WebSocket transport once the host exists; the seam and the stub are in place.
- The cone of uncertainty from `windows[].certainty`, air and sea lanes, resident cards and the second gap, per the experience flow.
- Real-hardware frame timing on the projector laptop.
- Replace the mock layer with the core's events as they land.
