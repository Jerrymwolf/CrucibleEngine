//! Crucible Engine core: deterministic headless simulation of Hurricane Midas
//! over the six parishes of Concordia. No UI, no network, no wall clock.
//!
//! Same seed + same content + same scripted inputs => byte-identical run log.

pub mod aid;
pub mod cascade;
pub mod connectivity;
pub mod content;
pub mod controller;
pub mod dilemma;
pub mod effects;
pub mod inputs;
pub mod log;
pub mod morale;
pub mod residents;
pub mod resources;
pub mod rng;
pub mod routes;
pub mod sim;
pub mod state;
pub mod tally;
pub mod validate;
pub mod values;
pub mod weather;

pub use content::{Content, ContentError};
pub use controller::ScriptedDecision;
pub use inputs::{Input, InputRecord, Session};
pub use log::{RunLog, Summary};
pub use sim::{replay, run, RunConfig, Team};

/// Simulation minutes per tick.
pub const STEP_MINUTES: i64 = 15;
/// Infrastructure systems, in the canonical order used by the run log.
pub const SYSTEMS: [&str; 7] = ["power", "communications", "roads", "water", "hospital", "port", "airport"];
