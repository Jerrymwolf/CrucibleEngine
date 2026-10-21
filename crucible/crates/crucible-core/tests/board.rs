//! The Board: inputs in (t, seq) order, the session schedule, the allocation
//! round, calls for aid, convoys, residents, the counters, the `until`
//! horizon and the per-tick state hash.

use crucible_core::inputs::{Input, InputRecord, Session};
use crucible_core::log::Event;
use crucible_core::{replay, run, Content, RunConfig, RunLog, Team};
use std::path::PathBuf;

fn dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")
}

fn content() -> Content {
    Content::load(&dir()).expect("content loads")
}

fn session() -> Session {
    let s = std::fs::read_to_string(dir().join("sessions/parish-90.json")).unwrap();
    Session::from_profile(&serde_json::from_str(&s).unwrap()).unwrap()
}

/// Human tables for `human`, drift-model ai for the rest; every table states `values`.
fn teams_with(c: &Content, human: &[&str], values: &[&str]) -> Vec<Team> {
    c.parish_ids()
        .into_iter()
        .map(|p| Team {
            controller: if human.contains(&p.as_str()) { "human" } else { "ai" }.into(),
            stated_values: values.iter().map(|v| v.to_string()).collect(),
            parish_id: p,
            statement: None,
        })
        .collect()
}

fn teams(c: &Content, human: &[&str]) -> Vec<Team> {
    teams_with(c, human, &["service", "fairness", "honesty"])
}

/// Inputs apply at the first tick at or after `t`; ticks are multiples of 15 minutes.
fn at(t: i64, seq: u64, input: Input) -> InputRecord {
    assert_eq!(t % 15, 0, "test inputs sit on tick boundaries so event times are exact");
    InputRecord { t, seq, input }
}

fn cfg_with(teams: Vec<Team>, inputs: Vec<InputRecord>, until: Option<i64>) -> RunConfig {
    RunConfig { seed: 42, teams: Some(teams), inputs, until, session: session(), ..Default::default() }
}

fn cfg(c: &Content, human: &[&str], inputs: Vec<InputRecord>, until: Option<i64>) -> RunConfig {
    cfg_with(teams(c, human), inputs, until)
}

fn events(log: &RunLog) -> impl Iterator<Item = (i64, &Event)> {
    log.ticks.iter().flat_map(|t| t.events.iter().map(move |e| (t.t, e)))
}

fn tick_json(log: &RunLog) -> Vec<String> {
    log.ticks.iter().map(|t| serde_json::to_string(t).unwrap()).collect()
}

#[test]
fn a_session_run_with_inputs_is_byte_identical_and_replays() {
    let c = content();
    let inputs = vec![
        at(
            -4305,
            0,
            Input::LockValues {
                parish_id: "haven".into(),
                values: vec!["candor".into(), "service".into(), "safety".into()],
                statement: Some("Haven keeps its word.".into()),
            },
        ),
        at(-4005, 0, Input::Allocate { parish_id: "haven".into(), token: "FUEL".into(), to: "summit".into(), count: 1 }),
        at(-3300, 0, Input::Decide { parish_id: "haven".into(), dilemma_id: "v3-prep-haven".into(), option_id: "a".into(), rationale: None }),
        at(
            -2010,
            0,
            Input::AnswerAid {
                parish_id: "sterling".into(),
                call_id: "A1".into(),
                answer: "grant".into(),
                count: None,
                reason: Some("They asked once.".into()),
            },
        ),
    ];
    let cfg = cfg(&c, &["haven", "sterling"], inputs, None);
    let a = run(&c, &cfg);
    let b = run(&c, &cfg);
    assert_eq!(a.to_json(), b.to_json());
    assert_eq!(a.teams.iter().find(|t| t.parish_id == "haven").unwrap().stated_values[0], "candor");
    let again = replay(&c, &a);
    assert_eq!(again.summary.state_hash, a.summary.state_hash);
    for (x, y) in a.ticks.iter().zip(&again.ticks) {
        assert_eq!(x.state_hash, y.state_hash, "tick {} diverged on replay", x.t);
    }
    let parsed = RunLog::from_json(&a.to_json()).unwrap();
    assert_eq!(parsed.inputs, a.inputs);
    assert_eq!(replay(&c, &parsed).summary.state_hash, a.summary.state_hash);
}

