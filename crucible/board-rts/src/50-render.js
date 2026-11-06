/* ---------- the WebGL map (PixiJS v8, vendored) ----------
   Renders the world the host sent and nothing else: territories with fog, the sixteen routes open or
   cut, the storm from each tick's weather, convoys along the engine's route ids between departure and
   arrival ticks, pings on events, labels with the five system bars, a minimap. The camera is the only
   thing the viewer controls. Role UIs give the insets so the island centres in the free screen. */
const LABEL_FONT = 'Bahnschrift, "DIN Alternate", "Roboto Condensed", "Arial Narrow", "Segoe UI", Arial, sans-serif';
const MONO_FONT = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const R = { ready: false, world: null, insets: () => ({ l: 12, r: 12, t: 72, b: 12 }), onSelect: null, selected: null, hover: null, minimap: true, pings: [] };

function makeTextures() {
  const tex = {};
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  { const S = 512, c = S / 2, cv = canvas(S, S), ctx = cv.getContext('2d'), rng = mulberry32(7);
    for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 260; k++) {
      const th = k / 260 * 2.35 * Math.PI, r = 34 + th / Math.PI * 92, a = th + arm * 2 * Math.PI / 3 + (rng() - 0.5) * 0.25, rr = r + (rng() - 0.5) * 26;
      const x = c + rr * Math.cos(a), y = c + rr * Math.sin(a), rad = 12 + rng() * 18, g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const al = 0.16 * (1 - th / (2.4 * Math.PI)) + 0.05; g.addColorStop(0, `rgba(235,240,245,${al})`); g.addColorStop(1, 'rgba(235,240,245,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createRadialGradient(c, c, 0, c, c, c); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.78, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'destination-out';
    const eye = ctx.createRadialGradient(c, c, 0, c, c, 30); eye.addColorStop(0, 'rgba(0,0,0,1)'); eye.addColorStop(0.6, 'rgba(0,0,0,1)'); eye.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(c, c, 30, 0, Math.PI * 2); ctx.fill();
    tex.bands = PIXI.Texture.from(cv); }
  { const S = 256, cv = canvas(S, S), ctx = cv.getContext('2d'), g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(14,30,56,0.9)'); g.addColorStop(0.55, 'rgba(14,30,56,0.55)'); g.addColorStop(1, 'rgba(14,30,56,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.shield = PIXI.Texture.from(cv); }
  { const S = 256, cv = canvas(S, S), ctx = cv.getContext('2d'); ctx.strokeStyle = 'rgba(255,255,255,1)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); ctx.stroke(); tex.ring = PIXI.Texture.from(cv); }
  { const cv = canvas(48, 6), ctx = cv.getContext('2d'), g = ctx.createLinearGradient(0, 0, 48, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 1, 48, 4); tex.streak = PIXI.Texture.from(cv); }
  { const S = 64, cv = canvas(S, S), ctx = cv.getContext('2d'), g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.glow = PIXI.Texture.from(cv); }
  { const S = 512, cv = canvas(S, S), ctx = cv.getContext('2d'), g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(6,10,16,0)'); g.addColorStop(0.5, 'rgba(6,10,16,0)'); g.addColorStop(0.62, 'rgba(6,10,16,0.35)'); g.addColorStop(1, 'rgba(6,10,16,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.vignette = PIXI.Texture.from(cv); }
  return tex;
}
function dashed(g, pts, dash, gap) {
  let carry = 0, on = true;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (!L) continue;
    let d = 0;
    while (d < L) {
      const seg = Math.min(L - d, (on ? dash : gap) - carry), f0 = d / L, f1 = (d + seg) / L;
      if (on) g.moveTo(lerp(a.x, b.x, f0), lerp(a.y, b.y, f0)).lineTo(lerp(a.x, b.x, f1), lerp(a.y, b.y, f1));
      d += seg; carry += seg; if (carry >= (on ? dash : gap) - 1e-6) { carry = 0; on = !on; }
    }
  }
}
const midOf = pts => { const total = pathLen(pts); let d = total / 2; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y); if (d <= l) { const f = l ? d / l : 0; return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) }; } d -= l; } return pts[pts.length - 1]; };
const PING = { damage: { color: 0xe0a93a, life: 1.6, r: 46 }, failure: { color: 0xe0524f, life: 2.2, r: 60 }, alert: { color: 0xffffff, life: 1.8, r: 52 }, mayday: { color: 0xff5f57, life: 3.2, r: 90 }, good: { color: 0x4fb06f, life: 1.6, r: 40 }, human: { color: 0xe8893d, life: 1.8, r: 50 } };
function pingFor(e) {
  const at = p => anchorOf(p);
  switch (e.kind) {
    case 'mayday': return { kind: 'mayday', ...at(e.asker), to: at(e.holder) };
    case 'cascade': return { kind: 'failure', ...at(e.parish_id) };
    case 'isolation': return e.ended ? { kind: 'good', ...at(e.parish_id) } : { kind: 'failure', ...at(e.parish_id) };
    case 'route_cut': { const pc = PIECES[e.route_id]; return pc && pc.points ? { kind: 'failure', ...midOf(pc.points) } : null; }
    case 'route_reopened': { const pc = PIECES[e.route_id]; return pc && pc.points ? { kind: 'good', ...midOf(pc.points) } : null; }
    case 'decision': return { kind: e.decided_by === 'storm' ? 'failure' : 'human', ...at(e.parish_id) };
    case 'aid_answer': return { kind: e.answer === 'grant' || e.answer === 'part' ? 'good' : 'failure', ...at(e.holder), to: at(e.asker) };
    case 'aid_expired': return { kind: 'failure', ...at(e.holder) };
    case 'resident_state': return e.state === 'lost' || e.state === 'injured' ? { kind: 'failure', ...at(e.parish_id) } : e.state === 'rescued' ? { kind: 'good', ...at(e.parish_id) } : null;
    case 'convoy_arrived': return { kind: 'good', ...at(e.to) };
    case 'convoy_turned_back': return { kind: 'damage', ...at(e.from) };
    case 'values_locked': case 'allocation': case 'credit_line': return { kind: 'human', ...at(e.parish_id) };
    case 'ship_sailed': return { kind: 'good', ...at('haven') };
    case 'doses_lost': case 'consignment_missed': return { kind: 'failure', ...at('keystone') };
    default: return null;
  }
}

