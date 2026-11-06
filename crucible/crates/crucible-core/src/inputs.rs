//! Inputs: what the tables and the facilitator do, as ordered (t, seq)
//! records, and the session profile that schedules presentation and maydays.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

/// One action from a table or the facilitator.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Input {
    /// A table states its values (and optionally its one-line statement).
    LockValues {
        parish_id: String,
        values: Vec<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        statement: Option<String>,
    },
    /// Preparation round entry: KEEP (`to` = "keep") or SEND `count` of `token` to a parish.
    Allocate {
        parish_id: String,
        token: String,
        to: String,
        #[serde(default = "one")]
        count: i64,
    },
    /// A table decides its open dilemma (equivalent to a scripted decision at `t`).
    Decide {
        parish_id: String,
        dilemma_id: String,
        option_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        rationale: Option<String>,
    },
    /// The asker raises a call for aid from the content.
    Mayday { parish_id: String, call_id: String },
    /// The holder answers an open call.
    AnswerAid {
        parish_id: String,
        call_id: String,
        answer: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        count: Option<i64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },
    /// The hidden reserve goes on the sheet.
    DeclareHidden { parish_id: String },
    /// Recovery: a token sent to another parish's repair.
    RepairSend {
        parish_id: String,
        token: String,
        to: String,
        #[serde(default = "one")]
        count: i64,
    },
    /// Recovery: a line of credit naming another table's people.
    CreditLine { parish_id: String, to: String, text: String },
    /// The facilitator swaps a scheduled or open dilemma for another card.
    SwapDilemma { parish_id: String, from: String, to: String },
}

fn one() -> i64 {
    1
}

impl Input {
    pub fn parish_id(&self) -> &str {
        match self {
            Input::LockValues { parish_id, .. }
            | Input::Allocate { parish_id, .. }
            | Input::Decide { parish_id, .. }
            | Input::Mayday { parish_id, .. }
            | Input::AnswerAid { parish_id, .. }
            | Input::DeclareHidden { parish_id }
            | Input::RepairSend { parish_id, .. }
            | Input::CreditLine { parish_id, .. }
            | Input::SwapDilemma { parish_id, .. } => parish_id,
        }
    }

    pub fn kind(&self) -> &'static str {
        match self {
            Input::LockValues { .. } => "lock_values",
            Input::Allocate { .. } => "allocate",
            Input::Decide { .. } => "decide",
            Input::Mayday { .. } => "mayday",
            Input::AnswerAid { .. } => "answer_aid",
            Input::DeclareHidden { .. } => "declare_hidden",
            Input::RepairSend { .. } => "repair_send",
            Input::CreditLine { .. } => "credit_line",
            Input::SwapDilemma { .. } => "swap_dilemma",
        }
    }
}

/// An input pinned to a tick. Inputs apply in (t, seq) order at the first
/// tick whose time is at or after `t`, before that tick's decision step.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InputRecord {
    pub t: i64,
    #[serde(default)]
    pub seq: u64,
    #[serde(flatten)]
    pub input: Input,
}

/// A scheduled presentation from the session profile.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledAsk {
    pub dilemma_id: String,
    pub present_t: i64,
    /// Human deadline in ticks after presentation.
    pub deadline_ticks: i64,
}

/// A scheduled call for aid from the session profile.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledMayday {
    pub call_id: String,
    pub t: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub answer_ticks: Option<i64>,
}

/// The parts of a session profile the core acts on.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Session {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// parish -> scheduled presentations (v3 profiles).
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub schedule: BTreeMap<String, Vec<ScheduledAsk>>,
    /// Dilemma ids human tables are asked without a schedule (older profiles).
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub ask: BTreeSet<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub maydays: Vec<ScheduledMayday>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allocation_lock_t: Option<i64>,
    /// [[t, intensity], ...] from the profile.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub intensity: Vec<(i64, i64)>,
}

impl Session {
    pub fn is_empty(&self) -> bool {
        self.schedule.is_empty() && self.ask.is_empty() && self.maydays.is_empty() && self.allocation_lock_t.is_none() && self.intensity.is_empty()
    }

