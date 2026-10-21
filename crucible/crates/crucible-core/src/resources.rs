//! Resource tokens: stockpiles, the preparation allocation round and its
//! scoring, declared reserves, repair sends and lines of credit. Scoring
//! rules and signal tables come from resources.json; the engine only sums.

use crate::content::Content;
use crate::effects::Ctx;
use crate::log::Event;
use crate::state::{AllocEntry, DecisionRecord, SimState};
use crate::values::canonical_signals;
use crate::{routes, STEP_MINUTES};
use std::collections::BTreeMap;

/// parish -> token -> count.
pub type Sheets = BTreeMap<String, BTreeMap<String, i64>>;

/// The sheets at T-72: (stock, hidden reserves).
pub fn init(content: &Content) -> (Sheets, Sheets) {
    let mut stock: Sheets = BTreeMap::new();
    let mut hidden: Sheets = BTreeMap::new();
    for p in content.parish_ids() {
        stock.insert(p.clone(), content.resources.stockpiles.get(&p).cloned().unwrap_or_default());
        let h = content.resources.hidden_counts(&p);
        if !h.is_empty() {
            hidden.insert(p, h);
        }
    }
    (stock, hidden)
}

/// The signal table for a scoring rule, in canonical value ids.
pub fn rule_signals(content: &Content, rule: &str) -> BTreeMap<String, i64> {
    content.resources.signals.get(rule).map(|m| canonical_signals(content, m)).unwrap_or_default()
}

fn add_signals(into: &mut BTreeMap<String, i64>, more: &BTreeMap<String, i64>) {
    for (k, v) in more {
        *into.entry(k.clone()).or_insert(0) += v;
    }
}

fn clamp3(mut m: BTreeMap<String, i64>) -> BTreeMap<String, i64> {
    for v in m.values_mut() {
        *v = (*v).clamp(-3, 3);
    }
    m
}

fn quarter_ids(content: &Content) -> Vec<&str> {
    content.timeline.hurricane_midas.quarters.iter().map(|q| q.id.as_str()).collect()
}

/// Index of the first quarter in which `parish` lists a need for `token`.
fn first_need(content: &Content, parish: &str, token: &str) -> Option<usize> {
    quarter_ids(content).iter().position(|q| content.resources.need(parish, token, &[q]) > 0)
}

/// Records a KEEP or SEND entry for the preparation round.
pub fn record_allocation(content: &Content, state: &mut SimState, parish: &str, token: &str, to: &str, count: i64) -> Result<(), String> {
    if state.allocation_locked {
        return Err("the allocation round is locked".into());
    }
    if count <= 0 {
        return Err("count must be positive".into());
    }
    let have = state.stock_of(parish, token);
    if have == 0 {
        return Err(format!("{parish} holds no {token}"));
    }
    if to != "keep" {
        if to == parish {
            return Err("a send names another parish".into());
        }
        if !content.parish_ids().iter().any(|p| p == to) {
            return Err(format!("unknown parish {to}"));
        }
        let already: i64 = state.allocation.get(parish).map(|v| v.iter().filter(|e| e.token == token && e.to != "keep").map(|e| e.count).sum()).unwrap_or(0);
        if already + count > have {
            return Err(format!("{parish} holds {have} {token}; {already} already entered"));
        }
    }
    state.allocation.entry(parish.to_string()).or_default().push(AllocEntry { token: token.into(), to: to.into(), count });
    Ok(())
}

fn score_send(content: &Content, state: &SimState, stock_before: i64, parish: &str, token: &str, to: &str, count: i64) -> BTreeMap<String, i64> {
    let all = quarter_ids(content);
    let needs_p = content.resources.need(parish, token, &all);
    let needs_to = content.resources.need(to, token, &all);
    let mut sig = BTreeMap::new();
    if needs_p > 0 && stock_before - count < needs_p {
        add_signals(&mut sig, &rule_signals(content, "sendLastNeeded"));
    }
    if needs_to > 0 {
        let before_you = match (first_need(content, to, token), first_need(content, parish, token)) {
            (Some(q_to), Some(q_p)) => q_to < q_p,
            (Some(_), None) => true,
            _ => false,
        };
        if before_you {
            add_signals(&mut sig, &rule_signals(content, "sendNeededBeforeYou"));
        }
        let greatest = content.parish_ids().iter().map(|p| content.resources.need(p, token, &all)).max().unwrap_or(0);
        if needs_to == greatest {
            add_signals(&mut sig, &rule_signals(content, "sendGreatestNeed"));
        }
    }
    if token == "FUND" && state.asked_of.get(parish).is_some_and(|h| h.contains(to)) {
        add_signals(&mut sig, &rule_signals(content, "fundToAsked"));
    }
    clamp3(sig)
}

