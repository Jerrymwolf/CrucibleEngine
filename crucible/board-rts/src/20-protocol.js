/* ---------- protocol v1 (docs/PROTOCOL.md) ----------
   Frames are JSON objects { v: 1, type, ... }. The host is authoritative; clients send intents and
   render what the host sends. One transport interface carries the frames over three media:
     LoopbackTransport   the in-page host (single device, rehearsal, the self-check)
     ChannelTransport    a BroadcastChannel to an in-page host in another window of this browser
     WebSocketTransport  crucible-host on the LAN (ws://) or in the cloud (wss://)
   A transport reports its state ('connecting' | 'open' | 'closed' | 'nohost') and delivers frames
   in order. The Client above it owns the hello, the seat, the intent counter and reconnects. */
const PROTO_V = 1;
const CHANNEL_NAME = 'crucible-session';
const mkFrame = (type, fields) => Object.assign({ v: PROTO_V, type }, fields || {});

class Emitter {
  constructor() { this._h = {}; }
  on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); return () => { this._h[ev] = (this._h[ev] || []).filter(f => f !== fn); }; }
  emit(ev, ...args) { for (const fn of (this._h[ev] || []).slice()) { try { fn(...args); } catch (e) { console.error(`[${ev}]`, e); } } }
}

class BaseTransport extends Emitter {
  constructor() { super(); this.state = 'closed'; this.queue = []; }
  setState(s, info) { if (this.state === s && s !== 'open') return; this.state = s; this.emit('state', s, info); }
  deliver(frame) { this.emit('frame', frame); }
  flush(sendNow) { const q = this.queue.splice(0); for (const f of q) sendNow(f); }
}

/* Loopback: the host lives in this page. Delivery is asynchronous (a microtask) so the UI sees the
   same send-then-answer ordering it would over a wire. */
class LoopbackTransport extends BaseTransport {
  constructor(host) { super(); this.host = host; this.key = 'loop:' + randId(4); }
  connect() {
    this.host.attach(this.key, f => queueMicrotask(() => this.deliver(f)), () => this.setState('closed'));
    this.setState('open');
  }
  send(f) { if (this.state !== 'open') { this.queue.push(f); return; } queueMicrotask(() => this.host.receive(this.key, f)); }
  close() { this.host.detach(this.key); this.setState('closed'); }
}

/* BroadcastChannel: an in-page host in another window of the same browser (the DM laptop driving a
   projector window, or the check driving every role). Messages are { to, from, frame | probe | ready | bye }. */
class ChannelTransport extends BaseTransport {
  constructor(name = CHANNEL_NAME) { super(); this.name = name; this.id = 'ch_' + randId(4); this.wait = 700; }
  connect() {
    if (typeof BroadcastChannel === 'undefined') { this.setState('nohost', 'no BroadcastChannel'); return; }
    this.bc = new BroadcastChannel(this.name);
    this.bc.onmessage = ev => {
      const m = ev.data; if (!m || (m.to !== this.id && m.to !== '*')) return;
      if (m.ready) { clearTimeout(this.timer); this.wait = 700; if (this.state !== 'open') { this.setState('open'); this.flush(f => this.bc.postMessage({ to: 'host', from: this.id, frame: f })); } return; }
      if (m.bye) { this.setState('closed'); this.retry(); return; }
      if (m.frame && m.to === this.id) this.deliver(m.frame);
    };
    this.setState('connecting');
    this.probe();
  }
  probe() {
    if (this.closed) return;
    this.bc.postMessage({ to: 'host', from: this.id, probe: true });
    this.timer = setTimeout(() => { if (this.state !== 'open') { this.setState('nohost'); this.retry(); } }, this.wait);
  }
  retry() { if (this.closed) return; clearTimeout(this.timer); this.timer = setTimeout(() => { this.setState('connecting'); this.probe(); }, this.wait); this.wait = Math.min(5000, this.wait * 2); }
  send(f) { if (this.state === 'open') this.bc.postMessage({ to: 'host', from: this.id, frame: f }); else this.queue.push(f); }
  close() { this.closed = true; clearTimeout(this.timer); if (this.bc) { this.bc.postMessage({ to: 'host', from: this.id, bye: true }); this.bc.close(); } this.setState('closed'); }
}

/* WebSocket: crucible-host. Reconnects with backoff, 1 s doubling to 4 s, and pings every 10 s: a link silent
   for 25 s is closed and retried, so a half-open Wi-Fi link does not keep showing "linked" (PROTOCOL.md 10). */
class WebSocketTransport extends BaseTransport {
  constructor(url) { super(); this.url = url; this.backoff = 1000; }
  connect() {
    this.closed = false; clearTimeout(this.timer);
    this.setState('connecting');
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { this.setState('closed', String(e.message || e)); this.scheduleRetry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.backoff = 1000; this.heard = Date.now(); this.setState('open'); this.flush(f => ws.send(JSON.stringify(f))); this.beat(ws); };
    ws.onmessage = ev => { this.heard = Date.now(); let f; try { f = JSON.parse(ev.data); } catch (e) { return; } this.deliver(f); };
    ws.onclose = ev => { clearInterval(this.pinger); if (this.ws !== ws) return; this.ws = null; this.setState('closed', ev.reason || `code ${ev.code}`); this.scheduleRetry(); };
    ws.onerror = () => { /* onclose follows */ };
  }
  beat(ws) { clearInterval(this.pinger); this.pinger = setInterval(() => { if (this.ws !== ws) return clearInterval(this.pinger); if (Date.now() - this.heard > 25000) { ws.close(4000, 'no answer from the host'); return; } if (ws.readyState === 1) ws.send(JSON.stringify({ v: 1, type: 'ping' })); }, 10000); }
  scheduleRetry() { if (this.closed) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(4000, this.backoff * 2); }
  send(f) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(f)); else this.queue.push(f); }
  close() { this.closed = true; clearTimeout(this.timer); clearInterval(this.pinger); const ws = this.ws; this.ws = null; if (ws) ws.close(); this.setState('closed'); }
}

