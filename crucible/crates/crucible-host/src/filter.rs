//! Per-client views (PROTOCOL.md section 9.3): fog by communications, public
//! and private event kinds, and the compact history. Pure functions over the
//! run log; the host decides who gets which view.

use crate::protocol::Role;
use crucible_core::log::{RunLog, Tick};
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;

/// Who is looking.
#[derive(Debug, Clone, Copy)]
pub struct View<'a> {
    pub role: Role,
    pub parish: Option<&'a str>,
    /// Communications at or below this level is out of contact
    /// (`INFRASTRUCTURE_THRESHOLDS.FAILED` in the content).
    pub comms_failed: i64,
}

/// Events every role may see whatever the fog: radio traffic and the public choices.
pub const PUBLIC_EVENTS: &[&str] = &["mayday", "aid_answer", "aid_expired", "values_locked", "decision", "allocation", "credit_line", "token_returned"];

/// Events the snapshot history keeps (the feed and the minimap trail).
pub const HISTORY_EVENTS: &[&str] = &[
    "window_transition",
    "cascade",
    "isolation",
    "connectivity",
    "dilemma_presented",
    "decision",
    "route_cut",
    "route_reopened",
    "convoy_departed",
    "convoy_arrived",
    "convoy_turned_back",
    "token_returned",
    "allocation",
    "values_locked",
    "credit_line",
    "mayday",
    "aid_answer",
    "aid_expired",
    "resident_state",
    "ship_sailed",
    "consignment_missed",
    "doses_lost",
    "rejected",
];

/// The most recent history entries a snapshot carries.
pub const HISTORY_CAP: usize = 400;

fn comms(tick: &Tick, parish: &str) -> i64 {
    tick.infrastructure.get(parish).and_then(|m| m.get("communications")).copied().unwrap_or(0)
}

/// The parishes a view may see at this tick. Tables see their own parish
/// always and another only while both can talk; the projector and the DM
/// see all of them.
pub fn visible_parishes(tick: &Tick, view: &View, all: &[String]) -> BTreeSet<String> {
    match (view.role, view.parish) {
        (Role::Console | Role::Phone, Some(p)) => {
            let mut out = BTreeSet::new();
            out.insert(p.to_string());
            if comms(tick, p) > view.comms_failed {
                for q in all {
                    if q != p && comms(tick, q) > view.comms_failed {
                        out.insert(q.clone());
                    }
                }
            }
            out
        }
        _ => all.iter().cloned().collect(),
    }
}

fn event_kind(e: &Value) -> &str {
    e.get("kind").and_then(|k| k.as_str()).unwrap_or("")
}

fn event_parish(e: &Value) -> Option<&str> {
    e.get("parish_id").and_then(|p| p.as_str())
}

/// Whether an event (as JSON) is shown to the view, given the visible parishes.
pub fn event_visible(e: &Value, view: &View, visible: &BTreeSet<String>) -> bool {
    let kind = event_kind(e);
    if kind == "rejected" {
        // Private: a table sees its own, the DM all, the projector none.
        return match (view.role, view.parish) {
            (Role::Dm, _) => true,
            (Role::Console | Role::Phone, Some(p)) => event_parish(e) == Some(p),
            _ => false,
        };
    }
    if matches!(view.role, Role::Dm | Role::Projector) {
        return true;
    }
    match event_parish(e) {
        None => true,
        Some(p) => visible.contains(p) || PUBLIC_EVENTS.contains(&kind),
    }
}

fn prune_map(v: &mut Value, key: &str, visible: &BTreeSet<String>) {
    if let Some(Value::Object(m)) = v.get_mut(key) {
        m.retain(|k, _| visible.contains(k));
    }
}

/// The public view of one tick for a client: the run log's tick with its
/// per-parish maps reduced to the visible parishes, its events filtered, and
/// `fogged` naming the parishes left out.
pub fn public_tick(tick: &Tick, view: &View, all: &[String]) -> Value {
    let visible = visible_parishes(tick, view, all);
    let mut v = serde_json::to_value(tick).expect("tick serializes");
    for key in ["infrastructure", "morale", "stock"] {
        prune_map(&mut v, key, &visible);
    }
    if let Some(Value::Array(iso)) = v.get_mut("isolated") {
        iso.retain(|p| p.as_str().map(|p| visible.contains(p)).unwrap_or(false));
    }
    if let Some(Value::Array(events)) = v.get_mut("events") {
        events.retain(|e| event_visible(e, view, &visible));
    }
    if let Value::Object(m) = &mut v {
        m.remove("rng_draws");
        let fogged: Vec<&String> = all.iter().filter(|p| !visible.contains(*p)).collect();
        m.insert("fogged".into(), json!(fogged));
    }
    v
}

/// The feed-worthy events of the run so far as `{t, event}`, filtered for the
/// view, oldest first, capped to the most recent `cap`. Returns whether the
/// cap cut anything.
pub fn history(run: &RunLog, view: &View, all: &[String], cap: usize) -> (Vec<Value>, bool) {
    let mut out = Vec::new();
    for tick in &run.ticks {
        let visible = visible_parishes(tick, view, all);
        for e in &tick.events {
            let ev = serde_json::to_value(e).expect("event serializes");
            let kind = event_kind(&ev);
            if !HISTORY_EVENTS.contains(&kind) {
                continue;
            }
            if kind == "connectivity" {
                let status = ev.get("status").and_then(|s| s.as_str()).unwrap_or("");
                if status != "lost" && status != "restored" {
                    continue;
                }
            }
            if event_visible(&ev, view, &visible) {
                out.push(json!({ "t": tick.t, "event": ev }));
            }
        }
    }
    let truncated = out.len() > cap;
    if truncated {
        out.drain(..out.len() - cap);
    }
    (out, truncated)
}

