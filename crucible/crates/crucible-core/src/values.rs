//! Values vocabulary: maps the free-form keys used in dilemma options and
//! parish `valuesTested` lists onto the 40 ids of VALUES_DECK, computes the
//! per-option signals (-3..3) and the end-of-run values gap.

use crate::content::{Content, DilemmaOption};
use crate::rng::SimRng;
use crate::state::DecisionRecord;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Deterministic alias table: content key -> VALUES_DECK id. Exact deck ids
/// pass through unchanged; keys not listed here and not in the deck are kept
/// verbatim so no signal is lost.
const ALIASES: &[(&str, &str)] = &[
    ("worker-safety", "safety"),
    ("crew-safety", "safety"),
    ("child-safety", "safety"),
    ("system-safety", "safety"),
    ("existing-safety", "safety"),
    ("tourist-lives", "safety"),
    ("life-first", "safety"),
    ("life-saving", "safety"),
    ("survival", "resilience"),
    ("self-preservation", "stability"),
    ("corporate-survival", "loyalty"),
    ("corporate-loyalty", "loyalty"),
    ("corporate-priority", "loyalty"),
    ("corporate-protection", "loyalty"),
    ("worker-loyalty", "loyalty"),
    ("production", "success"),
    ("quota", "ambition"),
    ("quota-pressure", "ambition"),
    ("economics", "success"),
    ("financial", "stewardship"),
    ("financial-responsibility", "stewardship"),
    ("cost", "stewardship"),
    ("value", "stewardship"),
    ("shareholder-value", "success"),
    ("numbers", "success"),
    ("efficiency", "competence"),
    ("expertise", "competence"),
    ("quality", "excellence"),
    ("quality-control", "excellence"),
    ("speed", "boldness"),
    ("expedience", "boldness"),
    ("heroism", "courage"),
    ("risk-management", "prudence"),
    ("prudence", "preparedness"),
    ("caution", "preparedness"),
    ("precaution", "preparedness"),
    ("preparation", "preparedness"),
    ("known-risk", "preparedness"),
    ("unknown-risk", "boldness"),
    ("protocol", "discipline"),
    ("compliance", "obedience"),
    ("hierarchy", "authority"),
    ("control", "authority"),
    ("order", "order"),
    ("panic-prevention", "order"),
    ("continuity", "stability"),
    ("livelihood", "stability"),
    ("job-security", "stability"),
    ("long-term", "stewardship"),
    ("resource-conservation", "stewardship"),
    ("resource-optimization", "competence"),
    ("environmental", "stewardship"),
    ("agricultural-harm", "stewardship"),
    ("downstream-harm", "compassion"),
    ("vulnerability", "compassion"),
    ("mercy", "forgiveness"),
    ("healing", "kindness"),
    ("medical-care", "service"),
    ("public-good", "service"),
    ("mission", "duty"),
    ("demand-pressure", "duty"),
    ("community", "community"),
    ("local-priority", "loyalty"),
    ("island-wide", "equality"),
    ("unity", "loyalty"),
    ("solidarity", "loyalty"),
    ("worker-solidarity", "loyalty"),
    ("cooperation", "service"),
    ("equity", "equality"),
    ("fairness", "fairness"),
    ("justice", "justice"),
    ("dignity", "respect"),
    ("worker-voice", "respect"),
    ("worker-comfort", "kindness"),
    ("consent", "autonomy"),
    ("crew-autonomy", "autonomy"),
    ("flexibility", "creativity"),
    ("change", "creativity"),
    ("systemic-fix", "accountability"),
    ("accountability", "accountability"),
    ("liability", "accountability"),
    ("transparency", "honesty"),
    ("truth", "honesty"),
    ("trust", "honesty"),
    ("public-trust", "honesty"),
    ("candor", "candor"),
    ("conscience", "integrity"),
    ("system-integrity", "integrity"),
    ("optics", "recognition"),
    ("career", "ambition"),
    ("self-interest", "ambition"),
    ("property", "stewardship"),
    ("property-protection", "stewardship"),
    ("property-rights", "justice"),
    ("tourism-recovery", "success"),
    ("industrial", "success"),
    ("capacity", "competence"),
    ("isolation", "independence"),
    ("disruption", "boldness"),
];

pub fn canonical(content: &Content, key: &str) -> String {
    if content.values.values_deck.iter().any(|v| v.id == key) {
        return key.to_string();
    }
    ALIASES.iter().find(|(k, _)| *k == key).map(|(_, v)| v.to_string()).unwrap_or_else(|| key.to_string())
}

/// A signal table on the -3..3 scale, keyed by canonical value id. When two
/// keys collapse onto one id the larger magnitude wins (ties: first in key order).
pub fn canonical_signals(content: &Content, raw: &BTreeMap<String, i64>) -> BTreeMap<String, i64> {
    let mut out: BTreeMap<String, i64> = BTreeMap::new();
    for (k, v) in raw {
        let id = canonical(content, k);
        let v = (*v).clamp(-3, 3);
        let e = out.entry(id).or_insert(v);
        if v.abs() > e.abs() {
            *e = v;
        }
    }
    out
}

/// Option signals: the option's `valueAlignment` made canonical.
pub fn option_signals(content: &Content, option: &DilemmaOption) -> BTreeMap<String, i64> {
    canonical_signals(content, &option.value_alignment)
}

/// Default stated values for a parish: its `valuesTested` mapped to deck ids,
/// de-duplicated, then filled out to five with seeded picks from the deck.
pub fn default_stated_values(content: &Content, parish_id: &str, rng: &mut SimRng) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    if let Some(p) = content.parish(parish_id) {
        for v in &p.values_tested {
            let id = canonical(content, v);
            if content.values.values_deck.iter().any(|c| c.id == id) && !out.contains(&id) {
                out.push(id);
            }
        }
    }
    let mut pool: Vec<String> = content.values.values_deck.iter().map(|c| c.id.clone()).collect();
    rng.shuffle(&mut pool);
    for id in pool {
        if out.len() >= 5 {
            break;
        }
        if !out.contains(&id) {
            out.push(id);
        }
    }
    out.truncate(5);
    out
}

