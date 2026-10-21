//! Routes and convoys. Every route opens and closes on the authored schedule
//! (plus the eye window and any overrides from decisions); a parish is
//! isolated when no road route touching it is open. Convoys carry tokens
//! along a path of open routes and turn back when one is cut under them.
//! Nothing here draws from the RNG.

use crate::content::{Content, Route};
use crate::log::Event;
use crate::state::{Convoy, ReturningToken, SimState};
use crate::STEP_MINUTES;
use std::collections::{BTreeMap, BTreeSet};

/// Wind at or above which road travel takes the degraded time.
pub const DEGRADED_WIND_MPH: f64 = 45.0;

/// Whether `route` is open at `t` under the schedule, the eye window and overrides.
pub fn is_open(content: &Content, state: &SimState, route: &Route, t: i64) -> bool {
    let (cut, reopen) = state.route_overrides.get(&route.id).copied().unwrap_or((None, None));
    let cut_t = cut.or(route.cut_t);
    let reopen_t = reopen.or(route.reopen_t);
    let scheduled_open = match (cut_t, reopen_t) {
        (None, _) => true,
        (Some(c), None) => t < c,
        (Some(c), Some(r)) => t < c || t >= r,
    };
    scheduled_open || (route.eye_open && content.in_eye(t))
}

/// Recomputes every route's state and road isolation for tick `t`.
/// Returns (newly isolated, reconnected); route events go to `events`
/// (none on the first tick, which only sets the baseline).
pub fn step(content: &Content, state: &mut SimState, t: i64, first: bool, events: &mut Vec<Event>) -> (Vec<String>, Vec<String>) {
    for r in &content.routes.routes {
        let open = is_open(content, state, r, t);
        let was = state.route_open.get(&r.id).copied();
        state.route_open.insert(r.id.clone(), open);
        if first || was == Some(open) {
            continue;
        }
        if open {
            events.push(Event::RouteReopened {
                route_id: r.id.clone(),
                name: r.name.clone(),
                mode: r.mode.clone(),
                from: r.from.clone(),
                to: r.to.clone(),
                narrative: if r.narrative_reopen.is_empty() { format!("{} is open again.", r.name) } else { r.narrative_reopen.clone() },
            });
        } else {
            events.push(Event::RouteCut {
                route_id: r.id.clone(),
                name: r.name.clone(),
                mode: r.mode.clone(),
                from: r.from.clone(),
                to: r.to.clone(),
                narrative: if r.narrative_cut.is_empty() { format!("{} is cut.", r.name) } else { r.narrative_cut.clone() },
            });
        }
    }
    let mut touched: BTreeSet<String> = BTreeSet::new();
    for r in &content.routes.routes {
        if r.mode == "road" && state.route_open.get(&r.id).copied().unwrap_or(true) {
            touched.insert(r.from.clone());
            touched.insert(r.to.clone());
        }
    }
    let mut newly = Vec::new();
    let mut restored = Vec::new();
    for p in content.parish_ids() {
        let connected = touched.contains(&p);
        let was = state.isolated.contains(&p);
        if !connected && !was {
            state.isolated.insert(p.clone());
            newly.push(p);
        } else if connected && was {
            state.isolated.remove(&p);
            restored.push(p);
        }
    }
    (newly, restored)
}

fn travel_minutes(route: &Route, degraded: bool) -> i64 {
    if degraded {
        route.degraded_min.unwrap_or(route.travel_min)
    } else {
        route.travel_min
    }
}

/// Shortest path over open road routes by travel time (ties broken by route
/// id), as (route ids, minutes). None when the destination is unreachable.
pub fn road_path(content: &Content, state: &SimState, from: &str, to: &str) -> Option<(Vec<String>, i64)> {
    if from == to {
        return Some((vec![], 0));
    }
    let degraded = state.wind_mph >= DEGRADED_WIND_MPH;
    let open: Vec<&Route> = content.routes.routes.iter().filter(|r| r.mode == "road" && state.route_open.get(&r.id).copied().unwrap_or(true)).collect();
    // Dijkstra over a handful of nodes: a sorted frontier keyed by (minutes, node).
    let mut best: BTreeMap<String, (i64, Vec<String>)> = BTreeMap::new();
    let mut frontier: BTreeSet<(i64, String)> = BTreeSet::new();
    best.insert(from.to_string(), (0, vec![]));
    frontier.insert((0, from.to_string()));
    while let Some((d, node)) = frontier.iter().next().cloned() {
        frontier.remove(&(d, node.clone()));
        if node == to {
            return best.remove(&node).map(|(m, p)| (p, m));
        }
        let path = best[&node].1.clone();
        for r in &open {
            let next = if r.from == node {
                &r.to
            } else if r.to == node {
                &r.from
            } else {
                continue;
            };
            let nd = d + travel_minutes(r, degraded);
            let better = match best.get(next) {
                None => true,
                Some((cur, cur_path)) => nd < *cur || (nd == *cur && path.len() + 1 < cur_path.len()),
            };
            if better {
                if let Some((cur, _)) = best.get(next) {
                    frontier.remove(&(*cur, next.clone()));
                }
                let mut np = path.clone();
                np.push(r.id.clone());
                best.insert(next.clone(), (nd, np));
                frontier.insert((nd, next.clone()));
            }
        }
    }
    None
}

