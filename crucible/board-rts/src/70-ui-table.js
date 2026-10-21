/* ---------- table console (landscape tablet) ----------
   One move at a time: the action panel shows the most urgent open item (a mayday to answer, a card to
   decide, the allocation round, the values statement), the rest wait in a small queue. Everything the
   table may see is on the map behind; everything private to the table is in the right column. */
const TableUI = {
  world: null, parish: null, busy: {}, last: {}, raised: new Set(), creditSent: false, repairSent: false, entered: [],
  sel: { values: [], statement: null, tab: null, card: {}, rationale: {}, call: {}, alloc: { token: null, to: null, count: 1 }, credit: { to: null, text: '' }, repair: { token: null, to: null, count: 1 }, secretOpen: false, picked: null, hardest: null, anchor: null },
  lockedNote: null,
  init(world, parish) {
    this.world = world; this.parish = parish;
    document.body.classList.add('role-table');
    R.insets = () => ({ l: 12, r: Math.min(innerWidth * 0.46, 620) + 24, t: 72, b: 118 });
    R.minimap = true;
    $('app').innerHTML = `<div class="topbar" id="tb"></div><div class="parishtag" id="ptag"></div>
      <div class="side"><div id="now"></div>
        <div class="panel action"><header><h2 id="action-h">Your move</h2><div class="row" id="queue"></div></header><div class="body" id="action"></div></div>
        <div class="lower"><div class="panel"><header><h2>People</h2></header><div class="body" id="people"></div></div><div class="panel"><header><h2>Sheet</h2></header><div class="body" id="sheet"></div></div></div></div>
      <div class="mm-label">Map · drag to pan · wheel or pinch to zoom · tap a parish for its last report</div>
      <div class="bottom"><div class="panel feed"><header><h2>Radio</h2><span class="dim" id="feed-n"></span></header><div class="feed-list" id="feed"></div></div><div class="panel own"><header><h2>Your table</h2></header><div class="body" id="own"></div></div></div>`;
    this.bind();
    R.onSelect = pid => { this.selected = pid; this.render(); };
    world.on('change', () => this.render());
    world.on('result', f => { if (f.status === 'rejected') this.rejected = { text: resultText(f), at: Date.now() }; else if (f.status === 'accepted') this.rejected = null; });
    this.render();
    if (R.ready) { R.cam.fit(1700); R.select(parish); }
  },
  items() {
    const w = this.world, p = this.parish, priv = w.private || {}, c = w.clock || {}, out = [];
    const tm = w.teams[p];
    if (!(tm && tm.stated_values && tm.stated_values.length) && !this.last.lock) out.push({ id: 'values', label: 'Values' });
    for (const call of (priv.calls || []).filter(x => x.role === 'holder' && !this.answered(x.call_id))) out.push({ id: 'call:' + call.call_id, label: `Mayday ${call.call_id}`, deadline: call.deadline_t, call });
    for (const card of (priv.pending || []).filter(x => !this.decided(x.dilemma_id))) out.push({ id: 'card:' + card.dilemma_id, label: 'Card', deadline: card.deadline_t, card });
    if (LOCK_T != null && w.t < LOCK_T && c.quarter === 0 && ['running', 'paused', 'quarter_open'].includes(c.phase)) out.push({ id: 'alloc', label: 'Allocation', deadline: LOCK_T });
    const q = w.quarter;
    if (q) {
      const raisable = (PROFILE.optionalMaydays || []).map(id => CALL[id]).filter(cl => cl && cl.asker === p && cl.quarter === q.id && !w.calls[cl.id] && !this.raised.has(cl.id) && (cl.windowClosesT == null || cl.windowClosesT >= w.t + STEP));
      const inPlay = ['running', 'paused', 'quarter_open'].includes(c.phase);        // not at a quarter close, not at the debrief
      if (raisable.length && inPlay) out.push({ id: 'mayday', label: 'Call for aid', calls: raisable });
      if (q.id === 'recovery' && inPlay && (!this.creditSent || !this.repairSent)) out.push({ id: 'recovery', label: 'Recovery moves' });
    }
    out.sort((a, b) => (a.deadline ?? 1e9) - (b.deadline ?? 1e9));
    return out;
  },
  decided(did) { const c = this.world.cards[this.parish + '|' + did]; return !!(c && c.decision) || !!this.last['decide:' + did]; },
  answered(cid) { const c = this.world.calls[cid]; return !!(c && c.answer) || !!this.last['answer:' + cid]; },
  current(items) { const t = this.sel.tab && items.find(i => i.id === this.sel.tab); return t || items[0] || null; },
  render() {
    const w = this.world, p = this.parish; if (!w.ready) return;
    const priv = w.private || {}, c = w.clock || {}, items = this.items(), cur = this.current(items);
    setHTML($('tb'), topbarHTML(w, `${pname(p)} · table console`, pcolor(p)));
    document.body.classList.toggle('debrief', c.phase === 'debrief');
    const own = PARISH[p], selp = this.selected && this.selected !== p ? this.selected : null, rep = selp && w.report(selp);
    const charter = (PROFILE.charterClauses || {})[p], inPlay = c.phase && c.phase !== 'lobby' && c.phase !== 'debrief';
    setHTML($('ptag'), `${charter && inPlay ? `<div class="panel charter"><span class="lbl">${esc(charter.title)} · your authority</span><div>${esc(charter.text)}</div></div>` : ''}<div class="panel" style="padding:8px 12px;max-width:300px"><div class="row"><span class="chip" style="color:${pcolor(p)}">${esc(own.name)}</span><span class="dim">${esc(GEO[p].tag)}</span></div><div class="routes" style="margin-top:6px">${routesTouching(p).map(r => `<div class="r ${w.routeCut(r.id) ? 'cut' : ''}"><i></i><span>${esc(r.name)}${w.routeCut(r.id) ? ` · cut ${w.routeCutAt[r.id] != null ? clockStr(w.routeCutAt[r.id]) : ''}` : ''}</span></div>`).join('')}</div></div>
      ${selp ? `<div class="panel" style="padding:8px 12px;max-width:300px"><div class="row"><span class="chip" style="color:${pcolor(selp)}">${esc(pname(selp))}</span>${w.isFogged(selp) ? `<span class="tag bad">${rep ? 'last report ' + clockStr(rep.t) : 'no contact'}</span>` : '<span class="tag ok">in contact</span>'}</div>${rep ? `<div class="tiles" style="margin-top:6px">${SYSTEMS.map(s => { const v = rep.infrastructure[s] ?? 0; return `<div class="tile"><span class="lbl">${esc(SYS_LABEL[s])}</span><span class="v" style="color:${hexColor(STATUS_HEX[status(v)])}">${Math.round(v)}</span></div>`; }).join('')}</div><div class="dim" style="margin-top:4px">${rep.isolated ? 'Isolated. ' : ''}Sheet: ${Object.entries(rep.stock || {}).map(([k, n]) => `${TOKEN_GLYPH[k] || k} ${n}`).join(' · ') || 'unknown'}</div>` : '<div class="dim">Nothing heard from this parish.</div>'}</div>` : ''}`);
    setHTML($('now'), this.nowLine(cur, c));
    setHTML($('queue'), items.length > 1 ? items.map(i => `<button class="btn tiny ${cur && cur.id === i.id ? 'on' : ''}" data-tab="${esc(i.id)}">${esc(i.label)}${i.deadline != null ? ` <span class="num" data-countdown="${i.deadline}"></span>` : ''}</button>`).join('') : '');
    const head = cur ? ({ values: 'Parish values', alloc: 'Allocation round', mayday: 'Call for aid', recovery: 'Recovery moves' }[cur.id] || (cur.card ? 'Decide' : cur.call ? 'Answer the mayday' : 'Your move')) : (c.phase === 'debrief' ? `Debrief · ${debriefStepOf(w).step.title}` : c.phase === 'quarter_close' ? 'Quarter closed' : 'Your move');
    setHTML($('action-h'), esc(head));
    let body;
    if (!cur) body = this.idleHTML(c);
    else if (cur.id === 'values') body = this.valuesHTML();
    else if (cur.card) body = this.cardHTML(cur.card);
    else if (cur.call) body = this.callHTML(cur.call);
    else if (cur.id === 'alloc') body = this.allocHTML();
    else if (cur.id === 'mayday') body = this.maydayHTML(cur.calls);
    else if (cur.id === 'recovery') body = this.recoveryHTML();
    if (setHTML($('action'), body)) this.afterRender();
    setHTML($('people'), peopleHTML(p, w));
    const stock = priv.stock || (w.report(p) || {}).stock || {};
    const hidden = DATA.hidden[p], declared = !!this.last.declare || w.scored.some(e => e.parish_id === p && e.gid === 'declare_hidden');
    setHTML($('sheet'), `${tokensHTML(stock, { names: true })}${w.quarter ? needsHTML(p, w.quarter.id) : ''}${hidden && !declared && c.phase !== 'lobby' ? `<div class="row"><span class="dim" style="flex:1">The sheet does not show everything you hold.</span><button class="btn tiny" data-act="declare">Declare ${Object.entries(hidden).map(([k, n]) => `${n} ${TOKEN_GLYPH[k] || k}`).join(', ')}</button></div>` : ''}${priv.entries && priv.entries.length ? `<div><span class="lbl">Allocation entries (sealed until ${LOCK_T != null ? clockStr(LOCK_T) : 'the lock'})</span><div class="tokchips">${priv.entries.map(e => `<span class="pill ${e.to === 'keep' ? 'keep' : 'send'}">${esc(TOKEN_GLYPH[e.token] || e.token)} × ${e.count} ${e.to === 'keep' ? 'kept' : '→ ' + esc(pname(e.to))}</span>`).join('')}</div></div>` : ''}`);
    setHTML($('feed'), feedHTML(w.feed, { limit: 30, empty: 'The radio is quiet.' }));
    setHTML($('feed-n'), `${w.feed.length} · ${w.isFogged(p) ? 'OUT OF CONTACT' : w.fogged.length ? `${w.fogged.length} parish${w.fogged.length > 1 ? 'es' : ''} dark` : 'all in contact'}`);
    const tm = w.teams[p];
    setHTML($('own'), `${tm && tm.stated_values && tm.stated_values.length ? `<div class="row">${tm.stated_values.map((v, i) => `<span class="chip" style="${i === 0 ? 'color:var(--accent-2)' : ''}">${i + 1}. ${esc(vname(v))}</span>`).join('')}</div>${tm.statement ? `<div style="font-size:13px">“${esc(tm.statement)}”</div>` : ''}` : '<span class="dim">No statement locked yet.</span>'}<div style="flex:1 1 200px">${decisionsHTML(p, w, { limit: 3 })}</div>`);
  },
  nowLine(cur, c) {
    const w = this.world;
    if (w.conn !== 'open') return nowHTML('Reconnecting to the host… your moves are kept and sent when the link returns.', { urgent: true, label: 'Link' });
    if (this.rejected && this.rejected.on === undefined) this.rejected.on = cur ? cur.id : null;   // shown until the next item takes the console
    if (this.rejected && this.rejected.on === (cur ? cur.id : null) && Date.now() - this.rejected.at < 12000) return nowHTML(`<b style="color:var(--fg)">${esc(this.rejected.text)}</b> Nothing was recorded for that move.`, { urgent: true, label: 'Not sent' });
    if (!cur) {
      if (c.phase === 'lobby' || c.phase === 'island') return nowHTML('Locked. The island opens when every table has locked its statement. Read your brief and your sheet.', { quiet: true });
      if (c.phase === 'quarter_open') return nowHTML(`Read the quarter card aloud at your table. The clock starts when the DM starts it.`, { label: w.quarter ? w.quarter.title : 'Quarter' });
      if (c.phase === 'paused') return nowHTML('The DM paused the clock. Keep talking; nothing moves.', { quiet: true, label: 'Paused' });
      if (c.phase === 'quarter_close') return nowHTML('Quarter closed. Say what you did and why. The DM opens the next quarter.', { quiet: true, label: 'Closed' });
      if (c.phase === 'debrief') { const pl = (w.private || {}).my_placement || (this.last.place && this.last.place.status === 'accepted'); return nowHTML(pl ? 'Your record is on this console, for your table only. The wall shows the room, never a table.' : 'First: pick your hardest moment and place it on the scale, together, before you see anything else.', { label: 'Debrief' }); }
      if (this.lockedNote) return nowHTML(`Locked in: <b style="color:var(--fg)">${esc(this.lockedNote.text)}</b>. Watch the island; the next card or mayday arrives with its own deadline.`, { quiet: true, label: 'Locked in' });
      return nowHTML('Watch the island. Your next card arrives with its deadline; a mayday may come first.', { quiet: true });
    }
    if (this.lockedNote && !cur.card && !cur.call && w.t - this.lockedNote.t <= 8 * STEP) return nowHTML(`Locked in: <b style="color:var(--fg)">${esc(this.lockedNote.text)}</b>. The next card or mayday arrives with its own deadline.`, { quiet: true, label: 'Locked in' });
    if (cur.card) { const s = w.secondsLeft(cur.card.deadline_t); return nowHTML(`Decide <b style="color:var(--fg)">${esc(cur.card.title)}</b> by ${clockStr(cur.card.deadline_t)}. Tap an option, then lock it in. If the deadline passes, the storm decides.`, { urgent: s < 60, label: 'Decide' }); }
    if (cur.call) { const s = w.secondsLeft(cur.call.deadline_t); return nowHTML(`Answer <b style="color:var(--fg)">${esc(pname(cur.call.asker))}</b> on ${esc(cur.call.call_id)} by ${clockStr(cur.call.deadline_t)}. If you give no answer, the storm decides.`, { urgent: s < 60, label: 'Mayday' }); }
    if (cur.id === 'values') return nowHTML('Pick three values in order, write the one line your parish will be held to, then lock it.', { label: 'Step 1' });
    if (cur.id === 'alloc') return nowHTML(`Allocate your tokens before the lock at ${clockStr(LOCK_T)}: keep them, or send some to a parish that needs them. Sealed until the lock.`, { label: 'Allocate' });
    if (cur.id === 'mayday') return nowHTML('You may call for aid this quarter. A mayday is public; the answer is theirs.', { quiet: true, label: 'Optional' });
    if (cur.id === 'recovery') return nowHTML('Recovery: send a token for the repairs, and credit another table\'s people in one line.', { label: 'Recovery' });
    return nowHTML('Your move.', { quiet: true });
  },
  idleHTML(c) {
    const w = this.world, p = this.parish;
    if (c.phase === 'quarter_open' && w.quarterCard) return `<div class="dcard"><div class="lbl">${esc(w.quarterCard.title)}</div><div class="title">${esc(QUARTERS[w.quarterCard.quarter].name)}</div><p class="setup" style="font-size:15px">${esc(w.quarterCard.card)}</p><p class="dim">${esc(clockStr(w.quarterCard.from_t))} → ${esc(clockStr(w.quarterCard.to_t))}${w.quarterCard.second_move ? ` · second move: ${esc(w.quarterCard.second_move)}` : ''}</p></div>`;
    if (c.phase === 'debrief') return this.debriefHTML();
    if (c.phase === 'quarter_close') { const q = w.quarter; return `<div class="dcard"><div class="title">${esc(q ? q.title : 'Quarter')} closed</div><p class="muted">What you decided this quarter, and what the storm decided for you:</p>${decisionsHTML(p, w, { limit: 6, since: q ? q.fromT : T_START })}<div><span class="lbl">Your people</span>${peopleHTML(p, w, { why: true })}</div></div>`; }
    if (c.phase === 'lobby' || c.phase === 'island') return `<div class="dcard">${statementHTML(p, w)}${this.briefHTML()}</div>`;
    return `<div class="dcard">${this.lockedNote ? `<div class="confirm" style="border-color:var(--ok);border-style:solid"><span>Locked in: <b>${esc(this.lockedNote.text)}</b> at ${clockStr(this.lockedNote.t)}.</span></div>` : ''}<p class="muted">Nothing needs a decision right now. Cards and maydays arrive with the clock; the map shows what your parish can see.</p>${decisionsHTML(p, w, { limit: 4 })}</div>`;
  },
  briefHTML() {
    const p = this.parish, own = PARISH[p], priv = this.world.private || {};
    return `<div><span class="lbl">Your brief</span><p class="setup">${esc(own.description)}</p></div>
      <div class="grid2"><div><span class="lbl">Assets</span><div class="dim">${own.assets.map(esc).join(' · ')}</div></div><div><span class="lbl">Vulnerabilities</span><div class="dim">${own.vulnerabilities.map(esc).join(' · ')}</div></div></div>
      ${own.valuesTested && own.valuesTested.length ? `<div><span class="lbl">Values this parish tests</span><div class="dim">${own.valuesTested.map(esc).join(' · ')}</div></div>` : ''}
      ${priv.secret_brief ? (this.sel.secretOpen ? `<div class="secret"><div class="row"><span class="tag private">Secret brief · this table only</span><span class="spacer"></span><button class="btn tiny" data-act="secret">Hide</button></div><p style="margin-top:8px">${esc(priv.secret_brief)}</p></div>` : `<button class="sealed" data-act="secret" style="width:100%"><span class="tag private">Sealed</span><div style="margin-top:6px">Your table's secret brief. Tap to read it; keep the tablet turned away from the room.</div></button>`) : ''}`;
  },
  valuesHTML() {
    const s = this.sel, picked = s.values, tpl = (PROFILE.statementTemplate || '').replace('{parish}', pname(this.parish));
    if (s.statement == null) s.statement = tpl;
    const ok = picked.length === VALUES_TO_PICK, filled = s.statement.trim().length > 0 && !s.statement.includes('___');
    return `<div class="dcard">${this.briefHTML()}
      <div><div class="row"><span class="lbl">Pick ${VALUES_TO_PICK} values, in the order you will defend them</span><span class="spacer"></span><span class="count">${picked.length}/${VALUES_TO_PICK}</span></div>${valuesGridHTML(picked)}</div>
      <div><span class="lbl">Parish Values statement · 140 characters</span><textarea id="stm" rows="2" maxlength="140" placeholder="${esc(tpl)}">${esc(s.statement)}</textarea><div class="count" id="stm-count">${s.statement.length}/140</div></div>
      <div class="confirm"><span style="flex:1">${ok ? (filled ? 'Everyone at the table agrees? Locking is public and final.' : 'Fill the blanks of your statement.') : `Choose ${VALUES_TO_PICK - picked.length} more value${VALUES_TO_PICK - picked.length === 1 ? '' : 's'}.`}</span><button class="btn primary" data-act="lock" ${ok && filled && !this.busy.lock ? '' : 'disabled'}>Lock values</button></div>
      ${this.last.lock ? `<div class="${this.last.lock.status === 'accepted' ? 'muted' : 'dim'}">${esc(resultText(this.last.lock))}</div>` : ''}</div>`;
  },
  cardHTML(card) {
    const w = this.world, d = DATA.dilemmas[card.dilemma_id] || {}, sel = this.sel.card[card.dilemma_id], q = w.quarter, total = q && q.humanDeadlineTicks ? q.humanDeadlineTicks : Math.max(1, (card.deadline_t - card.t) / STEP);
    const votes = ((w.private || {}).votes || {})[card.dilemma_id] || 0, res = this.last['decide:' + card.dilemma_id], o = sel && card.options.find(x => x.id === sel);
    return `<div class="dcard"><div class="row">${radialHTML(card.deadline_t, total, 'Decide by')}<span class="spacer"></span><span class="votes">${votes ? `${votes} phone${votes === 1 ? '' : 's'} voted` : 'phones may vote'}</span></div>
      <div class="title">${esc(card.title)}</div>${personaHTML(card.persona_id || d.personaId, d.personaLine)}<div class="setup">${esc(card.setup)}</div>${(() => { const ch = (PROFILE.charterClauses || {})[this.parish]; return ch && ch.card === card.dilemma_id ? `<div class="charter-inline"><span class="lbl">${esc(ch.title)}</span> ${esc(ch.text)}</div>` : ''; })()}
      ${optionsHTML(card, sel, { disabled: !!res && res.status === 'accepted' })}
      ${res && res.status === 'accepted' ? `<div class="confirm" style="border-color:var(--ok)"><span>Locked in: <b>${letterOf(card.dilemma_id, this.sel.card[card.dilemma_id])}</b>. ${esc(resultText(res))}</span></div>` : sel ? `<div class="confirm"><input id="rationale" placeholder="One line on why (optional, goes in the record)" maxlength="280" value="${esc(this.sel.rationale[card.dilemma_id] || '')}" style="flex:1"><button class="btn primary" data-act="decide" data-card="${esc(card.dilemma_id)}" ${this.busy['decide:' + card.dilemma_id] ? 'disabled' : ''}>Lock in ${letterOf(card.dilemma_id, sel)}</button></div><div class="dim">${esc(o ? o.board || '' : '')}</div>` : `<div class="dim">Tap one option. You can change it until you lock it in.</div>`}
      ${res && res.status === 'rejected' ? `<div class="dim" style="color:#ffb4ad">${esc(resultText(res))}</div>` : ''}</div>`;
  },
  callHTML(call) {
    const w = this.world, s = this.sel.call[call.call_id] || {}, q = w.quarter, total = q && q.maydayAnswerTicks ? q.maydayAnswerTicks : Math.max(1, (call.deadline_t - call.opened_t) / STEP), res = this.last['answer:' + call.call_id];
    const keys = Object.keys(call.answers || {}), needsCount = s.answer && call.answers[s.answer] && call.answers[s.answer].count != null && call.answers[s.answer].count > 1;
    const stock = ((w.private || {}).stock || {})[call.token] || 0;
    return `<div class="dcard"><div class="row">${radialHTML(call.deadline_t, total, 'Answer by')}<span class="spacer"></span>${call.token ? `<span class="pill">${esc(TOKEN_GLYPH[call.token] || call.token)} on your sheet: <b>${stock}</b></span>` : ''}</div>
      <div class="mayday">${callCardHTML(call, w, 'holder')}${CALL[call.call_id] ? `<div class="dim">Granting: ${esc(CALL[call.call_id].grantingCosts)}<br>Refusing: ${esc(CALL[call.call_id].refusingCosts)}</div>` : ''}</div>
      <div class="answers">${keys.map(k => `<button class="btn ${s.answer === k ? 'on' : ''}" data-answer="${esc(k)}" data-call="${esc(call.call_id)}" ${res && res.status === 'accepted' ? 'disabled' : ''}>${esc(call.answers[k].label || k)}${call.answers[k].count != null ? ` · ${call.answers[k].count}` : ''}</button>`).join('')}</div>
      ${needsCount ? `<div class="row"><span class="lbl">How many</span><button class="btn tiny" data-act="count-" data-call="${esc(call.call_id)}">−</button><b class="num">${s.count || call.answers[s.answer].count}</b><button class="btn tiny" data-act="count+" data-call="${esc(call.call_id)}">+</button></div>` : ''}
      ${s.answer && s.answer !== 'grant' ? `<div><span class="lbl">Reason (read out on the radio)</span><div class="reasons">${(PROFILE.answerReasons || []).map(r => `<button class="btn ${s.reason === r ? 'on' : ''}" data-reason="${esc(r)}" data-call="${esc(call.call_id)}">${esc(r)}</button>`).join('')}</div></div>` : ''}
      ${res && res.status === 'accepted' ? `<div class="confirm" style="border-color:var(--ok)"><span>Answer sent: <b>${esc(call.answers[s.answer] ? call.answers[s.answer].label : s.answer)}</b>. ${esc(resultText(res))}</span></div>` : s.answer ? `<div class="confirm"><span style="flex:1">Send <b>${esc(call.answers[s.answer].label || s.answer)}</b> to ${esc(pname(call.asker))}${s.reason ? ` — “${esc(s.reason)}”` : ''}</span><button class="btn primary" data-act="answer" data-call="${esc(call.call_id)}" ${this.busy['answer:' + call.call_id] ? 'disabled' : ''}>Send answer</button></div>` : '<div class="dim">Choose an answer. If the deadline passes with no answer, the storm decides.</div>'}
      ${res && res.status === 'rejected' ? `<div class="dim" style="color:#ffb4ad">${esc(resultText(res))}</div>` : ''}</div>`;
  },
  allocHTML() {
    // entries the host confirmed but has not yet shown in a state frame (the next tick carries them) count at once
    const w = this.world, p = this.parish, priv = w.private || {}, stock = priv.stock || {}, hostEntries = priv.entries || [], a = this.sel.alloc, total = Math.max(1, (LOCK_T - QUARTERS[0].fromT) / STEP);
    const entries = hostEntries.concat(this.entered.filter(e => !hostEntries.some(h => h.seq === e.seq)));
    const sent = tok => entries.filter(e => e.token === tok && e.to !== 'keep').reduce((s, e) => s + e.count, 0), kept = tok => entries.filter(e => e.token === tok && e.to === 'keep').reduce((s, e) => s + e.count, 0);
    const rows = Object.entries(stock).filter(([, n]) => n > 0);
    return `<div class="dcard"><div class="row">${radialHTML(LOCK_T, total, 'Lock at')}<span class="dim" style="flex:1">What you send leaves at the lock and travels by road. What you keep is yours for the storm. Other tables see nothing until the lock.</span></div>
      <div class="tray">${rows.map(([tok, n]) => { const s = sent(tok), k = kept(tok), remain = n - s, open = a.token === tok; return `<div class="trow"><div class="tk" style="color:${hexColor(TOKEN_COLOR[tok] || 0xffffff)}">${esc(TOKEN_GLYPH[tok] || tok)} <span class="num" style="color:var(--fg)">× ${n}</span><small>${esc(tname(tok))}</small></div>
        <div class="row">${entries.filter(e => e.token === tok).map(e => `<span class="pill ${e.to === 'keep' ? 'keep' : 'send'}">${e.to === 'keep' ? 'keep' : '→ ' + esc(pname(e.to))} × ${e.count}</span>`).join('')}${remain > 0 && !k ? `<span class="dim">${remain} undecided</span>` : ''}</div>
        <div class="row">${remain > 0 ? `<button class="btn tiny ${open ? 'on' : ''}" data-act="alloc-open" data-token="${esc(tok)}">Send…</button>` : ''}${remain > 0 && !k ? `<button class="btn tiny" data-act="alloc-keep" data-token="${esc(tok)}" data-count="${remain}">Keep ${remain}</button>` : ''}</div>
        ${open ? `<div style="grid-column:1/-1" class="row"><span class="lbl">To</span>${PIDS.filter(x => x !== p).map(x => `<button class="btn tiny ${a.to === x ? 'on' : ''}" data-act="alloc-to" data-to="${esc(x)}" style="color:${pcolor(x)}">${esc(pname(x))}</button>`).join('')}<span class="spacer"></span><button class="btn tiny" data-act="alloc-count-">−</button><b class="num">${Math.min(a.count, remain)}</b><button class="btn tiny" data-act="alloc-count+" data-max="${remain}">+</button><button class="btn primary" style="min-height:36px;font-size:13px;padding:6px 12px" data-act="alloc-send" data-count="${Math.min(a.count, remain)}" ${a.to && !this.busy.alloc ? '' : 'disabled'}>Send ${Math.min(a.count, remain)} to ${a.to ? esc(pname(a.to)) : '…'}</button></div>` : ''}</div>`; }).join('')}</div>
      ${this.last.alloc ? `<div class="dim">${esc(resultText(this.last.alloc))}</div>` : ''}</div>`;
  },
  maydayHTML(calls) {
    return `<div class="dcard"><p class="muted">Calls your parish may raise this quarter. The table that holds the token answers on the radio.</p>${calls.map(c => `<div class="mayday"><div class="from">${esc(c.id)} · ask ${esc(pname(c.holder))}${c.token ? ` for ${c.count} ${esc(tname(c.token))}` : ''}</div>${personaHTML(c.personaId, c.line)}<div class="ask">${esc(c.ask)}</div><div class="row"><span class="dim" style="flex:1">${c.windowClosesT != null ? `Window closes ${clockStr(c.windowClosesT)}.` : ''} ${esc(c.grantingCosts ? 'If granted: ' + c.grantingCosts : '')}</span><button class="btn primary" style="min-height:40px;font-size:14px" data-act="mayday" data-call="${esc(c.id)}" ${this.busy['mayday:' + c.id] ? 'disabled' : ''}>Send mayday ${esc(c.id)}</button></div>${this.last['mayday:' + c.id] ? `<div class="dim">${esc(resultText(this.last['mayday:' + c.id]))}</div>` : ''}</div>`).join('')}</div>`;
  },
  recoveryHTML() {
    const w = this.world, p = this.parish, cr = this.sel.credit, rp = this.sel.repair, stock = (w.private || {}).stock || {}, others = PIDS.filter(x => x !== p);
    return `<div class="dcard">
      <div><span class="lbl">Line of credit</span><p class="muted">${esc((PROFILE.creditLine || {}).prompt || 'One line of credit naming another table\'s people.')}</p>
        ${this.creditSent ? `<div class="confirm" style="border-color:var(--ok)"><span>Credit sent to <b>${esc(pname(cr.to))}</b>. ${esc(resultText(this.last.credit))}</span></div>` : `<div class="row">${others.map(x => `<button class="btn tiny ${cr.to === x ? 'on' : ''}" data-act="credit-to" data-to="${esc(x)}" style="color:${pcolor(x)}">${esc(pname(x))}</button>`).join('')}</div><textarea id="credit-text" rows="2" maxlength="200" placeholder="Name their people and what they did.">${esc(cr.text)}</textarea><div class="confirm"><span style="flex:1">${cr.to ? `Credit ${esc(pname(cr.to))}'s people, in front of the room.` : 'Choose a table.'}</span><button class="btn primary" data-act="credit" ${cr.to && cr.text.trim() && !this.busy.credit ? '' : 'disabled'}>Send credit</button></div>${this.last.credit && this.last.credit.status === 'rejected' ? `<div class="dim" style="color:#ffb4ad">${esc(resultText(this.last.credit))}</div>` : ''}`}</div>
      <div><span class="lbl">Send a token for the repairs</span>
        ${this.repairSent ? `<div class="confirm" style="border-color:var(--ok)"><span>Sent. ${esc(resultText(this.last.repair))}</span></div>` : `<div class="row">${Object.entries(stock).filter(([, n]) => n > 0).map(([k, n]) => `<button class="btn tiny ${rp.token === k ? 'on' : ''}" data-act="repair-token" data-token="${esc(k)}">${esc(TOKEN_GLYPH[k] || k)} × ${n}</button>`).join('') || '<span class="dim">Nothing left on the sheet.</span>'}</div>
        ${rp.token ? `<div class="row"><span class="lbl">To</span>${others.map(x => `<button class="btn tiny ${rp.to === x ? 'on' : ''}" data-act="repair-to" data-to="${esc(x)}" style="color:${pcolor(x)}">${esc(pname(x))}</button>`).join('')}<span class="spacer"></span><button class="btn tiny" data-act="repair-count-">−</button><b class="num">${rp.count}</b><button class="btn tiny" data-act="repair-count+">+</button><button class="btn primary" style="min-height:36px;font-size:13px;padding:6px 12px" data-act="repair" ${rp.to && !this.busy.repair ? '' : 'disabled'}>Send ${rp.count} ${esc(TOKEN_GLYPH[rp.token] || rp.token)}</button></div>` : ''}${this.last.repair && this.last.repair.status === 'rejected' ? `<div class="dim" style="color:#ffb4ad">${esc(resultText(this.last.repair))}</div>` : ''}`}</div></div>`;
  },
  /* the debrief on the console: private to the table (D2). The table places its hardest moment before it sees
     the engine's reading (D7); then its record by value; later steps unlock the two questions, the gap and the secrets. */
  debriefHTML() {
    const w = this.world, p = this.parish, db = w.debrief || {}, priv = w.private || {}, { i, steps } = debriefStepOf(w);
    const at = id => i >= steps.findIndex(x => x.id === id || x.id.startsWith(id));
    const ms = w.moments(p), s = this.sel, placed = priv.my_placement || (this.last.place && this.last.place.status === 'accepted' ? s.placed : null);
    let first;
    if (!placed) {
      const m = ms.find(x => x.key === s.hardest);
      first = `<div class="place"><span class="lbl">1 · Your hardest moment</span><p class="muted">Which moment was hardest for this table? Pick one, agree where it sits on the scale, then place it. You see the engine's reading after.</p>
        <div class="momlist">${ms.length ? ms.map(x => `<button class="btn mpick ${s.hardest === x.key ? 'on' : ''}" data-moment="${esc(x.key)}">${x.storm ? '<span class="tag storm">storm</span> ' : ''}${esc(x.label)}${x.letter ? ` · ${esc(x.letter)}` : ''}</button>`).join('') : '<span class="dim">No moments recorded.</span>'}</div>
        ${m ? `${anchorScaleHTML({ pick: true, sel: s.anchor })}<div class="confirm"><span style="flex:1">${s.anchor != null ? `Place <b>${esc(m.label)}</b> at <b>${signed(s.anchor)} ${esc(anchorName(s.anchor))}</b>?` : 'Choose where it sits.'}</span><button class="btn primary" data-act="place" ${s.anchor != null && !this.busy.place ? '' : 'disabled'}>Place it</button></div>` : ''}
        ${this.last.place && this.last.place.status === 'rejected' ? `<div class="dim" style="color:#ffb4ad">${esc(resultText(this.last.place))}</div>` : ''}</div>`;
    } else {
      const m = ms.find(x => x.key === placed.moment), eng = m ? w.reading(m) : null;
      first = `<div class="place"><span class="lbl">1 · Your hardest moment</span><div class="row"><b>${esc(m ? m.label : placed.label || placed.moment)}</b></div>${anchorScaleHTML({ sel: placed.anchor, engine: readingEnds(eng) })}
        <p class="muted">${m && m.storm ? 'The storm decided this one, so the engine did not rate it. What would you have chosen?' : eng == null ? (m && m.unrated ? `The move could not run (${esc(m.unrated)}), so the engine did not rate it. Your placement is the only reading.` : 'The engine found no value signal in this moment.') : eng.tradeoff ? `The engine read ${esc(readingText(eng))}. Where between those ends would the people it touched put it?` : eng.lo === placed.anchor ? 'You and the engine read it the same way.' : `You placed it at ${esc(anchorName(placed.anchor))}; the engine read ${esc(anchorName(eng.lo))}. Which reading would the people it touched give?`}</p>
        ${m ? momentLineHTML(m, { signal: m.storm || !eng || eng.tradeoff ? null : eng.lo, debrief: true }) : ''}</div>
        <div><span class="lbl">2 · Your record, value by value</span>${momentsHTML(p, w)}</div>`;
    }
    const qs = at('questions') ? `<div><span class="lbl">3 · Talk at your table</span><div class="qs small">${DEBRIEF_QUESTIONS.map((q, k) => `<div class="q"><b>${k + 1}</b><span>${esc(q)}</span></div>`).join('')}</div></div>` : '';
    const split = priv.vote_split || {}, ds = w.decisionsOf(p);
    const gap = at('gap') ? `<div><span class="lbl">5 · The gap: your phones against your table</span><div class="list">${ds.map(c => { const v = split[c.dilemma_id] || { count: 0, split: {} }, agree = v.split[c.decision.option_id] || 0; return `<div class="it"><span>${esc(c.title || c.dilemma_id)}<br><span class="dim">${c.decision.decided_by === 'storm' ? 'the storm decided' : `table chose ${letterOf(c.dilemma_id, c.decision.option_id)}`}</span></span><span class="num">${v.count ? `${agree} with · ${v.count - agree} against` : 'no phone votes'}${v.late ? ` · ${v.late} late, not counted` : ''}</span></div>`; }).join('') || '<span class="dim">No cards.</span>'}</div></div>` : '';
    const briefs = db.briefs || {}, shown = steps.slice(0, i + 1).filter(x => x.id.startsWith('secret:')).map(x => x.id.slice(7));
    const secrets = shown.length ? `<div><span class="lbl">6 · The secrets so far</span><div class="list">${shown.filter(x => briefs[x]).map(x => `<div class="it" style="border-left:3px solid ${pcolor(x)};${x === p ? 'background:rgba(143,184,255,.08)' : ''}"><span><b>${esc(pname(x))}</b><br><span class="muted">${esc(briefs[x])}</span></span></div>`).join('')}</div></div>` : '';
    return `<div class="dcard"><div class="title">${esc(pname(p))} · for this table only</div>${statementHTML(p, w)}${first}${qs}${gap}${secrets}<div><span class="lbl">Your people</span>${peopleHTML(p, w, { why: true })}</div></div>`;
  },
  afterRender() {
    const stm = $('stm'); if (stm) { stm.addEventListener('input', () => { this.sel.statement = stm.value; const c = $('stm-count'); if (c) c.textContent = `${stm.value.length}/140`; const ok = this.sel.values.length === VALUES_TO_PICK && stm.value.trim() && !stm.value.includes('___'); const b = document.querySelector('[data-act="lock"]'); if (b) b.disabled = !ok; }); }
    const ct = $('credit-text'); if (ct) ct.addEventListener('input', () => { this.sel.credit.text = ct.value; const b = document.querySelector('[data-act="credit"]'); if (b) b.disabled = !(this.sel.credit.to && ct.value.trim()); });
    const ra = $('rationale'); if (ra) ra.addEventListener('input', () => { const cur = this.current(this.items()); if (cur && cur.card) this.sel.rationale[cur.card.dilemma_id] = ra.value; });
  },
  async send(key, kind, payload, after) {
    if (this.busy[key]) return; this.busy[key] = true; this.render();
    const r = await this.world.intent(kind, payload);
    this.busy[key] = false; this.last[key] = r; if (after) after(r); this.render();
  },
  bind() {
    const root = $('app'), s = this.sel;
    onClick(root, '[data-tab]', el => { s.tab = el.dataset.tab; this.render(); });
    onClick(root, '[data-value]', el => { const v = el.dataset.value, k = s.values.indexOf(v); if (k >= 0) s.values.splice(k, 1); else if (s.values.length < VALUES_TO_PICK) s.values.push(v); this.render(); });
    onClick(root, '[data-act="secret"]', () => { s.secretOpen = !s.secretOpen; this.render(); });
    onClick(root, '[data-act="lock"]', () => this.send('lock', 'lock_values', { values: s.values.slice(), statement: (s.statement || '').trim() }));
    onClick(root, '[data-opt]', el => { const cur = this.current(this.items()); if (!cur || !cur.card) return; s.card[cur.card.dilemma_id] = el.dataset.opt; this.render(); const on = document.querySelector('#action .opt.on'); if (on) on.scrollIntoView({ block: 'nearest' }); });
    onClick(root, '[data-act="decide"]', el => { const id = el.dataset.card, ra = $('rationale'), opt = s.card[id]; this.send('decide:' + id, 'decide', { dilemma_id: id, option_id: opt, rationale: (ra ? ra.value : s.rationale[id] || '').trim() || undefined }, r => { if (r.status === 'accepted') this.lockedNote = { text: `${letterOf(id, opt)} on ${(DATA.dilemmas[id] || { title: id }).title}`, t: r.applied_t }; }); });
    onClick(root, '[data-moment]', el => { s.hardest = el.dataset.moment; this.render(); });
    onClick(root, '[data-anchor]', el => { s.anchor = Number(el.dataset.anchor); this.render(); });
    onClick(root, '[data-act="place"]', () => { const m = this.world.moments(this.parish).find(x => x.key === s.hardest); if (!m || s.anchor == null) return; s.placed = { moment: m.key, anchor: s.anchor, label: m.label }; this.send('place', 'self_place', { moment: m.key, anchor: s.anchor, label: m.label }); });
    onClick(root, '[data-answer]', el => { const id = el.dataset.call; s.call[id] = { ...(s.call[id] || {}), answer: el.dataset.answer }; this.render(); const on = document.querySelector('#action .answers'); if (on) on.scrollIntoView({ block: 'nearest' }); });
    onClick(root, '[data-reason]', el => { const id = el.dataset.call; s.call[id] = { ...(s.call[id] || {}), reason: el.dataset.reason }; this.render(); });
    onClick(root, '[data-act="count-"],[data-act="count+"]', el => { const id = el.dataset.call, c = s.call[id], call = (this.world.private.calls || []).find(x => x.call_id === id); if (!c || !call) return; const max = call.answers[c.answer].count || 1; c.count = clamp((c.count || max) + (el.dataset.act === 'count+' ? 1 : -1), 1, max); this.render(); });
    onClick(root, '[data-act="answer"]', el => { const id = el.dataset.call, c = s.call[id], call = (this.world.private.calls || []).find(x => x.call_id === id); if (!c || !call) return; const payload = { call_id: id, answer: c.answer }; if (call.answers[c.answer] && call.answers[c.answer].count != null) payload.count = c.count || call.answers[c.answer].count; if (c.reason) payload.reason = c.reason; this.send('answer:' + id, 'answer_aid', payload, r => { if (r.status === 'accepted') this.lockedNote = { text: `${call.answers[c.answer] ? call.answers[c.answer].label : c.answer} to ${pname(call.asker)} on ${id}`, t: r.applied_t }; }); });
    onClick(root, '[data-act="alloc-open"]', el => { s.alloc = { token: s.alloc.token === el.dataset.token ? null : el.dataset.token, to: null, count: 1 }; this.render(); });
    onClick(root, '[data-act="alloc-to"]', el => { s.alloc.to = el.dataset.to; this.render(); });
    onClick(root, '[data-act="alloc-count-"],[data-act="alloc-count+"]', el => { s.alloc.count = clamp(s.alloc.count + (el.dataset.act.endsWith('+') ? 1 : -1), 1, Number(el.dataset.max) || s.alloc.count); this.render(); });
    onClick(root, '[data-act="alloc-send"]', el => { const a = s.alloc, e = { token: a.token, to: a.to, count: Number(el.dataset.count) || 1 }; this.send('alloc', 'allocate', e, r => { if (r.status === 'accepted') { this.entered.push({ ...e, seq: r.input_seq, t: r.applied_t }); s.alloc = { token: null, to: null, count: 1 }; } }); });
    onClick(root, '[data-act="alloc-keep"]', el => { const e = { token: el.dataset.token, to: 'keep', count: Number(el.dataset.count) }; this.send('alloc', 'allocate', e, r => { if (r.status === 'accepted') this.entered.push({ ...e, seq: r.input_seq, t: r.applied_t }); }); });
    onClick(root, '[data-act="mayday"]', el => { const id = el.dataset.call; this.send('mayday:' + id, 'mayday', { call_id: id }, r => { if (r.status === 'accepted') this.raised.add(id); }); });
    onClick(root, '[data-act="declare"]', () => this.send('declare', 'declare_hidden', {}));
    onClick(root, '[data-act="credit-to"]', el => { s.credit.to = el.dataset.to; const ct = $('credit-text'); if (ct) s.credit.text = ct.value; this.render(); });
    onClick(root, '[data-act="credit"]', () => { const ct = $('credit-text'); if (ct) s.credit.text = ct.value; this.send('credit', 'credit_line', { to: s.credit.to, text: s.credit.text.trim() }, r => { if (r.status === 'accepted') this.creditSent = true; }); });
    onClick(root, '[data-act="repair-token"]', el => { s.repair = { token: s.repair.token === el.dataset.token ? null : el.dataset.token, to: null, count: 1 }; this.render(); });
    onClick(root, '[data-act="repair-to"]', el => { s.repair.to = el.dataset.to; this.render(); });
    onClick(root, '[data-act="repair-count-"],[data-act="repair-count+"]', el => { s.repair.count = clamp(s.repair.count + (el.dataset.act.endsWith('+') ? 1 : -1), 1, 9); this.render(); });
    onClick(root, '[data-act="repair"]', () => { const r = s.repair; this.send('repair', 'repair_send', { token: r.token, to: r.to, count: r.count }, x => { if (x.status === 'accepted') this.repairSent = true; }); });
  },
};
