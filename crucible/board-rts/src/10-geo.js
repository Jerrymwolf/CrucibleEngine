/* ---------- geography (board-owned) ----------
   The island art is 1400 px square inside a 2800 px world (700 px of sea on every side so the storm is
   visible as it approaches). Territories follow canon v3 and the art: the capital (Summit) on the west
   bank of the river in the north, Meridian's campus (Sterling) on the east bank, the port (Haven) east,
   the plant (Keystone) south, the airport and the Strand (Gateway) west, the crater (Heartland) centre.
   Sectors are compass bearings clockwise from north; anchors and label points are image pixels.
   The engine's content positions are not used for placement; the storm track is (see toWorld). */
const IMG = 1400, PAD = 700, WORLD = IMG + 2 * PAD;
const CENTER = { x: PAD + 700, y: PAD + 700 };
const R_RING = 350; // the ring road's radius on the art; Heartland is the disc inside it
const GEO = {
  gateway:   { sector: [228, 322], anchor: [268, 700],  labelAt: [268, 640],  color: 0x35c4b2, tag: 'Airport · fleet · the Strand' },
  summit:    { sector: [322, 360], anchor: [600, 235],  labelAt: [585, 195],  color: 0xb3a4ff, tag: 'Capital · hospital · government' },
  sterling:  { sector: [0, 46],    anchor: [870, 225],  labelAt: [905, 190],  color: 0xe86ab0, tag: 'Meridian campus · uplink' },
  haven:     { sector: [46, 118],  anchor: [1160, 600], labelAt: [1172, 536], color: 0xf05d5d, tag: 'Port · fuel terminal · union hall' },
  keystone:  { sector: [118, 228], anchor: [780, 1130], labelAt: [780, 1182], color: 0x4fb0ff, tag: 'Celarithin plant · cold vault' },
  heartland: { crater: true,       anchor: [700, 545],  labelAt: [700, 690],  color: 0xe9b949, tag: 'Dam · water · kelp works' },
};
const rad = b => (b - 90) * Math.PI / 180;
const polar = (b, r) => ({ x: CENTER.x + r * Math.cos(rad(b)), y: CENTER.y + r * Math.sin(rad(b)) });
const ringPt = b => polar(b, R_RING);
const W = ([x, y]) => ({ x: x + PAD, y: y + PAD });
const anchorOf = id => id === 'mainland' ? { x: PAD - 420, y: PAD + 560 } : W(GEO[id].anchor);
const bearingOf = p => (Math.atan2(p.x - CENTER.x, -(p.y - CENTER.y)) * 180 / Math.PI + 360) % 360;
const bearingOfParish = id => bearingOf(anchorOf(id));
// Content coordinates (0..100 across the island, from concordia.json and the engine's storm track) to
// world pixels: the island disc fills 8%..92% of the art, as the first board established.
const toWorld = c => ({ x: PAD + (8 + 0.84 * c.x) / 100 * IMG, y: PAD + (8 + 0.84 * c.y) / 100 * IMG });
const hexColor = n => '#' + n.toString(16).padStart(6, '0');
const pcolor = id => hexColor((GEO[id] || { color: 0x888888 }).color);

