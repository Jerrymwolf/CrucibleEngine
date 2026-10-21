---
type: build-log
date: 2026-10-21
status: complete
title: Audit fix cut B (honest witness and visible errors), build log
related:
  - "[[2026-10-21-player-audit-round-2]]"
  - "[[2026-10-21-audit-fix-cut-a-build-log]]"
  - "[[decision-2026-10-21-audit-fix-spec]]"
branch: claude/project-thread-lt1euh
tags: [crucible, build-log, scoring, debrief, permission-and-pressure, ux]
---

# Audit fix cut B, build log

**Decision.** After the round-2 audit, Jerry chose "Honest witness and visible errors" on the decision card "What should cut B fix first?" (2026-10-21). The other three options stay open for later cuts: real consequences, debrief fit, and playtesting with people now.

Cut B answers findings from [[2026-10-21-player-audit-round-2]].

## Built

| Problem the audit found | What changed | Where |
|---|---|---|
| The engine read 57 of 96 options as −2 Capitulating, often with nothing yielded to | A moment that served one value at another's cost reads as a trade-off and names both ("served Safety +2, at a cost to Stewardship −1"). A −2 reads as Capitulating only where the option names a pressure; elsewhere it reads −1 Faltering. Both the table's console and the wall use this reading. | `40-world.js` `moments`, `reading`; `60-ui-common.js` `readingText`; `70-ui-table.js`; `72-ui-projector.js` |
| Complying with a coercer earned +2 on the value the coercer invokes | A pressure tag now names the values its actor invokes (`invokes`). On the option that yields, each invoked value reads 0 at most, which is Minimum Organizational Expectations. 15 options changed; the changes are logged in `content/coding/dilemmas-invokes-cut-b.csv`. The validator refuses a social pressure with no `invokes`, and an invoked value above 0. | `content.rs` `PressureTag`, `validate.rs`, `content/dilemmas.json`, test `giving_way_earns_nothing_on_the_value_the_actor_invokes` |
| One spare send hid a hoard; sends read up to +3 | A send takes one signal per value, the strongest, never a sum. A send that costs the sender nothing it needs reads Striving (+1) at most. Only a token the sender itself needs can read higher, up to +2. With ties going to the negative, a kept surplus others need now outweighs a spare send on fairness and compassion. | `resources.rs` `score_send`, test `a_spare_send_reads_striving_at_most` |
| Honest acts vanished from the record without a word | A chosen move the engine refused, or a grant made empty-handed, says why on the console: "The move could not run (…), so nothing was rated". | `40-world.js`, `60-ui-common.js`, `70-ui-table.js` |
| The wall named tables | The room pattern counts by form, never by actor, because every actor belongs to one parish. All four social forms are shown; a form that appears on no card says so ("Shame and devaluation: on no card in this deck"). The charter row says "on one table's console". | `60-ui-common.js` `roomPattern`, `72-ui-projector.js` |
| The stepper showed 4 and sent 10 | The stepper stops at what the table holds and sends exactly what the button shows. | `70-ui-table.js` |
| Rejections were invisible | Every rejected move shows on the console's now-line until the next item arrives. That includes a move queued during an outage and refused as expired. | `70-ui-table.js` |
| On crucible-host, the DM roster never updated | The DM renders seats and phones from live `roster` frames. | `73-ui-dm.js` |
| Late phone votes were counted, with no word to the voter | A late vote is kept but never counted in `vote_split`: `count` and `split` hold on-time votes only, and `late` is counted apart. The phone says "Your vote came after your table's move, so it was not counted". The phone's record marks the vote "late, not counted", and the console's gap adds "n late, not counted". | both hosts, `71-ui-phone.js`, `70-ui-table.js`, [[PROTOCOL]] |
| The countdown froze while offline; reconnect took 17.5 s | While the link is down, the countdown shows `--:--` and "link lost · the host keeps the clock". Reconnect backoff is capped at 4 s. A ping goes out every 10 s, and a link silent for 25 s is closed and retried. | `60-ui-common.js`, `20-protocol.js`, [[PROTOCOL]] §10 |
| The sticky lock bar covered the option it locks | A chosen option or answer scrolls clear of the bar. | `70-ui-table.js`, `template.html` |
| During play, silence was called "a refusal" | It now reads "If you give no answer, the storm decides", matching the debrief. | `70-ui-table.js` |
| Hindsight lines judged a choice by its outcome | Five lines were rewritten to separate what was known later from what was known at the time, and to ask rather than judge: prep-gateway, prep-haven, approach-heartland, landfall-heartland and landfall-summit. They are logged in `content/coding/debrief-lines-cut-b.csv`. Every later fact on the console carries the label "Known later, not at the time". | `content/dilemmas.json`, `60-ui-common.js` |
| The gap prompt invited hunting for dissenters | It now asks "What would it have taken to say it out loud?" "Untested" now reads "your cards rarely asked about it". | `72-ui-projector.js`, `73-ui-dm.js`, `60-ui-common.js` |

## Measured

- All Rust tests pass: core 35 unit, board 13, determinism 8, live 4, properties 2; host 8 and 2; wasm 5.
- The seed-42 golden run was regenerated, because content changed. Two runs are byte-identical, and replay reproduces `dcdb95f1…`.
- The headless check passes in both scenarios. It adds these assertions:
  - The stepper stops at what the table holds.
  - A rejection appears on the now-line.
  - Capitulating appears only where a pressure was named.
  - The wall pattern names no parish anywhere.
  - The console labels what was known later.

## Left undone

- The full mortal-middle recode of all 96 options with a second coder (S2.8). The independent coder's 57% exact agreement has not been re-measured.
- The rest of the round-2 list: kept tokens doing something, doses shipping by themselves (S3.3), double answers to linked maydays, effects that run without a dispatch, and the debrief's fit to 15 minutes.
- No human has played this build.
