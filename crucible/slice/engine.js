// Keystone slice rules. Pure and deterministic: no DOM, no clock, one seeded RNG per turn.
// All numbers come from crucible/content/keystone_slice.json (C). AI text enters only as logged input.
(function (root) {
  "use strict";

  const TEAMS = ["community", "meridian"];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const int = (v, d = 0) => (Number.isFinite(+v) ? Math.round(+v) : d);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rngFor = (seed, turn) => mulberry32((seed * 7919 + turn * 104729) >>> 0);

  // Stable JSON (sorted keys) and FNV-1a hash, so replay can prove an identical end state.
  function stable(v) {
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
    return JSON.stringify(v);
  }
  function hash(v) {
    const s = stable(v); let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  }

  function newGame(C, setup) {
    const sites = {};
    for (const [id, s] of Object.entries(C.sites)) {
      sites[id] = { flooded: false, dark: false, closed: false, home: s.people ? clone(s.people) : { able: 0, vuln: 0 } };
    }
    const residents = {};
    for (const r of C.residents) residents[r.id] = { where: r.site, status: r.group === "crew" ? "at work" : "home" };
    return {
      seed: setup.seed >>> 0, turn: 1, over: false,
      stock: clone(C.start.stock), meters: clone(C.start.meters),
      sites, shelter: { st_brendans: { vuln: 0, able: 0 }, tech_tower: { vuln: 0, able: 0 }, heartland: { vuln: 0, able: 0 } },
      lost: { vuln: 0, able: 0 }, rescued: { vuln: 0, able: 0 }, injured: 0,
      towerOpen: false, residents, promises: [], history: [],
    };
  }

  // ---------- scoring ----------
  function points(C, team, stock) {
    let p = 0;
    for (const [g, n] of Object.entries(stock[team])) p += n * C.goods[g].points;
    return p;
  }
  function standings(C, state) {
    const out = {};
    for (const t of TEAMS) {
      const now = points(C, t, state.stock), start = points(C, t, C.start.stock);
      out[t] = { points: now, start, index: Math.round((now / start) * 100) };
    }
    return out;
  }

  // ---------- dilemmas ----------
  const EFFECT_SITES = ["low_ward", "tech_housing", "st_brendans", "plant"];
  function teamGoods(C, team) { return Object.keys(C.goods).filter((g) => C.goods[g].owner === team); }

  // Turn any dilemma (AI or fallback) into the one checked shape the engine resolves.
  function validateDilemma(C, state, raw, stances) {
    const notes = [];
    if (!raw || typeof raw !== "object") return { ok: false, notes: ["no JSON object"] };
    const final_call = TEAMS.includes(raw.final_call) ? raw.final_call : null;
    if (!final_call) return { ok: false, notes: ["final_call must be community or meridian"] };
    const signed = { community: stances.community.ranks, meridian: stances.meridian.ranks };
    const orders = [];
    for (const o of (Array.isArray(raw.orders) ? raw.orders : []).slice(0, 3)) {
      if (!o || !TEAMS.includes(o.owner)) { notes.push("order dropped: bad owner"); continue; }
      const goods = teamGoods(C, o.owner), cost = {};
      let afford = true;
      for (const [g, n] of Object.entries(o.cost || {})) {
        const k = g === "fuel" ? (o.owner === "community" ? "c_fuel" : "m_fuel") : g;
        if (!goods.includes(k)) { notes.push(`order "${o.label}": ${g} is not ${o.owner}'s to spend`); afford = false; break; }
        const v = clamp(int(n), 0, 20);
        if (v > state.stock[o.owner][k]) { afford = false; notes.push(`order "${o.label}": not enough ${k}`); break; }
        if (v) cost[k] = v;
      }
      if (!afford) continue;
      const e = o.effects || {}, effects = {};
      if (e.trust) effects.trust = clamp(int(e.trust), -10, 10);
      if (e.confidence) effects.confidence = clamp(int(e.confidence), -10, 10);
      if (e.doses) effects.doses = clamp(int(e.doses), -10, 10);
      if (e.save && EFFECT_SITES.includes(e.save.site)) effects.save = { site: e.save.site, n: clamp(int(e.save.n), 0, 60) };
      if (e.expose) effects.expose = clamp(int(e.expose), 0, 100);
      if (EFFECT_SITES.includes(e.power)) effects.power = e.power;
      if (EFFECT_SITES.includes(e.sandbag)) effects.sandbag = e.sandbag;
      if (e.open_tower) effects.open_tower = true;
      const tags = {};
      for (const t of TEAMS) {
        const keep = (a) => (Array.isArray(a) ? a.map((v) => String(v).toLowerCase()).filter((v) => signed[t].includes(v)) : []);
        tags[t] = { honours: keep(o.tags?.[t]?.honours), costs: keep(o.tags?.[t]?.costs) };
      }
      orders.push({ label: String(o.label || "Order").slice(0, 70), owner: o.owner, cost, effects, tags, news: String(o.news || "").slice(0, 140) });
    }
    if (orders.length < 2) return { ok: false, notes: notes.concat("fewer than 2 valid orders") };
    if (!orders.some((o) => TEAMS.some((t) => o.tags[t].costs.length))) notes.push("no order costs a signed value");
    const collision = (Array.isArray(raw.collision) ? raw.collision : []).map((v) => String(v).toLowerCase()).filter((v) => signed.community.includes(v) || signed.meridian.includes(v)).slice(0, 2);
    let def = int(raw.default, orders.length - 1);
    if (def < 0 || def >= orders.length) def = orders.length - 1;
    return {
      ok: true, notes,
      dilemma: {
        turn: state.turn, final_call, collision, default: def,
        site: EFFECT_SITES.includes(raw.site) ? raw.site : null,
        title: String(raw.title || "").slice(0, 80), situation: String(raw.situation || "").slice(0, 420),
        resident: String(raw.resident || "").slice(0, 120),
        voice: raw.voice && raw.voice.who ? { who: String(raw.voice.who).slice(0, 80), line: String(raw.voice.line || "").slice(0, 220) } : null,
        orders,
      },
    };
  }

  // Written fallback: fixed story, value tags mapped from each team's own values by family.
  function fallbackDilemma(C, state, stances) {
    const f = C.fallbacks.find((x) => x.turn === state.turn) || C.fallbacks[C.fallbacks.length - 1];
    const fam = (v) => (C.values[v] ? C.values[v][1] : "");
    const raw = clone(f);
    raw.orders = f.orders.map((o) => {
      const tags = {};
      for (const t of TEAMS) {
        const r = stances[t].ranks;
        tags[t] = { honours: r.filter((v) => o.honour.includes(fam(v))), costs: r.filter((v) => o.cost_fam.includes(fam(v)) && !o.honour.includes(fam(v))) };
      }
      return { ...o, tags };
    });
    raw.collision = [stances.community.ranks[0], stances.meridian.ranks[0]];
    return validateDilemma(C, state, raw, stances);
  }

  // ---------- turn resolution ----------
  // input: { orders: {unit: {task, site, dest}}, lends: {unit: true}, towerOpen: bool,
  //          dilemma, votes: {community, meridian}, promises: [...], confirms: [index] }
  function resolveTurn(C, state0, input) {
    if (state0.over) throw new Error("game over");
    const s = clone(state0), T = C.turns[s.turn - 1], I = T.intensity, rng = rngFor(s.seed, s.turn);
    const ev = [], ticker = [];
    const say = (text, kind = "info") => ev.push({ text, kind });
    const turnLost = { vuln: 0, able: 0 }, turnRescued = { vuln: 0, able: 0 }, credit = { community: 0, meridian: 0 };
    const powered = new Set(), sandbagged = new Set();
    const orders = input.orders || {}, lends = input.lends || {};

    // 1. promises made or confirmed this turn
    for (const p of input.promises || []) s.promises.push({ ...p, made: s.turn, due: s.turn + 1, confirmed: false, status: "open" });
    for (const i of input.confirms || []) if (s.promises[i]) s.promises[i].confirmed = true;

    // 2. Tech Tower
    if (input.towerOpen && !s.towerOpen) {
      if (pay(s, "meridian", C.tower_open_cost)) { s.towerOpen = true; say("Meridian opens Tech Tower to residents (shelters 60)."); }
    }

    // 3. dilemma choice: the owner of the call decides; no vote means the storm decided
    let choice = null;
    const D = input.dilemma;
    if (D) {
      const v = input.votes || {};
      const idx = Number.isInteger(v[D.final_call]) ? v[D.final_call] : null;
      const o = D.orders[idx ?? D.default];
      choice = { index: idx ?? D.default, stormDecided: idx === null, by: D.final_call, votes: { community: v.community ?? null, meridian: v.meridian ?? null } };
      if (pay(s, o.owner, o.cost)) {
        const e = o.effects;
        if (e.open_tower) s.towerOpen = true;
        if (e.power) powered.add(e.power);
        if (e.sandbag) sandbagged.add(e.sandbag);
        if (e.trust) s.meters.trust += e.trust;
        if (e.confidence) s.meters.confidence += e.confidence;
        if (e.doses) s.stock.meridian.doses = Math.max(0, s.stock.meridian.doses + e.doses);
        if (e.save) { credit[o.owner] += move(s, e.save.site, "heartland", e.save.n, turnRescued, true); board(C, s, e.save.site, "heartland", say); }
        choice.expose = e.expose || 0;
        if (o.news) ticker.push(o.news);
      } else {
        choice.unpaid = true; say(`"${o.label}" could not be paid for, so nothing happened.`, "bad");
      }
      say(choice.stormDecided ? `No decision from the ${C.teams[D.final_call].short} team. The storm decided: "${o.label}".` : `${C.teams[D.final_call].short} made the call: "${o.label}".`, "choice");
    }

    // 4. unit orders, in fixed unit order
    for (const uid of Object.keys(C.units)) {
      const U = C.units[uid], o = orders[uid];
      if (!o || o.task === "idle") continue;
      const op = lends[uid] ? other(U.team) : U.team; // operator pays running costs
      const site = s.sites[o.site];
      if (o.task === "evac") {
        if (!site) continue;
        if (U.road && site.flooded) { say(`${U.name} could not reach ${C.sites[o.site].name}: the streets are under water.`, "bad"); continue; }
        if (!U.road && !(U.reach || []).includes(o.site)) continue;
        const dest = o.dest || "st_brendans";
        if (dest === "heartland") {
          if (s.sites.crater_road.closed) { say(`${U.name} turned back: Crater Road is closed.`, "bad"); continue; }
          if (!U.road) continue;
          if (!pay(s, op, { [op === "community" ? "c_fuel" : "m_fuel"]: C.destinations.heartland.fuel })) { say(`${U.name} had no fuel for the Heartland run.`, "bad"); continue; }
        }
        if (dest === "tech_tower" && !s.towerOpen) { say(`${U.name} found Tech Tower locked.`, "bad"); continue; }
        let room = U.carry;
        if (dest === "tech_tower") room = Math.min(room, C.destinations.tech_tower.capacity - s.shelter.tech_tower.vuln - s.shelter.tech_tower.able);
        const before = turnRescued.vuln;
        const n = move(s, o.site, dest, room, turnRescued, false);
        credit[op] += turnRescued.vuln - before;
        board(C, s, o.site, dest, say);
        if (n) say(`${U.name} moved ${n} people from ${C.sites[o.site].name} to ${C.destinations[dest].name}.`, "good");
        else say(`${U.name} went to ${C.sites[o.site].name} but nobody was left to move.`);
      } else if (o.task === "sandbag") {
        if (!site || site.flooded) continue;
        if (pay(s, U.team, U.sandbag_cost)) { sandbagged.add(o.site); say(`${U.name} sandbagged ${C.sites[o.site].name}.`); }
      } else if (o.task === "power") {
        if (!site) continue;
        if (pay(s, op, { [op === "community" ? "c_fuel" : "m_fuel"]: U.power_cost_fuel })) { powered.add(o.site); say(`${U.name} is powering ${C.sites[o.site].name}.`); }
        else say(`${U.name} had no fuel.`, "bad");
      }
    }
    // 5. the storm
    for (const h of T.hazards) {
      const site = s.sites[h.site];
      if (h.effect === "flooded" && site.flooded) continue;
      if (h.effect === "dark" && site.dark) continue;
      if (h.effect === "closed" && site.closed) continue;
      let p = h.p;
      if (h.effect === "flooded" && sandbagged.has(h.site) && h.sandbag_p !== undefined) p = h.sandbag_p;
      if (rng() < p) { site[h.effect] = true; say(h.text + ".", "storm"); ticker.push(h.text + "."); }
      else if (h.effect === "flooded" && sandbagged.has(h.site)) say(`Sandbags held at ${C.sites[h.site].name}.`, "good");
    }

    // 6. losses
    const L = C.loss;
    for (const id of EFFECT_SITES) {
      const site = s.sites[id], home = site.home;
      if (!home.vuln && !home.able) continue;
      let lv = 0, la = 0;
      if (site.flooded) { lv = Math.round(home.vuln * L.flooded.vuln * I); la = Math.round(home.able * L.flooded.able * I); }
      else if (site.dark && !powered.has(id)) lv = Math.round(home.vuln * L.dark.vuln * I);
      if (lv || la) {
        residentRisk(C, s, rng, id, lv / Math.max(1, home.vuln), say);
        home.vuln -= lv; home.able -= la; turnLost.vuln += lv; turnLost.able += la;
        say(`${C.sites[id].name}: ${lv + la} people lost${site.flooded ? " in the flood" : " without power"}.`, "loss");
      }
    }
    const sb = s.shelter.st_brendans, cap = C.sites.st_brendans.capacity;
    if (s.sites.st_brendans.dark && !powered.has("st_brendans") && sb.vuln) {
      const lv = Math.round(sb.vuln * L.shelter_dark * I);
      if (lv) { sb.vuln -= lv; turnLost.vuln += lv; say(`St. Brendan's in the dark: ${lv} people on oxygen or monitors lost.`, "loss"); residentRisk(C, s, rng, "st_brendans", lv / Math.max(1, sb.vuln + lv), say); }
    }
    const over = sb.vuln + sb.able - cap;
    if (over > 0) {
      const lv = Math.min(sb.vuln, Math.round(over * L.overflow * I));
      sb.vuln -= lv; turnLost.vuln += lv; s.meters.trust += C.meters.overflow;
      say(`St. Brendan's is ${over} over capacity. People sleep in the aisles${lv ? `; ${lv} lost` : ""}.`, "bad");
    }
    if (choice && choice.expose) {
      const la = Math.round(choice.expose * L.exposed * I);
      if (la) { s.sites.tech_housing.home.able = Math.max(0, s.sites.tech_housing.home.able - la); turnLost.able += la; say(`${la} plant workers kept in harm's way were lost.`, "loss"); }
    }

    // 7. yields
    const Y = C.yields, M = C.meters;
    const cy = { food: 0, volunteers: 0 };
    if (!s.sites.low_ward.flooded) { cy.food += Y.low_ward.food; cy.volunteers += Math.floor(s.sites.low_ward.home.able / Y.low_ward.able_per_volunteer); }
    if (!s.sites.tech_housing.flooded) cy.volunteers += Y.tech_housing.volunteers;
    cy.volunteers += Math.floor((s.shelter.st_brendans.able + s.shelter.tech_tower.able + s.shelter.heartland.able) / Y.sheltered_able_per_volunteer);
    if (s.meters.trust < M.low) { cy.food = Math.floor(cy.food / 2); cy.volunteers = Math.floor(cy.volunteers / 2); say("Community trust is low: half the volunteers stayed home.", "bad"); }
    s.stock.community.food += cy.food; s.stock.community.volunteers += cy.volunteers;

    const pc = orders.pcrew || { task: "run" };
    const plant = s.sites.plant;
    const plantPowered = !plant.dark || powered.has("plant");
    const ran = (pc.task === "run" || !orders.pcrew) && !lends.pcrew && !plant.flooded && plantPowered;
    const my = { doses: 0, funds: 0 };
    const familiesAtRisk = EFFECT_SITES.some((id) => s.sites[id].flooded && s.sites[id].home.vuln > 0);
    if (ran) { my.doses = Y.plant.doses; my.funds = Y.plant.funds;
      if (familiesAtRisk) { my.doses = Math.floor(my.doses / 2); my.funds = Math.floor(my.funds / 2); say("Half the shift left the line to find family still stuck in the flood.", "bad"); } s.meters.confidence += M.plant_ran; say(`The plant ran: +${my.doses} cure doses.`, "good"); }
    else { s.meters.confidence += M.plant_idle; say(`The plant made nothing this turn${plant.flooded ? " (flooded)" : !plantPowered ? " (no power)" : ""}.`, "bad"); }
    if (plant.flooded && pc.task === "run" && s.residents.frank.status === "at work") { s.residents.frank.status = "injured"; s.injured += 1; say("Frank Reeves was hurt when the plant flooded.", "loss"); }
    if (!plantPowered && s.stock.meridian.doses > 0) {
      const sp = Math.min(s.stock.meridian.doses, Y.plant.spoil_unpowered);
      s.stock.meridian.doses -= sp; say(`The plant's cold store warmed up: ${sp} stored doses spoiled.`, "bad");
    }
    if (s.meters.confidence < M.low) { my.funds -= M.hq_clawback_funds; say(`Board confidence is low: HQ pulls ${M.hq_clawback_funds} funds back.`, "bad"); }
    s.stock.meridian.doses += my.doses; s.stock.meridian.funds = Math.max(0, s.stock.meridian.funds + my.funds);

    // 8. needs
    const fed = peopleInParish(s), need = Math.ceil(fed / C.needs.people_per_food);
    if (s.stock.community.food >= need) s.stock.community.food -= need;
    else { s.stock.community.food = 0; s.meters.trust += M.hunger; say("Food ran out. People went hungry.", "bad"); }

    // 9. meters from what people saw
    s.meters.trust -= Math.round(turnLost.vuln / M.vuln_lost_per_trust) + Math.round(turnLost.able / M.able_lost_per_trust);
    // people credit whoever came for them: community rescues build trust, Meridian rescues earn the board good press
    s.meters.trust += Math.min(M.rescued_trust_cap, Math.round(credit.community / M.rescued_per_trust));
    s.meters.confidence += Math.min(M.rescued_trust_cap, Math.round(credit.meridian / M.rescued_per_trust));

    // the press notices rescue units that sat still while people were lost
    if (turnLost.vuln + turnLost.able > 0) {
      for (const [uid, U] of Object.entries(C.units)) {
        if (!U.carry || (orders[uid] && orders[uid].task !== "idle")) continue;
        const t = lends[uid] ? other(U.team) : U.team;
        s.meters[C.teams[t].meter] += M.idle_while_lost;
        ticker.push(`${U.name} sat idle while Keystone lost ${turnLost.vuln + turnLost.able} people.`);
      }
    }

    // 10. promises due this turn
    for (const p of s.promises) {
      if (p.status !== "open" || p.due !== s.turn) continue;
      if (!p.confirmed) { p.status = "unconfirmed"; continue; }
      const kept = p.kind === "lend" ? !!lends[p.unit] : orders[p.unit] && orders[p.unit].site === p.site && orders[p.unit].task !== "idle";
      p.status = kept ? "kept" : "broken";
      const meter = C.teams[p.to].meter;
      s.meters[meter] += kept ? M.promise_kept : M.promise_broken;
      say(`Promise ${kept ? "kept" : "broken"}: ${p.text}`, kept ? "good" : "bad");
      ticker.push(`${C.teams[p.by].short} ${kept ? "keeps" : "breaks"} its promise: ${p.text}`);
    }

    s.meters.trust = clamp(s.meters.trust, 0, 100);
    s.meters.confidence = clamp(s.meters.confidence, 0, 100);
    s.lost.vuln += turnLost.vuln; s.lost.able += turnLost.able;
    s.rescued.vuln += turnRescued.vuln; s.rescued.able += turnRescued.able;
    for (const t of TEAMS) {
      const meter = C.teams[t].meter;
      if (s.meters[meter] < M.low) ticker.push(`${C.voices[t].who}: "${C.voices[t].low}"`);
    }
    if (!ticker.length) ticker.push(`Keystone, ${T.hours}: Midas ${T.label.toLowerCase()}, category pressure rising.`);

    const report = { turn: s.turn, label: T.label, events: ev, ticker, lost: turnLost, rescued: turnRescued, yields: { community: cy, meridian: my }, choice };
    s.history.push({ turn: s.turn, dilemma: D || null, choice, lost: turnLost, rescued: turnRescued });
    s.turn += 1;
    if (s.turn > C.turns.length) finish(C, s, report);
    return { state: s, report };
  }

  // Recovery after the last storm turn: saved people go back to work, meters scale the yield.
  function finish(C, s, report) {
    const R = C.recovery, M = C.meters, Y = C.yields;
    const mult = (m) => (m >= M.high ? R.high_mult : m < M.low ? R.low_mult : 1);
    const ableAlive = C.sites.low_ward.people.able + C.sites.tech_housing.people.able - s.lost.able;
    const vulnLost = s.lost.vuln;
    const cm = mult(s.meters.trust), mm = (mult(s.meters.confidence) + mult(s.meters.trust)) / 2; // the plant also needs its licence to operate
    const cv = Math.floor((ableAlive / R.able_per_volunteer) * R.turns * cm);
    const cf = Math.floor((Y.low_ward.food + Math.floor(s.meters.trust / R.trust_per_aid)) * R.turns * cm) - Math.floor(vulnLost / R.vuln_lost_per_food);
    const pd = s.sites.plant.flooded ? R.plant_flooded_doses : Y.plant.doses * R.turns;
    const md = Math.floor(pd * mm);
    const mf = Math.floor(Y.plant.funds * (s.sites.plant.flooded ? 1 : R.turns) * mm);
    s.stock.community.volunteers += cv; s.stock.community.food = Math.max(0, s.stock.community.food + cf);
    s.stock.meridian.doses += md; s.stock.meridian.funds += mf;
    s.recovery = { community: { volunteers: cv, food: cf }, meridian: { doses: md, funds: mf } };
    s.over = true;
    report.recovery = s.recovery;
  }

  // ---------- helpers ----------
  function other(t) { return t === "community" ? "meridian" : "community"; }
  function pay(s, team, cost) {
    for (const [g, n] of Object.entries(cost || {})) if ((s.stock[team][g] ?? 0) < n) return false;
    for (const [g, n] of Object.entries(cost || {})) s.stock[team][g] -= n;
    return true;
  }
  function move(s, from, dest, room, tally, vulnOnly) {
    const src = from === "st_brendans" ? s.shelter.st_brendans : s.sites[from] && s.sites[from].home;
    if (!src || room <= 0) return 0;
    const v = Math.min(src.vuln, room), a = vulnOnly ? 0 : Math.min(src.able, room - v);
    src.vuln -= v; src.able -= a;
    s.shelter[dest].vuln += v; s.shelter[dest].able += a;
    tally.vuln += v; tally.able += a;
    return v + a;
  }
  // A named vulnerable resident boards the first rescue that leaves their street with room for them.
  function board(C, s, from, dest, say) {
    const r = C.residents.find((x) => x.group === "vuln" && s.residents[x.id].status === "home" && x.site === from);
    if (!r) return;
    const st = s.residents[r.id]; st.status = "moved"; st.where = dest;
    say(`${r.name} was moved to ${C.destinations[dest].name}.`, "good");
  }
  function peopleInParish(s) {
    let n = s.shelter.st_brendans.vuln + s.shelter.st_brendans.able + s.shelter.tech_tower.vuln + s.shelter.tech_tower.able;
    for (const id of EFFECT_SITES) n += s.sites[id].home.vuln + s.sites[id].home.able;
    return n;
  }
  function residentRisk(C, s, rng, site, frac, say) {
    for (const r of C.residents) {
      const st = s.residents[r.id];
      const here = (st.status === "home" && r.site === site) || (st.status === "moved" && st.where === site);
      if (here && r.group === "vuln" && rng() < frac * 2) { st.status = "lost"; say(`${r.name} did not survive the night.`, "loss"); }
    }
  }

  // ---------- replay ----------
  function replay(C, log) {
    let s = newGame(C, log.setup);
    for (const input of log.turns) s = resolveTurn(C, s, input).state;
    return { state: s, hash: hash(s) };
  }

  const api = { TEAMS, newGame, resolveTurn, validateDilemma, fallbackDilemma, standings, points, replay, hash, rngFor, peopleInParish };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
