/* ---------- phone (portrait, private) ----------
   Three private moves and nothing else: the personal pick of values before the table locks, a vote on
   each card while the table talks, a commitment at the debrief. The screen never shows another
   table's business and never shows the table's own secret. The commitment never leaves the phone (S4.2):
   it is kept in this browser only, never sent to the host, never exported. */
const PhoneUI = {
  world: null, parish: null, busy: {}, last: {}, sel: { pick: [], vote: {}, when: null, will: null, pickSaved: false },
  init(world, parish) {
    this.world = world; this.parish = parish;
    document.body.classList.add('role-phone');
    $('app').innerHTML = `<div class="ptop"><h1>Values Crucible</h1><span class="who" id="who"></span><span class="spacer"></span><span class="conn" id="conn"></span></div><div class="panel pclock" id="pclock"></div><div id="now"></div><div id="main"></div><div class="panel"><header><h2>Radio</h2></header><div class="feed-list" id="feed" style="max-height:40vh"></div></div>`;
    this.bind();
    world.on('change', () => this.render());
    this.render();
  },
  render() {
    const w = this.world, p = this.parish; if (!w.ready) return;
    const priv = w.private || {}, c = w.clock || {}, tick = w.tick || {};
    setHTML($('who'), `${esc(pname(p))} · phone`);
    setHTML($('conn'), w.conn === 'open' ? 'linked' : esc(w.conn)); $('conn').classList.toggle('off', w.conn !== 'open');
    setHTML($('pclock'), `<div><span class="l">${esc(w.quarter ? w.quarter.title : c.phase === 'debrief' ? 'Debrief' : 'Values')}</span><span class="v num">${clockStr(w.t)}</span></div><div><span class="l">Intensity</span>${meterHTML(tick.intensity || 0)}</div><div><span class="l">People safe</span><span class="v num" style="color:#9be3b0">${fmt((tick.counters || {}).people_safe || 0)}</span></div>`);
    const myPick = priv.my_pick || (this.sel.pickSaved ? this.sel.pick : null), tm = w.teams[p], locked = tm && tm.stated_values && tm.stated_values.length;
    const open = (priv.pending || []).filter(card => !(priv.my_votes || {})[card.dilemma_id] && !this.last['vote:' + card.dilemma_id]);
    let now, main;
    if (c.phase === 'debrief') {
      const kept = this.kept(), s = this.sel;
      if (s.when == null) s.when = kept ? kept.when : ''; if (s.will == null) s.will = kept ? kept.will : '';
      now = nowHTML(kept ? 'Kept on this phone. Nothing was sent; nobody else can see it.' : 'One commitment, for you alone. It stays on this phone: nothing is sent, nothing is exported.', { label: 'Debrief' });
      main = `<div class="panel"><div class="body">
        <div class="ifthen-form"><span class="lbl">My commitment</span>
          ${kept && !this.editing ? `<div class="statement">“When ${esc(kept.when)}, I will ${esc(kept.will)}.”</div><button class="btn" data-act="commit-edit">Change it</button>` : `<label>When <input id="c-when" maxlength="140" placeholder="HQ asks me to keep the numbers quiet" value="${esc(s.when)}"></label><label>I will <input id="c-will" maxlength="140" placeholder="ask who is not in the room, out loud" value="${esc(s.will)}"></label><button class="btn primary" data-act="commit" ${s.when.trim() && s.will.trim() ? '' : 'disabled'}>Keep it on this phone</button>`}
          <div class="dim">Write it as the moment you will meet again and the first thing you will do. Screenshot it if you want it later.</div></div>
        ${this.mineHTML(myPick)}</div></div>`;
    } else if (open.length) {
      const card = open[0], d = DATA.dilemmas[card.dilemma_id] || {}, sel = this.sel.vote[card.dilemma_id], q = w.quarter, total = q && q.humanDeadlineTicks ? q.humanDeadlineTicks : Math.max(1, (card.deadline_t - card.t) / STEP);
      now = nowHTML('Your private vote. The table decides on the console; the gap between the two is shown at the debrief.', { label: 'Vote' });
      main = `<div class="panel"><div class="body dcard">${radialHTML(card.deadline_t, total, 'Table decides by')}<div class="title" style="font-size:19px">${esc(card.title)}</div>${personaHTML(card.persona_id || d.personaId, d.personaLine)}<div class="setup">${esc(card.setup)}</div>${optionsHTML(card, sel, { describe: true })}
        ${sel ? `<button class="btn primary" data-act="vote" data-card="${esc(card.dilemma_id)}" ${this.busy['vote:' + card.dilemma_id] ? 'disabled' : ''}>Vote ${letterOf(card.dilemma_id, sel)}</button>` : '<div class="dim">Tap an option, then vote.</div>'}</div></div>`;
    } else if (!myPick && (c.phase === 'lobby' || c.phase === 'island' || !locked)) {
      const ok = this.sel.pick.length === VALUES_TO_PICK;
      now = nowHTML(`Before your table locks: pick the ${VALUES_TO_PICK} values you would put first, in order. Only you see this.`, { label: 'Private pick' });
      main = `<div class="panel"><div class="body"><div class="row"><span class="lbl">My pick</span><span class="spacer"></span><span class="count">${this.sel.pick.length}/${VALUES_TO_PICK}</span></div>${valuesGridHTML(this.sel.pick)}<button class="btn primary" data-act="pick" ${ok && !this.busy.pick ? '' : 'disabled'}>Save my pick</button>${this.last.pick && this.last.pick.status === 'rejected' ? `<div class="dim">${esc(resultText(this.last.pick))}</div>` : ''}</div></div>`;
    } else {
      const lateVote = Object.entries(this.last).filter(([k, r]) => k.startsWith('vote:') && r && r.status === 'accepted').map(([, r]) => r).sort((a, b) => (b.input_seq || 0) - (a.input_seq || 0))[0];
      now = lateVote && lateVote.late && c.phase !== 'debrief' ? nowHTML('Your vote came after your table\'s move, so it was not counted. It stays on this phone\'s record.', { label: 'Late' }) : nowHTML(c.phase === 'quarter_open' ? 'The quarter card is on the table. The clock starts when the DM starts it.' : c.phase === 'quarter_close' ? 'Quarter closed. Talk at your table.' : locked ? 'Watching. Your table\'s console carries the move; a card to vote on comes with the clock.' : 'Saved. Your table\'s statement appears here when it locks.', { quiet: true });
      main = `<div class="panel"><div class="body">${this.mineHTML(myPick)}</div></div>`;
    }
    setHTML($('now'), now);
    if (setHTML($('main'), main)) for (const [id, k] of [['c-when', 'when'], ['c-will', 'will']]) { const el = $(id); if (el) el.addEventListener('input', () => { this.sel[k] = el.value; const b = document.querySelector('[data-act="commit"]'); if (b) b.disabled = !(this.sel.when.trim() && this.sel.will.trim()); }); }
    setHTML($('feed'), feedHTML(w.feed.filter(f => f.sev !== 'private'), { limit: 15, empty: 'The radio is quiet.' }));
  },
  mineHTML(myPick) {
    const w = this.world, p = this.parish, tm = w.teams[p], priv = w.private || {}, votes = priv.my_votes || {};
    const stated = (tm && tm.stated_values) || [];
    const picks = myPick ? `<div><span class="lbl">My pick against the table's statement</span><div class="mine">${myPick.map((v, i) => { const k = stated.indexOf(v); return `<div class="m"><span>${i + 1}. ${esc(vname(v))}</span><span class="dim">${stated.length ? (k >= 0 ? `table #${k + 1}` : '<span class="diff">not stated</span>') : 'table pending'}</span><span></span></div>`; }).join('')}${stated.filter(v => !myPick.includes(v)).map(v => `<div class="m"><span class="dim">${esc(vname(v))}</span><span class="diff">table only</span><span></span></div>`).join('')}</div></div>` : '';
    const ds = w.decisionsOf(p), voted = Object.keys(votes);
    const list = ds.length || voted.length ? `<div><span class="lbl">My votes against the table's calls</span><div class="mine">${ds.map(c => { const mine = votes[c.dilemma_id], late = (priv.my_late || []).includes(c.dilemma_id); return `<div class="m"><span>${esc(c.title || c.dilemma_id)}</span><span>table ${letterOf(c.dilemma_id, c.decision.option_id)}${c.decision.decided_by === 'storm' ? ' <span class="tag storm">storm</span>' : ''}</span><span class="${mine && !late && mine !== c.decision.option_id ? 'diff' : 'dim'}">${mine ? 'me ' + letterOf(c.dilemma_id, mine) + (late ? ' (late, not counted)' : '') : 'no vote'}</span></div>`; }).join('')}</div></div>` : '';
    return `${statementHTML(p, w, { pending: 'The table has not locked yet.' })}${picks}${list}`;
  },
  commitKey() { return `commitment.${(this.world.session || {}).code || 'local'}.${this.parish}`; },
  kept() { try { const v = JSON.parse(localStorage.getItem(this.commitKey()) || 'null'); return v && v.when && v.will ? v : null; } catch (e) { return this.sel.keptMem || null; } },
  keep(v) { this.sel.keptMem = v; try { localStorage.setItem(this.commitKey(), JSON.stringify(v)); } catch (e) { /* private window: kept in memory for this visit */ } },
  async send(key, kind, payload, after) { if (this.busy[key]) return; this.busy[key] = true; this.render(); const r = await this.world.intent(kind, payload); this.busy[key] = false; this.last[key] = r; if (after) after(r); this.render(); },
  bind() {
    const root = $('app'), s = this.sel;
    onClick(root, '[data-value]', el => { const v = el.dataset.value, k = s.pick.indexOf(v); if (k >= 0) s.pick.splice(k, 1); else if (s.pick.length < VALUES_TO_PICK) s.pick.push(v); this.render(); });
    onClick(root, '[data-act="pick"]', () => this.send('pick', 'personal_pick', { values: s.pick.slice() }, r => { if (r.status === 'accepted') s.pickSaved = true; }));
    onClick(root, '[data-opt]', el => { const card = ((this.world.private || {}).pending || [])[0]; const open = ((this.world.private || {}).pending || []).filter(c => !((this.world.private || {}).my_votes || {})[c.dilemma_id] && !this.last['vote:' + c.dilemma_id])[0] || card; if (!open) return; s.vote[open.dilemma_id] = el.dataset.opt; this.render(); });
    onClick(root, '[data-act="vote"]', el => { const id = el.dataset.card; this.send('vote:' + id, 'vote', { dilemma_id: id, option_id: s.vote[id] }); });
    onClick(root, '[data-act="commit"]', () => { const when = ($('c-when') || {}).value || s.when || '', will = ($('c-will') || {}).value || s.will || ''; if (!when.trim() || !will.trim()) return; this.keep({ when: when.trim().replace(/[.]+$/, ''), will: will.trim().replace(/[.]+$/, '') }); this.editing = false; this.render(); });
    onClick(root, '[data-act="commit-edit"]', () => { this.editing = true; this.render(); });
  },
};
