//! Content loading and validation. Only what the model needs is strongly
//! typed; everything else stays as `serde_json::Value` so facilitators can
//! extend the JSON without touching Rust.

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ContentError {
    #[error("cannot read {path}: {source}")]
    Io { path: String, source: std::io::Error },
    #[error("cannot parse {path}: {source}")]
    Parse { path: String, source: serde_json::Error },
    #[error("content validation failed:\n{0}")]
    Invalid(String),
}

#[derive(Debug, Clone, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resources {
    #[serde(default)]
    pub generators: u32,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Parish {
    pub id: String,
    pub name: String,
    pub position: Position,
    pub population: u64,
    #[serde(default)]
    pub supply_chain_role: Option<String>,
    pub resources: Resources,
    #[serde(default)]
    pub vulnerabilities: Vec<String>,
    #[serde(default)]
    pub values_tested: Vec<String>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerInfra {
    pub source: String,
    #[serde(default)]
    pub backup_generators: BTreeMap<String, bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WaterInfra {
    pub source: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CommsInfra {
    pub primary: String,
    #[serde(default)]
    pub external: Option<String>,
    #[serde(default)]
    pub backup: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Infrastructure {
    pub power: PowerInfra,
    pub water: WaterInfra,
    pub comms: CommsInfra,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoadSegment {
    pub from: String,
    pub to: String,
    #[serde(default)]
    pub normal_min: f64,
    #[serde(default)]
    pub degraded_min: Option<f64>,
    #[serde(default)]
    pub storm_passable: Option<bool>,
    #[serde(default)]
    pub flood_risk: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Roads {
    pub segments: Vec<RoadSegment>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependency {
    #[serde(default)]
    pub depends_on: Vec<String>,
    #[serde(default)]
    pub provides_to: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct Concordia {
    pub parishes: BTreeMap<String, Parish>,
    pub parish_dependencies: BTreeMap<String, Dependency>,
    pub infrastructure: Infrastructure,
    pub ring_road: Roads,
    pub crater_roads: Roads,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowWeather {
    pub wind_mph: f64,
    pub rainfall_inches_per_hour: f64,
    pub storm_surge_feet: f64,
    #[serde(default)]
    pub visibility: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Window {
    pub id: String,
    /// Timeline phase: watch | warning | approach | landfall | eye | recovery.
    pub phase: String,
    /// Despite the name this is signed hours relative to landfall (-72 .. +24).
    pub t_minus_hours: i64,
    pub label: String,
    #[serde(default)]
    pub certainty_percent: Option<f64>,
    pub weather: WindowWeather,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Hurricane {
    pub windows: Vec<Window>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct Timeline {
    pub hurricane_midas: Hurricane,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CascadeTrigger {
    pub system: String,
    pub parish_id: String,
    pub threshold: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CascadeEffect {
    pub system: String,
    pub parish_id: String,
    pub degradation: f64,
    #[serde(default)]
    pub delay_minutes: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CascadeRule {
    pub id: String,
    pub trigger: CascadeTrigger,
    pub effects: Vec<CascadeEffect>,
    #[serde(default)]
    pub narrative: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct InfrastructureContent {
    pub cascade_rules: Vec<CascadeRule>,
    /// Keyed by watch | warning | crisis | recovery, then system.
    pub degradation_rates: BTreeMap<String, BTreeMap<String, f64>>,
    pub infrastructure_thresholds: BTreeMap<String, f64>,
    pub initial_infrastructure_status: BTreeMap<String, BTreeMap<String, f64>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DilemmaTrigger {
    pub timeline_window: String,
    #[serde(default)]
    pub intensity_min: Option<i64>,
    #[serde(default)]
    pub intensity_max: Option<i64>,
    #[serde(default)]
    pub prerequisite_decisions: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ConsequenceSketch {
    #[serde(default)]
    pub immediate: String,
    #[serde(default)]
    pub ripple: String,
    #[serde(default)]
    pub delayed: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DilemmaOption {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub value_alignment: BTreeMap<String, i64>,
    #[serde(default)]
    pub consequence_sketch: ConsequenceSketch,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dilemma {
    pub id: String,
    pub title: String,
    pub phase: String,
    /// Lower-case parish id, or "multi" for island-wide dilemmas.
    pub parish_id: String,
    #[serde(default)]
    pub setup: String,
    pub trigger: DilemmaTrigger,
    pub options: Vec<DilemmaOption>,
    #[serde(default)]
    pub values_tested: Vec<String>,
    /// A string or an array of strings in the content.
    #[serde(default)]
    pub persona_id: Value,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

impl Dilemma {
    pub fn persona_ids(&self) -> Vec<String> {
        match &self.persona_id {
            Value::String(s) => vec![s.clone()],
            Value::Array(a) => a.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
            _ => vec![],
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DilemmaContent {
    pub all_dilemmas: Vec<Dilemma>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ValueCard {
    pub id: String,
    pub name: String,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ValuesContent {
    pub values_deck: Vec<ValueCard>,
}

/// Everything loaded from the content directory.
#[derive(Debug, Clone)]
pub struct Content {
    pub concordia: Concordia,
    pub timeline: Timeline,
    pub infrastructure: InfrastructureContent,
    pub dilemmas: DilemmaContent,
    pub values: ValuesContent,
    pub personas: Value,
    pub intensity: Value,
    pub decision_types: Value,
    pub production: Value,
    /// sha256 hex of the concatenated content files (sorted by file name).
    pub content_hash: String,
}

const FILES: [&str; 9] = [
    "concordia.json",
    "decisionTypes.json",
    "dilemmas.json",
    "infrastructure.json",
    "intensity.json",
    "personas.json",
    "production.json",
    "timeline.json",
    "values.json",
];

fn read_file(dir: &Path, name: &str) -> Result<Vec<u8>, ContentError> {
    let path = dir.join(name);
    std::fs::read(&path).map_err(|source| ContentError::Io { path: path.display().to_string(), source })
}

fn parse<T: for<'de> Deserialize<'de>>(name: &str, bytes: &[u8]) -> Result<T, ContentError> {
    serde_json::from_slice(bytes).map_err(|source| ContentError::Parse { path: name.to_string(), source })
}

impl Content {
    pub fn load(dir: &Path) -> Result<Content, ContentError> {
        let mut hasher = Sha256::new();
        let mut raw: BTreeMap<&str, Vec<u8>> = BTreeMap::new();
        for name in FILES {
            let bytes = read_file(dir, name)?;
            hasher.update(&bytes);
            raw.insert(name, bytes);
        }
        let content_hash = format!("{:x}", hasher.finalize());
        Ok(Content {
            concordia: parse("concordia.json", &raw["concordia.json"])?,
            timeline: parse("timeline.json", &raw["timeline.json"])?,
            infrastructure: parse("infrastructure.json", &raw["infrastructure.json"])?,
            dilemmas: parse("dilemmas.json", &raw["dilemmas.json"])?,
            values: parse("values.json", &raw["values.json"])?,
            personas: parse("personas.json", &raw["personas.json"])?,
            intensity: parse("intensity.json", &raw["intensity.json"])?,
            decision_types: parse("decisionTypes.json", &raw["decisionTypes.json"])?,
            production: parse("production.json", &raw["production.json"])?,
            content_hash,
        })
    }

    /// Lower-case parish ids in sorted order; the canonical iteration order.
    pub fn parish_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.concordia.parishes.values().map(|p| p.id.to_lowercase()).collect();
        ids.sort();
        ids
    }

    pub fn parish(&self, id: &str) -> Option<&Parish> {
        self.concordia.parishes.values().find(|p| p.id.eq_ignore_ascii_case(id))
    }

    pub fn persona_ids(&self) -> Vec<String> {
        match self.personas.get("PERSONAS") {
            Some(Value::Object(m)) => m.keys().cloned().collect(),
            Some(Value::Array(a)) => a.iter().filter_map(|p| p.get("id")?.as_str().map(String::from)).collect(),
            _ => vec![],
        }
    }
}
