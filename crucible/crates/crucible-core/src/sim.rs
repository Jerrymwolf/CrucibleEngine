//! The tick loop. Order per tick: window and weather, degradation,
//! connectivity and routes, cascades, scheduled numeric effects, deferred
//! Board effects and the storm's hazards, inputs, the allocation lock,
//! scheduled maydays, aid, convoys and the doses tally, dilemma
//! presentation, decisions and their consequences, bookkeeping, then the
//! snapshot with its state hash.

use crate::cascade;
use crate::connectivity;
use crate::content::{Content, Dilemma};
use crate::controller::{self, ScriptedDecision};
use crate::dilemma;
use crate::effects::{self, Ctx};
use crate::inputs::{sort_inputs, Input, InputRecord, ScheduledAsk, Session};
use crate::log::{
    clock, state_hash, Counters, Event, HashedState, MapPoint, OpenCallInfo, ParishMeta, ParishOutcome, PendingDilemma, PendingOption, ResidentsSummary,
    RunLog, Summary, Tick, WindowMeta,
};
use crate::morale;
use crate::rng::SimRng;
use crate::state::{DecisionRecord, OpenDilemma, Scheduled, ScheduledSource, SimState};
use crate::values::{self, option_signals};
use crate::weather::{self, degradation_key, log_phase, window_t};
use crate::{aid, residents, resources, routes, tally, STEP_MINUTES, SYSTEMS};
use std::collections::{BTreeMap, BTreeSet};

/// Simulation minutes of play after the final timeline window begins (24 h).
pub const RECOVERY_PLAY_MINUTES: i64 = 24 * 60;

pub use crate::log::Team;

