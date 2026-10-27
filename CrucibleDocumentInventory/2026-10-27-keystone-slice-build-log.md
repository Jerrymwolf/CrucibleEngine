---
type: build-log
date: 2026-10-27
status: built-untested-in-godot
tags: [values-crucible, keystone-slice, godot, ai-director, phase-2]
related: ["[[audit-2026-10-26-rts-design-plan]]", "[[decision-2026-10-26-rts-to-reverse-engineer]]", "[[design-2026-10-21-rts-godot]]"]
---

# Keystone slice build log, 2026-10-27

Jerry chose "Build the Keystone slice" and then "In Godot now". This is the phase 2 go/no-go build: Keystone, both teams, three storm turns, AI-written moments. Jerry plays about 10 minutes and gives a go or no-go.

## What was built

- **Content:** `crucible/content/keystone_slice.json` holds the sites, units, three storm turns, loss and yield rates, meters, recovery, named residents, voices and three written fallback moments. Nothing about the rules is hard-coded.
- **Reference engine:** `crucible/slice/engine.js`. Deterministic: one seeded RNG per turn (mulberry32), and the replay check is an FNV-1a hash of the state. What the AI writes is logged as an input, so replay never calls the AI.
- **Balance ledger:** `crucible/slice/sim.mjs` runs 1000 seeds with random moment picks for every policy.
- **Godot project:** `crucible/godot/keystone_slice/`. The rules are ported to `engine.gd`, alongside the Director, the console and the map. The golden parity test is `tests/run_tests.gd`, driven by `crucible/slice/golden.mjs`.
- **Browser test page:** `crucible/slice/keystone-slice.html`. It is the same slice and is kept as a fallback. It has not been published.

## Measured (1000 seeds)

| community | meridian | community wins | meridian wins | community index | meridian index |
|---|---|---|---|---|---|
| nothing | nothing | 9.5% | 89.6% | 59.7 | 90.8 |
| nothing | careful | 3.6% | 96.2% | 75.1 | 106.7 |
| careful | nothing | 75.1% | 24.0% | 125.1 | 103.6 |
| careful | careful | 44.5% | 53.6% | 126.6 | 128.8 |

- Acting beats doing nothing for both teams on their own index.
- Careful play against careful play is close to even.
- Same seed, same hash.

## Left undone and known weaknesses

- **Godot was not run.** This build environment would not run a downloaded Godot binary. The GDScript passes a syntax parser (gdtoolkit), but nobody has opened it in the editor or run the parity test yet. The first job on Jerry's machine is `godot --headless --script res://tests/run_tests.gd`, which must print PASS.
- **Do-nothing Meridian still wins 24% against a careful community.** The cause is not yet pinned down. Watch for it in the playtest.
- **The REA question is open.** Jerry asked whether REA should run on Frostpunk 2 before the slice or after his playtest. The recommendation is after.
- **Only one parish exists.** There are no phones, no network, and no CM controls beyond pause and +30 s.