#[test]
fn every_tick_carries_a_state_hash_and_the_last_one_is_the_summary() {
    let c = content();
    let log = run(&c, &RunConfig { seed: 42, ..Default::default() });
    assert!(log.ticks.iter().all(|t| t.state_hash.len() == 64));
    assert_eq!(log.ticks.last().unwrap().state_hash, log.summary.state_hash);
    assert_ne!(log.ticks[0].state_hash, log.ticks[1].state_hash);
    let other = run(&c, &RunConfig { seed: 43, ..Default::default() });
    assert_ne!(other.ticks.last().unwrap().state_hash, log.ticks.last().unwrap().state_hash);
    assert_eq!(other.ticks[0].state_hash, log.ticks[0].state_hash, "the hash covers state, not weather: T-72 is the same island for every seed");
}

#[test]
fn later_inputs_never_change_the_past() {
    let c = content();
    let early = vec![at(-4005, 0, Input::Allocate { parish_id: "haven".into(), token: "FUEL".into(), to: "summit".into(), count: 1 })];
    let base = run(&c, &cfg(&c, &["haven"], early.clone(), Some(-3000)));
    assert_eq!(base.until, Some(-3000));
    assert_eq!(base.ticks.last().unwrap().t, -3000);
    assert_eq!(base.t_end, 2880, "the nominal end does not move");
    let mut more = early.clone();
    more.push(at(-2010, 0, Input::DeclareHidden { parish_id: "haven".into() }));
    let longer = run(&c, &cfg(&c, &["haven"], more.clone(), Some(-1000)));
    let twin = run(&c, &cfg(&c, &["haven"], more.clone(), Some(-1000)));
    assert_eq!(longer.to_json(), twin.to_json(), "no new inputs: unchanged");
    let (b, l) = (tick_json(&base), tick_json(&longer));
    assert_eq!(b[..], l[..b.len()], "an input at T-33:30 changed a tick before T-50h");
    let full = run(&c, &cfg(&c, &["haven"], more, None));
    assert!(full.until.is_none());
    let f = tick_json(&full);
    assert_eq!(l[..], f[..l.len()]);
    assert!(events(&full)
        .any(|(t, e)| t == -2010 && matches!(e, Event::Allocation { entry, token, count, .. } if entry == "declare_hidden" && token == "FUEL" && *count == 2)));
}