/// A JSON object builder that leaves out `None`s.
pub fn obj(pairs: Vec<(&str, Option<Value>)>) -> Value {
    let mut m = Map::new();
    for (k, v) in pairs {
        if let Some(v) = v {
            m.insert(k.to_string(), v);
        }
    }
    Value::Object(m)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crucible_core::log::Event;
    use std::collections::BTreeMap;

    fn tick(comms: &[(&str, i64)]) -> Tick {
        let mut infrastructure = BTreeMap::new();
        for (p, c) in comms {
            let mut row = BTreeMap::new();
            row.insert("communications".to_string(), *c);
            row.insert("power".to_string(), 100);
            infrastructure.insert(p.to_string(), row);
        }
        Tick {
            t: 0,
            window_id: "landfall".into(),
            phase: "crisis".into(),
            intensity: 9,
            weather: crucible_core::weather::Weather {
                wind_kts: 100.0,
                rain: "heavy".into(),
                surge_ft: 8.0,
                hurricane_position: crucible_core::weather::Position { x: 50.0, y: 50.0 },
                wind_mph: 115.0,
                rain_in_per_hour: 2.0,
            },
            infrastructure,
            morale: comms.iter().map(|(p, _)| (p.to_string(), 50)).collect(),
            isolated: vec!["summit".into()],
            events: vec![
                Event::Degradation { parish_id: "summit".into(), system: "power".into(), delta: -10, cause: "wind".into() },
                Event::Degradation { parish_id: "haven".into(), system: "power".into(), delta: -10, cause: "wind".into() },
                Event::Mayday {
                    call_id: "L1".into(),
                    asker: "summit".into(),
                    holder: "haven".into(),
                    token: None,
                    count: 1,
                    deadline_t: 60,
                    persona_id: None,
                    line: String::new(),
                    ask: String::new(),
                    raised_by: "schedule".into(),
                },
                Event::Rejected { source: "input:decide".into(), parish_id: "haven".into(), reason: "late".into() },
                Event::Rejected { source: "input:decide".into(), parish_id: "summit".into(), reason: "late".into() },
                Event::ShipSailed { consignment: "Kestrel Reach".into(), doses: 1 },
            ],
            rng_draws: 3,
            counters: Default::default(),
            stock: comms.iter().map(|(p, _)| (p.to_string(), BTreeMap::from([("FUEL".to_string(), 1)]))).collect(),
            routes_cut: vec![],
            state_hash: "h".into(),
        }
    }

    fn all() -> Vec<String> {
        vec!["haven".into(), "summit".into(), "gateway".into()]
    }

    #[test]
    fn a_table_sees_parishes_it_can_talk_to_and_keeps_radio_traffic() {
        let t = tick(&[("haven", 80), ("summit", 10), ("gateway", 60)]);
        let view = View { role: Role::Console, parish: Some("haven"), comms_failed: 20 };
        let v = public_tick(&t, &view, &all());
        assert_eq!(v["fogged"], json!(["summit"]));
        assert!(v["infrastructure"].get("summit").is_none());
        assert!(v["infrastructure"].get("gateway").is_some());
        assert!(v["stock"].get("summit").is_none());
        assert_eq!(v["isolated"], json!([]));
        assert!(v.get("rng_draws").is_none());
        let kinds: Vec<(&str, Option<&str>)> = v["events"].as_array().unwrap().iter().map(|e| (event_kind(e), event_parish(e))).collect();
        assert!(kinds.contains(&("mayday", None)), "radio traffic always arrives");
        assert!(kinds.contains(&("ship_sailed", None)));
        assert!(kinds.contains(&("degradation", Some("haven"))));
        assert!(!kinds.contains(&("degradation", Some("summit"))), "a fogged parish's damage is not shown");
        assert!(kinds.contains(&("rejected", Some("haven"))));
        assert!(!kinds.contains(&("rejected", Some("summit"))), "another table's rejections are private");
    }

    #[test]
    fn a_dark_table_sees_only_itself_and_the_projector_sees_all() {
        let t = tick(&[("haven", 5), ("summit", 90), ("gateway", 90)]);
        let dark = View { role: Role::Phone, parish: Some("haven"), comms_failed: 20 };
        let v = public_tick(&t, &dark, &all());
        assert_eq!(v["fogged"], json!(["summit", "gateway"]), "in the order of the parish list");
        let proj = View { role: Role::Projector, parish: None, comms_failed: 20 };
        let v = public_tick(&t, &proj, &all());
        assert_eq!(v["fogged"], json!([]));
        assert_eq!(v["infrastructure"].as_object().unwrap().len(), 3);
        assert!(v["events"].as_array().unwrap().iter().all(|e| event_kind(e) != "rejected"));
        let dm = View { role: Role::Dm, parish: None, comms_failed: 20 };
        let v = public_tick(&t, &dm, &all());
        assert_eq!(v["events"].as_array().unwrap().iter().filter(|e| event_kind(e) == "rejected").count(), 2);
    }
}
