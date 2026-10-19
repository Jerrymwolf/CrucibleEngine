//! The tick loop. Order per tick: window and weather, degradation,
//! connectivity, cascades, scheduled effects, dilemmas, decisions,
//! consequences, snapshot.

use crate::cascade;
use crate::connectivity;
use crate::content::Content;
use crate::controller::{self, ScriptedDecision};
use crate::dilemma;
use crate::morale;
use crate::log::{clock, state_hash, Event, HashedState, MapPoint, ParishMeta, ParishOutcome, RunLog, Summary, Tick, WindowMeta};
use crate::rng::SimRng;
use crate::state::{DecisionRecord, Scheduled, ScheduledSource, SimState};
use crate::values::{self, option_signals};
use crate::weather::{self, degradation_key, log_phase, window_t};
use crate::{STEP_MINUTES, SYSTEMS};
use std::collections::{BTreeMap, BTreeSet};

/// Simulation minutes of play after the final timeline window begins (24 h).
pub const RECOVERY_PLAY_MINUTES: i64 = 24 * 60;

pub use crate::log::Team;

/// Inputs beyond the content: seed, teams, scripted decisions and intensity.
#[derive(Debug, Clone, Default)]
pub struct RunConfig {
    pub seed: u64,
    /// None: default ai teams with seeded stated values.
    pub teams: Option<Vec<Team>>,
    pub decisions: BTreeMap<String, ScriptedDecision>,
    /// (t, intensity) points; a step function. Empty: the default curve.
    pub intensity: Vec<(i64, i64)>,
}

fn scripted_intensity(curve: &[(i64, i64)], t: i64) -> Option<i64> {
    curve.iter().filter(|(pt, _)| *pt <= t).max_by_key(|(pt, _)| *pt).map(|(_, i)| (*i).clamp(1, 10))
}

/// Vulnerability multiplier: each parish vulnerability whose text names the
/// system adds 25%, capped at +50%.
fn vulnerability_mult(content: &Content, parish: &str, system: &str) -> f64 {
    let needles: &[&str] = match system {
        "power" => &["power", "dam"],
        "communications" => &["communic", "tower", "blackout"],
        "roads" => &["road", "flood", "isolat"],
        "water" => &["water", "flood"],
        "hospital" => &["hospital", "medical"],
        "port" => &["port", "surge", "vessel"],
        "airport" => &["runway", "wind", "airport"],
        _ => &[],
    };
    let hits = content
        .parish(parish)
        .map(|p| p.vulnerabilities.iter().filter(|v| needles.iter().any(|n| v.to_lowercase().contains(n))).count())
        .unwrap_or(0);
    1.0 + 0.25 * hits.min(2) as f64
}

fn cause(system: &str, w: &weather::Weather, repairing: bool) -> &'static str {
    if repairing {
        return "repair crews";
    }
    match system {
        "port" | "airport" if w.surge_ft >= 3.0 => "storm surge",
        "roads" | "water" if w.rain_in_per_hour >= 1.5 => "flooding",
        "hospital" => "demand surge",
        _ => "wind damage",
    }
}

fn init_state(content: &Content, rng: &mut SimRng, t_start: i64) -> SimState {
    let (track_strength, track_shift) = weather::draw_track(rng);
    let mut infra = BTreeMap::new();
    let mut morale = BTreeMap::new();
    let mut morale_pressure = BTreeMap::new();
    let mut generator_hours = BTreeMap::new();
    for p in content.parish_ids() {
        let init = content.infrastructure.initial_infrastructure_status.get(&p);
        let row: BTreeMap<String, f64> =
            SYSTEMS.iter().map(|s| (s.to_string(), init.and_then(|m| m.get(*s)).copied().unwrap_or(0.0))).collect();
        infra.insert(p.clone(), row);
        morale.insert(p.clone(), 80.0);
        morale_pressure.insert(p.clone(), morale::initial_pressure(80.0));
        generator_hours.insert(p.clone(), connectivity::backup_hours(content, &p));
    }
    SimState {
        t: t_start,
        window_idx: 0,
        intensity: 3,
        infra,
        morale,
        morale_pressure,
        isolated: BTreeSet::new(),
        // Every parish starts connected to every utility; the first tick's
        // flood fill only reports real losses.
        connected: ["power", "water", "communications"].iter().map(|s| (s.to_string(), content.parish_ids().into_iter().collect())).collect(),
        generator_hours,
        fired_rules: BTreeSet::new(),
        scheduled: vec![],
        next_seq: 0,
        open: BTreeMap::new(),
        used_dilemmas: BTreeSet::new(),
        decided_dilemmas: BTreeSet::new(),
        last_dilemma_t: BTreeMap::new(),
        decisions: vec![],
        pending_degradation: BTreeMap::new(),
        isolated_ticks: BTreeMap::new(),
        min_power: BTreeMap::new(),
        track_strength,
        track_shift,
    }
}

