//! The session profile (`content/sessions/*.json`) as the host reads it: the
//! roster, the quarters and their pacing, the values deck, the secret briefs
//! and the parts the core acts on (`crucible_core::Session`).

use anyhow::{anyhow, Context, Result};
use crucible_core::{Content, Session, STEP_MINUTES};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

/// One quarter of play: a sim span and the real seconds the room gives it.
#[derive(Debug, Clone, Serialize)]
pub struct Quarter {
    pub index: usize,
    pub id: String,
    pub title: String,
    pub from_t: i64,
    pub to_t: i64,
    pub phase: String,
    pub card_seconds: f64,
    pub play_seconds: f64,
    pub close_seconds: f64,
    pub human_deadline_ticks: Option<i64>,
    pub mayday_answer_ticks: Option<i64>,
    /// How many ticks the DM's heat takes off (and cool adds to) the windows
    /// that open after it, about 20 seconds of room time in each quarter.
    pub heat_step_ticks: i64,
    pub second_move: Option<String>,
    pub card: String,
}

impl Quarter {
    pub fn ticks(&self) -> i64 {
        ((self.to_t - self.from_t) / STEP_MINUTES).max(1)
    }

    /// Real seconds per tick at `speed` (1.0 is the room's tempo).
    pub fn seconds_per_tick(&self, speed: f64) -> f64 {
        self.play_seconds / self.ticks() as f64 / speed.max(1e-6)
    }
}

#[derive(Debug, Clone)]
pub struct Profile {
    pub id: String,
    pub title: String,
    /// Human tables, as parish ids.
    pub roster: Vec<String>,
    pub quarters: Vec<Quarter>,
    pub values_deck: Vec<String>,
    pub values_to_pick: usize,
    pub statement_template: String,
    pub answer_reasons: Vec<String>,
    pub credit_prompt: String,
    pub commitment: String,
    pub debrief_question: String,
    pub secret_briefs: BTreeMap<String, String>,
    pub secret_order: Vec<String>,
    pub seed: Option<u64>,
    /// The parts the core acts on.
    pub core: Session,
}

fn strings(v: Option<&Value>) -> Vec<String> {
    v.and_then(|v| v.as_array()).map(|a| a.iter().filter_map(|s| s.as_str().map(String::from)).collect()).unwrap_or_default()
}

fn text(v: &Value, key: &str) -> String {
    v.get(key).and_then(|s| s.as_str()).unwrap_or_default().to_string()
}

fn num(v: &Value, key: &str) -> Option<f64> {
    v.get(key).and_then(|n| n.as_f64())
}

impl Profile {
    /// Resolves `arg` as a path to a profile or an id under `<content>/sessions`.
    pub fn load(content_dir: &Path, arg: &str) -> Result<Value> {
        let path = PathBuf::from(arg);
        let path = if path.is_file() { path } else { content_dir.join("sessions").join(format!("{arg}.json")) };
        let s = std::fs::read_to_string(&path).with_context(|| format!("reading session profile {}", path.display()))?;
        serde_json::from_str(&s).with_context(|| format!("parsing {}", path.display()))
    }

