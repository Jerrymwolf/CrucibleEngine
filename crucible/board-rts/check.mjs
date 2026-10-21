#!/usr/bin/env node
// Headless check of the session bundle. It drives every role in Chromium (software GPU) through a whole
// rehearsal session hosted in the page (the DM over Loopback, the other windows over BroadcastChannel),
// clicks the screens the way a table would, saves a screenshot of each role at the key moments to
// screens/, and asserts what the room depends on: no console error anywhere, the engine decides and the
// clients only render (every client hash equals the host's, the export replays to the same hash, the
// golden run replays to its recorded hash), private things stay private, reduced motion is honoured.
// When a crucible-host binary is present it also plays one end-to-end session over WebSockets against it.
//
// Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node check.mjs [--speed 36] [--no-ws] [--ws-only] [--host <binary>]
// Playwright is imported from its absolute global path; nothing needs installing.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), flag = n => args.includes(n), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SPEED = Number(opt('--speed', 36)), WS_SPEED = Number(opt('--ws-speed', 30));
const PW = opt('--playwright', '/opt/node22/lib/node_modules/playwright');
const pagePath = join(here, 'index.html');
if (!existsSync(pagePath)) { console.error(`no ${pagePath}; run build.mjs first`); process.exit(1); }
const { chromium } = await import(pathToFileURL(join(PW, 'index.mjs')).href);
const screens = join(here, 'screens'); mkdirSync(screens, { recursive: true });
const golden = JSON.parse(readFileSync(join(here, '..', 'runs', 'seed-42.run.json'), 'utf8'));
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const failures = [], notes = [], metrics = { speed: SPEED, pages: {}, shots: [] };
const ok = (cond, what) => { if (cond) console.log(`  ok   ${what}`); else { failures.push(what); console.log(`  FAIL ${what}`); } return !!cond; };
const note = s => { notes.push(s); console.log(`  note ${s}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = s => console.log(s);

/* ---------- one static server: the bundle at every path, so /j/CODE works like the LAN host ---------- */
const page = readFileSync(pagePath);
const srv = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(page); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const browser = await chromium.launch({ args: GL_ARGS });
const errors = [];
function watch(p, label) {
  p.on('console', m => { if (m.type() === 'error') errors.push(`${label}: ${m.text().slice(0, 400)}`); });
  p.on('pageerror', e => errors.push(`${label}: pageerror ${String(e.message || e).slice(0, 400)}`));
  p.on('dialog', d => d.accept());
  p.setDefaultTimeout(60000);
}
async function open(ctx, url, { w = 1366, h = 1024, label = url, ready = true, reduced = false } = {}) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: w, height: h }); watch(p, label);
  if (reduced) await p.emulateMedia({ reducedMotion: 'reduce' });     // before the page loads: the bundle reads the media query once at start
  const t0 = Date.now();
  await p.goto(url);
  if (ready) await p.waitForFunction(() => window.__crucible && __crucible.world && __crucible.world.ready, null, { timeout: 90000, polling: 100 });
  await settle(p);
  metrics.pages[label] = { boot_ms: Date.now() - t0, stages: await p.evaluate(() => (window.__crucible && __crucible.timing) || null) };
  log(`  open ${label} (${Date.now() - t0} ms)`);
  return p;
}
// two frames and a beat: the first draw compiles the shaders (seconds on a software GPU); nothing is clicked before it
const settle = (p, ms = 250) => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => sleep(ms));
// a window behind another gets no animation frames in Chromium, so every screenshot and click brings its page to the front first
async function shot(p, name) { await p.bringToFront(); await settle(p, 250); const f = join(screens, `${name}.jpg`); await p.screenshot({ path: f, type: 'jpeg', quality: 88 }); metrics.shots.push(name); log(`  shot ${name}`); }  // jpeg: a full set is 4 MB, not 22
const state = p => p.evaluate(() => { const w = __crucible.world, c = __crucible.client; return { role: w.role, parish: w.parish, t: w.t, seq: w.seq, hash: w.hash, phase: w.clock && w.clock.phase, conn: w.conn, client_id: c && c.client_id, now: (document.getElementById('now') || {}).textContent || '' }; });
const intent = (p, kind, payload = {}) => p.evaluate(([k, pl]) => __crucible.client.intent(k, pl), [kind, payload]);
const lastResult = p => p.evaluate(() => __crucible.world.results.slice(-1)[0] || null);
const hostOf = (dm, fn) => dm.evaluate(fn);
async function click(p, sel, { nth = 0 } = {}) { await p.bringToFront(); const loc = p.locator(sel).nth(nth); await loc.waitFor({ state: 'visible', timeout: 20000 }); await loc.click({ timeout: 20000 }); }
async function clickIf(p, sel) { if (await p.locator(sel).count()) { await click(p, sel); return true; } return false; }
async function waitResult(p, pred, what, timeout = 20000) {
  try { await p.waitForFunction(pred, null, { timeout, polling: 100 }); return ok(true, what); } catch (e) { return ok(false, `${what} (timed out: ${await p.evaluate(() => JSON.stringify((__crucible.world.results || []).slice(-1)[0] || null))})`); }
}
const waitFor = (p, fn, arg, what, timeout = 120000) => p.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true, e => { ok(false, `${what}: ${String(e.message || e).split('\n')[0]}`); return false; });

/* ---------- the clicks a table makes ---------- */
async function lockValues(tbl, statement) {
  const vals = await tbl.evaluate(() => Array.from(document.querySelectorAll('[data-value]')).slice(0, 3).map(e => e.dataset.value));
  for (const v of vals) await click(tbl, `[data-value="${v}"]`);
  await tbl.fill('#stm', statement);
  await click(tbl, '[data-act="lock"]');
  return vals;
}
async function privacy(where, pages, briefs, debrief = false) {
  const snippets = Object.entries(briefs).map(([p, b]) => [p, b.slice(10, 50)]);
  for (const [label, p] of pages) {
    const r = await p.evaluate(sn => {
      const w = __crucible.world, text = document.body.innerText, priv = w.private;
      return { role: w.role, parish: w.parish, hasPrivate: !!priv, keys: Object.keys(priv || {}), leaked: sn.filter(([, s]) => text.includes(s)).map(([q]) => q), voteShapes: priv && priv.votes ? Object.values(priv.votes).map(v => typeof v) : [] };
    }, snippets);
    if (r.role === 'projector') { ok(!r.hasPrivate, `${where}: projector gets no private block`); if (!debrief) ok(r.leaked.length === 0, `${where}: projector shows no secret brief (${r.leaked.join(',') || 'none'})`); }
    if (r.role === 'phone') { ok(!r.keys.includes('secret_brief') && !r.keys.includes('briefs'), `${where}: ${label} private has no brief`); ok(r.leaked.length === 0, `${where}: ${label} shows no secret brief (${r.leaked.join(',') || 'none'})`); }
    if (r.role === 'console') { ok(r.leaked.every(q => q === r.parish), `${where}: ${label} shows no other table's brief (${r.leaked.join(',') || 'none'})`); ok(r.voteShapes.every(s => s === 'number'), `${where}: ${label} sees vote counts, not the split`); }
  }
}

