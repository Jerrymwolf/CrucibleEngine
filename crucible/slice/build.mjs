// Builds the single-file playable slice: template + content JSON + engine.
// Run: node crucible/slice/build.mjs  ->  crucible/slice/keystone-slice.html (publish this file as the Artifact)
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, here), "utf8");
const content = JSON.parse(read("../content/keystone_slice.json"));
const values = Object.fromEntries(JSON.parse(read("../content/values.json")).VALUES_DECK.map((v) => [v.id, [v.name, v.quadrant]]));
const html = read("template.html")
  .replace("/*CONTENT*/null", () => JSON.stringify(content))
  .replace("/*VALUES*/null", () => JSON.stringify(values))
  .replace("/*ENGINE*/", () => read("engine.js"));
writeFileSync(new URL("keystone-slice.html", here), html);
console.log("wrote keystone-slice.html", (html.length / 1024).toFixed(0) + " KB");
