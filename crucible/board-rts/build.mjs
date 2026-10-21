#!/usr/bin/env node
// Usage: node build.mjs [session-id] [out.html]
// Builds the command board: one self-contained page with PixiJS (vendored), the engine (WebAssembly),
// the island art, the session's content and the client modules in src/ inlined, so it runs from file://
// or from the host with no network. Build the engine first:
//   cargo build -p crucible-wasm --target wasm32-unknown-unknown --release
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const [, , sessionArg = 'parish-90', outPath = join(here, 'index.html')] = process.argv;
const json = f => JSON.parse(readFileSync(join(root, 'content', f), 'utf8'));

// The RTS session needs the parish-90 profile shape (roster, quarters, deck, secret briefs). An older profile
// id (CI still passes nursing-60) builds the same page with parish-90 as the session, and says so.
let session = json(`sessions/${sessionArg}.json`);
if (!session.quarters || !session.roster) { console.error(`note: ${sessionArg} has no quarters/roster; building with parish-90`); session = json('sessions/parish-90.json'); }
const concordia = json('concordia.json');
const timeline = json('timeline.json');
const routesFile = json('routes.json');
const resources = json('resources.json');
const aid = json('aid.json');
const residents = json('residents.json');
const personasFile = json('personas.json');
const valuesFile = json('values.json');
const dilemmasFile = json('dilemmas.json');

const parishes = Object.values(concordia.PARISHES).map(p => ({
  id: p.id, name: p.name, population: p.population, role: p.supplyChainRole, description: p.description,
  position: p.position, sheet: p.sheet || {}, assets: (p.keyAssets || []).map(a => a.name),
  dependencies: (p.dependencies || []).map(d => d.toLowerCase()), vulnerabilities: p.vulnerabilities || [], valuesTested: p.valuesTested || [],
})).sort((a, b) => a.id.localeCompare(b.id));
const ids = new Set(parishes.map(p => p.id));

// Routes exactly as the engine reads them (routes.json), with the cut schedule the client shows as a forecast.
const routes = routesFile.ROUTES.map(r => ({ id: r.id, name: r.name, mode: r.mode, from: r.from, to: r.to, travelMin: r.travelMin, degradedMin: r.degradedMin ?? null, cutT: r.cutT ?? null, reopenT: r.reopenT ?? null, eyeOpen: !!r.eyeOpen, narrativeCut: r.narrativeCut || '', narrativeReopen: r.narrativeReopen || '' }));
for (const r of routes) for (const e of [r.from, r.to]) if (e !== 'mainland' && !ids.has(e)) { console.error(`route ${r.id} names unknown parish ${e}`); process.exit(1); }

const windows = timeline.HURRICANE_MIDAS.windows.map(w => ({ id: w.id, phase: w.phase, label: w.label, tMinusHours: w.tMinusHours, certainty: w.certaintyPercent ?? null, weather: w.weather || null }));
const personas = {};
for (const [id, p] of Object.entries(personasFile.PERSONAS)) personas[id] = { id, name: p.name, title: p.title, parish: p.parishId || null, line: p.signatureLine || '' };
const valueDefs = {};
for (const v of valuesFile.VALUES_DECK) valueDefs[v.id] = { id: v.id, name: v.name, definition: v.definition };
for (const v of session.valuesDeck || []) if (!valueDefs[v]) { console.error(`deck value ${v} is not in values.json`); process.exit(1); }
const dilemmas = {};
for (const d of dilemmasFile.ALL_DILEMMAS) {
  dilemmas[d.id] = {
    id: d.id, title: d.title, phase: d.phase, quarter: d.quarter || null, parish: d.parishId || null, setup: d.setup || '',
    personaId: d.personaId || null, personaLine: d.personaLine || '', defaultOptionId: d.defaultOptionId || null, valuesTested: d.valuesTested || [],
    later: d.later || '', debrief: d.debrief || '', cards: d.cards || [],
    options: d.options.map(o => ({ id: o.id, label: o.label, description: o.description || '', board: o.board || (o.consequenceSketch || {}).immediate || '' })),
  };
}
for (const [p, asks] of Object.entries(session.ask || {})) for (const a of asks) if (!dilemmas[a.dilemmaId]) { console.error(`schedule for ${p} names unknown dilemma ${a.dilemmaId}`); process.exit(1); }
const tokens = resources.TOKENS, stockpiles = resources.STOCKPILES, hidden = {};
for (const [p, h] of Object.entries(resources.HIDDEN)) hidden[p] = Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'note'));
const needs = resources.NEEDS;
const calls = aid.CALLS.map(c => ({
  id: c.id, quarter: c.quarter, asker: c.asker, holder: c.holder, token: c.token, count: c.count, route: c.route, windowClosesT: c.windowClosesT ?? null,
  personaId: c.personaId, line: c.line, ask: c.ask, grantingCosts: c.grantingCosts || '', refusingCosts: c.refusingCosts || '',
  answers: Object.fromEntries(Object.entries(c.answers).map(([k, v]) => [k, { label: v.label, count: v.count ?? null }])), silenceAnswer: c.silenceAnswer || 'refuse',
}));
for (const c of calls) for (const e of [c.asker, c.holder]) if (!ids.has(e)) { console.error(`call ${c.id} names unknown parish ${e}`); process.exit(1); }
const residentCards = residents.CARDS.map(c => ({ id: c.id, parish: c.parishId, name: c.name, line: c.line, text: c.text, groupId: c.groupId, decidedBy: c.decidedBy || [], hazardQuarter: c.hazardQuarter }));
const residentGroups = residents.GROUPS.map(g => ({ id: g.id, parish: g.parishId, name: g.name, size: g.size }));
const population = parishes.reduce((a, p) => a + (p.population || 0), 0);

