//! Mutable simulation state. Everything that reaches the output lives in
//! ordered containers so iteration order is stable.

use crate::content::Effects;
use std::collections::{BTreeMap, BTreeSet};

/// A delayed effect waiting for its tick.
#[derive(Debug, Clone)]
pub struct Scheduled {
    pub due_t: i64,
    pub seq: u64,
    pub parish_id: String,
    /// Infrastructure system, or "morale".
    pub system: String,
    pub delta: f64,
    pub source: ScheduledSource,
    pub narrative: String,
    pub delay_minutes: i64,
}

#[derive(Debug, Clone)]
pub enum ScheduledSource {
    Cascade { rule_id: String },
    Consequence { dilemma_id: String },
}

#[derive(Debug, Clone)]
pub struct OpenDilemma {
    pub dilemma_id: String,
    pub presented_t: i64,
    pub deadline_t: i64,
}

/// A scored choice: a dilemma decision, an allocation entry, an aid answer,
/// a repair send or a line of credit. `source_id` names the dilemma, token
/// entry or call; `option_id` the choice made.
#[derive(Debug, Clone)]
pub struct DecisionRecord {
    pub t: i64,
    /// dilemma | allocation | aid | repair | credit
    pub kind: String,
    pub parish_id: String,
    pub dilemma_id: String,
    pub option_id: String,
    pub controller: String,
    pub values_signaled: BTreeMap<String, i64>,
    /// "storm" when the deadline passed and the default option was applied.
    pub decided_by: Option<String>,
}

/// Head counts of a resident group by state; the six always sum to the size.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct GroupState {
    pub safe: i64,
    pub sheltered: i64,
    pub at_risk: i64,
    pub rescued: i64,
    pub injured: i64,
    pub lost: i64,
}

impl GroupState {
    pub fn get(&self, state: &str) -> i64 {
        match state {
            "safe" => self.safe,
            "sheltered" => self.sheltered,
            "at_risk" => self.at_risk,
            "rescued" => self.rescued,
            "injured" => self.injured,
            "lost" => self.lost,
            _ => 0,
        }
    }

    pub fn get_mut(&mut self, state: &str) -> Option<&mut i64> {
        match state {
            "safe" => Some(&mut self.safe),
            "sheltered" => Some(&mut self.sheltered),
            "at_risk" => Some(&mut self.at_risk),
            "rescued" => Some(&mut self.rescued),
            "injured" => Some(&mut self.injured),
            "lost" => Some(&mut self.lost),
            _ => None,
        }
    }

    /// People not counted as safe: at risk, injured or lost.
    pub fn unsafe_count(&self) -> i64 {
        self.at_risk + self.injured + self.lost
    }
}

/// Tokens on the move between parishes.
#[derive(Debug, Clone, serde::Serialize)]
pub struct Convoy {
    pub id: u64,
    pub from: String,
    pub to: String,
    pub token: String,
    pub count: i64,
    /// Route ids travelled, in order.
    pub path: Vec<String>,
    pub departed_t: i64,
    pub arrive_t: i64,
    /// allocation | aid:<call> | repair | effect:<origin>
    pub purpose: String,
    /// For aid convoys: the answer whose `delivered` effects apply on arrival.
    pub answer: Option<String>,
}

/// A token lost for the quarter: it comes back to `to` at `return_t`.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ReturningToken {
    pub to: String,
    pub token: String,
    pub count: i64,
    pub return_t: i64,
}

#[derive(Debug, Clone)]
pub struct OpenCall {
    pub call_id: String,
    pub opened_t: i64,
    pub deadline_t: i64,
    /// schedule | input | effect
    pub raised_by: String,
}

#[derive(Debug, Clone)]
pub struct AllocEntry {
    pub token: String,
    /// "keep" or a parish id.
    pub to: String,
    pub count: i64,
}

/// A structured effect waiting for its tick (`atT`, `untilT`).
#[derive(Debug, Clone)]
pub struct PendingEffect {
    pub due_t: i64,
    pub seq: u64,
    pub parish_id: String,
    pub origin: String,
    pub effects: Effects,
}

/// The doses tally: the vault, the works, the ship.
#[derive(Debug, Clone, Default)]
pub struct Doses {
    pub vault: f64,
    pub works_hours: f64,
    pub production_rate: f64,
    pub load_start_t: i64,
    pub load_rate_factor: f64,
    /// Doses aboard the ship so far.
    pub loaded: f64,
    /// Most the first consignment can take (the whole consignment when the ship is held).
    pub consignment_cap: f64,
    pub sail_t: i64,
    pub ship_sailed: bool,
    pub shipped: f64,
    pub held: f64,
    pub lost: f64,
    /// Minutes of vault battery left while the vault is on neither grid nor generator.
    pub battery_minutes: f64,
    pub next_consignment_done: bool,
}