/// Inputs beyond the content: seed, teams, scripted decisions, intensity,
/// the tables' inputs, the session profile and the horizon.
#[derive(Debug, Clone, Default)]
pub struct RunConfig {
    pub seed: u64,
    /// None: default ai teams with seeded stated values.
    pub teams: Option<Vec<Team>>,
    pub decisions: BTreeMap<String, ScriptedDecision>,
    /// (t, intensity) points; a step function. Empty: the session's curve, else the default.
    pub intensity: Vec<(i64, i64)>,
    /// Live mode: halt at the first tick where a human team has an open
    /// dilemma with no scripted decision, and report it as `pending`.
    /// Re-running with that decision scripted at the reported tick
    /// reproduces the halted run as an exact prefix.
    pub live: bool,
    /// Session profile (older form): when set, a human team is asked only
    /// these dilemma ids; its other dilemmas are decided by the drift model.
    pub ask: Option<BTreeSet<String>>,
    /// What the tables and the facilitator did, as (t, seq) records.
    pub inputs: Vec<InputRecord>,
    /// Stop after this tick. The nominal end stays `t_end`; the log says `until`.
    pub until: Option<i64>,
    /// Session profile: scheduled presentations, maydays, the allocation
    /// lock and the intensity curve.
    pub session: Session,
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
    let hits = content.parish(parish).map(|p| p.vulnerabilities.iter().filter(|v| needles.iter().any(|n| v.to_lowercase().contains(n))).count()).unwrap_or(0);
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
        let row: BTreeMap<String, f64> = SYSTEMS.iter().map(|s| (s.to_string(), init.and_then(|m| m.get(*s)).copied().unwrap_or(0.0))).collect();
        infra.insert(p.clone(), row);
        morale.insert(p.clone(), 80.0);
        morale_pressure.insert(p.clone(), morale::initial_pressure(80.0));
        generator_hours.insert(p.clone(), connectivity::backup_hours(content, &p));
    }
    let (stock, hidden) = resources::init(content);
    let (groups, cards) = residents::init(content);
    SimState {
        t: t_start,
        window_idx: 0,
        intensity: 3,
        wind_mph: 0.0,
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
        stock,
        hidden,
        allocation: BTreeMap::new(),
        allocation_locked: false,
        shelter_places: BTreeMap::new(),
        cold_bays: BTreeMap::new(),
        repair_crews: BTreeMap::new(),
        route_open: BTreeMap::new(),
        route_overrides: BTreeMap::new(),
        convoys: vec![],
        next_convoy_id: 0,
        returning: vec![],
        calls_open: BTreeMap::new(),
        calls_answered: BTreeMap::new(),
        asked_of: BTreeMap::new(),
        groups,
        cards,
        flags: BTreeSet::new(),
        pending_effects: vec![],
        next_effect_seq: 0,
        last_hazard_t: i64::MIN,
        lowest_people_safe: i64::MAX,
        people_ticks_at_risk: 0,
        doses: tally::init(content),
        power_priority: None,
        values_locked: BTreeMap::new(),
        statements: BTreeMap::new(),
        presented_scheduled: BTreeSet::new(),
        maydays_raised: BTreeSet::new(),
        inputs_applied: 0,
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
fn apply_consequences(
    content: &Content,
    state: &mut SimState,
    parish: &str,
    dilemma_id: &str,
    option: &crate::content::DilemmaOption,
    events: &mut Vec<Event>,
) {
    let sig = option_signals(content, option);
    let care: f64 = sig.iter().filter(|(k, _)| controller::is_costly(k)).map(|(_, v)| *v as f64).sum();
    let sketch = &option.consequence_sketch;
    let delta = state.apply(parish, "morale", (2.0 * care).clamp(-10.0, 10.0));
    events.push(Event::Consequence {
        dilemma_id: dilemma_id.into(),
        parish_id: parish.into(),
        system: "morale".into(),
        delta,
        delay_minutes: 0,
        narrative: sketch.immediate.clone(),
    });
    let provides: Vec<String> = content
        .concordia
        .parish_dependencies
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case(parish))
        .map(|(_, d)| d.provides_to.iter().map(|x| x.to_lowercase()).collect())
        .unwrap_or_default();
    for other in provides {
        state.schedule(Scheduled {
            due_t: state.t + 60,
            seq: 0,
            parish_id: other,
            system: "morale".into(),
            delta: care.clamp(-5.0, 5.0),
            source: ScheduledSource::Consequence { dilemma_id: dilemma_id.into() },
            narrative: sketch.ripple.clone(),
            delay_minutes: 60,
        });
    }
    let weakest = ["power", "communications", "water", "roads", "hospital"]
        .iter()
        .filter(|s| state.level(parish, s) > 0.0)
        .min_by(|a, b| state.level(parish, a).partial_cmp(&state.level(parish, b)).unwrap_or(std::cmp::Ordering::Equal))
        .map(|s| s.to_string());
    if let Some(sys) = weakest {
        state.schedule(Scheduled {
            due_t: state.t + 240,
            seq: 0,
            parish_id: parish.into(),
            system: sys,
            delta: (3.0 * care).clamp(-15.0, 9.0),
            source: ScheduledSource::Consequence { dilemma_id: dilemma_id.into() },
            narrative: sketch.delayed.clone(),
            delay_minutes: 240,
        });
    }
}

fn is_asked(asked: &Option<BTreeSet<String>>, dilemma_id: &str) -> bool {
    asked.as_ref().is_none_or(|a| a.contains(dilemma_id))
}

/// The dilemma ids human tables are asked: `cfg.ask` plus the session's
/// schedule; None when neither says anything (every dilemma is asked).
fn asked_set(cfg: &RunConfig) -> Option<BTreeSet<String>> {
    let from_session = cfg.session.asked_ids();
    if cfg.ask.is_none() && from_session.is_empty() {
        return None;
    }
    let mut out = cfg.ask.clone().unwrap_or_default();
    out.extend(from_session);
    Some(out)
}

fn presented_event(d: &Dilemma, parish: &str, deadline_t: i64) -> Event {
    Event::DilemmaPresented {
        dilemma_id: d.id.clone(),
        parish_id: parish.into(),
        title: d.title.clone(),
        setup: d.setup.clone(),
        values_tested: d.values_tested.clone(),
        persona_id: d.persona_ids().first().cloned(),
        deadline_t,
    }
}

