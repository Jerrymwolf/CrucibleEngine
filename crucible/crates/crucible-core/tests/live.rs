//! Live mode: a run halts at each human dilemma, and feeding the decision
//! back in continues it exactly as if it had been scripted from the start.

use crucible_core::log::Event;
use crucible_core::{replay, run, Content, RunConfig, ScriptedDecision, Team};
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;

fn content() -> Content {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content");
    Content::load(&dir).expect("content loads")
}

/// Two human tables, the rest drift-model ai.
fn teams(c: &Content) -> Vec<Team> {
    c.parish_ids()
        .into_iter()
        .map(|p| {
            let human = p == "sterling" || p == "haven";
            Team {
                controller: if human { "human" } else { "ai" }.into(),
                stated_values: vec!["safety".into(), "honesty".into(), "fairness".into()],
                parish_id: p,
                statement: None,
            }
        })
        .collect()
}

/// Plays a whole session in live mode, always picking the last option.
/// Returns the final log and every halted log on the way.
fn play(c: &Content, seed: u64) -> (crucible_core::RunLog, Vec<crucible_core::RunLog>) {
    play_asking(c, seed, None)
}

fn play_asking(c: &Content, seed: u64, ask: Option<BTreeSet<String>>) -> (crucible_core::RunLog, Vec<crucible_core::RunLog>) {
    let mut decisions: BTreeMap<String, ScriptedDecision> = BTreeMap::new();
    let mut halts = vec![];
    loop {
        let log = run(c, &RunConfig { seed, teams: Some(teams(c)), decisions: decisions.clone(), live: true, ask: ask.clone(), ..Default::default() });
        if log.pending.is_empty() {
            return (log, halts);
        }
        for p in &log.pending {
            let option_id = p.options.last().unwrap().id.clone();
            decisions.insert(p.dilemma_id.clone(), ScriptedDecision { option_id, rationale: Some("table decision".into()), t: Some(p.t) });
        }
        halts.push(log);
        assert!(halts.len() < 200, "live session never finished");
    }
}

#[test]
fn live_session_halts_then_completes() {
    let c = content();
    let (fin, halts) = play(&c, 42);
    assert!(!halts.is_empty(), "human tables should be asked at least once");
    for h in &halts {
        assert!(h.pending.iter().all(|p| p.parish_id == "sterling" || p.parish_id == "haven"));
        assert!(h.pending.iter().all(|p| p.t == h.pending[0].t), "one halt is one tick");
    }
    let human: Vec<_> = fin.ticks.iter().flat_map(|t| &t.events).filter(|e| matches!(e, Event::Decision { controller, .. } if controller == "human")).collect();
    let asked: usize = halts.iter().map(|h| h.pending.len()).sum();
    assert_eq!(human.len(), asked, "every pending dilemma was decided by the table");
}

#[test]
fn halted_runs_are_exact_prefixes() {
    let c = content();
    let (fin, halts) = play(&c, 7);
    let full = fin.to_json_value_ticks();
    for h in &halts {
        let part = h.to_json_value_ticks();
        assert_eq!(part[..], full[..part.len()], "halt at {} diverged from the finished run", h.pending[0].t);
    }
}

#[test]
fn finished_live_session_replays() {
    let c = content();
    let (fin, _) = play(&c, 42);
    assert_eq!(replay(&c, &fin).summary.state_hash, fin.summary.state_hash);
}

#[test]
fn a_session_profile_asks_only_its_dilemmas() {
    let c = content();
    let ask: BTreeSet<String> = ["watch-sterling-02", "crisis-sterling-02", "crisis-haven-01"].iter().map(|s| s.to_string()).collect();
    let (fin, halts) = play_asking(&c, 42, Some(ask.clone()));
    let asked: Vec<&str> = halts.iter().flat_map(|h| h.pending.iter().map(|p| p.dilemma_id.as_str())).collect();
    assert!(!asked.is_empty() && asked.iter().all(|d| ask.contains(*d)), "asked {asked:?}");
    let by_table: Vec<_> = fin
        .ticks
        .iter()
        .flat_map(|t| &t.events)
        .filter_map(|e| match e {
            Event::Decision { parish_id, controller, dilemma_id, .. } if parish_id == "sterling" || parish_id == "haven" => {
                Some((dilemma_id.clone(), controller.clone()))
            }
            _ => None,
        })
        .collect();
    assert!(by_table.iter().any(|(_, ctl)| ctl == "ai"), "unasked dilemmas fall to the drift model");
    assert!(by_table.iter().all(|(d, ctl)| (ctl == "human") == ask.contains(d)));
    assert_eq!(replay(&c, &fin).summary.state_hash, fin.summary.state_hash);
}

trait TickJson {
    fn to_json_value_ticks(&self) -> Vec<String>;
}

impl TickJson for crucible_core::RunLog {
    fn to_json_value_ticks(&self) -> Vec<String> {
        self.ticks.iter().map(|t| serde_json::to_string(t).unwrap()).collect()
    }
}