    /// Reads a profile as written in `content/sessions/*.json`. `ask` may be
    /// arrays of dilemma ids (older profiles) or arrays of scheduled asks.
    pub fn from_profile(profile: &Value) -> Result<Session, String> {
        let mut s = Session { id: profile.get("id").and_then(|v| v.as_str()).map(String::from), ..Default::default() };
        if let Some(Value::Object(ask)) = profile.get("ask") {
            for (parish, entries) in ask {
                let Some(arr) = entries.as_array() else { continue };
                for e in arr {
                    match e {
                        Value::String(id) => {
                            s.ask.insert(id.clone());
                        }
                        Value::Object(_) => {
                            let a: ScheduledAsk = serde_json::from_value(e.clone()).map_err(|err| format!("session ask for {parish}: {err}"))?;
                            s.schedule.entry(parish.to_lowercase()).or_default().push(a);
                        }
                        _ => return Err(format!("session ask for {parish}: unexpected entry")),
                    }
                }
            }
        }
        if let Some(Value::Array(m)) = profile.get("maydays") {
            for e in m {
                s.maydays.push(serde_json::from_value(e.clone()).map_err(|err| format!("session maydays: {err}"))?);
            }
        }
        s.allocation_lock_t = profile.get("allocation").and_then(|a| a.get("lockT")).and_then(|v| v.as_i64());
        if let Some(Value::Array(curve)) = profile.get("intensity") {
            for p in curve {
                if let Some(pair) = p.as_array() {
                    if let (Some(t), Some(i)) = (pair.first().and_then(|v| v.as_i64()), pair.get(1).and_then(|v| v.as_i64())) {
                        s.intensity.push((t, i));
                    }
                }
            }
        }
        for asks in s.schedule.values_mut() {
            asks.sort_by_key(|a| a.present_t);
        }
        s.maydays.sort_by_key(|m| m.t);
        Ok(s)
    }

    /// Every dilemma id a human table is asked under this session.
    pub fn asked_ids(&self) -> BTreeSet<String> {
        let mut out = self.ask.clone();
        for asks in self.schedule.values() {
            out.extend(asks.iter().map(|a| a.dilemma_id.clone()));
        }
        out
    }
}

/// Sorts inputs by (t, seq); the order they apply in.
pub fn sort_inputs(inputs: &mut [InputRecord]) {
    inputs.sort_by_key(|r| (r.t, r.seq));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inputs_roundtrip_with_kind_tag() {
        let r = InputRecord { t: -3000, seq: 2, input: Input::Allocate { parish_id: "haven".into(), token: "FUEL".into(), to: "summit".into(), count: 2 } };
        let s = serde_json::to_string(&r).unwrap();
        assert!(s.contains("\"kind\":\"allocate\"") && s.contains("\"t\":-3000"));
        let back: InputRecord = serde_json::from_str(&s).unwrap();
        assert_eq!(back, r);
        let short: InputRecord = serde_json::from_str(r#"{"t": 0, "kind": "mayday", "parish_id": "keystone", "call_id": "L1"}"#).unwrap();
        assert_eq!(short.seq, 0);
        assert_eq!(short.input.kind(), "mayday");
    }

    #[test]
    fn profile_with_scheduled_asks_parses() {
        let v: Value = serde_json::json!({
            "id": "x",
            "ask": {"gateway": [{"dilemmaId": "v3-prep-gateway", "presentT": -3600, "deadlineTicks": 39}], "haven": ["watch-haven-01"]},
            "maydays": [{"callId": "A1", "t": -2040, "answerTicks": 33}],
            "allocation": {"lockT": -3120},
            "intensity": [[-4320, 3], [0, 9]]
        });
        let s = Session::from_profile(&v).unwrap();
        assert_eq!(s.schedule["gateway"][0].deadline_ticks, 39);
        assert!(s.ask.contains("watch-haven-01"));
        assert_eq!(s.maydays[0].call_id, "A1");
        assert_eq!(s.allocation_lock_t, Some(-3120));
        assert_eq!(s.intensity.len(), 2);
        assert!(s.asked_ids().contains("v3-prep-gateway"));
    }
}
