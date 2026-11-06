//! HTTP (the bundle, the join QR, links, export, health), the WebSocket
//! endpoint that speaks PROTOCOL.md, and the tick loop that advances the
//! horizon on the real clock. The only module that awaits anything.

use crate::codes;
use crate::protocol::{self as proto, ClientFrame, MAX_CLIENT_FRAME};
use crate::session::{Host, Outcome};
use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use std::collections::BTreeMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tokio::sync::{mpsc, Notify};

/// Abuse controls (PROTOCOL.md section 7.7 of the decision record).
#[derive(Debug, Clone)]
pub struct Limits {
    pub max_connections: usize,
    pub failed_hellos_per_minute: u32,
}

impl Default for Limits {
    fn default() -> Self {
        Limits { max_connections: 200, failed_hellos_per_minute: 20 }
    }
}

/// Everything the handlers share. One session in LAN mode; the cloud mode
/// will hold a registry of these keyed by code (PROTOCOL.md section 15).
pub struct App {
    pub host: Mutex<Host>,
    pub bundle: Option<Bytes>,
    pub bundle_path: String,
    pub notify: Notify,
    pub limits: Limits,
    connections: Mutex<usize>,
    failures: Mutex<BTreeMap<IpAddr, (u32, Instant)>>,
}

impl App {
    pub fn new(host: Host, bundle: Option<Vec<u8>>, bundle_path: impl Into<String>, limits: Limits) -> App {
        App {
            host: Mutex::new(host),
            bundle: bundle.map(Bytes::from),
            bundle_path: bundle_path.into(),
            notify: Notify::new(),
            limits,
            connections: Mutex::new(0),
            failures: Mutex::new(BTreeMap::new()),
        }
    }

    fn limited(&self, ip: IpAddr) -> bool {
        let f = self.failures.lock().expect("failures lock");
        f.get(&ip).map(|(n, since)| *n >= self.limits.failed_hellos_per_minute && since.elapsed() < Duration::from_secs(60)).unwrap_or(false)
    }

    fn note_failure(&self, ip: IpAddr) {
        let mut f = self.failures.lock().expect("failures lock");
        let e = f.entry(ip).or_insert((0, Instant::now()));
        if e.1.elapsed() > Duration::from_secs(60) {
            *e = (0, Instant::now());
        }
        e.0 += 1;
    }

    fn clear_failures(&self, ip: IpAddr) {
        self.failures.lock().expect("failures lock").remove(&ip);
    }
}

/// SHA-256 hex of the served bundle (the `bundle_hash` of `welcome`).
pub fn bundle_hash(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    format!("{:x}", Sha256::digest(bytes))
}

/// The join QR as SVG.
pub fn qr_svg(text: &str) -> Option<String> {
    use qrcode::render::svg;
    let code = qrcode::QrCode::new(text.as_bytes()).ok()?;
    Some(code.render::<svg::Color>().min_dimensions(256, 256).dark_color(svg::Color("#101418")).light_color(svg::Color("#ffffff")).build())
}

/// The join QR for a dark terminal, in half-block characters.
pub fn qr_terminal(text: &str) -> Option<String> {
    use qrcode::render::unicode::Dense1x2;
    let code = qrcode::QrCode::new(text.as_bytes()).ok()?;
    Some(code.render::<Dense1x2>().dark_color(Dense1x2::Light).light_color(Dense1x2::Dark).build())
}

pub fn router(app: Arc<App>) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/j/{code}", get(join_page))
        .route("/join", get(join_qr))
        .route("/join/{file}", get(table_qr))
        .route("/links", get(links))
        .route("/export", get(export))
        .route("/health", get(health))
        .route("/ws", get(ws))
        .with_state(app)
}

/// Serves until the listener fails. Pair it with `tick_loop`.
pub async fn serve(app: Arc<App>, listener: TcpListener) -> std::io::Result<()> {
    axum::serve(listener, router(app).into_make_service_with_connect_info::<SocketAddr>()).await
}

