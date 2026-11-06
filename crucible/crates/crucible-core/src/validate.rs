//! Content referential-integrity checks (`crucible validate`).

use crate::content::{Content, ContentError, Effects};
use crate::residents::STATES;
use std::collections::BTreeSet;

struct Check<'a> {
    content: &'a Content,
    parishes: Vec<String>,
    tokens: BTreeSet<String>,
    groups: BTreeSet<String>,
    cards: BTreeSet<String>,
    routes: BTreeSet<String>,
    quarters: BTreeSet<String>,
    errs: Vec<String>,
}

impl Check<'_> {
    fn has_parish(&self, id: &str) -> bool {
        self.parishes.iter().any(|p| p == &id.to_lowercase())
    }

    fn parish(&mut self, what: &str, id: &str) {
        if !self.has_parish(id) {
            self.errs.push(format!("{what}: unknown parish {id}"));
        }
    }

    fn token(&mut self, what: &str, id: &str) {
        if !self.tokens.contains(id) {
            self.errs.push(format!("{what}: unknown token {id}"));
        }
    }

    fn state(&mut self, what: &str, s: &str) {
        if !STATES.contains(&s) {
            self.errs.push(format!("{what}: unknown resident state {s}"));
        }
    }

    /// Every id an effects block names must exist.
    fn effects(&mut self, what: &str, e: &Effects) {
        for g in &e.groups {
            if !self.groups.contains(&g.id) {
                self.errs.push(format!("{what}: unknown resident group {}", g.id));
            }
            self.state(what, &g.state);
            if let Some(s) = &g.then_state {
                self.state(what, s);
            }
        }
        for c in &e.cards {
            if !self.cards.contains(&c.id) {
                self.errs.push(format!("{what}: unknown resident card {}", c.id));
            }
            self.state(what, &c.state);
        }
        for i in &e.infrastructure {
            self.parish(what, &i.parish);
            if !crate::SYSTEMS.contains(&i.system.as_str()) {
                self.errs.push(format!("{what}: unknown system {}", i.system));
            }
        }
        for p in e.generator_hours.keys().chain(e.shelter_places.keys()).chain(e.stock.keys()) {
            self.parish(what, p);
        }
        for tokens in e.stock.values() {
            for t in tokens.keys() {
                self.token(what, t);
            }
        }
        for p in e.power_priority.iter().flatten() {
            self.parish(what, p);
        }
        for s in &e.sends {
            self.parish(what, &s.to);
            self.token(what, &s.token);
        }
        if let Some(a) = &e.answers_call {
            match self.content.aid.call(&a.call_id) {
                None => self.errs.push(format!("{what}: answers unknown call {}", a.call_id)),
                Some(c) if !c.answers.contains_key(&a.answer) => self.errs.push(format!("{what}: call {} has no answer {}", a.call_id, a.answer)),
                _ => {}
            }
        }
        if let Some(id) = &e.raises_call {
            if self.content.aid.call(id).is_none() {
                self.errs.push(format!("{what}: raises unknown call {id}"));
            }
        }
        for r in &e.routes {
            if !self.routes.contains(&r.id) {
                self.errs.push(format!("{what}: unknown route {}", r.id));
            }
        }
        for ch in &e.chance {
            if !(0.0..=1.0).contains(&ch.p) {
                self.errs.push(format!("{what}: chance {} outside 0..1", ch.p));
            }
            self.effects(what, &ch.then);
            if let Some(o) = &ch.otherwise {
                self.effects(what, o);
            }
        }
    }
}

