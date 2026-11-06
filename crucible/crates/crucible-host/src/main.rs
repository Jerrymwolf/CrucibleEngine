//! `crucible-host`: serve one session on the LAN (PROTOCOL.md).
//!
//! ```text
//! crucible-host --mode lan --content ./content --session parish-90 --bundle board-rts/index.html
//! crucible-host --restore sessions/2026-10-21-G7K2PQ
//! crucible-host --restore sessions/2026-10-21-G7K2PQ --export-only run.json
//! ```

use anyhow::{anyhow, Context, Result};
use clap::Parser;
use crucible_core::Content;
use crucible_host::session::{export_offline, run_bounds};
use crucible_host::{server, App, Host, Limits, Mode, Profile};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Parser)]
#[command(
    name = "crucible-host",
    about = "Crucible Engine session host: HTTP and WebSocket server for six tables, their phones, the projector and the DM",
    version
)]
struct Cli {
    /// `lan`: one session on the facilitator laptop (default). `cloud`: not yet implemented.
    #[arg(long, value_enum, default_value = "lan")]
    mode: Mode,
    /// Address to bind.
    #[arg(long, default_value = "0.0.0.0")]
    bind: IpAddr,
    #[arg(long, default_value_t = 7878)]
    port: u16,
    #[arg(long, default_value = "content")]
    content: PathBuf,
    /// Session profile: an id under content/sessions or a path.
    #[arg(long, default_value = "parish-90")]
    session: String,
    /// Overrides the profile's seed.
    #[arg(long)]
    seed: Option<u64>,
    /// The built client bundle; served at `/` and `/j/<CODE>`.
    #[arg(long, default_value = "board-rts/index.html")]
    bundle: PathBuf,
    /// Parent of the session directories (`<dir>/<date>-<CODE>`).
    #[arg(long, default_value = "sessions")]
    sessions_dir: PathBuf,
    /// Reload a session directory and resume, paused, at its horizon.
    #[arg(long)]
    restore: Option<PathBuf>,
    /// With --restore: write the run log here and exit without serving.
    #[arg(long)]
    export_only: Option<PathBuf>,
    /// The URL clients reach the host at (default: http://<lan ip>:<port>).
    #[arg(long)]
    public_url: Option<String>,
    /// Real-time multiplier for the tick clock: 1.0 is the room's tempo.
    #[arg(long, default_value_t = 1.0)]
    speed: f64,
    /// Keep nothing on disk (rehearsals).
    #[arg(long)]
    no_store: bool,
    /// Do not print the QR to the terminal.
    #[arg(long)]
    no_qr: bool,
    #[arg(long, default_value_t = 200)]
    max_connections: usize,
}

/// The address the LAN sees us at: the source address the kernel would use
/// toward a private network. No packet is sent.
fn lan_ip() -> Option<IpAddr> {
    let s = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    s.connect("10.255.255.255:1").ok()?;
    let ip = s.local_addr().ok()?.ip();
    if ip.is_unspecified() || ip.is_loopback() {
        None
    } else {
        Some(ip)
    }
}