    /// Reads a profile. `t_start` and `t_end` bound the synthetic single
    /// quarter used when a profile has none.
    pub fn parse(content: &Content, profile: &Value, t_start: i64, t_end: i64) -> Result<Profile> {
        let core = Session::from_profile(profile).map_err(|e| anyhow!("session profile: {e}"))?;
        let id = profile.get("id").and_then(|v| v.as_str()).unwrap_or("session").to_string();
        let title = profile.get("title").and_then(|v| v.as_str()).unwrap_or(&id).to_string();
        let parish_ids = content.parish_ids();
        let mut roster = strings(profile.get("roster")).into_iter().map(|p| p.to_lowercase()).collect::<Vec<_>>();
        if roster.is_empty() {
            roster = parish_ids.clone();
        }
        for p in &roster {
            if !parish_ids.contains(p) {
                return Err(anyhow!("profile roster names unknown parish {p}"));
            }
        }
        let mut quarters = Vec::new();
        if let Some(qs) = profile.get("quarters").and_then(|q| q.as_array()) {
            for (index, q) in qs.iter().enumerate() {
                let from_t = q.get("fromT").and_then(|v| v.as_i64()).ok_or_else(|| anyhow!("quarter {index} lacks fromT"))?;
                let to_t = q.get("toT").and_then(|v| v.as_i64()).ok_or_else(|| anyhow!("quarter {index} lacks toT"))?;
                if to_t <= from_t || (to_t - from_t) % STEP_MINUTES != 0 {
                    return Err(anyhow!("quarter {index} spans {from_t}..{to_t}; it must be a positive whole number of ticks"));
                }
                quarters.push(Quarter {
                    index,
                    id: text(q, "id"),
                    title: text(q, "title"),
                    from_t,
                    to_t,
                    phase: text(q, "phase"),
                    card_seconds: num(q, "cardSeconds").unwrap_or(90.0),
                    play_seconds: num(q, "playSeconds").unwrap_or(660.0),
                    close_seconds: num(q, "closeSeconds").unwrap_or(150.0),
                    human_deadline_ticks: q.get("humanDeadlineTicks").and_then(|v| v.as_i64()),
                    mayday_answer_ticks: q.get("maydayAnswerTicks").and_then(|v| v.as_i64()),
                    heat_step_ticks: q.get("heatStepTicks").and_then(|v| v.as_i64()).unwrap_or(0),
                    second_move: q.get("secondMove").and_then(|v| v.as_str()).map(String::from),
                    card: text(q, "card"),
                });
            }
            for w in quarters.windows(2) {
                if w[1].from_t != w[0].to_t {
                    return Err(anyhow!("quarters {} and {} do not meet: {} vs {}", w[0].id, w[1].id, w[0].to_t, w[1].from_t));
                }
            }
            if quarters[0].from_t != t_start || quarters[quarters.len() - 1].to_t != t_end {
                return Err(anyhow!("quarters must cover the run {t_start}..{t_end}"));
            }
        } else {
            quarters.push(Quarter {
                index: 0,
                id: "play".into(),
                title: title.clone(),
                from_t: t_start,
                to_t: t_end,
                phase: String::new(),
                card_seconds: 0.0,
                play_seconds: 3600.0,
                close_seconds: 0.0,
                human_deadline_ticks: None,
                mayday_answer_ticks: None,
                heat_step_ticks: 0,
                second_move: None,
                card: String::new(),
            });
        }
        let mut values_deck = strings(profile.get("valuesDeck"));
        if values_deck.is_empty() {
            values_deck = content.values.values_deck.iter().map(|v| v.id.clone()).collect();
        }
        let secret_briefs = profile
            .get("secretBriefs")
            .and_then(|b| b.as_object())
            .map(|m| m.iter().filter_map(|(k, v)| v.as_str().map(|s| (k.to_lowercase(), s.to_string()))).collect())
            .unwrap_or_default();
        Ok(Profile {
            id,
            title,
            roster,
            quarters,
            values_deck,
            values_to_pick: profile.get("valuesToPick").and_then(|v| v.as_u64()).unwrap_or(3) as usize,
            statement_template: text(profile, "statementTemplate"),
            answer_reasons: strings(profile.get("answerReasons")),
            credit_prompt: profile.get("creditLine").map(|c| text(c, "prompt")).unwrap_or_default(),
            commitment: text(profile, "commitment"),
            debrief_question: text(profile, "debriefQuestion"),
            secret_briefs,
            secret_order: strings(profile.get("secretOrder")),
            seed: profile.get("seed").and_then(|v| v.as_u64()),
            core,
        })
    }

    /// The quarter whose span holds tick `t` (`from_t < t <= to_t`, the first
    /// quarter also at its `from_t`).
    pub fn quarter_at(&self, t: i64) -> Option<&Quarter> {
        self.quarters.iter().find(|q| (q.from_t < t && t <= q.to_t) || (q.index == 0 && t == q.from_t))
    }

    pub fn brief(&self, parish: &str) -> Option<&str> {
        self.secret_briefs.get(parish).map(String::as_str)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn content() -> Content {
        Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap()
    }

    #[test]
    fn parish_90_parses_with_four_quarters_and_six_briefs() {
        let c = content();
        let v = Profile::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content"), "parish-90").unwrap();
        let p = Profile::parse(&c, &v, -4320, 2880).unwrap();
        assert_eq!(p.quarters.len(), 4);
        assert_eq!(p.quarters[0].ticks(), 144);
        assert!((p.quarters[0].seconds_per_tick(1.0) - 660.0 / 144.0).abs() < 1e-9);
        assert!((p.quarters[2].seconds_per_tick(10.0) - 660.0 / 48.0 / 10.0).abs() < 1e-9);
        assert_eq!(p.roster.len(), 6);
        assert_eq!(p.secret_briefs.len(), 6);
        assert_eq!(p.values_to_pick, 3);
        assert_eq!(p.quarter_at(-4320).unwrap().index, 0);
        assert_eq!(p.quarter_at(-2160).unwrap().index, 0);
        assert_eq!(p.quarter_at(-2145).unwrap().index, 1);
        assert_eq!(p.quarter_at(2880).unwrap().index, 3);
        assert!(p.core.allocation_lock_t.is_some());
    }

    #[test]
    fn a_profile_without_quarters_gets_one_synthetic_quarter() {
        let c = content();
        let v = serde_json::json!({ "id": "x", "ask": {} });
        let p = Profile::parse(&c, &v, -4320, 2880).unwrap();
        assert_eq!(p.quarters.len(), 1);
        assert_eq!((p.quarters[0].from_t, p.quarters[0].to_t), (-4320, 2880));
        assert_eq!(p.roster.len(), 6, "no roster: every parish is a table");
        assert_eq!(p.values_deck.len(), c.values.values_deck.len());
    }
}