#[derive(Debug, Clone)]
pub struct SimState {
    pub t: i64,
    pub window_idx: usize,
    pub intensity: i64,
    pub wind_mph: f64,
    /// parish -> system -> level 0..100 (f64 internally, rounded on output).
    pub infra: BTreeMap<String, BTreeMap<String, f64>>,
    pub morale: BTreeMap<String, f64>,
    /// REA brief e.3: per-parish morale integrator in -2000..2000.
    pub morale_pressure: BTreeMap<String, f64>,
    pub isolated: BTreeSet<String>,
    /// system -> parishes currently reached from a live source.
    pub connected: BTreeMap<String, BTreeSet<String>>,
    /// parish -> remaining backup generator hours.
    pub generator_hours: BTreeMap<String, f64>,
    pub fired_rules: BTreeSet<String>,
    pub scheduled: Vec<Scheduled>,
    pub next_seq: u64,
    pub open: BTreeMap<String, OpenDilemma>,
    pub used_dilemmas: BTreeSet<String>,
    pub decided_dilemmas: BTreeSet<String>,
    pub last_dilemma_t: BTreeMap<String, i64>,
    pub decisions: Vec<DecisionRecord>,
    /// "parish/system" -> degradation not yet reported as an event.
    pub pending_degradation: BTreeMap<String, f64>,
    /// parish -> ticks spent isolated.
    pub isolated_ticks: BTreeMap<String, i64>,
    /// parish -> lowest power level seen.
    pub min_power: BTreeMap<String, f64>,
    /// Weather perturbation drawn once per run from the seed.
    pub track_strength: f64,
    pub track_shift: f64,
    // --- tokens, routes, aid, residents, doses ---
    /// parish -> token -> count on the sheet.
    pub stock: BTreeMap<String, BTreeMap<String, i64>>,
    /// parish -> token -> count held off the sheet.
    pub hidden: BTreeMap<String, BTreeMap<String, i64>>,
    /// Preparation round entries, pending until the lock.
    pub allocation: BTreeMap<String, Vec<AllocEntry>>,
    pub allocation_locked: bool,
    pub shelter_places: BTreeMap<String, i64>,
    pub cold_bays: BTreeMap<String, i64>,
    /// parish -> CREW tokens received (each repairs roads and power in recovery).
    pub repair_crews: BTreeMap<String, i64>,
    /// route id -> open.
    pub route_open: BTreeMap<String, bool>,
    /// route id -> (cutT, reopenT) overrides from effects.
    pub route_overrides: BTreeMap<String, (Option<i64>, Option<i64>)>,
    pub convoys: Vec<Convoy>,
    pub next_convoy_id: u64,
    pub returning: Vec<ReturningToken>,
    pub calls_open: BTreeMap<String, OpenCall>,
    /// call id -> answer given.
    pub calls_answered: BTreeMap<String, String>,
    /// asker -> holders it has asked.
    pub asked_of: BTreeMap<String, BTreeSet<String>>,
    pub groups: BTreeMap<String, GroupState>,
    pub cards: BTreeMap<String, String>,
    pub flags: BTreeSet<String>,
    pub pending_effects: Vec<PendingEffect>,
    pub next_effect_seq: u64,
    /// Hazards with t in (last_hazard_t, t] apply this tick.
    pub last_hazard_t: i64,
    /// The lowest people-safe count so far (the storm's low point).
    pub lowest_people_safe: i64,
    /// Sum over ticks of the people at risk or injured: people-quarter-hours.
    pub people_ticks_at_risk: i64,
    pub doses: Doses,
    /// Power priority override from a decision (None: the content's list).
    pub power_priority: Option<Vec<String>>,
    pub values_locked: BTreeMap<String, Vec<String>>,
    pub statements: BTreeMap<String, String>,
    /// (parish, dilemma id) scheduled presentations already made.
    pub presented_scheduled: BTreeSet<(String, String)>,
    /// Calls raised from the session schedule.
    pub maydays_raised: BTreeSet<String>,
    pub inputs_applied: usize,
}

impl SimState {
    pub fn level(&self, parish: &str, system: &str) -> f64 {
        self.infra.get(parish).and_then(|m| m.get(system)).copied().unwrap_or(0.0)
    }

    /// Adds `delta` to a system, clamped to 0..100. Returns the applied change
    /// in rounded points (what the log reports).
    pub fn apply(&mut self, parish: &str, system: &str, delta: f64) -> i64 {
        if system == "morale" {
            let m = self.morale.entry(parish.to_string()).or_insert(80.0);
            let before = m.round() as i64;
            *m = (*m + delta).clamp(0.0, 100.0);
            return m.round() as i64 - before;
        }
        let Some(row) = self.infra.get_mut(parish) else { return 0 };
        let Some(v) = row.get_mut(system) else { return 0 };
        let before = v.round() as i64;
        *v = (*v + delta).clamp(0.0, 100.0);
        v.round() as i64 - before
    }

    pub fn schedule(&mut self, mut s: Scheduled) {
        s.seq = self.next_seq;
        self.next_seq += 1;
        self.scheduled.push(s);
    }