/* =============================== A. rehearsal over the in-page host =============================== */
async function rehearsal() {
  log('\nA. rehearsal session: in-page host (Loopback for the DM, BroadcastChannel for the room)');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', acceptDownloads: true });
  const CODE = 'CHECK1';
  const dm = await open(ctx, `${BASE}/?role=dm&speed=${SPEED}&seed=42&code=${CODE}&new=1`, { w: 1600, h: 1000, label: 'dm' });
  const tokens = await hostOf(dm, () => __crucible.host.tokens);
  const briefs = await dm.evaluate(() => __crucible.DATA.session.secretBriefs || {});
  ok(/^[0-9a-f]{32}$/.test(tokens.tables.haven) && /^\d{4}$/.test(tokens.pin), 'host issued 32-hex table tokens and a 4-digit PIN');
  ok(await dm.evaluate(() => __crucible.App.transport.constructor.name === 'LoopbackTransport' && __crucible.world.role === 'dm'), 'DM console runs the host over Loopback');
  // the golden run replays in the page to its recorded hash (the client carries the same core as the CLI)
  const g = await dm.evaluate(ref => __crucible.replay(ref), golden);
  ok(g.hash === golden.summary.state_hash && g.ticks === golden.ticks.length, `runs/seed-42.run.json replays in the page to ${g.hash.slice(0, 12)} (${g.ticks} ticks)`);
  metrics.golden = { hash: g.hash, ticks: g.ticks };

  const proj = await open(ctx, `${BASE}/?role=projector&code=${CODE}#p=${tokens.projector}`, { w: 1920, h: 1080, label: 'projector' });
  const tbl = await open(ctx, `${BASE}/?role=table&parish=haven&code=${CODE}#t=${tokens.tables.haven}`, { w: 1366, h: 1024, label: 'table' });
  const ph = await open(ctx, `${BASE}/?role=phone&parish=haven&code=${CODE}#t=${tokens.tables.haven}`, { w: 430, h: 932, label: 'phone' });
  const lobby = await open(ctx, `${BASE}/?code=${CODE}`, { w: 430, h: 932, label: 'lobby-phone', ready: false });
  await lobby.waitForFunction(() => document.querySelector('#join-go'), null, { polling: 100 });
  await click(lobby, '[data-role="phone"]'); await click(lobby, '[data-parish="sterling"]'); await click(lobby, '#join-go');
  await lobby.waitForFunction(() => __crucible.world && __crucible.world.ready, null, { polling: 100 });
  const roles = await Promise.all([dm, proj, tbl, ph, lobby].map(state));
  ok(roles.map(r => r.role + ':' + r.parish).join(' ') === 'dm:null projector:null console:haven phone:haven phone:sterling', `five windows, five seats: ${roles.map(r => r.role + (r.parish ? '/' + r.parish : '')).join(', ')}`);
  ok(new Set(roles.map(r => r.client_id)).size === 5, 'each window is its own device to the host');
  ok(await proj.evaluate(() => __crucible.App.transport.constructor.name === 'ChannelTransport'), 'the room joins over BroadcastChannel');
  // hashes per tick, as the table sees them
  const hook = p => p.evaluate(() => { window.__h = []; __crucible.client.on('state', f => window.__h.push([f.t, f.hash])); });
  await hook(tbl); await hook(proj);

  log(' lobby: values, the private pick, the statements wall');
  await shot(proj, '01-projector-lobby');
  await click(tbl, '[data-act="secret"]');                     // the sealed brief opens on the console only
  await shot(tbl, '02-table-brief-values');
  await shot(ph, '03-phone-pick');
  await shot(dm, '04-dm-lobby');
  const picked = await ph.evaluate(() => Array.from(document.querySelectorAll('[data-value]')).slice(1, 4).map(e => e.dataset.value));
  for (const v of picked) await click(ph, `[data-value="${v}"]`);
  await click(ph, '[data-act="pick"]');
  await waitResult(ph, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'phone: private pick accepted');
  const statement = 'Haven keeps the port open and its people informed, whatever the cost in fuel.';
  const vals = await lockValues(tbl, statement);
  await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'table: Parish Values statement locked');
  await proj.waitForFunction(s => document.body.innerText.includes(s), statement, { timeout: 15000, polling: 100 }).catch(() => {});
  ok(await proj.evaluate(s => document.body.innerText.includes(s), statement), 'projector shows the statement as it locks');
  ok((await dm.evaluate(() => __crucible.world.teams.haven.stated_values)).join() === vals.join(), 'host recorded the three values in order');
  const bad = await intent(tbl, 'lock_values', { values: vals.slice(0, 2), statement: 'x' });
  ok(bad.status === 'rejected' && bad.reason === 'bad_values', `a wrong pick is rejected by the host (${bad.reason})`);
  await privacy('lobby', [['projector', proj], ['phone', ph], ['table', tbl]], briefs);

  log(' rehearsal: bots fill the other five tables, the island and the first quarter open');
  await click(dm, '[data-act="autopilot"]');
  await waitFor(dm, () => __crucible.host.phase === 'quarter_open', null, 'Q1 card opens');
  await shot(proj, '05-projector-quarter-card');
  await shot(tbl, '06-table-quarter-card');
  await waitFor(dm, () => __crucible.host.phase === 'running', null, 'Q1 clock starts');
  ok((await hostOf(dm, () => Object.keys(__crucible.host.bots).sort().join())) === 'gateway,heartland,keystone,sterling,summit', 'bots took the five empty tables, not Haven');
  await waitFor(dm, () => __crucible.host.horizon >= -4320 + 15 * 6, null, 'six ticks pass');
  await click(dm, '[data-act="next"]');                          // running → Pause is the next action (soft)
  await waitFor(dm, () => __crucible.host.phase === 'paused', null, 'DM pauses from the next-action button');
  await shot(tbl, '07-table-allocation');
  await shot(dm, '08-dm-running');
  // the allocation round on the console: send one token, keep the rest, declare the hidden stock
  const tok = await tbl.evaluate(() => { const b = document.querySelector('[data-act="alloc-open"]'); return b ? b.dataset.token : null; });
  if (ok(!!tok, 'console offers the allocation round before the lock')) {
    await click(tbl, `[data-act="alloc-open"][data-token="${tok}"]`);
    await click(tbl, '[data-act="alloc-to"][data-to="summit"]');
    await click(tbl, '[data-act="alloc-send"]');
    await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted' && r.applied_t > __crucible.world.t; }, 'allocation entry accepted for the next tick');
    for (let i = 0; i < 12 && await clickIf(tbl, '[data-act="alloc-keep"]'); i++) await sleep(150);
    ok(await tbl.evaluate(() => !document.querySelector('[data-act="alloc-keep"]')), 'every token has an entry (send or keep)');
    if (await clickIf(tbl, '[data-act="declare"]')) await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'hidden stock declared');
  }
  await click(dm, '[data-act="next"]');                          // paused → Resume
  await waitFor(dm, () => __crucible.host.phase === 'running', null, 'DM resumes');
  await waitFor(dm, () => __crucible.host.horizon > -3120, null, 'the allocation locks');
  const alloc = await hostOf(dm, () => __crucible.host.run.ticks.flatMap(t => t.events).filter(e => e.kind === 'allocation' && e.parish_id === 'haven').map(e => e.entry));
  ok(alloc.includes('send') && alloc.includes('keep'), `the core applied Haven's entries at the lock (${alloc.join(',')})`);
  const late = await intent(tbl, 'allocate', { token: tok || 'FUEL', to: 'summit', count: 1 });
  ok(late.status === 'rejected' && late.reason === 'after_lock', `an entry after the lock is rejected (${late.reason})`);

  log(' the first card: a deadline on the console, a private vote on the phone');
  await waitFor(tbl, () => ((__crucible.world.private || {}).pending || []).length > 0, null, "Haven's first card arrives");
  await intent(dm, 'pause');
  await waitFor(dm, () => __crucible.host.phase === 'paused', null, 'paused on the card');
  await shot(tbl, '09-table-card');
  await shot(ph, '10-phone-vote');
  await shot(proj, '11-projector-running');
  ok(await tbl.evaluate(() => !!document.querySelector('[data-deadline]') && /Decide/.test(document.getElementById('now').textContent)), 'console says what to do now and shows the deadline');
  await click(ph, '[data-opt]', { nth: 0 }); await click(ph, '[data-act="vote"]');
  await waitResult(ph, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted' && r.late === false; }, 'phone vote accepted, in time');
  await click(tbl, '[data-opt]', { nth: 1 }); await click(tbl, '[data-act="decide"]');
  await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'console decision accepted');
  const twice = await tbl.evaluate(() => { const c = __crucible.world.private.pending[0]; return __crucible.client.intent('decide', { dilemma_id: c.dilemma_id, option_id: c.options[0].id }); });
  ok(twice.status === 'accepted' || twice.reason === 'not_open', 'a second decision before the tick is queued or refused, never applied twice');
  await privacy('running', [['projector', proj], ['phone', ph], ['table', tbl]], briefs);
  await intent(dm, 'start');
  await waitFor(dm, () => __crucible.host.phase === 'running', null, 'resumed');
  await dm.evaluate(() => { __crucible.host.autopilot = false; });       // the bots keep playing; the DM opens the next quarter by hand
  await waitFor(tbl, () => { const c = Object.values(__crucible.world.cards).find(x => x.parish_id === 'haven'); return c && c.decision; }, null, 'the decision lands in the public log');
  const dec = await tbl.evaluate(() => Object.values(__crucible.world.cards).find(x => x.parish_id === 'haven').decision);
  ok(dec.decided_by !== 'storm', `the table's choice, not the storm's, was applied (${dec.option_id})`);
  // votes travel in the private block of state frames, so the DM's split and the console's count arrive with the next tick, not while paused
  if (await waitFor(dm, () => { const v = ((__crucible.world.private || {}).votes || {}).haven || {}; const d = Object.values(v)[0]; return !!d && typeof d.split === 'object' && d.count >= 1; }, null, 'DM sees the vote split with the next tick', 30000)) ok(true, 'DM sees the vote split with the next tick; the console only the count');

  log(' a reload keeps the seat');
  const before = (await state(tbl)).client_id;
  await tbl.reload(); await tbl.waitForFunction(() => window.__crucible && __crucible.world && __crucible.world.ready, null, { timeout: 90000, polling: 100 }); await settle(tbl); await hook(tbl);
  const after = await state(tbl);
  ok(after.role === 'console' && after.parish === 'haven' && after.client_id === before, 'the table console resumes as the same device after a reload');

  log(' quarter close, the DM opens the next card by hand');
  await waitFor(dm, () => __crucible.host.phase === 'quarter_close' && __crucible.host.quarter === 0, null, 'Q1 closes');
  await shot(proj, '12-projector-quarter-close');
  await shot(dm, '13-dm-quarter-close');
  await shot(tbl, '14-table-quarter-close');
  await privacy('quarter close', [['projector', proj], ['phone', ph], ['table', tbl]], briefs);
  await click(dm, '[data-act="next"]'); await clickIf(dm, '[data-act="confirm"]');
  await waitFor(dm, () => __crucible.host.phase === 'quarter_open' && __crucible.host.quarter === 1, null, 'Q2 card opens on confirm');
  await click(dm, '[data-act="next"]'); await clickIf(dm, '[data-act="confirm"]');
  await waitFor(dm, () => __crucible.host.phase === 'running', null, 'Q2 clock starts on confirm');
  await dm.evaluate(() => { __crucible.host.autopilot = true; });
  await click(dm, '[data-act="heat"]');
  await waitFor(dm, () => (__crucible.world.private || {}).intensity_offset === 2, null, 'heat lever: +2 on the curve');
  const fps0 = Date.now(); await sleep(2500); const fps = await proj.evaluate(() => __crucible.R.fps); metrics.projector_fps = fps; note(`projector frame rate while running on the software GPU: ${fps ? fps.toFixed(1) : 'n/a'} fps (${Date.now() - fps0} ms sample)`);

  log(' a mayday to answer');
  const gotCall = await waitFor(tbl, () => ((__crucible.world.private || {}).calls || []).some(c => c.role === 'holder'), null, 'Haven holds a call to answer (A3 from Gateway)', 180000);
  if (gotCall) {
    await intent(dm, 'pause'); await waitFor(dm, () => __crucible.host.phase === 'paused', null, 'paused on the mayday');
    await clickIf(tbl, '[data-tab^="call:"]');
    await shot(tbl, '15-table-mayday');
    await shot(proj, '16-projector-approach');
    await click(tbl, '[data-answer="grant"]'); await click(tbl, '[data-act="answer"]');
    await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'mayday answered (grant)');
    await intent(dm, 'start');
  }

  log(' landfall: the eye');
  await waitFor(dm, () => __crucible.host.quarter >= 2 && __crucible.host.horizon >= 0 && __crucible.host.phase === 'running', null, 'landfall reaches T+0', 240000);
  await intent(dm, 'pause'); await waitFor(dm, () => __crucible.host.phase === 'paused', null, 'paused in the eye');
  await shot(proj, '17-projector-eye');
  await shot(tbl, '18-table-landfall');
  await shot(ph, '19-phone-landfall');
  const fog = await tbl.evaluate(() => __crucible.world.fogged.slice());
  note(`fog at landfall as Haven sees it: ${fog.length ? fog.join(', ') + ' out of contact' : 'every parish still in contact'}`);
  await intent(dm, 'start');

  log(' recovery: credit line and the end of play');
  await waitFor(dm, () => __crucible.host.quarter === 3 && __crucible.host.phase === 'running', null, 'Q4 running', 240000);
  await waitFor(tbl, () => !!document.querySelector('[data-tab="recovery"]') || /credit/i.test(document.body.innerText), null, 'recovery moves offered');
  await intent(dm, 'pause'); await waitFor(dm, () => __crucible.host.phase === 'paused', null, 'paused in recovery');
  await clickIf(tbl, '[data-tab="recovery"]');
  await shot(tbl, '20-table-recovery');
  await click(tbl, '[data-act="credit-to"][data-to="summit"]');
  await tbl.fill('#credit-text', "Summit's crews kept the hill road open for our fuel while their own homes flooded.");
  await click(tbl, '[data-act="credit"]');
  await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'credit line accepted');
  await intent(dm, 'start');
  await waitFor(dm, () => __crucible.host.phase === 'debrief', null, 'the run ends and the autopilot opens the debrief', 300000);

  log(' debrief');
  await settle(proj, 400);
  await shot(proj, '21-projector-debrief-counters');
  await shot(tbl, '22-table-after-action');
  await shot(ph, '23-phone-commitment');
  await ph.fill('#commit', 'The next time a neighbour calls for fuel, I will answer before I count what is left.');
  await click(ph, '[data-act="commit"]');
  await waitResult(ph, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'commitment saved');
  await proj.bringToFront(); await proj.keyboard.press('ArrowRight'); await settle(proj, 300); await shot(proj, '24-projector-debrief-secret');
  const steps = await proj.evaluate(() => ProjectorUI.steps().length);
  for (let i = 1; i < steps - 3; i++) await proj.keyboard.press('ArrowRight');
  await settle(proj, 300); await shot(proj, '25-projector-debrief-mirror');
  ok(await proj.evaluate(() => /stated|enacted/i.test(document.body.innerText) && document.querySelectorAll('.gapbar').length > 0), 'the mirror shows stated against enacted for the six tables');
  await proj.keyboard.press('ArrowRight'); await settle(proj, 300); await shot(proj, '26-projector-debrief-credits');
  await proj.keyboard.press('ArrowRight'); await settle(proj, 300);
  await proj.evaluate(() => { __crucible.world.scrub = 0; __crucible.world.changed(); }); await settle(proj, 400);
  await shot(proj, '27-projector-debrief-replay');
  ok(await proj.evaluate(() => __crucible.world.viewT === 0 && !!document.getElementById('scrub')), 'the replay scrub drives the map back to landfall');
  const mirror = await dm.evaluate(() => __crucible.world.gapRows('haven'));
  ok(mirror.length === 3 && mirror.every(r => typeof r.enacted_score === 'number' && r.stated_rank >= 1), 'values gap computed for the three stated values');

  log(' export, determinism');
  const downloads = []; dm.on('download', d => downloads.push(d));
  await click(dm, '[data-act="next"]');                          // debrief → Export (soft)
  for (let i = 0; i < 100 && downloads.length < 3; i++) await sleep(100);
  ok(downloads.length === 3, `the export downloads three files (${downloads.map(d => d.suggestedFilename()).join(', ')})`);
  const runDl = downloads.find(d => /^run-/.test(d.suggestedFilename()));
  let run = null;
  if (runDl) { run = JSON.parse(readFileSync(await runDl.path(), 'utf8')); }
  const hostHash = await hostOf(dm, () => __crucible.host.run.ticks[__crucible.host.run.ticks.length - 1].state_hash);
  const hostTicks = await hostOf(dm, () => __crucible.host.run.ticks.map(t => [t.t, t.state_hash]));
  const final = await Promise.all([proj, tbl, ph, lobby].map(state));
  ok(final.every(f => f.hash === hostHash && f.t === 2880), `every client ends on the host's hash ${hostHash.slice(0, 12)} at T+48:00`);
  for (const [label, p] of [['table', tbl], ['projector', proj]]) {
    const seen = await p.evaluate(() => window.__h || []);
    const mismatch = seen.filter(([t, h]) => { const x = hostTicks.find(k => k[0] === t); return !x || x[1] !== h; });
    ok(seen.length > 100 && mismatch.length === 0, `${label}: ${seen.length} state frames carry the engine's hash for their tick`);
  }
  if (ok(!!run && run.version === '0.2' && Array.isArray(run.inputs) && run.inputs.length > 20, `run.json is log version ${run && run.version} with ${run && run.inputs && run.inputs.length} inputs`)) {
    const re = await proj.evaluate(r => __crucible.replay(r), run);
    ok(re.hash === run.summary.state_hash && re.hash === hostHash, `the export replays from seed, inputs and session to the same hash (${re.hash.slice(0, 12)})`);
    const storm = run.ticks.flatMap(t => t.events).filter(e => e.kind === 'decision' && e.decided_by === 'storm').length;
    const human = run.ticks.flatMap(t => t.events).filter(e => e.kind === 'decision' && e.decided_by !== 'storm').length;
    note(`decisions: ${human} by tables, ${storm} by the storm at a deadline; ${run.ticks.flatMap(t => t.events).filter(e => e.kind === 'aid_answer').length} aid answers, ${run.ticks.flatMap(t => t.events).filter(e => e.kind === 'aid_expired').length} expired`);
    metrics.run = { hash: re.hash, inputs: run.inputs.length, ticks: run.ticks.length, decisions_by_tables: human, decisions_by_storm: storm };
  }
  const hs = await hostOf(dm, () => ({ runs: __crucible.host.runs, ms: Math.round(__crucible.host.lastRunMs), errors: __crucible.host.errors, inputs: __crucible.host.inputs.length, log: __crucible.host.log.length }));
  ok(hs.errors.length === 0, `host determinism guard never fired (${hs.runs} core runs, last ${hs.ms} ms, ${hs.inputs} core inputs, ${hs.log} log entries)`);
  metrics.host = hs;

  log(' the printed pack');
  const pr = await open(ctx, `${BASE}/?role=print&code=${CODE}`, { w: 1000, h: 1500, label: 'print', ready: false });
  await pr.waitForFunction(() => document.querySelectorAll('.sheet').length > 10, null, { polling: 100 });
  const sheets = await pr.evaluate(() => ({ n: document.querySelectorAll('.sheet').length, qr: document.querySelectorAll('.qr canvas').length, bar: document.querySelector('.printbar') && document.querySelector('.printbar').textContent }));
  ok(sheets.n > 10 && sheets.qr >= 6, `printed pack: ${sheets.n} sheets, ${sheets.qr} QR codes carrying session ${CODE}`);
  await shot(pr, '28-print-pack');

  log(' reduced motion');
  // a second projector window in the same browser (another context could not reach the in-page host over BroadcastChannel)
  const rp = await open(ctx, `${BASE}/?role=projector&code=${CODE}#p=${tokens.projector}`, { w: 1366, h: 1024, label: 'projector-reduced', reduced: true });
  await settle(rp, 600);
  const rm = await rp.evaluate(() => ({ reduce: REDUCE, animations: document.getAnimations().length, maxFPS: __crucible.R.app.ticker.maxFPS }));
  ok(rm.reduce === true && rm.animations === 0 && rm.maxFPS <= 24, `prefers-reduced-motion honoured: no CSS animation running, map capped at ${rm.maxFPS} fps`);
  await ctx.close();
}