#[allow(clippy::too_many_arguments)]
fn record_by(ctx: &mut Ctx, kind: &str, parish: &str, source: &str, choice: &str, controller: &str, signals: BTreeMap<String, i64>, decided_by: Option<String>) {
    ctx.state.decisions.push(DecisionRecord {
        t: ctx.t,
        kind: kind.into(),
        parish_id: parish.into(),
        dilemma_id: source.into(),
        option_id: choice.into(),
        controller: controller.into(),
        values_signaled: signals,
        decided_by,
    });
}

fn record(ctx: &mut Ctx, kind: &str, parish: &str, source: &str, choice: &str, controller: &str, signals: BTreeMap<String, i64>) {
    record_by(ctx, kind, parish, source, choice, controller, signals, None);
}

/// Closes the preparation round: sends roll as convoys, entries are scored
/// for human tables (one record per send, one aggregated keep record, or a
/// keep-everything record for a table that entered nothing).
pub fn lock(ctx: &mut Ctx) {
    ctx.state.allocation_locked = true;
    let all = quarter_ids(ctx.content);
    for parish in ctx.content.parish_ids() {
        let entries = ctx.state.allocation.remove(&parish).unwrap_or_default();
        let human = ctx.is_human(&parish);
        let stock_before = ctx.state.stock.get(&parish).cloned().unwrap_or_default();
        let mut sent: BTreeMap<String, i64> = BTreeMap::new();
        for e in entries.iter().filter(|e| e.to != "keep") {
            let before = stock_before.get(&e.token).copied().unwrap_or(0);
            match routes::dispatch(ctx.content, ctx.state, ctx.t, &parish, &e.to, &e.token, e.count, None, "allocation", None, ctx.events) {
                Ok(_) => {
                    *sent.entry(e.token.clone()).or_insert(0) += e.count;
                    let signals = score_send(ctx.content, ctx.state, before, &parish, &e.token, &e.to, e.count);
                    ctx.events.push(Event::Allocation {
                        parish_id: parish.clone(),
                        entry: "send".into(),
                        token: e.token.clone(),
                        to: e.to.clone(),
                        count: e.count,
                        values_signaled: signals.clone(),
                    });
                    record(
                        ctx,
                        "allocation",
                        &parish,
                        &format!("allocate:{}", e.token),
                        &format!("send:{}", e.to),
                        if human { "human" } else { "ai" },
                        signals,
                    );
                }
                Err(reason) => ctx.reject("allocate", &parish, reason),
            }
        }
        if !human {
            continue;
        }
        if entries.is_empty() {
            // Nothing entered by the lock: the clock decided, and the clock is not rated.
            let signals = BTreeMap::new();
            let total: i64 = stock_before.values().sum();
            ctx.events.push(Event::Allocation {
                parish_id: parish.clone(),
                entry: "keep_everything".into(),
                token: "*".into(),
                to: "keep".into(),
                count: total,
                values_signaled: signals.clone(),
            });
            record_by(ctx, "allocation", &parish, "allocate:keep", "keep_everything", "human", signals, Some("storm".into()));
            continue;
        }
        let mut keep_sig = BTreeMap::new();
        let mut kept_total = 0;
        for (token, have) in &stock_before {
            let kept = have - sent.get(token).copied().unwrap_or(0);
            if kept <= 0 {
                continue;
            }
            kept_total += kept;
            let needs_total = ctx.content.resources.need(&parish, token, &all);
            let needs_soon = ctx.content.resources.need(&parish, token, &["approach", "landfall"]);
            if kept <= needs_total && needs_soon > 0 {
                add_signals(&mut keep_sig, &rule_signals(ctx.content, "keepNeededByLandfall"));
            } else if kept > needs_total {
                let others_need = ctx.content.parish_ids().iter().filter(|p| **p != parish).any(|p| ctx.content.resources.need(p, token, &all) > 0);
                if others_need {
                    add_signals(&mut keep_sig, &rule_signals(ctx.content, "keepUnneededWhileListed"));
                }
            }
        }
        if kept_total > 0 {
            let signals = clamp3(keep_sig);
            ctx.events.push(Event::Allocation {
                parish_id: parish.clone(),
                entry: "keep".into(),
                token: "*".into(),
                to: "keep".into(),
                count: kept_total,
                values_signaled: signals.clone(),
            });
            record(ctx, "allocation", &parish, "allocate:keep", "keep", "human", signals);
        }
    }
}

/// Puts a parish's hidden reserve on its sheet. `scored` records the honesty signal.
pub fn declare_hidden(ctx: &mut Ctx, parish: &str, scored: bool) -> Result<(), String> {
    let hidden = ctx.state.hidden.remove(parish).unwrap_or_default();
    if hidden.is_empty() {
        return Err(format!("{parish} has nothing hidden"));
    }
    let signals = if scored { rule_signals(ctx.content, "declareHidden") } else { BTreeMap::new() };
    for (token, n) in &hidden {
        ctx.state.add_stock(parish, token, *n);
        ctx.events.push(Event::Allocation {
            parish_id: parish.into(),
            entry: "declare_hidden".into(),
            token: token.clone(),
            to: parish.into(),
            count: *n,
            values_signaled: signals.clone(),
        });
    }
    if scored {
        record(ctx, "allocation", parish, "declare_hidden", "declare", "human", signals);
    }
    Ok(())
}