const wasmPath = join(root, 'target/wasm32-unknown-unknown/release/crucible_wasm.wasm');
const wasmBytes = readFileSync(wasmPath);
const wasm = wasmBytes.toString('base64');
const island = 'data:image/jpeg;base64,' + readFileSync(join(root, 'board', 'concordia-1400.jpg')).toString('base64');
const pixiRaw = readFileSync(join(here, 'vendor', 'pixi.min.js'), 'utf8');
if (pixiRaw.includes('</script')) { console.error('vendor/pixi.min.js contains </script; refusing to inline it'); process.exit(1); }
const pixi = pixiRaw.replace(/^\/\/# sourceMappingURL=.*$/m, '');
const pixiVersion = (pixiRaw.match(/PixiJS - v([\d.]+)/) || [])[1] || 'unknown';

// Client modules, in file order (00-core first, 90-app last). One script, no modules, so file:// works.
const srcDir = join(here, 'src');
const srcFiles = readdirSync(srcDir).filter(f => f.endsWith('.js')).sort();
let app = '';
for (const f of srcFiles) {
  const text = readFileSync(join(srcDir, f), 'utf8');
  if (text.includes('</script')) { console.error(`${f} contains </script; refusing to inline it`); process.exit(1); }
  app += `\n/* ===== src/${f} ===== */\n${text}\n`;
}
// The bundle hash names this exact client build (code, engine, content), so a host can refuse a stale page.
const bundleHash = createHash('sha256').update(app).update(wasmBytes).update(JSON.stringify({ session, routes, dilemmas, calls })).digest('hex').slice(0, 16);

const data = JSON.stringify({
  session, parishes, population, routes, windows, personas, valueDefs, dilemmas, tokens, stockpiles, hidden, needs, calls, residentCards, residentGroups,
  build: { pixi: pixiVersion, session: session.id, bundle_hash: bundleHash, built: new Date().toISOString().slice(0, 10) },
}).replace(/<\//g, '<\\/');

let page = readFileSync(join(here, 'template.html'), 'utf8');
for (const [k, v] of [['__BOARD_DATA__', data], ['__WASM_B64__', wasm], ['__ISLAND_JPG__', island], ['__PIXI_JS__', pixi], ['__APP_JS__', app]]) {
  if (page.split(k).length !== 2) { console.error('template.html must contain exactly one ' + k); process.exit(1); }
  page = page.replace(k, () => v);
}
writeFileSync(resolve(outPath), page);
console.log(`wrote ${resolve(outPath)} (${(page.length / 1024 / 1024).toFixed(2)} MB, session ${session.id}, PixiJS ${pixiVersion}, ${srcFiles.length} modules, bundle ${bundleHash})`);
