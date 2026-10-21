/* ---------- shared UI pieces (HTML strings + a few live widgets) ----------
   Panels are rebuilt from the world as strings and swapped only when they change (setHTML), so a
   statement being typed is never torn down under the typist. Countdowns are the one thing that moves
   between frames: elements with data-deadline are updated by Live, from the world's anchor, never
   from a client clock of their own. */
function setHTML(el, html) { if (!el) return false; if (el.__html === html) return false; el.__html = html; el.innerHTML = html; return true; }
function h(tag, attrs, inner) { const a = Object.entries(attrs || {}).filter(([, v]) => v != null && v !== false).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join(''); return `<${tag}${a}>${inner == null ? '' : inner}</${tag}>`; }
const Live = {
  fns: new Set(), world: null,
  // a frame when the browser gives one, a timer when it does not (a tab behind the projector's gets no frames)
  start(world) {
    this.world = world; let gen = 0;
    const step = id => { if (id !== gen) return; gen++; for (const fn of this.fns) { try { fn(); } catch (e) { console.error(e); } } this.updateDeadlines(); arm(); };
    const arm = () => { const id = gen; requestAnimationFrame(() => step(id)); setTimeout(() => step(id), 250); };
    arm();
  },
  updateDeadlines() {
    const w = this.world; if (!w) return;
    for (const el of document.querySelectorAll('[data-deadline]')) {
      const dl = Number(el.dataset.deadline), totalTicks = Number(el.dataset.total || 0), sec = w.secondsLeft(dl), total = Math.max(1, totalTicks) * w.spt;
      const fg = el.querySelector('.fg'), tx = el.querySelector('text'), C = 2 * Math.PI * 23;
      if (fg) fg.setAttribute('stroke-dashoffset', String(C * (1 - clamp(sec / total, 0, 1))));
      if (tx) { const s = mmss(sec); if (tx.textContent !== s) tx.textContent = s; }
      el.classList.toggle('low', sec < 60 && sec > 0);
      const txt = el.querySelector('.dl-text'); if (txt) { const s = sec > 0 ? `${mmss(sec)} left · by ${clockStr(dl)}` : `closed at ${clockStr(dl)}`; if (txt.textContent !== s) txt.textContent = s; }
    }
    for (const el of document.querySelectorAll('[data-countdown]')) { const s = mmss(w.secondsLeft(Number(el.dataset.countdown))); if (el.textContent !== s) el.textContent = s; }
  },
};
function radialHTML(deadlineT, totalTicks, label) {
  const C = (2 * Math.PI * 23).toFixed(1);
  return `<div class="deadline" data-deadline="${deadlineT}" data-total="${totalTicks}">
    <svg class="radial" viewBox="0 0 54 54" aria-hidden="true"><circle class="bg" cx="27" cy="27" r="23"/><circle class="fg" cx="27" cy="27" r="23" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 27 27)"/><text x="27" y="27">--:--</text></svg>
    <div><div class="lbl">${esc(label || 'Decide by')}</div><div class="dl-text num muted">by ${clockStr(deadlineT)}</div></div></div>`;
}
function meterHTML(intensity) { return `<div class="meter" title="Intensity ${intensity}/10" aria-label="intensity ${intensity} of 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < intensity ? 'on' : ''}" style="height:${6 + i}px"></i>`).join('')}</div>`; }
function countersHTML(c, big) {
  if (!c) return '';
  const doses = c.doses_shipped || 0, safe = c.people_safe || 0;
  return `<div class="counter"><span class="lbl">Doses shipped</span><span class="v doses num">${fmt(doses)}</span><div class="bar"><i style="width:${clamp(doses / WORLD_DOSES_NEEDED * 100, 0, 100)}%"></i></div><span class="dim" style="font-size:10.5px">of ${fmt(WORLD_DOSES_NEEDED)} the world needs</span></div>
    <div class="counter"><span class="lbl">People safe</span><span class="v people num">${fmt(safe)}</span><div class="bar"><i style="width:${clamp(safe / BASE_POPULATION * 100, 0, 100)}%"></i></div><span class="dim" style="font-size:10.5px">${c.at_risk ? `${fmt(c.at_risk)} at risk · ` : ''}${c.injured ? `${fmt(c.injured)} injured · ` : ''}${c.lost ? `<span style="color:var(--failed)">${fmt(c.lost)} lost</span>` : 'no one lost'}</span></div>`;
}
function phaseChip(tick) { const ph = tick ? tick.phase : 'watch'; return `<span class="chip dot phase-${esc(ph)}">${esc(ph)}</span>`; }
function topbarHTML(world, who, color, extra) {
  const q = world.quarter, tick = world.tick, c = world.clock || {};
  const qname = q ? q.title : (c.phase === 'debrief' ? 'Debrief' : 'Values');
  const state = c.phase === 'running' ? 'running' : c.phase === 'paused' ? 'paused' : c.phase === 'quarter_open' ? 'card' : c.phase === 'quarter_close' ? 'closed' : c.phase || '';
  return `<div class="brand" style="color:${esc(color || 'var(--fg)')}"><h1 style="color:var(--fg)">Values Crucible</h1><span class="who">${esc(who)}</span></div>
    <div><div class="qname">${esc(qname)}</div><div class="sub">${phaseChip(tick)}<span class="dim">${esc(state)}</span></div></div>
    <div><span class="simclock num">${clockStr(world.t)}</span><div class="sub"><span class="lbl">to landfall</span>${tick && tick.weather ? `<span class="muted">${Math.round(tick.weather.wind_kts || 0)} kt · ${esc(tick.weather.rain || '')}</span>` : ''}</div></div>
    <div><div class="sub"><span class="lbl">Intensity</span>${meterHTML(tick ? tick.intensity : 0)}</div></div>
    <div class="counters">${countersHTML(tick && tick.counters)}</div>
    ${extra || ''}
    <div><span class="conn ${world.conn === 'open' ? '' : 'off'}">${world.conn === 'open' ? 'linked' : esc(world.conn)}</span></div>`;
}
function feedHTML(items, opts = {}) {
  const list = items.slice(-(opts.limit || 40)).reverse();
  if (!list.length) return `<div class="al"><span class="t"></span><span class="dot"></span><span class="x dim">${esc(opts.empty || 'Quiet so far.')}</span></div>`;
  return list.map(it => `<div class="al ${esc(it.sev)}${it.storm ? ' storm' : ''}"><span class="t num">${clockStr(it.t)}</span><span class="dot"></span><span class="x">${esc(it.text)}</span></div>`).join('');
}
function nowHTML(text, opts = {}) { return `<div class="now ${opts.quiet ? 'quiet' : ''} ${opts.urgent ? 'urgent' : ''}" role="status"><b>${esc(opts.label || 'Now')}</b><span>${text}</span></div>`; }
function personaHTML(pid, line) { const p = pid && persona(pid); if (!p && !line) return ''; return `<div class="persona"><b>${esc(p ? `${p.name}, ${p.title}` : 'Radio')}</b><span>“${esc(line || (p && p.line) || '')}”</span></div>`; }
function optionsHTML(card, sel, opts = {}) {
  return `<div class="opts">${card.options.map((o, i) => `<button class="opt ${sel === o.id ? 'on' : ''} ${opts.chosen === o.id ? 'chosen' : ''}" data-opt="${esc(o.id)}" ${opts.disabled ? 'disabled' : ''}><span class="letter">${LETTERS[i]}</span><span><div>${esc(o.label)}</div>${opts.describe !== false && o.description ? `<div class="d">${esc(o.description)}</div>` : ''}</span></button>`).join('')}</div>`;
}
function valuesGridHTML(picked, opts = {}) {
  return `<div class="vgrid">${DECK.map(id => { const k = picked.indexOf(id); const v = DATA.valueDefs[id] || { name: id, definition: '' }; return `<button class="vcard ${k >= 0 ? 'on' : ''}" data-value="${esc(id)}" ${opts.disabled ? 'disabled' : ''}><b>${esc(v.name)}</b><small>${esc(v.definition)}</small>${k >= 0 ? `<span class="rk">${k + 1}</span>` : ''}</button>`; }).join('')}</div>`;
}
function tokensHTML(stock, opts = {}) {
  const rows = Object.entries(stock || {}).filter(([, n]) => n > 0);
  if (!rows.length) return `<span class="dim">Nothing on the sheet.</span>`;
  return `<div class="tokchips">${rows.map(([k, n]) => `<span class="tok" title="${esc(tname(k))}"><span style="color:${hexColor(TOKEN_COLOR[k] || 0xffffff)}">${esc(TOKEN_GLYPH[k] || k)}</span><b>${n}</b>${opts.names ? `<small class="dim">${esc(tname(k))}</small>` : ''}</span>`).join('')}</div>`;
}
function needsHTML(parish, quarterId) {
  const n = ((DATA.needs || {})[parish] || {})[quarterId] || {};
  const rows = Object.entries(n);
  if (!rows.length) return '';
  return `<div class="row" style="gap:6px"><span class="lbl">Needs this quarter</span>${rows.map(([k, c]) => `<span class="pill">${esc(TOKEN_GLYPH[k] || k)} × ${c}</span>`).join('')}</div>`;
}
function peopleHTML(parish, world, opts = {}) {
  const cards = CARDS_BY_PARISH[parish] || [];
  if (!cards.length) return `<span class="dim">No named residents on this sheet.</span>`;
  return `<div class="people">${cards.map(c => { const r = world.residents.cards[c.id]; const st = r ? r.state : 'safe'; const changed = r && world.t - r.t <= 4 * STEP; return `<div class="person ${changed ? 'changed' : ''}"><div><div class="n">${esc(c.name)}</div><div class="l">${esc(c.line)}</div></div><span class="st st-${esc(st)}">${esc(RES_LABEL[st] || st)}</span>${opts.why && r && r.narrative ? `<div class="why">${esc(r.narrative)}</div>` : ''}</div>`; }).join('')}</div>`;
}
function gapHTML(parish, world, opts = {}) {
  const rows = world.gapRows(parish);
  if (!rows.length) return `<span class="dim">No values stated yet.</span>`;
  return `<div class="mirror"><div class="vals">${rows.map(r => { const s = clamp(r.enacted_score / 3, -1, 1), w = Math.abs(s) * 50; return `<div class="val"><b>${r.stated_rank}. ${esc(vname(r.value))}</b><div class="gapbar"><i class="${s >= 0 ? 'pos' : 'neg'}" style="left:${s >= 0 ? 50 : 50 - w}%;width:${w}%"></i></div><div class="gaplbl"><span>against</span><span>${r.n_decisions ? `${r.enacted_score > 0 ? '+' : ''}${r.enacted_score.toFixed(1)} over ${r.n_decisions}` : 'untested'}</span><span>for</span></div>${opts.evidence ? `<div class="evid">${r.evidence.slice(-6).map(e => `<span class="${e.signal > 0 ? 'pos' : e.signal < 0 ? 'neg' : ''} ${e.decided_by === 'storm' ? 'storm' : ''}" title="${esc(e.label)}">${e.signal > 0 ? '+' : ''}${e.signal} ${esc(e.label.length > 34 ? e.label.slice(0, 32) + '…' : e.label)}</span>`).join('') || '<span class="dim">no evidence yet</span>'}</div>` : ''}</div>`; }).join('')}</div></div>`;
}
function statementHTML(parish, world, opts = {}) {
  const tm = world.teams[parish];
  if (!tm || !tm.stated_values || !tm.stated_values.length) return `<div class="stm" style="border-top-color:${pcolor(parish)}"><b>${esc(pname(parish))}</b><span class="pending">${esc(opts.pending || 'Still choosing…')}</span></div>`;
  return `<div class="stm" style="border-top-color:${pcolor(parish)}"><b>${esc(pname(parish))}</b><div class="vals">${tm.stated_values.map(v => `<span>${esc(vname(v))}</span>`).join('')}</div>${tm.statement ? `<div class="txt">“${esc(tm.statement)}”</div>` : ''}</div>`;
}
function decisionsHTML(parish, world, opts = {}) {
  const ds = world.decisionsOf(parish).filter(c => opts.since == null || c.decision.t > opts.since);
  if (!ds.length) return `<span class="dim">${opts.since != null ? 'No card this quarter.' : 'No card decided yet.'}</span>`;
  return `<div class="list">${ds.slice(-(opts.limit || 8)).map(c => `<div class="it"><span>${esc(c.title || c.dilemma_id)}<br><span class="dim">${c.decision.decided_by === 'storm' ? '<span class="tag storm">storm decided</span> ' : ''}${letterOf(c.dilemma_id, c.decision.option_id)}: ${esc(c.decision.option_label || optLabel(c.dilemma_id, c.decision.option_id))}</span></span><span class="num dim">${clockStr(c.decision.t)}</span></div>`).join('')}</div>`;
}
function mountQR(container, text, scale = 4) {
  const cv = container.querySelector('canvas'); if (!cv) return;
  try { QR.draw(cv, text, scale); } catch (e) { console.warn('qr', e.message); }
}
function qrHTML(url, label, code) { return `<div class="qr"><canvas width="10" height="10" aria-label="QR code for ${esc(label || 'the join link')}"></canvas>${code ? `<div class="code">${esc(code)}</div>` : ''}<div class="hint" style="word-break:break-all;max-width:360px;text-align:center">${esc(url)}</div></div>`; }
// crucible-host's links carry the token only (PROTOCOL.md 3); the role rides in the query so a scanned QR opens the right screen
function withRole(url, role) { if (!url) return url; const [head, frag] = String(url).split('#'); return `${head}${head.includes('?') ? '&' : '?'}role=${role}${frag ? '#' + frag : ''}`; }
function download(name, text, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function resultText(r) { if (!r) return ''; return r.status === 'accepted' ? `Recorded, applies at ${clockStr(r.applied_t)}.` : `Not accepted: ${r.message || r.reason}`; }
function onClick(root, selector, fn) { root.addEventListener('click', e => { const el = e.target.closest(selector); if (el && root.contains(el)) fn(el, e); }); }
function callCardHTML(call, world, role) {
  const other = role === 'holder' ? call.asker : call.holder;
  const route = call.route && ROUTE[call.route];
  return `<div class="from">${role === 'holder' ? `MAYDAY from ${esc(pname(call.asker))}` : `Your MAYDAY to ${esc(pname(call.holder))}`} · ${esc(call.call_id)}</div>
    ${personaHTML(call.persona_id, call.line)}
    <div class="ask">${esc(call.ask || '')}${call.token ? ` <b>${call.count} × ${esc(tname(call.token))}</b>` : ''}</div>
    ${route ? `<div class="route">Route: ${esc(route.name)} ${world.routeCut(route.id) ? '<span class="tag bad">cut</span>' : '<span class="tag ok">open</span>'} · ${esc(pname(other))}</div>` : ''}`;
}
