// Balance ledger for the Keystone slice: seeded bot games, no AI.
// Rule to hold: a team that does nothing never finishes ahead of a team that acts.
// Run: node crucible/slice/sim.mjs [games]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const E = require("./engine.js");
const here = new URL(".", import.meta.url);
const C = JSON.parse(readFileSync(new URL("../content/keystone_slice.json", here)));
const V = JSON.parse(readFileSync(new URL("../content/values.json", here))).VALUES_DECK;
C.values = Object.fromEntries(V.map((v) => [v.id, [v.name, v.quadrant]]));

const stances = {
  community: { ranks: ["safety", "loyalty", "fairness"] },
  meridian: { ranks: ["excellence", "duty", "accountability"] },
};

const POLICY = {
  community: {
    nothing: () => ({}),
    careful: (s) => {
      const lwDry = !s.sites.low_ward.flooded, o = {};
      const src = lwDry && s.sites.low_ward.home.vuln ? "low_ward" : "tech_housing";
      const roomSB = C.sites.st_brendans.capacity - s.shelter.st_brendans.vuln - s.shelter.st_brendans.able;
      o.bus1 = { task: "evac", site: src, dest: roomSB >= 40 ? "st_brendans" : "heartland" };
      o.bus2 = { task: "evac", site: src, dest: roomSB >= 80 ? "st_brendans" : "heartland" };
      o.boat = { task: "evac", site: "low_ward", dest: "st_brendans" };
      if (lwDry) o.vcrew = { task: "sandbag", site: "low_ward" };
      return o;
    },
  },
  meridian: {
    nothing: () => ({ pcrew: { task: "run" } }),
    careful: (s) => ({ pcrew: { task: "run" }, gen: { task: "power", site: "plant" },
      shuttle: { task: "evac", site: s.sites.low_ward.flooded ? "tech_housing" : "low_ward",
        dest: C.sites.st_brendans.capacity - s.shelter.st_brendans.vuln - s.shelter.st_brendans.able >= 40 ? "st_brendans" : "heartland" } }),
  },
};

function play(seed, cp, mp, pick) {
  let s = E.newGame(C, { seed });
  while (!s.over) {
    const d = E.fallbackDilemma(C, s, stances).dilemma;
    const idx = pick(seed, s.turn, d);
    const input = { orders: { ...POLICY.community[cp](s), ...POLICY.meridian[mp](s) }, dilemma: d, votes: { [d.final_call]: idx } };
    s = E.resolveTurn(C, s, input).state;
  }
  return s;
}
const randomPick = (seed, turn, d) => E.rngFor(seed + 99991, turn)() * d.orders.length | 0;

const N = +(process.argv[2] || 1000);
const rows = [];
for (const cp of ["nothing", "careful"]) for (const mp of ["nothing", "careful"]) {
  let cw = 0, mw = 0, ci = 0, mi = 0, lost = 0, tr = 0, cf = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = play(seed, cp, mp, randomPick);
    const st = E.standings(C, s);
    ci += st.community.index; mi += st.meridian.index; lost += s.lost.vuln + s.lost.able; tr += s.meters.trust; cf += s.meters.confidence;
    if (st.community.index > st.meridian.index) cw++; else if (st.meridian.index > st.community.index) mw++;
  }
  rows.push({ community: cp, meridian: mp, "community wins %": (100 * cw / N).toFixed(1), "meridian wins %": (100 * mw / N).toFixed(1),
    "community index": (ci / N).toFixed(1), "meridian index": (mi / N).toFixed(1), "people lost": (lost / N).toFixed(0), trust: (tr / N).toFixed(0), conf: (cf / N).toFixed(0) });
}
console.table(rows);

// Determinism: same seed and inputs twice give the same hash, and replay matches.
const a = play(42, "careful", "careful", randomPick), b = play(42, "careful", "careful", randomPick);
console.log("determinism:", E.hash(a) === E.hash(b) ? "same hash " + E.hash(a) : "MISMATCH");
