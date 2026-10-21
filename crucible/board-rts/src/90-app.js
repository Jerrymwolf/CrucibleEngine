/* ---------- boot: the role from the URL, the transport, the join flow ----------
   URLs (PROTOCOL.md 3, plus the query form this bundle uses when there is no server):
     ?role=table&parish=haven#t=<token>      table console      ?role=phone&parish=haven#t=<token>   phone
     ?role=projector#p=<token>               projector          ?role=dm#dm=<token>                  DM (PIN typed)
     ?code=G7K2PQ  or  /j/G7K2PQ             lobby: choose a seat                      ?role=print&code=…   printed pack
     ?ws=ws://host:7878/ws                   talk to crucible-host; a page served from /j/… does so by itself
     ?role=dm&rehearsal=1&speed=18&seed=42   an in-page host that fills every table and runs the 90 minutes in 5
   With no server and no ?ws, a role looks for an in-page host in another window of this browser; the DM
   console starts one. Finding none, it offers to run on this device instead. */
const App = { role: null, parish: null, code: null, token: null, pin: null, host: null, channel: null, client: null, world: null, transport: null, join: { role: null, parish: null }, uiRole: null, img: null, starting: false, timing: {} };
function parseUrl() {
  const path = location.pathname.match(/\/j\/([A-Za-z0-9]{4,8})/), frag = new URLSearchParams(location.hash.replace(/^#/, ''));
  let role = { table: 'console', console: 'console', parish: 'console', phone: 'phone', projector: 'projector', dm: 'dm', facilitator: 'dm', print: 'print' }[Q.get('role') || Q.get('view') || ''] || null;
  if (!role && frag.get('p')) role = 'projector';
  if (!role && frag.get('dm')) role = 'dm';
  const token = frag.get('t') || frag.get('p') || frag.get('dm') || null;
  const code = (Q.get('code') || (path && path[1]) || '').toUpperCase() || null;
  return { role, parish: Q.get('parish') && ROSTER.includes(Q.get('parish')) ? Q.get('parish') : null, code, token, pin: Q.get('pin') || frag.get('pin') || null, ws: Q.get('ws'), rehearsal: Q.get('rehearsal') === '1', speed: Number(Q.get('speed')) || null, seed: Q.has('seed') ? Number(Q.get('seed')) : null, fresh: Q.get('new') === '1' };
}
const veil = { show(msg, cls) { const v = $('veil'); v.classList.remove('off'); const m = $('veil-msg'); m.textContent = msg || ''; m.className = cls || ''; }, hide() { $('veil').classList.add('off'); }, join(html) { $('veil-join').innerHTML = html || ''; } };
function loadIsland() { return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('island art')); img.src = $('island-src').textContent.trim(); }); }

