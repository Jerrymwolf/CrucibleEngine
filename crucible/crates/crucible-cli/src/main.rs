//! `crucible` command line: run, replay, validate, summary.

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use crucible_core::log::{clock, Event, RunLog};
use crucible_core::{replay, run, Content, InputRecord, RunConfig, ScriptedDecision, Session, Team};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Parser)]
#[command(name = "crucible", about = "Crucible Engine: deterministic Hurricane Midas simulation core", version)]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Run a simulation, print the timeline and write the run log.
    Run {
        #[arg(long)]
        seed: u64,
        #[arg(long, default_value = "content")]
        content: PathBuf,
        /// JSON: {"dilemma-id": {"option_id": "a", "rationale": "...", "t": -300}}
        #[arg(long)]
        decisions: Option<PathBuf>,
        /// JSON: [{"t": -4320, "intensity": 3}, ...]
        #[arg(long)]
        intensity: Option<PathBuf>,
        /// JSON: [{"parish_id": "keystone", "controller": "ai", "stated_values": [...]}]
        #[arg(long)]
        teams: Option<PathBuf>,
        #[arg(long)]
        out: PathBuf,
        /// Print every tick instead of only ticks with notable events.
        #[arg(long)]
        verbose: bool,
        /// Halt at the first human dilemma that has no decision yet and list
        /// it; add the decision (with its `t`) and run again to continue.
        #[arg(long)]
        live: bool,
        /// JSON: ["dilemma-id", ...]; human tables are asked only these, the
        /// drift model decides their other dilemmas.
        #[arg(long)]
        ask: Option<PathBuf>,
        /// JSON: [{"t": -3000, "seq": 0, "kind": "allocate", "parish_id": "haven", "token": "FUEL", "to": "summit", "count": 1}, ...]
        #[arg(long)]
        inputs: Option<PathBuf>,
        /// Stop after this tick (signed minutes from landfall).
        #[arg(long)]
        until: Option<i64>,
        /// Session profile: an id under content/sessions (parish-90) or a path to a profile.
        #[arg(long)]
        session: Option<String>,
    },
    /// Re-execute a run log from its seed, inputs and recorded decisions; compare hashes.
    Replay {
        run: PathBuf,
        #[arg(long, default_value = "content")]
        content: PathBuf,
    },
    /// Check content referential integrity. Exits non-zero on failure.
    Validate {
        #[arg(long, default_value = "content")]
        content: PathBuf,
    },
    /// Print per-parish outcomes, the counters and the values gap table of a run log.
    Summary { run: PathBuf },
}

