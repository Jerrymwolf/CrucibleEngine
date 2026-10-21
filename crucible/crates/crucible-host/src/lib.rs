//! `crucible-host`: the session host of the Crucible Engine.
//!
//! One process serves the client bundle over HTTP, speaks the protocol of
//! `docs/PROTOCOL.md` over WebSockets, keeps the ordered input log that is
//! the session, re-runs the deterministic core to the host's horizon after
//! every accepted input, and sends each client the view its role and parish
//! may see. Real time (the tick clock, wall-clock stamps) and OS entropy
//! (codes, tokens) live here and nowhere in `crucible-core`.
//!
//! Modules: `codes` (codes, tokens, wall clock), `profile` (the session
//! profile as the host reads it), `protocol` (frames), `filter` (per-client
//! views), `store` (the session directory), `session` (the authoritative
//! session), `server` (HTTP, WebSockets and the tick loop).

pub mod codes;
pub mod filter;
pub mod profile;
pub mod protocol;
pub mod server;
pub mod session;
pub mod store;

pub use profile::Profile;
pub use server::{App, Limits};
pub use session::{Host, Mode};