/* The client side of the protocol: hello, seat, intents with a per-device counter, acks, resync on
   a gap, reconnect with the same client_id. Emits: snapshot (welcome | admitted | snapshot frames),
   state, phase, lobby, waiting, roster, intent_result, error, reload, conn. */
class Client extends Emitter {
  constructor(transport, opts = {}) {
    super();
    this.tr = transport;
    this.opts = opts;                            // session_code, token, role, pin, name, code and scope (for storage)
    this.storeKey = Client.keyFor(opts.code || opts.session_code, opts.scope);
    const saved = store.get(this.storeKey, null) || {};
    this.client_id = saved.client_id || null;
    this.resume_token = saved.resume_token || null;
    this.client_seq = saved.client_seq || 0;
    this.last_seq = 0;
    this.pending = new Map();                     // client_seq -> { frame, resolve }
    this.welcomed = false;
    this.role = null; this.parish = null;
    this.hellos = 0;
  }
  /* One stored identity per session, role and seat, so a DM tab, a projector tab and a table tab in the
     same browser are three devices to the host, and a reload of any of them resumes its own seat. */
  static keyFor(code, scope) { return 'client.' + (code || 'local') + (scope ? '.' + scope : ''); }
  connect() {
    this.tr.on('state', (s, info) => {
      this.emit('conn', s, info);
      if (s === 'open') this.hello();
      else this.welcomed = false;
    });
    this.tr.on('frame', f => this.onFrame(f));
    this.tr.connect();
  }
  close() { this.tr.close(); }
  save() { store.set(this.storeKey, { client_id: this.client_id, resume_token: this.resume_token, client_seq: this.client_seq }); }
  forget() { this.client_id = null; this.resume_token = null; this.save(); }
  hello() {
    const o = this.opts, h = {};
    if (o.session_code) h.session_code = o.session_code;
    if (o.token) h.token = o.token;
    if (o.role) h.role = o.role;
    if (o.pin) h.pin = o.pin;
    if (this.client_id && this.resume_token) { h.client_id = this.client_id; h.resume_token = this.resume_token; h.last_seq = this.last_seq; }
    if (o.name) h.name = o.name;
    this.hellos++;
    this.tr.send(mkFrame('hello', h));
  }
  claimSeat(parish, role) { this.opts.claim = { parish, role }; this.tr.send(mkFrame('claim_seat', { parish, role })); }
  intent(kind, payload) {
    const client_seq = ++this.client_seq; this.save();
    const frame = mkFrame('intent', { client_seq, kind, payload: payload || {} });
    return new Promise(resolve => {
      this.pending.set(client_seq, { frame, resolve });
      if (this.welcomed) this.tr.send(frame);
    });
  }
  ping() { this.tr.send(mkFrame('ping')); }
  resend() { for (const p of this.pending.values()) this.tr.send(p.frame); }
  applySnapshot(f) {
    const snap = f.snapshot || {};
    if (f.client_id) { this.client_id = f.client_id; this.resume_token = f.resume_token || this.resume_token; this.save(); }
    if (f.role) this.role = f.role;
    if (f.parish !== undefined) this.parish = f.parish;
    this.last_seq = snap.seq || 0;
    this.welcomed = true;
    this.emit('snapshot', snap, f);
    this.resend();
  }
  onFrame(f) {
    if (!f || f.v !== PROTO_V) return;
    switch (f.type) {
      case 'welcome': case 'admitted': this.applySnapshot(f); break;
      case 'snapshot': this.last_seq = (f.snapshot || {}).seq || this.last_seq; this.emit('snapshot', f.snapshot || {}, f); break;
      case 'lobby': this.welcomed = false; this.emit('lobby', f); if (this.opts.claim) this.claimSeat(this.opts.claim.parish, this.opts.claim.role); break;
      case 'waiting': this.emit('waiting', f); break;
      case 'state': case 'phase':
        if (f.seq <= this.last_seq) return;                       // a repeat after a resync
        if (f.seq > this.last_seq + 1) { this.tr.send(mkFrame('resync', { from_seq: this.last_seq })); return; }
        this.last_seq = f.seq;
        this.emit(f.type, f);
        this.tr.send(mkFrame('ack', { seq: f.seq }));
        break;
      case 'intent_result': {
        const p = this.pending.get(f.client_seq);
        if (p) { this.pending.delete(f.client_seq); p.resolve(f); }
        this.emit('intent_result', f);
        break;
      }
      case 'roster': this.emit('roster', f); break;
      case 'error':
        if (f.code === 'unknown_client') { this.forget(); this.hello(); }
        this.emit('error', f);
        break;
      case 'reload': this.emit('reload', f); break;
      case 'pong': this.emit('pong', f); break;
      default: this.emit('unknown', f);
    }
  }
}