#[test]
fn the_allocation_round_locks_scores_and_delivers() {
    let c = content();
    let inputs = vec![
        at(-4005, 0, Input::Allocate { parish_id: "haven".into(), token: "FUEL".into(), to: "summit".into(), count: 1 }),
        at(-4005, 1, Input::Allocate { parish_id: "haven".into(), token: "GEN".into(), to: "keep".into(), count: 2 }),
        at(-3000, 0, Input::Allocate { parish_id: "haven".into(), token: "BOAT".into(), to: "gateway".into(), count: 1 }),
    ];
    let log = run(&c, &cfg(&c, &["haven", "sterling"], inputs, Some(-2500)));
    let lock_t = session().allocation_lock_t.unwrap();
    // Before the lock nothing moves; at the lock the send rolls and is scored.
    assert!(events(&log).all(|(t, e)| !matches!(e, Event::ConvoyDeparted { .. }) || t >= lock_t));
    let send = events(&log).find(|(_, e)| matches!(e, Event::Allocation { parish_id, entry, token, to, .. } if parish_id == "haven" && entry == "send" && token == "FUEL" && to == "summit"));
    let (t, Event::Allocation { values_signaled, .. }) = send.expect("the send is scored") else { unreachable!() };
    assert_eq!(t, lock_t);
    // Summit needs FUEL in approach and Haven never does; Summit's need is the island's greatest.
    // The fuel costs Haven nothing it needs, so the send reads Striving at most, one signal per value.
    assert_eq!(values_signaled.get("service"), Some(&1));
    assert_eq!(values_signaled.get("fairness"), Some(&1));
    assert_eq!(values_signaled.get("compassion"), Some(&1));
    assert!(events(&log).any(|(t, e)| t == lock_t && matches!(e, Event::Allocation { parish_id, entry, .. } if parish_id == "haven" && entry == "keep")));
    assert!(events(&log).any(|(t, e)| t == lock_t && matches!(e, Event::Allocation { parish_id, entry, values_signaled, .. } if parish_id == "sterling" && entry == "keep_everything" && values_signaled.is_empty())));
    // Entering nothing is the clock deciding: recorded as a storm moment, not rated.
    assert!(log.summary.values_gap.iter().filter(|r| r.parish_id == "sterling").all(|r| r.evidence.iter().all(|e| e.dilemma_id != "allocate:keep" || e.decided_by.as_deref() == Some("storm"))));
    assert!(
        events(&log).any(|(t, e)| t == -3000 && matches!(e, Event::Rejected { source, reason, .. } if source == "input:allocate" && reason.contains("locked")))
    );
    // The convoy arrives and the token joins Summit's sheet.
    let arrived = events(&log)
        .find(|(_, e)| matches!(e, Event::ConvoyArrived { to, token, purpose, .. } if to == "summit" && token == "FUEL" && purpose == "allocation"));
    let (arrive_t, _) = arrived.expect("the fuel arrives");
    let idx = log.ticks.iter().position(|t| t.t == arrive_t).unwrap();
    let fuel = |i: usize| log.ticks[i].stock["summit"].get("FUEL").copied().unwrap_or(0);
    assert_eq!(fuel(idx), fuel(idx - 1) + 1);
    assert_eq!(log.ticks[idx].stock["haven"]["FUEL"], 3);
    // The values gap carries the allocation as evidence of its kind.
    let row = log.summary.values_gap.iter().find(|r| r.parish_id == "haven" && r.value == "service").unwrap();
    assert!(row.evidence.iter().any(|e| e.kind == "allocation" && e.dilemma_id == "allocate:FUEL" && e.option_id == "send:summit" && e.signal == 1));
    assert!(log.summary.values_gap.iter().any(|r| r.parish_id == "sterling" && r.evidence.iter().any(|e| e.option_id == "keep_everything")));
}

