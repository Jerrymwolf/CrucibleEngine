---
title: "Decision: REA, reference strategy games, and Rust for the Crucible Engine"
date: 2026-10-18
type: decision-record
status: proposed
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, architecture, rust, reverse-engineering, strategy-games]
related:
  - "[[values-crucible-sota-analysis]]"
  - "[[crucible-codebase-audit-final]]"
  - "[[concordia-plan-v2]]"
  - "[[dilemma-generation-framework]]"
---

# Decision: REA, reference strategy games, and Rust

**Question asked (2026-10-18):** Can we use REA (morluto/rea) to reverse engineer a strategy game that fits our purposes? Which game? Can we build with Rust?

**Short answer:** Reverse engineering a closed game is the slowest and riskiest way to get design knowledge that is already free. Borrow the *design* from Rebel Inc, Micropolis, and Paradox event scripts; do not try to lift an engine. Rust is a good fit for one thing: a deterministic simulation kernel compiled to WASM that the existing TypeScript server and browser both call. Do not rewrite the stack.

---

## 1. Where the project actually stands

Last commit 2025-12-19 ("feat: Add Concordia crisis simulation engine"). Ten months idle.

| Area | State | Evidence |
|---|---|---|
| Server (Colyseus + agents + engines) | ~11,000 lines TS | `apps/server/src` |
| Web (Next.js, PixiJS isometric island, pre-crisis, crisis, debrief) | ~44,000 lines TS/TSX | `apps/web/src` |
| Infrastructure cascade sim | Exists: threshold -> delayed degradation rules | `packages/shared/src/constants/infrastructure.ts` (CASCADE_RULES), `engine/InfrastructureManager.ts` |
| Hurricane timeline state machine | Exists: 8 windows | `engine/WeatherEngine.ts` |
| Dilemma library + selector | Exists | `services/DilemmaSelector.ts`, `DilemmaGenerator.ts` |
| AI teams that drift | Exists | `agents/AITeamController.ts` |
| Automated tests | **None** | no `*.test.ts` anywhere |
| Reproducible runs | **No.** `scenarioSeed` is generated (nanoid) and persisted but never feeds a PRNG. `Math.random` is used in AITeamController, ProductionSimulator, shared/values.ts | grep 2026-10-18 |

The engine is not missing. The project stalled at integration, playtest, and polish. A "better engine" from another game would not have unblocked it.

The seed finding matters for the dissertation: an instrument whose runs cannot be replayed from (seed + decision log) is hard to defend as a research measure. Fix this regardless of language.

## 2. What REA is and is not

REA is an MCP server that gives an agent reverse-engineering tools: Hopper/Ghidra/IDA for native binaries, static CIL reading for .NET assemblies, static module graphs for JavaScript/Electron, APK/Flutter/WASM inspection, and runtime observation. It returns pseudocode, assembly, module maps, and evidence. Its own showcases are single-function reconstructions (a sound-pan formula, a bullet-ring angle, a clipboard IPC bridge).

Implications for us:

- REA answers narrow questions ("how is stability computed from these inputs?") on a binary you own. It does not export a game engine.
- Unity games: REA reads Mono builds (`Assembly-CSharp.dll`) but its docs say it does **not** decode IL2CPP metadata. An IL2CPP build (`GameAssembly.dll`) falls back to native Ghidra analysis with mangled names.
- Legal posture: US fair-use precedent (Sega v. Accolade) supports RE for interoperability/learning, but Blizzard v. bnetd (8th Cir. 2005) enforced an EULA ban on RE. Steam titles carry such clauses. Mechanics and rules are not copyrightable; code and assets are. Clean-room reimplementation of *rules* is the defensible path. REA's own disclaimer limits it to lawful research on software you are authorized to examine.

**Decision:** REA is a last-resort tool for one specific formula, not the plan. Default to sources that need no decompiler.

## 3. Candidate games

| Game | Why it fits | Engine / readability | Use |
|---|---|---|---|
| **Rebel Inc.** (Ndemic) | Closest abstraction to ours: region map with zones, stability, reputation, corruption, initiatives with delayed effects, cascading unrest, time pressure | Unity (confirmed). Mono vs IL2CPP on PC unconfirmed. Mechanics are community-documented on rebelinc.wiki.gg | **Primary design reference.** Play it, read the wiki, map its zone loop onto parishes. RE adds little beyond exact constants |
| **This Is the Police** (Weappy) | Thematically closest to the core insight: performance and political pressure make a leader compromise stated values day by day | Unity 5 per one secondary source | Design reference for pressure pacing and rationalization arcs. Not an engine source |
| **Frostpunk** (11 bit) | Book of Laws: moral dilemmas with irreversible consequences | Proprietary Liquid Engine, closed, modding blocked; remake moving to Unreal (2027) | Design reference only |
| **Democracy 4** (Positech) | Policy decisions propagate through groups with inertia over time | Custom engine, but sim data ships as plaintext CSV for modding | Borrow the "effects change rates, not levels" model for consequence rules |
| **Crusader Kings 3 / Stellaris / Victoria 3** (Paradox) | Best-in-class event format: triggers, weights, options, consequences, mean-time-to-happen | Clausewitz engine, closed, but all events and scripts ship as plaintext `.txt` for official modding | Adopt the event schema for the dilemma library. Reading shipped script files is not circumvention |
| **Micropolis** (open-sourced SimCity) | Infrastructure dependency scan (power grid connectivity) and disaster propagation | GPL. C/C++ core, ports in C# (Unity), TypeScript, Godot. No Rust port could be located | Read the source directly for cascade and disaster algorithms. Too tile-granular to adopt wholesale |
| **OpenTTD / Widelands** | Supply-chain economies, server-authoritative multiplayer | GPL C++ | Architecture reference for authoritative state + replay |

