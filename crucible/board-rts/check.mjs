#!/usr/bin/env node
// Headless check of the built board: loads index.html from file://, fails on any console error,
// saves screenshots of three moments (preparation, landfall, recovery) plus one table view to
// screens/, and measures frame time while the storm plays.
// Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node check.mjs [index.html] [playwright-dir]
// Playwright is imported from an absolute path so nothing needs installing here.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [, , pageArg = join(here, 'index.html'), pwDir = '/opt/node22/lib/node_modules/playwright'] = process.argv;
const page = resolve(pageArg);
if (!existsSync(page)) { console.error(`no ${page}; run build.mjs first`); process.exit(1); }
const { chromium } = await import(pathToFileURL(join(pwDir, 'index.mjs')).href);
const screens = join(here, 'screens'); mkdirSync(screens, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const errors = [];
async function open(query) {
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  p.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  await p.goto(pathToFileURL(page).href + query, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__crucible && window.__crucible.ready !== undefined, null, { timeout: 60000 });
  const boot = await p.evaluate(() => ({ ready: window.__crucible.ready, error: window.__crucible.error, seed: window.__crucible.seed, ticks: window.__crucible.ticks, hash: window.__crucible.stateHash }));
  if (!boot.ready) throw new Error('board did not start: ' + boot.error);
  console.log(`booted: seed ${boot.seed}, ${boot.ticks} ticks, state ${String(boot.hash).slice(0, 12)}`);
  return p;
}
async function moment(p, name, t, settleMs = 900) {
  // jump a little earlier and play through the moment so pings and convoys are live, like in the room
  await p.evaluate(({ t }) => { const c = window.__crucible; c.pause(); c.setSpeed(8); c.jumpTo(t - 90); c.play(); }, { t });
  await p.waitForTimeout(settleMs);
  await p.evaluate(() => window.__crucible.pause());
  await p.waitForTimeout(250);
  const file = join(screens, `${name}.png`);
  await p.screenshot({ path: file });
  const state = await p.evaluate(() => { const w = window.__crucible.world; return { t: w.cur.t, quarter: w.cur.quarter, wind: Math.round(w.cur.weather.wind_kts), isolated: Object.entries(w.cur.parishes).filter(([, v]) => v.isolated).map(([k]) => k), convoys: w.convoys.size, feed: w.feed.length, cut: Object.entries(w.cur.routes).filter(([, v]) => !v).map(([k]) => k) }; });
  console.log(`${name}: ${file}  ${JSON.stringify(state)}`);
}

try {
  const p = await open('?view=facilitator');
  await p.evaluate(() => window.__crucible.select('keystone'));
  await moment(p, 'prep', -3405);
  await p.evaluate(() => window.__crucible.select(null));
  await moment(p, 'landfall', 0);
  await moment(p, 'recovery', 1245);
  // frame time while the storm plays at 1x over the island, after a warm-up, measured from wall-clock timestamps
  const gl = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : (g ? g.getParameter(g.RENDERER) : 'none'); });
  async function measure(pg, label, ms = 2500) {
    await pg.evaluate(() => { const c = window.__crucible; c.setSpeed(2); c.jumpTo(-300); c.play(); });
    await pg.waitForTimeout(700);
    const s = await pg.evaluate(ms => window.__crucible.measureFrames(ms), ms);
    await pg.evaluate(() => window.__crucible.pause());
    console.log(`frames (${label}): ${JSON.stringify(s)}`);
    return s;
  }
  const stats = await measure(p, 'full');
  const hudHidden = await p.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); return true; }) && await measure(p, 'hud hidden');
  await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })));
  const lite = await open('?view=facilitator&lite=1&aa=0');
  const liteStats = await measure(lite, 'lite, no msaa');
  await lite.close();
  console.log(`renderer: ${gl}`);
  // a table's own client: its parish lit, parishes it has lost contact with greyed with a last-report stamp,
  // its own resources. At T-3:20 Gateway's communications have failed (seed 42) and the rest still talk.
  const t = await open('?view=keystone&t=-200');
  await t.waitForTimeout(600);
  await t.screenshot({ path: join(screens, 'table-keystone.png') });
  const fog = await t.evaluate(() => { const w = window.__crucible.world; return Object.fromEntries(Object.keys(w.cur.parishes).filter(p => w.fogged(p)).map(p => [p, w.lastSeen[p] ? 'last report ' + w.lastSeen[p].t : 'no contact'])); });
  console.log(`table view: ${join(screens, 'table-keystone.png')}  fogged: ${JSON.stringify(fog)}`);
  // the seam: an external host can drive the board with the same messages
  const seam = await t.evaluate(() => { const c = window.__crucible; c.external(true); const s = c.session.source.snapshot(300); c.ingest({ type: 'snapshot', snapshot: s }); c.ingest({ type: 'event', event: { kind: 'aid_call', t: s.t, parish_id: 'keystone', resource: 'generators', system: 'power', level: 12, holder: 'heartland', mock: true } }); return { t: c.world.cur.t, feedTop: c.world.feed[0] && c.world.feed[0].text }; });
  console.log(`ingest seam: ${JSON.stringify(seam)}`);
  const size = statSync(page).size;
  writeFileSync(join(screens, 'metrics.json'), JSON.stringify({ page_bytes: size, viewport: '1920x1080', renderer: gl, frames: { full: stats, hud_hidden: hudHidden, lite_no_msaa: liteStats } }, null, 2) + '\n');
  console.log(`page size: ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (errors.length) { console.error('console errors:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('no console errors');
} catch (e) {
  console.error(e); process.exitCode = 1;
  if (errors.length) console.error('console errors:\n' + errors.join('\n'));
} finally {
  await browser.close();
}
