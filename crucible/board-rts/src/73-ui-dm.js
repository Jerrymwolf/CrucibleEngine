/* ---------- DM console (the facilitator's laptop) ----------
   The run-sheet rail on the left, one big next action in the middle with a two-tap confirm, the
   tables and levers on the right, the lines to read aloud at the bottom. The DM sees everything;
   every lever is an intent the host records. Nothing here changes an outcome directly. */
const DMUI = {
  world: null, armed: null, dialog: null, busy: {}, last: {}, flagText: '', links: null, sel: { enter: {}, swap: {}, promote: null },
  init(world) {
    this.world = world;
    document.body.classList.add('role-dm');
    R.insets = () => ({ l: 254, r: Math.min(innerWidth * 0.40, 560) + 24, t: 72, b: 194 }); R.minimap = true;
    $('app').innerHTML = `<div class="topbar" id="tb"></div>
      <div class="panel rail"><header><h2>Run sheet</h2></header><div class="body" id="rail"></div></div>
      <div class="center-top"><div class="panel" id="next" style="padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:100%"></div></div>
      <div class="mm-label">Map · drag to pan · wheel to zoom · tap a parish to select its table</div>
      <div class="panel readaloud"><header><h2>Read aloud</h2></header><div class="body" id="readaloud"></div></div>
      <div class="right">
        <div class="panel tables"><header><h2>Tables</h2><span class="dim" id="tables-n"></span></header><div class="body" id="tables"></div></div>
        <div class="panel levers"><header><h2>Levers</h2><span class="dim" id="host-info"></span></header><div class="body" id="levers"></div></div>
        <div class="panel nextup"><header><h2>Next up</h2></header><div class="body" id="nextup"></div></div>
        <div class="panel feed"><header><h2>Everything</h2><span class="dim" id="feed-n"></span></header><div class="feed-list" id="feed"></div></div>
      </div><div id="dialog"></div>`;
    this.bind();
    R.onSelect = pid => { if (pid && ROSTER.includes(pid)) { this.sel.table = pid; } this.render(); };
    world.on('change', () => this.render());
    world.on('phase', () => { this.last.lever = null; this.last.enter = null; });   // a lever's or an entry's result is about the phase it was sent in
    this.render();
    if (R.ready) R.cam.fit(1700);
  },
  steps() {
    const out = [{ id: 'values', label: 'Values open', sub: 'tables lock their statements' }, { id: 'island', label: 'Island open', sub: 'the map goes on the wall' }];
    for (const q of QUARTERS) out.push({ id: `card:${q.index}`, label: `${q.short} card`, sub: `${q.cardSeconds} s` }, { id: `play:${q.index}`, label: `${q.short} ${q.name}`, sub: `${Math.round(q.playSeconds / 60)} min · ${clockStr(q.fromT)} → ${clockStr(q.toT)}` }, { id: `close:${q.index}`, label: `${q.short} close`, sub: `${Math.round(q.closeSeconds / 60)} min at the tables` });
    out.push({ id: 'debrief', label: 'Debrief', sub: 'counters · moments · questions · pattern · gap · secrets · credit · commitment' });
    return out;
  },
  currentStep(c) { switch (c.phase) { case 'lobby': return 'values'; case 'island': return 'island'; case 'quarter_open': return `card:${c.quarter}`; case 'running': case 'paused': return `play:${c.quarter}`; case 'quarter_close': return `close:${c.quarter}`; case 'debrief': return 'debrief'; default: return 'values'; } },
  nextAction(c) {
    const w = this.world, locked = ROSTER.filter(p => ((w.teams[p] || {}).stated_values || []).length).length;
    switch (c.phase) {
      case 'lobby': return { kind: 'open_island', label: 'Open the island', note: `${locked}/${ROSTER.length} statements locked`, warn: locked < ROSTER.length ? `${ROSTER.length - locked} table${ROSTER.length - locked === 1 ? ' has' : 's have'} not locked; a table can still lock after the island opens.` : null };
      case 'island': return { kind: 'open_quarter', label: `Open the ${QUARTERS[0].short} card`, note: QUARTERS[0].title };
      case 'quarter_open': return { kind: 'start', label: 'Start the clock', note: `${QUARTERS[c.quarter].title} · ${Math.round(QUARTERS[c.quarter].playSeconds / 60)} min of play` };
      case 'running': return { kind: 'pause', label: 'Pause', note: `the quarter runs to ${clockStr(c.quarter_end_t)}`, soft: true };
      case 'paused': return { kind: 'resume', label: 'Resume', note: 'the clock is stopped', soft: true };
      case 'quarter_close': return c.quarter < QUARTERS.length - 1 ? { kind: 'open_quarter', label: `Open the ${QUARTERS[c.quarter + 1].short} card`, note: QUARTERS[c.quarter + 1].title } : { kind: 'debrief', label: 'Open the debrief', note: 'the six secrets go on the wall' };
      case 'debrief': { const { i, steps } = debriefStepOf(w), nx = steps[i + 1];
        return nx ? { kind: 'debrief_step', label: `Next: ${nx.title}`, note: `Now: step ${steps[i].n} of 8, ${steps[i].title}. Take as long as the room needs; nothing advances by itself.`, soft: true, payload: { step: i + 1, id: nx.id } }
          : { kind: 'export', label: 'Export the run', note: 'run.json, votes.json (votes, picks, placements), flags.json. Commitments stay on the phones.', soft: true }; }
    }
    return null;
  },
  render() {
    const w = this.world; if (!w.ready) return;
    const c = w.clock || {}, priv = w.private || {}, tick = w.tick || {};
    setHTML($('tb'), topbarHTML(w, 'DM console', 'var(--accent-2)', `<div><div class="sub"><span class="lbl">Seq</span><span class="num">${w.seq}</span></div><div class="sub"><span class="lbl">Hash</span><span class="num dim" title="${esc(w.hash || '')}">${esc((w.hash || '').slice(0, 10))}</span></div></div>`));
    const cur = this.currentStep(c), steps = this.steps(), ci = steps.findIndex(s => s.id === cur);
    setHTML($('rail'), steps.map((s, i) => `<div class="step ${i < ci ? 'done' : i === ci ? 'now' : ''}"><i>${i < ci ? '✓' : i + 1}</i><span>${esc(s.label)}<br><span class="dim" style="font-size:11px">${esc(s.sub)}</span></span></div>`).join(''));
    const na = this.nextAction(c);
    setHTML($('next'), na ? `${this.armed === na.kind ? `<button class="btn primary" data-act="confirm">Confirm: ${esc(na.label)}</button><button class="btn" data-act="disarm">Cancel</button>` : `<button class="btn primary" data-act="next" ${this.busy.next ? 'disabled' : ''}>${esc(na.label)}</button>`}<span class="muted" style="max-width:300px">${esc(na.note)}${na.warn ? `<br><span style="color:var(--degraded)">${esc(na.warn)}</span>` : ''}</span><span class="spacer"></span>${c.phase === 'debrief' ? `<button class="btn tiny" data-act="dstep-back">Back a step</button><button class="btn tiny" data-act="export-now">Export</button>` : ''}${['running', 'paused', 'quarter_open'].includes(c.phase) ? `<button class="btn tiny" data-act="advance" title="advance one tick">+1 tick</button><button class="btn tiny" data-act="skip">Skip to ${clockStr(c.quarter_end_t)}</button>` : ''}${this.last.next && this.last.next.kind === na.kind ? `<span class="dim" style="font-size:11px">${esc(resultText(this.last.next))}</span>` : ''}` : '');
    const live = this.world.roster || priv, seats = live.seats || priv.seats || [], clients = live.clients || priv.clients || [], pending = priv.pending || [], calls = priv.calls || [];
    setHTML($('tables-n'), `${seats.filter(s => s.console === 'held').length}/${ROSTER.length} consoles · ${clients.filter(x => x.role === 'phone' && x.connected).length} phones`);
    setHTML($('tables'), ROSTER.map(p => {
      const s = seats.find(x => x.parish === p) || { console: 'free', phones: 0 }, card = pending.find(x => x.parish_id === p), call = calls.find(x => x.holder === p), asked = calls.find(x => x.asker === p);
      const v = card && priv.votes && priv.votes[p] && priv.votes[p][card.dilemma_id];
      const ds = w.decisionsOf(p), last = ds[ds.length - 1], tm = w.teams[p];
      const status = call ? `<span class="st hot">answering ${esc(pname(call.asker))} ${esc(call.call_id)} · <span class="num" data-countdown="${call.deadline_t}"></span></span>` : card ? `<span class="st">${esc(card.title)} · <span class="num" data-countdown="${card.deadline_t}"></span>${v ? ` · ${v.count} vote${v.count === 1 ? '' : 's'} (${Object.entries(v.split || {}).map(([o, n]) => `${letterOf(card.dilemma_id, o)}${n}`).join(' ')})` : ''}</span>` : asked ? `<span class="st hot">MAYDAY ${esc(asked.call_id)} to ${esc(pname(asked.holder))}</span>` : last ? `<span class="st ${last.decision.decided_by === 'storm' ? 'hot' : 'ok'}">${last.decision.decided_by === 'storm' ? 'storm: ' : ''}${letterOf(last.dilemma_id, last.decision.option_id)} ${esc(last.decision.option_label || '')}</span>` : tm && tm.stated_values && tm.stated_values.length ? `<span class="st ok">locked: ${tm.stated_values.map(vname).join(', ')}</span>` : `<span class="st">no statement yet</span>`;
      return `<div class="trow2 ${this.sel.table === p ? 'on' : ''}" style="${this.sel.table === p ? 'background:rgba(232,137,61,.08)' : ''}"><b style="color:${pcolor(p)}">${esc(pname(p))}</b><span><span class="st ${s.console === 'held' ? 'ok' : s.console === 'offline' ? 'hot' : ''}" title="console seat">${s.console === 'held' ? 'console' : s.console === 'offline' ? 'console offline' : 'no console'}</span> · <span class="st">${s.phones} phone${s.phones === 1 ? '' : 's'}</span><br>${status}</span><span class="row" style="gap:4px"><button class="btn tiny" data-act="enter" data-parish="${p}">Enter</button><button class="btn tiny" data-act="promote" data-parish="${p}">Seat</button></span></div>`;
    }).join('') + clients.filter(x => x.role === 'lobby' && x.connected && (x.waiting_for || x.parish)).map(x => `<div class="trow2"><b class="dim">waiting</b><span>${esc(x.name || x.client_id)} wants ${esc(pname(x.waiting_for || x.parish))}'s console (held by a connected tablet)</span><button class="btn tiny" data-act="admit" data-client="${esc(x.client_id)}">Admit</button></div>`).join(''));
    setHTML($('host-info'), App.host ? `${esc(App.host.code)} · PIN ${esc(App.host.tokens.pin)} · ×${App.host.speed} · ${App.host.runs} runs${App.host.lastRunMs ? ` · ${Math.round(App.host.lastRunMs)} ms` : ''}${App.host.errors.length ? ` · <span style="color:var(--failed)">${App.host.errors.length} errors</span>` : ''}` : (w.session ? `${esc(w.session.code)} · LAN host` : ''));
    const leversHTML = `<div class="lever"><span>Intensity <b class="num">${tick.intensity ?? '–'}</b> <span class="dim">offset ${priv.intensity_offset > 0 ? '+' : ''}${priv.intensity_offset || 0}</span></span><button class="btn tiny" data-act="heat" ${c.phase === 'lobby' || c.phase === 'debrief' ? 'disabled' : ''}>Heat +2</button><button class="btn tiny" data-act="cool" ${c.phase === 'lobby' || c.phase === 'debrief' ? 'disabled' : ''}>Cool −2</button></div>
      <div class="lever"><span>Swap a scheduled card</span><button class="btn tiny" data-act="swap">Choose…</button><span></span></div>
      <div class="lever"><input id="flag" placeholder="Flag a moment for the debrief" style="padding:4px 8px"><button class="btn tiny" data-act="flag">Flag${this.sel.table ? ` · ${esc(pname(this.sel.table))}` : ''}</button><span class="dim num">${(priv.flags || []).length}</span></div>
      <div class="lever"><span>Room</span><button class="btn tiny" data-act="qr">Join links &amp; QR</button><button class="btn tiny" data-act="print">Print pack</button></div>
      <div class="lever"><span>Rehearsal ${App.host && App.host.autopilot ? '<span class="tag warn">autopilot</span>' : ''}</span><button class="btn tiny" data-act="fill" ${App.host ? '' : 'disabled title="in-page host only"'}>Fill empty tables</button><button class="btn tiny" data-act="autopilot" ${App.host ? '' : 'disabled'}>${App.host && App.host.autopilot ? 'Stop autopilot' : 'Autopilot'}</button></div>
      ${this.last.lever ? `<div class="dim">${esc(resultText(this.last.lever))}</div>` : ''}`;
    if (setHTML($('levers'), leversHTML)) { const f = $('flag'); if (f) { f.value = this.flagText; f.addEventListener('input', () => { this.flagText = f.value; }); } }
    const up = [];
    for (const [p, asks] of Object.entries(PROFILE.ask || {})) for (const a of asks) if (a.presentT > w.t) up.push({ t: a.presentT, text: `${pname(p)}: card ${(DATA.dilemmas[a.dilemmaId] || { title: a.dilemmaId }).title} (${a.deadlineTicks * STEP / 60} h to decide)` });
    for (const m of PROFILE.maydays || []) if (m.t > w.t) { const cl = CALL[m.callId]; up.push({ t: m.t, text: `MAYDAY ${m.callId}: ${cl ? `${pname(cl.asker)} asks ${pname(cl.holder)}${cl.token ? ` for ${cl.count} ${tname(cl.token)}` : ''}` : ''}` }); }
    if (LOCK_T != null && LOCK_T > w.t) up.push({ t: LOCK_T, text: 'Allocation lock: sends leave, keeps are public' });
    for (const rt of DATA.routes) if (rt.cutT != null && rt.cutT > w.t) up.push({ t: rt.cutT, text: `${rt.name} is forecast to cut`, dim: true });
    up.sort((a, b) => a.t - b.t);
    setHTML($('nextup'), `${pending.map(cd => `<div class="next"><span class="t">${clockStr(cd.deadline_t)}</span><span><b style="color:${pcolor(cd.parish_id)}">${esc(pname(cd.parish_id))}</b> deciding ${esc(cd.title)} · <span class="num" data-countdown="${cd.deadline_t}"></span></span></div>`).join('')}${calls.map(cl => `<div class="next"><span class="t">${clockStr(cl.deadline_t)}</span><span><b style="color:${pcolor(cl.holder)}">${esc(pname(cl.holder))}</b> answers ${esc(cl.call_id)} from ${esc(pname(cl.asker))} · <span class="num" data-countdown="${cl.deadline_t}"></span></span></div>`).join('')}${up.slice(0, 9).map(u => `<div class="next ${u.dim ? 'dim' : ''}"><span class="t">${clockStr(u.t)}</span><span>${esc(u.text)}</span></div>`).join('') || '<span class="dim">Nothing scheduled ahead.</span>'}`);
    setHTML($('feed'), feedHTML(w.feed, { limit: 40 }));
    setHTML($('feed-n'), `${w.feed.length}`);
    setHTML($('readaloud'), this.readAloudHTML(c));
    setHTML($('dialog'), this.dialogHTML());
    if (this.dialog === 'qr' && this.links) for (const el of document.querySelectorAll('#dialog .qr')) mountQR(el, el.dataset.url, 5);
  },
  readAloudHTML(c) {
    const w = this.world, q = w.quarter;
    if (c.phase === 'lobby') return `<p>“Welcome to Concordia. Each table runs a parish. Before the storm, state the three values your parish will be held to, in order, and write the one line you will be measured against. Lock it when the whole table agrees. Your phones carry a private pick: what <i>you</i> would put first.”</p>`;
    if (c.phase === 'island') return `<p>“The island is open. Find your parish on the wall. Read your brief and your sheet; some of you hold a sealed envelope. Nothing moves until the first quarter card.”</p>`;
    if (c.phase === 'quarter_open' && q) return `<p><b>${esc(q.title)}</b> — “${esc(q.card)}”</p><p class="dim">Then start the clock. ${q.humanDeadlineTicks ? `Cards give ${q.humanDeadlineTicks * STEP / 60} simulated hours to decide (${mmss(q.humanDeadlineTicks * q.playSeconds / q.ticks)} real).` : ''}${q.maydayAnswerTicks ? ` Maydays give ${mmss(q.maydayAnswerTicks * q.playSeconds / q.ticks)} real to answer.` : ''}</p>`;
    if (c.phase === 'quarter_close') return `<p>“Clock stopped. At your table: what did you decide, who did it cost, and which of your three values did it serve? Two minutes.”</p>${q && q.index === QUARTERS.length - 1 ? '<p class="dim">Then open the debrief.</p>' : ''}`;
    if (c.phase === 'debrief') { const { step } = debriefStepOf(w), db = w.debrief || {}, placed = Object.keys((w.private || {}).placements || {}).length;
      const say = {
        counters: '“This is where Concordia stands. The low point is the hour the fewest people were safe. Hold that number.”',
        moments: `“Turn to your console. Before anything else, pick the moment that was hardest for your table and agree where it sits on the scale. Then you will see how the engine read it.” (${placed}/${ROSTER.length} placed)`,
        questions: `“At your table, two questions. ${DEBRIEF_QUESTIONS.join(' ')} Start from the moment you placed.” Four minutes.`,
        pattern: '“This is the room, not any one table. Where pressure from people with power won, where it did not, and what the storm took when nobody chose.”',
        gap: '“On your console: how your phones voted against what your table chose. Counts, no names. Who knew and did not say?”',
        credits: '“The lines of credit: who named whose people.”', replay: '“The storm, from the start. Watch for your hardest moment.”',
        commitment: '“On your phone, one sentence: when that moment comes again, what will you do first? It stays on your phone. Nothing is sent.”' };
      const line = step.id.startsWith('secret:') ? `“${esc(pname(step.id.slice(7)))} knew this.” Then: “${esc(db.debrief_question || '')}”` : say[step.id] || '';
      return `<p><b>Step ${step.n} of 8 · ${esc(step.title)}</b></p><p>${line}</p><p class="dim">Each step waits for you; the wall never advances by itself. Tables see their own record only on their own console.</p>`; }
    const lastCard = [...w.feed].reverse().find(f => f.event.kind === 'dilemma_presented'), lastMayday = [...w.feed].reverse().find(f => f.event.kind === 'mayday');
    return `${lastCard ? `<p><b style="color:${pcolor(lastCard.event.parish_id)}">${esc(pname(lastCard.event.parish_id))}</b> · ${esc(lastCard.event.title)}: ${personaHTML(lastCard.event.persona_id, (DATA.dilemmas[lastCard.event.dilemma_id] || {}).personaLine)}</p>` : ''}${lastMayday ? `<p><b>MAYDAY ${esc(lastMayday.event.call_id)}</b> · ${personaHTML(lastMayday.event.persona_id, lastMayday.event.line)}</p>` : ''}${!lastCard && !lastMayday ? '<p class="dim">The radio lines to read appear here as cards and maydays open.</p>' : ''}`;
  },
  dialogHTML() {
    const w = this.world, priv = w.private || {}; if (!this.dialog) return '';
    const close = `<button class="btn tiny" data-act="close" style="margin-left:auto">Close</button>`;
    if (this.dialog === 'enter') {
      const p = this.sel.table, en = this.sel.enter, cards = (priv.pending || []).filter(x => x.parish_id === p), calls = (priv.calls || []).filter(x => x.holder === p), tm = w.teams[p];
      return `<div class="dialog"><div class="box panel"><div class="row"><h2 style="color:${pcolor(p)}">Enter for ${esc(pname(p))}</h2>${close}</div><p class="dim">For a table whose tablet failed or whose sheet was filled on paper. Recorded as entered by the DM.</p>
        ${cards.map(cd => `<div class="dcard"><div class="lbl">Card · by ${clockStr(cd.deadline_t)}</div><div class="title" style="font-size:16px">${esc(cd.title)}</div>${optionsHTML(cd, en.option, { describe: false })}${en.option ? `<button class="btn primary" data-act="enter-decide" data-card="${esc(cd.dilemma_id)}">Decide ${letterOf(cd.dilemma_id, en.option)} for ${esc(pname(p))}</button>` : ''}</div>`).join('')}
        ${calls.map(cl => `<div class="mayday">${callCardHTML(cl, w, 'holder')}<div class="answers">${Object.keys(cl.answers).map(k => `<button class="btn" data-act="enter-answer" data-call="${esc(cl.call_id)}" data-answer="${esc(k)}">${esc(cl.answers[k].label || k)}</button>`).join('')}</div></div>`).join('')}
        ${!(tm && tm.stated_values && tm.stated_values.length) ? `<div><span class="lbl">Lock values for this table (${en.values ? en.values.length : 0}/${VALUES_TO_PICK})</span>${valuesGridHTML(en.values || [])}<button class="btn primary" data-act="enter-lock" ${(en.values || []).length === VALUES_TO_PICK ? '' : 'disabled'}>Lock for ${esc(pname(p))}</button></div>` : ''}
        ${!cards.length && !calls.length && tm && tm.stated_values && tm.stated_values.length ? '<p class="muted">Nothing is open for this table right now.</p>' : ''}
        ${this.last.enter ? `<div class="dim">${esc(resultText(this.last.enter))}</div>` : ''}</div></div>`;
    }
    if (this.dialog === 'promote') {
      const p = this.sel.table, live = this.world.roster || priv, phones = (live.clients || priv.clients || []).filter(x => x.parish === p && x.connected && x.role !== 'console' && !x.bot), seat = (live.seats || priv.seats || []).find(s => s.parish === p);
      return `<div class="dialog"><div class="box panel"><div class="row"><h2 style="color:${pcolor(p)}">${esc(pname(p))}'s console seat</h2>${close}</div><p class="dim">Console: ${esc(seat ? seat.console : 'free')}. Give the seat to a connected phone or a waiting device; the former holder becomes a phone.</p><div class="list">${phones.map(x => `<div class="it"><span>${esc(x.name || x.client_id)} <span class="dim">${esc(x.role)}</span></span><button class="btn tiny" data-act="reassign" data-client="${esc(x.client_id)}" data-parish="${p}">Make console</button></div>`).join('') || '<span class="dim">No other device of this table is connected.</span>'}</div>${this.last.seat ? `<div class="dim">${esc(resultText(this.last.seat))}</div>` : ''}</div></div>`;
    }
    if (this.dialog === 'swap') {
      const s = this.sel.swap, p = s.parish || this.sel.table || ROSTER[0];
      const sched = ((PROFILE.ask || {})[p] || []).map(a => a.dilemmaId), presented = new Set(Object.values(w.cards).filter(x => x.parish_id === p).map(x => x.dilemma_id));
      const from = sched.filter(id => !(w.cards[p + '|' + id] && w.cards[p + '|' + id].decision));
      const to = Object.values(DATA.dilemmas).filter(d => (d.parish === p || d.parish === 'multi') && !sched.includes(d.id) && !presented.has(d.id) && (!s.from || !DATA.dilemmas[s.from] || d.phase === DATA.dilemmas[s.from].phase));
      return `<div class="dialog"><div class="box panel"><div class="row"><h2>Swap a card</h2>${close}</div><div class="row">${ROSTER.map(x => `<button class="btn tiny ${p === x ? 'on' : ''}" data-act="swap-parish" data-parish="${x}" style="color:${pcolor(x)}">${esc(pname(x))}</button>`).join('')}</div>
        <div><span class="lbl">Replace</span><div class="list">${from.map(id => `<div class="it ${s.from === id ? 'on' : ''}" style="${s.from === id ? 'border-color:var(--accent)' : ''}"><span>${esc((DATA.dilemmas[id] || {}).title || id)} <span class="dim">${esc((DATA.dilemmas[id] || {}).phase || '')}${presented.has(id) ? ' · open now' : ''}</span></span><button class="btn tiny" data-act="swap-from" data-id="${esc(id)}">This one</button></div>`).join('') || '<span class="dim">Nothing left to swap for this table.</span>'}</div></div>
        ${s.from ? `<div><span class="lbl">With</span><div class="list" style="max-height:30vh;overflow:auto">${to.map(d => `<div class="it"><span>${esc(d.title)} <span class="dim">${esc(d.phase)}</span></span><button class="btn tiny" data-act="swap-to" data-id="${esc(d.id)}">Swap in</button></div>`).join('') || '<span class="dim">No unused card of that phase for this table.</span>'}</div></div>` : ''}
        ${this.last.lever ? `<div class="dim">${esc(resultText(this.last.lever))}</div>` : ''}</div></div>`;
    }
    if (this.dialog === 'qr') {
      const L = this.links;
      return `<div class="dialog"><div class="box panel" style="width:min(760px,94vw)"><div class="row"><h2>Join the session</h2>${close}</div>${L ? `<div class="row" style="align-items:flex-start;gap:20px"><div class="qr" data-url="${esc(L.lobby)}"><canvas width="10" height="10"></canvas><div class="code">${esc(L.code)}</div><div class="hint">Phones: scan, or open the link and type the code.</div></div><div class="list" style="flex:1;min-width:0"><div class="it"><span><b>Projector</b><br><span class="dim" style="word-break:break-all">${esc(L.projector)}</span></span></div>${ROSTER.map(p => `<div class="it"><span><b style="color:${pcolor(p)}">${esc(pname(p))}</b> table<br><span class="dim" style="word-break:break-all">${esc(L.tables[p])}</span></span></div>`).join('')}${L.pin ? `<div class="it"><span><b>DM</b> PIN <span class="num">${esc(L.pin)}</span><br><span class="dim" style="word-break:break-all">${esc(L.dm)}</span></span></div>` : ''}</div></div>` : '<p class="muted">Links are not available from this host (the LAN host prints them to its terminal and serves /join).</p>'}</div></div>`;
    }
    return '';
  },
  async send(key, kind, payload) { if (this.busy[key]) return null; this.busy[key] = true; this.render(); const r = await this.world.intent(kind, payload); this.busy[key] = false; this.last[key] = r ? { ...r, kind } : r; if (kind === 'export' && r && r.status === 'accepted' && !App.host) this.downloadExport(); this.render(); return r; },
  async loadLinks() {
    if (App.host) { this.links = App.host.links(); return; }
    try { const base = location.origin; const r = await fetch(`${base}/links?dm=${encodeURIComponent(App.token || '')}`); if (r.ok) { const j = await r.json(); const T = j.tables || {}; this.links = { code: j.code, lobby: j.lobby, tables: Object.fromEntries(Object.keys(T).map(p => [p, withRole(T[p], 'table')])), phones: Object.fromEntries(Object.keys(T).map(p => [p, withRole(T[p], 'phone')])), projector: j.projector, dm: j.dm, pin: null }; } } catch (e) { this.links = null; }
    this.render();
  },
  // over WebSockets the host writes run.json into its session directory and serves it at /export; download it here too
  async downloadExport() {
    try { const r = await fetch(`${location.origin}/export?dm=${encodeURIComponent(App.token || '')}`); if (r.ok) download(`run-${(this.world.session || {}).code || 'session'}.json`, await r.text()); } catch (e) { console.warn('export download', e.message); }
  },
  bind() {
    const root = $('app');
    onClick(root, '[data-act="next"]', () => { const na = this.nextAction(this.world.clock || {}); if (!na) return; if (na.soft) this.send('next', na.kind, na.payload || {}); else { this.armed = na.kind; this.render(); } });
    onClick(root, '[data-act="confirm"]', () => { const na = this.nextAction(this.world.clock || {}); this.armed = null; if (na) this.send('next', na.kind, na.payload || {}); });
    onClick(root, '[data-act="dstep-back"]', () => { const { i, steps } = debriefStepOf(this.world); if (i > 0) this.send('next', 'debrief_step', { step: i - 1, id: steps[i - 1].id }); });
    onClick(root, '[data-act="export-now"]', () => this.send('export', 'export', {}));
    onClick(root, '[data-act="disarm"]', () => { this.armed = null; this.render(); });
    onClick(root, '[data-act="advance"]', () => this.send('lever', 'advance', { ticks: 1 }));
    onClick(root, '[data-act="skip"]', () => { if (confirm('Skip ahead to the end of this quarter? Open cards expire on the way.')) this.send('lever', 'skip_ahead', {}); });
    onClick(root, '[data-act="heat"]', () => this.send('lever', 'heat', {}));
    onClick(root, '[data-act="cool"]', () => this.send('lever', 'cool', {}));
    onClick(root, '[data-act="flag"]', () => { const f = $('flag'); const text = (f ? f.value : this.flagText).trim(); if (!text) return; this.send('lever', 'flag', { text, parish_id: this.sel.table || undefined }).then(() => { this.flagText = ''; const g = $('flag'); if (g) g.value = ''; }); });
    onClick(root, '[data-act="qr"]', () => { this.dialog = 'qr'; this.render(); this.loadLinks(); });
    onClick(root, '[data-act="print"]', () => { const base = location.href.split(/[?#]/)[0]; const code = this.world.session ? this.world.session.code : ''; window.open(`${base}?role=print&code=${encodeURIComponent(code)}${App.host ? '' : `#dm=${App.token || ''}`}`, '_blank'); });
    onClick(root, '[data-act="fill"]', () => { if (App.host) { App.host.fillBots(); this.render(); } });
    onClick(root, '[data-act="autopilot"]', () => { if (!App.host) return; if (App.host.autopilot) { App.host.autopilot = false; } else App.host.startRehearsal(); this.render(); });
    onClick(root, '[data-act="enter"]', el => { this.sel.table = el.dataset.parish; this.sel.enter = {}; this.dialog = 'enter'; this.render(); });
    onClick(root, '[data-act="promote"]', el => { this.sel.table = el.dataset.parish; this.dialog = 'promote'; this.render(); });
    onClick(root, '[data-act="admit"]', el => this.send('seat', 'admit', { client_id: el.dataset.client }));
    onClick(root, '[data-act="reassign"]', el => this.send('seat', 'reassign', { parish_id: el.dataset.parish, client_id: el.dataset.client }));
    onClick(root, '[data-act="close"]', () => { this.dialog = null; this.render(); });
    onClick(root, '#dialog [data-opt]', el => { this.sel.enter.option = el.dataset.opt; this.render(); });
    onClick(root, '#dialog [data-value]', el => { const v = el.dataset.value, arr = this.sel.enter.values || (this.sel.enter.values = []), k = arr.indexOf(v); if (k >= 0) arr.splice(k, 1); else if (arr.length < VALUES_TO_PICK) arr.push(v); this.render(); });
    onClick(root, '[data-act="enter-decide"]', el => this.send('enter', 'decide', { parish_id: this.sel.table, dilemma_id: el.dataset.card, option_id: this.sel.enter.option, rationale: 'Entered by the DM for the table.' }));
    onClick(root, '[data-act="enter-answer"]', el => { const cl = CALL[el.dataset.call]; const payload = { parish_id: this.sel.table, call_id: el.dataset.call, answer: el.dataset.answer, reason: 'Entered by the DM' }; if (cl && cl.answers[el.dataset.answer] && cl.answers[el.dataset.answer].count != null) payload.count = cl.answers[el.dataset.answer].count; this.send('enter', 'answer_aid', payload); });
    onClick(root, '[data-act="enter-lock"]', () => this.send('enter', 'lock_values', { parish_id: this.sel.table, values: this.sel.enter.values.slice(), statement: `${pname(this.sel.table)} (entered by the DM).` }));
    onClick(root, '[data-act="swap"]', () => { this.dialog = 'swap'; this.sel.swap = { parish: this.sel.table || ROSTER[0] }; this.render(); });
    onClick(root, '[data-act="swap-parish"]', el => { this.sel.swap = { parish: el.dataset.parish }; this.render(); });
    onClick(root, '[data-act="swap-from"]', el => { this.sel.swap.from = el.dataset.id; this.render(); });
    onClick(root, '[data-act="swap-to"]', el => { const s = this.sel.swap; this.send('lever', 'swap', { parish_id: s.parish, from: s.from, to: el.dataset.id }).then(r => { if (r && r.status === 'accepted') { this.dialog = null; this.render(); } }); });
  },
};
