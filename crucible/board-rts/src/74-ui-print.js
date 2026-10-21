/* ---------- printed pack ----------
   Everything the room needs on paper, from the same content the engine runs: tent cards with the
   join QR, parish sheets, resident cards, sealed secret briefs, token sheets, mayday and answer cards,
   option letters, the values deck, the DM run sheet. Opened from the DM console; the QR codes carry
   the session this browser hosts, when there is one. */
const PrintUI = {
  // the links the QR codes carry: the in-page host this browser saved, or crucible-host's /links (the DM token opens them)
  async links(code, dmToken) {
    const saved = LocalHost.saved(code || undefined), base = location.href.split(/[?#]/)[0];
    if (saved) return { code: saved.code, pin: saved.tokens.pin, seed: saved.seed, lobby: `${base}?code=${saved.code}`, phones: Object.fromEntries(ROSTER.map(p => [p, `${base}?code=${saved.code}&role=phone&parish=${p}#t=${saved.tokens.tables[p]}`])), tables: Object.fromEntries(ROSTER.map(p => [p, `${base}?code=${saved.code}&role=table&parish=${p}#t=${saved.tokens.tables[p]}`])) };
    if (dmToken && /^https?:$/.test(location.protocol)) {
      try { const r = await fetch(`${location.origin}/links?dm=${encodeURIComponent(dmToken)}`); if (r.ok) { const j = await r.json(); const T = j.tables || {}; return { code: j.code, pin: null, seed: null, lobby: j.lobby, phones: Object.fromEntries(Object.keys(T).map(p => [p, withRole(T[p], 'phone')])), tables: Object.fromEntries(Object.keys(T).map(p => [p, withRole(T[p], 'table')])) }; } } catch (e) { /* print without QR codes */ }
    }
    return null;
  },
  async init(code, dmToken) {
    document.body.classList.add('role-print');
    document.title = 'Values Crucible · printed pack';
    const L = await this.links(code, dmToken), saved = L && L.pin != null ? L : null;
    const sheets = [];
    const sheet = (inner, cls = '') => sheets.push(`<div class="sheet ${cls}">${inner}</div>`);
    // 1. tent cards
    for (const p of ROSTER) sheet(`<div class="tent"><div><b style="color:${pcolor(p)}">${esc(pname(p))}</b><div class="k">${esc(GEO[p].tag)}</div>${L ? `<div class="code" style="margin-top:14px">${esc(L.code)}</div><p>Phones: scan, or open <b>${esc(L.lobby)}</b> and choose ${esc(pname(p))}.</p>` : '<p style="margin-top:14px">Session code: ____________</p><p>The DM shows the join link and QR on the DM console.</p>'}</div>${L ? `<div class="qr" data-url="${esc(L.phones[p])}"><canvas width="10" height="10"></canvas></div>` : ''}</div><p class="k" style="margin-top:12px">Fold along the middle. Tablet link for this table: ${L ? `<span style="word-break:break-all;font-family:var(--mono);font-size:10px;text-transform:none;letter-spacing:0">${esc(L.tables[p])}</span>` : 'on the DM console'}</p>`);
    // 2. parish sheets
    for (const p of ROSTER) {
      const P = PARISH[p], stock = DATA.stockpiles[p] || {}, needs = DATA.needs[p] || {};
      sheet(`<h2 style="color:${pcolor(p)}">${esc(P.name)}</h2><div class="k">${esc(P.role || '')} · population ${fmt(P.population)}</div><p>${esc(P.description)}</p>
        <div class="cardgrid"><div><h3>Assets</h3><p>${P.assets.map(esc).join('<br>')}</p></div><div><h3>Vulnerabilities</h3><p>${P.vulnerabilities.map(esc).join('<br>')}</p></div></div>
        ${P.valuesTested && P.valuesTested.length ? `<h3>Values this parish tests</h3><p>${P.valuesTested.map(esc).join(' · ')}</p>` : ''}
        <h3>Parish Values statement</h3><p>1. ______________________ 2. ______________________ 3. ______________________</p><p>${esc((PROFILE.statementTemplate || '').replace('{parish}', P.name))}</p>
        <h3>Sheet</h3><table><tr><th>Token</th><th>Count</th><th>Keep</th><th>Send to</th><th>Count</th></tr>${Object.entries(stock).map(([k, n]) => `<tr><td><b>${esc(TOKEN_GLYPH[k] || k)}</b> ${esc(tname(k))}</td><td>${n}</td><td></td><td></td><td></td></tr>`).join('')}</table>
        <h3>Needs by quarter</h3><table><tr>${QUARTERS.slice(1).map(q => `<th>${esc(q.name)}</th>`).join('')}</tr><tr>${QUARTERS.slice(1).map(q => `<td>${Object.entries(needs[q.id] || {}).map(([k, n]) => `${esc(TOKEN_GLYPH[k] || k)} × ${n}`).join('<br>') || '—'}</td>`).join('')}</tr></table>
        <h3>Routes</h3><p>${routesTouching(p).map(r => `${esc(r.name)} (${esc(r.mode)})`).join(' · ')}</p>
        <h3>Named residents</h3><p>${(CARDS_BY_PARISH[p] || []).map(c => `<b>${esc(c.name)}</b>, ${esc(c.line)}`).join('<br>')}</p>`);
    }
    // 3. resident cards
    for (const p of ROSTER) { const cards = CARDS_BY_PARISH[p] || []; if (!cards.length) continue; sheet(`<h2 style="color:${pcolor(p)}">${esc(pname(p))} · residents</h2><div class="cardgrid">${cards.map(c => `<div class="pcard"><b>${esc(c.name)}</b><div class="l">${esc(c.line)}</div><p>${esc(c.text || '')}</p><div class="k">${c.hazardQuarter ? `at risk in ${esc(c.hazardQuarter)}` : ''}</div></div>`).join('')}</div>`); }
    // 4. secret briefs, sealed
    for (const p of PROFILE.secretOrder || ROSTER) { const b = (PROFILE.secretBriefs || {})[p]; if (!b) continue; sheets.push(`<div class="sheet seal" style="break-after:page">SEALED<br><span style="color:${pcolor(p)}">${esc(pname(p))}</span><br><span style="font-size:14px;letter-spacing:.1em">open at your table only · the room sees it at the debrief</span></div>`); sheet(`<h2 style="color:${pcolor(p)}">${esc(pname(p))} · secret brief</h2><div class="k">Private to this table</div><p style="font-size:16px;line-height:1.6">${esc(b)}</p>`); }
    // 5. token sheets
    for (const p of ROSTER) { const stock = DATA.stockpiles[p] || {}, tiles = []; for (const [k, n] of Object.entries(stock)) for (let i = 0; i < n; i++) tiles.push(`<div class="v"><b>${esc(TOKEN_GLYPH[k] || k)}</b><span>${esc(tname(k))}</span><small class="k">${esc(pname(p))}</small></div>`); for (const [k, n] of Object.entries(DATA.hidden[p] || {})) for (let i = 0; i < n; i++) tiles.push(`<div class="v" style="border-style:dashed"><b>${esc(TOKEN_GLYPH[k] || k)}</b><span>${esc(tname(k))}</span><small class="k">${esc(pname(p))} · not on the inventory</small></div>`); sheet(`<h2 style="color:${pcolor(p)}">${esc(pname(p))} · tokens</h2><div class="k">Cut along the lines. Dashed tiles stay in the sealed envelope.</div><div class="vdeck">${tiles.join('')}</div>`); }
    // 6. mayday cards and the answer cards
    for (const c of DATA.calls) sheet(`<h2>MAYDAY ${esc(c.id)} <span class="k">${esc(c.quarter)}</span></h2><div class="k">${esc(pname(c.asker))} asks ${esc(pname(c.holder))}${c.token ? ` for ${c.count} × ${esc(tname(c.token))}` : ''}${c.windowClosesT != null ? ` · window closes ${clockStr(c.windowClosesT)}` : ''}</div>${c.personaId && persona(c.personaId) ? `<p><i>${esc(persona(c.personaId).name)}, ${esc(persona(c.personaId).title)}:</i> “${esc(c.line)}”</p>` : `<p>“${esc(c.line)}”</p>`}<p>${esc(c.ask)}</p><table><tr><th>Answer</th><th>Moves</th></tr>${Object.entries(c.answers).map(([k, a]) => `<tr><td><b>${esc(a.label)}</b></td><td>${a.count != null ? `${a.count} × ${esc(tname(c.token || ''))}` : k === 'grant' && c.token ? `${c.count} × ${esc(tname(c.token))}` : '—'}</td></tr>`).join('')}</table><p><b>Granting:</b> ${esc(c.grantingCosts)}<br><b>Refusing:</b> ${esc(c.refusingCosts)}</p>`);
    for (const word of ['GRANT', 'PART', 'REFUSE']) sheet(`<div class="bigword">${word}</div><p class="k">Hold up the answer; the console records it.</p>`);
    // 7. option letters
    for (const l of ['A', 'B', 'C', 'D']) sheet(`<div class="bigletter">${l}</div><p class="k">Raise the letter when the table has decided; the console locks it in.</p>`);
    // 8. the values deck
    sheet(`<h2>The values deck</h2><div class="k">${DECK.length} cards · each table states ${VALUES_TO_PICK}, in order</div><div class="vdeck">${DECK.map(id => { const v = DATA.valueDefs[id] || { name: id, definition: '' }; return `<div class="v"><b>${esc(v.name)}</b><span>${esc(v.definition)}</span></div>`; }).join('')}</div>`);
    // 9. the DM run sheet
    sheet(`<h2>DM run sheet · ${esc(PROFILE.title || PROFILE.id)}</h2>${saved ? `<div class="k">Session ${esc(saved.code)} · DM PIN ${esc(saved.pin)} · seed ${saved.seed}</div>` : L ? `<div class="k">Session ${esc(L.code)}</div>` : ''}
      <table><tr><th>Quarter</th><th>Sim span</th><th>Card</th><th>Play</th><th>Close</th><th>Card deadline</th><th>Mayday answer</th><th>Second move</th></tr>${QUARTERS.map(q => `<tr><td><b>${esc(q.title)}</b></td><td>${clockStr(q.fromT)} → ${clockStr(q.toT)}</td><td>${q.cardSeconds} s</td><td>${Math.round(q.playSeconds / 60)} min</td><td>${Math.round(q.closeSeconds / 60)} min</td><td>${q.humanDeadlineTicks ? `${q.humanDeadlineTicks} ticks · ${mmss(q.humanDeadlineTicks * q.playSeconds / q.ticks)} real` : '—'}</td><td>${q.maydayAnswerTicks ? `${q.maydayAnswerTicks} ticks · ${mmss(q.maydayAnswerTicks * q.playSeconds / q.ticks)} real` : '—'}</td><td>${esc(q.secondMove || '—')}</td></tr>`).join('')}</table>
      <h3>Scheduled cards</h3><table><tr><th>Table</th><th>Presented</th><th>Card</th><th>Default</th></tr>${Object.entries(PROFILE.ask || {}).flatMap(([p, asks]) => asks.map(a => ({ p, ...a }))).sort((a, b) => a.presentT - b.presentT).map(a => { const d = DATA.dilemmas[a.dilemmaId] || {}; const dflt = d.options && d.options.find(o => o.id === d.defaultOptionId); return `<tr><td style="color:${pcolor(a.p)}"><b>${esc(pname(a.p))}</b></td><td>${clockStr(a.presentT)}</td><td>${esc(d.title || a.dilemmaId)}</td><td>${dflt ? `${letterOf(a.dilemmaId, dflt.id)}: ${esc(dflt.label)}` : '—'}</td></tr>`; }).join('')}</table>
      <h3>Scheduled maydays</h3><table><tr><th>Call</th><th>Raised</th><th>From → to</th><th>Answer window</th></tr>${(PROFILE.maydays || []).map(m => { const c = CALL[m.callId] || {}; return `<tr><td><b>${esc(m.callId)}</b></td><td>${clockStr(m.t)}</td><td>${esc(pname(c.asker))} → ${esc(pname(c.holder))}${c.token ? ` · ${c.count} ${esc(tname(c.token))}` : ''}</td><td>${m.answerTicks} ticks</td></tr>`; }).join('')}</table>
      <p><b>Optional maydays</b> (tables raise them): ${(PROFILE.optionalMaydays || []).map(id => { const c = CALL[id]; return c ? `${id} (${pname(c.asker)} → ${pname(c.holder)}, ${c.quarter})` : id; }).join(' · ')}</p>
      <p><b>Allocation lock</b> ${LOCK_T != null ? clockStr(LOCK_T) : '—'} · <b>Secret order</b> ${(PROFILE.secretOrder || ROSTER).map(pname).join(' → ')}</p>
      <p><b>Debrief question:</b> ${esc(PROFILE.debriefQuestion || '')}<br><b>Commitment:</b> ${esc(PROFILE.commitment || '')}</p>`);
    $('app').innerHTML = `<div class="printbar"><b>Printed pack</b><span class="dim">${sheets.length} pages · portrait · ${L ? `QR codes carry session ${esc(L.code)}` : 'no session in this browser yet: tent cards print without QR codes'}</span><span class="spacer"></span><button class="btn" id="print-go">Print</button></div>${sheets.join('')}`;
    $('print-go').addEventListener('click', () => print());
    for (const el of document.querySelectorAll('.qr[data-url]')) mountQR(el, el.dataset.url, 4);
  },
};
