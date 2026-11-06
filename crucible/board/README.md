# Live board

One self-contained page for running a session in the room: the Concordia island as a game board, the engine running in the browser, and a facilitator (DM) rail. It needs no network once built.

```bash
cd crucible
cargo build -p crucible-wasm --target wasm32-unknown-unknown --release
node board/build.mjs nursing-60          # writes board/index.html (about 1.8 MB, not committed)
```

Open `board/index.html` on the facilitator laptop. **Projector window** opens a second copy that mirrors the board without the DM controls; drag it to the projector. If popups are blocked, **Room layout** hides the DM controls in the same window.

Flow: values lock (each table ranks three values) → briefing (the storm plays to T-48h) → four decision beats, each showing every table's question at once → reveal the raised cards → play the storm forward → debrief (stated values beside enacted signal).

DM levers: **Heat up** and **Cool down** change storm intensity from the next tick; every move is recorded as an engine input and listed in the debrief. **Rehearse** fills choices at random so a session can be walked through beforehand. **Table sheets** is one printable page per table with its four questions and A/B/C/D options.

The session is saved in the browser as it goes; reloading offers **Resume saved session**, which re-runs the engine from the seed and the entered choices.
