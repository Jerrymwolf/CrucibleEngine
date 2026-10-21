/* ---------- the client's world: everything a role renders, built only from host frames ----------
   Nothing here decides an outcome. The world keeps the public ticks it was sent (fog applied by the
   host), the last report seen of each parish, the open cards and calls from the private view, the
   convoys and residents from events, the statements as they lock, and the latest phase. Deadlines
   count down from deadline_t at seconds_per_tick, re-anchored by every state frame (PROTOCOL.md 8). */
const SEV = { info: '', warn: 'warn', critical: 'critical', good: 'good', human: 'human', private: 'private' };
const FEED_SKIP = new Set(['degradation', 'consequence', 'chance', 'directive', 'narrative']);
const ANSWER_LABEL = { grant: 'GRANT', refuse: 'REFUSE', part: 'PART', refuse_silent: 'NO ANSWER (THE STORM DECIDED)', warn_only: 'WARN ONLY', boats_to_hill: 'BOATS TO THE HILL', lobby: 'LOBBY' };
const answerLabel = (callId, answer) => { const c = CALL[callId]; return (c && c.answers[answer] && c.answers[answer].label) || ANSWER_LABEL[answer] || String(answer || '').toUpperCase(); };
const optLabel = (dilemmaId, optionId) => { const d = DATA.dilemmas[dilemmaId]; const o = d && d.options.find(x => x.id === optionId); return o ? o.label : optionId; };
const residentName = e => { if (e.card_id) { const c = DATA.residentCards.find(x => x.id === e.card_id); return c ? c.name : e.card_id; } const g = DATA.residentGroups.find(x => x.id === e.group_id); return g ? g.name : (e.group_id || 'residents'); };
// a phase frame carries no clock block; the clock's phase follows the frame until the next state frame (none arrive while paused)
const PHASE_CLOCK = { values_open: 'lobby', island_open: 'island', quarter_open: 'quarter_open', resumed: 'running', paused: 'paused', quarter_close: 'quarter_close', debrief_open: 'debrief', debrief_step: 'debrief' };

