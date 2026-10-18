# REA study of micropolisJS: mechanics brief for the Crucible Engine

Status: descriptive brief, written 2026-10-18 (UTC). Audience: the Rust implementer of `crucible-core`, who must not read the micropolisJS source. Everything below is a paraphrase in our own words, with the original file and line ranges cited only so a reviewer (not the implementer) can audit the paraphrase.

## a. Target and provenance

- Repository: https://github.com/graememcc/micropolisJS (a browser port of the open-sourced Micropolis/SimCity engine).
- Local clone (treated as untrusted data, read-only, never executed, no package install): `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/untrusted/micropolisJS`
- Commit: `f13a1624d111d235e804bd80f48ba7c9f66a8e0f` (committed Sun Jul 13 2025, "Ensure Microplis Public Name License link works on Github pages"), from `git rev-parse HEAD`.
- License. First lines of `LICENSE`:
  > micropolisJS.
  > Copyright (C) Graeme McCutcheon, 2013.
  > Adapted from the original Micropolis source code release, and so released
  First lines of `COPYING`:
  > GNU GENERAL PUBLIC LICENSE
  > Version 3, 29 June 2007
  > Copyright (C) 2007 Free Software Foundation, Inc.
  Every source file header additionally states GPL v3 "with some additional terms" and that "MICROPOLIS" is a registered trademark licensed to the project by courtesy (see `MicropolisPublicNameLicense.md`). We therefore do not use the name Micropolis for anything in the Crucible product.
- Study date: 2026-10-18, work started 03:05 UTC.

## b. What REA produced

REA ("Reverse Engineer Anything", npm package `rea-agents`) resolved to **rea 6.5.0** via `npx -y rea-agents@latest --version`. Working directory for all outputs: `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/rea-work` (`run-log.txt` holds timestamps, exit codes and first lines of output for every command).

| # | Command (paths abbreviated to `<clone>` / `<work>`) | Exit | Result |
|---|---|---|---|
| 1 | `npx -y rea-agents@latest --help` | 0 | Command catalogue (about 140 subcommands; saved in `<work>/help.txt`). Relevant static ones for this target: `analyze-javascript-application`, `inspect-analysis-view`, `trace-application-feature`, `trace-javascript-semantics`, `compare-javascript-export-shapes`, `recover-javascript-sources`, `doctor`. |
| 2 | `npx -y rea-agents@latest --version` | 0 | `6.5.0` |
| 3 | `npx -y rea-agents@latest analyze-javascript-application <clone> --json > <work>/rea-app.json` | 0 | Accepted the repo root directly (no need to fall back to `src/`). 69.2 MB JSON Evidence record, id `ev_814b9b9d…`, predicate `rea.javascript-application-analysis`, provider `rea-javascript-application` v1. Ran 03:06:11 to 03:06:42 UTC. |
| 4 | `npx -y rea-agents@latest doctor` | 1 | `healthy: false`: Node 22.22.0 and host OK; Hopper, Ghidra, IDA, jadx engines missing. None of those are needed for a JavaScript target, so this is informational. |
| 5 | `npx -y rea-agents@latest inspect-artifact <clone> --json` | 1 | Refused: `target_unavailable`, "open_binary accepts files and macOS app bundles. This target is a directory"; REA itself points back to command 3. Recorded as a legitimate limitation, not worked around. |
| 6 | `npx -y rea-agents@latest trace-application-feature --help` | 0 | Takes a workflow JSON seed over the Evidence file; not run against the target for lack of time and because the plain import graph already answered the dependency question. |

What command 3 returned (from `<work>/graph-summary.txt` and `<work>/import-graph.txt`, produced by small read-only Python scripts over the JSON):

