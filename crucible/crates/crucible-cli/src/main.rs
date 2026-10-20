//! `crucible` command line: run, replay, validate, summary.

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use crucible_core::log::{clock, Event, RunLog};
use crucible_core::{replay, run, Content, RunConfig, ScriptedDecision, Team};
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
    },
    /// Re-execute a run log from its seed and recorded decisions; compare hashes.
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
    /// Print per-parish outcomes and the values gap table of a run log.
    Summary { run: PathBuf },
}

fn load_content(dir: &Path) -> Result<Content> {
    Content::load(dir).with_context(|| format!("loading content from {}", dir.display()))
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T> {
    let s = std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?;
    serde_json::from_str(&s).with_context(|| format!("parsing {}", path.display()))
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
            if ended.is_some() { format!("{parish_id} road access restored") } else { format!("{parish_id} ISOLATED") }
        }
        Event::Connectivity { parish_id, system, status, .. } if status == "lost" || status == "restored" => format!("{parish_id} {system} {status}"),
        Event::DilemmaPresented { parish_id, dilemma_id, .. } => format!("{parish_id} faces {dilemma_id}"),
        Event::Decision { parish_id, option_id, controller, dilemma_id, .. } => format!("{parish_id} decides {dilemma_id} -> {option_id} ({controller})"),
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
    println!();
    println!("{:<10} {:>9} {:>12} {:>9} {:>12}  final power/comms/roads/water/hospital", "parish", "min_power", "isolated_min", "decisions", "final_morale");
    for (p, o) in &s.per_parish {
        let f = &o.final_infrastructure;
        let g = |k: &str| f.get(k).copied().unwrap_or(0);
        println!(
            "{:<10} {:>9} {:>12} {:>9} {:>12}  {}/{}/{}/{}/{}",
            p, o.min_power, o.minutes_isolated, o.decisions, o.final_morale, g("power"), g("communications"), g("roads"), g("water"), g("hospital")
        );
    }
    println!();
    println!("values gap (stated rank vs enacted mean signal, -3..3)");
    println!("{:<10} {:<16} {:>4} {:>8} {:>4}", "parish", "value", "rank", "enacted", "n");
    for r in &s.values_gap {
        println!("{:<10} {:<16} {:>4} {:>8.2} {:>4}", r.parish_id, r.value, r.stated_rank, r.enacted_score, r.n_decisions);
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
                        "content OK: {} parishes, {} windows, {} dilemmas, {} cascade rules, {} values (hash {})",
                        c.parish_ids().len(),
                        c.timeline.hurricane_midas.windows.len(),
                        c.dilemmas.all_dilemmas.len(),
                        c.infrastructure.cascade_rules.len(),
                        c.values.values_deck.len(),
                        &c.content_hash[..12]
                    );
                }
                Err(e) => {
                    eprintln!("{e}");
                    std::process::exit(1);
                }
            }
        }
        Cmd::Run { seed, content, decisions, intensity, teams, out, verbose, live } => {
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
            let log = run(&c, &RunConfig { seed, teams, decisions, intensity, live });
            print_timeline(&log, verbose);
            println!();
            if log.pending.is_empty() {
                print_summary(&log);
            } else {
                println!("halted at {}: waiting on {} decision(s)", clock(log.pending[0].t), log.pending.len());
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