// Shoreline: traced from the art at load time (sea is the only uniformly blue thing outside the crater),
// so territory fills end at the beach. Falls back to a plain disc.
const SHORE_N = 120;
let SHORE = Array(SHORE_N).fill(592);
let SEA_RGB = null; // the art's own sea colour, so the world's sea continues the picture
function traceShore(img) {
  const S = 0.5, cv = document.createElement('canvas'); cv.width = cv.height = Math.round(IMG * S);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  { const i = (6 * cv.width + 6) * 4; SEA_RGB = [d[i], d[i + 1], d[i + 2]]; }
  const sea = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return true; const i = (y * cv.width + x) * 4; const r = d[i], g = d[i + 1], b = d[i + 2]; return b > 60 && b > r + 28 && b >= g - 4 && r < 120; };
  const out = [];
  for (let k = 0; k < SHORE_N; k++) {
    const th = rad(k * 360 / SHORE_N), cx = 700 * S, cy = 700 * S; let found = 0;
    for (let r = 690; r >= 480; r -= 2) {
      if (sea(cx + r * S * Math.cos(th), cy + r * S * Math.sin(th))) continue;
      let land = 0;
      for (let q = 2; q <= 16; q += 2) if (!sea(cx + (r - q) * S * Math.cos(th), cy + (r - q) * S * Math.sin(th))) land++;
      if (land >= 7) { found = r; break; }
    }
    out.push(found);
  }
  for (let k = 0; k < SHORE_N; k++) if (!out[k]) { // river mouths and basins: borrow the nearest traced neighbour
    let j = 1; while (j < SHORE_N && !out[(k + j) % SHORE_N] && !out[(k - j + SHORE_N) % SHORE_N]) j++;
    out[k] = out[(k + j) % SHORE_N] || out[(k - j + SHORE_N) % SHORE_N] || 592;
  }
  const med = out.map((_, k) => { const w = [-2, -1, 0, 1, 2].map(o => out[(k + o + SHORE_N) % SHORE_N]).sort((a, b) => a - b); return w[2]; });
  return med.map(r => clamp(r + 6, 500, 700));
}
function shoreR(b) { const f = ((b % 360) + 360) % 360 / 360 * SHORE_N, i = Math.floor(f), t = f - i; return lerp(SHORE[i % SHORE_N], SHORE[(i + 1) % SHORE_N], t); }
function sectorPoly(b0, b1) {
  const pts = [], step = 2;
  for (let b = b0; b < b1 - 1e-9; b += step) { const p = polar(b, shoreR(b)); pts.push(p.x, p.y); }
  { const p = polar(b1, shoreR(b1)); pts.push(p.x, p.y); }
  for (let b = b1; b > b0 + 1e-9; b -= step) { const p = ringPt(b); pts.push(p.x, p.y); }
  { const p = ringPt(b0); pts.push(p.x, p.y); }
  return pts;
}
function discPoly(r, n = 72) { const pts = []; for (let k = 0; k < n; k++) { const p = polar(k * 360 / n, r); pts.push(p.x, p.y); } return pts; }
function territoryPoly(id) { const g = GEO[id]; return g.crater ? discPoly(R_RING - 4) : sectorPoly(g.sector[0], g.sector[1]); }
function pointInPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- routes (routes.json, drawn on the art) ----------
   Every authored route is one drawable piece keyed by its id, oriented from `from` to `to`: the ring
   road's arcs between the ring parishes, the two crater roads, the air lanes, the sea lane round the
   south-west point, the foot crossings. Spurs from the ring into each coastal parish are cosmetic
   access roads that convoys use to leave and enter town. Open or cut comes from the engine's
   `routes_cut` list; the client never decides a cut. */
