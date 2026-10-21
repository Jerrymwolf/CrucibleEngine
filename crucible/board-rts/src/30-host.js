/* ---------- in-page host (PROTOCOL.md spoken from inside the page) ----------
   The host for a single device, a rehearsal, or a room with no laptop server: the same frames as
   crucible-host, the same filtering rules (crates/crucible-host/src/filter.rs), the same input log.
   The core decides everything: the host assigns each accepted intent the next tick, re-runs the
   engine from the seed with every input so far, and sends each client the view its role may see.
   Wall-clock time lives here (the tick timer, log stamps) and never reaches the core. */
const CONSOLE_KINDS = ['lock_values', 'allocate', 'decide', 'mayday', 'answer_aid', 'declare_hidden', 'repair_send', 'credit_line'];
const PHONE_KINDS = ['personal_pick', 'vote'];            // a commitment stays on the phone and is never sent (S4.2)
const NOTE_KINDS = ['self_place'];                         // console kinds the core never sees: the table's own placement at the debrief (D7)
const DM_KINDS = ['open_island', 'open_quarter', 'start', 'resume', 'pause', 'advance', 'skip_ahead', 'heat', 'cool', 'swap', 'admit', 'reassign', 'flag', 'debrief', 'debrief_step', 'export'];
const PUBLIC_EVENTS = ['mayday', 'aid_answer', 'aid_expired', 'values_locked', 'decision', 'allocation', 'credit_line', 'token_returned'];
const HISTORY_EVENTS = ['window_transition', 'cascade', 'isolation', 'connectivity', 'dilemma_presented', 'decision', 'route_cut', 'route_reopened', 'convoy_departed', 'convoy_arrived', 'convoy_turned_back', 'token_returned', 'allocation', 'values_locked', 'credit_line', 'mayday', 'aid_answer', 'aid_expired', 'resident_state', 'ship_sailed', 'consignment_missed', 'doses_lost', 'rejected'];
const HISTORY_CAP = 400;
const COMMS_FAILED = FAILED; // out of contact at or below this (crucible-host filter.rs; PROTOCOL.md 9.3 says "> 0", see README)
const LOCK_T = (PROFILE.allocation || {}).lockT ?? null;
const VALUES_TO_PICK = PROFILE.valuesToPick || 3;

