#!/usr/bin/env node
// Usage: node build.mjs <run.json> <out.html>
// Inlines a Crucible Engine run log into viewer/template.html.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , runPath, outPath] = process.argv;
if (!runPath || !outPath) {
  console.error("usage: node build.mjs <run.json> <out.html>");
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(resolve(here, "template.html"), "utf8");
const raw = readFileSync(runPath, "utf8");
let run;
try { run = JSON.parse(raw); } catch (e) { console.error(`invalid JSON in ${runPath}: ${e.message}`); process.exit(1); }
// Re-serialize compactly and neutralise "</" so a stray "</script>" inside a string cannot end the data block.
const json = JSON.stringify(run).replace(/<\//g, "<\\/");
const marker = "__CRUCIBLE_RUN_JSON__";
if (template.split(marker).length !== 2) { console.error("template must contain the placeholder exactly once"); process.exit(1); }
const out = template.replace(marker, () => json);
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} bytes, ${Array.isArray(run.ticks) ? run.ticks.length : 0} ticks)`);
