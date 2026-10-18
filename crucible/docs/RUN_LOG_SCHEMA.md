# Run log contract (v0.1)

The simulation core writes one JSON document per run. The viewer and all analysis read only this document. Fields marked optional may be absent; readers must tolerate absence and unknown event kinds.

```jsonc
{
  "version": "0.1",
  "seed": 42,                       // u64 used to seed ChaCha20; identical seed + identical inputs => byte-identical file
  "scenario": "hurricane-midas",
  "content_hash": "sha256 hex of the concatenated content files",
  "step_minutes": 15,               // simulation minutes per tick
  "t_start": -4320,                 // sim minutes relative to landfall (T-72h)
  "t_end": 1440,                    // T+24h
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