function visibleParishes(tick, role, parish) {
  if (role === 'console' || role === 'phone') {
    const vis = new Set([parish]);
    const comms = p => (((tick.infrastructure || {})[p] || {}).communications) || 0;
    if (comms(parish) > COMMS_FAILED) for (const q of PIDS) if (q !== parish && comms(q) > COMMS_FAILED) vis.add(q);
    return vis;
  }
  return new Set(PIDS);
}
function eventVisible(e, role, parish, vis) {
  if (e.kind === 'rejected') return role === 'dm' || ((role === 'console' || role === 'phone') && e.parish_id === parish);
  if (role === 'dm' || role === 'projector') return true;
  if (e.parish_id == null) return true;
  return vis.has(e.parish_id) || PUBLIC_EVENTS.includes(e.kind);
}
function publicTick(tick, role, parish) {
  const vis = visibleParishes(tick, role, parish);
  const pick = m => Object.fromEntries(Object.entries(m || {}).filter(([k]) => vis.has(k)));
  return {
    t: tick.t, window_id: tick.window_id, phase: tick.phase, intensity: tick.intensity, weather: tick.weather, counters: tick.counters,
    routes_cut: tick.routes_cut || [], state_hash: tick.state_hash,
    infrastructure: pick(tick.infrastructure), morale: pick(tick.morale), isolated: (tick.isolated || []).filter(p => vis.has(p)), stock: pick(tick.stock),
    fogged: PIDS.filter(p => !vis.has(p)), events: (tick.events || []).filter(e => eventVisible(e, role, parish, vis)),
  };
}
function historyFor(ticks, role, parish, cap = HISTORY_CAP) {
  const out = [];
  for (const tick of ticks) {
    const vis = visibleParishes(tick, role, parish);
    for (const e of tick.events || []) {
      if (!HISTORY_EVENTS.includes(e.kind)) continue;
      if (e.kind === 'connectivity' && e.status !== 'lost' && e.status !== 'restored') continue;
      if (eventVisible(e, role, parish, vis)) out.push({ t: tick.t, event: e });
    }
  }
  const truncated = out.length > cap;
  return [truncated ? out.slice(out.length - cap) : out, truncated];
}
const errorFrame = (code, message) => mkFrame('error', { code, message });
const shuffle = (arr, rng) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class LocalHost {
  constructor(opts = {}) {
    const saved = opts.restore || null;
    this.seed = saved ? saved.seed : (Number.isFinite(opts.seed) ? opts.seed : (PROFILE.seed ?? 42));
    this.speed = opts.speed > 0 ? opts.speed : (saved && saved.speed) || 1;
    this.rehearsal = !!opts.rehearsal;
    this.code = (saved ? saved.code : (opts.code || makeCode())).toUpperCase();
    this.tokens = saved ? saved.tokens : { tables: Object.fromEntries(ROSTER.map(p => [p, randId(16)])), dm: randId(16), pin: opts.pin || String(Math.floor(Math.random() * 10000)).padStart(4, '0'), projector: randId(16) };
    this.publicUrl = opts.publicUrl || location.href.split(/[?#]/)[0];
    this.version = Engine.version();
    this.conns = new Map();                  // transport key -> { key, send, onClose, client, lobby, name }
    this.clients = new Map();                // client_id -> client record
    this.seats = Object.fromEntries(ROSTER.map(p => [p, { console: null }]));
    this.log = []; this.inputs = []; this.heat = []; this.flags = []; this.picks = {}; this.votes = {}; this.placements = {};
    this.phase = 'lobby'; this.quarter = null; this.running = false; this.horizon = T_START; this.timer = null;
    this.seq = 0; this.stream = []; this.lastPhase = null;
    this.run = null; this.dirty = true; this.runs = 0; this.errors = [];
    this.bots = {}; this.autopilot = this.rehearsal; this.rng = mulberry32((this.seed ^ 0x9e3779b9) >>> 0);
    this.events = new Emitter();             // 'change' (for the hosting page), 'export' (run.json ready)
    this._cards = { key: '', cards: null, calls: null };
    if (saved) this.restoreFrom(saved);
    else {
      this.recompute();
      this.sequenced('phase', T_START, { kind: 'values_open', payload: { values_deck: DECK, values_to_pick: VALUES_TO_PICK, statement_template: PROFILE.statementTemplate || '' } });
      this.sequenced('state', T_START);
    }
    this.persist();
  }

  /* ----- the engine ----- */
  engineTeams() { return PIDS.map(p => ({ parish_id: p, controller: ROSTER.includes(p) ? 'human' : 'ai', stated_values: [] })); }
  teamsView() {
    const locked = {};
    for (const i of this.inputs) if (i.kind === 'lock_values') locked[i.parish_id] = i;
    return this.engineTeams().map(t => { const l = locked[t.parish_id]; return l ? { ...t, stated_values: l.values, statement: l.statement || null } : t; });
  }
  curve() {
    const base = PROFILE.intensity || [];
    if (!base.length && !this.heat.length) return [];
    const pts = new Set(base.map(([t]) => t)); for (const h of this.heat) pts.add(h.t);
    const level = t => { let v = 5; for (const [pt, i] of base) if (pt <= t) v = i; return v; };
    const off = t => this.heat.filter(h => h.t <= t).reduce((a, h) => a + h.delta, 0);
    return [...pts].sort((a, b) => a - b).map(t => [t, clamp(level(t) + off(t), 1, 10)]);
  }
  engineInputs() { return this.inputs.map(i => { const { kind, ...rest } = i; return { kind: kind === 'swap' ? 'swap_dilemma' : kind, ...rest }; }); }
  // The profile's schedule with the DM's heat and cool applied, as crucible-host's
  // effective_session: each heat shortens every card and mayday window that opens
  // after it by its quarter's step, each cool lengthens them. The run log carries
  // the schedule used, so replay holds.
  session() {
    if (!this.heat.length) return PROFILE.id;
    if (!this.baseSession) this.baseSession = Engine.run({ seed: this.seed, session: PROFILE.id, until: QUARTERS[0].fromT }).session;
    const step = t => { const q = QUARTERS.find(q => q.fromT <= t && t < q.toT); return q ? q.heatStepTicks || 0 : 0; };
    const shift = t => this.heat.filter(h => h.t <= t).reduce((a, h) => a - Math.sign(h.delta) * step(t), 0);
    const s = JSON.parse(JSON.stringify(this.baseSession));
    for (const asks of Object.values(s.schedule || {})) for (const a of asks) a.deadlineTicks = Math.max(2, a.deadlineTicks + shift(a.presentT));
    for (const m of s.maydays || []) if (m.answerTicks != null) m.answerTicks = Math.max(2, m.answerTicks + shift(m.t));
    return s;
  }
  recompute() {
    const req = { seed: this.seed, session: this.session(), teams: this.engineTeams(), inputs: this.engineInputs(), intensity: this.curve(), live: false };
    const t0 = performance.now();
    const log = Engine.run(req);
    this.lastRunMs = performance.now() - t0;
    if (this.run) { // determinism guard: nothing already sent may change
      const n = idx(this.horizon);
      for (let i = 0; i <= n; i++) if (this.run.ticks[i].state_hash !== log.ticks[i].state_hash) { const msg = `determinism: tick ${clockStr(tOf(i))} changed after an input beyond the horizon`; this.errors.push(msg); console.error(msg); break; }
    }
    this.run = log; this.dirty = false; this.runs++; this._cards.key = '';
  }
  tick(t = this.horizon) { return this.run.ticks[idx(Math.min(t, this.horizon))]; }
  stockOf(parish, token) { return (((this.tick().stock || {})[parish]) || {})[token] || 0; }
  scanOpen() {
    const key = this.horizon + ':' + this.runs;
    if (this._cards.key === key) return this._cards;
    const n = idx(this.horizon), presented = new Map(), decided = new Set(), calls = new Map(), raised = new Set();
    for (let i = 0; i <= n; i++) {
      const tk = this.run.ticks[i];
      for (const e of tk.events) {
        if (e.kind === 'dilemma_presented') presented.set(e.parish_id + '|' + e.dilemma_id, { t: tk.t, e });
        else if (e.kind === 'decision') decided.add(e.parish_id + '|' + e.dilemma_id);
        else if (e.kind === 'mayday') { calls.set(e.call_id, { opened_t: tk.t, e }); raised.add(e.call_id); }
        else if (e.kind === 'aid_answer' || e.kind === 'aid_expired') calls.delete(e.call_id);
      }
    }
    const cards = [];
    for (const [k, { t, e }] of presented) {
      if (decided.has(k)) continue;
      const d = DATA.dilemmas[e.dilemma_id];
      cards.push({ t, parish_id: e.parish_id, dilemma_id: e.dilemma_id, title: e.title || (d && d.title) || e.dilemma_id, setup: e.setup || (d && d.setup) || '', deadline_t: e.deadline_t, persona_id: e.persona_id || (d && d.personaId) || null, values_tested: e.values_tested || (d && d.valuesTested) || [], options: d ? d.options.map(o => ({ id: o.id, label: o.label, description: o.description })) : [] });
    }
    const open = [];
    for (const [id, { opened_t, e }] of calls) {
      const c = CALL[id];
      open.push({ call_id: id, asker: e.asker, holder: e.holder, opened_t, deadline_t: e.deadline_t, token: e.token, count: e.count, ask: e.ask, line: e.line, persona_id: e.persona_id || null, route: c ? c.route : null, answers: c ? c.answers : { grant: { label: 'GRANT', count: null }, refuse: { label: 'REFUSE', count: null } } });
    }
    this._cards = { key, cards, calls: open, raised, presented };
    return this._cards;
  }
  openCards(parish) { const c = this.scanOpen().cards; return parish ? c.filter(x => x.parish_id === parish) : c; }
  openCalls(parish) { const c = this.scanOpen().calls; return parish ? c.filter(x => x.holder === parish || x.asker === parish).map(x => ({ ...x, role: x.holder === parish ? 'holder' : 'asker' })) : c; }
  callRaised(id) { return this.scanOpen().raised.has(id) || this.inputs.some(i => i.kind === 'mayday' && i.call_id === id); }
  presented(parish, dilemmaId) { return this.scanOpen().presented.has(parish + '|' + dilemmaId); }

  /* ----- views ----- */
  spt(q) { return q.playSeconds / q.ticks / this.speed; }
  clockView() {
    const q = this.quarter == null ? QUARTERS[0] : QUARTERS[this.quarter];
    return { phase: this.phase, quarter: this.quarter, running: this.running, seconds_per_tick: this.spt(q), horizon_t: this.horizon, quarter_end_t: this.quarter == null ? null : QUARTERS[this.quarter].toT };
  }
  sessionBlock() {
    return {
      code: this.code, profile: PROFILE.id, seed: this.seed, content_hash: this.version.content_hash, engine: this.version.engine, log_version: this.version.log_version,
      step_minutes: STEP, t_start: T_START, t_end: T_END, roster: ROSTER,
      parishes: PARISHES.map(p => ({ id: p.id, name: p.name, population: p.population, position: p.position, role: p.role })),
      windows: DATA.windows,
      quarters: QUARTERS.map(q => ({ index: q.index, id: q.id, title: q.title, from_t: q.fromT, to_t: q.toT, phase: q.phase, card_seconds: q.cardSeconds, play_seconds: q.playSeconds, close_seconds: q.closeSeconds, human_deadline_ticks: q.humanDeadlineTicks ?? null, mayday_answer_ticks: q.maydayAnswerTicks ?? null, second_move: q.secondMove || null, card: q.card || '', seconds_per_tick: this.spt(q) })),
      values_deck: DECK, values_to_pick: VALUES_TO_PICK, statement_template: PROFILE.statementTemplate || '', answer_reasons: PROFILE.answerReasons || [],
      credit_prompt: (PROFILE.creditLine || {}).prompt || '', commitment: PROFILE.commitment || '', debrief_question: PROFILE.debriefQuestion || '',
    };
  }
  entriesOf(p) { return this.inputs.filter(i => i.kind === 'allocate' && i.parish_id === p).map(i => ({ token: i.token, to: i.to, count: i.count, seq: i.seq, t: i.t })); }
  voteCounts(p) { const out = {}; for (const [d, by] of Object.entries(this.votes[p] || {})) out[d] = Object.keys(by).length; return out; }
  voteSplit(p) { const out = {}; for (const [d, by] of Object.entries(this.votes[p] || {})) { const split = {}; let late = 0; for (const v of Object.values(by)) { split[v.option_id] = (split[v.option_id] || 0) + 1; if (v.late) late++; } out[d] = { count: Object.keys(by).length, split, late }; } return out; }
  myVotes(cid, p) { const out = {}; for (const [d, by] of Object.entries(this.votes[p] || {})) if (by[cid]) out[d] = by[cid].option_id; return out; }
  seatsView() {
    return ROSTER.map(p => {
      const h = this.seats[p].console && this.clients.get(this.seats[p].console);
      return { parish: p, name: pname(p), console: !h ? 'free' : h.connected ? 'held' : 'offline', phones: [...this.clients.values()].filter(c => c.role === 'phone' && c.parish === p && c.connected).length };
    });
  }
  clientsView() { return [...this.clients.values()].map(c => ({ client_id: c.client_id, role: c.role, parish: c.parish, connected: !!c.connected, name: c.name || '', bot: c.bot || undefined })); }
  privateFor(client) {
    const tick = this.tick();
    if (client.role === 'console') {
      const p = client.parish;
      return { parish: p, secret_brief: (PROFILE.secretBriefs || {})[p] || '', pending: this.openCards(p), calls: this.openCalls(p), entries: this.entriesOf(p), stock: (tick.stock || {})[p] || {}, votes: this.voteCounts(p), my_placement: this.placements[p] || null, vote_split: this.phase === 'debrief' ? this.voteSplit(p) : null,
        inputs: this.log.filter(l => l.core && l.source.parish === p).map(l => ({ seq: l.seq, t: l.t, kind: l.kind, payload: l.payload, by: l.source.role })) };
    }
    if (client.role === 'phone') {
      const p = client.parish;
      return { parish: p, pending: this.openCards(p), my_votes: this.myVotes(client.client_id, p), my_pick: this.picks[client.client_id] || null };
    }
    if (client.role === 'dm') {
      return { briefs: PROFILE.secretBriefs || {}, pending: this.openCards(), calls: this.openCalls(), entries: Object.fromEntries(ROSTER.map(p => [p, this.entriesOf(p)])), stock: tick.stock || {},
        votes: Object.fromEntries(ROSTER.map(p => [p, this.voteSplit(p)])), picks: this.picksView(), placements: this.placements, seats: this.seatsView(), clients: this.clientsView(), flags: this.flags,
        intensity_offset: this.heat.reduce((a, h) => a + h.delta, 0), log_len: this.log.length, runs: this.runs, last_run_ms: Math.round(this.lastRunMs || 0), errors: this.errors, speed: this.speed, autopilot: this.autopilot };
    }
    return null;
  }
  picksView() { const out = {}; for (const [cid, vals] of Object.entries(this.picks)) { const c = this.clients.get(cid); if (!c) continue; (out[c.parish] = out[c.parish] || []).push(vals); } return out; }
  snapshotFor(client) {
    const tick = this.tick();
    const [history, truncated] = historyFor(this.run.ticks.slice(0, idx(this.horizon) + 1), client.role, client.parish);
    const s = { seq: this.seq, t: this.horizon, hash: tick.state_hash, session: this.sessionBlock(), clock: this.clockView(), teams: this.teamsView(), tick: publicTick(tick, client.role, client.parish), history, history_truncated: truncated };
    if (this.lastPhase) s.last_phase = this.lastPhase; // extension: the latest phase frame, so a late projector knows the card or the debrief
    if (client.role !== 'projector') s.private = this.privateFor(client);
    return s;
  }
  frameFor(entry, client) {
    if (entry.type === 'phase') {
      const f = mkFrame('phase', { seq: entry.seq, t: entry.t, kind: entry.kind, payload: entry.payload });
      if (String(entry.kind).startsWith('debrief') && client.role !== 'projector') f.private = this.privateFor(client);   // no state frame follows the debrief
      return f;
    }
    const tick = this.run.ticks[idx(entry.t)];
    const f = mkFrame('state', { seq: entry.seq, t: entry.t, hash: tick.state_hash, clock: this.clockView(), public: publicTick(tick, client.role, client.parish) });
    if (client.role !== 'projector') f.private = this.privateFor(client);
    return f;
  }
  sequenced(type, t, extra) {
    const entry = Object.assign({ seq: ++this.seq, type, t }, extra || {});
    this.stream.push(entry);
    // a late joiner still needs the debrief's briefs, so a step rides on the debrief_open it belongs to
    if (type === 'phase') this.lastPhase = entry.kind === 'debrief_step' && this.lastPhase && this.lastPhase.kind === 'debrief_open'
      ? { ...this.lastPhase, payload: { ...this.lastPhase.payload, step: entry.payload.step, step_id: entry.payload.id, placements: entry.payload.placements } }
      : { kind: entry.kind, payload: entry.payload, t, seq: entry.seq };
    for (const c of this.conns.values()) if (c.client) c.send(this.frameFor(entry, c.client));
    return entry;
  }

  /* ----- connections and identity ----- */
  attach(key, send, onClose) { this.conns.set(key, { key, send, onClose, client: null, lobby: false }); }
  detach(key) {
    const c = this.conns.get(key); if (!c) return;
    this.conns.delete(key);
    if (c.client && c.client.conn === c) { c.client.connected = false; c.client.conn = null; this.rosterChanged(); }
  }
  newClient(role, parish, name) {
    const cl = { client_id: 'c_' + randId(6), resume_token: randId(16), role, parish: parish || null, name: name || '', connected: true, conn: null, last_seq: 0, results: new Map(), bot: false };
    this.clients.set(cl.client_id, cl);
    return cl;
  }
  bind(c, cl) {
    if (cl.conn && cl.conn !== c) cl.conn.client = null;
    c.client = cl; c.lobby = false; c.waiting = null; cl.conn = c; cl.connected = true;
  }
  welcome(cl, how) { return mkFrame(how, { client_id: cl.client_id, resume_token: cl.resume_token, role: cl.role, parish: cl.parish, bundle_hash: DATA.build.bundle_hash, snapshot: this.snapshotFor(cl) }); }
  setConsole(parish, cl) {
    const prev = this.seats[parish].console && this.clients.get(this.seats[parish].console);
    if (prev && prev !== cl) {
      prev.role = 'phone';
      if (prev.bot && this.bots[parish]) this.bots[parish].active = false;
      else if (prev.conn && prev.conn.client === prev) prev.conn.send(this.welcome(prev, 'welcome')); // the former holder is now a phone at that table
    }
    this.seats[parish].console = cl.client_id; cl.role = 'console'; cl.parish = parish;
  }
  receive(key, f) {
    const c = this.conns.get(key); if (!c) return;
    if (!f || typeof f !== 'object') return c.send(errorFrame('bad_frame', 'not a JSON object'));
    if (f.v !== PROTO_V) return c.send(mkFrame('reload', { reason: `protocol version ${f.v} is not ${PROTO_V}` }));
    switch (f.type) {
      case 'hello': return this.onHello(c, f);
      case 'claim_seat': return this.onClaim(c, f);
      case 'intent': return this.onIntent(c, f);
      case 'ack': if (c.client && typeof f.seq === 'number') c.client.last_seq = f.seq; return;
      case 'resync': return this.onResync(c, f);
      case 'ping': return c.send(mkFrame('pong', { wall: new Date().toISOString() }));
      default: return c.send(errorFrame('bad_frame', `unknown frame type ${f.type}`));
    }
  }
  onHello(c, f) {
    if (f.client_id) {
      const cl = this.clients.get(f.client_id);
      if (!cl || cl.resume_token !== f.resume_token) return c.send(errorFrame('unknown_client', 'this device is not known here; join afresh'));
      if (f.name) cl.name = f.name;
      this.bind(c, cl); c.send(this.welcome(cl, 'welcome')); this.rosterChanged(); return;
    }
    if (f.token) {
      if (f.token === this.tokens.dm) {
        if (f.pin !== this.tokens.pin) return c.send(errorFrame('bad_pin', 'that is not the PIN'));
        const cl = this.newClient('dm', null, f.name || 'DM'); this.bind(c, cl); c.send(this.welcome(cl, 'welcome')); this.rosterChanged(); return;
      }
      if (f.token === this.tokens.projector) { const cl = this.newClient('projector', null, f.name || 'Projector'); this.bind(c, cl); c.send(this.welcome(cl, 'welcome')); this.rosterChanged(); return; }
      const parish = ROSTER.find(p => this.tokens.tables[p] === f.token);
      if (!parish) return c.send(errorFrame('bad_token', 'no seat has that token'));
      return this.seat(c, parish, f.role === 'console' ? 'console' : 'phone', f.name, 'welcome');
    }
    const code = String(f.session_code || '').trim().toUpperCase();
    if (code !== this.code) return c.send(errorFrame('no_such_session', code ? `no session ${code} here` : 'a session code or a token is needed'));
    c.lobby = true; c.name = f.name || '';
    c.send(mkFrame('lobby', { seats: this.seatsView() }));
  }
  onClaim(c, f) {
    if (!c.lobby && !c.waiting) return c.send(errorFrame('not_welcome', 'say hello with the session code first'));
    if (!ROSTER.includes(f.parish)) return c.send(errorFrame('bad_frame', `no table for ${f.parish}`));
    this.seat(c, f.parish, f.role === 'console' ? 'console' : 'phone', c.name, 'admitted');
  }
  seat(c, parish, role, name, how) {
    if (role === 'console') {
      const holder = this.seats[parish].console && this.clients.get(this.seats[parish].console);
      if (holder && holder.connected && !holder.bot && holder !== c.client) {
        if (!c.client) { const cl = this.newClient('lobby', parish, name); this.bind(c, cl); }
        c.waiting = { parish, role }; c.client.parish = parish;
        c.send(mkFrame('waiting', { reason: 'console_held', parish })); this.rosterChanged(); return;
      }
    }
    const cl = c.client && c.client.role === 'lobby' ? c.client : this.newClient(role, parish, name);
    cl.role = role; cl.parish = parish; this.bind(c, cl);
    if (role === 'console') this.setConsole(parish, cl);
    c.send(this.welcome(cl, how)); this.rosterChanged();
  }
  onResync(c, f) {
    const cl = c.client; if (!cl) return c.send(errorFrame('not_welcome', 'no seat yet'));
    const from = typeof f.from_seq === 'number' ? f.from_seq : 0;
    const buffered = this.stream.filter(e => e.seq > from);
    const complete = this.stream.length && (from >= this.stream[0].seq - 1);
    if (!complete || buffered.length > 600) return c.send(mkFrame('snapshot', { snapshot: this.snapshotFor(cl) }));
    for (const e of buffered) c.send(this.frameFor(e, cl));
  }
  rosterChanged() {
    const f = mkFrame('roster', { seats: this.seatsView(), clients: this.clientsView() });
    for (const c of this.conns.values()) if (c.client && c.client.role === 'dm') c.send(f);
    this.changed();
  }
  changed() { this.events.emit('change', this); this.persistSoon(); }

  /* ----- intents ----- */
  onIntent(c, f) {
    const cl = c.client;
    if (!cl || cl.role === 'lobby') return c.send(errorFrame('not_welcome', 'no seat yet'));
    if (typeof f.client_seq !== 'number') return c.send(errorFrame('bad_frame', 'client_seq is required'));
    const prev = cl.results.get(f.client_seq); if (prev) return c.send(prev);
    const out = mkFrame('intent_result', Object.assign({ client_seq: f.client_seq }, this.handleIntent(cl, f.kind, f.payload || {})));
    cl.results.set(f.client_seq, out); c.send(out);
  }
  reject(reason, message) { return { status: 'rejected', reason, message: message || reason.replace(/_/g, ' ') }; }
  handleIntent(cl, kind, p) {
    if (typeof p !== 'object' || p === null) return this.reject('bad_payload', 'payload must be an object');
    if (CONSOLE_KINDS.includes(kind)) {
      if (cl.role === 'dm') { if (!p.parish_id) return this.reject('bad_payload', 'parish_id names the table'); if (!PIDS.includes(p.parish_id)) return this.reject('unknown_parish', p.parish_id); return this.consoleIntent(cl, p.parish_id, kind, p); }
      if (cl.role !== 'console') return this.reject('bad_role', `${kind} is a console kind`);
      if (!cl.parish) return this.reject('no_seat');
      return this.consoleIntent(cl, cl.parish, kind, p);
    }
    if (NOTE_KINDS.includes(kind)) { if (cl.role !== 'console' || !cl.parish) return this.reject('bad_role', `${kind} is a console kind`); return this.noteIntent(cl, kind, p); }
    if (kind === 'commitment' && cl.role === 'phone') return this.reject('private', 'a commitment stays on the phone; nothing is sent');
    if (PHONE_KINDS.includes(kind)) { if (cl.role !== 'phone') return this.reject('bad_role', `${kind} is a phone kind`); return this.phoneIntent(cl, kind, p); }
    if (DM_KINDS.includes(kind)) { if (cl.role !== 'dm') return this.reject('bad_role', `${kind} is for the DM`); return this.dmIntent(cl, kind, p); }
    return this.reject('unknown_kind', kind);
  }
  record(cl, kind, payload, t, core = false, parish = null) {
    const seq = this.log.length + 1;
    this.log.push({ seq, t, wall: new Date().toISOString(), source: { client_id: cl.client_id, parish: parish || cl.parish || null, role: cl.role }, kind, payload, core });
    return seq;
  }
  acceptCore(cl, parish, kind, fields, applied_t) {
    const payload = cl.role === 'dm' ? { parish_id: parish, ...fields } : fields;
    const seq = this.record(cl, kind, payload, applied_t, true, parish);
    this.inputs.push({ t: applied_t, seq, kind, parish_id: parish, ...fields });
    this.dirty = true;
    if (kind === 'lock_values') this.sequenced('phase', this.horizon, { kind: 'values_locked', payload: { parish_id: parish, values: fields.values, statement: fields.statement || null } }); // extension (README)
    this.changed();
    return { status: 'accepted', input_seq: seq, applied_t };
  }
  validValues(vals) { return Array.isArray(vals) && vals.length === VALUES_TO_PICK && vals.every(v => DECK.includes(v)) && new Set(vals).size === vals.length; }
  consoleIntent(cl, parish, kind, p) {
    if (this.horizon >= T_END) return this.reject('session_over', 'the storm has passed; nothing more can apply');
    const applied_t = this.horizon + STEP;
    const txt = (s, n) => typeof s === 'string' && s.trim() ? s.trim().slice(0, n) : null;
    switch (kind) {
      case 'lock_values': {
        if (!this.validValues(p.values)) return this.reject('bad_values', `pick ${VALUES_TO_PICK} different values from the deck`);
        const statement = txt(p.statement, 140);
        return this.acceptCore(cl, parish, kind, statement ? { values: p.values, statement } : { values: p.values }, applied_t);
      }
      case 'allocate': {
        if (!DATA.tokens[p.token]) return this.reject('unknown_token', String(p.token));
        if (p.to !== 'keep' && !PIDS.includes(p.to)) return this.reject('unknown_parish', String(p.to));
        if (p.to === parish) return this.reject('bad_payload', 'a send names another parish');
        const count = Math.floor(Number(p.count)); if (!(count >= 1)) return this.reject('bad_payload', 'count must be at least 1');
        if (LOCK_T == null) return this.reject('bad_phase', 'this session has no allocation round');
        if (applied_t > LOCK_T) return this.reject('after_lock', `the allocation locked at ${clockStr(LOCK_T)}`);
        const have = this.stockOf(parish, p.token);
        if (have === 0) return this.reject('lacks_tokens', `${pname(parish)} holds no ${p.token}`);
        if (p.to !== 'keep') { const entered = this.entriesOf(parish).filter(e => e.token === p.token && e.to !== 'keep').reduce((a, e) => a + e.count, 0); if (entered + count > have) return this.reject('lacks_tokens', `${pname(parish)} holds ${have} ${p.token}; ${entered} already entered`); }
        return this.acceptCore(cl, parish, kind, { token: p.token, to: p.to, count }, applied_t);
      }
      case 'decide': {
        const d = DATA.dilemmas[p.dilemma_id]; if (!d) return this.reject('unknown_dilemma', String(p.dilemma_id));
        if (!d.options.some(o => o.id === p.option_id)) return this.reject('unknown_option', String(p.option_id));
        const open = this.openCards(parish).find(c => c.dilemma_id === p.dilemma_id);
        if (!open) return this.reject('not_open', `${d.title} is not open for ${pname(parish)}`);
        if (open.deadline_t < applied_t) return this.reject('expired', `the deadline ${clockStr(open.deadline_t)} passed; the storm decided`);
        const rationale = txt(p.rationale, 280);
        return this.acceptCore(cl, parish, kind, rationale ? { dilemma_id: p.dilemma_id, option_id: p.option_id, rationale } : { dilemma_id: p.dilemma_id, option_id: p.option_id }, applied_t);
      }
      case 'mayday': {
        const call = CALL[p.call_id]; if (!call) return this.reject('unknown_call', String(p.call_id));
        if (call.asker !== parish) return this.reject('not_asker', `${p.call_id} is ${pname(call.asker)}'s call`);
        if (this.callRaised(p.call_id)) return this.reject('not_asker', `${p.call_id} was already raised`);
        if (call.windowClosesT != null && call.windowClosesT < applied_t) return this.reject('expired', `the window for ${p.call_id} closed at ${clockStr(call.windowClosesT)}`);
        return this.acceptCore(cl, parish, kind, { call_id: p.call_id }, applied_t);
      }
      case 'answer_aid': {
        const call = CALL[p.call_id]; if (!call) return this.reject('unknown_call', String(p.call_id));
        const open = this.openCalls().find(c => c.call_id === p.call_id);
        if (!open || open.holder !== parish) return this.reject('not_open', `${p.call_id} is not open for ${pname(parish)} to answer`);
        if (!call.answers[p.answer]) return this.reject('bad_answer', `${p.call_id} has no answer ${p.answer}`);
        if (open.deadline_t < applied_t) return this.reject('expired', `the answer window closed at ${clockStr(open.deadline_t)}`);
        const fields = { call_id: p.call_id, answer: p.answer };
        if (p.count != null) { const n = Math.floor(Number(p.count)); if (!(n >= 0)) return this.reject('bad_payload', 'count'); fields.count = n; }
        const reason = txt(p.reason, 120); if (reason) fields.reason = reason;
        return this.acceptCore(cl, parish, kind, fields, applied_t);
      }
      case 'declare_hidden': return this.acceptCore(cl, parish, kind, {}, applied_t);
      case 'repair_send': {
        if (!DATA.tokens[p.token]) return this.reject('unknown_token', String(p.token));
        if (!PIDS.includes(p.to)) return this.reject('unknown_parish', String(p.to));
        if (p.to === parish) return this.reject('bad_payload', 'a send names another parish');
        const count = Math.floor(Number(p.count)); if (!(count >= 1)) return this.reject('bad_payload', 'count must be at least 1');
        const have = this.stockOf(parish, p.token), pendingSends = this.inputs.filter(i => i.kind === 'repair_send' && i.parish_id === parish && i.token === p.token && i.t > this.horizon).reduce((a, i) => a + i.count, 0);
        if (pendingSends + count > have) return this.reject('lacks_tokens', `${pname(parish)} holds ${have} ${p.token}`);
        return this.acceptCore(cl, parish, kind, { token: p.token, to: p.to, count }, applied_t);
      }
      case 'credit_line': {
        if (!PIDS.includes(p.to)) return this.reject('unknown_parish', String(p.to));
        if (p.to === parish) return this.reject('bad_payload', 'credit names another table');
        const text = txt(p.text, 200); if (!text) return this.reject('bad_payload', 'text is required');
        return this.acceptCore(cl, parish, kind, { to: p.to, text }, applied_t);
      }
    }
    return this.reject('unknown_kind', kind);
  }
  phoneIntent(cl, kind, p) {
    const parish = cl.parish;
    const txt = (s, n) => typeof s === 'string' && s.trim() ? s.trim().slice(0, n) : null;
    switch (kind) {
      case 'personal_pick': {
        if (!this.validValues(p.values)) return this.reject('bad_values', `pick ${VALUES_TO_PICK} different values from the deck`);
        this.picks[cl.client_id] = p.values.slice();
        const seq = this.record(cl, kind, { values: p.values }, this.horizon); this.changed();
        return { status: 'accepted', input_seq: seq, applied_t: this.horizon };
      }
      case 'vote': {
        const d = DATA.dilemmas[p.dilemma_id]; if (!d) return this.reject('unknown_dilemma', String(p.dilemma_id));
        if (!d.options.some(o => o.id === p.option_id)) return this.reject('unknown_option', String(p.option_id));
        if (!this.presented(parish, p.dilemma_id)) return this.reject('not_open', 'that card has not reached your table');
        const late = !this.openCards(parish).some(c => c.dilemma_id === p.dilemma_id) || this.inputs.some(i => i.kind === 'decide' && i.parish_id === parish && i.dilemma_id === p.dilemma_id);
        ((this.votes[parish] = this.votes[parish] || {})[p.dilemma_id] = this.votes[parish][p.dilemma_id] || {})[cl.client_id] = { option_id: p.option_id, late };
        const seq = this.record(cl, kind, { dilemma_id: p.dilemma_id, option_id: p.option_id, late }, this.horizon); this.changed();
        return { status: 'accepted', input_seq: seq, applied_t: this.horizon, late };
      }
    }
    return this.reject('unknown_kind', kind);
  }
  noteIntent(cl, kind, p) {
    if (this.phase !== 'debrief') return this.reject('bad_phase', 'a table places its moment at the debrief');
    const moment = typeof p.moment === 'string' ? p.moment.trim().slice(0, 80) : ''; if (!moment) return this.reject('bad_payload', 'self_place needs a moment');
    if (!Number.isInteger(p.anchor) || p.anchor < -3 || p.anchor > 3) return this.reject('bad_payload', 'anchor must be an integer from -3 to 3');
    const label = typeof p.label === 'string' ? p.label.slice(0, 120) : undefined;
    const seq = this.record(cl, kind, { moment, anchor: p.anchor, label }, this.horizon);
    this.placements[cl.parish] = { moment, anchor: p.anchor, label, seq }; this.changed();
    return { status: 'accepted', input_seq: seq, applied_t: this.horizon };
  }
  dmIntent(cl, kind, p) {
    const ok = seq => ({ status: 'accepted', input_seq: seq, applied_t: this.horizon });
    switch (kind) {
      case 'open_island': {
        if (this.phase !== 'lobby') return this.reject('bad_phase', 'the island is already open');
        this.phase = 'island'; const seq = this.record(cl, kind, {}, this.horizon);
        this.sequenced('phase', this.horizon, { kind: 'island_open', payload: {} }); this.changed(); return ok(seq);
      }
      case 'open_quarter': {
        if (!['island', 'quarter_close'].includes(this.phase)) return this.reject('bad_phase', `cannot open a quarter while ${this.phase.replace('_', ' ')}`);
        const next = this.quarter == null ? 0 : this.quarter + 1;
        if (next >= QUARTERS.length) return this.reject('bad_phase', 'there is no quarter after the last; open the debrief');
        this.quarter = next; this.phase = 'quarter_open'; const q = QUARTERS[next];
        const seq = this.record(cl, kind, {}, this.horizon);
        this.sequenced('phase', this.horizon, { kind: 'quarter_open', payload: { quarter: next, id: q.id, title: q.title, from_t: q.fromT, to_t: q.toT, seconds_per_tick: this.spt(q), card: q.card || '', human_deadline_ticks: q.humanDeadlineTicks ?? null, mayday_answer_ticks: q.maydayAnswerTicks ?? null, second_move: q.secondMove || null } });
        this.changed(); return ok(seq);
      }
      case 'start': case 'resume': {
        if (!['quarter_open', 'paused'].includes(this.phase)) return this.reject('bad_phase', `nothing to start while ${this.phase.replace('_', ' ')}`);
        this.phase = 'running'; this.running = true; const seq = this.record(cl, kind, {}, this.horizon);
        this.sequenced('phase', this.horizon, { kind: 'resumed', payload: { quarter: this.quarter, seconds_per_tick: this.spt(QUARTERS[this.quarter]) } });
        this.schedule(); this.changed(); return ok(seq);
      }
      case 'pause': {
        if (this.phase !== 'running') return this.reject('bad_phase', 'the clock is not running');
        this.running = false; clearTimeout(this.timer); this.phase = 'paused'; const seq = this.record(cl, kind, {}, this.horizon);
        this.sequenced('phase', this.horizon, { kind: 'paused', payload: { quarter: this.quarter } }); this.changed(); return ok(seq);
      }
      case 'advance': case 'skip_ahead': {
        if (!['quarter_open', 'running', 'paused'].includes(this.phase)) return this.reject('bad_phase', 'no quarter is open');
        const n = kind === 'skip_ahead' ? Infinity : Math.max(1, Math.floor(Number(p.ticks) || 1));
        const seq = this.record(cl, kind, kind === 'advance' ? { ticks: n } : {}, this.horizon);
        this.advance(n); return ok(seq);
      }
      case 'heat': case 'cool': {
        if (this.horizon >= T_END) return this.reject('session_over');
        const applied_t = this.horizon + STEP;
        this.heat.push({ t: applied_t, delta: kind === 'heat' ? 2 : -2 }); this.dirty = true;
        const seq = this.record(cl, kind, {}, applied_t, true); this.changed();
        return { status: 'accepted', input_seq: seq, applied_t };
      }
      case 'swap': {
        if (!PIDS.includes(p.parish_id)) return this.reject('unknown_parish', String(p.parish_id));
        if (!DATA.dilemmas[p.from] || !DATA.dilemmas[p.to]) return this.reject('unknown_dilemma', `${p.from} -> ${p.to}`);
        if (this.horizon >= T_END) return this.reject('session_over');
        return this.acceptCore(cl, p.parish_id, 'swap', { from: p.from, to: p.to }, this.horizon + STEP);
      }
      case 'admit': {
        const c = [...this.conns.values()].find(x => x.waiting && x.client && x.client.client_id === p.client_id);
        if (!c) return this.reject('bad_payload', 'no device is waiting with that id');
        const { parish } = c.waiting; const seq = this.record(cl, kind, { client_id: p.client_id }, this.horizon);
        const target = c.client; target.role = 'console'; this.setConsole(parish, target); c.waiting = null;
        c.send(this.welcome(target, 'admitted')); this.rosterChanged(); return ok(seq);
      }
      case 'reassign': {
        if (!ROSTER.includes(p.parish_id)) return this.reject('unknown_parish', String(p.parish_id));
        const target = this.clients.get(p.client_id);
        if (!target || !target.connected) return this.reject('bad_payload', 'that device is not connected');
        const seq = this.record(cl, kind, { parish_id: p.parish_id, client_id: p.client_id }, this.horizon);
        const wasWaiting = target.conn && target.conn.waiting; if (target.conn) target.conn.waiting = null;
        this.setConsole(p.parish_id, target);
        if (target.conn) target.conn.send(this.welcome(target, wasWaiting ? 'admitted' : 'welcome'));
        this.rosterChanged(); return ok(seq);
      }
      case 'flag': {
        const text = typeof p.text === 'string' ? p.text.trim().slice(0, 200) : ''; if (!text) return this.reject('bad_payload', 'text is required');
        const parish = p.parish_id && PIDS.includes(p.parish_id) ? p.parish_id : null;
        const seq = this.record(cl, kind, { text, parish_id: parish }, this.horizon);
        this.flags.push({ seq, t: this.horizon, text, parish }); this.changed(); return ok(seq);
      }
      case 'debrief': {
        if (!(this.phase === 'quarter_close' && this.quarter === QUARTERS.length - 1) && this.horizon < T_END) return this.reject('bad_phase', 'the last quarter has not closed');
        this.phase = 'debrief'; this.running = false; clearTimeout(this.timer);
        const seq = this.record(cl, kind, {}, this.horizon);
        this.sequenced('phase', this.horizon, { kind: 'debrief_open', payload: { secret_order: PROFILE.secretOrder || ROSTER, briefs: PROFILE.secretBriefs || {}, debrief_question: PROFILE.debriefQuestion || '', commitment: PROFILE.commitment || '' } });
        if (this.autopilot) this.botPlacements();
        this.changed(); return ok(seq);
      }
      case 'debrief_step': {
        if (this.phase !== 'debrief') return this.reject('bad_phase', 'the debrief is not open');
        if (!Number.isInteger(p.step) || p.step < 0) return this.reject('bad_payload', 'debrief_step needs a step number');
        const id = typeof p.id === 'string' ? p.id.slice(0, 40) : null;
        const seq = this.record(cl, kind, { step: p.step, id }, this.horizon);
        const placements = Object.entries(this.placements).map(([parish_id, v]) => ({ parish_id, moment: v.moment, anchor: v.anchor }));
        this.sequenced('phase', this.horizon, { kind: 'debrief_step', payload: { step: p.step, id, placements } });
        this.changed(); return ok(seq);
      }
      case 'export': {
        const seq = this.record(cl, kind, {}, this.horizon);
        this.events.emit('export', this.exportRun()); return ok(seq);
      }
    }
    return this.reject('unknown_kind', kind);
  }

  /* ----- the clock ----- */
  advance(n) { const q = QUARTERS[this.quarter]; let k = 0; while (k < n && this.horizon < q.toT && this.phase !== 'quarter_close') { this.step(); k++; } }
  step() {
    if (this.dirty) this.recompute();
    this.horizon += STEP;
    this.sequenced('state', this.horizon);
    this.botStep();
    const q = QUARTERS[this.quarter];
    if (this.horizon >= q.toT) {
      this.running = false; clearTimeout(this.timer); this.phase = 'quarter_close';
      this.sequenced('phase', this.horizon, { kind: 'quarter_close', payload: { quarter: q.index, id: q.id, title: q.title } });
      if (this.autopilot) this.autopilotNext();
    }
    this.changed();
  }
  schedule() {
    clearTimeout(this.timer); if (!this.running) return;
    const q = QUARTERS[this.quarter];
    this.timer = setTimeout(() => { if (!this.running) return; this.step(); this.schedule(); }, this.spt(q) * 1000);
  }
  autoDm() { if (!this._auto) { this._auto = { client_id: 'c_autopilot', role: 'dm', parish: null, name: 'Autopilot', results: new Map() }; } return this._auto; }
  autopilotNext() {
    const q = QUARTERS[this.quarter], wait = ms => new Promise(r => setTimeout(r, ms));
    (async () => {
      await wait(q.closeSeconds * 1000 / this.speed);
      if (!this.autopilot) return;
      if (this.quarter >= QUARTERS.length - 1) { this.dmIntent(this.autoDm(), 'debrief', {}); return; }
      this.dmIntent(this.autoDm(), 'open_quarter', {});
      await wait(QUARTERS[this.quarter].cardSeconds * 1000 / this.speed);
      if (!this.autopilot) return;
      this.dmIntent(this.autoDm(), 'start', {});
    })();
  }
  startRehearsal() {
    this.autopilot = true; this.fillBots();
    if (this.phase === 'lobby') this.dmIntent(this.autoDm(), 'open_island', {});
    if (this.phase === 'island') this.dmIntent(this.autoDm(), 'open_quarter', {});
    setTimeout(() => { if (this.autopilot && this.phase === 'quarter_open') this.dmIntent(this.autoDm(), 'start', {}); }, QUARTERS[0].cardSeconds * 1000 / this.speed);
  }

  /* ----- rehearsal bots: random tables, through the same intent path as a real console ----- */
  fillBots() {
    for (const parish of ROSTER) {
      const holder = this.seats[parish].console && this.clients.get(this.seats[parish].console);
      if (holder && holder.connected && !holder.bot) continue;
      if (this.bots[parish] && this.bots[parish].active) continue;
      const rng = mulberry32((this.seed * 7919 + ROSTER.indexOf(parish) * 104729) >>> 0);
      const cl = this.newClient('console', parish, `Rehearsal ${pname(parish)}`); cl.bot = true;
      const phones = [1, 2].map(k => { const ph = this.newClient('phone', parish, `Rehearsal phone ${k}`); ph.bot = true; return ph; });
      this.setConsole(parish, cl);
      const b = { active: true, cl, phones, rng, plan: {}, callPlan: {}, allocated: false, hidden: false, credit: false, maydays: new Set() };
      this.bots[parish] = b;
      const vals = shuffle(DECK, rng).slice(0, VALUES_TO_PICK);
      const statement = (PROFILE.statementTemplate || '{parish} will put ___ before ___, and we will ___.').replace('{parish}', pname(parish)).replace('___', vname(vals[0]).toLowerCase()).replace('___', vname(vals[1]).toLowerCase()).replace('___', 'say so out loud');
      this.handleIntent(cl, 'lock_values', { values: vals, statement: statement.slice(0, 140) });
      for (const ph of phones) this.handleIntent(ph, 'personal_pick', { values: shuffle(DECK, rng).slice(0, VALUES_TO_PICK) });
    }
    this.rosterChanged();
  }
  botStep() {
    const h = this.horizon, q = QUARTERS[this.quarter];
    for (const [parish, b] of Object.entries(this.bots)) {
      if (!b.active) continue;
      const rng = b.rng, chance = p => rng() < p, pick = a => a[Math.floor(rng() * a.length)], others = PIDS.filter(p => p !== parish);
      if (LOCK_T != null && !b.allocated && h + STEP <= LOCK_T && (chance(0.06) || h + 2 * STEP >= LOCK_T)) {
        b.allocated = true;
        for (const [tok, n] of Object.entries((this.tick().stock || {})[parish] || {})) {
          if (chance(0.5)) this.handleIntent(b.cl, 'allocate', { token: tok, to: pick(others), count: 1 + Math.floor(rng() * Math.min(n, 2)) });
          else this.handleIntent(b.cl, 'allocate', { token: tok, to: 'keep', count: n });
        }
      }
      if (DATA.hidden[parish] && !b.hidden && h > -2160 && chance(0.03)) { b.hidden = true; this.handleIntent(b.cl, 'declare_hidden', {}); }
      for (const card of this.openCards(parish)) {
        const left = Math.max(1, (card.deadline_t - h) / STEP);
        const pl = b.plan[card.dilemma_id] || (b.plan[card.dilemma_id] = { at: h + STEP * (1 + Math.floor(rng() * Math.max(1, left - 2))), option: pick(card.options).id, voted: false, sent: false });
        if (!pl.voted && h >= pl.at - STEP) { pl.voted = true; for (const ph of b.phones) this.handleIntent(ph, 'vote', { dilemma_id: card.dilemma_id, option_id: chance(0.6) ? pl.option : pick(card.options).id }); }
        if (!pl.sent && h >= pl.at) { pl.sent = true; this.handleIntent(b.cl, 'decide', { dilemma_id: card.dilemma_id, option_id: pl.option, rationale: 'Rehearsal choice.' }); }
      }
      for (const call of this.openCalls(parish).filter(c => c.role === 'holder')) {
        const left = Math.max(1, (call.deadline_t - h) / STEP);
        const pl = b.callPlan[call.call_id] || (b.callPlan[call.call_id] = { at: h + STEP * Math.floor(rng() * Math.max(1, left - 1)), sent: false });
        if (!pl.sent && h >= pl.at) {
          pl.sent = true;
          const keys = Object.keys(call.answers), answer = chance(0.55) ? 'grant' : pick(keys.filter(k => k !== 'grant'));
          const payload = { call_id: call.call_id, answer, reason: pick(PROFILE.answerReasons || ['Our people first']) };
          if (call.answers[answer] && call.answers[answer].count != null) payload.count = call.answers[answer].count;
          this.handleIntent(b.cl, 'answer_aid', payload);
        }
      }
      for (const id of PROFILE.optionalMaydays || []) {
        const call = CALL[id]; if (!call || call.asker !== parish || b.maydays.has(id)) continue;
        if (call.quarter && q && call.quarter !== q.id) continue;
        if (call.windowClosesT != null && call.windowClosesT < h + STEP) continue;
        if (chance(0.04)) { b.maydays.add(id); this.handleIntent(b.cl, 'mayday', { call_id: id }); }
      }
      if (q && q.id === 'recovery' && !b.credit && chance(0.04)) { b.credit = true; const to = pick(others); this.handleIntent(b.cl, 'credit_line', { to, text: `${pname(to)}'s crews kept the road open when ours could not.` }); }
    }
  }
  // each bot table places a moment it chose (the latest card it decided) a step below or above the middle, as tables often do
  botPlacements() {
    for (const [parish, b] of Object.entries(this.bots)) {
      if (!b.active) continue;
      const d = [...this.inputs].reverse().find(i => i.kind === 'decide' && i.parish_id === parish); if (!d) continue;
      this.handleIntent(b.cl, 'self_place', { moment: `dilemma:${d.dilemma_id}`, anchor: (parish.length % 3) - 1, label: (DATA.dilemmas[d.dilemma_id] || {}).title || d.dilemma_id });
    }
  }

  /* ----- export, persistence, restore ----- */
  exportRun() {
    const req = { seed: this.seed, session: this.session(), teams: this.engineTeams(), inputs: this.engineInputs(), intensity: this.curve(), live: false, until: this.horizon };
    const run = Engine.run(req);
    const votes = {}; for (const [p, byD] of Object.entries(this.votes)) { votes[p] = {}; for (const [d, by] of Object.entries(byD)) votes[p][d] = by; }
    return { run, votes: { votes, picks: this.picks, placements: this.placements }, flags: this.flags, input_log: this.log, session: { code: this.code, seed: this.seed, profile: PROFILE.id, content_hash: this.version.content_hash, roster: ROSTER, public_url: this.publicUrl } };
  }
  persistSoon() { clearTimeout(this._persistTimer); this._persistTimer = setTimeout(() => this.persist(), 400); }
  persist() {
    store.set('host.' + this.code, { code: this.code, seed: this.seed, speed: this.speed, tokens: this.tokens, log: this.log, inputs: this.inputs, heat: this.heat, flags: this.flags, picks: this.picks, votes: this.votes, placements: this.placements, phase: this.phase, quarter: this.quarter, horizon: this.horizon, seq: this.seq, lastPhase: this.lastPhase, saved: Date.now(),
      clients: [...this.clients.values()].filter(c => !c.bot).map(c => ({ client_id: c.client_id, resume_token: c.resume_token, role: c.role, parish: c.parish, name: c.name })), seats: this.seats });
    store.set('host.latest', this.code);
  }
  restoreFrom(s) {
    this.log = s.log || []; this.inputs = s.inputs || []; this.heat = s.heat || []; this.flags = s.flags || []; this.picks = s.picks || {}; this.votes = s.votes || {}; this.placements = s.placements || {};
    this.quarter = s.quarter ?? null; this.horizon = s.horizon ?? T_START; this.seq = s.seq || 0; this.lastPhase = s.lastPhase || null;
    this.phase = s.phase === 'running' ? 'paused' : (s.phase || 'lobby'); this.running = false;
    for (const c of s.clients || []) this.clients.set(c.client_id, { ...c, connected: false, conn: null, last_seq: 0, results: new Map(), bot: false });
    for (const [p, seat] of Object.entries(s.seats || {})) if (this.seats[p]) this.seats[p].console = seat.console && this.clients.has(seat.console) ? seat.console : null;
    this.recompute();
  }
  static saved(code) { return store.get('host.' + (code || store.get('host.latest', '')), null); }
  links() {
    const base = this.publicUrl, q = `?code=${this.code}`;
    return { code: this.code, public_url: base, lobby: `${base}${q}`, tables: Object.fromEntries(ROSTER.map(p => [p, `${base}${q}&role=table&parish=${p}#t=${this.tokens.tables[p]}`])), phones: Object.fromEntries(ROSTER.map(p => [p, `${base}${q}&role=phone&parish=${p}#t=${this.tokens.tables[p]}`])), projector: `${base}${q}&role=projector#p=${this.tokens.projector}`, dm: `${base}${q}&role=dm#dm=${this.tokens.dm}`, pin: this.tokens.pin };
  }
  stop() { this.running = false; clearTimeout(this.timer); this.autopilot = false; }
}

/* The BroadcastChannel side of an in-page host: other windows of this browser join through it. */
class ChannelServer {
  constructor(host, name = CHANNEL_NAME) {
    this.host = host; this.bc = new BroadcastChannel(name);
    this.bc.onmessage = ev => {
      const m = ev.data; if (!m || m.to !== 'host' || !m.from) return;
      if (m.probe) { if (!host.conns.has(m.from)) host.attach(m.from, f => this.bc.postMessage({ to: m.from, frame: f })); this.bc.postMessage({ to: m.from, ready: true }); return; }
      if (m.bye) { host.detach(m.from); return; }
      if (m.frame) { if (!host.conns.has(m.from)) host.attach(m.from, f => this.bc.postMessage({ to: m.from, frame: f })); host.receive(m.from, m.frame); }
    };
    addEventListener('pagehide', () => { try { this.bc.postMessage({ to: '*', bye: true }); } catch (e) { /* closing */ } });
  }
  close() { this.bc.postMessage({ to: '*', bye: true }); this.bc.close(); }
}
