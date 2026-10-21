//! Calls for aid: raised by the schedule, a table or an effect; answered by
//! the holder (a table, the drift rule for an ai parish, or silence at the
//! deadline); the token travels by the call's route and may be lost to it.

use crate::content::AidCall;
use crate::effects::{self, Ctx};
use crate::log::Event;
use crate::routes::{self, Arrival};
use crate::state::{DecisionRecord, OpenCall, ReturningToken};
use crate::values::canonical_signals;
use crate::STEP_MINUTES;
use std::collections::BTreeMap;

/// Default answer window in ticks when neither the call nor the session says.
pub const DEFAULT_ANSWER_TICKS: i64 = 22;

/// Raises a call. Fails when it is unknown, already raised, or its window has closed.
pub fn raise(ctx: &mut Ctx, call_id: &str, raised_by: &str, answer_ticks: Option<i64>) -> Result<(), String> {
    let call = ctx.content.aid.call(call_id).ok_or_else(|| format!("unknown call {call_id}"))?.clone();
    if ctx.state.calls_open.contains_key(call_id) || ctx.state.calls_answered.contains_key(call_id) {
        return Err(format!("call {call_id} was already raised"));
    }
    if ctx.t > call.window_closes_t {
        return Err(format!("call {call_id}: its window closed at {}", call.window_closes_t));
    }
    let ticks = answer_ticks.or(call.answer_ticks).unwrap_or(DEFAULT_ANSWER_TICKS).max(1);
    let deadline_t = (ctx.t + ticks * STEP_MINUTES).min(call.window_closes_t).max(ctx.t);
    ctx.state.calls_open.insert(call_id.into(), OpenCall { call_id: call_id.into(), opened_t: ctx.t, deadline_t, raised_by: raised_by.into() });
    ctx.state.asked_of.entry(call.asker.clone()).or_default().insert(call.holder.clone());
    ctx.events.push(Event::Mayday {
        call_id: call_id.into(),
        asker: call.asker.clone(),
        holder: call.holder.clone(),
        token: call.token.clone(),
        count: call.count,
        deadline_t,
        persona_id: call.persona_id.clone(),
        line: call.line.clone(),
        ask: call.ask.clone(),
        raised_by: raised_by.into(),
    });
    Ok(())
}

/// Tokens an answer moves: the call's count for `grant`, the answer's own
/// count (never more than the call's) for a partial answer such as `part`,
/// nothing for a refusal or any other answer. A table may send fewer.
fn tokens_for(call: &AidCall, answer: &str, count: Option<i64>) -> i64 {
    if call.token.is_none() {
        return 0;
    }
    let nominal = match (answer, call.answers.get(answer).and_then(|a| a.count)) {
        ("grant", _) => call.count,
        (_, Some(n)) => n.min(call.count),
        _ => 0,
    };
    count.map(|c| c.min(nominal)).unwrap_or(nominal).max(0)
}

/// Closes an open call with `answer`. `by` is human | ai | silence | dilemma.
/// `scored` records the answer's signals; `with_effects` applies the call's
/// own effects (both false when a dilemma option carries the answer).
#[allow(clippy::too_many_arguments)]
pub fn answer(
    ctx: &mut Ctx,
    call_id: &str,
    answer: &str,
    count: Option<i64>,
    by: &str,
    scored: bool,
    with_effects: bool,
    rationale: Option<String>,
) -> Result<(), String> {
    let call = ctx.content.aid.call(call_id).ok_or_else(|| format!("unknown call {call_id}"))?.clone();
    if !ctx.state.calls_open.contains_key(call_id) {
        return Err(format!("call {call_id} is not open"));
    }
    let Some(ans) = call.answers.get(answer) else { return Err(format!("call {call_id} has no answer {answer}")) };
    ctx.state.calls_open.remove(call_id);
    ctx.state.calls_answered.insert(call_id.into(), answer.into());
    let moving = tokens_for(&call, answer, count);
    let mut delivered = None;
    let mut note = None;
    let mut sent = 0;
    if let (Some(token), true) = (&call.token, moving > 0) {
        let have = ctx.state.stock_of(&call.holder, token);
        sent = moving.min(have);
        if sent == 0 {
            delivered = Some(false);
            note = Some(format!("{} holds no {token}", call.holder));
        } else {
            let purpose = format!("aid:{call_id}");
            match routes::dispatch(
                ctx.content,
                ctx.state,
                ctx.t,
                &call.holder,
                &call.asker,
                token,
                sent,
                call.route.as_deref(),
                &purpose,
                Some(answer.into()),
                ctx.events,
            ) {
                Ok(_) => {}
                Err(r) => {
                    // The token sets out and does not arrive: lost for the quarter.
                    ctx.state.add_stock(&call.holder, token, -sent);
                    let return_t = ctx.content.quarter_end(ctx.t, ctx.t_end).max(ctx.t + STEP_MINUTES);
                    ctx.state.returning.push(ReturningToken { to: call.holder.clone(), token: token.clone(), count: sent, return_t });
                    delivered = Some(false);
                    note = Some(r);
                }
            }
        }
    }
    // Silence is the storm deciding: recorded, never rated. An answer whose
    // tokens the holder does not hold moved nothing and is not rated either.
    let silent = by == "silence";
    let empty_handed = moving > 0 && sent == 0 && note.as_deref().is_some_and(|n| n.contains("holds no"));
    let signals = if scored && !silent && !empty_handed { canonical_signals(ctx.content, &ans.signals) } else { BTreeMap::new() };
    if scored {
        ctx.state.decisions.push(DecisionRecord {
            t: ctx.t,
            kind: "aid".into(),
            parish_id: call.holder.clone(),
            dilemma_id: call_id.into(),
            option_id: answer.into(),
            controller: by.into(),
            values_signaled: signals.clone(),
            decided_by: if silent { Some("storm".into()) } else { None },
        });
    }
    ctx.events.push(Event::AidAnswer {
        call_id: call_id.into(),
        asker: call.asker.clone(),
        holder: call.holder.clone(),
        answer: answer.into(),
        label: ans.label.clone(),
        count: sent,
        controller: by.into(),
        delivered,
        note,
        rationale,
        values_signaled: signals,
    });
    if with_effects {
        let origin = format!("{call_id}:{answer}");
        if let Some(e) = call.effects.get(answer) {
            effects::apply(ctx, e, &call.holder, &origin);
        }
        if call.token.is_none() {
            if let Some(e) = call.delivered.get(answer) {
                effects::apply(ctx, e, &call.asker, &origin);
            }
        }
    }
    Ok(())
}