- Statistics REA reported: 107 relevant files, 99 parsed JavaScript/TypeScript files, 1,021,855 text bytes read, 62,625 AST nodes visited, 1,300 findings, 0 parse failures, 0 integrity contradictions.
- Application graph: 704 nodes (592 module/export-binding nodes, 99 asset nodes, 9 artifact nodes, 2 storage nodes, 1 package node) and 1,504 edges, relation counts: `imports` 897, `exposes` 397, `contains` 208, `persists_to` 2 (both to browser local storage, i.e. the save-game feature).
- Import resolution: 793 resolved, 62 external (npm packages), 42 not found. The not-found set is entirely extension-less specifiers (`./tileValues`, `../src/random`, ...) inside `.ts` files and tests, which the project's bundler resolves but REA's inert resolver does not.
- A semantic relation graph of 40,852 nodes (expressions, call sites, property slots, bindings, functions, 99 modules, 41 listeners) with 0 edges in this record; REA says these are traced on demand by `trace-javascript-semantics`.
- Source maps: none present in the repository (it ships source, not a bundle), so the source-map fields are null throughout.
- Import adjacency for the mechanics cluster (REA, confirmed by reading): `simulation.js` imports 23 modules including every subsystem below; `powerManager.js` depends on the block map, direction/position helpers, the RNG, tile flags and tile values; `disasterManager.js` on the RNG, tile utilities, tile values and zone utilities; `miscTiles.js` (fire, flood, radiation tile handlers) on the RNG and zone utilities; `evaluation.js` on the RNG; `census.js`, `valves.js`, `budget.js` on nothing random; `blockMapUtils.js` on the three zone modules and the RNG; `residential.js` on the RNG, traffic and zone utilities. Twenty-four modules import `random.ts`.
- Limitations REA itself attached to the evidence (quoted): "JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed." "Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence." "Static imports, entrypoints, workers, endpoints, and storage relationships do not prove runtime execution." "index.html has 2 inline JavaScript bodies starting at lines 140, 480 that were not analyzed". Confidence `derived`, authority `shipped-artifact`, graph coverage `partial`.

What failed: `inspect-artifact` on a directory (by design), and `doctor` reports an unhealthy environment for binary engines we did not need. Nothing was built or installed inside the clone.

## c. Evidence table

All paths are under `<clone>/src/`. Line ranges are from the commit above.