/// Presents the session's scheduled cards whose time has come, one per
/// parish per tick, to parishes with no card open. The deadline counts from
/// the actual presentation.
fn present_scheduled(ctx: &mut Ctx, schedule: &BTreeMap<String, Vec<ScheduledAsk>>) {
    let content = ctx.content;
    for (parish, asks) in schedule {
        if ctx.state.open.contains_key(parish) {
            continue;
        }
        for a in asks {
            if a.present_t > ctx.t {
                break;
            }
            let key = (parish.clone(), a.dilemma_id.clone());
            if ctx.state.presented_scheduled.contains(&key) {
                continue;
            }
            ctx.state.presented_scheduled.insert(key);
            let Some(d) = content.dilemma(&a.dilemma_id) else {
                ctx.reject("schedule", parish, format!("unknown dilemma {}", a.dilemma_id));
                continue;
            };
            if ctx.state.used_dilemmas.contains(&d.id) {
                ctx.reject("schedule", parish, format!("{} was already presented", d.id));
                continue;
            }
            ctx.state.used_dilemmas.insert(d.id.clone());
            ctx.state.last_dilemma_t.insert(parish.clone(), ctx.t);
            let deadline_t = ctx.t + a.deadline_ticks.max(1) * STEP_MINUTES;
            ctx.state.open.insert(parish.clone(), OpenDilemma { dilemma_id: d.id.clone(), presented_t: ctx.t, deadline_t });
            ctx.events.push(presented_event(d, parish, deadline_t));
            break;
        }
    }
}

/// The facilitator swaps a card: the open one (keeping its deadline) or a
/// scheduled one not yet presented.
fn swap_dilemma(
    ctx: &mut Ctx,
    schedule: &mut BTreeMap<String, Vec<ScheduledAsk>>,
    asked: &mut Option<BTreeSet<String>>,
    parish: &str,
    from: &str,
    to: &str,
) -> Result<(), String> {
    let content = ctx.content;
    let d = content.dilemma(to).ok_or_else(|| format!("unknown dilemma {to}"))?;
    if d.options.is_empty() {
        return Err(format!("{to} has no options"));
    }
    if ctx.state.used_dilemmas.contains(to) {
        return Err(format!("{to} was already presented"));
    }
    if let Some(a) = asked.as_mut() {
        a.insert(to.into());
    }
    if let Some(od) = ctx.state.open.get(parish).cloned() {
        if od.dilemma_id == from {
            ctx.state.used_dilemmas.insert(to.into());
            let deadline_t = od.deadline_t.max(ctx.t + STEP_MINUTES);
            ctx.state.open.insert(parish.into(), OpenDilemma { dilemma_id: to.into(), presented_t: ctx.t, deadline_t });
            ctx.events.push(presented_event(d, parish, deadline_t));
            return Ok(());
        }
    }
    let presented = ctx.state.presented_scheduled.contains(&(parish.to_string(), from.to_string()));
    if let Some(a) = schedule.get_mut(parish).and_then(|asks| asks.iter_mut().find(|a| a.dilemma_id == from)) {
        if !presented {
            a.dilemma_id = to.into();
            return Ok(());
        }
    }
    Err(format!("{from} is neither open nor still scheduled for {parish}"))
}