    /// Removes and returns every scheduled effect due at or before `t`,
    /// ordered by (due_t, seq).
    pub fn take_due(&mut self, t: i64) -> Vec<Scheduled> {
        let (mut due, rest): (Vec<_>, Vec<_>) = self.scheduled.drain(..).partition(|s| s.due_t <= t);
        self.scheduled = rest;
        due.sort_by_key(|s| (s.due_t, s.seq));
        due
    }

    /// Queues a structured effect for a later tick.
    pub fn defer(&mut self, due_t: i64, parish_id: &str, origin: &str, effects: Effects) {
        let seq = self.next_effect_seq;
        self.next_effect_seq += 1;
        self.pending_effects.push(PendingEffect { due_t, seq, parish_id: parish_id.into(), origin: origin.into(), effects });
    }

    /// Removes and returns every pending structured effect due at or before `t`.
    pub fn take_due_effects(&mut self, t: i64) -> Vec<PendingEffect> {
        let (mut due, rest): (Vec<_>, Vec<_>) = self.pending_effects.drain(..).partition(|s| s.due_t <= t);
        self.pending_effects = rest;
        due.sort_by_key(|s| (s.due_t, s.seq));
        due
    }

    pub fn stock_of(&self, parish: &str, token: &str) -> i64 {
        self.stock.get(parish).and_then(|m| m.get(token)).copied().unwrap_or(0)
    }

    /// Adds `delta` tokens (never below zero). Returns the applied change.
    pub fn add_stock(&mut self, parish: &str, token: &str, delta: i64) -> i64 {
        let e = self.stock.entry(parish.to_string()).or_default().entry(token.to_string()).or_insert(0);
        let before = *e;
        *e = (*e + delta).max(0);
        *e - before
    }

    /// Rounded infrastructure levels for the log and the state hash.
    pub fn infra_rounded(&self) -> BTreeMap<String, BTreeMap<String, i64>> {
        self.infra.iter().map(|(p, row)| (p.clone(), row.iter().map(|(s, v)| (s.clone(), v.round() as i64)).collect())).collect()
    }

    pub fn morale_rounded(&self) -> BTreeMap<String, i64> {
        self.morale.iter().map(|(p, v)| (p.clone(), v.round() as i64)).collect()
    }

    /// Route ids currently cut, in id order.
    pub fn routes_cut(&self) -> Vec<String> {
        self.route_open.iter().filter(|(_, open)| !**open).map(|(id, _)| id.clone()).collect()
    }
}

/// An empty state for unit tests in sibling modules; `sim::init_state` builds the real one.
#[doc(hidden)]
pub fn blank_state() -> SimState {
    SimState {
        t: 0,
        window_idx: 0,
        intensity: 3,
        wind_mph: 0.0,
        infra: BTreeMap::new(),
        morale: BTreeMap::new(),
        morale_pressure: BTreeMap::new(),
        isolated: BTreeSet::new(),
        connected: BTreeMap::new(),
        generator_hours: BTreeMap::new(),
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
        track_strength: 1.0,
        track_shift: 0.0,
        stock: BTreeMap::new(),
        hidden: BTreeMap::new(),
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
        groups: BTreeMap::new(),
        cards: BTreeMap::new(),
        flags: BTreeSet::new(),
        pending_effects: vec![],
        next_effect_seq: 0,
        last_hazard_t: i64::MIN,
        lowest_people_safe: i64::MAX,
        people_ticks_at_risk: 0,
        doses: Doses::default(),
        power_priority: None,
        values_locked: BTreeMap::new(),
        statements: BTreeMap::new(),
        presented_scheduled: BTreeSet::new(),
        maydays_raised: BTreeSet::new(),
        inputs_applied: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> SimState {
        let mut s = blank_state();
        s.infra.insert("keystone".to_string(), BTreeMap::from([("power".to_string(), 50.0)]));
        s
    }

    #[test]
    fn apply_clamps() {
        let mut s = state();
        assert_eq!(s.apply("keystone", "power", -80.0), -50);
        assert_eq!(s.level("keystone", "power"), 0.0);
        assert_eq!(s.apply("keystone", "power", 500.0), 100);
    }

    #[test]
    fn take_due_orders_by_time_then_seq() {
        let mut s = state();
        for (due, p) in [(30, "b"), (15, "a"), (15, "c"), (60, "d")] {
            s.schedule(Scheduled {
                due_t: due,
                seq: 0,
                parish_id: p.into(),
                system: "power".into(),
                delta: -1.0,
                source: ScheduledSource::Cascade { rule_id: "r".into() },
                narrative: String::new(),
                delay_minutes: 0,
            });
        }
        let due: Vec<String> = s.take_due(30).into_iter().map(|x| x.parish_id).collect();
        assert_eq!(due, vec!["a", "c", "b"]);
        assert_eq!(s.scheduled.len(), 1);
    }

    #[test]
    fn stock_never_goes_negative() {
        let mut s = state();
        assert_eq!(s.add_stock("haven", "FUEL", 2), 2);
        assert_eq!(s.add_stock("haven", "FUEL", -5), -2);
        assert_eq!(s.stock_of("haven", "FUEL"), 0);
    }
}
