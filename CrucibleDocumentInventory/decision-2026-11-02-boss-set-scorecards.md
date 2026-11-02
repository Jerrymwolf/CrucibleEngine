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

## Revision, same day: permission changes what the bosses count

**Problem.** In round 8 the game designer found that a flat permission ("lower the target") only lowered the bar for whatever a team was already doing, and it helped a selfish Meridian most (64% to 100% meeting its target). The words said "take care of Keystone", but the mechanics said "you passed".

**Change.** Permission now adds a measure to that team's card and only nudges the target (-4):
- **Meridian's board** starts counting "licence to operate (community trust)".
- **The council** starts counting "people in shelter" (a head count, so a person is never counted twice), and its target moves -2.
- **Not retroactive:** a granted measure counts only the change after the moment it was granted. It adds nothing to the starting card, so it never rescales the score.
- **Lever sizes (final):** Meridian permission moves the target -10 and adds licence to operate. Community permission moves it +2 and adds people in shelter. The look-away trigger moves it -2, kept small so a few more deaths near the 20-death threshold never pay.
- **Permission to look away:** a community trigger after turn 2, when 20 or more people died, lowers the bar without changing what is counted: "Nobody will blame you for the ones the storm took." The debrief can then ask who gave that permission.

**Result.** With Meridian's permission (as first measured, before the change to counting from the moment it is granted), a selfish Meridian meets its target 30% of the time, a careful one 48% and a generous one 51%. After that change, sim.mjs shows both careful teams at 62/62 with no lever. With Meridian's permission pressed on turn 1, Meridian meets its target 42% of the time. With the community's permission, the community meets its target 75% of the time. Pressure pulls toward the board's numbers, and permission now pulls toward Keystone, without making kindness a sure thing.

**Facilitator fixes in the same pass:**
- Every boss log entry records whether it came from the Crucible Master or a trigger.
- Each debrief choice card shows the target and the bosses' last word in force when the team decided.
- Bots weigh their own bosses' score at a quarter of a value per point.
- The Crucible Master's levers are folded behind a toggle, with each lever's line and a one-line hint showing.
- The council's pressure lever is now about stores ("Don't burn the volunteers or the food"), so it pulls against care.

## Final lever check (sim.mjs, 1000 seeds, lever pressed on turn 1, % meeting target C/M)

| Play | No lever | Meridian permission | Community permission | Meridian pressure | Community pressure |
|---|---|---|---|---|---|
| Both careful | 61/62 | 61/66 | 68/62 | 61/47 | 55/62 |
| Careful vs Meridian generous | 100/49 | 100/60 | | | |
| Careful vs Meridian selfish | 45/64 | 45/65 | | | |

Permission helps a generous Meridian most (+11) and a selfish one least (+1). Pressure costs the team it lands on 7 to 15 points. Teams that do nothing stay under 10%.

**Persona scores:** game designer 90 and facilitator 90 on commit 4eaa710. Both projected 91 to 93 with the final lever sizes, which take their suggestions but have not been re-scored.

## Measured before the revision (1000 seeds, % of games each team meets its target, C/M)

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