/* =============================== B. one session over WebSockets against crucible-host =============================== */
function findHost() {
  const given = opt('--host', process.env.CRUCIBLE_HOST);
  const candidates = [given, join(here, '..', 'target', 'release', 'crucible-host'), join(here, '..', 'target', 'debug', 'crucible-host')].filter(Boolean);
  return candidates.find(c => existsSync(c)) || null;
}
const freePort = () => new Promise(r => { const s = netServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => r(port)); }); });
async function websocket(bin) {
  log(`\nB. end-to-end over WebSockets: ${bin}`);
  const port = await freePort(), pub = `http://127.0.0.1:${port}`;
  const host = spawn(bin, ['--content', './content', '--session', 'parish-90', '--bundle', 'board-rts/index.html', '--no-store', '--no-qr', '--bind', '127.0.0.1', '--port', String(port), '--public-url', pub, '--speed', String(WS_SPEED), '--seed', '42'], { cwd: join(here, '..') });
  let out = ''; host.stdout.on('data', d => { out += d; }); host.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 300 && !/summit\s+http/.test(out); i++) await sleep(100);
  const code = (out.match(/session (\w{6})/) || [])[1], pin = (out.match(/PIN (\d{4})/) || [])[1], dmTok = (out.match(/#dm=([0-9a-f]{32})/) || [])[1], projTok = (out.match(/#p=([0-9a-f]{32})/) || [])[1];
  const tables = Object.fromEntries([...out.matchAll(/^\s+(\w+)\s+\S+#t=([0-9a-f]{32})/gm)].map(m => [m[1], m[2]]));
  if (!ok(!!code && !!pin && !!dmTok && Object.keys(tables).length === 6, `host up: session ${code}, six table links, DM PIN printed`)) { host.kill(); log(out.slice(0, 2000)); return; }
  const base = `${pub}/j/${code}`;
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1, acceptDownloads: true });
  try {
    const dm = await open(ctx, `${base}?role=dm&pin=${pin}#dm=${dmTok}`, { w: 1600, h: 1000, label: 'ws-dm' });
    ok(await dm.evaluate(() => __crucible.App.transport.constructor.name === 'WebSocketTransport' && __crucible.world.role === 'dm' && __crucible.world.session.code), 'DM console connects to /ws from the page the host serves');
    const proj = await open(ctx, `${base}#p=${projTok}`, { w: 1920, h: 1080, label: 'ws-projector' });
    const tbl = await open(ctx, `${base}?role=table&parish=haven#t=${tables.haven}`, { w: 1366, h: 1024, label: 'ws-table' });
    const ph = await open(ctx, `${base}`, { w: 430, h: 932, label: 'ws-phone', ready: false });
    await ph.waitForFunction(() => document.querySelector('#join-go'), null, { polling: 100 });
    await click(ph, '[data-role="phone"]'); await click(ph, '[data-parish="haven"]'); await click(ph, '#join-go');
    await ph.waitForFunction(() => __crucible.world && __crucible.world.ready, null, { polling: 100 });
    const bare = await open(ctx, `${base}#t=${tables.sterling}`, { w: 1366, h: 1024, label: 'ws-bare-link', ready: false });
    await bare.waitForFunction(() => document.querySelector('[data-pick="console"]'), null, { polling: 100 });
    await click(bare, '[data-pick="console"]');
    await bare.waitForFunction(() => __crucible.world && __crucible.world.ready, null, { timeout: 90000, polling: 100 }); await settle(bare);
    const st = await Promise.all([dm, proj, tbl, ph, bare].map(state));
    ok(st.map(s => s.role + ':' + s.parish).join(' ') === 'dm:null projector:null console:haven phone:haven console:sterling', `seats over WebSockets: ${st.map(s => s.role + (s.parish ? '/' + s.parish : '')).join(', ')} (token link, lobby join, bare link with the role question)`);
    ok(st.every(s => s.phase === 'lobby' && s.t === -4320), 'everyone starts in the lobby at T-72:00');

    await lockValues(tbl, 'Haven keeps the port open and its people informed.');
    await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'Haven locks its statement over WebSockets');
    await lockValues(bare, 'Sterling banks on the hill and shares the view.');
    await waitResult(bare, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'Sterling locks from the bare link');
    // the DM enters for a table through the dialog, and for the rest with the same intent
    await click(dm, '[data-act="enter"][data-parish="gateway"]');
    const dv = await dm.evaluate(() => Array.from(document.querySelectorAll('#dialog [data-value]')).slice(2, 5).map(e => e.dataset.value));
    for (const v of dv) await click(dm, `#dialog [data-value="${v}"]`);
    await click(dm, '[data-act="enter-lock"]');
    await waitResult(dm, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'DM enters Gateway\'s values through the dialog');
    await clickIf(dm, '[data-act="close"]');
    for (const p of ['heartland', 'keystone', 'summit']) { const r = await intent(dm, 'lock_values', { parish_id: p, values: ['safety', 'duty', 'candor'], statement: `${p} statement entered by the DM.` }); ok(r.status === 'accepted', `DM enters ${p}'s values`); }
    const dmNext = async what => { await click(dm, '[data-act="next"]'); await clickIf(dm, '[data-act="confirm"]'); return waitFor(dm, w => __crucible.world.clock.phase === w, what, `DM: ${what}`); };
    await dmNext('island'); await dmNext('quarter_open'); await dmNext('running');
    // crucible-host sends the room nothing when a statement locks in the lobby: the wall and the DM learn of it with Q1's first state frame (README, protocol note 2)
    await proj.waitForFunction(() => Object.values(__crucible.world.teams).filter(t => t.stated_values.length === 3).length === 6, null, { timeout: 15000, polling: 100 });
    ok(true, 'projector shows six statements once the clock has run a tick');
    // the DM pauses on Haven's first card, as a DM would for a table: at --ws-speed the card is open for seconds, not hours
    const gotCard = await waitFor(tbl, () => ((__crucible.world.private || {}).pending || []).length > 0, null, "Haven's first card over WebSockets", 120000);
    await intent(dm, 'pause'); await waitFor(dm, () => __crucible.world.clock.phase === 'paused', null, 'DM pauses over WebSockets');
    await shot(proj, 'ws-01-projector-q1');
    await shot(tbl, 'ws-02-table-card');
    if (gotCard) {
      await click(ph, '[data-opt]', { nth: 0 }); await click(ph, '[data-act="vote"]');
      await waitResult(ph, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'phone vote accepted by crucible-host');
      await click(tbl, '[data-opt]', { nth: 1 }); await click(tbl, '[data-act="decide"]');
      await waitResult(tbl, () => { const r = __crucible.world.results.slice(-1)[0]; return r && r.status === 'accepted'; }, 'console decision accepted by crucible-host');
    }
    const before = (await state(tbl)).client_id;                 // the clock stays paused through the reload and the first skip
    await tbl.reload(); await tbl.waitForFunction(() => window.__crucible && __crucible.world && __crucible.world.ready, null, { timeout: 90000, polling: 100 }); await settle(tbl);
    const after = await state(tbl);
    ok(after.role === 'console' && after.parish === 'haven' && after.client_id === before, 'reload resumes the same seat with client_id and resume_token');
    // the DM skips to each quarter's end; cards left open expire and the storm decides
    for (let q = 0; q < 4; q++) {
      if (q > 0) { await dmNext('quarter_open'); await dmNext('running'); }
      if ((await state(dm)).phase !== 'quarter_close') await click(dm, '[data-act="skip"]');   // skip_ahead is allowed while running, paused or on the card
      await waitFor(dm, () => __crucible.world.clock.phase === 'quarter_close', null, `Q${q + 1} skipped to its close`);
    }
    await shot(proj, 'ws-03-projector-last-close');
    await dmNext('debrief');
    await settle(proj, 400); await shot(proj, 'ws-04-projector-debrief');
    await shot(dm, 'ws-05-dm-debrief');
    const downloads = []; dm.on('download', d => downloads.push(d));
    await click(dm, '[data-act="next"]');                        // export
    for (let i = 0; i < 100 && downloads.length < 1; i++) await sleep(100);
    const health = await fetch(`${pub}/health`).then(r => r.json());
    const exported = await fetch(`${pub}/export?dm=${dmTok}`).then(r => r.text());
    const run = JSON.parse(exported);
    const fin = await Promise.all([dm, proj, tbl, ph, bare].map(state));
    ok(fin.every(f => f.hash === health.hash && f.t === 2880 && f.phase === 'debrief'), `five clients end on the host's hash ${String(health.hash).slice(0, 12)} in the debrief`);
    const re = await proj.evaluate(r => __crucible.replay(r), run);
    ok(re.hash === run.summary.state_hash && re.hash === health.hash, `crucible-host's export replays in the page to the host's hash (${re.hash.slice(0, 12)}, ${run.inputs.length} inputs)`);
    ok(downloads.length === 1 && /^run-/.test(downloads[0].suggestedFilename()), 'the DM console downloads run.json from /export after the export intent');
    const forbidden = await fetch(`${pub}/export?dm=nope`).then(r => r.status);
    ok(forbidden === 403, '/export without the DM token is refused');
    metrics.ws = { code, hash: health.hash, inputs: run.inputs.length, clients: health.clients };
  } finally {
    await ctx.close(); host.kill();
  }
}

try {
  if (!flag('--ws-only')) await rehearsal();
  if (!flag('--no-ws')) { const bin = findHost(); if (bin) await websocket(bin); else if (flag('--ws')) failures.push('no crucible-host binary (cargo build -p crucible-host)'); else note('no crucible-host binary found; the WebSocket session was skipped (cargo build -p crucible-host, or --host <binary>)'); }
} catch (e) {
  failures.push(`crashed: ${e.stack || e}`);
} finally {
  await browser.close(); srv.close();
}
for (const f of readdirSync(screens)) if (/^(prep|landfall|recovery|table-keystone)\.png$/.test(f)) unlinkSync(join(screens, f)); // the mock-era screenshots
ok(errors.length === 0, `no console error or page error in any window${errors.length ? ':\n    ' + [...new Set(errors)].slice(0, 20).join('\n    ') : ''}`);
metrics.errors = [...new Set(errors)]; metrics.failures = failures; metrics.notes = notes; metrics.checked = new Date().toISOString();
writeFileSync(join(screens, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
log(`\n${metrics.shots.length} screenshots in ${screens}; metrics.json written`);
if (failures.length) { console.error(`\n${failures.length} failure(s):\n - ${failures.join('\n - ')}`); process.exit(1); }
console.log('\nall checks passed');
