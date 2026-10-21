//! The doses tally: production at Keystone while power, water and concentrate
//! hold; loading of the consignment; the ship that sails at its hour; the
//! vault's battery; the next consignment. No RNG.

use crate::connectivity::failed_threshold;
use crate::content::{Content, DoseEffect};
use crate::log::Event;
use crate::state::{Doses, SimState};
use crate::STEP_MINUTES;

pub fn init(content: &Content) -> Doses {
    let Some(spec) = &content.production.production else { return Doses::default() };
    Doses {
        vault: spec.vault.starting_doses,
        works_hours: spec.works.stock_hours_true,
        production_rate: 1.0,
        load_start_t: spec.consignment.load_start_t,
        load_rate_factor: 1.0,
        loaded: 0.0,
        consignment_cap: spec.consignment.doses - spec.consignment.batch47_doses,
        sail_t: spec.consignment.sail_t,
        ship_sailed: false,
        shipped: 0.0,
        held: 0.0,
        lost: 0.0,
        battery_minutes: spec.vault.battery_hours * 60.0,
        next_consignment_done: false,
    }
}

/// One tick of the tally.
pub fn step(content: &Content, state: &mut SimState, t: i64, events: &mut Vec<Event>) {
    let Some(spec) = &content.production.production else { return };
    let failed = failed_threshold(content);
    let step_h = STEP_MINUTES as f64 / 60.0;
    let keystone_power = state.level("keystone", "power");
    let keystone_water = state.level("keystone", "water");
    let haven_port = state.level("haven", "port");
    let generator = state.generator_hours.get("keystone").copied().unwrap_or(0.0);
    let conditions = spec.production_conditions.as_ref();
    let power_min = conditions.map(|c| c.keystone_power_min).unwrap_or(30.0);
    let water_min = conditions.map(|c| c.keystone_water_min).unwrap_or(30.0);
    let d = &mut state.doses;
    // The vault stays cold on grid power or a generator; otherwise its battery runs down.
    if keystone_power > failed || generator > 0.0 {
        d.battery_minutes = spec.vault.battery_hours * 60.0;
    } else {
        d.battery_minutes -= STEP_MINUTES as f64;
        if d.battery_minutes <= 0.0 && d.vault > 0.0 {
            let lost = d.vault.round() as i64;
            d.lost += d.vault;
            d.vault = 0.0;
            events.push(Event::DosesLost { doses: lost, reason: "the cold vault's battery is exhausted".into() });
        }
    }
    if keystone_power >= power_min && keystone_water >= water_min && d.works_hours > 0.0 && d.production_rate > 0.0 {
        let made = spec.doses_per_hour * d.production_rate * step_h;
        d.vault = (d.vault + made).min(spec.vault.capacity_doses);
        d.works_hours = (d.works_hours - step_h).max(0.0);
    }
    if !d.ship_sailed && t >= d.load_start_t && d.loaded < d.consignment_cap && haven_port > failed {
        let rate = spec.consignment.doses / spec.consignment.load_hours * d.load_rate_factor * step_h;
        let take = rate.min(d.consignment_cap - d.loaded).min(d.vault).max(0.0);
        d.vault -= take;
        d.loaded += take;
    }
    if !d.ship_sailed && t >= d.sail_t {
        d.ship_sailed = true;
        d.shipped += d.loaded;
        events.push(Event::ShipSailed { consignment: "Kestrel Reach".into(), doses: d.loaded.round() as i64 });
    }
    if !d.next_consignment_done && t >= spec.next_consignment.t {
        d.next_consignment_done = true;
        let road_open = state.route_open.get("ring-haven-keystone").copied().unwrap_or(true);
        let reason = if haven_port <= failed {
            Some("Haven's port is down")
        } else if keystone_power <= failed {
            Some("Keystone has no power")
        } else if !road_open {
            Some("the Haven-Keystone road is cut")
        } else {
            None
        };
        match reason {
            None => {
                let doses = d.vault.min(spec.consignment.doses);
                d.vault -= doses;
                d.shipped += doses;
                events.push(Event::ShipSailed { consignment: "next".into(), doses: doses.round() as i64 });
            }
            Some(r) => events.push(Event::ConsignmentMissed { consignment: "next".into(), reason: r.into() }),
        }
    }
}

