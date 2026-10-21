//! The session directory: `session.json`, `input-log.jsonl` (one line per
//! accepted input or clock step, appended as it happens), `clients.json`, and
//! the export (`run.json`, `votes.json`, `flags.json`).

use anyhow::{Context, Result};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

pub const SESSION_FILE: &str = "session.json";
pub const LOG_FILE: &str = "input-log.jsonl";
pub const CLIENTS_FILE: &str = "clients.json";
pub const RUN_FILE: &str = "run.json";
pub const VOTES_FILE: &str = "votes.json";
pub const FLAGS_FILE: &str = "flags.json";

/// Who sent an input.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Source {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parish: Option<String>,
    /// console | phone | dm | host
    pub role: String,
}

/// One line of the input log (PROTOCOL.md section 13).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LogEntry {
    pub seq: u64,
    pub t: i64,
    pub wall: String,
    pub source: Source,
    pub kind: String,
    #[serde(default)]
    pub payload: Value,
    /// Whether the core sees this kind.
    pub core: bool,
}

pub struct Store {
    dir: PathBuf,
    log: File,
}

impl Store {
    /// Creates the directory (if needed) and opens the log for appending.
    pub fn open(dir: &Path) -> Result<Store> {
        std::fs::create_dir_all(dir).with_context(|| format!("creating {}", dir.display()))?;
        let log = OpenOptions::new().create(true).append(true).open(dir.join(LOG_FILE)).with_context(|| format!("opening {}", dir.join(LOG_FILE).display()))?;
        Ok(Store { dir: dir.to_path_buf(), log })
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    pub fn write_json<T: Serialize>(&self, name: &str, value: &T) -> Result<()> {
        let path = self.dir.join(name);
        let text = serde_json::to_string_pretty(value)?;
        std::fs::write(&path, text).with_context(|| format!("writing {}", path.display()))
    }

    pub fn write_text(&self, name: &str, text: &str) -> Result<()> {
        let path = self.dir.join(name);
        std::fs::write(&path, text).with_context(|| format!("writing {}", path.display()))
    }

    /// Appends one entry and flushes, so the log survives a dying laptop.
    pub fn append(&mut self, entry: &LogEntry) -> Result<()> {
        let mut line = serde_json::to_string(entry)?;
        line.push('\n');
        self.log.write_all(line.as_bytes())?;
        self.log.flush()?;
        Ok(())
    }

    pub fn read_json<T: DeserializeOwned>(dir: &Path, name: &str) -> Result<T> {
        let path = dir.join(name);
        let s = std::fs::read_to_string(&path).with_context(|| format!("reading {}", path.display()))?;
        serde_json::from_str(&s).with_context(|| format!("parsing {}", path.display()))
    }

    /// Reads the whole input log in order.
    pub fn read_log(dir: &Path) -> Result<Vec<LogEntry>> {
        let path = dir.join(LOG_FILE);
        let f = File::open(&path).with_context(|| format!("reading {}", path.display()))?;
        let mut out = Vec::new();
        for (i, line) in BufReader::new(f).lines().enumerate() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let e: LogEntry = serde_json::from_str(&line).with_context(|| format!("{}:{}", path.display(), i + 1))?;
            out.push(e);
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_log_appends_and_reads_back_in_order() {
        let dir = std::env::temp_dir().join(format!("crucible-host-store-{}-{}", std::process::id(), crate::codes::new_token()));
        let mut s = Store::open(&dir).unwrap();
        for seq in 1..=3 {
            s.append(&LogEntry {
                seq,
                t: -4305,
                wall: crate::codes::wall_now(),
                source: Source { client_id: Some("c_1".into()), parish: Some("haven".into()), role: "console".into() },
                kind: "lock_values".into(),
                payload: serde_json::json!({ "values": ["a"] }),
                core: true,
            })
            .unwrap();
        }
        s.write_json("x.json", &serde_json::json!({ "ok": true })).unwrap();
        let back = Store::read_log(&dir).unwrap();
        assert_eq!(back.len(), 3);
        assert_eq!(back[2].seq, 3);
        let x: Value = Store::read_json(&dir, "x.json").unwrap();
        assert_eq!(x["ok"], true);
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
