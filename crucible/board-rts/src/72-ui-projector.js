/* ---------- projector (the wall) ----------
   Readable from the back of the room: the island, two counters, the six tables, the radio. Between
   quarters the wall carries the quarter card; at the end it carries the debrief sequence: counters,
   the six secrets one by one, the stated-vs-enacted mirror per table, the credit lines, the replay. */
const ProjectorUI = {
  world: null, step: 0, manual: false, autoTimer: null, scrubPlaying: false,
  init(world) {
    this.world = world;
    document.body.classList.add('role-projector');
    R.insets = () => ({ l: 12, r: 12, t: 84, b: 180 }); R.minimap = false;
    $('app').innerHTML = `<div class="topbar" id="tb"></div><div id="eye"></div><div class="strip"><div class="panel feed"><header><h2>Radio · Concordia</h2><span class="dim" id="feed-n"></span></header><div class="feed-list" id="feed"></div></div><div class="panel" style="padding:6px"><div class="tables" id="tables"></div></div></div><div id="full"></div>`;
    world.on('change', () => this.render());
    world.on('phase', f => { if (f.kind === 'debrief_open') { this.step = 0; this.manual = false; this.schedule(); } if (f.kind !== 'debrief_open') this.leaveReplay(); });
    addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.manual = true; this.next(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.manual = true; this.prev(); } else if (e.key.toLowerCase() === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } });
    onClick($('app'), '#full', (el, e) => { if (e.target.closest('input,button')) return; this.manual = true; this.next(); });
    onClick($('app'), '[data-act="scrub-play"]', () => { this.scrubPlaying = !this.scrubPlaying; this.render(); });
    $('app').addEventListener('input', e => { if (e.target.id === 'scrub') { this.scrubPlaying = false; this.world.scrub = tOf(Number(e.target.value)); this.world.changed(); } });
    Live.fns.add(() => { if (this.scrubPlaying && this.world.scrub != null) { const i = idx(this.world.scrub) + 1; if (i > idx(this.world.t)) { this.scrubPlaying = false; this.world.scrub = this.world.t; } else this.world.scrub = tOf(i); const r = $('scrub'); if (r) r.value = String(idx(this.world.scrub)); const lab = $('scrub-t'); if (lab) lab.textContent = clockStr(this.world.scrub); this.world.changed(); } });
    this.render();
    if (R.ready) R.cam.fit(1620);
  },
  steps() { const db = this.world.debrief || {}; const order = (db.secret_order || ROSTER).filter(p => (db.briefs || {})[p]); return ['counters', ...order.map(p => 'secret:' + p), 'mirror', 'credits', 'replay']; },
  next() { const n = this.steps().length; this.step = Math.min(n - 1, this.step + 1); this.schedule(); this.render(); },
  prev() { this.step = Math.max(0, this.step - 1); this.schedule(); this.render(); },
  schedule() { clearTimeout(this.autoTimer); if (this.manual) return; this.autoTimer = setTimeout(() => { if (!this.manual && this.world.clock && this.world.clock.phase === 'debrief' && this.step < this.steps().length - 1) this.next(); }, 25000); },
  leaveReplay() { if (this.world.scrub != null) { this.world.scrub = null; this.scrubPlaying = false; this.world.changed(); } },
  tableStatus(p) {
    const w = this.world, c = w.clock || {}, tm = w.teams[p];
    const openCard = Object.values(w.cards).find(x => x.parish_id === p && !x.decision && x.presented_t != null);
    const openCall = Object.values(w.calls).find(x => !x.answer && (x.holder === p || x.asker === p));
    const rep = w.report(p), iso = rep && rep.isolated ? ' <span class="tag bad">isolated</span>' : '';
    if (openCall && openCall.holder === p) return `<span class="s card" style="color:#ffb4ad">answering ${esc(pname(openCall.asker))} · <span class="num" data-countdown="${openCall.deadline_t}"></span></span>`;
    if (openCard) return `<span class="s card">deciding · <span class="num" data-countdown="${openCard.deadline_t}"></span></span>${iso}`;
    if (openCall && openCall.asker === p) return `<span class="s" style="color:#ffb4ad">MAYDAY ${esc(openCall.call_id)} → ${esc(pname(openCall.holder))}</span>${iso}`;
    const ds = w.decisionsOf(p); const last = ds[ds.length - 1];
    if (c.phase === 'lobby' || c.phase === 'island') return `<span class="s">${tm && tm.stated_values && tm.stated_values.length ? 'statement locked' : 'choosing values…'}</span>`;
    if (last) return `<span class="s">${last.decision.decided_by === 'storm' ? '<span class="tag storm">storm</span> ' : ''}${letterOf(last.dilemma_id, last.decision.option_id)} · ${esc(last.decision.option_label || optLabel(last.dilemma_id, last.decision.option_id))}</span>${iso}`;
    return `<span class="s dim">holding</span>${iso}`;
  },
  render() {
    const w = this.world; if (!w.ready) return;
    const c = w.clock || {};
    setHTML($('tb'), topbarHTML(w, 'Concordia · broadcast', 'var(--fg)'));
    setHTML($('tables'), ROSTER.map(p => `<div class="tcard" style="border-top-color:${pcolor(p)}"><b style="color:${pcolor(p)}">${esc(pname(p))}</b>${this.tableStatus(p)}</div>`).join(''));
    setHTML($('feed'), feedHTML(w.feed.filter(f => f.sev !== 'private'), { limit: 12, empty: 'The radio is quiet.' }));
    setHTML($('feed-n'), `${(w.tick && w.tick.weather) ? `${Math.round(w.tick.weather.wind_kts || 0)} kt · surge ${(w.tick.weather.surge_ft || 0).toFixed(1)} ft` : ''}`);
    const inEye = w.t >= EYE_FROM && w.t <= EYE_TO && c.phase !== 'quarter_close';
    setHTML($('eye'), c.phase === 'paused' ? `<div class="eye">Paused<small>The DM stopped the clock.</small></div>` : inEye ? `<div class="eye">The eye<small>Midas is over Concordia. Two hours of calm; the back wall follows.</small></div>` : '');
    setHTML($('full'), this.fullHTML(c));
  },
  fullHTML(c) {
    const w = this.world, s = w.session || {};
    if (c.phase === 'lobby') return `<div class="full"><div class="kicker">Parish Values</div><h2>Six parishes. One storm.</h2><div class="statements">${ROSTER.map(p => statementHTML(p, w, { pending: 'Choosing three values…' })).join('')}</div><p class="small">Each table locks three values and one line it will be held to. The island opens when all six have locked.${s.code ? ` · Join code <b class="num">${esc(s.code)}</b>` : ''}</p></div>`;
    if (c.phase === 'quarter_open' && w.quarterCard) { const qc = w.quarterCard; return `<div class="full"><div class="kicker">Quarter ${qc.quarter + 1} of ${QUARTERS.length}</div><h1>${esc(QUARTERS[qc.quarter].name)}</h1><p>${esc(qc.card)}</p><p class="small">${clockStr(qc.from_t)} → ${clockStr(qc.to_t)} · ${qc.human_deadline_ticks ? `${qc.human_deadline_ticks * STEP / 60} hours to decide a card` : ''}${qc.mayday_answer_ticks ? ` · ${qc.mayday_answer_ticks * STEP / 60} hours to answer a mayday` : ''}${qc.second_move ? ` · second move: ${esc(qc.second_move)}` : ''}</p></div>`; }
    if (c.phase === 'quarter_close') { const q = w.quarter; const from = q ? q.fromT : T_START; return `<div class="full"><div class="kicker">${esc(q ? q.title : 'Quarter')} · closed</div><h2>What the tables decided</h2><div class="columns">${ROSTER.map(p => { const ds = w.decisionsOf(p).filter(d => d.decision.t > from); const res = CARDS_BY_PARISH[p].filter(cd => { const r = w.residents.cards[cd.id]; return r && r.t > from; }); return `<div class="col" style="border-top-color:${pcolor(p)}"><b class="pn" style="color:${pcolor(p)}">${esc(pname(p))}</b>${ds.length ? ds.map(d => `<div><span class="tag ${d.decision.decided_by === 'storm' ? 'storm' : ''}">${d.decision.decided_by === 'storm' ? 'storm' : letterOf(d.dilemma_id, d.decision.option_id)}</span> ${esc(d.decision.option_label || optLabel(d.dilemma_id, d.decision.option_id))}</div>`).join('') : '<div class="dim">no card this quarter</div>'}${res.map(cd => `<div class="person"><span class="n">${esc(cd.name)}</span><span class="st st-${esc(w.residentState(cd.id))}">${esc(RES_LABEL[w.residentState(cd.id)])}</span></div>`).join('')}</div>`; }).join('')}</div><p class="small">${(w.tick && w.tick.counters) ? `${fmt(w.tick.counters.doses_shipped)} doses shipped · ${fmt(w.tick.counters.people_safe)} people safe${w.tick.counters.lost ? ` · ${w.tick.counters.lost} lost` : ''}` : ''}</p></div>`; }
    if (c.phase === 'debrief') return this.debriefHTML();
    return '';
  },
  debriefHTML() {
    const w = this.world, db = w.debrief || {}, steps = this.steps(), st = steps[Math.min(this.step, steps.length - 1)], ct = (w.tick && w.tick.counters) || {}, nav = `<p class="small">${this.step + 1} / ${steps.length} · space or tap for the next</p>`;
    if (st !== 'replay') this.leaveReplay();
    if (st === 'counters') return `<div class="full"><div class="kicker">Debrief</div><h2>Where Concordia stands at ${clockStr(w.t)}</h2><div class="bigcounters"><div><div class="v" style="color:#8fd3ff">${fmt(ct.doses_shipped || 0)}</div><div class="l">doses shipped</div><div class="b">of ${fmt(WORLD_DOSES_NEEDED)} the world needs this week</div></div><div><div class="v" style="color:#9be3b0">${fmt(ct.people_safe || 0)}</div><div class="l">people safe</div><div class="b">of ${fmt(BASE_POPULATION)}</div></div><div><div class="v" style="color:${ct.lost ? 'var(--failed)' : 'var(--fg)'}">${fmt(ct.lost || 0)}</div><div class="l">lost</div><div class="b">${fmt(ct.injured || 0)} injured · ${fmt(ct.at_risk || 0)} still at risk</div></div></div>${nav}</div>`;
    if (st.startsWith('secret:')) { const p = st.slice(7); return `<div class="full"><div class="kicker">Secret ${steps.indexOf(st)} of ${Object.keys(db.briefs || {}).length}</div><h2 style="color:${pcolor(p)}">${esc(pname(p))}</h2><div class="secretcard"><div class="kicker">Only this table knew</div><p style="font-size:inherit">${esc((db.briefs || {})[p] || '')}</p></div>${db.debrief_question ? `<p class="small">${esc(db.debrief_question)}</p>` : ''}${nav}</div>`; }
    if (st === 'mirror') return `<div class="full"><div class="kicker">Stated against enacted</div><h2>What each table said, and what it did</h2><div class="mirrors">${ROSTER.map(p => `<div class="mirror" style="border-top-color:${pcolor(p)}"><b style="color:${pcolor(p)};font-family:var(--cond);letter-spacing:.1em;text-transform:uppercase;font-size:16px">${esc(pname(p))}</b>${(w.teams[p] || {}).statement ? `<div class="dim">“${esc(w.teams[p].statement)}”</div>` : ''}${gapHTML(p, w, { evidence: true })}</div>`).join('')}</div>${nav}</div>`;
    if (st === 'credits') { const cr = w.credits(); return `<div class="full"><div class="kicker">Lines of credit</div><h2>${cr.length ? 'Who named whose people' : 'No table credited another'}</h2><div class="credits">${cr.map(e => `<div class="c"><b>${esc(pname(e.parish_id))} → ${esc(pname(e.to))}</b>“${esc(e.text)}”</div>`).join('')}</div>${nav}</div>`; }
    if (st === 'replay') { if (w.scrub == null) { w.scrub = T_START; } return `<div class="full" style="justify-content:flex-end;background:none;padding-bottom:200px;pointer-events:none"><div class="scrub panel" style="padding:12px 16px;pointer-events:auto;background:var(--panel)"><div class="row"><span class="kicker" style="font-size:14px">Replay</span><button class="btn tiny" data-act="scrub-play">${this.scrubPlaying ? 'Pause' : 'Play'}</button><span class="num" id="scrub-t" style="font-size:22px;font-weight:700">${clockStr(w.scrub)}</span><span class="spacer"></span><span class="dim">drag through the 120 hours; the island shows what it looked like</span></div><input type="range" id="scrub" min="0" max="${idx(w.t)}" value="${idx(w.scrub)}" step="1"><div class="marks">${QUARTERS.map(q => `<span>${esc(q.short)} ${clockStr(q.fromT)}</span>`).join('')}<span>${clockStr(w.t)}</span></div></div></div>`; }
    return '';
  },
};