function momentKey(e) { return e.gkind === 'dilemma' ? `dilemma:${e.gid}` : e.gkind === 'aid' ? `aid:${e.gid}` : e.gkind === 'repair' || e.gkind === 'credit' ? 'recovery-support' : e.gid === 'declare_hidden' ? 'declare' : 'allocation'; }
function momentLabel(e) {
  if (e.gkind === 'dilemma') return (DATA.dilemmas[e.gid] || { title: e.gid }).title;
  if (e.gkind === 'aid') { const c = CALL[e.gid]; return `Mayday ${e.gid}${c ? ` from ${pname(c.asker)}` : ''}`; }
  if (e.gkind === 'repair' || e.gkind === 'credit') return 'Recovery: repairs and credit';
  return e.gid === 'declare_hidden' ? 'Declaring the hidden stock' : 'The allocation round';
}
function describe(e) {
  const P = id => pname(id);
  switch (e.kind) {
    case 'window_transition': return { sev: 'info', text: e.narrative || `${e.to}` };
    case 'cascade': return { sev: 'critical', text: e.narrative || `${P(e.parish_id)} ${SYS_LABEL[e.system] || e.system} ${e.delta} (${e.rule_id})` };
    case 'connectivity': return { sev: e.status === 'lost' ? 'warn' : 'good', text: `${P(e.parish_id)}: ${SYS_LABEL[e.system] || e.system} ${e.status.replace('_', ' ')} (via ${P(e.source)})` };
    case 'isolation': return e.ended ? { sev: 'good', text: e.narrative || `Road access to ${P(e.parish_id)} restored` } : { sev: 'critical', text: e.narrative || `No open road out of ${P(e.parish_id)}` };
    case 'dilemma_presented': return { sev: 'human', text: `${P(e.parish_id)} has a card: ${e.title}. Decide by ${clockStr(e.deadline_t)}.` };
    case 'decision': return e.decided_by === 'storm'
      ? { sev: 'critical', text: `${P(e.parish_id)} let the deadline pass; the storm took the default, ${letterOf(e.dilemma_id, e.option_id)}: ${e.option_label || optLabel(e.dilemma_id, e.option_id)}`, storm: true }
      : { sev: 'human', text: `${P(e.parish_id)} chose ${letterOf(e.dilemma_id, e.option_id)}: ${e.option_label || optLabel(e.dilemma_id, e.option_id)}${e.rationale ? ` — "${e.rationale}"` : ''}` };
    case 'route_cut': return { sev: 'critical', text: e.narrative || `${e.name || e.route_id} cut` };
    case 'route_reopened': return { sev: 'good', text: e.narrative || `${e.name || e.route_id} open again` };
    case 'convoy_departed': return { sev: 'info', text: `${e.count} ${tname(e.token)} ${P(e.from)} → ${P(e.to)}, arriving ${clockStr(e.arrive_t)}${e.purpose && e.purpose !== 'allocation' ? ` (${e.purpose.replace('effect:', 'after ').replace('aid:', 'aid ')})` : ''}` };
    case 'convoy_arrived': return { sev: 'good', text: `${e.count} ${tname(e.token)} from ${P(e.from)} reached ${P(e.to)}` };
    case 'convoy_turned_back': return { sev: 'warn', text: e.narrative || `${e.count} ${tname(e.token)} for ${P(e.to)} turned back; the road was cut` };
    case 'token_returned': return { sev: 'info', text: `${e.count} ${tname(e.token)} back on ${P(e.parish_id)}'s sheet` };
    case 'allocation': {
      if (e.entry === 'send') return { sev: 'human', text: `${P(e.parish_id)} sends ${e.count} ${tname(e.token)} to ${P(e.to)}` };
      if (e.entry === 'repair_send') return { sev: 'human', text: `${P(e.parish_id)} sends ${e.count} ${tname(e.token)} to ${P(e.to)} for the repairs` };
      if (e.entry === 'keep_everything') return { sev: 'human', text: `${P(e.parish_id)} keeps everything` };
      if (e.entry === 'declare_hidden') return { sev: 'human', text: `${P(e.parish_id)} declares what it had not reported` };
      return { sev: 'human', text: `${P(e.parish_id)} keeps ${e.token === '*' ? 'the rest' : `${e.count} ${tname(e.token)}`}` };
    }
    case 'values_locked': return { sev: 'human', text: `${P(e.parish_id)} stated its values: ${(e.values || []).map(vname).join(', ')}${e.statement ? ` — "${e.statement}"` : ''}` };
    case 'credit_line': return { sev: 'good', text: `${P(e.parish_id)} credits ${P(e.to)}: "${e.text}"` };
    case 'mayday': return { sev: 'critical', text: `MAYDAY ${e.call_id}: ${P(e.asker)} asks ${P(e.holder)}${e.token ? ` for ${e.count} ${tname(e.token)}` : ''}. Answer by ${clockStr(e.deadline_t)}.` };
    case 'aid_answer': return { sev: e.answer === 'grant' || e.answer === 'part' ? 'good' : 'critical', text: e.controller === 'silence' ? `${P(e.holder)} gave ${P(e.asker)} no answer on ${e.call_id} (the storm decided: ${e.label || answerLabel(e.call_id, e.answer)})` : `${P(e.holder)} answers ${P(e.asker)} on ${e.call_id}: ${e.label || answerLabel(e.call_id, e.answer)}${e.count ? ` (${e.count})` : ''}${e.delivered === false ? ` — ${e.note || 'nothing could travel'}` : ''}` };
    case 'aid_expired': return { sev: 'critical', text: `${e.call_id}: no answer from ${P(e.holder)} before the window closed` };
    case 'resident_state': return { sev: e.state === 'lost' ? 'critical' : e.state === 'injured' || e.state === 'at_risk' ? 'warn' : 'good', text: `${residentName(e)}${e.count && e.group_id ? ` (${e.count})` : ''}: ${RES_LABEL[e.state] || e.state}${e.narrative ? ` — ${e.narrative}` : ''}` };
    case 'ship_sailed': return { sev: 'good', text: `${e.consignment === 'next' ? 'The next consignment' : `The ${e.consignment}`} sails with ${fmt(e.doses)} doses` };
    case 'consignment_missed': return { sev: 'critical', text: `Consignment missed: ${e.reason || ''}` };
    case 'doses_lost': return { sev: 'critical', text: `${fmt(e.doses)} doses lost${e.reason ? ` (${e.reason})` : ''}` };
    case 'rejected': return { sev: 'private', text: `Not applied (${String(e.source || '').replace('input:', '')}): ${e.reason}` };
    case 'degradation': return { sev: 'warn', text: `${P(e.parish_id)} ${SYS_LABEL[e.system] || e.system} ${e.delta} (${e.cause})` };
    case 'consequence': return { sev: 'warn', text: e.narrative || `${P(e.parish_id)} ${SYS_LABEL[e.system] || e.system} ${e.delta} after ${e.dilemma_id}` };
    case 'chance': return { sev: 'info', text: `${P(e.parish_id)}: chance ${Math.round(e.p * 100)}% ${e.hit ? 'hit' : 'missed'} (${e.source})` };
    default: return { sev: 'info', text: e.narrative || e.kind };
  }
}