/// Sends `count` of `token` from `from` to `to`. With `route`, travels that
/// one route (any mode) if it is open; otherwise finds a road path. The
/// tokens leave `from`'s stock now. Returns the convoy id.
#[allow(clippy::too_many_arguments)]
pub fn dispatch(
    content: &Content,
    state: &mut SimState,
    t: i64,
    from: &str,
    to: &str,
    token: &str,
    count: i64,
    route: Option<&str>,
    purpose: &str,
    answer: Option<String>,
    events: &mut Vec<Event>,
) -> Result<u64, String> {
    if count <= 0 {
        return Err("nothing to send".into());
    }
    if state.stock_of(from, token) < count {
        return Err(format!("{from} holds {} {token}, not {count}", state.stock_of(from, token)));
    }
    let (path, minutes) = match route {
        Some(id) => {
            let r = content.route(id).ok_or_else(|| format!("unknown route {id}"))?;
            if !state.route_open.get(id).copied().unwrap_or(true) {
                return Err(format!("route {id} is cut"));
            }
            (vec![id.to_string()], travel_minutes(r, state.wind_mph >= DEGRADED_WIND_MPH))
        }
        None => road_path(content, state, from, to).ok_or_else(|| format!("no open road from {from} to {to}"))?,
    };
    state.add_stock(from, token, -count);
    let id = state.next_convoy_id;
    state.next_convoy_id += 1;
    // Arrival lands on a tick boundary at or after the travel time.
    let arrive_t = t + ((minutes + STEP_MINUTES - 1) / STEP_MINUTES).max(1) * STEP_MINUTES;
    let c = Convoy {
        id,
        from: from.into(),
        to: to.into(),
        token: token.into(),
        count,
        path: path.clone(),
        departed_t: t,
        arrive_t,
        purpose: purpose.into(),
        answer,
    };
    events.push(Event::ConvoyDeparted {
        convoy_id: id,
        from: from.into(),
        to: to.into(),
        token: token.into(),
        count,
        route_ids: path,
        arrive_t,
        purpose: purpose.into(),
    });
    state.convoys.push(c);
    Ok(id)
}

/// A convoy that reached its destination this tick.
pub struct Arrival {
    pub to: String,
    pub from: String,
    pub token: String,
    pub count: i64,
    pub purpose: String,
    pub answer: Option<String>,
}

