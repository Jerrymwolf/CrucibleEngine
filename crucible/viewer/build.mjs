#!/usr/bin/env node
// Usage: node build.mjs <run.json> <out.html>
// Reads template.html next to this script, inlines the run log JSON into the
// <script id="run-data"> placeholder, and writes the finished page.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , runPath, outPath] = process.argv;
if (!runPath || !outPath) {
  console.error('usage: node build.mjs <run.json> <out.html>');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, 'template.html'), 'utf8');
const PLACEHOLDER = '__CRUCIBLE_RUN_JSON__';
if (template.split(PLACEHOLDER).length !== 2) {
  console.error('template.html must contain exactly one ' + PLACEHOLDER);
  process.exit(1);
}
const raw = readFileSync(resolve(runPath), 'utf8');
let run;
try { run = JSON.parse(raw); } catch (e) { console.error('invalid JSON in ' + runPath + ': ' + e.message); process.exit(1); }
// Re-serialize compactly, then neutralise any "</" so a stray </script> in
// narrative text cannot terminate the data block. "<\/" is still valid JSON.
const json = JSON.stringify(run).replace(/<\//g, '<\\/');
const out = template.replace(PLACEHOLDER, () => json);
writeFileSync(resolve(outPath), out);
const ticks = Array.isArray(run.ticks) ? run.ticks.length : 0;
console.log(`wrote ${resolve(outPath)} (${(out.length / 1024).toFixed(1)} KB, ${ticks} ticks, seed ${run.seed})`);
