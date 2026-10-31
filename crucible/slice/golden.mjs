// Writes crucible/godot/keystone_slice/tests/golden.json: scripted games resolved by the JS reference engine.
// The Godot test (tests/run_tests.gd) replays the same inputs and must reach the same numbers each turn.
// It also copies the content JSON into the Godot project, so the two engines always read the same rules.
// Run: node crucible/slice/golden.mjs
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const E = require("./engine.js");
const here = new URL(".", import.meta.url);
const C = JSON.parse(readFileSync(new URL("../content/keystone_slice.json", here)));
C.values = Object.fromEntries(JSON.parse(readFileSync(new URL("../content/values.json", here))).VALUES_DECK.map((v) => [v.id, [v.name, v.quadrant]]));

const stances = {
  community: { ranks: ["safety", "loyalty", "fairness"] },
  meridian: { ranks: ["excellence", "duty", "accountability"] },
};
const plans = [
  // seed, per-turn orders, votes, lends, tower, promises
  { seed: 42, turns: [
    { orders: { bus1: { task: "evac", site: "low_ward", dest: "st_brendans" }, bus2: { task: "evac", site: "low_ward", dest: "st_brendans" }, boat: { task: "evac", site: "low_ward", dest: "st_brendans" }, vcrew: { task: "sandbag", site: "low_ward" }, gen: { task: "power", site: "plant" }, pcrew: { task: "run", site: "plant" } },
      votes: { meridian: 0 }, promises: [{ by: "meridian", to: "community", kind: "lend", unit: "shuttle", site: null, text: "Meridian will lend Plant shuttle to Community next turn." }], confirms: [0] },
    { orders: { bus1: { task: "evac", site: "tech_housing", dest: "heartland" }, shuttle: { task: "evac", site: "tech_housing", dest: "st_brendans" }, gen: { task: "power", site: "st_brendans" }, pcrew: { task: "run", site: "plant" } },
      lends: { shuttle: true }, towerOpen: true, votes: { meridian: 1, community: 2 } },
    { orders: { bus1: { task: "evac", site: "tech_housing", dest: "tech_tower" }, bus2: { task: "evac", site: "tech_housing", dest: "tech_tower" }, boat: { task: "evac", site: "low_ward", dest: "st_brendans" }, pcrew: { task: "sandbag", site: "plant" } },
      votes: { community: 0 } },
  ] },
  { seed: 7, turns: [ { orders: {}, votes: {} }, { orders: { pcrew: { task: "run" } }, votes: {} }, { orders: {}, votes: { community: 1 } } ] },
  { seed: 4217, turns: [
    { orders: { bus1: { task: "evac", site: "low_ward", dest: "heartland" }, shuttle: { task: "evac", site: "low_ward", dest: "heartland" }, vcrew: { task: "sandbag", site: "low_ward" } }, votes: { meridian: 2 } },
    { orders: { boat: { task: "evac", site: "low_ward", dest: "st_brendans" }, gen: { task: "power", site: "plant" }, vcrew: { task: "sandbag", site: "plant" } }, votes: { meridian: 0 } },
    { orders: { gen: { task: "power", site: "tech_housing" }, pcrew: { task: "run" } }, votes: { community: 2 } },
  ] },
];

const snap = (s) => ({ stock: s.stock, meters: s.meters, lost: s.lost, rescued: s.rescued, shelter: s.shelter, towerOpen: s.towerOpen,
  sites: Object.fromEntries(Object.entries(s.sites).map(([k, v]) => [k, v])), residents: s.residents, promises: s.promises.map((p) => p.status),
  history: s.history, hash: E.hash(s) });

const games = plans.map((p) => {
  let s = E.newGame(C, { seed: p.seed });
  const turns = [];
  for (const t of p.turns) {
    const d = E.fallbackDilemma(C, s, stances).dilemma;
    const input = { orders: t.orders, lends: t.lends || {}, towerOpen: !!t.towerOpen, votes: t.votes, promises: t.promises || [], confirms: t.confirms || [] };
    s = E.resolveTurn(C, s, { ...input, dilemma: d }).state;
    turns.push({ input, expect: snap(s) });
  }
  return { seed: p.seed, stances, turns, standings: E.standings(C, s), rng_first: [E.rngFor(p.seed, 1)(), E.rngFor(p.seed, 2)()] };
});
for (const f of ["keystone_slice.json", "values.json"]) copyFileSync(new URL(`../content/${f}`, here), new URL(`../godot/keystone_slice/data/${f}`, here));
const out = new URL("../godot/keystone_slice/tests/golden.json", here);
writeFileSync(out, JSON.stringify({ about: "Made by crucible/slice/golden.mjs from the JS reference engine. Do not edit by hand.", games }, null, 1));
console.log("wrote golden.json:", games.map((g) => `seed ${g.seed} -> ${JSON.stringify(g.standings)}`).join("; "));
