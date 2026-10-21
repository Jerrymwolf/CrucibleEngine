# Sample runs

`seed-42.run.json` is the reference run log for the viewer and the golden file
behind `tests/determinism.rs::golden_seed_42_run_is_current`: Hurricane Midas
over Concordia, seed 42, six `ai` teams with default stated values, the
timeline's suggested intensity per window, no scripted decisions, no inputs,
no session profile. Its shape follows `docs/RUN_LOG_SCHEMA.md`, version 0.2.
Fields beyond the v0.1 contract are optional extras: `t_minutes` and
`timeline_phase` on windows; `wind_mph` and `rain_in_per_hour` in the weather;
`pressure`, `expired` and `decided_by` on decisions; per-tick `rng_draws`,
`counters`, `stock`, `routes_cut` and `state_hash`; `ended` on isolation events;
connectivity statuses `backup` and `backup_exhausted`; `cascade_rules_fired`,
`counters`, `residents`, `stock` and `flags` in the summary;
`per_parish[].final_infrastructure`.

Regenerate it from the workspace root (`crucible/`) whenever the engine or the
content changes on purpose, and say so in the commit. The golden test fails
until you do:

```sh
cargo run -p crucible-cli -- run --seed 42 --content content --out runs/seed-42.run.json
cargo run -p crucible-cli -- replay runs/seed-42.run.json --content content   # prints OK <state_hash>
cargo run -p crucible-cli -- summary runs/seed-42.run.json
```

The file is compact JSON, one line of about 1.1 MB; the per-tick `stock`
sheets are most of it. `jq . runs/seed-42.run.json | less` to read it. Same
seed, same content and same inputs always produce a byte-identical file;
`cargo test` asserts this.

Other inputs to `run`:

- `--teams teams.json`:
  `[{"parish_id":"keystone","controller":"ai","stated_values":["integrity","safety"]}]`
- `--decisions decisions.json`: `{"crisis-keystone-02":{"option_id":"b","rationale":"..."}}`
- `--intensity curve.json`: `[{"t":-4320,"intensity":3}]`
- `--session parish-90`: a profile id under `content/sessions/`, or a path to a
  profile file. Schedules each table's cards, the allocation lock and the maydays.
- `--inputs inputs.json`: the tables' and the facilitator's actions as ordered
  records, for example
  `[{"t":-3000,"seq":0,"kind":"allocate","parish_id":"haven","token":"FUEL","to":"summit","count":1}]`.
  Kinds and fields are in `docs/ENGINE_SPEC.md`.
- `--until -3000`: stop after that tick; the log then carries `until` and
  `open_calls`.

A session run worth reading beside the golden file:

```sh
cargo run -p crucible-cli -- run --seed 42 --content content --session parish-90 --out /tmp/parish-90.json
cargo run -p crucible-cli -- summary /tmp/parish-90.json
```

## Seed variance (same content, 2026-10-21 binary)

| Seed | Peak wind (kt) | Landfall category | Decisions | Cascade rules fired | Parishes ever isolated | Doses shipped | People safe | State hash |
|---|---|---|---|---|---|---|---|---|
| 42 | 104.7 | Cat 3 | 68 | 16 | 6 | 177,250 | 24,096 | a92f76cb9c72 |
| 7 | 89.4 | Cat 2 | 69 | 14 | 6 | 179,375 | 24,094 | 3e889fde8694 |
| 123 | 119.2 | Cat 4 | 69 | 16 | 6 | 176,500 | 24,094 | a4ddd9034541 |
| 2026 | 104.4 | Cat 3 | 68 | 16 | 6 | 177,250 | 24,096 | 090e3fedf062 |
| 31337 | 103.2 | Cat 3 | 68 | 15 | 6 | 178,250 | 24,096 | 5dcbb8ec6bb2 |

Peak wind varies with the seeded track perturbation; the category is the
Saffir-Simpson band of that peak. Decisions vary with dilemma selection order
and the drift model's seeded noise; the counters vary with the decisions'
effects on residents and doses and with the `chance` effects. Every row is
reproducible: the same seed gives the same hash.