| Mechanic | File:lines | What the code does (one line) |
|---|---|---|
| Power source registration | powerManager.js:116-149 | Coal and nuclear plants found during the map scan are counted in the census and pushed onto a stack of power-trace start points; a nuclear plant also rolls a per-scan meltdown chance that depends on difficulty. |
| Power flood fill | powerManager.js:54-113 | Depth-first trace from each stacked source over conductive, not-yet-visited neighbours in the four cardinal directions, marking a 1-bit power grid; branches (two or more unvisited conductive neighbours) push the position back; the trace aborts with a "not enough power" event once visited tiles exceed total plant capacity. |
| Tile power flag | powerManager.js:34-45; mapScanner.js:46-56 | During the per-tile scan each conductive tile's powered flag is set from the grid map (plants are always powered); zones are counted as powered or unpowered. |
| Power capacity constants | powerManager.js:23-24, 76-77 | Capacity is a per-plant tile budget: 700 tiles per coal plant, 2000 per nuclear plant. |
| Unpowered zone effects | residential.js:251-253; industrial.js:130-131; emergencyServices.js:21-25 | Unpowered zones have their growth score forced to a fixed negative value; unpowered police/fire stations deliver half their effect. |
| Scoring penalty for outage | evaluation.js:299-302; simulation.js:476-487 | City score is multiplied by the powered-zone fraction; a front-end warning fires when under 70 percent of zones are powered. |
| Disaster lottery | disasterManager.js:33-74 | Each cycle, with difficulty-scaled odds (1 in 480, 240, 60), pick one of nine outcomes: fire (2/9), flood (2/9), nothing (1/9), tornado (1/9), earthquake placeholder (1/9), monster if pollution average > 60 (2/9). A flood countdown decrements every call. |
| Fire ignition | disasterManager.js:130-153 | Up to N random tiles are sampled; the first non-zone, burnable-range tile becomes fire. |
| Fire spread and burnout | miscTiles.js:22-67 | Each burning tile, on 1 in 4 scans, tries each of 4 neighbours with 1-in-8 odds to ignite it (zones are destroyed and heavy industry explodes); then extinguishes with probability 1/(rate+1) where rate is 10, 3, 2 or 1 for fire-station coverage 0, >0, >20, >100. (Note: at this commit the neighbour test reads the origin tile and the ignition call references an undefined lowercase helper, so spread as shipped appears broken; the intent is clear from the surrounding code and the original engine.) |
| Flood start | disasterManager.js:178-210 | Up to 300 random samples; the first river/water tile with a flooded-able land neighbour (dirt or burnable, bulldozable) turns that neighbour into flood and arms a 30-cycle flood countdown. |
| Flood spread and recession | disasterManager.js:213-239 | While the countdown is live, each flood tile tries each of 4 neighbours with 1-in-8 odds; burnable, dirt or woods tiles flood (zones are destroyed). After the countdown, each flood tile dries to dirt with 1-in-16 odds per scan. |
| Meltdown and radiation | disasterManager.js:242-276; miscTiles.js:70-73 | Plant footprint becomes fire; 200 random tiles in a 40 by 30 box become radioactive; a radioactive tile decays with 1-in-4096 odds per scan. |
| Earthquake | disasterManager.js:107-127 | Strength 300 to 1000 random tiles; 3 in 4 become rubble, 1 in 4 fire. |
| Demand valves (migration drivers) | valves.js:54-143 | Employment ratio (jobs/residents), births at 2 percent, labour availability, internal market size and an external-market factor by difficulty produce residential, commercial and industrial growth ratios, which are clamped, converted through a tax-rate table and accumulated into three valves bounded at plus or minus 2000/1500/1500. Caps zero positive demand when a prerequisite building is missing. |
| Valve cadence | simulation.js:317-327 | Valves recompute on every other simulation cycle. |
| Zone growth decision | residential.js:211-289 | Per zone: population reported to census; with population-proportional odds, a road/traffic probe, failing which the zone degrades; then on 1-in-8 odds (always for empty zones) a location score from land value minus pollution (-3000..3000, -3000 with no road) is added to the valve and compared against a 16-bit random draw with a high bias so that growth or decline are rare events per scan. |
| Land value, pollution, terrain | blockMapUtils.js:187-313 | Per 2x2 block: pollution = sum of per-tile emission values (traffic 50/75, fire 90, radiation 255, industry 50, power plants 100), twice smoothed with 4-neighbour averaging; land value = 34 minus half the Manhattan distance to the city centre (capped 64), times 4, plus terrain, minus pollution, minus 20 if local crime > 190, clamped 1..250; averages feed the census. |
| Crime | blockMapUtils.js:321-372 | Police coverage map smoothed three times; crime = (128 - land value) + population density, capped 300, minus police coverage, clamped 0..250; averaged over developed blocks. |
| Population density and centre | blockMapUtils.js:396-466 | Zone populations scattered into a map, smoothed three times, doubled; the city centre is the centroid of all zones. |
| Service coverage | emergencyServices.js:17-40; blockMapUtils.js:470-477 | Each station adds the budget-derived effect at its tile (halved if unpowered, halved again if no perimeter road); the map is then smoothed three times to make a coverage field. |
| Smoothing kernels | blockMapUtils.js:39-67 | Two kernels: (centre + mean of 4 neighbours)/2, and (sum of 4 neighbours + centre)/4 clamped at 255. |
| Decay of transient maps | blockMapUtils.js:71-111 | Rate-of-growth map decays one step toward zero every 5 cycles; traffic density decays by 24 (34 when above 200) every cycle, zeroing below 24. |
| Census history and ramps | census.js:104-146 | Every 4 city-time units: history rings shift; crime and pollution "ramps" move one quarter of the way toward the current average (first-order low-pass); cash flow is squashed into 0..255 around 128. Longer ring every 40 units. |
| Tax and budget | budget.js:232-255, 99-157, 210-229 | Every 48 city-time units: tax income = floor(population * mean land value / 120) * tax rate * difficulty factor (1.4, 1.2, 0.8); maintenance = roads 1, rail 2 (times 0.7, 0.9, 1.2 by difficulty), 100 per station; spending priority road, fire, police; each service's effect = max effect * fraction funded. |
| Road decay under underfunding | budget.js:283-285; road.js:121-127 | Below 15/16 funding, each road tile has 1-in-512 odds per scan to roll against its effect and degrade. |
| Evaluation score | evaluation.js:207-312 | Seven problem levels (crime, pollution, housing cost, taxes, traffic, unemployment, fire); base score = (250 - min(mean/3, 250)) * 4; multiplicative penalties of 15 percent per capped or collapsed demand type, up to 10 percent per underfunded service; growth scaling; subtract fire severity and tax rate; multiply by powered fraction; clamp 0..1000; new score = mean of previous and computed (exponential smoothing, alpha 0.5). |
| Approval and complaints | evaluation.js:141-163, 315-324 | 100 simulated voters compare a uniform draw to the score; complaint votes compare each problem level to a uniform 0..300 draw, up to 100 votes. |
| Phase cycle | simulation.js:302-393 | 16 phases per cycle: 0 bookkeeping and valves; 1-8 scan one eighth of the map each; 9 census every 4 time units, tax and evaluation every 48; 10 decay maps and messages; 11 power scan; 12 pollution/land value; 13 crime; 14 density; 15 fire coverage and disaster lottery. Phases 11-15 run only every k cycles where k depends on speed (power 2/4/5; pollution 2/7/17; crime 1/8/18; density 1/9/19; fire 1/10/20). |
| Speed | simulation.js:184-218 | Speed selects a minimum wall-clock gap between phases (100, 50, 10 ms); it does not change per-phase work except through the k divisors above. |
| Repair | repairManager.js:28-70; powerManager.js:155-156 | Zone-type repair actions run when the city time masked by a period is zero (power plants: period mask 7, 4x4 footprint); non-zone, non-animated damaged tiles inside the footprint are restored to the canonical building tile. |
| Fire's effect on growth | zoneUtils.js:144-173 | A burning zone loses 20 points of rate-of-growth (clamped plus or minus 200) and its footprint becomes bulldozable. |
| Randomness | random.ts:23-50 | Uniform integer in 0..max via the host `Math.random`; a 16-bit draw; a signed 16-bit draw; a "chance" test that succeeds when the draw has no bits in common with a mask (so a mask of 2^n - 1 gives 1 in 2^n); a biased draw that takes the minimum of two draws. There is no seed. |

