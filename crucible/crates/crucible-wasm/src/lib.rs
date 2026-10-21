//! The core compiled for the browser, so the facilitator page runs the
//! engine with no server and no network. Content and the session profiles
//! are embedded at build time.
//!
//! The interface is a plain C ABI with JSON strings, so the page needs no
//! generated glue: write the request with `crucible_alloc`, call
//! `crucible_run`, read the reply at the returned pointer and length
//! (packed as `ptr << 32 | len`), then free both with `crucible_free`.
//! `crucible_content(name)` hands out an embedded file, `crucible_version()`
//! says what is embedded, and `crucible_dilemmas()` is the dilemma library.

use crucible_core::content::FILES;
use crucible_core::{run, Content, InputRecord, RunConfig, ScriptedDecision, Session, Team};
use std::collections::BTreeMap;

macro_rules! embed {
    ($($name:literal),*) => {
        [$(($name, include_bytes!(concat!("../../../content/", $name)).as_slice())),*]
    };
}

const EMBEDDED: [(&str, &[u8]); 15] = embed!(
    "aid.json",
    "concordia.json",
    "decisionTypes.json",
    "dilemmas.json",
    "infrastructure.json",
    "intensity.json",
    "personas.json",
    "production.json",
    "residents.json",
    "resources.json",
    "routes.json",
    "timeline.json",
    "values.json",
    "sessions/nursing-60.json",
    "sessions/parish-90.json"
);

/// The run log schema version this build writes.
pub const LOG_VERSION: &str = "0.2";

fn embedded(name: &str) -> Option<&'static [u8]> {
    EMBEDDED.iter().find(|(n, _)| *n == name).map(|(_, b)| *b)
}

/// The embedded content, parsed.
pub fn content() -> Result<Content, String> {
    let raw: BTreeMap<&str, Vec<u8>> = EMBEDDED.iter().filter(|(n, _)| FILES.contains(n)).map(|(n, b)| (*n, b.to_vec())).collect();
    debug_assert!(FILES.iter().all(|f| raw.contains_key(f)));
    Content::from_files(&raw).map_err(|e| e.to_string())
}

/// Embedded session profile ids.
pub fn session_ids() -> Vec<&'static str> {
    EMBEDDED.iter().filter_map(|(n, _)| n.strip_prefix("sessions/").and_then(|s| s.strip_suffix(".json"))).collect()
}

#[derive(serde::Deserialize)]
struct Request {
    seed: u64,
    #[serde(default)]
    teams: Option<Vec<Team>>,
    #[serde(default)]
    decisions: BTreeMap<String, ScriptedDecision>,
    /// [[t, intensity], ...]
    #[serde(default)]
    intensity: Vec<(i64, i64)>,
    #[serde(default)]
    live: bool,
    #[serde(default)]
    ask: Option<std::collections::BTreeSet<String>>,
    /// Table and facilitator actions: [{"t": -3000, "seq": 0, "kind": "allocate", ...}, ...]
    #[serde(default)]
    inputs: Vec<InputRecord>,
    /// Stop after this tick.
    #[serde(default)]
    until: Option<i64>,
    /// An embedded profile id ("parish-90"), a whole profile object, or the
    /// `session` block of an earlier run log.
    #[serde(default)]
    session: Option<serde_json::Value>,
}

fn session_from(value: Option<serde_json::Value>) -> Result<Session, String> {
    match value {
        None | Some(serde_json::Value::Null) => Ok(Session::default()),
        Some(serde_json::Value::String(id)) => {
            let bytes = embedded(&format!("sessions/{id}.json")).ok_or_else(|| format!("unknown session {id}"))?;
            let profile: serde_json::Value = serde_json::from_slice(bytes).map_err(|e| format!("session {id}: {e}"))?;
            Session::from_profile(&profile)
        }
        Some(v) => {
            // A run log's `session` block parses directly; a profile goes through from_profile.
            if v.get("roster").is_some() || v.get("quarters").is_some() || v.get("allocation").is_some() {
                Session::from_profile(&v)
            } else {
                serde_json::from_value(v).map_err(|e| format!("bad session: {e}"))
            }
        }
    }
}

