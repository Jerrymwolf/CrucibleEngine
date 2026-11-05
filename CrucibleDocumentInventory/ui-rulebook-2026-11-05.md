---
title: "UI rulebook: make the Crucible look like a game, not a dashboard"
date: 2026-11-05
type: design-rulebook
status: draft
project: Crucible Engine (The Values Crucible)
tags: [crucible-engine, ui, ux, design, godot, impeccable, rulebook]
related:
  - "[[research-2026-11-05-impeccable-design-skill]]"
  - "[[decision-2026-10-26-rts-to-reverse-engineer]]"
  - "[[decision-2026-10-22-strategy-game-audit-answers]]"
  - "[[design-2026-10-21-rts-godot]]"
---

# UI rulebook: make the Crucible look like a game, not a dashboard

Built from Impeccable's rules (PRODUCT.md, DESIGN.md, critique rubric, "craft floor"), read without installing anything, and applied to Jerry's playtest screenshot of the Keystone slice (2026-11-05 17:05). Verdict that triggered it: "NOT playable. Looks like a bad dashboard, not a video game."

## Correction to my earlier note

In [[research-2026-11-05-impeccable-design-skill]] I said Impeccable's "Operate" (dashboard) mode fits us. Wrong. Impeccable's own rule: Operate is for tools and dashboards, where scanability beats expression. **Experience** is for when "the visitor is inside the work itself: let the artifact lead from the first viewport; the interface recedes." The map is the work. The current slice was built like an Operate screen, and it reads as one.

## What the screenshot gets wrong (Impeccable critique terms)

| # | Finding | Impeccable rule it breaks |
|---|---|---|
| 1 | The map fills about a quarter of the screen. Text panels fill the rest. | Experience mode: the artifact leads; interface recedes. |
| 2 | Everything is a bordered box: three forecast cards, a CM bar, a hint bar, a news bar, two team panels, a moment card. Cards inside cards. | "Cards are the lazy container; nested cards are always wrong." |
| 3 | Nothing wins the eye. Title, timer, three forecasts, orange Lock button, orange moment card all shout at once. | Hierarchy: one thing per screen wins. |
| 4 | The map has no world in it: grey boxes of text joined by lines, a radar ring. No land, water, buildings, units or weather. | It is a diagram, not a place. |
| 5 | Units live as text rows in a side panel ("Bus 1. Holding. Tap here, then tap a site"). You never see a bus. | Controls should be the thing you act on, not a label for it. |
| 6 | Big number tiles (FOOD 24, VOLUNTEERS 20, FUEL 8) with small labels and progress bars. | The "hero-metric template", refused by default. |
| 7 | Uppercase small labels above headings everywhere (THIS TURN, NEXT TURN, YOUR UNITS THIS TURN). | Eyebrow labels: banned outright. |
| 8 | Instructions in sentences ("START HERE: tap Bus 1 ... then ... then ...") and the same hint repeated three times. | Copy: controls name their action; don't explain the UI in prose. |
| 9 | Debug text shown to players ("Why not Claude: no API key was given"). | Copy: the product's own language only. |
| 10 | Storm is a word and four dots ("STORM STRENGTH ▪▪▫▫"). | The storm is the main character; it should be seen, not labelled. |

Rough score on Impeccable's critique scale: Hierarchy 2, Clarity 4, Craft 4 out of 10. About **35/100**.

## PRODUCT.md (who and what)

- **Register:** game (Impeccable "Experience" mode for the map; "Operate" only for the CM console).
- **Platform:** tablet first (iPad, landscape), one per team, 3 to 6 people leaning over it. Projected wall view for the room.
- **Users:** executives and nurse leaders, not gamers. First time playing. Under time pressure (60 to 90 s planning per storm turn).
- **Purpose:** make the gap between stated and enacted values felt under pressure. The engine is a witness, not a judge.
- **Principles:**
  1. The island is the screen. If it isn't on the map, it had better be worth covering the map.
  2. Show, then tell. People, buses, water and wind are drawn; numbers come second.
  3. One decision at a time. The current moment is the only loud thing.
  4. Tap the thing itself. Tap the bus, then tap where it goes. No "tap here, then tap there" text.
  5. Values are named at the moment of choice, never as a score on the side.
  6. Command centre, not cartoon: calm, dark, precise; colour means danger or ownership, never decoration.

## DESIGN.md (how it looks), mapped to Godot

**Layout (full-screen map, three thin edges)**

- Map: full bleed, 100% of the screen, camera pans and pinch-zooms.
- Top edge, one slim strip: parish name, storm hour, plan timer. Nothing else.
- Bottom edge: a unit tray of drawn unit tokens (bus, sandbag crew, plant shuttle). Drag or tap-tap onto the map.
- The moment (dilemma): slides up as one sheet over the bottom third only when it fires, pinned to the place on the map it is about. Two choices, each tagged with the value it serves. Dismisses back to the map.
- Resources: three small icon counters in the top strip corner, not tiles. Tap to expand.
- Forecast: drawn on the map as the storm's path and coloured risk zones, not three text cards. "Certain / likely / possible" becomes solid, hatched and dotted overlays.
- News: one ticker line along the bottom edge, fading in and out.
- The other team (Meridian or community): a small portrait badge in a corner that pulses when they act or vote; their units are visible on the map in their colour.
- CM controls: hidden behind a long-press or separate device. Never on the team tablet.

**Map content (what makes it a game)**

- Terrain: land, coast, sea, roads as drawn shapes (Godot `Polygon2D` / `Line2D` or a TileMap), not boxes.
- Sites: building icons with a small people count badge (e.g. 120 at Low Ward), a status ring (dry, flooding, dark).
- Units: tokens that move along roads in real time when the turn plays out.
- Weather: rain and wind particles (`GPUParticles2D`), rising water as an animated shader or tint on low ground, the storm eye moving across the sea.
- Feedback: every order draws a path line; a lock shows a ghost of where units will go.

**Godot Theme tokens (one `crucible_theme.tres`, no inline colours)**

- Colour: night sea `#0B1620` (background), land `#1C2A33`, road `#3A4A55`, community teal `#3FC1B0`, Meridian blue `#6E8CFF`, danger amber `#F2994A`, flood `#2D7FF9` at 60% alpha, text `#E8EEF2`, secondary text tinted from the surface, never plain grey.
- Type: one sans with character for display (e.g. "Inter Tight" or "Barlow Semi Condensed", self-hosted as a `FontFile`), same family for body. Sizes for tablet at arm's length: 16 body, 20 label, 28 moment title, 40 timer. No all-caps labels except the timer.
- Touch: every tap target at least 44 pt (iPad). Unit tokens 56 pt.
- Shape: corner radius 6 for sheets, none on map elements. No borders above 1 px; separate by space and surface tone, not boxes.
- Motion: one authored moment per turn: the storm hour playing out (units move, water rises, the eye advances) for 6 to 10 s. Ease-out. Sheet slides 200 ms. Nothing else animates.
- Accessibility: contrast 4.5:1 for text, colour never the only signal (flood zones also hatched), reduce-motion option for the CM.

## Banned list (quick check for any mock or build)

Cards as the page structure. Nested boxes. Eyebrow labels. Big-number metric tiles. Instruction sentences on screen. Debug text. Progress bars standing in for meters that could be drawn on the map. Inline colours in GDScript.

## How to use this

Feed it into the new full-screen map mock in thread "Pick an RTS to reverse engineer". Score each mock against the ten findings above; a mock that fixes all ten is the target.
