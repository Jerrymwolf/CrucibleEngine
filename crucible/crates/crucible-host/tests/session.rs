//! Six simulated table consoles, their phones, the projector and a DM over
//! real WebSockets on localhost play a whole 90-minute session to the end.
//! What this proves: the exported run log replays to the host's final hash;
//! two runs with the same inputs are byte-identical; reconnect, late join,
//! the lobby and the seat hand-over work; and the filtering holds (no secret
//! brief and no fogged parish data reaches another table).

use crucible_core::log::{Event, RunLog};
use crucible_core::{replay, Content};
use crucible_host::session::{export_offline, run_bounds, Host, Mode};
use crucible_host::{App, Limits, Profile};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

type Socket = WebSocketStream<MaybeTlsStream<TcpStream>>;

const WAIT: Duration = Duration::from_secs(60);
/// Ticks per DM `advance` in each quarter: short enough that a card or a call
/// seen at the next state can still be answered before its deadline (the
/// landfall quarter gives holders nine ticks).
const CHUNKS: [i64; 4] = [12, 12, 6, 12];
/// The content's FAILED threshold for communications: at or below it a parish is out of contact.
const COMMS_FAILED: i64 = 20;

fn content_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content")
}

fn content() -> Arc<Content> {
    Arc::new(Content::load(&content_dir()).expect("content loads"))
}

fn temp_dir(tag: &str) -> PathBuf {
    std::env::temp_dir().join(format!("crucible-host-{tag}-{}-{}", std::process::id(), crucible_host::codes::new_token()))
}

fn new_host(content: &Arc<Content>, speed: f64, sessions_dir: Option<&Path>) -> Host {
    let raw = Profile::load(&content_dir(), "parish-90").expect("profile");
    let (t_start, t_end) = run_bounds(content);
    let profile = Profile::parse(content, &raw, t_start, t_end).expect("profile parses");
    Host::create(content.clone(), profile, raw, 42, Mode::Lan, "test-bundle".into(), "http://127.0.0.1:0".into(), speed, sessions_dir).expect("host")
}

struct Server {
    app: Arc<App>,
    port: u16,
}

async fn start(host: Host) -> Server {
    let app = Arc::new(App::new(host, None, "none", Limits::default()));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("bind");
    let port = listener.local_addr().expect("addr").port();
    tokio::spawn(crucible_host::server::serve(app.clone(), listener));
    tokio::spawn(crucible_host::server::tick_loop(app.clone()));
    Server { app, port }
}

