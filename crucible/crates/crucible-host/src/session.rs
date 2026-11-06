//! The authoritative session: the input log, the core re-run to the horizon,
//! seats and clients, the sequenced stream of `state` and `phase` frames, the
//! clock, intent validation, snapshots, restore and export. Everything here
//! is synchronous; the server locks the `Host`, calls in, and never holds the
//! lock across an await.

use crate::codes;
use crate::filter::{self, View, HISTORY_CAP};
use crate::profile::{Profile, Quarter};
use crate::protocol::{self as proto, Hello, Role, CONSOLE_KINDS, DM_KINDS, PHONE_KINDS};
use crate::store::{LogEntry, Source, Store, CLIENTS_FILE, FLAGS_FILE, RUN_FILE, SESSION_FILE, VOTES_FILE};
use anyhow::{anyhow, Context, Result};
use crucible_core::log::{clock as sim_clock, RunLog};
use crucible_core::sim::RECOVERY_PLAY_MINUTES;
use crucible_core::weather::window_t;
use crucible_core::{run, Content, Input, InputRecord, RunConfig, Team, STEP_MINUTES};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::mpsc::UnboundedSender;

/// The raw profile, kept beside the log so a restore needs no content directory.
pub const PROFILE_FILE: &str = "profile.json";

/// Where the host runs. Only the binding, TLS, session count and sign-in
/// differ (PROTOCOL.md section 15); not a frame.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, clap::ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Lan,
    Cloud,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tokens {
    pub tables: BTreeMap<String, String>,
    pub dm: String,
    pub projector: String,
}

/// `session.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meta {
    pub code: String,
    pub created: String,
    pub mode: Mode,
    pub seed: u64,
    pub profile: String,
    pub content_hash: String,
    pub bundle_hash: String,
    pub roster: Vec<String>,
    pub tokens: Tokens,
    pub dm_pin: String,
    pub public_url: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Lobby,
    Island,
    QuarterOpen,
    Running,
    Paused,
    QuarterClose,
    Debrief,
}

/// A device. Persisted in `clients.json` without its connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub role: Role,
    #[serde(default)]
    pub parish: Option<String>,
    pub resume_token: String,
    #[serde(default)]
    pub name: Option<String>,
    /// A lobby device waiting for a held console seat.
    #[serde(default)]
    pub waiting_for: Option<String>,
    #[serde(skip)]
    pub connected: bool,
    #[serde(skip)]
    pub tx: Option<UnboundedSender<String>>,
    #[serde(skip)]
    pub results: BTreeMap<u64, Value>,
    #[serde(skip)]
    pub last_ack: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct ClientsFile {
    clients: Vec<Client>,
    seats: BTreeMap<String, Option<String>>,
}

/// One sequenced frame of the session's stream (`seq` = index + 1).
#[derive(Debug, Clone)]
pub enum Sequenced {
    State { t: i64 },
    Phase { kind: String, t: i64, payload: Value },
}

#[derive(Debug, Clone, Serialize)]
struct Vote {
    option_id: String,
    late: bool,
    seq: u64,
}

/// What `hello` leads to. The host has registered the client in every case
/// but `Reject`.
pub enum Outcome {
    Welcome { client_id: String, frame: String },
    Lobby { client_id: String, frame: String },
    Waiting { client_id: String, frame: String },
    Reject { frame: String },
}

impl Outcome {
    pub fn client_id(&self) -> Option<&str> {
        match self {
            Outcome::Welcome { client_id, .. } | Outcome::Lobby { client_id, .. } | Outcome::Waiting { client_id, .. } => Some(client_id),
            Outcome::Reject { .. } => None,
        }
    }
}

