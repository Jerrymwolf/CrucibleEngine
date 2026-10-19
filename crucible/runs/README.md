# Sample runs

`seed-42.run.json` is the reference run log for the viewer: Hurricane Midas over
Concordia, seed 42, six `ai` teams with default stated values, the default
intensity curve, no scripted decisions. Its shape follows
`docs/RUN_LOG_SCHEMA.md`; fields beyond the contract (`t_minutes`,
`timeline_phase`, `wind_mph`, `rain_in_per_hour`, `pressure`, `expired`,
`final_infrastructure`, `cascade_rules_fired`, per-tick `rng_draws`, `ended` on isolation events,
connectivity statuses `backup` and `backup_exhausted`) are optional extras.

Regenerate it from the workspace root (`crucible/`):

```sh
cargo run -p crucible-cli -- run --seed 42 --content content --out runs/seed-42.run.json
cargo run -p crucible-cli -- replay runs/seed-42.run.json --content content   # prints OK <state_hash>
cargo run -p crucible-cli -- summary runs/seed-42.run.json
```

The file is compact JSON (one line). `jq . runs/seed-42.run.json | less` to read it.
Same seed, same content and same inputs always produce a byte-identical file;
`cargo test` asserts this. Other inputs: `--teams teams.json`
(`[{"parish_id":"keystone","controller":"ai","stated_values":["integrity","safety"]}]`),
`--decisions decisions.json` (`{"crisis-keystone-02":{"option_id":"b","rationale":"..."}}`),
`--intensity curve.json` (`[{"t":-4320,"intensity":3}]`).

## Seed variance (same content, 2026-10-18 binary)

| Seed | Peak wind (kt) | Landfall category | Decisions | Cascade rules fired | Parishes ever isolated | State hash |
|---|---|---|---|---|---|---|
| 42 | 113.4 | Cat 4 | 45 | 16 | 6 | dcdf85b987f6 |
| 7 | 96.8 | Cat 3 | 45 | 15 | 6 | 0d5b423b6248 |
| 123 | 129.1 | Cat 4 | 45 | 16 | 6 | e46686a3431f |
| 2026 | 113.0 | Cat 4 | 45 | 16 | 6 | b3710c36650c |
| 31337 | 111.8 | Cat 3 | 45 | 16 | 6 | e7826d9c9b03 |

Peak wind varies with the seeded track perturbation; decisions vary with dilemma selection order and the drift model's seeded noise. Every row is reproducible: the same seed gives the same hash.