/// A dilemma option that answers an open call closes it in the holder's
/// name; the option's own signals and effects stand, so neither is added here.
pub fn answer_via_dilemma(ctx: &mut Ctx, call_id: &str, chosen: &str, parish: &str) {
    let Some(call) = ctx.content.aid.call(call_id) else { return };
    if call.holder != parish || !ctx.state.calls_open.contains_key(call_id) {
        return;
    }
    let _ = answer(ctx, call_id, chosen, None, "dilemma", false, false, None);
}

/// An aid convoy arrives: the token joins the asker's sheet and the answer's
/// delivery effects apply.
pub fn deliver(ctx: &mut Ctx, arrival: &Arrival) {
    let Some(call_id) = arrival.purpose.strip_prefix("aid:") else { return };
    let Some(call) = ctx.content.aid.call(call_id).cloned() else { return };
    crate::resources::deliver_token(ctx, &arrival.to, &arrival.token, arrival.count);
    if let Some(answer) = &arrival.answer {
        if let Some(e) = call.delivered.get(answer) {
            let origin = format!("{call_id}:{answer}");
            effects::apply(ctx, e, &call.asker, &origin);
        }
    }
}

/// The drift rule for an ai holder: grant what it can spare over its own
/// listed needs while the route is open; a partial answer when it has one
/// to spare; otherwise refuse. Calls without a token are granted.
pub fn ai_answer(ctx: &Ctx, call: &AidCall) -> String {
    let Some(token) = &call.token else { return "grant".into() };
    let state: &crate::state::SimState = &*ctx.state;
    let have = state.stock_of(&call.holder, token);
    let needs = ctx.content.resources.need(&call.holder, token, &ctx.content.quarters_from(ctx.t));
    let route_ok = match &call.route {
        Some(r) => state.route_open.get(r).copied().unwrap_or(true),
        None => routes::road_path(ctx.content, state, &call.holder, &call.asker).is_some(),
    };
    if route_ok && have - call.count >= needs {
        "grant".into()
    } else if route_ok && call.answers.contains_key("part") && have > needs {
        "part".into()
    } else {
        "refuse".into()
    }
}

/// Deadlines and ai answers for every open call.
pub fn step(ctx: &mut Ctx) {
    let open: Vec<OpenCall> = ctx.state.calls_open.values().cloned().collect();
    for oc in open {
        let Some(call) = ctx.content.aid.call(&oc.call_id).cloned() else { continue };
        if ctx.is_human(&call.holder) {
            if ctx.t >= oc.deadline_t {
                ctx.events.push(Event::AidExpired { call_id: oc.call_id.clone(), holder: call.holder.clone() });
                let _ = answer(ctx, &oc.call_id, &call.silence_answer, None, "silence", true, true, None);
            }
        } else {
            let half = oc.opened_t + (oc.deadline_t - oc.opened_t) / 2;
            if ctx.t >= half {
                let a = ai_answer(ctx, &call);
                let _ = answer(ctx, &oc.call_id, &a, None, "ai", true, true, None);
            }
        }
    }
}