/// One moment behind a values-gap row. `kind` says what `dilemma_id` names:
/// a dilemma, an allocation entry (`allocate:TOKEN`), a call for aid, a
/// repair send or a line of credit. `moment` groups the records that count
/// as one moment: a card, a call for aid, the allocation round, a declare,
/// or the recovery quarter's credit lines and repair sends.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    #[serde(default = "dilemma_kind")]
    pub kind: String,
    pub dilemma_id: String,
    pub option_id: String,
    /// The moment's strongest signal on this value; 0 for a storm moment,
    /// which carries no rating.
    pub signal: i64,
    /// "storm" when no answer was given and the clock decided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decided_by: Option<String>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub moment: String,
}

fn dilemma_kind() -> String {
    "dilemma".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValuesGapRow {
    pub parish_id: String,
    pub value: String,
    pub stated_rank: usize,
    /// Deprecated (2026-10-21): the mean of the chosen moments' signals,
    /// kept for the legacy replay viewer only. The session screens show the
    /// evidence and never a mean.
    pub enacted_score: f64,
    /// Chosen moments that touched the value.
    pub n_decisions: usize,
    /// False when fewer than two chosen moments touched the value.
    #[serde(default)]
    pub tested: bool,
    /// Storm moments on cards that test the value: no answer was given.
    #[serde(default)]
    pub n_storm: usize,
    pub evidence: Vec<Evidence>,
}

/// The moment a record belongs to. Allocation entries share the round;
/// recovery credit lines and repair sends share the quarter.
pub fn moment_of(d: &DecisionRecord) -> String {
    match d.kind.as_str() {
        "allocation" if d.dilemma_id == "declare_hidden" => "declare".into(),
        "allocation" => "allocation".into(),
        "repair" | "credit" => "recovery-support".into(),
        _ => format!("{}:{}", d.kind, d.dilemma_id),
    }
}

/// For each stated value of each team: one piece of evidence per moment
/// (the strongest signal within it; ties go to the negative), storm moments
/// listed apart and unrated, and whether the value was tested at all.
pub fn values_gap(content: &Content, teams: &[(String, Vec<String>)], decisions: &[DecisionRecord]) -> Vec<ValuesGapRow> {
    let mut rows = Vec::new();
    for (parish_id, stated) in teams {
        for (i, value) in stated.iter().enumerate() {
            let mut by_moment: BTreeMap<String, Evidence> = BTreeMap::new();
            let mut order: Vec<String> = Vec::new();
            for d in decisions.iter().filter(|d| &d.parish_id == parish_id) {
                let storm = d.decided_by.as_deref() == Some("storm");
                let signal = if storm {
                    if !tests_value(content, d, value) {
                        continue;
                    }
                    0
                } else {
                    match d.values_signaled.get(value) {
                        Some(s) => *s,
                        None => continue,
                    }
                };
                let m = moment_of(d);
                let e = Evidence {
                    kind: d.kind.clone(),
                    dilemma_id: d.dilemma_id.clone(),
                    option_id: d.option_id.clone(),
                    signal,
                    decided_by: d.decided_by.clone(),
                    moment: m.clone(),
                };
                match by_moment.get_mut(&m) {
                    None => {
                        order.push(m.clone());
                        by_moment.insert(m, e);
                    }
                    Some(cur) => {
                        if signal.abs() > cur.signal.abs() || (signal.abs() == cur.signal.abs() && signal < cur.signal) {
                            *cur = e;
                        }
                    }
                }
            }
            let evidence: Vec<Evidence> = order.into_iter().filter_map(|m| by_moment.remove(&m)).collect();
            let chosen: Vec<&Evidence> = evidence.iter().filter(|e| e.decided_by.as_deref() != Some("storm")).collect();
            let n = chosen.len();
            let score = if n == 0 {
                0.0
            } else {
                let sum: i64 = chosen.iter().map(|e| e.signal).sum();
                ((sum as f64 / n as f64) * 1000.0).round() / 1000.0
            };
            rows.push(ValuesGapRow {
                parish_id: parish_id.clone(),
                value: value.clone(),
                stated_rank: i + 1,
                enacted_score: score,
                n_decisions: n,
                tested: n >= 2,
                n_storm: evidence.len() - n,
                evidence,
            });
        }
    }
    rows
}

/// Whether a record's card or call tests `value`: a dilemma's
/// `valuesTested`, or any option's signals touching it.
fn tests_value(content: &Content, d: &DecisionRecord, value: &str) -> bool {
    match d.kind.as_str() {
        "dilemma" => content.dilemma(&d.dilemma_id).is_some_and(|dl| {
            dl.values_tested.iter().any(|v| canonical(content, v) == value)
                || dl.options.iter().any(|o| option_signals(content, o).contains_key(value))
        }),
        "aid" => content.aid.call(&d.dilemma_id).is_some_and(|c| c.answers.values().any(|a| canonical_signals(content, &a.signals).contains_key(value))),
        // The allocation round tests what its scoring rules touch.
        "allocation" => content.resources.signals.values().any(|rule| canonical_signals(content, rule).contains_key(value)),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alias_table_has_no_duplicate_keys() {
        let mut keys: Vec<&str> = ALIASES.iter().map(|(k, _)| *k).collect();
        keys.sort();
        let n = keys.len();
        keys.dedup();
        assert_eq!(n, keys.len());
    }
}