/// A token arrives: it joins the sheet and does what the EFFECTS table says.
pub fn deliver_token(ctx: &mut Ctx, parish: &str, token: &str, count: i64) {
    ctx.state.add_stock(parish, token, count);
    let Some(effect) = ctx.content.resources.effects.get(token) else { return };
    let n = count as f64;
    if let Some(h) = effect.get("generatorHours").and_then(|v| v.as_f64()) {
        *ctx.state.generator_hours.entry(parish.into()).or_insert(0.0) += h * n;
    }
    if let Some(p) = effect.get("shelterPlaces").and_then(|v| v.as_i64()) {
        *ctx.state.shelter_places.entry(parish.into()).or_insert(0) += p * count;
    }
    if let Some(b) = effect.get("coldBays").and_then(|v| v.as_i64()) {
        *ctx.state.cold_bays.entry(parish.into()).or_insert(0) += b * count;
    }
    if effect.get("repairPointsPerHour").is_some() {
        *ctx.state.repair_crews.entry(parish.into()).or_insert(0) += count;
    }
    if let Some(infra) = effect.get("infrastructure").and_then(|v| v.as_object()) {
        for (system, delta) in infra {
            if let Some(d) = delta.as_f64() {
                ctx.state.apply(parish, system, d * n);
            }
        }
    }
}

/// Recovery repairs by delivered CREW tokens: the EFFECTS table's points per
/// hour for each system, applied every tick while crews are repairing.
pub fn crews_step(content: &Content, state: &mut SimState) {
    let Some(rates) = content.resources.effects.get("CREW").and_then(|e| e.get("repairPointsPerHour")).and_then(|v| v.as_object()) else { return };
    let crews: Vec<(String, i64)> = state.repair_crews.iter().map(|(p, n)| (p.clone(), *n)).collect();
    for (parish, n) in crews {
        for (system, per_hour) in rates {
            if let Some(r) = per_hour.as_f64() {
                state.apply(&parish, system, r * n as f64 * STEP_MINUTES as f64 / 60.0);
            }
        }
    }
}

/// Recovery: a token sent to another parish's repair, scored as service.
pub fn repair_send(ctx: &mut Ctx, parish: &str, token: &str, to: &str, count: i64) -> Result<(), String> {
    routes::dispatch(ctx.content, ctx.state, ctx.t, parish, to, token, count, None, "repair", None, ctx.events)?;
    let mut signals = rule_signals(ctx.content, "repairSend");
    if token == "FUND" && ctx.state.asked_of.get(parish).is_some_and(|h| h.contains(to)) {
        add_signals(&mut signals, &rule_signals(ctx.content, "fundToAsked"));
    }
    let signals = clamp3(signals);
    ctx.events.push(Event::Allocation {
        parish_id: parish.into(),
        entry: "repair_send".into(),
        token: token.into(),
        to: to.into(),
        count,
        values_signaled: signals.clone(),
    });
    let controller = if ctx.is_human(parish) { "human" } else { "ai" };
    record(ctx, "repair", parish, &format!("repair:{token}"), &format!("send:{to}"), controller, signals);
    Ok(())
}

/// Recovery: a line of credit naming another table's people.
pub fn credit_line(ctx: &mut Ctx, parish: &str, to: &str, text: &str) -> Result<(), String> {
    if !ctx.content.parish_ids().iter().any(|p| p == to) {
        return Err(format!("unknown parish {to}"));
    }
    if to == parish {
        return Err("credit names another table".into());
    }
    let signals = rule_signals(ctx.content, "creditLine");
    ctx.events.push(Event::CreditLine { parish_id: parish.into(), to: to.into(), text: text.into(), values_signaled: signals.clone() });
    let controller = if ctx.is_human(parish) { "human" } else { "ai" };
    record(ctx, "credit", parish, &format!("credit:{to}"), "credit", controller, signals);
    Ok(())
}

/// A table states its values (and statement); the team record follows.
pub fn lock_values(ctx: &mut Ctx, parish: &str, values: &[String], statement: Option<&str>) -> Result<(), String> {
    if values.is_empty() {
        return Err("no values".into());
    }
    let canon: Vec<String> = values.iter().map(|v| crate::values::canonical(ctx.content, v)).collect();
    let Some(team) = ctx.teams.iter_mut().find(|t| t.parish_id == parish) else { return Err(format!("no team for {parish}")) };
    team.stated_values = canon.clone();
    team.statement = statement.map(String::from);
    ctx.state.values_locked.insert(parish.into(), canon.clone());
    if let Some(s) = statement {
        ctx.state.statements.insert(parish.into(), s.into());
    }
    ctx.events.push(Event::ValuesLocked { parish_id: parish.into(), values: canon, statement: statement.map(String::from) });
    Ok(())
}
