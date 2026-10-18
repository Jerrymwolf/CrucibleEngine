//! Micropolis-derived connectivity. Power, water and communications flow from
//! their sources over links; a parish not reached loses the system at a
//! bounded rate unless it has backup generators (power only). Roads form a
//! separate graph; a parish with no passable path to another is isolated.

use crate::content::Content;
use crate::state::SimState;
use std::collections::{BTreeMap, BTreeSet, VecDeque};

/// Level at or below which a system counts as failed (INFRASTRUCTURE_THRESHOLDS.FAILED).
pub fn failed_threshold(content: &Content) -> f64 {
    content.infrastructure.infrastructure_thresholds.get("FAILED").copied().unwrap_or(20.0)
}

/// Points lost per tick while disconnected and without backup.
pub fn loss_per_tick(system: &str) -> f64 {
    match system {
        "power" => 4.0,
        "water" => 2.0,
        "communications" => 3.0,
        _ => 0.0,
    }
}

/// Hours of backup per generator unit in `resources.generators`.
pub const HOURS_PER_GENERATOR: f64 = 1.5;

/// Undirected utility links: every road segment between real parishes plus
/// every `providesTo` dependency edge. Ring/crater virtual nodes are expanded
/// so "ring" connects to each ring-road parish.
pub fn utility_links(content: &Content) -> BTreeMap<String, BTreeSet<String>> {
    let mut adj: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut add = |a: &str, b: &str| {
        adj.entry(a.to_string()).or_default().insert(b.to_string());
        adj.entry(b.to_string()).or_default().insert(a.to_string());
    };
    for (a, b) in road_edges(content) {
        add(&a, &b);
    }
    for (from, dep) in &content.concordia.parish_dependencies {
        for to in &dep.provides_to {
            add(&from.to_lowercase(), &to.to_lowercase());
        }
    }
    adj
}

/// Road edges between real parishes, expanding the virtual "ring" node.
fn road_edges(content: &Content) -> Vec<(String, String)> {
    let ring: BTreeSet<String> = content
        .concordia
        .ring_road
        .segments
        .iter()
        .flat_map(|s| [s.from.to_lowercase(), s.to.to_lowercase()])
        .collect();
    let mut edges = Vec::new();
    for s in &content.concordia.ring_road.segments {
        edges.push((s.from.to_lowercase(), s.to.to_lowercase()));
    }
    for s in &content.concordia.crater_roads.segments {
        let ends: Vec<Vec<String>> = [&s.from, &s.to]
            .iter()
            .map(|e| if e.as_str() == "ring" { ring.iter().cloned().collect() } else { vec![e.to_lowercase()] })
            .collect();
        for a in &ends[0] {
            for b in &ends[1] {
                edges.push((a.clone(), b.clone()));
            }
        }
    }
    edges
}

fn flood_fill(adj: &BTreeMap<String, BTreeSet<String>>, sources: &[String], passable: impl Fn(&str) -> bool) -> BTreeSet<String> {
    let mut seen: BTreeSet<String> = BTreeSet::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    for s in sources {
        if passable(s) && seen.insert(s.clone()) {
            queue.push_back(s.clone());
        }
    }
    while let Some(n) = queue.pop_front() {
        if let Some(ns) = adj.get(&n) {
            for m in ns {
                if seen.contains(m) {
                    continue;
                }
                // A parish is reached through its neighbour; it only relays
                // further if its own copy of the system is above failed.
                seen.insert(m.clone());
                if passable(m) {
                    queue.push_back(m.clone());
                }
            }
        }
    }
    seen
}

/// Sources per system. Comms fall back to the backup site when the primary
/// tower has failed.
pub fn sources(content: &Content, state: &SimState, system: &str) -> Vec<String> {
    let infra = &content.concordia.infrastructure;
    let failed = failed_threshold(content);
    match system {
        "power" => vec![infra.power.source.to_lowercase()],
        "water" => vec![infra.water.source.to_lowercase()],
        "communications" => {
            let primary = infra.comms.primary.to_lowercase();
            if state.level(&primary, "communications") > failed {
                vec![primary]
            } else {
                infra.comms.backup.iter().map(|b| b.to_lowercase()).collect()
            }
        }
        _ => vec![],
    }
}

/// Connectivity event emitted by `step`.
#[derive(Debug, Clone)]
pub struct ConnectivityChange {
    pub parish_id: String,
    pub system: String,
    /// lost | restored | backup | backup_exhausted
    pub status: String,
    pub source: String,
}