**Decision:** No single game is a source to lift from. Rebel Inc is the design anchor. Paradox event schema is the dilemma format anchor. Micropolis is the cascade-algorithm anchor.

If one Rebel Inc formula later matters: (1) check the install folder for `Assembly-CSharp.dll` (Mono, REA-readable) vs `GameAssembly.dll` (IL2CPP, mostly opaque); (2) scope the question to one formula; (3) reimplement from the understanding, never from the CIL; (4) accept the EULA risk knowingly or skip it.

## 4. Rust

Can we build with Rust: yes. Three options were weighed.

| Option | What changes | Cost | Verdict |
|---|---|---|---|
| A. Stay TypeScript, fix determinism and add tests | Seeded PRNG threaded through engines; vitest for cascade/weather/selector | Days | **Do first.** Fastest route to a facilitated playtest |
| B. Rust simulation kernel (`crucible-sim` crate) | Pure, deterministic `step(state, inputs, seed) -> (state, events)`; compiled to WASM; called from the Node server and from the browser for debrief replay. Colyseus, Next.js, Prisma, and the Claude agents stay in TS | ~2.3k lines of TS engine logic to port (InfrastructureManager 517, WeatherEngine 380, TimeController 361, DilemmaSelector 253, AITeamController 616, ProductionSimulator 213) plus shared rule constants. Weeks part-time | **First Rust work, after A.** Additive, strangler-pattern, earns property tests and server/client parity |
| C. Full Rust stack (SpacetimeDB 2.x modules or axum server; Bevy 0.20 client) | Discard ~55k lines and ten months of work | Months; ecosystem churn (SpacetimeDB 1.0 -> 2.0 broke APIs; Bevy ships breaking releases twice a year); no official Anthropic Rust SDK, agents would use raw HTTP or community crates | **Not recommended** unless the goal is learning Rust rather than shipping the Crucible |

Ecosystem facts checked 2026-10-18: Bevy 0.20 released 2026-10-08; SpacetimeDB is on 2.x with Rust/C#/TypeScript/C++ modules and Rust/C#/TypeScript/Unreal client SDKs; open-source Rust strategy codebases worth reading for architecture are Orion (bit-deterministic lockstep RTS) and Veloren (server-authoritative multiplayer); the Anthropic API has official SDKs for Python, TypeScript, Java, Go, Ruby, C#, PHP, and not Rust.

**Decision:** A then B. C is rejected.

## 5. Next actions

1. Thread a seeded PRNG (seed = `scenarioSeed`) through AITeamController, ProductionSimulator, DilemmaSelector, and shared/values shuffles. Verify two runs with identical seed and decision log produce identical state.
2. Add vitest; first targets: CASCADE_RULES firing order and delays, WeatherEngine window transitions, DilemmaSelector determinism.
3. Play Rebel Inc for two hours with a notebook; write down its zone loop, delay structure, and what makes pressure feel fair. Map to parishes.
4. Rewrite the dilemma file format toward a Paradox-style event schema (trigger, weight, options, immediate + delayed consequences). Compare with [[dilemma-generation-framework]].
5. Only after 1 to 4: spike `crucible-sim` in Rust behind the same TS interface, WASM-compiled, with property tests on cascade rules.
6. Memory hygiene: add a root `CLAUDE.md` pointing at `CrucibleDocumentInventory/` and this decision log so future Claude Code sessions start with context.

## 6. Open questions

- Is the goal for the next quarter a facilitated playtest with real humans, or an engine rebuild? The answer decides A-only vs A+B.
- Does the dissertation require bit-exact replay, or is a decision log with timestamps sufficient for the values-gap analysis?
- Who owns a Rebel Inc copy for the design study? Mobile is fine for play; PC only matters if REA is ever used.

## Sources consulted (2026-10-18)

- REA repository README and docs: https://github.com/morluto/rea (managed-code-analysis.md, native-investigation.md)
- Rebel Inc engine: https://rebelinc.wiki.gg/wiki/Rebel_Inc ; https://statelyplay.com/2018/12/05/plague-inc-follow-up-rebel-inc-goes-live/ ; Ndemic FAQ https://www.ndemiccreations.com/en/55-rebel-inc-escalation-pc-faqs
- Frostpunk engine: https://11bitstudios.com/?p=9194 ; https://gamingtrend.com/news/frostpunk-returns-in-re-imagined-1886-form/
- This Is the Police: https://ru.ruwiki.ru/wiki/This_Is_the_Police ; https://giantbomb.com/wiki/Games/This_Is_the_Police
- Micropolis: https://github.com/SimHacker/micropolis ; https://github.com/topics/micropolis ; https://www.informationweek.com/it-sectors/classic-games-open-sourced-simcity
- Legal: https://ipwatchdog.com/2021/03/27/reverse-engineering-law-understand-restrictions-minimize-risks/ ; https://cyberlaw.stanford.edu/blog/2004/10/packets002647-shtml ; https://en.wikibooks.org/wiki/Reverse_Engineering/Legal_Aspects
- SpacetimeDB: https://spacetimedb.com/docs/clients ; https://spacetimedb.com/docs/sdks/rust
- Bevy: https://bevy.org/news/bevy-0-20/ ; https://bevy.org/news/bevy-0-19/
- Rust strategy OSS: https://github.com/wachtelhund/orion/wiki/v0.1.0 ; https://awesome.ecosyste.ms/projects/github.com%2Fdigitalextinction%2Fgame
