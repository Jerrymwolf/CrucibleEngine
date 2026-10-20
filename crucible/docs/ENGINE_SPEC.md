# Crucible Engine core, v0 specification

The Values Crucible is a facilitated, multi-team crisis simulation. Six teams each run a parish of the island of Concordia during Hurricane Midas. The simulation exists to surface the gap between the values a team states before the storm and the values it enacts under pressure. The hurricane is the vehicle; the dilemmas are the lesson. Executives, not gamers, are the users.

This document specifies the headless simulation core. No UI, no network, no LLM calls live here. The core must be deterministic: same seed, same content, same inputs, byte-identical run log.

## Inputs

- `content/` JSON files (exported from the previous TypeScript constants; shapes are whatever the files contain, read them):
  - `concordia.json`: PARISHES (6, keyed by upper-case id, with position, population, keyAssets, resources, dependencies, vulnerabilities), PARISH_DEPENDENCIES, INFRASTRUCTURE (power, water, comms sources), RING_ROAD, CRATER_ROADS, SUPPLY_CHAIN.
  - `timeline.json`: HURRICANE_MIDAS windows (T-72h to T+24h) with weather, certainty, infrastructure failures, available decision types.
  - `infrastructure.json`: CASCADE_RULES (16), DEGRADATION_RATES, INFRASTRUCTURE_THRESHOLDS, INITIAL_INFRASTRUCTURE_STATUS.
  - `dilemmas.json`: ALL_DILEMMAS (45) with phase, parish, trigger, options, values tested, consequences, persona.
  - `personas.json`, `values.json` (VALUES_DECK of 40), `intensity.json` (10 levels, 7 levers, directive types), `decisionTypes.json`, `production.json`.
- A seed (u64).
- Optional scripted inputs: a JSON file of decisions keyed by dilemma id (`{"crisis-keystone-02": {"option_id": "b", "rationale": "..."}}`), an intensity curve (`[{"t": -4320, "intensity": 3}, ...]`), and directives. Anything not scripted is decided by the built-in controllers.

## Model

Time: discrete ticks of 15 simulation minutes from T-72h (t = -4320) to T+24h (t = 1440). Each tick runs, in this order:

1. **Window and weather.** Advance the hurricane timeline window from `timeline.json`. Interpolate wind, rain, surge between windows. Emit `window_transition` on change. The hurricane position moves along a track toward the island; the track may be perturbed by the seed so that the storm can weaken, strengthen, or shift, within the bounds the timeline allows.
2. **Degradation.** Apply weather degradation to each parish system using DEGRADATION_RATES, the parish's vulnerabilities, and the current intensity multiplier. Emit `degradation` events for changes of 5 points or more.
3. **Connectivity (Micropolis-derived).** Power, water, and communications are not independent per parish; they flow from sources over links. Sources and links come from `concordia.json` INFRASTRUCTURE, PARISH_DEPENDENCIES, RING_ROAD, CRATER_ROADS. Each tick, flood-fill from each live source across operational links; a parish not reached loses that system at a bounded rate per tick unless it has local backup (generators in `resources`), which buys a limited number of hours. Emit `connectivity` events on loss and restoration. Roads: a parish with no passable road path to any other parish is `isolated`; emit `isolation`.
4. **Cascades.** Evaluate CASCADE_RULES: when the trigger system in the trigger parish is at or below the threshold, schedule each effect with its delay. A rule fires at most once per run. Emit `cascade` when an effect lands.
5. **Scheduled effects.** Apply any delayed consequence or cascade effect whose time has come.
6. **Dilemmas.** For each parish, if no dilemma is open and the cadence allows (cadence rises with intensity), select an eligible dilemma: matches current phase, matches parish or is island-wide, trigger conditions met, not yet used. Selection order is deterministic from the seeded RNG. Emit `dilemma_presented` with a deadline.
7. **Decisions.** A parish with an open dilemma decides when its controller says so:
   - `script`: use the scripted option if present for that dilemma id.
   - `ai`: a drift model. Score each option as `alignment_with_stated_values * (1 - pressure) + expedience * pressure + noise`, where `pressure` is a function of intensity, the parish's own infrastructure loss, and time remaining before the deadline, and `noise` is small and seeded. Stated values come from `teams[]`. This reproduces the core finding of the design corpus: teams honor stated values at low pressure and drift under high pressure, and rationalize it. Emit `decision` with `values_signaled` and a templated rationale.
   - `human`: never decides in headless mode; the dilemma expires at its deadline with a default option marked as such.
8. **Consequences.** Apply the chosen option's immediate effects; schedule ripple and delayed effects; emit `consequence` events as they land.
9. **Snapshot.** Append the tick to the run log with infrastructure levels, morale, isolation, and the tick's events.

Intensity: the Crucible Master dial, 1..10. Default curve derives from the timeline (watch 3 to 4, crisis 5 to 9, recovery 5) unless scripted. Intensity multiplies degradation and dilemma cadence as described in `intensity.json` levers.

