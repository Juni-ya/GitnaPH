use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub town_name: Option<String>,
    pub coordinates: [f64; 2], // [lng, lat]
    #[serde(default = "default_color")]
    pub color: String,
}

fn default_color() -> String {
    "#CCFF00".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculationWeights {
    #[serde(default = "default_alpha")]
    pub alpha: f64,
    #[serde(default = "default_beta")]
    pub beta: f64,
}

fn default_alpha() -> f64 {
    0.45
}

fn default_beta() -> f64 {
    0.55
}

impl Default for CalculationWeights {
    fn default() -> Self {
        Self {
            alpha: default_alpha(),
            beta: default_beta(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateHub {
    pub id: String,
    pub name: String,
    pub coordinates: [f64; 2], // [lng, lat]
    pub category: String,
    pub description: String,
    pub metro_zone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculationRequest {
    pub action: String,
    pub participants: Vec<Participant>,
    pub weights: Option<CalculationWeights>,
    #[serde(default)]
    pub selected_categories: Option<Vec<String>>,
    #[serde(default)]
    pub google_api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartialPolyline {
    pub participant_id: String,
    pub coordinates: Vec<[f64; 2]>,
    #[serde(default = "default_color")]
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRoadMetric {
    pub participant_id: String,
    pub participant_name: String,
    pub road_time_mins: f64,
    pub road_distance_km: f64,
    #[serde(default = "default_color")]
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRoadRoute {
    pub participant_id: String,
    pub participant_name: String,
    pub coordinates: Vec<[f64; 2]>,
    pub road_time_mins: f64,
    pub road_distance_km: f64,
    #[serde(default = "default_color")]
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoadCandidateVerdict {
    pub hub_name: String,
    pub hub_id: String,
    pub hub_coords: [f64; 2],
    pub user_road_routes: Vec<UserRoadRoute>,
    pub user_metrics: Vec<UserRoadMetric>,
    pub total_road_time_mins: f64,
    pub delta_road_mins: f64,
    pub cost_score: f64,
    pub fairness_score: f64,
    pub status: String, // "WINNER", "CONTENDER", "REJECTED"
    pub reason: String,
    pub rank: usize,
    #[serde(default)]
    pub area_name: Option<String>,
    #[serde(default)]
    pub snapped_venue: Option<PoiItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoiItem {
    pub id: String,
    pub name: String,
    pub category: String, // "cafe", "park", "mall", "restaurant"
    pub coordinates: [f64; 2], // [lng, lat]
    pub distance_meters: f64,
    pub walking_minutes: u32,
    #[serde(default)]
    pub address: Option<String>,
    #[serde(default)]
    pub highlight: Option<String>,
    #[serde(default)]
    pub rating: Option<f64>,
    #[serde(default)]
    pub user_rating_count: Option<u32>,
    #[serde(default)]
    pub google_maps_uri: Option<String>,
    #[serde(default)]
    pub source: Option<String>, // "google_places" | "osm"
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CategorizedPois {
    pub cafes: Vec<PoiItem>,
    pub malls: Vec<PoiItem>,
    pub parks: Vec<PoiItem>,
    pub restaurants: Vec<PoiItem>,
    #[serde(default)]
    pub search_anchor: Option<[f64; 2]>,
    #[serde(default)]
    pub search_radius_meters: Option<f64>,
    #[serde(default)]
    pub recommended_place: Option<PoiItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteToPointRequest {
    pub target_name: String,
    pub target_coords: [f64; 2], // [lng, lat]
    pub participants: Vec<Participant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteToPointResponse {
    pub target_name: String,
    pub target_coords: [f64; 2],
    pub user_road_routes: Vec<UserRoadRoute>,
    pub user_metrics: Vec<UserRoadMetric>,
    pub total_road_time_mins: f64,
    pub delta_road_mins: f64,
    pub fairness_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamEvent {
    #[serde(rename = "INITIAL_CANDIDATES")]
    InitialCandidates {
        hubs: Vec<CandidateHub>,
        direct_midpoint: Option<CandidateHub>,
    },

    #[serde(rename = "HIGHWAY_CRAWL")]
    HighwayCrawl {
        progress_pct: u32,
        partial_polylines: Vec<PartialPolyline>,
        telemetry_note: String,
    },

    #[serde(rename = "CANDIDATE_ROAD_TEST")]
    CandidateRoadTest {
        hub_name: String,
        hub_id: String,
        hub_coords: [f64; 2],
        user_road_routes: Vec<UserRoadRoute>,
        fairness_score: f64,
        cost_score: f64,
        delta_mins: f64,
        road_times_min: Vec<f64>,
        road_distances_km: Vec<f64>,
        status: String,
        reason: String,
    },

    #[serde(rename = "FINAL_ROAD_VERDICT")]
    FinalRoadVerdict {
        winner: RoadCandidateVerdict,
        alternatives: Vec<RoadCandidateVerdict>,
        pois: CategorizedPois,
        analysis_commentary: String,
        total_calc_time_ms: u64,
    },

    #[serde(rename = "ERROR")]
    Error {
        message: String,
    },
}