/// Fresh state at T-72 for unit tests in sibling modules.
#[doc(hidden)]
pub fn test_state(content: &Content, rng: &mut SimRng) -> SimState {
    let t_start = window_t(&content.timeline.hurricane_midas.windows[0]);
    init_state(content, rng, t_start)
}

fn degrade(content: &Content, state: &mut SimState, key: &str, w: &weather::Weather, events: &mut Vec<Event>) {
    let rates = content.infrastructure.degradation_rates.get(key).cloned().unwrap_or_default();
    let intensity_mult = 0.5 + state.intensity as f64 / 10.0;
    let sev = weather::severity(w.wind_mph);
    for p in content.parish_ids() {
        for s in SYSTEMS {
            let initial = content.infrastructure.initial_infrastructure_status.get(&p).and_then(|m| m.get(s)).copied().unwrap_or(0.0);
            if initial <= 0.0 {
                continue; // absent system
            }
            let rate = rates.get(s).copied().unwrap_or(0.0);
            let per_hour = if rate >= 0.0 { rate * sev * intensity_mult * vulnerability_mult(content, &p, s) } else { rate };
            let delta = -per_hour * STEP_MINUTES as f64 / 60.0;
            if delta == 0.0 {
                continue;
            }
            let applied = state.apply(&p, s, delta) as f64;
            let k = format!("{p}/{s}");
            let pending = state.pending_degradation.entry(k).or_insert(0.0);
            *pending += applied;
            if pending.abs() >= 5.0 {
                events.push(Event::Degradation { parish_id: p.clone(), system: s.to_string(), delta: *pending as i64, cause: cause(s, w, rate < 0.0).into() });
                *pending = 0.0;
            }
        }
    }
}

/// Derived numeric consequences (the content only carries narrative
/// sketches): `care` is the sum of the option's signals on other-regarding
/// values. Immediate: own morale += 2*care. Ripple (+60): morale of every
/// parish this one provides to += care. Delayed (+240): own weakest live
/// system += 3*care.
fn apply_consequences(content: &Content, state: &mut SimState, parish: &str, dilemma_id: &str, option: &crate::content::DilemmaOption, events: &mut Vec<Event>) {
    let sig = option_signals(content, option);
    let care: f64 = sig.iter().filter(|(k, _)| controller::is_costly(k)).map(|(_, v)| *v as f64).sum();
    let sketch = &option.consequence_sketch;
    let delta = state.apply(parish, "morale", (2.0 * care).clamp(-10.0, 10.0));
    events.push(Event::Consequence { dilemma_id: dilemma_id.into(), parish_id: parish.into(), system: "morale".into(), delta, delay_minutes: 0, narrative: sketch.immediate.clone() });
    let provides: Vec<String> = content
        .concordia
        .parish_dependencies
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case(parish))
        .map(|(_, d)| d.provides_to.iter().map(|x| x.to_lowercase()).collect())
        .unwrap_or_default();
    for other in provides {
        state.schedule(Scheduled { due_t: state.t + 60, seq: 0, parish_id: other, system: "morale".into(), delta: care.clamp(-5.0, 5.0), source: ScheduledSource::Consequence { dilemma_id: dilemma_id.into() }, narrative: sketch.ripple.clone(), delay_minutes: 60 });
    }
    let weakest = ["power", "communications", "water", "roads", "hospital"]
        .iter()
        .filter(|s| state.level(parish, s) > 0.0)
        .min_by(|a, b| state.level(parish, a).partial_cmp(&state.level(parish, b)).unwrap_or(std::cmp::Ordering::Equal))
        .map(|s| s.to_string());
    if let Some(sys) = weakest {
        state.schedule(Scheduled { due_t: state.t + 240, seq: 0, parish_id: parish.into(), system: sys, delta: (3.0 * care).clamp(-15.0, 9.0), source: ScheduledSource::Consequence { dilemma_id: dilemma_id.into() }, narrative: sketch.delayed.clone(), delay_minutes: 240 });
    }
}

