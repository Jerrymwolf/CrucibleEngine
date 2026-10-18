---
title: "Decision: restart the Crucible Engine as a deterministic Rust core"
date: 2026-10-18
type: decision-record
status: accepted
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, decision, architecture, rust, restart, rea, micropolis]
supersedes: "[[decision-2026-10-18-rea-reference-games-rust]]"
related:
  - "[[values-crucible-sota-analysis]]"
  - "[[dilemma-generation-framework]]"
  - "[[concordia-all-parishes]]"
  - "[[concordia-hurricane-timeline]]"
---

# Decision: restart as a deterministic Rust core

**Decided by:** Jerry Wolf, 2026-10-18, after judging the December 2025 TypeScript codebase unusable.
**Instruction given:** spend 90 minutes with Claude Fable ultracode and REA on a strategy game, to become the Crucible Engine. Be creative and build something.

## What was decided

1. The TypeScript application (about 55,000 lines across server and web) is abandoned as code. It stays in git history and in the `apps/` and `packages/` directories until the new engine replaces it; nothing new is built on it.
2. The design corpus survives. It was never the problem. Parishes, personas, hurricane timeline, cascade rules, intensity levers, the values deck, and the 45-dilemma library were exported from the old TypeScript constants into plain JSON under `crucible/content/`. Facilitators edit data, not code, from now on.
3. The new engine is a Rust cargo workspace at `crucible/` with a headless deterministic core (`crucible-core`) and a CLI (`crucible-cli`). Same seed, same content, same inputs produce a byte-identical run log. Replay from the log must reproduce the final state hash. This is the research-instrument requirement the old code never met: its scenario seed was stored but never used.
4. The run log is a contract (`crucible/docs/RUN_LOG_SCHEMA.md`). Everything downstream, the replay viewer, the debrief, future servers and agents, reads only that document.
5. REA was applied to the only strategy simulation that can lawfully be reverse engineered inside a cloud container: Micropolis, the GPL-released SimCity engine, via its TypeScript port micropolisJS. The output is a descriptive mechanics brief (`crucible/docs/rea-micropolis-brief.md`), not code. Implementers of the Rust core do not read the Micropolis source, so the GPL does not attach.
6. Out of scope for the restart's first cut: server, websockets, UI beyond the replay viewer, LLM agents, authentication, reports. They return once the headless core replays a session identically.

## Why Rust, given the earlier "do not rewrite" advice

The earlier advice rested on not discarding working code. Jerry's hands-on judgment is that the code is not working, and the audits that rated it near production-ready were self-graded documents. With the sunk cost removed, Rust wins on the properties that matter for a research instrument: determinism by construction, property testing of cascade rules, and one simulation kernel that runs natively on a server and as WebAssembly in a browser for replay. The Claude agent layer will still be written in TypeScript or Python when it returns, because those have official SDKs and Rust does not.

## What "impressive by morning" means

- A fresh Rust workspace that compiles, passes tests, validates content, runs a seeded Hurricane Midas session headless, and replays it to the same hash.
- A published web page that replays a real run from that engine: island map, parish status, cascades, dilemmas, decisions, and the stated-versus-enacted values gap.
- The REA brief with evidence, and the adaptations it suggests for the cascade and connectivity model.
- This record, the overnight build log, and a root `CLAUDE.md` so every future session starts with context.

## Next steps after the morning review

1. Adopt or reject the REA brief's adaptations to the connectivity and spread model.
2. Port the dilemma format toward the Paradox-style event schema (trigger, weight, options, immediate and delayed consequences).
3. Add the server as a thin layer over the core: rooms as sessions, append-only event log as persistence.
4. Return the agents as a sidecar service consuming the run log's event stream.
5. Play Rebel Inc with a notebook; map its zone loop onto parishes.
