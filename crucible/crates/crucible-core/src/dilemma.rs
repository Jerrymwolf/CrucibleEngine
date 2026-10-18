//! Dilemma selection: by phase, parish, trigger window, intensity bounds,
//! prerequisites and cadence. Order is deterministic from the seeded RNG.

use crate::content::{Content, Dilemma};
use crate::rng::SimRng;
use crate::state::{OpenDilemma, SimState};
use crate::weather::log_phase;

/// Minimum ticks between dilemmas for one parish; shrinks as intensity rises.
pub fn cadence_ticks(intensity: i64) -> i64 {
    (18 - intensity).clamp(4, 16)
}

/// Minutes a team has to decide; shrinks as intensity rises.
pub fn deadline_minutes(intensity: i64) -> i64 {
    ((12 - intensity) * 30).clamp(30, 300)
}

fn window_rank(content: &Content, id: &str) -> Option<usize> {
    content.timeline.hurricane_midas.windows.iter().position(|w| w.id == id)
}

pub fn eligible<'a>(content: &'a Content, state: &SimState, parish: &str) -> Vec<&'a Dilemma> {
    let w = &content.timeline.hurricane_midas.windows[state.window_idx];
    let phase = log_phase(&w.phase);
    content
        .dilemmas
        .all_dilemmas
        .iter()
        .filter(|d| d.parish_id == parish || d.parish_id == "multi")
        .filter(|d| d.phase == phase)
        .filter(|d| !state.used_dilemmas.contains(&d.id))
        .filter(|d| window_rank(content, &d.trigger.timeline_window).map(|r| r <= state.window_idx).unwrap_or(false))
        .filter(|d| {
            let lo = d.trigger.intensity_min.unwrap_or(1);
            let hi = d.trigger.intensity_max.unwrap_or(10);
            state.intensity >= lo && state.intensity <= hi
        })
        .filter(|d| d.trigger.prerequisite_decisions.iter().all(|p| state.decided_dilemmas.contains(p)))
        .collect()
}

/// Presents at most one new dilemma per parish that has none open and whose
/// cadence allows. Returns (parish, dilemma id) pairs presented this tick.
pub fn present(content: &Content, state: &mut SimState, rng: &mut SimRng, step_minutes: i64) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for parish in content.parish_ids() {
        if state.open.contains_key(&parish) {
            continue;
        }
        if let Some(last) = state.last_dilemma_t.get(&parish) {
            if state.t - last < cadence_ticks(state.intensity) * step_minutes {
                continue;
            }
        }
        let mut cands = eligible(content, state, &parish);
        if cands.is_empty() {
            continue;
        }
        rng.shuffle(&mut cands);
        let d = cands[0];
        state.used_dilemmas.insert(d.id.clone());
        state.last_dilemma_t.insert(parish.clone(), state.t);
        state.open.insert(
            parish.clone(),
            OpenDilemma { dilemma_id: d.id.clone(), presented_t: state.t, deadline_t: state.t + deadline_minutes(state.intensity) },
        );
        out.push((parish, d.id.clone()));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cadence_and_deadline_shrink_with_intensity() {
        assert!(cadence_ticks(3) > cadence_ticks(9));
        assert!(deadline_minutes(3) > deadline_minutes(9));
        assert_eq!(deadline_minutes(10), 60);
    }
}