Values observation: for every decision, record the option's value signals on the -3..3 ABCD scale. If the content provides explicit per-option value signals, use them. If it only provides `valuesTested` for the dilemma and qualitative option text, derive signals with a documented, deterministic rule and say so in the code. At the end, compute `summary.values_gap` per parish: for each stated value, the mean enacted signal across that parish's decisions.

## Determinism

- All randomness comes from one ChaCha20 RNG seeded from `seed`. No wall clock, no HashMap iteration order in anything that affects output (use BTreeMap or sort).
- `crucible run --seed 42` twice produces byte-identical output. A test asserts this.
- `summary.state_hash` is a SHA-256 of the canonical final state. `crucible replay run.json` re-executes from the seed and the decisions recorded in the log and must reproduce the same hash.

## Property tests (proptest)

- Infrastructure levels stay within 0..100 for any seed.
- Each cascade rule fires at most once.
- Every `decision` has a matching prior `dilemma_presented`.
- `t` is strictly increasing by `step_minutes`.
- For any seed, replay reproduces `state_hash`.

## CLI

- `crucible run --seed <u64> [--content <dir>] [--decisions <file>] [--intensity <file>] [--teams <file>] --out <file>` prints a readable timeline table (time as T-72:00 style, window, intensity, notable events) and writes the run log.
- `crucible replay <run.json>` re-executes and prints OK with the hash, or a diff of the first divergence.
- `crucible validate [--content <dir>]` checks referential integrity: dilemma parish ids exist, cascade rule parish and system ids exist, timeline windows are monotonic, persona ids referenced by dilemmas exist. Exit non-zero on failure.
- `crucible summary <run.json>` prints per-parish outcomes and the values gap table.

## Code shape

- Cargo workspace at `crucible/` with crates `crucible-core` (library) and `crucible-cli` (binary).
- Modules in core: `content`, `state`, `rng`, `weather`, `connectivity`, `cascade`, `dilemma`, `controller`, `values`, `sim`, `log`, plus `morale` (amendment 3) and `validate`. No file over 400 lines. Unit tests beside the code, integration tests in `tests/`.
- Dependencies: serde, serde_json, rand, rand_chacha, sha2, thiserror, anyhow, clap, proptest. Nothing else without a reason stated in a comment.
- `cargo test` and `cargo clippy --all-targets -- -D warnings` must pass.
- Content is never embedded in Rust source. The core reads the JSON directory at runtime. Facilitators edit content, not code.

## What is out of scope for v0

Server, websockets, persistence beyond the run log, any UI, any LLM call, authentication, reports. Those come after the headless core replays a session identically.

## Amendments, 2026-10-18 overnight build

1. **Run length.** The run continues 24 hours past the start of the final timeline window (T+48h with the current content), so recovery-phase dilemmas are presented and decided. Ending at the window start left recovery one tick long. Constant `RECOVERY_PLAY_MINUTES` in `sim.rs`.
2. **Connectivity capacity (from the REA brief, e.1).** Power is served from the source in content priority order, then by population; the number of parishes carried is `ceil(source_power / 20)`. Parishes with backup generators hold power at or below 60 for 24 hours (priority parishes) or 12 hours (others) while disconnected. Constants live in `connectivity.rs` until content carries them.
3. **Morale integrator (e.3).** Per-parish pressure in -2000..2000 updated hourly from `(service_index - 1) * 60` plus 50 times each decision's summed value signals; morale tracks `50 + pressure / 40` with smoothing 0.25 per tick; isolated parishes do not recover. The gain was lowered from the reference's 150 after it saturated within a day of landfall.
4. **RNG draw counts (e.5).** Each tick logs `rng_draws`; a property test asserts the per-tick counts are identical across two runs of the same seed.
5. **Known limits.** No directive or narrative events yet; the timeline's authored infrastructure states are not used as forcing inputs; numeric consequences are derived from value signals because content carries only narrative sketches; calibration is first-cut.

## Amendment, 2026-10-20: live mode

Decided with Jerry for the nursing leaders session; see `../../CrucibleDocumentInventory/decision-2026-10-19-nursing-leaders-60min.md`.

- `RunConfig.live` (CLI `run --live`). Teams with controller `human` never decide headlessly. In live mode the run halts at the first tick where a human team has an open dilemma with no scripted decision, before that tick's decisions are taken, and returns the log so far with `pending` listing those dilemmas.
- To continue, add each pending decision to the scripted decisions with `t` set to the reported tick and run again from the seed. Because a run costs about 60 ms, re-running from the seed is the whole mechanism: no hidden session state, and the halted log is an exact prefix of the continued one (tested in `tests/live.rs`).
- A human team's entered decision is logged with controller `human`, not `script`.
- Runs without `live` are unchanged: the committed seed-42 run is reproduced byte for byte.
