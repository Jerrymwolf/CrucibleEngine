//! Integration tests: determinism, replay, and the run-log rules.

use crucible_core::log::Event;
use crucible_core::{replay, run, Content, RunConfig};
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;

fn content() -> Content {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content");
    Content::load(&dir).expect("content loads")
}

#[test]
fn content_validates() {
    content().validate().expect("content is valid");
}

#[test]
fn same_seed_is_byte_identical() {
    let c = content();
    let cfg = RunConfig { seed: 42, ..Default::default() };
    let a = run(&c, &cfg).to_json();
    let b = run(&c, &cfg).to_json();
    assert_eq!(a, b);
}

#[test]
fn different_seeds_differ() {
    let c = content();
    let a = run(&c, &RunConfig { seed: 1, ..Default::default() });
    let b = run(&c, &RunConfig { seed: 2, ..Default::default() });
    assert_ne!(a.summary.state_hash, b.summary.state_hash);
}

#[test]
fn replay_reproduces_state_hash() {
    let c = content();
    let log = run(&c, &RunConfig { seed: 42, ..Default::default() });
    let again = replay(&c, &log);
    assert_eq!(again.summary.state_hash, log.summary.state_hash);
    // Replayed decisions are labelled `script`; the state itself must match tick by tick.
    for (a, b) in log.ticks.iter().zip(&again.ticks) {
        assert_eq!(a.infrastructure, b.infrastructure);
        assert_eq!(a.morale, b.morale);
        assert_eq!(a.isolated, b.isolated);
    }
}

#[test]
fn replay_survives_json_roundtrip() {
    let c = content();
    let log = run(&c, &RunConfig { seed: 7, ..Default::default() });
    let parsed = crucible_core::RunLog::from_json(&log.to_json()).unwrap();
    assert_eq!(replay(&c, &parsed).summary.state_hash, log.summary.state_hash);
}

#[test]
fn log_rules_hold_for_seed_42() {
    let c = content();
    let log = run(&c, &RunConfig { seed: 42, ..Default::default() });
    assert_eq!(log.t_start, -4320);
    assert_eq!(log.t_end, 1440 + 24 * 60);
    assert_eq!(log.ticks.len(), 481);
    assert_eq!(log.parishes.len(), 6);
    let mut presented: BTreeSet<(String, String)> = BTreeSet::new();
    let mut cascade_events: BTreeMap<String, usize> = BTreeMap::new();
    let mut prev = None;
    for tick in &log.ticks {
        if let Some(p) = prev {
            assert_eq!(tick.t - p, log.step_minutes);
        }
        prev = Some(tick.t);
        assert_eq!(tick.infrastructure.len(), 6);
        for row in tick.infrastructure.values() {
            assert_eq!(row.len(), 7);
            for v in row.values() {
                assert!((0..=100).contains(v));
            }
        }
        for e in &tick.events {
            match e {
                Event::DilemmaPresented { dilemma_id, parish_id, .. } => {
                    presented.insert((dilemma_id.clone(), parish_id.clone()));
                }
                Event::Decision { dilemma_id, parish_id, values_signaled, .. } => {
                    assert!(presented.contains(&(dilemma_id.clone(), parish_id.clone())), "decision without presentation");
                    for v in values_signaled.values() {
                        assert!((-3..=3).contains(v));
                    }
                }
                Event::Cascade { rule_id, .. } => *cascade_events.entry(rule_id.clone()).or_insert(0) += 1,
                _ => {}
            }
        }
    }
    for (rule_id, n) in &cascade_events {
        let rule = c.infrastructure.cascade_rules.iter().find(|r| &r.id == rule_id).unwrap();
        assert!(*n <= rule.effects.len(), "rule {rule_id} landed more effects than it has");
    }
    assert_eq!(log.summary.cascades_fired, cascade_events.len());
    assert!(log.summary.decisions > 0);
}

#[test]
fn scripted_decision_is_honoured() {
    let c = content();
    let base = run(&c, &RunConfig { seed: 3, ..Default::default() });
    let (dilemma_id, parish) = base
        .ticks
        .iter()
        .flat_map(|t| t.events.iter())
        .find_map(|e| match e {
            Event::DilemmaPresented { dilemma_id, parish_id, .. } => Some((dilemma_id.clone(), parish_id.clone())),
            _ => None,
        })
        .unwrap();
    let d = c.dilemmas.all_dilemmas.iter().find(|d| d.id == dilemma_id).unwrap();
    let want = d.options.last().unwrap().id.clone();
    let mut decisions = BTreeMap::new();
    decisions.insert(dilemma_id.clone(), crucible_core::ScriptedDecision { option_id: want.clone(), rationale: Some("scripted".into()), t: None });
    let log = run(&c, &RunConfig { seed: 3, decisions, ..Default::default() });
    let found = log.ticks.iter().flat_map(|t| t.events.iter()).any(|e| matches!(e, Event::Decision { dilemma_id: id, parish_id, option_id, controller, .. } if id == &dilemma_id && parish_id == &parish && option_id == &want && controller == "script"));
    assert!(found);
}
