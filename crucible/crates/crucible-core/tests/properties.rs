//! Property tests from the spec, over random seeds.

use crucible_core::log::Event;
use crucible_core::{replay, run, Content, RunConfig};
use proptest::prelude::*;
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;

fn content() -> Content {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content");
    Content::load(&dir).expect("content loads")
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 12, .. ProptestConfig::default() })]

    #[test]
    fn invariants_hold_for_any_seed(seed in any::<u64>()) {
        let c = content();
        let log = run(&c, &RunConfig { seed, ..Default::default() });
        let mut presented: BTreeSet<(String, String)> = BTreeSet::new();
        let mut cascades: BTreeMap<String, usize> = BTreeMap::new();
        let mut prev: Option<i64> = None;
        for tick in &log.ticks {
            if let Some(p) = prev {
                prop_assert_eq!(tick.t - p, log.step_minutes);
            }
            prev = Some(tick.t);
            for row in tick.infrastructure.values() {
                for v in row.values() {
                    prop_assert!((0..=100).contains(v));
                }
            }
            for e in &tick.events {
                match e {
                    Event::DilemmaPresented { dilemma_id, parish_id, .. } => {
                        presented.insert((dilemma_id.clone(), parish_id.clone()));
                    }
                    Event::Decision { dilemma_id, parish_id, .. } => {
                        prop_assert!(presented.contains(&(dilemma_id.clone(), parish_id.clone())));
                    }
                    Event::Cascade { rule_id, .. } => *cascades.entry(rule_id.clone()).or_insert(0) += 1,
                    _ => {}
                }
            }
        }
        for (rule_id, n) in &cascades {
            let rule = c.infrastructure.cascade_rules.iter().find(|r| &r.id == rule_id).unwrap();
            prop_assert!(*n <= rule.effects.len());
        }
        // each rule fires at most once: the fired list has no duplicates
        let fired: BTreeSet<&String> = log.summary.cascade_rules_fired.iter().collect();
        prop_assert_eq!(fired.len(), log.summary.cascade_rules_fired.len());
        prop_assert_eq!(fired.len(), log.summary.cascades_fired);
        // e.5: the rng draw count per tick is identical across two runs of the same seed
        let twin = run(&c, &RunConfig { seed, ..Default::default() });
        let draws: Vec<u64> = log.ticks.iter().map(|t| t.rng_draws).collect();
        let twin_draws: Vec<u64> = twin.ticks.iter().map(|t| t.rng_draws).collect();
        prop_assert_eq!(draws, twin_draws);
        prop_assert!(log.summary.cascades_fired <= c.infrastructure.cascade_rules.len());
        let again = replay(&c, &log);
        prop_assert_eq!(again.summary.state_hash, log.summary.state_hash);
    }
}

fn session() -> crucible_core::Session {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content/sessions/parish-90.json");
    crucible_core::Session::from_profile(&serde_json::from_str(&std::fs::read_to_string(dir).unwrap()).unwrap()).unwrap()
}

