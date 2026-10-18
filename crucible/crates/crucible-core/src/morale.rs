//! REA brief e.3: a morale integrator with inertia per parish, driven by the
//! service deficit and by the value signals of decisions.

use crate::content::Content;
use crate::state::SimState;
use crate::SYSTEMS;
use std::collections::BTreeMap;

/// Constants. `morale_pressure` is an
/// accumulator in -MORALE_PRESSURE_RANGE..+MORALE_PRESSURE_RANGE updated every
/// hour by `(service_index - 1) * MORALE_SERVICE_GAIN + leadership`, where
/// service_index is the parish's total level over its initial total (parity
/// at the pre-storm baseline, so morale holds until the storm bites) and
/// leadership is 50 x the summed value signals of each decision. The gain is
/// a quarter of the reference's 600: our integrator updates hourly over a
/// 96-hour run, the reference's valves saturate over game-years. Morale moves a quarter of the way toward
/// `50 + pressure / 40` every tick (pressure +-2000 maps to morale 0..100).
const MORALE_PRESSURE_RANGE: f64 = 2000.0;
const MORALE_PER_PRESSURE_INV: f64 = 40.0;
const MORALE_SERVICE_GAIN: f64 = 150.0;
const MORALE_LEADERSHIP_GAIN: f64 = 50.0;
const MORALE_ALPHA: f64 = 0.25;
const MORALE_UPDATE_MINUTES: i64 = 60;

/// Total level of the parish's present systems over its initial total: 1.0
/// at the pre-storm baseline.
pub fn service_index(content: &Content, state: &SimState, parish: &str) -> f64 {
    let init = content.infrastructure.initial_infrastructure_status.get(parish);
    let baseline: f64 = SYSTEMS.iter().map(|s| init.and_then(|m| m.get(*s)).copied().unwrap_or(0.0)).sum();
    if baseline <= 0.0 {
        return 1.0;
    }
    SYSTEMS.iter().map(|s| state.level(parish, s)).sum::<f64>() / baseline
}

/// Hourly integrator step and per-tick smoothing of morale toward its target.
/// An isolated parish never recovers (the reference's "no road, no growth").
pub fn step(content: &Content, state: &mut SimState, parish: &str) {
    if state.t % MORALE_UPDATE_MINUTES == 0 {
        let delta = (service_index(content, state, parish) - 1.0) * MORALE_SERVICE_GAIN;
        let p = state.morale_pressure.entry(parish.to_string()).or_insert(0.0);
        *p = (*p + delta).clamp(-MORALE_PRESSURE_RANGE, MORALE_PRESSURE_RANGE);
    }
    let target = (50.0 + state.morale_pressure.get(parish).copied().unwrap_or(0.0) / MORALE_PER_PRESSURE_INV).clamp(0.0, 100.0);
    let m = state.morale.entry(parish.to_string()).or_insert(80.0);
    if target > *m && state.isolated.contains(parish) {
        return;
    }
    *m = (*m + MORALE_ALPHA * (target - *m)).clamp(0.0, 100.0);
}

/// Pressure that holds morale steady at `morale`.
pub fn initial_pressure(morale: f64) -> f64 {
    (morale - 50.0) * MORALE_PER_PRESSURE_INV
}

/// Leadership term: 50 x the summed value signals of a decision.
pub fn add_leadership(state: &mut SimState, parish: &str, signals: &BTreeMap<String, i64>) {
    let leadership = MORALE_LEADERSHIP_GAIN * signals.values().sum::<i64>() as f64;
    let p = state.morale_pressure.entry(parish.to_string()).or_insert(0.0);
    *p = (*p + leadership).clamp(-MORALE_PRESSURE_RANGE, MORALE_PRESSURE_RANGE);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rng::SimRng;
    use crate::sim::test_state;
    use crate::STEP_MINUTES;
    use std::path::PathBuf;

    #[test]
    fn morale_integrator_tracks_service_level() {
        let c = Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap();
        let mut rng = SimRng::new(9);
        let mut state = test_state(&c, &mut rng);
        assert!((service_index(&c, &state, "haven") - 1.0).abs() < 1e-9);
        for s in SYSTEMS {
            state.apply("haven", s, -100.0);
        }
        state.t = -4320;
        for _ in 0..200 {
            step(&c, &mut state, "haven");
            state.t += STEP_MINUTES;
        }
        assert!(state.level("haven", "power") == 0.0);
        assert!(state.morale["haven"] < 10.0, "morale {}", state.morale["haven"]);
        assert!(state.morale_pressure["haven"] >= -MORALE_PRESSURE_RANGE);
    }
}