/// One tick of utility connectivity. Returns the changes to log.
/// `repairing` (eye and recovery windows) suspends the drain: crews are
/// reconnecting, so a disconnected parish holds its level instead of losing it.
pub fn step(content: &Content, state: &mut SimState, step_minutes: i64, repairing: bool) -> Vec<ConnectivityChange> {
    let adj = utility_links(content);
    let failed = failed_threshold(content);
    let parishes = content.parish_ids();
    let mut changes = Vec::new();
    for system in ["power", "water", "communications"] {
        let srcs = sources(content, state, system);
        let reached = flood_fill(&adj, &srcs, |p| state.level(p, system) > failed);
        let before = state.connected.get(system).cloned().unwrap_or_default();
        let source_name = srcs.first().cloned().unwrap_or_default();
        for p in &parishes {
            let now = reached.contains(p);
            let was = before.contains(p);
            if now && !was {
                changes.push(ConnectivityChange { parish_id: p.clone(), system: system.into(), status: "restored".into(), source: source_name.clone() });
            }
            if !now {
                let mut status = "lost";
                if system == "power" {
                    let hours = state.generator_hours.entry(p.clone()).or_insert(0.0);
                    if *hours > 0.0 {
                        *hours = (*hours - step_minutes as f64 / 60.0).max(0.0);
                        status = if *hours > 0.0 { "backup" } else { "backup_exhausted" };
                    }
                }
                if (status == "lost" || status == "backup_exhausted") && !repairing {
                    state.apply(p, system, -loss_per_tick(system));
                }
                if was || (status == "backup_exhausted") {
                    changes.push(ConnectivityChange { parish_id: p.clone(), system: system.into(), status: status.into(), source: source_name.clone() });
                }
            }
        }
        state.connected.insert(system.to_string(), reached);
    }
    changes
}

/// Road isolation for this tick. Returns (newly isolated, newly reconnected).
pub fn roads_step(content: &Content, state: &mut SimState, wind_mph: f64, rain_in_per_hour: f64) -> (Vec<String>, Vec<String>) {
    let failed = failed_threshold(content);
    let parishes = content.parish_ids();
    let mut adj: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let passable = |p: &str| state.level(p, "roads") > failed;
    let ring: Vec<String> = content.concordia.ring_road.segments.iter().map(|s| s.from.to_lowercase()).collect();
    let mut add = |a: &str, b: &str| {
        if passable(a) && passable(b) {
            adj.entry(a.to_string()).or_default().insert(b.to_string());
            adj.entry(b.to_string()).or_default().insert(a.to_string());
        }
    };
    for s in &content.concordia.ring_road.segments {
        add(&s.from.to_lowercase(), &s.to.to_lowercase());
    }
    for s in &content.concordia.crater_roads.segments {
        // Crater roads close in hurricane-force wind (>= 65 mph) when not storm
        // passable, and flood-risk roads close in rain of 2 in/h or more.
        if s.storm_passable == Some(false) && wind_mph >= 65.0 {
            continue;
        }
        if s.flood_risk == Some(true) && rain_in_per_hour >= 2.0 {
            continue;
        }
        let expand = |e: &str| if e == "ring" { ring.clone() } else { vec![e.to_lowercase()] };
        for a in expand(&s.from) {
            for b in expand(&s.to) {
                add(&a, &b);
            }
        }
    }
    let mut newly = Vec::new();
    let mut restored = Vec::new();
    for p in &parishes {
        let connected = adj.get(p).map(|n| !n.is_empty()).unwrap_or(false);
        let was = state.isolated.contains(p);
        if !connected && !was {
            state.isolated.insert(p.clone());
            newly.push(p.clone());
        } else if connected && was {
            state.isolated.remove(p);
            restored.push(p.clone());
        }
    }
    (newly, restored)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::Content;
    use std::path::PathBuf;

    fn content() -> Content {
        Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap()
    }

    #[test]
    fn ring_node_expands_to_ring_parishes() {
        let c = content();
        let adj = utility_links(&c);
        // summit reaches the ring through the crater road and heartland directly
        let summit = &adj["summit"];
        assert!(summit.contains("heartland"));
        assert!(summit.contains("gateway") && summit.contains("haven"));
        assert!(!adj.contains_key("ring"));
    }

    #[test]
    fn loss_rates_are_bounded_and_zero_for_local_systems() {
        assert!(loss_per_tick("power") > 0.0 && loss_per_tick("power") <= 5.0);
        assert_eq!(loss_per_tick("hospital"), 0.0);
    }
}