fn decide_all(content: &Content, state: &mut SimState, rng: &mut SimRng, teams: &[Team], cfg: &RunConfig, events: &mut Vec<Event>) {
    let open: Vec<(String, crate::state::OpenDilemma)> = state.open.iter().map(|(p, o)| (p.clone(), o.clone())).collect();
    for (parish, od) in open {
        let team = teams.iter().find(|t| t.parish_id == parish);
        let (ctrl, stated): (&str, &[String]) = team.map(|t| (t.controller.as_str(), t.stated_values.as_slice())).unwrap_or(("ai", &[]));
        let team_input = controller::TeamInput { controller: ctrl, stated, scripted: &cfg.decisions };
        let Some(choice) = controller::decide(content, state, rng, &parish, &team_input, &od) else { continue };
        let Some(d) = content.dilemmas.all_dilemmas.iter().find(|d| d.id == od.dilemma_id) else { continue };
        let Some(option) = d.options.iter().find(|o| o.id == choice.option_id) else { continue };
        let signals = option_signals(content, option);
        state.open.remove(&parish);
        state.decided_dilemmas.insert(d.id.clone());
        state.decisions.push(DecisionRecord { t: state.t, parish_id: parish.clone(), dilemma_id: d.id.clone(), option_id: option.id.clone(), controller: choice.controller.clone(), values_signaled: signals.clone() });
        events.push(Event::Decision {
            dilemma_id: d.id.clone(),
            parish_id: parish.clone(),
            option_id: option.id.clone(),
            option_label: option.label.clone(),
            rationale: choice.rationale.clone(),
            controller: choice.controller.clone(),
            values_signaled: signals.clone(),
            expired: if choice.expired { Some(true) } else { None },
            pressure: Some((choice.pressure * 1000.0).round() / 1000.0),
        });
        apply_consequences(content, state, &parish, &d.id, option, events);
        morale::add_leadership(state, &parish, &signals);
    }
}

fn default_teams(content: &Content, rng: &mut SimRng) -> Vec<Team> {
    content.parish_ids().into_iter().map(|p| Team { stated_values: values::default_stated_values(content, &p, rng), parish_id: p, controller: "ai".into() }).collect()
}