/// Advances the horizon whenever a tick is due while the clock runs; woken
/// by `App::notify` when an intent may have changed the clock.
pub async fn tick_loop(app: Arc<App>) {
    loop {
        let delay = app.host.lock().expect("host lock").next_delay();
        match delay {
            None => app.notify.notified().await,
            Some(d) => {
                tokio::select! {
                    _ = tokio::time::sleep(d) => { app.host.lock().expect("host lock").clock_due(); }
                    _ = app.notify.notified() => {}
                }
            }
        }
    }
}

fn html(body: String) -> Response {
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8"), (header::CACHE_CONTROL, "no-store")], body).into_response()
}

fn bundle_response(app: &App) -> Response {
    match &app.bundle {
        Some(b) => ([(header::CONTENT_TYPE, "text/html; charset=utf-8"), (header::CACHE_CONTROL, "no-store")], b.clone()).into_response(),
        None => {
            let host = app.host.lock().expect("host lock");
            html(format!(
                "<!doctype html><meta charset=utf-8><title>Crucible host</title>\
                 <body style=\"font-family:system-ui;background:#0a0e14;color:#e6ebf0;padding:2rem\">\
                 <h1>Crucible host</h1><p>Session <b>{}</b> is running, but the client bundle was not found at <code>{}</code>.</p>\
                 <p>Build it with <code>node board-rts/build.mjs parish-90</code> and start the host with <code>--bundle</code> pointing at it.</p>\
                 <p>The protocol endpoint is <code>/ws</code>; the join QR is at <code>/join</code>.</p></body>",
                host.meta.code, app.bundle_path
            ))
        }
    }
}

async fn index(State(app): State<Arc<App>>) -> Response {
    bundle_response(&app)
}

async fn join_page(Path(code): Path<String>, State(app): State<Arc<App>>) -> Response {
    let known = app.host.lock().expect("host lock").meta.code == codes::normalize_code(&code);
    if known {
        bundle_response(&app)
    } else {
        (
            StatusCode::NOT_FOUND,
            html(format!("<!doctype html><meta charset=utf-8><title>No session</title><p>No session {} on this host.</p>", codes::normalize_code(&code))),
        )
            .into_response()
    }
}

fn svg_response(svg: Option<String>) -> Response {
    match svg {
        Some(s) => ([(header::CONTENT_TYPE, "image/svg+xml"), (header::CACHE_CONTROL, "no-store")], s).into_response(),
        None => (StatusCode::INTERNAL_SERVER_ERROR, "could not encode the QR").into_response(),
    }
}

async fn join_qr(State(app): State<Arc<App>>) -> Response {
    let lobby = app.host.lock().expect("host lock").links()["lobby"].as_str().unwrap_or_default().to_string();
    svg_response(qr_svg(&lobby))
}

#[derive(Deserialize)]
struct DmQuery {
    dm: Option<String>,
}

fn dm_ok(app: &App, q: &DmQuery) -> bool {
    q.dm.as_deref() == Some(app.host.lock().expect("host lock").meta.tokens.dm.as_str())
}

async fn table_qr(Path(file): Path<String>, Query(q): Query<DmQuery>, State(app): State<Arc<App>>) -> Response {
    if !dm_ok(&app, &q) {
        return (StatusCode::FORBIDDEN, "the DM token is required").into_response();
    }
    let parish = file.strip_suffix(".svg").unwrap_or(&file).to_lowercase();
    let link = app.host.lock().expect("host lock").links()["tables"].get(&parish).and_then(|v| v.as_str()).map(String::from);
    match link {
        Some(l) => svg_response(qr_svg(&l)),
        None => (StatusCode::NOT_FOUND, format!("{parish} is not a table in this session")).into_response(),
    }
}

async fn links(Query(q): Query<DmQuery>, State(app): State<Arc<App>>) -> Response {
    if !dm_ok(&app, &q) {
        return (StatusCode::FORBIDDEN, "the DM token is required").into_response();
    }
    let links = app.host.lock().expect("host lock").links();
    axum::Json(links).into_response()
}

async fn export(Query(q): Query<DmQuery>, State(app): State<Arc<App>>) -> Response {
    if !dm_ok(&app, &q) {
        return (StatusCode::FORBIDDEN, "the DM token is required").into_response();
    }
    let text = app.host.lock().expect("host lock").export();
    match text {
        Ok(t) => ([(header::CONTENT_TYPE, "application/json"), (header::CACHE_CONTROL, "no-store")], t).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("export failed: {e}")).into_response(),
    }
}

