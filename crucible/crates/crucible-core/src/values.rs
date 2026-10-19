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
    ("worker-safety", "safety"), ("crew-safety", "safety"), ("child-safety", "safety"),
    ("system-safety", "safety"), ("existing-safety", "safety"), ("tourist-lives", "safety"),
    ("life-first", "safety"), ("life-saving", "safety"), ("survival", "resilience"),
    ("self-preservation", "stability"), ("corporate-survival", "loyalty"),
    ("corporate-loyalty", "loyalty"), ("corporate-priority", "loyalty"),
    ("corporate-protection", "loyalty"), ("worker-loyalty", "loyalty"),
    ("production", "success"), ("quota", "ambition"), ("quota-pressure", "ambition"),
    ("economics", "success"), ("financial", "stewardship"), ("financial-responsibility", "stewardship"),
    ("cost", "stewardship"), ("value", "stewardship"), ("shareholder-value", "success"),
    ("numbers", "success"), ("efficiency", "competence"), ("expertise", "competence"),
    ("quality", "excellence"), ("quality-control", "excellence"), ("speed", "boldness"),
    ("expedience", "boldness"), ("heroism", "courage"), ("risk-management", "prudence"),
    ("prudence", "preparedness"), ("caution", "preparedness"), ("precaution", "preparedness"),
    ("preparation", "preparedness"), ("known-risk", "preparedness"), ("unknown-risk", "boldness"),
    ("protocol", "discipline"), ("compliance", "obedience"), ("hierarchy", "authority"),
    ("control", "authority"), ("order", "order"), ("panic-prevention", "order"),
    ("continuity", "stability"), ("livelihood", "stability"), ("job-security", "stability"),
    ("long-term", "stewardship"), ("resource-conservation", "stewardship"),
    ("resource-optimization", "competence"), ("environmental", "stewardship"),
    ("agricultural-harm", "stewardship"), ("downstream-harm", "compassion"),
    ("vulnerability", "compassion"), ("mercy", "forgiveness"), ("healing", "kindness"),
    ("medical-care", "service"), ("public-good", "service"), ("mission", "duty"),
    ("demand-pressure", "duty"), ("community", "community"), ("local-priority", "loyalty"),
    ("island-wide", "equality"), ("unity", "loyalty"), ("solidarity", "loyalty"),
    ("worker-solidarity", "loyalty"), ("cooperation", "service"), ("equity", "equality"),
    ("fairness", "fairness"), ("justice", "justice"), ("dignity", "respect"),
    ("worker-voice", "respect"), ("worker-comfort", "kindness"), ("consent", "autonomy"),
    ("crew-autonomy", "autonomy"), ("flexibility", "creativity"), ("change", "creativity"),
    ("systemic-fix", "accountability"), ("accountability", "accountability"),
    ("liability", "accountability"), ("transparency", "honesty"), ("truth", "honesty"),
    ("trust", "honesty"), ("public-trust", "honesty"), ("candor", "candor"),
    ("conscience", "integrity"), ("system-integrity", "integrity"), ("optics", "recognition"),
    ("career", "ambition"), ("self-interest", "ambition"), ("property", "stewardship"),
    ("property-protection", "stewardship"), ("property-rights", "justice"),
    ("tourism-recovery", "success"), ("industrial", "success"), ("capacity", "competence"),
    ("isolation", "independence"), ("disruption", "boldness"),
];

pub fn canonical(content: &Content, key: &str) -> String {
    if content.values.values_deck.iter().any(|v| v.id == key) {
        return key.to_string();
    }
    ALIASES.iter().find(|(k, _)| *k == key).map(|(_, v)| v.to_string()).unwrap_or_else(|| key.to_string())
}

/// Option signals on the -3..3 scale, keyed by canonical value id. When two
/// keys collapse onto one id the larger magnitude wins (ties: first in key order).
pub fn option_signals(content: &Content, option: &DilemmaOption) -> BTreeMap<String, i64> {
    let mut out: BTreeMap<String, i64> = BTreeMap::new();
    for (k, v) in &option.value_alignment {
        let id = canonical(content, k);
        let v = (*v).clamp(-3, 3);
        let e = out.entry(id).or_insert(v);
        if v.abs() > e.abs() {
            *e = v;
        }
    }
    out
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    pub dilemma_id: String,
    pub option_id: String,
    pub signal: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValuesGapRow {
    pub parish_id: String,
    pub value: String,
    pub stated_rank: usize,
    pub enacted_score: f64,
    pub n_decisions: usize,
    pub evidence: Vec<Evidence>,
}

/// For each stated value of each team: the mean enacted signal across the
/// parish's decisions that touched that value.
pub fn values_gap(teams: &[(String, Vec<String>)], decisions: &[DecisionRecord]) -> Vec<ValuesGapRow> {
    let mut rows = Vec::new();
    for (parish_id, stated) in teams {
        for (i, value) in stated.iter().enumerate() {
            let evidence: Vec<Evidence> = decisions
                .iter()
                .filter(|d| &d.parish_id == parish_id)
                .filter_map(|d| {
                    d.values_signaled.get(value).map(|s| Evidence {
                        dilemma_id: d.dilemma_id.clone(),
                        option_id: d.option_id.clone(),
                        signal: *s,
                    })
                })
                .collect();
            let n = evidence.len();
            let score = if n == 0 {
                0.0
            } else {
                let sum: i64 = evidence.iter().map(|e| e.signal).sum();
                ((sum as f64 / n as f64) * 1000.0).round() / 1000.0
            };
            rows.push(ValuesGapRow {
                parish_id: parish_id.clone(),
                value: value.clone(),
                stated_rank: i + 1,
                enacted_score: score,
                n_decisions: n,
                evidence,
            });
        }
    }
    rows
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
