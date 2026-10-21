//! Residents: groups counted by state, named cards, and the storm's own
//! hazards. People move between buckets; nothing here draws from the RNG.

use crate::content::Content;
use crate::log::Event;
use crate::state::{GroupState, SimState};
use std::collections::BTreeMap;

pub const STATES: [&str; 6] = ["safe", "sheltered", "at_risk", "rescued", "injured", "lost"];

/// Buckets a move into `state` draws from when no source is named, in order.
/// Sheltered and rescued people are out of the storm's reach: a hazard
/// (`at_risk`) only takes people who are merely safe.
pub fn default_sources(state: &str) -> &'static [&'static str] {
    match state {
        "at_risk" => &["safe"],
        "sheltered" => &["safe", "at_risk"],
        "rescued" => &["at_risk", "injured"],
        "injured" => &["at_risk", "safe"],
        "lost" => &["at_risk", "injured", "safe"],
        "safe" => &["at_risk", "sheltered"],
        _ => &[],
    }
}

pub fn init(content: &Content) -> (BTreeMap<String, GroupState>, BTreeMap<String, String>) {
    let groups = content.residents.groups.iter().map(|g| (g.id.clone(), GroupState { safe: g.size, ..Default::default() })).collect();
    let cards = content.residents.cards.iter().map(|c| (c.id.clone(), "safe".to_string())).collect();
    (groups, cards)
}

/// Moves up to `count` people (all available when None) of `group` into
/// `to`, drawing from `from` or the state's default sources. Returns the
/// number moved.
pub fn move_group(state: &mut SimState, group: &str, to: &str, count: Option<i64>, from: Option<&str>) -> i64 {
    let Some(g) = state.groups.get_mut(group) else { return 0 };
    if g.get_mut(to).is_none() {
        return 0;
    }
    let sources: Vec<&str> = match from {
        Some(f) => vec![f],
        None => default_sources(to).to_vec(),
    };
    let mut remaining = count.unwrap_or(i64::MAX).max(0);
    let mut moved = 0;
    for src in sources {
        if remaining == 0 || src == to {
            continue;
        }
        let avail = g.get(src);
        let take = avail.min(remaining);
        if take > 0 {
            if let Some(s) = g.get_mut(src) {
                *s -= take;
            }
            if let Some(d) = g.get_mut(to) {
                *d += take;
            }
            remaining -= take;
            moved += take;
        }
    }
    moved
}

/// Sets a card's state when its current state is one the move may draw from.
/// Returns whether it changed.
pub fn set_card(state: &mut SimState, card: &str, to: &str, from: Option<&str>) -> bool {
    let Some(cur) = state.cards.get(card).cloned() else { return false };
    if !STATES.contains(&to) || cur == to {
        return false;
    }
    let allowed = match from {
        Some(f) => cur == f,
        None => default_sources(to).contains(&cur.as_str()),
    };
    if !allowed {
        return false;
    }
    state.cards.insert(card.to_string(), to.to_string());
    true
}

pub fn parish_of_group(content: &Content, group: &str) -> String {
    content.residents.groups.iter().find(|g| g.id == group).map(|g| g.parish_id.clone()).unwrap_or_default()
}

pub fn parish_of_card(content: &Content, card: &str) -> String {
    content.residents.cards.iter().find(|c| c.id == card).map(|c| c.parish_id.clone()).unwrap_or_default()
}

/// Applies the hazards with t in (state.last_hazard_t, t], gated by their flags.
pub fn hazards_step(content: &Content, state: &mut SimState, t: i64, events: &mut Vec<Event>) {
    let since = state.last_hazard_t;
    for h in &content.residents.hazards {
        if h.t <= since || h.t > t {
            continue;
        }
        if h.unless_flag.as_ref().is_some_and(|f| state.flags.contains(f)) || h.if_flag.as_ref().is_some_and(|f| !state.flags.contains(f)) {
            continue;
        }
        if let Some(g) = &h.group_id {
            let count = match (h.share, &h.from) {
                (Some(share), Some(from)) => Some((state.groups.get(g).map(|s| s.get(from)).unwrap_or(0) as f64 * share).floor() as i64),
                _ => h.count,
            };
            let moved = move_group(state, g, &h.state, count, h.from.as_deref());
            if moved > 0 {
                events.push(Event::ResidentState {
                    parish_id: parish_of_group(content, g),
                    group_id: Some(g.clone()),
                    card_id: None,
                    state: h.state.clone(),
                    count: moved,
                    source: "storm".into(),
                    narrative: h.narrative.clone(),
                });
            }
        }
        if let Some(c) = &h.card_id {
            if set_card(state, c, &h.state, h.from.as_deref()) {
                events.push(Event::ResidentState {
                    parish_id: parish_of_card(content, c),
                    group_id: None,
                    card_id: Some(c.clone()),
                    state: h.state.clone(),
                    count: 1,
                    source: "storm".into(),
                    narrative: h.narrative.clone(),
                });
            }
        }
    }
    state.last_hazard_t = t;
}

/// Population minus everyone at risk, injured or lost.
pub fn people_safe(content: &Content, state: &SimState) -> i64 {
    let population: i64 = content.parish_ids().iter().filter_map(|p| content.parish(p)).map(|p| p.population as i64).sum();
    let unsafe_total: i64 = state.groups.values().map(|g| g.unsafe_count()).sum();
    (population - unsafe_total).max(0)
}

pub fn totals(state: &SimState) -> (i64, i64, i64) {
    let g = state.groups.values();
    g.fold((0, 0, 0), |(a, b, c), x| (a + x.at_risk, b + x.injured, c + x.lost))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::blank_state;

    fn state() -> SimState {
        let mut s = blank_state();
        s.groups.insert("g".into(), GroupState { safe: 100, ..Default::default() });
        s.cards.insert("c".into(), "safe".into());
        s
    }

    #[test]
    fn sheltered_people_are_out_of_the_storms_reach() {
        let mut s = state();
        assert_eq!(move_group(&mut s, "g", "sheltered", Some(60), None), 60);
        assert_eq!(move_group(&mut s, "g", "at_risk", None, None), 40);
        assert_eq!(move_group(&mut s, "g", "rescued", Some(10), None), 10);
        let g = &s.groups["g"];
        assert_eq!((g.safe, g.sheltered, g.at_risk, g.rescued), (0, 60, 30, 10));
        assert_eq!(g.unsafe_count(), 30);
    }

    #[test]
    fn explicit_source_is_honoured_and_bounded() {
        let mut s = state();
        assert_eq!(move_group(&mut s, "g", "injured", Some(5), Some("at_risk")), 0);
        assert_eq!(move_group(&mut s, "g", "injured", Some(5), Some("safe")), 5);
        assert_eq!(move_group(&mut s, "g", "lost", Some(500), None), 100);
    }

    #[test]
    fn cards_only_move_from_allowed_states() {
        let mut s = state();
        assert!(!set_card(&mut s, "c", "rescued", None));
        assert!(set_card(&mut s, "c", "sheltered", None));
        assert!(!set_card(&mut s, "c", "at_risk", None));
        assert!(set_card(&mut s, "c", "safe", None));
        assert!(set_card(&mut s, "c", "at_risk", None));
        assert!(set_card(&mut s, "c", "rescued", None));
    }
}