## d. Mechanics in our own words

Notation: U(a, b) is a uniform integer draw; "1 in 2^n" means a mask test as above. Numbers are the reference engine's tunings; section e proposes ours.

### d.1 Power connectivity scan

The reference world is a grid. Some tiles conduct (wires, roads carry no power, zones and plants conduct). Each generating plant is a trace origin and has a capacity measured not in watts but in *how many tiles it may energise*.

```
procedure power_scan(origins, capacity_total):
    grid_powered := all false
    visited_count := 0
    for each origin popped from the stack:
        pos := origin; repeat:
            visited_count += 1
            if visited_count > capacity_total: emit "insufficient power"; stop entirely
            grid_powered[pos] := true
            branches := conductive, unvisited cardinal neighbours of pos (stop counting at 2)
            if |branches| >= 2: push pos back on the stack
            if |branches| >= 1: pos := the last branch found
        until |branches| == 0
```

Consequences worth copying: (1) connectivity is recomputed from scratch each scan, so a cut wire disconnects everything downstream in one step; (2) capacity is global, not per-plant, and the fill is greedy and order-dependent, so an over-subscribed grid blacks out whichever region is traced last rather than everyone proportionally; (3) the source itself notes that an adjacent second plant is traced as a consumer, a known bug. Unpowered zones do not vanish: their growth score is pinned to a fixed negative value so they stall and slowly decline, unpowered stations work at half effect, and the city score is multiplied by the powered fraction. A warning message is raised when powered share drops below 70 percent.

### d.2 Disaster propagation

Trigger. Once per 16-phase cycle a single lottery runs with odds 1 in 480 / 240 / 60 by difficulty. If it hits, one of nine equally likely outcomes is chosen; two are fire, two flood, one tornado, one earthquake, one nothing, and two spawn a monster only when the pollution average exceeds 60. There is no "storm" object: weather is implicit in the lottery.

Fire. A burning cell is revisited every scan. On a quarter of visits it attempts to spread: for each of the four neighbours independently, with probability 1/8, if that neighbour is combustible it ignites (a zone is destroyed outright and heavy industry additionally explodes). Then, independently, the cell burns out with probability 1/(r+1), where r = 10 with no fire coverage, 3 for coverage in (0, 20], 2 for (20, 100], 1 above 100. So expected lifetime in scans goes from 11 (no coverage) to 2 (strong coverage), and expected ignitions per scan per burning cell go from about 0.125 down. Fire coverage is a smoothed field produced by stations (see d.6). Fire also subtracts 20 from the local rate-of-growth memory, which decays back toward zero at 1 point per 5 cycles.

