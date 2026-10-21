#!/usr/bin/env node
// Usage: node build.mjs [session-id] [out.html]
// Builds the command board: one self-contained page with PixiJS (vendored), the
// engine (WebAssembly), the island art and the session's content inlined, so it
// runs from file:// with no network. Build the engine first:
//   cargo build -p crucible-wasm --target wasm32-unknown-unknown --release
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const [, , sessionId = 'nursing-60', outPath = join(here, 'index.html')] = process.argv;
const json = f => JSON.parse(readFileSync(join(root, 'content', f), 'utf8'));

const session = json(`sessions/${sessionId}.json`);
const concordia = json('concordia.json');
const timeline = json('timeline.json');

// Parishes: identity, population, role and the resource counts the mock layer
// turns into tokens. Positions are the engine's (content) coordinates; the
// board's territory geometry lives in template.html and is keyed by id.
const parishes = Object.values(concordia.PARISHES).map(p => ({
  id: p.id, name: p.name, population: p.population, role: p.supplyChainRole, description: p.description,
  position: p.position, resources: p.resources, assets: (p.keyAssets || []).map(a => a.name),
  dependencies: (p.dependencies || []).map(d => d.toLowerCase()), vulnerabilities: p.vulnerabilities || [],
})).sort((a, b) => a.id.localeCompare(b.id));

// Roads exactly as the engine reads them (connectivity.rs expands "ring").
const roads = {
  ring: concordia.RING_ROAD.segments.map(s => ({ from: s.from.toLowerCase(), to: s.to.toLowerCase(), km: s.km, normalMin: s.normalMin, degradedMin: s.degradedMin })),
  crater: concordia.CRATER_ROADS.segments.map(s => ({ from: s.from.toLowerCase(), to: s.to.toLowerCase(), km: s.km, normalMin: s.normalMin, stormPassable: s.stormPassable, floodRisk: s.floodRisk })),
};
const windows = timeline.HURRICANE_MIDAS.windows.map(w => ({ id: w.id, phase: w.phase, label: w.label, tMinusHours: w.tMinusHours, certainty: w.certaintyPercent }));
const personas = {};
for (const [id, p] of Object.entries(json('personas.json').PERSONAS)) personas[id] = { name: p.name, title: p.title };
const values = {};
for (const v of json('values.json').VALUES_DECK) values[v.id] = v.name;
const dilemmas = {};
for (const d of json('dilemmas.json').ALL_DILEMMAS) dilemmas[d.id] = { title: d.title, phase: d.phase, options: d.options.map(o => ({ id: o.id, label: o.label })) };

const ids = new Set(parishes.map(p => p.id));
for (const s of [...roads.ring, ...roads.crater]) for (const e of [s.from, s.to]) {
  if (e !== 'ring' && !ids.has(e)) { console.error(`road segment names unknown parish ${e}`); process.exit(1); }
}

const wasmPath = join(root, 'target/wasm32-unknown-unknown/release/crucible_wasm.wasm');
const wasm = readFileSync(wasmPath).toString('base64');
const island = 'data:image/jpeg;base64,' + readFileSync(join(root, 'board', 'concordia-1400.jpg')).toString('base64');
const pixiRaw = readFileSync(join(here, 'vendor', 'pixi.min.js'), 'utf8');
if (pixiRaw.includes('</script')) { console.error('vendor/pixi.min.js contains </script; refusing to inline it'); process.exit(1); }
const pixi = pixiRaw.replace(/^\/\/# sourceMappingURL=.*$/m, '');
const pixiVersion = (pixiRaw.match(/PixiJS - v([\d.]+)/) || [])[1] || 'unknown';

const data = JSON.stringify({ session, parishes, roads, windows, personas, values, dilemmas, build: { pixi: pixiVersion, session: session.id } }).replace(/<\//g, '<\\/');

let page = readFileSync(join(here, 'template.html'), 'utf8');
for (const [k, v] of [['__BOARD_DATA__', data], ['__WASM_B64__', wasm], ['__ISLAND_JPG__', island], ['__PIXI_JS__', pixi]]) {
  if (page.split(k).length !== 2) { console.error('template.html must contain exactly one ' + k); process.exit(1); }
  page = page.replace(k, () => v);
}
writeFileSync(resolve(outPath), page);
console.log(`wrote ${resolve(outPath)} (${(page.length / 1024 / 1024).toFixed(2)} MB, session ${session.id}, PixiJS ${pixiVersion})`);
