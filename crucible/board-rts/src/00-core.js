/* ============================================================================
   Values Crucible client: one bundle, four roles (table, phone, projector, dm) plus the printed pack.

   engine (WASM, in the host) → protocol frames → transport → Client → World → renderer + role UI
   The client never decides an outcome. It sends intents; the host assigns them a tick, appends them to the
   input log and re-runs the deterministic core; everything on screen comes back as engine events.
   ============================================================================ */
const DATA = JSON.parse(document.getElementById('board-data').textContent);
const PROFILE = DATA.session;
const PARISHES = DATA.parishes;
const PIDS = PARISHES.map(p => p.id);
const PARISH = Object.fromEntries(PARISHES.map(p => [p.id, p]));
const ROSTER = PROFILE.roster || PIDS;
const STEP = 15;                          // simulation minutes per tick (ENGINE_SPEC)
const T_START = -4320, T_END = 2880;      // T-72h to T+48h with current content
const N_TICKS = (T_END - T_START) / STEP + 1;
const Q = new URLSearchParams(location.search);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LITE = Q.get('lite') === '1';
const AA = Q.get('aa') !== '0';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, f) => a + (b - a) * f;
const fmt = n => Math.round(n).toLocaleString('en-US');
const clockStr = t => { const s = t < 0 ? '-' : '+'; const a = Math.abs(Math.round(t)); return 'T' + s + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); };
const mmss = sec => { const s = Math.max(0, Math.round(sec)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const pname = id => (PARISH[id] || { name: id === 'mainland' ? 'the mainland' : id }).name;
const idx = t => clamp(Math.round((t - T_START) / STEP), 0, N_TICKS - 1);
const tOf = i => T_START + i * STEP;
const SYSTEMS = ['power', 'communications', 'roads', 'water', 'hospital'];
const SYS_LABEL = { power: 'Power', communications: 'Comms', roads: 'Roads', water: 'Water', hospital: 'Hospital', port: 'Port', airport: 'Airport' };
const status = v => v >= 80 ? 'ok' : v >= 60 ? 'reduced' : v >= 40 ? 'degraded' : v >= 20 ? 'critical' : 'failed';
const STATUS_HEX = { ok: 0x4fb06f, reduced: 0xb4b44a, degraded: 0xe0a93a, critical: 0xec7a44, failed: 0xe0524f };
const FAILED = 20;                        // the engine's failed threshold: below it a system is out
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const letterOf = (dilemmaId, optionId) => { const d = DATA.dilemmas[dilemmaId]; const i = d ? d.options.findIndex(o => o.id === optionId) : -1; return i >= 0 ? LETTERS[i] : String(optionId || '').toUpperCase(); };
const RES_STATES = ['safe', 'sheltered', 'at_risk', 'rescued', 'injured', 'lost'];
const RES_LABEL = { safe: 'safe', sheltered: 'sheltered', at_risk: 'at risk', rescued: 'rescued', injured: 'injured', lost: 'lost' };
const CALL = Object.fromEntries(DATA.calls.map(c => [c.id, c]));
const ROUTE = Object.fromEntries(DATA.routes.map(r => [r.id, r]));
const CARDS_BY_PARISH = Object.fromEntries(PIDS.map(p => [p, DATA.residentCards.filter(c => c.parish === p)]));
const DECK = PROFILE.valuesDeck || Object.keys(DATA.valueDefs).slice(0, 12);
const vname = id => (DATA.valueDefs[id] || { name: id }).name;
const persona = id => DATA.personas[id] || null;
const QUARTERS = PROFILE.quarters.map((q, k) => ({ ...q, index: k, ticks: (q.toT - q.fromT) / STEP, name: q.title.replace(/^Quarter \d+:\s*/, ''), short: 'Q' + (k + 1) }));
const quarterAt = t => QUARTERS.reduce((q, x) => t > x.fromT ? x : q, QUARTERS[0]);
const quarterOfTick = t => t <= T_START ? QUARTERS[0] : quarterAt(t);
const EYE_FROM = 0, EYE_TO = 120;         // the eye passes T+0 to T+2h (concordia-storm-quarters)
const BASE_POPULATION = DATA.population;
const WORLD_DOSES_NEEDED = 170000;        // the world needs 170,000 doses a week
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const randId = (n = 12) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
// Session codes: six symbols from a 32-symbol alphabet without ambiguous glyphs (experience flow 7.3).
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // PROTOCOL.md section 3: no 0, 1, I or O
const makeCode = rng => Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor((rng ? rng() : Math.random()) * CODE_ALPHABET.length)]).join('');
const store = {
  get(k, d) { try { const v = localStorage.getItem('crucible.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('crucible.' + k, JSON.stringify(v)); } catch (e) { /* private window or blocked storage: the page still works */ } },
};
// one id per browser tab (survives a reload, not the tab): phones and lobby joins in the same browser stay separate devices
function tabId() { try { let t = sessionStorage.getItem('crucible.tab'); if (!t) { t = randId(4); sessionStorage.setItem('crucible.tab', t); } return t; } catch (e) { return 'tab'; } }

/* ---------- engine (WebAssembly, embedded; used by the in-page host and the self-check) ---------- */
const Engine = {
  wasm: null,
  async init() {
    if (this.wasm) return;
    const b64 = $('wasm-b64').textContent.trim();
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    this.wasm = (await WebAssembly.instantiate(bytes, {})).instance.exports;
  },
  call(fn, text) {
    const w = this.wasm, enc = new TextEncoder().encode(text);
    const p = w.crucible_alloc(enc.length);
    new Uint8Array(w.memory.buffer, p, enc.length).set(enc);
    const r = w[fn](p, enc.length);
    w.crucible_free(p, enc.length);
    const rp = Number(r >> 32n), rl = Number(r & 0xffffffffn);
    const out = new TextDecoder().decode(new Uint8Array(w.memory.buffer, rp, rl));
    w.crucible_free(rp, rl);
    return out;
  },
  run(req) { const out = JSON.parse(this.call('crucible_run', JSON.stringify(req))); if (out.error) throw new Error(out.error); return out; },
  version() { const r = this.wasm.crucible_version(); const rp = Number(r >> 32n), rl = Number(r & 0xffffffffn); const out = new TextDecoder().decode(new Uint8Array(this.wasm.memory.buffer, rp, rl)); this.wasm.crucible_free(rp, rl); return JSON.parse(out); },
};

/* ---------- QR codes (byte mode, EC level M, versions 1–10) for the join links; offline, no library ---------- */
const QR = (() => {
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;
  // version → [total codewords, EC codewords per block, blocks group 1, data cw group 1, blocks group 2, data cw group 2] for level M
  const EC_M = { 1: [26, 10, 1, 16, 0, 0], 2: [44, 16, 1, 28, 0, 0], 3: [70, 26, 1, 44, 0, 0], 4: [100, 18, 2, 32, 0, 0], 5: [134, 24, 2, 43, 0, 0], 6: [172, 16, 4, 27, 0, 0], 7: [196, 18, 4, 31, 0, 0], 8: [242, 22, 2, 38, 2, 39], 9: [292, 22, 3, 36, 2, 37], 10: [346, 26, 4, 43, 1, 44] };
  const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  function rsEncode(data, n) {
    let gen = [1];
    for (let i = 0; i < n; i++) { const next = new Array(gen.length + 1).fill(0); for (let j = 0; j < gen.length; j++) { next[j] ^= gen[j]; next[j + 1] ^= mul(gen[j], EXP[i]); } gen = next; }
    const res = new Array(n).fill(0);
    for (const b of data) { const f = b ^ res[0]; res.shift(); res.push(0); if (f) for (let j = 0; j < n; j++) res[j] ^= mul(gen[j + 1], f); }
    return res;
  }
  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let ver = 1; while (ver <= 10) { const [tot, ec, b1, d1, b2, d2] = EC_M[ver]; const cap = b1 * d1 + b2 * d2; if (cap - 2 - (ver >= 10 ? 1 : 0) >= bytes.length) break; ver++; }
    if (ver > 10) throw new Error('text too long for a version-10 QR');
    const [tot, ecn, b1, d1, b2, d2] = EC_M[ver], dataCw = b1 * d1 + b2 * d2;
    const bits = [];
    const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    push(4, 4); push(bytes.length, ver >= 10 ? 16 : 8); for (const b of bytes) push(b, 8);
    push(0, Math.min(4, dataCw * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let k = 0; data.length < dataCw; k++) data.push(k % 2 ? 0x11 : 0xec);
    const blocks = [], ecs = []; let off = 0;
    for (let b = 0; b < b1 + b2; b++) { const len = b < b1 ? d1 : d2; const blk = data.slice(off, off + len); off += len; blocks.push(blk); ecs.push(rsEncode(blk, ecn)); }
    const out = [];
    const maxD = Math.max(d1, d2); for (let i = 0; i < maxD; i++) for (const blk of blocks) if (i < blk.length) out.push(blk[i]);
    for (let i = 0; i < ecn; i++) for (const e of ecs) out.push(e[i]);
    const size = 17 + ver * 4, m = Array.from({ length: size }, () => new Int8Array(size).fill(-1)), fixed = Array.from({ length: size }, () => new Uint8Array(size));
    const set = (x, y, v) => { m[y][x] = v; fixed[y][x] = 1; };
    const finder = (x0, y0) => { for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) { const xx = x0 + x, yy = y0 + y; if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue; const on = (x >= 0 && x <= 6 && y >= 0 && y <= 6) && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)); set(xx, yy, on ? 1 : 0); } };
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
    for (let i = 8; i < size - 8; i++) { set(i, 6, i % 2 === 0 ? 1 : 0); set(6, i, i % 2 === 0 ? 1 : 0); }
    if (ALIGN[ver]) for (const cx of ALIGN[ver]) for (const cy of ALIGN[ver]) { if (fixed[cy][cx]) continue; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(cx + x, cy + y, (Math.max(Math.abs(x), Math.abs(y)) !== 1) ? 1 : 0); }
    for (let i = 0; i < 8; i++) { set(8, i, 0); set(i, 8, 0); set(size - 1 - i, 8, 0); set(8, size - 1 - i, 0); } set(8, 8, 0); set(8, size - 8, 1);
    if (ver >= 7) { // version information
      let v = ver << 12, g = 0x1f25; for (let i = 17; i >= 12; i--) if (v & (1 << i)) v ^= g << (i - 12); v |= ver << 12;
      for (let i = 0; i < 18; i++) { const bit = (v >> i) & 1; set(Math.floor(i / 3), size - 11 + (i % 3), bit); set(size - 11 + (i % 3), Math.floor(i / 3), bit); }
    }
    // data placement
    let bi = 0; const total = out.length * 8;
    const bitAt = k => k < total ? (out[k >> 3] >> (7 - (k & 7))) & 1 : 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const up = ((right + 1) & 2) === 0;
      for (let k = 0; k < size; k++) { const y = up ? size - 1 - k : k; for (const x of [right, right - 1]) if (!fixed[y][x]) { m[y][x] = bitAt(bi++); } }
    }
    const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0, (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
    function applyMask(mask) { const g = m.map(r => Int8Array.from(r)); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[mask](x, y)) g[y][x] ^= 1; writeFormat(g, mask); return g; }
    function writeFormat(g, mask) {
      let f = (0 << 3) | mask; f = (0b00 << 3) | mask; // level M is 00
      let v = f << 10; const gen = 0x537; for (let i = 14; i >= 10; i--) if (v & (1 << i)) v ^= gen << (i - 10); v = ((f << 10) | v) ^ 0x5412;
      for (let i = 0; i < 15; i++) { const bit = (v >> i) & 1;
        if (i < 6) g[i][8] = bit; else if (i === 6) g[7][8] = bit; else if (i === 7) g[8][8] = bit; else if (i === 8) g[8][7] = bit; else g[8][14 - i] = bit;
        if (i < 8) g[8][size - 1 - i] = bit; else g[size - 15 + i][8] = bit;
      }
    }
    function penalty(g) {
      let p = 0;
      for (let y = 0; y < size; y++) { let run = 1; for (let x = 1; x < size; x++) { if (g[y][x] === g[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (let x = 0; x < size; x++) { let run = 1; for (let y = 1; y < size; y++) { if (g[y][x] === g[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (let y = 0; y + 1 < size; y++) for (let x = 0; x + 1 < size; x++) { const v = g[y][x]; if (v === g[y][x + 1] && v === g[y + 1][x] && v === g[y + 1][x + 1]) p += 3; }
      let dark = 0; for (const r of g) for (const v of r) dark += v; const pct = dark * 100 / (size * size); p += Math.floor(Math.abs(pct - 50) / 5) * 10;
      return p;
    }
    let best = null, bestP = Infinity;
    for (let mk = 0; mk < 8; mk++) { const g = applyMask(mk); const p = penalty(g); if (p < bestP) { bestP = p; best = g; } }
    return { size, modules: best };
  }
  function draw(canvas, text, scale = 4) {
    const { size, modules } = encode(text);
    canvas.width = canvas.height = size * scale;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x] === 1) ctx.fillRect(x * scale, y * scale, scale, scale);
    return canvas;
  }
  return { encode, draw };
})();