/// Runs a full simulation and returns the run log.
pub fn run(content: &Content, cfg: &RunConfig) -> RunLog {
    let windows = &content.timeline.hurricane_midas.windows;
    let t_start = window_t(&windows[0]);
    // The run continues one day past the start of the final (recovery) window so that
    // recovery-phase dilemmas can be presented and decided; ending exactly at the window
    // start left the recovery phase a single tick long.
    let t_end = window_t(&windows[windows.len() - 1]) + RECOVERY_PLAY_MINUTES;
    let mut rng = SimRng::new(cfg.seed);
    let mut state = init_state(content, &mut rng, t_start);
    // Default teams are always drawn so the RNG stream does not depend on
    // whether teams were supplied; replay passes the logged teams explicitly.
    let drawn = default_teams(content, &mut rng);
    let teams = cfg.teams.clone().unwrap_or(drawn);
    let mut ticks: Vec<Tick> = Vec::new();
    let mut t = t_start;
    let mut first = true;
    while t <= t_end {
        state.t = t;
        let mut events: Vec<Event> = Vec::new();
        let draws_before = rng.draws();
        // 1. window and weather
        let idx = weather::window_index(content, t);
        if first || idx != state.window_idx {
            let from = if first { None } else { Some(windows[state.window_idx].id.clone()) };
            events.push(Event::WindowTransition { from, to: windows[idx].id.clone(), narrative: format!("{}: {}", clock(t), windows[idx].label) });
        }
        first = false;
        state.window_idx = idx;
        state.intensity = scripted_intensity(&cfg.intensity, t).unwrap_or_else(|| weather::default_intensity(content, idx));
        let w = weather::weather_at(content, t, state.track_strength, state.track_shift);
        let phase = log_phase(&windows[idx].phase);
        // 2. degradation
        degrade(content, &mut state, degradation_key(&windows[idx].phase), &w, &mut events);
        // 3. connectivity and roads
        let repairing = degradation_key(&windows[idx].phase) == "recovery";
        for c in connectivity::step(content, &mut state, STEP_MINUTES, repairing) {
            let narrative = format!("{} {} {} (source {})", c.parish_id, c.system, c.status.replace('_', " "), c.source);
            events.push(Event::Connectivity { parish_id: c.parish_id, system: c.system, status: c.status, source: c.source, narrative });
        }
        let (newly, restored) = connectivity::roads_step(content, &mut state, w.wind_mph, w.rain_in_per_hour);
        for p in newly {
            events.push(Event::Isolation { narrative: format!("No passable road out of {p}."), parish_id: p, ended: None });
        }
        for p in restored {
            events.push(Event::Isolation { narrative: format!("Road access to {p} restored."), parish_id: p, ended: Some(true) });
        }
        // 4. cascades
        cascade::evaluate(content, &mut state);
        // 5. scheduled effects
        for s in state.take_due(t) {
            let nominal = s.delta.round() as i64;
            let applied = state.apply(&s.parish_id, &s.system, s.delta);
            match s.source {
                ScheduledSource::Cascade { rule_id } => events.push(Event::Cascade { rule_id, parish_id: s.parish_id, system: s.system, delta: nominal, narrative: s.narrative }),
                ScheduledSource::Consequence { dilemma_id } => events.push(Event::Consequence { dilemma_id, parish_id: s.parish_id, system: s.system, delta: applied, delay_minutes: s.delay_minutes, narrative: s.narrative }),
            }
        }
        // 6. dilemmas
        for (parish, id) in dilemma::present(content, &mut state, &mut rng, STEP_MINUTES) {
            if let Some(d) = content.dilemmas.all_dilemmas.iter().find(|d| d.id == id) {
                let deadline_t = state.open[&parish].deadline_t;
                events.push(Event::DilemmaPresented { dilemma_id: d.id.clone(), parish_id: parish, title: d.title.clone(), setup: d.setup.clone(), values_tested: d.values_tested.clone(), persona_id: d.persona_ids().first().cloned(), deadline_t });
            }
        }
        // 7 + 8. decisions and consequences
        decide_all(content, &mut state, &mut rng, &teams, cfg, &mut events);
        // morale integrator (e.3) and per-parish bookkeeping
        for p in content.parish_ids() {
            morale::step(content, &mut state, &p);
            if state.isolated.contains(&p) {
                *state.isolated_ticks.entry(p.clone()).or_insert(0) += 1;
            }
            let pw = state.level(&p, "power");
            let m = state.min_power.entry(p).or_insert(pw);
            *m = m.min(pw);
        }
        // 9. snapshot
        ticks.push(Tick { t, window_id: windows[idx].id.clone(), phase: phase.into(), intensity: state.intensity, weather: w, infrastructure: state.infra_rounded(), morale: state.morale_rounded(), isolated: state.isolated.iter().cloned().collect(), events, rng_draws: rng.draws() - draws_before });
        t += STEP_MINUTES;
    }
    let summary = summarize(content, &state, &teams, ticks.len());
    RunLog {
        version: "0.1".into(),
        seed: cfg.seed,
        scenario: "hurricane-midas".into(),
        content_hash: content.content_hash.clone(),
        step_minutes: STEP_MINUTES,
        t_start,
        t_end,
        systems: SYSTEMS.iter().map(|s| s.to_string()).collect(),
        parishes: parish_meta(content),
        windows: windows.iter().map(|w| WindowMeta { id: w.id.clone(), phase: log_phase(&w.phase).into(), t_minus_hours: -w.t_minus_hours, label: w.label.clone(), certainty: w.certainty_percent, t_minutes: window_t(w), timeline_phase: w.phase.clone() }).collect(),
        teams,
        ticks,
        summary,
    }
}

