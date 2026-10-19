//! Content referential-integrity checks (`crucible validate`).

use crate::content::{Content, ContentError};

impl Content {
    /// Referential integrity checks. Returns every problem found.
    pub fn validate(&self) -> Result<(), ContentError> {
        let mut errs: Vec<String> = Vec::new();
        let parishes = self.parish_ids();
        let has_parish = |id: &str| parishes.iter().any(|p| p == &id.to_lowercase());
        let personas = self.persona_ids();
        let windows = &self.timeline.hurricane_midas.windows;
        for d in &self.dilemmas.all_dilemmas {
            if d.parish_id != "multi" && !has_parish(&d.parish_id) {
                errs.push(format!("dilemma {}: unknown parish {}", d.id, d.parish_id));
            }
            if !windows.iter().any(|w| w.id == d.trigger.timeline_window) {
                errs.push(format!("dilemma {}: unknown window {}", d.id, d.trigger.timeline_window));
            }
            for p in d.persona_ids() {
                if !personas.contains(&p) {
                    errs.push(format!("dilemma {}: unknown persona {}", d.id, p));
                }
            }
            if d.options.is_empty() {
                errs.push(format!("dilemma {}: no options", d.id));
            }
        }
        for r in &self.infrastructure.cascade_rules {
            let mut check = |p: &str, s: &str, what: &str| {
                if !has_parish(p) {
                    errs.push(format!("cascade {} {}: unknown parish {}", r.id, what, p));
                }
                if !crate::SYSTEMS.contains(&s) {
                    errs.push(format!("cascade {} {}: unknown system {}", r.id, what, s));
                }
            };
            check(&r.trigger.parish_id, &r.trigger.system, "trigger");
            for e in &r.effects {
                check(&e.parish_id, &e.system, "effect");
            }
        }
        for w in windows.windows(2) {
            if w[1].t_minus_hours <= w[0].t_minus_hours {
                errs.push(format!("timeline: window {} does not follow {}", w[1].id, w[0].id));
            }
        }
        for p in &parishes {
            if !self.infrastructure.initial_infrastructure_status.contains_key(p) {
                errs.push(format!("infrastructure: no initial status for {p}"));
            }
        }
        if errs.is_empty() {
            Ok(())
        } else {
            Err(ContentError::Invalid(errs.join("\n")))
        }
    }
}
