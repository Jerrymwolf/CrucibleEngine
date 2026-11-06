//! Join codes, tokens, client ids and wall-clock stamps. The only place in
//! the workspace that reads OS entropy or the system clock.

use std::time::{SystemTime, UNIX_EPOCH};

/// 32 symbols without the ambiguous glyphs 0, 1, I and O (PROTOCOL.md section 3).
pub const CODE_ALPHABET: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
pub const CODE_LEN: usize = 6;

fn random_bytes(n: usize) -> Vec<u8> {
    let mut b = vec![0u8; n];
    getrandom::fill(&mut b).expect("the OS entropy source is available");
    b
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// A six-character session code.
pub fn new_code() -> String {
    random_bytes(CODE_LEN).iter().map(|b| CODE_ALPHABET[(*b & 31) as usize] as char).collect()
}

/// Codes are typed and read aloud: compare them trimmed and upper-cased.
pub fn normalize_code(s: &str) -> String {
    s.trim().to_ascii_uppercase()
}

/// A 128-bit token as 32 hex characters.
pub fn new_token() -> String {
    hex(&random_bytes(16))
}

/// A four-digit PIN for the DM console.
pub fn new_pin() -> String {
    let b = random_bytes(4);
    let n = u32::from_le_bytes([b[0], b[1], b[2], b[3]]) % 10_000;
    format!("{n:04}")
}

/// An anonymous device id: `c_` and 48 random bits.
pub fn new_client_id() -> String {
    format!("c_{}", hex(&random_bytes(6)))
}

/// Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn format_utc(secs: i64, millis: u32, with_time: bool) -> String {
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let (y, m, d) = civil_from_days(days);
    if with_time {
        format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}.{millis:03}Z", rem / 3600, (rem % 3600) / 60, rem % 60)
    } else {
        format!("{y:04}-{m:02}-{d:02}")
    }
}

fn now_parts() -> (i64, u32) {
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    (d.as_secs() as i64, d.subsec_millis())
}

/// The wall clock as ISO-8601 UTC with milliseconds, for the input log only.
pub fn wall_now() -> String {
    let (s, ms) = now_parts();
    format_utc(s, ms, true)
}

/// Today's date as `YYYY-MM-DD`, for the session directory name.
pub fn date_today() -> String {
    let (s, _) = now_parts();
    format_utc(s, 0, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_use_the_alphabet_and_tokens_are_hex() {
        let c = new_code();
        assert_eq!(c.len(), CODE_LEN);
        assert!(c.bytes().all(|b| CODE_ALPHABET.contains(&b)));
        assert_ne!(new_code(), new_code());
        let t = new_token();
        assert_eq!(t.len(), 32);
        assert!(t.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(new_pin().len(), 4);
        assert!(new_client_id().starts_with("c_"));
        assert_eq!(normalize_code(" g7k2pq "), "G7K2PQ");
    }

    #[test]
    fn utc_formatting_matches_known_dates() {
        assert_eq!(format_utc(0, 0, true), "1970-01-01T00:00:00.000Z");
        // 2026-10-21T14:03:22Z
        assert_eq!(format_utc(1_792_591_402, 118, true), "2026-10-21T14:03:22.118Z");
        assert_eq!(format_utc(951_782_400, 0, false), "2000-02-29");
        assert!(wall_now().ends_with('Z'));
        assert_eq!(date_today().len(), 10);
    }
}
