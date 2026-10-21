/* ---------- projector (the wall) ----------
   Readable from the back of the room: the island, two counters, the six tables, the radio. Between
   quarters the wall carries the quarter card; at the end it carries the debrief in eight steps the DM
   advances (S4): counters and the low point, a pointer to the consoles, the two questions, the room's
   pattern of permission and pressure, the gap, the secrets, credit lines and replay, the commitment.
   The wall never names a table against a rating. Keys on the projector laptop step it when no DM does. */
const ProjectorUI = {
  world: null, step: 0, followed: -1, scrubPlaying: false,
  init(world) {
    this.world = world;
    document.body.classList.add('role-projector');
    R.insets = () => ({ l: 12, r: 12, t: 108, b: 230 }); R.minimap = false;
    $('app').innerHTML = `<div class="topbar" id="tb"></div><div id="eye"></div><div class="strip"><div class="panel feed"><header><h2>Radio · Concordia</h2><span class="dim" id="feed-n"></span></header><div class="feed-list" id="feed"></div></div><div class="panel" style="padding:6px"><div class="tables" id="tables"></div></div></div><div id="full"></div>`;
    world.on('change', () => this.render());
    world.on('phase', f => { if (f.kind === 'debrief_open') this.step = 0; if (f.kind === 'debrief_step' && f.payload) this.step = f.payload.step; if (f.kind !== 'debrief_open' && f.kind !== 'debrief_step') this.leaveReplay(); });
    addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.next(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.prev(); } else if (e.key.toLowerCase() === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } });
    onClick($('app'), '#full', (el, e) => { if (e.target.closest('input,button')) return; this.next(); });
    onClick($('app'), '[data-act="scrub-play"]', () => { this.scrubPlaying = !this.scrubPlaying; this.render(); });
    $('app').addEventListener('input', e => { if (e.target.id === 'scrub') { this.scrubPlaying = false; this.world.scrub = tOf(Number(e.target.value)); this.world.changed(); } });
    Live.fns.add(() => { if (this.scrubPlaying && this.world.scrub != null) { const i = idx(this.world.scrub) + 1; if (i > idx(this.world.t)) { this.scrubPlaying = false; this.world.scrub = this.world.t; } else this.world.scrub = tOf(i); const r = $('scrub'); if (r) r.value = String(idx(this.world.scrub)); const lab = $('scrub-t'); if (lab) lab.textContent = clockStr(this.world.scrub); this.world.changed(); } });
    this.render();
    if (R.ready) R.cam.fit(1620);
  },
  steps() { return debriefSteps(this.world.debrief).map(s => s.id); },
  // the DM steps the wall; the keys here are the fallback when no DM is stepping it (no auto-advance: the room talks as long as it needs)
  next() { const n = this.steps().length; this.step = Math.min(n - 1, this.step + 1); this.render(); },
  prev() { this.step = Math.max(0, this.step - 1); this.render(); },
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
    const full = this.fullHTML(c); setHTML($('full'), full); document.body.classList.toggle('overlay', !!full && !(c.phase === 'debrief' && this.steps()[Math.min(this.step, this.steps().length - 1)] === 'replay'));
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
    const ds = this.world.debriefStep; if (ds && ds.step != null && ds.step !== this.followed) { this.followed = ds.step; this.step = ds.step; }   // the DM's step wins whenever it moves
    const w = this.world, db = w.debrief || {}, all = debriefSteps(db), i = Math.min(this.step, all.length - 1), sd = all[i], st = sd.id, ct = (w.tick && w.tick.counters) || {};
    const nav = `<p class="small">Step ${sd.n} of 8 · ${esc(sd.title)}</p>`;
    if (st !== 'replay') this.leaveReplay();
    if (st === 'counters') {
      const low = ct.lowest_people_safe, hrs = ct.people_hours_at_risk;
      return `<div class="full"><div class="kicker">Debrief</div><h2>Where Concordia stands at ${clockStr(w.t)}</h2><div class="bigcounters"><div><div class="v" style="color:#9be3b0">${fmt(ct.people_safe || 0)}</div><div class="l">people safe now</div><div class="b">of ${fmt(BASE_POPULATION)}</div></div>${low != null && low < 1e12 ? `<div><div class="v" style="color:var(--degraded)">${fmt(low)}</div><div class="l">at the low point</div><div class="b">the fewest safe at any hour</div></div>` : ''}<div><div class="v" style="color:${ct.lost ? 'var(--failed)' : 'var(--fg)'}">${fmt(ct.lost || 0)}</div><div class="l">lost</div><div class="b">${fmt(ct.injured || 0)} injured</div></div><div><div class="v" style="color:#8fd3ff">${fmt(ct.doses_shipped || 0)}</div><div class="l">doses shipped</div><div class="b">of ${fmt(WORLD_DOSES_NEEDED)} needed</div></div></div>${hrs != null ? `<p>${fmt(hrs)} people-hours spent in danger across the storm.</p>` : ''}${nav}</div>`;
    }
    if (st === 'moments') return `<div class="full"><div class="kicker">Your moments · on your console</div><h2>Pick your hardest moment</h2><p>Place it on the scale yourselves first. Then the console shows how the engine read it, and every moment behind each of your three values.</p>${anchorScaleHTML({ big: true })}<p class="small">The scale places moments, never people. The middle three are where most of us live.</p>${nav}</div>`;
    if (st === 'questions') return `<div class="full"><div class="kicker">At your table</div><h2>Two questions</h2><div class="qs">${DEBRIEF_QUESTIONS.map((q, k) => `<div class="q"><b>${k + 1}</b><span>${esc(q)}</span></div>`).join('')}</div><p class="small">Four minutes. Start from the moment you placed.</p>${nav}</div>`;
    if (st === 'pattern') return this.patternHTML(nav);
    if (st === 'gap') return `<div class="full"><div class="kicker">The gap · on your console</div><h2>Your phones against your table</h2><p>Each phone voted privately on every card. Your console now shows, card by card, how many voted with the table's call and how many did not. Counts only, no names.</p><p class="small">Who in the room knew, and did not say?</p>${nav}</div>`;
    if (st.startsWith('secret:')) { const p = st.slice(7); return `<div class="full"><div class="kicker">${esc(sd.title)}</div><h2 style="color:${pcolor(p)}">${esc(pname(p))}</h2><div class="secretcard"><div class="kicker">Only this table knew</div><p style="font-size:inherit">${esc((db.briefs || {})[p] || '')}</p></div>${db.debrief_question ? `<p class="small">${esc(db.debrief_question)}</p>` : ''}${nav}</div>`; }
    if (st === 'credits') { const cr = w.credits(); return `<div class="full"><div class="kicker">Lines of credit</div><h2>${cr.length ? 'Who named whose people' : 'No table credited another'}</h2><div class="credits">${cr.map(e => `<div class="c"><b>${esc(pname(e.parish_id))} → ${esc(pname(e.to))}</b>“${esc(e.text)}”</div>`).join('')}</div>${nav}</div>`; }
    if (st === 'replay') { if (w.scrub == null) { w.scrub = T_START; } return `<div class="full" style="justify-content:flex-end;background:none;padding-bottom:200px;pointer-events:none"><div class="scrub panel" style="padding:12px 16px;pointer-events:auto;background:var(--panel)"><div class="row"><span class="kicker">Replay</span><button class="btn" data-act="scrub-play">${this.scrubPlaying ? 'Pause' : 'Play'}</button><span class="num" id="scrub-t" style="font-size:28px;font-weight:700">${clockStr(w.scrub)}</span><span class="spacer"></span><span class="dim">drag through the storm</span></div><input type="range" id="scrub" min="0" max="${idx(w.t)}" value="${idx(w.scrub)}" step="1"><div class="marks">${QUARTERS.map(q => `<span>${esc(q.short)} ${clockStr(q.fromT)}</span>`).join('')}<span>${clockStr(w.t)}</span></div></div></div>`; }
    if (st === 'commitment') return `<div class="full"><div class="kicker">On your phone · only you see it</div><h2>One commitment</h2><p class="ifthen">“When ___ happens, I will ___.”</p><p>Name the moment you will meet again, and the first thing you will do differently. It stays on your phone: nothing is sent, nothing is exported.</p>${nav}</div>`;
    return '';
  },
  patternHTML(nav) {
    const w = this.world, rp = roomPattern(w), pairs = placementPairs(w), t = rp.totals;
    const line = (label, x) => x.won + x.held + x.storm ? `<div class="pr"><span>${esc(label)}</span><span class="won">${x.won} gave way</span><span class="held">${x.held} held</span><span class="storm">${x.storm} to the storm</span></div>` : `<div class="pr none"><span>${esc(label)}</span><span class="storm">on no card in this deck</span></div>`;
    return `<div class="full"><div class="kicker">Permission and pressure in this room</div><h2>Where pressure won, and where tables held</h2>
      <div class="pattern"><div class="pcol"><div class="lbl2">From people with power over you</div>${line('All social pressure', t.social)}${rp.rows.filter(r => r.form !== 'situational').map(r => line(PRESSURE_FORM[r.form] || r.form, r)).join('')}
        <div class="lbl2">From the storm and the odds</div>${line('Situational pressure', t.situational)}
        ${rp.charters.map(c => `<div class="lbl2">Permission on the table</div><div class="pr charter-row"><span>${esc(c.clause.title)}, on one table's console all game</span><span class="${c.state === 'invoked' ? 'held' : 'storm'}">${esc(c.state)}</span></div>`).join('')}</div>
      <div class="pcol"><div class="lbl2">Hardest moments: the table's placement beside the engine's</div>${pairs.length ? pairs.map(x => `<div class="pp"><span>Table: <b>${signed(x.self)} ${esc(anchorName(x.self))}</b></span><span>Engine: <b>${x.storm ? 'not rated' : esc(readingText(x.engine))}</b></span></div>`).join('') : '<div class="dim">No table has placed its moment yet.</div>'}</div></div>
      <p class="small">Counts across the room. No table is named.</p>${nav}</div>`;
  },
};
