//! Structured Board effects: what an option, an answered call or a hazard does
//! to residents, doses, stock, routes and flags. Chance outcomes are the only
//! part that draws from the seeded RNG.

use crate::content::{CardEffect, Content, Effects, GroupEffect};
use crate::log::{Event, Team};
use crate::rng::SimRng;
use crate::state::SimState;
use crate::{aid, residents, resources, routes, tally};

/// Everything an effect may touch, bundled so helpers can recurse.
pub struct Ctx<'a> {
    pub content: &'a Content,
    pub state: &'a mut SimState,
    pub rng: &'a mut SimRng,
    pub teams: &'a mut Vec<Team>,
    pub events: &'a mut Vec<Event>,
    pub t: i64,
    pub t_end: i64,
}

impl Ctx<'_> {
    pub fn is_human(&self, parish: &str) -> bool {
        self.teams.iter().any(|t| t.parish_id == parish && t.controller == "human")
    }

    pub fn reject(&mut self, source: &str, parish: &str, reason: String) {
        self.events.push(Event::Rejected { source: source.into(), parish_id: parish.into(), reason });
    }
}

/// Applies `effects` on behalf of `parish`; `origin` names the source for the log.
pub fn apply(ctx: &mut Ctx, effects: &Effects, parish: &str, origin: &str) {
    if effects.unless_flag.as_ref().is_some_and(|f| ctx.state.flags.contains(f)) {
        return;
    }
    if effects.if_flag.as_ref().is_some_and(|f| !ctx.state.flags.contains(f)) {
        return;
    }
    for g in &effects.groups {
        apply_group(ctx, g, parish, origin);
    }
    for c in &effects.cards {
        apply_card(ctx, c, parish, origin);
    }
    for d in &effects.doses {
        match d.at_t {
            Some(at) if at > ctx.t => {
                let mut later = d.clone();
                later.at_t = None;
                ctx.state.defer(at, parish, origin, Effects { doses: vec![later], ..Default::default() });
            }
            _ => tally::apply_dose(ctx.content, ctx.state, d, origin, ctx.events),
        }
    }
    for i in &effects.infrastructure {
        match i.at_t {
            Some(at) if at > ctx.t => {
                let mut later = i.clone();
                later.at_t = None;
                ctx.state.defer(at, parish, origin, Effects { infrastructure: vec![later], ..Default::default() });
            }
            _ => {
                let delta = ctx.state.apply(&i.parish, &i.system, i.delta);
                ctx.events.push(Event::Consequence {
                    dilemma_id: origin.into(),
                    parish_id: i.parish.clone(),
                    system: i.system.clone(),
                    delta,
                    delay_minutes: 0,
                    narrative: String::new(),
                });
            }
        }
    }
    for (p, h) in &effects.generator_hours {
        *ctx.state.generator_hours.entry(p.clone()).or_insert(0.0) += h;
    }
    for (p, n) in &effects.shelter_places {
        *ctx.state.shelter_places.entry(p.clone()).or_insert(0) += n;
    }
    for (p, tokens) in &effects.stock {
        for (token, delta) in tokens {
            ctx.state.add_stock(p, token, *delta);
        }
    }
    if let Some(list) = &effects.power_priority {
        ctx.state.power_priority = Some(list.iter().map(|p| p.to_lowercase()).collect());
    }
    for r in &effects.routes {
        let e = ctx.state.route_overrides.entry(r.id.clone()).or_insert((None, None));
        if r.cut_t.is_some() {
            e.0 = r.cut_t;
        }
        if r.reopen_t.is_some() {
            e.1 = r.reopen_t;
        }
    }
    if effects.declare_hidden {
        if let Err(reason) = resources::declare_hidden(ctx, parish, false) {
            ctx.reject(origin, parish, reason);
        }
    }
    for s in &effects.sends {
        let purpose = format!("effect:{origin}");
        if let Err(reason) = routes::dispatch(ctx.content, ctx.state, ctx.t, parish, &s.to, &s.token, s.count, None, &purpose, None, ctx.events) {
            ctx.reject(origin, parish, reason);
        }
    }
    if let Some(a) = &effects.answers_call {
        aid::answer_via_dilemma(ctx, &a.call_id, &a.answer, parish);
    }
    if let Some(call_id) = &effects.raises_call {
        // A call that can no longer be raised (closed window, already answered) is not an error.
        let _ = aid::raise(ctx, call_id, "effect", None);
    }
    for ch in &effects.chance {
        let hit = ctx.rng.unit() < ch.p;
        ctx.events.push(Event::Chance { parish_id: parish.into(), source: origin.into(), p: ch.p, hit });
        if hit {
            apply(ctx, &ch.then, parish, origin);
        } else if let Some(e) = &ch.otherwise {
            apply(ctx, e, parish, origin);
        }
    }
    for f in &effects.flags {
        ctx.state.flags.insert(f.clone());
    }
}

fn apply_group(ctx: &mut Ctx, g: &GroupEffect, parish: &str, origin: &str) {
    if let Some(at) = g.at_t {
        if at > ctx.t {
            let mut later = g.clone();
            later.at_t = None;
            ctx.state.defer(at, parish, origin, Effects { groups: vec![later], ..Default::default() });
            return;
        }
    }
    let moved = residents::move_group(ctx.state, &g.id, &g.state, g.count, g.from.as_deref());
    if moved <= 0 {
        return;
    }
    ctx.events.push(Event::ResidentState {
        parish_id: residents::parish_of_group(ctx.content, &g.id),
        group_id: Some(g.id.clone()),
        card_id: None,
        state: g.state.clone(),
        count: moved,
        source: origin.into(),
        narrative: String::new(),
    });
    if let Some(until) = g.until_t {
        let then = GroupEffect {
            id: g.id.clone(),
            state: g.then_state.clone().unwrap_or_else(|| "safe".into()),
            count: Some(moved),
            from: Some(g.state.clone()),
            ..Default::default()
        };
        ctx.state.defer(until.max(ctx.t + 1), parish, origin, Effects { groups: vec![then], ..Default::default() });
    }
}

fn apply_card(ctx: &mut Ctx, c: &CardEffect, parish: &str, origin: &str) {
    if let Some(at) = c.at_t {
        if at > ctx.t {
            let mut later = c.clone();
            later.at_t = None;
            ctx.state.defer(at, parish, origin, Effects { cards: vec![later], ..Default::default() });
            return;
        }
    }
    if !residents::set_card(ctx.state, &c.id, &c.state, None) {
        return;
    }
    ctx.events.push(Event::ResidentState {
        parish_id: residents::parish_of_card(ctx.content, &c.id),
        group_id: None,
        card_id: Some(c.id.clone()),
        state: c.state.clone(),
        count: 1,
        source: origin.into(),
        narrative: String::new(),
    });
    if let Some(until) = c.until_t {
        let then = CardEffect { id: c.id.clone(), state: c.then_state.clone().unwrap_or_else(|| "safe".into()), ..Default::default() };
        ctx.state.defer(until.max(ctx.t + 1), parish, origin, Effects { cards: vec![then], ..Default::default() });
    }
}

/// Applies every deferred effect due at or before `t`, in (due, seq) order.
pub fn step_pending(ctx: &mut Ctx) {
    let due = ctx.state.take_due_effects(ctx.t);
    for p in due {
        apply(ctx, &p.effects, &p.parish_id, &p.origin);
    }
}