Flood. Ignition picks a water cell with a floodable land neighbour and arms a countdown of 30 cycles. While armed, each flood cell tries each neighbour with probability 1/8 per scan; burnable, bare or wooded land floods (zones destroyed). After the countdown expires, each flood cell recedes with probability 1/16 per scan, i.e. expected 16 scans to dry. So a flood has an expanding phase of fixed duration and a geometric recession tail.

Radiation: a meltdown sets the plant on fire and scatters 200 radioactive cells over a 40 by 30 box; each decays with probability 1/4096 per scan (a very long tail by design). Earthquake: 300 to 1000 random cells; 3 in 4 become rubble, 1 in 4 fire.

### d.3 Feedback loops

Demand. Three accumulators (residential, commercial, industrial "valves") hold the pressure to grow or shrink. Every second cycle:

```
residents := res_population / 8
jobs := commercial + industrial population from the most recent census sample
employment := jobs / residents (1 if no residents)
projected_residents := residents * (1 + (employment - 1) + 0.02)      // migration + births
labour := clamp(residents_sample / jobs_sample, 0, 1.3)
projected_commercial := (residents + commercial + industrial) / 3.7 * labour
projected_industrial := max(industrial * labour * external_factor[difficulty], 5)
ratio_x := min(projected_x / current_x, 2)                              // per sector
delta_x := (ratio_x - 1) * 600 + tax_penalty(min(tax_rate + difficulty, 20))
valve_x := clamp(valve_x + round(delta_x), -range_x, +range_x)          // 2000, 1500, 1500
if sector is capped (missing prerequisite building) and valve_x > 0: valve_x := 0
```

The tax penalty is a monotone table from +200 at zero tax through zero near 7 percent to -600 at 20 percent. Because deltas are added to an accumulator with a range, the valves are an integrator with saturation: demand lags conditions and persists after they change. That is the main source of inertia.

Migration per zone. Each zone, when scanned, adds the valve to a location score (land value minus pollution, mapped to -3000..3000; forced to -3000 with no road; forced to -500 when unpowered) and compares against a biased 16-bit draw so that roughly 9 percent of assessments are unconditional growth, roughly 10 percent unconditional decline, and only a thin band depends on the score. Assessment itself happens on 1 in 8 scans (always for empty zones). Net effect: growth and decline are slow stochastic ratchets whose bias is set by demand plus local amenity.

Land value, pollution, crime. Pollution is emitted by traffic, industry, power, fire and radiation, then diffused by two passes of a 4-neighbour box blur. Land value = centrality term (34 minus half the Manhattan distance to the population centroid, capped at 64, times 4) + terrain + (minus) pollution, minus 20 if crime is extreme, clamped 1..250. Crime = (128 - land value) + population density, capped 300, minus smoothed police coverage, clamped 0..250. Loops: pollution lowers land value, low land value raises crime, high crime lowers land value, both lower the location score, which lowers growth, which lowers jobs, which lowers the residential valve.

Tax base. Income = floor(population * mean_land_value / 120) * tax_rate * difficulty factor. Tax base is therefore population times land value, so pollution and crime shrink revenue, and the tax rate feeds back negatively into demand through the penalty table. Spending is prioritised road, then fire, then police; each service's effectiveness is max effect times the funded fraction, so underfunding degrades coverage fields and road condition probabilistically (1 in 512 per road tile per scan once funding drops below 15/16).

Smoothing and inertia appear in five places: valve accumulators (integrator), rate-of-growth memory (decays 1 per 5 cycles), traffic density (decays 24 per cycle), census ramps for crime and pollution (quarter-step toward target every 4 time units, i.e. alpha 0.25), and the city score (mean of previous and new, alpha 0.5). Approval is a Monte Carlo of 100 voters against the score, and complaints are votes of up to 100 against a uniform 0..300 tolerance.

### d.4 Simulation cadence

The clock is a 16-phase cycle. Phase 0 advances city time by one unit, recomputes demand on even cycles and clears per-cycle census counters. Phases 1-8 each scan one eighth of the map's columns, running every tile's handler (zone growth, fire, flood, roads, services, plants). Phase 9 takes a census every 4 time units, a long census every 40, and collects tax and runs the evaluation every 48. Phase 10 decays the transient maps. Phases 11-15 run the global field updates (power, pollution/land value, crime, density, fire coverage) and the disaster lottery, each gated by a divisor that grows with speed so that at higher speed the expensive fields are refreshed less often per unit of city time (power every 2/4/5 cycles, pollution every 2/7/17, crime 1/8/18, density 1/9/19, fire 1/10/20). Speed otherwise only changes the minimum wall-clock gap between phases (100, 50, 10 ms). Repair of damaged building footprints is tied to the city-time counter through a period mask (power plants: every 8 units).