#[test]
fn a_call_for_aid_is_granted_refused_or_answered_by_silence() {
    let c = content();
    // Sterling grants A1 (LIFT x2 by helicopter to Summit); Summit refuses A5; Heartland lets A6 expire.
    let inputs = vec![
        at(
            -2010,
            0,
            Input::AnswerAid {
                parish_id: "sterling".into(),
                call_id: "A1".into(),
                answer: "grant".into(),
                count: None,
                reason: Some("They asked once.".into()),
            },
        ),
        at(-2010, 1, Input::AnswerAid { parish_id: "haven".into(), call_id: "A1".into(), answer: "grant".into(), count: None, reason: None }),
        at(-1605, 0, Input::AnswerAid { parish_id: "summit".into(), call_id: "A5".into(), answer: "refuse".into(), count: None, reason: None }),
    ];
    let log = run(&c, &cfg(&c, &["sterling", "summit", "heartland"], inputs, Some(-900)));
    assert!(events(&log).any(|(t, e)| t == -2130 && matches!(e, Event::Mayday { call_id, raised_by, .. } if call_id == "A1" && raised_by == "schedule")));
    let grant = events(&log).find(|(_, e)| matches!(e, Event::AidAnswer { call_id, .. } if call_id == "A1")).map(|(t, e)| (t, e.clone())).unwrap();
    let (t, Event::AidAnswer { controller, answer, count, delivered, rationale, values_signaled, .. }) = grant else { unreachable!() };
    assert_eq!((t, controller.as_str(), answer.as_str(), count, delivered), (-2010, "human", "grant", 2, None));
    assert_eq!(rationale.as_deref(), Some("They asked once."));
    assert_eq!(values_signaled.get("service"), Some(&2));
    assert!(events(&log).any(|(t, e)| t == -2010 && matches!(e, Event::ConvoyDeparted { purpose, route_ids, token, .. } if purpose == "aid:A1" && route_ids == &["heli-summit-mainland"] && token == "LIFT")));
    assert!(
        events(&log).any(|(t, e)| t == -2010 && matches!(e, Event::Rejected { source, parish_id, .. } if source == "input:answer_aid" && parish_id == "haven"))
    );
    let (arrive_t, _) = events(&log)
        .find(|(_, e)| matches!(e, Event::ConvoyArrived { purpose, to, .. } if purpose == "aid:A1" && to == "summit"))
        .expect("the aircraft arrive");
    assert!(events(&log).any(|(t, e)| t == arrive_t && matches!(e, Event::ResidentState { group_id: Some(g), state, count, source, .. } if g == "icu-patients" && state == "sheltered" && *count == 6 && source == "A1:grant")));
    assert!(log.summary.flags.contains(&"icu-evacuated".to_string()));
    assert_eq!(log.ticks.iter().find(|t| t.t == arrive_t).unwrap().stock["summit"]["LIFT"], 2);
    // A refusal moves nothing.
    assert!(events(&log).any(|(t, e)| t == -1605 && matches!(e, Event::AidAnswer { call_id, answer, count, controller, .. } if call_id == "A5" && answer == "refuse" && *count == 0 && controller == "human")));
    assert!(!events(&log).any(|(_, e)| matches!(e, Event::ConvoyDeparted { purpose, .. } if purpose == "aid:A5")));
    // Silence answers at the deadline with the call's silence answer, unrated: the storm decided.
    let (deadline, _) =
        events(&log).find(|(_, e)| matches!(e, Event::AidExpired { call_id, holder, .. } if call_id == "A6" && holder == "heartland")).expect("A6 expires");
    assert!(events(&log).any(|(t, e)| t == deadline && matches!(e, Event::AidAnswer { call_id, answer, controller, values_signaled, .. } if call_id == "A6" && answer == "refuse" && controller == "silence" && values_signaled.is_empty())));
    assert!(log.summary.values_gap.iter().any(
        |r| r.parish_id == "heartland" && r.evidence.iter().any(|e| e.kind == "aid" && e.dilemma_id == "A6" && e.decided_by.as_deref() == Some("storm") && e.signal == 0)
    ));
    // Every answer follows its mayday.
    let mut raised = std::collections::BTreeSet::new();
    for (_, e) in events(&log) {
        match e {
            Event::Mayday { call_id, .. } => {
                raised.insert(call_id.clone());
            }
            Event::AidAnswer { call_id, .. } => assert!(raised.contains(call_id), "{call_id} answered before it was raised"),
            _ => {}
        }
    }
}