fn apply_input(
    ctx: &mut Ctx,
    input: &Input,
    decisions: &mut BTreeMap<String, ScriptedDecision>,
    schedule: &mut BTreeMap<String, Vec<ScheduledAsk>>,
    asked: &mut Option<BTreeSet<String>>,
    lock_t: Option<i64>,
) -> Result<(), String> {
    let content = ctx.content;
    let parish = input.parish_id();
    if !content.parish_ids().iter().any(|p| p == parish) {
        return Err(format!("unknown parish {parish}"));
    }
    match input {
        Input::LockValues { values, statement, .. } => resources::lock_values(ctx, parish, values, statement.as_deref()),
        Input::Allocate { token, to, count, .. } => {
            if lock_t.is_none() {
                return Err("this session has no allocation round".into());
            }
            resources::record_allocation(content, ctx.state, parish, token, to, *count)
        }
        Input::Decide { dilemma_id, option_id, rationale, .. } => {
            let d = content.dilemma(dilemma_id).ok_or_else(|| format!("unknown dilemma {dilemma_id}"))?;
            if d.parish_id != "multi" && d.parish_id != parish {
                return Err(format!("{dilemma_id} is {}'s card", d.parish_id));
            }
            if !d.options.iter().any(|o| &o.id == option_id) {
                return Err(format!("{dilemma_id} has no option {option_id}"));
            }
            let s = ScriptedDecision { option_id: option_id.clone(), rationale: rationale.clone(), t: Some(ctx.t) };
            if ctx.state.open.get(parish).is_some_and(|o| &o.dilemma_id == dilemma_id) {
                decisions.insert(dilemma_id.clone(), s);
            } else if ctx.state.decided_dilemmas.contains(dilemma_id) {
                return Err(format!("{dilemma_id} was already decided"));
            } else {
                decisions.entry(dilemma_id.clone()).or_insert(s);
            }
            Ok(())
        }
        Input::Mayday { call_id, .. } => {
            let call = content.aid.call(call_id).ok_or_else(|| format!("unknown call {call_id}"))?;
            if call.asker != parish {
                return Err(format!("{call_id} is {}'s call", call.asker));
            }
            aid::raise(ctx, call_id, "input", None)
        }
        Input::AnswerAid { call_id, answer, count, reason, .. } => {
            let call = content.aid.call(call_id).ok_or_else(|| format!("unknown call {call_id}"))?;
            if call.holder != parish {
                return Err(format!("{call_id} asks {}, not {parish}", call.holder));
            }
            aid::answer(ctx, call_id, answer, *count, "human", true, true, reason.clone())
        }
        Input::DeclareHidden { .. } => resources::declare_hidden(ctx, parish, true),
        Input::RepairSend { token, to, count, .. } => resources::repair_send(ctx, parish, token, to, *count),
        Input::CreditLine { to, text, .. } => resources::credit_line(ctx, parish, to, text),
        Input::SwapDilemma { from, to, .. } => swap_dilemma(ctx, schedule, asked, parish, from, to),
    }
}

/// Applies every input due at or before this tick, in (t, seq) order.
fn apply_inputs(
    ctx: &mut Ctx,
    inputs: &[InputRecord],
    decisions: &mut BTreeMap<String, ScriptedDecision>,
    schedule: &mut BTreeMap<String, Vec<ScheduledAsk>>,
    asked: &mut Option<BTreeSet<String>>,
    lock_t: Option<i64>,
) {
    while ctx.state.inputs_applied < inputs.len() && inputs[ctx.state.inputs_applied].t <= ctx.t {
        let r = &inputs[ctx.state.inputs_applied];
        ctx.state.inputs_applied += 1;
        if let Err(reason) = apply_input(ctx, &r.input, decisions, schedule, asked, lock_t) {
            ctx.reject(&format!("input:{}", r.input.kind()), r.input.parish_id(), reason);
        }
    }
}

fn decide_all(ctx: &mut Ctx, asked: &Option<BTreeSet<String>>, decisions: &BTreeMap<String, ScriptedDecision>) {
    let content = ctx.content;
    let open: Vec<(String, OpenDilemma)> = ctx.state.open.iter().map(|(p, o)| (p.clone(), o.clone())).collect();
    for (parish, od) in open {
        let (ctrl, stated): (String, Vec<String>) =
            ctx.teams.iter().find(|t| t.parish_id == parish).map(|t| (t.controller.clone(), t.stated_values.clone())).unwrap_or(("ai".into(), vec![]));
        let ctrl = if ctrl == "human" && !is_asked(asked, &od.dilemma_id) { "ai".to_string() } else { ctrl };
        let team_input = controller::TeamInput { controller: &ctrl, stated: &stated, scripted: decisions };
        let Some(choice) = controller::decide(content, ctx.state, ctx.rng, &parish, &team_input, &od) else { continue };
        let Some(d) = content.dilemma(&od.dilemma_id) else { continue };
        let Some(option) = d.options.iter().find(|o| o.id == choice.option_id) else { continue };
        // The engine rates the answer, never the weather: a card the clock
        // decided keeps its default option's effects and carries no values.
        let signals = if choice.decided_by.as_deref() == Some("storm") { BTreeMap::new() } else { option_signals(content, option) };
        ctx.state.open.remove(&parish);
        ctx.state.decided_dilemmas.insert(d.id.clone());
        ctx.state.decisions.push(DecisionRecord {
            t: ctx.t,
            kind: "dilemma".into(),
            parish_id: parish.clone(),
            dilemma_id: d.id.clone(),
            option_id: option.id.clone(),
            controller: choice.controller.clone(),
            values_signaled: signals.clone(),
            decided_by: choice.decided_by.clone(),
        });
        let decision_at = ctx.events.len();
        ctx.events.push(Event::Decision {
            dilemma_id: d.id.clone(),
            parish_id: parish.clone(),
            option_id: option.id.clone(),
            option_label: option.label.clone(),
            rationale: choice.rationale.clone(),
            controller: choice.controller.clone(),
            values_signaled: signals.clone(),
            expired: if choice.expired { Some(true) } else { None },
            pressure: Some((choice.pressure * 1000.0).round() / 1000.0),
            decided_by: choice.decided_by.clone(),
        });
        apply_consequences(content, ctx.state, &parish, &d.id, option, ctx.events);
        let effects_at = ctx.events.len();
        if !option.effects.is_empty() {
            effects::apply(ctx, &option.effects, &parish, &d.id);
        }
        // An option whose own moves the engine rejected (sending or declaring
        // what the table does not hold) is recorded but not rated.
        let rejected = ctx.events[effects_at..].iter().any(|e| matches!(e, Event::Rejected { source, .. } if source == &d.id));
        let signals = if rejected {
            if let Some(r) = ctx.state.decisions.last_mut() {
                r.values_signaled.clear();
            }
            if let Event::Decision { values_signaled, .. } = &mut ctx.events[decision_at] {
                values_signaled.clear();
            }
            BTreeMap::new()
        } else {
            signals
        };
        morale::add_leadership(ctx.state, &parish, &signals);
    }
}

