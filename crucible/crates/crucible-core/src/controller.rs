//! Controllers decide open dilemmas. `script` replays a provided option,
//! `ai` runs the drift model, `human` never decides headlessly.

use crate::content::{Content, Dilemma, DilemmaOption};
use crate::rng::SimRng;
use crate::state::{OpenDilemma, SimState};
use crate::values::{canonical, option_signals};
use std::collections::BTreeMap;

/// Scripted decision for one dilemma id. `t` pins the decision tick (used by
/// replay); without it the script decides on the first tick after presentation.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScriptedDecision {
    pub option_id: String,
    #[serde(default)]
    pub rationale: Option<String>,
    #[serde(default)]
    pub t: Option<i64>,
}

/// Who decides for a parish and with what.
#[derive(Clone, Copy)]
pub struct TeamInput<'a> {
    pub controller: &'a str,
    pub stated: &'a [String],
    pub scripted: &'a BTreeMap<String, ScriptedDecision>,
}

pub struct Choice {
    pub option_id: String,
    pub rationale: String,
    pub controller: String,
    pub expired: bool,
    pub pressure: f64,
}

/// Keys whose positive alignment reads as expedient under pressure, and keys
/// whose positive alignment is the costly, other-regarding choice. Used to
/// derive an option's expedience score since the content carries none.
const EXPEDIENT: &[&str] = &["success", "ambition", "stewardship", "competence", "boldness", "authority", "order", "loyalty", "stability", "recognition"];
const COSTLY: &[&str] = &["safety", "equality", "fairness", "justice", "honesty", "compassion", "service", "community", "respect", "accountability", "integrity", "candor", "kindness"];

pub fn expedience(content: &Content, option: &DilemmaOption) -> f64 {
    let sig = option_signals(content, option);
    let mut score = 0.0;
    for (k, v) in &sig {
        if EXPEDIENT.contains(&k.as_str()) {
            score += *v as f64;
        } else if COSTLY.contains(&k.as_str()) {
            score -= *v as f64;
        }
    }
    (score / 6.0).clamp(-1.0, 1.0)
}

/// Rank-weighted alignment of an option with the team's stated values, -1..1.
pub fn alignment(content: &Content, option: &DilemmaOption, stated: &[String]) -> f64 {
    let sig = option_signals(content, option);
    let mut num = 0.0;
    let mut den = 0.0;
    for (i, v) in stated.iter().enumerate() {
        let w = 1.0 / (i as f64 + 1.0);
        den += w;
        num += w * *sig.get(&canonical(content, v)).unwrap_or(&0) as f64 / 3.0;
    }
    if den == 0.0 { 0.0 } else { num / den }
}

/// Pressure 0..1: intensity, the parish's own infrastructure loss, and time
/// remaining before the deadline.
pub fn pressure(state: &SimState, parish: &str, open: &OpenDilemma) -> f64 {
    let loss = 1.0 - ["power", "communications", "water", "roads"].iter().map(|s| state.level(parish, s)).sum::<f64>() / 400.0;
    let span = (open.deadline_t - open.presented_t).max(1) as f64;
    let time = 1.0 - ((open.deadline_t - state.t) as f64 / span).clamp(0.0, 1.0);
    (0.45 * state.intensity as f64 / 10.0 + 0.35 * loss + 0.2 * time).clamp(0.0, 1.0)
}

fn rationale(dilemma: &Dilemma, option: &DilemmaOption, stated: &[String], p: f64) -> String {
    let value = stated.first().cloned().unwrap_or_else(|| "our charter".into());
    let persona = dilemma.persona_ids().first().cloned().unwrap_or_else(|| "the team".into());
    if p < 0.35 {
        format!("Holding to {value}: {}. {}", option.label, option.consequence_sketch.immediate)
    } else if p < 0.65 {
        format!("With {persona} pressing and conditions worsening, {} looked like the only workable path; we will revisit {value} once the storm passes.", option.label.to_lowercase())
    } else {
        format!("No time left. {}. {value} will have to wait.", option.label)
    }
}