#[test]
fn the_storm_decides_at_the_deadline_with_the_cards_default_option() {
    let c = content();
    let d = c.dilemma("v3-prep-gateway").unwrap();
    let default = d.default_option().id.clone();
    assert_ne!(default, d.options[0].id, "the test needs a card whose default is not the first option");
    let tested: Vec<String> = d.default_option().value_alignment.keys().map(|k| crucible_core::values::canonical(&c, k)).collect();
    let tested: Vec<&str> = tested.iter().map(String::as_str).collect();
    let log = run(&c, &cfg_with(teams_with(&c, &["gateway"], &tested), vec![], Some(-2500)));
    let presented = events(&log)
        .find(|(_, e)| matches!(e, Event::DilemmaPresented { dilemma_id, .. } if dilemma_id == "v3-prep-gateway"))
        .map(|(t, e)| (t, e.clone()))
        .unwrap();
    let (present_t, Event::DilemmaPresented { deadline_t, .. }) = presented else { unreachable!() };
    assert_eq!(present_t, -3090);
    assert_eq!(deadline_t, -3090 + 39 * 15);
    let decided =
        events(&log).find(|(_, e)| matches!(e, Event::Decision { dilemma_id, .. } if dilemma_id == "v3-prep-gateway")).map(|(t, e)| (t, e.clone())).unwrap();
    let (t, Event::Decision { option_id, controller, expired, decided_by, .. }) = decided else { unreachable!() };
    assert_eq!((t, option_id, controller.as_str(), expired, decided_by.as_deref()), (deadline_t, default.clone(), "human", Some(true), Some("storm")));
    assert!(log
        .summary
        .values_gap
        .iter()
        .any(|r| r.parish_id == "gateway" && r.evidence.iter().any(|e| e.dilemma_id == "v3-prep-gateway" && e.decided_by.as_deref() == Some("storm"))));
    // A table that raises its card in time decides for itself; a late card is refused.
    let inputs = vec![
        at(
            -3000,
            0,
            Input::Decide {
                parish_id: "gateway".into(),
                dilemma_id: "v3-prep-gateway".into(),
                option_id: "a".into(),
                rationale: Some("We talked it through.".into()),
            },
        ),
        at(-2700, 0, Input::Decide { parish_id: "gateway".into(), dilemma_id: "v3-prep-gateway".into(), option_id: "b".into(), rationale: None }),
    ];
    let log = run(&c, &cfg_with(teams_with(&c, &["gateway"], &tested), inputs, Some(-2500)));
    assert!(events(&log).any(|(t, e)| t == -3000 && matches!(e, Event::Decision { dilemma_id, option_id, controller, decided_by, rationale, .. } if dilemma_id == "v3-prep-gateway" && option_id == "a" && controller == "human" && decided_by.is_none() && rationale == "We talked it through.")));
    assert!(events(&log)
        .any(|(t, e)| t == -2700 && matches!(e, Event::Rejected { source, reason, .. } if source == "input:decide" && reason.contains("already decided"))));
    assert!(replay(&c, &log).summary.state_hash == log.summary.state_hash);
}

#[test]
fn an_eye_window_delivery_that_misses_the_eye_turns_back_and_the_token_returns() {
    let c = content();
    // Gateway raises L8 in the eye; Summit grants late enough that the ring is cut under the convoy.
    let inputs = vec![
        at(0, 0, Input::Mayday { parish_id: "gateway".into(), call_id: "L8".into() }),
        at(90, 0, Input::AnswerAid { parish_id: "summit".into(), call_id: "L8".into(), answer: "grant".into(), count: None, reason: None }),
    ];
    let log = run(&c, &cfg(&c, &["gateway", "summit"], inputs, Some(400)));
    assert!(events(&log).any(|(t, e)| t == 0 && matches!(e, Event::Mayday { call_id, raised_by, .. } if call_id == "L8" && raised_by == "input")));
    assert!(
        events(&log)
            .any(|(t, e)| t == 90
                && matches!(e, Event::ConvoyDeparted { purpose, route_ids, .. } if purpose == "aid:L8" && route_ids == &["ring-gateway-summit"]))
    );
    let before = log.ticks.iter().find(|t| t.t == 90).unwrap().stock["summit"].get("MEDIC").copied().unwrap_or(0);
    assert!(events(&log)
        .any(|(t, e)| t == 120 && matches!(e, Event::ConvoyTurnedBack { route_id, return_t, .. } if route_id == "ring-gateway-summit" && *return_t == 360)));
    assert!(!events(&log).any(|(_, e)| matches!(e, Event::ConvoyArrived { purpose, .. } if purpose == "aid:L8")));
    assert!(events(&log)
        .any(|(t, e)| t == 360 && matches!(e, Event::TokenReturned { parish_id, token, count } if parish_id == "summit" && token == "MEDIC" && *count == 1)));
    let after = log.ticks.iter().find(|t| t.t == 360).unwrap().stock["summit"].get("MEDIC").copied().unwrap_or(0);
    assert_eq!(after, before + 1, "lost for the quarter, back on the sheet at its end");
    // The answer still scores as a grant.
    assert!(log
        .summary
        .values_gap
        .iter()
        .any(|r| r.parish_id == "summit" && r.evidence.iter().any(|e| e.kind == "aid" && e.dilemma_id == "L8" && e.option_id == "grant")));
}