class World extends Emitter {
  constructor(client) {
    super();
    this.client = client;
    this.role = null; this.parish = null;
    this.session = null; this.clock = null; this.t = T_START; this.seq = 0; this.hash = null;
    this.tick = null; this.ticks = []; this.lastSeen = {}; this.fogged = [];
    this.teams = {}; this.feed = []; this.cards = {}; this.calls = {}; this.convoys = {}; this.residents = { cards: {}, groups: {} }; this.scored = []; this.routeCutAt = {};
    this.phase = null; this.quarterCard = null; this.debrief = null; this.private = null; this.lobby = null; this.waiting = null; this.roster = null;
    this.conn = 'connecting'; this.lastError = null; this.anchor = { wall: performance.now(), t: T_START }; this.scrub = null;
    this.results = []; // intent results for the console's status line
    client.on('snapshot', (snap, f) => this.applySnapshot(snap, f));
    client.on('state', f => this.applyState(f));
    client.on('phase', f => this.applyPhase(f));
    client.on('lobby', f => { this.lobby = f; this.emit('lobby', f); this.changed(); });
    client.on('waiting', f => { this.waiting = f; this.emit('waiting', f); this.changed(); });
    client.on('roster', f => { this.roster = f; this.changed(); });
    client.on('intent_result', f => { this.results.push(f); if (this.results.length > 50) this.results.shift(); this.emit('result', f); this.changed(); });
    client.on('error', f => { this.lastError = f; this.emit('error', f); this.changed(); });
    client.on('conn', (s, info) => { this.conn = s; this.connInfo = info; this.changed(); });
    client.on('reload', f => { this.emit('reload', f); });
  }
  // coalesced to a frame, or to 120 ms when the tab gets no frames (behind another window of the same browser)
  changed() {
    if (this._pending) return; this._pending = true;
    const fire = () => { if (!this._pending) return; this._pending = false; cancelAnimationFrame(raf); clearTimeout(tm); this.emit('change', this); };
    const raf = requestAnimationFrame(fire), tm = setTimeout(fire, 120);
  }
  get ready() { return !!this.session; }
  // the host's session block names quarter fields as the protocol does (from_t, human_deadline_ticks); the bundle's QUARTERS as the content does (fromT). The UIs read either.
  get quarter() {
    if (!this.clock || this.clock.quarter == null || !this.session) return null;
    const sq = (this.session.quarters || [])[this.clock.quarter] || {}, bq = QUARTERS[this.clock.quarter] || {};
    return { ...bq, ...sq, fromT: sq.from_t ?? bq.fromT, toT: sq.to_t ?? bq.toT, cardSeconds: sq.card_seconds ?? bq.cardSeconds, playSeconds: sq.play_seconds ?? bq.playSeconds, closeSeconds: sq.close_seconds ?? bq.closeSeconds, humanDeadlineTicks: sq.human_deadline_ticks ?? bq.humanDeadlineTicks ?? null, maydayAnswerTicks: sq.mayday_answer_ticks ?? bq.maydayAnswerTicks ?? null, secondMove: sq.second_move ?? bq.secondMove ?? null };
  }
  get spt() { return (this.clock && this.clock.seconds_per_tick) || QUARTERS[0].playSeconds / QUARTERS[0].ticks; }
  get running() { return !!(this.clock && this.clock.running); }
  // simulation time now, between ticks, for animation: never ahead of the next tick
  get nowT() { if (this.scrub != null) return this.scrub; if (!this.running) return this.t; const el = (performance.now() - this.anchor.wall) / 1000; return this.t + STEP * clamp(el / this.spt, 0, 0.98); }
  // the tick the map shows: the replay scrub position at the debrief, otherwise the horizon
  view() { return this.scrub != null ? (this.ticks[idx(this.scrub)] || this.tick) : this.tick; }
  get viewT() { return this.scrub != null ? this.scrub : this.t; }
  secondsLeft(deadlineT) { const base = ((deadlineT - this.t) / STEP) * this.spt; const el = this.running ? (performance.now() - this.anchor.wall) / 1000 : 0; return Math.max(0, base - el); }
  ticksLeft(deadlineT) { return Math.max(0, (deadlineT - this.t) / STEP); }

