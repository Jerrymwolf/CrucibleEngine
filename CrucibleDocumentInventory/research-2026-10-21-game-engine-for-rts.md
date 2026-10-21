---
type: research
date: 2026-10-21
status: proposed
title: Which game engine for a real-time Crucible (as of 21 Oct 2026)
related:
  - "[[decision-2026-10-21-parish-leadership-redesign]]"
  - "[[2026-10-21-audit-fix-cut-b-build-log]]"
tags: [crucible, engine, rts, research]
---

# Which game engine for a real-time Crucible

**Why this exists.** On 2026-10-21 Jerry played the solo board and said it "is not an actual RTS". He found the values decisions unclear and the dilemmas not real time. Today's board is a Rust rules core plus PixiJS, which is a drawing library and not a game engine. Jerry asked for the best engine as of today.

## What the Crucible needs from an engine

1. **Runs in a browser** on tablets, phones and a projector, and keeps working if the venue Wi-Fi fails.
2. **Real RTS play:** units you select and order on the map, pathfinding on roads, a camera, and many moving things at once.
3. **Keeps the deterministic Rust core.** That core produces the replay, the run log and the debrief evidence.
4. **Can be built and tested mostly in code.** Claude does the building, and headless browser checks catch regressions.
5. **Readable by executives** who are not gamers.

## The field today

| Engine | Current version | Browser fit | RTS fit | Fit with our Rust core | Notes |
|---|---|---|---|---|---|
| **Godot** | 4.7 stable (18 Jun 2026), 4.7.2 patch in Aug; 4.8 expected Q4 2026 | Good. Single-threaded web export is the default since 4.3 and needs no special server headers. Web builds use GDScript only, no C#. Empty build is about 9 MB (Defold's benchmark, measured on 4.3). | Strong: full editor, navigation, scenes, UI | Weak on the web. Rust in Godot (gdext) on WASM is still experimental. The core would have to run beside Godot and talk through JavaScript. | The best all-round free engine |
| **Phaser** | 4.2.1 (9 Jul 2026); v4 launched 10 Apr 2026 | Excellent. Pure JavaScript, about 500 KB, ships as one offline page like today's board. | Good. Sprites, input, camera, tweens; pathfinding by plugin or our own road graph. No visual editor. | Excellent. It calls our WASM core directly, as today. | The biggest HTML5 game community |
| **Defold** | 1.13.0 (29 Jun 2026) | Excellent: about 1 MB empty web build | Good, with an editor; Lua | Poor: Rust would need native extensions | Small community |
| **Bevy** | 0.19.1 (Sep 2026); a 0.20 release is reported, date unconfirmed | Fair. WebGL2 or WebGPU; WebGPU stutter bugs reported. | Fair. Strong ECS, but no editor and weak UI tooling. | Best: same language, could absorb the core | Slowest path to something polished |
| **Unity** | 6.6; WebGPU reported production-ready (Sept 2026, secondary source) | Heavy: 8 MB+ empty build, inconsistent on mobile browsers | Strong | Poor (C#) | Licensing and download size count against it |

## Recommendation

The **best engine overall is Godot 4.7**. It is free and open-source, has a full editor, and can export to the web.

The **best engine for this project is Phaser 4**:
- It keeps everything that works today: one offline page, our deterministic Rust core called directly, and the existing headless test harness.
- It adds what was missing: units on the map that you select and order, input, camera and game objects.
- It is the fastest route to the 10-minute playable slice.

Move to **Godot** if the Crucible becomes an installed app, or if we need its editor. Reasons not to start there:
- Using our Rust core on its web build is experimental today.
- Its web build is about ten times larger.

## Update, same day: the Crucible as an app

Jerry, 2026-10-21 19:01: "Long term I think this could be an APP". That tips the choice to **Godot**:
- One Godot project exports to Windows, macOS, iPad, Android and the web, so the prototype is not thrown away.
- The Rust core does not need to run on the tablets. It stays on the facilitator's laptop as the host (crucible-host, a desktop build where Rust works natively). Tablets become Godot clients that draw the host's state and send orders over the room's local network. That still survives venue Wi-Fi failure on a travel router.
- Phaser stays the fallback if Godot's web build proves too heavy for a browser-only session.

## Limits

- Several sources are vendor or comparison blogs. Version dates were taken from official download pages where the searches surfaced them; the network policy blocked direct fetches of phaser.io, bevy.org and godot-rust.github.io.
- No RTS unit-count benchmark was found for any engine. The prototype must measure frame rate with the expected number of units on a classroom tablet.

## Sources

- [Godot 4.7 stable download](https://godotengine.org/download/archive/4.7-stable/), [Godot release policy](https://docs.godotengine.org/en/stable/about/release_policy.html), [Exporting for the Web (4.6 docs)](https://docs.godotengine.org/en/4.6/tutorials/export/exporting_for_web.html)
- [godot crate docs (gdext WASM status)](https://docs.rs/godot)
- [Phaser v4.2.0 "Giedi"](https://phaser.io/news/2026/06/phaser-v4-2-0-released), [Phaser v4.2.1 on GameDev.net](https://gamedev.net/news/4825-phaser-v421-released/), [Phaser 4 downloads](https://phaser.io/download/phaser4)
- [Defold 1.12.4 release notes and size benchmark](https://defold.com/2026/05/04/Defold-1-12-4/), [Defold (Wikipedia)](https://en.wikipedia.org/wiki/Defold)
- [Bevy releases](https://github.com/bevyengine/bevy/releases), [Bevy 0.19.1 on GameDev.net](https://gamedev.net/news/5064-bevy-engine-v0191-released/), [Bevy WebGPU stutter issue](https://github.com/bevyengine/bevy/issues/22545)
- [Unity 6.6 WebGPU report](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production)
- [Best 2D game engines for 2026](https://app.cinevva.com/guides/best-2d-game-engines-2026), [Web game engines compared](https://app.cinevva.com/guides/web-game-engines-comparison)
