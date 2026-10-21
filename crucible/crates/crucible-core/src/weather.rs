//! Hurricane timeline: window lookup, weather interpolation, phase mapping,
//! default intensity curve, and the storm track.

use crate::content::{Content, Window};
use crate::rng::SimRng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Weather {
    pub wind_kts: f64,
    pub rain: String,
    pub surge_ft: f64,
    pub hurricane_position: Position,
    /// Extras beyond the contract: raw wind in mph and rain rate.
    pub wind_mph: f64,
    pub rain_in_per_hour: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

pub fn window_t(w: &Window) -> i64 {
    w.t_minus_hours * 60
}

/// Index of the window in force at `t` (the last window whose start <= t).
pub fn window_index(content: &Content, t: i64) -> usize {
    let ws = &content.timeline.hurricane_midas.windows;
    let mut idx = 0;
    for (i, w) in ws.iter().enumerate() {
        if window_t(w) <= t {
            idx = i;
        }
    }
    idx
}

/// Log phase from the timeline phase.
/// watch, warning-free windows:   watch, watch-48            => "watch"
/// storm windows:                 warning, approach, landfall, eye => "crisis"
/// after the storm:               recovery                   => "recovery"
pub fn log_phase(timeline_phase: &str) -> &'static str {
    match timeline_phase {
        "watch" => "watch",
        "recovery" => "recovery",
        _ => "crisis",
    }
}

/// DEGRADATION_RATES key from the timeline phase.
/// watch => watch; warning => warning; approach, landfall, eye => crisis
/// (the eye sits between the front and the backside: nobody repairs yet);
/// recovery => recovery.
pub fn degradation_key(timeline_phase: &str) -> &'static str {
    match timeline_phase {
        "watch" => "watch",
        "warning" => "warning",
        "approach" | "landfall" | "eye" => "crisis",
        _ => "recovery",
    }
}

/// Default Crucible Master dial when no curve is scripted: the window's own
/// `intensity` from the timeline, else by phase (watch 3 then 4, warning 5,
/// approach 7 then 8, landfall 9, eye 7, recovery 5).
pub fn default_intensity(content: &Content, idx: usize) -> i64 {
    let ws = &content.timeline.hurricane_midas.windows;
    let w = &ws[idx];
    if let Some(i) = w.intensity {
        return i.clamp(1, 10);
    }
    let nth_of_phase = ws[..idx].iter().filter(|x| x.phase == w.phase).count();
    match w.phase.as_str() {
        "watch" => 3 + nth_of_phase.min(1) as i64,
        "warning" => 5,
        "approach" => 7 + nth_of_phase.min(1) as i64,
        "landfall" => 9,
        "eye" => 7,
        "recovery" => 5,
        _ => 5,
    }
}

/// Seeded track perturbation: strength in 0.85..1.15 scales wind, rain and
/// surge; shift moves the landfall point along the y axis by up to +-8 map
/// percent. Both stay within the bounds the timeline allows (category 4).
pub fn draw_track(rng: &mut SimRng) -> (f64, f64) {
    (rng.range(0.85, 1.15), rng.range(-8.0, 8.0))
}

fn lerp(a: f64, b: f64, f: f64) -> f64 {
    a + (b - a) * f
}

pub fn rain_label(inches_per_hour: f64) -> &'static str {
    if inches_per_hour <= 0.0 {
        "none"
    } else if inches_per_hour < 0.3 {
        "light"
    } else if inches_per_hour < 1.5 {
        "moderate"
    } else if inches_per_hour < 4.0 {
        "heavy"
    } else {
        "torrential"
    }
}

fn round2(x: f64) -> f64 {
    (x * 100.0).round() / 100.0
}

/// Interpolated weather at `t`, perturbed by the seeded track.
pub fn weather_at(content: &Content, t: i64, strength: f64, shift: f64) -> Weather {
    let ws = &content.timeline.hurricane_midas.windows;
    let idx = window_index(content, t);
    let cur = &ws[idx];
    let (wind, rain, surge) = if idx + 1 < ws.len() {
        let next = &ws[idx + 1];
        let span = (window_t(next) - window_t(cur)) as f64;
        let f = ((t - window_t(cur)) as f64 / span).clamp(0.0, 1.0);
        (
            lerp(cur.weather.wind_mph, next.weather.wind_mph, f),
            lerp(cur.weather.rainfall_inches_per_hour, next.weather.rainfall_inches_per_hour, f),
            lerp(cur.weather.storm_surge_feet, next.weather.storm_surge_feet, f),
        )
    } else {
        (cur.weather.wind_mph, cur.weather.rainfall_inches_per_hour, cur.weather.storm_surge_feet)
    };
    let wind_mph = round2(wind * strength);
    let rain_rate = round2(rain * strength);
    // Track: from (160, 70) off the east coast at T-72 to the island centre
    // (50, 50 + shift) at landfall, then on to (-40, 30 + shift) at T+24.
    let t_start = window_t(&ws[0]) as f64;
    let t_end = window_t(&ws[ws.len() - 1]) as f64;
    let pos = if t <= 0 {
        let f = ((t as f64 - t_start) / (0.0 - t_start)).clamp(0.0, 1.0);
        Position { x: round2(lerp(160.0, 50.0, f)), y: round2(lerp(70.0, 50.0 + shift, f)) }
    } else {
        let f = (t as f64 / t_end).clamp(0.0, 1.0);
        Position { x: round2(lerp(50.0, -40.0, f)), y: round2(lerp(50.0 + shift, 30.0 + shift, f)) }
    };
    Weather {
        wind_kts: round2(wind_mph * 0.868976),
        rain: rain_label(rain_rate).to_string(),
        surge_ft: round2(surge * strength),
        hurricane_position: pos,
        wind_mph,
        rain_in_per_hour: rain_rate,
    }
}

/// Storm severity 0..1.44 used to scale degradation: (wind/130 mph)^2.
pub fn severity(wind_mph: f64) -> f64 {
    (wind_mph / 130.0).clamp(0.0, 1.2).powi(2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phases_map() {
        assert_eq!(log_phase("watch"), "watch");
        assert_eq!(log_phase("approach"), "crisis");
        assert_eq!(log_phase("eye"), "crisis");
        assert_eq!(degradation_key("landfall"), "crisis");
        assert_eq!(degradation_key("eye"), "crisis");
        assert_eq!(degradation_key("recovery"), "recovery");
    }

    #[test]
    fn default_intensity_follows_the_timeline() {
        let c = Content::load(&std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")).unwrap();
        let ws = &c.timeline.hurricane_midas.windows;
        for (i, w) in ws.iter().enumerate() {
            if let Some(x) = w.intensity {
                assert_eq!(default_intensity(&c, i), x.clamp(1, 10));
            }
        }
        let peak = ws.iter().position(|w| w.id == "peak-2").unwrap();
        assert_eq!(default_intensity(&c, peak), 10);
    }

    #[test]
    fn rain_labels() {
        assert_eq!(rain_label(0.0), "none");
        assert_eq!(rain_label(6.0), "torrential");
    }
}
