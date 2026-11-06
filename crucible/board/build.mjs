#!/usr/bin/env node
// Usage: node build.mjs [session-id] [out.html]
// Builds the live board: one self-contained page with the engine (WebAssembly),
// the island art, and the session's content inlined, so it runs with no network.
// Build the engine first:
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
const parishes = Object.values(concordia.PARISHES).map(p => ({ id: p.id, name: p.name, position: p.position }))
  .sort((a, b) => a.id.localeCompare(b.id));
const dilemmas = {};
for (const d of json('dilemmas.json').ALL_DILEMMAS) {
  dilemmas[d.id] = { title: d.title, setup: d.setup, personaId: d.personaId, phase: d.phase, options: d.options.map(o => ({ id: o.id, label: o.label, description: o.description })) };
}
const personas = {};
for (const [id, p] of Object.entries(json('personas.json').PERSONAS)) personas[id] = { name: p.name, title: p.title, signatureLine: p.signatureLine };
const values = {};
for (const v of json('values.json').VALUES_DECK) values[v.id] = { name: v.name, definition: v.definition };

const missing = [...session.valuesDeck.filter(v => !values[v]), ...Object.values(session.ask).flat().filter(d => !dilemmas[d])];
if (missing.length) { console.error('session names unknown ids: ' + missing.join(', ')); process.exit(1); }
if (Object.values(session.ask).some(a => a.length !== session.beats.length)) { console.error('every table needs one dilemma per beat'); process.exit(1); }

const wasmPath = join(root, 'target/wasm32-unknown-unknown/release/crucible_wasm.wasm');
const wasm = readFileSync(wasmPath).toString('base64');
const island = 'data:image/jpeg;base64,' + readFileSync(join(here, 'concordia-1400.jpg')).toString('base64');
const data = JSON.stringify({ session, parishes, dilemmas, personas, values }).replace(/<\//g, '<\\/');

let page = readFileSync(join(here, 'template.html'), 'utf8');
for (const [k, v] of [['__BOARD_DATA__', data], ['__WASM_B64__', wasm], ['__ISLAND_JPG__', island]]) {
  if (page.split(k).length !== 2) { console.error('template.html must contain exactly one ' + k); process.exit(1); }
  page = page.replace(k, () => v);
}
writeFileSync(resolve(outPath), page);
console.log(`wrote ${resolve(outPath)} (${(page.length / 1024 / 1024).toFixed(2)} MB, session ${session.id})`);