fn load_content(dir: &Path) -> Result<Content> {
    Content::load(dir).with_context(|| format!("loading content from {}", dir.display()))
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T> {
    let s = std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?;
    serde_json::from_str(&s).with_context(|| format!("parsing {}", path.display()))
}

fn load_session(content_dir: &Path, arg: &str) -> Result<Session> {
    let path = PathBuf::from(arg);
    let path = if path.is_file() { path } else { content_dir.join("sessions").join(format!("{arg}.json")) };
    let profile: serde_json::Value = read_json(&path)?;
    Session::from_profile(&profile).map_err(|e| anyhow::anyhow!("session {}: {e}", path.display()))
}

#[derive(serde::Deserialize)]
struct IntensityPoint {
    t: i64,
    intensity: i64,
}

fn notable(e: &Event) -> Option<String> {
    Some(match e {
        Event::WindowTransition { to, .. } => format!("window {to}"),
        Event::Cascade { rule_id, parish_id, system, delta, .. } => format!("cascade {rule_id}: {parish_id} {system} {delta:+}"),
        Event::Isolation { parish_id, ended, .. } => {
            if ended.is_some() {
                format!("{parish_id} road access restored")
            } else {
                format!("{parish_id} ISOLATED")
            }
        }
        Event::Connectivity { parish_id, system, status, .. } if status == "lost" || status == "restored" => format!("{parish_id} {system} {status}"),
        Event::DilemmaPresented { parish_id, dilemma_id, .. } => format!("{parish_id} faces {dilemma_id}"),
        Event::Decision { parish_id, option_id, controller, dilemma_id, decided_by, .. } => match decided_by {
            Some(by) => format!("{parish_id} lets the {by} decide {dilemma_id} -> {option_id}"),
            None => format!("{parish_id} decides {dilemma_id} -> {option_id} ({controller})"),
        },
        Event::RouteCut { route_id, .. } => format!("route {route_id} cut"),
        Event::RouteReopened { route_id, .. } => format!("route {route_id} open"),
        Event::ConvoyTurnedBack { token, from, to, route_id, .. } => format!("{token} {from}->{to} turned back at {route_id}"),
        Event::Allocation { parish_id, entry, token, to, count, .. } => format!("{parish_id} {entry} {token} x{count} -> {to}"),
        Event::Mayday { call_id, asker, holder, .. } => format!("MAYDAY {call_id} {asker} -> {holder}"),
        Event::AidAnswer { call_id, holder, answer, controller, .. } => format!("{holder} answers {call_id}: {answer} ({controller})"),
        Event::ShipSailed { consignment, doses } => format!("ship sails ({consignment}) with {doses} doses"),
        Event::ConsignmentMissed { reason, .. } => format!("consignment missed: {reason}"),
        Event::DosesLost { doses, reason } => format!("{doses} doses lost: {reason}"),
        Event::Rejected { source, parish_id, reason } => format!("rejected {source} from {parish_id}: {reason}"),
        _ => return None,
    })
}

fn print_timeline(log: &RunLog, verbose: bool) {
    println!("{:<9} {:<13} {:>3} {:>6} {:<9} notable events", "time", "window", "int", "wind", "rain");
    for tick in &log.ticks {
        let notes: Vec<String> = tick.events.iter().filter_map(notable).collect();
        if notes.is_empty() && !verbose {
            continue;
        }
        println!(
            "{:<9} {:<13} {:>3} {:>4}kt {:<9} {}",
            clock(tick.t),
            tick.window_id,
            tick.intensity,
            tick.weather.wind_kts.round(),
            tick.weather.rain,
            notes.join("; ")
        );
    }
}

fn print_summary(log: &RunLog) {
    let s = &log.summary;
    println!("seed {}  ticks {}  decisions {}  cascades fired {}", log.seed, s.ticks, s.decisions, s.cascades_fired);
    println!("state_hash {}", s.state_hash);
    let c = &s.counters;
    println!(
        "doses shipped {}  people safe {}  (vault {}, at risk {}, injured {}, lost {})",
        c.doses_shipped, c.people_safe, c.vault_doses, c.at_risk, c.injured, c.lost
    );
    if let Some(u) = log.until {
        println!("stopped at {} ({u}); {} dilemma(s) and {} call(s) open", clock(u), log.pending.len(), log.open_calls.len());
    }
    println!();
    println!(
        "{:<10} {:>9} {:>12} {:>9} {:>12}  final power/comms/roads/water/hospital  tokens",
        "parish", "min_power", "isolated_min", "decisions", "final_morale"
    );
    for (p, o) in &s.per_parish {
        let f = &o.final_infrastructure;
        let g = |k: &str| f.get(k).copied().unwrap_or(0);
        let tokens: Vec<String> = s.stock.get(p).map(|m| m.iter().map(|(k, v)| format!("{k}:{v}")).collect()).unwrap_or_default();
        println!(
            "{:<10} {:>9} {:>12} {:>9} {:>12}  {}/{}/{}/{}/{}  {}",
            p,
            o.min_power,
            o.minutes_isolated,
            o.decisions,
            o.final_morale,
            g("power"),
            g("communications"),
            g("roads"),
            g("water"),
            g("hospital"),
            tokens.join(" ")
        );
    }
    println!();
    // the record, not a score: one reading per chosen moment, the storm's moments counted apart (log 0.3)
    println!("values record (stated rank; readings of the moments the table chose, -3..3; storm moments unrated)");
    println!("{:<10} {:<16} {:>4} {:<8} {:>5}  readings", "parish", "value", "rank", "tested", "storm");
    for r in &s.values_gap {
        let readings: Vec<String> =
            r.evidence.iter().filter(|e| e.decided_by.as_deref() != Some("storm")).map(|e| format!("{:+}", e.signal)).collect();
        println!("{:<10} {:<16} {:>4} {:<8} {:>5}  {}", r.parish_id, r.value, r.stated_rank, if r.tested { "yes" } else { "no" }, r.n_storm, readings.join(" "));
    }
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Validate { content } => {
            let c = load_content(&content)?;
            match c.validate() {
                Ok(()) => {
                    println!(
                        "content OK: {} parishes, {} windows, {} dilemmas, {} cascade rules, {} values, {} routes, {} calls, {} resident groups (hash {})",
                        c.parish_ids().len(),
                        c.timeline.hurricane_midas.windows.len(),
                        c.dilemmas.all_dilemmas.len(),
                        c.infrastructure.cascade_rules.len(),
                        c.values.values_deck.len(),
                        c.routes.routes.len(),
                        c.aid.calls.len(),
                        c.residents.groups.len(),
                        &c.content_hash[..12]
                    );
                }
                Err(e) => {
                    eprintln!("{e}");
                    std::process::exit(1);
                }
            }
        }
        Cmd::Run { seed, content, decisions, intensity, teams, out, verbose, live, ask, inputs, until, session } => {
            let c = load_content(&content)?;
            c.validate()?;
            let decisions: BTreeMap<String, ScriptedDecision> = match decisions {
                Some(p) => read_json(&p)?,
                None => BTreeMap::new(),
            };
            let intensity: Vec<(i64, i64)> = match intensity {
                Some(p) => read_json::<Vec<IntensityPoint>>(&p)?.into_iter().map(|x| (x.t, x.intensity)).collect(),
                None => vec![],
            };
            let teams: Option<Vec<Team>> = match teams {
                Some(p) => Some(read_json(&p)?),
                None => None,
            };
            let ask: Option<std::collections::BTreeSet<String>> = match ask {
                Some(p) => Some(read_json(&p)?),
                None => None,
            };
            let inputs: Vec<InputRecord> = match inputs {
                Some(p) => read_json(&p)?,
                None => vec![],
            };
            let session = match session {
                Some(s) => load_session(&content, &s)?,
                None => Session::default(),
            };
            let log = run(&c, &RunConfig { seed, teams, decisions, intensity, live, ask, inputs, until, session });
            print_timeline(&log, verbose);
            println!();
            if log.pending.is_empty() || log.until.is_some() {
                print_summary(&log);
            }
            if !log.pending.is_empty() {
                println!(
                    "{} at {}: waiting on {} decision(s)",
                    if log.until.is_some() { "stopped" } else { "halted" },
                    clock(log.pending[0].t),
                    log.pending.len()
                );
                for p in &log.pending {
                    let opts: Vec<String> = p.options.iter().map(|o| format!("{} ({})", o.id, o.label)).collect();
                    println!("  {:<10} {:<22} t={}  {}", p.parish_id, p.dilemma_id, p.t, opts.join(" | "));
                }
            }
            if let Some(dir) = out.parent() {
                if !dir.as_os_str().is_empty() {
                    std::fs::create_dir_all(dir)?;
                }
            }
            std::fs::write(&out, log.to_json()).with_context(|| format!("writing {}", out.display()))?;
            println!("\nwrote {}", out.display());
        }
        Cmd::Replay { run: path, content } => {
            let s = std::fs::read_to_string(&path).with_context(|| format!("reading {}", path.display()))?;
            let log = RunLog::from_json(&s).context("parsing run log")?;
            let c = load_content(&content)?;
            if c.content_hash != log.content_hash {
                eprintln!("warning: content hash differs from the log ({} vs {})", &c.content_hash[..12], &log.content_hash[..12]);
            }
            let again = replay(&c, &log);
            if again.summary.state_hash == log.summary.state_hash {
                println!("OK {}", log.summary.state_hash);
            } else {
                println!("MISMATCH");
                println!("  logged   {}", log.summary.state_hash);
                println!("  replayed {}", again.summary.state_hash);
                if let Some(d) = crucible_core::sim::first_divergence(&log, &again) {
                    println!("  first divergence at {d}");
                }
                std::process::exit(1);
            }
        }
        Cmd::Summary { run: path } => {
            let s = std::fs::read_to_string(&path).with_context(|| format!("reading {}", path.display()))?;
            let log = RunLog::from_json(&s).context("parsing run log")?;
            print_summary(&log);
        }
    }
    Ok(())
}