/// Decides the open dilemma for `parish` if its controller is ready this tick.
/// The AI noise draw happens for every controller so the RNG stream does not
/// depend on who decides; that is what makes replay reproduce the run.
pub fn decide(content: &Content, state: &SimState, rng: &mut SimRng, parish: &str, team: &TeamInput, open: &OpenDilemma) -> Option<Choice> {
    let TeamInput { controller, stated, scripted } = *team;
    let dilemma = content.dilemmas.all_dilemmas.iter().find(|d| d.id == open.dilemma_id)?;
    let p = pressure(state, parish, open);
    let noise: Vec<f64> = dilemma.options.iter().map(|_| rng.range(-0.05, 0.05)).collect();
    let script = scripted.get(&dilemma.id);
    let expired = state.t >= open.deadline_t;
    if let Some(s) = script {
        let due = s.t.map(|t| state.t >= t).unwrap_or(true);
        if !due && !expired {
            return None;
        }
        let option = dilemma.options.iter().find(|o| o.id == s.option_id).unwrap_or(&dilemma.options[0]);
        return Some(Choice {
            option_id: option.id.clone(),
            rationale: s.rationale.clone().unwrap_or_else(|| rationale(dilemma, option, stated, p)),
            // A human team's entered decision arrives as a script; keep its label.
            controller: if controller == "human" { "human".into() } else { "script".into() },
            expired: false,
            pressure: p,
        });
    }
    if controller == "human" || (controller == "script" && script.is_none()) {
        if !expired {
            return None;
        }
        let option = &dilemma.options[0];
        return Some(Choice {
            option_id: option.id.clone(),
            rationale: "Deadline passed with no decision; default option applied.".into(),
            controller: controller.into(),
            expired: true,
            pressure: p,
        });
    }
    // ai: decide once half the window has elapsed (or at the deadline).
    let half = open.presented_t + (open.deadline_t - open.presented_t) / 2;
    if state.t < half && !expired {
        return None;
    }
    let mut best: Option<(f64, &DilemmaOption)> = None;
    for (o, n) in dilemma.options.iter().zip(noise) {
        let score = alignment(content, o, stated) * (1.0 - p) + expedience(content, o) * p + n;
        if best.map(|(b, _)| score > b).unwrap_or(true) {
            best = Some((score, o));
        }
    }
    let (_, option) = best?;
    Some(Choice {
        option_id: option.id.clone(),
        rationale: rationale(dilemma, option, stated, p),
        controller: "ai".into(),
        expired: false,
        pressure: p,
    })
}

/// Whether a canonical value id is one of the costly, other-regarding values.
pub fn is_costly(id: &str) -> bool {
    COSTLY.contains(&id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn content() -> Content {
        Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap()
    }

    #[test]
    fn pressure_rises_with_intensity_and_loss() {
        let c = content();
        let mut rng = SimRng::new(5);
        let mut state = crate::sim::test_state(&c, &mut rng);
        let open = OpenDilemma { dilemma_id: "x".into(), presented_t: state.t, deadline_t: state.t + 120 };
        let calm = pressure(&state, "keystone", &open);
        state.intensity = 9;
        let tense = pressure(&state, "keystone", &open);
        state.apply("keystone", "power", -100.0);
        let dark = pressure(&state, "keystone", &open);
        assert!(calm < tense && tense < dark);
        assert!((0.0..=1.0).contains(&dark));
    }

    #[test]
    fn expedience_and_alignment_have_expected_signs() {
        let c = content();
        let d = c.dilemmas.all_dilemmas.iter().find(|d| d.id == "watch-keystone-01").unwrap();
        let cont = d.options.iter().find(|o| o.id == "continue").unwrap();
        let halt = d.options.iter().find(|o| o.id == "halt-now").unwrap();
        assert!(expedience(&c, cont) > expedience(&c, halt));
        let safety_first = vec!["safety".to_string()];
        assert!(alignment(&c, halt, &safety_first) > alignment(&c, cont, &safety_first));
    }
}
