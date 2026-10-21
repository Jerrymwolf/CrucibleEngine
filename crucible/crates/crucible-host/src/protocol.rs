//! Frames of `docs/PROTOCOL.md`: what clients send, parsed strictly, and the
//! builders for what the host sends.

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

/// The protocol version this host speaks.
pub const VERSION: u64 = 1;
/// Client frames larger than this close the connection.
pub const MAX_CLIENT_FRAME: usize = 64 * 1024;

/// Who a connection is. `Lobby` is the host's own name for a device that has
/// joined by code and not yet claimed a seat; it never appears in a frame's
/// `role` except in the DM's roster.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Console,
    Phone,
    Projector,
    Dm,
    Lobby,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Console => "console",
            Role::Phone => "phone",
            Role::Projector => "projector",
            Role::Dm => "dm",
            Role::Lobby => "lobby",
        }
    }

    /// A seat role a client may ask for.
    pub fn seat(s: &str) -> Option<Role> {
        match s {
            "console" => Some(Role::Console),
            "phone" => Some(Role::Phone),
            _ => None,
        }
    }
}

/// Everything a client may send.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientFrame {
    Hello(Hello),
    ClaimSeat {
        parish: String,
        role: String,
    },
    Intent {
        client_seq: u64,
        kind: String,
        #[serde(default)]
        payload: Value,
    },
    Ack {
        seq: u64,
    },
    Resync {
        from_seq: u64,
    },
    Ping,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct Hello {
    #[serde(default)]
    pub session_code: Option<String>,
    #[serde(default)]
    pub token: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub pin: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub resume_token: Option<String>,
    #[serde(default)]
    pub last_seq: Option<u64>,
    #[serde(default)]
    pub bundle_hash: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
}

/// Parses a client frame. `Err` carries an error code and message; a wrong
/// `v` is reported as the code `version` so the caller can answer `reload`.
pub fn parse_client_frame(text: &str) -> Result<ClientFrame, (&'static str, String)> {
    let v: Value = serde_json::from_str(text).map_err(|e| ("bad_frame", format!("not a JSON object: {e}")))?;
    let version = v.get("v").and_then(|x| x.as_u64()).unwrap_or(0);
    if version != VERSION {
        return Err(("version", format!("protocol version {version} is not {VERSION}")));
    }
    serde_json::from_value(v).map_err(|e| ("bad_frame", format!("{e}")))
}

/// `{ "v": 1, "type": <type>, ...fields }` as text.
pub fn frame(type_: &str, fields: Map<String, Value>) -> String {
    let mut m = Map::new();
    m.insert("v".into(), json!(VERSION));
    m.insert("type".into(), json!(type_));
    m.extend(fields);
    Value::Object(m).to_string()
}

/// Shorthand: a frame from a `json!({...})` object literal.
pub fn frame_from(type_: &str, fields: Value) -> String {
    match fields {
        Value::Object(m) => frame(type_, m),
        _ => frame(type_, Map::new()),
    }
}

pub fn error(code: &str, message: impl Into<String>) -> String {
    frame_from("error", json!({ "code": code, "message": message.into() }))
}

pub fn reload(reason: impl Into<String>) -> String {
    frame_from("reload", json!({ "reason": reason.into() }))
}

pub fn pong(wall: &str) -> String {
    frame_from("pong", json!({ "wall": wall }))
}

pub fn intent_accepted(client_seq: u64, input_seq: u64, applied_t: i64) -> Value {
    json!({ "v": VERSION, "type": "intent_result", "client_seq": client_seq, "status": "accepted", "input_seq": input_seq, "applied_t": applied_t })
}

pub fn intent_rejected(client_seq: u64, reason: &str, message: impl Into<String>) -> Value {
    json!({ "v": VERSION, "type": "intent_result", "client_seq": client_seq, "status": "rejected", "reason": reason, "message": message.into() })
}

/// Console kinds; the DM sends them too, with `parish_id` in the payload.
pub const CONSOLE_KINDS: &[&str] = &["lock_values", "allocate", "decide", "mayday", "answer_aid", "declare_hidden", "repair_send", "credit_line"];
/// Phone kinds: recorded, never seen by the core.
pub const PHONE_KINDS: &[&str] = &["personal_pick", "vote", "commitment"];
/// DM kinds beyond the console kinds.
pub const DM_KINDS: &[&str] = &[
    "open_island",
    "open_quarter",
    "start",
    "resume",
    "pause",
    "advance",
    "skip_ahead",
    "heat",
    "cool",
    "swap",
    "admit",
    "reassign",
    "flag",
    "debrief",
    "export",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames_parse_and_build() {
        let f = parse_client_frame(r#"{"v":1,"type":"intent","client_seq":7,"kind":"decide","payload":{"dilemma_id":"x","option_id":"a"}}"#).unwrap();
        assert!(matches!(f, ClientFrame::Intent { client_seq: 7, .. }));
        assert!(matches!(parse_client_frame(r#"{"v":1,"type":"ping"}"#).unwrap(), ClientFrame::Ping));
        assert_eq!(parse_client_frame(r#"{"v":2,"type":"ping"}"#).unwrap_err().0, "version");
        assert_eq!(parse_client_frame(r#"{"v":1,"type":"dance"}"#).unwrap_err().0, "bad_frame");
        assert_eq!(parse_client_frame("nope").unwrap_err().0, "bad_frame");
        let h = parse_client_frame(r#"{"v":1,"type":"hello","session_code":"G7K2PQ","role":"console"}"#).unwrap();
        match h {
            ClientFrame::Hello(h) => assert_eq!(h.role.as_deref(), Some("console")),
            _ => panic!(),
        }
        let s = error("bad_token", "no");
        let v: Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["v"], 1);
        assert_eq!(v["type"], "error");
        assert_eq!(v["code"], "bad_token");
        assert_eq!(intent_accepted(1, 2, 3)["applied_t"], 3);
        assert_eq!(Role::seat("console"), Some(Role::Console));
        assert_eq!(Role::seat("dm"), None);
    }
}
