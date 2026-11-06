# Run log contract (v0.2)

The simulation core writes one JSON document per run. The viewer and all analysis read only this document. Fields marked optional may be absent; readers must tolerate absence and unknown event kinds. The example below is the v0.1 base and still holds; the fields version 0.2 added on 2026-10-21 are listed at the end and are optional for readers.

```jsonc
{
  "version": "0.2",                 // "0.1" before 2026-10-21; see the version 0.2 section
  "seed": 42,                       // u64 used to seed ChaCha20; identical seed + identical inputs => byte-identical file
  "scenario": "hurricane-midas",
  "content_hash": "sha256 hex of the concatenated content files",
  "step_minutes": 15,               // simulation minutes per tick
  "t_start": -4320,                 // sim minutes relative to landfall (T-72h)
  "t_end": 2880,                    // 24h past the start of the last timeline window; T+48h with current content
  "systems": ["power","communications","roads","water","hospital","port","airport"],
  "parishes": [
    { "id": "keystone", "name": "Keystone", "population": 3200,
      "position": { "x": 50, "y": 75 },        // percent of map, from content/concordia.json
      "role": "manufacturing", "color": "cyan" } // optional
  ],
  "windows": [
    { "id": "watch-72", "phase": "watch", "t_minus_hours": 72, "label": "Hurricane Watch issued", "certainty": 40 }
  ],
  "teams": [
    { "parish_id": "keystone", "controller": "ai",           // "ai" | "script" | "human"
      "stated_values": ["integrity","safety","community"] }  // ranked, most important first
  ],
  "ticks": [
    {
      "t": -4320,
      "window_id": "watch-72",
      "phase": "watch",                // watch | crisis | recovery
      "intensity": 3,                  // 1..10 Crucible Master dial
      "weather": { "wind_kts": 25, "rain": "light", "surge_ft": 0.0, "hurricane_position": { "x": 140, "y": 60 } },
      "infrastructure": { "keystone": { "power": 100, "communications": 100, "roads": 100, "water": 100, "hospital": 100, "port": 0, "airport": 0 } },
      "morale": { "keystone": 80 },    // optional, 0..100
      "isolated": ["summit"],          // optional, parish ids unreachable by road this tick
      "events": [
        { "kind": "window_transition", "from": "watch-72", "to": "watch-48", "narrative": "..." },
        { "kind": "degradation", "parish_id": "haven", "system": "port", "delta": -10, "cause": "storm surge" },
        { "kind": "cascade", "rule_id": "heartland-dam-keystone-power", "parish_id": "keystone", "system": "power", "delta": -30, "narrative": "..." },
        { "kind": "connectivity", "parish_id": "sterling", "system": "power", "status": "lost", "source": "heartland", "narrative": "..." },
        { "kind": "isolation", "parish_id": "summit", "narrative": "..." },
        { "kind": "dilemma_presented", "dilemma_id": "crisis-keystone-02", "parish_id": "keystone", "title": "...", "setup": "...", "values_tested": ["integrity","safety"], "persona_id": "frank-reeves", "deadline_t": -300 },
        { "kind": "decision", "dilemma_id": "crisis-keystone-02", "parish_id": "keystone", "option_id": "b", "option_label": "...", "rationale": "...", "controller": "ai", "values_signaled": { "integrity": -1, "productivity": 2 } },
        { "kind": "consequence", "dilemma_id": "crisis-keystone-02", "parish_id": "haven", "system": "hospital", "delta": -15, "delay_minutes": 60, "narrative": "..." },
        { "kind": "directive", "from": "cm", "to": "all", "lever": "information-fog", "direction": "increase", "narrative": "..." },
        { "kind": "narrative", "channel": "radio", "parish_id": "sterling", "persona_id": "diana-chen", "text": "..." }
      ]
    }
  ],
  "summary": {
    "ticks": 384,
    "decisions": 23,
    "cascades_fired": 11,
    "per_parish": { "keystone": { "min_power": 20, "minutes_isolated": 180, "decisions": 4, "final_morale": 55 } },
    "values_gap": [
      { "parish_id": "keystone", "value": "integrity", "stated_rank": 1, "enacted_score": -0.5, "n_decisions": 3,
        "evidence": [ { "dilemma_id": "crisis-keystone-02", "option_id": "b", "signal": -1 } ] }
    ],
    "state_hash": "sha256 hex of final state; replay must reproduce it"
  }
}
```

Rules:
- `t` is strictly increasing by `step_minutes`.
- Infrastructure levels are integers 0..100. 0 means failed. Systems a parish does not have are 0 and listed in `parishes[].absent_systems` (optional).
- Every `decision` event references a prior `dilemma_presented` with the same `dilemma_id` and `parish_id`.
- `values_signaled` scores are integers in -3..3, the ABCD alignment scale from the design corpus.

