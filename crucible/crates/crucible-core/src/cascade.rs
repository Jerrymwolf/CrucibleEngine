//! CASCADE_RULES: when a trigger system in a parish is at or below the rule's
//! threshold, every effect is scheduled with its delay. Each rule fires at
//! most once per run.

use crate::content::Content;
use crate::state::{Scheduled, ScheduledSource, SimState};

/// Evaluates every unfired rule against the current state and schedules the
/// effects of those that trigger. Returns the ids of rules fired this tick.
pub fn evaluate(content: &Content, state: &mut SimState) -> Vec<String> {
    let mut fired = Vec::new();
    for rule in &content.infrastructure.cascade_rules {
        if state.fired_rules.contains(&rule.id) {
            continue;
        }
        let parish = rule.trigger.parish_id.to_lowercase();
        if state.level(&parish, &rule.trigger.system) > rule.trigger.threshold {
            continue;
        }
        state.fired_rules.insert(rule.id.clone());
        fired.push(rule.id.clone());
        for e in &rule.effects {
            state.schedule(Scheduled {
                due_t: state.t + e.delay_minutes,
                seq: 0,
                parish_id: e.parish_id.to_lowercase(),
                system: e.system.clone(),
                delta: -e.degradation,
                source: ScheduledSource::Cascade { rule_id: rule.id.clone() },
                narrative: rule.narrative.clone(),
                delay_minutes: e.delay_minutes,
            });
        }
    }
    fired
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rng::SimRng;
    use std::path::PathBuf;

    #[test]
    fn a_rule_fires_at_most_once() {
        let c = Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap();
        let mut rng = SimRng::new(1);
        let mut state = crate::sim::test_state(&c, &mut rng);
        // Drive the dam below every power threshold.
        state.apply("heartland", "power", -100.0);
        let first = evaluate(&c, &mut state);
        assert!(first.contains(&"heartland-dam-failure".to_string()));
        assert!(first.contains(&"heartland-dam-keystone-power".to_string()));
        let second = evaluate(&c, &mut state);
        assert!(second.is_empty());
        let scheduled: usize = c.infrastructure.cascade_rules.iter().filter(|r| first.contains(&r.id)).map(|r| r.effects.len()).sum();
        assert_eq!(state.scheduled.len(), scheduled);
    }
}