/// Runs one request and returns the run log as JSON, or `{"error": ...}`.
pub fn run_json(request: &str) -> String {
    let result = (|| {
        let req: Request = serde_json::from_str(request).map_err(|e| format!("bad request: {e}"))?;
        let c = content()?;
        let session = session_from(req.session)?;
        let cfg = RunConfig {
            seed: req.seed,
            teams: req.teams,
            decisions: req.decisions,
            intensity: req.intensity,
            live: req.live,
            ask: req.ask,
            inputs: req.inputs,
            until: req.until,
            session,
        };
        Ok::<String, String>(run(&c, &cfg).to_json())
    })();
    result.unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

/// The embedded dilemma library as JSON, for the DM screen.
pub fn dilemmas_json() -> String {
    String::from_utf8_lossy(embedded("dilemmas.json").unwrap_or_default()).into_owned()
}

/// One embedded file by name (`routes.json`, `sessions/parish-90.json`), or `{"error": ...}`.
pub fn content_json(name: &str) -> String {
    match embedded(name) {
        Some(b) => String::from_utf8_lossy(b).into_owned(),
        None => serde_json::json!({ "error": format!("no embedded file {name}") }).to_string(),
    }
}

/// What this build embeds and exports.
pub fn version_json() -> String {
    let hash = content().map(|c| c.content_hash).unwrap_or_default();
    serde_json::json!({
        "engine": env!("CARGO_PKG_VERSION"),
        "log_version": LOG_VERSION,
        "content_hash": hash,
        "files": FILES,
        "sessions": session_ids(),
        "exports": ["crucible_alloc", "crucible_free", "crucible_run", "crucible_dilemmas", "crucible_content", "crucible_version"],
    })
    .to_string()
}

fn hand_out(s: String) -> u64 {
    let bytes = s.into_bytes().into_boxed_slice();
    let len = bytes.len() as u64;
    let ptr = Box::into_raw(bytes) as *mut u8 as usize as u64;
    (ptr << 32) | len
}

/// Allocates `len` bytes for the host to write a request into.
#[no_mangle]
pub extern "C" fn crucible_alloc(len: usize) -> *mut u8 {
    let mut v = vec![0u8; len].into_boxed_slice();
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// Frees a buffer from `crucible_alloc` or a reply.
///
/// # Safety
/// `ptr` and `len` must describe exactly one buffer this module handed out.
#[no_mangle]
pub unsafe extern "C" fn crucible_free(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}

/// # Safety
/// `ptr` and `len` must describe a UTF-8 request written by the host.
#[no_mangle]
pub unsafe extern "C" fn crucible_run(ptr: *const u8, len: usize) -> u64 {
    let req = std::str::from_utf8(std::slice::from_raw_parts(ptr, len)).unwrap_or("");
    hand_out(run_json(req))
}

#[no_mangle]
pub extern "C" fn crucible_dilemmas() -> u64 {
    hand_out(dilemmas_json())
}

/// # Safety
/// `ptr` and `len` must describe a UTF-8 file name written by the host.
#[no_mangle]
pub unsafe extern "C" fn crucible_content(ptr: *const u8, len: usize) -> u64 {
    let name = std::str::from_utf8(std::slice::from_raw_parts(ptr, len)).unwrap_or("");
    hand_out(content_json(name))
}

#[no_mangle]
pub extern "C" fn crucible_version() -> u64 {
    hand_out(version_json())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_content_matches_the_content_directory() {
        let dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../content");
        assert_eq!(content().unwrap().content_hash, Content::load(&dir).unwrap().content_hash);
    }

    #[test]
    fn run_json_matches_the_native_run() {
        let c = content().unwrap();
        let native = run(&c, &RunConfig { seed: 42, ..Default::default() }).to_json();
        assert_eq!(run_json(r#"{"seed": 42}"#), native);
    }

    #[test]
    fn bad_request_is_an_error_object() {
        assert!(run_json("nope").contains("\"error\""));
        assert!(run_json(r#"{"seed": 1, "session": "nowhere"}"#).contains("unknown session"));
    }

    #[test]
    fn a_session_by_id_schedules_its_cards_and_until_stops_the_run() {
        let log = run_json(r#"{"seed": 42, "session": "parish-90", "until": -3000}"#);
        let v: serde_json::Value = serde_json::from_str(&log).unwrap();
        assert_eq!(v["until"], -3000);
        let ticks = v["ticks"].as_array().unwrap();
        assert_eq!(ticks.last().unwrap()["t"], -3000);
        let presented: Vec<&str> = ticks
            .iter()
            .flat_map(|t| t["events"].as_array().unwrap())
            .filter(|e| e["kind"] == "dilemma_presented")
            .filter_map(|e| e["dilemma_id"].as_str())
            .collect();
        assert!(presented.contains(&"v3-prep-gateway"), "{presented:?}");
        assert!(presented.iter().all(|d| d.starts_with("v3-prep-")));
    }

    #[test]
    fn content_and_version_exports_describe_the_build() {
        assert!(content_json("routes.json").contains("\"ROUTES\""));
        assert!(content_json("sessions/parish-90.json").contains("\"parish-90\""));
        assert!(content_json("nope.json").contains("\"error\""));
        let v: serde_json::Value = serde_json::from_str(&version_json()).unwrap();
        assert_eq!(v["log_version"], LOG_VERSION);
        assert_eq!(v["sessions"].as_array().unwrap().len(), 2);
        assert_eq!(v["content_hash"], content().unwrap().content_hash);
    }
}