fn banner(host: &Host, bundle_note: &str, show_qr: bool) {
    let links = host.links();
    println!("Crucible host: session {} (profile {}, seed {})", host.meta.code, host.meta.profile, host.meta.seed);
    println!("Serving {}/  ({bundle_note})", host.meta.public_url);
    match host.store_dir() {
        Some(d) => println!("Session directory: {}", d.display()),
        None => println!("Session directory: none (--no-store)"),
    }
    println!();
    if show_qr {
        if let Some(qr) = server::qr_terminal(links["lobby"].as_str().unwrap_or_default()) {
            println!("{qr}");
        }
    }
    println!("Lobby (code {}):  {}", host.meta.code, links["lobby"].as_str().unwrap_or_default());
    println!("Projector:          {}", links["projector"].as_str().unwrap_or_default());
    println!("DM:                 {}   PIN {}", links["dm"].as_str().unwrap_or_default(), host.meta.dm_pin);
    println!("Tables:");
    if let Some(t) = links["tables"].as_object() {
        for (p, l) in t {
            println!("  {p:<10} {}", l.as_str().unwrap_or_default());
        }
    }
    println!();
    println!(
        "QR as SVG: {}/join (lobby), {}/join/<parish>.svg?dm=<dm token> (tables). Health: /health. Ctrl-C exports and stops.",
        host.meta.public_url, host.meta.public_url
    );
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    if cli.mode == Mode::Cloud {
        eprintln!(
            "crucible-host: --mode cloud is not implemented yet. The protocol is the same (docs/PROTOCOL.md section 15); \
             the cloud host adds TLS behind a proxy, facilitator sign-in and many sessions per process. Run --mode lan."
        );
        std::process::exit(2);
    }
    let content = Arc::new(Content::load(&cli.content).with_context(|| format!("loading content from {}", cli.content.display()))?);
    content.validate()?;

    if let Some(out) = &cli.export_only {
        let dir = cli.restore.as_ref().ok_or_else(|| anyhow!("--export-only needs --restore <session dir>"))?;
        let text = export_offline(content, dir)?;
        std::fs::write(out, &text).with_context(|| format!("writing {}", out.display()))?;
        println!("wrote {} ({} bytes); check it with `crucible replay {}`", out.display(), text.len(), out.display());
        return Ok(());
    }

    let (bundle, bundle_hash, bundle_note) = match std::fs::read(&cli.bundle) {
        Ok(bytes) => {
            let hash = server::bundle_hash(&bytes);
            let note = format!("bundle {} , {:.1} MB, hash {}", cli.bundle.display(), bytes.len() as f64 / 1_048_576.0, &hash[..12]);
            (Some(bytes), hash, note)
        }
        Err(e) => (None, String::new(), format!("no bundle at {}: {e}; serving a landing page until it is built", cli.bundle.display())),
    };
    let public_url = cli.public_url.clone().unwrap_or_else(|| {
        let ip = lan_ip().unwrap_or(IpAddr::from([127, 0, 0, 1]));
        format!("http://{ip}:{}", cli.port)
    });

    let host = match &cli.restore {
        Some(dir) => Host::restore(content.clone(), dir, bundle_hash, cli.public_url.clone(), cli.speed)?,
        None => {
            let raw = Profile::load(&cli.content, &cli.session)?;
            let (t_start, t_end) = run_bounds(&content);
            let profile = Profile::parse(&content, &raw, t_start, t_end)?;
            let seed = cli.seed.or(profile.seed).unwrap_or(42);
            let dir = if cli.no_store { None } else { Some(cli.sessions_dir.as_path()) };
            Host::create(content.clone(), profile, raw, seed, cli.mode, bundle_hash, public_url, cli.speed, dir)?
        }
    };

    let listener = tokio::net::TcpListener::bind(SocketAddr::new(cli.bind, cli.port)).await.with_context(|| format!("binding {}:{}", cli.bind, cli.port))?;
    banner(&host, &bundle_note, !cli.no_qr);
    let app = Arc::new(App::new(host, bundle, cli.bundle.display().to_string(), Limits { max_connections: cli.max_connections, ..Limits::default() }));
    tokio::spawn(server::tick_loop(app.clone()));
    let serving = tokio::spawn(server::serve(app.clone(), listener));
    tokio::select! {
        r = serving => { r.context("server task")?.context("serving")?; }
        _ = tokio::signal::ctrl_c() => {
            let mut h = app.host.lock().expect("host lock");
            match h.export() {
                Ok(_) => println!("\nexported the run log to {}", h.store_dir().map(|d| d.display().to_string()).unwrap_or_else(|| "(no store)".into())),
                Err(e) => eprintln!("\nexport failed: {e}"),
            }
        }
    }
    Ok(())
}
