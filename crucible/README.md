# Crucible Engine

The simulation core of The Values Crucible: a facilitated, multi-team crisis simulation for leadership development. Six teams each run a parish on the fictional island of Concordia while Hurricane Midas approaches, strikes, and passes. The simulation exists to surface the gap between the values a team states before the storm and the values it enacts under pressure. The hurricane is the vehicle; the dilemmas are the lesson.

This directory is a restart. The previous TypeScript application in `../apps` and `../packages` is kept only until this engine replaces it.

## Layout

| Path | What it is |
|---|---|
| `content/` | The world as data: parishes, hurricane timeline, cascade rules, dilemmas, personas, values deck, intensity levers. Exported from the old TypeScript constants. Facilitators edit these files, never Rust. |
| `docs/ENGINE_SPEC.md` | The simulation model, determinism rules, property tests, and CLI contract. |
| `docs/RUN_LOG_SCHEMA.md` | The run log contract. Everything downstream reads only this document. |
| `docs/rea-micropolis-brief.md` | Mechanics brief produced with REA on Micropolis, the GPL-released SimCity engine. Descriptive only; see its license hygiene section. |
| `crates/crucible-core` | The deterministic headless core. |
| `crates/crucible-cli` | The `crucible` command: `run`, `replay`, `validate`, `summary`. |
| `viewer/` | A single-file replay viewer built from a run log. `node viewer/build.mjs <run.json> <out.html>`. |
| `crates/crucible-wasm` | The core compiled for the browser, content embedded. |
| `board/` | The live board for running a session in the room. See `board/README.md`. |
| `content/sessions/` | Session profiles: which dilemmas each table is asked, the values deck, the rounds. |
| `runs/` | Sample runs and how to regenerate them. |

## Quick start

```bash
cd crucible
cargo test
cargo run -p crucible-cli -- validate --content ./content
cargo run -p crucible-cli -- run --seed 42 --content ./content --out runs/seed-42.run.json
cargo run -p crucible-cli -- replay runs/seed-42.run.json
cargo run -p crucible-cli -- summary runs/seed-42.run.json
node viewer/build.mjs runs/seed-42.run.json viewer/index.html
```

## Determinism

One ChaCha20 random number generator seeded from `--seed`. Ordered maps wherever order reaches the output. No wall clock in the core. The same seed, content, and inputs produce a byte-identical run log, and `replay` re-executes from the seed and the recorded decisions to reproduce `summary.state_hash`. A simulation that cannot be replayed cannot be a research instrument.

## Model in one paragraph

Time advances in 15-minute ticks from T-72h to T+48h (24 hours past the start of the last timeline window). Each tick: the hurricane window and weather advance; weather degrades exposed systems per parish; power, water, and communications are traced from their sources across operational links, and parishes cut off by road are marked isolated; cascade rules fire once when a trigger system crosses its threshold and land their effects after a delay; eligible dilemmas are presented at a cadence that rises with intensity; teams decide, by script or by a drift model that honors stated values at low pressure and trades them for expedience as pressure rises; consequences land immediately or later; and the tick is appended to the log. At the end the engine computes, per parish, the gap between each stated value's rank and the mean signal of the decisions actually taken.

## Status

Live replay of the seed-42 run: https://claude.ai/artifact/B2cRJHXFbukqSPyMUBBg2E (private to the owner until shared).

Built overnight on 2026-10-18 in a 90-minute ultracode session. See `../CrucibleDocumentInventory/decision-2026-10-18-restart.md` for the decision and `../CrucibleDocumentInventory/2026-10-18-overnight-build-log.md` for what was and was not finished.