## Optional fields emitted by v0

Observed in `runs/seed-42.run.json` beyond the fields above. Readers must tolerate them and must not require them.

- `windows[]`: `t_minutes` (sim minutes relative to landfall) and `timeline_phase` (the phase name as authored in `timeline.json`).
- `ticks[]`: `rng_draws` (count of RNG primitive draws that tick); `morale` and `isolated` are present on every tick.
- `ticks[].weather`: `wind_mph` and `rain_in_per_hour` beside `wind_kts` and `rain`.
- `window_transition`: `from` is `null` on the first tick.
- `decision`: `pressure` (the drift model's 0..1 pressure at the decision). `log.rs` also defines an optional `expired: true` for a dilemma that ran to its deadline; seed 42 has none, so it does not appear in that file.
- `connectivity.status`: `backup` and `backup_exhausted` beside `lost` and `restored`.
- `isolation`: `ended: true` marks the end of an isolation; absent on its start.
- `consequence.system` may be `morale`.
- `summary`: `cascade_rules_fired` (sorted list of rule ids); `per_parish[].final_infrastructure` (per-system levels at the last tick).

## Optional field added 2026-10-20: `pending` (live mode)

Present only on a run halted in live mode, absent otherwise. An array of `{t, parish_id, dilemma_id, title, setup, deadline_t, options: [{id, label, description}]}`. All entries share the same `t`: the tick the run stopped before. `ticks` ends at the tick before `t`, and `summary` describes that partial state. Decision events from human teams carry `controller: "human"`. Since 0.2, `pending` also appears on a run stopped by `until` while human cards are open.

## Version 0.2 (2026-10-21): inputs, tokens, calls for aid, routes, residents, counters

`version` is `"0.2"`. Everything above still holds, and a v0.1 reader that tolerates unknown fields and event kinds reads a v0.2 file. The additions, with the rules they obey:

```jsonc
{
  "version": "0.2",
  "teams": [
    { "parish_id": "haven", "controller": "human", "stated_values": ["service","honesty","fairness"],
      "statement": "The port stays open for everyone." }          // optional; set by a lock_values input
  ],
  "ticks": [
    {
      "counters": { "doses_shipped": 96000, "people_safe": 24100, "vault_doses": 18250, "aboard": 0, "at_risk": 0, "injured": 0, "lost": 0 },
      "stock": { "haven": { "FUEL": 3, "GEN": 2 } },             // parish -> token -> count on the sheet after this tick; zero counts omitted
      "routes_cut": ["gorge-road"],                               // route ids cut after this tick
      "state_hash": "sha256 hex of the hashed state after this tick",
      "events": [
        { "kind": "decision", "dilemma_id": "v3-prep-gateway", "parish_id": "gateway", "option_id": "a", "option_label": "...", "rationale": "...",
          "controller": "human", "values_signaled": { "safety": 2 }, "expired": true, "decided_by": "storm" },   // the deadline passed; the card's default option applied
        { "kind": "values_locked", "parish_id": "haven", "values": ["service","honesty","fairness"], "statement": "..." },
        { "kind": "allocation", "parish_id": "haven", "entry": "send", "token": "FUEL", "to": "summit", "count": 1,
          "values_signaled": { "service": 2, "fairness": 3, "compassion": 1 } },   // entry: send | keep | keep_everything | declare_hidden | repair_send; keep rows carry token "*"
        { "kind": "credit_line", "parish_id": "sterling", "to": "summit", "text": "...", "values_signaled": { "recognition": 2, "respect": 1 } },
        { "kind": "route_cut", "route_id": "gorge-road", "name": "...", "mode": "road", "from": "summit", "to": "heartland", "narrative": "..." },
        { "kind": "route_reopened", "route_id": "gorge-road", "name": "...", "mode": "road", "from": "summit", "to": "heartland", "narrative": "..." },
        { "kind": "convoy_departed", "convoy_id": 3, "from": "haven", "to": "summit", "token": "FUEL", "count": 1,
          "route_ids": ["ring-haven-sterling","ring-sterling-summit"], "arrive_t": -3045, "purpose": "allocation" },   // purpose: allocation | aid:<call_id> | repair | effect:<origin>
        { "kind": "convoy_arrived", "convoy_id": 3, "from": "haven", "to": "summit", "token": "FUEL", "count": 1, "purpose": "allocation" },
        { "kind": "convoy_turned_back", "convoy_id": 4, "from": "summit", "to": "gateway", "token": "MEDIC", "count": 1, "route_id": "...", "return_t": 360, "narrative": "..." },
        { "kind": "token_returned", "parish_id": "summit", "token": "MEDIC", "count": 1 },
        { "kind": "mayday", "call_id": "A1", "asker": "summit", "holder": "sterling", "token": "LIFT", "count": 2, "deadline_t": -1545,
          "persona_id": "...", "line": "...", "ask": "...", "raised_by": "schedule" },   // raised_by: schedule | input | effect
        { "kind": "aid_answer", "call_id": "A1", "asker": "summit", "holder": "sterling", "answer": "grant", "label": "...", "count": 2,
          "controller": "human", "rationale": "...", "values_signaled": { "service": 2 } },   // controller: human | ai | silence | dilemma; "delivered": false with a "note" when the token could not travel
        { "kind": "aid_expired", "call_id": "A6", "holder": "heartland" },
        { "kind": "resident_state", "parish_id": "summit", "group_id": "icu-patients", "state": "sheltered", "count": 6, "source": "A1:grant", "narrative": "..." },   // card_id instead of group_id for a named card
        { "kind": "ship_sailed", "consignment": "Kestrel Reach", "doses": 96000 },
        { "kind": "consignment_missed", "consignment": "next", "reason": "..." },
        { "kind": "doses_lost", "doses": 11250, "reason": "..." },
        { "kind": "chance", "parish_id": "gateway", "source": "v3-landfall-gateway:b", "p": 0.4, "hit": false },
        { "kind": "rejected", "source": "input:allocate", "parish_id": "haven", "reason": "..." }   // an input (input:<kind>), the schedule, or an authored effect that could not apply
      ]
    }
  ],
  "summary": {
    "counters": { "doses_shipped": 177250, "people_safe": 24096, "vault_doses": 12000, "aboard": 0, "at_risk": 0, "injured": 4, "lost": 0 },   // as on the last tick
    "residents": { "groups": { "icu-patients": { "safe": 0, "sheltered": 0, "at_risk": 0, "rescued": 18, "injured": 0, "lost": 0 } },
                   "cards": { "amara-osei": "rescued" }, "people_safe": 24096, "at_risk": 0, "injured": 4, "lost": 0 },
    "stock": { "haven": { "FUEL": 1 } },                            // as on the last tick
    "flags": ["hospital-first"],                                    // flags set by decisions and effects, sorted
    "values_gap": [
      { "parish_id": "haven", "value": "service", "stated_rank": 1, "enacted_score": 1.5, "n_decisions": 2,
        "evidence": [ { "kind": "allocation", "dilemma_id": "allocate:FUEL", "option_id": "send:summit", "signal": 2 },
                      { "kind": "dilemma", "dilemma_id": "v3-prep-haven", "option_id": "d", "signal": 1, "decided_by": "storm" } ] }
    ]
  },
  "inputs": [ { "t": -3000, "seq": 0, "kind": "allocate", "parish_id": "haven", "token": "FUEL", "to": "summit", "count": 1 } ],   // as given, sorted by (t, seq); absent when none
  "session": { "id": "parish-90",
               "schedule": { "gateway": [ { "dilemmaId": "v3-prep-gateway", "presentT": -3600, "deadlineTicks": 39 } ] },
               "maydays": [ { "callId": "A1", "t": -2040, "answerTicks": 33 } ],
               "allocation_lock_t": -3120,
               "intensity": [[-4320, 3], [-3600, 4]] },           // the profile parts the run used; absent when none
  "until": -3000,                                                 // present when the run stopped before t_end; ticks ends at this t
  "open_calls": [ { "call_id": "A6", "asker": "keystone", "holder": "heartland", "opened_t": -1740, "deadline_t": -1410 } ]   // calls still open at the stop
}
```

Rules added in 0.2:
- `ticks[].state_hash` is present on every tick; the last tick's equals `summary.state_hash`. `replay` reproduces both from `seed`, `teams`, the recorded decisions, `inputs`, `session` and `until`, and names the first tick whose hash differs.
- `counters.people_safe` equals the island's population less `at_risk`, `injured` and `lost`; no counter and no stock count is ever negative.
- Every `aid_answer` follows a `mayday` with the same `call_id`; every `convoy_arrived` or `convoy_turned_back` follows a `convoy_departed` with the same `convoy_id`; a convoy never arrives over a route listed in `routes_cut` between its departure and its arrival.
- `values_gap[].evidence[].kind` is `dilemma`, `allocation`, `aid`, `repair` or `credit`. `dilemma_id` then names a card; `allocate:<TOKEN>`, `allocate:keep` or `declare_hidden`; a call id; `repair:<TOKEN>`; or `credit:<parish>`. `option_id` is the option; `send:<parish>`, `keep`, `keep_everything` or `declare`; the answer; or `credit`. `decided_by: "storm"` marks a default applied at a deadline and is absent otherwise.
- A `decision` with `decided_by: "storm"` also carries `expired: true` and the controller of the team that let the deadline pass.
- Allocation and aid `values_signaled` are integers in -3..3, like those on decisions.
- `inputs`, `session`, `until` and `open_calls` are absent when empty; readers of v0.1 files see none of the 0.2 fields.
