---
type: audit
date: 2026-10-21
status: complete
title: Player audit, round 2
related:
  - "[[2026-10-21-audit-fix-cut-a-build-log]]"
  - "[[decision-2026-10-21-audit-fix-spec]]"
  - "[[framing-2026-10-21-audit-fixes]]"
doc: https://claude.ai/artifact/Ei7MQ4Y7gvEZCR3KQySmXr
round_1: https://claude.ai/artifact/CNfhFiCekWbeof3o2CdfYH
tags: [crucible, audit, scoring, debrief, permission-and-pressure]
---

# Player audit, round 2

The same four advisor lenses as round 1 re-audited cut A (commit e2b2c2c). The full report is a Claude Doc:
https://claude.ai/artifact/Ei7MQ4Y7gvEZCR3KQySmXr.

**Verdict.** Every lens roughly doubled, from an average of about 25 to 59 out of 100. The build is still not ready for a live room.

| Lens | Round 1 (estimated) | Cut A |
|---|---|---|
| Adult learning | 20 | 63 |
| Game mechanics | 33 | 62 |
| UX/UI | 25 | 57 |
| Permission and pressure | 20 | 53 |

All seven round-1 blockers are fixed or partly fixed. Pressure now rises, and the debrief runs in the right order (own, then ask, then reveal), stepped by the DM.

## What still breaks (ranked)

1. **The reading reads −2 too often.** It takes the strongest signal and sends ties negative, so 57 of 96 options read −2 Capitulating. 42 of those are even trade-offs. Complying with a coercer still earns +2 on the value the coercer invokes. An independent coder agreed exactly on 57% of signals, against an 80% bar. This undercuts D7.
2. **The allocation round is a rating with no consequence.** Kept tokens do nothing. Sends read up to +3. One send hides a hoard.
3. **Failures are invisible.** The stepper shows 4 but sends 10. Rejections are never drawn. A move made offline is dropped. Late votes pass silently. On crucible-host, the DM roster never updates.
4. **The wall points at tables.** Each pressure actor belongs to one parish, and the charter row names Heartland.
5. **Hoarding still wins doses**, by +53,544 (S3.3).
6. **Some choices are free.** A linked mayday can be answered twice. Boats a table gave away still rescue. Some +3 costs are not real in the world.
7. **The debrief does not fit 15 minutes** (about 22 to 25, inferred). The console stacks every step on one screen, and the phone is not step-aware.
8. **Honest acts are erased without a word.** During play, silence is called "a refusal".
9. **Hindsight debrief lines still ship.**

## Fixed during the audit

On the offline board, the heat lever now shortens deadlines too (commit e6ef805).

## Proposed cut B (awaiting Jerry)

1. An honest witness.
2. Visible failure.
3. Real consequences.
4. A debrief that fits.

Then a human playtest.

## Limits

- Bots and scripts only.
- Mostly one seed (mechanics ran 40).
- A single coder, without the dissertation text.
- Each score uses that advisor's own rubric.
