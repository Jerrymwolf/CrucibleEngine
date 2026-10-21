---
type: build-log
date: 2026-10-21
status: complete
title: Audit fix cut A, build log
related:
  - "[[decision-2026-10-21-audit-fix-spec]]"
  - "[[framing-2026-10-21-audit-fixes]]"
  - "[[reference-2026-10-21-permission-and-pressure]]"
branch: claude/project-thread-lt1euh
commits: [b806dac, e2b2c2c]
tags: [crucible, build-log, scoring, debrief, permission-and-pressure]
---

# Audit fix cut A, build log

Jerry, 2026-10-21: "Lets build that in and run the player audit again." Taken
as yes to the recommended answer on D1 to D7 of
[[decision-2026-10-21-audit-fix-spec]], now `status: accepted`. This log says
what cut A built, what was measured, and what is left. The re-audit is in
[[2026-10-21-player-audit-round-2]].

## Built, by link of the chain

| Link | Spec | What changed | Where |
|---|---|---|---|
| Witness | S1.2 to S1.6, D1 | A storm-decided card, a silent mayday and an allocation never made carry no rating and are listed as "the storm decided". A rejected option is unrated. One reading per moment (strongest signal per value, ties to the negative), no mean in any screen. A keep counts once per value, not once per token (keeping three surpluses is Faltering, not Villainous). Credit lines and repairs are +1 and one moment together. | `values.rs`, `sim.rs`, `aid.rs`, `resources.rs`; client mirror in `board-rts/src/40-world.js` |
| Choice | S2.1 (wording, landfall), S2.2, S2.4, D3 | Options at ±3 on the live deck cut from 35 to 7 (four −3s kept where the table itself destroys others' conditions). Every +3 must name a cost (validator). Coerced compliance at −2 at most, the coercer named in a `pressure` tag. Drifted value mappings fixed. Defaults are "do nothing" options. 60 changes logged in `content/coding/dilemmas-anchors-v4.csv`. | `content/dilemmas.json`, `content.rs`, `validate.rs` |
| Stakes | S3.1 (mayday groups), S3.4 | 14 share-based hazards: whoever is still exposed loses a share each hour, so answers and routes change people safe. Low point and people-hours at risk counted, in the run log and on the wall. The Harvester loss hazard was removed: it contradicted the recovery card that finds her. | `residents.rs`, `content/residents.json`, `state.rs`, `log.rs` |
| Pressure | S6.1, D5 | Windows about 180 / 140 / 95 / 150 s; each quarter's cards open together with their maydays; heat and cool move later windows by about 20 s. A late move is refused as "expired". | `content/sessions/parish-90.json`, `crucible-host/src/session.rs`, `profile.rs` |
| Permission | S5.9, D4 | Heartland's charter clause ("the Priority Schedule yields to a declared public emergency") is on its console during play and on the card it speaks to. | `parish-90.json` `charterClauses`, `70-ui-table.js` |
| Reflection | S4, D2, D7 | Eight DM-stepped steps, nothing on a timer: counters and the low point; each console places its hardest moment on the seven anchors (logged `self_place`), then sees the engine's reading and its record value by value with logged reasons, pressure and the card's debrief line, storm moments apart; the two questions; the room's pattern of permission and pressure by form and actor, with no table named beside a rating; the gap as counts; the secrets; credit lines and replay. | `72-ui-projector.js`, `70-ui-table.js`, `60-ui-common.js`, `73-ui-dm.js`, both hosts |
| Commitment | S4.2 | "When ___ happens, I will ___", kept in the phone's own storage. Both hosts refuse a commitment as `private`; nothing is logged or exported. | `71-ui-phone.js`, `30-host.js`, `session.rs` |
| Screens | S5.1 to S5.3 | "Locked in: B" stays until the next card or call. Sticky primary button, checked visible at 1024×768. Wall text 22 px and up (28 px headlines); the bottom strip hides under full-screen steps. Silence reads "no answer (the storm decided)". | `template.html`, `70-ui-table.js`, `40-world.js` |

## Contract changes

- Run log 0.3 ([[RUN_LOG_SCHEMA]]): `tested`, `n_storm`, `moment` per evidence; `lowest_people_safe`, `people_hours_at_risk`. `enacted_score` kept only as deprecated.
- Protocol ([[PROTOCOL]]): console kind `self_place` at the debrief; DM kind `debrief_step`; phase `debrief_step`; debrief phase frames carry the private block; console `my_placement` and, at the debrief only, `vote_split`; phone `commitment` refused as `private`; `votes.json` holds placements, never commitments.
- Session profile: `debriefQuestions`, `charterClauses`, the if-then `commitment` template, `heatStepTicks` per quarter.

## Measured

- Seed 42, parish-90, silent all-human room against drift-model tables: lost 57 against 5; low point 18,890 against 22,774; people-hours at risk 140,019 against 23,977. Round 1 had people safe ending at 24,092 to 24,097 whatever tables did.
- All Rust tests pass (core 34 unit, 12 board, 8 determinism, 4 live, 2 properties; host 8 unit and 2 session; wasm 5). `crucible run --seed 42` twice is byte-identical; replay reproduces `cf4a4b8c…`.
- Headless check, both scenarios pass: the in-page host (rehearsal with every role) and crucible-host over WebSockets. New assertions: the wall does not advance by itself; the console asks for the hardest moment before showing any reading; no signed score or mean anywhere; the room pattern names no table beside a reading; the console shows its phones against its cards as counts; the commitment never reaches the host or the export; a commitment sent anyway is refused; six self-placements in the input log; the export (log 0.3) replays to the host's hash.
- Board republished at the same link: https://claude.ai/artifact/32kz3tJ2saXuL8jdNQ1xnK (rehearsal: `?role=dm&rehearsal=1&speed=18`).

## Left undone (phase 2 of the spec)

- S3.3: doses still ship from the vault automatically, so hoarding can still win on doses.
- S2.9: a permission voice to falter and to strive on every card.
- The full mortal-middle recode of all 96 options waits on the two-coder table.
- S3.1 for resident groups not tied to a mayday; S3.5 counters for Haven's and several recovery cards; S3.6 the bot-policy sweep.
- S5.4 to S5.8: touch targets, relabels, maydays that ask for tokens not held, silent rejections, reconnect.
- The replay viewer (`viewer/`) still reads the deprecated `enacted_score`.
- The board's export and print links do nothing inside the claude.ai viewer (no `downloads` capability); they work from a file or crucible-host.
- No human has played it.