  applySnapshot(snap, f) {
    this.role = f.role || this.client.role || this.role; this.parish = f.parish !== undefined ? f.parish : (this.client.parish || this.parish);
    this.session = snap.session || this.session; this.clock = snap.clock || this.clock; this.seq = snap.seq || 0; this.hash = snap.hash || null;
    this.teams = {}; for (const tm of snap.teams || []) this.teams[tm.parish_id] = { stated_values: tm.stated_values || [], statement: tm.statement || null, controller: tm.controller };
    this.feed = []; this.cards = {}; this.calls = {}; this.convoys = {}; this.residents = { cards: {}, groups: {} }; this.scored = []; this.routeCutAt = {}; this.ticks = []; this.lastSeen = {};
    for (const h of snap.history || []) this.ingest(h.t, h.event, false);
    this.historyTruncated = !!snap.history_truncated;
    if (snap.tick) this.setTick(snap.tick, snap.t);
    this.private = snap.private || null;
    if (snap.last_phase) this.applyPhase({ kind: snap.last_phase.kind, payload: snap.last_phase.payload, t: snap.last_phase.t, seq: snap.last_phase.seq }, true);
    this.lobby = null; this.waiting = null;
    this.anchor = { wall: performance.now(), t: this.t };
    this.emit('snapshot', snap);
    this.changed();
  }
  applyState(f) {
    this.seq = f.seq; this.hash = f.hash; this.clock = f.clock || this.clock;
    this.setTick(f.public, f.t);
    for (const e of (f.public && f.public.events) || []) this.ingest(f.t, e, true);
    if (f.private) this.private = f.private;
    this.anchor = { wall: performance.now(), t: f.t };
    this.emit('tick', f);
    this.changed();
  }
  setTick(tick, t) {
    this.t = t; this.tick = tick; this.ticks[idx(t)] = tick; this.fogged = tick.fogged || [];
    for (const p of PIDS) if (tick.infrastructure && tick.infrastructure[p]) this.lastSeen[p] = { t, infrastructure: tick.infrastructure[p], morale: (tick.morale || {})[p], stock: (tick.stock || {})[p] || {}, isolated: (tick.isolated || []).includes(p) };
  }
  applyPhase(f, fromSnapshot) {
    this.phase = { kind: f.kind, payload: f.payload || {}, t: f.t, seq: f.seq };
    const ph = fromSnapshot ? null : PHASE_CLOCK[f.kind];               // a snapshot's own clock block is newer than its last_phase
    if (ph) {
      const p = f.payload || {}, c = { ...(this.clock || {}), phase: ph, running: ph === 'running' };
      if (p.quarter != null) c.quarter = p.quarter; else if (ph === 'lobby' || ph === 'island') c.quarter = null;
      if (p.seconds_per_tick) c.seconds_per_tick = p.seconds_per_tick;
      if (f.kind === 'quarter_open' && p.to_t != null) c.quarter_end_t = p.to_t;
      this.clock = c; this.anchor = { wall: performance.now(), t: this.t };
    }
    if (f.kind === 'quarter_open') this.quarterCard = f.payload;
    if (f.kind === 'debrief_open') { this.debrief = f.payload; const p = f.payload || {}; this.debriefStep = p.step != null ? { step: p.step, id: p.step_id, placements: p.placements || [] } : { step: 0, id: 'counters', placements: [] }; }
    if (f.kind === 'debrief_step') this.debriefStep = f.payload || this.debriefStep;
    if (f.private) this.private = f.private;
    if (f.kind === 'values_locked' && f.payload && f.payload.parish_id) this.teams[f.payload.parish_id] = { ...(this.teams[f.payload.parish_id] || {}), stated_values: f.payload.values || [], statement: f.payload.statement || null };
    if (!fromSnapshot) this.emit('phase', f);
    this.changed();
  }
  ingest(t, e, live) {
    switch (e.kind) {
      case 'dilemma_presented': this.cards[e.parish_id + '|' + e.dilemma_id] = { parish_id: e.parish_id, dilemma_id: e.dilemma_id, title: e.title, presented_t: t, deadline_t: e.deadline_t, decision: null }; break;
      case 'decision': { const k = e.parish_id + '|' + e.dilemma_id; const c = this.cards[k] || (this.cards[k] = { parish_id: e.parish_id, dilemma_id: e.dilemma_id, title: (DATA.dilemmas[e.dilemma_id] || {}).title, presented_t: null, deadline_t: null }); c.decision = { t, option_id: e.option_id, option_label: e.option_label, decided_by: e.decided_by || 'table', controller: e.controller, rationale: e.rationale }; this.scored.push({ t, parish_id: e.parish_id, gkind: 'dilemma', gid: e.dilemma_id, gopt: e.option_id, glabel: `${letterOf(e.dilemma_id, e.option_id)} on ${(DATA.dilemmas[e.dilemma_id] || { title: e.dilemma_id }).title}`, values_signaled: e.values_signaled || {}, decided_by: e.decided_by, reason: e.rationale || '' }); break; }
      case 'allocation': this.scored.push({ t, parish_id: e.parish_id, gkind: e.entry === 'repair_send' ? 'repair' : 'allocation', gid: e.entry === 'declare_hidden' ? 'declare_hidden' : e.entry === 'keep_everything' ? 'allocate:keep' : `allocate:${e.token}`, gopt: e.entry === 'send' || e.entry === 'repair_send' ? `send:${e.to}` : e.entry === 'declare_hidden' ? 'declare' : e.entry, glabel: describe(e).text.replace(pname(e.parish_id) + ' ', ''), values_signaled: e.values_signaled || {}, decided_by: e.entry === 'keep_everything' ? 'storm' : undefined }); break;
      case 'aid_answer': { const c = this.calls[e.call_id] || (this.calls[e.call_id] = { call_id: e.call_id, asker: e.asker, holder: e.holder }); c.answer = { t, answer: e.answer, label: e.label, count: e.count, controller: e.controller, delivered: e.delivered !== false }; this.scored.push({ t, parish_id: e.holder, gkind: 'aid', gid: e.call_id, gopt: e.answer, glabel: e.controller === 'silence' ? `no answer to ${pname(e.asker)} (${e.call_id}): the storm decided` : `${e.label || answerLabel(e.call_id, e.answer)} to ${pname(e.asker)} (${e.call_id})`, values_signaled: e.values_signaled || {}, decided_by: e.controller === 'silence' ? 'storm' : undefined, reason: e.rationale || e.reason || '' }); break; }
      case 'aid_expired': { const c = this.calls[e.call_id] || (this.calls[e.call_id] = { call_id: e.call_id, holder: e.holder }); c.answer = { t, answer: 'expired', label: 'no answer', controller: 'silence' }; break; }
      case 'mayday': this.calls[e.call_id] = { call_id: e.call_id, asker: e.asker, holder: e.holder, token: e.token, count: e.count, opened_t: t, deadline_t: e.deadline_t, ask: e.ask, line: e.line, persona_id: e.persona_id, raised_by: e.raised_by, answer: null }; break;
      case 'credit_line': this.scored.push({ t, parish_id: e.parish_id, gkind: 'credit', gid: `credit:${e.to}`, gopt: 'credit', glabel: `credit to ${pname(e.to)}`, values_signaled: e.values_signaled || {}, text: e.text, to: e.to }); break;
      case 'values_locked': this.teams[e.parish_id] = { ...(this.teams[e.parish_id] || {}), stated_values: e.values || [], statement: e.statement || null, locked_t: t }; break;
      case 'convoy_departed': this.convoys[e.convoy_id] = { id: e.convoy_id, from: e.from, to: e.to, token: e.token, count: e.count, route_ids: e.route_ids || [], depart_t: t, arrive_t: e.arrive_t, purpose: e.purpose, status: 'moving' }; break;
      case 'convoy_arrived': { const c = this.convoys[e.convoy_id]; if (c) { c.status = 'arrived'; c.end_t = t; } break; }
      case 'convoy_turned_back': { const c = this.convoys[e.convoy_id]; if (c) { c.status = 'returning'; c.turn_t = t; c.return_t = e.return_t; c.route_id = e.route_id; } break; }
      case 'token_returned': for (const c of Object.values(this.convoys)) if (c.status === 'returning' && c.from === e.parish_id && c.token === e.token && !c.end_t) { c.status = 'returned'; c.end_t = t; break; } break;
      case 'resident_state': if (e.card_id) this.residents.cards[e.card_id] = { state: e.state, t, narrative: e.narrative, source: e.source }; else if (e.group_id) this.residents.groups[e.group_id] = { state: e.state, count: e.count, t, narrative: e.narrative, source: e.source }; break;
      case 'route_cut': this.routeCutAt[e.route_id] = t; break;
      case 'route_reopened': delete this.routeCutAt[e.route_id]; break;
    }
    if (!FEED_SKIP.has(e.kind)) {
      const d = describe(e);
      this.feed.push({ t, event: e, sev: d.sev, text: d.text, storm: !!d.storm, live });
      if (this.feed.length > 600) this.feed.splice(0, this.feed.length - 600);
    }
    if (live) this.emit('event', t, e);
  }
  /* the record, as crucible-core 0.3 keeps it (values.rs): one moment per card, call, allocation round, declaration
     or recovery move; within a moment the strongest signal per value (ties to the negative); a moment the storm
     decided (a card or call left to the clock, an allocation never made) is listed, never rated. No mean. */
  moments(parish) {
    const out = new Map();
    for (const e of this.scored.filter(x => x.parish_id === parish)) {
      const key = momentKey(e), storm = e.decided_by === 'storm';
      let m = out.get(key);
      if (!m) { m = { key, label: momentLabel(e), t: e.t, storm, kind: e.gkind, dilemma_id: e.gkind === 'dilemma' ? e.gid : null, option_id: e.gkind === 'dilemma' ? e.gopt : null, signals: {}, reasons: [], pressure: null, events: [] }; out.set(key, m); }
      m.events.push(e); m.storm = m.storm && storm;
      if (e.reason && !storm) m.reasons.push(e.reason);
      if (!storm) for (const [v, sig] of Object.entries(e.values_signaled || {})) { const cur = m.signals[v]; if (cur == null || Math.abs(sig) > Math.abs(cur) || (Math.abs(sig) === Math.abs(cur) && sig < cur)) m.signals[v] = sig; }
      if (m.dilemma_id) { const d = DATA.dilemmas[m.dilemma_id] || {}; const o = (d.options || []).find(x => x.id === m.option_id); m.pressure = o && o.pressure || null; m.debrief = d.debrief || ''; m.letter = letterOf(m.dilemma_id, m.option_id); m.option_label = o ? o.label : m.option_id; }
    }
    // Capitulating is giving way to a pressure: a -2 on a moment that carried none reads as Faltering.
    for (const m of out.values()) if (!m.pressure) for (const [v, sig] of Object.entries(m.signals)) if (sig === -2) m.signals[v] = -1;
    return [...out.values()].sort((a, b) => a.t - b.t);
  }
  /* the engine's reading of one moment: { lo, hi } over its values, a trade-off when one value was served at
     another's cost; null when the storm decided or nothing carried a signal */
  reading(m) {
    const sigs = Object.entries(m.signals);
    if (m.storm || !sigs.length) return null;
    const lo = Math.min(...sigs.map(([, s]) => s)), hi = Math.max(...sigs.map(([, s]) => s));
    return { lo, hi, tradeoff: lo < 0 && hi > 0, served: sigs.filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]), cost: sigs.filter(([, s]) => s < 0).sort((a, b) => a[1] - b[1]) };
  }
  /* per stated value: the chosen moments that touched it and the storm's apart; tested once two chosen moments did */
  gapRows(parish) {
    const stated = (this.teams[parish] || {}).stated_values || [], ms = this.moments(parish);
    return stated.map((v, i) => {
      const chosen = ms.filter(m => !m.storm && Object.prototype.hasOwnProperty.call(m.signals, v)).map(m => ({ ...m, signal: m.signals[v] }));
      const storm = ms.filter(m => m.storm && m.dilemma_id && ((DATA.dilemmas[m.dilemma_id] || {}).valuesTested || []).includes(v));
      return { value: v, stated_rank: i + 1, tested: chosen.length >= 2, n_chosen: chosen.length, evidence: chosen, storm };
    });
  }
  decisionsOf(parish) { return Object.values(this.cards).filter(c => c.parish_id === parish && c.decision).sort((a, b) => a.decision.t - b.decision.t); }
  credits() { return this.scored.filter(e => e.gkind === 'credit'); }
  residentState(cardId) { const r = this.residents.cards[cardId]; return r ? r.state : 'safe'; }
  report(p) { return this.lastSeen[p] || null; }
  isFogged(p) { return this.fogged.includes(p); }
  routeCut(id) { const tk = this.view(); return !!(tk && (tk.routes_cut || []).includes(id)); }
  openCardsFor(parish) { return ((this.private && this.private.pending) || []).filter(c => !parish || c.parish_id === parish || c.parish_id === undefined); }
  intent(kind, payload) { return this.client.intent(kind, payload); }
}