fn parish_meta(content: &Content) -> Vec<ParishMeta> {
    content
        .parish_ids()
        .into_iter()
        .filter_map(|id| content.parish(&id).map(|p| (id, p)))
        .map(|(id, p)| {
            let init = content.infrastructure.initial_infrastructure_status.get(&id);
            let absent = SYSTEMS.iter().filter(|s| init.and_then(|m| m.get(**s)).copied().unwrap_or(0.0) <= 0.0).map(|s| s.to_string()).collect();
            ParishMeta { id, name: p.name.clone(), population: p.population, position: MapPoint { x: p.position.x, y: p.position.y }, role: p.supply_chain_role.clone(), absent_systems: absent }
        })
        .collect()
}

fn summarize(content: &Content, state: &SimState, teams: &[Team], ticks: usize) -> Summary {
    let infra = state.infra_rounded();
    let morale = state.morale_rounded();
    let per_parish = content
        .parish_ids()
        .into_iter()
        .map(|p| {
            let o = ParishOutcome {
                min_power: state.min_power.get(&p).copied().unwrap_or(0.0).round() as i64,
                minutes_isolated: state.isolated_ticks.get(&p).copied().unwrap_or(0) * STEP_MINUTES,
                decisions: state.decisions.iter().filter(|d| d.parish_id == p).count(),
                final_morale: morale.get(&p).copied().unwrap_or(0),
                final_infrastructure: infra.get(&p).cloned().unwrap_or_default(),
            };
            (p, o)
        })
        .collect();
    let stated: Vec<(String, Vec<String>)> = teams.iter().map(|t| (t.parish_id.clone(), t.stated_values.clone())).collect();
    let hashed = HashedState {
        t: state.t,
        infrastructure: &infra,
        morale: &morale,
        isolated: &state.isolated,
        fired_rules: &state.fired_rules,
        decisions: state.decisions.iter().map(|d| (d.t, d.parish_id.clone(), d.dilemma_id.clone(), d.option_id.clone())).collect(),
    };
    Summary {
        ticks,
        decisions: state.decisions.len(),
        cascades_fired: state.fired_rules.len(),
        per_parish,
        values_gap: values::values_gap(&stated, &state.decisions),
        state_hash: state_hash(&hashed),
        cascade_rules_fired: state.fired_rules.iter().cloned().collect(),
    }
}

/// Re-executes a logged run from its seed, teams, intensity curve and
/// recorded decisions. Returns the new log; the caller compares hashes.
pub fn replay(content: &Content, log: &RunLog) -> RunLog {
    let cfg = RunConfig { seed: log.seed, teams: Some(log.teams.clone()), decisions: log.recorded_decisions(), intensity: log.recorded_intensity() };
    run(content, &cfg)
}

/// First tick at which two logs differ, with a short description.
pub fn first_divergence(a: &RunLog, b: &RunLog) -> Option<String> {
    for (x, y) in a.ticks.iter().zip(&b.ticks) {
        if x.infrastructure != y.infrastructure || x.isolated != y.isolated || x.morale != y.morale {
            return Some(format!("{} ({}): infrastructure/morale/isolation differ", clock(x.t), x.t));
        }
        if x.rng_draws != y.rng_draws {
            return Some(format!("{} ({}): {} rng draws vs {}", clock(x.t), x.t, x.rng_draws, y.rng_draws));
        }
        if x.events.len() != y.events.len() {
            return Some(format!("{} ({}): {} events vs {}", clock(x.t), x.t, x.events.len(), y.events.len()));
        }
    }
    if a.ticks.len() != b.ticks.len() {
        return Some(format!("tick count {} vs {}", a.ticks.len(), b.ticks.len()));
    }
    None
}