/// A few input sets a session might produce; `pick` chooses one.
fn inputs(pick: usize) -> Vec<crucible_core::InputRecord> {
    use crucible_core::{Input, InputRecord};
    let rec = |t: i64, seq: u64, input: Input| InputRecord { t, seq, input };
    match pick % 4 {
        0 => vec![],
        1 => vec![
            rec(-4005, 0, Input::Allocate { parish_id: "haven".into(), token: "FUEL".into(), to: "summit".into(), count: 2 }),
            rec(-4005, 1, Input::Allocate { parish_id: "sterling".into(), token: "GEN".into(), to: "keystone".into(), count: 1 }),
            rec(-3300, 0, Input::Decide { parish_id: "haven".into(), dilemma_id: "v3-prep-haven".into(), option_id: "d".into(), rationale: None }),
        ],
        2 => vec![
            rec(-2010, 0, Input::AnswerAid { parish_id: "sterling".into(), call_id: "A1".into(), answer: "part".into(), count: None, reason: None }),
            rec(-1200, 0, Input::Mayday { parish_id: "haven".into(), call_id: "A7".into() }),
            rec(0, 0, Input::DeclareHidden { parish_id: "haven".into() }),
            rec(90, 0, Input::AnswerAid { parish_id: "sterling".into(), call_id: "L7".into(), answer: "grant".into(), count: None, reason: None }),
        ],
        _ => vec![
            rec(-4005, 0, Input::DeclareHidden { parish_id: "sterling".into() }),
            rec(-1800, 0, Input::Decide { parish_id: "sterling".into(), dilemma_id: "v3-approach-sterling".into(), option_id: "a".into(), rationale: None }),
            rec(1500, 0, Input::RepairSend { parish_id: "haven".into(), token: "CREW".into(), to: "summit".into(), count: 1 }),
            rec(1500, 1, Input::CreditLine { parish_id: "sterling".into(), to: "summit".into(), text: "credit".into() }),
        ],
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 8, .. ProptestConfig::default() })]

    #[test]
    fn board_invariants_hold_for_any_seed(seed in any::<u64>(), pick in 0usize..4) {
        let c = content();
        let teams: Vec<crucible_core::Team> = c
            .parish_ids()
            .into_iter()
            .map(|p| crucible_core::Team {
                controller: if p == "haven" || p == "sterling" { "human" } else { "ai" }.into(),
                stated_values: vec!["service".into(), "fairness".into(), "loyalty".into()],
                parish_id: p,
                statement: None,
            })
            .collect();
        let cfg = RunConfig { seed, teams: Some(teams), inputs: inputs(pick), session: session(), ..Default::default() };
        let log = run(&c, &cfg);
        let population: i64 = c.parish_ids().iter().map(|p| c.parish(p).unwrap().population as i64).sum();
        let mut raised: BTreeSet<String> = BTreeSet::new();
        let mut departed: BTreeMap<u64, (i64, Vec<String>)> = BTreeMap::new();
        let mut arrived: Vec<(u64, i64)> = Vec::new();
        for tick in &log.ticks {
            let k = &tick.counters;
            prop_assert!(k.people_safe >= 0 && k.people_safe <= population);
            prop_assert_eq!(k.people_safe, population - k.at_risk - k.injured - k.lost);
            prop_assert!(k.doses_shipped >= 0 && k.vault_doses >= 0 && k.aboard >= 0);
            prop_assert_eq!(tick.state_hash.len(), 64);
            for row in tick.stock.values() {
                for n in row.values() {
                    prop_assert!(*n >= 0);
                }
            }
            for e in &tick.events {
                match e {
                    Event::Mayday { call_id, .. } => {
                        raised.insert(call_id.clone());
                    }
                    Event::AidAnswer { call_id, .. } => prop_assert!(raised.contains(call_id), "{} answered before it was raised", call_id),
                    Event::ConvoyDeparted { convoy_id, route_ids, .. } => {
                        departed.insert(*convoy_id, (tick.t, route_ids.clone()));
                    }
                    Event::ConvoyArrived { convoy_id, .. } => arrived.push((*convoy_id, tick.t)),
                    _ => {}
                }
            }
        }
        // A convoy never arrives over a route that was cut while it was on it.
        for (id, arrive_t) in &arrived {
            let (depart_t, routes) = &departed[id];
            for tick in log.ticks.iter().filter(|t| t.t > *depart_t && t.t < *arrive_t) {
                for r in routes {
                    prop_assert!(!tick.routes_cut.contains(r), "convoy {} crossed {} after it was cut at {}", id, r, tick.t);
                }
            }
        }
        prop_assert_eq!(&log.ticks.last().unwrap().state_hash, &log.summary.state_hash);
        prop_assert_eq!(&log.summary.counters, &log.ticks.last().unwrap().counters);
        let again = replay(&c, &log);
        prop_assert_eq!(again.summary.state_hash, log.summary.state_hash);
    }
}
