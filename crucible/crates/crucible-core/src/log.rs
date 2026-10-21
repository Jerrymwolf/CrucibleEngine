//! The run log: the only output of the core and the only input of the viewer.
//! Field names follow docs/RUN_LOG_SCHEMA.md; anything beyond it is optional.

use crate::inputs::{InputRecord, Session};
use crate::state::{Convoy, GroupState};
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Team {
    pub parish_id: String,
    /// ai | script | human
    pub controller: String,
    pub stated_values: Vec<String>,
    /// The table's one-line statement, when it locked one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub statement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Event {
    WindowTransition {
        from: Option<String>,
        to: String,
        narrative: String,
    },
    Degradation {
        parish_id: String,
        system: String,
        delta: i64,
        cause: String,
    },
    Cascade {
        rule_id: String,
        parish_id: String,
        system: String,
        delta: i64,
        narrative: String,
    },
    Connectivity {
        parish_id: String,
        system: String,
        status: String,
        source: String,
        narrative: String,
    },
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
        /// "storm" when the deadline passed and the default option was applied.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        decided_by: Option<String>,
    },
    Consequence {
        dilemma_id: String,
        parish_id: String,
        system: String,
        delta: i64,
        delay_minutes: i64,
        narrative: String,
    },
    // --- routes and convoys ---
    RouteCut {
        route_id: String,
        name: String,
        mode: String,
        from: String,
        to: String,
        narrative: String,
    },
    RouteReopened {
        route_id: String,
        name: String,
        mode: String,
        from: String,
        to: String,
        narrative: String,
    },
    ConvoyDeparted {
        convoy_id: u64,
        from: String,
        to: String,
        token: String,
        count: i64,
        route_ids: Vec<String>,
        arrive_t: i64,
        purpose: String,
    },
    ConvoyTurnedBack {
        convoy_id: u64,
        from: String,
        to: String,
        token: String,
        count: i64,
        route_id: String,
        return_t: i64,
        narrative: String,
    },
    ConvoyArrived {
        convoy_id: u64,
        from: String,
        to: String,
        token: String,
        count: i64,
        purpose: String,
    },
    TokenReturned {
        parish_id: String,
        token: String,
        count: i64,
    },
    // --- tokens ---
    /// An allocation entry (send | keep | keep_everything), a declared
    /// reserve or a repair send, with the signals it was scored.
    Allocation {
        parish_id: String,
        entry: String,
        token: String,
        to: String,
        count: i64,
        values_signaled: BTreeMap<String, i64>,
    },
    ValuesLocked {
        parish_id: String,
        values: Vec<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        statement: Option<String>,
    },
    CreditLine {
        parish_id: String,
        to: String,
        text: String,
        values_signaled: BTreeMap<String, i64>,
    },
    // --- aid ---
    Mayday {
        call_id: String,
        asker: String,
        holder: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        token: Option<String>,
        count: i64,
        deadline_t: i64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        persona_id: Option<String>,
        line: String,
        ask: String,
        raised_by: String,
    },
    AidExpired {
        call_id: String,
        holder: String,
    },
    AidAnswer {
        call_id: String,
        asker: String,
        holder: String,
        answer: String,
        label: String,
        count: i64,
        /// human | ai | silence | dilemma
        controller: String,
        /// Some(false) when the token could not travel; None while a convoy is on its way.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        delivered: Option<bool>,
        /// Why the token did not travel.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        note: Option<String>,
        /// The table's own words, when it gave any.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        rationale: Option<String>,
        values_signaled: BTreeMap<String, i64>,
    },
    // --- residents, doses, chance ---
    ResidentState {
        parish_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        group_id: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        card_id: Option<String>,
        state: String,
        count: i64,
        source: String,
        narrative: String,
    },
    ShipSailed {
        consignment: String,
        doses: i64,
    },
    ConsignmentMissed {
        consignment: String,
        reason: String,
    },
    DosesLost {
        doses: i64,
        reason: String,
    },
    Chance {
        parish_id: String,
        source: String,
        p: f64,
        hit: bool,
    },
    /// An input or an authored effect that could not apply, and why.
    Rejected {
        source: String,
        parish_id: String,
        reason: String,
    },
}