async fn health(State(app): State<Arc<App>>) -> Response {
    axum::Json(app.host.lock().expect("host lock").health()).into_response()
}

async fn ws(ws: WebSocketUpgrade, ConnectInfo(addr): ConnectInfo<SocketAddr>, State(app): State<Arc<App>>) -> Response {
    {
        let mut n = app.connections.lock().expect("connections lock");
        if *n >= app.limits.max_connections {
            return (StatusCode::SERVICE_UNAVAILABLE, "too many connections").into_response();
        }
        *n += 1;
    }
    ws.max_message_size(MAX_CLIENT_FRAME).max_frame_size(MAX_CLIENT_FRAME).on_upgrade(move |socket| handle_socket(socket, addr, app))
}

/// One connection: a writer task drains the client's channel; this task
/// reads frames, locks the host for each, and never awaits while locked.
async fn handle_socket(socket: WebSocket, addr: SocketAddr, app: Arc<App>) {
    let (mut sink, mut stream) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let writer = tokio::spawn(async move {
        while let Some(text) = rx.recv().await {
            if sink.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
        let _ = sink.close().await;
    });
    let mut client_id: Option<String> = None;
    while let Some(Ok(msg)) = stream.next().await {
        match msg {
            Message::Text(text) => {
                if text.len() > MAX_CLIENT_FRAME {
                    let _ = tx.send(proto::error("frame_too_large", "frames are capped at 64 KB"));
                    break;
                }
                let frame = match proto::parse_client_frame(text.as_str()) {
                    Ok(f) => f,
                    Err(("version", m)) => {
                        let _ = tx.send(proto::reload(m));
                        break;
                    }
                    Err((code, m)) => {
                        let _ = tx.send(proto::error(code, m));
                        continue;
                    }
                };
                match frame {
                    ClientFrame::Hello(h) => {
                        if client_id.is_some() {
                            let _ = tx.send(proto::error("bad_frame", "hello was already said on this connection"));
                            continue;
                        }
                        if app.limited(addr.ip()) {
                            let _ = tx.send(proto::error("rate_limited", "too many failed joins from this address; wait a minute"));
                            break;
                        }
                        let outcome = app.host.lock().expect("host lock").hello(&h, tx.clone(), app.bundle.is_some());
                        match outcome {
                            Outcome::Welcome { client_id: id, frame } | Outcome::Lobby { client_id: id, frame } | Outcome::Waiting { client_id: id, frame } => {
                                client_id = Some(id);
                                app.clear_failures(addr.ip());
                                let _ = tx.send(frame);
                            }
                            Outcome::Reject { frame } => {
                                app.note_failure(addr.ip());
                                let _ = tx.send(frame);
                                break;
                            }
                        }
                    }
                    ClientFrame::Ping => {
                        let _ = tx.send(proto::pong(&codes::wall_now()));
                    }
                    other => {
                        let Some(id) = client_id.as_deref() else {
                            let _ = tx.send(proto::error("not_welcome", "say hello first"));
                            continue;
                        };
                        let mut host = app.host.lock().expect("host lock");
                        match other {
                            ClientFrame::Intent { client_seq, kind, payload } => {
                                let result = host.intent(id, client_seq, &kind, payload);
                                drop(host);
                                let _ = tx.send(result);
                                app.notify.notify_one();
                            }
                            ClientFrame::ClaimSeat { parish, role } => {
                                let result = host.claim_seat(id, &parish, &role);
                                let _ = tx.send(result);
                            }
                            ClientFrame::Ack { seq } => host.ack(id, seq),
                            ClientFrame::Resync { from_seq } => {
                                for f in host.resync(id, from_seq) {
                                    let _ = tx.send(f);
                                }
                            }
                            ClientFrame::Hello(_) | ClientFrame::Ping => {}
                        }
                    }
                }
            }
            Message::Binary(_) => {
                let _ = tx.send(proto::error("bad_frame", "binary frames are not part of the protocol"));
            }
            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) => {}
        }
    }
    if let Some(id) = &client_id {
        app.host.lock().expect("host lock").disconnect(id);
    }
    drop(tx);
    let _ = writer.await;
    *app.connections.lock().expect("connections lock") -= 1;
}
