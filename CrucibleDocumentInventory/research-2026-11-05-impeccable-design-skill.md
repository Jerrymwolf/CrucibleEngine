---
title: "Research: Impeccable (impeccable.style) for the Crucible game UI"
date: 2026-11-05
type: research-note
status: accepted
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, ui, ux, design, tooling, godot, impeccable]
related:
  - "[[decision-2026-10-21-all-godot]]"
  - "[[design-2026-10-21-rts-godot]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
source: https://impeccable.style
repo: https://github.com/pbakaus/impeccable
---

# Impeccable for the Crucible game UI

Jerry shared https://impeccable.style on 2026-11-05 with no comment. This note records what it is and whether it helps the Godot Keystone slice.

## What it is

- A free, open source (Apache 2.0) **design skill for AI coding agents**, by Paul Bakaus. Works in Claude Code, Codex CLI, Cursor, Gemini CLI and others.
- Gives the agent a design vocabulary as slash commands: `critique`, `audit`, `typeset`, `layout`, `colorize`, `animate`, `distill`, `clarify`, `adapt`, `polish`, `harden`, `onboard`, plus `init` and `document`.
- `init` writes a `PRODUCT.md` (users, purpose, principles, platform). `document` writes a `DESIGN.md` (colour, type, shape, components). Later commands read both.
- Has a "design mode" per job: Persuade (landing pages), **Operate** (dashboards, tools: scanability and consistency over expression), Read, Experience.
- Extras: an anti-"AI slop" detector that runs as a hook on every edit, a live in-browser variant picker, a Chrome extension, CI checks.

## Fit with Godot (checked in the skill's own files)

- Supported platforms are `web`, `ios`, `android`, `adaptive`. **No Godot, no game engines.**
- The detector, live mode and variant generator are **web only** (they read HTML/CSS). They do nothing on `.gd` or `.tscn` files.
- The native audit reads SwiftUI, Compose, React Native, Flutter. Not GDScript.
- What does transfer: the written guidance and scoring rubrics (hierarchy, type scale, contrast, touch targets of 44 pt or more, motion, UX copy, accessibility). The agent would translate them into a Godot `Theme` resource and `Control` layouts by hand.

## Where it helps us

1. **Rubric for the slice UI.** "Operate" mode matches the command-centre aesthetic for executives. Its critique scores (hierarchy, clarity, craft, 0 to 100) fit Jerry's "audit 1-100 and revise to 100" habit and the Claudex Loop.
2. **PRODUCT.md and DESIGN.md.** Writing these once for the Crucible (tablet first, executives, command centre not video game, witness not judge) would give every future thread one UI rulebook. The slice now sets colours inline in `main.gd` and `map_view.gd` with no shared theme.
3. **Web surfaces get the full tool.** The replay viewer (`crucible/viewer/template.html`) and any HTML artifacts can use the detector and live mode as is.

## Where it does not

- It will not make the Godot game feel like an RTS. Game feel (selection, camera, unit feedback, juice) is outside its scope.
- Installing it on Jerry's Mac adds hooks to his coding tools. Not done; needs his say-so.

## Recommendation

Use it read-only first: apply its critique rubric and Operate-mode rules to the Keystone slice UI from the cloud, and draft a Crucible `PRODUCT.md` and `DESIGN.md` (mapped to a Godot Theme). Install on the Mac only if that pass proves useful. Best timing is after Jerry's 10-minute playtest, so the critique targets the UI he has actually used.

## Decision (2026-11-05 10:34, Jerry card)

**Use its rules, no install.** After Jerry's 10-minute playtest of the Keystone slice, score the slice UI with Impeccable's critique rubric (Experience mode for the map; see correction in [[ui-rulebook-2026-11-05]]) and write the Crucible UI rulebook (PRODUCT.md, DESIGN.md) as a Godot Theme. Nothing is installed on Jerry's Mac.