async function createRenderer(islandImg) {
  const t0 = performance.now(); R.timing = {};
  const app = new PIXI.Application();
  await app.init({ canvas: $('gl'), preference: 'webgl', antialias: AA, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, backgroundColor: 0x0a0e14, resizeTo: window, powerPreference: 'high-performance' });
  R.app = app; R.timing.init = Math.round(performance.now() - t0);
  const tex = makeTextures(); R.timing.textures = Math.round(performance.now() - t0);
  const islandTex = PIXI.Texture.from(islandImg);
  try { islandTex.source.autoGenerateMipmaps = true; islandTex.source.update(); } catch (e) { /* mipmaps are a nicety */ }
  const scene = new PIXI.Container({ isRenderGroup: true });
  const ISLAND_TINT = 0xbcc8d4;
  const seaColor = SEA_RGB ? ((Math.round(SEA_RGB[0] * 0xbc / 255) << 16) | (Math.round(SEA_RGB[1] * 0xc8 / 255) << 8) | Math.round(SEA_RGB[2] * 0xd4 / 255)) : 0x0b1420;
  const sea = new PIXI.Graphics();
  sea.rect(0, 0, WORLD, WORLD).fill(seaColor);
  for (let x = 0; x <= WORLD; x += 200) sea.moveTo(x, 0).lineTo(x, WORLD);
  for (let y = 0; y <= WORLD; y += 200) sea.moveTo(0, y).lineTo(WORLD, y);
  sea.stroke({ width: 1, color: 0x5d93d1, alpha: 0.07 });
  for (const r of [720, 900, 1080, 1260]) sea.circle(CENTER.x, CENTER.y, r).stroke({ width: 1, color: 0x5d93d1, alpha: 0.1 });
  for (let b = 0; b < 360; b += 30) { const a = polar(b, 705), c = polar(b, 1290); sea.moveTo(a.x, a.y).lineTo(c.x, c.y); }
  sea.stroke({ width: 1, color: 0x5d93d1, alpha: 0.05 });
  const island = new PIXI.Sprite(islandTex); island.position.set(PAD, PAD); island.width = IMG; island.height = IMG; island.tint = ISLAND_TINT;
  const vignette = new PIXI.Sprite(tex.vignette); vignette.width = WORLD; vignette.height = WORLD; vignette.visible = !LITE;
  const terrC = new PIXI.Container(), lanesG = new PIXI.Graphics(), roadsG = new PIXI.Graphics(), fogG = new PIXI.Graphics(), hiG = new PIXI.Graphics();
  const stormC = new PIXI.Container(), convoyC = new PIXI.Container(), pingG = new PIXI.Graphics(), labelC = new PIXI.Container();
  scene.addChild(sea, island, vignette, terrC, lanesG, roadsG, fogG, hiG, stormC, convoyC, pingG, labelC);
  const polys = {}, terr = {};
  for (const p of PIDS) { polys[p] = territoryPoly(p); const g = new PIXI.Graphics(); terr[p] = g; terrC.addChild(g); }
  const fogged = p => !!(R.world && R.world.isFogged(p));
  function drawTerritory(p) {
    const g = terr[p], c = GEO[p].color, state = R.selected === p ? 'selected' : R.hover === p ? 'hover' : 'idle', fog = fogged(p);
    g.clear();
    g.poly(polys[p], true).fill({ color: c, alpha: fog ? 0.04 : state === 'selected' ? 0.24 : state === 'hover' ? 0.18 : 0.12 }).stroke({ width: state === 'selected' ? 2.5 : 1.5, color: c, alpha: fog ? 0.3 : state === 'selected' ? 1 : 0.6, join: 'round' });
  }
  function drawAllTerritories() {
    for (const p of PIDS) drawTerritory(p);
    fogG.clear(); for (const p of PIDS) if (fogged(p)) fogG.poly(polys[p], true).fill({ color: 0x05080c, alpha: 0.64 });
    hiG.clear(); if (R.selected) hiG.poly(polys[R.selected], true).stroke({ width: 3, color: GEO[R.selected].color, alpha: 1, join: 'round' });
  }
  // routes: roads solid, lanes (air, sea, foot) faint and dashed, a cut piece red with its time
  const routeLabels = {};
  for (const pc of Object.values(PIECES)) {
    if (!pc.points) continue;
    const t = new PIXI.Text({ text: '', resolution: 2, style: { fontFamily: MONO_FONT, fontSize: 10, fontWeight: '700', fill: '#ffb4ad', letterSpacing: 1, stroke: { color: '#0a0e14', width: 3 } } });
    t.anchor.set(0.5); const m = midOf(pc.points); t.position.set(m.x, m.y); t.visible = false; routeLabels[pc.id] = t; labelC.addChild(t);
  }
  let roadsKey = '';
  function drawRoads() {
    const w = R.world, vt = w && w.view(), key = vt ? (vt.routes_cut || []).join(',') : '';
    if (key === roadsKey && roadsG.__drawn) return; roadsKey = key; roadsG.__drawn = true;
    roadsG.clear(); lanesG.clear();
    for (const pc of Object.values(PIECES)) {
      if (!pc.points) continue;
      const cut = w ? w.routeCut(pc.id) : false, pts = pc.points, lab = routeLabels[pc.id], isRoad = pc.mode === 'road' || pc.kind === 'spur';
      const g = isRoad ? roadsG : lanesG, width = pc.kind === 'ring' ? 4 : isRoad ? 3 : 2;
      if (!cut) {
        if (isRoad) { g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke({ width, color: 0xdfe6ee, alpha: 0.5, cap: 'round', join: 'round' }); }
        else { dashed(g, pts, pc.mode === 'air' ? 14 : 6, pc.mode === 'air' ? 10 : 6); g.stroke({ width, color: pc.mode === 'air' ? 0xb3a4ff : pc.mode === 'sea' ? 0x35c4b2 : 0xdfe6ee, alpha: 0.4, cap: 'butt' }); }
        if (lab) lab.visible = false;
      } else {
        dashed(g, pts, 10, 8); g.stroke({ width, color: 0xe0524f, alpha: 0.85, cap: 'butt' });
        if (lab) { const at = w.routeCutAt[pc.id]; const text = at != null ? `CUT ${clockStr(at)}` : 'CUT'; if (lab.text !== text) lab.text = text; lab.visible = pc.kind !== 'spur'; }
      }
    }
  }
  // labels: name, role line, five bars, a chip
  const labels = {};
  for (const p of PIDS) {
    const c = new PIXI.Container(), at = W(GEO[p].labelAt); c.position.set(at.x, at.y);
    const name = new PIXI.Text({ text: PARISH[p].name.toUpperCase(), resolution: 2, style: { fontFamily: LABEL_FONT, fontSize: 17, fontWeight: '700', fill: '#ffffff', letterSpacing: 3, stroke: { color: '#0a0e14', width: 3.5, join: 'round' } } });
    name.anchor.set(0.5, 1); name.position.set(0, -4);
    const tag = new PIXI.Text({ text: GEO[p].tag, resolution: 2, style: { fontFamily: LABEL_FONT, fontSize: 10.5, fontWeight: '600', fill: '#e2e8ee', letterSpacing: 1, stroke: { color: '#0a0e14', width: 2.5, join: 'round' } } });
    tag.anchor.set(0.5, 0); tag.alpha = 0.92;
    const bars = new PIXI.Graphics(); bars.position.set(0, 16);
    const chip = new PIXI.Container(); chip.position.set(0, 30); chip.visible = false;
    const chipBg = new PIXI.Graphics(), chipTx = new PIXI.Text({ text: 'ISOLATED', resolution: 2, style: { fontFamily: MONO_FONT, fontSize: 9.5, fontWeight: '700', fill: '#ffffff', letterSpacing: 1.5 } });
    chipTx.anchor.set(0.5); chip.addChild(chipBg, chipTx);
    const swatch = new PIXI.Graphics(); swatch.roundRect(-5, -2, 10, 4, 1).fill(GEO[p].color); swatch.position.set(0, -27);
    const keys = new PIXI.Container(); const n = SYSTEMS.length, bw = 11, gap = 3, x0 = -(n * bw + (n - 1) * gap) / 2;
    SYSTEMS.forEach((k, i) => { const kt = new PIXI.Text({ text: k[0].toUpperCase(), resolution: 2, style: { fontFamily: MONO_FONT, fontSize: 7, fontWeight: '700', fill: '#aab3bf' } }); kt.anchor.set(0.5, 0); kt.position.set(x0 + i * (bw + gap) + bw / 2, 0); keys.addChild(kt); });
    keys.position.set(0, 24);
    // the card marker: a small orange tab while this table has a card open (projector and DM see every table's)
    const card = new PIXI.Graphics(); card.position.set(0, -44); card.visible = false; card.roundRect(-8, -5, 16, 11, 2).fill({ color: 0xe8893d, alpha: 0.95 });
    c.addChild(swatch, name, tag, bars, keys, chip, card);
    labels[p] = { c, name, tag, bars, keys, chip, chipBg, chipTx, card };
    labelC.addChild(c);
  }
  function setChip(l, text, color) { l.chip.visible = true; if (l.chipTx.text !== text) l.chipTx.text = text; const w = l.chipTx.width + 12; l.chipBg.clear(); l.chipBg.roundRect(-w / 2, -8, w, 16, 2).fill({ color, alpha: 0.92 }); }
  let labelsKey = '';
  function drawLabels() {
    const w = R.world; if (!w || !w.tick) return;
    const scrub = w.scrub != null, vt = w.view();
    const key = w.viewT + '|' + (scrub ? 'scrub' : (w.fogged || []).join(',')) + '|' + Object.values(w.cards).filter(c => !c.decision).map(c => c.parish_id).join(',');
    if (key === labelsKey) return; labelsKey = key;
    const openBy = new Set(Object.values(w.cards).filter(c => !c.decision && c.presented_t != null).map(c => c.parish_id));
    for (const p of PIDS) {
      const l = labels[p], fog = scrub ? false : w.isFogged(p), rep = scrub ? (vt.infrastructure && vt.infrastructure[p] ? { t: w.viewT, infrastructure: vt.infrastructure[p], isolated: (vt.isolated || []).includes(p) } : null) : w.report(p);
      l.name.alpha = fog ? 0.6 : 1; l.tag.visible = !fog; l.bars.visible = !!rep; l.keys.visible = !!rep; l.bars.alpha = l.keys.alpha = fog ? 0.45 : 1;
      l.bars.clear();
      if (rep) {
        const n = SYSTEMS.length, bw = 11, gap = 3, x0 = -(n * bw + (n - 1) * gap) / 2;
        l.bars.roundRect(x0 - 4, -3, n * bw + (n - 1) * gap + 8, 12, 2).fill({ color: 0x0a0e14, alpha: 0.75 });
        SYSTEMS.forEach((k, i) => { const v = (rep.infrastructure || {})[k] ?? 0, h = 6 * v / 100; l.bars.rect(x0 + i * (bw + gap), 0, bw, 6).fill({ color: 0x2a3340 }); if (h > 0) l.bars.rect(x0 + i * (bw + gap), 6 - h, bw, h).fill(STATUS_HEX[status(v)]); });
      }
      if (fog) setChip(l, rep ? 'LAST REPORT ' + clockStr(rep.t) : 'NO CONTACT', 0x3a434e); else if (rep && rep.isolated) setChip(l, 'ISOLATED', 0xb3322f); else l.chip.visible = false;
      l.card.visible = openBy.has(p) && (w.role === 'projector' || w.role === 'dm' || p === w.parish);
    }
  }
  // storm
  const shield = new PIXI.Sprite(tex.shield), bands = new PIXI.Sprite(tex.bands), front = new PIXI.Sprite(tex.ring), eye = new PIXI.Graphics(), trailG = new PIXI.Graphics();
  for (const s of [shield, bands, front]) s.anchor.set(0.5);
  front.alpha = 0.45; front.tint = 0xee7d6a; shield.visible = !LITE;
  const streaks = [], streakC = new PIXI.Container();
  for (let k = 0; k < (LITE ? 24 : 56); k++) { const s = new PIXI.Sprite(tex.streak); s.anchor.set(0.5); s.alpha = 0; streakC.addChild(s); streaks.push({ s, phi: Math.random() * Math.PI * 2, rho: 0.3 + Math.random() * 0.85, speed: 0.6 + Math.random() * 0.8 }); }
  const stormLabel = new PIXI.Text({ text: '', resolution: 2, style: { fontFamily: MONO_FONT, fontSize: 12, fontWeight: '700', fill: '#ffe1da', letterSpacing: 1.5, stroke: { color: '#0a0e14', width: 3 } } }); stormLabel.anchor.set(0.5, 1);
  stormC.addChild(trailG, shield, bands, streakC, front, eye, stormLabel);
  let stormAngle = 0, trailKey = -1;
  // The storm's size follows its strength (the strongest wind of the last four hours); the local wind drives only the streaks and the
  // label. When the eye passes, the island's own wind drops while the storm is as big as ever, and the calm ring is drawn over it.
  const stormStrength = (w, i) => { let s = 0; for (let k = Math.max(0, i - 16); k <= i; k++) { const tk = w.ticks[k]; if (tk && tk.weather) s = Math.max(s, tk.weather.wind_kts || 0); } return s; };
  const stormParams = (strength, wind = strength) => ({ outer: 70 + strength * 3.3, eye: wind >= 64 ? 14 + (wind - 64) * 0.55 : strength >= 50 && wind < strength * 0.6 ? 14 + (strength - 50) * 0.55 : 0 });
  function drawTrail() {
    const w = R.world; if (!w || !w.tick || trailKey === w.viewT) return; trailKey = w.viewT;
    trailG.clear(); const i = idx(w.viewT);
    for (let k = Math.max(0, i - 160); k <= i; k += 4) { const tk = w.ticks[k]; const hp = tk && tk.weather && tk.weather.hurricane_position; if (!hp) continue; const p = toWorld(hp); trailG.circle(p.x, p.y, 2.2).fill({ color: 0xee7d6a, alpha: 0.35 + 0.5 * (k - i + 160) / 160 }); }
  }
  function updateStorm(dt) {
    const w = R.world, a = w && w.view(), b = (w && w.ticks[idx(w.viewT) - 1]) || a;
    if (!a || !a.weather || !a.weather.hurricane_position) { stormC.visible = false; return; }
    stormC.visible = true;
    const f = w.running && w.scrub == null ? clamp((w.nowT - w.t) / STEP + 1, 0, 1) : 1; // nowT runs from the previous tick toward this one
    const pa = toWorld((b.weather || a.weather).hurricane_position || a.weather.hurricane_position), pb = toWorld(a.weather.hurricane_position), x = lerp(pa.x, pb.x, f), y = lerp(pa.y, pb.y, f);
    const wind = lerp((b.weather || a.weather).wind_kts || 0, a.weather.wind_kts || 0, f), strength = Math.max(wind, stormStrength(w, idx(w.viewT))), P = stormParams(strength, wind);
    bands.position.set(x, y); bands.scale.set(P.outer / 256 * 1.1); bands.alpha = 0.45 + 0.4 * clamp(strength / 100, 0, 1);
    if (!REDUCE) stormAngle -= dt * (0.25 + 0.35 * clamp(strength / 100, 0, 1)); bands.rotation = stormAngle;
    shield.position.set(x, y); shield.scale.set(P.outer / 128 * 1.5); shield.alpha = 0.55 * clamp(strength / 90, 0, 1);
    front.position.set(x, y); front.scale.set(P.outer / 128); front.alpha = 0.25 + 0.3 * clamp(strength / 100, 0, 1);
    eye.clear(); if (P.eye) eye.circle(x, y, P.eye).fill({ color: 0x0b1420, alpha: 0.55 }).stroke({ width: 1.5, color: 0xffffff, alpha: 0.45 });
    const sv = clamp(wind / 70, 0, 1);
    for (const st of streaks) {
      if (!REDUCE) st.phi -= dt * st.speed * (0.4 + sv) / st.rho;
      const rr = st.rho * P.outer, sx = x + rr * Math.cos(st.phi), sy = y + rr * Math.sin(st.phi);
      st.s.position.set(sx, sy); st.s.rotation = st.phi + Math.PI / 2; st.s.alpha = 0.4 * sv * (1 - st.rho / 1.25); st.s.scale.set(0.6 + 0.6 * sv, 1);
    }
    if (P.eye) { stormLabel.anchor.set(1, 1); stormLabel.position.set(x - P.eye - 22, y - P.eye - 10); } else { stormLabel.anchor.set(0.5, 1); stormLabel.position.set(x, y - P.outer - 8); }
    stormLabel.scale.set(clamp(1 / cam.z, 0.55, 1.7));
    const text = `MIDAS  ${Math.round(a.weather.wind_kts || 0)} KT`; if (stormLabel.text !== text) stormLabel.text = text;
    stormLabel.visible = strength >= 20;
  }
  // convoys: the engine says when a convoy leaves, which routes it takes and when it arrives; the sprite rides between those ticks
  const convoySprites = new Map();
  function convoySprite(c) {
    const col = TOKEN_COLOR[c.token] || (GEO[c.from] || { color: 0xffffff }).color, cc = new PIXI.Container(), g = new PIXI.Graphics();
    g.roundRect(-16, -8, 32, 16, 3).fill({ color: 0x0a0e14, alpha: 0.9 }).stroke({ width: 2, color: col, alpha: 1 });
    g.moveTo(16, -4).lineTo(22, 0).lineTo(16, 4).fill({ color: col });
    const t = new PIXI.Text({ text: TOKEN_GLYPH[c.token] || c.token || '?', resolution: 2, style: { fontFamily: MONO_FONT, fontSize: 9, fontWeight: '700', fill: hexColor(col) } }); t.anchor.set(0.5); t.position.set(-1, 0);
    const glow = new PIXI.Sprite(tex.glow); glow.anchor.set(0.5); glow.scale.set(0.9); glow.tint = col; glow.alpha = 0.35; glow.blendMode = 'add';
    cc.addChild(glow, g, t); cc.body = g; cc.glow = glow; cc.col = col;
    return cc;
  }
  function updateConvoys(simT, zoom, now) {
    const w = R.world; if (!w) return;
    for (const [id, sp] of convoySprites) { const c = w.convoys[id]; if (!c || (c.end_t != null && simT > c.end_t + 20) || (c.status === 'moving' && simT > c.arrive_t + 30)) { convoyC.removeChild(sp); sp.destroy({ children: true }); convoySprites.delete(id); } }
    for (const c of Object.values(w.convoys)) {
      if (simT < c.depart_t) continue;
      if ((c.end_t != null && simT > c.end_t + 20) || (c.status === 'moving' && simT > c.arrive_t + 30)) continue;
      let sp = convoySprites.get(c.id);
      if (!sp) { sp = convoySprite(c); sp.path = convoyPath(c.from, c.route_ids, c.to); convoySprites.set(c.id, sp); convoyC.addChild(sp); }
      const span = Math.max(STEP, c.arrive_t - c.depart_t), prog = clamp((simT - c.depart_t) / span, 0, 1);
      let dist = prog * sp.path.len, back = false;
      if (c.status === 'returning' || c.status === 'returned') { const turnProg = clamp(((c.turn_t ?? simT) - c.depart_t) / span, 0, 1); const turnDist = turnProg * sp.path.len; if (simT >= (c.turn_t ?? simT)) { const rspan = Math.max(STEP, (c.return_t ?? (c.turn_t + span)) - c.turn_t); dist = Math.max(0, turnDist * (1 - clamp((simT - c.turn_t) / rspan, 0, 1))); back = true; } else dist = Math.min(dist, turnDist); }
      const at = pointAlong(sp.path, dist);
      sp.position.set(at.x, at.y); sp.scale.set(clamp(1.15 / zoom, 0.7, 2));
      const moving = (c.status === 'moving' && prog < 1) || back;
      sp.body.rotation = moving ? at.angle + (back ? Math.PI : 0) : 0;
      sp.glow.alpha = moving ? 0.3 : 0.5 + 0.3 * Math.sin(now * 5);
      sp.body.tint = back ? 0xff8a80 : 0xffffff;
      sp.alpha = c.end_t != null ? clamp(1 - (simT - c.end_t) / 20, 0, 1) : c.status === 'moving' && simT > c.arrive_t ? clamp(1 - (simT - c.arrive_t) / 30, 0, 1) : 1;
      sp.visible = !(w.isFogged(c.from) && w.isFogged(c.to));
    }
  }
  function updatePings(dt, zoom) {
    pingG.clear();
    for (const p of R.pings) p.age += dt;
    R.pings = R.pings.filter(p => p.age < PING[p.kind].life);
    for (const p of R.pings) {
      const P = PING[p.kind], f = p.age / P.life, rings = p.kind === 'mayday' ? 3 : 2;
      for (let k = 0; k < rings; k++) { const fk = clamp(f - k * 0.18, 0, 1); if (fk <= 0) continue; pingG.circle(p.x, p.y, (P.r * fk + 6) / zoom).stroke({ width: 2 / zoom, color: P.color, alpha: (1 - fk) * 0.9 }); }
      pingG.circle(p.x, p.y, 4 / zoom).fill({ color: P.color, alpha: 1 - f });
      if (p.to) { pingG.moveTo(p.x, p.y).lineTo(p.to.x, p.to.y).stroke({ width: 1.5 / zoom, color: P.color, alpha: 0.7 * (1 - f) }); pingG.circle(p.to.x, p.to.y, 5 / zoom).stroke({ width: 1.5 / zoom, color: P.color, alpha: 0.8 * (1 - f) }); }
    }
  }
  // minimap
  const MM = 180, MM_FROM = 500, MM_SPAN = 1800, mmS = MM / MM_SPAN;
  const mm = new PIXI.Container(); const mmBg = new PIXI.Graphics(); mmBg.rect(0, 0, MM, MM).fill({ color: 0x0b1420, alpha: 0.95 }).stroke({ width: 1, color: 0x273141 });
  const mmIsland = new PIXI.Sprite(islandTex); mmIsland.position.set((PAD - MM_FROM) * mmS, (PAD - MM_FROM) * mmS); mmIsland.width = IMG * mmS; mmIsland.height = IMG * mmS; mmIsland.tint = 0x8c9aa8;
  const mmTerr = new PIXI.Graphics(), mmDyn = new PIXI.Graphics(), mmView = new PIXI.Graphics();
  mm.addChild(mmBg, mmIsland, mmTerr, mmDyn, mmView);
  const mmPt = p => ({ x: (p.x - MM_FROM) * mmS, y: (p.y - MM_FROM) * mmS });
  function drawMinimapStatic() { mmTerr.clear(); for (const p of PIDS) { const pts = polys[p].map(v => (v - MM_FROM) * mmS); const fog = fogged(p); mmTerr.poly(pts, true).fill({ color: GEO[p].color, alpha: fog ? 0.05 : 0.22 }).stroke({ width: 1, color: GEO[p].color, alpha: fog ? 0.3 : 0.8 }); } }
  function updateMinimap() {
    mm.visible = R.minimap; if (!R.minimap) return;
    const w = R.world, a = w && w.tick; mmDyn.clear();
    if (a) {
      for (const p of PIDS) { if (w.isFogged(p)) continue; const rep = w.report(p); if (rep && rep.isolated) { const q = mmPt(anchorOf(p)); mmDyn.circle(q.x, q.y, 4).stroke({ width: 1.5, color: 0xe0524f, alpha: 0.9 }); } }
      if (a.weather && a.weather.hurricane_position) { const q = mmPt(toWorld(a.weather.hurricane_position)), P = stormParams(Math.max(a.weather.wind_kts || 0, stormStrength(w, idx(w.viewT)))); mmDyn.circle(q.x, q.y, Math.max(3, P.outer * mmS)).fill({ color: 0xee7d6a, alpha: 0.22 }).stroke({ width: 1, color: 0xee7d6a, alpha: 0.8 }); mmDyn.circle(q.x, q.y, 2.5).fill(0xffd9d2); }
      for (const p of R.pings) { const q = mmPt(p); mmDyn.circle(q.x, q.y, 3).fill({ color: PING[p.kind].color, alpha: 0.9 * (1 - p.age / PING[p.kind].life) }); }
      for (const sp of convoySprites.values()) { const q = mmPt(sp.position); mmDyn.circle(q.x, q.y, 2).fill({ color: sp.col, alpha: sp.visible ? 1 : 0 }); }
    }
    const v = cam.visibleWorldRect(); mmView.clear();
    const x0 = (v.x - MM_FROM) * mmS, y0 = (v.y - MM_FROM) * mmS, ww = v.w * mmS, hh = v.h * mmS;
    mmView.rect(clamp(x0, 0, MM), clamp(y0, 0, MM), clamp(ww, 0, MM - clamp(x0, 0, MM)), clamp(hh, 0, MM - clamp(y0, 0, MM))).stroke({ width: 1.2, color: 0xffffff, alpha: 0.75 });
  }
  app.stage.addChild(scene, mm);
  // camera
  const cam = {
    x: CENTER.x, y: CENTER.y, z: 0.6, tx: CENTER.x, ty: CENTER.y, tz: 0.6, minZ: 0.25, maxZ: 4, dragging: false,
    safeCenter() { const i = R.insets(), w = app.screen.width, h = app.screen.height; return { x: (i.l + (w - i.r)) / 2, y: (i.t + (h - i.b)) / 2 }; },
    fit(span = 1560) { const i = R.insets(), w = Math.max(200, app.screen.width - i.l - i.r), h = Math.max(200, app.screen.height - i.t - i.b); this.tz = clamp(Math.min(w / span, h / span), this.minZ, this.maxZ); this.tx = CENTER.x; this.ty = CENTER.y; },
    clampTarget() {
      const w = app.screen.width, h = app.screen.height, hw = w / 2 / this.tz, hh = h / 2 / this.tz;
      this.tx = hw * 2 >= WORLD ? WORLD / 2 : clamp(this.tx, hw - 120, WORLD - hw + 120);
      this.ty = hh * 2 >= WORLD ? WORLD / 2 : clamp(this.ty, hh - 120, WORLD - hh + 120);
    },
    zoomAt(sx, sy, factor) {
      const c = this.safeCenter(), z0 = this.tz, z1 = clamp(z0 * factor, this.minZ, this.maxZ);
      const wx = this.tx + (sx - c.x) / z0, wy = this.ty + (sy - c.y) / z0;
      this.tz = z1; this.tx = wx - (sx - c.x) / z1; this.ty = wy - (sy - c.y) / z1; this.clampTarget();
    },
    focus(pid, z = 1.5) { const a = anchorOf(pid); this.tx = a.x; this.ty = a.y + 40; this.tz = clamp(Math.max(this.tz, z), this.minZ, this.maxZ); this.clampTarget(); },
    update(dt) {
      this.clampTarget();
      const k = this.dragging ? 1 : 1 - Math.exp(-dt / 0.14);
      this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * (this.dragging ? 1 - Math.exp(-dt / 0.14) : k);
      const c = this.safeCenter();
      scene.position.set(c.x - this.x * this.z, c.y - this.y * this.z); scene.scale.set(this.z);
      const i = R.insets(); mm.position.set(i.l, app.screen.height - MM - i.b);
    },
    toWorld(sx, sy) { return { x: (sx - scene.position.x) / this.z, y: (sy - scene.position.y) / this.z }; },
    visibleWorldRect() { const w = app.screen.width / this.z, h = app.screen.height / this.z; return { x: -scene.position.x / this.z, y: -scene.position.y / this.z, w, h }; },
  };
  R.cam = cam;
  const cv = app.canvas; let down = null, moved = false, lastTap = 0;
  const hitParish = (sx, sy) => { const p = cam.toWorld(sx, sy); for (const id of PIDS) if (pointInPoly(polys[id], p.x, p.y)) return id; return null; };
  const inMinimap = (sx, sy) => R.minimap && sx >= mm.position.x && sx <= mm.position.x + MM && sy >= mm.position.y && sy <= mm.position.y + MM;
  const minimapGo = (sx, sy) => { cam.tx = MM_FROM + (sx - mm.position.x) / mmS; cam.ty = MM_FROM + (sy - mm.position.y) / mmS; cam.clampTarget(); };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY, cx: cam.tx, cy: cam.ty, mm: inMinimap(e.clientX, e.clientY) }; moved = false; if (down.mm) minimapGo(e.clientX, e.clientY); });
  cv.addEventListener('pointermove', e => {
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 4) moved = true;
      if (down.mm) { minimapGo(e.clientX, e.clientY); return; }
      if (moved) { cam.dragging = true; cam.tx = down.cx - dx / cam.z; cam.ty = down.cy - dy / cam.z; cam.clampTarget(); }
      return;
    }
    const h = inMinimap(e.clientX, e.clientY) ? null : hitParish(e.clientX, e.clientY);
    if (h !== R.hover) { R.hover = h; drawAllTerritories(); cv.style.cursor = h ? 'pointer' : 'grab'; }
  });
  const up = e => {
    if (!down) return;
    const wasMm = down.mm; down = null; cam.dragging = false;
    if (wasMm || moved) return;
    const h = hitParish(e.clientX, e.clientY), now = performance.now();
    if (h && now - lastTap < 350 && R.selected === h) cam.focus(h);
    lastTap = now;
    R.select(h);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { down = null; cam.dragging = false; });
  cv.addEventListener('pointerleave', () => { if (!down) { R.hover = null; drawAllTerritories(); } });
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0014)); }, { passive: false });
  cv.style.cursor = 'grab';
  // frame loop. 30 fps is plenty for a map (24 under reduced motion); when nothing moves (the lobby, a pause,
  // a closed quarter, no ping, no touch for a while) the loop idles at 8 fps so a tablet's battery and a shared
  // GPU are not spent on a still picture.
  R.wake = performance.now();
  for (const ev of ['pointerdown', 'pointermove', 'wheel']) cv.addEventListener(ev, () => { R.wake = performance.now(); }, { passive: true });
  addEventListener('resize', () => { R.wake = performance.now(); });
  const busyNow = () => { const w = R.world; return (w && (w.running || w.scrub != null)) || R.pings.length > 0 || performance.now() - R.wake < 1500; };
  const fpsFor = () => busyNow() ? (REDUCE ? 24 : 30) : 8;
  app.ticker.maxFPS = fpsFor();
  app.ticker.remove(app.render, app);                 // the loop below decides when a frame is worth drawing
  let elapsed = 0, lastNow = performance.now(), fpsAcc = 0, fpsN = 0, measuring = null, drawn = 0;
  app.ticker.add(tk => {
    const now = performance.now(), realMs = now - lastNow; lastNow = now;
    app.ticker.maxFPS = fpsFor();
    const dt = Math.min(0.1, tk.deltaMS / 1000); elapsed += dt; fpsAcc += realMs; fpsN++;
    if (measuring) { measuring.samples.push(realMs); if (now >= measuring.until) { const m = measuring; measuring = null; m.resolve(m.samples); } }
    cam.update(dt);
    const w = R.world;
    if (w && w.tick) { drawRoads(); drawLabels(); drawTrail(); }
    const lscale = clamp(1 / cam.z, 0.55, 1.7);
    for (const p of PIDS) labels[p].c.scale.set(lscale);
    for (const t of Object.values(routeLabels)) if (t.visible) t.scale.set(lscale);
    updateStorm(dt);
    updateConvoys(w ? w.nowT : T_START, cam.z, elapsed);
    updatePings(dt, cam.z);
    hiG.alpha = REDUCE ? 1 : 0.55 + 0.45 * Math.sin(elapsed * 3);
    updateMinimap();
    if (busyNow() || drawn < 3) { app.render(); drawn++; R.drawn = drawn; }   // a still map is not redrawn
    if (fpsN >= 30) { R.fps = 1000 / (fpsAcc / fpsN); fpsAcc = 0; fpsN = 0; }
  });
  R.measure = ms => new Promise(resolve => { measuring = { until: performance.now() + ms, samples: [], resolve }; });
  R.redraw = () => { drawAllTerritories(); drawMinimapStatic(); labelsKey = ''; roadsKey = ''; roadsG.__drawn = false; R.wake = performance.now(); };
  R.select = pid => { R.selected = pid; drawAllTerritories(); R.wake = performance.now(); if (R.onSelect) R.onSelect(pid); };
  R.setWorld = world => {
    R.world = world;
    world.on('tick', () => { R.redraw(); R.wake = performance.now(); });
    world.on('snapshot', () => { R.redraw(); trailKey = -1; R.wake = performance.now(); });
    world.on('change', () => { R.wake = performance.now(); });
    world.on('event', (t, e) => { const p = pingFor(e); if (p) R.pings.push({ ...p, age: 0 }); });
    R.redraw();
  };
  R.ready = true; R.timing.total = Math.round(performance.now() - t0);
  return R;
}
