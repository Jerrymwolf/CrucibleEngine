---
type: decision
date: 2026-11-02
status: accepted
tags: [values-crucible, keystone-slice, scoring, pressure, permission, win-condition]
related: ["[[2026-10-31-keystone-persona-test-build-log]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[framing-2026-10-21-audit-fixes]]", "[[decision-2026-10-22-strategy-game-audit-answers]]"]
supersedes: "the race (most resources left) and the fixed target (play to par) as the default win condition"
---

# Boss-set scorecards

**Decided 2026-11-02 18:57 (Jerry, decision card).** Jerry's ask on 2026-11-01 was: "The scoring should drive the participants the way real life pressure and permission does."

## Why

In real life, nobody keeps score against the team across the table. Each leader is judged by their own bosses, on what those bosses care about, and those bosses turn the pressure up or give permission as a crisis goes on. This follows the dissertation's model, in which pressure and permission come from outside the table. It also keeps the earlier rule that only off-board voices apply pressure.

## The rule

| | Community team | Meridian team |
|---|---|---|
| Bosses | Pastor Ruth Okafor and the parish council | Dana Kell and the Meridian board |
| Scorecard | People lost, supplies, trust | Cure doses, funds and fuel, board confidence |
| Lives on the card? | Yes, heavily | No |
| Starting target | 75% | 114% |

- **Score:** each team's scorecard now, as a percentage of its scorecard at the start. A team succeeds if it meets its own target at the end, so both teams, one, or neither can succeed.
- **Pressure** raises a target. It comes from content triggers, for example after turn 1 if board confidence is below 60, or if 20 or more people died.
- **Permission** lowers a target. Content triggers grant it when community trust reaches 70.
- **Crucible Master:** has one pressure and one permission button per team. They are inputs, logged in the run log and replayed exactly.
- **Determinism:** the score is integer tenths, the index is floor(x + 0.5), and triggers fire once. Godot mirrors all of it.
- **Content:** the selfish orders now please the board (+2 confidence) and still anger the community. That makes the pressure real.

## Measured (1000 seeds, % of games each team meets its target, C/M)

| Play | Community | Meridian |
|---|---|---|
| Both careful | 61 | 62 |
| Careful vs Meridian selfish | 45 | 64 |
| Careful vs Meridian generous | 100 | 49 |
| Community kind vs careful | 49 | 91 |
| Both do nothing | 1 | 1 |

On its own card, the selfish line pays Meridian a little, while the generous line costs it and saves the community. That gap is the pressure, and the permission lever (-12 for Meridian) is what makes generosity affordable. A race no longer counts a humane act twice, because neither team is scored against the other.

## Contract changes

- **Run log:** gains an optional `boss` input per turn (`{team: "pressure" | "permission"}`).
- **State:** gains `boss`, which holds targets, the log, the fired triggers and the levers used.
- **Standings:** gain `target`.
- **Setup:** "How a team wins" now offers boss (the default), par and race.

## Open

- The permission lever's size, and when a facilitator should press it, need Jerry's playtest.
- The debrief already shows every pressure and permission. A facilitator prompt that reads them against the signed values is not yet written.