fn default_teams(content: &Content, rng: &mut SimRng) -> Vec<Team> {
    content
        .parish_ids()
        .into_iter()
        .map(|p| Team { stated_values: values::default_stated_values(content, &p, rng), parish_id: p, controller: "ai".into(), statement: None })
        .collect()
}

/// The board's counters and what feeds them.
pub fn counters(content: &Content, state: &SimState) -> Counters {
    let (at_risk, injured, lost) = residents::totals(state);
    let d = &state.doses;
    Counters {
        doses_shipped: d.shipped.round() as i64,
        people_safe: residents::people_safe(content, state),
        vault_doses: d.vault.round() as i64,
        aboard: if d.ship_sailed { 0 } else { d.loaded.round() as i64 },
        at_risk,
        injured,
        lost,
        lowest_people_safe: if state.lowest_people_safe == i64::MAX { residents::people_safe(content, state) } else { state.lowest_people_safe },
        people_hours_at_risk: state.people_ticks_at_risk * STEP_MINUTES / 60,
    }
}

fn stock_nonzero(state: &SimState) -> BTreeMap<String, BTreeMap<String, i64>> {
    state.stock.iter().map(|(p, m)| (p.clone(), m.iter().filter(|(_, n)| **n != 0).map(|(k, v)| (k.clone(), *v)).collect())).collect()
}

/// SHA-256 of the canonical state: what `summary.state_hash` and every
/// tick's `state_hash` report.
pub fn hash_state(state: &SimState, infra: &BTreeMap<String, BTreeMap<String, i64>>, morale: &BTreeMap<String, i64>, counters: &Counters) -> String {
    let d = &state.doses;
    let hashed = HashedState {
        t: state.t,
        infrastructure: infra,
        morale,
        isolated: &state.isolated,
        fired_rules: &state.fired_rules,
        decisions: state.decisions.iter().map(|d| (d.t, d.kind.clone(), d.parish_id.clone(), d.dilemma_id.clone(), d.option_id.clone())).collect(),
        stock: &state.stock,
        hidden: &state.hidden,
        routes_cut: state.routes_cut(),
        convoys: &state.convoys,
        counters,
        groups: &state.groups,
        cards: &state.cards,
        flags: &state.flags,
        calls_answered: &state.calls_answered,
        doses: (d.vault.round() as i64, d.loaded.round() as i64, d.shipped.round() as i64, d.held.round() as i64, d.lost.round() as i64),
    };
    state_hash(&hashed)
}