#[test]
fn recovery_repair_sends_and_credit_lines_are_scored() {
    let c = content();
    let inputs = vec![
        at(1500, 0, Input::RepairSend { parish_id: "haven".into(), token: "CREW".into(), to: "summit".into(), count: 1 }),
        at(1500, 1, Input::CreditLine { parish_id: "haven".into(), to: "sterling".into(), text: "Sterling's garages kept our pumps running.".into() }),
        at(1500, 2, Input::CreditLine { parish_id: "haven".into(), to: "haven".into(), text: "ourselves".into() }),
    ];
    let log = run(&c, &cfg_with(teams_with(&c, &["haven"], &["service", "recognition", "honesty"]), inputs, None));
    assert!(events(&log)
        .any(|(t, e)| t == 1500 && matches!(e, Event::ConvoyDeparted { purpose, token, to, .. } if purpose == "repair" && token == "CREW" && to == "summit")));
    assert!(events(&log).any(|(t, e)| t == 1500
        && matches!(e, Event::Allocation { entry, values_signaled, .. } if entry == "repair_send" && values_signaled.get("service") == Some(&1))));
    assert!(events(&log)
        .any(|(t, e)| t == 1500
            && matches!(e, Event::CreditLine { to, values_signaled, .. } if to == "sterling" && values_signaled.get("recognition") == Some(&1))));
    assert!(events(&log).any(|(t, e)| t == 1500 && matches!(e, Event::Rejected { source, .. } if source == "input:credit_line")));
    assert!(events(&log).any(|(_, e)| matches!(e, Event::ConvoyArrived { purpose, to, .. } if purpose == "repair" && to == "summit")));
    let kinds: Vec<&str> = log.summary.values_gap.iter().filter(|r| r.parish_id == "haven").flat_map(|r| r.evidence.iter().map(|e| e.kind.as_str())).collect();
    assert!(kinds.contains(&"repair") && kinds.contains(&"credit"));
    assert_eq!(replay(&c, &log).summary.state_hash, log.summary.state_hash);
}

#[test]
fn the_counters_follow_the_residents_and_the_doses() {
    let c = content();
    let log = run(&c, &RunConfig { seed: 42, session: session(), ..Default::default() });
    let population: i64 = c.parish_ids().iter().map(|p| c.parish(p).unwrap().population as i64).sum();
    assert_eq!(log.ticks[0].counters.people_safe, population);
    assert_eq!(log.ticks[0].counters.doses_shipped, 0);
    for t in &log.ticks {
        let k = &t.counters;
        assert!(k.people_safe >= 0 && k.people_safe <= population);
        assert_eq!(k.people_safe, population - k.at_risk - k.injured - k.lost);
        assert!(k.doses_shipped >= 0 && k.vault_doses >= 0 && k.aboard >= 0);
    }
    let shipped: Vec<i64> = log.ticks.iter().map(|t| t.counters.doses_shipped).collect();
    assert!(shipped.windows(2).all(|w| w[1] >= w[0]), "doses shipped never falls");
    assert!(events(&log).any(|(_, e)| matches!(e, Event::ShipSailed { .. })));
    assert!(log.ticks.iter().any(|t| t.counters.people_safe < population), "the storm puts someone at risk");
    assert_eq!(log.summary.counters, log.ticks.last().unwrap().counters);
    assert_eq!(log.summary.residents.people_safe, log.summary.counters.people_safe);
    // Cards and groups: sizes are conserved.
    for g in c.residents.groups.iter() {
        let s = &log.summary.residents.groups[&g.id];
        assert_eq!(s.safe + s.sheltered + s.at_risk + s.rescued + s.injured + s.lost, g.size, "group {}", g.id);
    }
    assert_eq!(log.summary.residents.cards.len(), c.residents.cards.len());
}