// the stored identity's scope: one per role for the DM and the projector, one per seat for a table console, one per tab otherwise
function scopeFor(u) { if (u.role === 'dm' || u.role === 'projector') return u.role; if (u.role === 'console' && u.parish) return 'console.' + u.parish; return (u.role || 'join') + '.' + tabId(); }
// a bare table link (crucible-host prints them without a role): one question, remembered for this tab
function chooseRole(u) {
  const k = 'crucible.role.' + u.token; let r = null; try { r = sessionStorage.getItem(k); } catch (e) { /* no sessionStorage */ }
  if (r) return Promise.resolve(r);
  return new Promise(res => {
    veil.show('This link is for a table. Which device is this?');
    veil.join(`<div class="join"><div class="roles"><button class="btn primary" data-pick="console">The table's tablet<small>the console the whole table works on</small></button><button class="btn" data-pick="phone">My own phone<small>private picks and votes</small></button></div></div>`);
    onClick($('veil-join'), '[data-pick]', el => { const v = el.dataset.pick; try { sessionStorage.setItem(k, v); } catch (e) { /* fine */ } veil.join(''); res(v); });
  });
}
// a page opened with nothing in its address (the published artifact drops query strings): one question, how to use it
function chooseStart() {
  return new Promise(res => {
    let pace = 2;
    const draw = () => {
      veil.show('How do you want to try the Values Crucible?');
      veil.join(`<div class="join">
        <div class="hint" style="font-weight:600">Play one parish yourself. Bots lead the other five, and the session runs itself.</div>
        <div class="parishes" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${ROSTER.map(p => `<button class="btn" data-solo="${p}" style="color:${pcolor(p)};min-height:52px">${esc(pname(p))}</button>`).join('')}</div>
        <div class="roles"><button class="btn ${pace === 2 ? 'on' : ''}" data-pace="2">Quick<small>about 30 minutes of play</small></button><button class="btn ${pace === 1 ? 'on' : ''}" data-pace="1">Real pace<small>60 minutes, as in the room</small></button></div>
        <div class="hint" style="font-weight:600;margin-top:10px">Or watch, or run it for a room</div>
        <div class="roles"><button class="btn" data-mode="rehearsal">Watch a bot rehearsal<small>all six parishes, about 5 minutes</small></button><button class="btn" data-mode="dm">Facilitate a session<small>the DM console; tables join from other windows</small></button></div>
      </div>`);
    };
    draw();
    onClick($('veil-join'), '[data-pace]', el => { pace = Number(el.dataset.pace); draw(); });
    onClick($('veil-join'), '[data-solo]', el => { veil.join(''); res({ mode: 'solo', parish: el.dataset.solo, speed: pace }); });
    onClick($('veil-join'), '[data-mode]', el => { veil.join(''); res({ mode: el.dataset.mode }); });
  });
}
// solo: an in-page host, this page is the chosen parish's console, bots take the other tables once its values are locked
function startSolo(u, parish, speed) {
  Object.assign(u, { role: 'console', parish, speed, code: null, rehearsal: false, fresh: true });
  Object.assign(App, { role: 'console', parish, solo: true }); App.join = { role: 'console', parish };
  const host = startLocalHost(u);
  const iv = setInterval(() => { if (host.inputs.some(i => i.kind === 'lock_values' && i.parish_id === parish)) { clearInterval(iv); host.startRehearsal(); } }, 400);
  const opts = { code: host.code, session_code: host.code, token: host.tokens.tables[parish], role: 'console', scope: scopeFor(u), name: `${pname(parish)} tablet` };
  veil.show('Starting the session…');
  connect(new LoopbackTransport(host), opts, u);
}
// the facilitator's few moves a solo player still needs: pause, and stepping through the debrief
function soloBar(world) {
  const bar = document.createElement('div'); bar.id = 'solo-bar';
  bar.style.cssText = 'position:fixed;top:8px;right:8px;z-index:4;display:flex;gap:6px;align-items:center;background:var(--bg);border:1px solid var(--line, #334);border-radius:6px;padding:4px 8px;font-size:13px';
  document.body.appendChild(bar);
  const dm = (kind, p = {}) => App.host.dmIntent(App.host.autoDm(), kind, p);
  const draw = () => {
    const h = App.host, ph = h.phase;
    let html = '<span class="dim">Solo</span>';
    if (ph === 'lobby') html += '<span>Lock your three values to start the storm</span>';
    if (ph === 'running') html += '<button class="btn tiny" data-solo-act="pause">Pause</button>';
    if (ph === 'paused') html += '<button class="btn tiny" data-solo-act="resume">Resume</button>';
    if (ph === 'debrief') { const { i, step, steps } = debriefStepOf(world); html += `<span>${i + 1}/${steps.length} ${esc(step.title)}</span><button class="btn tiny" data-solo-act="back" ${i > 0 ? '' : 'disabled'}>Back</button><button class="btn tiny" data-solo-act="next" ${i < steps.length - 1 ? '' : 'disabled'}>Next</button>`; }
    if (bar.innerHTML !== html) bar.innerHTML = html;
  };
  onClick(bar, '[data-solo-act]', el => {
    const a = el.dataset.soloAct;
    if (a === 'pause' || a === 'resume') dm(a);
    else { const { i, steps } = debriefStepOf(world), j = a === 'next' ? i + 1 : i - 1; if (steps[j]) dm('debrief_step', { step: j, id: steps[j].id }); }
  });
  world.on('change', draw); draw();
}
function startLocalHost(u) {
  const saved = u.code && !u.fresh && !u.rehearsal ? LocalHost.saved(u.code) : null;
  App.host = new LocalHost(saved ? { restore: saved, speed: u.speed } : { seed: u.seed, speed: u.speed, rehearsal: u.rehearsal, code: u.code, pin: u.pin });
  if (typeof BroadcastChannel !== 'undefined') App.channel = new ChannelServer(App.host);
  App.host.events.on('export', data => { const c = App.host.code; download(`run-${c}.json`, JSON.stringify(data.run)); download(`votes-${c}.json`, JSON.stringify(data.votes, null, 2)); download(`flags-${c}.json`, JSON.stringify(data.flags, null, 2)); });
  if (u.rehearsal) setTimeout(() => App.host.startRehearsal(), 400);
  return App.host;
}
function initUI(world) {
  App.uiRole = world.role;
  switch (world.role) {
    case 'console': TableUI.init(world, world.parish); break;
    case 'phone': PhoneUI.init(world, world.parish); break;
    case 'projector': ProjectorUI.init(world); break;
    case 'dm': DMUI.init(world); break;
    default: veil.show(`Seated as ${world.role}; nothing to show for that role.`);
  }
}
function showJoin(lobby, client, u, err) {
  const j = App.join, seats = lobby ? lobby.seats : null;
  veil.show(err || (lobby ? `Session ${lobby.code || App.code || ''}: choose a seat.` : 'Join a session'), err ? 'err' : '');
  veil.join(`<div class="join">${!App.code ? `<input class="code" id="join-code" maxlength="6" placeholder="CODE" autocapitalize="characters" autocomplete="off">` : ''}
    <div class="roles"><button class="btn ${j.role === 'console' ? 'on' : ''}" data-role="console">Table console<small>the tablet at the table</small></button><button class="btn ${j.role === 'phone' ? 'on' : ''}" data-role="phone">Phone<small>my own device · private</small></button></div>
    <div class="parishes">${ROSTER.map(p => { const s = seats && seats.find(x => x.parish === p); return `<button class="btn ${j.parish === p ? 'on' : ''}" data-parish="${p}" style="color:${pcolor(p)};min-height:52px;flex-direction:column;display:flex;align-items:center;gap:2px">${esc(pname(p))}${s ? `<small class="dim">${s.console === 'free' ? 'console free' : s.console === 'held' ? 'console taken' : 'console offline'} · ${s.phones} phone${s.phones === 1 ? '' : 's'}</small>` : ''}</button>`; }).join('')}</div>
    <button class="btn primary" id="join-go" ${j.role && j.parish ? '' : 'disabled'}>${j.role && j.parish ? `Join ${esc(pname(j.parish))} as ${j.role === 'console' ? 'the table console' : 'a phone'}` : 'Choose a role and a parish'}</button>
    <div class="hint">The projector and the DM console use their own links; a tablet replaces a dead console at its table, a connected console waits for the DM.</div></div>`);
  const root = $('veil-join');
  onClick(root, '[data-role]', el => { j.role = el.dataset.role; showJoin(lobby, client, u, err); });
  onClick(root, '[data-parish]', el => { j.parish = el.dataset.parish; showJoin(lobby, client, u, err); });
  onClick(root, '#join-go', () => {
    const codeEl = $('join-code'); if (codeEl) { const c = codeEl.value.trim().toUpperCase(); if (c.length < 4) { veil.show('Type the six-character session code.', 'err'); return; } App.code = c; client.opts.session_code = c; client.opts.code = c; client.storeKey = Client.keyFor(c, client.opts.scope); }
    client.opts.claim = { parish: j.parish, role: j.role };
    veil.show(`Joining ${pname(j.parish)}…`);
    if (lobby) client.claimSeat(j.parish, j.role); else client.hello();
  });
}
function showNoHost(u) {
  veil.show('No session host was found in this browser.');
  veil.join(`<div class="join"><button class="btn primary" id="nh-local">Run on this device instead<small style="display:block;font-size:11px;letter-spacing:0;text-transform:none;font-family:var(--ui)">starts an in-page host; this ${esc(u.role || 'device')} joins it</small></button>
    <div class="row"><input id="nh-ws" placeholder="ws://192.168.8.1:7878/ws" style="flex:1"><button class="btn" id="nh-connect">Connect</button></div>
    <div class="hint">The DM console starts a host of its own; open it in another window of this browser, or point this device at the LAN host's address.</div></div>`);
  $('nh-local').addEventListener('click', () => {
    if (App.transport) App.transport.close();
    const host = startLocalHost({ ...u, code: null, rehearsal: false });
    const opts = { code: host.code, session_code: host.code, scope: scopeFor(u), name: u.role || 'device' };
    if ((u.role === 'console' || u.role === 'phone') && u.parish) { opts.token = host.tokens.tables[u.parish]; opts.role = u.role; }
    else if (u.role === 'projector') opts.token = host.tokens.projector;
    else if (u.role === 'console' || u.role === 'phone') App.join.role = u.role;
    veil.join(''); veil.show('Starting the in-page host…');
    connect(new LoopbackTransport(host), opts, u);
  });
  $('nh-connect').addEventListener('click', () => { const v = $('nh-ws').value.trim(); if (!v) return; const url = new URL(location.href); url.searchParams.set('ws', v); location.href = url.toString(); });
}
function connect(transport, opts, u) {
  const client = new Client(transport, opts), world = new World(client);
  App.client = client; App.world = world; App.transport = transport;
  if (!App._live) { App._live = true; Live.start(world); } else Live.world = world;
  if (R.ready) R.setWorld(world);
  world.on('snapshot', async () => {
    if (App.timing && !App.timing.welcome) App.timing.welcome = Math.round(performance.now());
    if (!App.uiRole) {
      if (App.starting) return; App.starting = true;
      // the map is built once the seat is known: a phone never pays for WebGL, a tablet joining from the lobby gets it now
      if (world.role !== 'phone' && App.img && !R.ready) { try { await createRenderer(App.img); if (App.timing) App.timing.renderer = Math.round(performance.now()); } catch (e) { console.warn('WebGL unavailable; the map is off', e.message); } }
      if (R.ready) R.setWorld(world);
      initUI(world); App.starting = false;
      if (App.solo && !App.soloBar) App.soloBar = soloBar(world) || true;
    } else if (App.uiRole !== world.role) { location.reload(); return; } // the seat changed role (a console became a phone): start clean
    veil.hide();
  });
  world.on('lobby', f => { if (!client.opts.claim) showJoin(f, client, u); });
  world.on('waiting', f => { veil.show(`${pname(f.parish)}'s console is held by a connected tablet. Waiting for the DM to admit this one…`); veil.join(''); });
  world.on('error', f => {
    if (f.code === 'bad_pin') { const pin = prompt('DM PIN'); if (pin) { client.opts.pin = pin; client.hello(); } else veil.show('A PIN is needed for the DM console.', 'err'); }
    else if (f.code === 'no_such_session' || f.code === 'bad_token') { App.code = f.code === 'no_such_session' ? null : App.code; client.opts.token = null; client.opts.claim = null; showJoin(null, client, u, f.message); }
    else if (f.code === 'not_welcome' || f.code === 'unknown_client') { /* the client re-says hello by itself */ }
    else { console.warn('host:', f.code, f.message); veil.show(`${f.code}: ${f.message || ''}`, 'err'); }
  });
  world.on('reload', () => { veil.show('The host runs a different protocol version. Reloading the page…'); const last = store.get('reloaded', 0); if (Date.now() - last > 60000) { store.set('reloaded', Date.now()); setTimeout(() => location.reload(), 1500); } });
  world.on('conn', (s, info) => {
    if (s === 'nohost' && transport instanceof ChannelTransport && !world.ready) showNoHost(u);
    else if (s === 'connecting' && !world.ready) veil.show(transport instanceof WebSocketTransport ? `Connecting to ${transport.url}…` : 'Looking for the session host…');
    else if (s === 'closed' && !world.ready && transport instanceof WebSocketTransport) veil.show(`The host did not answer (${info || 'closed'}). Retrying…`, 'err');
  });
  client.connect();
}
async function boot() {
  const u = parseUrl(); Object.assign(App, { role: u.role, parish: u.parish, code: u.code, token: u.token, pin: u.pin });
  App.join = { role: u.role === 'console' || u.role === 'phone' ? u.role : null, parish: u.parish };
  const t0 = performance.now(), mark = k => { App.timing[k] = Math.round(performance.now() - t0); }; App.timing = {};
  try { await Engine.init(); } catch (e) { veil.show('The engine failed to load: ' + e.message, 'err'); return; }
  mark('engine');
  if (u.role === 'print') { veil.hide(); await PrintUI.init(u.code, u.token); return; }
  if (!u.role && u.token) { u.role = await chooseRole(u); App.role = u.role; App.join.role = u.role; }
  try { App.img = await loadIsland(); mark('island'); SHORE = traceShore(App.img); mark('shore'); } catch (e) { console.warn('island art', e.message); }
  buildRoutes(); mark('routes');
  const servedByHost = /^https?:$/.test(location.protocol) && (/\/j\//.test(location.pathname) || Q.get('host') === 'ws');
  if (!u.role && !u.token && !u.code && !u.ws && !servedByHost) {
    const pick = await chooseStart();
    if (pick.mode === 'solo') { startSolo(u, pick.parish, pick.speed); return; }
    Object.assign(u, { role: 'dm', rehearsal: pick.mode === 'rehearsal', speed: pick.mode === 'rehearsal' ? 18 : null, fresh: true }); App.role = 'dm';
  }
  const opts = { session_code: u.code, token: u.token, role: u.role === 'console' || u.role === 'phone' ? u.role : undefined, pin: u.pin, code: u.code, scope: scopeFor(u), name: u.role === 'console' ? `${pname(u.parish || '')} tablet`.trim() : u.role || 'device' };
  if (!u.token && u.code && App.join.role && App.join.parish) opts.claim = { parish: App.join.parish, role: App.join.role };
  let transport;
  if (u.ws) transport = new WebSocketTransport(u.ws);
  else if (servedByHost) transport = new WebSocketTransport((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  else if (u.role === 'dm') { const host = startLocalHost(u); transport = new LoopbackTransport(host); Object.assign(opts, { token: host.tokens.dm, pin: host.tokens.pin, session_code: host.code, code: host.code, name: 'DM' }); }
  else transport = new ChannelTransport();
  veil.show(transport instanceof WebSocketTransport ? `Connecting to ${transport.url}…` : u.role === 'dm' ? 'Starting the session host…' : 'Looking for the session host…');
  connect(transport, opts, u);
}
window.__crucible = {
  App, R, Engine, QUARTERS, DATA,
  get world() { return App.world; }, get host() { return App.host; }, get client() { return App.client; },
  selfCheck(seed = 42) { const log = Engine.run({ seed, session: PROFILE.id, teams: PIDS.map(p => ({ parish_id: p, controller: ROSTER.includes(p) ? 'human' : 'ai', stated_values: [] })), inputs: [], intensity: [], live: false }); return { hash: log.summary.state_hash, ticks: log.ticks.length, last_tick_hash: log.ticks[log.ticks.length - 1].state_hash }; },
  // re-runs a run log the way `crucible replay` does: from its seed, teams, scripted decisions, inputs and session block
  // as crucible-core's replay: the intensity curve is the one the run recorded, one point per tick (a heat lever is not in session.intensity)
  replay(log) { const req = { seed: log.seed, teams: log.teams, inputs: log.inputs || [], intensity: Array.isArray(log.ticks) && log.ticks.length ? log.ticks.map(t => [t.t, t.intensity]) : [], live: false }; if (log.decisions) req.decisions = log.decisions; if (log.session) req.session = log.session; if (log.until != null) req.until = log.until; const out = Engine.run(req); return { hash: out.summary.state_hash, ticks: out.ticks.length, hashes: out.ticks.map(t => t.state_hash) }; },
  version: () => Engine.version(),
  get timing() { return App.timing; },
};
boot().catch(e => { console.error(e); veil.show('Something failed while starting: ' + e.message, 'err'); });
