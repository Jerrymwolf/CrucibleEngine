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
    #[error("content file {0} is missing")]
    Missing(String),
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
    /// Parishes served first when the source cannot carry the whole grid.
    #[serde(default)]
    pub priority: Vec<String>,
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
    /// Despite the name this is signed hours relative to landfall (-72 .. +48).
    pub t_minus_hours: i64,
    pub label: String,
    #[serde(default)]
    pub certainty_percent: Option<f64>,
    /// Suggested Crucible Master dial for the window (1..10).
    #[serde(default)]
    pub intensity: Option<i64>,
    pub weather: WindowWeather,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

/// A quarter of the session: a span of simulation minutes with an id.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Quarter {
    pub id: String,
    #[serde(default)]
    pub label: String,
    pub from_t: i64,
    pub to_t: i64,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EyeWindow {
    pub from_t: i64,
    pub to_t: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Hurricane {
    pub windows: Vec<Window>,
    #[serde(rename = "QUARTERS", default)]
    pub quarters: Vec<Quarter>,
    #[serde(rename = "EYE_WINDOW", default)]
    pub eye_window: Option<EyeWindow>,
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

// ---------------------------------------------------------------------------
// Effects: the structured "Board" consequences shared by dilemma options,
// calls for aid and the residents' hazards.

/// A change to a resident group's state buckets.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GroupEffect {
    pub id: String,
    pub state: String,
    /// People moved; all available when absent.
    #[serde(default)]
    pub count: Option<i64>,
    /// Source bucket; the state's default sources when absent.
    #[serde(default)]
    pub from: Option<String>,
    /// Apply at this tick rather than now.
    #[serde(default)]
    pub at_t: Option<i64>,
    /// Move the same people on to `then_state` at this tick.
    #[serde(default)]
    pub until_t: Option<i64>,
    #[serde(default)]
    pub then_state: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CardEffect {
    pub id: String,
    pub state: String,
    #[serde(default)]
    pub at_t: Option<i64>,
    #[serde(default)]
    pub until_t: Option<i64>,
    #[serde(default)]
    pub then_state: Option<String>,
}

/// A change to the doses tally. Every field is optional; absent means unchanged.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DoseEffect {
    #[serde(default)]
    pub at_t: Option<i64>,
    /// Doses added to (or, negative, removed from) the cold vault.
    #[serde(default)]
    pub vault: Option<f64>,
    /// Hours of concentrate added to the works' stock.
    #[serde(default)]
    pub works_hours: Option<f64>,
    /// Production multiplier from now on (0 stops the line).
    #[serde(default)]
    pub production_rate: Option<f64>,
    /// When loading of the consignment starts.
    #[serde(default)]
    pub load_start_t: Option<i64>,
    /// Loading speed multiplier from now on.
    #[serde(default)]
    pub load_rate_factor: Option<f64>,
    /// Hours the ship is held past its sailing time.
    #[serde(default)]
    pub sail_delay_hours: Option<f64>,
    /// Doses put aboard directly (batch 47 when the ship is held).
    #[serde(default)]
    pub aboard: Option<f64>,
    /// Doses held back for testing: out of the vault, not lost.
    #[serde(default)]
    pub held: Option<f64>,
    /// Doses counted as shipped directly.
    #[serde(default)]
    pub shipped: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChanceEffect {
    pub p: f64,
    pub then: Box<Effects>,
    #[serde(default, rename = "else")]
    pub otherwise: Option<Box<Effects>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfraEffect {
    pub parish: String,
    pub system: String,
    pub delta: f64,
    #[serde(default)]
    pub at_t: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendEffect {
    pub token: String,
    pub to: String,
    #[serde(default = "one")]
    pub count: i64,
}

fn one() -> i64 {
    1
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswersCall {
    pub call_id: String,
    pub answer: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouteOverride {
    pub id: String,
    #[serde(default)]
    pub cut_t: Option<i64>,
    #[serde(default)]
    pub reopen_t: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Effects {
    pub groups: Vec<GroupEffect>,
    pub cards: Vec<CardEffect>,
    pub doses: Vec<DoseEffect>,
    pub chance: Vec<ChanceEffect>,
    pub flags: Vec<String>,
    /// parish -> generator hours added.
    pub generator_hours: BTreeMap<String, f64>,
    /// parish -> hardened shelter places added.
    pub shelter_places: BTreeMap<String, i64>,
    /// parish -> token -> delta.
    pub stock: BTreeMap<String, BTreeMap<String, i64>>,
    pub infrastructure: Vec<InfraEffect>,
    /// Replaces the power priority list (empty list: population order only).
    pub power_priority: Option<Vec<String>>,
    /// Convoys from the deciding parish.
    pub sends: Vec<SendEffect>,
    /// The deciding parish puts its hidden reserve on the sheet.
    pub declare_hidden: bool,
    /// Closes an open call for aid with this answer (no aid signals: the
    /// dilemma's own signals stand; the call's effects are not applied).
    pub answers_call: Option<AnswersCall>,
    /// Raises this call for aid now if it can still be raised.
    pub raises_call: Option<String>,
    pub routes: Vec<RouteOverride>,
    /// Apply only when the flag is absent / present.
    pub unless_flag: Option<String>,
    pub if_flag: Option<String>,
}

impl Effects {
    pub fn is_empty(&self) -> bool {
        self.groups.is_empty()
            && self.cards.is_empty()
            && self.doses.is_empty()
            && self.chance.is_empty()
            && self.flags.is_empty()
            && self.generator_hours.is_empty()
            && self.shelter_places.is_empty()
            && self.stock.is_empty()
            && self.infrastructure.is_empty()
            && self.power_priority.is_none()
            && self.sends.is_empty()
            && !self.declare_hidden
            && self.answers_call.is_none()
            && self.raises_call.is_none()
            && self.routes.is_empty()
    }
}

// ---------------------------------------------------------------------------

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
    /// Authored presentation tick (v3 cards); the session profile may override it.
    #[serde(default)]
    pub when_t: Option<i64>,
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
    /// Structured Board effects (v3 cards).
    #[serde(default)]
    pub effects: Effects,
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
    /// The option the storm applies when nobody decides; `options[0]` when absent.
    #[serde(default)]
    pub default_option_id: Option<String>,
    #[serde(default)]
    pub quarter: Option<String>,
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

    /// The option applied at the deadline when nobody decides.
    pub fn default_option(&self) -> &DilemmaOption {
        self.default_option_id.as_ref().and_then(|id| self.options.iter().find(|o| &o.id == id)).unwrap_or(&self.options[0])
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

// ---------------------------------------------------------------------------
// Production numbers (production.json, PRODUCTION).

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSpec {
    pub capacity_doses: f64,
    pub starting_doses: f64,
    pub battery_hours: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorksSpec {
    pub stock_hours_declared: f64,
    pub stock_hours_true: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsignmentSpec {
    pub doses: f64,
    pub batch47_doses: f64,
    pub load_hours: f64,
    pub load_start_t: i64,
    pub sail_t: i64,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextConsignmentSpec {
    pub t: i64,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductionConditions {
    #[serde(default = "thirty")]
    pub keystone_power_min: f64,
    #[serde(default = "thirty")]
    pub keystone_water_min: f64,
}

fn thirty() -> f64 {
    30.0
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductionSpec {
    pub doses_per_hour: f64,
    pub doses_per_day: f64,
    pub vault: VaultSpec,
    pub works: WorksSpec,
    pub consignment: ConsignmentSpec,
    pub next_consignment: NextConsignmentSpec,
    #[serde(default)]
    pub production_conditions: Option<ProductionConditions>,
    #[serde(default)]
    pub population: Option<u64>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ProductionContent {
    #[serde(default)]
    pub production: Option<ProductionSpec>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

// ---------------------------------------------------------------------------
// Resource tokens (resources.json).

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ResourcesContent {
    pub tokens: BTreeMap<String, Value>,
    /// parish -> token -> count on the sheet at T-72.
    pub stockpiles: BTreeMap<String, BTreeMap<String, i64>>,
    /// parish -> token -> count (plus a "note"); declared by `declare_hidden`.
    #[serde(default)]
    pub hidden: BTreeMap<String, BTreeMap<String, Value>>,
    /// parish -> quarter -> token -> count.
    #[serde(default)]
    pub needs: BTreeMap<String, BTreeMap<String, BTreeMap<String, i64>>>,
    /// rule -> value -> signal.
    #[serde(default)]
    pub signals: BTreeMap<String, BTreeMap<String, i64>>,
    /// token -> what a delivered token does.
    #[serde(default)]
    pub effects: BTreeMap<String, Value>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

impl ResourcesContent {
    pub fn hidden_counts(&self, parish: &str) -> BTreeMap<String, i64> {
        self.hidden.get(parish).map(|m| m.iter().filter_map(|(k, v)| v.as_i64().map(|n| (k.clone(), n))).collect()).unwrap_or_default()
    }

    /// Total listed need of `parish` for `token` in the given quarters.
    pub fn need(&self, parish: &str, token: &str, quarters: &[&str]) -> i64 {
        self.needs.get(parish).map(|q| quarters.iter().map(|k| q.get(*k).and_then(|m| m.get(token)).copied().unwrap_or(0)).sum()).unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Routes (routes.json).

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Route {
    pub id: String,
    #[serde(default)]
    pub name: String,
    /// road | air | sea | foot | radio
    pub mode: String,
    pub from: String,
    pub to: String,
    #[serde(default)]
    pub travel_min: i64,
    #[serde(default)]
    pub degraded_min: Option<i64>,
    #[serde(default)]
    pub cut_t: Option<i64>,
    #[serde(default)]
    pub reopen_t: Option<i64>,
    /// Open during the eye even while cut.
    #[serde(default)]
    pub eye_open: bool,
    #[serde(default)]
    pub narrative_cut: String,
    #[serde(default)]
    pub narrative_reopen: String,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct RoutesContent {
    pub routes: Vec<Route>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

// ---------------------------------------------------------------------------
// Calls for aid (aid.json).

#[derive(Debug, Clone, Deserialize)]
pub struct AidAnswer {
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub signals: BTreeMap<String, i64>,
    /// Tokens that move with this answer (the call's count when absent).
    #[serde(default)]
    pub count: Option<i64>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AidCall {
    pub id: String,
    pub quarter: String,
    pub asker: String,
    pub holder: String,
    #[serde(default)]
    pub token: Option<String>,
    #[serde(default)]
    pub count: i64,
    #[serde(default)]
    pub route: Option<String>,
    pub window_closes_t: i64,
    #[serde(default)]
    pub persona_id: Option<String>,
    #[serde(default)]
    pub line: String,
    #[serde(default)]
    pub ask: String,
    #[serde(default)]
    pub answer_ticks: Option<i64>,
    pub answers: BTreeMap<String, AidAnswer>,
    #[serde(default = "refuse")]
    pub silence_answer: String,
    /// answer -> effects applied when the answer is given.
    #[serde(default)]
    pub effects: BTreeMap<String, Effects>,
    /// answer -> effects applied when the token arrives.
    #[serde(default)]
    pub delivered: BTreeMap<String, Effects>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

fn refuse() -> String {
    "refuse".into()
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct AidContent {
    pub calls: Vec<AidCall>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

impl AidContent {
    pub fn call(&self, id: &str) -> Option<&AidCall> {
        self.calls.iter().find(|c| c.id == id)
    }
}

// ---------------------------------------------------------------------------
// Residents (residents.json).

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResidentGroup {
    pub id: String,
    pub parish_id: String,
    #[serde(default)]
    pub name: String,
    pub size: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResidentCard {
    pub id: String,
    pub parish_id: String,
    pub name: String,
    #[serde(default)]
    pub line: String,
    pub group_id: String,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Hazard {
    pub t: i64,
    pub state: String,
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub card_id: Option<String>,
    #[serde(default)]
    pub count: Option<i64>,
    #[serde(default)]
    pub from: Option<String>,
    #[serde(default)]
    pub unless_flag: Option<String>,
    #[serde(default)]
    pub if_flag: Option<String>,
    #[serde(default)]
    pub narrative: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ResidentsContent {
    pub groups: Vec<ResidentGroup>,
    pub cards: Vec<ResidentCard>,
    #[serde(default)]
    pub hazards: Vec<Hazard>,
    #[serde(default)]
    pub safe_states: Vec<String>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
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
    pub production: ProductionContent,
    pub resources: ResourcesContent,
    pub routes: RoutesContent,
    pub aid: AidContent,
    pub residents: ResidentsContent,
    /// sha256 hex of the concatenated content files (sorted by file name).
    pub content_hash: String,
}

pub const FILES: [&str; 13] = [
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
        let mut raw: BTreeMap<&str, Vec<u8>> = BTreeMap::new();
        for name in FILES {
            raw.insert(name, read_file(dir, name)?);
        }
        Self::from_files(&raw)
    }

    /// Builds content from file name to bytes, for hosts without a file
    /// system (the browser build embeds the files). Every content file must
    /// be present; the hash is the same as `load` gives for the same bytes.
    pub fn from_files(raw: &BTreeMap<&str, Vec<u8>>) -> Result<Content, ContentError> {
        let mut hasher = Sha256::new();
        for name in FILES {
            let bytes = raw.get(name).ok_or_else(|| ContentError::Missing(name.to_string()))?;
            hasher.update(bytes);
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
            resources: parse("resources.json", &raw["resources.json"])?,
            routes: parse("routes.json", &raw["routes.json"])?,
            aid: parse("aid.json", &raw["aid.json"])?,
            residents: parse("residents.json", &raw["residents.json"])?,
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

    pub fn dilemma(&self, id: &str) -> Option<&Dilemma> {
        self.dilemmas.all_dilemmas.iter().find(|d| d.id == id)
    }

    pub fn route(&self, id: &str) -> Option<&Route> {
        self.routes.routes.iter().find(|r| r.id == id)
    }

    /// Quarter id in force at `t` (the last quarter whose start <= t), or
    /// the first quarter before any starts; None without quarters.
    pub fn quarter_at(&self, t: i64) -> Option<&Quarter> {
        let qs = &self.timeline.hurricane_midas.quarters;
        qs.iter().rfind(|q| q.from_t <= t).or_else(|| qs.first())
    }

    /// Ids of the quarter at `t` and every later one.
    pub fn quarters_from(&self, t: i64) -> Vec<&str> {
        let qs = &self.timeline.hurricane_midas.quarters;
        let Some(cur) = self.quarter_at(t) else { return vec![] };
        qs.iter().skip_while(|q| q.id != cur.id).map(|q| q.id.as_str()).collect()
    }

    /// End of the quarter in force at `t` (the run's end without quarters).
    pub fn quarter_end(&self, t: i64, t_end: i64) -> i64 {
        self.quarter_at(t).map(|q| q.to_t).unwrap_or(t_end)
    }

    pub fn in_eye(&self, t: i64) -> bool {
        self.timeline.hurricane_midas.eye_window.as_ref().map(|e| e.from_t <= t && t < e.to_t).unwrap_or(false)
    }
}