#[test]
fn the_facilitator_can_swap_a_scheduled_card() {
    let c = content();
    let inputs = vec![at(-4200, 0, Input::SwapDilemma { parish_id: "gateway".into(), from: "v3-prep-gateway".into(), to: "watch-gateway-01".into() })];
    let log = run(&c, &cfg(&c, &["gateway"], inputs, Some(-2500)));
    let presented: Vec<&str> = events(&log)
        .filter_map(|(_, e)| match e {
            Event::DilemmaPresented { parish_id, dilemma_id, .. } if parish_id == "gateway" => Some(dilemma_id.as_str()),
            _ => None,
        })
        .collect();
    assert_eq!(presented, vec!["watch-gateway-01"]);
    assert!(log.pending.is_empty() || log.pending.iter().all(|p| p.dilemma_id != "v3-prep-gateway"));
    assert_eq!(replay(&c, &log).summary.state_hash, log.summary.state_hash);
}

/// Audit fix (decision-2026-10-21-audit-fix-spec, S1.2, S1.6, S3.4): a room
/// that never answers earns no rating on any value, and the island pays for
/// its silence in people lost and hours at risk.
#[test]
fn a_silent_room_is_never_rated_and_pays_for_its_silence() {
    let c = content();
    let all = ["gateway", "heartland", "keystone", "haven", "summit", "sterling"];
    let silent = run(&c, &cfg(&c, &all, vec![], None));
    for row in &silent.summary.values_gap {
        assert!(row.evidence.iter().all(|e| e.decided_by.as_deref() == Some("storm") && e.signal == 0), "{} {} rated in silence", row.parish_id, row.value);
        assert!(!row.tested);
    }
    assert!(silent.summary.values_gap.iter().any(|r| r.n_storm > 0), "storm moments are listed");
    let deciding = run(&c, &RunConfig { seed: 42, session: session(), ..Default::default() });
    let (s, d) = (&silent.summary.counters, &deciding.summary.counters);
    assert!(s.lost > d.lost, "silent lost {} vs deciding {}", s.lost, d.lost);
    assert!(s.lowest_people_safe < d.lowest_people_safe);
    assert!(s.people_hours_at_risk > d.people_hours_at_risk);
    assert!(s.lowest_people_safe <= s.people_safe);
}

/// Audit fix S1.3: many cost-free moves in one moment are one piece of evidence.
#[test]
fn thirty_credit_lines_are_one_moment() {
    let c = content();
    let inputs: Vec<InputRecord> = (0..30)
        .map(|i| at(1500, i, Input::CreditLine { parish_id: "haven".into(), to: "sterling".into(), text: format!("Thanks {i}") }))
        .collect();
    let log = run(&c, &cfg_with(teams_with(&c, &["haven"], &["recognition", "respect", "honesty"]), inputs, None));
    let row = log.summary.values_gap.iter().find(|r| r.parish_id == "haven" && r.value == "recognition").unwrap();
    assert_eq!(row.evidence.iter().filter(|e| e.kind == "credit").count(), 1);
    assert!(row.evidence.iter().all(|e| e.signal <= 1), "a cost-free move never rates above +1");
}

#[test]
fn giving_way_earns_nothing_on_the_value_the_actor_invokes() {
    let mut c = content();
    c.validate().expect("shipped content validates");
    let d = c.dilemmas.all_dilemmas.iter_mut().find(|d| d.id == "v3-prep-sterling").unwrap();
    let o = d.options.iter_mut().find(|o| o.pressure.is_some() && o.pressure.as_ref().unwrap().form != "situational").unwrap();
    let v = o.pressure.as_ref().unwrap().invokes[0].clone();
    o.value_alignment.insert(v.clone(), 2);
    let err = format!("{:?}", c.validate().expect_err("a +2 on the invoked value is refused"));
    assert!(err.contains(&format!("reads {v} above 0")), "{err}");
}