/// A plain HTTP/1.1 GET, so the test adds no HTTP client dependency.
async fn http_get(port: u16, path: &str) -> (u16, String) {
    let mut s = TcpStream::connect(("127.0.0.1", port)).await.expect("connect");
    s.write_all(format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").as_bytes()).await.expect("write");
    let mut buf = Vec::new();
    s.read_to_end(&mut buf).await.expect("read");
    let text = String::from_utf8_lossy(&buf).to_string();
    let (head, body) = text.split_once("\r\n\r\n").expect("http response");
    let status: u16 = head.split_whitespace().nth(1).and_then(|s| s.parse().ok()).expect("status");
    (status, body.to_string())
}

struct Client {
    sock: Socket,
    frames: Vec<Value>,
    next_seq: u64,
    client_id: String,
    resume_token: String,
    role: String,
    parish: Option<String>,
}

impl Client {
    /// Connects, says hello, returns with the first frame recorded.
    async fn connect(port: u16, hello: Value) -> Client {
        let (sock, _) = connect_async(format!("ws://127.0.0.1:{port}/ws")).await.expect("websocket");
        let mut c = Client { sock, frames: vec![], next_seq: 0, client_id: String::new(), resume_token: String::new(), role: String::new(), parish: None };
        c.send(hello).await;
        let first = c.next().await;
        c.learn(&first);
        c
    }

    /// Takes identity and seat from a welcome or admitted frame.
    fn learn(&mut self, f: &Value) {
        if let Some(id) = f.get("client_id").and_then(|v| v.as_str()) {
            self.client_id = id.to_string();
            self.resume_token = f["resume_token"].as_str().unwrap_or_default().to_string();
            self.role = f["role"].as_str().unwrap_or_default().to_string();
            self.parish = f["parish"].as_str().map(String::from);
        }
    }

    fn first(&self) -> &Value {
        &self.frames[0]
    }

    async fn send(&mut self, v: Value) {
        self.sock.send(Message::text(v.to_string())).await.expect("send");
    }

    /// The next text frame, recorded; panics after `WAIT`.
    async fn next(&mut self) -> Value {
        loop {
            let msg = tokio::time::timeout(WAIT, self.sock.next()).await.unwrap_or_else(|_| {
                let recent: Vec<String> = self.frames.iter().rev().take(4).map(|f| format!("{} {} {}", f["type"], f["kind"], f["t"])).collect();
                panic!(
                    "{} {:?}: no frame within {WAIT:?}; {} frames so far, latest {recent:?}, intents sent {}",
                    self.role,
                    self.parish,
                    self.frames.len(),
                    self.next_seq
                )
            });
            match msg {
                Some(Ok(Message::Text(t))) => {
                    let v: Value = serde_json::from_str(&t).expect("json frame");
                    self.frames.push(v.clone());
                    return v;
                }
                Some(Ok(Message::Close(_))) | None => panic!("{} {:?}: connection closed", self.role, self.parish),
                Some(Ok(_)) => continue,
                Some(Err(e)) => panic!("websocket error: {e}"),
            }
        }
    }

    /// Reads frames until one satisfies `pred`, returns it.
    async fn until<F: Fn(&Value) -> bool>(&mut self, pred: F) -> Value {
        loop {
            let v = self.next().await;
            if pred(&v) {
                return v;
            }
        }
    }

    /// Reads whatever arrives until `idle` of silence.
    async fn drain(&mut self, idle: Duration) {
        loop {
            match tokio::time::timeout(idle, self.sock.next()).await {
                Ok(Some(Ok(Message::Text(t)))) => self.frames.push(serde_json::from_str(&t).expect("json frame")),
                Ok(Some(Ok(_))) => continue,
                _ => return,
            }
        }
    }

    /// The state frame for tick `t`: already recorded (a resync delivered
    /// it, or it came before an intent's result), or the next to arrive.
    async fn state_at(&mut self, t: i64) -> Value {
        if let Some(f) = self.frames.iter().rev().find(|f| f["type"] == "state" && f["t"] == t) {
            return f.clone();
        }
        self.until(|f| f["type"] == "state" && f["t"] == t).await
    }

    /// Sends an intent and returns its `intent_result`.
    async fn intent(&mut self, kind: &str, payload: Value) -> Value {
        self.next_seq += 1;
        let seq = self.next_seq;
        self.send(json!({ "v": 1, "type": "intent", "client_seq": seq, "kind": kind, "payload": payload })).await;
        self.until(|f| f["type"] == "intent_result" && f["client_seq"] == seq).await
    }

    async fn accepted(&mut self, kind: &str, payload: Value) -> Value {
        let r = self.intent(kind, payload.clone()).await;
        assert_eq!(r["status"], "accepted", "{} {:?}: {kind} {payload} -> {r}", self.role, self.parish);
        r
    }

    async fn rejected(&mut self, kind: &str, payload: Value, reason: &str) {
        let r = self.intent(kind, payload.clone()).await;
        assert_eq!(r["status"], "rejected", "{kind} {payload} -> {r}");
        assert_eq!(r["reason"], reason, "{kind} {payload} -> {r}");
    }

    fn states(&self) -> impl Iterator<Item = &Value> {
        self.frames.iter().filter(|f| f["type"] == "state")
    }

    fn result_of(&self, client_seq: u64) -> Option<&Value> {
        self.frames.iter().find(|f| f["type"] == "intent_result" && f["client_seq"] == client_seq)
    }

    async fn close(mut self) {
        let _ = self.sock.close(None).await;
    }
}

fn hello_token(code: &str, token: &str, role: &str) -> Value {
    json!({ "v": 1, "type": "hello", "session_code": code, "token": token, "role": role })
}

/// What one scripted session leaves behind.
struct Played {
    code: String,
    dir: PathBuf,
    export: String,
    run: RunLog,
    briefs: BTreeMap<String, String>,
    console_frames: BTreeMap<String, Vec<Value>>,
    phone_frames: Vec<Vec<Value>>,
    projector_frames: Vec<Value>,
    dm_frames: Vec<Value>,
    haven_console: (String, String),
    final_hash: String,
    t_end: i64,
}

/// Decides every open card and answers every call this table holds, with a
/// fixed script so two plays send identical inputs.
async fn act(console: &mut Client, state: &Value) {
    let parish = console.parish.clone().expect("a console has a parish");
    let pending: Vec<Value> = state["private"]["pending"].as_array().cloned().unwrap_or_default();
    for p in pending {
        if p.get("queued").is_some() {
            continue;
        }
        let id = p["dilemma_id"].as_str().unwrap().to_string();
        if parish == "gateway" && id.starts_with("v3-prep") {
            continue; // Gateway lets the storm decide its preparation card.
        }
        let options = p["options"].as_array().unwrap();
        let pick = match parish.as_str() {
            "haven" => 0,
            "sterling" => 1,
            "summit" => 2,
            _ => options.len() - 1,
        };
        let option_id = options[pick.min(options.len() - 1)]["id"].as_str().unwrap();
        console.accepted("decide", json!({ "dilemma_id": id, "option_id": option_id, "rationale": format!("{parish} chose {option_id}") })).await;
    }
    let calls: Vec<Value> = state["private"]["calls"].as_array().cloned().unwrap_or_default();
    for c in calls {
        if c["role"] != "holder" || c.get("queued").is_some() {
            continue;
        }
        let id = c["call_id"].as_str().unwrap();
        let (answer, count) = match id {
            "A5" => ("refuse", None),
            "A1" => ("part", Some(1)),
            _ => ("grant", None),
        };
        let mut payload = json!({ "call_id": id, "answer": answer, "reason": "We need it ourselves" });
        if let Some(n) = count {
            payload["count"] = json!(n);
        }
        console.accepted("answer_aid", payload).await;
    }
}

/// A phone votes once on every card it sees open.
async fn vote(phone: &mut Client, state: &Value, voted: &mut BTreeSet<String>) {
    let pending: Vec<Value> = state["private"]["pending"].as_array().cloned().unwrap_or_default();
    for p in pending {
        let d = p["dilemma_id"].as_str().unwrap().to_string();
        if voted.insert(d.clone()) {
            let options = p["options"].as_array().unwrap();
            let o = options[1.min(options.len() - 1)]["id"].as_str().unwrap();
            phone.accepted("vote", json!({ "dilemma_id": d, "option_id": o })).await;
        }
    }
}

async fn play(sessions_dir: &Path) -> Played {
    let content = content();
    let host = new_host(&content, 1000.0, Some(sessions_dir));
    let meta = host.meta.clone();
    let dir = host.store_dir().expect("a session directory").to_path_buf();
    let briefs = host.profile.secret_briefs.clone();
    let roster = host.profile.roster.clone();
    let deck = host.profile.values_deck.clone();
    let quarters: Vec<(usize, i64)> = host.profile.quarters.iter().map(|q| (q.index, q.to_t)).collect();
    let t_end = host.t_end;
    let server = start(host).await;
    let port = server.port;
    let code = meta.code.clone();

    // --- the DM, the projector, six consoles, three phones -----------------
    let mut dm =
        Client::connect(port, json!({ "v": 1, "type": "hello", "session_code": code, "token": meta.tokens.dm, "pin": meta.dm_pin, "name": "DM" })).await;
    assert_eq!(dm.first()["type"], "welcome", "{}", dm.first());
    assert_eq!(dm.role, "dm");
    assert_eq!(dm.first()["snapshot"]["private"]["briefs"].as_object().unwrap().len(), 6);
    assert_eq!(dm.first()["snapshot"]["clock"]["phase"], "lobby");
    assert_eq!(dm.first()["snapshot"]["session"]["quarters"].as_array().unwrap().len(), 4);

    let mut projector = Client::connect(port, json!({ "v": 1, "type": "hello", "session_code": code, "token": meta.tokens.projector })).await;
    assert_eq!(projector.role, "projector");
    assert!(projector.first()["snapshot"].get("private").is_none(), "the projector has no private view");

    let mut consoles: BTreeMap<String, Client> = BTreeMap::new();
    for p in &roster {
        let c = Client::connect(port, hello_token(&code, &meta.tokens.tables[p], "console")).await;
        assert_eq!(c.first()["type"], "welcome", "{}", c.first());
        assert_eq!(c.role, "console");
        assert_eq!(c.parish.as_deref(), Some(p.as_str()));
        assert_eq!(c.first()["snapshot"]["private"]["secret_brief"], json!(briefs[p]), "the console gets its own brief");
        consoles.insert(p.clone(), c);
    }
    let mut phones: Vec<Client> = vec![];
    for p in ["haven", "haven", "sterling"] {
        let c = Client::connect(port, hello_token(&code, &meta.tokens.tables[p], "phone")).await;
        assert_eq!(c.role, "phone");
        assert_eq!(c.parish.as_deref(), Some(p));
        assert!(c.first()["snapshot"]["private"].get("secret_brief").is_none(), "a phone never gets the brief");
        phones.push(c);
    }
    // A device with a table token and no role asked is a phone.
    let silent = Client::connect(port, json!({ "v": 1, "type": "hello", "token": meta.tokens.tables["summit"] })).await;
    assert_eq!(silent.role, "phone");
    silent.close().await;

    // --- the lobby: code only, then a seat -------------------------------
    let mut lobby = Client::connect(port, json!({ "v": 1, "type": "hello", "session_code": code.to_lowercase() })).await;
    assert_eq!(lobby.first()["type"], "lobby", "{}", lobby.first());
    let seats = lobby.first()["seats"].as_array().unwrap();
    assert_eq!(seats.len(), 6);
    assert!(seats.iter().all(|s| s["console"] == "held"), "every console seat is held: {seats:?}");
    lobby.send(json!({ "v": 1, "type": "claim_seat", "parish": "summit", "role": "console" })).await;
    let w = lobby.until(|f| f["type"] == "waiting" || f["type"] == "admitted").await;
    assert_eq!(w["type"], "waiting");
    assert_eq!(w["reason"], "console_held");
    lobby.send(json!({ "v": 1, "type": "claim_seat", "parish": "Summit", "role": "phone" })).await;
    let a = lobby.until(|f| f["type"] == "admitted").await;
    assert_eq!(a["role"], "phone");
    assert_eq!(a["snapshot"]["private"]["parish"], "summit");
    lobby.learn(&a);
    phones.push(lobby);

    // --- bad joins are refused -------------------------------------------
    let bad = Client::connect(port, hello_token(&code, "00000000000000000000000000000000", "console")).await;
    assert_eq!(bad.first()["type"], "error");
    assert_eq!(bad.first()["code"], "bad_token");
    let bad = Client::connect(port, json!({ "v": 1, "type": "hello", "session_code": code, "token": meta.tokens.dm, "pin": "0000" })).await;
    assert_eq!(bad.first()["code"], "bad_pin");
    let bad = Client::connect(port, json!({ "v": 1, "type": "hello", "session_code": "ZZZZZZ" })).await;
    assert_eq!(bad.first()["code"], "no_such_session");
    let bad = Client::connect(port, json!({ "v": 2, "type": "hello", "session_code": code })).await;
    assert_eq!(bad.first()["type"], "reload");
    let bad = Client::connect(port, json!({ "v": 1, "type": "intent", "client_seq": 1, "kind": "pause", "payload": {} })).await;
    assert_eq!(bad.first()["code"], "not_welcome");

    // --- values and picks --------------------------------------------------
    for (i, p) in roster.iter().enumerate() {
        let values: Vec<&str> = (0..3).map(|k| deck[(i + k) % deck.len()].as_str()).collect();
        consoles
            .get_mut(p)
            .unwrap()
            .accepted("lock_values", json!({ "values": values, "statement": format!("When Midas comes, {p} will put {} before {}.", values[0], values[1]) }))
            .await;
    }
    consoles.get_mut("haven").unwrap().rejected("lock_values", json!({ "values": [deck[0], deck[0], deck[1]] }), "bad_values").await;
    consoles.get_mut("haven").unwrap().rejected("lock_values", json!({ "values": ["not-a-value", deck[0], deck[1]] }), "bad_values").await;
    phones[0].accepted("personal_pick", json!({ "values": [deck[0], deck[1], deck[2]] })).await;
    phones[0].rejected("decide", json!({ "dilemma_id": "v3-prep-haven", "option_id": "a" }), "bad_role").await;
    projector.rejected("pause", json!({}), "bad_role").await;
    consoles.get_mut("haven").unwrap().rejected("pause", json!({}), "bad_role").await;

    // --- the DM opens the island and the first quarter ------------------
    dm.rejected("start", json!({}), "bad_phase").await;
    dm.rejected("debrief", json!({}), "bad_phase").await;
    dm.accepted("open_island", json!({})).await;
    let f = projector.until(|f| f["type"] == "phase").await;
    assert_eq!(f["kind"], "island_open");
    dm.accepted("open_quarter", json!({})).await;
    for c in consoles.values_mut() {
        let f = c.until(|f| f["type"] == "phase" && f["kind"] == "quarter_open").await;
        assert_eq!(f["payload"]["quarter"], 0);
        assert!(f["payload"]["seconds_per_tick"].as_f64().unwrap() < 0.01, "speed 1000: {}", f["payload"]);
    }

    // --- the allocation round ---------------------------------------------
    let h = consoles.get_mut("haven").unwrap();
    h.accepted("allocate", json!({ "token": "FUEL", "to": "summit", "count": 1 })).await;
    h.accepted("allocate", json!({ "token": "GEN", "to": "keep", "count": 2 })).await;
    h.rejected("allocate", json!({ "token": "FUEL", "to": "summit", "count": 9 }), "lacks_tokens").await;
    h.rejected("allocate", json!({ "token": "FUEL", "to": "haven", "count": 1 }), "unknown_parish").await;
    h.rejected("allocate", json!({ "token": "NOPE", "to": "summit", "count": 1 }), "unknown_token").await;
    h.rejected("decide", json!({ "dilemma_id": "v3-prep-haven", "option_id": "a" }), "not_open").await;
    h.rejected("answer_aid", json!({ "call_id": "A3", "answer": "grant" }), "not_open").await;
    h.rejected("mayday", json!({ "call_id": "A1" }), "not_asker").await;
    consoles.get_mut("sterling").unwrap().accepted("allocate", json!({ "token": "GEN", "to": "keystone", "count": 1 })).await;
    consoles.get_mut("keystone").unwrap().accepted("allocate", json!({ "token": "COLD", "to": "summit", "count": 1 })).await;
    consoles.get_mut("heartland").unwrap().accepted("allocate", json!({ "token": "GEN", "to": "keystone", "count": 1 })).await;
    consoles.get_mut("summit").unwrap().accepted("allocate", json!({ "token": "SHELTER", "to": "keep", "count": 3 })).await;
    // The DM enters for Gateway, whose tablet is "late".
    dm.accepted("allocate", json!({ "parish_id": "gateway", "token": "BOAT", "to": "haven", "count": 1 })).await;
    dm.rejected("allocate", json!({ "token": "BOAT", "to": "haven", "count": 1 }), "unknown_parish").await;
    dm.accepted("flag", json!({ "text": "Sterling argued ten minutes about the garages", "parish_id": "sterling" })).await;
    dm.accepted("heat", json!({})).await;
    dm.accepted("cool", json!({})).await;

    // --- play the four quarters by advancing the horizon ---------------
    let mut voted: Vec<BTreeSet<String>> = phones.iter().map(|_| BTreeSet::new()).collect();
    let mut gateway_storm_checked = false;
    let mut late_vote_sent = false;
    let mut haven_console_id = consoles["haven"].client_id.clone();
    let mut haven_resume = consoles["haven"].resume_token.clone();
    for (q, end_t) in quarters.clone() {
        // Reconnect: Haven's console drops before this quarter's first chunk and comes back after it.
        let mut dropped: Option<(u64, Value, u64, Value)> = None;
        if q == 1 {
            let old = consoles.remove("haven").unwrap();
            let last_seq = old.frames.iter().filter_map(|f| f["seq"].as_u64()).max().unwrap();
            let last_hash = old.states().last().unwrap()["hash"].clone();
            let last_intent = old.next_seq;
            let last_result = old.result_of(last_intent).expect("the last intent was answered").clone();
            old.close().await;
            dropped = Some((last_seq, last_hash, last_intent, last_result));
        }
        if q == 2 {
            // Seat hand-over: a second Haven device asks for the console, waits, and the DM reassigns.
            let mut second = Client::connect(port, hello_token(&code, &meta.tokens.tables["haven"], "console")).await;
            assert_eq!(second.first()["type"], "waiting", "{}", second.first());
            assert_eq!(second.first()["reason"], "console_held");
            dm.accepted("flag", json!({ "text": "hand-over" })).await;
            let roster_frame = dm.frames.iter().rev().find(|f| f["type"] == "roster").expect("the DM saw a roster");
            let waiter = roster_frame["clients"].as_array().unwrap().iter().find(|c| c["waiting_for"] == "haven").expect("the waiting device is listed");
            let waiter_id = waiter["client_id"].as_str().unwrap().to_string();
            dm.accepted("reassign", json!({ "parish_id": "haven", "client_id": waiter_id })).await;
            let adm = second.until(|f| f["type"] == "admitted").await;
            assert_eq!(adm["role"], "console");
            assert_eq!(adm["parish"], "haven");
            assert_eq!(adm["snapshot"]["private"]["secret_brief"], json!(briefs["haven"]));
            second.learn(&adm);
            let mut old = consoles.remove("haven").unwrap();
            let w = old.until(|f| f["type"] == "welcome").await;
            assert_eq!(w["role"], "phone", "the former console is told it is a phone now");
            assert!(w["snapshot"]["private"].get("secret_brief").is_none());
            old.close().await;
            haven_console_id = second.client_id.clone();
            haven_resume = second.resume_token.clone();
            consoles.insert("haven".into(), second);
            // A late phone joins Sterling mid-session and gets the history.
            let late = Client::connect(port, hello_token(&code, &meta.tokens.tables["sterling"], "phone")).await;
            assert_eq!(late.role, "phone");
            assert_eq!(late.first()["snapshot"]["t"], quarters[1].1);
            assert!(!late.first()["snapshot"]["history"].as_array().unwrap().is_empty());
            phones.push(late);
            voted.push(BTreeSet::new());
        }
        loop {
            let r = dm.accepted("advance", json!({ "ticks": CHUNKS[q] })).await;
            let h = r["applied_t"].as_i64().unwrap();
            if let Some((last_seq, last_hash, last_intent, last_result)) = dropped.take() {
                let mut back = Client::connect(
                    port,
                    json!({ "v": 1, "type": "hello", "client_id": haven_console_id, "resume_token": haven_resume, "last_seq": last_seq }),
                )
                .await;
                assert_eq!(back.first()["type"], "welcome", "{}", back.first());
                assert_eq!(back.role, "console");
                assert_eq!(back.parish.as_deref(), Some("haven"));
                assert_eq!(back.client_id, haven_console_id);
                let snap = back.first()["snapshot"].clone();
                assert_eq!(snap["t"], h, "the snapshot is at the horizon");
                assert_ne!(snap["hash"], last_hash, "ticks passed while Haven was away");
                assert_eq!(snap["clock"]["phase"], "quarter_open");
                assert_eq!(snap["private"]["secret_brief"], json!(briefs["haven"]));
                assert!(!snap["history"].as_array().unwrap().is_empty());
                back.send(json!({ "v": 1, "type": "resync", "from_seq": last_seq })).await;
                let mut expect = last_seq + 1;
                loop {
                    let f = back.next().await;
                    assert_eq!(f["seq"], expect, "resync replays the missed frames in order: {f}");
                    expect += 1;
                    if f["type"] == "state" && f["t"] == h {
                        break;
                    }
                }
                assert_eq!(expect - 1, snap["seq"], "the resync ends at the snapshot's seq");
                // A duplicate of an already answered intent gets the same answer, not a second input.
                back.next_seq = last_intent - 1;
                let dup = back.intent("allocate", json!({ "token": "GEN", "to": "keep", "count": 2 })).await;
                assert_eq!(dup["status"], last_result["status"], "{dup} vs {last_result}");
                assert_eq!(dup["input_seq"], last_result["input_seq"], "de-duplicated on (client_id, client_seq)");
                assert_eq!(dup["reason"], last_result["reason"]);
                consoles.insert("haven".into(), back);
            }
            for p in &roster {
                let c = consoles.get_mut(p).unwrap();
                let st = c.state_at(h).await;
                assert_eq!(st["public"]["t"], h);
                act(c, &st).await;
                if p == "gateway" && !gateway_storm_checked && h >= -2490 {
                    // The storm decided Gateway's preparation card at its deadline (T-41:45); a late entry is refused as expired.
                    c.rejected("decide", json!({ "dilemma_id": "v3-prep-gateway", "option_id": "a" }), "expired").await;
                    gateway_storm_checked = true;
                }
            }
            for (i, ph) in phones.iter_mut().enumerate() {
                let st = ph.state_at(h).await;
                vote(ph, &st, &mut voted[i]).await;
                if i == 1 && !late_vote_sent && h >= -2400 {
                    // A vote after the table raised its card is recorded as late.
                    ph.accepted("vote", json!({ "dilemma_id": "v3-prep-haven", "option_id": "c" })).await;
                    late_vote_sent = true;
                }
            }
            projector.state_at(h).await;
            if h >= end_t {
                // The close is emitted with the last tick, so it arrived before the advance's result.
                let f = dm.frames.iter().rev().find(|f| f["type"] == "phase" && f["kind"] == "quarter_close").expect("quarter_close came with the last tick");
                assert_eq!(f["payload"]["quarter"], q);
                break;
            }
        }
        if q + 1 < quarters.len() {
            dm.rejected("debrief", json!({}), "bad_phase").await;
            dm.accepted("open_quarter", json!({})).await;
        }
    }
    dm.rejected("open_quarter", json!({}), "bad_phase").await;
    dm.accepted("debrief", json!({})).await;
    for c in consoles.values_mut() {
        let f = c.until(|f| f["type"] == "phase" && f["kind"] == "debrief_open").await;
        assert_eq!(f["payload"]["briefs"].as_object().unwrap().len(), 6, "every brief is read at the debrief");
    }
    // the commitment never leaves the phone (S4.2)
    phones[0].rejected("commitment", json!({ "text": "When I feel the line, I will ask who is not in the room." }), "private").await;
    // D7: the table places its hardest moment, then the DM steps the wall
    consoles.get_mut("haven").unwrap().rejected("self_place", json!({ "moment": "dilemma:v3-landfall-haven", "anchor": 4 }), "bad_payload").await;
    consoles.get_mut("haven").unwrap().accepted("self_place", json!({ "moment": "dilemma:v3-landfall-haven", "anchor": -1, "label": "Landfall" })).await;
    phones[0].rejected("self_place", json!({ "moment": "x", "anchor": 0 }), "bad_role").await;
    dm.accepted("debrief_step", json!({ "step": 3, "id": "pattern" })).await;
    let f = consoles.get_mut("gateway").unwrap().until(|f| f["type"] == "phase" && f["kind"] == "debrief_step").await;
    assert_eq!(f["payload"]["step"], 3);
    let placed = f["payload"]["placements"].as_array().unwrap();
    assert_eq!(placed.len(), 1);
    assert_eq!(placed[0]["anchor"], -1);
    consoles.get_mut("haven").unwrap().rejected("decide", json!({ "dilemma_id": "v3-recovery-haven", "option_id": "a" }), "session_over").await;
    dm.accepted("export", json!({})).await;
    for f in ["run.json", "votes.json", "flags.json", "input-log.jsonl", "session.json", "profile.json", "clients.json"] {
        assert!(dir.join(f).is_file(), "{f} is in the session directory");
    }

    // --- HTTP ------------------------------------------------------------
    let (status, export) = http_get(port, &format!("/export?dm={}", meta.tokens.dm)).await;
    assert_eq!(status, 200);
    assert_eq!(export, std::fs::read_to_string(dir.join("run.json")).unwrap());
    let (status, _) = http_get(port, "/export").await;
    assert_eq!(status, 403);
    let (status, body) = http_get(port, "/join").await;
    assert_eq!(status, 200);
    assert!(body.contains("<svg"), "{body}");
    let (status, _) = http_get(port, "/join/haven.svg").await;
    assert_eq!(status, 403);
    let (status, body) = http_get(port, &format!("/join/haven.svg?dm={}", meta.tokens.dm)).await;
    assert_eq!(status, 200);
    assert!(body.contains("<svg"));
    let (status, body) = http_get(port, &format!("/links?dm={}", meta.tokens.dm)).await;
    assert_eq!(status, 200);
    let links: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(links["tables"].as_object().unwrap().len(), 6);
    assert!(links["tables"]["haven"].as_str().unwrap().contains(&format!("/j/{code}#t={}", meta.tokens.tables["haven"])));
    let (status, body) = http_get(port, "/health").await;
    assert_eq!(status, 200);
    let health: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(health["phase"], "debrief");
    assert_eq!(health["t"], t_end);
    let (status, _) = http_get(port, "/j/ZZZZZZ").await;
    assert_eq!(status, 404);
    let (status, body) = http_get(port, &format!("/j/{code}")).await;
    assert_eq!(status, 200);
    assert!(body.contains("Crucible host"), "no bundle in the test: the landing page is served");

    let run = RunLog::from_json(&export).expect("the export is a run log");
    let final_hash = server.app.host.lock().unwrap().last_hash();
    // Drain everything still in flight so the frame logs are complete.
    for c in consoles.values_mut() {
        c.drain(Duration::from_millis(200)).await;
    }
    projector.drain(Duration::from_millis(200)).await;
    Played {
        code,
        dir,
        export,
        run,
        briefs,
        console_frames: consoles.into_iter().map(|(p, c)| (p, c.frames)).collect(),
        phone_frames: phones.into_iter().map(|c| c.frames).collect(),
        projector_frames: projector.frames,
        dm_frames: dm.frames,
        haven_console: (haven_console_id, haven_resume),
        final_hash,
        t_end,
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn six_tables_and_a_dm_play_a_whole_session_that_replays_and_repeats() {
    let dir_a = temp_dir("a");
    let a = play(&dir_a).await;
    let content = content();

    // The exported run log replays to the host's final hash, as `crucible replay` does.
    assert_eq!(a.run.summary.state_hash, a.final_hash);
    assert_eq!(a.run.ticks.len(), 481);
    assert!(a.run.until.is_none(), "the session ran to the end");
    assert_eq!(a.run.ticks.last().unwrap().t, a.t_end);
    let again = replay(&content, &a.run);
    assert_eq!(again.summary.state_hash, a.run.summary.state_hash, "replay reproduces the hash");
    assert_eq!(again.to_json(), a.export, "replay reproduces the whole log");
    // The core saw what the tables did.
    let kinds: BTreeSet<&str> = a.run.inputs.iter().map(|i| i.input.kind()).collect();
    for k in ["lock_values", "allocate", "decide", "answer_aid"] {
        assert!(kinds.contains(k), "{kinds:?}");
    }
    assert!(a.run.inputs.windows(2).all(|w| (w[0].t, w[0].seq) < (w[1].t, w[1].seq)), "inputs are ordered by (t, seq)");
    let haven = a.run.teams.iter().find(|t| t.parish_id == "haven").unwrap();
    assert_eq!(haven.stated_values.len(), 3);
    assert!(haven.statement.as_deref().unwrap_or("").contains("haven will put"));
    let storm =
        a.run.ticks.iter().flat_map(|t| &t.events).any(|e| matches!(e, Event::Decision { parish_id, decided_by: Some(_), .. } if parish_id == "gateway"));
    assert!(storm, "the storm decided Gateway's preparation card");

    // Every state frame's hash is the run log's hash for that tick; the projector saw every tick.
    let hashes: BTreeMap<i64, &str> = a.run.ticks.iter().map(|t| (t.t, t.state_hash.as_str())).collect();
    let projector_ticks: Vec<i64> = a.projector_frames.iter().filter(|f| f["type"] == "state").map(|f| f["t"].as_i64().unwrap()).collect();
    assert_eq!(projector_ticks.len(), 480, "one frame per tick after T-72:00");
    for f in a.projector_frames.iter().filter(|f| f["type"] == "state") {
        assert_eq!(f["hash"].as_str().unwrap(), hashes[&f["t"].as_i64().unwrap()]);
        assert!(f.get("private").is_none());
        assert_eq!(f["public"]["fogged"], json!([]));
    }
    let seqs: Vec<u64> = a.projector_frames.iter().filter_map(|f| f["seq"].as_u64()).collect();
    assert!(seqs.windows(2).all(|w| w[1] == w[0] + 1), "sequenced frames arrive without gaps: {:?}", &seqs[..10.min(seqs.len())]);
    assert_eq!(seqs.first().copied(), Some(2), "seq 1 (values_open) was emitted before the projector joined");

    // Filtering: no brief leaks, no fogged data leaks, phones never see a brief.
    let needles: BTreeMap<&str, String> = a.briefs.iter().map(|(p, b)| (p.as_str(), b.chars().take(60).collect())).collect();
    let comms = |t: i64, p: &str| a.run.ticks[((t - a.run.t_start) / 15) as usize].infrastructure[p]["communications"];
    let mut fog_seen = 0usize;
    for (parish, frames) in &a.console_frames {
        let mut before_debrief = true;
        for f in frames {
            if f["type"] == "phase" && f["kind"] == "debrief_open" {
                before_debrief = false;
            }
            let text = f.to_string();
            for (other, needle) in &needles {
                if *other != parish.as_str() && before_debrief {
                    assert!(!text.contains(needle.as_str()), "{parish}'s console received {other}'s brief in a {} frame", f["type"]);
                }
            }
            if f["type"] == "state" {
                let t = f["t"].as_i64().unwrap();
                let seen: BTreeSet<&str> = f["public"]["infrastructure"].as_object().unwrap().keys().map(|k| k.as_str()).collect();
                let fogged: BTreeSet<&str> = f["public"]["fogged"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect();
                assert!(seen.contains(parish.as_str()), "{parish} always sees itself");
                assert_eq!(seen.len() + fogged.len(), 6, "{parish} at {t}: {seen:?} + {fogged:?}");
                for q in &seen {
                    assert!(
                        *q == parish.as_str() || (comms(t, parish) > COMMS_FAILED && comms(t, q) > COMMS_FAILED),
                        "{parish} saw {q} at {t} with comms {} / {}",
                        comms(t, parish),
                        comms(t, q)
                    );
                }
                for q in &fogged {
                    assert!(comms(t, parish) <= COMMS_FAILED || comms(t, q) <= COMMS_FAILED, "{parish} was fogged from {q} at {t} while both could talk");
                    fog_seen += 1;
                }
                for e in f["public"]["events"].as_array().unwrap() {
                    if e["kind"] == "rejected" {
                        assert_eq!(e["parish_id"], json!(parish), "another table's rejections are private");
                    }
                    if let Some(p) = e["parish_id"].as_str() {
                        let public = ["mayday", "aid_answer", "aid_expired", "values_locked", "decision", "allocation", "credit_line", "token_returned"];
                        assert!(seen.contains(p) || public.contains(&e["kind"].as_str().unwrap()), "{parish} saw a {} event of fogged {p} at {t}", e["kind"]);
                    }
                }
                assert_eq!(f["private"]["parish"], json!(parish));
            }
        }
    }
    assert!(fog_seen > 100, "fog was exercised ({fog_seen} fogged parish-frames)");
    for frames in &a.phone_frames {
        for f in frames {
            if f["type"] == "phase" && f["kind"] == "debrief_open" {
                break; // the debrief reads every brief aloud, to phones too
            }
            let text = f.to_string();
            for needle in needles.values() {
                assert!(!text.contains(needle.as_str()), "a phone frame carried a brief: {}", f["type"]);
            }
        }
    }
    // The DM saw votes with their split and a late one, both flags, and the cancelled heat.
    let last = a.dm_frames.iter().rev().find(|f| f["type"] == "state").unwrap();
    assert_eq!(last["private"]["briefs"].as_object().unwrap().len(), 6);
    assert!(last["private"]["votes"]["haven"]["v3-prep-haven"]["count"].as_u64().unwrap() >= 2, "{}", last["private"]["votes"]);
    assert!(last["private"]["votes"]["haven"]["v3-prep-haven"]["late"].as_u64().unwrap() >= 1, "{}", last["private"]["votes"]);
    assert_eq!(last["private"]["flags"].as_array().unwrap().len(), 2);
    assert_eq!(last["private"]["intensity_offset"], 0, "heat then cool");
    // The input log on disk holds every tick and every accepted input, with wall-clock stamps the core never saw.
    let log_text = std::fs::read_to_string(a.dir.join("input-log.jsonl")).unwrap();
    assert_eq!(log_text.lines().filter(|l| l.contains("\"kind\":\"tick\"")).count(), 480);
    assert!(log_text.lines().all(|l| l.contains("\"wall\":\"20")));
    assert!(!a.export.contains("\"wall\""), "wall-clock time never reaches the run log");
    assert!(!a.export.contains(&a.briefs["haven"]), "secret briefs are session content, not run log fields");

    // Restore: the same directory reloads to the same horizon, hash and export, and devices reconnect.
    let mut restored = Host::restore(content.clone(), &a.dir, "test-bundle".into(), None, 1000.0).expect("restore");
    assert_eq!(restored.meta.code, a.code);
    assert_eq!(restored.horizon, a.t_end);
    assert_eq!(restored.last_hash(), a.final_hash);
    assert_eq!(restored.export().unwrap(), a.export, "the restored host exports the same run log byte for byte");
    assert_eq!(export_offline(content.clone(), &a.dir).unwrap(), a.export, "--export-only agrees");
    let server = start(restored).await;
    let back = Client::connect(server.port, json!({ "v": 1, "type": "hello", "client_id": a.haven_console.0, "resume_token": a.haven_console.1 })).await;
    assert_eq!(back.first()["type"], "welcome", "{}", back.first());
    assert_eq!(back.parish.as_deref(), Some("haven"));
    assert_eq!(back.role, "console");
    assert_eq!(back.first()["snapshot"]["hash"], json!(a.final_hash));
    assert_eq!(back.first()["snapshot"]["clock"]["phase"], "debrief");
    let (status, body) = http_get(server.port, "/health").await;
    assert_eq!(status, 200);
    assert!(body.contains(&a.code));

    // Two runs with the same inputs are byte-identical.
    let dir_b = temp_dir("b");
    let b = play(&dir_b).await;
    assert_ne!(a.code, b.code, "codes are fresh per session");
    assert_eq!(a.export, b.export, "the second play must export the same run log");

    let _ = std::fs::remove_dir_all(&dir_a);
    let _ = std::fs::remove_dir_all(&dir_b);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn the_clock_advances_ticks_pauses_and_skips_ahead() {
    let content = content();
    let host = new_host(&content, 300.0, None);
    let meta = host.meta.clone();
    let server = start(host).await;
    let port = server.port;
    let mut dm = Client::connect(port, json!({ "v": 1, "type": "hello", "token": meta.tokens.dm, "pin": meta.dm_pin })).await;
    assert_eq!(dm.role, "dm");
    let mut projector = Client::connect(port, json!({ "v": 1, "type": "hello", "token": meta.tokens.projector })).await;
    assert_eq!(projector.role, "projector");
    dm.accepted("open_quarter", json!({})).await;
    dm.rejected("pause", json!({}), "bad_phase").await;
    let r = dm.accepted("start", json!({})).await;
    assert_eq!(r["applied_t"], -4320);
    let f = projector.until(|f| f["type"] == "phase" && f["kind"] == "resumed").await;
    assert!(f["payload"]["seconds_per_tick"].as_f64().unwrap() < 0.02);
    // The clock delivers ticks in order with the per-tick hash.
    let mut last_t = -4320;
    for _ in 0..5 {
        let s = projector.until(|f| f["type"] == "state").await;
        assert_eq!(s["t"].as_i64().unwrap(), last_t + 15);
        assert_eq!(s["clock"]["running"], true);
        assert_eq!(s["hash"].as_str().unwrap().len(), 64);
        last_t = s["t"].as_i64().unwrap();
    }
    dm.accepted("pause", json!({})).await;
    let p = projector.until(|f| f["type"] == "phase" && f["kind"] == "paused").await;
    let paused_at = p["t"].as_i64().unwrap();
    projector.drain(Duration::from_millis(300)).await;
    let after_pause = projector.states().filter(|s| s["t"].as_i64().unwrap() > paused_at).count();
    assert_eq!(after_pause, 0, "no tick lands while paused");
    let h = server.app.host.lock().unwrap().horizon;
    assert_eq!(h, paused_at);
    dm.accepted("skip_ahead", json!({})).await;
    let c = projector.until(|f| f["type"] == "phase" && f["kind"] == "quarter_close").await;
    assert_eq!(c["t"], -2160);
    let ticks: Vec<i64> = projector.states().map(|s| s["t"].as_i64().unwrap()).collect();
    assert!(ticks.windows(2).all(|w| w[1] == w[0] + 15), "ticks are contiguous");
    assert_eq!(*ticks.last().unwrap(), -2160);
    dm.rejected("start", json!({}), "bad_phase").await;
    let (status, body) = http_get(port, "/health").await;
    assert_eq!(status, 200);
    let v: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(v["phase"], "quarter_close");
    assert_eq!(v["t"], -2160);
    assert_eq!(v["clients"], 2);
}