type Rejection = (&'static str, String);

pub struct Host {
    pub meta: Meta,
    pub content: Arc<Content>,
    pub profile: Profile,
    profile_raw: Value,
    parish_ids: Vec<String>,
    comms_failed: i64,
    teams: Vec<Team>,
    pub log: Vec<LogEntry>,
    pub horizon: i64,
    pub phase: Phase,
    pub quarter: Option<usize>,
    pub run: RunLog,
    pub t_start: i64,
    pub t_end: i64,
    pub stream: Vec<Sequenced>,
    /// parish -> the client holding its console seat.
    pub seats: BTreeMap<String, Option<String>>,
    pub clients: BTreeMap<String, Client>,
    /// parish -> dilemma -> client -> vote
    votes: BTreeMap<String, BTreeMap<String, BTreeMap<String, Vote>>>,
    picks: BTreeMap<String, Vec<String>>,
    commitments: BTreeMap<String, String>,
    flags: Vec<Value>,
    /// (t, ±2) from heat and cool.
    offsets: Vec<(i64, i64)>,
    store: Option<Store>,
    pub speed: f64,
    /// False while a restore replays the log: nothing is sent and the core is run once at the end.
    live: bool,
    next_tick_at: Option<Instant>,
    session_block: Value,
}

/// The run's first and last tick, from the content alone.
pub fn run_bounds(content: &Content) -> (i64, i64) {
    let w = &content.timeline.hurricane_midas.windows;
    (window_t(&w[0]), window_t(&w[w.len() - 1]) + RECOVERY_PLAY_MINUTES)
}

/// The core input an entry carries, if its kind is one the core sees.
pub fn core_input(e: &LogEntry) -> Option<Input> {
    let kind = match e.kind.as_str() {
        "swap" => "swap_dilemma",
        k if CONSOLE_KINDS.contains(&k) => k,
        _ => return None,
    };
    let mut m = e.payload.as_object().cloned().unwrap_or_default();
    m.insert("kind".into(), json!(kind));
    if !m.contains_key("parish_id") {
        if let Some(p) = &e.source.parish {
            m.insert("parish_id".into(), json!(p));
        }
    }
    serde_json::from_value(Value::Object(m)).ok()
}

fn host_entry(t: i64, kind: &str, payload: Value) -> LogEntry {
    LogEntry {
        seq: 0,
        t,
        wall: codes::wall_now(),
        source: Source { client_id: None, parish: None, role: "host".into() },
        kind: kind.into(),
        payload,
        core: false,
    }
}

fn str_field(payload: &Value, key: &str) -> Option<String> {
    payload.get(key).and_then(|v| v.as_str()).map(String::from)
}

impl Host {
    /// A new session: fresh code, tokens and PIN. With `sessions_dir`, the
    /// directory `<sessions_dir>/<date>-<CODE>` receives `session.json`,
    /// `profile.json` and the input log.
    #[allow(clippy::too_many_arguments)]
    pub fn create(
        content: Arc<Content>,
        profile: Profile,
        profile_raw: Value,
        seed: u64,
        mode: Mode,
        bundle_hash: String,
        public_url: String,
        speed: f64,
        sessions_dir: Option<&Path>,
    ) -> Result<Host> {
        let tokens =
            Tokens { tables: profile.roster.iter().map(|p| (p.clone(), codes::new_token())).collect(), dm: codes::new_token(), projector: codes::new_token() };
        let meta = Meta {
            code: codes::new_code(),
            created: codes::wall_now(),
            mode,
            seed,
            profile: profile.id.clone(),
            content_hash: content.content_hash.clone(),
            bundle_hash,
            roster: profile.roster.clone(),
            tokens,
            dm_pin: codes::new_pin(),
            public_url,
        };
        let store = match sessions_dir {
            Some(parent) => {
                let s = Store::open(&parent.join(format!("{}-{}", codes::date_today(), meta.code)))?;
                s.write_json(SESSION_FILE, &meta)?;
                s.write_json(PROFILE_FILE, &profile_raw)?;
                Some(s)
            }
            None => None,
        };
        let mut h = Host::build(content, profile, profile_raw, meta, store, speed)?;
        h.live = true;
        h.persist_clients();
        Ok(h)
    }

    /// Reloads a session directory, replays its log, resumes paused at the
    /// saved horizon. `public_url` replaces the saved one (a new router).
    pub fn restore(content: Arc<Content>, dir: &Path, bundle_hash: String, public_url: Option<String>, speed: f64) -> Result<Host> {
        let mut meta: Meta = Store::read_json(dir, SESSION_FILE)?;
        meta.bundle_hash = bundle_hash;
        if let Some(u) = public_url {
            meta.public_url = u;
        }
        if meta.content_hash != content.content_hash {
            eprintln!(
                "warning: content hash differs from the session's ({} vs {}); the replay may diverge",
                &content.content_hash[..12],
                &meta.content_hash[..12]
            );
        }
        let profile_raw: Value = Store::read_json(dir, PROFILE_FILE)?;
        let (t_start, t_end) = run_bounds(&content);
        let profile = Profile::parse(&content, &profile_raw, t_start, t_end)?;
        let entries = Store::read_log(dir)?;
        let clients: ClientsFile = Store::read_json(dir, CLIENTS_FILE).unwrap_or_default();
        let store = Store::open(dir)?;
        let mut h = Host::build(content, profile, profile_raw, meta, Some(store), speed)?;
        for e in entries {
            h.log.push(e.clone());
            h.apply_entry(&e);
        }
        for mut c in clients.clients {
            c.connected = false;
            c.tx = None;
            h.clients.insert(c.id.clone(), c);
        }
        for (p, holder) in clients.seats {
            h.seats.insert(p, holder);
        }
        if h.phase == Phase::Running {
            // The restored clock is stopped; the DM resumes it deliberately.
            h.record(host_entry(h.horizon, "pause", json!({ "reason": "restore" })));
        }
        h.live = true;
        h.recompute();
        Ok(h)
    }

    fn build(content: Arc<Content>, profile: Profile, profile_raw: Value, meta: Meta, store: Option<Store>, speed: f64) -> Result<Host> {
        let (t_start, t_end) = run_bounds(&content);
        let parish_ids = content.parish_ids();
        let comms_failed = content.infrastructure.infrastructure_thresholds.get("FAILED").copied().unwrap_or(20.0) as i64;
        let teams = initial_teams(&parish_ids, &profile);
        let initial = run(
            &content,
            &RunConfig { seed: meta.seed, teams: Some(teams.clone()), until: Some(t_start), session: profile.core.clone(), ..Default::default() },
        );
        let mut h = Host {
            meta,
            content,
            profile,
            profile_raw,
            parish_ids,
            comms_failed,
            teams,
            log: vec![],
            horizon: t_start,
            phase: Phase::Lobby,
            quarter: None,
            run: initial,
            t_start,
            t_end,
            stream: vec![],
            seats: BTreeMap::new(),
            clients: BTreeMap::new(),
            votes: BTreeMap::new(),
            picks: BTreeMap::new(),
            commitments: BTreeMap::new(),
            flags: vec![],
            offsets: vec![],
            store,
            speed: if speed > 0.0 { speed } else { 1.0 },
            live: false,
            next_tick_at: None,
            session_block: Value::Null,
        };
        for p in &h.profile.roster {
            h.seats.insert(p.clone(), None);
        }
        h.session_block = h.build_session_block();
        let p = &h.profile;
        let payload = json!({ "values_deck": p.values_deck, "values_to_pick": p.values_to_pick, "statement_template": p.statement_template });
        h.emit_phase("values_open", t_start, payload);
        Ok(h)
    }

    fn build_session_block(&self) -> Value {
        let p = &self.profile;
        let quarters: Vec<Value> = p
            .quarters
            .iter()
            .map(|q| {
                let mut v = serde_json::to_value(q).expect("quarter serializes");
                v["seconds_per_tick"] = json!(q.seconds_per_tick(self.speed));
                v
            })
            .collect();
        json!({
            "code": self.meta.code, "profile": p.id, "title": p.title, "seed": self.meta.seed, "content_hash": self.meta.content_hash,
            "engine": env!("CARGO_PKG_VERSION"), "log_version": self.run.version, "step_minutes": STEP_MINUTES,
            "t_start": self.t_start, "t_end": self.t_end, "roster": p.roster, "parishes": self.run.parishes, "windows": self.run.windows,
            "quarters": quarters, "values_deck": p.values_deck, "values_to_pick": p.values_to_pick, "statement_template": p.statement_template,
            "answer_reasons": p.answer_reasons, "credit_prompt": p.credit_prompt, "commitment": p.commitment, "debrief_question": p.debrief_question,
        })
    }

    // ----------------------------------------------------------------- core

    /// Re-runs the core from the seed with every core-bound input to the horizon.
    fn recompute(&mut self) {
        let cfg = RunConfig {
            seed: self.meta.seed,
            teams: Some(self.teams.clone()),
            decisions: BTreeMap::new(),
            intensity: self.effective_intensity(),
            live: false,
            ask: None,
            inputs: self.core_inputs(),
            until: Some(self.horizon),
            session: self.profile.core.clone(),
        };
        self.run = run(&self.content, &cfg);
    }

    fn core_inputs(&self) -> Vec<InputRecord> {
        self.log.iter().filter_map(|e| core_input(e).map(|input| InputRecord { t: e.t, seq: e.seq, input })).collect()
    }

    /// The profile's curve (or the timeline's suggestions) with the DM's heat
    /// and cool applied from their ticks on. Empty when the DM has done nothing,
    /// so the core uses the profile's own curve.
    fn effective_intensity(&self) -> Vec<(i64, i64)> {
        if self.offsets.is_empty() {
            return vec![];
        }
        let base: Vec<(i64, i64)> = if !self.profile.core.intensity.is_empty() {
            self.profile.core.intensity.clone()
        } else {
            self.content.timeline.hurricane_midas.windows.iter().map(|w| (window_t(w), w.intensity.unwrap_or(5))).collect()
        };
        let mut points: BTreeSet<i64> = base.iter().map(|p| p.0).chain(self.offsets.iter().map(|o| o.0)).collect();
        points.insert(self.t_start);
        points
            .into_iter()
            .map(|t| {
                let b = base.iter().filter(|(pt, _)| *pt <= t).max_by_key(|(pt, _)| *pt).map(|(_, l)| *l).unwrap_or(5);
                let off: i64 = self.offsets.iter().filter(|(ot, _)| *ot <= t).map(|(_, d)| d).sum();
                (t, (b + off).clamp(1, 10))
            })
            .collect()
    }

    pub fn intensity_offset(&self) -> i64 {
        self.offsets.iter().map(|o| o.1).sum()
    }

    // --------------------------------------------------------- the stream

    pub fn seq(&self) -> u64 {
        self.stream.len() as u64
    }

    pub fn current_quarter(&self) -> Option<&Quarter> {
        self.quarter.and_then(|q| self.profile.quarters.get(q))
    }

    fn quarter_end(&self) -> Option<i64> {
        self.current_quarter().map(|q| q.to_t.min(self.t_end))
    }

    pub fn seconds_per_tick(&self) -> f64 {
        self.current_quarter().or(self.profile.quarters.first()).map(|q| q.seconds_per_tick(self.speed)).unwrap_or(1.0)
    }

    pub fn clock_block(&self) -> Value {
        json!({
            "phase": self.phase, "quarter": self.quarter, "running": self.phase == Phase::Running,
            "seconds_per_tick": self.seconds_per_tick(), "horizon_t": self.horizon, "quarter_end_t": self.quarter_end(),
        })
    }

    fn quarter_payload(&self, q: &Quarter) -> Value {
        json!({
            "quarter": q.index, "id": q.id, "title": q.title, "from_t": q.from_t, "to_t": q.to_t, "seconds_per_tick": q.seconds_per_tick(self.speed),
            "card": q.card, "human_deadline_ticks": q.human_deadline_ticks, "mayday_answer_ticks": q.mayday_answer_ticks, "second_move": q.second_move,
        })
    }

    /// Appends an entry to the log (and the disk), applies it, returns its seq.
    fn record(&mut self, mut e: LogEntry) -> u64 {
        e.seq = self.log.len() as u64 + 1;
        if let Some(s) = &mut self.store {
            if let Err(err) = s.append(&e) {
                eprintln!("input log: {err}");
            }
        }
        self.log.push(e.clone());
        self.apply_entry(&e);
        e.seq
    }

    /// Derived state and the stream, from one entry. Shared by the live path
    /// and the restore replay, so both build the same stream.
    fn apply_entry(&mut self, e: &LogEntry) {
        match e.kind.as_str() {
            "tick" => {
                self.horizon = e.t;
                self.emit_state(e.t);
                if let Some(end) = self.quarter_end() {
                    if self.horizon >= end && matches!(self.phase, Phase::QuarterOpen | Phase::Running | Phase::Paused) {
                        self.phase = Phase::QuarterClose;
                        self.next_tick_at = None;
                        let q = self.current_quarter().cloned().expect("a quarter is open");
                        self.emit_phase("quarter_close", e.t, json!({ "quarter": q.index, "id": q.id, "title": q.title }));
                    }
                }
            }
            "open_island" => {
                self.phase = Phase::Island;
                self.emit_phase("island_open", e.t, json!({}));
            }
            "open_quarter" => {
                let next = self.quarter.map(|q| q + 1).unwrap_or(0);
                if let Some(q) = self.profile.quarters.get(next).cloned() {
                    self.quarter = Some(next);
                    self.phase = Phase::QuarterOpen;
                    let payload = self.quarter_payload(&q);
                    self.emit_phase("quarter_open", e.t, payload);
                }
            }
            "start" => {
                self.phase = Phase::Running;
                if self.live {
                    self.next_tick_at = Some(Instant::now() + Duration::from_secs_f64(self.seconds_per_tick()));
                }
                let payload = json!({ "quarter": self.quarter, "seconds_per_tick": self.seconds_per_tick() });
                self.emit_phase("resumed", e.t, payload);
            }
            "pause" => {
                self.phase = Phase::Paused;
                self.next_tick_at = None;
                self.emit_phase("paused", e.t, json!({ "quarter": self.quarter }));
            }
            "debrief" => {
                self.phase = Phase::Debrief;
                self.next_tick_at = None;
                let p = &self.profile;
                let payload =
                    json!({ "secret_order": p.secret_order, "briefs": p.secret_briefs, "debrief_question": p.debrief_question, "commitment": p.commitment });
                self.emit_phase("debrief_open", e.t, payload);
            }
            "heat" => self.offsets.push((e.t, 2)),
            "cool" => self.offsets.push((e.t, -2)),
            "flag" => self.flags.push(json!({ "seq": e.seq, "t": e.t, "text": str_field(&e.payload, "text"), "parish": str_field(&e.payload, "parish_id") })),
            "vote" => {
                if let (Some(parish), Some(client), Some(d), Some(o)) =
                    (&e.source.parish, &e.source.client_id, str_field(&e.payload, "dilemma_id"), str_field(&e.payload, "option_id"))
                {
                    let late = e.payload.get("late").and_then(|l| l.as_bool()).unwrap_or(false);
                    self.votes.entry(parish.clone()).or_default().entry(d).or_default().insert(client.clone(), Vote { option_id: o, late, seq: e.seq });
                }
            }
            "personal_pick" => {
                if let Some(client) = &e.source.client_id {
                    let values: Vec<String> = e.payload.get("values").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
                    self.picks.insert(client.clone(), values);
                }
            }
            "commitment" => {
                if let (Some(client), Some(text)) = (&e.source.client_id, str_field(&e.payload, "text")) {
                    self.commitments.insert(client.clone(), text);
                }
            }
            _ => {}
        }
    }

    fn emit_phase(&mut self, kind: &str, t: i64, payload: Value) {
        self.stream.push(Sequenced::Phase { kind: kind.into(), t, payload });
        if self.live {
            let seq = self.seq();
            let ids: Vec<String> = self.clients.values().filter(|c| c.connected && c.role != Role::Lobby).map(|c| c.id.clone()).collect();
            for id in ids {
                if let Some(frame) = self.render(&self.clients[&id], seq) {
                    self.send(&self.clients[&id], frame);
                }
            }
        }
    }

    fn emit_state(&mut self, t: i64) {
        self.stream.push(Sequenced::State { t });
        if self.live {
            let seq = self.seq();
            let ids: Vec<String> = self.clients.values().filter(|c| c.connected && c.role != Role::Lobby).map(|c| c.id.clone()).collect();
            for id in ids {
                if let Some(frame) = self.render(&self.clients[&id], seq) {
                    self.send(&self.clients[&id], frame);
                }
            }
        }
    }

    fn send(&self, client: &Client, frame: String) {
        if let Some(tx) = &client.tx {
            let _ = tx.send(frame);
        }
    }

    fn send_to(&self, client_id: &str, frame: String) {
        if let Some(c) = self.clients.get(client_id) {
            self.send(c, frame);
        }
    }

    /// The sequenced frame `seq` as this client sees it.
    pub fn render(&self, client: &Client, seq: u64) -> Option<String> {
        let item = self.stream.get(seq.checked_sub(1)? as usize)?;
        match item {
            Sequenced::State { t } => self.state_frame(client, seq, *t),
            Sequenced::Phase { kind, t, payload } => {
                if client.role == Role::Lobby {
                    return None;
                }
                Some(proto::frame_from("phase", json!({ "seq": seq, "t": t, "kind": kind, "payload": payload })))
            }
        }
    }

    fn view<'a>(&self, client: &'a Client) -> Option<View<'a>> {
        match client.role {
            Role::Lobby => None,
            Role::Console | Role::Phone => Some(View { role: client.role, parish: client.parish.as_deref(), comms_failed: self.comms_failed }),
            Role::Dm | Role::Projector => Some(View { role: client.role, parish: None, comms_failed: self.comms_failed }),
        }
    }

    fn tick_at(&self, t: i64) -> Option<&crucible_core::log::Tick> {
        let idx = usize::try_from((t - self.t_start) / STEP_MINUTES).ok()?;
        self.run.ticks.get(idx).filter(|tick| tick.t == t)
    }

    fn state_frame(&self, client: &Client, seq: u64, t: i64) -> Option<String> {
        let tick = self.tick_at(t)?;
        let view = self.view(client)?;
        let public = filter::public_tick(tick, &view, &self.parish_ids);
        let mut f = json!({ "seq": seq, "t": t, "hash": tick.state_hash, "clock": self.clock_block(), "public": public });
        if let Some(p) = self.private_view(client) {
            f["private"] = p;
        }
        Some(proto::frame_from("state", f))
    }

    pub fn last_hash(&self) -> String {
        self.run.ticks.last().map(|t| t.state_hash.clone()).unwrap_or_default()
    }

    /// Everything a client needs to render from nothing (PROTOCOL.md section 8).
    pub fn snapshot(&self, client: &Client) -> Value {
        let view = self.view(client);
        let last = self.run.ticks.last();
        let tick = match (&view, last) {
            (Some(v), Some(t)) => filter::public_tick(t, v, &self.parish_ids),
            _ => Value::Null,
        };
        let (history, truncated) = view.map(|v| filter::history(&self.run, &v, &self.parish_ids, HISTORY_CAP)).unwrap_or((vec![], false));
        let mut s = json!({
            "seq": self.seq(), "t": self.horizon, "hash": self.last_hash(), "session": self.session_block, "clock": self.clock_block(),
            "teams": self.run.teams, "tick": tick, "history": history, "history_truncated": truncated,
        });
        if let Some(p) = self.private_view(client) {
            s["private"] = p;
        }
        s
    }

    // ------------------------------------------------------ private views

    fn pending_for(&self, parish: Option<&str>) -> Vec<Value> {
        self.run
            .pending
            .iter()
            .filter(|p| parish.is_none_or(|q| p.parish_id == q))
            .map(|p| {
                let mut v = serde_json::to_value(p).expect("pending serializes");
                let queued = self.log.iter().rev().find(|e| {
                    e.kind == "decide"
                        && e.t > self.horizon
                        && self.entry_parish(e).as_deref() == Some(p.parish_id.as_str())
                        && str_field(&e.payload, "dilemma_id").as_deref() == Some(p.dilemma_id.as_str())
                });
                if let Some(q) = queued {
                    v["queued"] = json!({ "option_id": str_field(&q.payload, "option_id"), "seq": q.seq, "t": q.t });
                }
                v
            })
            .collect()
    }

    fn calls_for(&self, parish: Option<&str>) -> Vec<Value> {
        self.run
            .open_calls
            .iter()
            .filter_map(|oc| {
                let role = match parish {
                    None => "all",
                    Some(p) if oc.holder == p => "holder",
                    Some(p) if oc.asker == p => "asker",
                    Some(_) => return None,
                };
                let call = self.content.aid.call(&oc.call_id)?;
                let answers: Map<String, Value> = call
                    .answers
                    .iter()
                    .map(|(k, a)| (k.clone(), filter::obj(vec![("label", Some(json!(a.label))), ("count", a.count.map(|c| json!(c)))])))
                    .collect();
                let mut v = json!({
                    "call_id": oc.call_id, "role": role, "asker": oc.asker, "holder": oc.holder, "opened_t": oc.opened_t, "deadline_t": oc.deadline_t,
                    "token": call.token, "count": call.count, "ask": call.ask, "line": call.line, "persona_id": call.persona_id, "answers": answers,
                });
                let queued = self
                    .log
                    .iter()
                    .rev()
                    .find(|e| e.kind == "answer_aid" && e.t > self.horizon && str_field(&e.payload, "call_id").as_deref() == Some(oc.call_id.as_str()));
                if let Some(q) = queued {
                    v["queued"] = json!({ "answer": str_field(&q.payload, "answer"), "seq": q.seq, "t": q.t });
                }
                Some(v)
            })
            .collect()
    }

    fn entry_parish(&self, e: &LogEntry) -> Option<String> {
        str_field(&e.payload, "parish_id").or_else(|| e.source.parish.clone())
    }

    fn entries_for(&self, parish: &str) -> Vec<Value> {
        self.log
            .iter()
            .filter(|e| e.kind == "allocate" && self.entry_parish(e).as_deref() == Some(parish))
            .map(|e| json!({ "seq": e.seq, "t": e.t, "token": e.payload["token"], "to": e.payload["to"], "count": e.payload.get("count").cloned().unwrap_or(json!(1)), "by": e.source.role }))
            .collect()
    }

    fn inputs_for(&self, parish: &str) -> Vec<Value> {
        self.log
            .iter()
            .filter(|e| e.core && self.entry_parish(e).as_deref() == Some(parish))
            .map(|e| json!({ "seq": e.seq, "t": e.t, "kind": e.kind, "payload": e.payload, "by": e.source.role }))
            .collect()
    }

    fn stock_of(&self, parish: &str) -> Value {
        self.run.ticks.last().and_then(|t| t.stock.get(parish)).map(|s| json!(s)).unwrap_or_else(|| json!({}))
    }

    fn vote_counts(&self, parish: &str) -> Value {
        let m: Map<String, Value> = self.votes.get(parish).map(|d| d.iter().map(|(k, v)| (k.clone(), json!(v.len()))).collect()).unwrap_or_default();
        Value::Object(m)
    }

    fn private_view(&self, client: &Client) -> Option<Value> {
        match client.role {
            Role::Console => {
                let p = client.parish.as_deref()?;
                Some(json!({
                    "parish": p, "secret_brief": self.profile.brief(p), "pending": self.pending_for(Some(p)), "calls": self.calls_for(Some(p)),
                    "entries": self.entries_for(p), "stock": self.stock_of(p), "votes": self.vote_counts(p), "inputs": self.inputs_for(p),
                }))
            }
            Role::Phone => {
                let p = client.parish.as_deref()?;
                let my_votes: Map<String, Value> = self
                    .votes
                    .get(p)
                    .map(|d| d.iter().filter_map(|(k, v)| v.get(&client.id).map(|vote| (k.clone(), json!(vote.option_id)))).collect())
                    .unwrap_or_default();
                Some(json!({
                    "parish": p, "pending": self.pending_for(Some(p)), "my_votes": my_votes,
                    "my_pick": self.picks.get(&client.id), "my_commitment": self.commitments.get(&client.id),
                }))
            }
            Role::Dm => {
                let entries: Map<String, Value> = self.profile.roster.iter().map(|p| (p.clone(), json!(self.entries_for(p)))).collect();
                let stock: Map<String, Value> = self.parish_ids.iter().map(|p| (p.clone(), self.stock_of(p))).collect();
                let votes: Map<String, Value> = self
                    .votes
                    .iter()
                    .map(|(parish, dilemmas)| {
                        let per: Map<String, Value> = dilemmas
                            .iter()
                            .map(|(d, vs)| {
                                let mut split: BTreeMap<&str, i64> = BTreeMap::new();
                                for v in vs.values() {
                                    *split.entry(v.option_id.as_str()).or_default() += 1;
                                }
                                (d.clone(), json!({ "count": vs.len(), "split": split, "late": vs.values().filter(|v| v.late).count() }))
                            })
                            .collect();
                        (parish.clone(), Value::Object(per))
                    })
                    .collect();
                Some(json!({
                    "briefs": self.profile.secret_briefs, "pending": self.pending_for(None), "calls": self.calls_for(None), "entries": entries, "stock": stock,
                    "votes": votes, "seats": self.seats_block(), "clients": self.clients_block(), "flags": self.flags,
                    "intensity_offset": self.intensity_offset(), "log_len": self.log.len(),
                }))
            }
            Role::Projector | Role::Lobby => None,
        }
    }

    // ------------------------------------------------------- seats, clients

    fn console_state(&self, parish: &str) -> &'static str {
        match self.seats.get(parish).cloned().flatten() {
            None => "free",
            Some(id) => {
                if self.clients.get(&id).map(|c| c.connected).unwrap_or(false) {
                    "held"
                } else {
                    "offline"
                }
            }
        }
    }

    pub fn seats_block(&self) -> Value {
        let seats: Vec<Value> = self
            .profile
            .roster
            .iter()
            .map(|p| {
                let name = self.content.parish(p).map(|x| x.name.clone()).unwrap_or_else(|| p.clone());
                let phones = self.clients.values().filter(|c| c.role == Role::Phone && c.connected && c.parish.as_deref() == Some(p)).count();
                json!({ "parish": p, "name": name, "console": self.console_state(p), "console_client": self.seats.get(p).cloned().flatten(), "phones": phones })
            })
            .collect();
        json!(seats)
    }

    fn clients_block(&self) -> Value {
        let list: Vec<Value> = self
            .clients
            .values()
            .map(|c| json!({ "client_id": c.id, "role": c.role, "parish": c.parish, "connected": c.connected, "name": c.name, "waiting_for": c.waiting_for, "last_ack": c.last_ack }))
            .collect();
        json!(list)
    }

    fn lobby_frame(&self) -> String {
        proto::frame_from("lobby", json!({ "seats": self.seats_block() }))
    }

    fn roster_frame(&self) -> String {
        proto::frame_from("roster", json!({ "seats": self.seats_block(), "clients": self.clients_block() }))
    }

    /// The DM sees every seat change; lobby devices see the seats. `except`
    /// names the device whose own answer the caller sends next, so that the
    /// answer to its frame stays the first thing it receives.
    fn broadcast_roster(&self, except: Option<&str>) {
        let roster = self.roster_frame();
        let lobby = self.lobby_frame();
        for c in self.clients.values().filter(|c| c.connected && Some(c.id.as_str()) != except) {
            match c.role {
                Role::Dm => self.send(c, roster.clone()),
                Role::Lobby => self.send(c, lobby.clone()),
                _ => {}
            }
        }
    }

    fn persist_clients(&self) {
        if let Some(s) = &self.store {
            let file = ClientsFile { clients: self.clients.values().cloned().collect(), seats: self.seats.clone() };
            if let Err(e) = s.write_json(CLIENTS_FILE, &file) {
                eprintln!("clients.json: {e}");
            }
        }
    }

    fn new_client(&mut self, role: Role, parish: Option<String>, name: Option<String>, tx: UnboundedSender<String>) -> String {
        let id = codes::new_client_id();
        let c = Client {
            id: id.clone(),
            role,
            parish,
            resume_token: codes::new_token(),
            name,
            waiting_for: None,
            connected: true,
            tx: Some(tx),
            results: BTreeMap::new(),
            last_ack: 0,
        };
        self.clients.insert(id.clone(), c);
        id
    }

    /// Takes the console seat for `client_id` unless a connected device holds it.
    fn take_console(&mut self, parish: &str, client_id: &str) -> bool {
        match self.seats.get(parish).cloned().flatten() {
            Some(h) if h == client_id => true,
            Some(h) => {
                if self.clients.get(&h).map(|c| c.connected).unwrap_or(false) {
                    return false;
                }
                self.demote(&h);
                self.seats.insert(parish.to_string(), Some(client_id.to_string()));
                true
            }
            None => {
                self.seats.insert(parish.to_string(), Some(client_id.to_string()));
                true
            }
        }
    }

    /// Gives the seat to `client_id` whatever its state (the DM's admit and reassign).
    fn force_console(&mut self, parish: &str, client_id: &str) {
        if let Some(h) = self.seats.get(parish).cloned().flatten() {
            if h != client_id {
                self.demote(&h);
                if self.clients.get(&h).map(|c| c.connected).unwrap_or(false) {
                    let frame = self.welcome_frame(&self.clients[&h]);
                    self.send_to(&h, frame);
                }
            }
        }
        self.seats.insert(parish.to_string(), Some(client_id.to_string()));
    }

    fn demote(&mut self, client_id: &str) {
        if let Some(c) = self.clients.get_mut(client_id) {
            if c.role == Role::Console {
                c.role = Role::Phone;
            }
        }
    }

    fn welcome_frame(&self, c: &Client) -> String {
        proto::frame_from(
            "welcome",
            json!({ "client_id": c.id, "resume_token": c.resume_token, "role": c.role, "parish": c.parish, "bundle_hash": self.meta.bundle_hash, "snapshot": self.snapshot(c) }),
        )
    }

    fn admitted_frame(&self, c: &Client) -> String {
        proto::frame_from(
            "admitted",
            json!({ "role": c.role, "parish": c.parish, "client_id": c.id, "resume_token": c.resume_token, "snapshot": self.snapshot(c) }),
        )
    }

    /// A device says hello. `has_bundle` says whether a bundle hash check is meaningful.
    pub fn hello(&mut self, h: &Hello, tx: UnboundedSender<String>, has_bundle: bool) -> Outcome {
        if let Some(bh) = &h.bundle_hash {
            if has_bundle && bh != &self.meta.bundle_hash {
                return Outcome::Reject { frame: proto::reload(format!("the host serves bundle {}; reload", &self.meta.bundle_hash[..12])) };
            }
        }
        if let Some(c) = &h.session_code {
            if codes::normalize_code(c) != self.meta.code {
                return Outcome::Reject { frame: proto::error("no_such_session", format!("no session {}", codes::normalize_code(c))) };
            }
        }
        if let (Some(id), Some(rt)) = (&h.client_id, &h.resume_token) {
            let ok = self.clients.get(id).map(|c| &c.resume_token == rt).unwrap_or(false);
            if !ok {
                return Outcome::Reject { frame: proto::error("unknown_client", "no such device; join afresh") };
            }
            {
                let c = self.clients.get_mut(id).expect("checked");
                c.connected = true;
                c.tx = Some(tx);
                if h.name.is_some() {
                    c.name = h.name.clone();
                }
            }
            let c = &self.clients[id];
            let outcome = match (c.role, &c.waiting_for) {
                (Role::Lobby, Some(parish)) => {
                    Outcome::Waiting { client_id: id.clone(), frame: proto::frame_from("waiting", json!({ "reason": "console_held", "parish": parish })) }
                }
                (Role::Lobby, None) => Outcome::Lobby { client_id: id.clone(), frame: self.lobby_frame() },
                _ => Outcome::Welcome { client_id: id.clone(), frame: self.welcome_frame(c) },
            };
            self.broadcast_roster(Some(id));
            return outcome;
        }
        if let Some(tok) = &h.token {
            let t = self.meta.tokens.clone();
            let outcome = if tok == &t.dm {
                if h.pin.as_deref() != Some(self.meta.dm_pin.as_str()) {
                    return Outcome::Reject { frame: proto::error("bad_pin", "the DM PIN does not match") };
                }
                let id = self.new_client(Role::Dm, None, h.name.clone(), tx);
                Outcome::Welcome { frame: self.welcome_frame(&self.clients[&id]), client_id: id }
            } else if tok == &t.projector {
                let id = self.new_client(Role::Projector, None, h.name.clone(), tx);
                Outcome::Welcome { frame: self.welcome_frame(&self.clients[&id]), client_id: id }
            } else if let Some((parish, _)) = t.tables.iter().find(|(_, tt)| *tt == tok) {
                let parish = parish.clone();
                let role = match h.role.as_deref() {
                    None => Role::Phone,
                    Some(r) => match Role::seat(r) {
                        Some(r) => r,
                        None => return Outcome::Reject { frame: proto::error("bad_frame", format!("role {r} is not console or phone")) },
                    },
                };
                let id = self.new_client(Role::Phone, Some(parish.clone()), h.name.clone(), tx);
                if role == Role::Console {
                    if self.take_console(&parish, &id) {
                        self.clients.get_mut(&id).expect("just made").role = Role::Console;
                        Outcome::Welcome { frame: self.welcome_frame(&self.clients[&id]), client_id: id }
                    } else {
                        let c = self.clients.get_mut(&id).expect("just made");
                        c.role = Role::Lobby;
                        c.waiting_for = Some(parish.clone());
                        Outcome::Waiting { client_id: id, frame: proto::frame_from("waiting", json!({ "reason": "console_held", "parish": parish })) }
                    }
                } else {
                    Outcome::Welcome { frame: self.welcome_frame(&self.clients[&id]), client_id: id }
                }
            } else {
                return Outcome::Reject { frame: proto::error("bad_token", "no role has this token") };
            };
            self.persist_clients();
            self.broadcast_roster(outcome.client_id());
            return outcome;
        }
        if h.session_code.is_some() {
            let id = self.new_client(Role::Lobby, None, h.name.clone(), tx);
            self.persist_clients();
            self.broadcast_roster(Some(&id));
            return Outcome::Lobby { frame: self.lobby_frame(), client_id: id };
        }
        Outcome::Reject { frame: proto::error("bad_frame", "hello needs a session_code or a token") }
    }

    /// A lobby device asks for a seat. Returns the frame to send it.
    pub fn claim_seat(&mut self, client_id: &str, parish: &str, role: &str) -> String {
        let parish = parish.to_lowercase();
        if !self.profile.roster.contains(&parish) {
            return proto::error("unknown_parish", format!("{parish} is not a table in this session"));
        }
        let Some(role) = Role::seat(role) else { return proto::error("bad_frame", format!("role {role} is not console or phone")) };
        if !self.clients.contains_key(client_id) {
            return proto::error("unknown_client", "say hello first");
        }
        let frame = if role == Role::Phone || self.take_console(&parish, client_id) {
            let c = self.clients.get_mut(client_id).expect("checked");
            c.role = role;
            c.parish = Some(parish);
            c.waiting_for = None;
            self.admitted_frame(&self.clients[client_id])
        } else {
            let c = self.clients.get_mut(client_id).expect("checked");
            c.waiting_for = Some(parish.clone());
            proto::frame_from("waiting", json!({ "reason": "console_held", "parish": parish }))
        };
        self.persist_clients();
        self.broadcast_roster(Some(client_id));
        frame
    }

    pub fn ack(&mut self, client_id: &str, seq: u64) {
        if let Some(c) = self.clients.get_mut(client_id) {
            c.last_ack = c.last_ack.max(seq);
        }
    }

    pub fn disconnect(&mut self, client_id: &str) {
        if let Some(c) = self.clients.get_mut(client_id) {
            c.connected = false;
            c.tx = None;
        }
        self.broadcast_roster(None);
    }

    /// Frames for a client that saw a gap: every sequenced frame after
    /// `from_seq`, or one snapshot when the gap is large.
    pub fn resync(&self, client_id: &str, from_seq: u64) -> Vec<String> {
        let Some(c) = self.clients.get(client_id) else { return vec![] };
        let seq = self.seq();
        if from_seq >= seq {
            return vec![];
        }
        if seq - from_seq > 200 {
            return vec![proto::frame_from("snapshot", json!({ "snapshot": self.snapshot(c) }))];
        }
        ((from_seq + 1)..=seq).filter_map(|s| self.render(c, s)).collect()
    }

    // ------------------------------------------------------------ intents

    /// Handles one intent and returns the `intent_result` frame.
    pub fn intent(&mut self, client_id: &str, client_seq: u64, kind: &str, payload: Value) -> String {
        let Some(client) = self.clients.get(client_id) else { return proto::error("unknown_client", "say hello first") };
        if let Some(r) = client.results.get(&client_seq) {
            return r.to_string();
        }
        let (role, parish) = (client.role, client.parish.clone());
        let result = match self.handle_intent(client_id, role, parish.as_deref(), kind, payload) {
            Ok((input_seq, applied_t)) => proto::intent_accepted(client_seq, input_seq, applied_t),
            Err((reason, message)) => proto::intent_rejected(client_seq, reason, message),
        };
        if let Some(c) = self.clients.get_mut(client_id) {
            c.results.insert(client_seq, result.clone());
            while c.results.len() > 1000 {
                let first = *c.results.keys().next().expect("non-empty");
                c.results.remove(&first);
            }
        }
        result.to_string()
    }

    fn handle_intent(&mut self, client_id: &str, role: Role, seat: Option<&str>, kind: &str, mut payload: Value) -> Result<(u64, i64), Rejection> {
        if !payload.is_object() {
            payload = json!({});
        }
        let applied_t = self.horizon + STEP_MINUTES;
        let source = |parish: Option<String>, role: Role| Source { client_id: Some(client_id.to_string()), parish, role: role.as_str().into() };
        match role {
            Role::Lobby | Role::Projector => Err(("bad_role", format!("a {} sends no intents", role.as_str()))),
            Role::Phone => {
                if !PHONE_KINDS.contains(&kind) {
                    return Err(("bad_role", format!("a phone does not send {kind}")));
                }
                let parish = seat.ok_or_else(|| ("no_seat", "no parish".to_string()))?.to_string();
                self.validate_phone(&parish, kind, &mut payload)?;
                let t = self.horizon;
                let seq =
                    self.record(LogEntry { seq: 0, t, wall: codes::wall_now(), source: source(Some(parish), role), kind: kind.into(), payload, core: false });
                Ok((seq, t))
            }
            Role::Console => {
                if !CONSOLE_KINDS.contains(&kind) {
                    return Err(("bad_role", format!("a console does not send {kind}")));
                }
                let parish = seat.ok_or_else(|| ("no_seat", "no parish".to_string()))?.to_string();
                if let Some(m) = payload.as_object_mut() {
                    m.remove("parish_id");
                }
                self.validate_core(&parish, kind, &payload, applied_t)?;
                let seq = self.record(LogEntry {
                    seq: 0,
                    t: applied_t,
                    wall: codes::wall_now(),
                    source: source(Some(parish), role),
                    kind: kind.into(),
                    payload,
                    core: true,
                });
                Ok((seq, applied_t))
            }
            Role::Dm => {
                if CONSOLE_KINDS.contains(&kind) {
                    let parish = str_field(&payload, "parish_id")
                        .map(|p| p.to_lowercase())
                        .ok_or_else(|| ("unknown_parish", "entering for a table needs parish_id".to_string()))?;
                    if !self.parish_ids.contains(&parish) {
                        return Err(("unknown_parish", format!("no parish {parish}")));
                    }
                    payload["parish_id"] = json!(parish);
                    self.validate_core(&parish, kind, &payload, applied_t)?;
                    let seq = self.record(LogEntry {
                        seq: 0,
                        t: applied_t,
                        wall: codes::wall_now(),
                        source: source(Some(parish), role),
                        kind: kind.into(),
                        payload,
                        core: true,
                    });
                    return Ok((seq, applied_t));
                }
                if !DM_KINDS.contains(&kind) {
                    return Err(("unknown_kind", format!("no intent kind {kind}")));
                }
                self.dm_intent(client_id, kind, payload, applied_t)
            }
        }
    }

    fn validate_phone(&self, parish: &str, kind: &str, payload: &mut Value) -> Result<(), Rejection> {
        match kind {
            "vote" => {
                let d = str_field(payload, "dilemma_id").ok_or(("bad_payload", "vote needs dilemma_id".to_string()))?;
                let o = str_field(payload, "option_id").ok_or(("bad_payload", "vote needs option_id".to_string()))?;
                let dilemma = self.content.dilemma(&d).ok_or(("unknown_dilemma", format!("no dilemma {d}")))?;
                if !dilemma.options.iter().any(|x| x.id == o) {
                    return Err(("unknown_option", format!("{d} has no option {o}")));
                }
                let open = self.run.pending.iter().any(|p| p.parish_id == parish && p.dilemma_id == d);
                payload["late"] = json!(!open);
                Ok(())
            }
            "personal_pick" => self.check_values(payload),
            "commitment" => {
                if str_field(payload, "text").map(|t| t.trim().is_empty()).unwrap_or(true) {
                    return Err(("bad_payload", "commitment needs text".to_string()));
                }
                Ok(())
            }
            _ => Err(("unknown_kind", format!("no phone kind {kind}"))),
        }
    }

    fn check_values(&self, payload: &Value) -> Result<(), Rejection> {
        let values: Vec<String> =
            payload.get("values").and_then(|v| serde_json::from_value(v.clone()).ok()).ok_or(("bad_payload", "values must be a list of ids".to_string()))?;
        let deck = &self.profile.values_deck;
        let known: Vec<String> = self.content.values.values_deck.iter().map(|v| v.id.clone()).collect();
        for v in &values {
            if !deck.contains(v) && !known.contains(v) {
                return Err(("bad_values", format!("{v} is not in the deck")));
            }
        }
        let want = self.profile.values_to_pick;
        if values.is_empty() || (want > 0 && values.len() != want) {
            return Err(("bad_values", format!("pick exactly {want} values")));
        }
        let distinct: BTreeSet<&String> = values.iter().collect();
        if distinct.len() != values.len() {
            return Err(("bad_values", "values repeat".to_string()));
        }
        Ok(())
    }

    fn held(&self, parish: &str, token: &str) -> i64 {
        self.run.ticks.last().and_then(|t| t.stock.get(parish)).and_then(|s| s.get(token)).copied().unwrap_or(0)
    }

    fn validate_core(&self, parish: &str, kind: &str, payload: &Value, applied_t: i64) -> Result<(), Rejection> {
        if self.horizon >= self.t_end {
            return Err(("session_over", "the run has reached its end".to_string()));
        }
        let probe = LogEntry {
            seq: 0,
            t: applied_t,
            wall: String::new(),
            source: Source { client_id: None, parish: Some(parish.into()), role: String::new() },
            kind: kind.into(),
            payload: payload.clone(),
            core: true,
        };
        let input = core_input(&probe).ok_or(("bad_payload", format!("{kind}: fields missing or malformed")))?;
        let parish_known = |p: &str| self.parish_ids.iter().any(|x| x == p);
        match &input {
            Input::LockValues { .. } => self.check_values(payload),
            Input::Allocate { token, to, count, .. } => {
                let lock_t = self.profile.core.allocation_lock_t.ok_or(("after_lock", "this session has no allocation round".to_string()))?;
                if applied_t > lock_t {
                    return Err(("after_lock", format!("the allocation locked at {}", sim_clock(lock_t))));
                }
                if !self.content.resources.tokens.contains_key(token) {
                    return Err(("unknown_token", format!("no token {token}")));
                }
                if *count < 1 {
                    return Err(("bad_payload", "count must be at least 1".to_string()));
                }
                if to != "keep" && (!parish_known(to) || to == parish) {
                    return Err(("unknown_parish", format!("send to another parish, not {to}")));
                }
                let have = self.held(parish, token);
                let already: i64 = self
                    .log
                    .iter()
                    .filter(|e| {
                        e.kind == "allocate"
                            && self.entry_parish(e).as_deref() == Some(parish)
                            && e.payload["token"] == json!(token)
                            && e.payload["to"] != json!("keep")
                    })
                    .map(|e| e.payload.get("count").and_then(|c| c.as_i64()).unwrap_or(1))
                    .sum();
                if have == 0 || (to != "keep" && already + *count > have) {
                    return Err(("lacks_tokens", format!("{parish} holds {have} {token}; {already} already entered")));
                }
                Ok(())
            }
            Input::Decide { dilemma_id, option_id, .. } => {
                let d = self.content.dilemma(dilemma_id).ok_or(("unknown_dilemma", format!("no dilemma {dilemma_id}")))?;
                if !d.options.iter().any(|o| &o.id == option_id) {
                    return Err(("unknown_option", format!("{dilemma_id} has no option {option_id}")));
                }
                let open = self
                    .run
                    .pending
                    .iter()
                    .find(|p| p.parish_id == parish && &p.dilemma_id == dilemma_id)
                    .ok_or(("not_open", format!("{dilemma_id} is not open for {parish}")))?;
                if open.deadline_t < applied_t {
                    return Err(("expired", format!("the deadline {} passed", sim_clock(open.deadline_t))));
                }
                Ok(())
            }
            Input::Mayday { call_id, .. } => {
                let call = self.content.aid.call(call_id).ok_or(("unknown_call", format!("no call {call_id}")))?;
                if call.asker != parish {
                    return Err(("not_asker", format!("{call_id} is {}'s call", call.asker)));
                }
                let raised = self.run.open_calls.iter().any(|c| &c.call_id == call_id)
                    || self.run.ticks.iter().flat_map(|t| &t.events).any(|e| matches!(e, crucible_core::log::Event::Mayday { call_id: c, .. } if c == call_id))
                    || self
                        .log
                        .iter()
                        .any(|e| e.kind == "mayday" && e.t > self.horizon && str_field(&e.payload, "call_id").as_deref() == Some(call_id.as_str()));
                if raised {
                    return Err(("not_asker", format!("{call_id} was already raised")));
                }
                Ok(())
            }
            Input::AnswerAid { call_id, answer, .. } => {
                let call = self.content.aid.call(call_id).ok_or(("unknown_call", format!("no call {call_id}")))?;
                let open = self.run.open_calls.iter().find(|c| &c.call_id == call_id).ok_or(("not_open", format!("{call_id} is not open")))?;
                if open.holder != parish {
                    return Err(("not_holder", format!("{call_id} is {}'s to answer", open.holder)));
                }
                if open.deadline_t < applied_t {
                    return Err(("expired", format!("the window closed at {}", sim_clock(open.deadline_t))));
                }
                if !call.answers.contains_key(answer) {
                    return Err(("bad_answer", format!("{call_id} takes {}", call.answers.keys().cloned().collect::<Vec<_>>().join(", "))));
                }
                Ok(())
            }
            Input::DeclareHidden { .. } => Ok(()),
            Input::RepairSend { token, to, count, .. } => {
                if !self.content.resources.tokens.contains_key(token) {
                    return Err(("unknown_token", format!("no token {token}")));
                }
                if !parish_known(to) || to == parish {
                    return Err(("unknown_parish", format!("send to another parish, not {to}")));
                }
                if *count < 1 || self.held(parish, token) < *count {
                    return Err(("lacks_tokens", format!("{parish} holds {} {token}", self.held(parish, token))));
                }
                Ok(())
            }
            Input::CreditLine { to, text, .. } => {
                if !parish_known(to) {
                    return Err(("unknown_parish", format!("no parish {to}")));
                }
                if text.trim().is_empty() {
                    return Err(("bad_payload", "a line of credit needs text".to_string()));
                }
                Ok(())
            }
            Input::SwapDilemma { from, to, .. } => {
                for d in [from, to] {
                    if self.content.dilemma(d).is_none() {
                        return Err(("unknown_dilemma", format!("no dilemma {d}")));
                    }
                }
                Ok(())
            }
        }
    }

    fn dm_intent(&mut self, client_id: &str, kind: &str, payload: Value, applied_t: i64) -> Result<(u64, i64), Rejection> {
        let dm = Source { client_id: Some(client_id.to_string()), parish: None, role: "dm".into() };
        let entry = |t: i64, kind: &str, payload: Value, core: bool| LogEntry {
            seq: 0,
            t,
            wall: codes::wall_now(),
            source: dm.clone(),
            kind: kind.into(),
            payload,
            core,
        };
        let phase = self.phase;
        let bad_phase =
            |what: &str| Err(("bad_phase", format!("{what} does not fit phase {}", serde_json::to_string(&phase).unwrap_or_default().trim_matches('"'))));
        let t = self.horizon;
        match kind {
            "open_island" => {
                if phase != Phase::Lobby {
                    return bad_phase("open_island");
                }
                Ok((self.record(entry(t, kind, payload, false)), t))
            }
            "open_quarter" => {
                let next = match phase {
                    Phase::Lobby | Phase::Island => 0,
                    Phase::QuarterClose => self.quarter.map(|q| q + 1).unwrap_or(0),
                    _ => return bad_phase("open_quarter"),
                };
                if next >= self.profile.quarters.len() {
                    return Err(("bad_phase", "no quarter left; send debrief".to_string()));
                }
                Ok((self.record(entry(t, kind, payload, false)), t))
            }
            "start" | "resume" => {
                if !matches!(phase, Phase::QuarterOpen | Phase::Paused) {
                    return bad_phase("start");
                }
                Ok((self.record(entry(t, "start", payload, false)), t))
            }
            "pause" => {
                if phase != Phase::Running {
                    return bad_phase("pause");
                }
                Ok((self.record(entry(t, kind, payload, false)), t))
            }
            "advance" | "skip_ahead" => {
                if !matches!(phase, Phase::QuarterOpen | Phase::Running | Phase::Paused) {
                    return bad_phase(kind);
                }
                let n = if kind == "skip_ahead" { i64::MAX } else { payload.get("ticks").and_then(|v| v.as_i64()).unwrap_or(1).clamp(1, 100_000) };
                let seq = self.record(entry(t, kind, payload, false));
                self.advance(n);
                if self.phase == Phase::Running {
                    self.next_tick_at = Some(Instant::now() + Duration::from_secs_f64(self.seconds_per_tick()));
                }
                Ok((seq, self.horizon))
            }
            "heat" | "cool" => {
                if self.horizon >= self.t_end {
                    return Err(("session_over", "the run has reached its end".to_string()));
                }
                Ok((self.record(entry(applied_t, kind, payload, true)), applied_t))
            }
            "swap" => {
                let parish = str_field(&payload, "parish_id").map(|p| p.to_lowercase()).ok_or(("unknown_parish", "swap needs parish_id".to_string()))?;
                if !self.parish_ids.contains(&parish) {
                    return Err(("unknown_parish", format!("no parish {parish}")));
                }
                let mut payload = payload;
                payload["parish_id"] = json!(parish);
                self.validate_core(&parish, kind, &payload, applied_t)?;
                let mut e = entry(applied_t, kind, payload, true);
                e.source.parish = Some(parish);
                Ok((self.record(e), applied_t))
            }
            "admit" => {
                let target = str_field(&payload, "client_id").ok_or(("bad_payload", "admit needs client_id".to_string()))?;
                let parish =
                    self.clients.get(&target).and_then(|c| c.waiting_for.clone()).ok_or(("unknown_client", format!("{target} is not waiting for a seat")))?;
                let seq = self.record(entry(t, kind, payload, false));
                self.seat_client(&parish, &target);
                Ok((seq, t))
            }
            "reassign" => {
                let parish = str_field(&payload, "parish_id").map(|p| p.to_lowercase()).ok_or(("unknown_parish", "reassign needs parish_id".to_string()))?;
                if !self.profile.roster.contains(&parish) {
                    return Err(("unknown_parish", format!("{parish} is not a table")));
                }
                let target = str_field(&payload, "client_id").ok_or(("bad_payload", "reassign needs client_id".to_string()))?;
                if !self.clients.get(&target).map(|c| c.connected).unwrap_or(false) {
                    return Err(("unknown_client", format!("{target} is not connected")));
                }
                let seq = self.record(entry(t, kind, payload, false));
                self.seat_client(&parish, &target);
                Ok((seq, t))
            }
            "flag" => {
                if str_field(&payload, "text").map(|s| s.trim().is_empty()).unwrap_or(true) {
                    return Err(("bad_payload", "flag needs text".to_string()));
                }
                Ok((self.record(entry(t, kind, payload, false)), t))
            }
            "debrief" => {
                let last = self.quarter.map(|q| q + 1 == self.profile.quarters.len()).unwrap_or(false);
                if !(phase == Phase::QuarterClose && last) && self.horizon < self.t_end {
                    return bad_phase("debrief");
                }
                if phase == Phase::Debrief {
                    return bad_phase("debrief");
                }
                Ok((self.record(entry(t, kind, payload, false)), t))
            }
            "export" => {
                let seq = self.record(entry(t, kind, payload, false));
                self.export().map_err(|e| ("export_failed", e.to_string()))?;
                Ok((seq, t))
            }
            _ => Err(("unknown_kind", format!("no DM kind {kind}"))),
        }
    }

    /// The DM gives `parish`'s console to `target` (admit or reassign).
    fn seat_client(&mut self, parish: &str, target: &str) {
        self.force_console(parish, target);
        if let Some(c) = self.clients.get_mut(target) {
            c.role = Role::Console;
            c.parish = Some(parish.to_string());
            c.waiting_for = None;
        }
        let frame = self.admitted_frame(&self.clients[target]);
        self.send_to(target, frame);
        self.persist_clients();
        self.broadcast_roster(None);
    }

    // -------------------------------------------------------------- clock

    /// Advances the horizon by up to `n` ticks, never past the quarter's end:
    /// one core re-run, one `state` frame per new tick. Returns the ticks advanced.
    pub fn advance(&mut self, n: i64) -> i64 {
        let Some(end) = self.quarter_end() else { return 0 };
        let target = self.horizon.saturating_add(n.saturating_mul(STEP_MINUTES)).min(end);
        if target <= self.horizon {
            return 0;
        }
        let old = self.horizon;
        self.horizon = target;
        self.recompute();
        let mut t = old + STEP_MINUTES;
        while t <= target {
            self.record(host_entry(t, "tick", json!({})));
            t += STEP_MINUTES;
        }
        (target - old) / STEP_MINUTES
    }

    /// How long until the next tick is due; `None` when the clock is stopped.
    pub fn next_delay(&self) -> Option<Duration> {
        if self.phase != Phase::Running {
            return None;
        }
        self.next_tick_at.map(|at| at.saturating_duration_since(Instant::now()))
    }

    /// Advances every tick that is due. Catches up when the host fell behind.
    pub fn clock_due(&mut self) -> i64 {
        let mut advanced = 0;
        while self.phase == Phase::Running {
            let Some(at) = self.next_tick_at else { break };
            if Instant::now() < at {
                break;
            }
            let spt = Duration::from_secs_f64(self.seconds_per_tick());
            if self.advance(1) == 0 {
                break;
            }
            advanced += 1;
            self.next_tick_at = Some(at + spt);
        }
        advanced
    }

    // ------------------------------------------------------------- export

    fn votes_export(&self) -> Value {
        json!({ "votes": self.votes, "picks": self.picks, "commitments": self.commitments })
    }

    /// Writes `run.json`, `votes.json` and `flags.json` to the session
    /// directory and returns the run log text.
    pub fn export(&mut self) -> Result<String> {
        let text = self.run.to_json();
        if let Some(s) = &self.store {
            s.write_text(RUN_FILE, &text).context("run.json")?;
            s.write_json(VOTES_FILE, &self.votes_export()).context("votes.json")?;
            s.write_json(FLAGS_FILE, &self.flags).context("flags.json")?;
        }
        Ok(text)
    }

    pub fn store_dir(&self) -> Option<&Path> {
        self.store.as_ref().map(|s| s.dir())
    }

    /// The join links (PROTOCOL.md section 3).
    pub fn links(&self) -> Value {
        let base = format!("{}/j/{}", self.meta.public_url.trim_end_matches('/'), self.meta.code);
        let tables: Map<String, Value> = self.meta.tokens.tables.iter().map(|(p, t)| (p.clone(), json!(format!("{base}#t={t}")))).collect();
        json!({
            "code": self.meta.code, "public_url": self.meta.public_url, "lobby": base, "tables": tables,
            "projector": format!("{base}#p={}", self.meta.tokens.projector), "dm": format!("{base}#dm={}", self.meta.tokens.dm),
        })
    }

    pub fn health(&self) -> Value {
        json!({
            "ok": true, "code": self.meta.code, "phase": self.phase, "t": self.horizon, "seq": self.seq(),
            "clients": self.clients.values().filter(|c| c.connected).count(), "hash": self.last_hash(),
        })
    }

    pub fn profile_raw(&self) -> &Value {
        &self.profile_raw
    }
}

/// Human tables for the roster, drift-model ai for the rest. AI parishes get
/// three deck values chosen by position, so the run log records them and
/// replay needs nothing else.
fn initial_teams(parish_ids: &[String], profile: &Profile) -> Vec<Team> {
    let deck = &profile.values_deck;
    let n = deck.len().max(1);
    parish_ids
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let human = profile.roster.contains(p);
            let stated = if human || deck.is_empty() { vec![] } else { (0..3).map(|k| deck[(i * 3 + k) % n].clone()).collect() };
            Team { parish_id: p.clone(), controller: if human { "human" } else { "ai" }.into(), stated_values: stated, statement: None }
        })
        .collect()
}

impl std::fmt::Debug for Host {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Host(code {}, phase {:?}, horizon {}, seq {}, log {})", self.meta.code, self.phase, self.horizon, self.seq(), self.log.len())
    }
}

/// Reads a session directory's log and runs the core to the saved horizon
/// without serving anything: `crucible-host --restore <dir> --export-only <out>`.
pub fn export_offline(content: Arc<Content>, dir: &Path) -> Result<String> {
    let mut h = Host::restore(content, dir, String::new(), None, 1.0)?;
    h.export().map_err(|e| anyhow!("export: {e}"))
}