/// The two counters the board shows, plus what feeds them.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct Counters {
    pub doses_shipped: i64,
    pub people_safe: i64,
    pub vault_doses: i64,
    pub aboard: i64,
    pub at_risk: i64,
    pub injured: i64,
    pub lost: i64,
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
    #[serde(default)]
    pub counters: Counters,
    /// parish -> token -> count on the sheet after this tick.
    #[serde(default)]
    pub stock: BTreeMap<String, BTreeMap<String, i64>>,
    /// Route ids cut after this tick.
    #[serde(default)]
    pub routes_cut: Vec<String>,
    /// SHA-256 of the hashed state after this tick.
    #[serde(default)]
    pub state_hash: String,
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResidentsSummary {
    pub groups: BTreeMap<String, GroupState>,
    pub cards: BTreeMap<String, String>,
    pub people_safe: i64,
    pub at_risk: i64,
    pub injured: i64,
    pub lost: i64,
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
    #[serde(default)]
    pub counters: Counters,
    #[serde(default)]
    pub residents: ResidentsSummary,
    #[serde(default)]
    pub stock: BTreeMap<String, BTreeMap<String, i64>>,
    #[serde(default)]
    pub flags: Vec<String>,
}

/// A call for aid still open when the run stopped.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OpenCallInfo {
    pub call_id: String,
    pub asker: String,
    pub holder: String,
    pub opened_t: i64,
    pub deadline_t: i64,
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
    /// Live mode only: the run halted before tick `t` because these human
    /// dilemmas are waiting for a decision. Absent from complete runs.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub pending: Vec<PendingDilemma>,
    /// The inputs the run was given, as given (replay feeds them back).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub inputs: Vec<InputRecord>,
    /// The session profile parts the run used.
    #[serde(default, skip_serializing_if = "Session::is_empty")]
    pub session: Session,
    /// The horizon the run stopped at, when it stopped before `t_end`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub until: Option<i64>,
    /// Calls for aid still open when the run stopped.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub open_calls: Vec<OpenCallInfo>,
}

/// A dilemma open for a human team that has no decision yet (live mode).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PendingDilemma {
    pub t: i64,
    pub parish_id: String,
    pub dilemma_id: String,
    pub title: String,
    pub setup: String,
    pub deadline_t: i64,
    pub options: Vec<PendingOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PendingOption {
    pub id: String,
    pub label: String,
    pub description: String,
}

/// What the state hash covers: the canonical state after a tick.
#[derive(Serialize)]
pub struct HashedState<'a> {
    pub t: i64,
    pub infrastructure: &'a BTreeMap<String, BTreeMap<String, i64>>,
    pub morale: &'a BTreeMap<String, i64>,
    pub isolated: &'a BTreeSet<String>,
    pub fired_rules: &'a BTreeSet<String>,
    /// (t, kind, parish, source id, choice)
    pub decisions: Vec<(i64, String, String, String, String)>,
    pub stock: &'a BTreeMap<String, BTreeMap<String, i64>>,
    pub hidden: &'a BTreeMap<String, BTreeMap<String, i64>>,
    pub routes_cut: Vec<String>,
    pub convoys: &'a [Convoy],
    pub counters: &'a Counters,
    pub groups: &'a BTreeMap<String, GroupState>,
    pub cards: &'a BTreeMap<String, String>,
    pub flags: &'a BTreeSet<String>,
    pub calls_answered: &'a BTreeMap<String, String>,
    pub doses: (i64, i64, i64, i64, i64),
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
                        crate::controller::ScriptedDecision { option_id: option_id.clone(), rationale: Some(rationale.clone()), t: Some(tick.t) },
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
        let e = Event::RouteCut {
            route_id: "gorge-road".into(),
            name: String::new(),
            mode: "road".into(),
            from: "summit".into(),
            to: "heartland".into(),
            narrative: String::new(),
        };
        assert!(serde_json::to_string(&e).unwrap().contains("\"kind\":\"route_cut\""));
    }
}
