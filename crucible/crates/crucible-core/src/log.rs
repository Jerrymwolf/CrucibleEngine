//! The run log: the only output of the core and the only input of the viewer.
//! Field names follow docs/RUN_LOG_SCHEMA.md; anything beyond it is optional.

use crate::values::ValuesGapRow;
use crate::weather::Weather;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParishMeta {
    pub id: String,
    pub name: String,
    pub population: u64,
    pub position: MapPoint,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(default)]
    pub absent_systems: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MapPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMeta {
    pub id: String,
    /// Log phase: watch | crisis | recovery.
    pub phase: String,
    /// Hours before landfall (72 for watch-72, -24 for recovery-24), per the contract.
    pub t_minus_hours: i64,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub certainty: Option<f64>,
    /// Extra: start of the window in signed simulation minutes.
    pub t_minutes: i64,
    /// Extra: the timeline's own phase name (watch, warning, approach, ...).
    pub timeline_phase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub parish_id: String,
    /// ai | script | human
    pub controller: String,
    pub stated_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Event {
    WindowTransition { from: Option<String>, to: String, narrative: String },
    Degradation { parish_id: String, system: String, delta: i64, cause: String },
    Cascade { rule_id: String, parish_id: String, system: String, delta: i64, narrative: String },
    Connectivity { parish_id: String, system: String, status: String, source: String, narrative: String },
    Isolation {
        parish_id: String,
        narrative: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        ended: Option<bool>,
    },
    DilemmaPresented {
        dilemma_id: String,
        parish_id: String,
        title: String,
        setup: String,
        values_tested: Vec<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        persona_id: Option<String>,
        deadline_t: i64,
    },
    Decision {
        dilemma_id: String,
        parish_id: String,
        option_id: String,
        option_label: String,
        rationale: String,
        controller: String,
        values_signaled: BTreeMap<String, i64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        expired: Option<bool>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        pressure: Option<f64>,
    },
    Consequence { dilemma_id: String, parish_id: String, system: String, delta: i64, delay_minutes: i64, narrative: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {
    pub t: i64,
    pub window_id: String,
    pub phase: String,
    pub intensity: i64,
    pub weather: Weather,
    pub infrastructure: BTreeMap<String, BTreeMap<String, i64>>,
    pub morale: BTreeMap<String, i64>,
    pub isolated: Vec<String>,
    pub events: Vec<Event>,
    /// Optional extra: primitive RNG draws made during this tick (REA brief e.5).
    #[serde(default)]
    pub rng_draws: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParishOutcome {
    pub min_power: i64,
    pub minutes_isolated: i64,
    pub decisions: usize,
    pub final_morale: i64,
    /// Extra: the final level of every system.
    pub final_infrastructure: BTreeMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Summary {
    pub ticks: usize,
    pub decisions: usize,
    pub cascades_fired: usize,
    pub per_parish: BTreeMap<String, ParishOutcome>,
    pub values_gap: Vec<ValuesGapRow>,
    pub state_hash: String,
    /// Extra: the ids of the cascade rules that fired, in id order.
    pub cascade_rules_fired: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunLog {
    pub version: String,
    pub seed: u64,
    pub scenario: String,
    pub content_hash: String,
    pub step_minutes: i64,
    pub t_start: i64,
    pub t_end: i64,
    pub systems: Vec<String>,
    pub parishes: Vec<ParishMeta>,
    pub windows: Vec<WindowMeta>,
    pub teams: Vec<Team>,
    pub ticks: Vec<Tick>,
    pub summary: Summary,
}

/// What the state hash covers: the canonical final state.
#[derive(Serialize)]
pub struct HashedState<'a> {
    pub t: i64,
    pub infrastructure: &'a BTreeMap<String, BTreeMap<String, i64>>,
    pub morale: &'a BTreeMap<String, i64>,
    pub isolated: &'a BTreeSet<String>,
    pub fired_rules: &'a BTreeSet<String>,
    pub decisions: Vec<(i64, String, String, String)>,
}

pub fn state_hash(h: &HashedState) -> String {
    let bytes = serde_json::to_vec(h).expect("state serializes");
    format!("{:x}", Sha256::digest(bytes))
}

impl RunLog {
    pub fn to_json(&self) -> String {
        let mut s = serde_json::to_string(self).expect("run log serializes");
        s.push('\n');
        s
    }

    pub fn from_json(s: &str) -> Result<RunLog, serde_json::Error> {
        serde_json::from_str(s)
    }

    /// Scripted decisions recovered from the log, pinned to their ticks.
    pub fn recorded_decisions(&self) -> BTreeMap<String, crate::controller::ScriptedDecision> {
        let mut out = BTreeMap::new();
        for tick in &self.ticks {
            for e in &tick.events {
                if let Event::Decision { dilemma_id, option_id, rationale, .. } = e {
                    out.insert(
                        dilemma_id.clone(),
                        crate::controller::ScriptedDecision {
                            option_id: option_id.clone(),
                            rationale: Some(rationale.clone()),
                            t: Some(tick.t),
                        },
                    );
                }
            }
        }
        out
    }

    /// The intensity curve the run actually used, one point per tick.
    pub fn recorded_intensity(&self) -> Vec<(i64, i64)> {
        self.ticks.iter().map(|t| (t.t, t.intensity)).collect()
    }
}

/// `T-72:00` style clock from signed simulation minutes.
pub fn clock(t: i64) -> String {
    let sign = if t < 0 { "-" } else { "+" };
    let a = t.abs();
    format!("T{sign}{:02}:{:02}", a / 60, a % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clock_format() {
        assert_eq!(clock(-4320), "T-72:00");
        assert_eq!(clock(-15), "T-00:15");
        assert_eq!(clock(90), "T+01:30");
    }

    #[test]
    fn events_roundtrip_with_kind_tag() {
        let e = Event::Isolation { parish_id: "summit".into(), narrative: "cut off".into(), ended: None };
        let s = serde_json::to_string(&e).unwrap();
        assert!(s.contains("\"kind\":\"isolation\""));
        assert!(!s.contains("ended"));
        let back: Event = serde_json::from_str(&s).unwrap();
        assert!(matches!(back, Event::Isolation { .. }));
    }
}