/// Applies one structured dose effect now. Doses a negative `vault` removes
/// feed `aboard`, `held` and `shipped` in the same effect first; what none
/// of them takes is lost. `origin` names the decision for the log.
pub fn apply_dose(content: &Content, state: &mut SimState, e: &DoseEffect, origin: &str, events: &mut Vec<Event>) {
    let capacity = content.production.production.as_ref().map(|s| s.vault.capacity_doses).unwrap_or(f64::MAX);
    let full = content.production.production.as_ref().map(|s| s.consignment.doses).unwrap_or(0.0);
    let d = &mut state.doses;
    // Doses taken out of the vault by this effect and not yet placed.
    let mut pool = 0.0;
    if let Some(v) = e.vault {
        if v >= 0.0 {
            d.vault = (d.vault + v).min(capacity);
        } else {
            pool = (-v).min(d.vault);
            d.vault -= pool;
        }
    }
    // Takes `want` doses: from the pool first, then from the vault.
    let take = |want: f64, pool: &mut f64, vault: &mut f64| -> f64 {
        let from_pool = want.max(0.0).min(*pool);
        *pool -= from_pool;
        let from_vault = (want - from_pool).max(0.0).min(*vault);
        *vault -= from_vault;
        from_pool + from_vault
    };
    if let Some(h) = e.works_hours {
        d.works_hours = (d.works_hours + h).max(0.0);
    }
    if let Some(r) = e.production_rate {
        d.production_rate = r.max(0.0);
    }
    if let Some(t0) = e.load_start_t {
        d.load_start_t = t0;
    }
    if let Some(f) = e.load_rate_factor {
        d.load_rate_factor = f.max(0.0);
    }
    if let Some(h) = e.sail_delay_hours {
        if !d.ship_sailed {
            d.sail_t += (h * 60.0).round() as i64;
            d.consignment_cap = full.max(d.consignment_cap);
        }
    }
    if let Some(a) = e.aboard {
        if !d.ship_sailed {
            d.loaded += take(a, &mut pool, &mut d.vault);
        }
    }
    if let Some(h) = e.held {
        d.held += take(h, &mut pool, &mut d.vault);
    }
    if let Some(s) = e.shipped {
        d.shipped += take(s, &mut pool, &mut d.vault);
    }
    if pool > 0.0 {
        d.lost += pool;
        events.push(Event::DosesLost { doses: pool.round() as i64, reason: origin.into() });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn a_vault_removal_nobody_takes_is_lost() {
        let c = content();
        let mut rng = crate::rng::SimRng::new(1);
        let mut s = crate::sim::test_state(&c, &mut rng);
        let mut ev = vec![];
        apply_dose(&c, &mut s, &DoseEffect { vault: Some(-24_000.0), held: Some(10_000.0), ..Default::default() }, "A7:grant", &mut ev);
        assert_eq!(s.doses.vault.round() as i64, 48_000);
        assert_eq!(s.doses.held.round() as i64, 10_000);
        assert_eq!(s.doses.lost.round() as i64, 14_000);
        assert!(ev.iter().any(|e| matches!(e, Event::DosesLost { doses, reason } if *doses == 14_000 && reason == "A7:grant")));
    }

    fn content() -> Content {
        Content::load(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap()
    }

    #[test]
    fn the_ship_sails_with_the_consignment_less_batch_47() {
        let c = content();
        let mut rng = crate::rng::SimRng::new(1);
        let mut s = crate::sim::test_state(&c, &mut rng);
        let mut ev = vec![];
        let mut t = -4320;
        while t <= -1800 {
            step(&c, &mut s, t, &mut ev);
            t += 15;
        }
        assert!(s.doses.ship_sailed);
        assert_eq!(s.doses.shipped.round() as i64, 96_000);
        // 72,000 at T-72h plus 42 hours of production, less the consignment: the rest stays cold.
        assert_eq!(s.doses.vault.round() as i64, 18_250);
        assert!(ev.iter().any(|e| matches!(e, Event::ShipSailed { doses, .. } if *doses == 96_000)));
    }

    #[test]
    fn holding_the_ship_takes_batch_47_aboard() {
        let c = content();
        let mut rng = crate::rng::SimRng::new(1);
        let mut s = crate::sim::test_state(&c, &mut rng);
        let mut ev = vec![];
        let mut t = -4320;
        while t <= -1400 {
            if t == -2100 {
                apply_dose(
                    &c,
                    &mut s,
                    &DoseEffect { sail_delay_hours: Some(6.0), aboard: Some(24_000.0), vault: Some(-24_000.0), ..Default::default() },
                    "A2:grant",
                    &mut ev,
                );
            }
            step(&c, &mut s, t, &mut ev);
            t += 15;
        }
        assert!(ev.iter().all(|e| !matches!(e, Event::DosesLost { .. })), "moving batch 47 aboard loses nothing");
        assert!(s.doses.ship_sailed, "the held ship sails six hours late, at T-24h");
        assert!(s.doses.shipped > 110_000.0, "the whole consignment goes: {}", s.doses.shipped);
        assert!(ev.iter().any(|e| matches!(e, Event::ShipSailed { doses, .. } if *doses > 110_000)));
    }
}