impl Content {
    /// Referential integrity checks. Returns every problem found.
    pub fn validate(&self) -> Result<(), ContentError> {
        let mut k = Check {
            content: self,
            parishes: self.parish_ids(),
            tokens: self.resources.tokens.keys().cloned().collect(),
            groups: self.residents.groups.iter().map(|g| g.id.clone()).collect(),
            cards: self.residents.cards.iter().map(|c| c.id.clone()).collect(),
            routes: self.routes.routes.iter().map(|r| r.id.clone()).collect(),
            quarters: self.timeline.hurricane_midas.quarters.iter().map(|q| q.id.clone()).collect(),
            errs: Vec::new(),
        };
        let personas = self.persona_ids();
        let windows = &self.timeline.hurricane_midas.windows;
        for d in &self.dilemmas.all_dilemmas {
            let what = format!("dilemma {}", d.id);
            if d.parish_id != "multi" {
                k.parish(&what, &d.parish_id);
            }
            if !windows.iter().any(|w| w.id == d.trigger.timeline_window) {
                k.errs.push(format!("{what}: unknown window {}", d.trigger.timeline_window));
            }
            for p in d.persona_ids() {
                if !personas.contains(&p) {
                    k.errs.push(format!("{what}: unknown persona {p}"));
                }
            }
            if d.options.is_empty() {
                k.errs.push(format!("{what}: no options"));
            }
            if let Some(id) = &d.default_option_id {
                if !d.options.iter().any(|o| &o.id == id) {
                    k.errs.push(format!("{what}: default option {id} is not one of its options"));
                }
            }
            for o in &d.options {
                k.effects(&format!("{what} option {}", o.id), &o.effects);
            }
        }
        for r in &self.infrastructure.cascade_rules {
            let what = format!("cascade {}", r.id);
            for (p, s, which) in
                std::iter::once((&r.trigger.parish_id, &r.trigger.system, "trigger")).chain(r.effects.iter().map(|e| (&e.parish_id, &e.system, "effect")))
            {
                k.parish(&format!("{what} {which}"), p);
                if !crate::SYSTEMS.contains(&s.as_str()) {
                    k.errs.push(format!("{what} {which}: unknown system {s}"));
                }
            }
        }
        for w in windows.windows(2) {
            if w[1].t_minus_hours <= w[0].t_minus_hours {
                k.errs.push(format!("timeline: window {} does not follow {}", w[1].id, w[0].id));
            }
        }
        for q in self.timeline.hurricane_midas.quarters.windows(2) {
            if q[1].from_t != q[0].to_t {
                k.errs.push(format!("timeline: quarter {} does not follow {}", q[1].id, q[0].id));
            }
        }
        for p in k.parishes.clone() {
            if !self.infrastructure.initial_infrastructure_status.contains_key(&p) {
                k.errs.push(format!("infrastructure: no initial status for {p}"));
            }
        }
        for r in &self.routes.routes {
            let what = format!("route {}", r.id);
            for end in [&r.from, &r.to] {
                if end != "mainland" && !k.has_parish(end) {
                    k.errs.push(format!("{what}: unknown endpoint {end}"));
                }
            }
            if let (Some(c), Some(o)) = (r.cut_t, r.reopen_t) {
                if o <= c {
                    k.errs.push(format!("{what}: reopens at {o}, before it is cut at {c}"));
                }
            }
        }
        for c in &self.aid.calls {
            let what = format!("call {}", c.id);
            k.parish(&what, &c.asker);
            k.parish(&what, &c.holder);
            if let Some(t) = &c.token {
                k.token(&what, t);
            }
            if let Some(r) = &c.route {
                if !k.routes.contains(r) {
                    k.errs.push(format!("{what}: unknown route {r}"));
                }
            }
            if !k.quarters.is_empty() && !k.quarters.contains(&c.quarter) {
                k.errs.push(format!("{what}: unknown quarter {}", c.quarter));
            }
            if !c.answers.contains_key(&c.silence_answer) {
                k.errs.push(format!("{what}: silence answer {} is not one of its answers", c.silence_answer));
            }
            for (a, e) in c.effects.iter().chain(c.delivered.iter()) {
                if !c.answers.contains_key(a) {
                    k.errs.push(format!("{what}: effects for unknown answer {a}"));
                }
                k.effects(&format!("{what} answer {a}"), e);
            }
        }
        for g in &self.residents.groups {
            k.parish(&format!("resident group {}", g.id), &g.parish_id);
            if g.size <= 0 {
                k.errs.push(format!("resident group {}: size {}", g.id, g.size));
            }
        }
        for c in &self.residents.cards {
            k.parish(&format!("resident card {}", c.id), &c.parish_id);
            if !k.groups.contains(&c.group_id) {
                k.errs.push(format!("resident card {}: unknown group {}", c.id, c.group_id));
            }
        }
        for h in &self.residents.hazards {
            let what = format!("hazard at {} ({})", h.t, h.group_id.as_deref().or(h.card_id.as_deref()).unwrap_or("?"));
            k.state(&what, &h.state);
            if let Some(g) = &h.group_id {
                if !k.groups.contains(g) {
                    k.errs.push(format!("{what}: unknown group {g}"));
                }
            }
            if let Some(c) = &h.card_id {
                if !k.cards.contains(c) {
                    k.errs.push(format!("{what}: unknown card {c}"));
                }
            }
            if h.group_id.is_none() && h.card_id.is_none() {
                k.errs.push(format!("{what}: names neither a group nor a card"));
            }
        }
        for (p, tokens) in &self.resources.stockpiles {
            let what = format!("stockpile {p}");
            k.parish(&what, p);
            for t in tokens.keys() {
                k.token(&what, t);
            }
        }
        for (p, tokens) in &self.resources.hidden {
            let what = format!("hidden stock {p}");
            k.parish(&what, p);
            // Counts are tokens; other entries (a `note`) are prose.
            for (t, _) in tokens.iter().filter(|(_, v)| v.is_i64()) {
                k.token(&what, t);
            }
        }
        for (p, by_quarter) in &self.resources.needs {
            let what = format!("needs {p}");
            k.parish(&what, p);
            for (q, tokens) in by_quarter {
                if !k.quarters.is_empty() && !k.quarters.contains(q) {
                    k.errs.push(format!("{what}: unknown quarter {q}"));
                }
                for t in tokens.keys() {
                    k.token(&what, t);
                }
            }
        }
        // Scoring tables must land on the values deck, or the gap never sees them.
        for (rule, signals) in &self.resources.signals {
            for v in signals.keys() {
                let id = crate::values::canonical(self, v);
                if !self.values.values_deck.iter().any(|c| c.id == id) {
                    k.errs.push(format!("resources signal {rule}: unknown value {v}"));
                }
            }
        }
        for c in &self.aid.calls {
            for (a, answer) in &c.answers {
                for v in answer.signals.keys() {
                    let id = crate::values::canonical(self, v);
                    if !self.values.values_deck.iter().any(|c| c.id == id) {
                        k.errs.push(format!("call {} answer {a}: unknown value {v}", c.id));
                    }
                }
            }
        }
        if k.errs.is_empty() {
            Ok(())
        } else {
            Err(ContentError::Invalid(k.errs.join("\n")))
        }
    }
}
