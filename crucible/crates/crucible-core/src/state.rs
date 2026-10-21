//! Mutable simulation state. Everything that reaches the output lives in
//! ordered containers so iteration order is stable.

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

#[derive(Debug, Clone)]
pub struct DecisionRecord {
    pub t: i64,
    pub parish_id: String,
    pub dilemma_id: String,
    pub option_id: String,
    pub controller: String,
    pub values_signaled: BTreeMap<String, i64>,
}

#[derive(Debug, Clone)]
pub struct SimState {
    pub t: i64,
    pub window_idx: usize,
    pub intensity: i64,
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

    /// Rounded infrastructure levels for the log and the state hash.
    pub fn infra_rounded(&self) -> BTreeMap<String, BTreeMap<String, i64>> {
        self.infra.iter().map(|(p, row)| (p.clone(), row.iter().map(|(s, v)| (s.clone(), v.round() as i64)).collect())).collect()
    }

    pub fn morale_rounded(&self) -> BTreeMap<String, i64> {
        self.morale.iter().map(|(p, v)| (p.clone(), v.round() as i64)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> SimState {
        let mut infra = BTreeMap::new();
        infra.insert("keystone".to_string(), BTreeMap::from([("power".to_string(), 50.0)]));
        SimState {
            t: 0,
            window_idx: 0,
            intensity: 3,
            infra,
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
        }
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
}