/// Runs a simulation and returns the run log.
pub fn run(content: &Content, cfg: &RunConfig) -> RunLog {
    let windows = &content.timeline.hurricane_midas.windows;
    let t_start = window_t(&windows[0]);
    // The run continues one day past the start of the final (recovery) window so that
    // recovery-phase dilemmas can be presented and decided; ending exactly at the window
    // start left the recovery phase a single tick long.
    let t_end = window_t(&windows[windows.len() - 1]) + RECOVERY_PLAY_MINUTES;
    let stop = cfg.until.map(|u| u.min(t_end)).unwrap_or(t_end);
    let mut rng = SimRng::new(cfg.seed);
    let mut state = init_state(content, &mut rng, t_start);
    // Default teams are always drawn so the RNG stream does not depend on
    // whether teams were supplied; replay passes the logged teams explicitly.
    let drawn = default_teams(content, &mut rng);
    let mut teams = cfg.teams.clone().unwrap_or(drawn);
    let mut inputs = cfg.inputs.clone();
    sort_inputs(&mut inputs);
    let mut decisions = cfg.decisions.clone();
    let mut schedule = cfg.session.schedule.clone();
    let scheduled_parishes: BTreeSet<String> = schedule.keys().cloned().collect();
    let mut asked = asked_set(cfg);
    let lock_t = cfg.session.allocation_lock_t;
    let mut ticks: Vec<Tick> = Vec::new();
    let mut t = t_start;
    let mut halted: Vec<PendingDilemma> = Vec::new();
    while t <= stop {
        state.t = t;
        let first = t == t_start;
        let mut events: Vec<Event> = Vec::new();
        let draws_before = rng.draws();
        // 1. window and weather
        let idx = weather::window_index(content, t);
        if first || idx != state.window_idx {
            let from = if first { None } else { Some(windows[state.window_idx].id.clone()) };
            events.push(Event::WindowTransition { from, to: windows[idx].id.clone(), narrative: format!("{}: {}", clock(t), windows[idx].label) });
        }
        state.window_idx = idx;
        state.intensity = scripted_intensity(&cfg.intensity, t)
            .or_else(|| scripted_intensity(&cfg.session.intensity, t))
            .unwrap_or_else(|| weather::default_intensity(content, idx));
        let w = weather::weather_at(content, t, state.track_strength, state.track_shift);
        state.wind_mph = w.wind_mph;
        let phase = log_phase(&windows[idx].phase);
        let key = degradation_key(&windows[idx].phase);
        // 2. degradation
        degrade(content, &mut state, key, &w, &mut events);
        // 3. connectivity and routes
        let repairing = key == "recovery";
        for c in connectivity::step(content, &mut state, STEP_MINUTES, repairing) {
            let narrative = format!("{} {} {} (source {})", c.parish_id, c.system, c.status.replace('_', " "), c.source);
            events.push(Event::Connectivity { parish_id: c.parish_id, system: c.system, status: c.status, source: c.source, narrative });
        }
        let (newly, restored) = routes::step(content, &mut state, t, first, &mut events);
        for p in newly {
            events.push(Event::Isolation { narrative: format!("No open road out of {p}."), parish_id: p, ended: None });
        }
        for p in restored {
            events.push(Event::Isolation { narrative: format!("Road access to {p} restored."), parish_id: p, ended: Some(true) });
        }
        // 4. cascades
        cascade::evaluate(content, &mut state);
        // 5. scheduled numeric effects
        for s in state.take_due(t) {
            let nominal = s.delta.round() as i64;
            let applied = state.apply(&s.parish_id, &s.system, s.delta);
            match s.source {
                ScheduledSource::Cascade { rule_id } => {
                    events.push(Event::Cascade { rule_id, parish_id: s.parish_id, system: s.system, delta: nominal, narrative: s.narrative })
                }
                ScheduledSource::Consequence { dilemma_id } => events.push(Event::Consequence {
                    dilemma_id,
                    parish_id: s.parish_id,
                    system: s.system,
                    delta: applied,
                    delay_minutes: s.delay_minutes,
                    narrative: s.narrative,
                }),
            }
        }
        // 5b. the Board: deferred effects, hazards, inputs, the allocation
        // lock, scheduled maydays, aid, convoys, crews, the doses tally,
        // then the session's scheduled cards.
        {
            let mut ctx = Ctx { content, state: &mut state, rng: &mut rng, teams: &mut teams, events: &mut events, t, t_end };
            effects::step_pending(&mut ctx);
            residents::hazards_step(content, ctx.state, t, ctx.events);
            apply_inputs(&mut ctx, &inputs, &mut decisions, &mut schedule, &mut asked, lock_t);
            if lock_t.is_some_and(|l| t >= l) && !ctx.state.allocation_locked {
                resources::lock(&mut ctx);
            }
            for m in &cfg.session.maydays {
                if m.t <= t && !ctx.state.maydays_raised.contains(&m.call_id) {
                    ctx.state.maydays_raised.insert(m.call_id.clone());
                    let asker = content.aid.call(&m.call_id).map(|c| c.asker.clone()).unwrap_or_default();
                    if let Err(reason) = aid::raise(&mut ctx, &m.call_id, "schedule", m.answer_ticks) {
                        ctx.reject("schedule", &asker, reason);
                    }
                }
            }
            aid::step(&mut ctx);
            let arrivals = routes::convoys_step(content, ctx.state, t, t_end, ctx.events);
            for a in &arrivals {
                if a.purpose.starts_with("aid:") {
                    aid::deliver(&mut ctx, a);
                } else {
                    resources::deliver_token(&mut ctx, &a.to, &a.token, a.count);
                }
            }
            if repairing {
                resources::crews_step(content, ctx.state);
            }
            tally::step(content, ctx.state, t, ctx.events);
            // 6. dilemmas: the session's schedule first, then the drift of the deck
            present_scheduled(&mut ctx, &schedule);
        }
        for (parish, id) in dilemma::present(content, &mut state, &mut rng, STEP_MINUTES, &scheduled_parishes) {
            if let Some(d) = content.dilemma(&id) {
                let deadline_t = state.open[&parish].deadline_t;
                events.push(presented_event(d, &parish, deadline_t));
            }
        }
        if cfg.live {
            let pending = pending_human(content, &state, &teams, &asked, &decisions);
            if !pending.is_empty() {
                halted = pending;
                break;
            }
        }
        // 7 + 8. decisions, consequences and option effects
        {
            let mut ctx = Ctx { content, state: &mut state, rng: &mut rng, teams: &mut teams, events: &mut events, t, t_end };
            decide_all(&mut ctx, &asked, &decisions);
        }
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
        // The trajectory: the island's low point and the people-hours at risk.
        {
            let safe = residents::people_safe(content, &state);
            state.lowest_people_safe = state.lowest_people_safe.min(safe);
            let (at_risk, injured, _) = residents::totals(&state);
            state.people_ticks_at_risk += at_risk + injured;
        }
        // 9. snapshot and the tick's state hash
        let infra = state.infra_rounded();
        let morale = state.morale_rounded();
        let counters = counters(content, &state);
        let hash = hash_state(&state, &infra, &morale, &counters);
        ticks.push(Tick {
            t,
            window_id: windows[idx].id.clone(),
            phase: phase.into(),
            intensity: state.intensity,
            weather: w,
            infrastructure: infra,
            morale,
            isolated: state.isolated.iter().cloned().collect(),
            events,
            rng_draws: rng.draws() - draws_before,
            counters,
            stock: stock_nonzero(&state),
            routes_cut: state.routes_cut(),
            state_hash: hash,
        });
        t += STEP_MINUTES;
    }
    let stopped_early = stop < t_end;
    let pending = if !halted.is_empty() {
        halted
    } else if stopped_early {
        pending_human(content, &state, &teams, &asked, &decisions)
    } else {
        vec![]
    };
    let open_calls = state
        .calls_open
        .values()
        .filter_map(|oc| {
            let call = content.aid.call(&oc.call_id)?;
            Some(OpenCallInfo {
                call_id: oc.call_id.clone(),
                asker: call.asker.clone(),
                holder: call.holder.clone(),
                opened_t: oc.opened_t,
                deadline_t: oc.deadline_t,
            })
        })
        .collect();
    let summary = summarize(content, &state, &teams, ticks.len());
    RunLog {
        version: "0.3".into(),
        seed: cfg.seed,
        scenario: "hurricane-midas".into(),
        content_hash: content.content_hash.clone(),
        step_minutes: STEP_MINUTES,
        t_start,
        t_end,
        systems: SYSTEMS.iter().map(|s| s.to_string()).collect(),
        parishes: parish_meta(content),
        windows: windows
            .iter()
            .map(|w| WindowMeta {
                id: w.id.clone(),
                phase: log_phase(&w.phase).into(),
                t_minus_hours: -w.t_minus_hours,
                label: w.label.clone(),
                certainty: w.certainty_percent,
                t_minutes: window_t(w),
                timeline_phase: w.phase.clone(),
            })
            .collect(),
        teams,
        ticks,
        summary,
        pending,
        inputs,
        session: cfg.session.clone(),
        until: if stopped_early { Some(stop) } else { None },
        open_calls,
    }
}