/// Advances every convoy: turns back those whose path was cut (the tokens
/// are lost for the quarter and return to the sender at its end) and
/// delivers those that have arrived. The caller applies what arrivals do.
pub fn convoys_step(content: &Content, state: &mut SimState, t: i64, t_end: i64, events: &mut Vec<Event>) -> Vec<Arrival> {
    let mut arrivals = Vec::new();
    let convoys = std::mem::take(&mut state.convoys);
    let mut keep = Vec::new();
    for c in convoys {
        // A convoy due this tick has already covered its path; only one still
        // on the road can be turned back.
        if t >= c.arrive_t {
            events.push(Event::ConvoyArrived {
                convoy_id: c.id,
                from: c.from.clone(),
                to: c.to.clone(),
                token: c.token.clone(),
                count: c.count,
                purpose: c.purpose.clone(),
            });
            arrivals.push(Arrival { to: c.to, from: c.from, token: c.token, count: c.count, purpose: c.purpose, answer: c.answer });
            continue;
        }
        let cut = c.path.iter().find(|r| !state.route_open.get(*r).copied().unwrap_or(true)).cloned();
        if let Some(route_id) = cut {
            let return_t = content.quarter_end(t, t_end).max(t + STEP_MINUTES);
            let name = content.route(&route_id).map(|r| r.name.clone()).unwrap_or(route_id.clone());
            events.push(Event::ConvoyTurnedBack {
                convoy_id: c.id,
                from: c.from.clone(),
                to: c.to.clone(),
                token: c.token.clone(),
                count: c.count,
                route_id,
                return_t,
                narrative: format!("{} x{} for {} turned back: {} is cut. Back on {}'s sheet at the end of the quarter.", c.token, c.count, c.to, name, c.from),
            });
            state.returning.push(ReturningToken { to: c.from.clone(), token: c.token.clone(), count: c.count, return_t });
            continue;
        }
        keep.push(c);
    }
    state.convoys = keep;
    // Tokens lost for the quarter come back.
    let returning = std::mem::take(&mut state.returning);
    for r in returning {
        if t >= r.return_t {
            state.add_stock(&r.to, &r.token, r.count);
            events.push(Event::TokenReturned { parish_id: r.to, token: r.token, count: r.count });
        } else {
            state.returning.push(r);
        }
    }
    arrivals
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn content() -> Content {
        Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap()
    }

    fn fresh(c: &Content, t: i64) -> SimState {
        let mut rng = crate::rng::SimRng::new(1);
        let mut s = crate::sim::test_state(c, &mut rng);
        s.t = t;
        let mut ev = vec![];
        step(c, &mut s, t, true, &mut ev);
        s
    }

    #[test]
    fn schedule_cuts_and_reopens_and_the_eye_opens_some() {
        let c = content();
        let ring = c.route("ring-gateway-summit").unwrap();
        let s = fresh(&c, -4320);
        assert!(is_open(&c, &s, ring, -2000));
        assert!(!is_open(&c, &s, ring, -1000));
        assert!(is_open(&c, &s, ring, 30), "eye-open route opens in the eye");
        assert!(!is_open(&c, &s, ring, 200));
        assert!(is_open(&c, &s, ring, 1500));
        let bridges = c.route("ring-summit-sterling").unwrap();
        assert!(!is_open(&c, &s, bridges, 30), "a route without eyeOpen stays cut in the eye");
    }

    #[test]
    fn heartland_is_isolated_when_both_crater_roads_are_cut() {
        let c = content();
        let mut s = fresh(&c, -4320);
        let mut ev = vec![];
        let (newly, _) = step(&c, &mut s, -700, false, &mut ev);
        assert!(newly.contains(&"heartland".to_string()));
        assert!(ev.iter().any(|e| matches!(e, Event::RouteCut { route_id, .. } if route_id == "gorge-road")));
        let (_, restored) = step(&c, &mut s, 720, false, &mut ev);
        assert!(restored.contains(&"heartland".to_string()));
    }

    #[test]
    fn road_path_prefers_open_short_routes() {
        let c = content();
        let s = fresh(&c, -4320);
        let (path, minutes) = road_path(&c, &s, "haven", "gateway").unwrap();
        assert_eq!(path, vec!["ring-haven-keystone", "ring-keystone-gateway"]);
        assert_eq!(minutes, 105);
        let s2 = fresh(&c, -1400); // Haven-Keystone cut at -1440: go round by Sterling and Summit
        let (path2, _) = road_path(&c, &s2, "haven", "gateway").unwrap();
        assert_eq!(path2, vec!["ring-sterling-haven", "ring-summit-sterling", "ring-gateway-summit"]);
        assert!(road_path(&c, &s2, "haven", "heartland").is_some());
        let s3 = fresh(&c, -700);
        assert!(road_path(&c, &s3, "haven", "heartland").is_none());
    }

    #[test]
    fn a_convoy_turns_back_when_its_route_is_cut() {
        let c = content();
        let mut s = fresh(&c, -1600);
        let mut ev = vec![];
        // Haven to Heartland by Keystone and the Switchbacks: 45+45 = 90 min, 6 ticks, home before the ring is cut at T-24h.
        let id = dispatch(&c, &mut s, -1600, "haven", "heartland", "FUEL", 1, None, "repair", None, &mut ev).unwrap();
        assert_eq!(s.stock_of("haven", "FUEL"), 3);
        assert!(ev.iter().any(|e| matches!(e, Event::ConvoyDeparted { route_ids, .. } if route_ids == &["ring-haven-keystone", "switchbacks"])));
        let mut t = -1585;
        let mut arrived = false;
        while t <= -1200 {
            step(&c, &mut s, t, false, &mut ev);
            let arr = convoys_step(&c, &mut s, t, 2880, &mut ev);
            if arr.iter().any(|a| a.to == "heartland") {
                arrived = true;
                break;
            }
            t += 15;
        }
        assert!(arrived, "both roads are open until T-24h");
        assert_eq!(t, -1510, "arrival lands on the first tick at or after the travel time");
        assert!(ev.iter().any(|e| matches!(e, Event::ConvoyArrived { convoy_id, .. } if *convoy_id == id)));
        // A second convoy leaves half an hour before the Gorge Road floods and turns back.
        let mut s = fresh(&c, -750);
        dispatch(&c, &mut s, -750, "summit", "heartland", "FUEL", 1, None, "repair", None, &mut ev).unwrap();
        for t in [-735, -720, -705] {
            step(&c, &mut s, t, false, &mut ev);
            convoys_step(&c, &mut s, t, 2880, &mut ev);
        }
        assert!(ev.iter().any(|e| matches!(e, Event::ConvoyTurnedBack { route_id, .. } if route_id == "gorge-road")));
        assert_eq!(s.stock_of("summit", "FUEL"), 0, "lost for the quarter");
        step(&c, &mut s, 360, false, &mut ev);
        convoys_step(&c, &mut s, 360, 2880, &mut ev);
        assert_eq!(s.stock_of("summit", "FUEL"), 1, "returned at the quarter's end");
    }
}