### d.5 Randomness discipline

The reference port draws from the host's unseeded generator through five helpers: uniform integer in 0..n, 16-bit, signed 16-bit, a mask "chance" test, and a minimum-of-two biased draw. Twenty-four modules call it; the order of calls follows the scan order, so even with a seed, output would depend on scan order and on the wall-clock-gated phase scheduler. The lessons are negative: there is no single RNG stream, no seeding, and no replay. What is worth borrowing is the *vocabulary* of draws (chance-with-mask gives cheap power-of-two probabilities; min-of-two gives a cheap skew toward low values) and the fact that every stochastic decision is local and single-draw, which makes a deterministic re-implementation straightforward.

### d.6 Emergency services and repair

Each station, when scanned, deposits an effect at its block equal to the budget-derived service effect (max 1000 at full funding), halved if the station is unpowered and halved again if it is not adjacent to a road. The deposit map is then blurred three times to form a coverage field with roughly a 3-block radius. Fire coverage changes the burnout odds (d.2); police coverage subtracts directly from crime (d.3). Repair is automatic: damaged non-zone tiles inside a building's footprint are restored on a timer, so plants and stations self-heal after fires unless destroyed outright. Hospitals are spawned by strong residential demand on empty zones with 1-in-4 odds and the census tracks a hospital need signal, but hospitals have no mechanical effect beyond assessed value.

## e. Adaptation to the Crucible Engine

Crucible's world (`crucible/content/concordia.json`) is six parishes: Heartland (dam, power and water source), Summit (comms primary), Gateway (airport, external comms), Haven (port), Keystone (biotech manufacture), Sterling (government, hospital). Links are the ring road (Gateway-Sterling-Haven-Keystone-Gateway, 42 km) and crater roads (ring to Summit and Heartland, not storm-passable; Summit-Heartland, flood risk), plus the dependency graph in PARISH_DEPENDENCIES. Ticks are 15 minutes from t = -4320 to t = 1440 (384 ticks). Systems are power, communications, roads, water, hospital, port, airport on a 0..100 scale with thresholds FAILED 20, CRITICAL 30, DEGRADED 50, OPERATIONAL 80 (`infrastructure.json`).

### e.1 Connectivity flood-fill with backup hours (spec step 3)

Mapping: power source = Heartland; conductive edges = the dependency edges plus crater roads for the physical line; the "capacity" idea becomes a dam output level. Proposal:

- Build the power graph from INFRASTRUCTURE.power (source Heartland, priority list Keystone then Summit) and PARISH_DEPENDENCIES edges where Heartland is upstream. Default edges: Heartland to Summit, Heartland to Keystone, Heartland to Haven, Heartland to Gateway, Heartland to Sterling (all listed in Heartland's providesTo). Each edge is operational when both endpoints' `roads` are at or above 20 and the edge is not flagged storm-impassable during landfall/eye windows; the Summit-Heartland edge also fails when Heartland `water` (flood proxy) is below 30.
- Each tick, breadth-first from Heartland if Heartland power is at or above 20; a reached parish is `grid_connected`. Keep the reference's single global capacity: capacity_units = floor(Heartland.power / 20) (0..5 parishes). Serve parishes in priority order Keystone, Summit, then by population descending; parishes beyond capacity are treated as unreached. This reproduces the "last traced region blacks out" behaviour deterministically instead of by scan order.
- Unreached parish with `backupGenerators: true` (Summit, Keystone, Gateway, Heartland): power is held at min(current, 60) for generator_hours = 24 (Keystone and Summit, which have priority) or 12 (Gateway, Heartland), i.e. 96 or 48 ticks of fuel, decremented only while disconnected. After fuel is exhausted, or for Sterling and Haven immediately, power drops 10 per tick (the reference drops unpowered zones to a fixed negative score; we convert to a bounded rate consistent with DEGRADATION_RATES.crisis.power = 10). Restoration raises power 5 per tick toward 100 (DEGRADATION_RATES.recovery.power is -5, i.e. 5 points of healing).
- Mirror the reference's half-effect rule: a parish's `hospital` and `communications` effectiveness used by cascades and dilemma triggers is halved while on generator and quartered when fully unpowered.
- Roads: a parish with no path to any other parish over edges whose `roads` on both ends are at or above 20 is `isolated` (spec already says this). Add the reference's "no road, no growth" rule as: an isolated parish's morale recovery rate is zero.
- Spec change: step 3 says "loses that system at a bounded rate per tick unless it has local backup"; make the rate and the fuel hours explicit constants in `content` (not code), add the capacity rule, and specify restoration rate separately from loss rate. Reason: the reference shows asymmetry (instant loss of connectivity, slow repair) is what makes outages feel consequential, and the proptest "levels stay within 0..100" needs the rates to be bounded.

### e.2 Probabilistic spread of damage across adjacent parishes (spec steps 2 and 4)

The reference's fire and flood are neighbour-wise Bernoulli trials with a fixed per-neighbour probability and a geometric burnout. On a six-node graph:

- Define `damage_front[parish][system]` as boolean "actively failing" when a system is at or below CRITICAL 30. Each tick, for each failing (parish, system) and each neighbour over the physical graph (ring road and crater roads for roads/power/water; dependency edges for port/airport/hospital), with probability p_spread the neighbour's same system loses spread_amount. Suggested p_spread = 1/8 per neighbour per tick (the reference's 1/8), scaled by the intensity multiplier from `intensity.json` (so at intensity 9 it is about 1/4), and spread_amount = 5 points (one `degradation` event threshold).
- Burnout: a failing system stops being a front with probability 1/(r+1) per tick where r = 10 if the parish's hospital-and-roads coverage proxy is below 20, 3 below 50, 2 below 80, 1 otherwise. "Coverage" here = mean of the parish's own `roads` and `hospital` plus one quarter of each neighbour's (a one-pass blur, the graph analogue of the reference's three box blurs).
- Flood analogue: when the hurricane window is landfall or eye, arm a flood countdown of 24 ticks (6 h) for Heartland `water` and Haven `port`; while armed, spread as above with p = 1/8 to neighbours over flood-risk edges; after expiry, recede 1/16 per tick toward recovery.
- Keep the existing CASCADE_RULES as the deterministic layer (they fire once at threshold, like the reference's meltdown spawning radiation), and make the probabilistic spread the stochastic layer. Spec change: step 4 should say cascades are deterministic and once-only, and a new step 4b "stochastic spread" sits between cascades and scheduled effects, with its constants in `infrastructure.json` (`SPREAD_RULES: {p_per_neighbour, amount, burnout_rates}`).

### e.3 Feedback loops with inertia for morale and services

Replace the three demand valves with one integrator per parish: `morale_pressure` in -2000..2000, updated every 4 ticks (hourly) by delta = (service_index - 1) * 600 + leadership_term, where service_index = weighted mean of the parish's systems divided by 80 (so parity at OPERATIONAL), and leadership_term comes from decisions' value signals on the -3..3 scale times 50. Morale itself (0..100) moves toward the integrator each tick with alpha 0.25, the reference's census ramp. Expose morale through a score computed as the reference does: start from (250 - min(mean_problem/3, 250)) * 4, where the problems are the seven system deficits (100 - level), multiply by the connected fraction of parishes (the powered-fraction rule), apply at most 10 percent penalty per unfunded service, clamp 0..1000, and smooth with alpha 0.5 per hour. Approval for the facilitator view: 100 seeded voters comparing U(0, 1000) to the score. Spec change: section "Model" has morale in the snapshot but no update rule; add this rule with the two alphas and the integrator range as content constants.

Tax base analogue: SUPPLY_CHAIN.interruptionCostPerHour (2.4 M) times the fraction of the 28-hour cycle steps blocked becomes the budget pressure; spending priority (reference: road, fire, police) becomes roads, hospital, communications for the recovery phase. This gives the facilitator a lever equivalent to the reference tax slider.

### e.4 Cadence per 15-minute tick

Reference lesson: do cheap local updates every tick and expensive global fields on divisors; keep a fixed phase order. Proposal, replacing the nine-step list with the same steps but explicit divisors:

| Every tick | Every 2 ticks | Every 4 ticks (hourly) | Every 16 ticks (4 h) | Every 96 ticks (24 h) |
|---|---|---|---|---|
| weather, degradation, connectivity fill, scheduled effects, snapshot | stochastic spread, cascade evaluation | morale integrator, service coverage blur, dilemma selection check | disaster-style lottery for off-timeline shocks (p = 1/60 at intensity 7-9, 1/240 at 3-4, 1/480 below) | summary roll-ups |

Intensity (the Crucible Master dial) plays the role of the reference's speed divisors: higher intensity raises spread probability and dilemma cadence but must never change the order of phases. Spec change: say explicitly that intensity scales rates, never phase order or tick length, so that replays with a different scripted intensity remain comparable.

### e.5 Randomness discipline to borrow

Keep everything the reference lacks: one ChaCha20 stream, BTreeMap ordering, no wall clock (spec "Determinism" already). Borrow: (1) the mask-chance idiom as a named helper `one_in_pow2(n)` so content can express probabilities as 1/2^n; (2) the min-of-two skew for "usually small" draws such as delay jitter; (3) make every stochastic site a single draw whose purpose is logged in the run log (`rng_draws` counter per tick in the snapshot), which the reference lacks and which makes the first-divergence diff in `crucible replay` useful. Add a proptest: the number of RNG draws per tick is identical across two runs with the same seed.

### e.6 Emergency services and repair

Each parish's `hospital` and `roads` act as the station fields: service_effect = funded_fraction * 1000, halved when the parish is on generator, halved again when isolated; blur once over neighbours. Repair: the reference restores footprints on a timer; Crucible's DEGRADATION_RATES.recovery already gives per-system heal rates (power 5, comms 3, roads 2, water 4, hospital 2, port 3, airport 5 per tick in the recovery window). Add the gate that repair of a system only runs when the parish is grid-connected or on generator and not isolated, and runs at half rate during landfall and eye windows.

## f. License hygiene statement

This brief is descriptive. It conveys mechanics, formulas and parameters as facts about how the reference behaves, in our own words and notation, and it does not reproduce any function, data table, identifier set or file structure from micropolisJS. The Crucible implementer must not read the micropolisJS source, the clone directory, or the REA output files; only this brief. No code, comments, tile tables, tax tables or constants arrays were copied into `/home/user/CrucibleEngine`; where the reference's numbers are quoted they are quoted as observations, and section e proposes different numbers for Crucible. Because nothing from the GPL-licensed work is incorporated or derived at the level of expression, the GPL v3 does not attach to the Crucible implementation, and the Micropolis trademark is not used. The reviewer who audits the line citations should be someone other than the implementer.

## g. Honest assessment

What REA added beyond reading the source: an authenticated, hashed inventory of the repository (root SHA-256 `b4879534…`, per-file artifact hashes) that pins the provenance claim in section a; a complete module import graph with resolution status, which confirmed in one pass which modules depend on the RNG (24) and that the mechanics cluster is self-contained under `simulation.js`; two storage sinks (browser local storage) showing the save-game boundary; an explicit list of what was not analysed (two inline script bodies in `index.html`, 42 unresolved extension-less imports); and an evidence record that can be re-run later with `compare-application-versions` to detect upstream changes to the mechanics files.

What REA could not do on this target: it produces structure, not semantics. It did not and cannot summarise a formula, a probability or a phase schedule; every row of section c and all of section d came from reading the files. Its semantic relation graph was emitted with zero edges in this run, and the tracing commands require hand-written seed JSON we did not have time to write. `inspect-artifact` refuses directories, `doctor` reports missing binary engines irrelevant here, and the 69 MB evidence file is awkward to consume without a filter script. For a small, unminified, source-available project the honest ratio is roughly: REA gave the provenance and dependency facts in 30 seconds; the mechanics took under ten minutes of targeted reading of about 4,500 lines across 22 files and would have taken the same without REA. REA would add more on a minified bundle or an Electron app where imports are not legible.

## Appendix: files produced

- `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/rea-work/run-log.txt` (commands, exit codes, first lines)
- `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/rea-work/help.txt`, `version.txt`, `doctor.txt`
- `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/rea-work/rea-app.json` (69 MB evidence), `rea-app.stderr` (progress log)
- `/tmp/claude-0/-home-user-CrucibleEngine/f8b2ae04-f25c-5bba-829d-241d8deb956f/scratchpad/rea-work/graph-summary.txt`, `import-graph.txt`, `rea-inspect-artifact.json`
