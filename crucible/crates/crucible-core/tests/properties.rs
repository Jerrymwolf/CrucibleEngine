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
