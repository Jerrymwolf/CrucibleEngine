//! The core compiled for the browser, so the facilitator page runs the
//! engine with no server and no network. Content is embedded at build time.
//!
//! The interface is a plain C ABI with JSON strings, so the page needs no
//! generated glue: write the request with `crucible_alloc`, call
//! `crucible_run`, read the reply at the returned pointer and length
//! (packed as `ptr << 32 | len`), then free both with `crucible_free`.

use crucible_core::content::FILES;
use crucible_core::{run, Content, RunConfig, ScriptedDecision, Team};
use std::collections::BTreeMap;

macro_rules! embed {
    ($($name:literal),*) => {
        [$(($name, include_bytes!(concat!("../../../content/", $name)).as_slice())),*]
    };
}

const EMBEDDED: [(&str, &[u8]); 9] = embed!(
    "concordia.json",
    "decisionTypes.json",
    "dilemmas.json",
    "infrastructure.json",
    "intensity.json",
    "personas.json",
    "production.json",
    "timeline.json",
    "values.json"
);

/// The embedded content, parsed.
pub fn content() -> Result<Content, String> {
    let raw: BTreeMap<&str, Vec<u8>> = EMBEDDED.iter().map(|(n, b)| (*n, b.to_vec())).collect();
    debug_assert!(FILES.iter().all(|f| raw.contains_key(f)));
    Content::from_files(&raw).map_err(|e| e.to_string())
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
}

/// Runs one request and returns the run log as JSON, or `{"error": ...}`.
pub fn run_json(request: &str) -> String {
    let result = (|| {
        let req: Request = serde_json::from_str(request).map_err(|e| format!("bad request: {e}"))?;
        let c = content()?;
        let cfg = RunConfig { seed: req.seed, teams: req.teams, decisions: req.decisions, intensity: req.intensity, live: req.live };
        Ok::<String, String>(run(&c, &cfg).to_json())
    })();
    result.unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

/// The embedded dilemma library as JSON, for the DM screen.
pub fn dilemmas_json() -> String {
    String::from_utf8_lossy(EMBEDDED.iter().find(|(n, _)| *n == "dilemmas.json").map(|(_, b)| *b).unwrap_or_default()).into_owned()
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
    }
}