const rev = pts => [...pts].reverse();
const pathLen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return l; };
function arcPts(b0, b1, r = R_RING) { const pts = [], n = Math.max(2, Math.ceil(Math.abs(b1 - b0) / 4)); for (let k = 0; k <= n; k++) pts.push(polar(lerp(b0, b1, k / n), r)); return pts; }
// the short way round from bearing a to bearing b
function shortArc(a, b, r = R_RING) { const d = ((b - a + 540) % 360) - 180; return arcPts(a, a + d, r); }
const RING_PARISHES = ['gateway', 'summit', 'sterling', 'haven', 'keystone'];
const CRATER_POINTS = {
  'switchbacks': [[875, 1003], [790, 940], [722, 892], [688, 846], [604, 782], [590, 690], [622, 600], [700, 545]], // from the ring at bearing 150 up to the crater
  'gorge-road': [[600, 235], [690, 322], [706, 440], [700, 545]],                                                   // from Summit's centre up the gorge
};
const PIECES = {};
function buildRoutes() {
  for (const p of RING_PARISHES) PIECES[`spur:${p}`] = { id: `spur:${p}`, name: `${pname(p)} access road`, mode: 'road', kind: 'spur', points: [ringPt(bearingOfParish(p)), anchorOf(p)], from: 'ring', to: p };
  for (const r of DATA.routes) {
    let points = null, kind = r.mode, endsOnRing = [false, false];
    if (r.id.startsWith('ring-')) { points = shortArc(bearingOfParish(r.from), bearingOfParish(r.to)); endsOnRing = [true, true]; kind = 'ring'; }
    else if (r.id === 'gorge-road') { points = CRATER_POINTS['gorge-road'].map(W); kind = 'crater'; }
    else if (r.id === 'switchbacks') { points = [...shortArc(bearingOfParish('keystone'), 150), ...CRATER_POINTS.switchbacks.slice(1).map(W)]; endsOnRing = [true, false]; kind = 'crater'; }
    else if (r.id === 'air-runway') { const a = anchorOf('gateway'); points = [a, { x: a.x - 160, y: a.y - 60 }, anchorOf('mainland')]; }
    else if (r.mode === 'air') { const a = anchorOf(r.from), b = anchorOf(r.to); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; points = [a, { x: mx - dy / L * 40, y: my + dx / L * 40 }, b]; }
    else if (r.id === 'sea-gateway-keystone') { points = shortArc(bearingOfParish('gateway'), bearingOfParish('keystone'), 660); }
    else if (r.id === 'foot-haven-keystone') { points = shortArc(bearingOfParish('haven'), bearingOfParish('keystone'), R_RING + 14); endsOnRing = [true, true]; }
    else if (r.id === 'boat-summit-sterling') { const a = anchorOf('summit'), b = anchorOf('sterling'); points = [a, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 50 }, b]; }
    else if (r.id === 'foot-summit-sterling') { const a = anchorOf('summit'), b = anchorOf('sterling'); points = [a, { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 40 }, b]; }
    else if (r.mode === 'radio') { points = null; }
    else { points = [anchorOf(r.from), anchorOf(r.to)]; }
    PIECES[r.id] = { id: r.id, name: r.name, mode: r.mode, kind, points, from: r.from, to: r.to, endsOnRing, cutT: r.cutT, reopenT: r.reopenT, eyeOpen: r.eyeOpen, len: points ? pathLen(points) : 0 };
  }
  for (const p of Object.values(PIECES)) p.len = p.points ? pathLen(p.points) : 0;
}
// A convoy's drawable path along the engine's route ids, from the sender to the receiver: the sender's
// access road out to the ring, each route oriented the right way, the receiver's access road in.
function convoyPath(from, routeIds, to) {
  const pieces = []; let node = from;
  const push = (id, points) => { if (points && points.length > 1) pieces.push({ id, points }); };
  for (let k = 0; k < routeIds.length; k++) {
    const pc = PIECES[routeIds[k]]; if (!pc || !pc.points) continue;
    const forward = pc.from === node, next = forward ? pc.to : pc.from;
    const pts = forward ? pc.points : rev(pc.points), startsOnRing = pc.endsOnRing[forward ? 0 : 1], endsOnRing = pc.endsOnRing[forward ? 1 : 0];
    if (k === 0 && startsOnRing && PIECES[`spur:${node}`]) push(`spur:${node}`, rev(PIECES[`spur:${node}`].points));
    if (k > 0 && startsOnRing && !pieces.length) push(`spur:${node}`, rev((PIECES[`spur:${node}`] || { points: [] }).points));
    push(pc.id, pts);
    if (k === routeIds.length - 1 && endsOnRing && PIECES[`spur:${next}`]) push(`spur:${next}`, PIECES[`spur:${next}`].points);
    node = next;
  }
  if (!pieces.length) { const a = anchorOf(from), b = anchorOf(to); pieces.push({ id: 'direct', points: [a, b] }); }
  const out = []; let d = 0;
  for (const p of pieces) { const len = pathLen(p.points); out.push({ id: p.id, points: p.points, start: d, len }); d += len; }
  return { pieces: out, len: d };
}
function pointAlong(path, dist) {
  dist = clamp(dist, 0, path.len);
  for (const pc of path.pieces) {
    if (dist > pc.start + pc.len + 1e-6) continue;
    let d = dist - pc.start;
    for (let i = 1; i < pc.points.length; i++) {
      const a = pc.points[i - 1], b = pc.points[i], l = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= l || i === pc.points.length - 1) { const f = l ? clamp(d / l, 0, 1) : 1; return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), angle: Math.atan2(b.y - a.y, b.x - a.x), piece: pc.id }; }
      d -= l;
    }
  }
  const last = path.pieces[path.pieces.length - 1], p = last.points[last.points.length - 1];
  return { x: p.x, y: p.y, angle: 0, piece: last.id };
}
// Routes that touch a parish, for the console's route list: the ring and crater roads first, then lanes.
function routesTouching(pid) { return DATA.routes.filter(r => (r.from === pid || r.to === pid) && r.mode !== 'radio'); }
const MODE_GLYPH = { road: '▮', air: '✈', sea: '⛵', foot: '⚲', radio: '◉' };
const TOKEN_GLYPH = { GEN: 'GEN', FUEL: 'FUEL', BOAT: 'BOAT', LIFT: 'LIFT', SHELTER: 'SHLT', MEDIC: 'MED', COLD: 'COLD', CREW: 'CREW', FUND: 'FUND', COMMS: 'COMM', WATER: 'H2O' };
const TOKEN_COLOR = { GEN: 0xe9b949, FUEL: 0xf0763c, BOAT: 0x35c4b2, LIFT: 0xb3a4ff, SHELTER: 0x5d93d1, MEDIC: 0xf05d7a, COLD: 0x8fd3ff, CREW: 0x4fb06f, FUND: 0xffd166, COMMS: 0xe86ab0, WATER: 0x4fb0ff };
const tname = k => (DATA.tokens[k] || { name: k }).name;