/// Open dilemmas of human teams that no scripted decision answers yet.
fn pending_human(
    content: &Content,
    state: &SimState,
    teams: &[Team],
    asked: &Option<BTreeSet<String>>,
    decisions: &BTreeMap<String, ScriptedDecision>,
) -> Vec<PendingDilemma> {
    state
        .open
        .iter()
        .filter(|(p, od)| {
            teams.iter().any(|t| &t.parish_id == *p && t.controller == "human") && is_asked(asked, &od.dilemma_id) && !decisions.contains_key(&od.dilemma_id)
        })
        .filter_map(|(p, od)| {
            let d = content.dilemma(&od.dilemma_id)?;
            Some(PendingDilemma {
                t: state.t,
                parish_id: p.clone(),
                dilemma_id: d.id.clone(),
                title: d.title.clone(),
                setup: d.setup.clone(),
                deadline_t: od.deadline_t,
                options: d.options.iter().map(|o| PendingOption { id: o.id.clone(), label: o.label.clone(), description: o.description.clone() }).collect(),
            })
        })
        .collect()
}

fn parish_meta(content: &Content) -> Vec<ParishMeta> {
    content
        .parish_ids()
        .into_iter()
        .filter_map(|id| content.parish(&id).map(|p| (id, p)))
        .map(|(id, p)| {
            let init = content.infrastructure.initial_infrastructure_status.get(&id);
            let absent = SYSTEMS.iter().filter(|s| init.and_then(|m| m.get(**s)).copied().unwrap_or(0.0) <= 0.0).map(|s| s.to_string()).collect();
            ParishMeta {
                id,
                name: p.name.clone(),
                population: p.population,
                position: MapPoint { x: p.position.x, y: p.position.y },
                role: p.supply_chain_role.clone(),
                absent_systems: absent,
            }
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
    let counters = counters(content, state);
    let state_hash = hash_state(state, &infra, &morale, &counters);
    let (at_risk, injured, lost) = residents::totals(state);
    Summary {
        ticks,
        decisions: state.decisions.len(),
        cascades_fired: state.fired_rules.len(),
        per_parish,
        values_gap: values::values_gap(content, &stated, &state.decisions),
        state_hash,
        cascade_rules_fired: state.fired_rules.iter().cloned().collect(),
        residents: ResidentsSummary { groups: state.groups.clone(), cards: state.cards.clone(), people_safe: counters.people_safe, at_risk, injured, lost },
        counters,
        stock: stock_nonzero(state),
        flags: state.flags.iter().cloned().collect(),
    }
}

/// Re-executes a logged run from its seed, teams, intensity curve, inputs,
/// session and recorded decisions. Returns the new log; the caller compares hashes.
pub fn replay(content: &Content, log: &RunLog) -> RunLog {
    let cfg = RunConfig {
        seed: log.seed,
        teams: Some(log.teams.clone()),
        decisions: log.recorded_decisions(),
        intensity: log.recorded_intensity(),
        live: false,
        ask: None,
        inputs: log.inputs.clone(),
        until: log.until,
        session: log.session.clone(),
    };
    run(content, &cfg)
}

/// First tick at which two logs differ, with a short description.
pub fn first_divergence(a: &RunLog, b: &RunLog) -> Option<String> {
    for (x, y) in a.ticks.iter().zip(&b.ticks) {
        if x.infrastructure != y.infrastructure || x.isolated != y.isolated || x.morale != y.morale {
            return Some(format!("{} ({}): infrastructure/morale/isolation differ", clock(x.t), x.t));
        }
        if x.state_hash != y.state_hash {
            return Some(format!("{} ({}): state hash differs", clock(x.t), x.t));
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
