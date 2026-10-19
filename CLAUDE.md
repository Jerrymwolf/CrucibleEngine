# Crucible Engine, project memory for Claude Code sessions

Read this first. It is the handoff between sessions.

- **What this is:** The Values Crucible, a facilitated multi-team crisis simulation for leadership development. Six teams each run a parish on the island of Concordia during Hurricane Midas. The product surfaces the gap between stated and enacted values under pressure. Users are executives, not gamers. Aesthetic: command center, not video game.
- **Current direction (2026-10-18):** full restart as a deterministic Rust core under `crucible/`. The TypeScript application in `apps/` and `packages/` is abandoned as code and kept only until replaced. Do not extend it.
- **Design corpus:** `CrucibleDocumentInventory/` holds the narrative and research design documents. Decision records in that folder are named `decision-YYYY-MM-DD-*.md`; read the newest `status: accepted` one before proposing architecture.
- **Content is data:** `crucible/content/*.json` holds parishes, timeline, cascade rules, dilemmas, personas, values, intensity levers. Edit content there, never embed it in Rust.
- **Contracts:** `crucible/docs/ENGINE_SPEC.md` (model), `crucible/docs/RUN_LOG_SCHEMA.md` (output). Changing either is a decision; record it.
- **Determinism is non-negotiable:** one seeded RNG, ordered maps, no wall clock in the core. `crucible run --seed N` twice must be byte-identical; `crucible replay` must reproduce the state hash.
- **Replay viewer:** `crucible/viewer/template.html` plus `build.mjs`; the built page is published as a claude.ai Artifact (link in `crucible/README.md`). Republish the same file to keep the URL.
- **Build logs:** `CrucibleDocumentInventory/YYYY-MM-DD-*-build-log.md` record what was done, measured, and left undone in each long session.
- **Memory strategy:** Jerry keeps decisions in Obsidian. Write new decision records with YAML frontmatter and wikilinks so they drop into the vault unchanged.
